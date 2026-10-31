/* Planograma Mobile — TELAS (interface Framework7): app, tema claro/escuro, navegação/voltar, Resumo, Produtos
   (lista virtual), filtros, categorias e o cartão de produto usado em todas as telas.
   Ordem de carregamento (index.html): framework7 → leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa.
   ⚠ Os cálculos (cobertura, situação, sugestão) continuam só no base.js — aqui é só desenho da tela. */

/* ═══ FRAMEWORK7 ═══ tema "auto": visual de iPhone no iOS e Material no Android */
const app=new Framework7({el:'#app',theme:'auto',name:'Planograma',
  colors:{primary:'#0b63ce'},
  touch:{tapHold:false,touchClicksDistanceThreshold:8},
  swipeout:{actionsNoFold:false,removeElements:false},
  sheet:{backdrop:true,closeByBackdropClick:true,swipeToClose:true}});

/* ═══ TEMA ═══ substitui o applyTheme do base.js (mesma assinatura): Automático · Claro · Escuro */
const mqDark=matchMedia('(prefers-color-scheme: dark)');let themePref='auto';
function applyTheme(t){if(t!=='light'&&t!=='dark')t='auto';themePref=t;
  try{localStorage.setItem('planograma_theme',t)}catch{}
  const r=document.documentElement,dark=t==='dark'||(t==='auto'&&mqDark.matches);
  if(t==='auto')delete r.dataset.theme;else r.dataset.theme=t;
  r.classList.toggle('dark',dark);
  document.querySelectorAll('#theme-seg button').forEach(b=>{const on=b.dataset.t===t;b.classList.toggle('on',on);b.classList.toggle('button-active',on)});
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=dark?'#121417':'#f4f6f9'}
try{mqDark.addEventListener('change',()=>{if(themePref==='auto')applyTheme('auto')})}catch{}

/* ═══ FOLHAS QUE SOBEM DE BAIXO (ficha, filtro, categoria) ═══ */
const shOn=(id,on)=>$(id).classList.toggle('on',on);
const mkSheet=(id,o)=>app.sheet.create({el:'#'+id,swipeToClose:true,backdrop:true,closeByBackdropClick:true,...(o||{}),
  on:{open(){shOn(id,true)},closed(){shOn(id,false);
    if(sheetSwap){sheetSwap=false;return}                                   // trocando de folha (Filtros ⇄ Categoria): a entrada do histórico continua
    if(id==='flt-sheet')D=null;
    if(id==='cat-sheet'&&D){openFlt(true);return}                           // fechou a Categoria: volta para a folha de Filtros
    popOv()}}});
let D=null,sheetSwap=false;   // D = rascunho dos filtros enquanto a folha está aberta (só vale ao tocar em "Ver N itens")
const fichaSheet=mkSheet('sheet'),fltSheet=mkSheet('flt-sheet'),catSheet=mkSheet('cat-sheet');

/* navegação */
/* ═══ BOTÃO/GESTO VOLTAR ═══ cada tela e cada janela (ficha, leitor) vira uma entrada do histórico:
   voltar fecha a janela → volta ao Resumo → (só aí) sai do app. Pilha máxima: Resumo → aba → janela. */
let curTab='home',tabPushed=false,ovHist=false,skipPop=false,inGo=false;
function pushOv(k){if(ovHist)history.replaceState({o:k},'');else{history.pushState({o:k},'');ovHist=true}}   // ficha após leitor reaproveita a mesma entrada
function popOv(){if(ovHist){ovHist=false;skipPop=true;history.back()}}
function closeSheet(){if(fichaSheet.opened)fichaSheet.close();else{shOn('sheet',false);popOv()}}
addEventListener('popstate',e=>{
  if(skipPop){skipPop=false;return}                           // voltar disparado pelo próprio app
  if(ovHist){ovHist=false;[fichaSheet,fltSheet,catSheet].forEach(s=>{if(s.opened)s.close()});if(scanStream)scanStop(true);return}   // 1º voltar: fecha ficha/leitor
  const st=e.state||{s:'home'};if(st.o)return;
  tabPushed=st.s!=='home';if(st.s&&st.s!==curTab)go(st.s,true) // 2º voltar: volta à aba anterior
});
try{history.replaceState({s:'home'},'')}catch{}
const TITLES={home:'Resumo',prod:'Produtos',ped:'Pedido',enc:'Anexos',data:'Dados'};
function go(s,fromPop){
 const el=$('s-'+s);
 document.querySelectorAll('.tabs>section').forEach(e=>e.classList.toggle('on',e===el));
 if(!el.classList.contains('tab-active')){inGo=true;try{app.tab.show(el,false)}finally{inGo=false}}
 document.querySelectorAll('#nav .tab-link').forEach(b=>b.classList.toggle('tab-link-active',b.dataset.s===s));
 $('tab-title').textContent=TITLES[s]||'';el.scrollTop=0;
 if(s==='home')renderHome();if(s==='prod')renderList(true);if(s==='data')renderData();if(s==='ped')renderPed();
 if(s==='enc'){axSeg();if(axCur==='pan')pfOpen();if(axCur==='dia')ofOpen()}
 if(!fromPop&&s!==curTab){                                      // registra no histórico (home → aba; entre abas não empilha)
   if(s==='home'){if(tabPushed){tabPushed=false;skipPop=true;history.back()}else history.replaceState({s:'home'},'')}
   else if(curTab==='home'){history.pushState({s},'');tabPushed=true}
   else history.replaceState({s},'')}
 curTab=s;renderFresh()}
