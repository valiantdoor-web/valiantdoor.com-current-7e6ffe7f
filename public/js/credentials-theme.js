(() => {
  'use strict';
  if (!document.body.classList.contains('page-credentials')) return;
  for (const logo of document.querySelectorAll('.global-brand img')) {
    logo.src = '/assets/credentials/valiant-approved-red-gold-shield.png';
    logo.width = 98;
    logo.height = 110;
  }
  const book = document.querySelector('.global-header-book');
  if (book) book.textContent = 'Book Now';
  const menu = document.querySelector('.global-nav-toggle');
  if (menu && !menu.querySelector('.credential-menu-label')) {
    const label = document.createElement('span');
    label.className = 'credential-menu-label';
    label.textContent = 'Menu';
    menu.append(label);
  }
})();
