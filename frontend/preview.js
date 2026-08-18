import { supabase } from './auth/supabase-config.js';

const previewCanvas = document.getElementById('previewCanvas');
const previewInfo = document.getElementById('previewInfo');
const backButton = document.getElementById('backButton');
const homeButton = document.getElementById('homeButton');

const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');

function showMessage(text) {
  previewCanvas.innerHTML = '';
  const message = document.createElement('p');
  message.className = 'preview-message';
  message.textContent = text;
  previewCanvas.appendChild(message);
}

function renderComponent(component) {
  const wrapper = document.createElement('section');
  wrapper.className = 'preview-item';

  if (component.type === 'Heading') {
    const heading = document.createElement('h1');
    heading.textContent = component.text || 'Your Heading';
    heading.style.fontSize = `${Number(component.size) || 28}px`;
    heading.style.textAlign = component.align || 'left';
    wrapper.appendChild(heading);
  } else if (component.type === 'Text') {
    const text = document.createElement('p');
    text.textContent = component.text || 'Add your text here.';
    wrapper.appendChild(text);
  } else if (component.type === 'Button') {
    const button = document.createElement(component.link ? 'a' : 'button');
    button.className = 'preview-button';
    button.textContent = component.label || 'Click Me';
    if (component.link) {
      button.href = component.link;
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
    } else {
      button.type = 'button';
    }
    wrapper.appendChild(button);
  } else if (component.type === 'Image') {
    if (component.url) {
      const image = document.createElement('img');
      image.src = component.url;
      image.alt = component.alt || 'Image';
      image.className = 'preview-image';
      wrapper.appendChild(image);
    }
  }

  return wrapper;
}

async function loadPreview() {
  if (!projectId) {
    previewInfo.textContent = 'Missing project ID.';
    showMessage('Open Preview from a project in your workspace.');
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) {
    window.location.replace('auth/sign-in.html');
    return;
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('id,user_id,name,description,app_definition')
    .eq('id', projectId)
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!project) throw new Error('Project not found or access denied');

  previewInfo.textContent = `${project.name || 'Untitled App'} preview`;
  previewCanvas.innerHTML = '';

  const components = Array.isArray(project.app_definition?.componentsList)
    ? project.app_definition.componentsList
    : [];

  if (components.length === 0) {
    showMessage('This app has no components yet. Go back to the Builder and add something.');
    return;
  }

  components.forEach((component) => {
    const rendered = renderComponent(component);
    if (rendered.children.length) previewCanvas.appendChild(rendered);
  });
}

backButton.addEventListener('click', () => {
  window.location.href = `builder-v2.html?projectId=${encodeURIComponent(projectId || '')}`;
});

homeButton.addEventListener('click', () => {
  window.location.href = 'index.html';
});

loadPreview().catch((error) => {
  console.error(error);
  previewInfo.textContent = 'Preview failed';
  showMessage(error.message || 'Could not load this app preview.');
});
