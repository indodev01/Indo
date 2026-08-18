import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const signUpForm = document.getElementById('signUpForm');
const formMessage = document.getElementById('formMessage');
const signUpButton = document.getElementById('signUpButton');

function showMessage(message) {
  formMessage.textContent = message;
}

function getReadableAuthError(error) {
  if (error.code === 'auth/email-already-in-use') {
    return 'An account already exists with this email.';
  }

  if (error.code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }

  if (error.code === 'auth/weak-password') {
    return 'Password is too weak. Use a stronger password.';
  }

  return 'Account creation failed. Please try again.';
}

if (!isFirebaseConfigured()) {
  signUpButton.disabled = true;
  showMessage('Real authentication is not connected yet. Add the Firebase config first.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  signUpForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    signUpButton.disabled = true;
    showMessage('Creating your account...');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user);
      await signOut(auth);

      showMessage('Account created. Check your email and verify it before signing in.');
      signUpForm.reset();
    } catch (error) {
      showMessage(getReadableAuthError(error));
    } finally {
      signUpButton.disabled = false;
    }
  });
}
