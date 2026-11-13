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
/* v51: o aviso virou uma marquinha no canto do botão Atualizar (⏳ laranja = aguardando envio · ⚠ vermelho = sem conexão) —
   assim o topo continua com 2 botões e as datas dos relatórios não cortam. Tocar no botão também envia o que estiver pendente. */
function cloudBadge(){const b=$('fresh-upd');if(!b)return;const p=Object.keys(livePend).length;
  b.classList.toggle('pend',!!p);b.classList.toggle('err',!p&&!!cloudErr);
  b.title=p?'Atualizar — há alterações deste aparelho aguardando envio para a nuvem':cloudErr?'Atualizar — nuvem: '+cloudErr:'Atualizar com a nuvem';b.setAttribute('aria-label',b.title)}

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
/* ═══ PEDIDO EM DOIS APARELHOS (nov/2026): antes o último que salvava apagava o que o outro tinha feito.
   Agora, antes de enviar, o app LÊ o pedido da nuvem e MESCLA item a item, usando como referência a última versão
   sincronizada (pedBase: código → item como estava). Regras por produto:
     · está nos dois           → vale o deste aparelho se ELE mudou desde a última sincronização; senão vale o da nuvem
     · só neste aparelho       → novo/alterado aqui: fica · igual à referência: o outro aparelho removeu → sai
     · só na nuvem             → não estava na referência: o outro aparelho adicionou → entra · estava: removido aqui → não volta ═══ */
const LSPB='planograma_pedbase';let pedBase={};try{pedBase=JSON.parse(localStorage.getItem(LSPB)||'{}')||{}}catch{pedBase={}}
function pedSetBase(arr){pedBase={};for(const x of arr)if(x&&x.p)pedBase[x.p]=JSON.stringify(x);try{localStorage.setItem(LSPB,JSON.stringify(pedBase))}catch{}}
const pedArr=v=>(Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[])).filter(x=>x&&x.p);
function pedMerge(loc,cl,base){const L=new Map(loc.map(x=>[x.p,x])),C=new Map(cl.map(x=>[x.p,x])),out=[];
  for(const x of loc){const c=C.get(x.p),b=base[x.p],igual=b!==undefined&&JSON.stringify(x)===b;
    if(c)out.push(igual?c:x);else if(!igual)out.push(x)}
  for(const c of cl)if(!L.has(c.p)&&base[c.p]===undefined)out.push(c);
  return out}
function pedRedesenha(){updBadge();const s=document.querySelector('section.on');if(!s)return;const id=s.id.slice(2);
  schedule(()=>{if(id==='home')renderHome();else if(id==='prod')renderList(false);else if(id==='ped')renderPed()})}
function cloudWritePedido(){
  const c=code();if(!c)return;lastLocal=Date.now();setPend('pedido',true);
  clearTimeout(pedT);pedT=setTimeout(async()=>{
    try{
      const g=await fetch(cu(c,'live/pedido'));if(!g.ok&&g.status!==404)throw 0;
      const cl=pedArr(await g.json().catch(()=>null)),antes=JSON.stringify(pedido),m=pedMerge(pedido,cl,pedBase);
      if(JSON.stringify(m)!==antes){pedido=m;try{localStorage.setItem(LSP,JSON.stringify(pedido))}catch{}pedRedesenha()}   // entrou/saiu item do outro aparelho
      const body=pedBody(),r=await fetch(cu(c,'live/pedido'),{method:'PUT',headers:{'Content-Type':'application/json'},body});
      if(!r.ok)throw 0;cloudErr='';pedSetBase(JSON.parse(body)||[]);lastLocal=Date.now();
      if(pedBody()===body)setPend('pedido',false);else{cloudBadge();cloudWritePedido()}   // mudou durante o envio: manda de novo
    }catch{cloudErr='sem conexão — o pedido fica neste aparelho e é enviado sozinho quando a internet voltar';cloudBadge()}},400);
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
    else{pedido=pedArr(lp);pedSetBase(pedido);
      try{localStorage.setItem(LSP,JSON.stringify(pedido))}catch{}}
  }
  if(lenc!==undefined)await syncEnc(c,lenc).catch(()=>{});
  if(lof!==undefined)await syncOf(c,lof).catch(()=>{});
  if(lpf!==undefined)await syncPf(c,lpf).catch(()=>{});
  derive();updBadge();
}

