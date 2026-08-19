import { supabase } from '../auth/supabase-config.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const panel = document.getElementById('apkBuildPanel');
const statusEl = document.getElementById('apkBuildStatus');
const historyEl = document.getElementById('apkBuildHistory');

const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

function setStatus(text){ if(statusEl) statusEl.textContent = text; }
function show(panelVisible=true){ if(panel) panel.hidden = !panelVisible; }

function renderBuilds(builds=[]){
  if(!historyEl) return;
  if(!builds.length){ historyEl.innerHTML = '<div class="apk-build-empty">No APK builds yet.</div>'; return; }
  historyEl.innerHTML = builds.map(build => {
    const status = String(build.status || 'queued').toLowerCase();
    const when = build.created_at ? new Date(build.created_at).toLocaleString() : '';
    const artifact = build.artifact_url ? `<a class="apk-download" href="${esc(build.artifact_url)}" target="_blank" rel="noopener">Download APK</a>` : '';
    const error = build.error ? `<div class="apk-build-error">${esc(build.error)}</div>` : '';
    return `<article class="apk-build-row"><div><strong>${esc(status)}</strong><span>${esc(build.platform || 'android')} · ${esc(when)}</span></div>${artifact}${error}</article>`;
  }).join('');
}

async function loadBuilds(){
  if(!projectId){ show(false); return; }
  const result = await supabase.from('app_builds').select('id,platform,artifact_url,status,error,created_at,completed_at').eq('project_id', projectId).order('created_at', {ascending:false}).limit(10);
  if(result.error){ console.warn('APK build history failed', result.error); setStatus('Build history unavailable'); return; }
  show(true); renderBuilds(result.data || []);
  const latest = result.data?.[0];
  if(latest) setStatus(`Latest build: ${latest.status}`); else setStatus('No APK builds yet');
}

loadBuilds();
setInterval(loadBuilds, 15000);
