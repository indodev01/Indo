import { supabase, supabaseUrl } from './supabase-config.js';

const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const formMessage = document.getElementById('formMessage');
const resetButton = document.getElementById('resetButton');

function showMessage(message) {
  formMessage.textContent = message;
}

forgotPasswordForm.addEventListener('submit', async function (event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  resetButton.disabled = true;
  showMessage('Sending password reset link...');

  try {
    const redirectTo = `${supabaseUrl.replace(/\/$/, '')}/Indo-Dev/frontend/auth/sign-in.html`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    showMessage('Password reset link sent. Check your email inbox.');
  } catch (error) {
    console.error(error);
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('invalid email')) {
      showMessage('Please enter a valid email address.');
    } else {
      showMessage('Could not send reset link. Please try again.');
    }
  } finally {
    resetButton.disabled = false;
  }
});
