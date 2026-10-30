/* Planograma Mobile — ANEXOS 2: Oferta do dia e Panfleto por dia da semana (7 slots + nuvem) e menu de Anexos.
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */

/* ══ ⭐ OFERTA DO DIA: planilha de ofertas × planograma ══
   Colunas reconhecidas pelo NOME do cabeçalho (qualquer ordem). Só precisa de EAN e/ou Código; Descrição e preços são opcionais
   (sem cabeçalho/sem preço o app NÃO dá erro: lê o que achar e avisa). Linhas extras tipo "APP"/"No App" viram etiqueta do item de cima. */
let ofItems=[],ofMeta={},ofRes=[],ofMatchedFor=null,ofNmOpen=false,ofPedOpen=false,ofSortV='arq';
/* 📅 7 slots (um por dia da semana): carregar outra planilha no mesmo dia da semana sobrescreve a antiga */
const OF_DN=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],OF_ORD=[1,2,3,4,5,6,0];
const ofISO=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const ofShort=iso=>iso?iso.slice(8)+'/'+iso.slice(5,7):'';
function ofDateFor(w){const t=new Date();t.setHours(12,0,0,0);let o=(w-t.getDay()+7)%7;if(o>3)o-=7;t.setDate(t.getDate()+o);return ofISO(t)}   // data mais próxima de hoje (−3 a +3 dias) com esse dia da semana
let ofDays=[null,null,null,null,null,null,null],ofSelDay=new Date().getDay(),ofSelOn=ofISO(new Date());
function ofApplyDay(){const o=ofDays[ofSelDay];ofMatchedFor=null;
  if(o&&o.items&&o.items.length){ofItems=o.items;ofMeta={name:o.name,savedAt:o.savedAt,warn:o.warn,validade:o.validade,sheet:o.sheet,date:o.date}}else{ofItems=[];ofMeta={}}}
function ofDayBar(){const tw=new Date().getDay();
  $('of-days').innerHTML=OF_ORD.map(w=>{const o=ofDays[w],ex=ofDateFor(w),has=!!(o&&o.items&&o.items.length),old=has&&o.date!==ex;
    return `<button type="button" data-w="${w}" class="${w===ofSelDay?'on ':''}${has?'has ':''}${old?'old ':''}${w===tw?'tdy':''}">${OF_DN[w]}<small>${esc(ofShort(has?o.date:ex))}</small></button>`}).join('');
  $('of-droptxt').textContent='📂 Toque para carregar a planilha de '+OF_DN[ofSelDay]+' '+ofShort(ofDateFor(ofSelDay));
  $('of-del').style.display=ofItems.length?'':'none'}
const OF_H={
  ean:t=>/\bean\b|gtin|barra/.test(t),
  code:t=>/^(codigo|cod|cod\.|host|sku|plu)$/.test(t),
  desc:t=>/^(descricao|descr\.?|produto|nome|item|mercadoria)$/.test(t),
  reg:t=>!/unid|qtd|qtde|loja|cashback/.test(t)&&/(venda reg|preco reg|preco normal|preco de|^preco$|^valor$)/.test(t),
  club:t=>!/unid|qtd|qtde|loja|cashback/.test(t)&&/(clube|promo|oferta|preco por)/.test(t),
  val:t=>/validade/.test(t)};
const ofDig=v=>typeof v==='number'?String(Math.round(v)):String(v??'').replace(/\D/g,'');
function ofNum(v){                                              // 7.29 · "7,29" · "R$ 1.234,56" → número (ou null)
  if(typeof v==='number')return v>0?Math.round(v*100)/100:null;
  let t=String(v??'').replace(/[^\d.,]/g,'');if(!t)return null;
  t=t.includes(',')?t.replace(/\./g,'').replace(',','.'):t;
  const n=parseFloat(t);return n>0?Math.round(n*100)/100:null}
function ofHeader(rows){                                         // acha a linha do cabeçalho e o índice de cada coluna
  for(let i=0;i<Math.min(rows.length,80);i++){
    const cols={};(rows[i]||[]).forEach((c,j)=>{const t=norm(String(c??'').trim());if(!t||t.length>40)return;
      for(const k of['ean','code','desc','reg','club','val'])if(cols[k]==null&&OF_H[k](t)){cols[k]=j;break}});
    if((cols.desc!=null&&(cols.code!=null||cols.ean!=null))||(cols.code!=null&&cols.ean!=null))return{row:i,cols}}
  return null}
