import DataBinding from './data-binding.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
const inspector = document.getElementById('inspectorContent');
if (!projectId || !canvas || !inspector) throw new Error('Data binding integration requires a builder project.');

const key = `indo-data-bindings-${projectId}`;
let bindings = {};
try { bindings = JSON.parse(localStorage.getItem(key) || '{}'); } catch { bindings = {}; }
let selected = null;
let applying = false;

function save() { localStorage.setItem(key, JSON.stringify(bindings)); }
function componentKey(item) { return `${item.dataset.index}`; }
function ensurePanel() {
  let panel = document.getElementById('dataBindingPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'dataBindingPanel';
    panel.className = 'inspector-field data-binding-panel';
    inspector.appendChild(panel);
  }
  return panel;
}

async function renderPanel(item) {
  const panel = ensurePanel();
  panel.innerHTML = '<label>Data</label><select id="dataBindingTable"><option value="">No database binding</option></select><div class="binding-help">Connect this component to app data.</div>';
  const select = panel.querySelector('#dataBindingTable');
  try {
    const tables = await DataBinding.tables();
    tables.forEach(table => { const o=document.createElement('option'); o.value=table.id; o.textContent=table.name; select.appendChild(o); });
    select.value = bindings[componentKey(item)]?.tableId || '';
  } catch (e) {
    panel.querySelector('.binding-help').textContent = 'Could not load app tables.';
    return;
  }
  select.addEventListener('change', async () => {
    const k = componentKey(item);
    if (!select.value) { delete bindings[k]; save(); restoreBuilderRender(); return; }
    bindings[k] = { tableId: select.value, mode: 'list' };
    save();
    await applyBinding(item, bindings[k]);
  });
}

function textValue(data) {
  if (!data || typeof data !== 'object') return String(data ?? '');
  const preferred = ['title','name','text','label','description','value'];
  for (const k of preferred) if (data[k] !== undefined && data[k] !== null) return String(data[k]);
  const first = Object.values(data).find(v => ['string','number','boolean'].includes(typeof v));
  return first == null ? '' : String(first);
}

async function applyBinding(item, binding) {
  if (applying || !binding?.tableId) return;
  applying = true;
  try {
    const rows = await DataBinding.records(binding.tableId, 50);
    const host = item.querySelector('.data-bound-preview') || document.createElement('div');
    host.className = 'data-bound-preview';
    host.innerHTML = '';
    host.style.cssText = 'margin-top:10px;display:grid;gap:8px;width:100%;';
    rows.forEach((row) => {
      const card = document.createElement('div');
      card.style.cssText = 'padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.04);';
      card.textContent = textValue(row.data);
      host.appendChild(card);
    });
    if (!item.contains(host)) item.appendChild(host);
    if (!rows.length) host.textContent = 'No records yet';
  } finally { applying = false; }
}

function restoreBuilderRender() {
  const active = document.querySelector('.canvas-item.selected');
  if (!active) return;
  const old = active.querySelector('.data-bound-preview');
  if (old) old.remove();
}

canvas.addEventListener('click', async (event) => {
  const item = event.target.closest('.canvas-item');
  if (!item) return;
  selected = item;
  setTimeout(async () => {
    await renderPanel(item);
    const binding = bindings[componentKey(item)];
    if (binding) await applyBinding(item, binding);
  }, 0);
});

const observer = new MutationObserver(() => {
  document.querySelectorAll('.canvas-item').forEach(item => {
    const binding = bindings[componentKey(item)];
    if (binding && !item.querySelector('.data-bound-preview')) applyBinding(item, binding);
  });
});
observer.observe(canvas, { childList:true, subtree:true });

window.addEventListener('beforeunload', save);
