let hasUnsavedChanges = false;

function setUnsavedState(value) {
  hasUnsavedChanges = Boolean(value);
}

window.addEventListener('indo:builder-dirty', () => setUnsavedState(true));
window.addEventListener('indo:builder-saved', () => setUnsavedState(false));

window.addEventListener('beforeunload', (event) => {
  if (!hasUnsavedChanges) return;
  event.preventDefault();
  event.returnValue = '';
});

window.__indoUnsavedGuard = {
  isDirty: () => hasUnsavedChanges,
  clear: () => setUnsavedState(false)
};
