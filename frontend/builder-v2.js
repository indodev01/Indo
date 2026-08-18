import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getDatabase, ref, get, update, set } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';
import { firebaseConfig, realtimeDatabaseUrl, isFirebaseConfigured } from './auth/firebase-config.js';

const title = document.getElementById('builderTitle');
const status = document.getElementById('projectStatus');
const canvas = document.getElementById('canvas');
const saveButton = document.getElementById('saveButton');
const previewButton = document.getElementById('previewButton');
const buttons = document.querySelectorAll('.component-button');

const params = new URLSearchParams(window.location.search);
const projectId = params.get('projectId');
let authUser = null;
let database = null;
let projectRef = null;
let components = [];

function render() {
  canvas.querySelectorAll('.canvas-item').forEach((item) => item.remove());
  const empty = document.getElementById('emptyState');
  if (components.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  components.forEach((name, index) => {
    const item = document.createElement('div');
    item.className = 'canvas-item';
    item.textContent = `${index + 1}. ${name} component`;
    canvas.appendChild(item);
  });
}

if (!isFirebaseConfigured()) {
  status.textContent = 'Firebase not configured';
  buttons.forEach((b) => b.disabled = true);
  saveButton.disabled = true;
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  database = getDatabase(app, realtimeDatabaseUrl);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace('auth/sign-in.html');
      return;
    }
    if (!projectId) {
      status.textContent = 'Missing project';
      buttons.forEach((b) => b.disabled = true);
      saveButton.disabled = true;
      return;
    }
    authUser = user;
    projectRef = ref(database, `users/${user.uid}/projects/${projectId}`);
    try {
      const snapshot = await get(projectRef);
      if (!snapshot.exists()) {
        status.textContent = 'Project not found';
        buttons.forEach((b) => b.disabled = true);
        saveButton.disabled = true;
        return;
      }
      const project = snapshot.val();
      title.textContent = `${project.info?.name || 'Untitled App'} Builder`;
      components = project.appDefinition?.componentsList || [];
      render();
      status.textContent = 'Project loaded';
    } catch (error) {
      status.textContent = `Load failed: ${error.code || 'error'}`;
    }
  });
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    components.push(button.dataset.component);
    render();
    status.textContent = `${button.dataset.component} added`;
  });
});

saveButton.addEventListener('click', async () => {
  if (!authUser || !projectRef) return;
  saveButton.disabled = true;
  status.textContent = 'Saving...';
  try {
    await update(projectRef, {
      'appDefinition/componentsList': components,
      'info/updatedAt': Date.now()
    });
    status.textContent = 'Saved';
  } catch (error) {
    status.textContent = `Save failed: ${error.code || 'error'}`;
  } finally {
    saveButton.disabled = false;
  }
});

previewButton.addEventListener('click', () => {
  window.location.href = `preview.html?projectId=${encodeURIComponent(projectId || '')}`;
});
