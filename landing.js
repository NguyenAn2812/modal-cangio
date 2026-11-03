
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.progress');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.main-nav');
  const links = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const stepButtons = [...document.querySelectorAll('.journey-step')];
  const scene = document.querySelector('.scene-demo');
  const sceneCounter = document.querySelector('#sceneCounter');
  const sceneTitle = document.querySelector('#sceneTitle');
  const sceneDescription = document.querySelector('#sceneDescription');

  const stageData = [
    {
      title: 'Chạm ngõ Rừng Sác',
      text: 'Từ cổng chào, khu mua vé và lời giới thiệu đầu tiên về hành trình Cần Giờ.',
    },
    {
      title: 'Chuẩn bị để khám phá',
      text: 'Kiểm tra hành trang, tìm hiểu nội quy, điểm tiếp nước và lựa chọn phương tiện.',
    },
    {
      title: 'Đi sâu vào rừng',
      text: 'Theo cầu gỗ qua lạch nước lợ, quan sát cây đước, rễ chống và hệ sinh thái.',
    },
    {
      title: 'Hiểu rồi, chọn gì?',
      text: 'Các lựa chọn trong trò chơi mở ra câu hỏi về niềm tin, sự quan tâm và hành động xanh.',
    },
  ];

  const updateScroll = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    if (progress) progress.style.width = (ratio * 100).toFixed(2) + '%';
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        updateScroll();
        scheduled = false;
      });
    }
  }, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();

  const closeMenu = () => {
    if (!nav || !menuButton) return;
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Mở menu');
  };
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const expanded = menuButton.getAttribute('aria-expanded') === 'true';
      nav.classList.toggle('is-open', !expanded);
      menuButton.setAttribute('aria-expanded', String(!expanded));
      menuButton.setAttribute('aria-label', expanded ? 'Mở menu' : 'Đóng menu');
    });
    links.forEach(link => link.addEventListener('click', closeMenu));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', e => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !menuButton.contains(e.target)) closeMenu();
    });
  }

  const setStage = (index) => {
    if (index < 0 || index >= stageData.length || !scene) return;
    const data = stageData[index];
    scene.dataset.stage = String(index);
    if (sceneCounter) sceneCounter.textContent = String(index + 1).padStart(2, '0');
    if (sceneTitle) sceneTitle.textContent = data.title;
    if (sceneDescription) sceneDescription.textContent = data.text;
    stepButtons.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  };
  stepButtons.forEach((button, i) => button.addEventListener('click', () => setStage(i)));
  setStage(0);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -45px 0px', threshold: .08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
  }

  if ('IntersectionObserver' in window) {
    const current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (link.getAttribute('href') === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });
    document.querySelectorAll('section[id]').forEach(s => current.observe(s));
  }

  const heroVisual = document.querySelector('.illustration-shell');
  if (heroVisual && !reducedMotion && window.matchMedia('(pointer:fine)').matches) {
    heroVisual.addEventListener('pointermove', e => {
      const bounds = heroVisual.getBoundingClientRect();
      const nx = ((e.clientX - bounds.left) / bounds.width - .5) * 2;
      const ny = ((e.clientY - bounds.top) / bounds.height - .5) * 2;
      heroVisual.style.transform = 'translate3d(' + (nx * 6).toFixed(1) + 'px,' + (ny * 6).toFixed(1) + 'px,0)';
    });
    heroVisual.addEventListener('pointerleave', () => heroVisual.style.transform = '');
  }
})();