app.on('tabShow',el=>{if(inGo||!el||!el.id)return;const s=el.id.slice(2);if(s!==curTab)go(s)});   // toque na aba de baixo
$('nav').addEventListener('click',e=>{const b=e.target.closest('.tab-link');if(b&&b.dataset.s===curTab)go(curTab)});   // tocar na aba atual: atualiza e volta ao topo (igual à versão anterior)

/* ═══ RESUMO ═══ */
const KORD=['rup','crit','aten','ok','sg','nd'];
/* anel de saúde do estoque (uma fatia por situação) */
function ring(c,n){let off=25,s='';
  for(const k of KORD){const v=c[k]||0;if(!v)continue;const p=v/n*100;
    s+=`<circle r="15.9155" cx="18" cy="18" fill="none" stroke="${COLOR[k]}" stroke-width="4.2" stroke-dasharray="${p.toFixed(3)} ${(100-p).toFixed(3)}" stroke-dashoffset="${off.toFixed(3)}"/>`;off-=p}
  const ok=Math.round((c.ok||0)/n*100);
  return `<svg viewBox="0 0 36 36" width="92" height="92" role="img" aria-label="${ok}% saudável"><circle r="15.9155" cx="18" cy="18" fill="none" stroke="var(--trk)" stroke-width="4.2"/>${s}<text x="18" y="18.2" text-anchor="middle" class="rg-n">${ok}%</text><text x="18" y="23.6" text-anchor="middle" class="rg-l">saudável</text></svg>`}
function renderHome(){const n=allRecords.length;renderBan();renderSug();
 $('home-dados').hidden=!n;$('h-load').hidden=!!n;                            // sem dados: só o cartão com o botão de carregar (nada de "—" soltos)
 if(!n){$('h-fil').textContent='Nenhum relatório carregado';$('h-sub').textContent='Carregue o relatório de Planograma para ver a situação dos produtos e a sugestão de pedido.';$('h-ring').innerHTML='';$('h-health').innerHTML='';$('kpis').innerHTML='';$('cats').innerHTML='';return}
 const c={rup:0,crit:0,aten:0,ok:0,nd:0,sg:0,tr:0};
 for(const r of allRecords){c[r._k]++;if(r._t>0)c.tr++}
 $('h-fil').textContent=(currentMeta.filial||'Filial').replace(/ - Produtos.*/i,'');
 $('h-sub').textContent=`${currentMeta.date||''} ${currentMeta.hora||''} · ${f0(n)} produtos`;
 $('h-ring').innerHTML=ring(c,n);
 const pc=k=>Math.round(c[k]/n*1000)/10;
 $('h-health').innerHTML=`<span style="--c:var(--cr)">${GLY.rup} ${f1(pc('rup'))}% ruptura</span><span style="--c:var(--crit)">${GLY.crit} ${f1(pc('crit'))}% crítico</span>`;
 const K=[['rup','Ruptura','estoque zerado/negativo','var(--cr)'],['crit','Crítico','cobertura total < 7 dias','var(--crit)'],['aten','Atenção','cobertura total de 7 a 15 dias','var(--am)'],['ok','Saudável','cobertura total de 15 dias ou mais','var(--ok)'],['sg','Sem giro',`com estoque, MDV 0 e sem venda há mais de ${SG_DIAS} dias`,'var(--sg)']];
 if(transitLoaded)K.push(['tr','Em trânsito','itens com entrada a caminho','var(--in)']);else K.push(['nd','Sem MDV','sem MDV para calcular a cobertura','var(--mu)']);
 $('kpis').innerHTML=K.map(k=>`<button class="kpi" data-k="${k[0]}" style="--c:${k[3]}" title="${k[2]}" type="button"><span class="kg">${k[0]==='tr'?'⇢':GLY[k[0]]}</span><div class="n num">${f0(c[k[0]])}</div><div class="l"><b>${k[1]}</b></div><i class="kb"><u style="width:${Math.max(2,c[k[0]]/n*100).toFixed(1)}%"></u></i></button>`).join('');
 renderCats()}
/* Categorias com mais alertas — por sistemática. Só a Sist. 1 (CD) tem a divisão "dá para pedir" × "sem no CD" */
function renderCats(){
  document.querySelectorAll('#cats-sw button').forEach(b=>{const on=b.dataset.cs===catSist;b.classList.toggle('on',on);b.classList.toggle('button-active',on)});
  if(!allRecords.length){$('cats').innerHTML='<div class="empty">—</div>';return}
  const one=catSist==='1',g={};
  for(const r of allRecords)if((r._k==='rup'||r._k==='crit')&&(one?isCD(r):r._sist===catSist)){const o=g[r.categoria]||(g[r.categoria]={y:0,cd:0});one&&cdRisk(r)?o.cd++:o.y++}   // y = alertas (dá para pedir) · cd = sem no CD (só Sist. 1)
  const rows=Object.entries(g).sort((a,b)=>b[1].y+b[1].cd-a[1].y-a[1].cd).slice(0,6).sort((a,b)=>b[1].y-a[1].y||a[1].cd-b[1].cd),mx=Math.max(...rows.map(([,v])=>v.y+v.cd),1);   // 6 com mais alertas
  const leg=one?`<div class="leg"><span><i style="background:var(--am)"></i>dá para pedir</span><span><i style="background:var(--cr)"></i>sem no CD</span></div>`:'';
  $('cats').innerHTML=rows.length?leg+rows.map(([k,v])=>`<button class="bar" data-c="${esc(k)}" type="button"><span class="r"><span>${esc(short(k))}</span><b class="num">${one?`<span style="color:var(--am)">${v.y}</span> · <span style="color:var(--cr)">${v.cd}</span>`:`<span style="color:var(--am)">${v.y}</span>`}</b></span><i><u style="width:${(v.y+v.cd)/mx*100}%">${v.y?`<s style="flex:${v.y}"></s>`:''}${v.cd?`<s class="cd" style="flex:${v.cd}"></s>`:''}</u></i></button>`).join(''):'<div class="empty">Sem alertas nessa sistemática</div>'}
