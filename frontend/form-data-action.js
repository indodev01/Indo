import DataBinding from './data-binding.js';

export function attachDatabaseSubmit(form, tableId, fieldMap = {}) {
  if (!form || !tableId) return () => {};
  const handler = async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const previousText = submit?.textContent;
    if (submit) { submit.disabled = true; submit.textContent = 'Saving…'; }
    const payload = {};
    const data = new FormData(form);
    for (const [inputName, value] of data.entries()) {
      const targetKey = fieldMap[inputName] || inputName;
      payload[targetKey] = value;
    }
    try {
      const row = await DataBinding.create(tableId, payload);
      form.reset();
      form.dispatchEvent(new CustomEvent('indo:submitted', { detail: { row }, bubbles: true }));
      return row;
    } catch (error) {
      form.dispatchEvent(new CustomEvent('indo:submit-error', { detail: { error }, bubbles: true }));
      throw error;
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = previousText || 'Submit'; }
    }
  };
  form.addEventListener('submit', handler);
  return () => form.removeEventListener('submit', handler);
}

export default attachDatabaseSubmit;
