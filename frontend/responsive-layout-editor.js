import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const saveButton = document.getElementById('saveButton');
const deviceButtons = [...document.querySelectorAll('.device-button')];

let definition = null;
let activeDevice = document.querySelector('.device-button.active')?.dataset.device || 'desktop';
let activePointer = null;
let saveTimer = 0;
let loaded = false;
let lastDesktopCanvasWidth = 900;

const DEVICE_DEFAULT_WIDTHS = { desktop: 900, tablet: 700, mobile: 390 };

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function setStatus(text) { const el = document.getElementById('projectStatus'); if (el) el.textContent = text; }
function currentPageId() { const wanted = String(pageStatus?.textContent || '').trim().toLowerCase(); const entry = Object.entries(definition?.pages || {}).find(([id, page]) => id.toLowerCase() === wanted || String(page.name || '').toLowerCase() === wanted); return entry?.[0] || Object.keys(definition?.pages || {})[0] || null; }
function currentPage() { const id = currentPageId(); return id ? definition?.pages?.[id] : null; }
function componentForNode(node) { const index = Number(node.dataset.index); const page = currentPage(); return Number.isInteger(index) ? page?.components?.[index] : null; }
function deviceBucket(component, create = false) { if (!component) return null; const props = component.props || (component.props = {}); if (!props.deviceStyles && create) props.deviceStyles = {}; if (!props.deviceStyles) return null; if (!props.deviceStyles[activeDevice] && create) props.deviceStyles[activeDevice] = {}; return props.deviceStyles[activeDevice] || null; }

function readDomPosition(node) {
  const canvasRect = canvas.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  const rawX = rect.left - canvasRect.left + canvas.scrollLeft;
  const rawY = rect.top - canvasRect.top + canvas.scrollTop;
  const width = Math.max(80, Math.round(rect.width || 160));
  const height = Math.max(36, Math.round(rect.height || 48));
  const targetWidth = Math.max(280, Math.min(DEVICE_DEFAULT_WIDTHS[activeDevice] || 900, canvas.clientWidth || 900));
  const x = Math.max(12, Math.min(Math.round(rawX), Math.max(12, targetWidth - width - 12)));
  return { x, y: Math.max(12, Math.round(rawY)), width, height };
}

function desktopBasePosition(node, component) {
  const desktopBucket = component?.props?.deviceStyles?.desktop?.position;
  if (desktopBucket && Number.isFinite(Number(desktopBucket.x)) && Number.isFinite(Number(desktopBucket.y))) {
    return {
      x: Number(desktopBucket.x),
      y: Number(desktopBucket.y),
      width: Number(desktopBucket.width) || Math.round(node.getBoundingClientRect().width || 160),
      height: Number(desktopBucket.height) || Math.round(node.getBoundingClientRect().height || 48)
    };
  }
  const legacy = component?.props?.position;
  if (legacy) {
    return {
      x: Number(legacy.x) || 0,
      y: Number(legacy.y) || 0,
      width: Number(legacy.width) || Math.round(node.getBoundingClientRect().width || 160),
      height: Number(legacy.height) || Math.round(node.getBoundingClientRect().height || 48)
    };
  }
  return readDomPosition(node);
}

function inheritedDevicePosition(node, component) {
  const base = desktopBasePosition(node, component);
  const targetWidth = Math.max(280, Math.min(DEVICE_DEFAULT_WIDTHS[activeDevice] || 900, canvas.clientWidth || DEVICE_DEFAULT_WIDTHS[activeDevice] || 900));
  const sourceWidth = Math.max(280, lastDesktopCanvasWidth || DEVICE_DEFAULT_WIDTHS.desktop);
  const scale = Math.min(1, targetWidth / sourceWidth);
  const isFullWidth = base.width >= sourceWidth * 0.72;
  const width = isFullWidth ? Math.max(80, targetWidth - 16) : Math.max(80, Math.min(targetWidth - 16, Math.round(base.width * scale)));
  const x = isFullWidth ? 8 : Math.max(8, Math.min(Math.round(base.x * scale), Math.max(8, targetWidth - width - 8)));
  return {
    x,
    y: Math.max(8, Math.round(base.y * Math.max(0.92, scale))),
    width,
    height: Math.max(36, Math.round(base.height))
  };
}

