/* Planograma Mobile — TELAS: navegação/voltar, Resumo, Produtos, filtros e categorias.
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */


/* navegação */
/* ═══ BOTÃO/GESTO VOLTAR ═══ cada tela e cada janela (ficha, leitor) vira uma entrada do histórico:
   voltar fecha a janela → volta ao Resumo → (só aí) sai do app. Pilha máxima: Resumo → aba → janela. */
let curTab='home',tabPushed=false,ovHist=false,skipPop=false;
function pushOv(k){if(ovHist)history.replaceState({o:k},'');else{history.pushState({o:k},'');ovHist=true}}   // ficha após leitor reaproveita a mesma entrada
function popOv(){if(ovHist){ovHist=false;skipPop=true;history.back()}}
function closeSheet(){$('sheet').classList.remove('on');popOv()}
addEventListener('popstate',e=>{
  if(skipPop){skipPop=false;return}                           // voltar disparado pelo próprio app
  if(ovHist){ovHist=false;$('sheet').classList.remove('on');$('cat-sheet').style.display='none';$('flt-sheet').style.display='none';if(scanStream)scanStop(true);return}   // 1º voltar: fecha ficha/leitor
  const st=e.state||{s:'home'};if(st.o)return;
  tabPushed=st.s!=='home';if(st.s&&st.s!==curTab)go(st.s,true) // 2º voltar: volta à aba anterior
});
try{history.replaceState({s:'home'},'')}catch{}
function go(s,fromPop){document.querySelectorAll('section').forEach(e=>e.classList.toggle('on',e.id==='s-'+s));
 document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.s===s));scrollTo(0,0);
 if(s==='home')renderHome();if(s==='prod')renderList(true);if(s==='data')renderData();if(s==='ped')renderPed();if(s==='enc'&&axCur==='pan')pfOpen();if(s==='enc'&&axCur==='dia')ofOpen();
 if(!fromPop&&s!==curTab){                                      // registra no histórico (home → aba; entre abas não empilha)
   if(s==='home'){if(tabPushed){tabPushed=false;skipPop=true;history.back()}else history.replaceState({s:'home'},'')}
   else if(curTab==='home'){history.pushState({s},'');tabPushed=true}
   else history.replaceState({s},'')}
 curTab=s;renderFresh()}
$('nav').onclick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.s)};

/* RESUMO */
function renderHome(){const n=allRecords.length;renderBan();renderSug();
 $('home-dados').hidden=!n;$('h-load').hidden=!!n;                            // sem dados: só o cartão com o botão de carregar (nada de "—" soltos)
 if(!n){$('h-fil').textContent='Nenhum relatório carregado';$('h-sub').textContent='Carregue o relatório de Planograma para ver a situação dos produtos e a sugestão de pedido.';$('kpis').innerHTML='';$('cats').innerHTML='';return}
 const c={rup:0,crit:0,aten:0,ok:0,nd:0,tr:0};
 for(const r of allRecords){c[r._k]++;if(r._t>0)c.tr++}
 $('h-fil').textContent=(currentMeta.filial||'Filial').replace(/ - Produtos.*/i,'');
 $('h-sub').textContent=`${currentMeta.date||''} ${currentMeta.hora||''} · ${f0(n)} produtos`;
 const K=[['rup','Ruptura','estoque zerado/negativo','var(--cr)'],['crit','Crítico','cobertura total < 7 dias','var(--crit)'],['aten','Atenção','cobertura total de 7 a 15 dias','var(--am)'],['ok','Saudável','cobertura total de 15 dias ou mais','var(--ok)']];
 if(transitLoaded)K.push(['tr','Em trânsito','itens com entrada a caminho','var(--in)']);
 $('kpis').innerHTML=K.map(k=>`<button class="kpi" data-k="${k[0]}" style="--c:${k[3]}" title="${k[2]}"><div class="n num">${f0(c[k[0]])}</div><div class="l"><b>${k[1]}</b></div></button>`).join('');
 renderCats()}
