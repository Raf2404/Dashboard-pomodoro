/* Compte à rebours des partiels */
App.register({
  id: 'countdown', title: 'Partiels', icon: 'calendar', size: 'M',
  defaults: { events: [] },

  mount(ctx) {
    const d = ctx.data;
    ctx.addAction('plus', 'Ajouter un examen', () => add());
    const DAY = 86400000;
    const startOfDay = t => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
    const daysLeft = date => Math.round((startOfDay(date + 'T12:00') - startOfDay(Date.now())) / DAY);

    function draw() {
      const up = d.events.filter(e => daysLeft(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
      ctx.body.innerHTML = '';
      if (!up.length) {
        ctx.body.append(h('button', { class: 'empty clickable', onclick: add },
          h('span', { class: 'empty-ic', html: icon('calendar', 22) }), h('p', { text: 'Ajoute ton prochain partiel' })));
        return;
      }
      const [next, ...rest] = up;
      const n = daysLeft(next.date);
      const main = h('div', { class: 'cd-main' },
        h('div', { class: 'cd-num' }, h('small', { text: n === 0 ? '' : 'J-' }), h('b', { text: n === 0 ? 'Jour J' : n })),
        h('div', { class: 'cd-info' },
          h('p', { class: 'cd-name', text: next.name }),
          h('small', { text: new Date(next.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) })));
      const list = h('ul', { class: 'cd-list' }, rest.slice(0, 4).map(e =>
        h('li', {}, h('span', { text: e.name }), h('b', { text: 'J-' + daysLeft(e.date) }))));
      ctx.body.append(h('div', { class: 'cd' }, main, rest.length ? list : null));
    }

    function add() {
      const name = UI.input({ placeholder: 'Matière (ex : Droit pénal)', maxlength: 40 });
      const date = UI.input({ type: 'date', value: dayKey(new Date(Date.now() + 14 * 86400000)) });
      const body = h('form', { class: 'stack' }, name, date, h('button', { class: 'btn primary', type: 'submit', html: icon('plus', 16) + '<span>Ajouter</span>' }));
      const m = Modal.open({ title: 'Nouvel examen', icon: 'calendar', body });
      body.addEventListener('submit', e => {
        e.preventDefault();
        if (!name.value.trim() || !date.value) return;
        d.events.push({ id: uid(), name: name.value.trim(), date: date.value });
        ctx.save(); draw(); m.close();
      });
    }

    draw();
    const iv = setInterval(draw, 30 * 60000);
    ctx.redraw = draw;
    ctx.destroy = () => clearInterval(iv);
  },

  settings(ctx, el) {
    const d = ctx.data;
    const list = h('ul', { class: 'edit-list' });
    const draw = () => {
      list.innerHTML = '';
      if (!d.events.length) list.append(h('li', { class: 'muted', text: 'Aucun examen' }));
      [...d.events].sort((a, b) => a.date.localeCompare(b.date)).forEach(ev => list.append(h('li', {},
        h('span', { class: 'el-main', text: ev.name }),
        h('small', { text: new Date(ev.date + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }),
        h('button', { class: 'icon-btn xs', 'aria-label': 'Supprimer', html: icon('trash', 14), onclick: () => { d.events = d.events.filter(x => x !== ev); ctx.save(); draw(); ctx.redraw(); } }))));
    };
    draw();
    el.append(list);
  },
});
