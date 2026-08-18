// Get the mobile menu button.
const menuButton = document.getElementById('menuButton');

// Get the mobile navigation menu.
const mobileNav = document.getElementById('mobileNav');

// Open or close the mobile navigation.
function toggleMenu() {
  const isOpen = mobileNav.classList.toggle('is-open');

  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
}

// Connect the menu button.
menuButton.addEventListener('click', toggleMenu);

// Close the mobile menu after selecting a link.
const mobileLinks = mobileNav.querySelectorAll('a');

mobileLinks.forEach(function (link) {
  link.addEventListener('click', function () {
    mobileNav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
  });
});