/* Categorias com mais alertas — por sistemática. Só a Sist. 1 (CD) tem a divisão "dá para pedir" × "sem no CD" */
function renderCats(){
  document.querySelectorAll('#cats-sw button').forEach(b=>b.classList.toggle('on',b.dataset.cs===catSist));
  if(!allRecords.length){$('cats').innerHTML='<div class="empty">—</div>';return}
  const one=catSist==='1',g={};
  for(const r of allRecords)if((r._k==='rup'||r._k==='crit')&&(one?isCD(r):r._sist===catSist)){const o=g[r.categoria]||(g[r.categoria]={y:0,cd:0});one&&cdRisk(r)?o.cd++:o.y++}   // y = alertas (dá para pedir) · cd = sem no CD (só Sist. 1)
  const rows=Object.entries(g).sort((a,b)=>b[1].y+b[1].cd-a[1].y-a[1].cd).slice(0,6).sort((a,b)=>b[1].y-a[1].y||a[1].cd-b[1].cd),mx=Math.max(...rows.map(([,v])=>v.y+v.cd),1);   // 6 com mais alertas
  const leg=one?`<div class="ln" style="margin:0 0 4px"><span style="color:var(--am)">●</span> dá para pedir · <span style="color:var(--cr)">●</span> sem no CD</div>`:'';
  $('cats').innerHTML=rows.length?leg+rows.map(([k,v])=>`<button class="bar" data-c="${esc(k)}"><span class="r"><span>${esc(short(k))}</span><b class="num">${one?`<span style="color:var(--am)">${v.y}</span> · <span style="color:var(--cr)">${v.cd}</span>`:`<span style="color:var(--am)">${v.y}</span>`}</b></span><i><u style="width:${(v.y+v.cd)/mx*100}%">${v.y?`<s style="flex:${v.y}"></s>`:''}${v.cd?`<s class="cd" style="flex:${v.cd}"></s>`:''}</u></i></button>`).join(''):'<div class="empty">Sem alertas nessa sistemática</div>'}
$('h-load').onclick=()=>$('f-plano').click();                                // Resumo vazio: abre direto o seletor do relatório
$('cats-sw').onclick=e=>{const b=e.target.closest('button');if(!b||b.dataset.cs===catSist)return;catSist=b.dataset.cs;try{localStorage.setItem('planograma_catsist',catSist)}catch{};renderCats()};
$('kpis').onclick=e=>{const b=e.target.closest('.kpi');if(!b)return;const k=b.dataset.k;F={chip:k==='tr'?'trans':k,cat:'',q:'',sort:k==='ok'?'nome':'cobt'};$('q').value='';go('prod')};
$('cats').onclick=e=>{const b=e.target.closest('.bar');if(!b)return;F={chip:'alert',cat:b.dataset.c,q:'',sort:'cobt',ent:catSist};$('q').value='';go('prod')};
function renderSug(){const el=$('sug');
  if(!allRecords.length){el.innerHTML='<div class="empty">—</div>';return}
  if(!estoqueLoaded){el.innerHTML='<div class="empty" style="padding:18px 12px">Carregue o relatório de <b>Cobertura</b> na aba <b>Dados</b> para ver a sugestão de pedido e as coberturas reais.</div>';return}
  const all=allRecords.filter(r=>r._sg>0&&!r._d),neg=allRecords.filter(r=>cdRisk(r)&&r._m&&!r._d).length;   // neg: venderiam, mas estão em falta no CD (estoque < 1 caixa, sem trânsito)
  const cd=neg?`<div class="ln" style="margin:6px 0 0;color:var(--cr)">⚠ ${f0(neg)} itens em falta no CD ficam fora da sugestão · <button class="lnk" id="sg-cd">ver</button></div>`:'';
  if(!all.length){el.innerHTML=`<div class="empty" style="padding:20px 12px 8px">Nada para repor agora 🎉</div><div style="padding:0 12px 12px">${cd}</div>`;return}
  const fresh=all.filter(r=>!inPed(r.produto));
  const top=[...fresh].sort((a,b)=>Math.max(a._ct,0)-Math.max(b._ct,0)||b._m-a._m).slice(0,5);   // mais perto de zerar primeiro
  el.innerHTML=`<div style="padding:12px 12px 4px"><b>💡 ${f0(all.length)} produtos para repor</b><div class="ln" style="margin:3px 0 0">Repor até a capacidade do planograma, em caixas fechadas · cobertura total &lt; ${SUG_DIAS} dias${transitLoaded?'':' · <b style="color:var(--am)">carregue o Trânsito para descontar o que já está a caminho</b>'}</div>${cd}</div>`
   +(top.length?top.map(r=>`<div class="urg" data-p="${esc(r.produto)}" style="border-left:4px solid ${COLOR[r._k]}"><div class="d">${esc(r.descricao)}<small>estoque ${f0(r._e)}${r._t>0?' · trânsito '+f0(r._t):''} · MDV ${f1(r._m)} · cob. total ${f1(Math.max(r._ct,0))}d</small></div></div>`).join(''):'<div class="empty" style="padding:14px">Todas as sugestões já estão no pedido ✓</div>')
   +`<div class="btns" style="padding:8px 12px 12px"><button class="btn o" id="sg-all" style="margin:0">Ver todas (${f0(all.length)})</button><button class="btn" id="sg-add" style="margin:0"${fresh.length?'':' disabled'}>🛒 Adicionar ${f0(fresh.length)}</button></div>`}
