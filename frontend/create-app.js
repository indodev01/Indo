const appNameInput = document.getElementById('appName');
const appDescriptionInput = document.getElementById('appDescription');
const continueButton = document.getElementById('continueButton');
const message = document.getElementById('message');

continueButton.addEventListener('click', function () {
  const appName = appNameInput.value.trim();
  const appDescription = appDescriptionInput.value.trim();

  if (appName === '') {
    message.textContent = 'Please enter an app name.';
    return;
  }

  const appData = {
    name: appName,
    description: appDescription
  };

  localStorage.setItem('indoDevCurrentApp', JSON.stringify(appData));

  message.textContent = 'App saved. Opening template selection...';

  setTimeout(function () {
    window.location.href = 'templates.html';
  }, 500);
});
