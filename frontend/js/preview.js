import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, normalizeComponents, syncLegacyFields } from './app-definition.js';
import DataBinding from './data-binding.js';
import { mountWorkflowRuntime } from './workflow-runtime.js';
import { applyPreviewMode } from './preview-mode.js';

const canvas = document.getElementById('previewCanvas');
const info = document.getElementById('previewInfo');
const back = document.getElementById('backButton');
const home = document.getElementById('homeButton');
const q = new URLSearchParams(location.search);
const projectId = q.get('projectId');

let definition = null;
let project = null;
let currentPageId = q.get('page') || 'home';
let stopWorkflowRuntime = () => {};
let lastApiResponse = null;

const pageId = (value) => {
  if (definition?.pages?.[value]) return value;
  const wanted = String(value || '').toLowerCase();
  return Object.entries(definition?.pages || {}).find(([id, page]) =>
    id.toLowerCase() === wanted ||
    String(page.name || '').toLowerCase() === wanted ||
    String(page.slug || '').toLowerCase() === wanted
  )?.[0] || null;
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function dedupePageHeaders(page) {
  if (!page) return false;
  const components = normalizeComponents(page.components || []);
  let headerSeen = false;
  const filtered = components.filter((component) => {
    if (component.type !== 'Header') return true;
    if (headerSeen) return false;
    headerSeen = true;
    return true;
  });
  const changed = filtered.length !== components.length;
  page.components = filtered;
  return changed;
}

function cleanDefinitionHeaders() {
  let changed = false;
  for (const page of Object.values(definition?.pages || {})) {
    if (dedupePageHeaders(page)) changed = true;
  }
  return changed;
}

async function persistCleanDefinition() {
  if (!projectId || !project || !definition) return;
  const synced = syncLegacyFields(definition);
  const { error } = await supabase.from('projects').update({
    pages: clone(synced.pages),
    app_definition: clone(synced.appDefinition),
    updated_at: new Date().toISOString()
  }).eq('id', projectId).eq('user_id', project.user_id);
  if (error) throw error;
  project.pages = clone(synced.pages);
  project.app_definition = clone(synced.appDefinition);
}

function go(value) {
  const id = pageId(value);
  if (!id) return false;
  currentPageId = id;
  const url = new URL(location.href);
  url.searchParams.set('page', id);
  history.pushState({}, '', url);
  render();
  return true;
}

function btn(label, fn) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', fn);
  button.style.cssText = 'padding:9px 13px;border:0;border-radius:9px;background:#5b45f4;color:#fff;font-weight:700;cursor:pointer';
  return button;
}

function renderHeader(component) {
  const props = component.props || {};
  const root = document.createElement('header');
  root.style.cssText = `position:relative;display:flex;align-items:center;justify-content:space-between;min-height:64px;padding:0 16px;background:${props.menuBackground || '#fff'};color:${props.titleColor || '#111827'};border-radius:12px 12px 0 0;border-bottom:1px solid rgba(0,0,0,.08)`;

  const title = document.createElement('strong');
  title.textContent = props.title || project?.name || 'My App';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = props.menuIcon || '☰';
  toggle.style.cssText = `border:0;border-radius:8px;padding:8px 10px;cursor:pointer;color:${props.menuIconColor || props.titleColor || '#111827'};background:${props.menuBackground || 'rgba(16,24,40,.04)'};font-size:${Number(props.menuIconSize) || 22}px`;

  const menu = document.createElement('div');
  menu.style.cssText = 'display:none;position:absolute;top:70px;right:10px;z-index:20;width:220px;padding:8px;border-radius:12px;background:#0f172a';

  toggle.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });

  (Array.isArray(props.items) ? props.items : Object.keys(definition.pages || {})).forEach((id) => {
    const page = definition.pages[id];
    if (!page) return;
    const item = btn(page.name, () => {
      menu.style.display = 'none';
      go(id);
    });
    item.style.width = '100%';
    menu.appendChild(item);
  });

  root.append(title, toggle, menu);
  return root;
}