/* DATAS DO TRÂNSITO na nuvem: /trreg/last (data do último relatório lido) e /trreg/data (o registro, em texto).
   Vale o registro do relatório mais novo; em empate, fica o do aparelho. */
async function trEnvia(){const c=code();if(!c||!trDirty||!navigator.onLine)return;
  try{const r1=await cf(cu(c,'trreg/data'),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(JSON.stringify({reg:trReg.reg,saiu:trReg.saiu}))});if(!r1.ok)throw 0;
    const r2=await cf(cu(c,'trreg/last'),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(trReg.last)});if(!r2.ok)throw 0;trDirty=false;trSalva()}catch{}}
async function trSync(c){const last=await cf(cu(c,'trreg/last')).then(r=>r.json()).catch(()=>undefined);if(last===undefined)return false;
  if(trDirty&&(!last||trReg.last>=last)){trEnvia();return false}
  if(typeof last!=='string'||last<=(trReg.last||''))return false;
  const txt=await cf(cu(c,'trreg/data')).then(r=>r.json()).catch(()=>null);let v=null;try{v=typeof txt==='string'?JSON.parse(txt):null}catch{}
  if(!v||!v.reg)return false;trReg={reg:v.reg,saiu:v.saiu||{},last};trDirty=false;trSalva();
  const s=document.querySelector('section.on'),id=s?s.id.slice(2):'';if(id==='home')schedule(renderHome);else if(id==='ped')schedule(renderPed);return true}
/* Carrega tudo da nuvem (records + transit + live) */
const tsMeta=m=>{if(!m||!m.date)return 0;const [d,mo,y]=String(m.date).split('/'),[h,mi,se]=String(m.hora||'00:00:00').split(':');return new Date(+y,+mo-1,+d,+h||0,+mi||0,+se||0).getTime()||0};   // data + HORA do relatório
const metaTxt=m=>m&&m.date?m.date+(m.hora?' '+String(m.hora).slice(0,5):''):'?';
/* Cobertura na nuvem: baixa só se a versão for diferente da guardada no aparelho — e nunca sobrescreve um relatório local MAIS NOVO */
/* MESMO RELATÓRIO? (nov/2026) Além do carimbo do envio, compara a IDENTIDADE do relatório: data + hora de emissão + nº de itens.
   Antes, se o carimbo guardado no aparelho se perdia (carregar um arquivo depois de enviar, envio parcial…), o app baixava
   os ~5 MB de novo A CADA ABERTURA mesmo sendo o mesmo relatório do dia. */
