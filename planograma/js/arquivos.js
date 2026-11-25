/* Planograma Mobile — ARQUIVOS: carregar relatórios, faixa de idade dos dados, aba Dados, backup .json/.csv e leitor de código de barras.
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */

/* CARREGAR / SALVAR */
/* modo: (nada) = relatório novo escolhido aqui → vai para o Resumo · 'abre' = abertura do app (cálculo em pedaços, fica na aba)
   · 'fica' = relatório novo da nuvem em segundo plano (não troca de aba, não apaga a busca) */
async function loadRecords(records,meta,name,transit,persist,savedAt,modo){
 planoRecs=records;allRecords=records;currentMeta=meta;lsKey=lsKeyFor(meta.filial||'',meta.date||'');lsLoad();
 if(transit){transitMap=transit;transitLoaded=true}
 savedInfo={name,savedAt:savedAt||new Date().toLocaleString('pt-BR')};
 if(persist&&idb)await idbSave({id:'current',name,records,meta,savedAt:savedInfo.savedAt,filial:meta.filial,date:meta.date,transit:transitLoaded?transitMap:undefined}).catch(()=>{});
 if(modo==='abre'){await deriveFatiado();return abrFim()}
 if(modo==='fica'){derive();return renderAtual()}
 derive();F={chip:'all',cat:'',q:'',sort:'prio',ent:ENT0};$('q').value='';go('home')}
/* Os relatórios do sistema são UTF-8 (cada acento ocupa 1 coluna). Ler como latin1 transformava Ç, Ã, º… em 2 caracteres e
   DESLOCAVA as colunas dessas linhas (≈2% do planograma): Cob.Plan 999 virava "6 9", estoque 0 virava 9, etc.
   Agora tenta UTF-8 e só cai para Windows-1252 se o arquivo realmente não for UTF-8. */
function readFile(file,cb,enc){const r=new FileReader();
  if(enc==='latin1'){r.onload=e=>cb(decodeBuf(e.target.result));r.readAsArrayBuffer(file);return}
  r.onload=e=>cb(e.target.result);r.readAsText(file,enc)}
$('f-plano').onchange=e=>{const f=e.target.files[0];if(!f)return;e.target.value='';busy(true,'Lendo arquivo…',true);
 if(/\.json$/i.test(f.name))readFile(f,t=>importBackup(t,f.name),'utf-8');
 else readFile(f,async t=>{await tick();const p=parseFile(t);if(!p.records.length){busy(false);return toast('Nenhum produto encontrado no arquivo')}
  const chaveAntes=lsKey,metaAntes=currentMeta;
  await loadRecords(p.records,p.meta,f.name,null,true);setRelNovo('p',true);const novoDia=diaNovo(chaveAntes,metaAntes,p.meta);const had=novoDia?doneSet.size:0;if(had){lsClear();derive();renderHome()}   // relatório novo: concluídos recomeçam do zero
  /* planograma de OUTRO dia: zera também os concluídos guardados na NUVEM (antes os "feitos" de ontem voltavam na 1ª sincronização).
     Com a lista da nuvem em mãos apaga já; senão deixa pendente (⏳) e a próxima sincronização apaga em vez de baixar. */
  else if(novoDia&&typeof cloudWriteDone==='function'){if(cloudDone.size)cloudWriteDone();else{setPend('done',true);if(navigator.onLine)liveRefresh()}}
  const nPc=novoDia?pedLimpaConcl():0;   // dia novo: os concluídos do Pedido também saem (vai para a nuvem pelo savePed)
  busy(false);toast(f0(p.records.length)+' produtos carregados'+(had?' · concluídos zerados':'')+(nPc?` · ${nPc} concluído${nPc>1?'s':''} do pedido limpo${nPc>1?'s':''}`:'')+warnTxt())},'latin1')};
