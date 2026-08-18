// Get the sign-in form.
const signInForm = document.getElementById('signInForm');

// Get the message area.
const formMessage = document.getElementById('formMessage');

// Handle the sign-in form.
signInForm.addEventListener('submit', function (event) {
  event.preventDefault();

  // Read the entered email.
  const email = document.getElementById('email').value.trim();

  // Show a clear success message.
  formMessage.textContent = `Sign-in request received for ${email}.`;

  // Move the user to the dashboard after the form is accepted.
  window.location.href = '../dashboard/index.html';
});
