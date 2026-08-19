const projectId = new URLSearchParams(location.search).get('projectId');
let clipboard = null;

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const makeId = (type = 'component') => `${String(type).toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

function getState() {
  if (!Array.isArray(window.components)) return null;
  const index = Number.isInteger(window.selectedIndex) ? window.selectedIndex : -1;
  if (index < 0 || !window.components[index]) return null;
  return { index, component: clone(window.components[index]) };
}

function duplicateSelected() {
  const state = getState();
  if (!state) return false;
  const copy = clone(state.component);
  copy.id = makeId(copy.type);
  if (copy.props && typeof copy.props === 'object') copy.props = clone(copy.props);
  window.components.splice(state.index + 1, 0, copy);
  window.selectedIndex = state.index + 1;
  window.renderCanvas?.();
  window.renderInspector?.();
  window.showStatus?.(`${copy.type} duplicated`);
  return true;
}

function copySelected() {
  const state = getState();
  if (!state) return;
  clipboard = state.component;
  window.showStatus?.(`${state.component.type} copied`);
}

function pasteSelected() {
  if (!clipboard || !Array.isArray(window.components)) return;
  const copy = clone(clipboard);
  copy.id = makeId(copy.type);
  window.components.push(copy);
  window.selectedIndex = window.components.length - 1;
  window.renderCanvas?.();
  window.renderInspector?.();
  window.showStatus?.(`${copy.type} pasted`);
}

function install() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.getElementById('duplicateComponentButton')) return;
  const style = document.createElement('style');
  style.textContent = '.component-action-button{min-width:34px;padding:8px 10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#11182a;color:#fff;font-weight:800;cursor:pointer}.component-action-button:disabled{opacity:.4;cursor:not-allowed}';
  document.head.appendChild(style);
  const duplicate = document.createElement('button');
  duplicate.id = 'duplicateComponentButton'; duplicate.className = 'component-action-button'; duplicate.type = 'button'; duplicate.title = 'Duplicate selected component'; duplicate.textContent = '⧉';
  duplicate.onclick = duplicateSelected;
  actions.insertBefore(duplicate, actions.firstChild);
}

document.addEventListener('keydown', (event) => {
  if (event.target.matches?.('input,textarea,select,[contenteditable="true"]')) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
    const state = getState();
    if (state) { event.preventDefault(); copySelected(); }
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
    if (clipboard) { event.preventDefault(); pasteSelected(); }
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
    if (getState()) { event.preventDefault(); duplicateSelected(); }
  }
});

install();
window.componentDuplicate = { duplicateSelected, copySelected, pasteSelected };
