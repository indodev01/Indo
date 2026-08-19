import { supabase } from './auth/supabase-config.js';
import attachDatabaseSubmit from './form-data-action.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
const inspector = document.getElementById('inspectorContent');
let cleanup = null;
let lastComponentId = '';

const keyFor = (id) => `indo-form-binding:${projectId}:${id}`;
const loadBinding = (id) => { try { return JSON.parse(localStorage.getItem(keyFor(id)) || 'null'); } catch { return null; } };
const saveBinding = (id, binding) => localStorage.setItem(keyFor(id), JSON.stringify(binding));

async function getTables() {
  const { data, error } = await supabase.from('app_data_tables').select('id,name,columns').eq('project_id', projectId).order('created_at');
  if (error) throw error;
  return data || [];
}

function selectedForm() {
  const selected = canvas?.querySelector('.canvas-item.selected');
  if (!selected) return null;
  const index = selected.dataset.index;
  const component = window.__indoBuilderComponents?.[Number(index)];
  return component?.type === 'Forms' ? { selected, component } : null;
}

function renderPanel() {
  const current = selectedForm();
  if (!current || !inspector) return;
  const { selected, component } = current;
  if (inspector.querySelector('[data-indo-form-data-panel]')) return;
  const panel = document.createElement('div');
  panel.dataset.indoFormDataPanel = 'true';
  panel.className = 'inspector-field';
  panel.innerHTML = '<label>Save form submissions</label><select><option value="">Choose a table…</option></select><small class="helper">Choose where submitted form data should be stored.</small>';
  const select = panel.querySelector('select');
  const binding = loadBinding(component.id) || component.formBinding;
  getTables().then((tables) => {
    tables.forEach((table) => { const option = document.createElement('option'); option.value = table.id; option.textContent = table.name; option.selected = table.id === binding?.tableId; select.appendChild(option); });
  }).catch(() => {});
  select.addEventListener('change', async () => {
    if (!select.value) { localStorage.removeItem(keyFor(component.id)); return; }
    const tables = await getTables();
    const table = tables.find((item) => item.id === select.value);
    const fields = Array.isArray(component.props?.fields) ? component.props.fields : [];
    const columns = Array.isArray(table?.columns) ? table.columns : [];
    const fieldMap = {};
    fields.forEach((field, i) => { const column = columns.find((c) => c.name === field || c.key === field) || columns[i]; if (column) fieldMap[field] = column.name || column.key; });
    saveBinding(component.id, { tableId: select.value, fieldMap });
    transformForm(selected, component.id);
  });
  inspector.appendChild(panel);
}

function transformForm(item, componentId) {
  const host = item.querySelector(':scope > div');
  if (!host) return;
  let form = host.tagName === 'FORM' ? host : null;
  if (!form) {
    form = document.createElement('form');
    form.innerHTML = host.innerHTML;
    host.replaceWith(form);
  }
  form.dataset.indoFormBinding = JSON.stringify(loadBinding(componentId) || {});
  form.querySelectorAll('input').forEach((input, index) => { input.name = input.name || input.placeholder || `field_${index + 1}`; });
  if (!form.querySelector('[type="submit"]')) { const button = document.createElement('button'); button.type = 'submit'; button.textContent = 'Submit'; button.style.cssText = 'margin-top:8px;padding:10px 16px;border:0;border-radius:9px;background:#7c3aed;color:#fff;font-weight:800;'; form.appendChild(button); }
  cleanup?.();
  const binding = loadBinding(componentId);
  if (binding?.tableId) cleanup = attachDatabaseSubmit(form, binding.tableId, binding.fieldMap || {});
}

function exposeComponents() {
  // builder-v2 does not expose its internal array, so mirror component metadata from canvas selection.
  window.__indoBuilderComponents = window.__indoBuilderComponents || [];
}

const observer = new MutationObserver(() => {
  exposeComponents();
  const selected = canvas?.querySelector('.canvas-item.selected');
  if (!selected) return;
  const index = Number(selected.dataset.index);
  // Infer a Forms component from the rendered form-like DOM when the Builder does not expose state.
  if (selected.querySelector('input') && selected.querySelector('h3')) {
    const componentId = selected.dataset.indoComponentId || `form-${projectId}-${index}`;
    selected.dataset.indoComponentId = componentId;
    window.__indoBuilderComponents[index] = { id: componentId, type: 'Forms', props: { fields: [...selected.querySelectorAll('input')].map((input) => input.placeholder).filter(Boolean) } };
    renderPanel();
    if (loadBinding(componentId)?.tableId) transformForm(selected, componentId);
    lastComponentId = componentId;
  }
});

if (canvas) observer.observe(canvas, { childList: true, subtree: true, attributes: true });