$('f-trans').onchange=e=>{const f=e.target.files[0];if(!f)return;e.target.value='';busy(true,'Lendo trânsito…');
 readFile(f,async t=>{if(!/Qt\.Transito/i.test(t.slice(0,6000))){busy(false);return toast('Este arquivo não é o relatório de Trânsito — nada foi trocado')}   // relatório no lugar errado estragava os números em silêncio
  const tm=parseTransitFile(t);if(!Object.keys(tm).length){busy(false);return toast('Nenhum produto lido no Trânsito — confira o arquivo')}
  transitMap=tm;transitLoaded=true;setRelNovo('t',true);if(idb&&transitMeta)idbSave({id:'transitmeta',meta:transitMeta}).catch(()=>{});derive();trAtualiza();
  if(idb){try{const rec=await idbGet('current');if(rec){rec.transit=transitMap;await idbSave(rec)}}catch{}}
  busy(false);renderAtual();toast('Trânsito carregado — '+f0(Object.keys(transitMap).length)+' itens')},'latin1')};
/* ═══ v66 — UM BOTÃO SÓ: escolhe todos os relatórios do dia de uma vez; cada arquivo é reconhecido pelo cabeçalho e entregue
   ao mesmo leitor de antes (as entradas antigas continuam existindo, só sem botão). Ordem: Planograma → Cobertura → Trânsito → Preços. ═══ */
/* v68 — ATALHO Alt+R (computador, pensado para o AutoHotkey): vai para Dados e abre a janela de arquivos; ao terminar de carregar ENVIA para a nuvem sozinho.
   O título da aba conta o andamento para o script esperar pelo nome da janela:  "⏳ Carregando relatórios" → "⏳ Enviando para a nuvem" → "✓ Relatórios enviados"  (ou "⚠ …" se algo falhar). */
let autoUp=false,titT=null;const TIT0=document.title;
const titulo=(t,volta)=>{clearTimeout(titT);document.title=t;if(volta)titT=setTimeout(()=>{document.title=TIT0},volta)};
document.addEventListener('keydown',e=>{if(!e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.code!=='KeyR'||e.repeat)return;e.preventDefault();
  if(abrindo||$('load').classList.contains('on'))return;
  autoUp=true;go('data');titulo('Planograma — escolha os relatórios');$('f-multi').click()});
$('f-multi').addEventListener('cancel',()=>{if(autoUp){autoUp=false;titulo(TIT0)}});
$('f-multi').onchange=async e=>{const fs=[...e.target.files];e.target.value='';const auto=autoUp;autoUp=false;if(!fs.length){if(auto)titulo(TIT0);return}
  if(auto)titulo('⏳ Carregando relatórios');
  const g={j:[],p:[],c:[],t:[],$:[]};
  for(const f of fs){if(/\.json$/i.test(f.name)){g.j.push(f);continue}
    let t='';try{t=decodeBuf(await f.slice(0,6000).arrayBuffer())}catch{}
    g[/listaplanograma|Relatorio de Planograma/i.test(t)?'p':/Qt\.Transito/i.test(t)?'t':/Vda 12 meses/i.test(t)?'c':'$'].push(f)}
  const livre=()=>new Promise(r=>{const i=setInterval(()=>{if(!busyT&&!busyH&&!$('load').classList.contains('on')){clearInterval(i);setTimeout(r,900)}},150)});   // espera o leitor terminar (e o aviso dele aparecer)
  const fake=f=>({target:{files:[f],value:''}});
  if(g.j[0]){$('f-plano').onchange(fake(g.j[0]));await livre()}
  if(g.p[0]){$('f-plano').onchange(fake(g.p[0]));await livre()}
  if(g.c[0]){await loadCobFile(g.c[0]);await livre()}
  if(g.t[0]){$('f-trans').onchange(fake(g.t[0]));await livre()}
  if(g.$.length&&typeof loadPrecoFiles==='function'){await loadPrecoFiles(g.$);if(auto)await livre()}
  if(!auto)return;
  if(!planoRecs.length)return titulo('⚠ Nenhum planograma carregado',120000);
  if(!navigator.onLine)return titulo('⚠ Sem internet — relatórios carregados, falta enviar',120000);
  titulo('⏳ Enviando para a nuvem');
  try{await $('b-up').onclick();await livre();if(typeof prcAuto==='function')await prcAuto()}catch{}
  const falta=[relNovo.p&&'planograma',relNovo.c&&'cobertura',relNovo.t&&'trânsito'].filter(Boolean);
  titulo(falta.length?'⚠ Falta enviar: '+falta.join(', '):'✓ Relatórios enviados',120000)};
