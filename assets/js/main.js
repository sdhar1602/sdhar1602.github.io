/* Soumyadeep Dhar: site interactions (no dependencies) */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const THEME_KEY = 'theme';
  const COLORS = { light: '#F5F1E8', dark: '#12110F' };
  const TZ = 'America/Los_Angeles';

  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  /* ------------------------------------------------------------ Theme -- */
  const currentTheme = () => (root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  function syncThemeUI() {
    const theme = currentTheme();
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-checked', String(theme === 'dark'));
    });
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', COLORS[theme]));
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    syncThemeUI();
  }

  function toggleTheme(event) {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    storage.set(THEME_KEY, next);

    if (!document.startViewTransition || reduceMotion.matches) {
      applyTheme(next);
      return;
    }

    // Circular "ink spill" reveal that grows out of the switch.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    root.classList.add('theme-vt');
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 720, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      })
      .catch(() => {});
    transition.finished.finally(() => root.classList.remove('theme-vt'));
  }

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => btn.addEventListener('click', toggleTheme));

  const onSystemChange = (e) => { if (!storage.get(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light'); };
  if (systemDark.addEventListener) systemDark.addEventListener('change', onSystemChange);
  syncThemeUI();

  /* ----------------------------------------------------------- Header -- */
  const header = document.querySelector('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------- Reveals -- */
  const revealables = document.querySelectorAll('.reveal, .reveal-arch');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    // An element fully hidden by its own clip-path never reports as intersecting
    // (Chrome), so arch reveals are triggered by watching their parent instead.
    const groups = new Map();
    revealables.forEach((el) => {
      const host = el.classList.contains('reveal-arch') && el.parentElement ? el.parentElement : el;
      if (!groups.has(host)) groups.set(host, []);
      groups.get(host).push(el);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (groups.get(entry.target) || []).forEach((el) => el.classList.add('is-in'));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    groups.forEach((_, host) => io.observe(host));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }
  window.__revealReady = true;

  /* ---------------------------------------------------- Stanford clock -- */
  const clockFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const clocks = document.querySelectorAll('[data-clock]');
  function tick() {
    const label = clockFmt.format(new Date());
    clocks.forEach((el) => { el.textContent = label; });
  }
  if (clocks.length) {
    tick();
    window.setInterval(tick, 30000);
  }

  /* ------------------------------------------------------- Copy email -- */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-copy');
      let ok = false;
      try {
        await navigator.clipboard.writeText(value);
        ok = true;
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
      }
      const label = btn.querySelector('[data-copy-label]');
      if (!label) return;
      const original = label.textContent;
      label.textContent = ok ? 'Copied' : 'Press ⌘C';
      btn.classList.toggle('is-copied', ok);
      window.setTimeout(() => {
        label.textContent = original;
        btn.classList.remove('is-copied');
      }, 1800);
    });
  });

  /* ----------------------------------------------------------- Videos -- */
  const cards = document.querySelectorAll('[data-video]');
  cards.forEach((card) => {
    const video = card.querySelector('video');
    const play = card.querySelector('.video-play');
    if (!video || !play) return;
    video.removeAttribute('controls'); // custom poster button first; native controls once playing
    play.hidden = false;
    play.addEventListener('click', () => {
      video.setAttribute('controls', '');
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
      card.classList.add('is-playing');
    });
    video.addEventListener('play', () => {
      card.classList.add('is-playing');
      cards.forEach((other) => {
        const v = other.querySelector('video');
        if (v && v !== video && !v.paused) v.pause();
      });
    });
    video.addEventListener('ended', () => card.classList.remove('is-playing'));
  });

  /* -------------------------------------------------- Reviewer 2 mode -- */
  document.querySelectorAll('[data-r2-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(on));
      document.body.classList.toggle('r2-on', on);
    });
  });

  /* ------------------------------------------------------------- Year -- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