$('sug').onclick=e=>{
  const u=e.target.closest('.urg');if(u)return openSheet(byProd.get(u.dataset.p));
  if(e.target.closest('#sg-cd')){F={chip:'cd',cat:'',q:'',sort:'cobt'};$('q').value='';return go('prod')}
  if(e.target.closest('#sg-all')){F={chip:'sug',cat:'',q:'',sort:'cobt'};$('q').value='';return go('prod')}
  if(e.target.closest('#sg-add')){const f=allRecords.filter(r=>r._sg>0&&!r._d&&!inPed(r.produto));if(!f.length)return;
    if(!confirm(`Adicionar ${f0(f.length)} produtos ao pedido?`))return;
    f.forEach(r=>addPed(r,'',true));savePed();renderSug();toast(f0(f.length)+' produtos adicionados ao pedido')}};

/* PRODUTOS */
const CHIPS=[['all','Todos'],['sug','Sugestão','bulb'],['cd','Falta no CD','warn'],['dep','🔎 Procurar no depósito'],['alert','Alertas'],['rup','Ruptura'],['crit','Crítico'],['aten','Atenção'],['ok','OK'],['trans','Em trânsito'],['pend','Pendentes'],['done','Feitos']];
/* 🔎 itens do pedido marcados para procurar no depósito (atualizado a cada renderList) */
const LSDEP='planograma_dep';let depMap={};try{(JSON.parse(localStorage.getItem(LSDEP)||'[]')||[]).forEach(k=>{if(k)depMap[k]=true})}catch{}   // ⚠ precisa vir ANTES de refreshDep: a Oferta do dia chama refreshDep() na abertura e dava "Cannot access 'depMap' before initialization", travando o app inteiro
let DEP=new Set();function refreshDep(){DEP=new Set(Object.keys(depMap))}
const FLT_SHORT={dep:'🔎 Depósito'};
function renderList(reset){if(reset)shown=40;const T=toks(F.q);
 refreshDep();{const fc=CHIPS.find(c=>c[0]===F.chip)||CHIPS[0],fb=$('flt-btn');   // botão "Filtro" mostra o filtro ativo
  const nm=F.chip==='all'?'Filtro':(FLT_SHORT[F.chip]||fc[1]);fb.title=nm;fb.setAttribute('aria-label','Filtro: '+nm);fb.classList.toggle('on',F.chip!=='all')}   // só o ícone; o nome do filtro ativo fica no title/aria-label
 $('sort').value=F.sort;$('ent').value=F.ent||'';$('nocd').checked=noCD;$('catx').innerHTML=F.cat?`<span class="catx" data-x="1">✕ ${esc(short(F.cat))}</span>`:'';
 $('cat-pick-btn').style.display=allRecords.length?'':'none';
 $('cat-pick-btn').classList.toggle('on',!!F.cat);
 const fAct=F.chip!=='all'||!!F.cat||!!F.ent||noCD;   // algum filtro ligado?
 const base=T.length?(()=>true):r=>catOk(r)&&entOk(r)&&passesChip(r);   // BUSCANDO: os filtros (chip, categoria, sistemática, F/CD) não escondem nada
 let rel=false;
 list=allRecords.filter(r=>base(r)&&(!T.length||(r._s=score(r,T))>0));
 if(T.length>1&&!list.length){rel=true;list=allRecords.filter(r=>base(r)&&(r._s=score(r,T,true))>0)}   // nada tem TODAS as palavras → mostra os que têm parte
 const S={cobt:(a,b)=>Math.max(a._ct??1e9,0)-Math.max(b._ct??1e9,0)||(b._m||0)-(a._m||0),   /* cobertura total (estoque + trânsito) ÷ MDV; sem MDV vai pro fim */
  cob:(a,b)=>Math.max(a._c??1e9,0)-Math.max(b._c??1e9,0)||(b._m||0)-(a._m||0),   /* cobertura mín. 0; empate → quem mais vende primeiro */
  est:(a,b)=>a._e-b._e,nome:(a,b)=>a.descricao.localeCompare(b.descricao)};
 list.sort(T.length?(a,b)=>b._s-a._s||S[F.sort](a,b):S[F.sort]);$('cnt').textContent=f0(list.length)+(rel?' itens parciais — nenhum tem todas as palavras':' itens')+(T.length?(fAct?' · busca ignora os filtros':''):noCD?' · ocultando '+f0(allRecords.filter(r=>cdRisk(r)&&catOk(r)&&entOk(r)&&passesChip(r,F.chip,true)).length)+' (falta no CD)':'');
 $('list').innerHTML=list.length?list.slice(0,shown).map(card).join(''):'<div class="empty">Nenhum produto encontrado</div>'}
