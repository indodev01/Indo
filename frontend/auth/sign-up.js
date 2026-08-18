import { supabase } from './supabase-config.js';

const signUpForm = document.getElementById('signUpForm');
const formMessage = document.getElementById('formMessage');
const signUpButton = document.getElementById('signUpButton');

function showMessage(message) { formMessage.textContent = message; }

function getReadableAuthError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('user already registered')) return 'An account already exists with this email.';
  if (message.includes('password should be at least')) return 'Password is too weak. Use a stronger password.';
  if (message.includes('invalid email')) return 'Please enter a valid email address.';
  if (message.includes('rate limit')) return 'Too many attempts. Please wait and try again.';
  return `Account creation failed (${error?.code || 'unknown-error'}). Please try again.`;
}

async function saveUserProfile(user, name) {
  const { error } = await supabase.from('users').upsert({ id: user.id, name: name || '', email: user.email || '' });
  if (error) throw error;
}

signUpForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  signUpButton.disabled = true;
  showMessage('Creating your account...');
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    if (!data.user) throw new Error('Account was not created.');
    if (data.session) {
      await saveUserProfile(data.user, name);
      showMessage('Account created. Opening your workspace...');
      window.location.replace('../index.html');
      return;
    }
    showMessage('Account created. Email confirmation is currently required before signing in.');
  } catch (error) {
    console.error(error);
    showMessage(getReadableAuthError(error));
  } finally {
    signUpButton.disabled = false;
  }
});
