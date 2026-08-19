import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const projectId = new URLSearchParams(window.location.search).get('projectId');
const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const storeKey = projectId ? `indo:header-inner-layout:${projectId}` : '';

let layouts = {};
let definition = null;
let active = null;
let persistTimer = 0;

function readStore() {
  try { layouts = JSON.parse(localStorage.getItem(storeKey) || '{}') || {}; } catch { layouts = {}; }
}
function writeStore() {
  try { localStorage.setItem(storeKey, JSON.stringify(layouts)); } catch {}
}
function isHome() {
  const name = String(pageStatus?.textContent || '').trim().toLowerCase();
  return name === '' || name === 'home';
}
function headerNode() {
  return canvas?.querySelector('.canvas-header-component .app-header') || null;
}
function headerComponent() {
  const root = headerNode();
  const item = root?.closest('.canvas-item');
  const index = Number(item?.dataset.index);
  if (!Number.isInteger(index)) return null;
  const pages = definition?.pages || {};
  const home = Object.values(pages).find((page) => String(page?.name || '').trim().toLowerCase() === 'home');
  return home?.components?.[index] || null;
}
function targetFor(kind, header) {
  return kind === 'title'
    ? header?.querySelector('.header-title-wrap')
    : header?.querySelector('.header-menu-toggle');
}
function currentPosition(el, header) {
  const hr = header.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  return {
    x: Math.round(er.left - hr.left),
    y: Math.round(er.top - hr.top),
  };
}
function readLayout(kind, component, el, header) {
  const saved = component?.props?.[`${kind}Position`];
  if (saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))) {
    return { x: Number(saved.x), y: Number(saved.y) };
  }
  const cached = layouts[kind];
  if (cached && Number.isFinite(Number(cached.x)) && Number.isFinite(Number(cached.y))) {
    return { x: Number(cached.x), y: Number(cached.y) };
  }
  return currentPosition(el, header);
}
function apply(el, header, pos) {
  if (!el || !header) return;
  header.style.position = 'relative';
  el.style.position = 'absolute';
  el.style.left = `${Math.round(pos.x)}px`;
  el.style.top = `${Math.round(pos.y)}px`;
  el.style.transform = 'none';
  el.style.zIndex = '3';
  el.style.touchAction = 'none';
  el.dataset.innerMoveReady = '1';
}
function start(kind, el, header, event) {
  if (!isHome() || event.button !== 0) return;
  if (event.target.closest?.('.header-menu-panel')) return;
  const component = headerComponent();
  const pos = readLayout(kind, component, el, header);
  const rect = el.getBoundingClientRect();
  active = {
    kind,
    el,
    header,
    base: pos,
    startX: event.clientX,
    startY: event.clientY,
    grabX: event.clientX - rect.left,
    grabY: event.clientY - rect.top,
    moved: false,
    pointerId: event.pointerId,
  };
  try { el.setPointerCapture?.(event.pointerId); } catch {}
  el.classList.add('inner-moving');
}
function move(event) {
  if (!active) return;
  const dx = event.clientX - active.startX;
  const dy = event.clientY - active.startY;
  if (!active.moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
  active.moved = true;

  const hr = active.header.getBoundingClientRect();
  const next = {
    x: Math.round(event.clientX - hr.left - active.grabX),
    y: Math.round(event.clientY - hr.top - active.grabY),
  };

  // Keep the item's top-left inside the header bounds without changing the drop location unexpectedly.
  const maxX = Math.max(0, Math.round(hr.width - active.el.getBoundingClientRect().width));
  const maxY = Math.max(0, Math.round(hr.height - active.el.getBoundingClientRect().height));
  next.x = Math.max(0, Math.min(next.x, maxX));
  next.y = Math.max(0, Math.min(next.y, maxY));

  apply(active.el, active.header, next);
  layouts[active.kind] = next;
  writeStore();
  event.preventDefault();
  event.stopPropagation();
}
async function persist() {
  if (!projectId || !definition || !isHome()) return;
  try {
    const auth = await supabase.auth.getUser();
    const user = auth.data?.user;
    if (!user) return;
    const result = await supabase.from('projects')
      .select('id,user_id,app_definition,pages')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (result.error || !result.data) return;

    const latest = normalizeDefinition(result.data);
    const pageId = Object.keys(latest.pages).find((id) => String(latest.pages[id].name || '').trim().toLowerCase() === 'home') || Object.keys(latest.pages)[0];
    const page = latest.pages[pageId];
    const header = page?.components?.find((c) => c.type === 'Header');
    if (!header) return;

    header.props = { ...(header.props || {}) };
    if (layouts.title) header.props.titlePosition = { ...layouts.title };
    if (layouts.menu) header.props.menuPosition = { ...layouts.menu };

    const pages = latest.pages;
    const appDefinition = { ...(result.data.app_definition || {}), pages };
    await supabase.from('projects').update({
      pages,
      app_definition: appDefinition,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId).eq('user_id', user.id);

    definition = latest;
  } catch (error) {
    console.warn('Header inner position save failed', error);
  }
}
function finish() {
  if (!active) return;
  const item = active;
  active = null;
  item.el.classList.remove('inner-moving');
  try { item.el.releasePointerCapture?.(item.pointerId); } catch {}
  if (item.moved) {
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(persist, 200);
  }
}
function enhance() {
  if (!canvas || !isHome()) return;
  const header = headerNode();
  if (!header) return;
  const component = headerComponent();
  header.style.position = 'relative';

  for (const kind of ['title', 'menu']) {
    const el = targetFor(kind, header);
    if (!el) continue;
    const pos = readLayout(kind, component, el, header);
    apply(el, header, pos);
    if (el.dataset.innerMoveBound === '1') continue;
    el.dataset.innerMoveBound = '1';
    el.addEventListener('pointerdown', (event) => start(kind, el, header, event), { passive: false });
    el.addEventListener('dragstart', (event) => event.preventDefault());
  }
}
async function load() {
  readStore();
  if (!projectId) return;
  try {
    const auth = await supabase.auth.getUser();
    if (!auth.data?.user) return;
    const result = await supabase.from('projects')
      .select('id,user_id,app_definition,pages')
      .eq('id', projectId)
      .eq('user_id', auth.data.user.id)
      .maybeSingle();
    if (result.error || !result.data) return;
    definition = normalizeDefinition(result.data);
    enhance();
  } catch (error) {
    console.warn('Header inner move load failed', error);
  }
}

window.addEventListener('pointermove', move, { passive: false });
window.addEventListener('pointerup', finish, { passive: true });
window.addEventListener('pointercancel', finish, { passive: true });
const observer = new MutationObserver(() => window.requestAnimationFrame(enhance));
observer.observe(canvas || document.body, { childList: true, subtree: true });
new MutationObserver(() => window.requestAnimationFrame(enhance)).observe(pageStatus || document.body, { childList: true, characterData: true, subtree: true });
window.addEventListener('resize', enhance);
setTimeout(load, 300);
setTimeout(enhance, 800);
