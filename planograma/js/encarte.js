/* Planograma Mobile — ANEXOS 1: Encarte (planilha + exportação com formatação), leitura do Panfleto, leitor de planilhas, Encarte na nuvem e carregamento da Cobertura.
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */

/* PEDIDO (lembrete: fazer o pedido amanhã entre 9h e 10h) */
/* ══ ANÁLISE DE ENCARTE ══════════════════════════════════════════════════ */
let encItems=[],encSrc=null; // itens [{ean,host,nome,row}] e a planilha original (para exportar)
/* 📅 DIA DO PANFLETO: vem do título da planilha (linhas acima do cabeçalho EAN · Host · Nome). Ex. da Condor:
   "Conferência de estoques e Ajustes (Panfleto Tema a definir 02 a 08/11/2026)(até às 12:00h do dia 28/10)"
     → período 02/11 a 08/11/2026 · ⏰ PRAZO para responder: 28/10 às 12:00 (o "até às … do dia …" NÃO é o período)
   Também aceita "30/10", "30/10 a 05/11", "de 30/10 até 05/11", "02 a 08 de novembro", "30 de outubro a 5 de novembro".
   Sem ano: usa o ano mais perto de hoje (fim antes do início → fim no ano seguinte). Sem data no título: null */
let encPer=null;   // {ini:'AAAA-MM-DD', fim:'AAAA-MM-DD', prazo:'AAAA-MM-DDTHH:MM' ou ausente}
const MESES_PT=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function encPeriodo(rows){
  let t=rows.map(r=>(r||[]).map(c=>String(c??'')).join(' ')).join('  ').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const hoje=new Date();hoje.setHours(12,0,0,0);
  const mk=(x,y)=>new Date(y,x.mo-1,x.d,12);
  const ano=x=>x.y||[hoje.getFullYear()-1,hoje.getFullYear(),hoje.getFullYear()+1].sort((a,b)=>Math.abs(mk(x,a)-hoje)-Math.abs(mk(x,b)-hoje))[0];
  const Y=v=>v?(v.length===2?2000+ +v:+v):null,MES=v=>MESES_PT.indexOf(String(v).slice(0,3))+1,ok=x=>x.d>=1&&x.d<=31&&x.mo>=1&&x.mo<=12;
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  /* 1) prazo de resposta: "até (às) 12:00h (do dia) 28/10" ou "até (o dia) 28/10 às 12h" — sai do texto antes de ler o período */
  let prazo=null,m;
  const P1=/at[e]\s*(?:as\s*)?(\d{1,2})\s*(?:[:h]\s*(\d{2}))?\s*h?\s*(?:min\s*)?(?:do\s+dia|de|dia|no\s+dia)\s*(\d{1,2})\s*[\/-]\s*(\d{1,2})(?:\s*[\/-]\s*(\d{4}|\d{2}))?/,
        P2=/at[e]\s*(?:o\s+dia\s+|dia\s+)?(\d{1,2})\s*[\/-]\s*(\d{1,2})(?:\s*[\/-]\s*(\d{4}|\d{2}))?\s*(?:as|a)\s*(\d{1,2})\s*(?:[:h]\s*(\d{2}))?\s*h?/;
  if((m=P1.exec(t))){const x={d:+m[3],mo:+m[4],y:Y(m[5])};if(ok(x)){prazo={x,h:+m[1],mi:+(m[2]||0)};t=t.replace(m[0],' ')}}
  else if((m=P2.exec(t))){const x={d:+m[1],mo:+m[2],y:Y(m[3])};if(ok(x)){prazo={x,h:+m[4],mi:+(m[5]||0)};t=t.replace(m[0],' ')}}
  const prz=prazo&&prazo.h<=23&&prazo.mi<=59?iso(mk(prazo.x,ano(prazo.x)))+'T'+String(prazo.h).padStart(2,'0')+':'+String(prazo.mi).padStart(2,'0'):null;
  /* 2) período */
  let a=null,b=null;
  const R1=/(?<![\d\/.-])\b(\d{1,2})\s*(?:a|ate|e|-|–)\s*(\d{1,2})\s*[\/-]\s*(\d{1,2})(?:\s*[\/-]\s*(\d{4}|\d{2}))?(?!\d)/,        // 02 a 08/11/2026
        R2=/(?<![\d\/.-])\b(\d{1,2})\s*(?:a|ate|e|-|–)\s*(\d{1,2})\s*de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?(?:\s*(?:de\s+)?(\d{4}))?/;   // 02 a 08 de novembro
  if((m=R1.exec(t))||(m=R2.exec(t))){const mo=/\d/.test(m[3])?+m[3]:MES(m[3]),y=Y(m[4]);b={d:+m[2],mo,y};a={d:+m[1],mo:+m[1]>+m[2]?(mo===1?12:mo-1):mo,y:y&&+m[1]>+m[2]&&mo===1?y-1:y}}
  else{const re=/\b(\d{1,2})\s*[\/-]\s*(\d{1,2})(?:\s*[\/-]\s*(\d{4}|\d{2}))?(?!\d)|\b(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?(?:\s*(?:de\s+)?(\d{4}))?/g;
    const ds=[];while((m=re.exec(t))&&ds.length<2){const x={d:+(m[1]||m[4]),mo:m[2]?+m[2]:MES(m[5]),y:Y(m[3]||m[6])};if(ok(x))ds.push(x)}
    if(ds.length){a=ds[0];b=ds[1]||ds[0]}}
  if(!a||!ok(a)||!ok(b))return prz?{prazo:prz}:null;
  if(!a.y&&b.y)a.y=mk(a,b.y)<=mk(b,b.y)?b.y:b.y-1;                       // "02 a 08/11/2026": o início herda o ano do fim
  const ini=mk(a,ano(a));let fim=mk(b,b.y||ini.getFullYear());
  if(fim<ini&&!b.y)fim=mk(b,ini.getFullYear()+1);
  if(fim<ini)return prz?{prazo:prz}:null;
  const o={ini:iso(ini),fim:iso(fim)};if(prz)o.prazo=prz;return o}
const encPerTxt=p=>p&&p.ini?(p.ini===p.fim?ofShort(p.ini):ofShort(p.ini)+' a '+ofShort(p.fim)):'';
const encPerMeta=()=>{if(!encPer||!encPer.ini)return '';const h=ofISO(new Date());   // o prazo de resposta ("até às … do dia …") é lido só para não confundir com o período — não é mostrado
  return ` · 📅 ${encPerTxt(encPer)}`+(h>encPer.fim?' · ⚠ já passou':h>=encPer.ini?' · vale hoje':'')};

/* Converte linhas [EAN, Host, Nome] em itens (guarda o nº da linha original para exportar) e acha a linha do cabeçalho */
function rowsToItems(rows){
  let st=0,hdr=-1;
  for(let i=0;i<rows.length;i++){const c=String(rows[i][0]||'').trim();
    if(/^\d{8,14}$/.test(c)){st=i;break}
    if(/ean|cod/i.test(c)){st=i+1;hdr=i;break}}
  const items=[];
  rows.forEach((r,i)=>{if(i<st)return;const it={ean:String(r[0]||'').trim(),host:String(r[1]||'').trim(),nome:String(r[2]||'').trim(),row:i};if(it.ean.length>=8)items.push(it)});
  return{items,hdr,per:encPeriodo(rows.slice(0,hdr>=0?hdr:st))}}   // per = dia/período do título (linhas acima do cabeçalho)
/* CSV/TSV: detecta o separador (; tab ,) e guarda as linhas originais */
function parseEncCSV(text){
  const lines=text.replace(/^﻿/,'').split(/\r?\n/);
  const sep=l=>l.includes(';')?';':l.includes('\t')?'\t':',';
  const o=rowsToItems(lines.map(l=>l.split(sep(l)).map(c=>c.trim().replace(/^"|"$/g,''))));
  return{...o,kind:'csv',lines,sep:sep(lines[o.items.length?o.items[0].row:0]||''),nl:/\r\n/.test(text)?'\r\n':'\n'}}
/* XLSX/XLS/ODS com SheetJS (carregado sob demanda); guarda a planilha original para exportar */
function parseEncXLSX(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=e=>{try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}),sh=wb.Sheets[wb.SheetNames[0]],rg=XLSX.utils.decode_range(sh['!ref']||'A1');
      resolve({...rowsToItems(XLSX.utils.sheet_to_json(sh,{header:1,defval:''})),kind:'xlsx',wb,sh,rg,buf:e.target.result});
    }catch(err){reject(err)}};
    r.onerror=()=>reject(new Error('não foi possível ler o arquivo'));
    r.readAsArrayBuffer(file);
  });
}