function renderComponent(component) {
  const props = component.props || {};
  const wrapper = document.createElement('section');
  wrapper.className = 'preview-item';

  let element;
  if (component.type === 'Header') {
    wrapper.appendChild(renderHeader(component));
  } else if (component.type === 'Navigation') {
    element = document.createElement('nav');
    element.style.cssText = 'display:flex;gap:14px;flex-wrap:wrap';
    (Array.isArray(props.items) ? props.items : []).forEach((item) => element.appendChild(btn(item, () => go(item))));
    wrapper.appendChild(element);
  } else if (component.type === 'Hero Section') {
    element = document.createElement('div');
    element.style.cssText = 'padding:36px 20px;border-radius:14px;background:#111827;color:#fff';
    const heading = document.createElement('h2');
    heading.textContent = props.title || '';
    const text = document.createElement('p');
    text.textContent = props.text || '';
    element.append(heading, text, btn(props.button || 'Get Started', () => {}));
    wrapper.appendChild(element);
  } else if (component.type === 'Buttons') {
    element = btn(props.label || 'Get Started', () => props.link && go(props.link));
    wrapper.appendChild(element);
  } else if (component.type === 'Cards') {
    element = document.createElement('div');
    element.style.cssText = 'padding:18px;border:1px solid #e5e7eb;border-radius:14px';
    const heading = document.createElement('h3');
    heading.textContent = props.title || 'Card title';
    const text = document.createElement('p');
    text.textContent = props.text || 'Card content';
    element.append(heading, text);
    wrapper.appendChild(element);
  } else if (component.type === 'Images' || component.type === 'Image') {
    if (props.url) {
      element = document.createElement('img');
      element.src = props.url;
      element.alt = props.alt || 'Image';
      element.style.maxWidth = '100%';
      wrapper.appendChild(element);
    }
  } else if (component.type === 'Videos') {
    element = document.createElement('video');
    element.controls = props.controls !== false;
    element.autoplay = !!props.autoplay;
    element.src = props.url || '';
    element.style.width = '100%';
    wrapper.appendChild(element);
  } else if (component.type === 'Music Player') {
    const heading = document.createElement('strong');
    heading.textContent = props.title || 'Now Playing';
    element = document.createElement('audio');
    element.controls = true;
    element.src = props.src || '';
    wrapper.append(heading, element);
  } else if (component.type === 'Forms') {
    element = document.createElement('form');
    element.addEventListener('submit', (event) => event.preventDefault());
    const heading = document.createElement('h3');
    heading.textContent = props.title || 'Contact us';
    element.appendChild(heading);
    (Array.isArray(props.fields) ? props.fields : []).forEach((fieldName) => {
      const input = document.createElement('input');
      input.name = fieldName;
      input.placeholder = fieldName;
      input.style.cssText = 'display:block;width:100%;margin:7px 0;padding:10px;border:1px solid #d1d5db;border-radius:8px';
      element.appendChild(input);
    });
    element.appendChild(btn('Submit', () => {}));
    wrapper.appendChild(element);
  } else if (component.type === 'Input') {
    element = document.createElement('input');
    element.name = props.name || props.label || 'value';
    element.placeholder = props.placeholder || props.label || '';
    element.type = props.inputType || 'text';
    element.required = !!props.required;
    element.style.cssText = 'width:100%;padding:11px;border:1px solid #d6d9e4;border-radius:9px';
    wrapper.appendChild(element);
  } else if (component.type === 'Text') {
    element = document.createElement('p');
    element.textContent = props.text || '';
    wrapper.appendChild(element);
  } else if (component.type === 'Heading') {
    element = document.createElement('h1');
    element.textContent = props.text || '';
    wrapper.appendChild(element);
  } else if (component.type === 'Container') {
    element = document.createElement('div');
    element.textContent = 'Container';
    element.style.cssText = `padding:${Number(props.padding) || 16}px;background:${props.background || '#fff'};border-radius:${Number(props.radius) || 12}px`;
    wrapper.appendChild(element);
  } else if (component.type === 'Icon') {
    element = document.createElement('span');
    element.textContent = props.name || '★';
    element.style.fontSize = `${Number(props.size) || 28}px`;
    wrapper.appendChild(element);
  } else if (component.type === 'List') {
    element = document.createElement('ul');
    (Array.isArray(props.items) ? props.items : []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      element.appendChild(li);
    });
    wrapper.appendChild(element);
  } else if (component.type === 'Divider') {
    wrapper.appendChild(document.createElement('hr'));
  } else if (component.type === 'Spacer') {
    element = document.createElement('div');
    element.style.height = `${Number(props.height) || 24}px`;
    wrapper.appendChild(element);
  } else {
    element = document.createElement('div');
    element.textContent = props.text || component.type;
    wrapper.appendChild(element);
  }
  return wrapper;
}

function responseValue(data, path) {
  return String(path || '').replace(/^response\.?/, '').split('.').filter(Boolean).reduce((value, key) => value?.[key], data);
}

