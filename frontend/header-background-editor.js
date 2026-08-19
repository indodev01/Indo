import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, syncLegacyFields } from './app-definition.js';

const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const projectId = new URLSearchParams(location.search).get('projectId');

let definition = null;
let project = null;
let initialized = false;

function activePageId() {
  if (!definition?.pages) return null;
  const wanted = String(pageStatus?.textContent || '').trim().toLowerCase();
  return Object.entries(definition.pages).find(([id, page]) =>
    id.toLowerCase() === wanted || String(page.name || '').trim().toLowerCase() === wanted
  )?.[0] || Object.keys(definition.pages)[0] || null;
}

function currentPage() {
  const id = activePageId();
  return id ? definition.pages[id] : null;
}

function findHeaderFromNode(node) {
  const id = node?.dataset?.headerComponent;
  return currentPage()?.components?.find((c) => c.id === id && c.type === 'Header') || null;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (s) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[s]));
}

function applyBackground(header, props = {}) {
  const bg = props.backgroundColor || props.bg || '#ffffff';
  const image = props.backgroundImage || '';
  header.style.background = bg;
  header.style.backgroundColor = bg;
  if (image) {
    const overlay = props.backgroundOverlay || 'rgba(0,0,0,0)';
    header.style.backgroundImage = `linear-gradient(${overlay},${overlay}), url(${JSON.stringify(image)})`;
    header.style.backgroundSize = props.backgroundSize || 'cover';
    header.style.backgroundPosition = props.backgroundPosition || 'center';
    header.style.backgroundRepeat = 'no-repeat';
  } else {
    header.style.backgroundImage = 'none';
    header.style.backgroundSize = '';
    header.style.backgroundPosition = '';
    header.style.backgroundRepeat = '';
  }
}