$('h-load').onclick=()=>$('f-plano').click();                                // Resumo vazio: abre direto o seletor do relatório
$('cats-sw').onclick=e=>{const b=e.target.closest('button');if(!b||b.dataset.cs===catSist)return;catSist=b.dataset.cs;try{localStorage.setItem('planograma_catsist',catSist)}catch{};renderCats()};
$('kpis').onclick=e=>{const b=e.target.closest('.kpi');if(!b)return;const k=b.dataset.k;F={chip:k==='tr'?'trans':k,cat:'',q:'',sort:k==='ok'?'nome':'cobt'};$('q').value='';go('prod')};
$('cats').onclick=e=>{const b=e.target.closest('.bar');if(!b)return;F={chip:'alert',cat:b.dataset.c,q:'',sort:'cobt',ent:catSist};$('q').value='';go('prod')};
function renderSug(){const el=$('sug');
  if(!allRecords.length){el.innerHTML='<div class="empty">—</div>';return}
  if(!estoqueLoaded){el.innerHTML='<div class="empty" style="padding:18px 12px">Carregue o relatório de <b>Cobertura</b> na aba <b>Dados</b> para ver a sugestão de pedido e as coberturas reais.</div>';return}
  const all=allRecords.filter(r=>r._sg>0&&!r._d),neg=allRecords.filter(r=>cdRisk(r)&&r._m&&!r._d).length;   // neg: venderiam, mas estão em falta no CD (estoque < 1 caixa, sem trânsito)
  const cd=neg?`<div class="sg-cd">${ic('warn',14)} ${f0(neg)} itens em falta no CD ficam fora da sugestão · <button class="lnk" id="sg-cd" type="button">ver</button></div>`:'';
  if(!all.length){el.innerHTML=`<div class="empty" style="padding:20px 12px 8px">Nada para repor agora 🎉</div><div style="padding:0 14px 14px">${cd}</div>`;return}
  const fresh=all.filter(r=>!inPed(r.produto));
  const top=[...fresh].sort((a,b)=>Math.max(a._ct,0)-Math.max(b._ct,0)||b._m-a._m).slice(0,5);   // mais perto de zerar primeiro
  el.innerHTML=`<div class="sug-h"><div class="sug-n">${ic('bulb',20)}<b>${f0(all.length)}</b><span>produtos para repor</span></div><div class="ln">Repor até a capacidade do planograma, em caixas fechadas · cobertura total &lt; ${SUG_DIAS} dias${transitLoaded?'':' · <b style="color:var(--am)">carregue o Trânsito para descontar o que já está a caminho</b>'}</div>${cd}</div>`
   +(top.length?'<div class="urgs">'+top.map(r=>`<div class="urg" data-p="${esc(r.produto)}" style="--c:${COLOR[r._k]}"><div class="d">${esc(r.descricao)}<small>estoque ${f0(r._e)}${r._t>0?' · trânsito '+f0(r._t):''} · MDV ${f1(r._m)}</small></div><div class="uc"><b class="num">${f0(Math.max(r._ct,0))}</b><small>dias</small></div></div>`).join('')+'</div>':'<div class="empty" style="padding:14px">Todas as sugestões já estão no pedido ✓</div>')
   +`<div class="sug-b"><button class="button button-tonal button-large" id="sg-all" type="button">Ver todas (${f0(all.length)})</button><button class="button button-fill button-large" id="sg-add" type="button"${fresh.length?'':' disabled'}>🛒 Adicionar ${f0(fresh.length)}</button></div>`}
$('sug').onclick=e=>{
  const u=e.target.closest('.urg');if(u)return openSheet(byProd.get(u.dataset.p));
  if(e.target.closest('#sg-cd')){F={chip:'cd',cat:'',q:'',sort:'cobt'};$('q').value='';return go('prod')}
  if(e.target.closest('#sg-all')){F={chip:'sug',cat:'',q:'',sort:'cobt'};$('q').value='';return go('prod')}
  if(e.target.closest('#sg-add')){const f=allRecords.filter(r=>r._sg>0&&!r._d&&!inPed(r.produto));if(!f.length)return;
    if(!confirm(`Adicionar ${f0(f.length)} produtos ao pedido?`))return;
    f.forEach(r=>addPed(r,'',true));savePed();renderSug();toast(f0(f.length)+' produtos adicionados ao pedido')}};