/* ═══ TRÂNSITO: DESDE QUANDO (nov/2026) ═══ o relatório de Trânsito só traz a quantidade, sem data. Aqui o app anota o dia em que
   cada item APARECEU em trânsito e vai contando até chegar:
     · 1ª vez com quantidade no Trânsito → guarda a data daquele relatório (reg)
     · continua aparecendo (mesmo com outra quantidade: entrega parcial, pedido novo) → mantém a data MAIS ANTIGA
     · sumiu do Trânsito → sai do registro e vai para "saiu" por TR_SAIU_DIAS dias, para conferir se ENTROU NO ESTOQUE
   Normal: chega em 2–3 dias → com TR_ATRASO dias ou mais é "atrasado" (Para fazer hoje).
   trReg = {reg:{produto:{d:'aaaa-mm-dd',q:qtd,e:estoque da última vez}}, saiu:{produto:{d:dia que saiu,desde,q,e}}, last:data do último relatório lido}
   Guardado no aparelho e na nuvem (/trreg), para os aparelhos mostrarem a mesma data. Não entra em nenhum cálculo. */
const LSTR='planograma_trreg';   // TR_ATRASO e TR_SAIU_DIAS ficam no base.js (o telas.js usa ao carregar)
let trReg={reg:{},saiu:{},last:''},trDirty=false;
try{const v=JSON.parse(localStorage.getItem(LSTR)||'null');if(v&&v.reg){trReg={reg:v.reg||{},saiu:v.saiu||{},last:v.last||''};trDirty=!!v.dirty}}catch{}
const trSalva=()=>{try{localStorage.setItem(LSTR,JSON.stringify({...trReg,dirty:trDirty}))}catch{}};
const isoDmy=s=>{const d=dmy(s);return d?ymd(d):''};
const isoDias=(a,b)=>{const p=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null},x=p(a),y=p(b);return x&&y?Math.round((y-x)/864e5):0};
const isoBr=s=>String(s||'').slice(5).split('-').reverse().join('/');   // 2026-11-08 → 08/11
const trDesde=r=>transitLoaded&&r._t>0&&trReg.reg[r.produto]?trReg.reg[r.produto].d:'';
const trDias=r=>{const d=trDesde(r);return d?Math.max(0,isoDias(d,isoDmy(transitMeta&&transitMeta.date)||today())):-1};   // v83: conta até a DATA DO RELATÓRIO de Trânsito (relatório velho não deixa tudo "atrasado")
const trAtrasado=r=>trDias(r)>=TR_ATRASO;
/* saiu do Trânsito e NÃO entrou no estoque? Considera que chegou se a "Última entrada" é do período do trânsito ou se o estoque subiu.
   Só julga com um relatório de estoque do dia em que saiu (ou mais novo). */
function trSumiu(r){const s=trReg.saiu[r.produto];if(!s||(transitLoaded&&r._t>0))return false;
  const ue=isoDmy(r._ue);if(ue&&ue>=s.desde)return false;
  if(typeof s.e==='number'&&r._e>s.e)return false;
  const ref=isoDmy((estoqueMeta&&estoqueMeta.date)||currentMeta.date);return !(ref&&ref<s.d)}
