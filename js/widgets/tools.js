/* Outils & sites utiles en droit */
(() => {
  const ENGINES = [
    { name: 'Légifrance', url: q => 'https://www.legifrance.gouv.fr/search/all?tab_selection=all&searchField=ALL&query=' + q },
    { name: 'Judilibre', url: q => 'https://www.courdecassation.fr/recherche-judilibre?search_api_fulltext=' + q },
    { name: 'EUR-Lex', url: q => 'https://eur-lex.europa.eu/search.html?scope=EURLEX&type=quick&lang=fr&text=' + q },
    { name: 'Cairn', url: q => 'https://www.cairn.info/resultats_recherche.php?searchTerm=' + q },
    { name: 'Scholar', url: q => 'https://scholar.google.fr/scholar?hl=fr&q=' + q },
  ];
  const TINTS = ['#ffd6e4', '#e6dcff', '#ffe2d0', '#d6f0e2', '#dbe8ff', '#fff0cf'];
  const monogram = n => {
    const w = n.replace(/[’'.]/g, ' ').split(/[\s-]+/).filter(x => x.length > 1 && /^\p{L}/u.test(x));
    if (w.length > 1) return (w[0][0] + w[1][0]).toUpperCase();
    const x = w[0] || n;
    return x === x.toUpperCase() ? x.slice(0, 2) : x[0].toUpperCase() + x[1].toLowerCase();
  };

  App.register({
    id: 'tools', title: 'Outils', icon: 'scale', size: 'M',
    defaults: {
      engine: 0,
      links: [
        { name: 'Légifrance', url: 'https://www.legifrance.gouv.fr' },
        { name: 'Judilibre', url: 'https://www.courdecassation.fr/recherche-judilibre' },
        { name: 'Conseil d’État', url: 'https://www.conseil-etat.fr/decisions-de-justice/jurisprudence' },
        { name: 'Conseil constit.', url: 'https://www.conseil-constitutionnel.fr/decisions' },
        { name: 'EUR-Lex', url: 'https://eur-lex.europa.eu/homepage.html?locale=fr' },
        { name: 'CEDH', url: 'https://hudoc.echr.coe.int/fre' },
        { name: 'Dalloz', url: 'https://www.dalloz.fr' },
        { name: 'Lexis 360', url: 'https://www.lexis360intelligence.fr' },
        { name: 'Doctrine', url: 'https://www.doctrine.fr' },
        { name: 'Cairn', url: 'https://www.cairn.info' },
        { name: 'Vie publique', url: 'https://www.vie-publique.fr' },
        { name: 'Service public', url: 'https://www.service-public.fr' },
      ],
    },

    mount(ctx) {
      const d = ctx.data;
      ctx.body.innerHTML = `
        <div class="tools">
          <form class="t-search">
            <button type="button" class="engine" title="Changer de moteur"></button>
            <input class="field bare" placeholder="Rechercher un article, un arrêt…" aria-label="Recherche juridique">
            <button type="submit" class="icon-btn sm accent" aria-label="Rechercher">${icon('search', 16)}</button>
          </form>
          <div class="t-grid"></div>
        </div>`;
      const form = ctx.body.querySelector('form'), eng = form.querySelector('.engine'), inp = form.querySelector('input');
      const grid = ctx.body.querySelector('.t-grid');
      const drawEngine = () => { eng.innerHTML = `<span>${ENGINES[d.engine % ENGINES.length].name}</span>${icon('chevronD', 12)}`; };
      eng.addEventListener('click', () => { d.engine = (d.engine + 1) % ENGINES.length; ctx.save(); drawEngine(); eng.animate([{ transform: 'scale(.92)' }, { transform: 'scale(1)' }], { duration: 220 }); });
      form.addEventListener('submit', e => {
        e.preventDefault();
        const q = inp.value.trim(); if (!q) return;
        open(ENGINES[d.engine % ENGINES.length].url(encodeURIComponent(q)), '_blank', 'noopener');
      });
      function draw() {
        grid.innerHTML = '';
        d.links.forEach((l, i) => grid.append(h('a', { class: 'tool', href: l.url, target: '_blank', rel: 'noopener', title: l.name, style: { '--t': TINTS[i % TINTS.length], '--n': i } },
          h('span', { class: 'mono', text: monogram(l.name) }),
          h('small', { text: l.name }))));
        grid.append(h('button', { class: 'tool add', title: 'Ajouter', onclick: () => ctx.openSettings() }, h('span', { class: 'mono', html: icon('plus', 16) }), h('small', { text: 'Ajouter' })));
      }
      drawEngine(); draw();
      ctx.redraw = draw;
    },

    settings(ctx, el) {
      const d = ctx.data;
      const list = h('ul', { class: 'edit-list' });
      const draw = () => {
        list.innerHTML = '';
        d.links.forEach((l, i) => list.append(h('li', {},
          h('span', { class: 'el-main', text: l.name }),
          h('small', { text: (() => { try { return new URL(l.url).hostname.replace('www.', ''); } catch { return ''; } })() }),
          h('button', { class: 'icon-btn xs', 'aria-label': 'Supprimer', html: icon('trash', 14), onclick: () => { d.links.splice(i, 1); ctx.save(); draw(); ctx.redraw(); } }))));
      };
      draw();
      const name = UI.input({ placeholder: 'Nom', maxlength: 18 });
      const url = UI.input({ placeholder: 'https://…', type: 'url' });
      const form = h('form', { class: 'add-row' }, name, url, h('button', { class: 'icon-btn accent', type: 'submit', 'aria-label': 'Ajouter', html: icon('plus', 16) }));
      form.addEventListener('submit', e => {
        e.preventDefault();
        let u = url.value.trim();
        if (!u) { url.classList.add('err'); return; }
        if (!/^https?:\/\//.test(u)) u = 'https://' + u;
        d.links.push({ name: name.value.trim() || new URL(u).hostname.replace('www.', ''), url: u });
        name.value = url.value = '';
        ctx.save(); draw(); ctx.redraw();
      });
      el.append(h('div', { class: 'f-block' }, h('span', { class: 'f-label', text: 'Raccourcis' }), list), form);
    },
  });
})();