function openBackgroundEditor(component, header) {
  const p = component.props || {};
  const backdrop = document.createElement('div');
  backdrop.className = 'header-background-editor-backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:20px;background:rgba(2,5,12,.80);backdrop-filter:blur(10px);';

  const modal = document.createElement('div');
  modal.className = 'header-background-editor-modal';
  modal.style.cssText = 'width:min(540px,100%);max-height:calc(100vh - 40px);overflow:auto;padding:22px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:#111827;color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.58);';
  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start">
      <div>
        <div style="font-size:10px;font-weight:900;letter-spacing:.12em;color:#a78bfa">HEADER BACKGROUND</div>
        <h2 style="margin:6px 0 4px;font-size:20px">Customize Header</h2>
        <p style="margin:0;color:#9aa6bb;font-size:12px;line-height:1.5">Change the header color or add a background photo. The result updates immediately in the canvas.</p>
      </div>
      <button data-close type="button" aria-label="Close" style="width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#dbe2ed;font-size:18px">×</button>
    </div>

    <div style="display:grid;gap:13px;margin-top:18px">
      <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">
        Background color
        <input data-color type="color" value="${esc(p.backgroundColor || p.bg || '#ffffff')}" style="width:100%;height:40px;padding:2px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#0a101b">
      </label>

      <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">
        Background photo URL
        <input data-url type="url" value="${esc(p.backgroundImage && !String(p.backgroundImage).startsWith('data:') ? p.backgroundImage : '')}" placeholder="https://..." style="min-height:40px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9">
      </label>

      <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">
        Upload photo
        <input data-file type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="min-height:40px;padding:7px 0;color:#cfd7e4">
      </label>
      <div data-file-note style="font-size:10px;color:#7f8ba0">Max 2 MB. JPG, PNG, WebP or GIF.</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">Image size
          <select data-size style="min-height:40px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9">
            <option value="cover">Cover</option><option value="contain">Contain</option><option value="auto">Auto</option>
          </select>
        </label>
        <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">Image position
          <select data-pos style="min-height:40px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9">
            <option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option>
          </select>
        </label>
      </div>

      <label style="display:grid;gap:6px;font-size:10px;font-weight:800;color:#9ba7bb">
        Overlay
        <input data-overlay type="text" value="${esc(p.backgroundOverlay || 'rgba(0,0,0,0)')}" placeholder="rgba(0,0,0,.25)" style="min-height:40px;padding:9px 10px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#0a101b;color:#eef2f9">
      </label>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
      <button data-remove type="button" style="min-height:40px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,91,120,.2);background:rgba(255,91,120,.06);color:#ffacba;font-weight:800">Remove photo</button>
      <button data-cancel type="button" style="min-height:40px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#c8d0dd;font-weight:800">Cancel</button>
      <button data-save type="button" style="min-height:40px;padding:0 16px;border-radius:9px;border:0;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:900">Apply</button>
    </div>`;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const size = modal.querySelector('[data-size]');
  const pos = modal.querySelector('[data-pos]');
  const color = modal.querySelector('[data-color]');
  const url = modal.querySelector('[data-url]');
  const overlay = modal.querySelector('[data-overlay]');
  const note = modal.querySelector('[data-file-note]');
  size.value = p.backgroundSize || 'cover';
  pos.value = p.backgroundPosition || 'center';

  let uploadedImage = String(p.backgroundImage || '');

  modal.querySelector('[data-file]').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      note.textContent = 'Image is too large. Please use an image under 2 MB.';
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      uploadedImage = String(reader.result || '');
      note.textContent = `${file.name} selected`;
      applyBackground(header, {
        ...component.props,
        backgroundColor: color.value,
        backgroundImage: uploadedImage,
        backgroundSize: size.value,
        backgroundPosition: pos.value,
        backgroundOverlay: overlay.value.trim() || 'rgba(0,0,0,0)'
      });
    };
    reader.readAsDataURL(file);
  });

  const preview = () => applyBackground(header, {
    ...component.props,
    backgroundColor: color.value,
    backgroundImage: uploadedImage || url.value.trim(),
    backgroundSize: size.value,
    backgroundPosition: pos.value,
    backgroundOverlay: overlay.value.trim() || 'rgba(0,0,0,0)'
  });

  color.addEventListener('input', preview);
  url.addEventListener('input', preview);
  size.addEventListener('change', preview);
  pos.addEventListener('change', preview);
  overlay.addEventListener('input', preview);

  const close = () => backdrop.remove();
  modal.querySelector('[data-close]').onclick = close;
  modal.querySelector('[data-cancel]').onclick = close;
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });

  modal.querySelector('[data-remove]').onclick = () => {
    uploadedImage = '';
    url.value = '';
    preview();
  };

  modal.querySelector('[data-save]').onclick = async () => {
    const next = {
      backgroundColor: color.value || '#ffffff',
      backgroundImage: uploadedImage || url.value.trim(),
      backgroundSize: size.value || 'cover',
      backgroundPosition: pos.value || 'center',
      backgroundOverlay: overlay.value.trim() || 'rgba(0,0,0,0)'
    };
    component.props = { ...component.props, ...next, bg: next.backgroundColor };
    applyBackground(header, component.props);
    await saveDefinition();
    close();
  };
}

async function saveDefinition() {
  if (!projectId || !definition) return;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return;
  const synced = syncLegacyFields(definition);
  const result = await supabase.from('projects')
    .update({ pages: synced.pages, app_definition: synced.appDefinition, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', auth.data.user.id);
  if (result.error) console.error('Header background save failed', result.error);
}

function bindHeader(node) {
  if (!node?.classList.contains('canvas-header-component')) return;
  const header = node.querySelector('.app-header');
  if (!header || node.dataset.backgroundEditorBound === '1') return;
  const component = findHeaderFromNode(node);
  if (!component) return;
  node.dataset.backgroundEditorBound = '1';
  applyBackground(header, component.props || {});

  // Capture phase makes this reliable even when other header drag handlers are attached.
  header.addEventListener('dblclick', (event) => {
    if (event.target.closest('.header-title-edit, .header-title-wrap, .header-menu-toggle, .header-menu-panel, [data-responsive-handle], .responsive-size-handle')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openBackgroundEditor(component, header);
  }, true);
}

async function load() {
  if (!projectId) return;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return;
  const result = await supabase.from('projects')
    .select('id,user_id,name,description,app_definition,pages,updated_at')
    .eq('id', projectId)
    .eq('user_id', auth.data.user.id)
    .maybeSingle();
  if (result.error || !result.data) return;
  project = result.data;
  definition = normalizeDefinition(project);
}

async function attachAll() {
  await load();
  canvas?.querySelectorAll('.canvas-header-component').forEach(bindHeader);
}

function observeCanvas() {
  if (!canvas) return;
  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => canvas.querySelectorAll('.canvas-header-component').forEach(bindHeader));
  });
  observer.observe(canvas, { childList: true, subtree: true });
}

async function init() {
  await attachAll();
  observeCanvas();
}

init().catch((error) => console.error('Header background editor failed', error));