/* ═══ PRODUTOS ═══ */
const CHIPS=[['all','Todos'],['sug','Sugestão','bulb'],['cd','Falta no CD','warn'],['dep','🔎 Procurar no depósito'],['alert','Alertas'],['rup','Ruptura'],['crit','Crítico'],['aten','Atenção'],['ok','OK'],['sg','Sem giro'],['nd','Sem MDV'],['trans','Em trânsito'],['pend','Pendentes'],['done','Feitos']];
const CHIP_C={rup:'var(--cr)',crit:'var(--crit)',aten:'var(--am)',ok:'var(--ok)',sg:'var(--sg)',nd:'var(--mu)',alert:'var(--cr)',cd:'var(--cr)',sug:'var(--am)',trans:'var(--in)',dep:'var(--in)',done:'var(--ok)'};
/* 🔎 itens do pedido marcados para procurar no depósito (atualizado a cada renderList) */
const LSDEP='planograma_dep';let depMap={};try{(JSON.parse(localStorage.getItem(LSDEP)||'[]')||[]).forEach(k=>{if(k)depMap[k]=true})}catch{}   // ⚠ precisa vir ANTES de refreshDep: a Oferta do dia chama refreshDep() na abertura
let DEP=new Set();function refreshDep(){DEP=new Set(Object.keys(depMap))}
const FLT_SHORT={dep:'🔎 Depósito',all:'Situação'};
/* lista virtual do Framework7: só os cartões visíveis existem na tela (9 mil itens sem travar) */
let vl=null;
function ensureVL(){if(vl)return vl;
  vl=app.virtualList.create({el:$('list'),items:[],height:'auto',renderItem:(r,i)=>card(r).replace('<li class="swipeout swr"',`<li data-virtual-list-index="${i}" class="swipeout swr"`),
    scrollableParentEl:$('s-prod'),dynamicHeightBufferSize:1.2,setListHeight:true});   // o índice no <li> deixa o Framework7 medir a altura real de cada cartão (sem ele contava 40 px e o fim da lista ficava embaixo do menu)
  return vl}
function renderList(reset){const T=toks(F.q);
 refreshDep();{const n=nFiltros(),fb=$('flt-btn');$('flt-n').textContent=n;$('flt-n').hidden=!n;fb.classList.toggle('on',!!n);   // botão "Filtros" com quantos estão ligados
  const nm=F.chip==='all'?'':(FLT_SHORT[F.chip]||(CHIPS.find(c=>c[0]===F.chip)||[])[1]||'');fb.title='Filtros'+(nm?' · '+nm:'');fb.setAttribute('aria-label',fb.title)}
 $('sort').value=F.sort;
 $('catx').innerHTML=(F.cat?`<button class="catx" data-x="cat" type="button">✕ ${esc(short(F.cat))}</button>`:'')+(F.cob?`<button class="catx" data-x="cob" type="button">✕ ${cobTxt(F.cob)}</button>`:'');
 const fAct=F.chip!=='all'||!!F.cat||!!F.ent||noCD;   // algum filtro ligado?
 const base=T.length?(()=>true):r=>catOk(r)&&entOk(r)&&passesChip(r)&&cobPass(r,F.cob);   // BUSCANDO: os filtros (chip, categoria, sistemática, F/CD) não escondem nada
 let rel=false;
 list=allRecords.filter(r=>base(r)&&(!T.length||(r._s=score(r,T))>0));
 if(T.length>1&&!list.length){rel=true;list=allRecords.filter(r=>base(r)&&(r._s=score(r,T,true))>0)}   // nada tem TODAS as palavras → mostra os que têm parte
 const S={cobt:(a,b)=>Math.max(a._ct??1e9,0)-Math.max(b._ct??1e9,0)||(b._m||0)-(a._m||0),   /* cobertura total (estoque + trânsito) ÷ MDV; sem MDV vai pro fim */
  cob:(a,b)=>Math.max(a._c??1e9,0)-Math.max(b._c??1e9,0)||(b._m||0)-(a._m||0),   /* cobertura mín. 0; empate → quem mais vende primeiro */
  est:(a,b)=>a._e-b._e,nome:(a,b)=>a.descricao.localeCompare(b.descricao)};
 /* mesmas ordens do Pedido: maior cobertura · maior MDV · menor MDV (item sem número vai para o fim; empate → nome A–Z) */
 const cobV=r=>r._ct!==null&&r._k!=='sg'?Math.max(r._ct,0):null,mdvV=r=>r._m||null;
 const by=(f,dir)=>(a,b)=>{const va=f(a),vb=f(b);if(va===null||vb===null)return(va===null)-(vb===null)||S.nome(a,b);return(va-vb)*dir||S.nome(a,b)};
 S.cob_d=by(cobV,-1);S.mdv_d=by(mdvV,-1);S.mdv_a=by(mdvV,1);if(!S[F.sort])F.sort='cobt';
 list.sort(T.length?(a,b)=>b._s-a._s||S[F.sort](a,b):S[F.sort]);$('cnt').textContent=f0(list.length)+(rel?' itens parciais — nenhum tem todas as palavras':' itens')+(T.length?(fAct?' · busca ignora os filtros':''):noCD?' · ocultando '+f0(allRecords.filter(r=>cdRisk(r)&&catOk(r)&&entOk(r)&&cobPass(r,F.cob)&&passesChip(r,F.chip,true)).length)+' (falta no CD)':'');
 $('q-x').classList.toggle('on',!!F.q);
 $('list-empty').hidden=!!list.length;
 if(!$('s-prod').classList.contains('on')&&!vl)return;                     // a lista virtual nasce quando a aba abre (precisa da altura da tela)
 ensureVL().replaceAllItems(list);
 if(reset&&$('s-prod').scrollTop>0)$('s-prod').scrollTop=0}
