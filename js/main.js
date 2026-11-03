/* Démarrage */
(() => {
  $('#btn-zen').innerHTML = icon('focus', 19);
  $('#btn-edit').innerHTML = icon('grid', 19);
  $('#btn-custom').innerHTML = icon('palette', 19);
  $('#edit-add').innerHTML = icon('plus', 16) + '<span>Widgets</span>';
  $('#edit-done').innerHTML = icon('check', 16) + '<span>Terminé</span>';
  $('#zen-exit').innerHTML = icon('close', 18);

  App.init();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
