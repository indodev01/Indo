import { supabase } from './auth/supabase-config.js';
import { entitlementState } from './entitlement.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const actions = document.querySelector('.topbar-actions');
if (!projectId || !actions) throw new Error('Activation UI requires a project.');

let refreshTimer = null;

async function loadProject() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;
  const { data, error } = await supabase.from('projects').select('id,user_id,name,app_definition').eq('id', projectId).eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}

async function loadRequest() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;
  const { data, error } = await supabase.from('activation_requests').select('id,status,requested_plan,created_at,reviewed_at').eq('project_id', projectId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

function ensureButton() {
  let button = document.getElementById('activateButton');
  if (button) return button;
  button = document.createElement('button');
  button.id = 'activateButton'; button.type = 'button'; button.className = 'secondary'; button.textContent = 'Activate';
  actions.insertBefore(button, actions.firstChild);
  return button;
}

function setButtonState(button, entitlement, request) {
  if (entitlement.status === 'activated') { button.hidden = true; return; }
  button.hidden = false; button.disabled = false;
  if (request?.status === 'pending') { button.textContent = 'Activation Pending'; button.title = 'Activation request is waiting for payment verification.'; return; }
  if (request?.status === 'approved') { button.textContent = 'Activating…'; button.title = 'Finalizing approved activation.'; button.disabled = true; return; }
  if (request?.status === 'activated') { button.hidden = true; return; }
  if (request?.status === 'rejected') { button.textContent = 'Request Again'; button.title = 'Previous activation request was rejected.'; return; }
  button.textContent = entitlement.status === 'expired' ? 'Request Activation' : 'Activate';
  button.title = entitlement.status === 'expired' ? 'Request paid activation for this app' : 'Request paid activation';
}

async function finalizeApprovedActivation() {
  const project = await loadProject();
  const request = await loadRequest();
  if (!project || request?.status !== 'approved') return false;
  const { data, error } = await supabase.functions.invoke('activate-approved-project', { body: { project_id: projectId } });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Could not activate the project.');
  return true;
}

async function refresh() {
  try {
    const [project, request] = await Promise.all([loadProject(), loadRequest()]);
    if (!project) return;
    const state = entitlementState(project.app_definition?.entitlement);
    const button = ensureButton();
    setButtonState(button, state, request);
    if (request?.status === 'approved') {
      await finalizeApprovedActivation();
      const activatedProject = await loadProject();
      if (activatedProject) setButtonState(button, entitlementState(activatedProject.app_definition?.entitlement), { status: 'activated' });
      return;
    }
    button.onclick = () => requestActivation(button);
  } catch (error) { console.error(error); }
}

async function requestActivation(button) {
  if (button.dataset.busy === '1') return;
  button.dataset.busy = '1'; button.disabled = true; const original = button.textContent; button.textContent = 'Requesting…';
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw authError || new Error('Please sign in again.');
    const { data: existing, error: lookupError } = await supabase.from('activation_requests').select('id,status').eq('project_id', projectId).eq('user_id', user.id).in('status', ['pending','approved','activated']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.id) { button.textContent = existing.status === 'approved' ? 'Activating…' : existing.status === 'activated' ? 'Activated' : 'Activation Pending'; return; }
    const { error } = await supabase.from('activation_requests').insert({ project_id: projectId, user_id: user.id, requested_plan: 'paid', status: 'pending' });
    if (error) throw error;
    button.textContent = 'Activation Pending';
  } catch (error) { console.error(error); window.alert(error.message || 'Could not submit activation request.'); button.textContent = original; }
  finally { button.disabled = false; button.dataset.busy = '0'; await refresh(); }
}

refresh();
refreshTimer = window.setInterval(refresh, 10000);
window.addEventListener('pagehide', () => { if (refreshTimer) window.clearInterval(refreshTimer); });
