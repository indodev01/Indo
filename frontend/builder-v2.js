import { supabase } from './auth/supabase-config.js';
import {
  makeEmptyDefinition,
  normalizeComponents,
  normalizeDefinition,
  syncLegacyFields
} from './app-definition.js';

const title = document.getElementById('builderTitle');
const status = document.getElementById('projectStatus');
const pageStatus = document.getElementById('pageStatus');
const canvas = document.getElementById('canvas');
const emptyState = document.getElementById('emptyState');
const saveButton = document.getElementById('saveButton');
const previewButton = document.getElementById('previewButton');
const buttons = document.querySelectorAll('.component-button');
const inspectorContent = document.getElementById('inspectorContent');
const selectionLabel = document.getElementById('selectionLabel');
const pageList = document.getElementById('pageList');
const addPageButton = document.getElementById('addPageButton');
const pageDialog = document.getElementById('pageDialog');
const pageNameInput = document.getElementById('pageNameInput');
const cancelPageButton = document.getElementById('cancelPageButton');
const confirmPageButton = document.getElementById('confirmPageButton');
const pageDialogMessage = document.getElementById('pageDialogMessage');

const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');

let currentUser = null;
let project = null;
let definition = makeEmptyDefinition();
let currentPageId = 'home';
let components = [];
let selectedIndex = -1;
let isReady = false;

function showStatus(text) {
  status.textContent = text;
}

