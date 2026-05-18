// ════════════════════════════════════════════════════════════════════
// CAELMO Entregas — Service Worker v6
// ════════════════════════════════════════════════════════════════════

var CACHE = 'caelmo-v6';

var SHELL = [
  './',
  './index.html',
  './manifest.json'
];

// INSTALL
self.addEventListener('install', function(e) {
  self.skipWaiting();

  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL);
    })
  );
});

// ACTIVATE
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(k) {
          if (k !== CACHE) {
            return caches.delete(k);
          }
        })
      );
    })
  );

  return self.clients.claim();
});

// FETCH
self.addEventListener('fetch', function(e) {

  var req = e.request;

  // Ignora POST
  if (req.method !== 'GET') return;

  var url = req.url;

  // NÃO intercepta GAS
  if (url.indexOf('script.google.com') >= 0) return;
  if (url.indexOf('script.googleusercontent.com') >= 0) return;

  // NÃO intercepta conectividade
  if (url.indexOf('connectivity=1') >= 0) return;

  e.respondWith(

    caches.match(req, { ignoreSearch: true }).then(function(cached) {

      // Retorna cache imediatamente
      if (cached) {

        // Atualiza em background
        fetch(req).then(function(res) {

          if (res && res.ok) {

            caches.open(CACHE).then(function(cache) {
              cache.put(req, res.clone());
            });

          }

        }).catch(function(){});

        return cached;
      }

      // Busca rede
      return fetch(req).then(function(res) {

        if (res && res.ok) {

          caches.open(CACHE).then(function(cache) {
            cache.put(req, res.clone());
          });

        }

        return res;

      }).catch(function() {

        return new Response(
          '<h1 style="font-family:Arial;padding:20px">Sem conexão</h1>',
          {
            headers: {
              'Content-Type': 'text/html'
            }
          }
        );

      });

    })

  );

});
