const V='planograma-mobile-v2';
const SHELL=['./','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('planograma-mobile-')&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const url=new URL(r.url);
  /* Firebase e recursos externos: passa direto, sem cache */
  if(url.origin!==location.origin)return;
  /* index.html: network-first — garante sempre a versão mais recente */
  if(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')||url.pathname.endsWith('planograma-mobile.html')){
    e.respondWith(fetch(r).then(res=>{if(res.ok){caches.open(V).then(c=>c.put(r,res.clone()))}return res})
      .catch(()=>caches.match(r)));
    return;
  }
  /* Outros assets do app: cache-first (ícones, manifest) */
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>{
    const net=fetch(r).then(res=>{if(res.ok){caches.open(V).then(c=>c.put(r,res.clone()))}return res}).catch(()=>hit);
    return hit||net}))});