const trDiasTxt=n=>n<=0?'hoje':n===1?'1 dia':n+' dias';
/* roda a cada relatório de Trânsito carregado por arquivo */
function trAtualiza(){const d=isoDmy(transitMeta&&transitMeta.date)||today();
  if(trReg.last&&d<trReg.last)return;                                   // relatório mais antigo que o último lido: não mexe nas datas
  const {reg,saiu}=trReg,so=allRecords.length>0,tem=p=>transitMap[p]&&transitMap[p].qt_transito>0;
  for(const p in transitMap){if(!tem(p)||(so&&!byProd.has(p)))continue;const r=byProd.get(p),e=r?r._e:null,q=transitMap[p].qt_transito;
    if(reg[p]){reg[p].q=q;if(e!==null)reg[p].e=e}else reg[p]={d,q,e};delete saiu[p]}
  for(const p in reg)if(!tem(p)){saiu[p]={d,desde:reg[p].d,q:reg[p].q,e:reg[p].e};delete reg[p]}
  for(const p in saiu)if(isoDias(saiu[p].d,d)>TR_SAIU_DIAS)delete saiu[p];
  trReg.last=d;trDirty=true;trSalva();if(typeof trEnvia==='function')trEnvia()}
const NARROW=matchMedia('(max-width:429.98px)');   // v73: nomes curtos (Cob./Tr.) em todo celular — antes a data do Trânsito sumia em 390 px   // ⚡ innerWidth forçava o layout da aba inteira (1,6 s no Pedido com 345 itens)
function renderFresh(){if(abrindo)return;   // v72: durante a abertura o subtítulo mostra a etapa

  const el=$('fresh-t'),F_=$('fresh');
  if(!allRecords.length){el.textContent='Nenhum relatório carregado';F_.classList.remove('warn');return}
  const base=String(currentMeta.date||'').trim();let warn=false;
  const item=(nome,ok,m)=>{if(!ok)return `<span class="off">${nome} —</span>`;const dt=m&&m.date?String(m.date):'',diff=dt&&base&&dt!==base;if(diff)warn=true;
    return `<span${diff?' class="diff"':''} title="${m&&m.hora?esc(dt+' '+m.hora):''}">${nome} ${dt?esc(dt.slice(0,5)):'✓'}</span>`};   // datas podem vir da nuvem: sempre escapadas
  const curto=NARROW.matches;                                                   // tela estreita: nomes curtos para as 3 datas caberem
  el.innerHTML=[item('Plano',planoRecs.length>0,currentMeta),item(curto?'Cob.':'Cobertura',estoqueLoaded,estoqueMeta),item(curto?'Tr.':'Trânsito',transitLoaded,transitMeta)].join(' · ')+(warn?' ⚠':'');
  F_.classList.toggle('warn',warn);F_.title=warn?'Os relatórios são de dias diferentes — confira antes de pedir':'';
  renderDtBan();if(typeof renderCadBan==='function'){cadConfere();renderCadBan()}
}
$('fresh-gear').onclick=()=>go('data');

/* ⚠ RELATÓRIOS DE DIAS DIFERENTES (nov/2026): aviso claro no topo do Resumo (o ⚠ do cabeçalho passava batido).
   Trânsito MAIS ANTIGO que o planograma: oferece descartar (senão itens que já chegaram aparecem "a caminho"). */
function renderDtBan(){const el=$('dtban');if(!el)return;
  const pd=dmy(currentMeta&&currentMeta.date),diz=[];let velhoTr=false;
  if(allRecords.length&&pd){
    const ver=(nome,ok,m)=>{if(!ok||!m||!m.date)return;const d=dmy(m.date);if(!d||+d===+pd)return;
      const dias=Math.round((pd-d)/864e5);diz.push(`${nome} de <b>${esc(String(m.date).slice(0,5))}</b> (${dias>0?dias+' dia'+(dias>1?'s':'')+' antes':(-dias)+' dia'+(-dias>1?'s':'')+' depois'} do planograma)`);
      if(nome==='Trânsito'&&dias>0)velhoTr=true};
    ver('Cobertura',estoqueLoaded,estoqueMeta);ver('Trânsito',transitLoaded,transitMeta)}
  el.hidden=!diz.length;if(!diz.length)return el.innerHTML='';
  el.innerHTML=`<div class="dtb"><b>⚠ Relatórios de dias diferentes</b><span>Planograma de <b>${esc(String(currentMeta.date).slice(0,5))}</b> · ${diz.join(' · ')}. Confira antes de pedir.</span>${velhoTr?'<button type="button" class="button button-small button-tonal" id="dt-tr">Descartar o Trânsito antigo</button>':''}</div>`}
