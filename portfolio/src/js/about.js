window.PageModules = window.PageModules || {};
window.PageModules.about = function initAboutPage() {
  // Avatar slider — only starts if there are 2+ images
  const AVATAR_IMAGES = ['../src/images/dodep-coder.png'];
  if (AVATAR_IMAGES.length < 2) return;

  const avatarImg = document.querySelector('.avatar-large img');
  if (!avatarImg) return;

  let currentIndex = 0;
  let intervalId = null;

  function changeAvatar() {
    avatarImg.classList.add('fade-out');
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % AVATAR_IMAGES.length;
      avatarImg.src = AVATAR_IMAGES[currentIndex];
      avatarImg.classList.remove('fade-out');
      avatarImg.classList.add('fade-in');
      setTimeout(() => avatarImg.classList.remove('fade-in'), 1000);
    }, 1000);
  }

  intervalId = setInterval(changeAvatar, 10000);

  const avatarContainer = document.querySelector('.avatar-large');
  if (avatarContainer) {
    avatarContainer.addEventListener('mouseenter', () => {
      clearInterval(intervalId);
      intervalId = null;
    });
    avatarContainer.addEventListener('mouseleave', () => {
      if (!intervalId) intervalId = setInterval(changeAvatar, 10000);
    });
  }
};
