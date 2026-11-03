/* Flux d'actualité juridique (RSS) */
(() => {
  const CACHE_KEY = 'lea-news-cache';
  const TTL = 30 * 60 * 1000;
  const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; } };
  const writeCache = c => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* */ } };

  const strip = s => (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s || ''; return t.value; };

  function parseXML(txt) {
    const doc = new DOMParser().parseFromString(txt, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('xml');
    const items = [...doc.querySelectorAll('item, entry')];
    return items.map(it => {
      const get = sel => it.getElementsByTagName(sel)[0];
      const link = get('link');
      const media = it.getElementsByTagName('media:content')[0] || it.getElementsByTagName('media:thumbnail')[0] || get('enclosure');
      return {
        title: decode(strip(get('title')?.textContent)),
        link: link?.getAttribute('href') || link?.textContent?.trim() || '',
        date: get('pubDate')?.textContent || get('published')?.textContent || get('updated')?.textContent || get('dc:date')?.textContent || '',
        img: media?.getAttribute('url') || '',
      };
    }).filter(i => i.title && i.link);
  }

  async function fetchFeed(url) {
    const timeout = ms => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
    try {
      const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url), { signal: timeout(9000) });
      const j = await r.json();
      if (j.status === 'ok' && j.items?.length) {
        return j.items.map(i => ({
          title: decode(strip(i.title)), link: i.link,
          date: i.pubDate ? i.pubDate.replace(' ', 'T') + 'Z' : '',
          img: i.thumbnail || i.enclosure?.link || '',
        }));
      }
    } catch { /* on essaie le proxy suivant */ }
    const proxies = [
      u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
      u => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
    ];
    for (const p of proxies) {
      try {
        const r = await fetch(p(url), { signal: timeout(9000) });
        if (!r.ok) continue;
        const items = parseXML(await r.text());
        if (items.length) return items;
      } catch { /* */ }
    }
    throw new Error('feed');
  }

  const HUES = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)', '#9fd3c0', '#f6c177', '#9ec5f0'];

  App.register({
    id: 'news', title: 'Actu juridique', icon: 'news', size: 'L',
    defaults: {
      feeds: [
        { name: 'Le Monde', url: 'https://www.lemonde.fr/justice/rss_full.xml' },
        { name: 'Franceinfo', url: 'https://www.francetvinfo.fr/societe/justice.rss' },
        { name: 'Village Justice', url: 'https://www.village-justice.com/articles/spip.php?page=backend' },
        { name: 'Actu-Juridique', url: 'https://www.actu-juridique.fr/feed/' },
      ],
      active: 'all',
    },

    mount(ctx) {
      const d = ctx.data;
      ctx.body.innerHTML = `<div class="news"><div class="chips-row"></div><div class="news-list"></div></div>`;
      const chips = ctx.body.querySelector('.chips-row');
      const list = ctx.body.querySelector('.news-list');
      const refreshBtn = ctx.addAction('refresh', 'Actualiser', () => load(true));
      let results = {};

      function drawChips() {
        chips.innerHTML = '';
        const mk = (key, label, i) => {
          const b = h('button', { class: 'chip' + (d.active === key ? ' on' : ''), style: i != null ? { '--dot': HUES[i % HUES.length] } : null },
            i != null ? h('i', { class: 'dot' }) : null, label);
          b.addEventListener('click', () => { d.active = key; ctx.save(); drawChips(); drawList(); });
          chips.append(b);
        };
        mk('all', 'Tout');
        d.feeds.forEach((f, i) => mk(f.url, f.name, i));
      }

      function drawList() {
        let items = [];
        const sel = d.active === 'all' ? d.feeds : d.feeds.filter(f => f.url === d.active);
        sel.forEach(f => {
          const i = d.feeds.indexOf(f);
          (results[f.url] || []).forEach(it => items.push({ ...it, src: f.name, hue: HUES[i % HUES.length] }));
        });
        items.sort((a, b) => (new Date(b.date) || 0) - (new Date(a.date) || 0));
        items = items.slice(0, 40);
        list.innerHTML = '';
        if (!items.length) {
          const loading = sel.some(f => results[f.url] === undefined);
          list.append(loading ? h('div', { class: 'news-skel' }, ...Array.from({ length: 5 }, () => h('div', { class: 'skel' }, h('i'), h('b'), h('b', { class: 'short' }))))
            : h('div', { class: 'empty' },
              h('span', { class: 'empty-ic', html: icon('news', 22) }),
              h('p', { text: 'Actus indisponibles pour le moment' }),
              h('button', { class: 'btn soft', html: icon('refresh', 15) + '<span>Réessayer</span>', onclick: () => load(true) })));
          return;
        }
        items.forEach((it, n) => {
          const featured = n === 0 && it.img;
          const a = h('a', { class: 'news-item' + (featured ? ' featured' : ''), href: it.link, target: '_blank', rel: 'noopener', style: { '--hue': it.hue, '--n': Math.min(n, 12) } },
            featured ? h('span', { class: 'news-img', style: { backgroundImage: `url("${it.img.replace(/"/g, '')}")` } }) : null,
            h('span', { class: 'news-meta' }, h('i', { class: 'dot' }), h('span', { text: it.src }), h('time', { text: relTime(it.date) })),
            h('span', { class: 'news-title', text: it.title }),
            h('span', { class: 'news-go', html: icon('arrow', 14) }));
          list.append(a);
        });
      }

      async function load(force) {
        const cache = readCache();
        refreshBtn.classList.add('spin');
        results = {};
        d.feeds.forEach(f => { const c = cache[f.url]; if (c && (!force && Date.now() - c.t < TTL)) results[f.url] = c.items; });
        drawList();
        await Promise.all(d.feeds.map(async f => {
          if (results[f.url]) return;
          try {
            const items = await fetchFeed(f.url);
            results[f.url] = items;
            cache[f.url] = { t: Date.now(), items: items.slice(0, 30) };
          } catch {
            results[f.url] = cache[f.url]?.items || [];
          }
          drawList();
        }));
        writeCache(cache);
        refreshBtn.classList.remove('spin');
        drawList();
      }

      drawChips();
      load(false);
      const iv = setInterval(() => load(false), TTL);
      ctx.reload = () => { drawChips(); load(false); };
      ctx.destroy = () => clearInterval(iv);
    },

    settings(ctx, el) {
      const d = ctx.data;
      const list = h('ul', { class: 'edit-list' });
      const draw = () => {
        list.innerHTML = '';
        d.feeds.forEach((f, i) => list.append(h('li', {},
          h('span', { class: 'el-main', text: f.name }),
          h('small', { text: (() => { try { return new URL(f.url).hostname.replace('www.', ''); } catch { return ''; } })() }),
          h('button', { class: 'icon-btn xs', 'aria-label': 'Supprimer', html: icon('trash', 14), onclick: () => { d.feeds.splice(i, 1); if (d.active === f.url) d.active = 'all'; ctx.save(); draw(); ctx.reload(); } }))));
      };
      draw();
      const name = UI.input({ placeholder: 'Nom', maxlength: 20 });
      const url = UI.input({ placeholder: 'Lien du flux RSS', type: 'url' });
      const form = h('form', { class: 'add-row' }, name, url, h('button', { class: 'icon-btn accent', type: 'submit', 'aria-label': 'Ajouter', html: icon('plus', 16) }));
      form.addEventListener('submit', e => {
        e.preventDefault();
        if (!/^https?:\/\//.test(url.value.trim())) { url.classList.add('err'); return; }
        d.feeds.push({ name: name.value.trim() || 'Flux', url: url.value.trim() });
        name.value = url.value = '';
        ctx.save(); draw(); ctx.reload();
      });
      el.append(h('div', { class: 'f-block' }, h('span', { class: 'f-label', text: 'Sources' }), list), form,
        h('p', { class: 'hint', text: 'Ajoute n’importe quel flux RSS (Conseil d’État, Dalloz, blogs…).' }));
    },
  });
})();