function loadBindings() {
  try {
    return JSON.parse(localStorage.getItem(`indo-data-bindings-${projectId}`) || '{}');
  } catch {
    return {};
  }
}

async function applyDatabaseBindings() {
  const bindings = loadBindings();
  const items = [...canvas.querySelectorAll('.preview-item')];
  for (let index = 0; index < items.length; index += 1) {
    const binding = bindings[String(index)];
    if (!binding?.tableId) continue;
    try {
      const rows = await DataBinding.records(binding.tableId, 50);
      const host = document.createElement('div');
      host.className = 'preview-data-list';
      host.style.cssText = 'display:grid;gap:10px;margin-top:12px';
      rows.forEach((row) => {
        const card = document.createElement('article');
        card.style.cssText = 'padding:12px;border:1px solid #e5e7eb;border-radius:10px';
        const data = row.data || {};
        const title = data.title ?? data.name ?? data.text ?? data.label ?? 'Record';
        const desc = data.description ?? data.value ?? '';
        const image = data.image ?? data.image_url ?? data.url;
        if (image) {
          const img = document.createElement('img');
          img.src = String(image);
          img.alt = String(title);
          img.style.cssText = 'width:100%;max-height:180px;object-fit:cover;border-radius:8px';
          card.appendChild(img);
        }
        const heading = document.createElement('strong');
        heading.textContent = String(title);
        card.appendChild(heading);
        if (desc) {
          const p = document.createElement('p');
          p.textContent = String(desc);
          card.appendChild(p);
        }
        host.appendChild(card);
      });
      if (!rows.length) host.textContent = 'No records yet';
      items[index].appendChild(host);
    } catch {
      const error = document.createElement('p');
      error.textContent = 'Could not load database records';
      error.style.opacity = '.6';
      items[index].appendChild(error);
    }
  }
}

function applyResponseBindings() {
  if (!lastApiResponse) return;
  const bindings = loadBindings();
  canvas.querySelectorAll('.preview-item').forEach((item, index) => {
    const binding = bindings[String(index)]?.responseBinding;
    if (!binding?.path) return;
    const value = responseValue(lastApiResponse.data, binding.path);
    if (value == null) return;
    const target = item.querySelector('h1,h2,h3,p,span,img,input,textarea,button');
    if (!target) return;
    if (target instanceof HTMLImageElement) target.src = String(value);
    else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) target.value = String(value);
    else target.textContent = String(value);
  });
}

function render() {
  const page = definition?.pages?.[currentPageId];
  if (!page) {
    canvas.textContent = 'Page not found';
    return;
  }
  info.textContent = `${project.name || 'Untitled App'} • ${page.name}`;
  canvas.innerHTML = '';
  canvas.style.background = page.styles?.background || '#fff';
  canvas.style.padding = page.styles?.padding || '24px';
  page.components = normalizeComponents(page.components || []);
  page.components.forEach((component) => canvas.appendChild(renderComponent(component)));
  applyDatabaseBindings().then(applyResponseBindings);
}

async function load() {
  if (!projectId) throw new Error('Missing project');
  const auth = await supabase.auth.getUser();
  if (auth.error) throw auth.error;
  if (!auth.data.user) {
    location.replace('../auth/sign-in.html');
    return;
  }
  const result = await supabase.from('projects')
    .select('id,user_id,name,description,start_mode,app_definition,pages')
    .eq('id', projectId).eq('user_id', auth.data.user.id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Project not found');

  project = result.data;
  definition = normalizeDefinition(project);
  const cleaned = cleanDefinitionHeaders();
  if (cleaned) {
    await persistCleanDefinition();
  }

  applyPreviewMode(project, definition);
  currentPageId = pageId(currentPageId) || Object.keys(definition.pages)[0] || 'home';
  render();
  stopWorkflowRuntime();
  stopWorkflowRuntime = mountWorkflowRuntime(projectId);
}

window.addEventListener('indo:api-result', (event) => {
  lastApiResponse = event.detail;
  applyResponseBindings();
});

back?.addEventListener('click', () => {
  location.href = `builder-v2.html?projectId=${encodeURIComponent(projectId || '')}`;
});

home?.addEventListener('click', () => {
  location.href = 'index.html';
});

window.addEventListener('popstate', () => render());

load().catch((error) => {
  if (info) info.textContent = 'Preview failed';
  if (canvas) canvas.textContent = error.message || 'Could not load preview';
});
