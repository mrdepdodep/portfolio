function initWorkCards() {
  const cards = document.querySelectorAll('.stat-card, .process-step, .status-info-card');
  if (!cards.length) return;

  cards.forEach(card => card.classList.add('will-reveal'));

  if (typeof IntersectionObserver === 'undefined') {
    cards.forEach(card => card.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  cards.forEach((card, idx) => {
    card.style.transitionDelay = `${Math.min(idx * 45, 240)}ms`;
    observer.observe(card);
  });
}

window.PageModules = window.PageModules || {};
window.PageModules.work = function initWorkPage() {
  initWorkCards();
};
