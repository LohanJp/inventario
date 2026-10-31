/* Planograma Mobile — NUVEM (Firebase): código, envio/recebimento, pendências offline, tempo real (SSE) e inicialização do app (boot).
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */

/* ═══ NUVEM — Fonte de verdade única no Firebase ═══════════════════════════
   Estrutura:
     /planograma/{code}/plano/info     — metadados (filial, date, total, exportedAt)
     /planograma/{code}/plano/records  — array de produtos (escrito no upload)
     /planograma/{code}/trans/info     — metadados do trânsito
     /planograma/{code}/trans/data     — transitMap (escrito no upload)
     /planograma/{code}/estq/info      — metadados do relatório de Cobertura (nome, data/hora do relatório, total)
     /planograma/{code}/estq/data      — estoqueMap (escrito no upload)
     /planograma/{code}/live/done      — { "produto": true/null } em tempo real
     /planograma/{code}/live/pedido    — array do pedido em tempo real
     /planograma/{code}/live/dep       — array de códigos marcados 🔎 Procurar no depósito

   Qualquer marcação ou mudança de pedido é escrita imediatamente no Firebase.
   Todos os dispositivos recebem via SSE sem precisar de botão "Baixar".
   ⚠ Segurança: use as regras de database.rules.json no Firebase (bloqueiam a leitura da raiz /planograma,
     senão qualquer pessoa lista TODOS os códigos e baixa os dados).
*/
const FB='https://planograma-48711-default-rtdb.firebaseio.com',LSC='planograma_sync_code';
/* código padrão: aparelho novo (sem código salvo) já abre baixando da nuvem. "Definir / alterar código" continua trocando */
const DEF_CODE='super@38';
const code=()=>{try{return localStorage.getItem(LSC)||DEF_CODE}catch{return DEF_CODE}};
function askCode(){
  const raw=prompt('Invente um código de sincronização (mín. 8 caracteres). Use o MESMO nos dois aparelhos:',code());
  if(raw===null)return '';
  const c=raw.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9_@!*+=~-]/g,'').slice(0,64);
  if(c.length<8){toast(`Código com ${c.length} caractere(s) — precisa de 8 ou mais`);return ''}
  localStorage.setItem(LSC,c);toast('Código salvo: '+c);return c}

const cu=(c,path)=>`${FB}/planograma/${encodeURIComponent(c)}/${path}.json`;

async function cf(url,o){
  let r;try{r=await fetch(url,o)}catch{throw Error('Sem conexão com a nuvem')}
  if(r.status===401||r.status===403)throw Error('Sem permissão — confira as regras do Firebase');
  if(r.status===404||r.status===200)return r; // 404 = nó vazio, retorna null via .json()
  if(!r.ok)throw Error('Erro da nuvem ('+r.status+')');return r}

function put(c,path,val){
  const url=cu(c,path);
  fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(val)})
    .catch(()=>{}); // fire-and-forget para ações do usuário
}

function patch(c,path,val){
  const url=cu(c,path);
  return fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(val)});
}

let lastLocal=0,pedT,cloudDone=new Set();
/* ⏳ PENDÊNCIAS: concluídos, pedido e 🔎 alterados sem internet ficam marcados aqui (também no localStorage, sobrevive a fechar o app).
   Enquanto houver pendência, a nuvem NÃO sobrescreve o aparelho: na próxima conexão o app ENVIA o que está aqui.
   (Antes, o pedido montado sem sinal sumia ao reabrir o app, porque a versão antiga da nuvem era baixada por cima.) */
const LSPEND='planograma_pend';let livePend={};try{livePend=JSON.parse(localStorage.getItem(LSPEND)||'{}')||{}}catch{}
function setPend(k,v){if(!!livePend[k]===v)return;if(v)livePend[k]=true;else delete livePend[k];try{localStorage.setItem(LSPEND,JSON.stringify(livePend))}catch{}cloudBadge()}
/* ícone na barra do topo em vez de avisos que cobriam a tela: ⏳ = alteração deste aparelho aguardando envio · ⚠ = sem conexão com a nuvem.
   Tocar abre a aba Dados (lá aparecem os detalhes). */
