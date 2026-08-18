import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const signInForm = document.getElementById('signInForm');
const formMessage = document.getElementById('formMessage');
const signInButton = document.getElementById('signInButton');
const googleSignInButton = document.getElementById('googleSignInButton');

function showMessage(message) {
  formMessage.textContent = message;
}

function getReadableAuthError(error) {
  if (error.code === 'auth/invalid-credential') return 'Email or password is incorrect.';
  if (error.code === 'auth/user-not-found') return 'No account exists with this email.';
  if (error.code === 'auth/wrong-password') return 'Email or password is incorrect.';
  if (error.code === 'auth/too-many-requests') return 'Too many attempts. Please wait and try again.';
  if (error.code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (error.code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
  if (error.code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in popup.';
  if (error.code === 'auth/unauthorized-domain') return 'This website domain is not authorized in Firebase Authentication.';
  return `Sign-in failed (${error.code || 'unknown-error'}). Please try again.`;
}

if (!isFirebaseConfigured()) {
  signInButton.disabled = true;
  googleSignInButton.disabled = true;
  showMessage('Firebase authentication is not configured yet.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  signInForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    signInButton.disabled = true;
    googleSignInButton.disabled = true;
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
      googleSignInButton.disabled = false;
    }
  });

  googleSignInButton.addEventListener('click', async function () {
    signInButton.disabled = true;
    googleSignInButton.disabled = true;
    showMessage('Opening Google sign-in...');

    try {
      await signInWithPopup(auth, googleProvider);
      window.location.href = '../dashboard/index.html';
    } catch (error) {
      showMessage(getReadableAuthError(error));
    } finally {
      signInButton.disabled = false;
      googleSignInButton.disabled = false;
    }
  });
}
