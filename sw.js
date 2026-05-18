// ════════════════════════════════════════════════════════════════════
// CAELMO Entregas — Service Worker v5 (GitHub Pages)
//
// Estratégia: Cache-First para o shell do app.
// O HTML é cacheado na instalação E atualizado sempre que o app
// é aberto online. Assim o app abre instantaneamente mesmo sem sinal.
// ════════════════════════════════════════════════════════════════════

var CACHE = 'caelmo-v5';

// Arquivos que DEVEM estar no cache para o app funcionar offline
var SHELL = [
  './',
  './index.html'
];

// ── INSTALL: cacheia o shell imediatamente ──────────────────────────
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL);
    }).catch(function() {
      // Se falhar no install (ex: offline na 1ª visita), tudo bem —
      // o cache será preenchido na próxima vez online.
    })
  );
});

// ── ACTIVATE: limpa caches antigos ─────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  return self.clients.claim();
});

// ── FETCH: Cache-First para o HTML, Network-First para a API GAS ───
self.addEventListener('fetch', function(e) {
  var req = e.request;

  // Deixa passar: chamadas POST (sync de entregas)
  if (req.method !== 'GET') return;

  var url = req.url;

  // Deixa passar: chamadas para o GAS (API backend)
  if (url.indexOf('script.google.com') >= 0) return;
  if (url.indexOf('script.googleusercontent.com') >= 0) return;
  // Deixa passar: teste de conectividade real (não serve do cache)
  if (url.indexOf('connectivity=1') >= 0) return;

  // Para o próprio app (GitHub Pages): Cache-First
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function(cached) {
      // Se tem no cache, retorna imediatamente (funciona offline)
      if (cached) {
        // Em background, tenta atualizar o cache enquanto serve o cached
        if (navigator.onLine) {
          fetch(req).then(function(res) {
            if (res && res.ok) {
              caches.open(CACHE).then(function(cache) {
                cache.put(req, res);
              });
            }
          }).catch(function() {});
        }
        return cached;
      }

      // Não tem no cache: busca na rede
      return fetch(req).then(function(res) {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(req, clone);
          });
        }
        return res;
      }).catch(function() {
        // Offline e sem cache: retorna uma página de fallback simples
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<style>body{background:#1a1a2e;color:#fff;font-family:Arial;display:flex;' +
          'align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}' +
          '.box{padding:2rem}.icon{font-size:4rem;margin-bottom:1rem}' +
          'h2{margin:0 0 .5rem;font-size:1.4rem}p{opacity:.7;font-size:.9rem}</style></head>' +
          '<body><div class="box"><div class="icon">📡</div>' +
          '<h2>Sem conexão</h2>' +
          '<p>Abra o app uma vez com internet<br>para habilitar o modo offline.</p></div></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      });
    })
  );
});
