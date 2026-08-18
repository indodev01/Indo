import { supabase } from './auth/supabase-config.js';
import { makeEmptyDefinition } from './app-definition.js';

const form = document.getElementById('createAppForm');
const button = document.getElementById('createButton');
const message = document.getElementById('message');
let currentUser = null;

function showMessage(text) { if (message) message.textContent = text; }

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    window.location.replace('auth/sign-in.html');
    return null;
  }
  currentUser = data.user;
  return currentUser;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const name = document.getElementById('appName').value.trim();
  const description = document.getElementById('appDescription').value.trim();
  const startMode = document.querySelector('input[name="startMode"]:checked')?.value || 'blank';
  if (!name) { showMessage('Enter an app name.'); return; }

  button.disabled = true;
  showMessage('Creating your app...');

  try {
    const definition = makeEmptyDefinition();
    definition.metadata.title = name;
    definition.metadata.description = description;

    const { data: project, error } = await supabase.from('projects').insert({
      user_id: currentUser.id,
      name,
      description,
      start_mode: startMode,
      status: 'draft',
      pages: definition.pages,
      app_definition: definition
    }).select('id').single();

    if (error) throw error;
    window.location.replace(`builder-v2.html?projectId=${encodeURIComponent(project.id)}`);
  } catch (error) {
    console.error(error);
    showMessage(`Could not create app: ${error.message || 'Please try again.'}`);
    button.disabled = false;
  }
});

requireUser().catch((error) => {
  console.error(error);
  button.disabled = true;
  showMessage('Could not verify your account. Please sign in again.');
});
