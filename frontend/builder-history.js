import { supabase } from './auth/supabase-config.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const undoStack = [];
const redoStack = [];
let lastUpdatedAt = null;
let busy = false;
const MAX_HISTORY = 30;

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const status = (text) => { const el = document.getElementById('projectStatus'); if (el) el.textContent = text; };

function snapshot(data) {
  return { pages: clone(data.pages || {}), app_definition: clone(data.app_definition || {}) };
}

async function readProject() {
  if (!projectId) return null;
  const { data, error } = await supabase.from('projects').select('id,updated_at,pages,app_definition').eq('id', projectId).maybeSingle();
  if (error || !data) return null;
  return data;
}

function pushUndo(state) {
  if (!state) return;
  const previous = undoStack[undoStack.length - 1];
  const encoded = JSON.stringify(state);
  if (previous && JSON.stringify(previous) === encoded) return;
  undoStack.push(clone(state));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
}

async function restore(state, direction) {
  if (busy || !state || !projectId) return;
  busy = true;
  try {
    const current = await readProject();
    if (!current) return;
    if (direction === 'undo') {
      redoStack.push(snapshot(current));
      pushUndo(state);
    } else {
      pushUndo(snapshot(current));
    }
    const { error } = await supabase.from('projects').update({
      pages: clone(state.pages),
      app_definition: clone(state.app_definition),
      updated_at: new Date().toISOString()
    }).eq('id', projectId);
    if (error) throw error;
    status(direction === 'undo' ? 'Undid last saved change' : 'Redid change');
    setTimeout(() => location.reload(), 250);
  } catch (error) {
    console.error(error);
    status(`${direction === 'undo' ? 'Undo' : 'Redo'} failed`);
  } finally {
    busy = false;
  }
}

async function undo() {
  if (!undoStack.length) { status('Nothing to undo'); return; }
  const target = undoStack.pop();
  await restore(target, 'undo');
}

async function redo() {
  if (!redoStack.length) { status('Nothing to redo'); return; }
  const target = redoStack.pop();
  await restore(target, 'redo');
}

async function watch() {
  const data = await readProject();
  if (!data) return;
  lastUpdatedAt = data.updated_at;
  if (!watch.started) {
    watch.started = true;
    watch.last = snapshot(data);
  }
}
watch.started = false;
watch.last = null;

async function poll() {
  if (busy) return;
  const data = await readProject();
  if (!data) return;
  if (!lastUpdatedAt) {
    lastUpdatedAt = data.updated_at;
    watch.last = snapshot(data);
    return;
  }
  if (data.updated_at !== lastUpdatedAt) {
    if (watch.last) pushUndo(watch.last);
    redoStack.length = 0;
    watch.last = snapshot(data);
    lastUpdatedAt = data.updated_at;
  }
}

function installUI() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.getElementById('undoButton')) return;
  const style = document.createElement('style');
  style.textContent = '.history-button{min-width:34px;padding:8px 10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#11182a;color:#fff;font-weight:800}.history-button:disabled{opacity:.4;cursor:not-allowed}';
  document.head.appendChild(style);
  const undoButton = document.createElement('button');
  undoButton.id = 'undoButton'; undoButton.className = 'history-button'; undoButton.type = 'button'; undoButton.title = 'Undo (Ctrl+Z)'; undoButton.textContent = '↶';
  const redoButton = document.createElement('button');
  redoButton.id = 'redoButton'; redoButton.className = 'history-button'; redoButton.type = 'button'; redoButton.title = 'Redo (Ctrl+Shift+Z)'; redoButton.textContent = '↷';
  undoButton.onclick = undo; redoButton.onclick = redo;
  actions.insertBefore(redoButton, actions.firstChild);
  actions.insertBefore(undoButton, redoButton);
}

function refreshButtons() {
  const u = document.getElementById('undoButton');
  const r = document.getElementById('redoButton');
  if (u) u.disabled = busy || !undoStack.length;
  if (r) r.disabled = busy || !redoStack.length;
}

document.addEventListener('keydown', (event) => {
  if (event.target.matches?.('input,textarea,select,[contenteditable="true"]')) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redo();
  }
});

installUI();
await watch();
setInterval(async () => { await poll(); refreshButtons(); }, 2000);
refreshButtons();