/* situação do item do encarte: falta no CD = estoque < 1 caixa (mesmo critério do botão "Sem falta CD") */
const encStatus=r=>!r?'miss':cdRisk(r)?'cd':'ok';
const ENC_TXT={ok:'OK',cd:'Falta no CD',miss:'Não encontrado'};
/* liga cada item da planilha ao planograma por EAN (automacao) ou host (produto), ignorando zeros à esquerda */
function encMatch(){
  const byEAN={},byHost={};
  allRecords.forEach(r=>{if(zeros(r.automacao))byEAN[zeros(r.automacao)]=r;if(zeros(r.produto))byHost[zeros(r.produto)]=r});
  return encItems.map((it,i)=>({it,i,r:(zeros(it.ean)&&byEAN[zeros(it.ean)])||(zeros(it.host)&&byHost[zeros(it.host)])||null}));
}

let encSort='arq';
function renderEnc(){
  const has=encItems.length>0;
  $('enc-sortbar').style.display=has?'flex':'none';$('enc-export').style.display=has?'':'none';$('enc-q').style.display=has?'':'none';
  if(!has){$('enc-list').innerHTML='';$('enc-summary-box').innerHTML='';return}
  const ents=encMatch().map(e=>({...e,k:encStatus(e.r)}));
  const rank={cd:0,ok:1,miss:2};
  const cobN=e=>e.r&&e.r._ct!==null?Math.max(e.r._ct,0):Infinity;   // cobertura total = (estoque + trânsito) ÷ MDV
  // ordenação: itens não encontrados sempre por último (exceto "Ordem da planilha")
  const SORT={
    arq:(a,b)=>a.i-b.i,
    stat:(a,b)=>rank[a.k]-rank[b.k]||cobN(a)-cobN(b)||a.i-b.i,
    cob:(a,b)=>(!a.r)-(!b.r)||cobN(a)-cobN(b)||a.i-b.i,
    est:(a,b)=>(!a.r)-(!b.r)||(a.r?a.r._e-b.r._e:0)||a.i-b.i,
    mdv:(a,b)=>(!a.r)-(!b.r)||(b.r?(b.r._m||0)-(a.r._m||0):0)||a.i-b.i,
    nome:(a,b)=>(a.it.nome||'').localeCompare(b.it.nome||'')
  };
  ents.sort(SORT[encSort]||SORT.arq);
  const n={ok:0,cd:0,miss:0};ents.forEach(e=>n[e.k]++);
  $('enc-summary-box').innerHTML=`<div class="enc-summary">
    <div class="sk"><b>${ents.length}</b><span>TOTAL</span></div>
    <div class="sk" style="color:var(--ok)"><b>${n.ok}</b><span>OK</span></div>
    <div class="sk" style="color:var(--cr)"><b>${n.cd}</b><span>FALTA NO CD</span></div>
    <div class="sk" style="color:var(--mu)"><b>${n.miss}</b><span>N/ENCONTRADO</span></div>
  </div>`;
  const vis=ents.filter(e=>axHit('enc',e.r,[e.it.nome,e.it.ean,e.it.host].join(' ')));   // 🔍 busca do Encarte
  $('enc-list').innerHTML=(axQ.enc.trim()&&!vis.length?'<div class="empty">Nenhum item do panfleto com essa busca</div>':'')+vis.map(({it,r,k})=>r
    ?swrap(`<div class="p" data-p="${esc(r.produto)}" style="--c:${COLOR[r._k]}">${cardBody(r,'',k==='ok'?'<div class="sg okk">✓ OK</div>':`<div class="sg cdx">${ic('warn',14)} Falta no CD</div>`)}</div>`,null,'add',inPed(r.produto)?'Já no pedido':'Pedido','🛒')
    :`<div class="p" style="--c:var(--mu);opacity:.6"><div class="hd"><div class="nm">${esc(it.nome||'—')}</div></div><div class="sb">EAN ${esc(it.ean)} · Host ${esc(it.host)} · não encontrado no planograma</div></div>`).join('');
}
$('enc-sort').onchange=e=>{encSort=e.target.value;renderEnc()};
$('enc-list').onclick=e=>{if(Date.now()<swBlock)return;if(!e.target.closest('.infb'))return;const c=e.target.closest('.p');if(c)openSheet(byProd.get(c.dataset.p))};