/* escolheu (abriu) um item achado na busca que algum filtro esconderia → desmarca só esse(s) filtro(s), para ele não sumir da lista depois */
function relaxFiltersFor(r){
  const off=[];
  if(!cobPass(r,F.cob)){F.cob=null;off.push('cobertura')}
  if(!catOk(r)){F.cat='';off.push('categoria')}
  if(!entOk(r)){F.ent='';off.push('sistemática')}
  if(!passesChip(r,F.chip,true)){off.push(FLT_SHORT[F.chip]||(CHIPS.find(c=>c[0]===F.chip)||[])[1]||'filtro');F.chip='all'}
  if(noCD&&cdRisk(r)&&F.chip!=='cd'&&F.chip!=='dep'){noCD=false;try{localStorage.setItem('planograma_nocd','0')}catch{};off.push('F/CD')}
  if(!off.length)return;
  renderList();toast('Filtro desmarcado: '+off.join(', '))}

/* ═══ CARTÃO DE PRODUTO ═══ o MESMO em Produtos, Pedido, Encarte, Panfleto e Oferta:
   nome · código · alt×larg×prof = capacidade · embalagem · selos · Estoque | Trânsito | MDV | Situação (cobertura total | R: relatório) */
const dimTxt=r=>{const a=num(r.altura),l=num(r.largura),p=num(r.prof),t=capOf(r);if(!(a||l||p||t))return 'sem medidas';
  return `<span title="Altura × largura × profundidade${t?' = '+f0(t)+' un de capacidade':''}">${f0(a)}×${f0(l)}×${f0(p)}</span>`};   // só as medidas no cartão (a capacidade fica na ficha)
const INFOBTN='<button type="button" class="infb" aria-label="Mais informações" title="Mais informações"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M12 11v6M12 7v.01"/></svg></button>';   // só ele abre a ficha do produto
const PEDBADGE='<span class="ent ped" title="No pedido"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a1 1 0 0 0 .98.8h9.2a1 1 0 0 0 .98-.8L21 7H6"/></svg></span>';   // só o símbolo 🛒
const DEPI='<span class="depi" title="Procurar no depósito">🔎</span>';
const embTxt=r=>{const e=num(r.emb);return e?`emb ${f0(e)}`:'emb —'};
function cardBody(r,acts,extra,noPed){
  const dias=v=>v>999?'+999':f0(Math.max(v,0));   // coberturas já vêm arredondadas (dias inteiros)
  const rel=r._c!==null;                                                        // sempre mostra também a cobertura do relatório de Cobertura
  const ebx=num(r.emb)||1;
  const unCx=n=>`${f0(n)}<i>un</i>${ebx>1&&n>=0?`<wbr><span class="cx"><i class="sep">|</i>${n>0&&n<ebx?'<span style="color:var(--cr)">&lt;1</span>':f0(Math.floor(n/ebx))}<i>cx</i></span>`:''}`;   // "276un | 46cx" (Estoque e Trânsito iguais)
  const neg=r._e<0?` <span class="neg" title="Estoque negativo">▼ ${r._t>0?'negativo · em trânsito':isCD(r)?'negativo · falta no CD':'negativo · falta pedir'}</span>`:'';
  const sel=(r._sist?`<span class="ent e${esc(r._sist)}">${esc(ENT[r._sist]||'Sist. '+r._sist)}</span>`:'')+(!noPed&&inPed(r.produto)?' '+PEDBADGE:'')+axBadges(r)+neg;
  const cob=r._k==='sg'?(semVendaDias(r)===Infinity?'—':f0(semVendaDias(r))+'<i>d s/ venda</i>'):r._ct===null?'—':dias(r._ct)+(rel||r._c999?`<i class="sep">|</i><i class="rr" title="R = cobertura do relatório de Cobertura de Estoque${r._c999?' (veio 999 = sem cálculo)':''}">R:</i>${rel?dias(r._c):'—'}`:'<i>d</i>');
  return `<div class="hd"><div class="nm">${esc(r.descricao)}</div><div class="acts">${acts}${INFOBTN}</div></div>
 <div class="sb"><span class="cod">${esc(r.produto)}</span> · ${r._np?'Fora do planograma':dimTxt(r)+' · '+embTxt(r)}${sel?' '+sel:''}</div>
 <div class="st3">
  <div class="es"><small>Estoque</small><b class="num">${unCx(r._e)}</b></div>
  <div class="es"><small>Trânsito</small><b class="num">${transitLoaded?unCx(r._t):'—'}</b></div>
  <div><small>MDV</small><b class="num">${r._m?f1(r._m):'—'}</b></div>
  <div class="cv" title="Cobertura total = (estoque + trânsito) ÷ MDV · R = cobertura do relatório"><small>${GLY[r._k]} ${SLBL[r._k]}</small><b class="num">${cob}</b></div>
 </div>${extra||''}`}
