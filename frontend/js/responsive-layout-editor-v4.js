import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const saveButton = document.getElementById('saveButton');
const deviceButtons = [...document.querySelectorAll('.device-button')];

const DEVICE_WIDTHS = { desktop: 760, tablet: 680, mobile: 362 };
const MIN_W = 80;
const MIN_H = 36;

let definition = null;
let activeDevice = 'desktop';
let loaded = false;
let pointerState = null;
let persistTimer = 0;
let rendering = false;

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const getStatus = () => document.getElementById('projectStatus');
const setStatus = (text) => { const el = getStatus(); if (el) el.textContent = text; };

function getPageId() {
  const wanted = String(pageStatus?.textContent || '').trim().toLowerCase();
  const pages = Object.entries(definition?.pages || {});
  return pages.find(([id, page]) => id.toLowerCase() === wanted || String(page.name || '').toLowerCase() === wanted)?.[0] || pages[0]?.[0] || null;
}
function getPage() { const id = getPageId(); return id ? definition?.pages?.[id] : null; }
function getComponent(node) { const i = Number(node?.dataset?.index); return Number.isInteger(i) ? getPage()?.components?.[i] || null : null; }

function deviceStyles(component, create = false) {
  if (!component) return null;
  component.props = component.props || {};
  if (create) component.props.deviceStyles = component.props.deviceStyles || {};
  return component.props.deviceStyles || null;
}
function deviceBucket(component, device = activeDevice, create = false) {
  const styles = deviceStyles(component, create);
  if (!styles) return null;
  if (create) styles[device] = styles[device] || {};
  return styles[device] || null;
}