/* ═══ EXPORTAR ENCARTE .xlsx COM A FORMATAÇÃO ORIGINAL ═══
   Em vez de regravar a planilha (o SheetJS perde fontes, bordas e larguras), edita o .xlsx original por dentro (zip + XML):
   acrescenta só a coluna "Situação" copiando o estilo da coluna ao lado e já deixa a impressão pronta —
   margens mínimas, 1 página de largura, SEM cabeçalho e SEM rodapé (nada para formatar no LibreOffice). */
function ensureJSZip(){
  if(typeof JSZip!=='undefined')return Promise.resolve();
  return new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload=ok;s.onerror=()=>no(new Error('sem internet para carregar o JSZip'));document.head.appendChild(s)})}
const xlCol=n=>{let s='';for(n++;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};      // 0 → A
const xlNum=a=>a.split('').reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1;                                          // A → 0
async function exportEncStyled(buf,hdr,st){
  await ensureJSZip();
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const zip=await JSZip.loadAsync(buf);
  let path='xl/worksheets/sheet1.xml';                                         // 1ª planilha do arquivo
  try{const wbx=new DOMParser().parseFromString(await zip.file('xl/workbook.xml').async('string'),'application/xml'),
      rid=wbx.getElementsByTagNameNS(NS,'sheet')[0].getAttributeNS(RNS,'id'),
      rels=new DOMParser().parseFromString(await zip.file('xl/_rels/workbook.xml.rels').async('string'),'application/xml');
    for(const r of rels.getElementsByTagName('Relationship'))if(r.getAttribute('Id')===rid){path='xl/'+r.getAttribute('Target').replace(/^\/?(xl\/)?/,'');break}}catch{}
  const f=zip.file(path);if(!f)throw Error('planilha não encontrada no arquivo');
  const doc=new DOMParser().parseFromString(await f.async('string'),'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw Error('XML da planilha inválido');
  const root=doc.documentElement,all=n=>[...doc.getElementsByTagNameNS(NS,n)],kid=n=>[...root.children].find(e=>e.localName===n);
  const rows=all('row');if(!rows.length)throw Error('planilha vazia');
  const refOf=c=>{const m=/^([A-Z]+)(\d+)$/.exec(c.getAttribute('r')||'');return m?{c:xlNum(m[1]),r:+m[2]}:null};
  let lc=0;all('c').forEach(c=>{const p=refOf(c);if(p&&p.c>lc)lc=p.c});
  const nc=lc+1,L=xlCol(nc),dim=kid('dimension'),m0=dim&&/^[A-Z]+(\d+)/.exec(dim.getAttribute('ref')||''),r0=m0?+m0[1]:+rows[0].getAttribute('r');
  const sOf=(row,ci)=>{const c=[...row.children].find(x=>x.localName==='c'&&(refOf(x)||{}).c===ci);return c?c.getAttribute('s'):null};
  const hdrR=hdr>=0?r0+hdr:-1,sc=Math.min(1,lc);                             // estilo da coluna ao lado (2ª coluna: centralizada, com borda)
  for(const row of rows){
    const rn=+row.getAttribute('r'),txt=st.get(rn-r0);let s=null,val=null;
    if(rn===hdrR){val='Situação';s=sOf(row,sc)}
    else if(txt!==undefined){val=txt;s=sOf(row,sc)}
    else s=sOf(row,lc);                                                      // sem status (título etc.): só continua o estilo/borda
    if(s===null&&val===null)continue;
    const c=doc.createElementNS(NS,'c');c.setAttribute('r',L+rn);if(s!==null)c.setAttribute('s',s);
    if(val!==null){c.setAttribute('t','inlineStr');const is=doc.createElementNS(NS,'is'),t=doc.createElementNS(NS,'t');t.textContent=val;is.appendChild(t);c.appendChild(is)}
    row.appendChild(c);row.removeAttribute('spans')}
  // largura da nova coluna (sem sobrepor faixas de colunas já definidas)
  let cols=kid('cols');if(!cols){cols=doc.createElementNS(NS,'cols');root.insertBefore(cols,kid('sheetData'))}
  [...cols.children].forEach(e=>{if(+e.getAttribute('min')>nc)cols.removeChild(e);else if(+e.getAttribute('max')>nc)e.setAttribute('max',nc)});
  const col=doc.createElementNS(NS,'col');col.setAttribute('min',nc+1);col.setAttribute('max',nc+1);col.setAttribute('width','16');col.setAttribute('customWidth','1');cols.appendChild(col);
  if(dim)dim.setAttribute('ref',(dim.getAttribute('ref')||'').replace(/^([A-Z]+\d+):[A-Z]+(\d+)$/,'$1:'+L+'$2'));
  all('mergeCell').forEach(m=>{const mm=/^(.*):([A-Z]+)(\d+)$/.exec(m.getAttribute('ref')||'');if(mm&&xlNum(mm[2])===lc)m.setAttribute('ref',mm[1]+':'+L+mm[3])});   // título mesclado cobre a coluna nova
  // impressão pronta: margens mínimas · A4 retrato · 1 página de largura · sem cabeçalho/rodapé
  ['printOptions','pageMargins','pageSetup','headerFooter'].forEach(n=>{const e=kid(n);if(e)root.removeChild(e)});
  let sp=kid('sheetPr');if(!sp){sp=doc.createElementNS(NS,'sheetPr');root.insertBefore(sp,root.firstChild)}
  let ps0=[...sp.children].find(e=>e.localName==='pageSetUpPr');if(!ps0){ps0=doc.createElementNS(NS,'pageSetUpPr');sp.appendChild(ps0)}ps0.setAttribute('fitToPage','1');
  const mk=(n,a)=>{const e=doc.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);return e};
  const after=['rowBreaks','colBreaks','customProperties','cellWatches','ignoredErrors','smartTags','drawing','legacyDrawing','legacyDrawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst'],
        ref=[...root.children].find(e=>after.includes(e.localName))||null;
  [mk('pageMargins',{left:'0.2',right:'0.2',top:'0.2',bottom:'0.2',header:'0',footer:'0'}),mk('pageSetup',{paperSize:'9',orientation:'portrait',fitToWidth:'1',fitToHeight:'0'}),mk('headerFooter',{})].forEach(e=>root.insertBefore(e,ref));
  zip.file(path,'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+new XMLSerializer().serializeToString(root));
  return zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'});
}
/* Exportar: a planilha volta igual à recebida, só com uma coluna a mais no fim de cada item (OK / Falta no CD) */
async function exportEnc(){
  if(!encSrc||!encItems.length)return toast('Carregue uma planilha primeiro');
  const st=new Map(encMatch().map(({it,r})=>[it.row,ENC_TXT[encStatus(r)]]));
  const base=encSrc.name.replace(/\.[^.]+$/,''),ext=((encSrc.name.match(/\.([^.]+)$/)||[])[1]||'csv').toLowerCase();
  if(encSrc.kind==='xlsx'&&ext==='xlsx'&&encSrc.buf){          // .xlsx: edita o original (mantém a formatação) e já sai pronto p/ imprimir
    try{const out=await exportEncStyled(encSrc.buf,encSrc.hdr,st);
      downloadBlob(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${base}_situacao.xlsx`);
      return toast('Planilha exportada · formatação original, pronta para imprimir')}
    catch(e){toast('Não consegui manter a formatação ('+e.message+') — exportando no modo simples')}}
  if(encSrc.kind==='xlsx'&&!encSrc.wb){                       // Encarte restaurado do aparelho: reabre a planilha guardada
    try{await ensureXLSX();const o=await parseEncXLSX(new Blob([encSrc.buf]));encSrc={...encSrc,wb:o.wb,sh:o.sh,rg:o.rg}}
    catch(e){return toast('Não consegui reabrir a planilha: '+e.message)}}
  if(encSrc.kind==='xlsx'){
    const{sh,rg}=encSrc,c=rg.e.c+1,put=(i,v)=>{sh[XLSX.utils.encode_cell({r:rg.s.r+i,c})]={t:'s',v}};
    if(encSrc.hdr>=0)put(encSrc.hdr,'Situação');
    st.forEach((v,i)=>put(i,v));
    sh['!ref']=XLSX.utils.encode_range({s:rg.s,e:{r:rg.e.r,c}});
    if(sh['!cols'])sh['!cols'][c]={wch:14};
    const out=XLSX.write(encSrc.wb,{bookType:ext==='xls'?'xls':ext==='ods'?'ods':'xlsx',type:'array'});
    downloadBlob(new Blob([out],{type:'application/octet-stream'}),`${base}_situacao.${ext}`);
  }else{
    const out=encSrc.lines.map((l,i)=>i===encSrc.hdr?l+encSrc.sep+'Situação':st.has(i)?l+encSrc.sep+st.get(i):l).join(encSrc.nl);
    downloadBlob(new Blob(['﻿'+out],{type:'text/csv;charset=utf-8'}),`${base}_situacao.csv`);
  }
  toast('Planilha exportada');
}
$('enc-export').onclick=exportEnc;

/* ══ ANEXOS: menu flutuante → Encarte · Panfleto · Oferta do dia ══ */
/* 🧾 PANFLETO: cole a lista (um produto por linha) → procura cada item no planograma e mostra estoque / cobertura */
const LSPF='planograma_pf';let pfGroups=[],pfNmOpen=false,pfPedOpen=false;                 // [{nome,preco,codes[]}] — guarda só os códigos; os números vêm sempre dos dados atuais
const PF_STOP=new Set(['de','da','do','das','dos','com','sem','em','e','ou','tp','un','cx','sabor','sabores','tipo','cada']);
const PF_PR='(\\d+(?:\\.\\d{3})*,\\d{2}|\\d+\\.\\d{2})';
/* 📅 LÂMINA COM PERÍODO: uma linha sem preço com a data ("Lâmina 30/10 a 05/11", "Válido de 02 a 08/11", "30/10") vira o período da lista
   e NÃO é procurada como produto. Para não confundir com produto ("1/2 kg"), a linha precisa ter palavra de período, 2 datas, ano ou ser só a data. */
const pfLineHasP=l=>new RegExp('[·|]\\s*(?:R\\$\\s*)?'+PF_PR).test(l)||/R\$\s*\d/.test(l);
function pfPerLine(l){if(pfLineHasP(l))return null;const p=encPeriodo([[l]]);if(!p||!p.ini)return null;
  const n=norm(l);return(/l[aâ]mina|valid|vigen|periodo|semana|oferta|\bde\s+\d|\bate\b/.test(n)||p.ini!==p.fim||/\d{4}/.test(l)||/^\W*\d{1,2}\s*[\/-]\s*\d{1,2}(?:\s*[\/-]\s*\d{2,4})?\W*$/.test(l))?p:null}
const pfPer=txt=>{for(const l of String(txt||'').split(/\r?\n/)){const p=pfPerLine(l.trim());if(p)return{ini:p.ini,fim:p.fim}}return null};
function pfParse(txt){
  const raw=txt.split(/\r?\n/).map(l=>l.replace(/[*_#`>]/g,'').replace(/^\s*(?:[-•–—▪●○]|\d+[.)])\s+/,'').trim()).filter(Boolean).filter(l=>!pfPerLine(l));   // a linha do período não é produto
  const hasP=pfLineHasP;
  const skipHead=raw.length&&raw.filter(hasP).length/raw.length>=.5;     // se a maioria das linhas tem preço, linha sem preço é título de seção
  const out=[];
  for(const l of raw){
    if(skipHead&&!hasP(l))continue;
    let nome=l,preco='',m=l.match(new RegExp('^(.*?)\\s*[·|]\\s*(?:R\\$\\s*)?'+PF_PR+'(?!\\d)'))||l.match(new RegExp('^(.*?)\\s*R\\$\\s*'+PF_PR));
    if(m){nome=m[1];preco=m[2]}
    nome=nome.replace(/\([^)]*\)/g,' ').replace(/R\$/g,' ').replace(/\s+/g,' ').replace(/[\s·|:;,-]+$/,'').trim();
    if(nome.length<3)continue;
    out.push({nome,preco,parts:nome.split(/\s+ou\s+/i).map(x=>x.trim()).filter(Boolean)});
  }
  return out}
