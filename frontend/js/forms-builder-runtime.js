import { supabase } from './auth/supabase-config.js';
import attachDatabaseSubmit from './form-data-action.js';

const projectId = new URLSearchParams(location.search).get('projectId');
const canvas = document.getElementById('canvas');
const inspector = document.getElementById('inspectorContent');
let cleanup = null;

const keyFor = (id) => `indo-form-binding:${projectId}:${id}`;
const builderDefinition = () => window.__indoBuilderState?.getDefinition?.() || null;
const selectedForm = () => {
  const selected = canvas?.querySelector('.canvas-item.selected');
  if (!selected) return null;
  const index = Number(selected.dataset.index);
  const component = window.__indoBuilderComponents?.[index];
  return component?.type === 'Forms' ? { selected, component } : null;
};

function loadBinding(component) {
  if (component?.formBinding && typeof component.formBinding === 'object') return component.formBinding;
  if (!component?.id) return null;
  try { return JSON.parse(localStorage.getItem(keyFor(component.id)) || 'null'); } catch { return null; }
}

function saveBinding(component, binding) {
  if (!component) return;
  component.formBinding = JSON.parse(JSON.stringify(binding));
  try { localStorage.setItem(keyFor(component.id), JSON.stringify(binding)); } catch {}
  window.__indoBuilderState?.markDirty?.('Form binding changed');
}

async function getTables() {
  const { data, error } = await supabase.from('app_data_tables').select('id,name,columns').eq('project_id', projectId).order('created_at');
  if (error) throw error;
  return data || [];
}

function renderPanel() {
  const current = selectedForm();
  if (!current || !inspector) return;
  const { selected, component } = current;
  let panel = inspector.querySelector('[data-indo-form-data-panel]');
  if (!panel) {
    panel = document.createElement('div');
    panel.dataset.indoFormDataPanel = 'true';
    panel.className = 'inspector-field';
    inspector.appendChild(panel);
  }
  panel.innerHTML = '<label>Save form submissions</label><select><option value="">Choose a table…</option></select><small class="helper">Choose where submitted form data should be stored.</small>';
  const select = panel.querySelector('select');
  const binding = loadBinding(component);
  getTables().then((tables) => {
    tables.forEach((table) => {
      const option = document.createElement('option');
      option.value = table.id;
      option.textContent = table.name;
      option.selected = table.id === binding?.tableId;
      select.appendChild(option);
    });
  }).catch(() => {});

  select.addEventListener('change', async () => {
    if (!select.value) {
      component.formBinding = null;
      try { localStorage.removeItem(keyFor(component.id)); } catch {}
      window.__indoBuilderState?.markDirty?.('Form binding removed');
      cleanup?.();
      cleanup = null;
      return;
    }
    const tables = await getTables();
    const table = tables.find((item) => item.id === select.value);
    const fields = Array.isArray(component.props?.fields) ? component.props.fields : [];
    const columns = Array.isArray(table?.columns) ? table.columns : [];
    const fieldMap = {};
    fields.forEach((field, i) => {
      const column = columns.find((c) => c.name === field || c.key === field) || columns[i];
      if (column) fieldMap[field] = column.name || column.key;
    });
    saveBinding(component, { tableId: select.value, fieldMap });
    transformForm(selected, component);
  });
}

function transformForm(item, component) {
  if (!item || !component) return;
  const host = item.querySelector(':scope > div');
  if (!host) return;
  let form = host.tagName === 'FORM' ? host : null;
  if (!form) {
    form = document.createElement('form');
    form.innerHTML = host.innerHTML;
    host.replaceWith(form);
  }
  const binding = loadBinding(component);
  form.dataset.indoFormBinding = JSON.stringify(binding || {});
  form.querySelectorAll('input,textarea,select').forEach((input, index) => {
    input.name = input.name || input.placeholder || `field_${index + 1}`;
  });
  if (!form.querySelector('[type="submit"]')) {
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Submit';
    button.style.cssText = 'margin-top:8px;padding:10px 16px;border:0;border-radius:9px;background:#7c3aed;color:#fff;font-weight:800;';
    form.appendChild(button);
  }
  cleanup?.();
  cleanup = null;
  if (binding?.tableId) cleanup = attachDatabaseSubmit(form, binding.tableId, binding.fieldMap || {});
}

const observer = new MutationObserver(() => {
  const current = selectedForm();
  if (!current) return;
  renderPanel();
  const binding = loadBinding(current.component);
  if (binding?.tableId) transformForm(current.selected, current.component);
});

if (canvas) observer.observe(canvas, { childList: true, subtree: true, attributes: true });

window.addEventListener('indo:builder-saved', () => {
  const definition = builderDefinition();
  const current = selectedForm();
  if (definition && current?.component?.formBinding) {
    try { localStorage.setItem(keyFor(current.component.id), JSON.stringify(current.component.formBinding)); } catch {}
  }
});
