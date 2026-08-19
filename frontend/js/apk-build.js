import { supabase } from '../auth/supabase-config.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const BUILD_FUNCTION = 'start-apk-build-v2';
const $ = (id) => document.getElementById(id);
const status = (text) => { const el = $('projectStatus'); if (el) el.textContent = text; };

function closeDialog() { $('apkBuildDialog')?.remove(); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]); }

function showDialog(details) {
  closeDialog();
  const backdrop = document.createElement('div');
  backdrop.id = 'apkBuildDialog';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:99999;display:grid;place-items:center;padding:24px';
  const panel = document.createElement('div');
  panel.style.cssText = 'width:min(680px,100%);max-height:90vh;overflow:auto;background:#0d1324;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.45)';
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><div style="font-size:12px;opacity:.62;font-weight:800;letter-spacing:.08em">ANDROID BUILD</div><h2 style="margin:6px 0 0">Build APK</h2></div><button id="apkClose" type="button" style="background:transparent;border:0;color:#fff;font-size:24px;cursor:pointer">×</button></div><p id="apkBuildMessage" style="color:#aab3c6;line-height:1.5">Starting build…</p><div style="display:grid;gap:10px;margin:18px 0"><label>Live URL<input readonly value="${escapeHtml(details.liveUrl)}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label><label>Application ID<input readonly value="${escapeHtml(details.applicationId)}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label><label>Version<input readonly value="${escapeHtml(details.versionName)}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label></div><div id="apkResult" style="margin:14px 0"></div><div style="display:flex;justify-content:flex-end;gap:10px"><button id="apkDone" type="button" style="padding:10px 14px;border-radius:9px;border:1px solid #2b3650;background:#151d31;color:#fff;cursor:pointer">Close</button></div>`;
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  $('apkClose').onclick = closeDialog;
  $('apkDone').onclick = closeDialog;
  watchBuild(details.buildId);
}

async function loadProject() {
  if (!projectId) throw new Error('Missing project ID');
  const auth = await supabase.auth.getUser();
  if (auth.error) throw auth.error;
  if (!auth.data.user) throw new Error('Please sign in first');
  const result = await supabase.from('projects').select('id,user_id,name,status,project_type,app_definition').eq('id', projectId).eq('user_id', auth.data.user.id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Project not found');
  return result.data;
}

function slugify(value) { return String(value || 'app').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'app'; }
function appIdFrom(slug) { return `com.indodev01.${slugify(slug).replace(/-/g, '')}`.slice(0, 48); }

async function watchBuild(buildId) {
  const started = Date.now();
  const poll = async () => {
    try {
      const { data, error } = await supabase.from('app_builds').select('status,artifact_url,error,completed_at').eq('id', buildId).maybeSingle();
      if (error || !data) return;
      const message = $('apkBuildMessage');
      const result = $('apkResult');
      if (message) message.textContent = `Build status: ${data.status}`;
      status(`APK build • ${data.status}`);
      if (data.status === 'success') {
        if (result) result.innerHTML = `<div style="padding:14px;border:1px solid rgba(84,214,129,.25);background:rgba(84,214,129,.08);border-radius:10px"><strong>APK build completed.</strong><div style="margin-top:8px"><a href="${escapeHtml(data.artifact_url || '#')}" target="_blank" rel="noopener" style="color:#8fa7ff">Open build artifacts</a></div></div>`;
        return true;
      }
      if (data.status === 'failed') {
        if (result) result.innerHTML = `<div style="padding:14px;border:1px solid rgba(255,95,95,.25);background:rgba(255,95,95,.08);border-radius:10px"><strong>APK build failed.</strong><div style="margin-top:8px;color:#ffb0b0">${escapeHtml(data.error || 'Build failed. Please try again.')}</div></div>`;
        return true;
      }
    } catch (error) { console.error(error); }
    return Date.now() - started > 20 * 60 * 1000;
  };
  if (await poll()) return;
  const timer = setInterval(async () => {
    if (await poll()) clearInterval(timer);
  }, 1000);
}

async function createBuild() {
  const button = $('buildApkButton');
  if (button) button.disabled = true;
  status('Preparing APK build…');
  try {
    const project = await loadProject();
    const slug = project.app_definition?.publishing?.slug;
    if (project.status !== 'published' || !slug) throw new Error('Publish this project first, then build the APK.');

    const liveUrl = new URL(`live-app.html?slug=${encodeURIComponent(slug)}`, new URL('../html/live-app.html', location.href)).href;
    const applicationId = appIdFrom(slug);
    const versionName = '1.0';
    const buildToken = crypto.randomUUID();

    const { data: build, error: buildError } = await supabase.from('app_builds').insert({ project_id:project.id, user_id:project.user_id, platform:'android', status:'queued', build_token:buildToken }).select('id').single();
    if (buildError) throw buildError;

    showDialog({ buildId:build.id, liveUrl, applicationId, versionName });
    status('APK build • queued');

    const { data: dispatched, error: dispatchError } = await supabase.functions.invoke(BUILD_FUNCTION, {
      body: { project_id: project.id, build_id: build.id, live_url: liveUrl, application_id: applicationId, version_name: versionName, build_token: buildToken }
    });
    if (dispatchError) throw dispatchError;
    if (!dispatched?.ok) throw new Error(dispatched?.error || 'Could not start APK build.');
    const message = $('apkBuildMessage');
    if (message) message.textContent = 'Build request accepted. Waiting for runner…';
  } catch (error) {
    console.error(error);
    status(error.message || 'APK build preparation failed');
    const message = $('apkBuildMessage');
    if (message) message.textContent = error.message || 'Could not start APK build.';
  } finally {
    if (button) button.disabled = false;
  }
}

function install() {
  const button = $('buildApkButton');
  if (!button || button.dataset.apkReady === '1') return;
  button.dataset.apkReady = '1';
  button.type = 'button';
  button.addEventListener('click', createBuild);
}

install();
window.IndoApkBuild = { createBuild };