$('dtban').onclick=async e=>{if(!e.target.closest('#dt-tr'))return;
  if(!confirm('Descartar o Trânsito antigo? Os números de trânsito somem até você carregar o relatório novo.'))return;
  transitMap={};transitLoaded=false;transitMeta=null;
  if(idb){try{await idbSave({id:'transitmeta',meta:null});const rec=await idbGet('current');if(rec){delete rec.transit;await idbSave(rec)}}catch{}}
  derive();renderData();go(document.querySelector('section.on').id.slice(2));toast('Trânsito antigo descartado')};   // redesenha a aba aberta (o Resumo ficava com os números antigos)
$('theme-seg').onclick=e=>{const b=e.target.closest('button');if(b)applyTheme(b.dataset.t)};
let _th='auto';try{_th=localStorage.getItem('planograma_theme')||'auto'}catch{}applyTheme(_th);
function renderData(){renderFresh();if(typeof mostraVersao==='function')mostraVersao();const n=planoRecs.length;
 $('d-plano').innerHTML=n?`<b>${esc(savedInfo?.name||'')}</b><br>${f0(n)} produtos · ${esc(currentMeta.date||'')} · salvo em ${esc(savedInfo?.savedAt||'')}`:'Nenhum relatório carregado';
 prcStatus();
 $('d-trans').innerHTML=transitLoaded?`<b>✓ Carregado</b> · ${f0(Object.keys(transitMap).length)} itens`:'Não carregado';cloudInfo()}
$('b-clear').onclick=()=>{if(confirm('Zerar todos os itens concluídos?')){lsClear();derive();toast('Concluídos zerados')}};

/* BACKUP .json / CSV (mesmo formato do app principal)
   version 2: inclui também a Cobertura (MDV, cobertura, sistemática) e as datas do Trânsito — antes o backup voltava sem MDV/sugestão */
function buildBackup(){return{app:'planograma',version:2,exportedAt:new Date().toISOString(),name:savedInfo?.name||'planograma',meta:currentMeta,
 records:planoRecs.map(rawRec),transit:transitLoaded?transitMap:null,transitMeta:transitMeta||null,
 estoque:estoqueLoaded?{map:estoqueMap,meta:estoqueMeta||null}:null,
 done:[...doneSet],pedido,dep:Object.keys(depMap),prefs:{},anexos:anexosBackup(),trreg:trReg,
 precos:PRC.p||PRC.c?{p:PRC.p?{map:PRC.p.map,name:PRC.p.name,savedAt:PRC.p.savedAt}:null,c:PRC.c?{map:PRC.c.map,meta:PRC.c.meta||null,name:PRC.c.name,savedAt:PRC.c.savedAt}:null}:null}}
/* anexos no backup (nov/2026): Panfleto, Ofertas e Lâminas dos 7 dias — antes o .json voltava sem eles */
function anexosBackup(){const a={of:{},pf:{}};
  if(encSrc&&encItems.length){a.enc={name:encSrc.name,kind:encSrc.kind,items:encItems,hdr:encSrc.hdr??-1,savedAt:encSavedAt,per:encPer};
    if(encSrc.kind==='xlsx'&&encSrc.buf)a.enc.b64=ab2b64(encSrc.buf);else a.enc.text=encSrc.text||''}
  for(let w=0;w<7;w++){const o=ofDays[w],p=pfDays[w];
    if(o&&!o.del&&Array.isArray(o.items)&&o.items.length)a.of['d'+w]=o;
    if(p&&!p.del&&typeof p.text==='string'&&p.text.trim())a.pf['d'+w]=p}
  return a}
