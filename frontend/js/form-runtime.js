import attachDatabaseSubmit from './form-data-action.js';

export function mountFormBindings(root = document) {
  const forms = root.querySelectorAll('[data-indo-form-binding]');
  const cleanups = [];
  forms.forEach((form) => {
    let config = {};
    try { config = JSON.parse(form.dataset.indoFormBinding || '{}'); } catch { return; }
    if (!config.tableId) return;
    cleanups.push(attachDatabaseSubmit(form, config.tableId, config.fieldMap || {}));
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountFormBindings());
else mountFormBindings();
