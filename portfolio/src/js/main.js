// ===== SHARED CONFIG =====
const CONFIG = {
  DEFAULT_LANG: 'en',
  FLAGS: { en: '🇬🇧', uk: '🇺🇦', ru: '🇷🇺' },
  ROTATING_TITLES: {
    en: [
      'Python Automation Developer',
      'Automation Script Engineer',
      'Workflow Integration Specialist',
      'API Automation Developer',
      'Web Automation Engineer'
    ],
    uk: [
      'Розробник автоматизації на Python',
      'Інженер автоматизації скриптів',
      'Спеціаліст з інтеграції процесів',
      'Розробник API-автоматизації',
      'Інженер веб-автоматизації'
    ],
    ru: [
      'Разработчик автоматизации на Python',
      'Инженер автоматизации скриптов',
      'Специалист по интеграции процессов',
      'Разработчик API-автоматизации',
      'Инженер веб-автоматизации'
    ]
  },
  TITLE_ROTATE_INTERVAL: 5000,
  TOAST_DURATION: 3000
};

// ===== GLOBAL STATE =====
const State = {
  translations: {},
  currentLang: (() => {
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (['en', 'uk', 'ru'].includes(urlLang)) return urlLang;
    const saved = localStorage.getItem('lang');
    return ['en', 'uk', 'ru'].includes(saved) ? saved : CONFIG.DEFAULT_LANG;
  })()
};

window.TRANSLATIONS = State.translations;
window.currentLang = State.currentLang;
window.PageModules = window.PageModules || {};

// ===== UTILITIES =====
const Utils = {
  throttle(fn, limit) {
    let inThrottle;
    return (...args) => {
      if (inThrottle) return;
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    };
  },

  raf(callback) {
    return requestAnimationFrame(callback);
  }
};

window.AppCore = {
  getState: () => State,
  getConfig: () => CONFIG,
  getUtils: () => Utils
};

const Runtime = {
  isDev:
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
};

const Logger = {
  warn(...args) {
    console.warn('[Portfolio]', ...args);
  },
  error(...args) {
    console.error('[Portfolio]', ...args);
  }
};

const Paths = {
  getTranslationBasePath() {
    const path = window.location.pathname;
    if (path.includes('/projects/detail')) return '../../src/translations/';
    if (
      path.includes('/projects') ||
      path.includes('/about') ||
      path.includes('/work')
    ) {
      return '../src/translations/';
    }
    return 'src/translations/';
  }
};

const EventManager = {
  controller: new AbortController(),

  reset() {
    this.controller.abort();
    this.controller = new AbortController();
  },

  add(target, type, listener, options = {}) {
    if (!target?.addEventListener) return;
    target.addEventListener(type, listener, { ...options, signal: this.controller.signal });
  }
};

window.AppCore.getSignal = () => EventManager.controller.signal;

// ===== DATA LOADING =====
const DataLoader = {
  async loadTranslations() {
    try {
      const basePath = window.TRANSLATION_BASE_PATH || Paths.getTranslationBasePath();
      const [en, uk, ru] = await Promise.all([
        fetch(`${basePath}en.json`).then(r => (r.ok ? r.json() : {})),
        fetch(`${basePath}uk.json`).then(r => (r.ok ? r.json() : {})),
        fetch(`${basePath}ru.json`).then(r => (r.ok ? r.json() : {}))
      ]);

      Object.assign(State.translations, { en, uk, ru });
      window.TRANSLATIONS = State.translations;

      try {
        sessionStorage.setItem('translations', JSON.stringify(State.translations));
      } catch (e) {
        Logger.warn('Failed to cache translations:', e);
      }

      return true;
    } catch (error) {
      Logger.error('Failed to load translations:', error);

      try {
        const cached = sessionStorage.getItem('translations');
        if (cached) {
          Object.assign(State.translations, JSON.parse(cached));
          window.TRANSLATIONS = State.translations;
          return true;
        }
      } catch (e) {
        Logger.warn('Failed to load cached translations:', e);
      }

      return false;
    }
  }
};

