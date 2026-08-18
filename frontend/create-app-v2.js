import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getDatabase, ref, push, set } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';
import { firebaseConfig, realtimeDatabaseUrl, isFirebaseConfigured } from './auth/firebase-config.js';

const form = document.getElementById('createAppForm');
const button = document.getElementById('createButton');
const message = document.getElementById('message');

function showMessage(text) { message.textContent = text; }

if (!isFirebaseConfigured()) {
  button.disabled = true;
  showMessage('Firebase is not configured.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app, realtimeDatabaseUrl);
  let currentUser = null;

  onAuthStateChanged(auth, user => {
    currentUser = user;
    if (!user) {
      window.location.href = 'auth/sign-in.html';
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentUser) return;

    const name = document.getElementById('appName').value.trim();
    const description = document.getElementById('appDescription').value.trim();
    const startMode = document.querySelector('input[name="startMode"]:checked').value;

    button.disabled = true;
    showMessage('Creating your app...');

    try {
      const projectRef = push(ref(database, `users/${currentUser.uid}/projects`));
      await set(projectRef, {
        info: {
          name,
          description,
          startMode,
          status: 'draft',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        appDefinition: {
          pages: {},
          components: {},
          workflows: {},
          settings: {}
        },
        versions: {
          v1: { status: 'draft', createdAt: Date.now() }
        }
      });

      window.location.href = `builder.html?projectId=${encodeURIComponent(projectRef.key)}`;
    } catch (error) {
      showMessage(`Could not create app (${error.code || 'unknown-error'}). Please try again.`);
      button.disabled = false;
    }
  });
}