let cloudErr='';
function cloudBadge(){const b=$('fresh-cloud');if(!b)return;const p=Object.keys(livePend).length;
  b.hidden=!(p||cloudErr);b.textContent=p?'⏳':'⚠';
  b.title=p?'Alterações deste aparelho aguardando envio para a nuvem':'Nuvem: '+cloudErr;b.setAttribute('aria-label',b.title)}
$('fresh-cloud').onclick=()=>go('data');
/* done: envia só o que mudou (antes mandava os ~7 mil produtos a cada toque) */
function cloudWriteDone(){
  const c=code();if(!c||!allRecords.length)return;
  const map={};let n=0;
  doneSet.forEach(k=>{if(!cloudDone.has(k)){map[k]=true;n++}});
  cloudDone.forEach(k=>{if(!doneSet.has(k)){map[k]=null;n++}});
  if(!n){setPend('done',false);return}
  setPend('done',true);lastLocal=Date.now();
  const snap=new Set(doneSet);
  patch(c,'live/done',map).then(r=>{if(!r.ok)return;cloudDone=snap;
    if(snap.size===doneSet.size&&[...doneSet].every(k=>snap.has(k)))setPend('done',false)}).catch(()=>{});   // só limpa se nada mudou durante o envio
}
/* pedido: espera 0,4 s parado (digitar a quantidade não dispara um envio por letra) */
const pedBody=()=>JSON.stringify(pedido.length?pedido:null);
function cloudWritePedido(){
  const c=code();if(!c)return;lastLocal=Date.now();setPend('pedido',true);
  clearTimeout(pedT);pedT=setTimeout(()=>{const body=pedBody();
    fetch(cu(c,'live/pedido'),{method:'PUT',headers:{'Content-Type':'application/json'},body})
      .then(r=>{if(!r.ok)throw 0;cloudErr='';if(pedBody()===body)setPend('pedido',false);else cloudBadge()})
      .catch(()=>{cloudErr='sem conexão — o pedido fica neste aparelho e é enviado sozinho quando a internet voltar';cloudBadge()})},400);
}
/* 🔎 marcações de depósito: array de códigos em live/dep (array evita o Firebase converter chaves numéricas) */
let depT;
const depBody=()=>{const ks=Object.keys(depMap);return JSON.stringify(ks.length?ks:null)};
function cloudWriteDep(){
  const c=code();if(!c)return;lastLocal=Date.now();setPend('dep',true);
  clearTimeout(depT);depT=setTimeout(()=>{const body=depBody();
    fetch(cu(c,'live/dep'),{method:'PUT',headers:{'Content-Type':'application/json'},body})
      .then(r=>{if(!r.ok)throw 0;cloudErr='';if(depBody()===body)setPend('dep',false);else cloudBadge()})
      .catch(()=>{cloudErr='sem conexão — a marcação 🔎 fica neste aparelho e é enviada sozinha quando a internet voltar';cloudBadge()})},400);
}
/* undefined = falha de rede (não mexe no local) · null = nuvem vazia */
async function applyLive(c){
  const g=p=>cf(cu(c,p)).then(r=>r.json()).catch(()=>undefined);
  const live=await g('live');const ld=live===undefined?undefined:(live&&live.done)||null,lp=live===undefined?undefined:(live&&live.pedido)||null,ldp=live===undefined?undefined:(live&&live.dep)||null,lenc=live===undefined?undefined:(live&&live.enc)||null,lof=live===undefined?undefined:(live&&live.of)||null,lpf=live===undefined?undefined:(live&&live.pf)||null;
  if(ld!==undefined){
    const cs=new Set(ld&&typeof ld==='object'?Object.entries(ld).filter(([,v])=>v===true).map(([k])=>k):[]);
    if(livePend.done){cloudDone=cs;cloudWriteDone()}                   // ⏳ alterado sem internet: envia o do aparelho em vez de baixar
    else{doneSet=cs;cloudDone=new Set(cs);try{localStorage.setItem(lsKey,JSON.stringify([...doneSet]))}catch{}}
  }
  if(ldp!==undefined){
    if(livePend.dep)cloudWriteDep();
    else{depMap={};(Array.isArray(ldp)?ldp:(ldp&&typeof ldp==='object'?Object.values(ldp):[])).forEach(k=>{if(k)depMap[k]=true});
      try{localStorage.setItem(LSDEP,JSON.stringify(Object.keys(depMap)))}catch{}}
    refreshDep();
  }
  if(lp!==undefined){
    if(livePend.pedido)cloudWritePedido();
    else{pedido=Array.isArray(lp)?lp:(lp&&typeof lp==='object'?Object.values(lp):[]);
      try{localStorage.setItem(LSP,JSON.stringify(pedido))}catch{}}
  }
  if(lenc!==undefined)await syncEnc(c,lenc).catch(()=>{});
  if(lof!==undefined)await syncOf(c,lof).catch(()=>{});
  if(lpf!==undefined)await syncPf(c,lpf).catch(()=>{});
  derive();updBadge();
}

