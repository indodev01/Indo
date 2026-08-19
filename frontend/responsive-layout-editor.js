import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const saveButton = document.getElementById('saveButton');
const deviceButtons = [...document.querySelectorAll('.device-button')];

const DEVICE_WIDTHS = { desktop: 760, tablet: 680, mobile: 362 };
const DEVICE_MIN_HEIGHTS = { desktop: 620, tablet: 620, mobile: 620 };
const MIN_WIDTH = 80;
const MIN_HEIGHT = 36;

let definition = null;
let activeDevice = 'desktop';
let loaded = false;
let pointerState = null;
let persistTimer = 0;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function setStatus(text) {
  const el = document.getElementById('projectStatus');
  if (el) el.textContent = text;
}

function currentPageId() {
  const wanted = String(pageStatus?.textContent || '').trim().toLowerCase();
  const entries = Object.entries(definition?.pages || {});
  const found = entries.find(([id, page]) => id.toLowerCase() === wanted || String(page.name || '').toLowerCase() === wanted);
  return found?.[0] || entries[0]?.[0] || null;
}

function currentPage() {
  const id = currentPageId();
  return id ? definition?.pages?.[id] : null;
}

function componentForNode(node) {
  const index = Number(node.dataset.index);
  return Number.isInteger(index) ? currentPage()?.components?.[index] || null : null;
}

function deviceStyles(component, create = false) {
  if (!component) return null;
  component.props = component.props || {};
  if (create) component.props.deviceStyles = component.props.deviceStyles || {};
  return component.props.deviceStyles || null;
}

function overrideFor(component, device, create = false) {
  const styles = deviceStyles(component, create);
  if (!styles) return null;
  if (create) styles[device] = styles[device] || {};
  return styles[device] || null;
}

function explicitPosition(component, device) {
  const bucket = overrideFor(component, device, false);
  if (bucket?.position) {
    const p = bucket.position;
    if (Number.isFinite(Number(p.width)) && Number.isFinite(Number(p.height))) {
      return { x: Number(p.x) || 0, y: Number(p.y) || 0, width: Number(p.width), height: Number(p.height) };
    }
  }
  if (device === 'desktop' && component?.props?.position) {
    const p = component.props.position;
    return { x: Number(p.x) || 0, y: Number(p.y) || 0, width: Number(p.width) || 0, height: Number(p.height) || 0 };
  }
  return null;
}

function captureDesktopBase(node, component) {
  const stored = node.__desktopBase;
  if (stored?.width >= MIN_WIDTH && stored?.height >= MIN_HEIGHT) return clone(stored);

  const explicit = explicitPosition(component, 'desktop');
  if (explicit?.width > 0 && explicit?.height > 0) {
    node.__desktopBase = clone(explicit);
    return clone(explicit);
  }

  const rect = node.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const width = Math.max(MIN_WIDTH, Math.round(rect.width || 160));
  const height = Math.max(MIN_HEIGHT, Math.round(rect.height || 48));
  const x = Math.max(0, Math.round(rect.left - canvasRect.left + canvas.scrollLeft));
  const y = Math.max(0, Math.round(rect.top - canvasRect.top + canvas.scrollTop));
  const base = { x, y, width, height };
  node.__desktopBase = clone(base);
  return base;
}

function sourcePosition(node, component) {
  return captureDesktopBase(node, component);
}

