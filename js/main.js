/* =========================================================
   C4U — main.js
   Navigation, scroll reveals, language switcher
   ========================================================= */

(function () {
  'use strict';

  // -------- Preloader / entry animation --------
  // The html element already has "is-loading" so scroll is locked from first paint.
  const preloader = document.getElementById('preloader');
  const PRELOADER_MIN = 2600; // ms — total duration of intro
  const startedAt = performance.now();

  // Force top + prevent any scroll that may have already happened (hash, browser restore)
  window.scrollTo(0, 0);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Belt-and-suspenders: block wheel/touchmove/keys while loading
  const blockEvent = (e) => {
    if (document.documentElement.classList.contains('is-loading')) {
      e.preventDefault();
    }
  };
  const blockedKeys = new Set(['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End', ' ']);
  const blockKey = (e) => {
    if (document.documentElement.classList.contains('is-loading') && blockedKeys.has(e.key)) {
      e.preventDefault();
    }
  };
  window.addEventListener('wheel', blockEvent, { passive: false });
  window.addEventListener('touchmove', blockEvent, { passive: false });
  window.addEventListener('keydown', blockKey);

  const finishPreloader = () => {
    if (!preloader) return;
    preloader.classList.add('is-done');
    document.documentElement.classList.remove('is-loading');
    window.scrollTo(0, 0);
    // Remove from DOM after fade-out
    setTimeout(() => {
      preloader && preloader.parentNode && preloader.parentNode.removeChild(preloader);
      window.removeEventListener('wheel', blockEvent);
      window.removeEventListener('touchmove', blockEvent);
      window.removeEventListener('keydown', blockKey);
    }, 1500);
  };

  const startFinish = () => {
    const elapsed = performance.now() - startedAt;
    const wait = Math.max(0, PRELOADER_MIN - elapsed);
    setTimeout(finishPreloader, wait);
  };

  if (document.readyState === 'complete') startFinish();
  else window.addEventListener('load', startFinish);

  // Safety net: if for any reason load doesn't fire (slow image etc.), force after 6s
  setTimeout(() => {
    if (document.documentElement.classList.contains('is-loading')) finishPreloader();
  }, 6000);

  // -------- Year --------
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // -------- Nav scroll state --------
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // -------- Mobile menu --------
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    navMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        navMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // -------- Active section highlight --------
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__menu a');
  const setActive = () => {
    const scrollPos = window.scrollY + (window.innerWidth <= 768 ? 80 : 110);
    let current = '';
    sections.forEach((sec) => {
      if (scrollPos >= sec.offsetTop) current = sec.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  };
  window.addEventListener('scroll', setActive, { passive: true });
  setActive();

  // -------- Scroll reveal --------
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  // -------- Language switcher --------
  const langSwitch = document.getElementById('langSwitch');
  const langCurrent = document.getElementById('langCurrent');
  if (langSwitch) {
    const trigger = langSwitch.querySelector('.lang-switch__current');
    const buttons = langSwitch.querySelectorAll('button[data-lang]');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = langSwitch.classList.toggle('open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!langSwitch.contains(e.target)) {
        langSwitch.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        applyLang(lang);
        langSwitch.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        try { localStorage.setItem('c4u_lang', lang); } catch (_) {}
      });
    });

    function applyLang(lang) {
      if (!window.I18N || !window.I18N[lang]) return;
      const dict = window.I18N[lang];
      document.documentElement.lang = lang;
      if (langCurrent) langCurrent.textContent = lang.toUpperCase();
      buttons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-lang') === lang));

      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const value = key.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), dict);
        if (value === null || value === undefined) return;
        if (el.tagName === 'META') {
          el.setAttribute('content', value);
        } else if (el.tagName === 'OPTION') {
          el.textContent = value;
        } else {
          // preserve HTML (allow simple tags like <br>, <strong>, <em>)
          el.innerHTML = value;
        }
      });

      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && dict.meta && dict.meta.description) {
        metaDesc.setAttribute('content', dict.meta.description);
      }

      // Title
      if (dict.meta && dict.meta.title) {
        document.title = dict.meta.title;
      }
    }

    // Init from storage or browser
    let initLang = 'it';
    try {
      const saved = localStorage.getItem('c4u_lang');
      if (saved && window.I18N && window.I18N[saved]) initLang = saved;
      else {
        const browser = (navigator.language || 'it').slice(0, 2).toLowerCase();
        if (window.I18N && window.I18N[browser]) initLang = browser;
      }
    } catch (_) {}
    applyLang(initLang);
  }

  // -------- Smooth focus for hash links (offset for sticky nav) --------
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length <= 1) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = window.innerWidth <= 768 ? 40 : 60;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      history.replaceState(null, '', href);
    });
  });
})();
