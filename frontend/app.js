// Get the main button from the page.
const createAppButton = document.getElementById('createAppButton');

// Get the message area from the page.
const message = document.getElementById('message');

// Show a simple message to the user.
function showMessage(text) {
  message.textContent = text;
}

// Start the new-app flow.
function createNewApp() {
  showMessage('Create New App flow started. Template selection is next.');
}

// Open the template section.
function openTemplates() {
  showMessage('Template Library will open here.');
}

// Open the preview section.
function openPreview() {
  showMessage('Preview Engine will open here.');
}

// Connect the main Create New App button.
createAppButton.addEventListener('click', createNewApp);

// Find all smaller card buttons.
const cardButtons = document.querySelectorAll('.card-button');

// Add the correct action to each card button.
cardButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    const action = button.dataset.action;

    if (action === 'create') {
      createNewApp();
    }

    if (action === 'templates') {
      openTemplates();
    }

    if (action === 'preview') {
      openPreview();
    }
  });
});
