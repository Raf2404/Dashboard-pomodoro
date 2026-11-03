/* Minuteur Pomodoro — orbe liquide */
App.register({
  id: 'timer', title: 'Focus', icon: 'timer', size: 'L', zen: true, sizes: ['M', 'T', 'L'],
  defaults: {
    durations: { focus: 25, short: 5, long: 15 },
    longEvery: 4, autoBreak: true, autoFocus: false, sound: true, notify: false,
    mode: 'focus', running: false, endAt: 0, remaining: 1500, total: 1500, cycle: 0,
  },

  mount(ctx) {
    const d = ctx.data;
    const LABELS = { focus: 'focus', short: 'pause', long: 'longue pause' };
    const C = 2 * Math.PI * 102;

    const wave = (amp, len) => {
      let p = `M ${-len * 2} 0`;
      for (let x = -len * 2; x < 220 + len * 2; x += len) p += ` q ${len / 4} ${-amp} ${len / 2} 0 t ${len / 2} 0`;
      return p + ` V 240 H ${-len * 2} Z`;
    };

    ctx.body.innerHTML = `
      <div class="timer">
        <div class="seg t-seg" role="tablist">
          <span class="seg-pill"></span>
          <button data-m="focus" role="tab">Focus</button>
          <button data-m="short" role="tab">Pause</button>
          <button data-m="long" role="tab">Longue</button>
        </div>
        <div class="orb-wrap">
          <svg class="orb" viewBox="0 0 220 220" aria-hidden="true">
            <defs>
              <linearGradient id="t-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" class="st-a"/><stop offset="1" class="st-b"/>
              </linearGradient>
              <linearGradient id="t-water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="st-a" stop-opacity=".9"/><stop offset="1" class="st-b" stop-opacity=".95"/>
              </linearGradient>
              <radialGradient id="t-glass" cx=".35" cy=".25" r=".9">
                <stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".55" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/>
              </radialGradient>
              <clipPath id="t-clip"><circle cx="110" cy="110" r="90"/></clipPath>
            </defs>
            <circle class="orb-bg" cx="110" cy="110" r="90"/>
            <g clip-path="url(#t-clip)">
              <g class="lvl">
                <path class="wv wv-back" d="${wave(7, 120)}"/>
                <path class="wv wv-front" d="${wave(5, 84)}"/>
                <g class="bubbles">${Array.from({ length: 7 }, (_, i) => `<circle cx="${52 + i * 19}" cy="150" r="${1.4 + (i % 3) * 0.8}" style="--d:${(i * 1.3) % 5}s;--x:${(i % 2 ? 1 : -1) * 6}px"/>`).join('')}</g>
              </g>
            </g>
            <circle cx="110" cy="110" r="90" fill="url(#t-glass)" class="orb-shine"/>
            <circle class="ring-track" cx="110" cy="110" r="102"/>
            <circle class="ring-prog" cx="110" cy="110" r="102" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
            <circle class="ring-dot" cx="110" cy="8" r="4.5"/>
          </svg>
          <div class="orb-center">
            <div class="t-time">25:00</div>
            <div class="t-label">focus</div>
            <div class="t-dots"></div>
          </div>
        </div>
        <div class="t-controls">
          <button class="icon-btn" data-a="reset" title="Recommencer" aria-label="Recommencer">${icon('reset', 19)}</button>
          <button class="play-btn" data-a="toggle" aria-label="Lancer">${icon('play', 26)}</button>
          <button class="icon-btn" data-a="skip" title="Passer" aria-label="Passer">${icon('next', 19)}</button>
        </div>
      </div>`;

    const $b = s => ctx.body.querySelector(s);
    const timeEl = $b('.t-time'), labelEl = $b('.t-label'), dotsEl = $b('.t-dots');
    const ring = $b('.ring-prog'), dot = $b('.ring-dot'), lvl = $b('.lvl');
    const playBtn = $b('.play-btn'), seg = $b('.t-seg'), pill = $b('.seg-pill');

    // vagues animées
    const anims = [
      [$b('.wv-back'), 120, 7000, 1],
      [$b('.wv-front'), 84, 4200, -1],
    ].map(([el, len, dur, dir]) => el.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${dir * len}px)` }],
      { duration: dur, iterations: Infinity }));

    const total = () => d.durations[d.mode] * 60;
    const remaining = () => d.running ? Math.max(0, Math.ceil((d.endAt - Date.now()) / 1000)) : d.remaining;

    function placePill() {
      const on = seg.querySelector(`[data-m="${d.mode}"]`);
      if (!on || !on.offsetWidth) return;
      pill.style.width = on.offsetWidth + 'px';
      pill.style.transform = `translateX(${on.offsetLeft}px)`;
    }

    let lastSec = -1;
    function render(force) {
      const rem = remaining();
      if (rem === lastSec && !force) return;
      lastSec = rem;
      const t = d.total || total();
      const elapsed = clamp(1 - rem / t, 0, 1);
      timeEl.textContent = `${pad(Math.floor(rem / 60))}:${pad(rem % 60)}`;
      labelEl.textContent = LABELS[d.mode];
      ring.style.strokeDashoffset = C * (1 - elapsed);
      const a = elapsed * Math.PI * 2 - Math.PI / 2;
      dot.setAttribute('cx', 110 + Math.cos(a) * 102);
      dot.setAttribute('cy', 110 + Math.sin(a) * 102);
      const fill = d.mode === 'focus' ? elapsed : 1 - elapsed;
      lvl.style.transform = `translateY(${200 - fill * 186}px)`;
      ctx.el.classList.toggle('running', d.running);
      ctx.el.dataset.mode = d.mode;
      playBtn.innerHTML = icon(d.running ? 'pause' : 'play', 26);
      playBtn.setAttribute('aria-label', d.running ? 'Pause' : 'Lancer');
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === d.mode));
      const n = d.longEvery, done = d.cycle % n;
      dotsEl.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');
      document.title = d.running ? `${timeEl.textContent} · ${LABELS[d.mode]}` : 'Léa · Révisions';
      anims.forEach(an => { an.playbackRate = d.running ? 1 : 0.35; });
    }

    const emit = () => Bus.emit('timer:state', { running: d.running, mode: d.mode });

    function setMode(m) {
      d.mode = m; d.running = false; d.endAt = 0;
      d.total = d.remaining = total();
      ctx.save(); render(true); placePill(); emit();
    }
    function start() {
      Sound.get();
      if (d.remaining <= 0) d.remaining = d.total = total();
      d.running = true;
      d.endAt = Date.now() + d.remaining * 1000;
      ctx.save(); render(true); emit();
    }
    function pause() {
      d.remaining = remaining();
      d.running = false;
      ctx.save(); render(true); emit();
    }
    function notify(text) {
      if (d.notify && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification('Révisions', { body: text, icon: 'assets/icon-192.png', silent: true }); } catch { /* ignore */ }
      }
    }
    function finish(credited, quiet) {
      const wasFocus = d.mode === 'focus';
      let next = 'focus';
      if (wasFocus) {
        if (credited) {
          d.cycle++;
          App.addFocus(d.durations.focus);
          Bus.emit('focus:complete', { minutes: d.durations.focus });
          if (!quiet) { FX.petals(); toast('Session terminée, bravo !', 'sparkle'); }
        }
        next = credited && d.cycle % d.longEvery === 0 ? 'long' : 'short';
      }
      if (credited && !quiet) {
        if (d.sound) Sound.chime();
        notify(wasFocus ? 'Pause bien méritée ✨' : 'On s’y remet ?');
      }
      setMode(next);
      const auto = next === 'focus' ? d.autoFocus : d.autoBreak;
      if (credited && auto && !quiet) start();
    }

    seg.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b && b.dataset.m !== d.mode) setMode(b.dataset.m);
    });
    ctx.body.querySelector('.t-controls').addEventListener('click', e => {
      const a = e.target.closest('button')?.dataset.a;
      if (a === 'toggle') d.running ? pause() : start();
      if (a === 'reset') setMode(d.mode);
      if (a === 'skip') finish(false);
    });

    const onKey = e => {
      if (e.code !== 'Space' || isTyping() || document.body.classList.contains('has-modal') || App.editing) return;
      if (document.activeElement?.closest('button, a, [tabindex]')) return; // l'espace active déjà le bouton ciblé
      e.preventDefault();
      d.running ? pause() : start();
    };
    document.addEventListener('keydown', onKey);

    // reprise après rechargement
    if (d.running && d.endAt <= Date.now()) finish(true, true);
    if (!d.total) d.total = total();

    const iv = setInterval(() => {
      if (d.running && remaining() <= 0) finish(true);
      else render();
    }, 250);
    const ro = new ResizeObserver(placePill);
    ro.observe(seg);
    render(true);
    requestAnimationFrame(placePill);
    document.fonts && document.fonts.ready.then(placePill);
    emit();

    ctx.applyDurations = () => { if (!d.running) setMode(d.mode); };
    ctx.destroy = () => { clearInterval(iv); ro.disconnect(); document.removeEventListener('keydown', onKey); document.title = 'Léa · Révisions'; };
  },

  settings(ctx, el) {
    const d = ctx.data;
    const dur = k => v => { d.durations[k] = v; ctx.save(); ctx.applyDurations(); };
    el.append(
      UI.row('Focus', UI.stepper(d.durations.focus, { min: 1, max: 120, suffix: ' min' }, dur('focus')), 'timer'),
      UI.row('Pause', UI.stepper(d.durations.short, { min: 1, max: 60, suffix: ' min' }, dur('short')), 'feather'),
      UI.row('Longue pause', UI.stepper(d.durations.long, { min: 1, max: 90, suffix: ' min' }, dur('long')), 'moon'),
      UI.row('Longue pause tous les', UI.stepper(d.longEvery, { min: 2, max: 8 }, v => { d.longEvery = v; ctx.save(); ctx.applyDurations(); }), 'refresh'),
      h('hr'),
      UI.row('Enchaîner les pauses', UI.toggle(d.autoBreak, v => { d.autoBreak = v; ctx.save(); }), 'play'),
      UI.row('Enchaîner le focus', UI.toggle(d.autoFocus, v => { d.autoFocus = v; ctx.save(); }), 'next'),
      UI.row('Son', UI.toggle(d.sound, v => { d.sound = v; ctx.save(); if (v) Sound.chime(); }), 'volume'),
      UI.row('Notifications', UI.toggle(d.notify, async (v, inp) => {
        if (v && 'Notification' in window && Notification.permission !== 'granted') {
          const p = await Notification.requestPermission();
          if (p !== 'granted') { inp.checked = false; v = false; toast('Notifications refusées', 'bell'); }
        }
        d.notify = v; ctx.save();
      }), 'bell'),
      h('p', { class: 'hint', html: '<kbd>Espace</kbd> lancer / pause · <kbd>F</kbd> mode focus' }));
  },
});
