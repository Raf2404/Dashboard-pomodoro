/* Flashcards avec répétition espacée (boîtes de Leitner) */
(() => {
  const DAY = 86400000;
  const INTERVALS = [0, 1, 2, 4, 8, 16]; // jours
  const COLORS = ['var(--accent)', '#b9a2f0', '#f4b183', '#8fcaa6', '#86b6e8', '#e6a4c9'];

  App.register({
    id: 'flashcards', title: 'Cartes', icon: 'cards', size: 'T',
    defaults: {
      decks: [{ id: 'civ', name: 'Civil', color: 0 }, { id: 'pub', name: 'Public', color: 1 }],
      active: 'civ',
      cards: [
        { id: 'c1', deck: 'civ', front: 'Article 1240 du Code civil', back: 'Tout fait quelconque de l’homme, qui cause à autrui un dommage, oblige celui par la faute duquel il est arrivé à le réparer.', box: 0, due: 0 },
        { id: 'c2', deck: 'civ', front: 'Conditions de validité du contrat (art. 1128)', back: 'Le consentement des parties, leur capacité de contracter, un contenu licite et certain.', box: 0, due: 0 },
        { id: 'c3', deck: 'pub', front: 'Arrêt Blanco (TC, 1873)', back: 'La responsabilité de l’État n’est pas régie par le Code civil : autonomie du droit administratif.', box: 0, due: 0 },
        { id: 'c4', deck: 'pub', front: 'Décision « Liberté d’association » (CC, 1971)', back: 'Le Préambule de 1958 (et donc la DDHC et le Préambule de 1946) intègre le bloc de constitutionnalité.', box: 0, due: 0 },
        { id: 'c5', deck: 'pub', front: 'Arrêt Nicolo (CE, 1989)', back: 'Le juge administratif contrôle la conformité d’une loi, même postérieure, à un traité.', box: 0, due: 0 },
      ],
    },

    mount(ctx) {
      const d = ctx.data;
      ctx.body.innerHTML = `<div class="fc"></div>`;
      const root = ctx.body.querySelector('.fc');
      let session = null;

      ctx.addAction('list', 'Gérer les cartes', () => manage());
      ctx.addAction('plus', 'Nouvelle carte', () => addCard());

      const deck = () => d.decks.find(x => x.id === d.active) || d.decks[0];
      const cardsOf = id => d.cards.filter(c => c.deck === id);
      const dueOf = id => cardsOf(id).filter(c => (c.due || 0) <= Date.now());

      function home() {
        session = null;
        const dk = deck();
        root.innerHTML = '';
        const chips = h('div', { class: 'chips-row' });
        d.decks.forEach(x => {
          const n = dueOf(x.id).length;
          const b = h('button', { class: 'chip' + (dk && x.id === dk.id ? ' on' : ''), style: { '--dot': COLORS[x.color % COLORS.length] } },
            h('i', { class: 'dot' }), x.name, n ? h('b', { class: 'cnt', text: n }) : null);
          b.addEventListener('click', () => { d.active = x.id; ctx.save(); home(); });
          chips.append(b);
        });
        chips.append(h('button', { class: 'chip add', 'aria-label': 'Nouveau paquet', html: icon('plus', 14), onclick: () => newDeck() }));
        root.append(chips);
        if (!dk) { root.append(UI.empty('cards', 'Crée ton premier paquet')); return; }
        const all = cardsOf(dk.id), due = dueOf(dk.id);
        const mastered = all.filter(c => c.box >= 4).length;
        const stack = h('div', { class: 'fc-home' },
          h('div', { class: 'fc-stack', style: { '--c': COLORS[dk.color % COLORS.length] } },
            h('span', { class: 'sheet s3' }), h('span', { class: 'sheet s2' }),
            h('span', { class: 'sheet s1' },
              h('b', { class: 'big', text: due.length }),
              h('small', { text: due.length > 1 ? 'à revoir' : 'à revoir' }))),
          h('div', { class: 'fc-meta' },
            h('span', { html: `${icon('cards', 14)} ${all.length}` }),
            h('span', { html: `${icon('sparkle', 14)} ${mastered}` })),
          all.length
            ? h('button', { class: 'btn primary', html: icon('play', 15) + `<span>${due.length ? 'Réviser' : 'Tout revoir'}</span>`, onclick: () => start(due.length ? due : all) })
            : h('button', { class: 'btn soft', html: icon('plus', 15) + '<span>Ajouter une carte</span>', onclick: () => addCard() }));
        root.append(stack);
      }

      function start(cards) {
        session = { queue: [...cards].sort(() => Math.random() - 0.5), done: 0, total: cards.length, ok: 0 };
        show();
      }

      function show() {
        const c = session.queue[0];
        if (!c) return finish();
        root.innerHTML = '';
        const card = h('div', { class: 'flip', tabindex: 0, 'aria-label': 'Retourner la carte' },
          h('div', { class: 'flip-inner' },
            h('div', { class: 'face front' }, h('small', { text: deck()?.name || '' }), h('p', { text: c.front }), h('span', { class: 'tap', html: icon('flip', 14) })),
            h('div', { class: 'face back' }, h('p', { text: c.back }))));
        const flip = () => card.classList.toggle('flipped');
        card.addEventListener('click', flip);
        card.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); flip(); } });
        const prog = h('div', { class: 'fc-prog' }, h('div', { class: 'track' }, h('span', { style: { width: (session.done / session.total) * 100 + '%' } })), h('small', { text: `${session.done}/${session.total}` }));
        const btns = h('div', { class: 'fc-btns' },
          h('button', { class: 'btn soft no', html: icon('refresh', 15) + '<span>À revoir</span>', onclick: () => answer(c, false) }),
          h('button', { class: 'btn primary yes', html: icon('check', 15) + '<span>Je sais</span>', onclick: () => answer(c, true) }));
        root.append(h('div', { class: 'fc-top' }, prog, h('button', { class: 'icon-btn xs', 'aria-label': 'Quitter', html: icon('close', 14), onclick: home })), card, btns);
        requestAnimationFrame(() => card.classList.add('in'));
      }

      function answer(c, ok) {
        if (ok) {
          c.box = Math.min(c.box + 1, INTERVALS.length - 1);
          c.due = Date.now() + INTERVALS[c.box] * DAY;
          session.queue.shift();
          session.done++; session.ok++;
        } else {
          c.box = 0; c.due = Date.now();
          session.queue.push(session.queue.shift());
        }
        Bus.emit('card:reviewed', { ok });
        ctx.save();
        const card = root.querySelector('.flip');
        card.classList.add(ok ? 'out-r' : 'out-l');
        setTimeout(show, 280);
      }

      function finish() {
        root.innerHTML = '';
        const done = h('div', { class: 'fc-done' },
          h('span', { class: 'empty-ic big', html: icon('sparkle', 26) }),
          h('p', { class: 'display', text: 'Bravo !' }),
          h('small', { text: `${session.total} carte${session.total > 1 ? 's' : ''} revue${session.total > 1 ? 's' : ''}` }),
          h('button', { class: 'btn soft', text: 'Retour', onclick: home }));
        root.append(done);
        const [x, y] = FX.centerOf(done);
        FX.hearts(x, y, 10, 80);
        session = null;
      }

      function newDeck() {
        const name = UI.input({ placeholder: 'Nom du paquet (ex : Pénal)', maxlength: 20 });
        const body = h('form', { class: 'stack' }, name, h('button', { class: 'btn primary', type: 'submit', text: 'Créer' }));
        const m = Modal.open({ title: 'Nouveau paquet', icon: 'cards', body });
        body.addEventListener('submit', e => {
          e.preventDefault();
          const v = name.value.trim(); if (!v) return;
          const id = uid();
          d.decks.push({ id, name: v, color: d.decks.length % COLORS.length });
          d.active = id; ctx.save(); m.close(); home();
        });
      }

      function addCard() {
        if (!d.decks.length) { newDeck(); return; }
        const sel = h('select', { class: 'field' }, d.decks.map(x => h('option', { value: x.id, text: x.name, selected: x.id === d.active })));
        const front = h('textarea', { class: 'field', rows: 2, placeholder: 'Recto — question, arrêt, article…' });
        const back = h('textarea', { class: 'field', rows: 3, placeholder: 'Verso — réponse' });
        const single = h('form', { class: 'stack' }, sel, front, back, h('button', { class: 'btn primary', type: 'submit', html: icon('plus', 16) + '<span>Ajouter</span>' }));
        const bulk = h('textarea', { class: 'field', rows: 7, placeholder: 'Une carte par ligne :\nArrêt Blanco ; Autonomie du droit administratif\nArt. 1240 | Responsabilité du fait personnel' });
        const bulkForm = h('form', { class: 'stack' }, bulk, h('button', { class: 'btn primary', type: 'submit', html: icon('upload', 16) + '<span>Importer</span>' }));
        bulkForm.style.display = 'none';
        const tabs = UI.seg([{ value: 'one', label: 'Une carte' }, { value: 'many', label: 'Import rapide' }], 'one', v => {
          single.style.display = v === 'one' ? '' : 'none';
          bulkForm.style.display = v === 'many' ? '' : 'none';
        });
        const body = h('div', { class: 'stack' }, tabs, single, bulkForm);
        const m = Modal.open({ title: 'Nouvelle carte', icon: 'cards', body, onClose: () => { if (!session) home(); } });
        single.addEventListener('submit', e => {
          e.preventDefault();
          if (!front.value.trim() || !back.value.trim()) return;
          d.cards.push({ id: uid(), deck: sel.value, front: front.value.trim(), back: back.value.trim(), box: 0, due: 0 });
          d.active = sel.value;
          ctx.save();
          front.value = back.value = '';
          front.focus();
          toast('Carte ajoutée', 'cards');
        });
        bulkForm.addEventListener('submit', e => {
          e.preventDefault();
          let n = 0;
          bulk.value.split('\n').forEach(line => {
            const parts = line.split(/\s*(?:\t|;|\|)\s*/);
            if (parts.length >= 2 && parts[0].trim() && parts.slice(1).join(' ').trim()) {
              d.cards.push({ id: uid(), deck: sel.value, front: parts[0].trim(), back: parts.slice(1).join(' — ').trim(), box: 0, due: 0 });
              n++;
            }
          });
          ctx.save();
          toast(`${n} carte${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''}`, 'cards');
          if (n) m.close();
        });
      }

      function manage() {
        const dk = deck();
        if (!dk) return newDeck();
        const list = h('ul', { class: 'edit-list cards-list' });
        const draw = () => {
          list.innerHTML = '';
          const cs = cardsOf(dk.id);
          if (!cs.length) list.append(h('li', { class: 'muted', text: 'Aucune carte' }));
          cs.forEach(c => list.append(h('li', {},
            h('span', { class: 'el-main' }, h('b', { text: c.front }), h('small', { text: c.back })),
            h('span', { class: 'box-pill', title: 'Niveau', text: '●'.repeat(c.box + 1) }),
            h('button', { class: 'icon-btn xs', 'aria-label': 'Supprimer', html: icon('trash', 14), onclick: () => { d.cards = d.cards.filter(x => x !== c); ctx.save(); draw(); } }))));
        };
        draw();
        const rename = UI.input({ value: dk.name, maxlength: 20 });
        rename.addEventListener('change', () => { dk.name = rename.value.trim() || dk.name; ctx.save(); });
        const body = h('div', { class: 'stack' },
          UI.row('Paquet', rename, 'edit'),
          list,
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn soft', html: icon('reset', 15) + '<span>Tout remettre à revoir</span>', onclick: () => { cardsOf(dk.id).forEach(c => { c.box = 0; c.due = 0; }); ctx.save(); draw(); toast('Paquet remis à zéro'); } }),
            h('button', { class: 'btn ghost danger', html: icon('trash', 15) + '<span>Supprimer le paquet</span>', onclick: async () => {
              if (!(await Modal.confirm(`Supprimer « ${dk.name} » et ses cartes ?`, 'Supprimer'))) return;
              d.cards = d.cards.filter(c => c.deck !== dk.id);
              d.decks = d.decks.filter(x => x !== dk);
              d.active = d.decks[0]?.id;
              ctx.save(); m.close();
            } })));
        const m = Modal.open({ title: dk.name, icon: 'cards', body, wide: true, onClose: () => { if (!session) home(); } });
      }

      home();
      const iv = setInterval(() => { if (!session) home(); }, 5 * 60000);
      ctx.destroy = () => clearInterval(iv);
    },
  });
})();
