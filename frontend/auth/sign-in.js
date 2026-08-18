import { supabase } from './supabase-config.js';

const signInForm = document.getElementById('signInForm');
const formMessage = document.getElementById('formMessage');
const signInButton = document.getElementById('signInButton');

function showMessage(message) { formMessage.textContent = message; }

function getReadableAuthError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (message.includes('too many requests')) return 'Too many attempts. Please wait and try again.';
  if (message.includes('invalid email')) return 'Please enter a valid email address.';
  return `Sign-in failed (${error?.code || 'unknown-error'}). Please try again.`;
}

signInForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  signInButton.disabled = true;
  showMessage('Checking your account...');
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.replace('../index.html');
  } catch (error) {
    showMessage(getReadableAuthError(error));
    signInButton.disabled = false;
  }
});
