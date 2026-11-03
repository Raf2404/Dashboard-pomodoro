/* Service worker : l'app reste utilisable hors ligne (réseau d'abord, cache en secours) */
const CACHE = 'revisions-v1';
const SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'assets/icon.svg',
  'vendor/Sortable.min.js', 'js/icons.js', 'js/core.js', 'js/app.js', 'js/main.js',
  'js/widgets/timer.js', 'js/widgets/pet.js', 'js/widgets/music.js', 'js/widgets/news.js',
  'js/widgets/todo.js', 'js/widgets/flashcards.js', 'js/widgets/tools.js', 'js/widgets/countdown.js',
  'js/widgets/photo.js', 'js/widgets/notes.js', 'js/widgets/maxim.js', 'js/widgets/stats.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!sameOrigin && !isFont) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
