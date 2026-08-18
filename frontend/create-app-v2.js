import { supabase } from './auth/supabase-config.js';
import { makeEmptyDefinition } from './app-definition.js';

const form = document.getElementById('createAppForm');
const button = document.getElementById('createButton');
const message = document.getElementById('message');
const choices = [...document.querySelectorAll('.choice')];
let currentUser = null;
let navigatingToTemplates = false;

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

function openTemplateLibrary() {
  if (navigatingToTemplates) return;
  const name = document.getElementById('appName')?.value.trim() || '';
  const description = document.getElementById('appDescription')?.value.trim() || '';
  if (!name) { showMessage('Enter an app name first.'); document.getElementById('appName')?.focus(); return; }
  navigatingToTemplates = true;
  button.disabled = true;
  showMessage('Opening template library...');
  const url = new URL('templates.html', window.location.href);
  url.searchParams.set('appName', name);
  if (description) url.searchParams.set('description', description);
  url.searchParams.set('startMode', 'template');
  window.location.href = url.href;
}

// Direct click handling makes the Template -> Create App transition reliable
// even if browser form handling or a stale module cache interferes.
button?.addEventListener('click', (event) => {
  const startMode = document.querySelector('input[name="startMode"]:checked')?.value;
  if (startMode === 'template') {
    event.preventDefault();
    event.stopPropagation();
    openTemplateLibrary();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const startMode = document.querySelector('input[name="startMode"]:checked')?.value || 'blank';
  if (startMode === 'template') { openTemplateLibrary(); return; }
  if (!currentUser) { showMessage('Please wait while your account is being checked.'); return; }

  const name = document.getElementById('appName').value.trim();
  const description = document.getElementById('appDescription').value.trim();
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