/* restaura os anexos de um backup (local ou "Baixar tudo da nuvem") — mesmo caminho de quando chegam da nuvem */
async function restauraAnexos(a){if(!a||typeof a!=='object')return 0;let n=0;const lv=a.live||{};
  const d=a.enc;
  const tsDe=s=>{if(typeof s==='number')return s;const m=/(\d\d)\/(\d\d)\/(\d{4}),?\s*(\d\d):(\d\d)/.exec(String(s||''));return m?+new Date(+m[3],m[2]-1,+m[1],+m[4],+m[5]):0};
  if(d&&Array.isArray(d.items)&&d.items.length&&(!encItems.length||tsDe(d.savedAt)>tsDe(encSavedAt)||confirm('O backup traz um Panfleto ('+(d.name||'sem nome')+'). Substituir o Panfleto que está no aparelho ('+((encSrc&&encSrc.name)||'atual')+')?'))){
    encItems=d.items;encPer=d.per||null;encSavedAt=d.savedAt||new Date().toLocaleString('pt-BR');
    encSrc=d.kind==='xlsx'?{kind:'xlsx',name:d.name,buf:b642ab(d.b64||''),hdr:d.hdr}:{...parseEncCSV(d.text||''),name:d.name,text:d.text||''};
    if(!encPer&&encSrc.per)encPer=encSrc.per;encCloudAt=(lv.enc&&lv.enc.at)||0;encPending=false;await encSaveLocal().catch(()=>{});n++}
  for(let w=0;w<7;w++){
    const o=a.of&&a.of['d'+w];
    const loc=ofDays[w],locP=pfDays[w],novo=(b,l)=>!l||l.del||!(l.at>0)||(b.at||0)>l.at;   // só troca se o aparelho está vazio ou o do backup é mais novo
    if(o&&Array.isArray(o.items)&&o.items.length&&novo(o,loc&&loc.items&&loc.items.length?loc:null)){const rec={...o,id:'oferta-d'+w,w,cloudAt:(lv.of&&lv.of['d'+w])||o.cloudAt||0,pending:false,del:false};ofDays[w]=rec;if(idb)await idbSave(rec).catch(()=>{});n++}
    const p=a.pf&&a.pf['d'+w];
    if(p&&typeof p.text==='string'&&p.text.trim()&&novo(p,locP&&locP.text&&locP.text.trim()?locP:null)){const rec={...p,id:'panfleto-d'+w,w,cloudAt:(lv.pf&&lv.pf['d'+w])||p.cloudAt||0,pending:false,del:false};pfDays[w]=rec;if(idb)await idbSave(rec).catch(()=>{});n++}}
  if(n){try{ofApplyDay()}catch{}try{pfApplyDay(false)}catch{}}
  return n}
/* arquivo "Baixar tudo da nuvem" (app:'planograma-nuvem') → mesmo formato do backup, para abrir pelo botão do Planograma */
function nuvemToBackup(n){const D=n.dados||{},P=D.plano||{},E=D.estq||{},T=D.trans||{},L=D.live||{};
  return{app:'planograma',version:2,name:(P.info&&P.info.name)||'nuvem',meta:(P.info&&(P.info.meta||{filial:P.info.filial,date:P.info.date}))||{},
    records:lePack(P.v3)?planoUnpack(lePack(P.v3)):lePack(P.v2)?planoUnpack(lePack(P.v2)):Array.isArray(P.records)?P.records:[],transit:T.data||null,transitMeta:(T.info&&T.info.meta)||null,   // v76: lê o formato enxuto e o antigo
    estoque:lePack(E.v3||E.v2)?{map:estqUnpack(lePack(E.v3||E.v2)),meta:(E.info&&E.info.meta)||null}:E.data?{map:E.data,meta:(E.info&&E.info.meta)||null}:null,
    done:L.done?Object.keys(L.done).filter(k=>L.done[k]===true):[],pedido:Array.isArray(L.pedido)?L.pedido:[],dep:Array.isArray(L.dep)?L.dep:[],
    anexos:{enc:D.enc&&D.enc.data,of:D.of||{},pf:D.pf||{},live:{enc:L.enc,of:L.of,pf:L.pf}},
    trreg:(()=>{const R=D.trreg||{};let v=null;try{v=typeof R.data==='string'?JSON.parse(R.data):R.data}catch{}return v&&v.reg?{reg:v.reg,saiu:v.saiu||{},last:R.last||''}:null})(),   // v83: datas do trânsito
    precos:(()=>{const R=D.prc||{},I=R.info||{},o={};for(const k of['p','c']){let m=null;try{m=typeof R[k]==='string'?JSON.parse(R[k]):R[k]}catch{}   // v83: preços (antes se perdiam ao importar)
      if(m&&typeof m==='object')o[k]={map:m,name:(I[k]&&I[k].name)||'nuvem',meta:(I[k]&&I[k].meta)||null,savedAt:(I[k]&&I[k].savedAt)||''}}return o.p||o.c?o:null})()}}