// ===== TOAST SYSTEM =====
const Toast = {
  element: null,
  timeout: null,

  init() {
    this.element = document.getElementById('toast');
  },

  show(message, duration = null) {
    if (!this.element) return;

    const calcDuration = duration || Math.max(CONFIG.TOAST_DURATION, message.length * 50);

    clearTimeout(this.timeout);
    this.element.textContent = message;
    this.element.classList.add('show');

    this.timeout = setTimeout(() => this.hide(), calcDuration);
  },

  hide() {
    this.element?.classList.remove('show');
  },

  showPageSoon() {
    this.show(
      State.translations[State.currentLang]?.['toast.pageSoon'] ||
        'This page is not filled yet, but it will appear soon.'
    );
  }
};

window.AppCore.toast = Toast;

// ===== LANGUAGE SYSTEM =====
const Lang = {
  applyI18nAttributes(lang) {
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const attrMap = el.dataset.i18nAttr;
      if (!attrMap) return;

      attrMap.split('|').forEach(pair => {
        const [attr, key] = pair.split(':').map(v => v && v.trim());
        if (!attr || !key) return;

        const value = State.translations[lang]?.[key];
        if (value) {
          el.setAttribute(attr, value);
        }
      });
    });
  },

  translate(lang) {
    if (!State.translations[lang]) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const text = State.translations[lang]?.[el.dataset.i18n];
      if (text) el.textContent = text;
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const html = State.translations[lang]?.[el.dataset.i18nHtml];
      if (html) el.innerHTML = html;
    });
    this.applyI18nAttributes(lang);

    const btn = document.getElementById('currentLang');
    const flagEl = btn?.querySelector('.flag');
    if (flagEl) flagEl.textContent = CONFIG.FLAGS[lang] || CONFIG.FLAGS[CONFIG.DEFAULT_LANG];

    document.documentElement.lang = lang;

    document.querySelectorAll('.lang-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === lang);
    });

    State.currentLang = lang;
    window.currentLang = lang;
    localStorage.setItem('lang', lang);

    document.dispatchEvent(new CustomEvent('app:lang-changed', { detail: { lang } }));

    if (TitleRotator.elements.length) {
      TitleRotator.refresh();
    }

    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  },

  init() {
    this.translate(State.currentLang);

    const btn = document.getElementById('currentLang');
    const dropdown = document.getElementById('langDropdown');

    if (btn) {
      EventManager.add(btn, 'click', e => {
        e.stopPropagation();
        const isActive = dropdown?.classList.contains('active');
        btn.setAttribute('aria-expanded', String(!isActive));
        dropdown?.classList.toggle('active');
      });
    }

    EventManager.add(document, 'click', e => {
      if (dropdown && !btn?.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
        btn?.setAttribute('aria-expanded', 'false');
      }
    });

    document.querySelectorAll('.lang-option').forEach(opt => {
      EventManager.add(opt, 'click', () => {
        this.translate(opt.dataset.lang);
        dropdown?.classList.remove('active');
        btn?.setAttribute('aria-expanded', 'false');
      });
    });
  }
};

// ===== SKILL PILLS =====
const SkillPills = {
  enhance() {
    document.querySelectorAll('.project-skills[data-skill-pills]').forEach(container => {
      const raw = container.textContent
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

      if (!raw.length) return;

      container.innerHTML = raw
        .map(skill => `<span class="skill-pill">${skill}</span>`)
        .join('');
    });
  },

  init() {
    this.enhance();
    EventManager.add(document, 'app:lang-changed', () => this.enhance());
  }
};