/* escolheu (abriu) um item achado na busca que algum filtro esconderia → desmarca só esse(s) filtro(s), para ele não sumir da lista depois */
function relaxFiltersFor(r){
  const off=[];
  if(!catOk(r)){F.cat='';off.push('categoria')}
  if(!entOk(r)){F.ent='';off.push('sistemática')}
  if(!passesChip(r,F.chip,true)){off.push(FLT_SHORT[F.chip]||(CHIPS.find(c=>c[0]===F.chip)||[])[1]||'filtro');F.chip='all'}
  if(noCD&&cdRisk(r)&&F.chip!=='cd'&&F.chip!=='dep'){noCD=false;try{localStorage.setItem('planograma_nocd','0')}catch{};off.push('F/CD')}
  if(!off.length)return;
  renderList();toast('Filtro desmarcado: '+off.join(', '))}
/* corpo do cartão — o MESMO em Produtos, Pedido, Encarte, Panfleto e Oferta.
   Compacto: Estoque | Trânsito | MDV | Situação numa linha só (cobertura + "total" com trânsito no mesmo quadro);
   estoque negativo vira um selo na linha do código, em vez de uma faixa inteira. */
const INFOBTN='<button type="button" class="infb" aria-label="Mais informações" title="Mais informações"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M12 11v6M12 7v.01"/></svg></button>';   // só ele abre a ficha do produto (o card inteiro não abre mais)
const PEDBADGE='<span class="ent ped" title="No pedido"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a1 1 0 0 0 .98.8h9.2a1 1 0 0 0 .98-.8L21 7H6"/></svg></span>';   // selo 🛒 ao lado do selo CD: o item já está no pedido
function cardBody(r,acts,extra,noPed){
  const dias=v=>v>999?'+999':f1(Math.max(v,0));
  const rel=r._c!==null;                                                        // sempre mostra também a cobertura do relatório de Cobertura
  // caixas fechadas (+ unidades avulsas) numa linha pequena embaixo do número; sem embalagem ou estoque negativo → não mostra
  const ebx=num(r.emb)||1;
  const cxOf=(n,red)=>{const q=ebx>1&&n>=0?Math.floor(n/ebx):null,u=q===null?0:n-q*ebx,low=red&&q===0&&n>0;
    return q===null?'':`<i class="sub"${low?' style="color:var(--cr)"':''}>${low?'&lt; 1':f0(q)} cx${q>0&&u?` +${f0(u)}`:''}</i>`};
  const neg=r._e<0?` <span class="neg" title="Estoque negativo">▼ ${r._t>0?'negativo · em trânsito':isCD(r)?'negativo · falta no CD':'negativo · falta pedir'}</span>`:'';
  return `<div class="hd"><div class="nm">${esc(r.descricao)}</div><div class="acts">${acts}${INFOBTN}</div></div>
 <div class="sb">${esc(r.produto)} · ${r._np?'Fora do planograma':p40(r)+' · '+esc(r.emb||'')}${r._sist?` <span class="ent e${esc(r._sist)}">${esc(ENT[r._sist]||'Sist. '+r._sist)}</span>`:''}${!noPed&&inPed(r.produto)?' '+PEDBADGE:''}${axBadges(r)}${neg}</div>
 <div class="st3">
  <div><small>Estoque</small><b class="num">${f0(r._e)}</b>${ebx>1&&r._e>=0?cxOf(r._e,true):''}</div>
  <div><small>Trânsito</small><b class="num">${transitLoaded?f0(r._t):'—'}</b>${transitLoaded&&r._t>0&&ebx>1?cxOf(r._t,false):''}</div>
  <div><small>MDV</small><b class="num">${r._m?f1(r._m):'—'}</b></div>
  <div class="cv" style="--c:${COLOR[r._k]}" title="Cobertura total = (estoque + trânsito) ÷ MDV"><small>${GLY[r._k]} ${SLBL[r._k]}</small><b class="num">${r._ct===null?'—':dias(r._ct)+'<i>d</i>'}</b>${rel?`<i class="sub" title="Cobertura do relatório de Cobertura de Estoque">relat. ${dias(r._c)}d</i>`:''}</div>
 </div>${extra||''}`}
