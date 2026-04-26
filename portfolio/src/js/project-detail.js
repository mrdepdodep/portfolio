(function () {
  const Events = {
    controller: new AbortController(),
    reset() {
      this.controller.abort();
      this.controller = new AbortController();
    },
    on(target, type, listener, options = {}) {
      if (!target?.addEventListener) return;
      target.addEventListener(type, listener, { ...options, signal: this.controller.signal });
    }
  };

  /* ===== MARKDOWN ===== */

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function sanitizeUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '#';
    if (/^(javascript|data|vbscript):/i.test(raw)) return '#';

    try {
      const parsed = new URL(raw, window.location.origin);
      if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        return parsed.href;
      }
    } catch (_) {}
    return '#';
  }

  function formatInline(text) {
    return text
      .replace(/\[(.*?)\]\((.*?)\)/g, (_match, label, url) => {
        const safeUrl = sanitizeUrl(url);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      })
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  function renderMarkdown(md) {
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const html = [];
    let inCode = false, inUl = false, inOl = false;

    function closeLists() {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
    }

    lines.forEach(line => {
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        closeLists();
        if (!inCode) { html.push('<pre><code>'); inCode = true; }
        else { html.push('</code></pre>'); inCode = false; }
        return;
      }
      if (inCode) { html.push(`${escapeHtml(line)}\n`); return; }
      if (!trimmed) { closeLists(); return; }

      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        closeLists();
        const level = headingMatch[1].length;
        html.push(`<h${level}>${formatInline(escapeHtml(headingMatch[2]))}</h${level}>`);
        return;
      }

      const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (ulMatch) {
        if (!inUl) { closeLists(); html.push('<ul>'); inUl = true; }
        html.push(`<li>${formatInline(escapeHtml(ulMatch[1]))}</li>`);
        return;
      }

      const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      if (olMatch) {
        if (!inOl) { closeLists(); html.push('<ol>'); inOl = true; }
        html.push(`<li>${formatInline(escapeHtml(olMatch[1]))}</li>`);
        return;
      }

      closeLists();
      html.push(`<p>${formatInline(escapeHtml(trimmed))}</p>`);
    });

    if (inCode) html.push('</code></pre>');
    closeLists();
    return html.join('');
  }

  /* ===== LANG ===== */

  function getLang() {
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang && ['en', 'uk', 'ru'].includes(urlLang)) return urlLang;
    if (window.currentLang && ['en', 'uk', 'ru'].includes(window.currentLang)) return window.currentLang;
    const saved = localStorage.getItem('lang');
    return ['en', 'uk', 'ru'].includes(saved) ? saved : 'en';
  }

  function t(key) {
    return window.TRANSLATIONS?.[getLang()]?.[key] || window.TRANSLATIONS?.['en']?.[key] || key;
  }

  /* ===== README ===== */

  async function loadReadme(target, readmePaths) {
    const lang = getLang();
    const url = readmePaths[lang] || readmePaths['en'];
    if (!url) { target.textContent = t('projects.detail.readmeNotFound'); return; }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      target.innerHTML = renderMarkdown(await res.text());
    } catch (_) {
      if (lang !== 'en' && readmePaths['en']) {
        try {
          const res = await fetch(readmePaths['en']);
          if (res.ok) { target.innerHTML = renderMarkdown(await res.text()); return; }
        } catch (_) {}
      }
      target.textContent = t('projects.detail.readmeUnavailable');
    }
  }

  /* ===== GALLERY ===== */

  function initGallery() {
    const gallery = document.querySelector('[data-project-gallery]');
    if (!gallery) return;

    const mainImage = gallery.querySelector('[data-gallery-main]');
    const thumbsContainer = gallery.querySelector('[data-gallery-thumbs]');
    const prevBtn = gallery.querySelector('[data-gallery-prev]');
    const nextBtn = gallery.querySelector('[data-gallery-next]');
    const fullscreenBtn = gallery.querySelector('[data-gallery-fullscreen]');
    const modal = document.querySelector('[data-gallery-modal]');
    const modalImage = modal?.querySelector('[data-modal-image]');
    const modalPrev = modal?.querySelector('[data-modal-prev]');
    const modalNext = modal?.querySelector('[data-modal-next]');
    const modalClose = modal?.querySelector('[data-modal-close]');
    const modalContent = modal?.querySelector('.gallery-modal-content');
    let lastFocused = null;

    const thumbButtons = Array.from(thumbsContainer?.querySelectorAll('[data-gallery-thumb]') || []);
    if (!mainImage || !thumbButtons.length) return;

    const slides = thumbButtons.map(b => ({
      src: b.dataset.src,
      srcset: b.dataset.srcset || '',
      sizes: b.dataset.sizes || '',
      width: b.dataset.width || '',
      height: b.dataset.height || '',
      alt: b.dataset.alt || ''
    }));
    let current = 0;

    function sync(index) {
      current = (index + slides.length) % slides.length;
      mainImage.src = slides[current].src;
      mainImage.srcset = slides[current].srcset || '';
      mainImage.sizes = slides[current].sizes || '';
      if (slides[current].width) mainImage.width = Number(slides[current].width);
      if (slides[current].height) mainImage.height = Number(slides[current].height);
      mainImage.alt = slides[current].alt;
      thumbButtons.forEach((b, i) => {
        b.classList.toggle('is-active', i === current);
        b.setAttribute('aria-current', i === current ? 'true' : 'false');
      });
      if (modalImage && modal && !modal.hidden) {
        modalImage.src = slides[current].src;
        modalImage.srcset = slides[current].srcset || '';
        modalImage.sizes = slides[current].sizes || '';
        if (slides[current].width) modalImage.width = Number(slides[current].width);
        if (slides[current].height) modalImage.height = Number(slides[current].height);
        modalImage.alt = slides[current].alt;
      }
    }

    function openModal() {
      if (!modal || !modalImage) return;
      lastFocused = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      sync(current);
      const focusTarget = modalClose || modalContent;
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
      }
    }

    function closeModal() {
      if (!modal) return;
      modal.hidden = true;
      document.body.style.overflow = '';
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function trapFocus(event) {
      if (!modal || modal.hidden) return;
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        modal.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('hidden'));

      if (!focusable.length) {
        event.preventDefault();
        modalContent?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    thumbButtons.forEach((b, i) => Events.on(b, 'click', () => sync(i)));
    if (prevBtn) Events.on(prevBtn, 'click', () => sync(current - 1));
    if (nextBtn) Events.on(nextBtn, 'click', () => sync(current + 1));
    if (fullscreenBtn) Events.on(fullscreenBtn, 'click', openModal);
    if (modalPrev) Events.on(modalPrev, 'click', () => sync(current - 1));
    if (modalNext) Events.on(modalNext, 'click', () => sync(current + 1));
    if (modalClose) Events.on(modalClose, 'click', closeModal);
    if (modal) {
      Events.on(modal, 'click', e => {
        if (e.target === modal) closeModal();
      });
    }
    Events.on(document, 'keydown', e => {
      if (!modal || modal.hidden) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') sync(current - 1);
      if (e.key === 'ArrowRight') sync(current + 1);
      trapFocus(e);
    });

    sync(0);
  }

  /* ===== PROJECT DATA ===== */

  function updatePageMeta(project, id) {
    const lang = getLang();
    const projectTitle = t(project.titleKey);
    const fullTitle = `${projectTitle} | Mr Dep Portfolio`;
    const projectDesc = t(project.descriptionKey);
    const base = 'https://mrdepdodep.github.io/portfolio/projects/detail/';
    const canonicalUrl = `${base}?id=${encodeURIComponent(id || '')}&lang=${encodeURIComponent(lang)}`;
    const defaultUrl = `${base}?id=${encodeURIComponent(id || '')}`;

    document.title = fullTitle;

    const pageTitle = document.querySelector('[data-project-title]');
    if (pageTitle) pageTitle.textContent = fullTitle;

    const setMeta = (sel, attr, val) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute(attr, val);
    };

    setMeta('meta[name="title"]', 'content', fullTitle);
    setMeta('meta[name="description"]', 'content', projectDesc);
    setMeta('link[rel="canonical"]', 'href', canonicalUrl);
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', projectDesc);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="twitter:title"]', 'content', fullTitle);
    setMeta('meta[property="twitter:description"]', 'content', projectDesc);
    setMeta('meta[property="twitter:url"]', 'content', canonicalUrl);

    const alternateMap = {
      en: `${base}?id=${encodeURIComponent(id || '')}&lang=en`,
      uk: `${base}?id=${encodeURIComponent(id || '')}&lang=uk`,
      ru: `${base}?id=${encodeURIComponent(id || '')}&lang=ru`,
      'x-default': defaultUrl
    };

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => {
      const hreflang = link.getAttribute('hreflang');
      if (hreflang && alternateMap[hreflang]) {
        link.setAttribute('href', alternateMap[hreflang]);
      }
    });

    const jsonLd = document.getElementById('project-jsonld');
    if (jsonLd) {
      jsonLd.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: fullTitle,
        url: canonicalUrl,
        description: projectDesc,
        author: { '@type': 'Person', name: 'Mr Dep', url: 'https://mrdepdodep.github.io/portfolio/' },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mrdepdodep.github.io/portfolio/' },
            { '@type': 'ListItem', position: 2, name: 'Projects', item: 'https://mrdepdodep.github.io/portfolio/projects/' },
            { '@type': 'ListItem', position: 3, name: projectTitle, item: canonicalUrl }
          ]
        }
      });
    }
  }

  function populatePage(project, id) {
    /* title */
    const titleEl = document.querySelector('[data-project-field="title"]');
    if (titleEl) {
      titleEl.dataset.i18n = project.titleKey;
      titleEl.textContent = t(project.titleKey);
    }

    updatePageMeta(project, id);

    /* description */
    const descEl = document.querySelector('[data-project-field="description"]');
    if (descEl) {
      descEl.dataset.i18n = project.descriptionKey;
      descEl.textContent = t(project.descriptionKey);
    }

    /* full description */
    const fullDescEl = document.querySelector('[data-project-field="fullDescription"]');
    if (fullDescEl) {
      fullDescEl.dataset.i18n = project.fullDescriptionKey;
      fullDescEl.textContent = t(project.fullDescriptionKey);
    }

    /* points */
    const pointsEl = document.querySelector('[data-project-points]');
    if (pointsEl) {
      pointsEl.textContent = '';
      project.pointKeys.forEach(key => {
        const li = document.createElement('li');
        li.dataset.i18n = key;
        li.textContent = t(key);
        pointsEl.appendChild(li);
      });
    }

    /* skills */
    const skillsEl = document.querySelector('[data-project-skills]');
    if (skillsEl) {
      skillsEl.textContent = '';
      project.skills.forEach(skill => {
        const span = document.createElement('span');
        span.className = 'project-skill';
        span.textContent = skill;
        skillsEl.appendChild(span);
      });
    }

    /* buttons */
    const codeBtn = document.querySelector('[data-project-code]');
    if (codeBtn) {
      codeBtn.href = project.codeUrl || '#';
      if (!project.codeUrl) codeBtn.setAttribute('aria-disabled', 'true');
    }
    const liveBtn = document.querySelector('[data-project-live]');
    if (liveBtn) {
      liveBtn.href = project.liveUrl || '#';
      const liveLabelKey = project.liveLabelKey || 'projects.detail.openProject';
      liveBtn.dataset.i18n = liveLabelKey;
      liveBtn.textContent = t(liveLabelKey);
      if (liveLabelKey.startsWith('projects.detail.download')) {
        liveBtn.setAttribute('download', '');
        liveBtn.setAttribute('target', '_self');
      } else {
        liveBtn.removeAttribute('download');
        liveBtn.setAttribute('target', '_blank');
      }
      if (!project.liveUrl) liveBtn.setAttribute('aria-disabled', 'true');
    }

    /* gallery */
    const thumbsContainer = document.querySelector('[data-gallery-thumbs]');
    const mainImage = document.querySelector('[data-gallery-main]');
    if (thumbsContainer && project.images?.length) {
      mainImage.src = project.images[0].src;
      if (project.images[0].srcset) mainImage.srcset = project.images[0].srcset;
      if (project.images[0].sizes) mainImage.sizes = project.images[0].sizes;
      if (project.images[0].width) mainImage.width = project.images[0].width;
      if (project.images[0].height) mainImage.height = project.images[0].height;
      mainImage.alt = project.images[0].alt;
      thumbsContainer.textContent = '';
      project.images.forEach(img => {
        const button = document.createElement('button');
        button.className = 'project-gallery-thumb';
        button.dataset.galleryThumb = '';
        button.dataset.src = img.src;
        if (img.srcset) button.dataset.srcset = img.srcset;
        if (img.sizes) button.dataset.sizes = img.sizes;
        if (img.width) button.dataset.width = String(img.width);
        if (img.height) button.dataset.height = String(img.height);
        button.dataset.alt = img.alt || '';
        button.type = 'button';

        const image = document.createElement('img');
        image.src = img.src;
        image.alt = img.alt || '';
        image.loading = 'lazy';
        if (img.srcset) image.srcset = img.srcset;
        if (img.sizes) image.sizes = img.sizes;
        if (img.width) image.width = img.width;
        if (img.height) image.height = img.height;

        button.appendChild(image);
        thumbsContainer.appendChild(button);
      });
    }

    /* readme */
    const readmeTarget = document.querySelector('[data-readme-target]');
    if (readmeTarget && project.readme) {
      loadReadme(readmeTarget, project.readme);
    }
  }

  function applyTranslations(project, id) {
    const lang = getLang();
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const text = window.TRANSLATIONS?.[lang]?.[key];
      if (text) el.textContent = text;
    });
    if (project) {
      updatePageMeta(project, id);
    }
  }

  function initDirectDownloadLinks() {
    Events.on(document, 'click', async e => {
      const link = e.target.closest('a[download]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const shouldForceBlobDownload = /raw\.githubusercontent\.com|github\.com\/.*\/raw\//.test(href);
      if (!shouldForceBlobDownload) return;

      e.preventDefault();
      try {
        const res = await fetch(href);
        if (!res.ok) throw new Error('download failed');

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const filename = decodeURIComponent(href.split('/').pop().split('?')[0]) || 'download.bin';

        const tempLink = document.createElement('a');
        tempLink.href = objectUrl;
        tempLink.download = filename;
        document.body.appendChild(tempLink);
        tempLink.click();
        tempLink.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (_) {
        window.location.href = href;
      }
    });
  }

  /* ===== INIT ===== */

  async function init() {
    Events.reset();

    const params = new URLSearchParams(window.location.search);
    let id = params.get('id');

    /* single-template mode */
    const dataPath = window.PROJECTS_DATA_PATH || '../../src/data/projects.json';
    let projects;
    try {
      const res = await fetch(dataPath);
      if (!res.ok) throw new Error('projects.json not found');
      projects = await res.json();
    } catch (e) {
      document.querySelector('.project-detail')?.insertAdjacentHTML('afterbegin',
        `<p style="color:#f87171;padding:2rem">${t('projects.detail.notFound')}</p>`);
      return;
    }

    if (!id) {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const maybeSlug = pathParts[pathParts.length - 1];
      if (projects[maybeSlug]) {
        id = maybeSlug;
      } else {
        id = Object.keys(projects)[0];
      }
    }

    const project = projects[id];
    if (!project) {
      window.location.href = '../';
      return;
    }

    /* wait for translations to be ready, then populate */
    function populate() {
      populatePage(project, id);
      initGallery();
      const firstImage = project.images?.[0];
      const modalImage = document.querySelector('[data-modal-image]');
      if (modalImage && firstImage) {
        modalImage.src = firstImage.src;
        modalImage.alt = firstImage.alt || 'Fullscreen preview';
        if (firstImage.srcset) modalImage.srcset = firstImage.srcset;
        if (firstImage.sizes) modalImage.sizes = firstImage.sizes;
        if (firstImage.width) modalImage.width = firstImage.width;
        if (firstImage.height) modalImage.height = firstImage.height;
        modalImage.loading = 'lazy';
      }
      document.querySelector('[data-detail-shell]')?.classList.remove('is-loading');
    }

    if (window.TRANSLATIONS && Object.keys(window.TRANSLATIONS).length) {
      populate();
    } else {
      Events.on(document, 'app:lang-changed', populate, { once: true });
      setTimeout(populate, 600);
    }

    Events.on(document, 'app:lang-changed', () => {
      applyTranslations(project, id);
      const readmeTgt = document.querySelector('[data-readme-target]');
      if (readmeTgt && project.readme) loadReadme(readmeTgt, project.readme);
    });

    initDirectDownloadLinks();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