const pfToks=q=>toks(q.replace(/(\d)([a-zà-ú])/gi,'$1 $2')).filter(t=>t.length>1&&!PF_STOP.has(t));
function pfMatch(q,top){
  const T=pfToks(q);if(!T.length)return[];
  const alpha=T.filter(t=>!NUM.test(t)),max=T.reduce((a,t)=>a+(NUM.test(t)?1:3)*2,0);
  let res=[];
  for(const r of allRecords){const sc=score(r,T,false);if(sc>0)res.push([sc,r])}          // 1º: todas as palavras presentes
  if(!res.length&&alpha.length)for(const r of allRecords){                                  // 2º: aceita palavras faltando (≥ 50 %)
    const sc=score(r,T,true);if(sc>=max*.5&&alpha.some(t=>score(r,[t],false)>0))res.push([sc,r])}
  res.sort((a,b)=>b[0]-a[0]||b[1]._e-a[1]._e);
  return res.slice(0,top).map(x=>x[1])}
try{localStorage.removeItem('planograma_axlay')}catch{}   // limpeza: preferência do antigo seletor Resumo/Card (removido)
/* item do Panfleto / Oferta do dia: o mesmo cartão da lista de Produtos */
const pfRowHtml=r=>{const dp=DEP.has(r.produto);return swrap(`<div class="p pfc${r._d?' done':''}${dp?' dep':''}" data-p="${esc(r.produto)}" style="--c:${COLOR[r._k]}">${cardBody(r,dp?'<span class="depi" title="Procurar no depósito">🔎</span>':'')}</div>`,r._d,'add',inPed(r.produto)?'Já no pedido':'Pedido','🛒')};
function renderPf(){
  const box=$('pf-list'),sum=$('pf-sum');refreshDep();
  $('pf-q').style.display=pfGroups.length?'':'none';
  if(!pfGroups.length){box.innerHTML='';return}
  let ok=0,al=0,vis=0;const qOn=!!axQ.pf.trim();
  const row=pfRowHtml;
  const nm=[];                                                   // sem correspondência → dropdown no fim da lista
  const mainH=[],pedH=[];
  pfGroups.forEach(g=>{
    let rs=g.codes.map(c=>byProd.get(c)).filter(Boolean);
    if(!rs.length){if(axHit('pf',null,g.nome))nm.push(g);return}
    ok++;if(rs[0]._k==='rup'||rs[0]._k==='crit')al++;
    if(qOn&&!axHit('pf',null,g.nome)){rs=rs.filter(r=>axHit('pf',r));if(!rs.length)return}vis++;   // 🔍 busca: nome do panfleto ou do produto
    const hd=`<div class="pfh" data-q="${esc(g.q||g.nome)}"><span>🔍 ${esc(g.nome)}</span>${g.preco?`<b>R$ ${esc(g.preco)}</b>`:''}</div>`,
      rm=rs.filter(r=>!inPed(r.produto)),rp=rs.filter(r=>inPed(r.produto));
    if(rm.length)mainH.push(hd+rm.map(row).join(''));if(rp.length)pedH.push(hd+rp.map(row).join(''))});   // produtos que já estão no pedido (e não concluídos) vão para um dropdown à parte
  const found=mainH.join('');
  const pedHtml=pedH.length?`<details class="trd" id="pfped"${pfPedOpen?' open':''} style="margin-top:14px"><summary><span>🛒 Já no pedido<small>Itens da lâmina que você já pediu</small></span><span class="cnt">${pedH.length}</span><svg class="ch" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></summary>${pedH.join('')}</details>`:'';
  const nmHtml=nm.length?`<details class="trd" id="pfnm"${pfNmOpen?' open':''} style="margin-top:14px"><summary><span>❔ Sem correspondência<small>Não achei no planograma</small></span><span class="cnt">${nm.length}</span><svg class="ch" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></summary>${nm.map(g=>`<div class="pfn" data-q="${esc(g.q||g.nome)}"><span>🔍 ${esc(g.nome)}</span>${g.preco?`<b>R$ ${esc(g.preco)}</b>`:''}</div>`).join('')}</details>`:'';
  box.innerHTML=(qOn&&!vis&&!nm.length?'<div class="empty">Nenhum item da lâmina com essa busca</div>':'')+found+pedHtml+nmHtml;
  sum.textContent=(qOn?`🔍 ${vis} com essa busca · `:'')+`${pfGroups.length} itens · ${ok} encontrados${pedH.length?` · ${pedH.length} já no pedido`:''} · ${pfGroups.length-ok} sem correspondência${al?` · ${al} em ruptura/crítico`:''}`}