function ofParse(rows){
  const items=[];let warn=[],h=ofHeader(rows);
  if(h){
    const C=h.cols,g=(r,c)=>c==null?'':r[c];let last=null;
    for(let i=h.row+1;i<rows.length;i++){const r=rows[i]||[];
      const code=ofDig(g(r,C.code)),ean=ofDig(g(r,C.ean)),desc=String(g(r,C.desc)??'').replace(/\s+/g,' ').trim();
      if(code.length>=3||ean.length>=3){
        last={ean,code,desc:desc||('Código '+(code||ean)),reg:ofNum(g(r,C.reg)),club:ofNum(g(r,C.club)),tag:'',val:String(g(r,C.val)??'').trim()};items.push(last)}
      else if(last){                                              // linha de apoio ("APP", "No App"…) → etiqueta do item anterior
        const tx=r.map(c=>typeof c==='string'?c.trim():'').filter(t=>t&&t.length<=20&&/[a-zA-Z]/.test(t));
        if(tx.length)last.tag=(last.tag?last.tag+' ':'')+tx.join(' ')}}
    if(!items.some(x=>x.reg||x.club))warn.push('Esta planilha não tem preços — mostrando só os produtos.')
  }else{                                                          // sem cabeçalho: lê pela aparência (códigos numéricos + texto), sem preço
    for(const r of rows){const cs=(r||[]).map(c=>c??'');
      const dg=cs.map(ofDig).filter((d,k)=>/^\d{3,14}$/.test(d)&&/^[\d\s.]+$/.test(String(cs[k]).trim()));
      const tx=cs.filter(c=>typeof c==='string'&&(c.match(/[a-zA-ZÀ-ú]/g)||[]).length>=3).map(c=>c.replace(/\s+/g,' ').trim()).sort((a,b)=>b.length-a.length);
      if(dg.length&&tx.length){const ean=dg.find(d=>d.length>=8)||'',code=dg.find(d=>d!==ean&&d.length<=8)||(ean?'':dg[0]);
        items.push({ean,code,desc:tx[0],reg:null,club:null,tag:'',val:''})}}
    if(items.length)warn.push('Não achei o cabeçalho (EAN · Código · Descrição): li as linhas pela aparência, sem preços. Confira os itens.')}
  return{items,warn}}
const ofClean=d=>String(d||'').replace(/\s*-\s*(A PARTIR|NESTA).*$/i,'').replace(/\./g,' ').replace(/\s+/g,' ').trim();
const ofFmt=v=>'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function ofPrice(it){
  const tag=it.tag?`<em>${esc(it.tag)}</em>`:'';
  if(it.club&&(!it.reg||it.club<it.reg))return`<b>${ofFmt(it.club)}</b>${it.reg?` <s>${ofFmt(it.reg)}</s>`:''}${tag}`;
  if(it.reg||it.club)return`<b>${ofFmt(it.reg||it.club)}</b>${tag}`;
  return tag}
function ofMatch(){                                              // 1º código/EAN (exato) · 2º nome (aproximado, marcado "≈")
  const bE={},bH={};allRecords.forEach(r=>{const e=zeros(r.automacao),h=zeros(r.produto);if(e)bE[e]=r;if(h)bH[h]=r});
  ofRes=ofItems.map(it=>{const c=zeros(it.code),e=zeros(it.ean),r=(c&&bH[c])||(e&&bE[e]);
    if(r)return{codes:[r.produto],approx:false};
    const q=ofClean(it.desc),rs=q&&!/^C[oó]digo \d+$/i.test(q)?pfMatch(q,2):[];
    return{codes:rs.map(x=>x.produto),approx:rs.length>0}});
  ofMatchedFor=allRecords}