/* Carrega tudo da nuvem (records + transit + live) */
const tsMeta=m=>{if(!m||!m.date)return 0;const [d,mo,y]=String(m.date).split('/'),[h,mi,se]=String(m.hora||'00:00:00').split(':');return new Date(+y,+mo-1,+d,+h||0,+mi||0,+se||0).getTime()||0};   // data + HORA do relatório
const metaTxt=m=>m&&m.date?m.date+(m.hora?' '+String(m.hora).slice(0,5):''):'?';
/* Cobertura na nuvem: baixa só se a versão for diferente da guardada no aparelho — e nunca sobrescreve um relatório local MAIS NOVO */
async function syncEstoque(c,ei){
  if(!ei||!ei.exportedAt)return;
  const loc=idb?await idbGet('estoque').catch(()=>null):null;
  if(loc&&loc.map&&loc.cloudAt===ei.exportedAt){                     // já tenho esta versão
    if(!estoqueLoaded){estoqueMap=loc.map;estoqueLoaded=true;estoqueMeta=loc.meta||ei.meta||null}
    return}
  if(estoqueLoaded&&tsMeta(estoqueMeta)>tsMeta(ei.meta))return;     // o do aparelho é mais novo: mantém (envie para a nuvem se quiser)
  const data=await cf(cu(c,'estq/data')).then(r=>r.json()).catch(()=>null);
  if(!data||typeof data!=='object')return;
  estoqueMap=data;estoqueLoaded=true;estoqueMeta=ei.meta||null;
  const nome=ei.name||'nuvem',quando=new Date().toLocaleString('pt-BR');
  if(idb)idbSave({id:'estoque',map:estoqueMap,meta:estoqueMeta,name:nome,savedAt:quando,cloudAt:ei.exportedAt}).catch(()=>{});
  $('cob-status').innerHTML=`<b>✓ ${esc(nome)}</b> · ${f0(Object.keys(estoqueMap).length)} produtos · da nuvem`;
}
async function loadFromCloud(c){
  busy(true,'Baixando da nuvem…');
  let cerr='';                                                       // 1º erro de rede/Firebase (antes ficava escondido e o app só abria os dados locais)
  const gj=p=>cf(cu(c,p)).then(r=>r.json()).catch(e=>{cerr=cerr||e.message;return null});
  try{
    const [pi,ti,ei]=await Promise.all([gj('plano/info'),gj('trans/info'),gj('estq/info')]);
    cloudErr=cerr;cloudBadge();                                       // erro de conexão vira o ícone ⚠ no topo (antes era um aviso no meio da tela)
    if(!pi||!pi.total){busy(false);return false}
    await syncEstoque(c,ei);                                         // antes de montar a tela, para o MDV/cobertura já virem certos
    const loc=idb?await idbGet('current').catch(()=>null):null;   // já tem esta versão neste aparelho?
    if(loc&&loc.records&&loc.cloudAt===pi.exportedAt&&(!ti||loc.transAt===ti.exportedAt)){
      await loadRecords(loc.records,loc.meta||{},loc.name,loc.transit||null,false,loc.savedAt);
      await applyLive(c);derive();renderHome();busy(false);return true;
    }

    const [records,transData]=await Promise.all([gj('plano/records'),ti?gj('trans/data'):Promise.resolve(null)]);
    if(!Array.isArray(records)||!records.length){busy(false);toast('⚠ Não consegui baixar o planograma'+(cerr?': '+cerr:' (resposta vazia da nuvem)'));return false}

    if(ti)transitMeta=ti.meta||{date:ti.date||'',hora:''};            // data REAL do relatório de Trânsito
    const meta=pi.meta||{filial:pi.filial,date:pi.date,hora:''};
    await loadRecords(records,meta,pi.name||'nuvem',
      transData&&typeof transData==='object'?transData:null,
      true /* persist to IDB */);
    try{const r=await idbGet('current');if(r){r.cloudAt=pi.exportedAt;r.transAt=ti?ti.exportedAt:undefined;await idbSave(r)}}catch{}
    await applyLive(c);derive();renderHome();
    busy(false);
    return true;
  }catch(e){busy(false);toast(e.message);return false}
}

