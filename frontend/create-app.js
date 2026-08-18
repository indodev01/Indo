import { supabase } from './auth/supabase-config.js';
import { makeEmptyDefinition } from './app-definition.js';

const form = document.getElementById('createAppForm');
const button = document.getElementById('createButton');
const message = document.getElementById('message');
const appNameInput = document.getElementById('appName');
const appDescriptionInput = document.getElementById('appDescription');
const startModeInput = document.getElementById('startMode');
const selectedModeLabel = document.getElementById('selectedModeLabel');
const optionButtons = document.querySelectorAll('.start-option');

function showMessage(text) { message.textContent = text; }

function selectStartMode(mode) {
  const selected = mode === 'template' ? 'template' : 'blank';
  startModeInput.value = selected;
  optionButtons.forEach((option) => {
    const active = option.dataset.mode === selected;
    option.classList.toggle('selected', active);
    option.setAttribute('aria-checked', String(active));
  });
  selectedModeLabel.textContent = selected === 'template' ? 'Template selected' : 'Blank App selected';
}

optionButtons.forEach((option) => option.addEventListener('click', () => selectStartMode(option.dataset.mode)));
selectStartMode('blank');

async function loadCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) {
    window.location.replace('auth/sign-in.html');
    return null;
  }
  return data.user;
}

button.disabled = true;
showMessage('Checking your account...');
loadCurrentUser().then((user) => {
  if (!user) return;
  button.disabled = false;
  showMessage('');
  appNameInput.focus();
}).catch((error) => {
  console.error(error);
  showMessage('Could not load your account. Please sign in again.');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = appNameInput.value.trim();
  const description = appDescriptionInput.value.trim();
  const startMode = startModeInput.value === 'template' ? 'template' : 'blank';

  if (!name) {
    showMessage('Please enter an app name.');
    appNameInput.focus();
    return;
  }

  button.disabled = true;
  showMessage(startMode === 'template' ? 'Creating your project...' : 'Creating your blank app...');

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) {
      window.location.replace('auth/sign-in.html');
      return;
    }

    const now = new Date().toISOString();
    const definition = makeEmptyDefinition();
    definition.metadata.title = name;
    definition.metadata.description = description;
    definition.settings.status = 'draft';

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userData.user.id,
        name,
        description,
        start_mode: startMode,
        status: 'draft',
        pages: definition.pages,
        app_definition: {
          ...definition,
          components: {},
          componentsList: []
        },
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();

    if (error) throw error;

    const { error: versionError } = await supabase.from('project_versions').insert({
      project_id: project.id,
      version_name: 'v1',
      data: definition
    });
    if (versionError) throw versionError;

    if (startMode === 'template') {
      showMessage('Project created. Opening templates...');
      window.location.replace(`templates.html?projectId=${encodeURIComponent(project.id)}`);
    } else {
      showMessage('Blank app created. Opening the builder...');
      window.location.replace(`builder-v2.html?projectId=${encodeURIComponent(project.id)}`);
    }
  } catch (error) {
    console.error(error);
    showMessage(`Could not create app (${error.code || error.message || 'unknown-error'}). Please try again.`);
    button.disabled = false;
  }
});
