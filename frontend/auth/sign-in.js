// Get the sign-in form.
const signInForm = document.getElementById('signInForm');

// Get the message area.
const formMessage = document.getElementById('formMessage');

// Handle the sign-in form.
signInForm.addEventListener('submit', function (event) {
  event.preventDefault();

  // Read the entered email.
  const email = document.getElementById('email').value.trim();

  // For now, show the next step without connecting a backend.
  formMessage.textContent = `Sign-in request received for ${email}.`;
});
