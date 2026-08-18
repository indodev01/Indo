const builderTitle = document.getElementById('builderTitle');
const builderSubtitle = document.getElementById('builderSubtitle');
const canvas = document.getElementById('canvas');
const message = document.getElementById('message');
const previewButton = document.getElementById('previewButton');
const componentButtons = document.querySelectorAll('.component-button');

const storedApp = localStorage.getItem('indoDevCurrentApp');
const storedTemplate = localStorage.getItem('indoDevSelectedTemplate');

if (storedApp !== null) {
  const appData = JSON.parse(storedApp);

  builderTitle.textContent = appData.name + ' Builder';
}

if (storedTemplate !== null) {
  builderSubtitle.textContent = 'Template: ' + storedTemplate;
}

componentButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    const componentName = button.dataset.component;

    addComponentToCanvas(componentName);
  });
});

function addComponentToCanvas(componentName) {
  const placeholder = document.querySelector('.canvas-placeholder');

  if (placeholder !== null) {
    placeholder.remove();
  }

  const component = document.createElement('div');

  component.className = 'canvas-item';
  component.textContent = componentName + ' component';

  canvas.appendChild(component);

  message.textContent = componentName + ' added to the canvas.';
}

previewButton.addEventListener('click', function () {
  window.location.href = 'preview.html';
});