function readPosition(node, component) {
  const responsive = component?.props?.deviceStyles?.[activeDevice]?.position;
  if (responsive && Number.isFinite(Number(responsive.x)) && Number.isFinite(Number(responsive.y))) {
    return {
      x: Number(responsive.x),
      y: Number(responsive.y),
      width: Number(responsive.width) || Math.round(node.getBoundingClientRect().width || 160),
      height: Number(responsive.height) || Math.round(node.getBoundingClientRect().height || 48)
    };
  }

  // Desktop is the base layout. Tablet/mobile inherit from Desktop until the user explicitly edits them.
  if (activeDevice !== 'desktop') return inheritedDevicePosition(node, component);

  const base = desktopBasePosition(node, component);
  lastDesktopCanvasWidth = Math.max(280, canvas.clientWidth || lastDesktopCanvasWidth || DEVICE_DEFAULT_WIDTHS.desktop);
  return base;
}

function applyPosition(node, position) {
  const p = position || { x: 12, y: 12, width: 160, height: 48 };
  node.classList.add('responsive-position-item'); node.draggable = false; node.style.position = 'absolute'; node.style.left = '0px'; node.style.top = '0px'; node.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px)`; node.style.width = `${Math.max(80, Math.round(p.width))}px`; node.style.height = `${Math.max(36, Math.round(p.height))}px`; node.style.boxSizing = 'border-box'; node.style.touchAction = 'none'; node.style.userSelect = 'none'; node.style.cursor = 'grab'; node.__responsiveLayout = clone(p); node.__responsiveDevice = activeDevice;
  canvas.style.minHeight = `${Math.max(activeDevice === 'mobile' ? 680 : 720, p.y + p.height + 120)}px`;
}
function ensureHandles(node) { if (node.querySelector('.responsive-size-handle')) return; ['top-left','top-right','bottom-left','bottom-right'].forEach(position => { const handle = document.createElement('div'); handle.className = `responsive-size-handle responsive-size-handle-${position}`; handle.dataset.responsiveHandle = position; node.appendChild(handle); }); }
function getPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left + canvas.scrollLeft, y: event.clientY - rect.top + canvas.scrollTop }; }
function startDrag(node, event) {
  if (event.button !== 0 || !definition) return;
  const handle = event.target.closest?.('[data-responsive-handle]'); if (handle) return startResize(node, event, handle.dataset.responsiveHandle);
  const isHeader = node.classList.contains('canvas-header-component'); const movableInner = event.target.closest?.('.header-title-wrap,.header-title-edit,.header-menu-toggle');
  if (isHeader && movableInner) return startInnerMove(node, movableInner, event);
  const base = readPosition(node, componentForNode(node)); const point = getPoint(event); activePointer = { kind: 'outer', node, startX: point.x, startY: point.y, base, pointerId: event.pointerId, moved: false }; node.setPointerCapture?.(event.pointerId); node.style.cursor = 'grabbing'; event.preventDefault(); event.stopPropagation();
}
function startInnerMove(node, element, event) {
  const component = componentForNode(node); if (!component) return;
  const kind = element.classList.contains('header-menu-toggle') ? 'menuPosition' : 'titlePosition'; const bucket = deviceBucket(component, true); const fallback = bucket?.[kind] || component.props?.[kind] || { x: 0, y: 0 };
  activePointer = { kind: 'inner', innerKind: kind, node, element, startX: event.clientX, startY: event.clientY, base: { x: Number(fallback.x) || 0, y: Number(fallback.y) || 0 }, pointerId: event.pointerId, moved: false }; element.setPointerCapture?.(event.pointerId); element.style.cursor = 'grabbing'; event.preventDefault(); event.stopPropagation();
}
function startResize(node, event, position) { if (event.button !== 0 || !definition) return; const base = readPosition(node, componentForNode(node)); const point = getPoint(event); activePointer = { kind: 'resize', node, position, startX: point.x, startY: point.y, base, pointerId: event.pointerId, moved: false }; node.setPointerCapture?.(event.pointerId); node.style.cursor = 'grabbing'; event.preventDefault(); event.stopPropagation(); }
function saveResponsivePosition(node, position) { const component = componentForNode(node); if (!component) return; const bucket = deviceBucket(component, true); bucket.position = { x: Math.round(position.x), y: Math.round(position.y), width: Math.round(position.width), height: Math.round(position.height) }; }
function saveInnerPosition(node, kind, position) { const component = componentForNode(node); if (!component) return; const bucket = deviceBucket(component, true); bucket[kind] = { x: Math.round(position.x), y: Math.round(position.y) }; }
function pointerMove(event) {
  if (!activePointer) return;
  if (activePointer.kind === 'inner') { const dx = event.clientX - activePointer.startX, dy = event.clientY - activePointer.startY; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) activePointer.moved = true; const pos = { x: activePointer.base.x + dx, y: activePointer.base.y + dy }; activePointer.element.style.transform = `translate(${Math.round(pos.x)}px,${Math.round(pos.y)}px)`; saveInnerPosition(activePointer.node, activePointer.innerKind, pos); event.preventDefault(); return; }
  const point = getPoint(event), dx = point.x - activePointer.startX, dy = point.y - activePointer.startY; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) activePointer.moved = true; const base = activePointer.base, next = { ...base };
  if (activePointer.kind === 'outer') { next.x = base.x + dx; next.y = base.y + dy; } else { const pos = activePointer.position; if (pos.includes('right')) next.width = base.width + dx; if (pos.includes('left')) { next.width = base.width - dx; next.x = base.x + dx; } if (pos.includes('bottom')) next.height = base.height + dy; if (pos.includes('top')) { next.height = base.height - dy; next.y = base.y + dy; } next.width = Math.max(80, next.width); next.height = Math.max(36, next.height); }
  next.x = Math.max(-12, next.x); next.y = Math.max(-12, next.y); applyPosition(activePointer.node, next); saveResponsivePosition(activePointer.node, next); event.preventDefault();
}
function pointerUp() { if (!activePointer) return; const { node, element, pointerId, moved } = activePointer; try { node?.releasePointerCapture?.(pointerId); } catch {} try { element?.releasePointerCapture?.(pointerId); } catch {} if (element) element.style.cursor = 'grab'; if (node) node.style.cursor = 'grab'; activePointer = null; if (moved) queuePersist(); }
function ensureHeaderInnerPosition(nodes) {
  nodes.filter(n => n.classList.contains('canvas-header-component')).forEach(node => {
    const component = componentForNode(node), bucket = deviceBucket(component); if (!bucket) return;
    const header = node.querySelector('.app-header'); if (!header) return;
    const title = header.querySelector('.header-title-wrap'), menu = header.querySelector('.header-menu-toggle');
    if (title) { const p = bucket.titlePosition; if (p) title.style.transform = `translate(${Number(p.x) || 0}px,${Number(p.y) || 0}px)`; title.style.touchAction = 'none'; }
    if (menu) { const p = bucket.menuPosition; if (p) menu.style.transform = `translate(${Number(p.x) || 0}px,${Number(p.y) || 0}px)`; menu.style.touchAction = 'none'; }
  });
}
function enhance() {
  if (!canvas || !definition) return; const page = currentPage();
  if (activeDevice === 'desktop') lastDesktopCanvasWidth = Math.max(280, canvas.clientWidth || lastDesktopCanvasWidth || DEVICE_DEFAULT_WIDTHS.desktop);
  const nodes = [...canvas.querySelectorAll('.canvas-item')];
  nodes.forEach((node, index) => { const component = page?.components?.[index]; if (!component) return; applyPosition(node, readPosition(node, component)); ensureHandles(node); if (node.dataset.responsiveBound === '1') return; node.dataset.responsiveBound = '1'; node.addEventListener('pointerdown', event => startDrag(node, event), { passive: false }); });
  ensureHeaderInnerPosition(nodes);
}
function queuePersist() { clearTimeout(saveTimer); saveTimer = setTimeout(persistToServer, 250); }
async function persistToServer() {
  if (!projectId || !definition || !loaded) return; try { const auth = await supabase.auth.getUser(); const user = auth.data?.user; if (!user) return; const latestResult = await supabase.from('projects').select('id,user_id,app_definition,pages').eq('id', projectId).eq('user_id', user.id).maybeSingle(); if (latestResult.error || !latestResult.data) return; const latest = normalizeDefinition(latestResult.data); const pageId = currentPageId(); const localPage = definition.pages?.[pageId]; const latestPage = latest.pages?.[pageId]; if (!localPage || !latestPage) return; localPage.components.forEach((localComponent, index) => { const layout = localComponent.props?.deviceStyles?.[activeDevice]; if (!layout) return; const target = latestPage.components?.[index]; if (!target) return; target.props = { ...(target.props || {}), deviceStyles: { ...(target.props?.deviceStyles || {}), [activeDevice]: clone(layout) } }; }); const pages = latest.pages; const appDefinition = { ...(latestResult.data.app_definition || {}), pages }; await supabase.from('projects').update({ pages, app_definition: appDefinition, updated_at: new Date().toISOString() }).eq('id', projectId).eq('user_id', user.id); setStatus(`${activeDevice[0].toUpperCase() + activeDevice.slice(1)} layout saved`); } catch (error) { console.warn('Responsive layout save failed', error); }
}
async function load() { if (!projectId) return; const auth = await supabase.auth.getUser(); if (auth.error || !auth.data.user) return; const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages').eq('id', projectId).eq('user_id', auth.data.user.id).maybeSingle(); if (result.error || !result.data) return; definition = normalizeDefinition(result.data); loaded = true; setTimeout(() => enhance(), 0); }
function applyDeviceClass() { canvas?.classList.toggle('canvas-mobile', activeDevice === 'mobile'); canvas?.classList.toggle('canvas-desktop', activeDevice !== 'mobile'); canvas?.classList.toggle('canvas-tablet', activeDevice === 'tablet'); }
function setDevice(device) { if (!['desktop', 'tablet', 'mobile'].includes(device)) return; if (activeDevice === 'desktop' && canvas) lastDesktopCanvasWidth = Math.max(280, canvas.clientWidth || lastDesktopCanvasWidth); activeDevice = device; window.__indoBuilderDevice = device; document.documentElement.dataset.indoDevice = device; deviceButtons.forEach(b => b.classList.toggle('active', b.dataset.device === device)); applyDeviceClass(); requestAnimationFrame(enhance); setStatus(`Editing ${device}`); }
deviceButtons.forEach(button => button.addEventListener('click', () => setDevice(button.dataset.device), { capture: true }));
canvas?.addEventListener('pointermove', pointerMove, { passive: false }); window.addEventListener('pointerup', pointerUp, { passive: true }); window.addEventListener('pointercancel', pointerUp, { passive: true });
const observer = new MutationObserver(() => requestAnimationFrame(enhance)); observer.observe(canvas || document.body, { childList: true, subtree: true });
saveButton?.addEventListener('click', () => queuePersist()); window.addEventListener('resize', () => requestAnimationFrame(enhance)); window.addEventListener('load', () => requestAnimationFrame(enhance)); setTimeout(load, 500);
window.__indoResponsive = { getDevice: () => activeDevice, setDevice };