function makeComponent(type) {
  const id = `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (type === 'Heading') {
    return { id, type, props: { text: 'Your Heading', size: '28', align: 'left' } };
  }
  if (type === 'Text') {
    return { id, type, props: { text: 'Add your text here.' } };
  }
  if (type === 'Button') {
    return { id, type, props: { label: 'Click Me', link: '' } };
  }
  return { id, type, props: { url: '', alt: 'Image' } };
}

function slugifyPageName(name) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
  let id = base;
  let counter = 2;
  while (definition.pages[id]) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  return id;
}

function currentPage() {
  return definition.pages[currentPageId] || null;
}

function renderPages() {
  pageList.innerHTML = '';
  Object.entries(definition.pages).forEach(([id, page]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `page-button${id === currentPageId ? ' active' : ''}`;
    button.textContent = page.name;
    button.addEventListener('click', () => switchPage(id));
    pageList.appendChild(button);
  });
}

function switchPage(pageId) {
  const nextPage = definition.pages[pageId];
  if (!nextPage) return;

  if (currentPage()) {
    currentPage().components = normalizeComponents(components);
  }

  currentPageId = pageId;
  components = normalizeComponents(nextPage.components || []);
  selectedIndex = -1;
  pageStatus.textContent = nextPage.name;
  renderPages();
  renderCanvas();
  renderInspector();
  showStatus(`Editing ${nextPage.name}`);
}

function openPageDialog() {
  pageNameInput.value = '';
  pageDialogMessage.textContent = '';
  pageDialog.hidden = false;
  window.setTimeout(() => pageNameInput.focus(), 0);
}

function closePageDialog() {
  pageDialog.hidden = true;
}

function addPage() {
  const name = pageNameInput.value.trim();
  if (!name) {
    pageDialogMessage.textContent = 'Enter a page name.';
    return;
  }

  const pageId = slugifyPageName(name);
  if (currentPage()) currentPage().components = normalizeComponents(components);
  definition.pages[pageId] = {
    id: pageId,
    name,
    slug: pageId,
    components: [],
    styles: { background: '#ffffff', padding: '16px' },
    settings: { title: name }
  };

  closePageDialog();
  switchPage(pageId);
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

    const props = component.props || {};

    if (component.type === 'Heading') {
      const element = document.createElement('h3');
      element.className = 'component-preview-heading';
      element.textContent = props.text || 'Your Heading';
      element.style.fontSize = `${Number(props.size) || 28}px`;
      element.style.textAlign = props.align || 'left';
      item.appendChild(element);
    } else if (component.type === 'Text') {
      const element = document.createElement('p');
      element.className = 'component-preview-text';
      element.textContent = props.text || 'Add your text here.';
      item.appendChild(element);
    } else if (component.type === 'Button') {
      const element = document.createElement('span');
      element.className = 'component-preview-button';
      element.textContent = props.label || 'Click Me';
      item.appendChild(element);
    } else if (component.type === 'Image') {
      if (props.url) {
        const element = document.createElement('img');
        element.className = 'component-preview-image';
        element.src = props.url;
        element.alt = props.alt || 'Image';
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

function setComponentProp(key, value) {
  const component = components[selectedIndex];
  if (!component) return;
  component.props = { ...(component.props || {}), [key]: value };
  renderCanvas();
}

function renderInspector() {
  inspectorContent.innerHTML = '';
  if (selectedIndex < 0 || !components[selectedIndex]) {
    selectionLabel.textContent = 'Nothing selected';
    const empty = document.createElement('p');
    empty.className = 'inspector-empty';
    empty.textContent = `Select a component on ${currentPage()?.name || 'this page'} to configure it.`;
    inspectorContent.appendChild(empty);
    return;
  }

  const component = components[selectedIndex];
  const props = component.props || {};
  selectionLabel.textContent = component.type;

  const helper = document.createElement('p');
  helper.className = 'helper';
  helper.textContent = 'Component properties are part of the app definition.';
  inspectorContent.appendChild(helper);

  if (component.type === 'Heading') {
    inspectorContent.appendChild(inputField('Text', props.text, (value) => setComponentProp('text', value)));
    const row = document.createElement('div');
    row.className = 'inspector-row';
    row.appendChild(inputField('Size (px)', props.size, (value) => setComponentProp('size', value), { type: 'number', min: '12', max: '96' }));
    row.appendChild(selectField('Alignment', props.align || 'left', [['left','Left'],['center','Center'],['right','Right']], (value) => setComponentProp('align', value)));
    inspectorContent.appendChild(row);
  } else if (component.type === 'Text') {
    inspectorContent.appendChild(inputField('Text', props.text, (value) => setComponentProp('text', value), { textarea: true }));
  } else if (component.type === 'Button') {
    inspectorContent.appendChild(inputField('Label', props.label, (value) => setComponentProp('label', value)));
    inspectorContent.appendChild(inputField('Link', props.link, (value) => setComponentProp('link', value), { placeholder: 'https://example.com or page id' }));
  } else if (component.type === 'Image') {
    inspectorContent.appendChild(inputField('Image URL', props.url, (value) => setComponentProp('url', value), { placeholder: 'https://...' }));
    inspectorContent.appendChild(inputField('Alt text', props.alt, (value) => setComponentProp('alt', value)));
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

  const { data: loadedProject, error } = await supabase
    .from('projects')
    .select('id,user_id,name,description,app_definition,pages,updated_at')
    .eq('id', projectId)
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (error) throw error;
  if (!loadedProject) throw new Error('Project not found or access denied');

  project = loadedProject;
  definition = normalizeDefinition(project);
  title.textContent = `${project.name || 'Untitled App'} Builder`;
  currentPageId = Object.keys(definition.pages)[0] || 'home';
  components = normalizeComponents(definition.pages[currentPageId]?.components || []);
  pageStatus.textContent = definition.pages[currentPageId]?.name || 'Home';
  renderPages();
  renderCanvas();
  renderInspector();
  showStatus(`Definition v${definition.schemaVersion} loaded`);
  isReady = true;
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    if (!isReady) return;
    components.push(makeComponent(button.dataset.component));
    selectedIndex = components.length - 1;
    renderCanvas();
    renderInspector();
    showStatus(`${button.dataset.component} added to ${currentPage().name}`);
  });
});

addPageButton.addEventListener('click', openPageDialog);
cancelPageButton.addEventListener('click', closePageDialog);
confirmPageButton.addEventListener('click', addPage);
pageNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') addPage();
  if (event.key === 'Escape') closePageDialog();
});

saveButton.addEventListener('click', async () => {
  if (!isReady || !projectId || !currentUser) return;

  saveButton.disabled = true;
  showStatus('Saving definition...');

  try {
    if (currentPage()) currentPage().components = normalizeComponents(components);

    definition.metadata.title = project.name || definition.metadata.title;
    definition.metadata.description = project.description || definition.metadata.description;

    const synced = syncLegacyFields(definition);
    const { data: savedProject, error: saveError } = await supabase
      .from('projects')
      .update({
        pages: synced.pages,
        app_definition: synced.appDefinition,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('user_id', currentUser.id)
      .select('id,user_id,pages,app_definition,updated_at')
      .maybeSingle();

    if (saveError) throw saveError;
    if (!savedProject) throw new Error('No project was updated. Check the project owner and RLS policy.');

    const savedDefinition = normalizeDefinition(savedProject);
    if (JSON.stringify(savedDefinition.pages) !== JSON.stringify(definition.pages)) {
      throw new Error('Supabase returned different definition data after saving.');
    }

    definition = savedDefinition;
    project.pages = savedProject.pages;
    project.app_definition = savedProject.app_definition;
    showStatus(`Saved App Definition v${definition.schemaVersion} • ${Object.keys(definition.pages).length} page${Object.keys(definition.pages).length === 1 ? '' : 's'}`);

    window.setTimeout(() => window.location.replace('dashboard/index.html'), 700);
  } catch (error) {
    console.error(error);
    showStatus(`Save failed: ${error.code || error.message || 'error'}`);
    saveButton.disabled = false;
  }
});

previewButton.addEventListener('click', () => {
  if (currentPage()) currentPage().components = normalizeComponents(components);
  window.location.href = `preview.html?projectId=${encodeURIComponent(projectId || '')}&page=${encodeURIComponent(currentPageId)}`;
});

loadProject().catch((error) => {
  console.error(error);
  showStatus(`Load failed: ${error.code || error.message || 'error'}`);
  buttons.forEach((button) => { button.disabled = true; });
  addPageButton.disabled = true;
  saveButton.disabled = true;
});
