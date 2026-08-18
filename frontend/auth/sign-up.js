// Get the sign-up form from the page.
const signUpForm = document.getElementById('signUpForm');

// Get the message area from the page.
const formMessage = document.getElementById('formMessage');

// Handle account creation for the frontend prototype.
signUpForm.addEventListener('submit', function (event) {
  event.preventDefault();

  // Read the values entered by the user.
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  // Show a clear success message.
  formMessage.textContent = `Account setup started for ${name}.`;

  // Move the user to Sign In after the form is accepted.
  window.location.href = 'sign-in.html';
});
