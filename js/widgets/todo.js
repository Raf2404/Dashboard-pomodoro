/* Liste de tâches */
(() => {
  const TAGS = ['var(--accent)', '#b9a2f0', '#f4b183', '#8fcaa6', '#86b6e8', '#d8cfd4'];

  App.register({
    id: 'todo', title: 'À faire', icon: 'check', size: 'T',
    defaults: {
      items: [
        { id: 'a1', text: 'Relire le cours de droit des obligations', done: false, tag: 0 },
        { id: 'a2', text: 'Fiche d’arrêt : Blanco (1873)', done: false, tag: 1 },
        { id: 'a3', text: 'Préparer le TD de droit constitutionnel', done: false, tag: 2 },
      ],
    },

    mount(ctx) {
      const d = ctx.data;
      ctx.body.innerHTML = `
        <div class="todo">
          <form class="todo-add">
            <input class="field" placeholder="Ajouter une tâche…" maxlength="140" aria-label="Nouvelle tâche">
            <button class="icon-btn accent" type="submit" aria-label="Ajouter">${icon('plus', 16)}</button>
          </form>
          <div class="todo-progress"><div class="track"><span></span></div><small></small></div>
          <ul class="todo-list"></ul>
        </div>`;
      const form = ctx.body.querySelector('form'), input = form.querySelector('input');
      const ul = ctx.body.querySelector('.todo-list');
      const bar = ctx.body.querySelector('.todo-progress span'), count = ctx.body.querySelector('.todo-progress small');
      const clearBtn = ctx.addAction('checks', 'Effacer les terminées', () => {
        const done = $$('.todo-item.done', ul);
        done.forEach((li, i) => setTimeout(() => li.classList.add('leaving'), i * 50));
        setTimeout(() => { d.items = d.items.filter(i => !i.done); ctx.save(); draw(); }, 350 + done.length * 50);
      });

      function progress() {
        const n = d.items.length, k = d.items.filter(i => i.done).length;
        bar.style.width = n ? (k / n) * 100 + '%' : '0%';
        count.textContent = n ? `${k}/${n}` : '';
        clearBtn.style.display = k ? '' : 'none';
        ctx.body.querySelector('.todo-progress').style.visibility = n ? 'visible' : 'hidden';
      }

      function itemEl(it) {
        const li = h('li', { class: 'todo-item' + (it.done ? ' done' : ''), 'data-id': it.id });
        const tick = h('button', { class: 'tick', 'aria-label': 'Terminer', html: '<svg viewBox="0 0 24 24"><path d="M6.5 12.5l3.6 3.6L17.5 8.5"/></svg>' });
        const dot = h('button', { class: 'tag-dot', 'aria-label': 'Couleur', style: { '--c': TAGS[it.tag % TAGS.length] } });
        const text = h('span', { class: 'todo-text', text: it.text });
        const del = h('button', { class: 'icon-btn xs del', 'aria-label': 'Supprimer', html: icon('close', 14) });
        tick.addEventListener('click', () => {
          it.done = !it.done;
          li.classList.toggle('done', it.done);
          if (it.done) {
            const [x, y] = FX.centerOf(tick);
            FX.hearts(x, y, 4, 30);
            Sound.pop();
            Bus.emit('todo:done', it);
          }
          ctx.save(); progress();
        });
        dot.addEventListener('click', () => { it.tag = (it.tag + 1) % TAGS.length; dot.style.setProperty('--c', TAGS[it.tag]); ctx.save(); });
        text.addEventListener('dblclick', () => {
          text.contentEditable = 'true';
          text.focus();
          document.getSelection().selectAllChildren(text);
        });
        text.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); text.blur(); } if (e.key === 'Escape') { text.textContent = it.text; text.blur(); } });
        text.addEventListener('blur', () => {
          text.contentEditable = 'false';
          const v = text.textContent.trim();
          if (v) { it.text = v; ctx.save(); } else text.textContent = it.text;
        });
        del.addEventListener('click', () => {
          li.classList.add('leaving');
          setTimeout(() => { d.items = d.items.filter(x => x !== it); ctx.save(); li.remove(); progress(); if (!d.items.length) draw(); }, 320);
        });
        li.append(tick, dot, text, del);
        return li;
      }

      function draw() {
        ul.innerHTML = '';
        if (!d.items.length) ul.append(h('li', { class: 'todo-empty' }, h('span', { html: icon('sparkle', 20) }), h('p', { text: 'Tout est fait' })));
        d.items.forEach(it => ul.append(itemEl(it)));
        progress();
      }

      form.addEventListener('submit', e => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v) return;
        const it = { id: uid(), text: v, done: false, tag: 0 };
        d.items.unshift(it);
        input.value = '';
        ctx.save();
        if (ul.querySelector('.todo-empty')) ul.innerHTML = '';
        const li = itemEl(it);
        li.classList.add('entering');
        ul.prepend(li);
        progress();
      });

      Sortable.create(ul, {
        animation: 220, delay: 180, delayOnTouchOnly: true, filter: 'button, [contenteditable="true"]', preventOnFilter: false,
        ghostClass: 'todo-ghost',
        onEnd: () => {
          const order = $$('.todo-item', ul).map(li => li.dataset.id);
          d.items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
          ctx.save();
        },
      });
      draw();
    },
  });
})();
