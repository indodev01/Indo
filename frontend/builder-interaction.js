const canvas = document.getElementById('canvas');
const inspector = document.getElementById('inspectorContent');
const selectionLabel = document.getElementById('selectionLabel');
const pageList = document.getElementById('pageList');

function selectedItem() {
  return canvas?.querySelector('.canvas-item.selected') || null;
}

function focusFirstEditorControl() {
  const control = inspector?.querySelector('input, textarea, select, button');
  if (control) {
    control.focus({ preventScroll: false });
    if (typeof control.select === 'function') control.select();
  }
}

function enterEditMode(item) {
  canvas?.querySelectorAll('.canvas-item.editing').forEach((node) => node.classList.remove('editing'));
  if (!item) return;
  item.classList.add('editing');
  focusFirstEditorControl();
}

// Single click keeps the normal builder selection behavior.
// Double click means: "I want to edit this element."
canvas?.addEventListener('dblclick', (event) => {
  const item = event.target.closest('.canvas-item');
  if (!item || !canvas.contains(item)) return;
  event.preventDefault();
  event.stopPropagation();
  enterEditMode(item);
});

canvas?.addEventListener('click', (event) => {
  const item = event.target.closest('.canvas-item');
  if (!item || !canvas.contains(item)) return;
  canvas.querySelectorAll('.canvas-item.editing').forEach((node) => node.classList.remove('editing'));
});

pageList?.addEventListener('click', (event) => {
  const pageButton = event.target.closest('.page-button');
  if (!pageButton) return;
  // The core builder switches the page. This only adds a short visual state.
  pageList.querySelectorAll('.page-button').forEach((node) => node.classList.remove('page-editing'));
  pageButton.classList.add('page-editing');
  window.setTimeout(() => focusFirstEditorControl(), 60);
});

// Keep the interaction understandable without exposing technical editor language.
const style = document.createElement('style');
style.textContent = `
  .canvas-item{position:relative;transition:outline .12s ease,box-shadow .12s ease,transform .12s ease}
  .canvas-item.editing{outline:2px solid #8b5cf6!important;outline-offset:3px;box-shadow:0 0 0 5px rgba(139,92,246,.14),0 12px 30px rgba(0,0,0,.16);z-index:20}
  .canvas-item.editing::after{content:'Double-click = Edit';position:absolute;right:8px;top:8px;padding:4px 7px;border-radius:7px;background:#7c3aed;color:#fff;font:700 9px/1 system-ui,sans-serif;pointer-events:none;opacity:.96}
  .page-button.page-editing{box-shadow:inset 0 0 0 1px rgba(167,139,250,.65),0 0 0 2px rgba(124,58,237,.12)}
`;
document.head.appendChild(style);