// ===== TITLE ROTATOR (SHARED) =====
const TitleRotator = {
  elements: [],
  titles: [],
  index: 0,
  intervalId: null,

  getTitles(lang) {
    return CONFIG.ROTATING_TITLES[lang] || CONFIG.ROTATING_TITLES[CONFIG.DEFAULT_LANG];
  },

  render() {
    if (!this.elements.length || !this.titles.length) return;
    const value = this.titles[this.index];
    this.elements.forEach(el => {
      el.textContent = value;
    });
  },

  refresh() {
    this.titles = this.getTitles(State.currentLang);
    this.index = this.index % this.titles.length;
    this.render();
  },

  start() {
    if (!this.elements.length || this.titles.length < 2) return;
    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.index = (this.index + 1) % this.titles.length;
      this.render();
    }, CONFIG.TITLE_ROTATE_INTERVAL);
  },

  init() {
    this.elements = Array.from(document.querySelectorAll('[data-rotating-title="profile"]'));
    if (!this.elements.length) return;
    this.refresh();
    this.start();
  }
};

// ===== SHARED LINKS =====
const SmoothScroll = {
  init() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      EventManager.add(link, 'click', e => {
        const href = link.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
};

const SoonLinks = {
  init() {
    document.querySelectorAll('[data-soon-link]').forEach(link => {
      EventManager.add(link, 'click', e => {
        e.preventDefault();
        Toast.showPageSoon();
      });
    });
  }
};

const DiscordModal = {
  username: 'mrdepdodep',
  modal: null,
  dialog: null,
  copyBtn: null,
  lastFocused: null,
  focusableSelector: 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',

  init() {
    this.modal = document.getElementById('discordModal');
    if (!this.modal) return;

    this.dialog = this.modal.querySelector('.discord-modal-dialog');
    this.copyBtn = this.modal.querySelector('[data-discord-copy]');

    document.querySelectorAll('[data-discord-open]').forEach(btn => {
      EventManager.add(btn, 'click', e => {
        e.preventDefault();
        this.open(btn);
      });
    });

    this.modal.querySelectorAll('[data-discord-close]').forEach(btn => {
      EventManager.add(btn, 'click', () => this.close());
    });

    if (this.copyBtn) {
      EventManager.add(this.copyBtn, 'click', () => this.copyUsername());
    }

    EventManager.add(document, 'keydown', e => {
      if (!this.isOpen()) return;
      if (e.key === 'Escape') {
        this.close();
        return;
      }
      if (e.key === 'Tab') {
        this.trapFocus(e);
      }
    });
  },

  isOpen() {
    return !!this.modal && !this.modal.hidden;
  },

  open(triggerEl) {
    if (!this.modal) return;
    this.lastFocused = triggerEl || document.activeElement;
    this.modal.hidden = false;
    document.body.classList.add('modal-open');
    this.dialog?.setAttribute('tabindex', '-1');
    const focusable = this.getFocusableElements();
    (focusable[0] || this.dialog)?.focus();
  },

  close() {
    if (!this.modal) return;
    this.modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
      this.lastFocused.focus();
    }
  },

  async copyUsername() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.username);
      } else {
        this.copyUsernameFallback();
      }

      this.setCopiedState();
      const success =
        State.translations[State.currentLang]?.['toast.discordCopied'] ||
        'Discord username copied';
      Toast.show(success);
    } catch (error) {
      Logger.error('Failed to copy Discord username:', error);
      const failed =
        State.translations[State.currentLang]?.['toast.discordCopyFailed'] ||
        'Could not copy username. Please copy it manually.';
      Toast.show(failed);
    }
  },

  setCopiedState() {
    if (!this.copyBtn) return;
    this.copyBtn.classList.add('copied');
    const label = this.copyBtn.querySelector('.discord-copy-label');
    if (label) {
      const original = label.dataset.i18n
        ? (State.translations[State.currentLang]?.['discord.modal.copyButton'] || 'Copy username')
        : label.textContent;
      label.textContent = State.translations[State.currentLang]?.['discord.modal.copied'] || 'Copied!';
      setTimeout(() => {
        this.copyBtn.classList.remove('copied');
        label.textContent = original;
      }, 2000);
    } else {
      setTimeout(() => this.copyBtn.classList.remove('copied'), 2000);
    }
  },

  copyUsernameFallback() {
    const input = document.createElement('textarea');
    input.value = this.username;
    input.setAttribute('readonly', '');
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  },

  getFocusableElements() {
    if (!this.modal) return [];
    return Array.from(this.modal.querySelectorAll(this.focusableSelector)).filter(el => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.hasAttribute('disabled')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if (el.offsetParent === null && el !== document.activeElement) return false;
      return true;
    });
  },

  trapFocus(event) {
    const focusable = this.getFocusableElements();
    if (!focusable.length) {
      event.preventDefault();
      this.dialog?.focus();
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
};


// ===== HOME MODULE =====
// ===== HOME: SCROLL EFFECTS =====
const ScrollEffects = {
  nav: null,
  heroContent: null,
  heroVisual: null,
  sections: [],
  navLinks: [],
  ticking: false,

  init() {
    this.nav = document.querySelector('.nav');
    this.heroContent = document.querySelector('.hero-content');
    this.heroVisual = document.querySelector('.hero-visual');
    this.sections = document.querySelectorAll('section[id]');
    this.navLinks = document.querySelectorAll('.nav-link');

    const utils = window.AppCore?.getUtils?.();
    const throttle = utils?.throttle || ((fn) => fn);

    EventManager.add(window, 'scroll', throttle(() => this.onScroll(), 100));
  },

  onScroll() {
    if (this.ticking) return;

    this.ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;

      this.nav?.classList.toggle('scrolled', scrollY > 100);

      if (scrollY < window.innerHeight) {
        if (this.heroContent) {
          this.heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
          this.heroContent.style.opacity = String(Math.max(0, 1 - scrollY / 700));
        }
        if (this.heroVisual) {
          this.heroVisual.style.transform = `translateY(${scrollY * 0.15}px)`;
        }
      }

      let currentSection = '';
      this.sections.forEach(section => {
        if (scrollY >= section.offsetTop - 150) {
          currentSection = section.id;
        }
      });

      this.navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const isActive = href === `#${currentSection}`;
        link.classList.toggle('active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      this.ticking = false;
    });
  }
};

