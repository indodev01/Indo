// Get the sign-up form from the page.
const signUpForm = document.getElementById('signUpForm');

// Get the message area.
const formMessage = document.getElementById('formMessage');

// Handle account creation for the current frontend prototype.
signUpForm.addEventListener('submit', function (event) {
  event.preventDefault();

  // Read the values entered by the user.
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  // Show a clear next-step message.
  formMessage.textContent = `Account setup started for ${name} (${email}).`;
});
