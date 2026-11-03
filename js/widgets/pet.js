/* Compagnon virtuel qui grandit avec le travail */
(() => {
  const STAGES = [
    { name: 'Œuf', xp: 0, scale: 1 },
    { name: 'Bébé', xp: 25, scale: 0.72 },
    { name: 'Petite', xp: 150, scale: 0.84 },
    { name: 'Étudiante', xp: 500, scale: 0.93 },
    { name: 'Avocate', xp: 1500, scale: 1 },
  ];
  const COLORS = {
    rose: ['#ffd6e4', '#f2a6c2'], lavande: ['#e8ddff', '#b9a5ef'], peche: ['#ffe2d2', '#f4b092'],
    menthe: ['#d6f2e3', '#98d2b3'], creme: ['#fff4de', '#efd09f'], nuage: ['#f6f4fa', '#cfcadd'],
  };
  const MAX_TREATS = 9;
  const stageOf = xp => STAGES.reduce((s, st, i) => (xp >= st.xp ? i : s), 0);

  function gain(xp, { treat = 0, joy = 0, food = 0 } = {}) {
    const p = App.data('pet');
    const before = stageOf(p.xp);
    p.xp += xp;
    p.treats = Math.min(MAX_TREATS, p.treats + treat);
    p.joy = clamp(p.joy + joy, 0, 100);
    p.food = clamp(p.food + food, 0, 100);
    Store.save();
    Bus.emit('pet:update', { evolved: stageOf(p.xp) > before });
  }
  Bus.on('focus:complete', ({ minutes }) => gain(minutes, { treat: 1, joy: 10 }));
  Bus.on('todo:done', () => gain(5, { joy: 3 }));
  Bus.on('card:reviewed', () => gain(1));

  const BODY = 'M100 64 C 147 64 168 102 168 136 C 168 164 140 180 100 180 C 60 180 32 164 32 136 C 32 102 53 64 100 64 Z';

  const SVG = `
  <svg class="pet-svg" viewBox="0 0 200 200" role="img" aria-label="Compagnon">
    <defs>
      <radialGradient id="pet-g" cx=".36" cy=".28" r=".9">
        <stop offset="0" stop-color="#fff"/>
        <stop offset=".38" class="pc-l"/>
        <stop offset="1" class="pc-d"/>
      </radialGradient>
      <radialGradient id="egg-g" cx=".36" cy=".28" r=".95">
        <stop offset="0" stop-color="#fff"/>
        <stop offset=".5" stop-color="#fff6ef"/>
        <stop offset="1" class="pc-l"/>
      </radialGradient>
      <clipPath id="pet-clip"><path d="${BODY}"/></clipPath>
    </defs>
    <ellipse class="pet-shadow" cx="100" cy="184" rx="52" ry="7"/>
    <g class="pet-stage">
      <g class="pet-hop">
        <g class="pet-breath">
          <g class="egg">
            <path class="egg-shell" d="M100 48 C 135 48 154 102 154 134 C 154 164 130 182 100 182 C 70 182 46 164 46 134 C 46 102 65 48 100 48 Z" fill="url(#egg-g)"/>
            <circle class="egg-spot" cx="78" cy="98" r="7"/><circle class="egg-spot s2" cx="122" cy="118" r="9"/>
            <circle class="egg-spot s3" cx="92" cy="152" r="6"/><circle class="egg-spot" cx="128" cy="86" r="4"/>
            <ellipse cx="80" cy="82" rx="10" ry="16" fill="#fff" opacity=".7" transform="rotate(20 80 82)"/>
            <path class="crack" d="M58 128 l9 -7 l7 9 l9 -10 l8 8 l9 -9 l8 7 l9 -6 l8 5"/>
          </g>
          <g class="mochi">
            <g class="ear ear-l">
              <ellipse cx="72" cy="64" rx="13" ry="29" transform="rotate(-16 72 64)" fill="url(#pet-g)"/>
              <ellipse cx="72" cy="67" rx="6" ry="18" transform="rotate(-16 72 67)" class="ear-in"/>
            </g>
            <g class="ear ear-r">
              <ellipse cx="128" cy="64" rx="13" ry="29" transform="rotate(16 128 64)" fill="url(#pet-g)"/>
              <ellipse cx="128" cy="67" rx="6" ry="18" transform="rotate(16 128 67)" class="ear-in"/>
            </g>
            <path class="body" d="${BODY}" fill="url(#pet-g)"/>
            <ellipse cx="72" cy="98" rx="16" ry="8" transform="rotate(-28 72 98)" fill="#fff" opacity=".6"/>
            <g class="robe" clip-path="url(#pet-clip)">
              <path d="M20 150 Q 100 136 180 150 V 200 H 20 Z" fill="#2e2431"/>
              <path d="M84 152 L 76 200 M116 152 L 124 200" stroke="#46384a" stroke-width="1.6" fill="none"/>
              <rect x="93" y="141" width="6" height="18" rx="1.6" fill="#fff"/>
              <rect x="101" y="141" width="6" height="18" rx="1.6" fill="#fff"/>
            </g>
            <g class="face">
              <ellipse class="cheek" cx="64" cy="134" rx="10.5" ry="6"/>
              <ellipse class="cheek" cx="136" cy="134" rx="10.5" ry="6"/>
              <g class="eyes">
                <g class="eyes-open">
                  <g class="eye"><ellipse cx="80" cy="120" rx="6.4" ry="8.2"/><circle class="glint" cx="82.6" cy="116.4" r="2.4"/><circle class="glint" cx="78.2" cy="123.4" r="1.1"/></g>
                  <g class="eye"><ellipse cx="120" cy="120" rx="6.4" ry="8.2"/><circle class="glint" cx="122.6" cy="116.4" r="2.4"/><circle class="glint" cx="118.2" cy="123.4" r="1.1"/></g>
                </g>
                <g class="eyes-happy"><path d="M72.5 122 q 7.5 -10 15 0"/><path d="M112.5 122 q 7.5 -10 15 0"/></g>
                <g class="eyes-closed"><path d="M72.5 119 q 7.5 7 15 0"/><path d="M112.5 119 q 7.5 7 15 0"/></g>
              </g>
              <path class="mouth mouth-w" d="M93 133 q 3.5 4.2 7 0 q 3.5 4.2 7 0"/>
              <path class="mouth mouth-open" d="M93.5 132 q 6.5 11 13 0 z"/>
              <path class="mouth mouth-sad" d="M94 138 q 6 -5.5 12 0"/>
              <ellipse class="mouth mouth-o" cx="100" cy="135" rx="3.8" ry="4.6"/>
              <g class="glasses"><circle cx="80" cy="120" r="13"/><circle cx="120" cy="120" r="13"/><path d="M93 117 q 7 -5 14 0"/></g>
            </g>
            <g class="bow" transform="translate(134 74) rotate(18)">
              <path d="M0 0 C -6 -13 -21 -9 -18 2 C -16 9 -6 6 0 0 Z"/>
              <path d="M0 0 C 6 -13 21 -9 18 2 C 16 9 6 6 0 0 Z"/>
              <circle r="4.4"/>
            </g>
            <g class="book">
              <path d="M70 160 q 15 -8 30 0 q 15 -8 30 0 v 22 q -15 -8 -30 0 q -15 -8 -30 0 z" fill="#c4485e" transform="translate(0 2.5)"/>
              <path d="M72 158 q 14 -7 28 0 v 21 q -14 -7 -28 0 z" fill="#fffaf3"/>
              <path d="M100 158 q 14 -7 28 0 v 21 q -14 -7 -28 0 z" fill="#fff4ea"/>
              <path d="M77 164 q 9 -4 18 0 M77 169 q 9 -4 18 0 M105 164 q 9 -4 18 0 M105 169 q 9 -4 18 0" stroke="#e3c9cf" stroke-width="1.2" fill="none"/>
              <ellipse cx="68" cy="168" rx="8" ry="7" fill="url(#pet-g)"/><ellipse cx="132" cy="168" rx="8" ry="7" fill="url(#pet-g)"/>
            </g>
          </g>
        </g>
      </g>
    </g>
    <g class="zzz"><text x="142" y="74">z</text><text x="155" y="58">z</text><text x="167" y="42">z</text></g>
    <g class="thought">
      <circle cx="150" cy="88" r="3.5"/><circle cx="158" cy="74" r="5"/>
      <rect x="150" y="34" width="38" height="30" rx="15"/>
      <g transform="translate(157 37) scale(1)">
        <path d="M3.5 11.2a8.5 5.4 0 0 1 17 0z" class="mac-a"/><rect x="3.2" y="11" width="17.6" height="2.6" rx="1.3" fill="#fff6ec"/><path d="M3.5 13.4h17a8.5 5.4 0 0 1-17 0z" class="mac-b"/>
      </g>
    </g>
  </svg>`;

  App.register({
    id: 'pet', title: 'Mochi', icon: 'heart', size: 'T', zen: true,
    defaults: { name: 'Mochi', color: 'rose', xp: 0, treats: 1, food: 80, joy: 85, last: 0 },

    mount(ctx) {
      const p = ctx.data;
      const title = ctx.head.querySelector('.w-title');
      ctx.body.innerHTML = `
        <div class="pet" data-stage="0" data-mood="idle">
          <div class="pet-stage-chip"><span class="chip-dot"></span><span class="stage-name"></span></div>
          <div class="pet-scene">
            <div class="pet-platform"></div>
            ${SVG}
          </div>
          <div class="pet-bars">
            <div class="pbar" title="Faim">${MACARON(16)}<div class="track"><span class="fill food"></span></div></div>
            <div class="pbar" title="Bonheur"><span class="hic">${icon('heart', 15)}</span><div class="track"><span class="fill joy"></span></div></div>
            <div class="pbar xp" title="Évolution">${icon('sparkle', 15)}<div class="track"><span class="fill xpf"></span></div></div>
          </div>
          <div class="pet-actions">
            <button class="pet-btn feed" aria-label="Nourrir">${MACARON(20)}<b class="badge">0</b></button>
            <button class="pet-btn hug" aria-label="Câlin">${icon('heart', 19)}</button>
          </div>
        </div>`;
      const root = ctx.body.querySelector('.pet');
      const svg = root.querySelector('svg');
      const stageG = svg.querySelector('.pet-stage');
      const hop = svg.querySelector('.pet-hop');
      const eyes = svg.querySelector('.eyes');
      const $r = s => root.querySelector(s);

      let tempMood = null, tempTimer = 0, timerState = { running: false, mode: 'focus' };

      const decay = () => {
        const now = Date.now();
        if (!p.last) p.last = now;
        const min = (now - p.last) / 60000;
        if (min >= 1) {
          p.food = clamp(p.food - min * 0.06, 0, 100);
          p.joy = clamp(p.joy - min * 0.035, 0, 100);
          p.last = now;
          ctx.save();
        }
      };

      function baseMood(stage) {
        if (stage === 0) return 'egg';
        if (timerState.running && timerState.mode === 'focus') return 'study';
        const hr = new Date().getHours();
        if (hr >= 23 || hr < 6) return 'sleep';
        if (p.food < 25 || p.joy < 25) return 'sad';
        return 'idle';
      }

      function render() {
        const stage = stageOf(p.xp);
        const st = STAGES[stage], nx = STAGES[stage + 1];
        const [l, d] = COLORS[p.color] || COLORS.rose;
        root.style.setProperty('--pc-l', l);
        root.style.setProperty('--pc-d', d);
        root.dataset.stage = stage;
        const mood = tempMood || baseMood(stage);
        root.dataset.mood = mood;
        root.classList.toggle('hungry', p.food < 30 && stage > 0 && mood !== 'sleep');
        const s = st.scale;
        stageG.setAttribute('transform', `translate(100 182) scale(${s}) translate(-100 -182)`);
        title.textContent = p.name || 'Mochi';
        $r('.stage-name').textContent = st.name;
        $r('.food').style.width = p.food + '%';
        $r('.joy').style.width = p.joy + '%';
        const pct = nx ? ((p.xp - st.xp) / (nx.xp - st.xp)) * 100 : 100;
        $r('.xpf').style.width = clamp(pct, 2, 100) + '%';
        $r('.pbar.xp').title = nx ? `${Math.floor(p.xp)} / ${nx.xp} XP → ${nx.name}` : `${Math.floor(p.xp)} XP`;
        $r('.badge').textContent = p.treats;
        $r('.feed').classList.toggle('empty', p.treats <= 0);
        // fissures de l'œuf
        svg.querySelector('.crack').style.opacity = stage === 0 ? (clamp(p.xp / 25, 0, 1) ** 2) * 0.9 : 0;
        if (mood === 'study') eyes.setAttribute('transform', 'translate(0 3)');
      }

      function setTemp(mood, ms) {
        tempMood = mood;
        clearTimeout(tempTimer);
        render();
        tempTimer = setTimeout(() => { tempMood = null; render(); }, ms);
      }

      function bounce(cls = 'hop', ms = 700) {
        hop.classList.remove(cls);
        void hop.getBBox();
        hop.classList.add(cls);
        setTimeout(() => hop.classList.remove(cls), ms);
      }

      const center = () => {
        const r = svg.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height * 0.55];
      };

      let lastPet = 0;
      svg.addEventListener('click', () => {
        const stage = stageOf(p.xp);
        const [x, y] = center();
        if (stage === 0) { bounce('wobble', 900); Sound.pop(); FX.sparkles(x, y, 6); return; }
        bounce();
        FX.hearts(x, y - 30, 2, 30);
        if (Date.now() - lastPet > 2500) { p.joy = clamp(p.joy + 1, 0, 100); lastPet = Date.now(); ctx.save(); }
        setTemp('happy', 1400);
      });

      $r('.hug').addEventListener('click', () => {
        const [x, y] = center();
        if (stageOf(p.xp) === 0) { bounce('wobble', 900); FX.hearts(x, y, 4); return; }
        p.joy = clamp(p.joy + 6, 0, 100);
        ctx.save();
        root.classList.add('wiggle');
        setTimeout(() => root.classList.remove('wiggle'), 900);
        bounce('squish', 800);
        setTemp('happy', 2200);
        FX.hearts(x, y - 20, 8, 70);
        Sound.pop();
      });

      $r('.feed').addEventListener('click', e => {
        const btn = e.currentTarget;
        if (p.treats <= 0) {
          btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
          toast('Termine une session pour gagner un macaron', 'timer');
          return;
        }
        if (stageOf(p.xp) === 0) { toast('Il faut d’abord qu’il éclose…', 'sparkle'); return; }
        p.treats--;
        p.food = clamp(p.food + 30, 0, 100);
        p.joy = clamp(p.joy + 6, 0, 100);
        p.xp += 2;
        ctx.save();
        const [bx, by] = FX.centerOf(btn);
        const [x, y] = center();
        const m = h('span', { class: 'fx-mac', html: MACARON(30), style: { left: bx + 'px', top: by + 'px' } });
        FX.layer().append(m);
        m.animate([
          { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
          { transform: `translate(calc(-50% + ${(x - bx) * 0.5}px), calc(-50% + ${(y - by) * 0.5 - 60}px)) scale(1.15) rotate(-12deg)`, opacity: 1, offset: 0.5 },
          { transform: `translate(calc(-50% + ${x - bx}px), calc(-50% + ${y - by + 18}px)) scale(.3) rotate(10deg)`, opacity: 0.2 },
        ], { duration: 750, easing: 'cubic-bezier(.3,.6,.4,1)' }).onfinish = () => {
          m.remove();
          setTemp('eat', 1300);
          setTimeout(() => { FX.hearts(x, y - 20, 4, 40); setTemp('happy', 1500); }, 1300);
        };
        render();
      });

      // les yeux suivent le curseur
      let raf = 0;
      const onMove = e => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const mood = root.dataset.mood;
          if (mood === 'study' || mood === 'sleep' || mood === 'egg') return;
          const r = svg.getBoundingClientRect();
          if (!r.width) return;
          const cx = r.left + r.width / 2, cy = r.top + r.height * 0.6;
          const dx = clamp((e.clientX - cx) / 60, -4.5, 4.5), dy = clamp((e.clientY - cy) / 80, -3, 3.5);
          eyes.setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)})`);
        });
      };
      document.addEventListener('pointermove', onMove, { passive: true });

      // petites vies spontanées
      let idleT;
      const idle = () => {
        idleT = setTimeout(() => {
          const mood = root.dataset.mood;
          if (mood === 'idle') {
            const r = Math.random();
            if (r < 0.35) bounce();
            else if (r < 0.7) { root.classList.add('wiggle'); setTimeout(() => root.classList.remove('wiggle'), 900); }
            else eyes.setAttribute('transform', `translate(${(Math.random() - 0.5) * 8} ${(Math.random() - 0.5) * 4})`);
          } else if (mood === 'egg' && Math.random() < 0.5) bounce('wobble', 900);
          idle();
        }, 5000 + Math.random() * 7000);
      };
      idle();

      const offs = [
        Bus.on('pet:update', ({ evolved }) => {
          render();
          if (evolved) {
            const [x, y] = center();
            root.classList.add('evolving');
            FX.sparkles(x, y, 16);
            setTimeout(() => { FX.hearts(x, y, 10, 90); root.classList.remove('evolving'); }, 1200);
            toast(`${p.name} est maintenant ${STAGES[stageOf(p.xp)].name.toLowerCase()} !`, 'sparkle');
          }
        }),
        Bus.on('timer:state', s => { timerState = s; if (!s.running || s.mode !== 'focus') eyes.setAttribute('transform', ''); render(); }),
      ];
      const iv = setInterval(() => { decay(); render(); }, 60000);
      decay();
      render();

      ctx.render = render;
      ctx.destroy = () => { clearInterval(iv); clearTimeout(idleT); clearTimeout(tempTimer); offs.forEach(f => f()); document.removeEventListener('pointermove', onMove); };
    },

    settings(ctx, el) {
      const p = ctx.data;
      const name = UI.input({ value: p.name, maxlength: 16, placeholder: 'Nom' });
      name.addEventListener('input', () => { p.name = name.value || 'Mochi'; ctx.save(); ctx.render(); });
      const sw = h('div', { class: 'swatches' });
      for (const [k, [l, d]] of Object.entries(COLORS)) {
        const b = h('button', { class: 'swatch' + (p.color === k ? ' on' : ''), 'aria-label': k, style: { '--c1': l, '--c2': d, '--c3': '#fff' } });
        b.addEventListener('click', () => { p.color = k; $$('.swatch', sw).forEach(x => x.classList.remove('on')); b.classList.add('on'); ctx.save(); ctx.render(); });
        sw.append(b);
      }
      const cur = stageOf(p.xp);
      const steps = h('ol', { class: 'evo' }, STAGES.map((s, i) => h('li', { class: i <= cur ? 'done' : '' }, h('i'), h('span', { text: s.name }), h('small', { text: s.xp + ' xp' }))));
      el.append(
        UI.row('Nom', name, 'edit'),
        h('div', { class: 'f-block' }, h('span', { class: 'f-label', text: 'Couleur' }), sw),
        h('div', { class: 'f-block' }, h('span', { class: 'f-label', text: `Évolution · ${Math.floor(p.xp)} xp` }), steps),
        h('ul', { class: 'earn' },
          h('li', { html: `${icon('timer', 16)}<span>1 session</span><b>+1 ${MACARON(14)} · +xp</b>` }),
          h('li', { html: `${icon('check', 16)}<span>1 tâche</span><b>+5 xp</b>` }),
          h('li', { html: `${icon('cards', 16)}<span>1 carte</span><b>+1 xp</b>` })),
        h('button', { class: 'btn ghost danger', html: icon('reset', 16) + '<span>Nouvel œuf</span>', onclick: async () => {
          if (await Modal.confirm(`Recommencer depuis un œuf ? ${p.name} repartira de zéro.`, 'Recommencer')) {
            Object.assign(p, { xp: 0, treats: 1, food: 80, joy: 85, last: Date.now() });
            ctx.save(); ctx.render();
          }
        } }));
    },
  });
})();
