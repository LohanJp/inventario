/* Service worker "modo simples": não guarda nada em cache, só fica
   registrado (necessário pra opção de instalar o app). Toda requisição
   vai direto pra rede, sem interceptar nada. Bom enquanto o app ainda
   está em ajuste — evita ficar servindo versão antiga por engano.
   Se quiser reativar o funcionamento offline de verdade mais pra
   frente, é só pedir. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // limpa qualquer cache de versões anteriores do app
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});