function pfRun(){
  const txt=$('pf-txt').value;try{localStorage.setItem(LSPF,txt)}catch{}
  if(!allRecords.length){pfGroups=[];$('pf-list').innerHTML='';$('pf-sum').textContent='Carregue o planograma primeiro (aba Dados).';return}
  const items=pfParse(txt);
  if(!items.length){pfGroups=[];$('pf-list').innerHTML='';$('pf-sum').textContent='Cole a lista da lâmina (um produto por linha).';return}
  $('pf-sum').textContent='Procurando…';
  setTimeout(()=>{pfGroups=items.map(it=>{const seen=new Set(),codes=[];
      it.parts.forEach(pt=>pfMatch(pt,it.parts.length>1?2:3).forEach(r=>{if(!seen.has(r.produto)){seen.add(r.produto);codes.push(r.produto)}}));
      return{nome:it.nome,preco:it.preco,codes,q:it.parts[0]||it.nome}});renderPf()},30)}   // q = texto que vai para a busca de Produtos (com "A ou B" usa o 1º)
function pfOpen(){const hoje=ofISO(new Date());
  if(pfSelOn!==hoje){pfSelOn=hoje;pfSelDay=new Date().getDay();pfApplyDay(false)}      // virou o dia com o app aberto → volta para hoje
  pfDayBar();if(pfGroups.length)renderPf();else if($('pf-txt').value.trim()&&allRecords.length)pfRun()}