/* SSE: avisa que algo mudou em live/ → relê (pequeno) e redesenha só se for diferente */
let sseConn=null,liveT;
const liveSig=()=>JSON.stringify([...doneSet].sort())+JSON.stringify(pedido)+Object.keys(depMap).sort().join();
function liveRefresh(){clearTimeout(liveT);
  liveT=setTimeout(async()=>{
    if(document.hidden)return;                                   // ⚡ em segundo plano não gasta rede nem CPU
    const c=code();if(!c)return;const a=liveSig();await applyLive(c);if(liveSig()===a)return;
    const s=document.querySelector('section.on');if(!s)return;const id=s.id.slice(2);
    schedule(()=>{if(id==='home')renderHome();else if(id==='prod')renderList(false);else if(id==='ped')renderPed()})},   // ⚡ 1 renderização por quadro
    Math.max(400,lastLocal+2500-Date.now()));                    // ignora o "eco" das próprias alterações
}
function stopSSE(){if(sseConn){try{sseConn.close()}catch{}sseConn=null}}
function startSSE(c){
  stopSSE();
  if(document.hidden||!navigator.onLine)return;                  // ⚡ nunca abre conexão em 2º plano ou offline
  const es=new EventSource(`${FB}/planograma/${encodeURIComponent(c)}/live.json?accept=text%2Fevent-stream`);
  sseConn=es;
  es.addEventListener('put',liveRefresh);es.addEventListener('patch',liveRefresh);
  es.onerror=()=>{if(!navigator.onLine)stopSSE()};               // ⚡ offline: sem reconexão automática a cada ~3 s (acordaria o rádio)
}
/* ⚡ Page Visibility: conexão aberta SÓ com o app visível. Ao voltar: 1 leitura de atualização + reabre */
document.addEventListener('visibilitychange',()=>{const c=code();if(!c||!allRecords.length)return;
  if(document.hidden){stopSSE();clearTimeout(liveT)}else{liveRefresh();startSSE(c)}});
addEventListener('online',()=>{const c=code();if(c&&allRecords.length&&!document.hidden){liveRefresh();startSSE(c)}});   // voltou a internet: applyLive envia as pendências ⏳
addEventListener('offline',stopSSE);
addEventListener('pagehide',stopSSE);

/* Exibe status na aba Dados */
let cinfoAt=0;
async function cloudInfo(force){if(!force&&Date.now()-cinfoAt<60000)return;cinfoAt=Date.now();
  const c=code(),el=$('d-cloud');
  $('d-code').textContent=c||'não definido';
  if(!c){el.textContent='Informe um código para enviar e receber dados entre aparelhos.';return}
  el.textContent='Verificando…';
  try{
    const [pi,ti,ei]=await Promise.all([
      cf(cu(c,'plano/info')).then(r=>r.json()).catch(()=>null),
      cf(cu(c,'trans/info')).then(r=>r.json()).catch(()=>null),
      cf(cu(c,'estq/info')).then(r=>r.json()).catch(()=>null)
    ]);
    const pnd=Object.keys(livePend).length?`<br><span style="color:var(--am)">⏳ Alterações deste aparelho aguardando envio (${Object.keys(livePend).map(k=>({done:'concluídos',pedido:'pedido',dep:'🔎 depósito'}[k]||k)).join(', ')})</span>`:'';
    let html='';
    if(pi)html+=`<b>Planograma:</b> ${esc(pi.filial||'')} · ${esc(metaTxt(pi.meta||{date:pi.date}))} · ${f0(pi.total)} produtos<br>Enviado ${esc(new Date(pi.exportedAt).toLocaleString('pt-BR'))}<br>`;
    else  html+=`<span style="color:var(--mu)">Planograma: nenhum na nuvem</span><br>`;
    if(ti)html+=`<b>Trânsito:</b> ${esc(metaTxt(ti.meta||{date:ti.date}))} · ${f0(ti.total)} itens · ${esc(new Date(ti.exportedAt).toLocaleString('pt-BR'))}<br>`;
    else  html+=`<span style="color:var(--mu)">Trânsito: nenhum na nuvem</span><br>`;
    if(ei)html+=`<b>Cobertura:</b> ${esc(metaTxt(ei.meta))} · ${f0(ei.total)} itens · ${esc(new Date(ei.exportedAt).toLocaleString('pt-BR'))}`;
    else  html+=`<span style="color:var(--mu)">Cobertura: nenhuma na nuvem</span>`;
    el.innerHTML=html+pnd;
  }catch(e){el.textContent=e.message}
}

