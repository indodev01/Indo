import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, syncLegacyFields } from './app-definition.js';

const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const projectId = new URLSearchParams(location.search).get('projectId');

let definition = null;
let project = null;
let bound = new WeakSet();

function activePageId() {
  if (!definition?.pages) return null;
  const name = String(pageStatus?.textContent || '').trim().toLowerCase();
  return Object.entries(definition.pages).find(([id, page]) => id === name || String(page.name || '').trim().toLowerCase() === name)?.[0]
    || Object.keys(definition.pages)[0]
    || null;
}

function currentPage() {
  const id = activePageId();
  return id ? definition.pages[id] : null;
}

function findHeader(node) {
  const id = node.dataset.headerComponent;
  const page = currentPage();
  return page?.components?.find((c) => c.id === id && c.type === 'Header') || null;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (s) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[s]));
}

function applyBackground(node, props) {
  const bg = props.backgroundColor || props.bg || '#ffffff';
  const image = props.backgroundImage || '';
  node.style.background = bg;
  if (image) {
    node.style.backgroundImage = `linear-gradient(${props.backgroundOverlay || 'rgba(0,0,0,0)'},${props.backgroundOverlay || 'rgba(0,0,0,0)'}), url(${JSON.stringify(image)})`;
    node.style.backgroundSize = props.backgroundSize || 'cover';
    node.style.backgroundPosition = props.backgroundPosition || 'center';
    node.style.backgroundRepeat = 'no-repeat';
  } else {
    node.style.backgroundImage = 'none';
  }
}

function openBackgroundEditor(component, node) {
  const p = component.props || {};
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:500;display:grid;place-items:center;padding:20px;background:rgba(2,5,12,.78);backdrop-filter:blur(9px)';
  const modal = document.createElement('div');
  modal.style.cssText = 'width:min(520px,100%);padding:22px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#111827;color:#fff;box-shadow:0 28px 90px rgba(0,0,0,.55)';
  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start;gap:16px">
      <div><div style="font-size:10px;font-weight:900;letter-spacing:.12em;color:#a78bfa">HEADER BACKGROUND</div><h2 style="margin:6px 0 4px;font-size:20px">Customize Header Background</h2><p style="margin:0;color:#9aa6bb;font-size:12px">Choose a color or add your own background image.</p></div>
      <button data-close type="button" style="width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#dbe2ed;font-size:18px">×</button>
    </div>
    <div style="display:grid;gap:13px;margin-top:18px">
      <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">Background color<input data-color type="color" value="${esc(p.backgroundColor || p.bg || '#ffffff')}" style="width:100%;height:38px;padding:2px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#0a101b"></label>
      <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">Background image URL<input data-url type="url" value="${esc(p.backgroundImage || '')}" placeholder="https://..." style="min-height:38px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9"></label>
      <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">Or upload an image<input data-file type="file" accept="image/*" style="min-height:38px;padding:7px 0;color:#cfd7e4"></label>
      <div data-file-note style="font-size:10px;color:#7f8ba0">Recommended: a lightweight JPG/PNG/WebP. Uploaded image is stored in the app definition.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">Background size<select data-size style="min-height:38px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9"><option>cover</option><option>contain</option><option>auto</option></select></label>
        <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">Position<select data-pos style="min-height:38px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9"><option>center</option><option>top</option><option>bottom</option><option>left</option><option>right</option></select></label>
      </div>
      <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">Overlay<input data-overlay type="text" value="${esc(p.backgroundOverlay || 'rgba(0,0,0,0)')}" placeholder="rgba(0,0,0,.25)" style="min-height:38px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9"></label>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px"><button data-reset type="button" style="min-height:38px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#c8d0dd;font-weight:800">Remove image</button><button data-save type="button" style="min-height:38px;padding:0 14px;border-radius:9px;border:0;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:900">Apply</button></div>`;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const size = modal.querySelector('[data-size]'); size.value = p.backgroundSize || 'cover';
  const pos = modal.querySelector('[data-pos]'); pos.value = p.backgroundPosition || 'center';
  let uploaded = p.backgroundImage || '';

  modal.querySelector('[data-file]').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { modal.querySelector('[data-file-note]').textContent = 'Image is too large. Please use an image under 2 MB.'; event.target.value=''; return; }
    const reader = new FileReader();
    reader.onload = () => { uploaded = String(reader.result || ''); modal.querySelector('[data-file-note]').textContent = `${file.name} selected`; };
    reader.readAsDataURL(file);
  });

  const close = () => backdrop.remove();
  modal.querySelector('[data-close]').onclick = close;
  backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
  modal.querySelector('[data-reset]').onclick = () => { uploaded = ''; modal.querySelector('[data-url]').value = ''; applyBackground(node, { ...p, backgroundImage: '' }); };
  modal.querySelector('[data-save]').onclick = async () => {
    const next = {
      backgroundColor: modal.querySelector('[data-color]').value || '#ffffff',
      backgroundImage: uploaded || modal.querySelector('[data-url]').value.trim(),
      backgroundSize: size.value,
      backgroundPosition: pos.value,
      backgroundOverlay: modal.querySelector('[data-overlay]').value.trim() || 'rgba(0,0,0,0)'
    };
    component.props = { ...component.props, ...next, bg: next.backgroundColor };
    applyBackground(node, component.props);
    await saveDefinition();
    close();
  };
}

async function saveDefinition() {
  if (!projectId || !definition || !project) return;
  const synced = syncLegacyFields(definition);
  const { error } = await supabase.from('projects').update({ pages: synced.pages, app_definition: synced.appDefinition, updated_at: new Date().toISOString() }).eq('id', projectId);
  if (error) console.error('Header background save failed', error);
}

function enhance(node) {
  if (!node.classList.contains('canvas-header-component') || bound.has(node)) return;
  const header = node.querySelector('.app-header');
  if (!header) return;
  const component = findHeader(node);
  if (!component) return;
  bound.add(node);
  applyBackground(header, component.props || {});
  header.addEventListener('dblclick', (event) => {
    if (event.target.closest('.header-title-edit, .header-menu-toggle, .header-menu-panel, .free-size-handle')) return;
    event.stopPropagation();
    openBackgroundEditor(component, header);
  });
}

async function load() {
  if (!projectId) return;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return;
  const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages,updated_at').eq('id', projectId).eq('user_id', auth.data.user.id).maybeSingle();
  if (result.error || !result.data) return;
  project = result.data;
  definition = normalizeDefinition(project);
}

async function init() {
  await load();
  const attach = () => canvas?.querySelectorAll('.canvas-header-component').forEach(enhance);
  attach();
  new MutationObserver(attach).observe(canvas, { childList: true, subtree: true });
  new MutationObserver(() => { load().then(attach); }).observe(pageStatus || document.body, { childList: true, characterData: true, subtree: true });
}

init().catch((error) => console.error('Header background editor failed', error));