function renderOf(){
  const box=$('of-list'),sum=$('of-sum'),has=ofItems.length>0;refreshDep();
  $('of-sortbar').style.display=has?'flex':'none';$('of-q').style.display=has?'':'none';
  if(!has){box.innerHTML='';sum.textContent=`Nenhuma planilha salva para ${OF_DN[ofSelDay]} ${ofShort(ofDateFor(ofSelDay))}. Toque acima para carregar.`;return}
  if(!allRecords.length){box.innerHTML='';sum.textContent='Carregue o planograma primeiro (aba Dados).';return}
  if(ofMatchedFor!==allRecords)ofMatch();
  const found=[],nm=[];
  ofItems.forEach((it,i)=>{const rs=((ofRes[i]||{}).codes||[]).map(c=>byProd.get(c)).filter(Boolean);
    if(rs.length)found.push({it,rs,approx:ofRes[i].approx});else nm.push(it)});
  let al=0;found.forEach(g=>{if(g.rs[0]._k==='rup'||g.rs[0]._k==='crit')al++});
  if(ofSortV==='sev'){const R={rup:0,crit:1,aten:2,ok:3,nd:4};found.sort((a,b)=>R[a.rs[0]._k]-R[b.rs[0]._k]||(a.rs[0]._ct??999)-(b.rs[0]._ct??999))}
  const grp=(g,rs)=>`<div class="pfh" data-q="${esc(ofClean(g.it.desc))}"><span>🔍 ${esc(g.it.desc)}${g.approx?' <small>≈ achado pelo nome</small>':''}</span><span class="pp">${ofPrice(g.it)}</span></div>`+rs.map(pfRowHtml).join('');
  const qOn=!!axQ.of.trim();let vis=0;   // 🔍 busca: descrição da planilha ou o produto (nome, EAN, código)
  const mainG=[],inP=[];found.forEach(g=>{const rs0=!qOn||axHit('of',null,[g.it.desc,g.it.ean,g.it.code].join(' '))?g.rs:g.rs.filter(r=>axHit('of',r));if(!rs0.length)return;vis++;
    const rm=rs0.filter(r=>!inPed(r.produto)),rp=rs0.filter(r=>inPed(r.produto));   // produtos que já estão no pedido (e não concluídos) vão para um dropdown à parte
    if(rm.length)mainG.push(grp(g,rm));if(rp.length)inP.push(grp(g,rp))});
  const html=mainG.join('');
  const pedHtml=inP.length?`<details class="trd" id="ofped"${ofPedOpen?' open':''} style="margin-top:14px"><summary><span>🛒 Já no pedido<small>Itens da oferta que você já pediu</small></span><span class="cnt">${inP.length}</span><svg class="ch" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></summary>${inP.join('')}</details>`:'';
  const nmF=nm.filter(it=>axHit('of',null,[it.desc,it.ean,it.code].join(' ')));
  const nmHtml=nmF.length?`<details class="trd" id="ofnm"${ofNmOpen?' open':''} style="margin-top:14px"><summary><span>❔ Sem correspondência<small>Não achei no planograma</small></span><span class="cnt">${nmF.length}</span><svg class="ch" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></summary>${nmF.map(it=>`<div class="pfn" data-q="${esc(ofClean(it.desc))}"><span>🔍 ${esc(it.desc)}</span><span class="pp">${ofPrice(it)}</span></div>`).join('')}</details>`:'';
  box.innerHTML=(qOn&&!vis?'<div class="empty">Nenhum item da oferta com essa busca</div>':'')+html+pedHtml+nmHtml;
  sum.textContent=(qOn?`🔍 ${vis} com essa busca · `:'')+`${ofItems.length} itens · ${found.length} no planograma${inP.length?` · ${inP.length} já no pedido`:''} · ${nm.length} sem correspondência${al?` · ${al} em ruptura/crítico`:''}`}
function ofShowMeta(){
  const t=$('of-title'),w=$('of-warn');ofDayBar();
  if(!ofItems.length){t.style.display='none';w.style.display='none';return}
  const ex=ofDateFor(ofSelDay),old=ofMeta.date&&ofMeta.date!==ex;
  const sl=ofDays[ofSelDay],cl=sl&&code()?(sl.pending?' · ⏳ ainda não enviada':sl.cloudAt?' · ☁ na nuvem':''):'';
  t.style.display='';t.textContent=`${ofMeta.date?'📅 '+OF_DN[ofSelDay]+' '+ofShort(ofMeta.date)+' · ':''}${ofMeta.name||'planilha'} · ${ofItems.length} itens${ofMeta.validade?` · ${ofMeta.validade}`:''}${ofMeta.savedAt?` · salva em ${ofMeta.savedAt}`:''}${cl}`;
  const msg=[old?`⚠ Esta planilha é de ${ofShort(ofMeta.date)}, não de ${ofShort(ex)} — carregue a nova.`:'',ofMeta.warn?'ℹ️ '+ofMeta.warn:''].filter(Boolean).join(' ');
  w.style.display=msg?'':'none';w.textContent=msg}