$('b-code').onclick=async()=>{
  const c=askCode();if(!c)return;
  // Com novo código: tenta carregar dados da nuvem
  const loaded=await loadFromCloud(c);
  if(loaded)startSSE(c);
  cloudInfo(true);
};

/* ⬇ BAIXAR TUDO DA NUVEM em .json: o que está guardado no código (planograma, cobertura, trânsito, pedido, concluídos, 🔎,
   ofertas, panfletos, encarte) exatamente como está no Firebase — serve de cópia de segurança e para analisar os relatórios sem os .txt */
$('b-cloudjson').onclick=async()=>{
  const c=code();if(!c)return toast('Defina o código da nuvem primeiro');
  busy(true,'Baixando tudo da nuvem…',true);
  try{
    const d=await cf(`${FB}/planograma/${encodeURIComponent(c)}.json`).then(r=>r.json());
    if(!d||typeof d!=='object'){busy(false);return toast('A nuvem está vazia para este código')}
    const out={app:'planograma-nuvem',exportedAt:new Date().toISOString(),partes:Object.keys(d),dados:d};
    const txt=JSON.stringify(out),dt=new Date().toISOString().slice(0,10);
    downloadBlob(new Blob([txt],{type:'application/json;charset=utf-8'}),`planograma_nuvem_${dt}.json`);
    busy(false);toast(`Nuvem baixada · ${(txt.length/1048576).toFixed(1).replace('.',',')} MB`);
  }catch(e){busy(false);toast('⚠ '+e.message)}};

