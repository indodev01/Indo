import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const formMessage = document.getElementById('formMessage');
const resetButton = document.getElementById('resetButton');

function showMessage(message) {
  formMessage.textContent = message;
}

if (!isFirebaseConfigured()) {
  resetButton.disabled = true;
  showMessage('Real authentication is not connected yet. Add the Firebase config first.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  forgotPasswordForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();

    resetButton.disabled = true;
    showMessage('Sending password reset link...');

    try {
      await sendPasswordResetEmail(auth, email);
      showMessage('Password reset link sent. Check your email inbox.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        showMessage('No account exists with this email.');
      } else if (error.code === 'auth/invalid-email') {
        showMessage('Please enter a valid email address.');
      } else {
        showMessage('Could not send reset link. Please try again.');
      }
    } finally {
      resetButton.disabled = false;
    }
  });
}
