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
import { firebaseConfig, realtimeDatabaseUrl, isFirebaseConfigured } from '../auth/firebase-config.js';

const signOutButton = document.getElementById('signOutButton');
const dashboardMessage = document.getElementById('dashboardMessage');

function showMessage(message) {
  dashboardMessage.textContent = message;
}

if (!isFirebaseConfigured()) {
  showMessage('Firebase is not configured yet.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app, realtimeDatabaseUrl);

  onAuthStateChanged(auth, async function (user) {
    if (!user) {
      window.location.href = '../auth/sign-in.html';
      return;
    }

    showMessage('Loading your workspace...');

    try {
      const snapshot = await get(ref(database, `users/${user.uid}`));
      const userData = snapshot.exists() ? snapshot.val() : null;
      const name = userData?.profile?.name || user.displayName || user.email || 'Builder';

      showMessage(`Welcome, ${name}. You are signed in as ${user.email || 'Google user'}.`);
    } catch (error) {
      showMessage(`Welcome, ${user.displayName || user.email || 'Builder'}. Your account is signed in.`);
    }
  });

  signOutButton.addEventListener('click', async function () {
    signOutButton.disabled = true;
    showMessage('Signing out...');

    try {
      await signOut(auth);
      window.location.href = '../landing/index.html';
    } catch (error) {
      showMessage('Could not sign out. Please try again.');
      signOutButton.disabled = false;
    }
  });
}
