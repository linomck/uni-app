(() => {
  'use strict';

  const KEY = 'ausweis.v1';
  const DEFAULTS = {
    vorname: 'Sue',
    nachname: 'Nami',
    geburtsdatum: '01.01.1980',
    matrikelnummer: '108025258424',
    hoererstatus: 'Studierende*r',
    gueltigVon: '01.04.2026',
    gueltigBis: '30.09.2026'
  };

  const $ = (id) => document.getElementById(id);

  /* ---------- state ---------- */
  let data = load();
  let tab = 'aktuell';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  /* ---------- date helpers ---------- */
  // "TT.MM.JJJJ" -> Date (local midnight) | null
  function parseDE(s) {
    const m = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(String(s || ''));
    if (!m) return null;
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return isNaN(d) ? null : d;
  }

  function bucket() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = parseDE(data.gueltigVon);
    const to = parseDE(data.gueltigBis);
    if (to && to < today) return 'abgelaufen';
    if (from && from > today) return 'zukuenftig';
    return 'aktuell';
  }

  /* ---------- render ---------- */
  function render() {
    $('f-vorname').textContent = data.vorname;
    $('f-nachname').textContent = data.nachname;
    $('f-geburtsdatum').textContent = data.geburtsdatum;
    $('f-matrikelnummer').textContent = data.matrikelnummer;
    $('f-hoererstatus').textContent = data.hoererstatus;
    $('f-von').textContent = data.gueltigVon;
    $('f-bis').textContent = data.gueltigBis;

    const show = bucket() === tab;
    $('card-wrap').hidden = !show;
    $('empty').hidden = show;

    for (const b of document.querySelectorAll('.tab')) {
      b.classList.toggle('is-active', b.dataset.tab === tab);
    }
  }

  /* ---------- tabs ---------- */
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('.tab');
    if (!b) return;
    tab = b.dataset.tab;
    render();
  });

  /* ---------- clock ---------- */
  function tick() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    $('clock-text').textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- hidden long-press editor ---------- */
  const card = $('card');
  const HOLD_MS = 1500;
  const MOVE_TOL = 10;
  let timer = null, sx = 0, sy = 0;

  function cancelHold() {
    clearTimeout(timer);
    timer = null;
    card.classList.remove('is-pressing');
  }

  card.addEventListener('pointerdown', (e) => {
    sx = e.clientX; sy = e.clientY;
    card.classList.add('is-pressing');
    timer = setTimeout(() => {
      cancelHold();
      if (navigator.vibrate) navigator.vibrate(12);
      openSheet();
    }, HOLD_MS);
  });

  card.addEventListener('pointermove', (e) => {
    if (!timer) return;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > MOVE_TOL) cancelHold();
  });

  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
    card.addEventListener(ev, cancelHold);
  }
  card.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------- sheet ---------- */
  const sheet = $('sheet');
  const backdrop = $('backdrop');
  const form = $('form');
  const DATE_FIELDS = new Set(['geburtsdatum', 'gueltigVon', 'gueltigBis']);

  function toISODate(s) {
    const m = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(String(s || ''));
    if (!m) return '';
    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }

  function toDEDate(s) {
    const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(String(s || ''));
    if (!m) return s || '';
    return `${m[3]}.${m[2]}.${m[1]}`;
  }

  function openSheet() {
    for (const [k, v] of Object.entries(data)) {
      const el = form.elements[k];
      if (el) {
        el.value = DATE_FIELDS.has(k) ? toISODate(v) : v;
      }
    }
    sheet.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      sheet.classList.add('show');
      backdrop.classList.add('show');
    });
  }

  function closeSheet() {
    sheet.classList.remove('show');
    backdrop.classList.remove('show');
    setTimeout(() => { sheet.hidden = true; backdrop.hidden = true; }, 280);
  }

  $('save').addEventListener('click', () => {
    for (const k of Object.keys(DEFAULTS)) {
      const el = form.elements[k];
      if (el) {
        const val = el.value.trim();
        data[k] = DATE_FIELDS.has(k) ? toDEDate(val) : val;
      }
    }
    save();
    tab = bucket();          // follow the card if the dates moved it
    render();
    closeSheet();
  });

  $('cancel').addEventListener('click', closeSheet);
  backdrop.addEventListener('click', closeSheet);

  const btnRandMatrikel = $('btn-rand-matrikel');
  if (btnRandMatrikel) {
    let lastGen = 0;
    const generate = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const now = Date.now();
      if (now - lastGen < 200) return;
      lastGen = now;

      const rand9 = Math.floor(Math.random() * 1e9).toString().padStart(9, '0');
      const num = '108' + rand9;
      const el = form.elements['matrikelnummer'] || $('in-matrikel');
      if (el) {
        el.value = num;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    btnRandMatrikel.addEventListener('pointerdown', generate);
    btnRandMatrikel.addEventListener('click', generate);
  }

  $('reset').addEventListener('click', () => {
    data = { ...DEFAULTS };
    save();
    for (const [k, v] of Object.entries(data)) {
      const el = form.elements[k];
      if (el) {
        el.value = DATE_FIELDS.has(k) ? toISODate(v) : v;
      }
    }
    render();
  });

  /* ---------- theme ---------- */
  function getTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
  }

  const currentTheme = getTheme();
  setTheme(currentTheme);

  $('theme-btn').addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });

  /* ---------- init ---------- */
  tab = bucket();
  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