function pfSync(){if(!allRecords.length)return;if(pfGroups.length)renderPf();else if(axCur==='pan'&&curTab==='enc'&&$('pf-txt').value.trim())pfRun()}
$('pf-list').addEventListener('toggle',e=>{if(e.target.id==='pfnm')pfNmOpen=e.target.open;if(e.target.id==='pfped')pfPedOpen=e.target.open},true);   // lembra se está aberto
$('pf-go').onclick=()=>pfSubmit();
$('pf-paste').onclick=async()=>{try{const t=await navigator.clipboard.readText();if(!t.trim())return toast('Área de transferência vazia');$('pf-txt').value=t;pfSubmit()}catch{toast('Não consegui colar sozinho — toque no campo e cole')}};
$('pf-clear').onclick=()=>{const t=$('pf-txt').value,sl=pfDays[pfSelDay],del=!!(sl&&sl.text&&sl.text===t);   // só apaga o panfleto SALVO do dia se o campo ainda é ele (rascunho solto só limpa o campo)
  if(del&&!confirm('Limpar a lâmina de '+OF_DN[pfSelDay]+' '+ofShort(sl.date)+'? (apaga também nos outros aparelhos)'))return;
  $('pf-txt').value='';pfGroups=[];try{localStorage.removeItem(LSPF)}catch{}$('pf-list').innerHTML='';$('pf-sum').textContent='';
  if(del){const w=pfSelDay,c=code();pfDays[w]=null;if(idb)idbSave({id:'panfleto-d'+w,w,text:''}).catch(()=>{});
    if(c){lastLocal=Date.now();put(c,'pf/d'+w,null);patch(c,'live/pf',{['d'+w]:null}).catch(()=>{})}}
  pfDayBar()};
