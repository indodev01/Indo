const buttons = document.querySelectorAll('.device-button');
buttons.forEach((button) => {
  button.addEventListener('click', (event) => {
    if (window.__indoResponsive?.setDevice) {
      event.stopImmediatePropagation();
    }
  }, { capture: true });
});
