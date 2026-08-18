const appTitle = document.getElementById('appTitle');
const message = document.getElementById('message');
const templateButtons = document.querySelectorAll('.template-button');

const storedApp = localStorage.getItem('indoDevCurrentApp');

if (storedApp !== null) {
  const appData = JSON.parse(storedApp);
  appTitle.textContent = 'Choose a template for: ' + appData.name;
}

templateButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    const templateName = button.dataset.template;

    localStorage.setItem('indoDevSelectedTemplate', templateName);

    message.textContent = templateName + ' template selected. Opening builder...';

    setTimeout(function () {
      window.location.href = 'builder.html';
    }, 500);
  });
});
