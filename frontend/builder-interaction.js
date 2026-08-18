const canvas = document.getElementById('canvas');

// The editor owns selection. A single click must never navigate away from the editor.
// Navigation is handled by the final Preview experience, not by Design Studio.
function clearEditing() {
  canvas?.querySelectorAll('.canvas-item.editing').forEach((node) => node.classList.remove('editing'));
}

function enterEditMode(item) {
  clearEditing();
  if (!item) return;
  item.classList.add('editing');
  const inspector = document.getElementById('inspectorContent');
  const control = inspector?.querySelector('input, textarea, select, button');
  if (control) {
    window.setTimeout(() => {
      control.focus({ preventScroll: false });
      if (typeof control.select === 'function') control.select();
    }, 50);
  }
}

// Single click = select. builder-v2.js already owns the selectedIndex state.
canvas?.addEventListener('click', (event) => {
  const item = event.target.closest('.canvas-item');
  if (!item || !canvas.contains(item)) return;
  clearEditing();
});

// Double click = edit. This intentionally does not navigate to another page.
canvas?.addEventListener('dblclick', (event) => {
  const item = event.target.closest('.canvas-item');
  if (!item || !canvas.contains(item)) return;
  event.preventDefault();
  event.stopPropagation();
  enterEditMode(item);
});

const style = document.createElement('style');
style.textContent = `
  .canvas-item{position:relative;transition:outline .12s ease,box-shadow .12s ease,transform .12s ease}
  .canvas-item.editing{outline:2px solid #8b5cf6!important;outline-offset:3px;box-shadow:0 0 0 5px rgba(139,92,246,.14),0 12px 30px rgba(0,0,0,.16);z-index:20}
  .canvas-item.editing::after{content:'Editing';position:absolute;right:8px;top:8px;padding:4px 7px;border-radius:7px;background:#7c3aed;color:#fff;font:700 9px/1 system-ui,sans-serif;pointer-events:none;opacity:.96}
`;
document.head.appendChild(style);