const mesmoRel=(a,b,na,nb)=>!!(a&&b&&a.date&&a.date===b.date&&String(a.hora||'')===String(b.hora||'')&&(!nb||na===nb));
async function syncEstoque(c,ei){
  if(!ei||!ei.exportedAt)return false;
  const loc=idb?await idbGet('estoque').catch(()=>null):null;
  if(loc&&loc.map&&(loc.cloudAt===ei.exportedAt||mesmoRel(loc.meta,ei.meta,Object.keys(loc.map).length,ei.total))){   // já tenho esta versão
    if(!estoqueLoaded){estoqueMap=loc.map;estoqueLoaded=true;estoqueMeta=loc.meta||ei.meta||null}
    if(loc.cloudAt!==ei.exportedAt){loc.cloudAt=ei.exportedAt;idbSave(loc).catch(()=>{})}
    return false}
  if(estoqueLoaded&&tsMeta(estoqueMeta)>tsMeta(ei.meta))return false;     // o do aparelho é mais novo: mantém (envie para a nuvem se quiser)
  const data=await cf(cu(c,'estq/data')).then(r=>r.json()).catch(()=>null);
  if(!data||typeof data!=='object')return false;
  estoqueMap=data;estoqueLoaded=true;estoqueMeta=ei.meta||null;
  const nome=ei.name||'nuvem',quando=new Date().toLocaleString('pt-BR');
  if(idb)idbSave({id:'estoque',map:estoqueMap,meta:estoqueMeta,name:nome,savedAt:quando,cloudAt:ei.exportedAt}).catch(()=>{});
  $('cob-status').innerHTML=`<b>✓ ${esc(nome)}</b> · ${f0(Object.keys(estoqueMap).length)} produtos · da nuvem`;
  return true;
}
/* fundo=true (abertura do app): o app JÁ abriu com o relatório guardado no aparelho; aqui só confere, sem travar a tela,
   se a nuvem tem relatório NOVO. Se for o mesmo, baixa apenas o que é em tempo real (pedido, concluídos, depósito, anexos). */
