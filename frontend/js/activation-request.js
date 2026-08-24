import { supabase } from './auth/supabase-config.js';
import { entitlementState } from './entitlement.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const actions = document.querySelector('.topbar-actions');

if (!projectId || !actions) return;

async function loadProject() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;
  const { data, error } = await supabase.from('projects')
    .select('id,user_id,name,app_definition')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function ensureButton() {
  let button = document.getElementById('activateButton');
  if (button) return button;
  button = document.createElement('button');
  button.id = 'activateButton';
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = 'Activate';
  actions.insertBefore(button, actions.firstChild);
  return button;
}

async function refresh() {
  try {
    const project = await loadProject();
    if (!project) return;
    const state = entitlementState(project.app_definition?.entitlement);
    const button = ensureButton();
    button.hidden = state.status === 'activated';
    button.disabled = false;
    button.textContent = state.status === 'expired' ? 'Request Activation' : 'Activate';
    button.title = state.status === 'expired' ? 'Request paid activation for this app' : 'Request paid activation';
    button.onclick = () => requestActivation(button);
  } catch (error) {
    console.error(error);
  }
}

async function requestActivation(button) {
  if (button.dataset.busy === '1') return;
  button.dataset.busy = '1';
  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Requesting…';
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw authError || new Error('Please sign in again.');

    const { data: existing, error: lookupError } = await supabase.from('activation_requests')
      .select('id,status')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('status', ['pending','approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.id) {
      window.alert(existing.status === 'approved' ? 'This app already has an approved activation.' : 'Activation request is already pending.');
      return;
    }

    const { error } = await supabase.from('activation_requests').insert({
      project_id: projectId,
      user_id: user.id,
      requested_plan: 'paid',
      status: 'pending'
    });
    if (error) throw error;
    window.alert('Activation request submitted. Payment verification can be connected to this request.');
    button.textContent = 'Activation Pending';
  } catch (error) {
    console.error(error);
    window.alert(error.message || 'Could not submit activation request.');
    button.textContent = original;
  } finally {
    button.disabled = false;
    button.dataset.busy = '0';
  }
}

refresh();
