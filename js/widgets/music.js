/* Platine vinyle connectée à YouTube + ambiances générées */
(() => {
  let ytPromise;
  function loadYT() {
    if (ytPromise) return ytPromise;
    ytPromise = new Promise((res, rej) => {
      if (window.YT && window.YT.Player) return res(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { ytPromise = null; rej(new Error('yt')); };
      document.head.append(s);
      setTimeout(() => rej(new Error('timeout')), 20000);
    });
    return ytPromise;
  }

  function parseYT(url) {
    if (!url) return null;
    url = url.trim();
    if (/^[\w-]{11}$/.test(url)) return { id: url };
    const list = url.match(/[?&]list=([\w-]+)/);
    const id = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
    if (!list && !id) return null;
    return { id: id && id[1], list: list && list[1] };
  }

  /* ---------- ambiances (bruits générés, aucun fichier) ---------- */
  const Amb = {
    nodes: {},
    master: null,
    ctx() {
      const c = Sound.get();
      if (c && !this.master) { this.master = c.createGain(); this.master.gain.value = 0.5; this.master.connect(c.destination); }
      return c;
    },
    buffer(c, type) {
      const len = c.sampleRate * 4, buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let last = 0, b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
          else { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.45; }
        }
      }
      return buf;
    },
    start(kind) {
      const c = this.ctx(); if (!c) return;
      const src = c.createBufferSource();
      src.buffer = this.buffer(c, kind === 'rain' ? 'pink' : 'brown');
      src.loop = true;
      const g = c.createGain(); g.gain.value = 0;
      let chain = src;
      const extra = [];
      if (kind === 'rain') {
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
        chain.connect(hp); hp.connect(lp); chain = lp;
      } else if (kind === 'waves') {
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
        const mod = c.createGain(); mod.gain.value = 0.55;
        const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
        const depth = c.createGain(); depth.gain.value = 0.45;
        lfo.connect(depth); depth.connect(mod.gain); lfo.start();
        chain.connect(lp); lp.connect(mod); chain = mod; extra.push(lfo);
      } else if (kind === 'fire') {
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        chain.connect(lp); chain = lp;
        // crépitements
        const crack = c.createBufferSource();
        const len = c.sampleRate * 3, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : d[i - 1] * 0.86 || 0;
        crack.buffer = b; crack.loop = true;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500;
        crack.connect(bp); bp.connect(g); crack.start(); extra.push(crack);
      }
      chain.connect(g); g.connect(this.master);
      src.start();
      g.gain.linearRampToValueAtTime(kind === 'fire' ? 0.7 : 0.55, c.currentTime + 1.2);
      this.nodes[kind] = { src, g, extra };
    },
    stop(kind) {
      const n = this.nodes[kind]; if (!n) return;
      const c = this.ctx();
      n.g.gain.cancelScheduledValues(c.currentTime);
      n.g.gain.setValueAtTime(n.g.gain.value, c.currentTime);
      n.g.gain.linearRampToValueAtTime(0, c.currentTime + 0.8);
      setTimeout(() => { try { n.src.stop(); n.extra.forEach(x => x.stop()); } catch { /* */ } }, 900);
      delete this.nodes[kind];
    },
    volume(v) { this.ctx(); if (this.master) this.master.gain.value = v; },
    stopAll() { Object.keys(this.nodes).forEach(k => this.stop(k)); },
  };

  const AMBS = [
    { k: 'rain', icon: 'rain', label: 'Pluie' },
    { k: 'waves', icon: 'wave', label: 'Vagues' },
    { k: 'fire', icon: 'fire', label: 'Feu' },
    { k: 'brown', icon: 'wind', label: 'Douceur' },
  ];

  App.register({
    id: 'music', title: 'Vinyle', icon: 'vinyl', size: 'T', zen: true,
    defaults: {
      sources: [
        { name: 'Lofi', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
        { name: 'Jazz', url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY' },
        { name: 'Synthwave', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
      ],
      current: 0, volume: 60, ambVolume: 50, showVideo: false,
    },

    mount(ctx) {
      const d = ctx.data;
      const pid = 'yt-' + uid();
      ctx.body.innerHTML = `
        <div class="music">
          <div class="deck">
            <div class="platter">
              <div class="vinyl"><div class="vinyl-label"><span class="label-img"></span></div></div>
              <div class="vinyl-sheen"></div>
              <svg class="tonearm" viewBox="0 0 60 130" aria-hidden="true">
                <defs><linearGradient id="arm-g" x1="0" x2="1"><stop offset="0" stop-color="#f4eef2"/><stop offset=".5" stop-color="#c9bcc4"/><stop offset="1" stop-color="#efe6eb"/></linearGradient></defs>
                <circle cx="44" cy="16" r="11" fill="url(#arm-g)" stroke="rgba(0,0,0,.12)"/>
                <circle cx="44" cy="16" r="4" fill="#9d8f97"/>
                <path d="M44 16 L 40 92 Q 39 100 30 106" stroke="url(#arm-g)" stroke-width="4" fill="none" stroke-linecap="round"/>
                <rect x="20" y="102" width="14" height="20" rx="3" transform="rotate(38 27 112)" fill="#e8dde3" stroke="rgba(0,0,0,.15)"/>
              </svg>
            </div>
            <div class="yt-shell"><div id="${pid}"></div></div>
          </div>
          <div class="m-track">
            <div class="track-title"><span>Choisis une ambiance</span></div>
            <div class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          </div>
          <div class="m-controls">
            <button class="icon-btn" data-a="prev" aria-label="Précédent">${icon('prev', 18)}</button>
            <button class="play-btn sm" data-a="toggle" aria-label="Lecture">${icon('play', 22)}</button>
            <button class="icon-btn" data-a="next" aria-label="Suivant">${icon('next', 18)}</button>
          </div>
          <div class="vol">${icon('volume', 16)}<span class="sep"></span><div class="ambs"></div></div>
          <div class="stations chips-row"></div>
        </div>`;
      const $b = s => ctx.body.querySelector(s);
      const vinyl = $b('.vinyl'), arm = $b('.tonearm'), titleEl = $b('.track-title span'), labelImg = $b('.label-img');
      const playBtn = $b('[data-a="toggle"]'), shell = $b('.yt-shell'), root = $b('.music');
      let player = null, ready = false, playing = false, pending = null, failed = false;

      const vol = UI.slider(d.volume, { min: 0, max: 100 }, v => { d.volume = v; ctx.save(); if (ready) player.setVolume(v); });
      $b('.vol .ic').after(vol);

      function setPlaying(on) {
        playing = on;
        vinyl.classList.toggle('on', on);
        arm.classList.toggle('on', on);
        root.classList.toggle('playing', on);
        playBtn.innerHTML = icon(on ? 'pause' : 'play', 22);
      }
      function setTitle(t) {
        titleEl.textContent = t || '—';
        const box = titleEl.parentElement;
        box.classList.remove('marquee');
        requestAnimationFrame(() => { if (titleEl.scrollWidth > box.clientWidth + 4) { box.classList.add('marquee'); box.style.setProperty('--w', titleEl.scrollWidth + 'px'); } });
      }
      function setCover(id) { labelImg.style.backgroundImage = id ? `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` : ''; }

      function renderStations() {
        const box = $b('.stations');
        box.innerHTML = '';
        d.sources.forEach((s, i) => {
          const b = h('button', { class: 'chip' + (i === d.current ? ' on' : ''), text: s.name });
          b.addEventListener('click', () => { d.current = i; ctx.save(); renderStations(); load(true); });
          box.append(b);
        });
        box.append(h('button', { class: 'chip add', 'aria-label': 'Ajouter', html: icon('plus', 14), onclick: () => addStation() }));
      }

      function renderAmbs() {
        const box = $b('.ambs');
        box.innerHTML = '';
        AMBS.forEach(a => {
          const b = h('button', { class: 'amb' + (Amb.nodes[a.k] ? ' on' : ''), title: a.label, 'aria-label': a.label, html: icon(a.icon, 16) });
          b.addEventListener('click', () => {
            Amb.volume(d.ambVolume / 100);
            Amb.nodes[a.k] ? Amb.stop(a.k) : Amb.start(a.k);
            b.classList.toggle('on', !!Amb.nodes[a.k]);
          });
          box.append(b);
        });
      }

      function load(autoplay) {
        const src = d.sources[d.current];
        if (!src) return;
        const p = parseYT(src.url);
        if (!p) { toast('Lien YouTube invalide', 'close'); return; }
        setCover(p.id);
        setTitle(src.name);
        if (!ready) { pending = autoplay; return; }
        if (p.list) {
          const o = { list: p.list, listType: 'playlist', index: 0 };
          autoplay ? player.loadPlaylist(o) : player.cuePlaylist(o);
        } else autoplay ? player.loadVideoById(p.id) : player.cueVideoById(p.id);
      }

      function addStation() {
        const name = UI.input({ placeholder: 'Nom (ex : Piano)', maxlength: 18 });
        const url = UI.input({ placeholder: 'Lien YouTube (vidéo ou playlist)', type: 'url' });
        const body = h('form', { class: 'stack' }, name, url, h('button', { class: 'btn primary', type: 'submit', html: icon('plus', 16) + '<span>Ajouter</span>' }));
        const m = Modal.open({ title: 'Nouvelle ambiance', icon: 'vinyl', body });
        body.addEventListener('submit', e => {
          e.preventDefault();
          if (!parseYT(url.value)) { url.classList.add('err'); return; }
          d.sources.push({ name: name.value.trim() || 'Ma musique', url: url.value.trim() });
          d.current = d.sources.length - 1;
          ctx.save(); renderStations(); load(true); m.close();
        });
      }

      ctx.body.querySelector('.m-controls').addEventListener('click', e => {
        const a = e.target.closest('button')?.dataset.a;
        if (!a) return;
        if (failed) { toast('YouTube est inaccessible pour le moment', 'close'); return; }
        Sound.get();
        if (!ready) { pending = true; toast('Chargement…', 'vinyl'); return; }
        if (a === 'toggle') {
          if (playing) player.pauseVideo();
          else player.playVideo();
        }
        const isList = !!(player.getPlaylist && player.getPlaylist());
        if (a === 'next') { if (isList) player.nextVideo(); else { d.current = (d.current + 1) % d.sources.length; ctx.save(); renderStations(); load(true); } }
        if (a === 'prev') {
          if (isList) player.previousVideo();
          else if (player.getCurrentTime && player.getCurrentTime() > 5) player.seekTo(0, true);
          else { d.current = (d.current - 1 + d.sources.length) % d.sources.length; ctx.save(); renderStations(); load(true); }
        }
      });

      shell.classList.toggle('show', d.showVideo);
      renderStations();
      renderAmbs();
      const first = parseYT(d.sources[d.current]?.url);
      if (first) setCover(first.id);
      setTitle(d.sources[d.current]?.name || '');

      loadYT().then(YT => {
        if (!document.getElementById(pid)) return;
        const p = parseYT(d.sources[d.current]?.url) || {};
        const vars = { controls: 0, rel: 0, playsinline: 1, modestbranding: 1, disablekb: 1, iv_load_policy: 3 };
        if (location.protocol.startsWith('http')) vars.origin = location.origin;
        if (p.list) { vars.listType = 'playlist'; vars.list = p.list; }
        player = new YT.Player(pid, {
          width: '100%', height: '100%',
          videoId: p.list ? undefined : p.id,
          playerVars: vars,
          events: {
            onReady: () => {
              ready = true;
              player.setVolume(d.volume);
              if (pending) { const auto = pending; pending = null; load(auto); }
            },
            onStateChange: e => {
              setPlaying(e.data === 1 || e.data === 3);
              if (e.data === 1) {
                const vd = player.getVideoData();
                if (vd) { setTitle(vd.title); setCover(vd.video_id); }
              }
            },
            onError: () => toast('Vidéo indisponible, essaie un autre lien', 'close'),
          },
        });
      }).catch(() => { failed = true; setTitle('YouTube indisponible'); });

      ctx.setVideo = on => { d.showVideo = on; ctx.save(); shell.classList.toggle('show', on); };
      ctx.renderStations = renderStations;
      ctx.setAmbVolume = v => { d.ambVolume = v; ctx.save(); Amb.volume(v / 100); };
      ctx.destroy = () => { try { player && player.destroy(); } catch { /* */ } Amb.stopAll(); };
    },

    settings(ctx, el) {
      const d = ctx.data;
      const list = h('ul', { class: 'edit-list' });
      const draw = () => {
        list.innerHTML = '';
        d.sources.forEach((s, i) => list.append(h('li', {},
          h('span', { class: 'el-main', text: s.name }),
          h('small', { text: (parseYT(s.url) || {}).list ? 'playlist' : 'vidéo' }),
          h('button', { class: 'icon-btn xs', 'aria-label': 'Supprimer', html: icon('trash', 14), onclick: () => {
            d.sources.splice(i, 1);
            if (d.current >= d.sources.length) d.current = 0;
            ctx.save(); draw(); ctx.renderStations();
          } }))));
      };
      draw();
      el.append(
        h('div', { class: 'f-block' }, h('span', { class: 'f-label', text: 'Ambiances' }), list),
        UI.row('Afficher la vidéo', UI.toggle(d.showVideo, v => ctx.setVideo(v)), 'video'),
        UI.row('Volume des bruits', UI.slider(d.ambVolume, { min: 0, max: 100 }, v => ctx.setAmbVolume(v)), 'rain'),
        h('p', { class: 'hint', text: 'Colle n’importe quel lien YouTube (vidéo, live ou playlist) avec le bouton +.' }));
    },
  });
})();