async function loadFromCloud(c,fundo){
  if(!fundo)busy(true,'Conferindo a nuvem…');
  let cerr='';                                                       // 1º erro de rede/Firebase (antes ficava escondido e o app só abria os dados locais)
  const gj=p=>cf(cu(c,p)).then(r=>r.json()).catch(e=>{cerr=cerr||e.message;return null});
  try{
    const [pi,ti,ei]=await Promise.all([gj('plano/info'),gj('trans/info'),gj('estq/info')]);
    cloudErr=cerr;cloudBadge();                                       // erro de conexão vira o ícone ⚠ no topo (antes era um aviso no meio da tela)
    if(!pi||!pi.total){if(!fundo)busy(false);return false}
    const sigAntes=fundo?liveSig():'';
    prcSync(c).catch(()=>{});trSync(c).catch(()=>{});                                        // preços (opcional): confere em paralelo, sem segurar a abertura
    const estqNovo=await syncEstoque(c,ei);                          // antes de montar a tela, para o MDV/cobertura já virem certos
    const loc=idb?await idbGet('current').catch(()=>null):null;   // já tem esta versão neste aparelho?
    const pm=pi.meta||{filial:pi.filial,date:pi.date,hora:''};
    const temLoc=!!(loc&&loc.records),
      planoIgual=temLoc&&(loc.cloudAt===pi.exportedAt||mesmoRel(loc.meta,pm,loc.records.length,pi.total)),
      transIgual=temLoc&&(!ti||loc.transAt===ti.exportedAt||(loc.transit&&mesmoRel(transitMeta,ti.meta,Object.keys(loc.transit).length,ti.total))),
      locNovo=temLoc&&!planoIgual&&tsMeta(loc.meta)>tsMeta(pm);      // o relatório do aparelho é MAIS NOVO que o da nuvem (ainda não enviado): não troca pelo antigo
    if(temLoc&&((planoIgual&&transIgual)||locNovo)){
      if(!locNovo&&(loc.cloudAt!==pi.exportedAt||(ti&&loc.transAt!==ti.exportedAt))){loc.cloudAt=pi.exportedAt;if(ti)loc.transAt=ti.exportedAt;idbSave(loc).catch(()=>{})}   // guarda o carimbo: da próxima vez nem compara
      if(!fundo)await loadRecords(loc.records,loc.meta||{},loc.name,loc.transit||null,false,loc.savedAt);
      await applyLive(c);   // ⚡ applyLive já roda o derive()
      if(!fundo){renderHome();busy(false)}
      else if(estqNovo||liveSig()!==sigAntes){updBadge();const s=document.querySelector('section.on'),id=s?s.id.slice(2):'';   // só redesenha se algo mudou de verdade
        schedule(()=>{renderFresh();if(id==='home')renderHome();else if(id==='prod')renderList(false);else if(id==='ped')renderPed();else if(id==='data')renderData()})}
      return true;
    }
    busy(true,fundo?'Relatório novo na nuvem — baixando…':'Baixando o relatório da nuvem…');

    const [records,transData]=await Promise.all([gj('plano/records'),ti?gj('trans/data'):Promise.resolve(null)]);
    if(!Array.isArray(records)||!records.length){busy(false);toast('⚠ Não consegui baixar o planograma'+(cerr?': '+cerr:' (resposta vazia da nuvem)'));return false}

    if(ti)transitMeta=ti.meta||{date:ti.date||'',hora:''};            // data REAL do relatório de Trânsito
    const meta=pi.meta||{filial:pi.filial,date:pi.date,hora:''},chaveAntes=lsKey;
    await loadRecords(records,meta,pi.name||'nuvem',
      transData&&typeof transData==='object'?transData:null,
      true /* persist to IDB */);
    try{const r=await idbGet('current');if(r){r.cloudAt=pi.exportedAt;r.transAt=ti?ti.exportedAt:undefined;await idbSave(r)}}catch{}
    await applyLive(c);   // ⚡ applyLive já roda o derive()
    if(chaveAntes&&chaveAntes!==lsKey)pedLimpaConcl();   // relatório de um DIA NOVO veio da nuvem: concluídos do Pedido saem (normalmente o outro aparelho já limpou)
    renderHome();busy(false);
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
      else{cloudDone=new Set(Object.keys(doneMap));pedSetBase(pedido);['done','pedido','dep'].forEach(k=>setPend(k,false))}})   // tudo na nuvem: sem pendências
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
    await trEnvia();
    let pUp=[];try{if(PRC.p&&PRC.p.dirty||PRC.c&&PRC.c.dirty){busy(true,'Enviando preços…');pUp=await prcEnvia(c,now)}}catch{fails.push('preços')}
    try{const r=await idbGet('current');if(r){r.cloudAt=now;if(tUp)r.transAt=now;await idbSave(r)}}catch{}
    try{if(eUp){const r=await idbGet('estoque');if(r){r.cloudAt=now;await idbSave(r)}}}catch{}
    busy(false);toast(fails.length?'Enviado com falhas em: '+fails.join(', ')+' — tente de novo':'Enviado ✓ — planograma'+(tUp?', trânsito':'')+(eUp?', cobertura':'')+(pUp.length?', preços':'')+' e pedido'+eNote);cloudInfo(true);
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
  await prcRestaura();                           // preços (opcional) guardados no aparelho
  try{const t=await idbGet('transitmeta');if(t&&t.meta)transitMeta=t.meta}catch{}
  try{const en=await idbGet('encarte');                       // restaura o último Encarte carregado (aparece após o planograma abrir)
    if(en&&en.items&&en.items.length){encItems=en.items;encPer=en.per||null;   // 📅 dia do Panfleto (título da planilha)
      encSrc=en.kind==='xlsx'?{kind:'xlsx',name:en.name,buf:en.buf,hdr:en.hdr}:{...parseEncCSV(en.text||''),name:en.name,text:en.text||''};
      if(!encPer&&encSrc.per)encPer=encSrc.per;   // salvo antes do campo per: lê a data do título do .csv
      encCloudAt=en.cloudAt||0;encPending=!!en.pending;encSavedAt=en.savedAt||'';
      $('enc-title').style.display='';$('enc-title').textContent=`${en.name} · ${encItems.length} itens${encPerMeta()} · salvo em ${en.savedAt||''}`}
  }catch{}
  try{for(let w=0;w<7;w++){const o=await idbGet('oferta-d'+w);if(o&&((o.items&&o.items.length)||(o.del&&o.pending)))ofDays[w]=o}      // restaura as planilhas da semana (1 por dia)
    if(!ofDays.some(Boolean)){                                    // versão antiga guardava só 1 planilha: vai para o dia da semana em que foi salva
      const o=await idbGet('oferta'),m=o&&o.items&&o.items.length&&String(o.savedAt||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if(m){const d=new Date(+m[3],+m[2]-1,+m[1],12),w=d.getDay();ofDays[w]={...o,id:'oferta-d'+w,w,date:ofISO(d)};idbSave(ofDays[w]).catch(()=>{})}}
    ofSelOn=ofISO(new Date());ofSelDay=new Date().getDay();ofApplyDay();if(axCur==='dia'&&curTab==='enc'){ofShowMeta();renderOf()}
  }catch{}
  try{for(let w=0;w<7;w++){const o=await idbGet('panfleto-d'+w);if(o&&((o.text&&o.text.trim())||(o.del&&o.pending)))pfDays[w]=o}       // restaura os panfletos da semana (1 por dia)
    if(!pfDays.some(Boolean)&&pfTxt().trim()){const w=new Date().getDay(),t=new Date();                          // versão antiga guardava só 1 texto: vira o panfleto de hoje
      pfDays[w]={id:'panfleto-d'+w,w,text:pfTxt(),date:ofISO(t),at:Date.now(),savedAt:t.toLocaleString('pt-BR'),cloudAt:0,pending:false};if(idb)idbSave(pfDays[w]).catch(()=>{})}
    pfSelOn=ofISO(new Date());pfSelDay=new Date().getDay();pfApplyDay(false);   // carrega a lista do dia certo (antes ficava o texto do último dia visto)
    pfDayBar();if(axCur==='pan'&&curTab==='enc')pfOpen();
  }catch{}
  const c=code();cloudBadge();
  /* ABERTURA (nov/2026): abre NA HORA com o relatório guardado no aparelho e confere a nuvem em segundo plano.
     Antes toda abertura mostrava "Baixando da nuvem…" e esperava a internet responder, mesmo com o relatório do dia já no aparelho. */
  try{
    const s=await idbGet('current');
    if(s&&s.records){
      await loadRecords(s.records,s.meta||{},s.name,s.transit||null,false,s.savedAt);
      if(c){startSSE(c);loadFromCloud(c,true).catch(()=>{})}   // só baixa relatório se a nuvem tiver um NOVO; pedido/concluídos vêm sempre
      return;
    }
  }catch{}
  if(c){   // aparelho sem relatório guardado: baixa da nuvem
    const loaded=await loadFromCloud(c);
    if(loaded){startSSE(c);return}
  }
  if(estoqueLoaded&&Object.values(estoqueMap).some(x=>x&&x.d)){derive();go('home');return}   // só a Cobertura carregada: já dá para usar
  go('data'); // sem dados em lugar nenhum → vai direto para aba Dados
}
(async()=>{busy(true,'Abrindo seus dados…');try{await boot()}finally{busy(false)}})();
updBadge();
/* PWA: service worker (funciona offline depois da 1ª abertura) */
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){/* ⚡ registro do SW em tempo ocioso: não compete com a 1ª pintura */
  /* Versão nova publicada: o SW novo assume o controle → recarrega UMA vez para já mostrar a versão nova
     (antes a 1ª abertura depois de publicar ainda mostrava a versão antiga guardada no aparelho).
     Não recarrega na 1ª instalação nem com uma folha/pergunta aberta (aí só avisa). */
  const tinhaSW=!!navigator.serviceWorker.controller;let recarregou=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!tinhaSW||recarregou)return;recarregou=true;
    /* espera o app ficar livre: sem folha/pergunta aberta, sem carregamento em andamento (#load) e sem digitação recente */
    const livre=()=>!(typeof overlayOn==='function'&&overlayOn())&&!$('load').classList.contains('on')&&Date.now()-ultTecla>1500;
    if(livre())return location.reload();
    toast('Versão nova do app pronta — ela entra assim que você terminar o que está fazendo');
    const t=setInterval(()=>{if(livre()){clearInterval(t);try{const pt=$('pf-txt');if(pt)localStorage.setItem(LSPF,pt.value)}catch{}location.reload()}},2000)});
  let ultTecla=0;addEventListener('input',()=>{ultTecla=Date.now()},true);
  addEventListener('load',()=>idle(()=>navigator.serviceWorker.register('./sw.js').then(reg=>reg.update()).catch(()=>{})))}
