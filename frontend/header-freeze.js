(() => {
  const style = document.createElement('style');
  style.textContent = `
    .canvas-header-component .free-size-handle { display:none !important; }
    .canvas-header-component.free-position-item { cursor:default !important; }
    .canvas-header-component .app-header { cursor:default !important; }
  `;
  document.head.appendChild(style);

  document.addEventListener('pointerdown', (event) => {
    const headerItem = event.target?.closest?.('.canvas-header-component');
    if (!headerItem) return;

    // Only the header title and menu button are draggable.
    // Everything else in the header stays fixed, while menu contents remain clickable.
    const movable = event.target.closest?.('.header-title-wrap, .header-title-edit, .header-menu-toggle');
    const menuPanel = event.target.closest?.('.header-menu-panel');
    if (movable || menuPanel) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