async function importBackup(text,fname){try{let b=JSON.parse(text);if(b&&b.app==='planograma-nuvem')b=nuvemToBackup(b);if(b.app!=='planograma'||!Array.isArray(b.records))throw 0;
 const meta=b.meta||{};
 if(!b.transit){transitMap={};transitLoaded=false;transitMeta=null;if(idb)idbSave({id:'transitmeta',meta:null}).catch(()=>{})}   // backup sem Trânsito: não mistura com o Trânsito antigo do aparelho
 if(b.transit&&b.transitMeta&&typeof b.transitMeta==='object'){transitMeta=b.transitMeta;if(idb)idbSave({id:'transitmeta',meta:transitMeta}).catch(()=>{})}
 if(b.estoque&&b.estoque.map&&typeof b.estoque.map==='object'){                 // Cobertura vem junto (backup version 2)
   estoqueMap=b.estoque.map;estoqueLoaded=true;estoqueMeta=b.estoque.meta||null;
   if(idb)idbSave({id:'estoque',map:estoqueMap,meta:estoqueMeta,name:'backup '+fname,savedAt:new Date().toLocaleString('pt-BR')}).catch(()=>{});
   $('cob-status').innerHTML=`<b>✓ ${esc(fname)}</b> · ${f0(Object.keys(estoqueMap).length)} produtos · do backup`}
 if(b.trreg&&b.trreg.reg&&(b.trreg.last||'')>=(trReg.last||'')){trReg={reg:b.trreg.reg||{},saiu:b.trreg.saiu||{},last:b.trreg.last||''};trDirty=true;trSalva()}   // datas do trânsito vêm junto no backup
 if(b.precos&&typeof b.precos==='object'){for(const k of['p','c']){const x=b.precos[k];if(x&&x.map&&typeof x.map==='object'){PRC[k]={...x,at:0,dirty:true};prcSave(k)}}prcStatus()}   // Preços vêm junto no backup
 await loadRecords(b.records,meta,b.name||fname,b.transit||null,true);
 try{localStorage.setItem(lsKeyFor(meta.filial||'',meta.date||''),JSON.stringify(b.done||[]));lsLoad();cloudWriteDone();derive();if(Array.isArray(b.pedido)){pedido=b.pedido;savePed()}if(Array.isArray(b.dep)){depMap={};b.dep.forEach(k=>{if(k)depMap[k]=true});saveDep()}renderHome()}catch{}
 let nax=0;try{nax=await restauraAnexos(b.anexos);if(nax){derive();renderHome()}}catch{}
 busy(false);toast(f0(b.records.length)+' produtos importados'+(b.estoque?' · com Cobertura':'')+(nax?` · ${nax} anexo${nax>1?'s':''} (Panfleto/Lâmina/Oferta)`:''));return true}catch{busy(false);toast('Arquivo .json inválido');return false}}
$('b-json').onclick=()=>{if(!allRecords.length)return toast('Nada para exportar');const s=((currentMeta.filial||'')+'_'+(currentMeta.date||'')).replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'');
 downloadBlob(new Blob([JSON.stringify(buildBackup())],{type:'application/json;charset=utf-8'}),`planograma_${s||'dados'}.json`)};
