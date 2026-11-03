/* Bloc-notes */
App.register({
  id: 'notes', title: 'Notes', icon: 'note', size: 'T',
  defaults: { text: '', hand: false },

  mount(ctx) {
    const d = ctx.data;
    const ta = h('textarea', { class: 'notes-area', placeholder: 'Une idée, une référence, un arrêt à retenir…', spellcheck: 'true', 'aria-label': 'Notes' });
    ta.value = d.text;
    const saved = h('span', { class: 'saved', html: icon('check', 13) });
    const save = debounce(() => { d.text = ta.value; ctx.save(); saved.classList.add('show'); setTimeout(() => saved.classList.remove('show'), 1200); }, 400);
    ta.addEventListener('input', save);
    ctx.body.append(h('div', { class: 'notes' + (d.hand ? ' hand' : '') }, ta, saved));
    ctx.setHand = v => { d.hand = v; ctx.save(); ctx.body.firstChild.classList.toggle('hand', v); };
  },

  settings(ctx, el) {
    el.append(UI.row('Écriture manuscrite', UI.toggle(ctx.data.hand, v => ctx.setHand(v)), 'feather'));
  },
});
