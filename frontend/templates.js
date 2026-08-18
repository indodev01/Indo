import { supabase } from './auth/supabase-config.js';

const appTitle = document.getElementById('appTitle');
const message = document.getElementById('message');
const grid = document.getElementById('templateGrid');
const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');

function setMessage(text) { message.textContent = text; }

function renderTemplate(template) {
  const article = document.createElement('article');
  article.className = 'template-card';
  article.innerHTML = `
    <div class="template-preview">
      <div class="mini-phone">
        <div class="mini-line"></div><div class="mini-line light"></div>
        <div class="mini-cards"><div class="mini-card"></div><div class="mini-card"></div></div>
        <div class="mini-line light"></div><div class="mini-line"></div>
      </div>
    </div>
    <div class="template-body">
      <h2></h2><p></p><button class="template-button" type="button">Use Template</button>
    </div>`;
  article.querySelector('h2').textContent = template.name;
  article.querySelector('p').textContent = template.description;
  article.querySelector('button').addEventListener('click', () => useTemplate(template));
  grid.appendChild(article);
}

function demoImage(id) {
  return {
    id,
    type: 'Image',
    demoOnly: true,
    props: {
      url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      alt: 'Template demo image',
      radius: 16,
      demoOnly: true
    }
  };
}

function addTemplateDemoMedia(template) {
  const definition = structuredClone(template.definition || {});
  definition.pages = definition.pages || {};
  const home = definition.pages.home || Object.values(definition.pages)[0];
  if (home) {
    home.components = Array.isArray(home.components) ? home.components : [];
    if (!home.components.some((component) => component?.demoOnly || component?.props?.demoOnly)) {
      home.components.push(demoImage(`${template.slug}-demo-image`));
    }
  }

  if (template.slug === 'video-streaming') {
    const details = definition.pages.details || (definition.pages.details = {
      id: 'details', name: 'Details', slug: 'details', components: [], styles: { background: '#ffffff', padding: '24px' }, settings: { title: 'Details' }
    });
    details.components = Array.isArray(details.components) ? details.components : [];
    const existingVideo = details.components.find((component) => component?.type === 'Video');
    if (existingVideo) {
      existingVideo.demoOnly = true;
      existingVideo.props = {
        ...existingVideo.props,
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
        title: 'Template Demo Video',
        controls: true,
        autoplay: false,
        loop: false,
        muted: false,
        demoOnly: true
      };
    } else {
      details.components.push({
        id: 'video-streaming-demo-video', type: 'Video', demoOnly: true,
        props: { url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80', title: 'Template Demo Video', controls: true, autoplay: false, loop: false, muted: false, demoOnly: true }
      });
    }
  }
  return definition;
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) { window.location.replace('auth/sign-in.html'); return null; }
  return data.user;
}

async function useTemplate(template) {
  const button = [...grid.querySelectorAll('button')].find((b) => b.closest('.template-card')?.querySelector('h2')?.textContent === template.name);
  if (button) button.disabled = true;
  setMessage(`Applying ${template.name}...`);

  try {
    const user = await currentUser();
    if (!user) return;

    const definition = addTemplateDemoMedia(template);

    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects').select('id,name').eq('id', projectId).eq('user_id', user.id).maybeSingle();
      if (projectError) throw projectError;
      if (!project) throw new Error('Project not found or access denied');

      const nextDefinition = { ...definition, metadata: { ...(definition.metadata || {}), title: project.name, description: template.description } };
      const { error } = await supabase
        .from('projects')
        .update({ pages: nextDefinition.pages, app_definition: nextDefinition, start_mode: 'template', updated_at: new Date().toISOString() })
        .eq('id', projectId).eq('user_id', user.id);
      if (error) throw error;
      setMessage('Template applied. Opening Design Studio...');
      window.setTimeout(() => { window.location.href = `builder-v2.html?projectId=${encodeURIComponent(projectId)}`; }, 250);
      return;
    }

    const name = `${template.name} App`;
    const nextDefinition = { ...definition, metadata: { ...(definition.metadata || {}), title: name, description: template.description } };
    const { data: project, error } = await supabase.from('projects').insert({
      user_id: user.id,
      name,
      description: template.description,
      start_mode: 'template',
      status: 'draft',
      pages: nextDefinition.pages,
      app_definition: nextDefinition
    }).select('id').single();
    if (error) throw error;

    setMessage('Project created. Opening Design Studio...');
    window.setTimeout(() => { window.location.href = `builder-v2.html?projectId=${encodeURIComponent(project.id)}`; }, 250);
  } catch (error) {
    console.error(error);
    setMessage(`Could not use template: ${error.message || 'Please try again.'}`);
    if (button) button.disabled = false;
  }
}

async function loadTemplates() {
  const user = await currentUser();
  if (!user) return;

  if (projectId) {
    const { data: project, error } = await supabase.from('projects').select('id,user_id,name').eq('id', projectId).eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!project) throw new Error('Project not found or access denied');
    appTitle.textContent = `Select a template for: ${project.name}`;
  }

  const { data: templates, error } = await supabase
    .from('templates').select('id,slug,name,description,definition').eq('is_active', true).order('created_at', { ascending: true });
  if (error) throw error;

  grid.innerHTML = '';
  if (!templates?.length) {
    grid.innerHTML = '<p class="message">No templates are available yet.</p>';
    return;
  }
  templates.forEach(renderTemplate);
}

loadTemplates().catch((error) => {
  console.error(error);
  setMessage(`Could not load templates: ${error.message || 'error'}`);
});