async function loadOfFile(file){
  if(!file)return;const t=$('of-title');t.style.display='';t.textContent='Lendo planilha…';
  try{
    let res=null,sheet='';
    if(/\.(xlsx|xls|ods)$/i.test(file.name)){
      await ensureXLSX();
      const wb=await new Promise((ok,no)=>{const r=new FileReader();r.onload=e=>{try{ok(XLSX.read(new Uint8Array(e.target.result),{type:'array'}))}catch(x){no(x)}};r.onerror=()=>no(new Error('não foi possível ler o arquivo'));r.readAsArrayBuffer(file)});
      for(const sn of wb.SheetNames){const o=ofParse(XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:''}));if(o.items.length){res=o;sheet=sn;break}}
    }else{
      const sep=l=>l.includes(';')?';':l.includes('\t')?'\t':',';
      res=ofParse((await readReport(file)).replace(/^﻿/,'').split(/\r?\n/).map(l=>l.split(sep(l)).map(c=>c.trim().replace(/^"|"$/g,''))));
      if(!res.items.length)res=null}
    if(!res){ofShowMeta();$('of-warn').style.display='';$('of-warn').textContent='⚠ Não achei itens nessa planilha. Ela precisa ter pelo menos uma coluna de código ou EAN (com texto no cabeçalho, como "Codigo" ou "EAN") e uma de descrição. A oferta anterior foi mantida.';return}
    const val=(res.items.find(x=>x.val)||{}).val||'';
    const w=ofSelDay;ofItems=res.items;ofMatchedFor=null;
    ofMeta={name:file.name,savedAt:new Date().toLocaleString('pt-BR'),warn:res.warn.join(' '),validade:val,sheet,date:ofDateFor(w)};
    ofDays[w]={id:'oferta-d'+w,w,items:ofItems,...ofMeta,at:Date.now(),cloudAt:0,pending:!!code()};     // pending = ainda não chegou na nuvem
    (idb?idbSave(ofDays[w]):Promise.resolve()).catch(()=>toast('⚠ Não consegui salvar a oferta neste aparelho')).then(()=>pushOf(w));
    ofShowMeta();renderOf();
  }catch(e){ofShowMeta();$('of-warn').style.display='';$('of-warn').textContent='⚠ Não consegui ler a planilha: '+e.message}}