/* cartão deslizável: fundo colorido atrás (→ concluir · ← pedido ou excluir) */
const swOk=d=>`<b>${d?'↩':'✓'}</b><span>${d?'Reabrir':'Concluir'}</span>`;
const swrap=(inner,done,cls,txt,ico)=>`<div class="swr">${done===null?'':`<div class="swg ok">${swOk(done)}</div>`}<div class="swg ${cls}"><span>${txt}</span><b>${ico}</b></div>${inner}</div>`;
function toggleDone(r,c){r._d?doneSet.delete(key(r)):doneSet.add(key(r));r._d=!r._d;lsSave();c.classList.toggle('done',r._d);
  const g=c.closest('.swr');if(g)g.querySelector('.swg.ok').innerHTML=swOk(r._d);if(r._d)copyEAN(r.automacao||r.produto)}
function card(r){const dp=DEP.has(r.produto);return swrap(`<div class="p ${r._d?'done':''}${dp?' dep':''}" data-p="${esc(r.produto)}" style="--c:${COLOR[r._k]}">${cardBody(r,dp?'<span class="depi" title="Procurar no depósito">🔎</span>':'')}</div>`,r._d,'add',inPed(r.produto)?'Já no pedido':'Pedido','🛒')}

const qGo=debounce(()=>renderList(true),180);
$('q').oninput=e=>{F.q=e.target.value;qGo()};
$('nocd').onchange=e=>{noCD=e.target.checked;try{localStorage.setItem('planograma_nocd',noCD?'1':'0')}catch{};renderList(true)};
$('sort').onchange=e=>{F.sort=e.target.value;renderList(true)};
$('ent').onchange=e=>{F.ent=e.target.value;renderList(true)};
$('catx').onclick=()=>{F.cat='';renderList(true)};