function storedDesktopPosition(component) {
  const responsive = deviceBucket(component, 'desktop', false)?.position;
  const legacy = component?.props?.position;
  const p = responsive || legacy;
  if (!p) return null;
  const width = Number(p.width);
  const height = Number(p.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { x: Number(p.x) || 0, y: Number(p.y) || 0, width, height };
}

function rememberDesktopBase(node, component) {
  const saved = component?.props?._responsiveBase;
  if (saved?.width >= MIN_W && saved?.height >= MIN_H) return clone(saved);

  const stored = storedDesktopPosition(component);
  if (stored) {
    component.props._responsiveBase = clone(stored);
    return stored;
  }

  const rect = node.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const base = {
    x: Math.max(0, Math.round(rect.left - canvasRect.left + canvas.scrollLeft)),
    y: Math.max(0, Math.round(rect.top - canvasRect.top + canvas.scrollTop)),
    width: Math.max(MIN_W, Math.round(rect.width || 160)),
    height: Math.max(MIN_H, Math.round(rect.height || 48))
  };
  component.props._responsiveBase = clone(base);
  return base;
}

function canvasContentWidth(device) {
  const css = getComputedStyle(canvas);
  const padding = (parseFloat(css.paddingLeft) || 0) + (parseFloat(css.paddingRight) || 0);
  const actual = Math.max(120, canvas.clientWidth - padding);
  return Math.max(120, Math.min(DEVICE_WIDTHS[device] || actual, actual));
}

function inheritedPosition(node, component, device) {
  const base = rememberDesktopBase(node, component);
  if (device === 'desktop') return clone(base);

  const sourceWidth = DEVICE_WIDTHS.desktop;
  const targetWidth = canvasContentWidth(device);
  const scale = Math.min(1, targetWidth / sourceWidth);
  const isWide = base.width >= sourceWidth * 0.82;

  let width = isWide ? targetWidth : Math.min(targetWidth - 8, Math.max(MIN_W, base.width * scale));
  let height = base.height * scale;

  if (component?.type === 'Header') {
    width = targetWidth;
    height = Math.max(48, Math.min(88, base.height * (device === 'mobile' ? 0.82 : 0.9)));
  } else {
    height = Math.max(MIN_H, height);
  }

  const x = Math.max(0, Math.min(targetWidth - width, base.x * scale));
  const y = Math.max(0, base.y * scale);
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function effectivePosition(node, component) {
  const override = deviceBucket(component, activeDevice, false)?.position;
  if (override && Number.isFinite(Number(override.width)) && Number.isFinite(Number(override.height))) {
    return {
      x: Math.max(0, Number(override.x) || 0),
      y: Math.max(0, Number(override.y) || 0),
      width: Math.max(MIN_W, Number(override.width)),
      height: Math.max(MIN_H, Number(override.height))
    };
  }
  return inheritedPosition(node, component, activeDevice);
}

function applyPosition(node, position) {
  const p = position;
  node.classList.add('responsive-position-item');
  node.draggable = false;
  Object.assign(node.style, {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transform: `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`,
    width: `${Math.max(MIN_W, Math.round(p.width))}px`,
    height: `${Math.max(MIN_H, Math.round(p.height))}px`,
    maxWidth: 'none',
    minWidth: '0',
    boxSizing: 'border-box',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'grab'
  });
  node.__responsiveLayout = clone(p);
  node.__responsiveDevice = activeDevice;
  canvas.style.minHeight = `${Math.max(activeDevice === 'mobile' ? 620 : 660, p.y + p.height + 100)}px`;
}

function ensureHandles(node) {
  if (node.querySelector('.responsive-size-handle')) return;
  ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((corner) => {
    const handle = document.createElement('div');
    handle.className = `responsive-size-handle responsive-size-handle-${corner}`;
    handle.dataset.responsiveHandle = corner;
    node.appendChild(handle);
  });
}

function enforceHeaderSize(node) {
  if (!node.classList.contains('canvas-header-component')) return;
  const header = node.querySelector('.app-header');
  if (!header) return;
  Object.assign(header.style, {
    width: '100%',
    maxWidth: '100%',
    minWidth: '0',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'visible'
  });
  node.style.overflow = 'visible';
}

function innerBase(component, kind) {
  const desktop = deviceBucket(component, 'desktop', false)?.[kind];
  const legacy = component?.props?.[kind];
  const p = desktop || legacy;
  return { x: Number(p?.x) || 0, y: Number(p?.y) || 0 };
}

function applyHeaderInner(node, component) {
  if (!node.classList.contains('canvas-header-component')) return;
  const title = node.querySelector('.header-title-wrap');
  const menu = node.querySelector('.header-menu-toggle');
  const override = deviceBucket(component, activeDevice, false);
  const source = DEVICE_WIDTHS.desktop;
  const target = canvasContentWidth(activeDevice);
  const scale = activeDevice === 'desktop' ? 1 : Math.min(1, target / source);

  const place = (element, key) => {
    if (!element) return;
    const own = override?.[key];
    const base = own || innerBase(component, key);
    const x = own ? Number(base.x) || 0 : Math.round((Number(base.x) || 0) * scale);
    const y = own ? Number(base.y) || 0 : Math.round((Number(base.y) || 0) * scale);
    element.style.transform = `translate(${x}px,${y}px)`;
    element.style.touchAction = 'none';
    element.style.maxWidth = 'calc(100% - 8px)';
  };

  place(title, 'titlePosition');
  place(menu, 'menuPosition');
}

function savePositionOverride(node, position) {
  const component = getComponent(node);
  if (!component) return;
  const bucket = deviceBucket(component, activeDevice, true);
  bucket.position = {
    x: Math.round(position.x),
    y: Math.round(position.y),
    width: Math.round(position.width),
    height: Math.round(position.height)
  };
  if (activeDevice === 'desktop') {
    component.props.position = clone(bucket.position);
    component.props._responsiveBase = clone(bucket.position);
  }
}

function saveInnerOverride(node, kind, position) {
  const component = getComponent(node);
  if (!component) return;
  deviceBucket(component, activeDevice, true)[kind] = { x: Math.round(position.x), y: Math.round(position.y) };
  if (activeDevice === 'desktop') component.props[kind] = clone(deviceBucket(component, activeDevice, false)[kind]);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left + canvas.scrollLeft, y: event.clientY - rect.top + canvas.scrollTop };
}

function startDrag(node, event) {
  if (!loaded || event.button !== 0) return;
  const handle = event.target.closest?.('[data-responsive-handle]');
  if (handle) {
    const base = effectivePosition(node, getComponent(node));
    const start = canvasPoint(event);
    pointerState = { kind: 'resize', node, corner: handle.dataset.responsiveHandle, base, startX: start.x, startY: start.y, pointerId: event.pointerId, moved: false };
  } else {
    const inner = node.classList.contains('canvas-header-component') ? event.target.closest?.('.header-title-wrap,.header-title-edit,.header-menu-toggle') : null;
    if (inner) {
      const component = getComponent(node);
      const key = inner.classList.contains('header-menu-toggle') ? 'menuPosition' : 'titlePosition';
      const own = deviceBucket(component, activeDevice, false)?.[key];
      const base = own || innerBase(component, key);
      const scale = activeDevice === 'desktop' ? 1 : Math.min(1, canvasContentWidth(activeDevice) / DEVICE_WIDTHS.desktop);
      pointerState = {
        kind: 'inner', node, element: inner, key,
        base: { x: own ? Number(base.x) || 0 : (Number(base.x) || 0) * scale, y: own ? Number(base.y) || 0 : (Number(base.y) || 0) * scale },
        startX: event.clientX, startY: event.clientY, pointerId: event.pointerId, moved: false
      };
    } else {
      const base = effectivePosition(node, getComponent(node));
      const start = canvasPoint(event);
      pointerState = { kind: 'move', node, base, startX: start.x, startY: start.y, pointerId: event.pointerId, moved: false };
    }
  }

  const target = pointerState.kind === 'inner' ? pointerState.element : pointerState.node;
  target.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
}

function pointerMove(event) {
  if (!pointerState) return;

  if (pointerState.kind === 'inner') {
    const dx = event.clientX - pointerState.startX;
    const dy = event.clientY - pointerState.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pointerState.moved = true;
    const next = { x: pointerState.base.x + dx, y: pointerState.base.y + dy };
    pointerState.element.style.transform = `translate(${Math.round(next.x)}px,${Math.round(next.y)}px)`;
    saveInnerOverride(pointerState.node, pointerState.key, next);
    event.preventDefault();
    return;
  }

  const cursor = canvasPoint(event);
  const dx = cursor.x - pointerState.startX;
  const dy = cursor.y - pointerState.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pointerState.moved = true;
  const base = pointerState.base;
  const next = { ...base };

  if (pointerState.kind === 'move') {
    next.x = Math.max(0, base.x + dx);
    next.y = Math.max(0, base.y + dy);
  } else {
    const corner = pointerState.corner;
    if (corner.includes('right')) next.width = base.width + dx;
    if (corner.includes('left')) { next.width = base.width - dx; next.x = base.x + dx; }
    if (corner.includes('bottom')) next.height = base.height + dy;
    if (corner.includes('top')) { next.height = base.height - dy; next.y = base.y + dy; }
    next.width = Math.max(MIN_W, next.width);
    next.height = Math.max(MIN_H, next.height);
    next.x = Math.max(0, next.x);
    next.y = Math.max(0, next.y);
  }

  applyPosition(pointerState.node, next);
  enforceHeaderSize(pointerState.node);
  savePositionOverride(pointerState.node, next);
  event.preventDefault();
}

function pointerUp() {
  if (!pointerState) return;
  const state = pointerState;
  try { state.node?.releasePointerCapture?.(state.pointerId); } catch {}
  try { state.element?.releasePointerCapture?.(state.pointerId); } catch {}
  pointerState = null;
  if (state.moved) queuePersist();
}

function enhance() {
  if (!canvas || !definition || rendering) return;
  rendering = true;
  try {
    const current = getPage();
    const nodes = [...canvas.querySelectorAll('.canvas-item')];
    nodes.forEach((node, index) => {
      const component = current?.components?.[index];
      if (!component) return;
      if (activeDevice === 'desktop') rememberDesktopBase(node, component);
      applyPosition(node, effectivePosition(node, component));
      enforceHeaderSize(node);
      applyHeaderInner(node, component);
      ensureHandles(node);
      if (node.dataset.responsiveBound !== '1') {
        node.dataset.responsiveBound = '1';
        node.addEventListener('pointerdown', (event) => startDrag(node, event), { passive: false });
      }
    });
  } finally {
    rendering = false;
  }
}

async function persist() {
  if (!projectId || !definition || !loaded) return;
  try {
    const auth = await supabase.auth.getUser();
    const user = auth.data?.user;
    if (!user) return;
    const latestResult = await supabase.from('projects').select('id,user_id,app_definition,pages').eq('id', projectId).eq('user_id', user.id).maybeSingle();
    if (latestResult.error || !latestResult.data) return;
    const latest = normalizeDefinition(latestResult.data);
    const id = getPageId();
    const localPage = definition.pages?.[id];
    const targetPage = latest.pages?.[id];
    if (!localPage || !targetPage) return;

    localPage.components.forEach((localComponent, index) => {
      const localStyles = localComponent.props?.deviceStyles;
      if (!localStyles) return;
      const target = targetPage.components?.[index];
      if (!target) return;
      target.props = { ...(target.props || {}), deviceStyles: { ...(target.props?.deviceStyles || {}), [activeDevice]: clone(localStyles[activeDevice] || {}) } };
      if (activeDevice === 'desktop' && localStyles.desktop?.position) {
        target.props.position = clone(localStyles.desktop.position);
        target.props._responsiveBase = clone(localStyles.desktop.position);
      }
    });

    const result = await supabase.from('projects').update({
      pages: latest.pages,
      app_definition: { ...(latestResult.data.app_definition || {}), pages: latest.pages },
      updated_at: new Date().toISOString()
    }).eq('id', projectId).eq('user_id', user.id);
    if (!result.error) setStatus(`${activeDevice[0].toUpperCase() + activeDevice.slice(1)} layout saved`);
  } catch (error) {
    console.warn('Responsive layout save failed', error);
  }
}

function queuePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 250);
}

