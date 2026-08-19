(() => {
  function closePageDialog() {
    const dialog = document.getElementById('pageDialog');
    if (!dialog) return;
    dialog.hidden = true;
    const input = document.getElementById('pageNameInput');
    const message = document.getElementById('pageDialogMessage');
    if (input) input.value = '';
    if (message) message.textContent = '';
  }

  function bind() {
    const dialog = document.getElementById('pageDialog');
    if (!dialog || dialog.dataset.closeFixReady) return;
    dialog.dataset.closeFixReady = '1';

    document.getElementById('cancelPageButton')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePageDialog();
    });

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closePageDialog();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !dialog.hidden) {
        event.preventDefault();
        closePageDialog();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
