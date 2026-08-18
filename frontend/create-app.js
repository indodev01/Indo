import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getDatabase, ref, push, set } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';
import { firebaseConfig, realtimeDatabaseUrl, isFirebaseConfigured } from './auth/firebase-config.js';

const form = document.getElementById('createAppForm');
const button = document.getElementById('createButton');
const message = document.getElementById('message');
const appNameInput = document.getElementById('appName');
const appDescriptionInput = document.getElementById('appDescription');
const startModeInput = document.getElementById('startMode');
const selectedModeLabel = document.getElementById('selectedModeLabel');
const optionButtons = document.querySelectorAll('.start-option');

function showMessage(text) { message.textContent = text; }
function selectStartMode(mode) {
  const selected = mode === 'template' ? 'template' : 'blank';
  startModeInput.value = selected;
  optionButtons.forEach((option) => {
    const active = option.dataset.mode === selected;
    option.classList.toggle('selected', active);
    option.setAttribute('aria-checked', String(active));
  });
  selectedModeLabel.textContent = selected === 'template' ? 'Template selected' : 'Blank App selected';
}
optionButtons.forEach((option) => option.addEventListener('click', () => selectStartMode(option.dataset.mode)));
selectStartMode('blank');

if (!isFirebaseConfigured()) {
  button.disabled = true;
  showMessage('Firebase is not configured.');
} else {
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const database = getDatabase(firebaseApp, realtimeDatabaseUrl);
  let currentUser = null;
  let authReady = false;

  button.disabled = true;
  showMessage('Checking your account...');

  onAuthStateChanged(auth, (user) => {
    authReady = true;
    currentUser = user;
    if (!user) {
      window.location.replace('auth/sign-in.html');
      return;
    }
    button.disabled = false;
    showMessage('');
    appNameInput.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!authReady || !currentUser) {
      showMessage('Please wait for your account session to load.');
      return;
    }
    const name = appNameInput.value.trim();
    const description = appDescriptionInput.value.trim();
    const startMode = startModeInput.value === 'template' ? 'template' : 'blank';
    if (!name) {
      showMessage('Please enter an app name.');
      appNameInput.focus();
      return;
    }
    button.disabled = true;
    showMessage(startMode === 'template' ? 'Creating your project...' : 'Creating your blank app...');
    try {
      const now = Date.now();
      const projectRef = push(ref(database, `users/${currentUser.uid}/projects`));
      const projectId = projectRef.key;
      if (!projectId) throw new Error('Could not generate a project ID.');
      await set(projectRef, {
        info: { id: projectId, name, description, startMode, status: 'draft', createdAt: now, updatedAt: now },
        appDefinition: { pages: {}, components: {}, componentsList: [], workflows: {}, settings: {} },
        versions: { v1: { status: 'draft', createdAt: now, updatedAt: now } }
      });
      if (startMode === 'template') {
        showMessage('Project created. Opening templates...');
        window.location.replace(`templates.html?projectId=${encodeURIComponent(projectId)}`);
      } else {
        showMessage('Blank app created. Opening the builder...');
        window.location.replace(`builder-v2.html?projectId=${encodeURIComponent(projectId)}`);
      }
    } catch (error) {
      console.error(error);
      showMessage(`Could not create app (${error.code || 'unknown-error'}). Please try again.`);
      button.disabled = false;
    }
  });
}
