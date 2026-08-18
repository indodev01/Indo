import { supabase } from '../auth/supabase-config.js';

const signOutButton = document.getElementById('signOutButton');
const dashboardMessage = document.getElementById('dashboardMessage');

function showMessage(message) {
  dashboardMessage.textContent = message;
}

async function startSession() {
  signOutButton.disabled = true;
  showMessage('Restoring your login...');

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  if (!data.user) {
    window.location.replace('../auth/sign-in.html');
    return;
  }

  signOutButton.disabled = false;
  showMessage('Loading your workspace...');

  const { data: profile } = await supabase
    .from('users')
    .select('name,email')
    .eq('id', data.user.id)
    .maybeSingle();

  const name = profile?.name || data.user.user_metadata?.name || data.user.email || 'Builder';
  showMessage(`Welcome, ${name}. You are signed in as ${data.user.email || 'user'}.`);
}

startSession().catch((error) => {
  console.error(error);
  showMessage('Could not restore your login session. Please sign in again.');
  signOutButton.disabled = false;
});

signOutButton.addEventListener('click', async function () {
  signOutButton.disabled = true;
  showMessage('Signing out...');

  const { error } = await supabase.auth.signOut();
  if (error) {
    showMessage('Could not sign out. Please try again.');
    signOutButton.disabled = false;
    return;
  }

  window.location.replace('../landing/index.html');
});