/* cartão deslizável (Framework7 swipeout): → concluir/reabrir · ← pedido (Produtos) ou excluir (Pedido) */
const swOk=d=>`<b>${d?'↩':'✓'}</b><span>${d?'Reabrir':'Concluir'}</span>`;
const swli=(inner,done,cls,txt,ico)=>`<li class="swipeout swr"><div class="swipeout-content">${inner}</div>${done===null?'':`<div class="swipeout-actions-left"><a class="swipeout-overswipe sw-ok" data-sw="ok">${swOk(done)}</a></div>`}<div class="swipeout-actions-right"><a class="swipeout-overswipe sw-${cls}" data-sw="${cls}"><b>${ico}</b><span>${txt}</span></a></div></li>`;
const swrap=(inner,done,cls,txt,ico)=>`<div class="swl"><ul>${swli(inner,done,cls,txt,ico)}</ul></div>`;   // fora da lista virtual (Pedido, Encarte, Panfleto, Oferta)
function toggleDone(r,c){r._d?doneSet.delete(key(r)):doneSet.add(key(r));r._d=!r._d;lsSave();c.classList.toggle('done',r._d);
  const g=c.closest('.swr');if(g){const a=g.querySelector('[data-sw=ok]');if(a)a.innerHTML=swOk(r._d)}if(r._d)copyEAN(r.automacao||r.produto)}
function card(r){const dp=DEP.has(r.produto);return swli(`<div class="p ${r._d?'done':''}${dp?' dep':''}" data-p="${esc(r.produto)}" style="--c:${COLOR[r._k]}">${cardBody(r,dp?DEPI:'')}</div>`,r._d,'add',inPed(r.produto)?'Já no pedido':'Pedido','🛒')}

const qGo=debounce(()=>renderList(true),180);
$('q').oninput=e=>{F.q=e.target.value;qGo()};
$('q-x').onclick=()=>{$('q').value='';F.q='';renderList(true);$('q').focus()};
$('sort').onchange=e=>{F.sort=e.target.value;renderList(true)};
$('catx').onclick=e=>{const b=e.target.closest('.catx');if(!b)return;if(b.dataset.x==='cob')F.cob=null;else F.cat='';renderList(true)};

/* ── Categoria em árvore: toca num nível com filhos → entra; "Filtrar …" aplica aquele nível; folha aplica direto ── */
let catPath=[];   // caminho atual, ex.: ['MERCEARIA','LIMPEZA']
const catOk=r=>!F.cat||r.categoria===F.cat||(r.categoria||'').startsWith(F.cat+'->');   // nível pai inclui os filhos
function passesChip(r,ch=F.chip,ignNoCD){
  return (ignNoCD||ch==='cd'||ch==='dep'||!noCD||!cdRisk(r))&&
    (ch==='all'||ch===r._k||
    (ch==='alert'&&(r._k==='rup'||r._k==='crit'))||
    (ch==='trans'&&r._t>0)||(ch==='pend'&&!r._d)||
    (ch==='done'&&r._d)||(ch==='sug'&&r._sg>0)||
    (ch==='cd'&&cdRisk(r))||(ch==='dep'&&DEP.has(r.produto)));}
function buildCatTree(){const counts={};
  allRecords.forEach(r=>{if(!(dChip(r)&&dEnt(r)&&cobPass(r,D.cob)))return;const segs=(r.categoria||'').split('->');
    for(let i=1;i<=segs.length;i++){const k=segs.slice(0,i).join('->');counts[k]=(counts[k]||0)+1}});
  return counts}
const csItem=(cls,data,label,cnt,arrow)=>`<li><a class="item-link item-content cs-item${cls}" ${data}><div class="item-inner"><div class="item-title">${label}</div><div class="item-after"><span class="cs-count">${cnt}</span>${arrow?'<span class="cs-arrow">›</span>':''}</div></div></a></li>`;
function renderCatLevel(){
  const counts=buildCatTree(),depth=catPath.length,prefix=catPath.join('->');
  const children={};
  Object.entries(counts).forEach(([k,v])=>{const segs=k.split('->');if(segs.length===depth+1&&(depth===0||k.startsWith(prefix+'->')))children[k]=v});
  const sorted=Object.entries(children).sort((a,b)=>b[1]-a[1]);
  const hasGrandchildren=key=>Object.keys(counts).some(k=>k.startsWith(key+'->'));
  const breadParts=['Todas',...catPath];
  $('cs-bread').innerHTML=breadParts.map((p,i)=>{const isCurrent=i===breadParts.length-1;
    return (i>0?`<span class="cs-crumb-sep">›</span>`:'')+`<button class="cs-crumb${isCurrent?' active':''}" data-lvl="${i}" type="button">${esc(p==='Todas'?p:p.split('->').pop())}</button>`}).join('');
  $('cs-title').textContent=depth===0?'Categoria':catPath[catPath.length-1].split('->').pop();
  $('cs-back-row').style.display=depth>0?'block':'none';
  const applyRow=$('cs-apply-row');
  if(depth>0){applyRow.style.display='block';$('cs-apply-btn').dataset.cat=prefix;
    const label=catPath[catPath.length-1].split('->').pop();
    $('cs-apply-btn').textContent=`Filtrar "${label}" (${f0(counts[prefix]||0)} itens) →`;   // textContent: sem esc (senão "&" aparecia como "&amp;")
  }else applyRow.style.display='none';
  const allCount=depth===0?allRecords.filter(r=>dChip(r)&&dEnt(r)&&cobPass(r,D.cob)).length:(counts[prefix]||0);
  const allActive=D.cat===''&&depth===0;
  let html=csItem(allActive?' on':'','data-c="" data-action="all"',depth===0?'Todos os itens':'Todos em '+esc(catPath[catPath.length-1].split('->').pop()),f0(allCount));
  html+=sorted.map(([k,v])=>{const hasKids=hasGrandchildren(k);
    return csItem((D.cat===k?' on':'')+(hasKids?' has-children':''),`data-c="${esc(k)}" data-action="${hasKids?'drill':'apply'}"`,esc(k.split('->').pop()),f0(v),hasKids)}).join('');
  $('cat-list').innerHTML='<ul>'+html+'</ul>';
  $('cat-list').scrollTop=0}