/* ☁ NUVEM: cada dia vai para of/d0…d6 + um aviso pequeno em live/of → os outros aparelhos baixam sozinhos (PC → celular) */
const ofBusy={};
async function pushOf(w){
  const c=code(),rec=ofDays[w];if(!c||!rec||!rec.pending||ofBusy[w])return;
  ofBusy[w]=true;const at=rec.at,prev=rec.cloudAt||0,H={'Content-Type':'application/json'};
  try{
    const {id,pending,cloudAt,...data}=rec;
    let r=await cf(cu(c,'of/d'+w),{method:'PUT',headers:H,body:JSON.stringify(data)});if(!r.ok)throw 0;
    rec.cloudAt=at;rec.pending=false;lastLocal=Date.now();                  // marca ANTES do aviso, p/ não baixar o próprio eco
    r=await cf(cu(c,'live/of'),{method:'PATCH',headers:H,body:JSON.stringify({['d'+w]:at})});if(!r.ok)throw 0;
    if(idb)await idbSave(rec).catch(()=>{});
    toast('☁ Oferta de '+OF_DN[w]+' enviada para a nuvem');
  }catch{rec.cloudAt=prev;rec.pending=true;toast('⚠ Oferta salva só neste aparelho — não chegou na nuvem')}
  finally{ofBusy[w]=false;if(ofSelDay===w&&axCur==='dia'&&curTab==='enc')ofShowMeta()}
}
/* chamado pelo applyLive: baixa os dias que a nuvem tem mais novos, envia os que só existem aqui e apaga os que foram apagados em outro aparelho */
async function syncOf(c,lof){
  let ch=false;
  for(let w=0;w<7;w++){
    const loc=ofDays[w],ca=lof&&lof['d'+w];
    if(loc&&loc.pending){pushOf(w);continue}
    if(!ca){
      if(loc&&loc.cloudAt){ofDays[w]=null;ch=true;if(idb)idbSave({id:'oferta-d'+w,w,items:[]}).catch(()=>{})}     // apagada em outro aparelho
      else if(loc){loc.at=loc.at||Date.now();loc.pending=true;if(idb)idbSave(loc).catch(()=>{});pushOf(w)}       // só existe neste aparelho → envia
      continue}
    if(loc&&loc.cloudAt===ca)continue;                                       // já tenho esta versão
    const d=await cf(cu(c,'of/d'+w)).then(r=>r.json()).catch(()=>null);
    if(!d||!Array.isArray(d.items)||!d.items.length)continue;
    const rec={...d,id:'oferta-d'+w,w,cloudAt:ca,pending:false};
    ofDays[w]=rec;ch=true;if(idb)await idbSave(rec).catch(()=>{})}
  if(ch){ofApplyDay();if(axCur==='dia'&&curTab==='enc'){ofShowMeta();renderOf()}else if($('of-days'))ofDayBar()}
}
function ofOpen(){const hoje=ofISO(new Date());
  if(ofSelOn!==hoje){ofSelOn=hoje;ofSelDay=new Date().getDay();ofApplyDay()}      // virou o dia com o app aberto → volta para hoje
  ofShowMeta();renderOf()}
$('of-days').onclick=e=>{const b=e.target.closest('button[data-w]');if(!b)return;ofSelDay=+b.dataset.w;ofApplyDay();ofShowMeta();renderOf()};
$('of-del').onclick=()=>{if(!ofItems.length||!confirm('Limpar a planilha de '+OF_DN[ofSelDay]+' '+ofShort(ofMeta.date||ofDateFor(ofSelDay))+'?'))return;
  const w=ofSelDay,c=code();ofDays[w]=null;if(idb)idbSave({id:'oferta-d'+w,w,items:[]}).catch(()=>{});
  if(c){lastLocal=Date.now();put(c,'of/d'+w,null);patch(c,'live/of',{['d'+w]:null}).catch(()=>{})}              // some dos outros aparelhos também
  ofApplyDay();ofShowMeta();renderOf()};
function ofSync(){if(curTab==='enc'&&axCur==='dia')renderOf()}
$('of-drop').onclick=()=>$('of-input').click();
$('of-input').onchange=e=>{if(e.target.files[0])loadOfFile(e.target.files[0]);e.target.value=''};
$('of-sort').onchange=e=>{ofSortV=e.target.value;renderOf()};
$('of-list').addEventListener('toggle',e=>{if(e.target.id==='ofnm')ofNmOpen=e.target.open;if(e.target.id==='ofped')ofPedOpen=e.target.open},true);
$('of-list').onclick=e=>{if(Date.now()<swBlock)return;
  const h=e.target.closest('.pfh,.pfn');if(h&&h.dataset.q){pfSearch(h.dataset.q);return}
  const c=e.target.closest('.pfc');if(c&&e.target.closest('.infb')){const r=byProd.get(c.dataset.p);if(r)openSheet(r)}};