/* ── Category Tree Picker ──────────────────────────────────────────────
   catPath = string[] of segments drilled into, e.g. ['MERCEARIA','LIMPEZA']
   Displays children of the current path level.
   Tapping a node with children → drills in.
   "Filtrar esta categoria →" → applies that prefix as F.cat filter.
   Tapping a leaf (no children) → applies immediately.
──────────────────────────────────────────────────────────────────── */
let catPath=[];   // current drill-down path
const catOk=r=>!F.cat||r.categoria===F.cat||(r.categoria||'').startsWith(F.cat+'->');   // nível pai inclui os filhos

function passesChip(r,ch=F.chip,ignNoCD){
  return (ignNoCD||ch==='cd'||ch==='dep'||!noCD||!cdRisk(r))&&
    (ch==='all'||ch===r._k||
    (ch==='alert'&&(r._k==='rup'||r._k==='crit'))||
    (ch==='trans'&&r._t>0)||(ch==='pend'&&!r._d)||
    (ch==='done'&&r._d)||(ch==='sug'&&r._sg>0)||
    (ch==='cd'&&cdRisk(r))||(ch==='dep'&&DEP.has(r.produto)));}

function buildCatTree(){
  /* Build { prefixKey → count } for all records passing the chip filter */
  const counts={};
  allRecords.forEach(r=>{
    if(!passesChip(r))return;
    const segs=(r.categoria||'').split('->');
    /* Count every prefix level */
    for(let i=1;i<=segs.length;i++){
      const k=segs.slice(0,i).join('->');
      counts[k]=(counts[k]||0)+1;
    }
  });
  return counts;}

function renderCatLevel(){
  const counts=buildCatTree();
  const depth=catPath.length;
  const prefix=catPath.join('->');

  /* Children = keys that are exactly one level deeper than catPath */
  const children={};
  Object.entries(counts).forEach(([k,v])=>{
    const segs=k.split('->');
    if(segs.length===depth+1&&(depth===0||k.startsWith(prefix+'->'))){
      children[k]=v;}
  });
  const sorted=Object.entries(children).sort((a,b)=>b[1]-a[1]);

  /* Check if current level itself has grandchildren (some child has children) */
  const hasGrandchildren=key=>Object.keys(counts).some(k=>k.startsWith(key+'->'));

  /* Header breadcrumb */
  const breadParts=['Todas',...catPath];
  $('cs-bread').innerHTML=breadParts.map((p,i)=>{
    const isCurrent=i===breadParts.length-1;
    return (i>0?`<span class="cs-crumb-sep">›</span>`:'')
      +`<button class="cs-crumb${isCurrent?' active':''}" data-lvl="${i}">${esc(p==='Todas'?p:p.split('->').pop())}</button>`;
  }).join('');

  /* Title */
  $('cs-title').textContent=depth===0?'Categoria':catPath[catPath.length-1].split('->').pop();

  /* Back button */
  $('cs-back-row').style.display=depth>0?'block':'none';

  /* Apply button — show when drilled into at least one level */
  const applyRow=$('cs-apply-row');
  if(depth>0){
    applyRow.style.display='block';
    $('cs-apply-btn').dataset.cat=prefix;
    const label=catPath[catPath.length-1].split('->').pop();
    $('cs-apply-btn').textContent=`Filtrar "${label}" (${f0(counts[prefix]||0)} itens) →`;   // textContent: sem esc (senão "&" aparecia como "&amp;")
  } else {
    applyRow.style.display='none';
  }

  /* "All" item at top */
  const allCount=depth===0
    ? allRecords.filter(r=>passesChip(r)).length
    : (counts[prefix]||0);
  const allActive=F.cat===''&&depth===0;
  let html=`<div class="cs-item${allActive?' on':''}" data-c="" data-action="all">
    <span>${depth===0?'Todos os itens':'Todos em '+esc(catPath[catPath.length-1].split('->').pop())}</span>
    <div class="cs-right"><span class="cs-count">${f0(allCount)}</span></div></div>`;

  /* Children items */
  html+=sorted.map(([k,v])=>{
    const label=k.split('->').pop();
    const hasKids=hasGrandchildren(k);
    const isActive=F.cat===k;
    return `<div class="cs-item${isActive?' on':''}${hasKids?' has-children':''}" data-c="${esc(k)}" data-action="${hasKids?'drill':'apply'}">
      <span>${esc(label)}</span>
      <div class="cs-right"><span class="cs-count">${f0(v)}</span>${hasKids?'<span class="cs-arrow">›</span>':''}</div></div>`;
  }).join('');

  $('cat-list').innerHTML=html;
}