/* versão do app na aba Dados (nome do cache do SW, ex.: v34) — para conferir se o aparelho já pegou a atualização */
/* APP_VER = versão do CÓDIGO que está rodando. ⚠ Mantenha igual ao V do sw.js (o teste de fumaça confere). */
const APP_VER='v60';
const verNum=v=>parseInt(String(v||'').replace(/\D/g,''),10)||0;   // 'v9' < 'v45' < 'v100' (comparação numérica, não alfabética)
function mostraVersao(){const el=$('app-ver');if(el)el.textContent='Versão do app: '+APP_VER}
addEventListener('load',()=>setTimeout(mostraVersao,3000));
/* ═══ NOVIDADES (nov/2026): depois de atualizar, o Resumo mostra o que mudou (1 vez por versão). Na 1ª instalação não aparece.
   Ao publicar uma versão com mudança visível, acrescente aqui a chave da versão (a mesma do sw.js, ex.: 'v43'). ═══ */
const NOVIDADES={
  v60:['📊 <b>Situações novas</b>: Ruptura loja (estoque ≤ 0 com trânsito, ou fora da Sist. 1) e <b>Ruptura CD</b> (Sist. 1 sem trânsito e com menos de 40% do cadastro), cada uma com seu número',
       'Crítico, Atenção e Saudável não contam mais a Ruptura CD · o Resumo não muda com os filtros · Crítico abre do maior MDV para o menor',
       '⚠ <b>Conferir estoque</b>: selo na Ruptura CD que pela cobertura estaria Saudável (MDV baixo — pode ser estoque virtual)'],
  v59:['🪪 <b>Ficha nova</b>: faixa colorida com os dias de cobertura e três abas — Resumo (estoque e MDV em destaque), Movimento (linha do tempo) e Cadastro',
       '✓ <b>Feito é um só</b>: concluir no Pedido e marcar feito em Produtos agora são a mesma coisa, por qualquer caminho'],
  v58:['✓ Na ficha, <b>Marcar feito</b> agora também conclui o item no pedido — o botão “Concluir no pedido” saiu (eram a mesma coisa)'],
  v57:['🧹 A <b>sugestão de quantidade</b> saiu do app (cartão do Resumo, filtro Sugestão, linha na ficha e “Adicionar sugestões”). A <b>Nova cobertura</b> do filtro 1×1 do planograma continua igual'],
  v56:['💲 Os <b>Preços</b> agora vão para a nuvem sozinhos ao carregar os arquivos (e ao abrir o app, se ficou algo sem enviar) — os outros aparelhos recebem sem precisar do “Enviar para a nuvem”'],
  v55:['🚚 <b>Trânsito com data</b>: o app anota o dia em que cada item entrou em trânsito e conta os dias até chegar (na ficha e no Pedido). No Para fazer hoje: “Trânsito atrasado (4+ dias)” e “Saiu do trânsito sem entrar no estoque”'],
  v54:['💲 <b>Preços (opcional)</b>: em Dados → Preços, escolha o PRODUTO.TXT e o relatório de Preços do Clube (pode ser os dois de uma vez). A ficha do produto passa a mostrar o preço e o preço do Clube Condor'],
  v53:['⭐ <b>Oferta do dia pelo código</b>: item com Código/EAN é achado só pelo código (o que não está no planograma vai para “Sem correspondência”, sem chute pelo nome) e o 🔍 abre o produto exato'],
  v52:['🛒 Os <b>concluídos do Pedido</b> agora saem sozinhos ao carregar o planograma de um dia novo, e o grupo “✓ Concluídos” ganhou o botão <b>Limpar</b> (com Desfazer)'],
  v51:['🔄 <b>Botão Atualizar</b> no topo, ao lado da engrenagem — substitui o gesto de puxar a tela para baixo (que disparava sem querer ao rolar)'],
  v50:['🔧 O <b>✕ de limpar a busca</b> voltou para dentro da caixa de pesquisa'],
  v49:['⚡ <b>Abre na hora</b>: o app abre com o relatório guardado no aparelho e só baixa da nuvem se houver relatório novo. Pedido, concluídos, depósito e Ruptura no CD continuam sincronizando em tempo real'],
  v48:['📊 <b>Situação dos produtos por sistemática</b>: botões Todas · Sist. 1 · Sist. 10 · Sist. 20 no Resumo (como nas categorias)',
       '💡 A <b>Sugestão de pedido</b> do Resumo agora é sempre só da Sistemática 1'],
  v47:['📊 <b>Resumo sem a falta no CD</b>: os números não contam mais os itens que o CD não tem (aparecem à parte, em “+ N em falta no CD”) — e o número tocado bate com a lista',
       '🔧 Correções: “feitos” de ontem não voltam mais ao carregar o planograma do dia · item que vende pouco (MDV 0) sai do Crítico e vai para Sem MDV · selos e medidas não cortam mais no cartão',
       '💡 Sugestão também para item sem capacidade cadastrada (15 dias de venda) e aviso quando a caixa fechada passa da capacidade',
       '⛔ Ruptura no CD mostra há quantos dias está marcada e pede reconferência depois de 7 dias · 🛒 pedido feito em dois aparelhos agora é somado, não sobrescrito',
       '🔎 Filtro novo: <b>Capacidade menor que 1 caixa</b> (candidatos a recadastro)'],
  v46:['♿ Revisão completa: abas e botões com nome para leitor de tela, foco visível no teclado, contraste melhor e folhas que fecham com Esc',
       '✓ Na ficha: <b>Concluir no pedido</b> sem precisar deslizar, e <b>Desfazer</b> ao remover do pedido',
       '🔧 Correções: Ruptura no CD sai sozinha quando aparece trânsito · Limpar nos Filtros tira também os filtros do Resumo · importar backup não apaga anexos mais novos'],
  v45:['🏭 <b>Para fazer hoje</b>: fornecedores da Sist. 20 com cobertura baixa, separados por fornecedor (código e nome)',
       '🎨 Visual revisado: avisos, buscas, botões de ordenar e cores do modo escuro iguais em todas as abas'],
  v44:['⚠ <b>Pedido</b>: ao entrar, a falta no CD já vem escondida — esses itens saem de "Para pedir" e ficam no grupo <b>Falta no CD</b> (o botão mostra/esconde)',
       '✅ <b>Para fazer hoje</b> conta sem a falta no CD e abre a lista com "Esconder falta no CD" ligado'],
  v43:['⚠ Selo <b>falta no CD</b> no cartão também para itens com estoque positivo (Sistemática 1, menos de 1 caixa e sem trânsito) — antes só aparecia nos negativos'],
  v42:['🔥 <b>Urgência no pedido</b>: na ficha, marque Urgente ou Baixa — urgentes ficam no topo do Pedido em qualquer ordenação',
       '⛔ <b>Ruptura no CD</b>: na ficha, tira o item de "Para pedir" e põe num grupo próprio até aparecer trânsito',
       '✅ <b>Para fazer hoje</b> no Resumo: rupturas e críticos sem trânsito e fora do pedido, Panfleto/Lâmina/Oferta com falta e mais',
       '📋 <b>Conferência do cadastro</b>: o planograma do dia seguinte mostra o que entrou certo e o que não entrou',
       '📈 Linha de <b>tendência da ruptura</b> no Resumo (aparece a partir do 2º dia)',
       '⚠ Aviso quando os <b>relatórios são de dias diferentes</b>, com opção de descartar o Trânsito antigo',
       '💾 O backup e o .json da nuvem agora trazem também <b>Panfleto, Lâmina e Oferta</b>']};