/* 🧾 PANFLETO por dia da semana (mesmo esquema da Oferta do dia): 7 slots + nuvem (pf/d0…d6 + aviso em live/pf) */
let pfDays=[null,null,null,null,null,null,null],pfSelDay=new Date().getDay(),pfSelOn=ofISO(new Date()),pfAskCb=null;
const pfBusy={},pfTxt=()=>$('pf-txt').value;
const pfIsDraft=()=>{const t=pfTxt();return !!t.trim()&&!pfDays.some(o=>o&&o.text===t)};
function pfDayBar(){const tw=new Date().getDay(),sl=pfDays[pfSelDay],ex=ofDateFor(pfSelDay),m=$('pf-meta');
  $('pf-days').innerHTML=OF_ORD.map(w=>{const o=pfDays[w],e=ofDateFor(w),has=!!(o&&o.text&&o.text.trim()),old=has&&o.date!==e;
    return `<button type="button" data-w="${w}" class="${w===pfSelDay?'on ':''}${has?'has ':''}${old?'old ':''}${w===tw?'tdy':''}">${OF_DN[w]}<small>${esc(ofShort(has?o.date:e))}</small></button>`}).join('');
  if(!sl||!sl.text){m.textContent=`Nenhum panfleto salvo para ${OF_DN[pfSelDay]} ${ofShort(ex)}. Cole a lista e toque em Buscar — o app pergunta o dia.`;return}
  const cl=code()?(sl.pending?' · ⏳ ainda não enviado':sl.cloudAt?' · ☁ na nuvem':''):'';
  m.textContent=`📅 ${OF_DN[pfSelDay]} ${ofShort(sl.date)} · salvo em ${sl.savedAt||''}${cl}`+(sl.date!==ex?` · ⚠ é de ${ofShort(sl.date)}, não de ${ofShort(ex)}`:'')}
function pfApplyDay(run){const o=pfDays[pfSelDay];pfGroups=[];
  if(o&&o.text){$('pf-txt').value=o.text;try{localStorage.setItem(LSPF,o.text)}catch{}
    pfDayBar();if(run!==false)pfRun();return}
  if(!pfIsDraft()){$('pf-txt').value='';try{localStorage.removeItem(LSPF)}catch{}$('pf-list').innerHTML='';$('pf-sum').textContent=''}   // dia vazio: limpa (mas nunca apaga um rascunho colado e ainda não buscado)
  pfDayBar()}
$('pf-days').onclick=e=>{const b=e.target.closest('button[data-w]');if(!b)return;pfSelDay=+b.dataset.w;pfApplyDay()};
/* Buscar: lista nova → pergunta o dia; mesma lista do dia → só busca */
function pfSubmit(){const t=pfTxt();if(!t.trim()){pfRun();return}
  const sl=pfDays[pfSelDay];if(sl&&sl.text===t){pfRun();return}
  pfAsk(w=>{pfSelDay=w;pfSave(w,t);pfRun()})}
function pfAskClose(){$('pf-ask').style.display='none';pfAskCb=null}
function pfAsk(cb){const tw=new Date().getDay();
  $('pf-ask-days').innerHTML=OF_ORD.map(w=>{const o=pfDays[w],has=!!(o&&o.text);
    return `<button type="button" data-w="${w}" class="${w===pfSelDay?'on ':''}${has?'has ':''}${w===tw?'tdy':''}">${OF_DN[w]}<small>${ofShort(ofDateFor(w))}</small></button>`}).join('');
  pfAskCb=cb;$('pf-ask').style.display='flex'}
$('pf-ask-days').onclick=e=>{const b=e.target.closest('button[data-w]');if(!b)return;const cb=pfAskCb;pfAskClose();if(cb)cb(+b.dataset.w)};
$('pf-ask-x').onclick=pfAskClose;$('pf-ask').onclick=e=>{if(e.target.id==='pf-ask')pfAskClose()};
function pfSave(w,t){const rec={id:'panfleto-d'+w,w,text:t,date:ofDateFor(w),at:Date.now(),savedAt:new Date().toLocaleString('pt-BR'),cloudAt:0,pending:!!code()};
  pfDays[w]=rec;(idb?idbSave(rec):Promise.resolve()).catch(()=>toast('⚠ Não consegui salvar o panfleto neste aparelho')).then(()=>pushPf(w));pfDayBar()}
