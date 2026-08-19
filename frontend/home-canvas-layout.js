import { supabase } from './auth/supabase-config.js';

const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const projectStatus = document.getElementById('projectStatus');
const projectId = new URLSearchParams(window.location.search).get('projectId');

const STORAGE_KEY = projectId ? `indo:home-layout:${projectId}` : '';
const MIN_W = 80;
const MIN_H = 36;
const EDGE = 12;
let layouts = readLayouts();
let active = null;
let mergeTimer = 0;
let observer = null;

function readLayouts() {
  if (!STORAGE_KEY) return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeLayouts() {
  if (!STORAGE_KEY) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts)); } catch {}
}

function isHome() {
  const id = String(pageStatus?.textContent || '').trim().toLowerCase();
  return id === 'home' || id === '';
}

function indexKey(item) {
  return item.dataset.index || '0';
}

function currentLayout(item) {
  const key = indexKey(item);
  return layouts[key] || null;
}

function canvasRect() {
  return canvas.getBoundingClientRect();
}

function initialLayout(item) {
  const key = indexKey(item);
  if (layouts[key]) return layouts[key];
  const cr = canvasRect();
  const r = item.getBoundingClientRect();
  const x = Math.max(12, r.left - cr.left + canvas.scrollLeft);
  const y = Math.max(12, r.top - cr.top + canvas.scrollTop);
  const layout = {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.max(MIN_W, Math.round(r.width)),
    h: Math.max(MIN_H, Math.round(r.height))
  };
  layouts[key] = layout;
  writeLayouts();
  return layout;
}

function applyLayout(item, layout) {
  if (!layout) return;
  item.classList.add('home-layout-item');
  item.style.left = `${layout.x}px`;
  item.style.top = `${layout.y}px`;
  item.style.width = `${layout.w}px`;
  item.style.height = `${layout.h}px`;
}

function updateSizeLabel(item, layout) {
  const label = item.querySelector('.home-layout-size-label');
  if (label) label.textContent = `${Math.round(layout.w)} × ${Math.round(layout.h)}`;
}

function addHandles(item) {
  if (item.querySelector('.home-layout-handle')) return;
  for (const dir of ['nw', 'ne', 'sw', 'se']) {
    const handle = document.createElement('span');
    handle.className = `home-layout-handle ${dir}`;
    handle.dataset.resize = dir;
    item.appendChild(handle);
  }
  const label = document.createElement('span');
  label.className = 'home-layout-size-label';
  item.appendChild(label);
}

function setSelected(item) {
  canvas.querySelectorAll('.home-layout-selected').forEach((node) => node.classList.remove('home-layout-selected'));
  if (!item) return;
  item.classList.add('home-layout-selected');
  addHandles(item);
  const layout = currentLayout(item) || initialLayout(item);
  updateSizeLabel(item, layout);
}

function getPoint(event) {
  const cr = canvasRect();
  return {
    x: event.clientX - cr.left + canvas.scrollLeft,
    y: event.clientY - cr.top + canvas.scrollTop
  };
}

function clampLayout(layout) {
  const maxX = Math.max(0, canvas.scrollWidth - layout.w - EDGE);
  const maxY = Math.max(0, canvas.scrollHeight - layout.h - EDGE);
  layout.w = Math.max(MIN_W, Math.min(layout.w, Math.max(MIN_W, canvas.clientWidth - EDGE * 2)));
  layout.h = Math.max(MIN_H, layout.h);
  layout.x = Math.max(EDGE, Math.min(layout.x, maxX || layout.x));
  layout.y = Math.max(EDGE, Math.min(layout.y, maxY || layout.y));
  return layout;
}

function startMove(item, event) {
  if (!isHome()) return;
  const layout = { ...(currentLayout(item) || initialLayout(item)) };
  const point = getPoint(event);
  active = {
    kind: 'move',
    item,
    key: indexKey(item),
    startX: point.x,
    startY: point.y,
    startLayout: layout,
    moved: false
  };
  setSelected(item);
  item.classList.add('home-layout-dragging');
  event.stopPropagation();
  event.preventDefault();
}

function startResize(item, dir, event) {
  if (!isHome()) return;
  const layout = { ...(currentLayout(item) || initialLayout(item)) };
  const point = getPoint(event);
  active = {
    kind: 'resize',
    dir,
    item,
    key: indexKey(item),
    startX: point.x,
    startY: point.y,
    startLayout: layout,
    moved: false
  };
  setSelected(item);
  item.classList.add('home-layout-resizing');
  event.stopPropagation();
  event.preventDefault();
}

