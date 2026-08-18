import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  getDatabase,
  ref,
  push,
  set
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';
import {
  firebaseConfig,
  realtimeDatabaseUrl,
  isFirebaseConfigured
} from './auth/firebase-config.js';

const form = document.getElementById('createAppForm');
const button = document.getElementById('createButton');
const message = document.getElementById('message');
const appNameInput = document.getElementById('appName');
const appDescriptionInput = document.getElementById('appDescription');
const choiceInputs = document.querySelectorAll('input[name="startMode"]');

function showMessage(text) {
  message.textContent = text;
}

function setChoiceState(selectedInput) {
  document.querySelectorAll('.choice').forEach((choice) => {
    choice.classList.remove('active');
  });
  selectedInput.closest('.choice')?.classList.add('active');
}

choiceInputs.forEach((input) => {
  input.addEventListener('change', () => setChoiceState(input));
});

if (!isFirebaseConfigured()) {
  button.disabled = true;
  showMessage('Firebase is not configured.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app, realtimeDatabaseUrl);
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
    const selected = document.querySelector('input[name="startMode"]:checked');
    const startMode = selected ? selected.value : 'blank';

    if (!name) {
      showMessage('Please enter an app name.');
      appNameInput.focus();
      return;
    }

    button.disabled = true;
    showMessage('Creating your app...');

    try {
      const now = Date.now();
      const projectRef = push(ref(database, `users/${currentUser.uid}/projects`));
      const projectId = projectRef.key;

      if (!projectId) {
        throw new Error('Could not generate a project ID.');
      }

      await set(projectRef, {
        info: {
          id: projectId,
          name,
          description,
          startMode,
          status: 'draft',
          createdAt: now,
          updatedAt: now
        },
        appDefinition: {
          pages: {},
          components: {},
          workflows: {},
          settings: {}
        },
        versions: {
          v1: {
            status: 'draft',
            createdAt: now,
            updatedAt: now
          }
        }
      });

      showMessage('App created successfully. Opening the builder...');
      window.location.replace(`builder.html?projectId=${encodeURIComponent(projectId)}`);
    } catch (error) {
      console.error(error);
      showMessage(`Could not create app (${error.code || 'unknown-error'}). Please try again.`);
      button.disabled = false;
    }
  });
}
