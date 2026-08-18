import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';
import { firebaseConfig, realtimeDatabaseUrl, isFirebaseConfigured } from './firebase-config.js';

const signUpForm = document.getElementById('signUpForm');
const formMessage = document.getElementById('formMessage');
const signUpButton = document.getElementById('signUpButton');
const googleSignUpButton = document.getElementById('googleSignUpButton');

function showMessage(message) {
  formMessage.textContent = message;
}

function getReadableAuthError(error) {
  if (error.code === 'auth/email-already-in-use') return 'An account already exists with this email.';
  if (error.code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (error.code === 'auth/weak-password') return 'Password is too weak. Use at least 6 characters.';
  if (error.code === 'auth/operation-not-allowed') return 'This sign-in method is not enabled in Firebase Authentication.';
  if (error.code === 'auth/popup-closed-by-user') return 'Google sign-up was cancelled.';
  if (error.code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in popup.';
  if (error.code === 'auth/unauthorized-domain') return 'This website domain is not authorized in Firebase Authentication.';
  return `Account creation failed (${error.code || 'unknown-error'}). Please try again.`;
}

if (!isFirebaseConfigured()) {
  signUpButton.disabled = true;
  googleSignUpButton.disabled = true;
  showMessage('Firebase is not configured yet.');
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app, realtimeDatabaseUrl);
  const googleProvider = new GoogleAuthProvider();

  async function saveUserRecord(user, name) {
    await set(ref(database, `users/${user.uid}`), {
      profile: {
        name: name || user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: Date.now()
      },
      account: {
        status: 'active',
        emailVerified: Boolean(user.emailVerified),
        verificationRequired: false,
        provider: user.providerData?.[0]?.providerId || 'password'
      },
      projects: {},
      billing: {
        plan: 'free',
        trial: {}
      },
      storage: {},
      activity: {}
    });
  }

  signUpForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    signUpButton.disabled = true;
    googleSignUpButton.disabled = true;
    showMessage('Creating your account...');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });
      await saveUserRecord(user, name);

      showMessage('Account created. Opening your dashboard...');
      window.location.href = '../dashboard/index.html';
    } catch (error) {
      showMessage(getReadableAuthError(error));
    } finally {
      signUpButton.disabled = false;
      googleSignUpButton.disabled = false;
    }
  });

  googleSignUpButton.addEventListener('click', async function () {
    signUpButton.disabled = true;
    googleSignUpButton.disabled = true;
    showMessage('Opening Google sign-up...');

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      await saveUserRecord(user, user.displayName || '');
      window.location.href = '../dashboard/index.html';
    } catch (error) {
      showMessage(getReadableAuthError(error));
    } finally {
      signUpButton.disabled = false;
      googleSignUpButton.disabled = false;
    }
  });
}
