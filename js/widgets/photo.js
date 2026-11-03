/* Widget photo : polaroïd, plein cadre ou médaillon, en diaporama */
App.register({
  id: 'photo', title: 'Souvenir', icon: 'image', size: 'T',
  defaults: { ids: [], captions: {}, style: 'polaroid', interval: 7 },

  mount(ctx) {
    const d = ctx.data;
    const urls = {};
    let idx = 0, iv = 0;
    ctx.addAction('plus', 'Ajouter des photos', () => add());

    async function add(files) {
      files = files || await pickFiles({ multiple: true });
      if (!files.length) return;
      for (const f of files) {
        if (!f.type.startsWith('image/')) continue;
        const id = uid();
        const blob = await downscale(f, 1400, 0.86);
        await DB.put('photo-' + id, blob);
        urls[id] = URL.createObjectURL(blob);
        d.ids.push(id);
      }
      idx = d.ids.length - 1;
      ctx.save();
      draw();
    }

    async function urlFor(id) {
      if (urls[id]) return urls[id];
      const b = await DB.get('photo-' + id).catch(() => null);
      if (!b) return '';
      return (urls[id] = URL.createObjectURL(b));
    }

    async function draw() {
      clearInterval(iv);
      ctx.el.dataset.pstyle = d.style;
      ctx.body.innerHTML = '';
      if (!d.ids.length) {
        ctx.body.append(h('button', { class: 'drop', onclick: () => add() },
          h('span', { class: 'empty-ic', html: icon('upload', 22) }),
          h('p', { text: 'Dépose une photo' })));
        return;
      }
      const frame = h('div', { class: `ph ph-${d.style}` });
      const stage = h('div', { class: 'ph-stage' });
      for (const id of d.ids) {
        const u = await urlFor(id);
        stage.append(h('div', { class: 'ph-img', 'data-id': id, style: { backgroundImage: u ? `url(${u})` : 'none' } }));
      }
      frame.append(stage);
      if (d.style === 'polaroid') {
        const cap = h('p', { class: 'ph-cap', contenteditable: 'true', spellcheck: 'false', 'data-ph': 'une légende…' });
        cap.addEventListener('input', () => { d.captions[d.ids[idx]] = cap.textContent; ctx.save(); });
        frame.append(cap);
      }
      if (d.ids.length > 1) {
        frame.append(
          h('button', { class: 'ph-nav l', 'aria-label': 'Précédente', html: icon('chevronL', 16), onclick: () => go(idx - 1) }),
          h('button', { class: 'ph-nav r', 'aria-label': 'Suivante', html: icon('chevron', 16), onclick: () => go(idx + 1) }),
          h('div', { class: 'ph-dots' }, d.ids.map((_, i) => h('i', { onclick: () => go(i) }))));
      }
      ctx.body.append(frame);
      go(Math.min(idx, d.ids.length - 1));
      if (d.ids.length > 1) iv = setInterval(() => go(idx + 1), d.interval * 1000);
    }

    function go(i) {
      idx = (i + d.ids.length) % d.ids.length;
      $$('.ph-img', ctx.body).forEach((el, k) => el.classList.toggle('on', k === idx));
      $$('.ph-dots i', ctx.body).forEach((el, k) => el.classList.toggle('on', k === idx));
      const cap = $('.ph-cap', ctx.body);
      if (cap && document.activeElement !== cap) cap.textContent = d.captions[d.ids[idx]] || '';
    }

    ctx.el.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) { e.preventDefault(); ctx.el.classList.add('dropping'); } });
    ctx.el.addEventListener('dragleave', () => ctx.el.classList.remove('dropping'));
    ctx.el.addEventListener('drop', e => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault(); ctx.el.classList.remove('dropping');
      add([...e.dataTransfer.files]);
    });

    draw();
    ctx.redraw = draw;
    ctx.remove = async id => {
      await DB.del('photo-' + id).catch(() => {});
      if (urls[id]) URL.revokeObjectURL(urls[id]);
      delete urls[id]; delete d.captions[id];
      d.ids = d.ids.filter(x => x !== id);
      idx = 0; ctx.save(); draw();
    };
    ctx.urlFor = urlFor;
    ctx.destroy = () => { clearInterval(iv); Object.values(urls).forEach(u => URL.revokeObjectURL(u)); };
  },

  settings(ctx, el) {
    const d = ctx.data;
    const thumbs = h('div', { class: 'thumbs' });
    const drawThumbs = async () => {
      thumbs.innerHTML = '';
      for (const id of d.ids) {
        const u = await ctx.urlFor(id);
        thumbs.append(h('div', { class: 'thumb', style: { backgroundImage: `url(${u})` } },
          h('button', { class: 'icon-btn xs', 'aria-label': 'Supprimer', html: icon('trash', 13), onclick: async () => { await ctx.remove(id); drawThumbs(); } })));
      }
      if (!d.ids.length) thumbs.append(h('p', { class: 'muted', text: 'Aucune photo' }));
    };
    drawThumbs();
    el.append(
      h('div', { class: 'f-block' }, h('span', { class: 'f-label', text: 'Style' }),
        UI.seg([{ value: 'polaroid', label: 'Polaroïd' }, { value: 'full', label: 'Plein cadre' }, { value: 'round', label: 'Médaillon' }], d.style, v => { d.style = v; ctx.save(); ctx.redraw(); })),
      UI.row('Défilement', UI.stepper(d.interval, { min: 3, max: 60, suffix: ' s' }, v => { d.interval = v; ctx.save(); ctx.redraw(); }), 'refresh'),
      h('div', { class: 'f-block' }, h('span', { class: 'f-label', text: 'Photos' }), thumbs));
  },
});
