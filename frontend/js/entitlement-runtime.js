import { supabase } from '../auth/supabase-config.js';
import { entitlementState, startTrial, formatRemaining } from './entitlement.js';

const projectId = new URLSearchParams(location.search).get('projectId');
if (!projectId) return;

const statusEl = document.getElementById('projectStatus');
const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };

async function syncTrial() {
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return;
  const result = await supabase.from('projects')
    .select('id,user_id,status,app_definition')
    .eq('id', projectId)
    .eq('user_id', auth.data.user.id)
    .maybeSingle();
  if (result.error || !result.data) return;

  const current = entitlementState(result.data.app_definition?.entitlement);
  if (current.status === 'expired') {
    setStatus('Trial expired');
    return;
  }

  if (current.status === 'not_started') {
    const next = startTrial(current);
    const definition = {
      ...(result.data.app_definition || {}),
      entitlement: next
    };
    const update = await supabase.from('projects')
      .update({ app_definition: definition, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', auth.data.user.id);
    if (update.error) {
      console.error(update.error);
      return;
    }
    setStatus(`Trial started • ${formatRemaining(24 * 60 * 60 * 1000)}`);
    return;
  }

  if (current.status === 'trial') {
    setStatus(`Trial • ${formatRemaining(current.remainingMs)}`);
  } else if (current.status === 'activated') {
    setStatus('Activated');
  }
}

syncTrial().catch((error) => console.error('Entitlement sync failed', error));