// ===== HOME: TERMINAL DEMO =====
const TerminalDemo = {
  scenarios: [
    {
      filename: 'automation.py',
      label: {
        en: 'Python Automation Developer',
        uk: 'Розробник автоматизації на Python',
        ru: 'Разработчик автоматизации на Python'
      },
      title: {
        en: 'Python Automation.<br><span class="gradient">Real Results.</span>',
        uk: 'Python Automation.<br><span class="gradient">Реальні результати.</span>',
        ru: 'Python Automation.<br><span class="gradient">Реальные результаты.</span>'
      },
      slogan: {
        en: 'I build scripts that eliminate manual work and free up time for things that matter.',
        uk: 'Створюю скрипти, які прибирають ручну рутину і звільняють час для важливого.',
        ru: 'Создаю скрипты, которые убирают ручную рутину и освобождают время для важного.'
      },
      code: [
        ['comment', '# Schedule & automate daily reports'],
        [''],
        ['keyword', 'import ', 'var', 'schedule', 'bracket', ', ', 'var', 'time'],
        [''],
        ['keyword', 'def ', 'func', 'send_report', 'bracket', '():'],
        ['plain', '  ', 'var', 'data', 'bracket', ' = ', 'func', 'fetch_data', 'bracket', '(', 'string', '"api/sales"', 'bracket', ')'],
        ['plain', '  ', 'var', 'pdf ', 'bracket', ' = ', 'func', 'make_report', 'bracket', '(', 'var', 'data', 'bracket', ')'],
        ['plain', '  ', 'func', 'email_send', 'bracket', '(', 'var', 'pdf', 'bracket', ')'],
        [''],
        ['var', 'schedule', 'bracket', '.', 'func', 'every', 'bracket', '().', 'var', 'day', 'bracket', '.', 'func', 'at', 'bracket', '(', 'string', '"09:00"', 'bracket', ').', 'func', 'do', 'bracket', '(', 'var', 'send_report', 'bracket', ')', 'cursor', '']
      ],
      output: {
        en: ['Fetched 247 records', 'PDF generated', 'Report sent to 12 users', 'Done in 1.2s'],
        uk: ['Отримано 247 записів', 'PDF згенеровано', 'Звіт надіслано 12 користувачам', 'Готово за 1.2 с'],
        ru: ['Получено 247 записей', 'PDF создан', 'Отчет отправлен 12 пользователям', 'Готово за 1.2 с']
      }
    },
    {
      filename: 'api_sync.py',
      label: {
        en: 'API Integration Specialist',
        uk: 'Спеціаліст з інтеграцій API',
        ru: 'Специалист по интеграциям API'
      },
      title: {
        en: 'Connect APIs.<br><span class="gradient">Zero Manual Work.</span>',
        uk: 'Інтеграція API.<br><span class="gradient">Нуль рутини.</span>',
        ru: 'Интеграция API.<br><span class="gradient">Ноль рутины.</span>'
      },
      slogan: {
        en: 'Wire up any service. I handle auth, retries, and data mapping.',
        uk: 'Підключаю будь-які сервіси: авторизація, ретраї, мапінг даних.',
        ru: 'Подключаю любые сервисы: авторизация, ретраи и маппинг данных.'
      },
      code: [
        ['comment', '# Async CRM sync via REST API'],
        [''],
        ['keyword', 'import ', 'var', 'httpx', 'bracket', ', ', 'var', 'asyncio'],
        [''],
        ['keyword', 'async def ', 'func', 'sync_crm', 'bracket', '(', 'var', 'customers', 'bracket', '):'],
        ['plain', '  ', 'keyword', 'async with ', 'var', 'httpx', 'bracket', '.', 'func', 'AsyncClient', 'bracket', '() as ', 'var', 'c', 'bracket', ':'],
        ['plain', '    ', 'var', 'jobs', 'bracket', ' = [', 'func', 'push', 'bracket', '(', 'var', 'c, x', 'bracket', ') for ', 'var', 'x', 'bracket', ' in ', 'var', 'customers', 'bracket', ']'],
        ['plain', '    ', 'keyword', 'return await ', 'var', 'asyncio', 'bracket', '.', 'func', 'gather', 'bracket', '(*', 'var', 'jobs', 'bracket', ')', 'cursor', '']
      ],
      output: {
        en: ['Connected to CRM API', '84 records synced', '0 errors detected', 'Done in 0.8s'],
        uk: ['Підключено CRM API', 'Синхронізовано 84 записи', 'Помилок не виявлено', 'Готово за 0.8 с'],
        ru: ['Подключено CRM API', 'Синхронизировано 84 записи', 'Ошибок не обнаружено', 'Готово за 0.8 с']
      }
    },
    {
      filename: 'scraper.py',
      label: {
        en: 'Web Automation Engineer',
        uk: 'Інженер веб-автоматизації',
        ru: 'Инженер веб-автоматизации'
      },
      title: {
        en: 'Scrape. Parse.<br><span class="gradient">Automate.</span>',
        uk: 'Збір. Парсинг.<br><span class="gradient">Автоматизація.</span>',
        ru: 'Сбор. Парсинг.<br><span class="gradient">Автоматизация.</span>'
      },
      slogan: {
        en: 'Turn any website into clean, structured data - reliably and at scale.',
        uk: 'Перетворюю будь-який сайт на чисті структуровані дані - надійно і в масштабі.',
        ru: 'Превращаю любой сайт в чистые структурированные данные - надежно и в масштабе.'
      },
      code: [
        ['comment', '# Playwright headless browser scraper'],
        [''],
        ['keyword', 'from ', 'var', 'playwright.sync_api', 'keyword', ' import ', 'func', 'sync_playwright'],
        [''],
        ['keyword', 'with ', 'func', 'sync_playwright', 'bracket', '() as ', 'var', 'p', 'bracket', ':'],
        ['plain', '  ', 'var', 'page', 'bracket', ' = ', 'var', 'p', 'bracket', '.', 'var', 'chromium', 'bracket', '.', 'func', 'launch', 'bracket', '().', 'func', 'new_page', 'bracket', '()'],
        ['plain', '  ', 'var', 'page', 'bracket', '.', 'func', 'goto', 'bracket', '(', 'string', '"https://target.com"', 'bracket', ')'],
        ['plain', '  ', 'var', 'items', 'bracket', ' = ', 'var', 'page', 'bracket', '.', 'func', 'query_selector_all', 'bracket', '(', 'string', '".item"', 'bracket', ')', 'cursor', '']
      ],
      output: {
        en: ['Browser launched', '136 items scraped', 'Data exported to CSV', 'Done in 2.1s'],
        uk: ['Браузер запущено', 'Зібрано 136 елементів', 'Дані експортовано в CSV', 'Готово за 2.1 с'],
        ru: ['Браузер запущен', 'Собрано 136 элементов', 'Данные экспортированы в CSV', 'Готово за 2.1 с']
      }
    }
  ],

  current: 0,
  isRunning: false,
  autoTimer: null,
  AUTO_INTERVAL: 7000,

  buildCodeHTML(lines) {
    return lines
      .map(parts => {
        if (!parts.length || (parts.length === 1 && parts[0] === '')) return '<span class="t-line"> </span>';
        let html = '<span class="t-line">';
        let i = 0;
        while (i < parts.length) {
          const type = parts[i];
          const text = parts[i + 1] ?? '';
          if (type === 'cursor') {
            html += '<span class="t-cursor"></span>';
            i += 1;
            continue;
          }
          if (type === 'plain') {
            html += this._esc(text);
            i += 2;
            continue;
          }
          html += `<span class="t-${type}">${this._esc(text)}</span>`;
          i += 2;
        }
        return html + '</span>';
      })
      .join('\n');
  },

  _esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  _getLang() {
    const lang = window.currentLang;
    return ['en', 'uk', 'ru'].includes(lang) ? lang : 'en';
  },

  _forLang(value, lang = this._getLang()) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
    return value[lang] || value.en || '';
  },

  _getScenario(idx) {
    const base = this.scenarios[idx];
    const lang = this._getLang();
    return {
      ...base,
      label: this._forLang(base.label, lang),
      title: this._forLang(base.title, lang),
      slogan: this._forLang(base.slogan, lang),
      output: this._forLang(base.output, lang)
    };
  },

  refreshLocale() {
    if (!this.bodyEl) return;
    this.render(this.current);
  },

  init() {
    this.bodyEl = document.getElementById('terminalBody');
    this.outputEl = document.getElementById('terminalOutput');
    this.titleEl = document.getElementById('terminalTitle');
    this.runBtn = document.getElementById('terminalRun');
    this.heroTitle = document.querySelector('.hero-title');
    this.heroLabel = document.querySelector('.hero-label');
    this.heroDesc = document.querySelector('.hero-description');

    if (!this.bodyEl) return;

    this.render(0);
    this.startAuto();
    if (this.runBtn) {
      EventManager.add(this.runBtn, 'click', () => {
        if (!this.isRunning) this.run();
      });
    }

    EventManager.add(document, 'app:lang-changed', () => this.refreshLocale());
  },

  render(idx) {
    const s = this._getScenario(idx);
    if (this.bodyEl) this.bodyEl.innerHTML = this.buildCodeHTML(s.code);
    if (this.titleEl) this.titleEl.textContent = s.filename;
    if (this.heroTitle) this.heroTitle.innerHTML = s.title;
    if (this.heroLabel) this.heroLabel.textContent = s.label;
    if (this.heroDesc) this.heroDesc.textContent = s.slogan;

    if (this.outputEl) {
      this.outputEl.innerHTML = '';
      this.outputEl.classList.remove('visible');
    }

    if (this.runBtn) {
      this.runBtn.classList.remove('running');
      this.runBtn.disabled = false;
    }
  },

  async run() {
    if (this.isRunning) return;
    this.isRunning = true;
    clearTimeout(this.autoTimer);

    const s = this._getScenario(this.current);
    this.runBtn?.classList.add('running');
    if (this.runBtn) this.runBtn.disabled = true;

    this.outputEl.classList.add('visible');
    this.outputEl.innerHTML = '';

    const runningLabel =
      window.TRANSLATIONS?.[window.currentLang]?.['terminal.running'] || 'Running...';

    const runLine = document.createElement('div');
    runLine.className = 't-output-line t-running';
    runLine.innerHTML = `<span class="t-spinner"></span>&nbsp;${runningLabel}`;
    this.outputEl.appendChild(runLine);

    await this._delay(700);
    runLine.remove();

    for (const line of s.output) {
      await this._delay(260);
      const el = document.createElement('div');
      el.className = 't-output-line';
      el.innerHTML = `<span class="t-check">✓</span>${line}`;
      this.outputEl.appendChild(el);
    }

    await this._delay(1600);
    const next = (this.current + 1) % this.scenarios.length;
    await this._switchTo(next);

    this.isRunning = false;
    this.startAuto();
  },

  async _switchTo(idx) {
    if (this.bodyEl) this.bodyEl.style.opacity = '0';
    if (this.outputEl) this.outputEl.style.opacity = '0';
    if (this.heroTitle) this.heroTitle.style.opacity = '0';
    if (this.heroDesc) this.heroDesc.style.opacity = '0';

    await this._delay(280);
    this.current = idx;
    this.render(idx);

    if (this.bodyEl) this.bodyEl.style.opacity = '1';
    if (this.outputEl) this.outputEl.style.opacity = '1';
    if (this.heroTitle) this.heroTitle.style.opacity = '1';
    if (this.heroDesc) this.heroDesc.style.opacity = '1';
  },

  startAuto() {
    clearTimeout(this.autoTimer);
    this.autoTimer = setTimeout(() => {
      if (!this.isRunning) this.run();
    }, this.AUTO_INTERVAL);
  },

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