function mostraNovidades(){const el=$('novban');if(!el)return;const v=APP_VER;let vista='';
  try{vista=localStorage.getItem('planograma_vista')||'';
    if(!vista){const jaUsava=!!localStorage.getItem('planograma_pedido')||Object.keys(localStorage).some(k=>/^planograma_(nocd|pedsort|pfsort|cobnova|limcob)/.test(k));
      if(!jaUsava){localStorage.setItem('planograma_vista',v);return}                                  // instalou agora: nada de novidades
      vista='v41'}}catch{return}                                                                          // já usava antes das novidades existirem
  const vs=Object.keys(NOVIDADES).filter(k=>verNum(k)>verNum(vista)&&verNum(k)<=verNum(v)).sort((a,b)=>verNum(b)-verNum(a)).slice(0,4);
  if(!vs.length)return;
  el.hidden=false;el.innerHTML=`<div class="novb" role="dialog" aria-label="Novidades"><b>✨ Novidades${vs.length>1?'':' da versão '+esc(vs[0])}</b><div class="novs">${vs.map(k=>`${vs.length>1?`<small class="novv">Versão ${esc(k)}</small>`:''}<ul>${NOVIDADES[k].map(t=>`<li>${t}</li>`).join('')}</ul>`).join('')}</div><button type="button" class="button button-small button-fill" id="nov-ok">Entendi</button></div>`;
  const fecha=()=>{try{localStorage.setItem('planograma_vista',v)}catch{}el.hidden=true;el.innerHTML='';removeEventListener('keydown',esc_)};
  const esc_=e=>{if(e.key==='Escape')fecha()};addEventListener('keydown',esc_);$('nov-ok').onclick=fecha}
