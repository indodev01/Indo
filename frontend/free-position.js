import { supabase } from './auth/supabase-config.js';
import { normalizeDefinition } from './app-definition.js';

const projectId = new URLSearchParams(window.location.search).get('projectId');
const canvas = document.getElementById('canvas');
const pageStatus = document.getElementById('pageStatus');
const projectStatus = document.getElementById('projectStatus');
const saveButton = document.getElementById('saveButton');
const STORAGE_KEY = projectId ? `indo:home-layout:${projectId}` : '';

let project = null;
let definition = null;
let layouts = readLayouts();
let activePointer = null;
let saveMergeTimer = 0;

function readLayouts() { if (!STORAGE_KEY) return {}; try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { return {}; } }
function writeLayouts() { if (!STORAGE_KEY) return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts)); } catch {} }
function isHomePage() { const name = String(pageStatus?.textContent || '').trim().toLowerCase(); return name === 'home' || name === ''; }
function currentPageId() { if (!definition?.pages) return null; const wanted = String(pageStatus?.textContent || '').trim().toLowerCase(); const hit = Object.entries(definition.pages).find(([id, page]) => String(page.name || '').trim().toLowerCase() === wanted); return hit?.[0] || Object.keys(definition.pages)[0] || null; }
function currentPage() { const id = currentPageId(); return id ? definition?.pages?.[id] : null; }
function componentForNode(node) { const page = currentPage(); const index = Number(node.dataset.index); if (!Number.isInteger(index)) return null; return page?.components?.[index] || { id: `unsaved-${index}`, type: 'Unknown', props: {} }; }
function layoutKey(node) { return node.dataset.index || '0'; }
function normalizeLayout(node, component) { const saved = component?.props?.position; if (saved) return { x: Number(saved.x) || 0, y: Number(saved.y) || 0, width: Number(saved.width) || Math.max(160, Math.round(node.getBoundingClientRect().width || 160)), height: Number(saved.height) || Math.max(48, Math.round(node.getBoundingClientRect().height || 48)) }; const cached = layouts[layoutKey(node)]; if (cached) return { ...cached }; const cr = canvas.getBoundingClientRect(); const r = node.getBoundingClientRect(); return { x: Math.max(12, Math.round(r.left - cr.left + canvas.scrollLeft)), y: Math.max(12, Math.round(r.top - cr.top + canvas.scrollTop)), width: Math.max(80, Math.round(r.width || 160)), height: Math.max(36, Math.round(r.height || 48)) }; }
function applyLayout(node, layout) { node.classList.add('free-position-item'); node.draggable = false; node.style.position = 'absolute'; node.style.transform = `translate(${Math.round(layout.x)}px,${Math.round(layout.y)}px)`; node.style.width = `${Math.max(80, Math.round(layout.width))}px`; node.style.height = `${Math.max(36, Math.round(layout.height))}px`; node.style.boxSizing = 'border-box'; node.style.touchAction = 'none'; node.style.userSelect = 'none'; node.style.cursor = 'grab'; }
function setSelected(node) { canvas?.querySelectorAll('.free-position-item.selected').forEach((item) => { item.classList.remove('selected'); item.style.cursor = 'grab'; }); if (node) { node.classList.add('selected'); node.style.cursor = 'grab'; } }
function addHandles(node) { if (node.querySelector('.free-size-handle')) return; ['top-left','top-right','bottom-left','bottom-right'].forEach((position) => { const handle = document.createElement('div'); handle.className = `free-size-handle free-size-handle-${position}`; handle.dataset.freePositionHandle = position; node.appendChild(handle); }); }
function ensureCanvasHeight(layout) { const bottom = layout.y + layout.height + 80; canvas.style.minHeight = `${Math.max(720, bottom)}px`; }
function getPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left + canvas.scrollLeft, y: event.clientY - rect.top + canvas.scrollTop }; }
function saveLocal(node, layout) { layouts[layoutKey(node)] = { ...layout }; writeLayouts(); }
function startMove(node, event) {
  if (event.button !== 0 || !isHomePage()) return;
  const innerControl = event.target.closest('[data-free-position-handle], .header-menu-toggle, .header-title-wrap, .header-title-edit, .header-menu-panel');
  if (innerControl) return;
  const startLayout = normalizeLayout(node, componentForNode(node));
  const point = getPoint(event);
  activePointer = { kind: 'move', node, startX: point.x, startY: point.y, startLayout, moved: false, pointerId: event.pointerId };
  setSelected(node); addHandles(node); node.style.cursor = 'grabbing';
  try { node.setPointerCapture?.(event.pointerId); } catch {}
  event.preventDefault(); event.stopPropagation();
}
function startResize(node, event, position) { if (event.button !== 0 || !isHomePage()) return; const startLayout = normalizeLayout(node, componentForNode(node)); const point = getPoint(event); activePointer = { kind: 'resize', node, position, startX: point.x, startY: point.y, startLayout, moved: false, pointerId: event.pointerId }; setSelected(node); addHandles(node); node.style.cursor = 'grabbing'; try { node.setPointerCapture?.(event.pointerId); } catch {} event.preventDefault(); event.stopPropagation(); }
function clampLayout(layout) { layout.width = Math.max(80, layout.width); layout.height = Math.max(36, layout.height); layout.x = Math.max(-20, layout.x); layout.y = Math.max(-20, layout.y); ensureCanvasHeight(layout); return layout; }
function pointerMove(event) { if (!activePointer) return; const point = getPoint(event); const dx = point.x - activePointer.startX; const dy = point.y - activePointer.startY; const base = activePointer.startLayout; const next = { ...base }; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) activePointer.moved = true; if (activePointer.kind === 'move') { next.x = base.x + dx; next.y = base.y + dy; } else { const pos = activePointer.position; if (pos.includes('right')) next.width = base.width + dx; if (pos.includes('left')) { next.width = base.width - dx; next.x = base.x + dx; } if (pos.includes('bottom')) next.height = base.height + dy; if (pos.includes('top')) { next.height = base.height - dy; next.y = base.y + dy; } if (next.width < 80) { if (pos.includes('left')) next.x = base.x + base.width - 80; next.width = 80; } if (next.height < 36) { if (pos.includes('top')) next.y = base.y + base.height - 36; next.height = 36; } } clampLayout(next); saveLocal(activePointer.node, next); applyLayout(activePointer.node, next); activePointer.node.style.cursor = 'grabbing'; if (activePointer.moved) event.preventDefault(); }
function pointerUp() { if (!activePointer) return; const { node, pointerId } = activePointer; try { node.releasePointerCapture?.(pointerId); } catch {} activePointer = null; node.style.cursor = 'grab'; setSelected(node); scheduleMergeAfterSave(); }
function enhanceNode(node) { if (!isHomePage()) return; const component = componentForNode(node); if (!component) return; const layout = normalizeLayout(node, component); saveLocal(node, layout); applyLayout(node, layout); addHandles(node); if (node.dataset.freePositionEnhanced === '1') return; node.dataset.freePositionEnhanced = '1'; node.addEventListener('pointerdown', (event) => { const handle = event.target.closest?.('[data-free-position-handle]'); if (handle) startResize(node, event, handle.dataset.freePositionHandle); else startMove(node, event); }, { passive: false }); node.addEventListener('click', () => setSelected(node)); }
function resetNonHome() { if (isHomePage()) return; canvas.classList.remove('home-freeform'); canvas?.querySelectorAll('.free-position-item').forEach((node) => { node.classList.remove('free-position-item', 'selected'); node.dataset.freePositionEnhanced = ''; node.style.position = ''; node.style.transform = ''; node.style.width = ''; node.style.height = ''; node.style.touchAction = ''; node.style.userSelect = ''; node.style.cursor = ''; }); }
function applyAll() { if (!canvas) return; if (!isHomePage()) { resetNonHome(); return; } canvas.classList.add('home-freeform'); canvas.querySelectorAll('.canvas-item').forEach(enhanceNode); }
async function loadDefinition() { if (!projectId) return; const auth = await supabase.auth.getUser(); if (auth.error || !auth.data.user) return; const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages,updated_at').eq('id', projectId).eq('user_id', auth.data.user.id).maybeSingle(); if (result.error || !result.data) return; project = result.data; definition = normalizeDefinition(project); }
async function mergeLayoutsToServer() { if (!projectId || !Object.keys(layouts).length) return; try { const auth = await supabase.auth.getUser(); const user = auth.data?.user; if (!user) return; const result = await supabase.from('projects').select('id,user_id,name,description,app_definition,pages,updated_at').eq('id', projectId).eq('user_id', user.id).maybeSingle(); if (result.error || !result.data) return; const latest = normalizeDefinition(result.data); const pageId = Object.keys(latest.pages).find((id) => String(latest.pages[id].name || '').toLowerCase() === 'home') || Object.keys(latest.pages)[0]; const page = latest.pages[pageId]; if (!page) return; page.components = (page.components || []).map((component, index) => { const layout = layouts[String(index)]; if (!layout) return component; return { ...component, props: { ...(component.props || {}), position: { ...layout } } }; }); const pages = latest.pages; const appDefinition = { ...(result.data.app_definition || {}), pages }; await supabase.from('projects').update({ pages, app_definition: appDefinition, updated_at: new Date().toISOString() }).eq('id', projectId).eq('user_id', user.id); definition = latest; } catch (error) { console.warn('Home layout merge failed', error); } }
function scheduleMergeAfterSave() { window.clearTimeout(saveMergeTimer); saveMergeTimer = window.setTimeout(() => { const text = String(projectStatus?.textContent || '').toLowerCase(); if (text.includes('saved')) mergeLayoutsToServer(); }, 700); }
function observeSaveStatus() { if (!projectStatus) return; const observer = new MutationObserver(() => { const text = String(projectStatus.textContent || '').toLowerCase(); if (text.includes('saved')) mergeLayoutsToServer(); }); observer.observe(projectStatus, { childList: true, characterData: true, subtree: true }); }

canvas?.addEventListener('pointermove', pointerMove, { passive: false });
window.addEventListener('pointerup', pointerUp, { passive: true });
window.addEventListener('pointercancel', pointerUp, { passive: true });
const canvasObserver = new MutationObserver(() => window.requestAnimationFrame(applyAll));
canvasObserver.observe(canvas || document.body, { childList: true, subtree: true });
const pageObserver = new MutationObserver(() => window.requestAnimationFrame(applyAll));
pageObserver.observe(pageStatus || document.body, { childList: true, characterData: true, subtree: true });
window.addEventListener('resize', applyAll);
window.addEventListener('load', applyAll);
observeSaveStatus();
setTimeout(async () => { await loadDefinition(); applyAll(); }, 350);
saveButton?.addEventListener('click', scheduleMergeAfterSave, true);
