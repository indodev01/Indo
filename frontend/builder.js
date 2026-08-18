import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getDatabase, ref, get, update } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';
import { firebaseConfig, realtimeDatabaseUrl, isFirebaseConfigured } from './auth/firebase-config.js';

const builderTitle = document.getElementById('builderTitle');
const builderMessage = document.getElementById('builderMessage');
const projectStatus = document.getElementById('projectStatus');
const saveStatus = document.getElementById('saveStatus');
const projectName = document.getElementById('projectName');
const projectMode = document.getElementById('projectMode');
const projectState = document.getElementById('projectState');
const projectIdText = document.getElementById('projectIdText');
const canvas = document.getElementById('canvas');
const emptyState = document.getElementById('emptyState');
const saveButton = document.getElementById('saveButton');
const previewButton = document.getElementById('previewButton');
const componentButtons = document.querySelectorAll('.component-button');

const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');
let auth = null;
let database = null;
let currentUser = null;
let projectData = null;

function message(text) {
  builderMessage.textContent = text;
}

function setSaveStatus(text, mode = 'saved') {
  saveStatus.textContent = text;
  saveStatus.style.background = mode === 'saving' ? '#fff6e6' : '#edf8f1';
  saveStatus.style.color = mode === 'saving' ? '#8a5b12' : '#227a42';
}

function createCanvasItem(type) {
  const item = document.createElement('article');
  item.className = 'canvas-item';
  item.dataset.component = type;

  const title = document.createElement('div');
  title.className = 'canvas-item-title';
  title.textContent = type;

  const text = document.createElement('div');
  text.className = 'canvas-item-text';
  text.textContent = `${type} component added to your page.`;

  item.append(title, text);
  return item;
}

function renderCanvas() {
  canvas.innerHTML = '';
  const components = projectData?.appDefinition?.components || {};
  const entries = Object.values(components);

  if (!entries.length) {
    canvas.appendChild(emptyState);
    return;
  }

  entries.forEach((component) => {
    canvas.appendChild(createCanvasItem(component.type || 'Component'));
  });
}

function renderProject() {
  const info = projectData?.info || {};
  builderTitle.textContent = `${info.name || 'Untitled App'} Builder`;
  projectStatus.textContent = info.description || 'Build your app step by step.';
  projectName.textContent = info.name || 'Untitled App';
  projectMode.textContent = info.startMode === 'template' ? 'Template' : 'Blank App';
  projectState.textContent = info.status || 'Draft';
  projectIdText.textContent = projectId || '—';
  renderCanvas();
}

async function loadProject() {
  if (!projectId) {
    message('No project was selected. Return to Home and open a project.');
    return;
  }

  if (!currentUser || !database) return;

  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}/projects/${projectId}`));
    if (!snapshot.exists()) {
      message('Project not found for this account.');
      return;
    }

    projectData = snapshot.val();
    projectData.appDefinition = projectData.appDefinition || { pages: {}, components: {}, workflows: {}, settings: {} };
    projectData.appDefinition.components = projectData.appDefinition.components || {};
    renderProject();
    message('Project loaded.');
  } catch (error) {
    message(`Could not load project (${error.code || 'unknown-error'}).`);
  }
}

async function saveProject() {
  if (!currentUser || !database || !projectData || !projectId) return;
  setSaveStatus('Saving...', 'saving');

  try {
    await update(ref(database, `users/${currentUser.uid}/projects/${projectId}`), {
      appDefinition: projectData.appDefinition,
      'info/updatedAt': Date.now()
    });
    setSaveStatus('All changes saved');
    message('Changes saved.');
  } catch (error) {
    setSaveStatus('Save failed', 'saving');
    message(`Could not save (${error.code || 'unknown-error'}).`);
  }
}

async function addComponent(type) {
  if (!projectData) return;

  const componentKey = `component_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  projectData.appDefinition.components[componentKey] = {
    id: componentKey,
    type,
    createdAt: Date.now()
  };

  renderCanvas();
  setSaveStatus('Unsaved changes', 'saving');
  message(`${type} added. Saving...`);
  await saveProject();
}

previewButton.addEventListener('click', function (event) {
  if (!projectId) {
    event.preventDefault();
    return;
  }
  previewButton.href = `preview.html?projectId=${encodeURIComponent(projectId)}`;
});

saveButton.addEventListener('click', saveProject);

componentButtons.forEach((button) => {
  button.addEventListener('click', () => addComponent(button.dataset.component || 'Component'));
});

if (!isFirebaseConfigured()) {
  message('Firebase is not configured.');
  saveButton.disabled = true;
  componentButtons.forEach((button) => { button.disabled = true; });
} else {
  const firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  database = getDatabase(firebaseApp, realtimeDatabaseUrl);

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
      window.location.replace('auth/sign-in.html');
      return;
    }

    await loadProject();
  });
}
