import { supabase } from '../auth/supabase-config.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const panel = document.getElementById('apkBuildPanel');
const statusEl = document.getElementById('apkBuildStatus');
const historyEl = document.getElementById('apkBuildHistory');

const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
function setStatus(text){ if(statusEl) statusEl.textContent=text; }
function show(v=true){ if(panel) panel.hidden=!v; }
function directApkUrl(build){
  if(build.artifact_url) return build.artifact_url;
  if(!build.build_token) return '';
  const version=encodeURIComponent(build.version_name || '1.0');
  return `https://github.com/indodev01/Indo/releases/download/indo-apk-${encodeURIComponent(build.build_token)}/indo-app-v${version}.apk`;
}
function renderBuilds(builds=[]){
  if(!historyEl) return;
  if(!builds.length){historyEl.innerHTML='<div class="apk-build-empty">No APK builds yet.</div>';return;}
  historyEl.innerHTML=builds.map(build=>{
    const state=String(build.status||'queued').toLowerCase();
    const when=build.created_at?new Date(build.created_at).toLocaleString():'';
    const url=directApkUrl(build);
    const artifact=state==='success' && url ? `<a class="apk-download" href="${esc(url)}" download="indo-app-v${esc(build.version_name||'1.0')}.apk">Download APK</a>` : '';
    const error=build.error?`<div class="apk-build-error">${esc(build.error)}</div>`:'';
    return `<article class="apk-build-row"><div><strong>${esc(state)}</strong><span>${esc(build.platform||'android')} · ${esc(when)}</span></div>${artifact}${error}</article>`;
  }).join('');
}
async function loadBuilds(){
  if(!projectId){show(false);return;}
  const result=await supabase.from('app_builds').select('id,platform,artifact_url,build_token,version_name,status,error,created_at,completed_at').eq('project_id',projectId).order('created_at',{ascending:false}).limit(10);
  if(result.error){console.warn('APK build history failed',result.error);setStatus('Build history unavailable');return;}
  show(true);renderBuilds(result.data||[]);
  const latest=result.data?.[0];
  if(latest)setStatus(`Latest build: ${latest.status}${latest.status==='success'?' • APK ready':''}`);else setStatus('No APK builds yet');
}
loadBuilds();
setInterval(loadBuilds,5000);
