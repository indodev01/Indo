const createAppButton = document.getElementById('createAppButton');
const message = document.getElementById('message');
const cardButtons = document.querySelectorAll('.card-button');

function showMessage(text) {
  message.textContent = text;
}

function openCreateAppPage() {
  window.location.href = 'create-app.html';
}

function openTemplatesPage() {
  window.location.href = 'templates.html';
}

function openPreviewPage() {
  window.location.href = 'preview.html';
}

createAppButton.addEventListener('click', openCreateAppPage);

cardButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    const action = button.dataset.action;

    if (action === 'create') {
      openCreateAppPage();
    }

    if (action === 'templates') {
      openTemplatesPage();
    }

    if (action === 'preview') {
      openPreviewPage();
    }

    showMessage('Opening ' + action + '...');
  });
});
