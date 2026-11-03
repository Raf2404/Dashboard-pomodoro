/* ==========================================================
   App : registre des widgets, mise en page, personnalisation
   ========================================================== */
(() => {
  'use strict';

  const THEMES = {
    rose:    { name: 'Rose poudré', accent: '#e89ab9', strong: '#cf6d96', a2: '#cdb6f4', a3: '#ffd2bf' },
    lavande: { name: 'Lavande',     accent: '#b7a1ee', strong: '#8b6fd6', a2: '#f2a9c8', a3: '#c6e1ff' },
    peche:   { name: 'Pêche',       accent: '#f3a78a', strong: '#d8775a', a2: '#f6bfd5', a3: '#ffe2b0' },
    sauge:   { name: 'Sauge',       accent: '#9fc6aa', strong: '#68997b', a2: '#f1bccc', a3: '#ebe3c2' },
    cerise:  { name: 'Cerise',      accent: '#e7738f', strong: '#c3466a', a2: '#ffb0c4', a3: '#ffd6c0' },
    nuage:   { name: 'Nuage',       accent: '#c7a8b6', strong: '#987383', a2: '#d6d0e6', a3: '#eee0d4' },
  };

  const BGS = {
    aurore:     { name: 'Aurore',     g: ['#fde3ec', '#f5e2f8', '#ffeadf'], b: ['#ffb6cf', '#d8c1ff', '#ffd3b8', '#ffe3f1'] },
    lavande:    { name: 'Lavande',    g: ['#ebe3ff', '#f8e6f6', '#e1ebff'], b: ['#c6b2ff', '#f5bddf', '#b7d4ff', '#efdfff'] },
    peche:      { name: 'Pêche',      g: ['#ffe7da', '#fff2e7', '#fde0e7'], b: ['#ffc0a3', '#ffd99c', '#ffb4c7', '#fff0c6'] },
    menthe:     { name: 'Menthe',     g: ['#e2f4eb', '#f5f1e6', '#fbe6ed'], b: ['#bce6cf', '#f7cadb', '#e3f0c1', '#d6eee6'] },
    nuage:      { name: 'Nuage',      g: ['#f8f4f6', '#efeaf3', '#fbf6f1'], b: ['#eadce5', '#e0dcf0', '#f4e5da', '#ffffff'] },
    cerise:     { name: 'Cerise',     g: ['#ffe1e9', '#ffd3de', '#fff1f1'], b: ['#ff9db6', '#ffc0d0', '#ffd5c2', '#ffaec6'] },
    crepuscule: { name: 'Crépuscule', g: ['#2a1830', '#4a2443', '#6c3553'], b: ['#b4527f', '#6b4aa0', '#e18aa2', '#3d2a5e'], dark: true },
    minuit:     { name: 'Minuit',     g: ['#14121f', '#221b33', '#2e1f36'], b: ['#5a3b8c', '#8c3d6c', '#2f4f8a', '#4a2c5e'], dark: true },
  };

  const FONTS = {
    classique: { name: 'Classique', display: '"Cormorant Garamond"', ui: '"DM Sans"' },
    editorial: { name: 'Éditorial', display: '"Fraunces"', ui: '"Manrope"' },
    moderne:   { name: 'Moderne',   display: '"Italiana"', ui: '"Jost"' },
  };

  const SIZES = ['S', 'M', 'T', 'L'];
  const SIZE_NAMES = { S: 'petit', M: 'large', T: 'haut', L: 'grand' };

  const App = {
    THEMES, BGS, FONTS,
    defs: new Map(),
    ctxs: {},
    editing: false,
    zen: false,
    bgURL: null,

    register(def) { this.defs.set(def.id, def); },

    /* données d'un widget : complétées sur place pour garder la même référence */
    data(id) {
      const s = Store.state, defs = this.defs.get(id)?.defaults || {};
      const fill = (t, d) => {
        for (const k of Object.keys(d)) {
          if (t[k] === undefined) t[k] = clone(d[k]);
          else if (isObj(t[k]) && isObj(d[k])) fill(t[k], d[k]);
        }
        return t;
      };
      return (s.widgets[id] = fill(isObj(s.widgets[id]) ? s.widgets[id] : {}, defs));
    },

    addFocus(minutes) {
      const st = Store.state.stats, k = dayKey();
      st.days[k] = (st.days[k] || 0) + minutes;
      st.sessions[k] = (st.sessions[k] || 0) + 1;
      Store.save();
      Bus.emit('stats', st);
    },

    /* ---------- démarrage ---------- */
    init() {
      Store.load();
      const s = Store.state;
      // compléter la mise en page avec les widgets connus
      const known = new Set(s.layout.map(l => l.id));
      for (const [id, def] of this.defs) if (!known.has(id)) s.layout.push({ id, size: def.size || 'S', on: def.on !== false });
      s.layout = s.layout.filter(l => this.defs.has(l.id));
      for (const id of this.defs.keys()) this.data(id);

      this.applyLook();
      this.renderGrid();
      this.initHeader();
      this.initPointerGlow();
      this.bindShortcuts();
      Store.save();
      requestAnimationFrame(() => document.body.classList.add('ready'));
    },

    /* ---------- grille ---------- */
    renderGrid() {
      const grid = $('#grid');
      grid.innerHTML = '';
      let i = 0;
      for (const item of Store.state.layout) {
        if (!item.on) continue;
        grid.append(this.buildWidget(item, i++));
      }
      this.sortable = Sortable.create(grid, {
        animation: 280,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        disabled: true,
        draggable: '.widget',
        filter: '.w-edit button',
        preventOnFilter: false,
        ghostClass: 'w-ghost',
        chosenClass: 'w-chosen',
        dragClass: 'w-drag',
        onEnd: () => this.syncOrder(),
      });
    },

    buildWidget(item, idx = 0) {
      const def = this.defs.get(item.id);
      const el = h('section', { class: `widget glass size-${item.size} w-${def.id}`, 'data-id': def.id, style: { '--i': idx }, 'aria-label': def.title });
      if (def.zen) el.dataset.zen = '1';
      const actions = h('div', { class: 'w-actions' });
      const head = h('header', { class: 'w-head' },
        h('span', { class: 'w-icon', html: icon(def.icon, 17) }),
        h('h2', { class: 'w-title', text: def.title }),
        actions);
      const body = h('div', { class: 'w-body' });
      const sizeBtn = h('button', { class: 'chip-btn', title: 'Changer la taille', html: icon('resize', 15) + `<span>${SIZE_NAMES[item.size]}</span>`, onclick: () => this.cycleSize(def.id) });
      const edit = h('div', { class: 'w-edit' },
        h('span', { class: 'w-handle', html: icon('drag', 18) }),
        h('div', { class: 'w-edit-btns' },
          sizeBtn,
          h('button', { class: 'chip-btn', title: 'Masquer', html: icon('eyeoff', 15), onclick: () => this.toggle(def.id, false) })));
      el.append(head, body, edit);

      const ctx = {
        id: def.id, el, body, head, actions,
        data: this.data(def.id),
        save: () => Store.save(),
        size: () => item.size,
        addAction: (ic, title, fn) => {
          const b = h('button', { class: 'icon-btn sm', title, 'aria-label': title, html: icon(ic, 16), onclick: fn });
          actions.prepend(b);
          return b;
        },
        openSettings: () => this.openSettings(def, ctx),
        sizeBtn,
      };
      if (def.settings) actions.append(h('button', { class: 'icon-btn sm', title: 'Réglages', 'aria-label': 'Réglages', html: icon('dots', 16), onclick: () => this.openSettings(def, ctx) }));
      try { def.mount(ctx); } catch (e) { console.error(e); body.append(UI.empty('close', 'Oups, ce widget a eu un souci.')); }
      this.ctxs[def.id] = ctx;
      return el;
    },

    openSettings(def, ctx) {
      const body = h('div', { class: 'settings' });
      def.settings(ctx, body);
      Modal.open({ title: def.title, icon: def.icon, body, onClose: () => ctx.onSettingsClose && ctx.onSettingsClose() });
    },

    syncOrder() {
      const s = Store.state;
      const ids = $$('#grid .widget').map(w => w.dataset.id);
      const visible = ids.map(id => s.layout.find(l => l.id === id));
      const hidden = s.layout.filter(l => !ids.includes(l.id));
      s.layout = [...visible, ...hidden];
      Store.save();
    },

    cycleSize(id) {
      const item = Store.state.layout.find(l => l.id === id);
      const def = this.defs.get(id);
      const allowed = def.sizes || SIZES;
      item.size = allowed[(allowed.indexOf(item.size) + 1) % allowed.length];
      const ctx = this.ctxs[id];
      ctx.el.classList.remove(...SIZES.map(s => 'size-' + s));
      ctx.el.classList.add('size-' + item.size);
      ctx.sizeBtn.querySelector('span').textContent = SIZE_NAMES[item.size];
      ctx.onResize && ctx.onResize(item.size);
      Store.save();
    },

    toggle(id, on) {
      const s = Store.state;
      const item = s.layout.find(l => l.id === id);
      if (!item || item.on === on) return;
      item.on = on;
      if (on) {
        s.layout = [...s.layout.filter(l => l !== item), item];
        const el = this.buildWidget(item);
        el.classList.add('appear');
        $('#grid').append(el);
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        const ctx = this.ctxs[id];
        if (ctx) {
          ctx.destroy && ctx.destroy();
          ctx.el.classList.add('vanish');
          setTimeout(() => ctx.el.remove(), 380);
          delete this.ctxs[id];
        }
      }
      Store.save();
      const sw = $(`#drawer [data-w="${id}"] input`);
      if (sw) sw.checked = on;
    },

    /* ---------- apparence ---------- */
    async applyLook() {
      const s = Store.state, root = document.documentElement;
      const t = THEMES[s.theme] || THEMES.rose;
      root.style.setProperty('--accent', t.accent);
      root.style.setProperty('--accent-strong', t.strong);
      root.style.setProperty('--accent-2', t.a2);
      root.style.setProperty('--accent-3', t.a3);
      root.dataset.mode = s.mode;
      const f = FONTS[s.font] || FONTS.classique;
      root.style.setProperty('--font-display', `${f.display}, "Cormorant Garamond", Georgia, serif`);
      root.style.setProperty('--font-ui', `${f.ui}, "DM Sans", system-ui, sans-serif`);
      root.dataset.font = s.font;
      root.style.setProperty('--glass-blur', s.glass.blur + 'px');
      root.style.setProperty('--glass-alpha', s.glass.alpha);

      const b = BGS[s.bg.preset] || BGS.aurore;
      b.g.forEach((c, i) => root.style.setProperty(`--bg-${i + 1}`, c));
      b.b.forEach((c, i) => root.style.setProperty(`--blob-${i + 1}`, c));
      const bg = $('#bg');
      bg.classList.toggle('no-blobs', !s.bg.blobs);
      bg.classList.toggle('no-grain', !s.bg.grain);
      root.style.setProperty('--bg-blur', s.bg.blur + 'px');
      root.style.setProperty('--bg-dim', s.bg.dim / 100);

      let url = '';
      if (s.bg.type === 'upload') {
        if (!this.bgURL) {
          try {
            const blob = await DB.get('bg-image');
            if (blob) this.bgURL = URL.createObjectURL(blob);
          } catch (e) { console.warn(e); }
        }
        url = this.bgURL || '';
      } else if (s.bg.type === 'url') url = s.bg.url;
      const img = $('.bg-image');
      img.style.backgroundImage = url ? `url("${url.replace(/"/g, '%22')}")` : 'none';
      bg.classList.toggle('has-image', !!url);
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.content = s.mode === 'dark' ? '#2a1a2c' : b.g[0];
      $('#greet-name').textContent = s.name || '';
    },

    /* ---------- en-tête ---------- */
    initHeader() {
      const tick = () => {
        const d = new Date();
        const hr = d.getHours();
        $('#clock').innerHTML = `${pad(hr)}<span class="colon">:</span>${pad(d.getMinutes())}`;
        $('#date').textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        $('#greet-word').textContent = hr < 5 ? 'Douce nuit' : hr < 12 ? 'Bonjour' : hr < 18 ? 'Bel après-midi' : hr < 22 ? 'Bonsoir' : 'Douce nuit';
      };
      tick();
      setInterval(tick, 5000);
      $('#btn-custom').addEventListener('click', () => this.openDrawer());
      $('#btn-edit').addEventListener('click', () => this.setEditing(!this.editing));
      $('#btn-zen').addEventListener('click', () => this.setZen(!this.zen));
      $('#edit-done').addEventListener('click', () => this.setEditing(false));
      $('#edit-add').addEventListener('click', () => this.openDrawer('widgets'));
      $('#zen-exit').addEventListener('click', () => this.setZen(false));
      $('#scrim').addEventListener('click', () => this.closeDrawer());
    },

    setEditing(on) {
      if (on && this.zen) this.setZen(false);
      this.editing = on;
      document.body.classList.toggle('editing', on);
      $('#btn-edit').classList.toggle('active', on);
      this.sortable.option('disabled', !on);
    },

    setZen(on) {
      if (on && this.editing) this.setEditing(false);
      this.zen = on;
      document.body.classList.toggle('zen', on);
      $('#btn-zen').classList.toggle('active', on);
      if (on) {
        // s'assurer que le minuteur est visible
        if (!Store.state.layout.find(l => l.id === 'timer').on) this.toggle('timer', true);
        scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    bindShortcuts() {
      document.addEventListener('keydown', e => {
        if (isTyping() || document.body.classList.contains('has-modal')) return;
        if (e.key === 'Escape') {
          if ($('#drawer').classList.contains('open')) this.closeDrawer();
          else if (this.zen) this.setZen(false);
          else if (this.editing) this.setEditing(false);
        }
        if (e.key === 'f' && !e.metaKey && !e.ctrlKey) this.setZen(!this.zen);
      });
    },

    initPointerGlow() {
      let raf = 0, last;
      document.addEventListener('pointermove', e => {
        last = e;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const w = last.target.closest && last.target.closest('.widget');
          if (!w) return;
          const r = w.getBoundingClientRect();
          w.style.setProperty('--mx', last.clientX - r.left + 'px');
          w.style.setProperty('--my', last.clientY - r.top + 'px');
        });
      }, { passive: true });
    },

    /* ---------- tiroir de personnalisation ---------- */
    openDrawer(section) {
      const d = $('#drawer');
      this.buildDrawer();
      d.classList.add('open');
      $('#scrim').classList.add('show');
      if (section) setTimeout(() => $(`#drawer [data-sec="${section}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260);
    },
    closeDrawer() {
      $('#drawer').classList.remove('open');
      $('#scrim').classList.remove('show');
    },

    buildDrawer() {
      const s = Store.state;
      const d = $('#drawer');
      d.innerHTML = '';
      const apply = () => { this.applyLook(); Store.save(); };
      const sec = (key, title, ...kids) => h('section', { class: 'd-sec', 'data-sec': key }, h('h4', { text: title }), ...kids);

      // Thème
      const swatches = h('div', { class: 'swatches' });
      for (const [k, t] of Object.entries(THEMES)) {
        const b = h('button', { class: 'swatch' + (s.theme === k ? ' on' : ''), title: t.name, 'aria-label': t.name, style: { '--c1': t.accent, '--c2': t.a2, '--c3': t.a3 } });
        b.addEventListener('click', () => { s.theme = k; $$('.swatch', swatches).forEach(x => x.classList.remove('on')); b.classList.add('on'); apply(); });
        swatches.append(b);
      }
      const mode = UI.seg([{ value: 'light', icon: 'sun', label: 'Jour' }, { value: 'dark', icon: 'moon', label: 'Nuit' }], s.mode, v => { s.mode = v; apply(); });

      // Fond
      const bgs = h('div', { class: 'bg-tiles' });
      const markBg = () => $$('.bg-tile', bgs).forEach(x => x.classList.toggle('on', (s.bg.type === 'preset' && x.dataset.k === s.bg.preset) || (s.bg.type !== 'preset' && x.dataset.k === '_img')));
      for (const [k, b] of Object.entries(BGS)) {
        const t = h('button', { class: 'bg-tile', 'data-k': k, title: b.name, 'aria-label': b.name, style: { background: `radial-gradient(circle at 25% 30%, ${b.b[0]}, transparent 55%), radial-gradient(circle at 80% 70%, ${b.b[1]}, transparent 55%), linear-gradient(135deg, ${b.g.join(',')})` } });
        t.addEventListener('click', () => {
          s.bg.type = 'preset'; s.bg.preset = k;
          if (b.dark && s.mode !== 'dark') { s.mode = 'dark'; this.buildDrawer(); }
          markBg(); apply();
        });
        bgs.append(t);
      }
      const imgTile = h('button', { class: 'bg-tile img-tile', 'data-k': '_img', title: 'Ma photo', html: icon('upload', 18) });
      if (this.bgURL && s.bg.type === 'upload') imgTile.style.backgroundImage = `url(${this.bgURL})`;
      imgTile.addEventListener('click', async () => {
        const [file] = await pickFiles();
        if (!file) return;
        const blob = await downscale(file, 2400, 0.88);
        await DB.put('bg-image', blob);
        if (this.bgURL) URL.revokeObjectURL(this.bgURL);
        this.bgURL = URL.createObjectURL(blob);
        imgTile.style.backgroundImage = `url(${this.bgURL})`;
        s.bg.type = 'upload';
        markBg(); apply();
        toast('Fond mis à jour', 'image');
      });
      bgs.append(imgTile);
      markBg();
      const urlIn = UI.input({ type: 'url', placeholder: 'ou colle le lien d’une image…', value: s.bg.type === 'url' ? s.bg.url : '' });
      urlIn.addEventListener('change', () => {
        const v = urlIn.value.trim();
        if (v) { s.bg.type = 'url'; s.bg.url = v; } else if (s.bg.type === 'url') s.bg.type = 'preset';
        markBg(); apply();
      });

      // Typo
      const fonts = h('div', { class: 'font-opts' });
      for (const [k, f] of Object.entries(FONTS)) {
        const b = h('button', { class: 'font-opt' + (s.font === k ? ' on' : '') },
          h('span', { class: 'aa', style: { fontFamily: f.display }, text: 'Aa' }),
          h('small', { style: { fontFamily: f.ui }, text: f.name }));
        b.addEventListener('click', () => { s.font = k; $$('.font-opt', fonts).forEach(x => x.classList.remove('on')); b.classList.add('on'); apply(); });
        fonts.append(b);
      }

      // Widgets
      const wl = h('div', { class: 'w-list' });
      for (const item of s.layout) {
        const def = this.defs.get(item.id);
        wl.append(h('div', { class: 'w-row', 'data-w': item.id },
          h('span', { class: 'w-icon', html: icon(def.icon, 16) }),
          h('span', { class: 'w-name', text: def.title }),
          UI.toggle(item.on, v => this.toggle(item.id, v))));
      }

      // Prénom
      const nameIn = UI.input({ value: s.name, placeholder: 'Prénom', maxlength: 24 });
      nameIn.addEventListener('input', () => { s.name = nameIn.value; $('#greet-name').textContent = s.name; Store.save(); });

      // Sauvegarde
      const io = h('div', { class: 'row wrap' },
        h('button', { class: 'btn soft', html: icon('download', 16) + '<span>Exporter</span>', onclick: () => download(`revisions-${dayKey()}.json`, Store.exportJSON()) }),
        h('button', { class: 'btn soft', html: icon('upload', 16) + '<span>Importer</span>', onclick: async () => {
          const [f] = await pickFiles({ accept: 'application/json,.json' });
          if (!f) return;
          try { Store.importJSON(await f.text()); location.reload(); } catch { toast('Fichier invalide', 'close'); }
        } }),
        h('button', { class: 'btn ghost danger', html: icon('reset', 16) + '<span>Réinitialiser</span>', onclick: async () => {
          if (await Modal.confirm('Tout remettre à zéro ? Tes tâches, cartes et réglages seront effacés.', 'Effacer')) { Store.reset(); location.reload(); }
        } }));

      d.append(
        h('div', { class: 'drawer-head' },
          h('h3', { text: 'Personnaliser' }),
          h('button', { class: 'icon-btn ghost', 'aria-label': 'Fermer', html: icon('close'), onclick: () => this.closeDrawer() })),
        h('div', { class: 'drawer-body' },
          sec('theme', 'Couleur', swatches, mode),
          sec('bg', 'Fond', bgs, urlIn,
            UI.row('Flou', UI.slider(s.bg.blur, { min: 0, max: 30 }, v => { s.bg.blur = v; apply(); })),
            UI.row('Voile', UI.slider(s.bg.dim, { min: 0, max: 70 }, v => { s.bg.dim = v; apply(); })),
            UI.row('Bulles animées', UI.toggle(s.bg.blobs, v => { s.bg.blobs = v; apply(); })),
            UI.row('Grain', UI.toggle(s.bg.grain, v => { s.bg.grain = v; apply(); }))),
          sec('glass', 'Verre',
            UI.row('Flou', UI.slider(s.glass.blur, { min: 0, max: 40 }, v => { s.glass.blur = v; apply(); })),
            UI.row('Opacité', UI.slider(Math.round(s.glass.alpha * 100), { min: 8, max: 80 }, v => { s.glass.alpha = v / 100; apply(); }))),
          sec('font', 'Typographie', fonts),
          sec('widgets', 'Widgets', wl,
            h('button', { class: 'btn soft full', html: icon('grid', 16) + '<span>Organiser la page</span>', onclick: () => { this.closeDrawer(); this.setEditing(true); } })),
          sec('name', 'Prénom', nameIn),
          sec('save', 'Sauvegarde', io)));
    },
  };

  window.App = App;
})();