function inheritedPosition(node, component, device) {
  const base = sourcePosition(node, component);
  if (device === 'desktop') return base;

  const sourceWidth = Math.max(1, DEVICE_WIDTHS.desktop);
  const targetWidth = Math.max(280, DEVICE_WIDTHS[device] || sourceWidth);
  const scale = Math.min(1, targetWidth / sourceWidth);

  let width = base.width * scale;
  let height = base.height * scale;
  let x = base.x * scale;
  let y = base.y * scale;

  if (component?.type === 'Header') {
    width = Math.min(targetWidth, Math.max(MIN_WIDTH, targetWidth - 2));
    height = Math.max(44, Math.min(88, base.height * Math.max(scale, 0.72)));
    x = Math.max(0, Math.min(targetWidth - width, x * scale));
    y = Math.max(0, y * scale);
  } else {
    width = Math.max(MIN_WIDTH, Math.min(targetWidth - 8, width));
    height = Math.max(MIN_HEIGHT, height);
    x = Math.max(0, Math.min(targetWidth - width, x));
    y = Math.max(0, y);
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

function effectivePosition(node, component) {
  const explicit = explicitPosition(component, activeDevice);
  if (explicit?.width > 0 && explicit?.height > 0) {
    return {
      x: explicit.x,
      y: explicit.y,
      width: Math.max(MIN_WIDTH, explicit.width),
      height: Math.max(MIN_HEIGHT, explicit.height)
    };
  }
  return inheritedPosition(node, component, activeDevice);
}

function applyPosition(node, position) {
  const p = position || { x: 0, y: 0, width: MIN_WIDTH, height: MIN_HEIGHT };
  node.classList.add('responsive-position-item');
  node.draggable = false;
  node.style.position = 'absolute';
  node.style.left = '0px';
  node.style.top = '0px';
  node.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
  node.style.width = `${Math.max(MIN_WIDTH, Math.round(p.width))}px`;
  node.style.height = `${Math.max(MIN_HEIGHT, Math.round(p.height))}px`;
  node.style.boxSizing = 'border-box';
  node.style.touchAction = 'none';
  node.style.userSelect = 'none';
  node.style.cursor = 'grab';
  node.__responsiveLayout = clone(p);
  node.__responsiveDevice = activeDevice;

  const bottom = p.y + p.height + 120;
  canvas.style.minHeight = `${Math.max(DEVICE_MIN_HEIGHTS[activeDevice] || 620, bottom)}px`;
}

function ensureHandles(node) {
  if (node.querySelector('.responsive-size-handle')) return;
  ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((position) => {
    const handle = document.createElement('div');
    handle.className = `responsive-size-handle responsive-size-handle-${position}`;
    handle.dataset.responsiveHandle = position;
    node.appendChild(handle);
  });
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left + canvas.scrollLeft,
    y: event.clientY - rect.top + canvas.scrollTop
  };
}

function savePositionOverride(node, position) {
  const component = componentForNode(node);
  if (!component) return;
  const bucket = overrideFor(component, activeDevice, true);
  bucket.position = {
    x: Math.round(position.x),
    y: Math.round(position.y),
    width: Math.round(position.width),
    height: Math.round(position.height)
  };
}

function innerScale(component) {
  const base = sourcePosition(component ? document.querySelector(`[data-index="${Number(component.__index)}"]`) : null, component);
  return activeDevice === 'desktop' ? 1 : Math.min(1, Math.max(DEVICE_WIDTHS[activeDevice] / DEVICE_WIDTHS.desktop, 0.25));
}

function innerBase(component, kind) {
  const styles = deviceStyles(component, false);
  const desktop = styles?.desktop?.[kind] || component.props?.[kind];
  return desktop ? { x: Number(desktop.x) || 0, y: Number(desktop.y) || 0 } : { x: 0, y: 0 };
}

function applyInnerLayout(node, component) {
  const title = node.querySelector('.header-title-wrap');
  const menu = node.querySelector('.header-menu-toggle');
  const bucket = overrideFor(component, activeDevice, false);

  if (title) {
    title.style.transform = 'none';
    const p = bucket?.titlePosition;
    if (p) {
      title.style.transform = `translate(${Number(p.x) || 0}px, ${Number(p.y) || 0}px)`;
    } else if (activeDevice !== 'desktop') {
      const base = innerBase(component, 'titlePosition');
      const scale = Math.min(1, DEVICE_WIDTHS[activeDevice] / DEVICE_WIDTHS.desktop);
      if (base.x || base.y) title.style.transform = `translate(${Math.round(base.x * scale)}px, ${Math.round(base.y * scale)}px)`;
    }
    title.style.touchAction = 'none';
  }

  if (menu) {
    menu.style.transform = 'none';
    const p = bucket?.menuPosition;
    if (p) {
      menu.style.transform = `translate(${Number(p.x) || 0}px, ${Number(p.y) || 0}px)`;
    } else if (activeDevice !== 'desktop') {
      const base = innerBase(component, 'menuPosition');
      const scale = Math.min(1, DEVICE_WIDTHS[activeDevice] / DEVICE_WIDTHS.desktop);
      if (base.x || base.y) menu.style.transform = `translate(${Math.round(base.x * scale)}px, ${Math.round(base.y * scale)}px)`;
    }
    menu.style.touchAction = 'none';
  }
}

function saveInnerOverride(node, kind, position) {
  const component = componentForNode(node);
  if (!component) return;
  const bucket = overrideFor(component, activeDevice, true);
  bucket[kind] = { x: Math.round(position.x), y: Math.round(position.y) };
}

function startResize(node, event, handle) {
  const base = effectivePosition(node, componentForNode(node));
  const start = canvasPoint(event);
  pointerState = {
    kind: 'resize', node, handle, base, startX: start.x, startY: start.y,
    pointerId: event.pointerId, moved: false
  };
  node.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
}

function startInnerMove(node, element, event) {
  const component = componentForNode(node);
  if (!component) return;
  const kind = element.classList.contains('header-menu-toggle') ? 'menuPosition' : 'titlePosition';
  const bucket = overrideFor(component, activeDevice, false);
  const scale = activeDevice === 'desktop' ? 1 : Math.min(1, DEVICE_WIDTHS[activeDevice] / DEVICE_WIDTHS.desktop);
  const inherited = bucket?.[kind] || innerBase(component, kind);
  const base = {
    x: Number(inherited.x) || 0,
    y: Number(inherited.y) || 0
  };
  if (!bucket?.[kind] && activeDevice !== 'desktop') {
    base.x *= scale;
    base.y *= scale;
  }
  pointerState = {
    kind: 'inner', node, element, innerKind: kind, base,
    startX: event.clientX, startY: event.clientY, pointerId: event.pointerId, moved: false
  };
  element.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
}

function startOuterMove(node, event) {
  const base = effectivePosition(node, componentForNode(node));
  const start = canvasPoint(event);
  pointerState = {
    kind: 'outer', node, base, startX: start.x, startY: start.y,
    pointerId: event.pointerId, moved: false
  };
  node.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
}

function pointerDown(node, event) {
  if (!definition || event.button !== 0) return;
  const handle = event.target.closest?.('[data-responsive-handle]');
  if (handle) return startResize(node, event, handle.dataset.responsiveHandle);

  if (node.classList.contains('canvas-header-component')) {
    const inner = event.target.closest?.('.header-title-wrap, .header-title-edit, .header-menu-toggle');
    if (inner) return startInnerMove(node, inner, event);
  }

  startOuterMove(node, event);
}

function pointerMove(event) {
  if (!pointerState) return;

  if (pointerState.kind === 'inner') {
    const dx = event.clientX - pointerState.startX;
    const dy = event.clientY - pointerState.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pointerState.moved = true;
    const next = { x: pointerState.base.x + dx, y: pointerState.base.y + dy };
    pointerState.element.style.transform = `translate(${Math.round(next.x)}px, ${Math.round(next.y)}px)`;
    saveInnerOverride(pointerState.node, pointerState.innerKind, next);
    event.preventDefault();
    return;
  }

  const point = canvasPoint(event);
  const dx = point.x - pointerState.startX;
  const dy = point.y - pointerState.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pointerState.moved = true;

  const base = pointerState.base;
  const next = { ...base };

  if (pointerState.kind === 'outer') {
    next.x = Math.max(0, base.x + dx);
    next.y = Math.max(0, base.y + dy);
  } else {
    const h = pointerState.handle;
    if (h.includes('right')) next.width = base.width + dx;
    if (h.includes('left')) { next.width = base.width - dx; next.x = base.x + dx; }
    if (h.includes('bottom')) next.height = base.height + dy;
    if (h.includes('top')) { next.height = base.height - dy; next.y = base.y + dy; }
    next.width = Math.max(MIN_WIDTH, next.width);
    next.height = Math.max(MIN_HEIGHT, next.height);
    next.x = Math.max(0, next.x);
    next.y = Math.max(0, next.y);
  }

  applyPosition(pointerState.node, next);
  savePositionOverride(pointerState.node, next);
  event.preventDefault();
}

function pointerUp() {
  if (!pointerState) return;
  const { node, element, pointerId, moved } = pointerState;
  try { node?.releasePointerCapture?.(pointerId); } catch {}
  try { element?.releasePointerCapture?.(pointerId); } catch {}
  pointerState = null;
  if (moved) queuePersist();
}

function injectResponsiveCanvasStyle() {
  if (document.getElementById('responsiveCanvasRuntimeStyle')) return;
  const style = document.createElement('style');
  style.id = 'responsiveCanvasRuntimeStyle';
  style.textContent = `
    #canvas.canvas-mobile { width: min(362px, calc(100vw - 30px)) !important; max-width: 362px !important; padding: 12px 10px 18px !important; }
    #canvas.canvas-tablet { width: min(680px, calc(100vw - 30px)) !important; max-width: 680px !important; padding: 18px 14px 22px !important; }
    #canvas.canvas-desktop { width: min(760px, calc(100vw - 30px)) !important; max-width: 760px !important; }
    .responsive-position-item { margin: 0 !important; }
    .responsive-position-item .responsive-size-handle { position: absolute !important; width: 8px !important; height: 8px !important; display: block !important; z-index: 999 !important; border: 1px solid #fff !important; background: #8b5cf6 !important; border-radius: 2px !important; }
    .responsive-size-handle-top-left { left: -4px !important; top: -4px !important; cursor: nwse-resize !important; }
    .responsive-size-handle-top-right { right: -4px !important; top: -4px !important; cursor: nesw-resize !important; }
    .responsive-size-handle-bottom-left { left: -4px !important; bottom: -4px !important; cursor: nesw-resize !important; }
    .responsive-size-handle-bottom-right { right: -4px !important; bottom: -4px !important; cursor: nwse-resize !important; }
    .responsive-position-item .header-title-wrap, .responsive-position-item .header-menu-toggle { touch-action: none !important; }
  `;
  document.head.appendChild(style);
}

function enhance() {
  if (!canvas || !definition) return;
  const page = currentPage();
  const nodes = [...canvas.querySelectorAll('.canvas-item')];

  nodes.forEach((node, index) => {
    const component = page?.components?.[index];
    if (!component) return;
    const position = effectivePosition(node, component);
    applyPosition(node, position);
    ensureHandles(node);
    applyInnerLayout(node, component);

    if (node.dataset.responsiveBound === '1') return;
    node.dataset.responsiveBound = '1';
    node.addEventListener('pointerdown', (event) => pointerDown(node, event), { passive: false });
  });
}

function queuePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistToServer, 300);
}