async function pushPf(w){
  const c=code(),rec=pfDays[w];if(!c||!rec||!rec.pending||pfBusy[w])return;
  pfBusy[w]=true;const at=rec.at,prev=rec.cloudAt||0,H={'Content-Type':'application/json'};
  try{
    const {id,pending,cloudAt,...data}=rec;
    let r=await cf(cu(c,'pf/d'+w),{method:'PUT',headers:H,body:JSON.stringify(data)});if(!r.ok)throw 0;
    rec.cloudAt=at;rec.pending=false;lastLocal=Date.now();                  // marca ANTES do aviso, p/ não baixar o próprio eco
    r=await cf(cu(c,'live/pf'),{method:'PATCH',headers:H,body:JSON.stringify({['d'+w]:at})});if(!r.ok)throw 0;
    if(idb)await idbSave(rec).catch(()=>{});
    toast('☁ Panfleto de '+OF_DN[w]+' enviado para a nuvem');
  }catch{rec.cloudAt=prev;rec.pending=true;toast('⚠ Panfleto salvo só neste aparelho — não chegou na nuvem')}
  finally{pfBusy[w]=false;pfDayBar()}
}
async function syncPf(c,lpf){
  let apply=false;
  for(let w=0;w<7;w++){
    const loc=pfDays[w],ca=lpf&&lpf['d'+w];
    if(loc&&loc.pending){pushPf(w);continue}
    if(!ca){
      if(loc&&loc.cloudAt){                                                  // apagado em outro aparelho
        if(w===pfSelDay&&pfTxt()===loc.text)apply=true;
        pfDays[w]=null;if(idb)idbSave({id:'panfleto-d'+w,w,text:''}).catch(()=>{});apply=apply||w===pfSelDay}
      else if(loc){loc.at=loc.at||Date.now();loc.pending=true;if(idb)idbSave(loc).catch(()=>{});pushPf(w)}   // só existe neste aparelho → envia
      continue}
    if(loc&&loc.cloudAt===ca)continue;                                       // já tenho esta versão
    const d=await cf(cu(c,'pf/d'+w)).then(r=>r.json()).catch(()=>null);
    if(!d||typeof d.text!=='string'||!d.text.trim())continue;
    if(w===pfSelDay&&(!pfTxt().trim()||pfTxt()===(loc?loc.text:'')))apply=true;   // não pisa num rascunho que você está digitando
    const rec={...d,id:'panfleto-d'+w,w,cloudAt:ca,pending:false};
    pfDays[w]=rec;if(idb)await idbSave(rec).catch(()=>{})}
  if(apply)pfApplyDay(axCur==='pan'&&curTab==='enc');else pfDayBar()
}
const AXL={enc:'📋 Encarte',pan:'🧾 Panfleto',dia:'⭐ Oferta do dia'};
let axCur='enc';try{const v=localStorage.getItem('planograma_ax');if(AXL[v])axCur=v}catch{}
function axShow(k){
  axCur=k;try{localStorage.setItem('planograma_ax',k)}catch{}
  ['enc','pan','dia'].forEach(x=>$('ax-'+x).style.display=x===k?'':'none');
  $('ax-lbl').textContent=AXL[k];
  document.querySelectorAll('#ax-menu .axi').forEach(b=>b.classList.toggle('on',b.dataset.ax===k));
  $('ax-menu').style.display='none';
  if(k==='pan')pfOpen();if(k==='dia')ofOpen()}
$('ax-btn').onclick=e=>{e.stopPropagation();const m=$('ax-menu');m.style.display=m.style.display==='none'?'block':'none'};
$('ax-menu').onclick=e=>{const b=e.target.closest('.axi');if(b)axShow(b.dataset.ax)};
document.addEventListener('click',e=>{if(!e.target.closest('.axw'))$('ax-menu').style.display='none'});
axShow(axCur);

/* ═══ SELOS DOS ANEXOS no cartão (igual aos selos CD e 🛒): ⭐ Oferta do dia · 🧾 Panfleto · 📋 Encarte
   Cor pelo dia: verde = dia que já passou · amarelo = hoje · laranja = próximos dias (o Encarte não tem dia: azul).
   Item em vários dias: o selo mostra hoje → senão o próximo dia → senão o último que passou (todos os dias ficam no title). */
let axIdx=null,axKey=[];
const axSigNow=()=>[allRecords,encItems,ofISO(new Date()),...ofDays.map(o=>o&&o.items&&o.items.length?o.items:null),...ofDays.map(o=>o&&o.date||''),...pfDays.map(o=>o&&o.text||''),...pfDays.map(o=>o&&o.date||'')];
const axCache={pf:{},of:{}};
function axPfCodes(w){const o=pfDays[w];if(!o||!o.text||!o.text.trim())return[];const c=axCache.pf[w];if(c&&c.t===o.text&&c.r===allRecords)return c.codes;
  const s=new Set();pfParse(o.text).forEach(it=>it.parts.forEach(pt=>pfMatch(pt,it.parts.length>1?2:3).forEach(r=>s.add(r.produto))));
  return(axCache.pf[w]={t:o.text,r:allRecords,codes:[...s]}).codes}
