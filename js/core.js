/* ==========================================================
   Noyau : utilitaires, stockage, bus d'événements, UI commune
   ========================================================== */
(() => {
  'use strict';

  /* ---------- utilitaires ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value' || k === 'checked' || k === 'selected') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const clone = o => JSON.parse(JSON.stringify(o));
  const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
  function merge(base, extra) {
    if (!isObj(base) || !isObj(extra)) return extra === undefined ? base : extra;
    const out = { ...base };
    for (const k of Object.keys(extra)) out[k] = isObj(base[k]) && isObj(extra[k]) ? merge(base[k], extra[k]) : extra[k];
    return out;
  }
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTyping = () => {
    const a = document.activeElement;
    return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
  };
  function relTime(date) {
    const s = (Date.now() - new Date(date).getTime()) / 1000;
    if (!isFinite(s)) return '';
    if (s < 60) return 'à l’instant';
    if (s < 3600) return `${Math.floor(s / 60)} min`;
    if (s < 86400) return `${Math.floor(s / 3600)} h`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} j`;
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  function fmtMinutes(m) {
    m = Math.round(m);
    if (m < 60) return `${m}<small>min</small>`;
    const hh = Math.floor(m / 60), mm = m % 60;
    return `${hh}<small>h</small>${mm ? pad(mm) : ''}`;
  }

  /* ---------- bus ---------- */
  const Bus = {
    _h: {},
    on(e, f) { (this._h[e] ||= []).push(f); return () => (this._h[e] = this._h[e].filter(x => x !== f)); },
    emit(e, d) { (this._h[e] || []).forEach(f => { try { f(d); } catch (err) { console.error(err); } }); },
  };

  /* ---------- stockage ---------- */
  const KEY = 'lea-dashboard-v1';
  const Store = {
    state: null,
    defaults() {
      return {
        v: 1,
        name: 'Léa',
        theme: 'rose',
        mode: 'light',
        font: 'classique',
        bg: { type: 'preset', preset: 'aurore', url: '', blur: 0, dim: 0, blobs: true, grain: true },
        glass: { blur: 22, alpha: 0.34 },
        layout: [],
        widgets: {},
        stats: { days: {}, sessions: {}, goal: 120 },
      };
    },
    load() {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { saved = {}; }
      this.state = merge(this.defaults(), saved);
      return this.state;
    },
    write() {
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); }
      catch (e) { console.warn(e); toast('Stockage plein', 'close'); }
    },
    exportJSON() { return JSON.stringify(this.state, null, 2); },
    importJSON(txt) {
      const data = JSON.parse(txt);
      if (!isObj(data)) throw new Error('format');
      localStorage.setItem(KEY, JSON.stringify(merge(this.defaults(), data)));
    },
    reset() { localStorage.removeItem(KEY); },
  };
  Store.save = debounce(() => Store.write(), 250);
  addEventListener('pagehide', () => Store.write());
  document.addEventListener('visibilitychange', () => { if (document.hidden) Store.write(); });

  /* ---------- fichiers (IndexedDB) ---------- */
  const DB = (() => {
    let p;
    const open = () => p ||= new Promise((res, rej) => {
      const r = indexedDB.open('lea-dashboard', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const tx = async (mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction('files', mode);
        const req = fn(t.objectStore('files'));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
      });
    };
    return {
      get: k => tx('readonly', s => s.get(k)),
      put: (k, v) => tx('readwrite', s => s.put(v, k)),
      del: k => tx('readwrite', s => s.delete(k)),
    };
  })();

  /* réduit une image avant de la stocker */
  async function downscale(file, max = 1800, quality = 0.86) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      if (r === 1 && file.size < 1.5e6) return file;
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * r);
      c.height = Math.round(img.naturalHeight * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', quality));
    } finally { URL.revokeObjectURL(url); }
  }

  function pickFiles({ accept = 'image/*', multiple = false } = {}) {
    return new Promise(res => {
      const inp = h('input', { type: 'file', accept, multiple, style: { display: 'none' } });
      inp.addEventListener('change', () => { res([...inp.files]); inp.remove(); });
      document.body.append(inp);
      inp.click();
    });
  }

  function download(name, text) {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- toasts ---------- */
  function toast(msg, ic = 'sparkle') {
    const root = $('#toasts');
    const t = h('div', { class: 'toast glass', role: 'status', html: icon(ic, 16) }, h('span', { text: msg }));
    root.append(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in')));
    setTimeout(() => { t.classList.remove('in'); t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 2800);
  }

  /* ---------- fenêtres ---------- */
  const Modal = {
    open({ title = '', icon: ic, body, wide = false, onClose } = {}) {
      const root = $('#modal-root');
      const wrap = h('div', { class: 'modal-wrap' });
      const card = h('div', { class: 'modal glass' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
      const content = h('div', { class: 'modal-body' });
      const head = h('div', { class: 'modal-head' },
        ic ? h('span', { class: 'w-icon', html: icon(ic) }) : null,
        h('h3', { text: title }),
        h('button', { class: 'icon-btn ghost', 'aria-label': 'Fermer', html: icon('close'), onclick: () => close() }));
      if (body) content.append(body);
      card.append(head, content);
      wrap.append(card);
      root.append(wrap);
      document.body.classList.add('has-modal');
      let closed = false;
      const onKey = e => { if (e.key === 'Escape' && root.lastElementChild === wrap) close(); };
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('pointerdown', e => { if (e.target === wrap) close(); });
      requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('in')));
      function close() {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey);
        wrap.classList.remove('in');
        wrap.classList.add('out');
        setTimeout(() => { wrap.remove(); if (!root.children.length) document.body.classList.remove('has-modal'); }, 320);
        onClose && onClose();
      }
      return { close, el: content, card };
    },
    confirm(text, okLabel = 'Confirmer') {
      return new Promise(res => {
        let ok = false;
        const body = h('div', { class: 'confirm' },
          h('p', { text }),
          h('div', { class: 'row end' },
            h('button', { class: 'btn ghost', text: 'Annuler', onclick: () => m.close() }),
            h('button', { class: 'btn primary', text: okLabel, onclick: () => { ok = true; m.close(); } })));
        const m = Modal.open({ title: '', body, onClose: () => res(ok) });
        m.card.classList.add('small');
      });
    },
  };

  /* ---------- petits composants de formulaire ---------- */
  const UI = {
    row(label, control, ic) {
      return h('label', { class: 'f-row' },
        ic ? h('span', { class: 'f-ic', html: icon(ic, 16) }) : null,
        h('span', { class: 'f-label', text: label }), control);
    },
    toggle(checked, onChange) {
      const inp = h('input', { type: 'checkbox', checked: !!checked, class: 'switch-input' });
      inp.addEventListener('change', () => onChange(inp.checked, inp));
      return h('span', { class: 'switch' }, inp, h('span', { class: 'switch-track' }, h('span', { class: 'switch-thumb' })));
    },
    stepper(value, { min = 1, max = 120, step = 1, suffix = '' } = {}, onChange) {
      let v = value;
      const out = h('output', { text: v + suffix });
      const set = nv => { v = clamp(nv, min, max); out.textContent = v + suffix; onChange(v); };
      return h('span', { class: 'stepper' },
        h('button', { type: 'button', class: 'icon-btn xs', 'aria-label': 'Moins', html: icon('minus', 14), onclick: e => { e.preventDefault(); set(v - step); } }),
        out,
        h('button', { type: 'button', class: 'icon-btn xs', 'aria-label': 'Plus', html: icon('plus', 14), onclick: e => { e.preventDefault(); set(v + step); } }));
    },
    slider(value, { min = 0, max = 100, step = 1 } = {}, onInput) {
      const inp = h('input', { type: 'range', min, max, step, value, class: 'range' });
      const paint = () => inp.style.setProperty('--p', ((inp.value - min) / (max - min)) * 100 + '%');
      paint();
      inp.addEventListener('input', () => { paint(); onInput(+inp.value); });
      return inp;
    },
    seg(options, value, onChange) {
      const wrap = h('div', { class: 'seg mini' });
      options.forEach(o => {
        const b = h('button', { type: 'button', class: o.value === value ? 'on' : '', html: (o.icon ? icon(o.icon, 15) : '') + (o.label ? `<span>${o.label}</span>` : ''), title: o.title || o.label || '' });
        b.addEventListener('click', () => { $$('button', wrap).forEach(x => x.classList.remove('on')); b.classList.add('on'); onChange(o.value); });
        wrap.append(b);
      });
      return wrap;
    },
    input(attrs) { return h('input', { class: 'field', ...attrs }); },
    empty(ic, text) { return h('div', { class: 'empty' }, h('span', { class: 'empty-ic', html: icon(ic, 22) }), h('p', { text })); },
  };

  /* ---------- effets ---------- */
  const HEART_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 21s-8-4.9-8-10.9A4.6 4.6 0 0 1 12 7.3a4.6 4.6 0 0 1 8 2.8C20 16.1 12 21 12 21z" fill="currentColor"/></svg>';
  const FX = {
    layer() { return $('#fx'); },
    hearts(x, y, n = 6, spread = 60) {
      if (reducedMotion()) n = Math.min(n, 2);
      const colors = ['var(--accent)', 'var(--accent-strong)', 'var(--accent-2)', '#ffb3c8'];
      for (let i = 0; i < n; i++) {
        const s = 10 + Math.random() * 12;
        const el = h('span', { class: 'fx-heart', html: HEART_SVG, style: { left: x + 'px', top: y + 'px', width: s + 'px', height: s + 'px', color: colors[i % colors.length] } });
        this.layer().append(el);
        const dx = (Math.random() - 0.5) * spread * 2, dy = -70 - Math.random() * 90, r = (Math.random() - 0.5) * 60;
        el.animate([
          { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.3}px), calc(-50% + ${dy * 0.3}px)) scale(1.1)`, opacity: 1, offset: 0.2 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.8) rotate(${r}deg)`, opacity: 0 },
        ], { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)', delay: i * 40 }).onfinish = () => el.remove();
      }
    },
    sparkles(x, y, n = 10) {
      for (let i = 0; i < n; i++) {
        const el = h('span', { class: 'fx-spark', style: { left: x + 'px', top: y + 'px' } });
        this.layer().append(el);
        const a = (i / n) * Math.PI * 2, d = 40 + Math.random() * 50;
        el.animate([
          { transform: 'translate(-50%,-50%) scale(0)', opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(1)`, opacity: 1, offset: 0.6 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px), calc(-50% + ${Math.sin(a) * d * 1.2}px)) scale(0)`, opacity: 0 },
        ], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => el.remove();
      }
    },
    petals(n = 36) {
      if (reducedMotion()) return;
      const colors = ['#ffc2d4', '#ffd9e5', '#e8d4ff', '#ffe0cc', '#fff'];
      for (let i = 0; i < n; i++) {
        const s = 8 + Math.random() * 10;
        const el = h('span', { class: 'fx-petal', style: { left: Math.random() * 100 + 'vw', width: s + 'px', height: s * 0.8 + 'px', background: colors[i % colors.length] } });
        this.layer().append(el);
        const sway = (Math.random() - 0.5) * 220;
        el.animate([
          { transform: 'translate(0,-5vh) rotate(0deg)', opacity: 0 },
          { opacity: 1, offset: 0.1 },
          { transform: `translate(${sway}px, 105vh) rotate(${360 + Math.random() * 360}deg)`, opacity: 0.9 },
        ], { duration: 3500 + Math.random() * 2500, delay: Math.random() * 900, easing: 'cubic-bezier(.3,.1,.6,1)' }).onfinish = () => el.remove();
      }
    },
    centerOf(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; },
  };

  /* ---------- sons doux (Web Audio, aucun fichier) ---------- */
  const Sound = {
    ctx: null,
    get() {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        this.ctx = new C();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, start, dur, vol = 0.15, type = 'sine') {
      const c = this.ctx;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(c.destination);
      o.start(start); o.stop(start + dur + 0.05);
    },
    chime() {
      const c = this.get(); if (!c) return;
      const t = c.currentTime + 0.02;
      [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => {
        this.tone(f, t + i * 0.17, 1.8, 0.12);
        this.tone(f * 2, t + i * 0.17, 0.9, 0.025);
      });
    },
    pop() {
      const c = this.get(); if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(620, t);
      o.frequency.exponentialRampToValueAtTime(1240, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.2);
    },
  };

  Object.assign(window, { $, $$, h, uid, debounce, clamp, pad, dayKey, clone, merge, isObj, relTime, fmtMinutes, reducedMotion, isTyping, Bus, Store, DB, downscale, pickFiles, download, toast, Modal, UI, FX, Sound });
})();
