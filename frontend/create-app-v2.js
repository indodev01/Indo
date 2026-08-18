import { supabase } from './auth/supabase-config.js';
import { makeEmptyDefinition } from './app-definition.js';

const form = document.getElementById('createAppForm');
const button = document.getElementById('createButton');
const message = document.getElementById('message');
const choices = [...document.querySelectorAll('.choice')];
let currentUser = null;

function showMessage(text) { if (message) message.textContent = text; }
function syncChoiceState() {
  choices.forEach((choice) => {
    const input = choice.querySelector('input');
    choice.classList.toggle('active', !!input?.checked);
  });
}
document.querySelectorAll('input[name="startMode"]').forEach((input) => input.addEventListener('change', syncChoiceState));
syncChoiceState();

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    window.location.assign(new URL('auth/sign-in.html', window.location.href).href);
    return null;
  }
  currentUser = data.user;
  return currentUser;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) { showMessage('Please wait while your account is being checked.'); return; }

  const name = document.getElementById('appName').value.trim();
  const description = document.getElementById('appDescription').value.trim();
  const startMode = document.querySelector('input[name="startMode"]:checked')?.value || 'blank';
  if (!name) { showMessage('Enter an app name.'); return; }

  button.disabled = true;
  showMessage(startMode === 'template' ? 'Opening template library...' : 'Creating your app...');

  try {
    if (startMode === 'template') {
      // Do not create a project here. The selected template creates the project.
      const url = new URL('templates.html', window.location.href);
      url.searchParams.set('appName', name);
      if (description) url.searchParams.set('description', description);
      url.searchParams.set('startMode', 'template');
      window.location.assign(url.href);
      return;
    }

    const definition = makeEmptyDefinition();
    definition.metadata.title = name;
    definition.metadata.description = description;
    const { data: project, error } = await supabase.from('projects').insert({
      user_id: currentUser.id,
      name,
      description,
      start_mode: 'blank',
      status: 'draft',
      pages: definition.pages,
      app_definition: definition
    }).select('id').single();
    if (error) throw error;
    window.location.assign(new URL(`builder-v2.html?projectId=${encodeURIComponent(project.id)}`, window.location.href).href);
  } catch (error) {
    console.error(error);
    showMessage(`Could not create app: ${error.message || 'Please try again.'}`);
    button.disabled = false;
  }
});

requireUser().catch((error) => {
  console.error(error);
  button.disabled = false;
  showMessage('Could not verify your account. Please sign in again.');
});
