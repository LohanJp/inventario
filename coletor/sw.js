/* ═══════════════════════════════════════════════
   Service Worker — Inventário Scanner
   Estratégia: Cache-First para recursos externos,
   Network-First para o HTML principal.
═══════════════════════════════════════════════ */

const CACHE_NAME = 'inventario-v1';

// Recursos para pré-cachear na instalação
const PRE_CACHE = [
  './inventario.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'
];

// ── Instalação: pré-carrega os recursos essenciais ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Tenta cachear cada recurso individualmente para não falhar tudo se um recurso externo não responder
      return Promise.allSettled(
        PRE_CACHE.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] Não foi possível cachear: ' + url, err);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting(); // ativa imediatamente sem esperar fechar abas
    })
  );
});

// ── Ativação: limpa caches antigas ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key)   { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim(); // assume controle de todas as abas abertas
    })
  );
});

// ── Fetch: Cache-First com fallback para rede ──
self.addEventListener('fetch', function(event) {
  // Ignora requisições não-GET e chrome-extension
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  // Para o HTML principal: Network-First (sempre tenta versão mais nova)
  if (event.request.url.endsWith('inventario.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(function(networkResponse) {
          // Atualiza o cache com a versão mais nova
          var clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          return networkResponse;
        })
        .catch(function() {
          // Sem rede: usa o cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Para tudo mais (fontes, bibliotecas): Cache-First
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      // Não está no cache: busca na rede e guarda
      return fetch(event.request).then(function(networkResponse) {
        var clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return networkResponse;
      });
    })
  );
});
