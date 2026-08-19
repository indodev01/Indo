import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition, syncLegacyFields } from './app-definition.js';

const projectId = new URLSearchParams(window.location.search).get('projectId');
const canvas = document.getElementById('canvas');
let project = null;
let definition = null;
let saveTimer = 0;

const DEFAULT_POSITION = { x: 0, y: 0, width: null, height: 64 };

function activePageId() {
  if (!definition?.pages) return null;
  const pageName = (document.getElementById('pageStatus')?.textContent || '').trim().toLowerCase();
  const match = Object.entries(definition.pages).find(([id, page]) => String(page.name || '').trim().toLowerCase() === pageName);
  return match?.[0] || Object.keys(definition.pages)[0] || null;
}

function currentPage() {
  const id = activePageId();
  return id ? definition.pages[id] : null;
}

function headerComponentForNode(node) {
  const id = node.dataset.headerComponent;
  const page = currentPage();
  if (!page) return null;
  return (page.components || []).find((component) => component.id === id && component.type === 'Header') || null;
}

function normalizePosition(component) {
  const source = component?.props?.position || {};
  return {
    x: Number.isFinite(Number(source.x)) ? Number(source.x) : DEFAULT_POSITION.x,
    y: Number.isFinite(Number(source.y)) ? Number(source.y) : DEFAULT_POSITION.y,
    width: Number.isFinite(Number(source.width)) && Number(source.width) > 0 ? Number(source.width) : null,
    height: Number.isFinite(Number(source.height)) && Number(source.height) > 0 ? Number(source.height) : DEFAULT_POSITION.height
  };
}

function applyPosition(node, component) {
  const appHeader = node.querySelector('.app-header');
  if (!appHeader || !component) return;
  const position = normalizePosition(component);
  node.classList.add('free-position-item');
  node.draggable = false;
  node.style.transform = `translate(${position.x}px, ${position.y}px)`;
  if (position.width) appHeader.style.width = `${position.width}px`;
  else appHeader.style.width = '100%';
  appHeader.style.minHeight = `${position.height}px`;
  appHeader.style.height = `${position.height}px`;
  appHeader.style.boxSizing = 'border-box';
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(savePositions, 250);
}

async function savePositions() {
  if (!projectId || !definition || !project) return;
  try {
    const synced = syncLegacyFields(definition);
    const { error } = await supabase
      .from('projects')
      .update({ pages: synced.pages, app_definition: synced.appDefinition, updated_at: new Date().toISOString() })
      .eq('id', projectId);
    if (error) throw error;
  } catch (error) {
    console.error('Position save failed', error);
    const status = document.getElementById('projectStatus');
    if (status) status.textContent = 'Position save failed';
  }
}

function updateComponentPosition(component, next) {
  component.props = { ...(component.props || {}), position: { ...normalizePosition(component), ...next } };
  scheduleSave();
}

function ensureHandle(node, position, className, cursor) {
  const appHeader = node.querySelector('.app-header');
  if (!appHeader) return null;
  let handle = appHeader.querySelector(`.${className}`);
  if (handle) return handle;
  handle = document.createElement('div');
  handle.className = className;
  handle.dataset.freePositionHandle = position;
  handle.style.cursor = cursor;
  appHeader.appendChild(handle);
  return handle;
}

function startMove(node, component, event) {
  if (event.button !== 0) return;
  if (event.target.closest('.header-title-edit, .header-menu-toggle, .header-menu-panel, .free-size-handle')) return;
  event.preventDefault();
  event.stopPropagation();
  const start = normalizePosition(component);
  const startX = event.clientX;
  const startY = event.clientY;
  const onMove = (moveEvent) => {
    const nextX = Math.max(-40, start.x + moveEvent.clientX - startX);
    const nextY = Math.max(-40, start.y + moveEvent.clientY - startY);
    const next = { x: Math.round(nextX), y: Math.round(nextY) };
    node.style.transform = `translate(${next.x}px, ${next.y}px)`;
    component.props = { ...(component.props || {}), position: { ...start, ...next } };
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    scheduleSave();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp, { once: true });
}

function startResize(node, component, event, handlePosition) {
  event.preventDefault();
  event.stopPropagation();
  const start = normalizePosition(component);
  const header = node.querySelector('.app-header');
  if (!header) return;
  const startWidth = start.width || Math.round(header.getBoundingClientRect().width);
  const startHeight = start.height || Math.round(header.getBoundingClientRect().height);
  const startX = event.clientX;
  const startY = event.clientY;
  const startPosX = start.x;
  const startPosY = start.y;

  const onMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    let width = startWidth;
    let height = startHeight;
    let x = startPosX;
    let y = startPosY;

    if (handlePosition.includes('right')) width = Math.max(160, startWidth + dx);
    if (handlePosition.includes('left')) { width = Math.max(160, startWidth - dx); x = startPosX + dx; }
    if (handlePosition.includes('bottom')) height = Math.max(48, startHeight + dy);
    if (handlePosition.includes('top')) { height = Math.max(48, startHeight - dy); y = startPosY + dy; }

    header.style.width = `${Math.round(width)}px`;
    header.style.height = `${Math.round(height)}px`;
    node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    component.props = { ...(component.props || {}), position: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) } };
  };

  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    scheduleSave();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp, { once: true });
}

function enhanceNode(node) {
  if (!node.classList.contains('canvas-header-component')) return;
  const component = headerComponentForNode(node);
  if (!component || node.dataset.freePositionEnhanced === '1') {
    if (component) applyPosition(node, component);
    return;
  }
  node.dataset.freePositionEnhanced = '1';
  applyPosition(node, component);

  const appHeader = node.querySelector('.app-header');
  appHeader.title = 'Drag header to move • Use corner handles to resize';
  appHeader.addEventListener('pointerdown', (event) => startMove(node, component, event));

  ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((pos) => {
    const cursor = pos === 'top-left' || pos === 'bottom-right' ? 'nwse-resize' : 'nesw-resize';
    const handle = ensureHandle(node, pos, `free-size-handle free-size-handle-${pos}`, cursor);
    handle.addEventListener('pointerdown', (event) => startResize(node, component, event, pos));
  });
}

async function loadDefinition() {
  if (!projectId) return;
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) return;
  const result = await supabase
    .from('projects')
    .select('id,user_id,name,description,app_definition,pages,updated_at')
    .eq('id', projectId)
    .eq('user_id', auth.data.user.id)
    .maybeSingle();
  if (result.error || !result.data) return;
  project = result.data;
  definition = normalizeDefinition(project);
}

function applyAll() {
  if (!canvas) return;
  canvas.querySelectorAll('.canvas-header-component').forEach(enhanceNode);
}

async function init() {
  await loadDefinition();
  applyAll();
  if (!canvas) return;
  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(applyAll);
  });
  observer.observe(canvas, { childList: true, subtree: true });
}

init().catch((error) => console.error('Free-position header init failed', error));