addEventListener('load',()=>setTimeout(mostraNovidades,3500));
/* 🔄 Procurar atualização (aba Dados): pergunta ao servidor se há versão nova do app.
   Se houver, o SW novo instala, assume o controle e o app recarrega sozinho (controllerchange acima). */
const verAtual=()=>{const t=($('app-ver')||{}).textContent||'';const m=/v\d+/.exec(t);return m?m[0]:''};
$('b-upd').onclick=async()=>{const b=$('b-upd');
  if(!('serviceWorker' in navigator)||!/^https?:/.test(location.protocol))return location.reload();
  if(!navigator.onLine)return toast('Sem internet — conecte para procurar atualização');
  b.disabled=true;b.textContent='Procurando…';
  const volta=()=>{b.disabled=false;b.textContent='🔄 Procurar atualização'};
  try{
    const reg=await navigator.serviceWorker.getRegistration();
    if(!reg){volta();return location.reload()}
    await reg.update();                                            // baixa o sw.js do servidor e compara com o atual
    const nova=reg.installing||reg.waiting;
    if(!nova){volta();mostraVersao();return toast('Você já está na versão mais nova'+(verAtual()?` (${verAtual()})`:''))}
    b.textContent='Atualizando…';toast('Versão nova encontrada — atualizando…');
    const fim=()=>location.reload();
    if(nova.state==='activated')return fim();
    nova.addEventListener('statechange',()=>{if(nova.state==='activated')setTimeout(fim,300)});   // reserva, se o controllerchange não recarregar
    setTimeout(fim,20000);                                         // reserva final: rede lenta
  }catch(e){volta();toast('Não consegui procurar atualização — confira a internet')}};