$('pf-txt').oninput=debounce(()=>{try{localStorage.setItem(LSPF,$('pf-txt').value)}catch{}},500);
function pfSearch(q){F.q=q;F.chip='all';F.cat='';$('q').value=q;go('prod')}   // abre Produtos já pesquisando o texto do panfleto
$('pf-list').onclick=e=>{if(Date.now()<swBlock)return;
  const h=e.target.closest('.pfh,.pfn');if(h&&h.dataset.q){pfSearch(h.dataset.q);return}
  const c=e.target.closest('.pfc');if(c&&e.target.closest('.infb')){const r=byProd.get(c.dataset.p);if(r)openSheet(r)}};
try{$('pf-txt').value=localStorage.getItem(LSPF)||''}catch{}


/* File input handler */
/* SheetJS 0.20.3 (oficial): a 0.18.5 do cdnjs tem falhas de segurança conhecidas e não recebe mais correções.
   O sw.js guarda esta biblioteca no cache depois do 1º uso → planilhas funcionam sem internet. */
function ensureXLSX(){
  if(typeof XLSX!=='undefined')return Promise.resolve();
  return new Promise((res,rej)=>{const s=document.createElement('script');
    s.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.onload=res;s.onerror=()=>rej(new Error('sem internet para carregar o leitor de planilhas — tente um arquivo .csv'));document.head.appendChild(s)})}
/* ☁ ENCARTE NA NUVEM: planilha em enc/data (grande) + aviso pequeno em live/enc → os outros aparelhos recebem em tempo real */
let encCloudAt=0,encPending=false,encSavedAt='',encBusy=false;
const ab2b64=buf=>{const u=new Uint8Array(buf);let t='';for(let i=0;i<u.length;i+=0x8000)t+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(t)};
const b642ab=b=>{const t=atob(b),u=new Uint8Array(t.length);for(let i=0;i<t.length;i++)u[i]=t.charCodeAt(i);return u.buffer};
function encSaveLocal(){
  if(!idb||!encSrc)return Promise.resolve();
  return idbSave({id:'encarte',name:encSrc.name,kind:encSrc.kind,items:encItems,hdr:encSrc.hdr,text:encSrc.text,buf:encSrc.buf,savedAt:encSavedAt,cloudAt:encCloudAt,pending:encPending,per:encPer})
    .catch(()=>toast('⚠ Não consegui salvar o Panfleto neste aparelho'))}
