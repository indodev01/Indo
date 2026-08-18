import { supabase } from './auth/supabase-config.js';

const authAction = document.getElementById('authAction');
const createAction = document.getElementById('createAction');
const workspaceMessage = document.getElementById('workspaceMessage');

function setLoggedOutState() {
  authAction.textContent = 'Sign In';
  authAction.href = 'auth/sign-in.html';
  authAction.classList.remove('logout-button');
  createAction.textContent = 'Create App';
  createAction.href = 'create-app.html';
  workspaceMessage.textContent = 'Create and customize apps without writing complicated code.';
}

function setLoggedInState(user, profile) {
  const name = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'there';

  authAction.textContent = 'Logout';
  authAction.href = '#logout';
  authAction.classList.add('logout-button');
  createAction.textContent = 'Create App';
  createAction.href = 'create-app.html';
  workspaceMessage.textContent = `Welcome back, ${name}. Create and customize your apps without writing complicated code.`;

  authAction.onclick = async function (event) {
    event.preventDefault();
    authAction.textContent = 'Logging out...';
    authAction.style.pointerEvents = 'none';

    const { error } = await supabase.auth.signOut();
    if (error) {
      authAction.textContent = 'Logout';
      authAction.style.pointerEvents = '';
      workspaceMessage.textContent = 'Could not log out. Please try again.';
      return;
    }

    window.location.replace('landing/index.html');
  };
}

async function initHome() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    setLoggedOutState();
    return;
  }

  const { data: profile } = await supabase
    .from('users')
    .select('name,email')
    .eq('id', data.user.id)
    .maybeSingle();

  setLoggedInState(data.user, profile);
}

initHome().catch((error) => {
  console.error(error);
  setLoggedOutState();
});