function axOfCodes(w){const o=ofDays[w];if(!o||!o.items||!o.items.length)return[];const c=axCache.of[w];if(c&&c.t===o.items&&c.r===allRecords)return c.codes;
  const bE={},bH={};allRecords.forEach(r=>{const e=zeros(r.automacao),h=zeros(r.produto);if(e)bE[e]=r;if(h)bH[h]=r});
  const s=new Set();o.items.forEach(it=>{const cc=zeros(it.code),e=zeros(it.ean),r=(cc&&bH[cc])||(e&&bE[e]);   // mesma regra da tela: código/EAN, senão pelo nome
    if(r)s.add(r.produto);else{const q=ofClean(it.desc);if(q&&!/^C[oó]digo \d+$/i.test(q))pfMatch(q,2).forEach(x=>s.add(x.produto))}});
  return(axCache.of[w]={t:o.items,r:allRecords,codes:[...s]}).codes}
function axBuild(){const k=axSigNow();if(axIdx&&k.length===axKey.length&&k.every((v,i)=>v===axKey[i]))return axIdx;
  axKey=k;const m=new Map(),add=(p,t,d)=>{let e=m.get(p);if(!e)m.set(p,e={of:[],pf:[],enc:false});if(t==='enc')e.enc=true;else if(!e[t].includes(d))e[t].push(d)};
  for(let w=0;w<7;w++){
    const o=ofDays[w];if(o&&o.items&&o.items.length)axOfCodes(w).forEach(p=>add(p,'of',o.date||ofDateFor(w)));
    const q=pfDays[w];if(q&&q.text&&q.text.trim())axPfCodes(w).forEach(p=>add(p,'pf',q.date||ofDateFor(w)))}
  if(encItems.length)encMatch().forEach(({r})=>{if(r)add(r.produto,'enc')});
  return axIdx=m}
const axWhen=d=>{const h=ofISO(new Date());return d<h?'p':d===h?'t':'f'};
const axDay=d=>{const[y,mo,da]=d.split('-').map(Number);return OF_DN[new Date(y,mo-1,da,12).getDay()]};
const axPick=ds=>{const h=ofISO(new Date()),s=ds.slice().sort();return s.includes(h)?h:s.find(d=>d>h)||s[s.length-1]};
const AXQ={p:'já passou',t:'hoje',f:'próximos dias'};
function axBadges(r){if(!allRecords.length)return'';const e=axBuild().get(r.produto);if(!e)return'';let s='';
  for(const[t,ic,nm]of[['of','⭐','Oferta do dia'],['pf','🧾','Panfleto']]){const ds=e[t];if(!ds.length)continue;const d=axPick(ds),w=axWhen(d);
    s+=` <span class="ent ax-${w}" title="${nm} (${AXQ[w]}): ${ds.slice().sort().map(x=>axDay(x)+' '+ofShort(x)).join(', ')}">${ic} ${axDay(d)}</span>`}
  if(e.enc)s+=' <span class="ent ax-e" title="Está no Encarte">📋 Encarte</span>';
  return s}

/* ═══ BUSCA NAS TELAS DOS ANEXOS: filtra a lista mostrada pelo nome da planilha/panfleto ou pelo produto (nome, EAN, código) ═══ */
const axQ={enc:'',pf:'',of:''};
function axHit(k,r,txt){const T=toks(axQ[k]);if(!T.length)return true;if(r&&score(r,T)>0)return true;const h=norm(txt||'');return T.every(t=>h.includes(t))}
[['enc-q','enc',()=>renderEnc()],['pf-q','pf',()=>renderPf()],['of-q','of',()=>renderOf()]].forEach(([id,k,fn])=>{const go_=debounce(fn,180);$(id).oninput=e=>{axQ[k]=e.target.value;go_()}});