window.PageModules = window.PageModules || {};
window.PageModules.home = function initHomePage() {
  ScrollEffects.init();
  TerminalDemo.init();
};

const ServiceWorkerManager = {
  async init() {
    if (!('serviceWorker' in navigator)) return;

    if (Runtime.isDev) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister()));
      } catch (error) {
        Logger.warn('Failed to unregister service workers in dev mode:', error);
      }
      return;
    }

    const isPortfolioProjectPath = window.location.pathname.startsWith('/portfolio/');
    const swPath = isPortfolioProjectPath ? '/portfolio/sw.js' : '/sw.js';

    try {
      await navigator.serviceWorker.register(swPath);
    } catch (error) {
      Logger.warn('Service worker registration failed:', error);
    }
  }
};

function initPageModule() {
  const bodyClass = document.body.className;

  if (bodyClass.includes('about-page')) {
    TitleRotator.init();
    window.PageModules.about?.();
  } else if (bodyClass.includes('work-page')) {
    window.PageModules.work?.();
  } else if (bodyClass.includes('projects-page')) {
    window.PageModules.projects?.();
  } else if (bodyClass.includes('project-detail-page')) {
    // Detail pages do not need home-specific modules.
  } else {
    window.PageModules.home?.();
  }
}

// ===== INITIALIZATION =====
async function init() {
  EventManager.reset();

  const loadingIndicator = document.querySelector('.loading-indicator');
  if (loadingIndicator) loadingIndicator.style.display = 'block';

  await DataLoader.loadTranslations();

  Toast.init();
  Lang.init();
  SkillPills.init();
  SmoothScroll.init();
  SoonLinks.init();
  DiscordModal.init();

  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
      disable: window.innerWidth < 768
    });
  }

  await ServiceWorkerManager.init();
  initPageModule();

  if (loadingIndicator) loadingIndicator.style.display = 'none';
}

if (document.readyState === 'complete') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init, { once: true });
}