function openCatPicker(){                                                   // aberta de dentro da folha de Filtros
  catPath=D.cat?D.cat.split('->').slice(0,-1):[];   // abre no nível de cima da categoria escolhida
  renderCatLevel();sheetSwap=true;fltSheet.close();catSheet.open();pushOv('cat')}
function closeCat(){if(catSheet.opened)catSheet.close()}
const setCat=v=>{D.cat=v;closeCat()};                                      // escolheu → volta para Filtros com a categoria marcada

/* ═══ FILTROS (uma folha só): Situação · Sistemática · Categoria · F/CD → toca em "Ver N itens" ═══ */
const nFiltros=()=>(F.chip!=='all')+(!!F.cat)+(!!F.ent)+(noCD?1:0)+(F.cob?1:0);
/* COBERTURA TOTAL maior/menor que N dias — usa o mesmo número arredondado do cartão; "Sem giro" e item sem MDV/cobertura ficam de fora */
const cobDia=r=>r._ct!==null&&r._k!=='sg'?Math.max(r._ct,0):null;
const cobOn=c=>!!(c&&(c.op==='lt'||c.op==='gt')&&Number.isFinite(c.d)&&c.d>=0);
const cobPass=(r,c)=>{if(!cobOn(c))return true;const v=cobDia(r);return v!==null&&(c.op==='lt'?v<c.d:v>c.d)};
const cobTxt=c=>`Cob. ${c.op==='lt'?'<':'>'} ${f0(c.d)} dias`;
const dCat=r=>!D.cat||r.categoria===D.cat||(r.categoria||'').startsWith(D.cat+'->');
const dEnt=r=>!D.ent||(D.ent==='np'?!!r._np:D.ent==='1'?isCD(r):r._sist===D.ent);
const dChip=(r,ch=D.chip)=>(ch==='cd'||ch==='dep'||!D.noCD||!cdRisk(r))&&passesChip(r,ch,true);
const ENTS=[['','Todas'],['1','1 · CD'],['10','10'],['20','20'],['np','Sem plano']];
const COBOPS=[['','Qualquer'],['lt','Menor que'],['gt','Maior que']];
/* só os números (contagens e "Ver N itens") — usado enquanto digita os dias, sem redesenhar a folha */
function fltCounts(){
  const base=allRecords.filter(r=>dCat(r)&&dEnt(r)&&cobPass(r,D.cob));
  document.querySelectorAll('#flt-list .fs-s').forEach(b=>{b.querySelector('small').textContent=f0(base.reduce((a,r)=>a+(dChip(r,b.dataset.c)?1:0),0))});
  $('flt-apply').textContent=`Ver ${f0(base.filter(r=>dChip(r)).length)} itens`;
  $('flt-clear').style.visibility=(D.chip!=='all'||D.cat||D.ent||D.noCD||cobOn(D.cob))?'':'hidden'}
function renderFlt(){refreshDep();
  const sit=CHIPS.filter(c=>c[0]!=='trans'||transitLoaded).map(c=>{
    const g=GLY[c[0]]||(c[2]?ic(c[2],13):'');
    return `<button type="button" class="fs-s${D.chip===c[0]?' on':''}" data-c="${c[0]}" style="--c:${CHIP_C[c[0]]||'var(--tx)'}"><b>${g?`<i>${g}</i>`:''}${c[0]==='dep'?'🔎 Depósito':c[1]}</b><small></small></button>`}).join('');
  const op=D.cob?D.cob.op:'',dd=D.cob&&Number.isFinite(D.cob.d)?D.cob.d:'';
  $('flt-list').innerHTML=`<h5>Situação</h5><div class="fs-grid">${sit}</div>
   <h5>Cobertura total <span class="fs-hint">(estoque + trânsito) ÷ MDV</span></h5><div class="fs-seg">${COBOPS.map(([v,l])=>`<button type="button" data-cop="${v}" class="${op===v?'on':''}">${l}</button>`).join('')}</div>
   ${op?`<div class="fs-cob"><div class="fs-num"><button type="button" data-cstep="-1" aria-label="Menos 1 dia">−</button><input id="fs-cobd" type="number" inputmode="numeric" min="0" step="1" value="${dd}" aria-label="Dias de cobertura"><span>dias</span><button type="button" data-cstep="1" aria-label="Mais 1 dia">+</button></div><div class="fs-q">${[3,7,15,30].map(n=>`<button type="button" data-cq="${n}" class="${dd===n?'on':''}">${n}</button>`).join('')}</div></div>`:''}
   <h5>Sistemática</h5><div class="fs-seg">${ENTS.map(([v,l])=>`<button type="button" data-ent="${v}" class="${(D.ent||'')===v?'on':''}">${l}</button>`).join('')}</div>
   <h5>Categoria</h5><button type="button" class="fs-ln" id="cat-pick-btn"><span>${D.cat?esc(short(D.cat)):'Todas as categorias'}<small>${D.cat?'Toque para trocar':'Toque para escolher na árvore'}</small></span>${D.cat?'<i class="fs-cx" id="fs-catx" role="button" aria-label="Tirar categoria">✕</i>':'<i class="fs-ar">›</i>'}</button>
   <label class="fs-ln"><span>Esconder falta no CD (F/CD)<small>Estoque menor que 1 caixa, sem trânsito</small></span><input type="checkbox" id="fs-nocd" class="sw-i"${D.noCD?' checked':''}><span class="sw-t fs-tg"></span></label>`;
  fltCounts()}
