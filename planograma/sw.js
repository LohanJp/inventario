/* ⚡ Service Worker enxuto para economia de bateria
   - Sem Background Sync / Periodic Sync / polling / timers: ele só acorda quando o app pede algo.
   - Não mantém conexões abertas: Firebase (SSE/REST) e qualquer outra origem passam direto, sem interceptação.
   - Ao mudar o app, troque o número da versão (V) para renovar o cache. */
const V='planograma-condor-v1';  // único por app — mude só o sufixo (v1→v2) ao atualizar
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];

/* Instalação tolerante: um ícone ausente não derruba o SW inteiro */
self.addEventListener('install',e=>e.waitUntil(
  caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting())));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('planograma-condor-')&&k!==V).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())));

/* Guarda no cache sem consumir o corpo da resposta (clone síncrono, ANTES de devolvê-la à página) */
const save=(req,res)=>{if(res&&res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(req,cp)).catch(()=>{})}return res};

self.addEventListener('fetch',e=>{
  const r=e.request,url=new URL(r.url);
  if(r.method!=='GET'||url.origin!==location.origin)return;   // Firebase/SSE/outras origens: direto à rede

  /* Abrir o app → Stale-While-Revalidate: abre NA HORA pelo cache (sem esperar rádio/rede).
     Só revalida em segundo plano se houver conexão — offline não faz nenhuma requisição. */
  if(r.mode==='navigate'){
    e.respondWith((async()=>{
      const hit=await caches.match('./index.html',{ignoreSearch:true})||await caches.match('./');
      const refresh=()=>fetch(r).then(res=>save('./index.html',res)).catch(()=>{});
      if(hit){if(self.navigator.onLine!==false)refresh();return hit}
      return fetch(r).then(res=>save('./index.html',res)).catch(()=>new Response('Sem conexão e sem cache.',{status:503}))
    })());
    return;
  }

  /* Ícones/manifest → Cache First SEM revalidar: só mudam quando a versão (V) muda, então não há motivo para gastar rede */
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>save(r,res)).catch(()=>Response.error())));
});
