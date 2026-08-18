const previewCanvas = document.getElementById('previewCanvas');
const previewInfo = document.getElementById('previewInfo');

const storedApp = localStorage.getItem('indoDevCurrentApp');
const storedTemplate = localStorage.getItem('indoDevSelectedTemplate');

if (storedApp !== null) {
  const appData = JSON.parse(storedApp);

  previewInfo.textContent = appData.name + ' preview';
}

if (storedTemplate !== null) {
  addPreviewItem('Template: ' + storedTemplate);
}

addPreviewItem('Your app preview will appear here.');

function addPreviewItem(text) {
  const item = document.createElement('div');

  item.className = 'preview-item';
  item.textContent = text;

  previewCanvas.appendChild(item);
}