function onPointerMove(event) {
  if (!active) return;
  const point = getPoint(event);
  const dx = point.x - active.startX;
  const dy = point.y - active.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) active.moved = true;

  const base = active.startLayout;
  const next = { ...base };
  if (active.kind === 'move') {
    next.x = base.x + dx;
    next.y = base.y + dy;
  } else {
    const dir = active.dir;
    if (dir.includes('e')) next.w = base.w + dx;
    if (dir.includes('s')) next.h = base.h + dy;
    if (dir.includes('w')) { next.x = base.x + dx; next.w = base.w - dx; }
    if (dir.includes('n')) { next.y = base.y + dy; next.h = base.h - dy; }
    if (next.w < MIN_W) { if (dir.includes('w')) next.x = base.x + base.w - MIN_W; next.w = MIN_W; }
    if (next.h < MIN_H) { if (dir.includes('n')) next.y = base.y + base.h - MIN_H; next.h = MIN_H; }
  }
  clampLayout(next);
  layouts[active.key] = next;
  writeLayouts();
  applyLayout(active.item, next);
  updateSizeLabel(active.item, next);
  if (active.moved) event.preventDefault();
}

function stopPointer() {
  if (!active) return;
  active.item.classList.remove('home-layout-dragging', 'home-layout-resizing');
  if (active.moved) scheduleMerge();
  const item = active.item;
  active = null;
  setSelected(item);
}

function bindItem(item) {
  if (item.dataset.homeLayoutBound === '1' || !isHome()) return;
  item.dataset.homeLayoutBound = '1';
  item.draggable = false;
  item.classList.add('home-layout-item');
  const layout = currentLayout(item) || initialLayout(item);
  applyLayout(item, layout);
  addHandles(item);
  updateSizeLabel(item, layout);

  item.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest?.('[data-resize]');
    if (handle) startResize(item, handle.dataset.resize, event);
    else startMove(item, event);
  }, { passive: false });

  item.addEventListener('click', () => setSelected(item));
}

function unbindHome() {
  canvas.classList.remove('home-freeform');
  canvas.querySelectorAll('.canvas-item').forEach((item) => {
    item.classList.remove('home-layout-item', 'home-layout-selected');
    item.dataset.homeLayoutBound = '';
    item.style.position = '';
    item.style.left = '';
    item.style.top = '';
    item.style.width = '';
    item.style.height = '';
  });
}

function attachAll() {
  if (!canvas) return;
  if (!isHome()) { unbindHome(); return; }
  canvas.classList.add('home-freeform');
  canvas.querySelectorAll('.canvas-item').forEach(bindItem);
}

async function mergeLayoutIntoProject() {
  if (!projectId || !Object.keys(layouts).length) return;
  try {
    const auth = await supabase.auth.getUser();
    const user = auth.data?.user;
    if (!user) return;
    const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages').eq('id', projectId).eq('user_id', user.id).maybeSingle();
    if (result.error || !result.data) return;
    const project = result.data;
    const pages = JSON.parse(JSON.stringify(project.pages || {}));
    const home = pages.home || Object.values(pages).find((p) => String(p.name || '').toLowerCase() === 'home');
    if (!home) return;
    home.components = (home.components || []).map((component, index) => {
      const layout = layouts[String(index)];
      if (!layout) return component;
      return { ...component, props: { ...(component.props || {}), _layout: { ...layout } } };
    });
    const appDefinition = { ...(project.app_definition || {}), pages };
    await supabase.from('projects').update({ pages, app_definition: appDefinition, updated_at: new Date().toISOString() }).eq('id', projectId).eq('user_id', user.id);
  } catch (error) {
    console.warn('Home layout merge failed', error);
  }
}

function scheduleMerge() {
  window.clearTimeout(mergeTimer);
  mergeTimer = window.setTimeout(mergeLayoutIntoProject, 900);
}

function watchBuilderSave() {
  if (!projectStatus) return;
  const observer = new MutationObserver(() => {
    const text = String(projectStatus.textContent || '').toLowerCase();
    if (text.includes('saved successfully') || text.includes('saved app definition')) scheduleMerge();
  });
  observer.observe(projectStatus, { childList: true, characterData: true, subtree: true });
}

canvas?.addEventListener('pointermove', onPointerMove, { passive: false });
window.addEventListener('pointerup', stopPointer, { passive: true });
window.addEventListener('pointercancel', stopPointer, { passive: true });
pageStatus?.addEventListener('DOMCharacterDataModified', attachAll);

observer = new MutationObserver(() => window.requestAnimationFrame(attachAll));
observer.observe(canvas, { childList: true, subtree: true });

new MutationObserver(() => window.requestAnimationFrame(attachAll)).observe(pageStatus || document.body, { childList: true, characterData: true, subtree: true });

watchBuilderSave();
window.addEventListener('resize', attachAll);
window.addEventListener('load', attachAll);
setTimeout(attachAll, 400);