/* Envia relatório para a nuvem — separado por tipo, com guarda de data E HORA (2 relatórios do mesmo dia não se confundem) */
$('b-up').onclick=async()=>{
  if(!planoRecs.length)return toast('Nada para enviar');
  const c=code()||askCode();if(!c)return;
  busy(true,'Verificando nuvem…');
  try{
    // Verifica se há planograma mais novo na nuvem
    const pi=await cf(cu(c,'plano/info')).then(r=>r.json()).catch(()=>null);
    if(pi){
      const pm=pi.meta||{date:pi.date};
      if(tsMeta(pm)>tsMeta(currentMeta)){
        busy(false);
        if(!confirm(`A nuvem tem um planograma mais recente (${metaTxt(pm)}) do que o seu (${metaTxt(currentMeta)}).\nSobrescrever mesmo assim?`))return;
        busy(true,'Enviando…');
      }
    }
    busy(true,'Enviando planograma…');
    const now=new Date().toISOString();let tUp=false;const fails=[];
    await Promise.all([
      cf(cu(c,'plano/records'),{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(planoRecs.map(rawRec))}).then(r=>{if(!r.ok)throw Error('Falha ao enviar records')}),
      cf(cu(c,'plano/info'),{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({exportedAt:now,name:savedInfo?.name||'planograma',
          filial:currentMeta.filial||'',date:currentMeta.date||'',total:planoRecs.length,
          meta:currentMeta})}).then(r=>{if(!r.ok)throw Error('Falha ao enviar info')})
    ]);
    if(encSrc&&encItems.length){encPending=true;await encSaveLocal();pushEnc()}   // Encarte vai junto
    // Envia live/done e live/pedido junto (garante consistência)
    const doneMap={};
    allRecords.forEach(r=>{const k=key(r);if(doneSet.has(k))doneMap[k]=true});
    await Promise.all([
      cf(cu(c,'live/done'),{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(Object.keys(doneMap).length?doneMap:null)}),
      cf(cu(c,'live/pedido'),{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(pedido.length?pedido:null)}),
      cf(cu(c,'live/dep'),{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(Object.keys(depMap).length?Object.keys(depMap):null)})
    ]).then(rs=>{if(!rs.every(r=>r.ok))fails.push('pedido/concluídos');
      else{cloudDone=new Set(Object.keys(doneMap));['done','pedido','dep'].forEach(k=>setPend(k,false))}})   // tudo na nuvem: sem pendências
      .catch(()=>{fails.push('pedido/concluídos')});
    // Envia trânsito separadamente se carregado — compara com a data do relatório de TRÂNSITO (antes comparava com a do planograma)
    if(transitLoaded){
      busy(true,'Enviando trânsito…');
      const ti=await cf(cu(c,'trans/info')).then(r=>r.json()).catch(()=>null);
      const tl=transitMeta&&transitMeta.date?transitMeta:{date:currentMeta.date||'',hora:''},tm=ti?(ti.meta||{date:ti.date}):null;
      if(!ti||tsMeta(tm)<=tsMeta(tl)||
         confirm(`O Trânsito na nuvem é mais novo (${metaTxt(tm)}) que o deste aparelho (${metaTxt(tl)}). Substituir mesmo assim?`)){
        try{
          const rs=await Promise.all([
            cf(cu(c,'trans/data'),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(transitMap)}),
            cf(cu(c,'trans/info'),{method:'PUT',headers:{'Content-Type':'application/json'},
              body:JSON.stringify({exportedAt:now,date:tl.date||'',meta:transitMeta||null,total:Object.keys(transitMap).length})})
          ]);
          if(rs.every(r=>r.ok))tUp=true;else fails.push('trânsito');
        }catch{fails.push('trânsito')}
      }
    }
    // Envia a Cobertura (MDV, cobertura e estoque do relatório), se carregada
    let eUp=false,eNote='';
    if(!estoqueLoaded){eNote=' · cobertura não carregada neste aparelho'}
    else if(!Object.keys(estoqueMap).length){fails.push('cobertura (relatório vazio — recarregue o arquivo)')}
    else{
      busy(true,'Enviando cobertura…');
      try{
        const ei=await cf(cu(c,'estq/info')).then(r=>r.json()).catch(()=>null);
        const semData=!estoqueMeta||!estoqueMeta.date;                 // sem data no relatório local: não dá para provar que a nuvem é mais nova
        if(!ei||semData||tsMeta(ei.meta)<=tsMeta(estoqueMeta)||
           confirm(`A Cobertura na nuvem é mais nova (${metaTxt(ei.meta)}) que a deste aparelho. Substituir mesmo assim?`)){
          const r1=await cf(cu(c,'estq/data'),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(estoqueMap)});
          if(!r1.ok)throw Error('data');
          const r2=await cf(cu(c,'estq/info'),{method:'PUT',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({exportedAt:now,name:(await idbGet('estoque').catch(()=>null)||{}).name||'cobertura',meta:estoqueMeta||null,total:Object.keys(estoqueMap).length})});
          if(!r2.ok)throw Error('info');
          eUp=true;
        }else eNote=' · cobertura NÃO enviada (nuvem é mais nova)';
      }catch(e){fails.push('cobertura')}
    }
    try{const r=await idbGet('current');if(r){r.cloudAt=now;if(tUp)r.transAt=now;await idbSave(r)}}catch{}
    try{if(eUp){const r=await idbGet('estoque');if(r){r.cloudAt=now;await idbSave(r)}}}catch{}
    busy(false);toast(fails.length?'Enviado com falhas em: '+fails.join(', ')+' — tente de novo':'Enviado ✓ — planograma'+(tUp?', trânsito':'')+(eUp?', cobertura':'')+' e pedido'+eNote);cloudInfo(true);
  }catch(e){busy(false);toast(e.message)}
};