$('b-csv').onclick=()=>{if(!allRecords.length)return toast('Nada para exportar');const H=['Produto','EAN','Descrição','Categoria','Corredor','Estoque','Trânsito','MDV','Cob.Plan','Cobertura','Cob. total','Situação','Entrega','Últ. entrada','Últ. venda','Feito'];
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const rows=allRecords.map(r=>[r.produto,r.automacao,r.descricao,r.categoria,r.corredor,r._e,r._t,r._m?r._m.toFixed(2).replace('.',','):'',r.cobplan,r._c===null?'':r._c,r._ct===null?'':r._ct,LBL[r._k],ENT[r._sist]||'',r._ue,r._uv,r._d?'sim':'']);
 downloadBlob(new Blob(['﻿'+[H,...rows].map(r=>r.map(q).join(';')).join('\n')],{type:'text/csv;charset=utf-8'}),'planograma.csv')};

/* ═══ LEITOR DE CÓDIGO DE BARRAS — economiza bateria: só liga ao tocar, 640×480 a ~15 fps,
   olha ~4× por segundo (não a cada quadro), só EANs/Code128, e desliga ao ler, ao fechar,
   ao sair do app ou após 30 s ═══ */
let scanStream=null,scanT=null,scanKill=null;
async function scanStart(cb){
  if(!('BarcodeDetector' in window)||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    toast('Este navegador não lê código de barras. Digite o código na busca.');return}
  if(scanStream)return;
  try{
    const det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});
    scanStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:20}}});
    const v=$('sv');v.srcObject=scanStream;await v.play();$('scan').classList.add('on');pushOv('scan');
    scanKill=setTimeout(()=>{scanStop();toast('Câmera desligada após 30 s para poupar bateria')},30000);
    const loop=async()=>{if(!scanStream)return;
      try{const r=await det.detect(v);if(r.length&&r[0].rawValue){const code=r[0].rawValue;navigator.vibrate&&navigator.vibrate(60);scanStop(true);cb(code);if(!$('sheet').classList.contains('on'))popOv();return}}catch{}
      scanT=setTimeout(loop,250)};
    loop();
  }catch(e){scanStop(true);toast(e&&e.name==='NotAllowedError'?'Permita o uso da câmera no navegador':'Não foi possível abrir a câmera')}
}
function scanStop(noHist){
  clearTimeout(scanT);clearTimeout(scanKill);
  if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}   // apaga a luz da câmera
  const v=$('sv');try{v.pause()}catch{};v.srcObject=null;$('scan').classList.remove('on');
  if(!noHist)popOv();   // fecha a entrada do histórico criada ao abrir o leitor
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scanStream)scanStop()});
$('scan-x').onclick=()=>scanStop();
addEventListener('pagehide',()=>scanStop(true));   // ⚡ iOS: garante câmera desligada ao sair/congelar a página
const zeros=x=>String(x||'').replace(/\D/g,'').replace(/^0+/,'');
const byCode=c=>allRecords.find(r=>zeros(r.automacao)===zeros(c)||zeros(r.produto)===zeros(c));
$('b-scan').onclick=()=>scanStart(code=>{const r=byCode(code);
  if(!r){F={...F,chip:'all',cat:'',q:code,fg:''};$('q').value=code;renderList(true);return toast('Código '+code+' não encontrado')}
  F={...F,chip:'all',cat:'',q:r.automacao||r.produto,fg:''};$('q').value=F.q;renderList(true);openSheet(r)});
$('b-scan2').onclick=()=>scanStart(code=>{const r=byCode(code);
  if(!r)return toast('Código '+code+' não encontrado');
  toast(addS(r)?'Adicionado ao pedido: '+r.descricao:'Já está no pedido');renderPed()});

/* Copia texto para o clipboard silenciosamente */
async function copyEAN(ean,pre){
  try{await navigator.clipboard.writeText(ean)}
  catch{const t=document.createElement('textarea');t.value=ean;t.style.cssText='position:fixed;opacity:0';
    document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t)}
  toast((pre?pre+' · ':'')+'EAN copiado: '+ean)
}