async function persistToServer() {
  if (!projectId || !definition || !loaded) return;
  try {
    const auth = await supabase.auth.getUser();
    const user = auth.data?.user;
    if (!user) return;

    const latestResult = await supabase
      .from('projects')
      .select('id,user_id,app_definition,pages')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (latestResult.error || !latestResult.data) return;
    const latest = normalizeDefinition(latestResult.data);
    const pageId = currentPageId();
    const localPage = definition.pages?.[pageId];
    const latestPage = latest.pages?.[pageId];
    if (!localPage || !latestPage) return;

    localPage.components.forEach((localComponent, index) => {
      const bucket = localComponent.props?.deviceStyles?.[activeDevice];
      if (!bucket) return;
      const target = latestPage.components?.[index];
      if (!target) return;
      target.props = {
        ...(target.props || {}),
        deviceStyles: {
          ...(target.props?.deviceStyles || {}),
          [activeDevice]: clone(bucket)
        }
      };
    });

    const pages = latest.pages;
    const appDefinition = {
      ...(latestResult.data.app_definition || {}),
      pages
    };

    const result = await supabase
      .from('projects')
      .update({ pages, app_definition: appDefinition, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', user.id);

    if (!result.error) setStatus(`${activeDevice[0].toUpperCase() + activeDevice.slice(1)} layout saved`);
  } catch (error) {
    console.warn('Responsive layout save failed', error);
  }
}

function setDevice(device) {
  if (!['desktop', 'tablet', 'mobile'].includes(device)) return;
  activeDevice = device;
  window.__indoBuilderDevice = device;
  document.documentElement.dataset.indoDevice = device;
  deviceButtons.forEach((button) => button.classList.toggle('active', button.dataset.device === device));
  canvas?.classList.toggle('canvas-mobile', device === 'mobile');
  canvas?.classList.toggle('canvas-tablet', device === 'tablet');
  canvas?.classList.toggle('canvas-desktop', device === 'desktop');
  requestAnimationFrame(() => enhance());
  setStatus(`${device[0].toUpperCase() + device.slice(1)} preview`);
}

async function load() {
  if (!projectId) return;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return;
  const result = await supabase
    .from('projects')
    .select('id,user_id,name,description,app_definition,pages')
    .eq('id', projectId)
    .eq('user_id', auth.data.user.id)
    .maybeSingle();
  if (result.error || !result.data) return;
  definition = normalizeDefinition(result.data);
  loaded = true;
  setDevice(activeDevice);
  enhance();
}

deviceButtons.forEach((button) => button.addEventListener('click', () => setDevice(button.dataset.device), { capture: true }));
canvas?.addEventListener('pointermove', pointerMove, { passive: false });
window.addEventListener('pointerup', pointerUp, { passive: true });
window.addEventListener('pointercancel', pointerUp, { passive: true });
window.addEventListener('resize', () => requestAnimationFrame(enhance));
saveButton?.addEventListener('click', () => queuePersist());

const observer = new MutationObserver(() => requestAnimationFrame(enhance));
if (canvas) observer.observe(canvas, { childList: true, subtree: true });

injectResponsiveCanvasStyle();
window.__indoResponsive = { getDevice: () => activeDevice, setDevice };
setTimeout(load, 350);
