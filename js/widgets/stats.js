/* Progrès : temps de focus, objectif, semaine, série */
App.register({
  id: 'stats', title: 'Progrès', icon: 'chart', size: 'M',
  defaults: {},

  mount(ctx) {
    const st = () => Store.state.stats;
    const R = 34, C = 2 * Math.PI * R;
    const goalLabel = g => (g < 60 ? `${g} min` : `${Math.floor(g / 60)}h${g % 60 ? pad(g % 60) : ''}`);
    function draw() {
      const s = st();
      const today = s.days[dayKey()] || 0;
      const sessions = s.sessions[dayKey()] || 0;
      const pct = clamp(today / (s.goal || 120), 0, 1);
      const week = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        week.push({ k: dayKey(dt), m: s.days[dayKey(dt)] || 0, l: dt.toLocaleDateString('fr-FR', { weekday: 'narrow' }), today: i === 0 });
      }
      const max = Math.max(s.goal || 120, ...week.map(w => w.m));
      let streak = 0;
      for (let i = today ? 0 : 1; ; i++) {
        const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        if ((s.days[dayKey(dt)] || 0) > 0) streak++; else break;
      }
      ctx.body.innerHTML = `
        <div class="stats">
          <div class="goal">
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="${R}" class="g-track"/>
              <circle cx="40" cy="40" r="${R}" class="g-prog" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
            </svg>
            <div class="goal-c"><b>${fmtMinutes(today)}</b><small>/ ${goalLabel(s.goal || 120)}</small></div>
          </div>
          <div class="st-side">
            <div class="bars">${week.map(w => `<div class="bar${w.today ? ' today' : ''}" title="${Math.round(w.m)} min"><span style="--h:${(w.m / max) * 100}%"></span><small>${w.l}</small></div>`).join('')}</div>
            <div class="st-pills">
              <span title="Série de jours">${icon('flame', 14)} <b>${streak}</b></span>
              <span title="Sessions aujourd’hui">${icon('timer', 14)} <b>${sessions}</b></span>
            </div>
          </div>
        </div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const g = ctx.body.querySelector('.g-prog');
        if (g) g.style.strokeDashoffset = C * (1 - pct);
      }));
    }
    draw();
    const off = Bus.on('stats', draw);
    const iv = setInterval(draw, 10 * 60000);
    ctx.redraw = draw;
    ctx.destroy = () => { off(); clearInterval(iv); };
  },

  settings(ctx, el) {
    el.append(UI.row('Objectif quotidien', UI.stepper(Store.state.stats.goal, { min: 15, max: 600, step: 15, suffix: ' min' }, v => { Store.state.stats.goal = v; Store.save(); ctx.redraw(); }), 'sparkle'));
  },
});
