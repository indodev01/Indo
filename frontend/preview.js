import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, normalizeComponents } from './app-definition.js';

const previewCanvas = document.getElementById('previewCanvas');
const previewInfo = document.getElementById('previewInfo');
const backButton = document.getElementById('backButton');
const homeButton = document.getElementById('homeButton');

const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');
let currentPageId = params.get('page') || 'home';
let project = null;
let definition = null;

function showMessage(text) {
  previewCanvas.innerHTML = '';
  const message = document.createElement('p');
  message.className = 'preview-message';
  message.textContent = text;
  previewCanvas.appendChild(message);
}

function pageEntries() {
  return Object.entries(definition?.pages || {});
}

function resolvePageId(value) {
  if (!value) return null;
  if (definition?.pages?.[value]) return value;
  const wanted = String(value).trim().toLowerCase();
  const match = pageEntries().find(([id, page]) => id.toLowerCase() === wanted || String(page.name || '').toLowerCase() === wanted || String(page.slug || '').toLowerCase() === wanted);
  return match ? match[0] : null;
}

function navigateToPage(value) {
  const target = resolvePageId(value);
  if (!target) return false;
  currentPageId = target;
  const url = new URL(window.location.href);
  url.searchParams.set('page', target);
  window.history.pushState({}, '', url);
  renderCurrentPage();
  return true;
}

function styleButton(button, props = {}) {
  Object.assign(button.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    border: '0',
    borderRadius: `${Number(props.radius) || 10}px`,
    background: props.background || '#5b45f4',
    color: props.color || '#ffffff',
    fontWeight: '800',
    textDecoration: 'none',
    cursor: 'pointer'
  });
}

function renderComponent(component) {
  const wrapper = document.createElement('section');
  wrapper.className = 'preview-item';
  const props = component.props || component;

  if (component.type === 'Heading') {
    const heading = document.createElement('h1');
    heading.textContent = props.text || 'Your Heading';
    heading.style.fontSize = `${Number(props.size) || 28}px`;
    heading.style.fontWeight = props.weight || '700';
    heading.style.color = props.color || '#111827';
    heading.style.textAlign = props.align || 'left';
    wrapper.appendChild(heading);
  } else if (component.type === 'Text') {
    const text = document.createElement('p');
    text.textContent = props.text || 'Add your text here.';
    text.style.fontSize = `${Number(props.size) || 15}px`;
    text.style.color = props.color || '#5f6b82';
    wrapper.appendChild(text);
  } else if (component.type === 'Button') {
    const target = resolvePageId(props.link);
    const button = document.createElement(target ? 'button' : 'a');
    button.className = 'preview-button';
    button.textContent = props.label || 'Get Started';
    styleButton(button, props);
    if (target) {
      button.type = 'button';
      button.addEventListener('click', () => navigateToPage(target));
    } else if (props.link) {
      button.href = props.link;
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
    } else {
      button.type = 'button';
    }
    wrapper.appendChild(button);
  } else if (component.type === 'Image') {
    if (props.url) {
      const image = document.createElement('img');
      image.src = props.url;
      image.alt = props.alt || 'Image';
      image.className = 'preview-image';
      image.style.borderRadius = `${Number(props.radius) || 10}px`;
      wrapper.appendChild(image);
    }
  } else if (component.type === 'Input') {
    const label = document.createElement('label');
    label.textContent = props.label || 'Your Name';
    label.style.display = 'block';
    label.style.fontWeight = '800';
    label.style.marginBottom = '7px';
    const input = document.createElement('input');
    input.type = props.inputType || 'text';
    input.name = props.name || '';
    input.placeholder = props.placeholder || '';
    input.required = Boolean(props.required);
    Object.assign(input.style, { width: '100%', padding: '11px', border: '1px solid #d6d9e4', borderRadius: '9px', font: 'inherit' });
    wrapper.append(label, input);
  } else if (component.type === 'Card') {
    const card = document.createElement('div');
    Object.assign(card.style, { background: props.background || '#fff', border: '1px solid #e5e7ef', borderRadius: `${Number(props.radius) || 14}px`, padding: '18px' });
    const title = document.createElement('h3'); title.textContent = props.title || 'Card Title';
    const text = document.createElement('p'); text.textContent = props.text || 'Card content'; text.style.color = '#667085';
    card.append(title, text); wrapper.appendChild(card);
  } else if (component.type === 'Container') {
    const container = document.createElement('div');
    Object.assign(container.style, { display: 'flex', flexDirection: props.direction === 'row' ? 'row' : 'column', gap: `${Number(props.gap) || 12}px`, padding: `${Number(props.padding) || 16}px`, background: props.background || '#fff', border: '1px solid #ebe8ff', borderRadius: `${Number(props.radius) || 12}px` });
    const note = document.createElement('span'); note.textContent = 'Container'; note.style.color = '#6b7280';
    container.appendChild(note); wrapper.appendChild(container);
  } else if (component.type === 'Icon') {
    const icon = document.createElement('span'); icon.textContent = props.name || '★'; icon.style.fontSize = `${Number(props.size) || 28}px`; icon.style.color = props.color || '#5b45f4'; wrapper.appendChild(icon);
  } else if (component.type === 'List') {
    const heading = document.createElement('h3'); heading.textContent = props.title || 'List';
    const list = document.createElement(props.bullet === false ? 'div' : 'ul');
    (props.items || []).forEach((item) => { const li = document.createElement(props.bullet === false ? 'div' : 'li'); li.textContent = item; list.appendChild(li); });
    wrapper.append(heading, list);
  } else if (component.type === 'Menu') {
    const nav = document.createElement('nav');
    Object.assign(nav.style, { display: 'flex', flexDirection: props.direction === 'column' ? 'column' : 'row', flexWrap: 'wrap', gap: `${Number(props.gap) || 18}px` });
    (props.items || []).forEach((item) => {
      const pageTarget = resolvePageId(item);
      const link = document.createElement(pageTarget ? 'button' : 'span');
      link.textContent = item;
      link.style.fontWeight = '800';
      if (pageTarget) { link.type = 'button'; link.className = 'preview-nav-link'; link.addEventListener('click', () => navigateToPage(pageTarget)); }
      nav.appendChild(link);
    });
    wrapper.appendChild(nav);
  } else if (component.type === 'Divider') {
    const line = document.createElement('div');
    Object.assign(line.style, { height: `${Math.max(1, Number(props.thickness) || 1)}px`, background: props.color || '#e5e7ef' });
    wrapper.appendChild(line);
  } else if (component.type === 'Spacer') {
    const spacer = document.createElement('div'); spacer.style.height = `${Math.max(4, Number(props.height) || 24)}px`; wrapper.appendChild(spacer);
  }

  return wrapper;
}