function openCatPicker(){
  /* Start from current filter context — if F.cat is set, pre-navigate there */
  if(F.cat){
    catPath=F.cat.split('->');
    /* Go up one level so the selected item is visible */
    if(catPath.length>0)catPath=catPath.slice(0,-1);
  } else {
    catPath=[];
  }
  renderCatLevel();
  $('cat-sheet').style.display='flex';
  pushOv('cat');
}

function closeCat(){$('cat-sheet').style.display='none';popOv()}

/* ── Filtro (junta Todos · Sugestão · Falta no CD · 🔎 Depósito · Ruptura…) — mesmo padrão da Categoria ── */
function openFlt(){
  refreshDep();
  $('flt-list').innerHTML=CHIPS.filter(c=>c[0]!=='trans'||transitLoaded).map(c=>{
    const n=allRecords.reduce((a,r)=>a+(catOk(r)&&passesChip(r,c[0])?1:0),0);       // quantos itens teria (respeita a categoria escolhida)
    return `<div class="cs-item${F.chip===c[0]?' on':''}" data-c="${c[0]}"><span>${c[2]?ic(c[2],15)+' ':''}${c[1]}</span><div class="cs-right"><span class="cs-count">${f0(n)}</span></div></div>`}).join('');
  $('flt-sheet').style.display='flex';pushOv('flt');
}
function closeFlt(){$('flt-sheet').style.display='none';popOv()}
$('flt-btn').onclick=openFlt;
$('flt-sheet-x').onclick=closeFlt;
$('flt-sheet').onclick=e=>{
  if(e.target===$('flt-sheet'))return closeFlt();
  const it=e.target.closest('.cs-item');if(!it)return;
  F.chip=it.dataset.c;closeFlt();renderList(true)};

$('cat-pick-btn').onclick=openCatPicker;
$('cat-sheet-x').onclick=closeCat;
$('cat-sheet').onclick=e=>{if(e.target===$('cat-sheet'))closeCat()};

/* Breadcrumb click — navigate to that level */
$('cs-bread').onclick=e=>{
  const b=e.target.closest('.cs-crumb');if(!b||b.classList.contains('active'))return;
  const lvl=parseInt(b.dataset.lvl);
  catPath=lvl===0?[]:catPath.slice(0,lvl);
  renderCatLevel();
};

/* Back button */
$('cs-back-btn').onclick=()=>{catPath=catPath.slice(0,-1);renderCatLevel()};

/* Apply button — filter at current drill level */
$('cs-apply-btn').onclick=()=>{
  F.cat=$('cs-apply-btn').dataset.cat;
  renderList(true);closeCat();
};

/* List item click */
$('cat-list').onclick=e=>{
  const item=e.target.closest('.cs-item');if(!item)return;
  const action=item.dataset.action;
  if(action==='all'){
    if(catPath.length===0){F.cat='';renderList(true);closeCat();}
    else{F.cat=item.dataset.c||catPath.join('->');renderList(true);closeCat();}
  } else if(action==='drill'){
    catPath=item.dataset.c.split('->');
    renderCatLevel();
  } else if(action==='apply'){
    F.cat=item.dataset.c;
    renderList(true);closeCat();
  }
};
$('list').onclick=e=>{if(Date.now()<swBlock)return;if(!e.target.closest('.infb'))return;const c=e.target.closest('.p');if(!c)return;const r=byProd.get(c.dataset.p);
if(r&&toks(F.q).length)relaxFiltersFor(r);openSheet(r)};
new IntersectionObserver(es=>{if(es[0].isIntersecting&&$('s-prod').classList.contains('on')&&shown<list.length){shown+=40;$('list').insertAdjacentHTML('beforeend',list.slice(shown-40,shown).map(card).join(''))}}).observe($('more'));