/* Inicialização: abre app → tenta nuvem → fallback IDB */
async function boot(){
  try{await idbOpen()}catch{}
  try{                                           // restaura o relatório de estoque ANTES de montar a tela (vale p/ nuvem e p/ local)
    const e=await idbGet('estoque');
    if(e&&e.map){estoqueMap=e.map;estoqueLoaded=true;estoqueMeta=e.meta||null;
      $('cob-status').innerHTML=`<b>✓ ${esc(e.name||'estoque')}</b> · ${f0(Object.keys(estoqueMap).length)} produtos · salvo em ${esc(e.savedAt||'')}`}
  }catch{}
  try{const t=await idbGet('transitmeta');if(t&&t.meta)transitMeta=t.meta}catch{}
  try{const en=await idbGet('encarte');                       // restaura o último Encarte carregado (aparece após o planograma abrir)
    if(en&&en.items&&en.items.length){encItems=en.items;encPer=en.per||null;   // 📅 dia do Panfleto (título da planilha)
      encSrc=en.kind==='xlsx'?{kind:'xlsx',name:en.name,buf:en.buf,hdr:en.hdr}:{...parseEncCSV(en.text||''),name:en.name,text:en.text||''};
      encCloudAt=en.cloudAt||0;encPending=!!en.pending;encSavedAt=en.savedAt||'';
      $('enc-title').style.display='';$('enc-title').textContent=`${en.name} · ${encItems.length} itens${encPerMeta()} · salvo em ${en.savedAt||''}`}
  }catch{}
  try{for(let w=0;w<7;w++){const o=await idbGet('oferta-d'+w);if(o&&o.items&&o.items.length)ofDays[w]=o}      // restaura as planilhas da semana (1 por dia)
    if(!ofDays.some(Boolean)){                                    // versão antiga guardava só 1 planilha: vai para o dia da semana em que foi salva
      const o=await idbGet('oferta'),m=o&&o.items&&o.items.length&&String(o.savedAt||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if(m){const d=new Date(+m[3],+m[2]-1,+m[1],12),w=d.getDay();ofDays[w]={...o,id:'oferta-d'+w,w,date:ofISO(d)};idbSave(ofDays[w]).catch(()=>{})}}
    ofSelOn=ofISO(new Date());ofSelDay=new Date().getDay();ofApplyDay();if(axCur==='dia'&&curTab==='enc'){ofShowMeta();renderOf()}
  }catch{}
  try{for(let w=0;w<7;w++){const o=await idbGet('panfleto-d'+w);if(o&&o.text&&o.text.trim())pfDays[w]=o}       // restaura os panfletos da semana (1 por dia)
    if(!pfDays.some(Boolean)&&pfTxt().trim()){const w=new Date().getDay(),t=new Date();                          // versão antiga guardava só 1 texto: vira o panfleto de hoje
      pfDays[w]={id:'panfleto-d'+w,w,text:pfTxt(),date:ofISO(t),at:Date.now(),savedAt:t.toLocaleString('pt-BR'),cloudAt:0,pending:false};if(idb)idbSave(pfDays[w]).catch(()=>{})}
    pfSelOn=ofISO(new Date());pfSelDay=new Date().getDay();const po=pfDays[pfSelDay];if(po&&po.text){$('pf-txt').value=po.text;try{localStorage.setItem(LSPF,po.text)}catch{}}
    pfDayBar();if(axCur==='pan'&&curTab==='enc')pfOpen();
  }catch{}
  const c=code();cloudBadge();
  if(c){
    // Tenta carregar da nuvem primeiro
    const loaded=await loadFromCloud(c);
    if(loaded){startSSE(c);return}
  }
  // Fallback: dados locais (IDB)
  try{
    const s=await idbGet('current');
    if(s&&s.records){
      await loadRecords(s.records,s.meta||{},s.name,s.transit||null,false,s.savedAt);
      if(c)startSSE(c); // inicia SSE mesmo com dado local, para receber updates
      return;
    }
  }catch{}
  if(estoqueLoaded&&Object.values(estoqueMap).some(x=>x&&x.d)){derive();go('home');return}   // só a Cobertura carregada: já dá para usar
  go('data'); // sem dados em lugar nenhum → vai direto para aba Dados
}
(async()=>{busy(true,'Abrindo seus dados…');try{await boot()}finally{busy(false)}})();
updBadge();
/* PWA: service worker (funciona offline depois da 1ª abertura) */
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))/* ⚡ registro do SW em tempo ocioso: não compete com a 1ª pintura */
addEventListener('load',()=>idle(()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})));
