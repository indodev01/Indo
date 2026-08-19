import { supabase } from '../auth/supabase-config.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const panel = document.getElementById('apkBuildPanel');
const statusEl = document.getElementById('apkBuildStatus');
const historyEl = document.getElementById('apkBuildHistory');
const buildButton = document.getElementById('buildApkButton');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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

async function startBuild(){
  if(!projectId || !buildButton) return;
  buildButton.disabled = true;
  setStatus('Creating build request…');
  try {
    const auth = await supabase.auth.getUser();
    const user = auth.data?.user;
    if(!user) throw new Error('Please sign in first.');
    const project = await supabase.from('projects').select('id,name,status,app_definition').eq('id', projectId).eq('user_id', user.id).maybeSingle();
    if(project.error || !project.data) throw project.error || new Error('Project not found.');
    const slug = project.data.app_definition?.publishing?.slug;
    const published = project.data.status === 'published' && Boolean(slug);
    if(!published) throw new Error('Publish the app before starting an APK build.');
    const liveUrl = new URL(`../live-app.html?slug=${encodeURIComponent(slug)}`, location.href).href;
    const row = await supabase.from('app_builds').insert({project_id: projectId,user_id: user.id,platform:'android',status:'queued'}).select('id').single();
    if(row.error) throw row.error;
    setStatus('Build request queued. Open GitHub Actions to run it.');
    const actionsUrl = 'https://github.com/indodev01/Indo/actions/workflows/build-apk.yml';
    window.open(actionsUrl, '_blank', 'noopener');
    await loadBuilds();
    buildButton.dataset.liveUrl = liveUrl;
    buildButton.dataset.buildId = row.data.id;
  } catch(error) {
    setStatus(error?.message || 'Could not create build request.');
  } finally { buildButton.disabled = false; }
}

buildButton?.addEventListener('click', startBuild);
loadBuilds();
setInterval(loadBuilds, 15000);