function renderCurrentPage() {
  const page = definition?.pages?.[currentPageId];
  if (!page) {
    showMessage('This page does not exist.');
    return;
  }
  previewInfo.textContent = `${project.name || 'Untitled App'} • ${page.name}`;
  previewCanvas.innerHTML = '';
  previewCanvas.style.background = page.styles?.background || '#ffffff';
  previewCanvas.style.padding = page.styles?.padding || '24px';

  const components = normalizeComponents(page.components || []);
  if (!components.length) {
    showMessage(`The ${page.name} page is empty.`);
    return;
  }
  components.forEach((component) => {
    const rendered = renderComponent(component);
    if (rendered.children.length) previewCanvas.appendChild(rendered);
  });
}

async function loadPreview() {
  if (!projectId) {
    previewInfo.textContent = 'Missing project ID.';
    showMessage('Open Preview from a project in your workspace.');
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) { window.location.replace('auth/sign-in.html'); return; }

  const { data: loadedProject, error } = await supabase
    .from('projects')
    .select('id,user_id,name,description,app_definition,pages')
    .eq('id', projectId)
    .eq('user_id', authData.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!loadedProject) throw new Error('Project not found or access denied');

  project = loadedProject;
  definition = normalizeDefinition(project);
  currentPageId = resolvePageId(currentPageId) || Object.keys(definition.pages)[0] || 'home';
  renderCurrentPage();
}

window.addEventListener('popstate', renderCurrentPage);
backButton.addEventListener('click', () => { window.location.href = `builder-v2.html?projectId=${encodeURIComponent(projectId || '')}`; });
homeButton.addEventListener('click', () => { window.location.href = 'dashboard/index.html'; });

loadPreview().catch((error) => {
  console.error(error);
  previewInfo.textContent = 'Preview failed';
  showMessage(error.message || 'Could not load this app preview.');
});
