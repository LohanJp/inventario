/* Planograma Mobile — ARQUIVOS: carregar relatórios, faixa de idade dos dados, aba Dados, backup .json/.csv e leitor de código de barras.
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */

/* CARREGAR / SALVAR */
async function loadRecords(records,meta,name,transit,persist,savedAt){
 planoRecs=records;allRecords=records;currentMeta=meta;lsKey=lsKeyFor(meta.filial||'',meta.date||'');lsLoad();
 if(transit){transitMap=transit;transitLoaded=true}
 savedInfo={name,savedAt:savedAt||new Date().toLocaleString('pt-BR')};
 if(persist&&idb)await idbSave({id:'current',name,records,meta,savedAt:savedInfo.savedAt,filial:meta.filial,date:meta.date,transit:transitLoaded?transitMap:undefined}).catch(()=>{});
 derive();F={chip:'all',cat:'',q:'',sort:'cobt'};$('q').value='';go('home')}
/* Os relatórios do sistema são UTF-8 (cada acento ocupa 1 coluna). Ler como latin1 transformava Ç, Ã, º… em 2 caracteres e
   DESLOCAVA as colunas dessas linhas (≈2% do planograma): Cob.Plan 999 virava "6 9", estoque 0 virava 9, etc.
   Agora tenta UTF-8 e só cai para Windows-1252 se o arquivo realmente não for UTF-8. */
function readFile(file,cb,enc){const r=new FileReader();
  if(enc==='latin1'){r.onload=e=>cb(decodeBuf(e.target.result));r.readAsArrayBuffer(file);return}
  r.onload=e=>cb(e.target.result);r.readAsText(file,enc)}
$('f-plano').onchange=e=>{const f=e.target.files[0];if(!f)return;e.target.value='';busy(true,'Lendo arquivo…',true);
 if(/\.json$/i.test(f.name))readFile(f,t=>importBackup(t,f.name),'utf-8');
 else readFile(f,async t=>{await tick();const p=parseFile(t);if(!p.records.length){busy(false);return toast('Nenhum produto encontrado no arquivo')}
  await loadRecords(p.records,p.meta,f.name,null,true);const had=doneSet.size;if(had){lsClear();derive();renderHome()}   // relatório novo: concluídos recomeçam do zero
  busy(false);toast(f0(p.records.length)+' produtos carregados'+(had?' · concluídos zerados':'')+warnTxt())},'latin1')};
$('f-trans').onchange=e=>{const f=e.target.files[0];if(!f)return;e.target.value='';busy(true,'Lendo trânsito…');
 readFile(f,async t=>{transitMap=parseTransitFile(t);transitLoaded=true;if(idb&&transitMeta)idbSave({id:'transitmeta',meta:transitMeta}).catch(()=>{});derive();
  if(idb){try{const rec=await idbGet('current');if(rec){rec.transit=transitMap;await idbSave(rec)}}catch{}}
  busy(false);renderData();toast('Trânsito carregado — '+f0(Object.keys(transitMap).length)+' itens')},'latin1')};
function renderFresh(){
  const el=$('fresh-t'),F_=$('fresh');
  if(!allRecords.length){el.textContent='Nenhum relatório carregado';F_.classList.remove('warn');return}
  const base=String(currentMeta.date||'').trim();let warn=false;
  const item=(nome,ok,m)=>{if(!ok)return `<span class="off">${nome} —</span>`;const dt=m&&m.date?String(m.date):'',diff=dt&&base&&dt!==base;if(diff)warn=true;
    return `<span${diff?' class="diff"':''} title="${m&&m.hora?esc(dt+' '+m.hora):''}">${nome} ${dt?esc(dt.slice(0,5)):'✓'}</span>`};   // datas podem vir da nuvem: sempre escapadas
  const curto=innerWidth<380;                                                   // tela estreita: nomes curtos para as 3 datas caberem
  el.innerHTML=[item('Plano',planoRecs.length>0,currentMeta),item(curto?'Cob.':'Cobertura',estoqueLoaded,estoqueMeta),item(curto?'Trâns.':'Trânsito',transitLoaded,transitMeta)].join(' · ')+(warn?' ⚠':'');
  F_.classList.toggle('warn',warn);F_.title=warn?'Os relatórios são de dias diferentes — confira antes de pedir':'';
}
$('fresh-gear').onclick=()=>go('data');
$('theme-seg').onclick=e=>{const b=e.target.closest('button');if(b)applyTheme(b.dataset.t)};
let _th='auto';try{_th=localStorage.getItem('planograma_theme')||'auto'}catch{}applyTheme(_th);
function renderData(){renderFresh();const n=planoRecs.length;
 $('d-plano').innerHTML=n?`<b>${esc(savedInfo?.name||'')}</b><br>${f0(n)} produtos · ${esc(currentMeta.date||'')} · salvo em ${esc(savedInfo?.savedAt||'')}`:'Nenhum relatório carregado';
 $('d-trans').innerHTML=transitLoaded?`<b>✓ Carregado</b> · ${f0(Object.keys(transitMap).length)} itens`:'Não carregado';cloudInfo()}
