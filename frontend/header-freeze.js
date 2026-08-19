(() => {
  const style = document.createElement('style');
  style.textContent = `
    .canvas-header-component .free-size-handle { display:block !important; }
    .canvas-header-component.free-position-item { cursor:grab !important; }
    .canvas-header-component .app-header { cursor:grab !important; }
    .canvas-header-component .free-size-handle { z-index:30 !important; }
    .canvas-header-component .header-title-wrap,
    .canvas-header-component .header-menu-toggle { cursor:grab !important; touch-action:none !important; z-index:31 !important; }
    .canvas-header-component .header-menu-panel { cursor:default !important; touch-action:auto !important; }
  `;
  document.head.appendChild(style);
})();