async function pushEnc(){
  const c=code();if(!c||!encSrc||!encItems.length||encBusy)return;
  encBusy=true;const at=Date.now(),prev=encCloudAt,H={'Content-Type':'application/json'};
  try{
    const data={name:encSrc.name,kind:encSrc.kind,items:encItems,hdr:encSrc.hdr??-1,savedAt:encSavedAt,per:encPer};
    if(encSrc.kind==='xlsx')data.b64=ab2b64(encSrc.buf);else data.text=encSrc.text||'';
    let r=await cf(cu(c,'enc/data'),{method:'PUT',headers:H,body:JSON.stringify(data)});if(!r.ok)throw 0;
    encCloudAt=at;lastLocal=Date.now();                                  // marca ANTES do aviso, p/ não baixar o próprio eco
    r=await cf(cu(c,'live/enc'),{method:'PUT',headers:H,body:JSON.stringify({at,name:encSrc.name})});if(!r.ok)throw 0;
    encPending=false;await encSaveLocal();toast('☁ Panfleto enviado para a nuvem');
  }catch{encCloudAt=prev;toast('⚠ Panfleto salvo só neste aparelho — não chegou na nuvem')}
  finally{encBusy=false}
}
/* chamado pelo applyLive: baixa o Encarte se a nuvem tem um mais novo (e nunca sobrescreve um que ainda não foi enviado) */
async function syncEnc(c,le){
  if(encPending){pushEnc();return}
  if(!le||!le.at||le.at===encCloudAt)return;
  const d=await cf(cu(c,'enc/data')).then(r=>r.json()).catch(()=>null);
  if(!d||!Array.isArray(d.items)||!d.items.length)return;
  encItems=d.items;encPer=d.per||null;encSavedAt=d.savedAt||new Date().toLocaleString('pt-BR');
  encSrc=d.kind==='xlsx'?{kind:'xlsx',name:d.name,buf:b642ab(d.b64||''),hdr:d.hdr}:{...parseEncCSV(d.text||''),name:d.name,text:d.text||''};
  encCloudAt=le.at;encPending=false;await encSaveLocal();
  $('enc-title').style.display='';$('enc-title').textContent=`${d.name} · ${encItems.length} itens${encPerMeta()} · da nuvem`;
}
async function loadEncFile(file){
  if(!file)return;
  $('enc-title').style.display='';
  $('enc-title').textContent='Carregando…';
  try{
    let src;
    if(file.name.match(/\.(xlsx|xls|ods)$/i)){
      await ensureXLSX();
      src=await parseEncXLSX(file);
    } else {
      const txt=await readReport(file);src=parseEncCSV(txt);src.text=txt;
    }
    encItems=src.items;encPer=src.per||null;encSrc={...src,name:file.name};
    $('enc-title').textContent=`${file.name} · ${encItems.length} itens${encPerMeta()}`;
    encSavedAt=new Date().toLocaleString('pt-BR');encPending=!!code();   // pendente até chegar na nuvem
    encSaveLocal().then(pushEnc);
    renderEnc();
  }catch(e){$('enc-title').textContent='Erro ao ler arquivo: '+e.message}
}

/* ── Cobertura de Estoque loader ── */
async function loadCobFile(file){
  busy(true,'Lendo cobertura…');
  try{
    const text=await readReport(file);
    estoqueMap=parseEstoqueFile(text);
    estoqueLoaded=true;
    const total=Object.keys(estoqueMap).length;
    // Update status
    $('cob-status').innerHTML=`<b>✓ ${esc(file.name)}</b> · ${f0(total)} produtos · ${f0(Object.values(estoqueMap).filter(e=>e.mdv>0).length)} com MDV`;
    // Save to IDB alongside planogram
    if(idb)idbSave({id:'estoque',map:estoqueMap,meta:estoqueMeta,name:file.name,savedAt:new Date().toLocaleString('pt-BR')}).catch(()=>{});
    // Re-derive all records with real MDV/Cob
    derive();renderHome();if($('s-prod').classList.contains('on'))renderList(false);
    busy(false);renderData();toast(`Cobertura carregada · ${f0(total)} produtos`+warnTxt());
  }catch(e){busy(false);$('cob-status').textContent='Erro: '+e.message}
}

$('cob-input').onchange=e=>{if(e.target.files[0])loadCobFile(e.target.files[0]);e.target.value=''};

$('enc-drop').onclick=()=>$('enc-input').click();
$('enc-input').onchange=e=>{if(e.target.files[0])loadEncFile(e.target.files[0]);e.target.value=''};
$('enc-drop').addEventListener('dragover',e=>{e.preventDefault();$('enc-drop').classList.add('over')});
$('enc-drop').addEventListener('dragleave',()=>$('enc-drop').classList.remove('over'));
$('enc-drop').addEventListener('drop',e=>{e.preventDefault();$('enc-drop').classList.remove('over');
  if(e.dataTransfer.files[0])loadEncFile(e.dataTransfer.files[0])});

/* ══ END ANÁLISE DE ENCARTE ══════════════════════════════════════════════ */
