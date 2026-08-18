import { supabase } from './auth/supabase-config.js';

const title = document.getElementById('builderTitle');
const status = document.getElementById('projectStatus');
const canvas = document.getElementById('canvas');
const emptyState = document.getElementById('emptyState');
const saveButton = document.getElementById('saveButton');
const previewButton = document.getElementById('previewButton');
const buttons = document.querySelectorAll('.component-button');
const inspectorContent = document.getElementById('inspectorContent');
const selectionLabel = document.getElementById('selectionLabel');

const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');

let currentUser = null;
let components = [];
let selectedIndex = -1;
let isReady = false;

function showStatus(text) { status.textContent = text; }

function makeComponent(type) {
  const base = { id: `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type };
  if (type === 'Heading') return { ...base, text: 'Your Heading', size: '28', align: 'left' };
  if (type === 'Text') return { ...base, text: 'Add your text here.' };
  if (type === 'Button') return { ...base, label: 'Click Me', link: '' };
  return { ...base, url: '', alt: 'Image' };
}

function normalizeComponent(value, index) {
  if (typeof value === 'string') {
    const component = makeComponent(value);
    component.id = `${value.toLowerCase()}-${index + 1}-${Date.now()}`;
    return component;
  }
  return value;
}

function normalizeComponents(values) {
  return Array.isArray(values) ? values.map(normalizeComponent) : [];
}

function renderCanvas() {
  canvas.querySelectorAll('.canvas-item').forEach((item) => item.remove());
  emptyState.style.display = components.length === 0 ? '' : 'none';
  components.forEach((component, index) => {
    const item = document.createElement('div');
    item.className = 'canvas-item';
    if (index === selectedIndex) item.classList.add('selected');
    const typeLabel = document.createElement('span');
    typeLabel.className = 'component-type';
    typeLabel.textContent = component.type;
    item.appendChild(typeLabel);
    if (component.type === 'Heading') {
      const element = document.createElement('h3');
      element.className = 'component-preview-heading';
      element.textContent = component.text || 'Your Heading';
      element.style.fontSize = `${Number(component.size) || 28}px`;
      element.style.textAlign = component.align || 'left';
      item.appendChild(element);
    } else if (component.type === 'Text') {
      const element = document.createElement('p');
      element.className = 'component-preview-text';
      element.textContent = component.text || 'Add your text here.';
      item.appendChild(element);
    } else if (component.type === 'Button') {
      const element = document.createElement('span');
      element.className = 'component-preview-button';
      element.textContent = component.label || 'Click Me';
      item.appendChild(element);
    } else if (component.type === 'Image') {
      if (component.url) {
        const element = document.createElement('img');
        element.className = 'component-preview-image';
        element.src = component.url;
        element.alt = component.alt || 'Image';
        element.onerror = () => { element.style.display = 'none'; };
        item.appendChild(element);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'component-preview-text';
        placeholder.textContent = 'Image URL not set';
        item.appendChild(placeholder);
      }
    }
    item.addEventListener('click', () => selectComponent(index));
    canvas.appendChild(item);
  });
}

function inputField(labelText, value, handler, options = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'inspector-field';
  const label = document.createElement('label');
  label.textContent = labelText;
  wrap.appendChild(label);
  const input = document.createElement(options.textarea ? 'textarea' : 'input');
  if (options.type) input.type = options.type;
  input.value = value ?? '';
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.min) input.min = options.min;
  if (options.max) input.max = options.max;
  input.addEventListener('input', (event) => handler(event.target.value));
  wrap.appendChild(input);
  return wrap;
}

function selectField(labelText, value, choices, handler) {
  const wrap = document.createElement('div');
  wrap.className = 'inspector-field';
  const label = document.createElement('label');
  label.textContent = labelText;
  wrap.appendChild(label);
  const select = document.createElement('select');
  choices.forEach(([optionValue, optionLabel]) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    select.appendChild(option);
  });
  select.addEventListener('change', (event) => handler(event.target.value));
  wrap.appendChild(select);
  return wrap;
}

function renderInspector() {
  inspectorContent.innerHTML = '';
  if (selectedIndex < 0 || !components[selectedIndex]) {
    selectionLabel.textContent = 'Nothing selected';
    const empty = document.createElement('p');
    empty.className = 'inspector-empty';
    empty.textContent = 'Select a component on the canvas to configure it.';
    inspectorContent.appendChild(empty);
    return;
  }
  const component = components[selectedIndex];
  selectionLabel.textContent = component.type;
  const helper = document.createElement('p');
  helper.className = 'helper';
  helper.textContent = 'Changes are saved to Supabase when you press Save.';
  inspectorContent.appendChild(helper);
  const setValue = (key, value) => { components[selectedIndex][key] = value; renderCanvas(); };
  if (component.type === 'Heading') {
    inspectorContent.appendChild(inputField('Text', component.text, (value) => setValue('text', value)));
    const row = document.createElement('div');
    row.className = 'inspector-row';
    row.appendChild(inputField('Size (px)', component.size, (value) => setValue('size', value), { type: 'number', min: '12', max: '96' }));
    row.appendChild(selectField('Alignment', component.align || 'left', [['left','Left'],['center','Center'],['right','Right']], (value) => setValue('align', value)));
    inspectorContent.appendChild(row);
  } else if (component.type === 'Text') {
    inspectorContent.appendChild(inputField('Text', component.text, (value) => setValue('text', value), { textarea: true }));
  } else if (component.type === 'Button') {
    inspectorContent.appendChild(inputField('Label', component.label, (value) => setValue('label', value)));
    inspectorContent.appendChild(inputField('Link', component.link, (value) => setValue('link', value), { placeholder: 'https://example.com' }));
  } else if (component.type === 'Image') {
    inspectorContent.appendChild(inputField('Image URL', component.url, (value) => setValue('url', value), { placeholder: 'https://...' }));
    inspectorContent.appendChild(inputField('Alt text', component.alt, (value) => setValue('alt', value)));
  }
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger';
  deleteButton.textContent = 'Delete Component';
  deleteButton.addEventListener('click', () => {
    components.splice(selectedIndex, 1);
    selectedIndex = -1;
    renderCanvas();
    renderInspector();
    showStatus('Component removed');
  });
  inspectorContent.appendChild(deleteButton);
}

function selectComponent(index) {
  selectedIndex = index;
  renderCanvas();
  renderInspector();
}

async function loadProject() {
  if (!projectId) throw new Error('Missing project');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  currentUser = authData.user;
  if (!currentUser) {
    window.location.replace('auth/sign-in.html');
    return;
  }
  const { data: project, error } = await supabase
    .from('projects')
    .select('id,user_id,name,app_definition,updated_at')
    .eq('id', projectId)
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) throw error;
  if (!project) throw new Error('Project not found or access denied');
  title.textContent = `${project.name || 'Untitled App'} Builder`;
  components = normalizeComponents(project.app_definition?.componentsList || []);
  renderCanvas();
  renderInspector();
  showStatus('Project loaded');
  isReady = true;
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    if (!isReady) return;
    components.push(makeComponent(button.dataset.component));
    selectedIndex = components.length - 1;
    renderCanvas();
    renderInspector();
    showStatus(`${button.dataset.component} added`);
  });
});

saveButton.addEventListener('click', async () => {
  if (!isReady || !projectId || !currentUser) return;
  saveButton.disabled = true;
  showStatus('Saving...');
  try {
    const appDefinition = { pages: {}, components: {}, componentsList: components, workflows: {}, settings: {} };
    const { data: savedProject, error: saveError } = await supabase
      .from('projects')
      .update({ app_definition: appDefinition, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', currentUser.id)
      .select('id,user_id,app_definition,updated_at')
      .maybeSingle();
    if (saveError) throw saveError;
    if (!savedProject) throw new Error('No project was updated. Check the project owner and RLS policy.');
    if (savedProject.user_id !== currentUser.id) throw new Error('Project ownership verification failed.');
    const savedComponents = savedProject.app_definition?.componentsList || [];
    if (JSON.stringify(savedComponents) !== JSON.stringify(components)) throw new Error('Supabase returned different data after saving.');
    showStatus(`Saved to Supabase • ${savedComponents.length} component${savedComponents.length === 1 ? '' : 's'}`);
  } catch (error) {
    console.error(error);
    showStatus(`Save failed: ${error.code || error.message || 'error'}`);
  } finally {
    saveButton.disabled = false;
  }
});

previewButton.addEventListener('click', () => {
  window.location.href = `preview.html?projectId=${encodeURIComponent(projectId || '')}`;
});

loadProject().catch((error) => {
  console.error(error);
  showStatus(`Load failed: ${error.code || error.message || 'error'}`);
  buttons.forEach((button) => { button.disabled = true; });
  saveButton.disabled = true;
});