/* ⚡ Service Worker enxuto para economia de bateria
   - Sem Background Sync / Periodic Sync / polling / timers: ele só acorda quando o app pede algo.
   - Não mantém conexões abertas: Firebase (SSE/REST) passa direto, sem interceptação.
   - Ao mudar o app, troque o número da versão (V) para renovar o cache.
   - Versão Framework7: a biblioteca (lib/framework7) é guardada junto com o app → abre sem internet, sem CDN. */
const V='planograma-condor-v20-f7';  // único por app — mude só o sufixo ao atualizar
const JS=['leitura','estado','base','telas','encarte','oferta','pedido','arquivos','nuvem'].map(n=>'./js/'+n+'.js');
const LIB=['./lib/framework7/framework7.min.js','./lib/framework7/framework7.min.css'];
const SHELL=['./','./index.html','./css/app.css',...LIB,...JS,'./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
/* Bibliotecas de planilha (SheetJS e JSZip) carregadas sob demanda: as URLs têm a versão no caminho e nunca mudam,
   então ficam no cache depois do 1º uso → Encarte e Oferta do dia abrem .xlsx mesmo sem internet. */
const CDN=['cdn.sheetjs.com','cdnjs.cloudflare.com'];

/* Instalação tolerante: um ícone ausente não derruba o SW inteiro */
self.addEventListener('install',e=>e.waitUntil(
  caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting())));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('planograma-condor-')&&k!==V).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())));

/* Guarda no cache sem consumir o corpo da resposta (clone síncrono, ANTES de devolvê-la à página).
   'opaque' = script de outro site carregado por <script> (não dá para ler o status, mas dá para guardar e reusar) */
const save=(req,res)=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(V).then(c=>c.put(req,cp)).catch(()=>{})}return res};
/* Stale-While-Revalidate: responde NA HORA pelo cache e, se houver conexão, atualiza o cache em segundo plano */
const swr=(e,key)=>e.respondWith((async()=>{
  const hit=await caches.match(key,{ignoreSearch:true});
  const net=()=>fetch(e.request).then(res=>save(key,res));
  if(hit){if(self.navigator.onLine!==false)e.waitUntil(net().catch(()=>{}));return hit}
  return net().catch(()=>new Response('Sem conexão e sem cache.',{status:503}))})());

self.addEventListener('fetch',e=>{
  const r=e.request,url=new URL(r.url);
  if(r.method!=='GET')return;

  /* Outras origens: só as bibliotecas da CDN passam pelo cache (Cache First). Firebase/SSE e o resto: direto à rede */
  if(url.origin!==location.origin){
    if(!CDN.includes(url.hostname))return;
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>save(r,res))));
    return;
  }

  /* Abrir o app (index.html) e o código do app (css/js, inclusive o Framework7) → Stale-While-Revalidate:
     abre na hora pelo cache e já baixa a versão nova para a próxima abertura. Offline não faz nenhuma requisição. */
  if(r.mode==='navigate')return swr(e,'./index.html');
  if(/\.(js|css)$/.test(url.pathname))return swr(e,url.pathname);

  /* Ícones/manifest → Cache First SEM revalidar: só mudam quando a versão (V) muda, então não há motivo para gastar rede */
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>save(r,res)).catch(()=>Response.error())));
});
