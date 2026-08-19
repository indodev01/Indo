import { supabase } from '../auth/supabase-config.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const REPO = 'indodev01/Indo';
const WORKFLOW_URL = `https://github.com/${REPO}/actions/workflows/build-apk.yml`;

const slugify = (value) => String(value || 'app')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 32) || 'app';

const appIdFrom = (slug) => `com.indodev01.${slugify(slug).replace(/-/g, '')}`.slice(0, 48);
const versionName = () => '1.0';
const setStatus = (text) => {
  const el = document.getElementById('projectStatus');
  if (el) el.textContent = text;
};

function closeDialog() {
  document.getElementById('apkBuildDialog')?.remove();
}

function copy(value) {
  if (navigator.clipboard) navigator.clipboard.writeText(value).catch(() => {});
}

function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function openWorkflow(details) {
  const url = new URL(WORKFLOW_URL);
  url.searchParams.set('projectId', projectId || '');
  window.open(url.href, '_blank', 'noopener');
}

function showDialog(details) {
  closeDialog();

  const backdrop = document.createElement('div');
  backdrop.id = 'apkBuildDialog';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:99999;display:grid;place-items:center;padding:24px';

  const panel = document.createElement('div');
  panel.style.cssText = 'width:min(720px,100%);max-height:90vh;overflow:auto;background:#0d1324;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.45)';

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
      <div><div style="font-size:12px;opacity:.62;font-weight:800;letter-spacing:.08em">ANDROID BUILD</div><h2 style="margin:6px 0 0">Build APK</h2></div>
      <button id="apkClose" type="button" style="background:transparent;border:0;color:#fff;font-size:24px;cursor:pointer">×</button>
    </div>
    <p id="apkBuildMessage" style="color:#aab3c6;line-height:1.5;margin-bottom:16px">Build request prepared. Use these exact values in the GitHub workflow.</p>
    <div style="display:grid;gap:10px;margin:18px 0">
      <label>Published Indo app URL<input id="apkLiveUrl" readonly value="${esc(details.liveUrl)}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label>
      <label>Application ID<input id="apkApplicationId" readonly value="${esc(details.applicationId)}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label>
      <label>App version<input id="apkVersion" readonly value="${esc(details.versionName)}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label>
      <label>One-time build callback token<input id="apkBuildToken" readonly value="${esc(details.buildToken)}" style="width:100%;margin-top:5px;padding:10px;border-radius:8px;border:1px solid #28324a;background:#111a2e;color:#fff"></label>
    </div>
    <div id="apkResult" style="margin:14px 0"></div>
    <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap">
      <button id="apkCopyToken" type="button" style="padding:10px 14px;border-radius:9px;border:1px solid #2b3650;background:#151d31;color:#fff;cursor:pointer">Copy token</button>
      <button id="apkOpenWorkflow" type="button" style="padding:10px 14px;border-radius:9px;background:#6d4aff;border:0;color:#fff;cursor:pointer;font-weight:800">Open GitHub Build</button>
      <button id="apkDone" type="button" style="padding:10px 14px;border-radius:9px;border:1px solid #2b3650;background:#151d31;color:#fff;cursor:pointer">Close</button>
    </div>`;

  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  document.getElementById('apkClose').onclick = closeDialog;
  document.getElementById('apkDone').onclick = closeDialog;
  document.getElementById('apkCopyToken').onclick = () => copy(details.buildToken);
  document.getElementById('apkOpenWorkflow').onclick = () => openWorkflow(details);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeDialog();
  });

  pollBuild(details.buildId);
}

async function loadProject() {
  if (!projectId) throw new Error('Missing project ID');
  const auth = await supabase.auth.getUser();
  if (auth.error) throw auth.error;
  if (!auth.data.user) throw new Error('Please sign in first');

  const result = await supabase
    .from('projects')
    .select('id,user_id,name,status,project_type,app_definition')
    .eq('id', projectId)
    .eq('user_id', auth.data.user.id)
    .maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) throw new Error('Project not found');
  return result.data;
}

async function pollBuild(buildId) {
  const started = Date.now();
  const timer = setInterval(async () => {
    try {
      const { data, error } = await supabase
        .from('app_builds')
        .select('status,artifact_url,error,completed_at')
        .eq('id', buildId)
        .maybeSingle();

      if (error || !data) return;

      const message = document.getElementById('apkBuildMessage');
      const result = document.getElementById('apkResult');
      if (message) message.textContent = `Build status: ${data.status}`;
      setStatus(`APK build • ${data.status}`);

      if (data.status === 'success') {
        clearInterval(timer);
        if (result) {
          result.innerHTML = `<div style="padding:14px;border:1px solid rgba(84,214,129,.25);background:rgba(84,214,129,.08);border-radius:10px"><strong>APK build completed.</strong><div style="margin-top:8px"><a href="${esc(data.artifact_url || '#')}" target="_blank" rel="noopener" style="color:#8fa7ff">Open build artifacts</a></div></div>`;
        }
      } else if (data.status === 'failed') {
        clearInterval(timer);
        if (result) {
          result.innerHTML = `<div style="padding:14px;border:1px solid rgba(255,95,95,.25);background:rgba(255,95,95,.08);border-radius:10px"><strong>APK build failed.</strong><div style="margin-top:8px;color:#ffb0b0">${esc(data.error || 'Check the GitHub Actions logs.')}</div></div>`;
        }
      }
    } catch (error) {
      console.error('APK build polling failed', error);
    }

    if (Date.now() - started > 15 * 60 * 1000) clearInterval(timer);
  }, 2500);
}

async function createBuild() {
  const button = document.getElementById('buildApkButton');
  if (button) button.disabled = true;
  setStatus('Preparing APK build...');

  try {
    const project = await loadProject();
    const slug = project.app_definition?.publishing?.slug;
    if (project.status !== 'published' || !slug) {
      throw new Error('Publish this project first, then build the APK.');
    }

    const liveUrl = new URL(
      `live-app.html?slug=${encodeURIComponent(slug)}`,
      new URL('../html/live-app.html', location.href)
    ).href;
    const applicationId = appIdFrom(slug);
    const version = versionName();
    const buildToken = crypto.randomUUID();

    const { data: build, error } = await supabase
      .from('app_builds')
      .insert({
        project_id: project.id,
        user_id: project.user_id,
        platform: 'android',
        status: 'queued',
        build_token: buildToken
      })
      .select('id')
      .single();

    if (error) throw error;

    setStatus(`Build queued • ${build.id.slice(0, 8)}`);
    showDialog({
      buildId: build.id,
      buildToken,
      liveUrl,
      applicationId,
      versionName: version
    });
  } catch (error) {
    console.error('APK build preparation failed', error);
    setStatus(error.message || 'APK build preparation failed');
  } finally {
    if (button) button.disabled = false;
  }
}

function install() {
  const button = document.getElementById('buildApkButton');
  const actions = document.querySelector('.topbar-actions');
  if (!button && !actions) return;

  if (button) {
    if (!button.dataset.apkHandlerAttached) {
      button.dataset.apkHandlerAttached = '1';
      button.addEventListener('click', createBuild);
    }
    return;
  }

  const created = document.createElement('button');
  created.id = 'buildApkButton';
  created.type = 'button';
  created.className = 'secondary';
  created.textContent = 'Build APK';
  created.addEventListener('click', createBuild);
  actions.insertBefore(created, document.getElementById('publishButton') || null);
}

install();
window.IndoApkBuild = { createBuild };
