import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  getDatabase,
  ref,
  get
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';
import {
  firebaseConfig,
  realtimeDatabaseUrl,
  isFirebaseConfigured
} from './auth/firebase-config.js';

const authAction = document.getElementById('authAction');
const createAction = document.getElementById('createAction');
const workspaceMessage = document.getElementById('workspaceMessage');

function setLoggedOutState() {
  authAction.textContent = 'Sign In';
  authAction.href = 'auth/sign-in.html';
  authAction.classList.remove('logout-button');
  createAction.textContent = 'Create App';
  createAction.href = 'create-app.html';
  workspaceMessage.textContent = 'Create and customize apps without writing complicated code.';
}

function setLoggedInState(user, userData) {
  const name = userData?.profile?.name || user.displayName || user.email?.split('@')[0] || 'there';

  authAction.textContent = 'Logout';
  authAction.href = '#logout';
  authAction.classList.add('logout-button');
  createAction.textContent = 'Create App';
  createAction.href = 'create-app.html';
  workspaceMessage.textContent = `Welcome back, ${name}. Create and customize your apps without writing complicated code.`;

  authAction.onclick = async function (event) {
    event.preventDefault();
    authAction.textContent = 'Logging out...';
    authAction.style.pointerEvents = 'none';

    try {
      await signOut(auth);
      window.location.replace('landing/index.html');
    } catch (error) {
      authAction.textContent = 'Logout';
      authAction.style.pointerEvents = '';
      workspaceMessage.textContent = 'Could not log out. Please try again.';
    }
  };
}

if (!isFirebaseConfigured()) {
  setLoggedOutState();
} else {
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const database = getDatabase(firebaseApp, realtimeDatabaseUrl);

  onAuthStateChanged(auth, async function (user) {
    if (!user) {
      setLoggedOutState();
      return;
    }

    try {
      const snapshot = await get(ref(database, `users/${user.uid}`));
      const userData = snapshot.exists() ? snapshot.val() : null;
      setLoggedInState(user, userData);
    } catch (error) {
      setLoggedInState(user, null);
    }
  });
}
