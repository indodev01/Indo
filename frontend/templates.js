import { supabase } from './auth/supabase-config.js';

const appTitle = document.getElementById('appTitle');
const message = document.getElementById('message');
const templateButtons = document.querySelectorAll('.template-button');
const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');

const templates = {
  Business: {
    pages: {
      home: {
        id: 'home', name: 'Home', slug: 'home', styles: { background: '#ffffff', padding: '24px' },
        settings: { title: 'Business Home' },
        components: [
          { id: 'business-heading', type: 'Heading', props: { text: 'Welcome to Your Business', size: 34, weight: '800', color: '#111827', align: 'center' } },
          { id: 'business-text', type: 'Text', props: { text: 'Tell customers who you are and what you offer.', size: 16, color: '#5f6b82' } },
          { id: 'business-button', type: 'Button', props: { label: 'Contact Us', action: { type: 'page', target: 'contact' }, background: '#5b45f4', color: '#ffffff', radius: 10 } }
        ]
      },
      contact: {
        id: 'contact', name: 'Contact', slug: 'contact', styles: { background: '#ffffff', padding: '24px' }, settings: { title: 'Contact' },
        components: [
          { id: 'contact-heading', type: 'Heading', props: { text: 'Contact Us', size: 30, weight: '700', color: '#111827', align: 'left' } },
          { id: 'contact-name', type: 'Input', props: { label: 'Name', placeholder: 'Your name', name: 'name', inputType: 'text', required: true } },
          { id: 'contact-email', type: 'Input', props: { label: 'Email', placeholder: 'you@example.com', name: 'email', inputType: 'email', required: true } },
          { id: 'contact-message', type: 'Input', props: { label: 'Message', placeholder: 'How can we help?', name: 'message', inputType: 'text', required: true } }
        ]
      }
    }
  },
  Store: {
    pages: {
      home: {
        id: 'home', name: 'Home', slug: 'home', styles: { background: '#ffffff', padding: '24px' }, settings: { title: 'Store' },
        components: [
          { id: 'store-heading', type: 'Heading', props: { text: 'Featured Products', size: 32, weight: '800', color: '#111827', align: 'center' } },
          { id: 'store-card', type: 'Card', props: { title: 'Featured Product', text: 'Add your product details here.', background: '#ffffff', radius: 14 } },
          { id: 'store-button', type: 'Button', props: { label: 'Shop Now', action: { type: 'none', target: '' }, background: '#5b45f4', color: '#ffffff', radius: 10 } }
        ]
      }
    }
  },
  Portfolio: {
    pages: {
      home: {
        id: 'home', name: 'Home', slug: 'home', styles: { background: '#ffffff', padding: '24px' }, settings: { title: 'Portfolio' },
        components: [
          { id: 'portfolio-heading', type: 'Heading', props: { text: 'Hi, I\'m a Creator', size: 38, weight: '800', color: '#111827', align: 'center' } },
          { id: 'portfolio-text', type: 'Text', props: { text: 'Showcase your best work, skills, and projects.', size: 16, color: '#5f6b82' } },
          { id: 'portfolio-list', type: 'List', props: { title: 'Projects', items: ['Project One', 'Project Two', 'Project Three'], bullet: true } }
        ]
      }
    }
  }
};

async function loadProject() {
  if (!projectId) {
    appTitle.textContent = 'Choose a template for a new app.';
    return null;
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) { window.location.replace('auth/sign-in.html'); return null; }
  const { data: project, error } = await supabase
    .from('projects').select('id,user_id,name').eq('id', projectId).eq('user_id', userData.user.id).maybeSingle();
  if (error) throw error;
  if (!project) throw new Error('Project not found or access denied');
  appTitle.textContent = `Select a template for: ${project.name}`;
  return { project, user: userData.user };
}

templateButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const templateName = button.dataset.template;
    button.disabled = true;
    message.textContent = `Applying ${templateName} template...`;
    try {
      const loaded = await loadProject();
      if (!loaded) return;
      const definition = templates[templateName];
      if (!definition) throw new Error('Template not found');

      const { error } = await supabase
        .from('projects')
        .update({
          pages: definition.pages,
          app_definition: {
            schemaVersion: 1,
            metadata: { title: loaded.project.name, description: `${templateName} template` },
            pages: definition.pages,
            navigation: { items: Object.values(definition.pages).map((page) => ({ label: page.name, pageId: page.id })) },
            workflows: {}, database: { bindings: {} }, assets: { files: [] },
            settings: { responsive: { desktop: true, tablet: true, mobile: true }, status: 'draft' }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', loaded.user.id);
      if (error) throw error;

      message.textContent = `${templateName} template applied. Opening builder...`;
      window.setTimeout(() => {
        window.location.href = `builder-v2.html?projectId=${encodeURIComponent(projectId)}`;
      }, 350);
    } catch (error) {
      console.error(error);
      message.textContent = `Could not apply template: ${error.message || 'error'}`;
      button.disabled = false;
    }
  });
});

loadProject().catch((error) => {
  console.error(error);
  message.textContent = `Could not load templates: ${error.message || 'error'}`;
});
