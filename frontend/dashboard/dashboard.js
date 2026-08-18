import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig, isFirebaseConfigured } from '../auth/firebase-config.js';

const signOutButton = document.getElementById('signOutButton');
const dashboardMessage = document.getElementById('dashboardMessage');

function showMessage(message) {
  dashboardMessage.textContent = message;
}

if (!isFirebaseConfigured()) {
  showMessage('Authentication is not configured yet.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  onAuthStateChanged(auth, function (user) {
    if (!user || !user.emailVerified) {
      window.location.href = '../auth/sign-in.html';
      return;
    }

    showMessage(`Signed in as ${user.email}`);
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
