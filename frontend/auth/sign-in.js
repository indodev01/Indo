import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const signInForm = document.getElementById('signInForm');
const formMessage = document.getElementById('formMessage');
const signInButton = document.getElementById('signInButton');

function showMessage(message) {
  formMessage.textContent = message;
}

function getReadableAuthError(error) {
  if (error.code === 'auth/invalid-credential') {
    return 'Email or password is incorrect.';
  }

  if (error.code === 'auth/user-not-found') {
    return 'No account exists with this email.';
  }

  if (error.code === 'auth/wrong-password') {
    return 'Email or password is incorrect.';
  }

  if (error.code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait and try again.';
  }

  if (error.code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }

  return 'Sign-in failed. Please try again.';
}

if (!isFirebaseConfigured()) {
  signInButton.disabled = true;
  showMessage('Real authentication is not connected yet. Add the Firebase config first.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  signInForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    signInButton.disabled = true;
    showMessage('Checking your account...');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await signOut(auth);
        showMessage('Please verify your email address before signing in. Check your inbox.');
        return;
      }

      window.location.href = '../dashboard/index.html';
    } catch (error) {
      showMessage(getReadableAuthError(error));
    } finally {
      signInButton.disabled = false;
    }
  });
}