function openFlt(keep){if(!keep||!D)D={chip:F.chip,cat:F.cat||'',ent:F.ent||'',noCD,cob:F.cob?{...F.cob}:null};renderFlt();fltSheet.open();pushOv('flt')}
function closeFlt(){if(fltSheet.opened)fltSheet.close()}
$('flt-btn').onclick=()=>openFlt();
$('flt-sheet-x').onclick=closeFlt;$('flt-cancel').onclick=closeFlt;
$('flt-clear').onclick=()=>{D={chip:'all',cat:'',ent:'',noCD:false,cob:null};renderFlt()};
$('flt-apply').onclick=()=>{F.chip=D.chip;F.cat=D.cat;F.ent=D.ent;F.cob=cobOn(D.cob)?{op:D.cob.op,d:D.cob.d}:null;noCD=D.noCD;try{localStorage.setItem('planograma_nocd',noCD?'1':'0')}catch{};closeFlt();renderList(true)};
$('flt-list').onclick=e=>{
  const b=e.target.closest('.fs-s');if(b){D.chip=b.dataset.c;return renderFlt()}
  const co=e.target.closest('[data-cop]');if(co){const v=co.dataset.cop;D.cob=v?{op:v,d:D.cob&&Number.isFinite(D.cob.d)?D.cob.d:7}:null;return renderFlt()}
  const st=e.target.closest('[data-cstep]');if(st&&D.cob){D.cob.d=Math.max(0,(Number.isFinite(D.cob.d)?D.cob.d:0)+ +st.dataset.cstep);return renderFlt()}
  const q=e.target.closest('[data-cq]');if(q&&D.cob){D.cob.d=+q.dataset.cq;return renderFlt()}
  const g=e.target.closest('[data-ent]');if(g){D.ent=g.dataset.ent;return renderFlt()}
  if(e.target.closest('#fs-catx')){D.cat='';return renderFlt()}
  if(e.target.closest('#cat-pick-btn'))openCatPicker()};
$('flt-list').onchange=e=>{if(e.target.id==='fs-nocd'){D.noCD=e.target.checked;renderFlt()}};
$('flt-list').addEventListener('input',e=>{if(e.target.id!=='fs-cobd'||!D.cob)return;const v=parseInt(e.target.value,10);D.cob.d=Number.isFinite(v)&&v>=0?v:NaN;
  document.querySelectorAll('#flt-list [data-cq]').forEach(b=>b.classList.toggle('on',+b.dataset.cq===D.cob.d));fltCounts()});   // digitando: só atualiza os números
$('cat-sheet-x').onclick=closeCat;
$('cs-bread').onclick=e=>{const b=e.target.closest('.cs-crumb');if(!b||b.classList.contains('active'))return;
  const lvl=parseInt(b.dataset.lvl);catPath=lvl===0?[]:catPath.slice(0,lvl);renderCatLevel()};
$('cs-back-btn').onclick=()=>{catPath=catPath.slice(0,-1);renderCatLevel()};
$('cs-apply-btn').onclick=()=>setCat($('cs-apply-btn').dataset.cat);
$('cat-list').onclick=e=>{
  const item=e.target.closest('.cs-item');if(!item)return;
  const action=item.dataset.action;
  if(action==='all')setCat(catPath.length?(item.dataset.c||catPath.join('->')):'');
  else if(action==='drill'){catPath=item.dataset.c.split('->');renderCatLevel()}
  else if(action==='apply')setCat(item.dataset.c)};
$('list').onclick=e=>{if(Date.now()<swBlock)return;if(!e.target.closest('.infb'))return;const c=e.target.closest('.p');if(!c)return;const r=byProd.get(c.dataset.p);
if(r&&toks(F.q).length)relaxFiltersFor(r);openSheet(r)};

/* ═══ ANEXOS: botões Encarte · Panfleto · Oferta (usa o axShow do oferta.js) ═══ */
function axSeg(){document.querySelectorAll('#ax-seg button').forEach(b=>{const on=b.dataset.axs===axCur;b.classList.toggle('button-active',on);b.classList.toggle('on',on)})}
$('ax-seg').onclick=e=>{const b=e.target.closest('button[data-axs]');if(!b)return;axShow(b.dataset.axs);axSeg()};
