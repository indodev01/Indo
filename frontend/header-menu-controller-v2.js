// Canonical 3-line menu interaction controller.
// Single click opens the page menu; double click opens the menu-design editor.
// The first physical click is delayed briefly so a real double-click never
// opens the page menu before the second click reaches the same button.

const pending = new WeakMap();
const SYNTHETIC = '__indoMenuSynthetic';
const WAIT_MS = 340;

function menuButtonFromEvent(event) {
  return event.target?.closest?.('.canvas-header-component .header-menu-toggle') || null;
}

function clearPending(menu) {
  const timer = pending.get(menu);
  if (timer) clearTimeout(timer);
  pending.delete(menu);
}

function relay(menu, type) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    detail: type === 'dblclick' ? 2 : 1
  });
  Object.defineProperty(event, SYNTHETIC, { value: true });
  menu.dispatchEvent(event);
}

document.addEventListener('click', (event) => {
  const menu = menuButtonFromEvent(event);
  if (!menu || event[SYNTHETIC]) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  // The browser will send the real dblclick event immediately after the
  // second click. Just cancel the pending single-click action here.
  if (event.detail >= 2) {
    clearPending(menu);
    return;
  }

  clearPending(menu);
  const timer = setTimeout(() => {
    pending.delete(menu);
    relay(menu, 'click');
  }, WAIT_MS);
  pending.set(menu, timer);
}, true);

document.addEventListener('dblclick', (event) => {
  const menu = menuButtonFromEvent(event);
  if (!menu || event[SYNTHETIC]) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  clearPending(menu);
  relay(menu, 'dblclick');
}, true);