function applyCanvasMode(device) {
  canvas?.classList.toggle('canvas-desktop', device === 'desktop');
  canvas?.classList.toggle('canvas-tablet', device === 'tablet');
  canvas?.classList.toggle('canvas-mobile', device === 'mobile');
}

function setDevice(device) {
  if (!DEVICE_WIDTHS[device]) return;
  activeDevice = device;
  window.__indoBuilderDevice = device;
  document.documentElement.dataset.indoDevice = device;
  deviceButtons.forEach((button) => button.classList.toggle('active', button.dataset.device === device));
  applyCanvasMode(device);
  requestAnimationFrame(() => {
    enhance();
    setStatus(`${device[0].toUpperCase() + device.slice(1)} preview`);
  });
}

async function load() {
  if (!projectId) return;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return;
  const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages').eq('id', projectId).eq('user_id', auth.data.user.id).maybeSingle();
  if (result.error || !result.data) return;
  definition = normalizeDefinition(result.data);
  loaded = true;
  setDevice('desktop');
  enhance();
}

(function injectRuntimeStyle() {
  if (document.getElementById('responsiveRuntimeStyle')) return;
  const style = document.createElement('style');
  style.id = 'responsiveRuntimeStyle';
  style.textContent = `
    #canvas.canvas-desktop { width:min(760px,calc(100% - 8px)) !important; max-width:760px !important; }
    #canvas.canvas-tablet { width:min(680px,calc(100% - 8px)) !important; max-width:680px !important; }
    #canvas.canvas-mobile { width:min(362px,calc(100% - 8px)) !important; max-width:362px !important; }
    .responsive-position-item { margin:0 !important; min-width:0 !important; }
    .responsive-position-item.canvas-header-component { overflow:visible !important; }
    .responsive-position-item.canvas-header-component > .app-header { width:100% !important; max-width:100% !important; min-width:0 !important; height:100% !important; box-sizing:border-box !important; }
    .responsive-position-item .responsive-size-handle { position:absolute !important; width:8px !important; height:8px !important; display:block !important; z-index:999 !important; border:1px solid #fff !important; background:#8b5cf6 !important; border-radius:2px !important; }
    .responsive-size-handle-top-left{left:-4px!important;top:-4px!important;cursor:nwse-resize!important}.responsive-size-handle-top-right{right:-4px!important;top:-4px!important;cursor:nesw-resize!important}.responsive-size-handle-bottom-left{left:-4px!important;bottom:-4px!important;cursor:nesw-resize!important}.responsive-size-handle-bottom-right{right:-4px!important;bottom:-4px!important;cursor:nwse-resize!important}
    .responsive-position-item .header-title-wrap,.responsive-position-item .header-menu-toggle { max-width:calc(100% - 10px) !important; touch-action:none !important; }
  `;
  document.head.appendChild(style);
})();

deviceButtons.forEach((button) => button.addEventListener('click', () => setDevice(button.dataset.device), { capture: true }));
canvas?.addEventListener('pointermove', pointerMove, { passive: false });
window.addEventListener('pointerup', pointerUp, { passive: true });
window.addEventListener('pointercancel', pointerUp, { passive: true });
window.addEventListener('resize', () => requestAnimationFrame(enhance));
saveButton?.addEventListener('click', queuePersist);
const observer = new MutationObserver(() => requestAnimationFrame(enhance));
if (canvas) observer.observe(canvas, { childList: true, subtree: true });
window.__indoResponsive = { getDevice: () => activeDevice, setDevice };
setTimeout(load, 350);