$('b-clear').onclick=()=>{if(confirm('Zerar todos os itens concluídos?')){lsClear();derive();toast('Concluídos zerados')}};

/* BACKUP .json / CSV (mesmo formato do app principal)
   version 2: inclui também a Cobertura (MDV, cobertura, sistemática) e as datas do Trânsito — antes o backup voltava sem MDV/sugestão */
function buildBackup(){return{app:'planograma',version:2,exportedAt:new Date().toISOString(),name:savedInfo?.name||'planograma',meta:currentMeta,
 records:planoRecs.map(rawRec),transit:transitLoaded?transitMap:null,transitMeta:transitMeta||null,
 estoque:estoqueLoaded?{map:estoqueMap,meta:estoqueMeta||null}:null,
 done:[...doneSet],pedido,dep:Object.keys(depMap),prefs:{}}}
/* arquivo "Baixar tudo da nuvem" (app:'planograma-nuvem') → mesmo formato do backup, para abrir pelo botão do Planograma */
function nuvemToBackup(n){const D=n.dados||{},P=D.plano||{},E=D.estq||{},T=D.trans||{},L=D.live||{};
  return{app:'planograma',version:2,name:(P.info&&P.info.name)||'nuvem',meta:(P.info&&(P.info.meta||{filial:P.info.filial,date:P.info.date}))||{},
    records:Array.isArray(P.records)?P.records:[],transit:T.data||null,transitMeta:(T.info&&T.info.meta)||null,
    estoque:E.data?{map:E.data,meta:(E.info&&E.info.meta)||null}:null,
    done:L.done?Object.keys(L.done).filter(k=>L.done[k]===true):[],pedido:Array.isArray(L.pedido)?L.pedido:[],dep:Array.isArray(L.dep)?L.dep:[]}}
async function importBackup(text,fname){try{let b=JSON.parse(text);if(b&&b.app==='planograma-nuvem')b=nuvemToBackup(b);if(b.app!=='planograma'||!Array.isArray(b.records))throw 0;
 const meta=b.meta||{};
 if(b.transitMeta&&typeof b.transitMeta==='object'){transitMeta=b.transitMeta;if(idb)idbSave({id:'transitmeta',meta:transitMeta}).catch(()=>{})}
 if(b.estoque&&b.estoque.map&&typeof b.estoque.map==='object'){                 // Cobertura vem junto (backup version 2)
   estoqueMap=b.estoque.map;estoqueLoaded=true;estoqueMeta=b.estoque.meta||null;
   if(idb)idbSave({id:'estoque',map:estoqueMap,meta:estoqueMeta,name:'backup '+fname,savedAt:new Date().toLocaleString('pt-BR')}).catch(()=>{});
   $('cob-status').innerHTML=`<b>✓ ${esc(fname)}</b> · ${f0(Object.keys(estoqueMap).length)} produtos · do backup`}
 await loadRecords(b.records,meta,b.name||fname,b.transit||null,true);
 try{localStorage.setItem(lsKeyFor(meta.filial||'',meta.date||''),JSON.stringify(b.done||[]));lsLoad();cloudWriteDone();derive();if(Array.isArray(b.pedido)){pedido=b.pedido;savePed()}if(Array.isArray(b.dep)){depMap={};b.dep.forEach(k=>{if(k)depMap[k]=true});saveDep()}renderHome()}catch{}
 busy(false);toast(f0(b.records.length)+' produtos importados'+(b.estoque?' · com Cobertura':''));return true}catch{busy(false);toast('Arquivo .json inválido');return false}}
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
  if(!r){F={...F,chip:'all',cat:'',q:code};$('q').value=code;renderList(true);return toast('Código '+code+' não encontrado')}
  F={...F,chip:'all',cat:'',q:r.automacao||r.produto};$('q').value=F.q;renderList(true);openSheet(r)});
$('b-scan2').onclick=()=>scanStart(code=>{const r=byCode(code);
  if(!r)return toast('Código '+code+' não encontrado');
  toast(addS(r)?'Adicionado ao pedido: '+r.descricao:'Já está no pedido');renderPed()});

/* Copia texto para o clipboard silenciosamente */
async function copyEAN(ean){
  try{await navigator.clipboard.writeText(ean)}
  catch{const t=document.createElement('textarea');t.value=ean;t.style.cssText='position:fixed;opacity:0';
    document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t)}
  toast('EAN copiado: '+ean)
}
