import DataBinding from './data-binding.js';

function getValue(data, path) {
  return String(path || '').split('.').reduce((value, key) => value == null ? undefined : value[key], data);
}

function renderRow(template, data) {
  const node = template.cloneNode(true);
  node.removeAttribute('data-indo-list-template');
  node.hidden = false;
  node.querySelectorAll('[data-indo-bind]').forEach((el) => {
    const value = getValue(data, el.dataset.indoBind);
    el.textContent = value == null ? '' : String(value);
  });
  node.querySelectorAll('[data-indo-bind-src]').forEach((el) => {
    const value = getValue(data, el.dataset.indoBindSrc);
    if (value != null) el.setAttribute('src', String(value));
  });
  return node;
}

export async function mountDynamicLists(root = document) {
  const lists = root.querySelectorAll('[data-indo-list-table]');
  const cleanups = [];
  for (const list of lists) {
    const tableId = list.dataset.indoListTable;
    if (!tableId) continue;
    const template = list.querySelector('[data-indo-list-template]');
    if (!template) continue;
    try {
      const rows = await DataBinding.records(tableId, Number(list.dataset.indoListLimit) || 100);
      template.hidden = true;
      template.setAttribute('aria-hidden', 'true');
      rows.forEach((row) => list.appendChild(renderRow(template, row.data || {})));
    } catch (error) {
      list.dispatchEvent(new CustomEvent('indo:data-error', { detail: { error }, bubbles: true }));
    }
    cleanups.push(() => list.querySelectorAll('[data-indo-list-instance]').forEach((node) => node.remove()));
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountDynamicLists());
else mountDynamicLists();
