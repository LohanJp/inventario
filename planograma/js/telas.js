/* Planograma Mobile — TELAS (interface Framework7): app, tema claro/escuro, navegação/voltar, Resumo, Produtos
   (lista virtual), filtros, categorias e o cartão de produto usado em todas as telas.
   Ordem de carregamento (index.html): framework7 → leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa.
   ⚠ Os cálculos (cobertura, situação, sugestão) continuam só no base.js — aqui é só desenho da tela. */

/* ═══ FRAMEWORK7 ═══ tema "auto": visual de iPhone no iOS e Material no Android */
let NOVA=null;try{const v=parseInt(localStorage.getItem('planograma_cobnova'),10);if(v>0)NOVA=v}catch{}   // dias da nova cobertura: fora do F, que é recriado ao carregar/abrir
const app=new Framework7({el:'#app',theme:'auto',name:'Planograma',clicks:{externalLinks:'.external, a[download]'},   // ⚠ sem isso o F7 cancela os links de download (.txt, .csv, .json, .xlsx)
 
  colors:{primary:'#0b63ce'},
  touch:{tapHold:false,touchClicksDistanceThreshold:8},
  swipeout:{actionsNoFold:false,removeElements:false},
  sheet:{backdrop:true,closeByBackdropClick:true,swipeToClose:true},init:false});
app.colors={primary:'#0b63ce',red:'#ff3b30'};   // ⚡ o F7 calcula um esquema Material (HCT) por cor: só as 2 usadas (antes 16 → ~0,7 s no boot com CPU 4×)
app.init();

/* ═══ TEMA ═══ substitui o applyTheme do base.js (mesma assinatura): Automático · Claro · Escuro */
const mqDark=matchMedia('(prefers-color-scheme: dark)');let themePref='auto';
function applyTheme(t){if(t!=='light'&&t!=='dark')t='auto';themePref=t;
  try{localStorage.setItem('planograma_theme',t)}catch{}
  const r=document.documentElement,dark=t==='dark'||(t==='auto'&&mqDark.matches);
  if(t==='auto')delete r.dataset.theme;else r.dataset.theme=t;
  r.classList.toggle('dark',dark);
  document.querySelectorAll('#theme-seg button').forEach(b=>{const on=b.dataset.t===t;b.classList.toggle('on',on);b.classList.toggle('button-active',on)});
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=dark?'#0e1013':'#f3f5f8'}   // igual ao fundo (--bg)
try{mqDark.addEventListener('change',()=>{if(themePref==='auto')applyTheme('auto')})}catch{}

/* ═══ FOLHAS QUE SOBEM DE BAIXO (ficha, filtro, categoria) ═══ */
const shOn=(id,on)=>$(id).classList.toggle('on',on);
const mkSheet=(id,o)=>{const el=$(id);if(el){el.setAttribute('role','dialog');el.setAttribute('aria-modal','true')}   // leitor de tela: é uma janela por cima
 return app.sheet.create({el:'#'+id,swipeToClose:true,backdrop:true,closeByBackdropClick:true,closeOnEscape:true,...(o||{}),
  on:{open(){shOn(id,true)},opened(){const f=el&&el.querySelector('button:not([disabled]),[href],input,select,textarea,[tabindex="0"]');if(f&&matchMedia('(pointer:fine)').matches)f.focus({preventScroll:true})},closed(){shOn(id,false);
    if(sheetSwap){sheetSwap=false;return}                                   // trocando de folha (Filtros ⇄ Categoria): a entrada do histórico continua
    if(id==='flt-sheet')D=null;
    if(id==='cat-sheet'&&D){openFlt(true);return}                           // fechou a Categoria: volta para a folha de Filtros
    popOv()}}})};
let D=null,sheetSwap=false;   // D = rascunho dos filtros enquanto a folha está aberta (só vale ao tocar em "Ver N itens")
const fichaSheet=mkSheet('sheet'),fltSheet=mkSheet('flt-sheet'),catSheet=mkSheet('cat-sheet');

/* ═══ PUXAR PARA ATUALIZAR (em todas as abas) ═══ as abas rolam por dentro, então o "puxar para baixo" do navegador
   (que antes recarregava a página) não acontece mais: o do Framework7 busca a nuvem de novo e redesenha a aba atual,
   mantendo a aba, a busca e os filtros. Sem internet/código: só recalcula e redesenha com os dados do aparelho. */
let ptrBusy=false;
async function puxarAtualizar(){
  if(ptrBusy)return;ptrBusy=true;
  const aba=curTab,f={...F},q=$('q').value,c=code(),realGo=go;
  let nuvemOk=false;
  try{
    if(c&&navigator.onLine!==false){
      go=()=>{};                                                 // loadRecords() voltaria para o Resumo e limparia os filtros: segura enquanto baixa
      try{nuvemOk=await loadFromCloud(c);if(nuvemOk)startSSE(c)}finally{go=realGo}}
    if(allRecords.length){if(!nuvemOk)derive();F=f;$('q').value=q}
    go(aba,true);
    toast(nuvemOk?'Atualizado com a nuvem ✓':c&&navigator.onLine===false?'Sem internet — mostrando os dados do aparelho':'Atualizado ✓');
  }catch(e){toast('⚠ Não consegui atualizar: '+(e&&e.message||e))}
  finally{ptrBusy=false}}
document.querySelectorAll('.tabs>section.ptr-content').forEach(el=>{
  el.querySelectorAll('.preloader').forEach(p=>app.preloader.init(p));
  const ptr=app.ptr.create(el);
  ptr.on('refresh',(el2,done)=>{puxarAtualizar().finally(()=>{if(typeof done==='function')done();else ptr.done()})})});

/* navegação */
/* ═══ BOTÃO/GESTO VOLTAR ═══ cada tela e cada janela (ficha, leitor) vira uma entrada do histórico:
   voltar fecha a janela → volta ao Resumo → (só aí) sai do app. Pilha máxima: Resumo → aba → janela. */
let curTab='home',tabPushed=false,ovHist=false,skipPop=false,inGo=false;
function pushOv(k){if(ovHist)history.replaceState({o:k},'');else{history.pushState({o:k},'');ovHist=true}}   // ficha após leitor reaproveita a mesma entrada
function popOv(){if(ovHist){ovHist=false;skipPop=true;history.back()}}
function closeSheet(){if(fichaSheet.opened)fichaSheet.close();else{shOn('sheet',false);popOv()}}
addEventListener('popstate',e=>{
  if(skipPop){skipPop=false;return}                           // voltar disparado pelo próprio app
  if(ovHist){ovHist=false;[fichaSheet,fltSheet,catSheet].forEach(s=>{if(s.opened)s.close()});if(scanStream)scanStop(true);if($('pf-ask').style.display!=='none')pfAskClose(true);return}   // 1º voltar: fecha ficha/leitor
  const st=e.state||{s:'home'};if(st.o)return;
  tabPushed=st.s!=='home';if(st.s&&st.s!==curTab)go(st.s,true) // 2º voltar: volta à aba anterior
});
try{history.replaceState({s:'home'},'')}catch{}
const TITLES={home:'Resumo',prod:'Produtos',ped:'Pedido',enc:'Anexos',data:'Dados'};
function go(s,fromPop){if(s==='ped'&&curTab!=='ped')pedNoCD=true;   // ⚠ toda vez que ENTRA no Pedido: falta no CD escondida (nov/2026)

 const el=$('s-'+s);
 document.querySelectorAll('.tabs>section').forEach(e=>e.classList.toggle('on',e===el));
 if(!el.classList.contains('tab-active')){inGo=true;try{app.tab.show(el,false)}finally{inGo=false}}
 document.querySelectorAll('#nav .tab-link').forEach(b=>b.classList.toggle('tab-link-active',b.dataset.s===s));
 $('tab-title').textContent=TITLES[s]||'';
 if(s==='home')renderHome();if(s==='prod')renderList(true);if(s==='data')renderData();if(s==='ped')renderPed();
 if(s==='enc'){axSeg();if(axCur==='pan')pfOpen();if(axCur==='dia')ofOpen();if(axCur==='enc'&&encDirty)renderEnc()}
 el.scrollTop=0;
 if(!fromPop&&s!==curTab){                                      // registra no histórico (home → aba; entre abas não empilha)
   if(s==='home'){if(tabPushed){tabPushed=false;skipPop=true;history.back()}else history.replaceState({s:'home'},'')}
   else if(curTab==='home'){history.pushState({s},'');tabPushed=true}
   else history.replaceState({s},'')}
 curTab=s;renderFresh()}
let tabJust=false;   // ⚡ o tabShow do F7 roda ANTES deste click: sem a marca, a aba nova era desenhada 2 vezes
app.on('tabShow',el=>{if(inGo||!el||!el.id)return;const s=el.id.slice(2);if(s!==curTab){tabJust=true;setTimeout(()=>{tabJust=false},0);go(s)}});   // toque na aba de baixo
$('nav').addEventListener('click',e=>{if(tabJust)return;const b=e.target.closest('.tab-link');if(b&&b.dataset.s===curTab)go(curTab)});   // tocar na aba atual: atualiza e volta ao topo (igual à versão anterior)

/* ═══ RESUMO ═══ */
const KORD=['rup','crit','aten','ok','sg','nd'];
/* anel de saúde do estoque (uma fatia por situação) */
function ring(c,n){let off=25,s='';
  for(const k of KORD){const v=c[k]||0;if(!v)continue;const p=v/n*100;
    s+=`<circle r="15.9155" cx="18" cy="18" fill="none" stroke="${COLOR[k]}" stroke-width="4.2" stroke-dasharray="${p.toFixed(3)} ${(100-p).toFixed(3)}" stroke-dashoffset="${off.toFixed(3)}"/>`;off-=p}
  const ok=Math.round((c.ok||0)/n*100);
  return `<svg viewBox="0 0 36 36" width="92" height="92" role="img" aria-label="${ok}% saudável"><circle r="15.9155" cx="18" cy="18" fill="none" stroke="var(--trk)" stroke-width="4.2"/>${s}<text x="18" y="18.2" text-anchor="middle" class="rg-n">${ok}%</text><text x="18" y="23.6" text-anchor="middle" class="rg-l">saudável</text></svg>`}
/* Resumo por SISTEMÁTICA (nov/2026): '' = todas · '1' · '10' · '20' — botões acima da "Situação dos produtos" (iguais aos das categorias).
   Vale para o círculo, os números e a lista que abre ao tocar. Lembrado no aparelho; começa na Sist. 1. Tocar no círculo alterna Todas ↔ Sist. 1. */
let hSist='1';try{const v=localStorage.getItem('planograma_hsist');if(v===''||v==='10'||v==='20')hSist=v}catch{}
const hSistOk=r=>!hSist||(hSist==='1'?isCD(r):r._sist===hSist);
const setHSist=v=>{hSist=v;try{localStorage.setItem('planograma_hsist',v)}catch{}renderHome()};
function renderHome(){let n=allRecords.length;renderBan();renderSug();
 $('home-dados').hidden=!n;$('h-load').hidden=!!n;                            // sem dados: só o cartão com o botão de carregar (nada de "—" soltos)
 if(!n){$('h-fil').textContent='Nenhum relatório carregado';$('h-sub').textContent='Carregue o relatório de Planograma para ver a situação dos produtos e a sugestão de pedido.';$('h-ring').innerHTML='';$('h-health').innerHTML='';$('kpis').innerHTML='';$('cats').innerHTML='';return}
 /* O Resumo NÃO conta a falta no CD (Sist. 1, menos de 1 caixa, sem trânsito): pedir não resolve e só inflava os números.
    Mesmo critério da lista com "Esconder falta no CD" ligado → o número tocado bate com a lista que abre. */
 const R0=hSist?allRecords.filter(hSistOk):allRecords,R=R0.filter(r=>!hideCD(r,true,noCDTr)),nF=R0.length-R.length,N=n;n=R.length||1;   // toque no círculo: só a Sistemática 1 (isCD, igual ao filtro "1")
 const c={rup:0,crit:0,aten:0,ok:0,nd:0,sg:0,tr:0};
 for(const r of R){c[r._k]++;if(r._t>0)c.tr++}
 $('h-fil').textContent=(currentMeta.filial||'Filial').replace(/ - Produtos.*/i,'');
 $('h-sub').innerHTML=(hSist?`<b class="s1t">Só Sistemática ${esc(hSist)}</b> · ${f0(R.length)} produtos`:`${esc(currentMeta.date||'')} ${esc(currentMeta.hora||'')} · ${f0(R.length)} produtos`)+(nF?`<button type="button" class="lnk h-fcd" id="h-fcd">+ ${f0(nF)} em falta no CD (fora da conta) ›</button>`:'');
 $('h-ring').classList.toggle('s1',!!hSist);$('h-ring').title=hSist?'Toque para voltar a todos os produtos':'Toque para ver só a Sistemática 1';
 document.querySelectorAll('#kpis-sw button').forEach(b=>{const on=b.dataset.hs===hSist;b.classList.toggle('on',on);b.classList.toggle('button-active',on)});
 $('h-ring').innerHTML=ring(c,n);
 const pc=k=>Math.round(c[k]/n*1000)/10;
 $('h-health').innerHTML=`<span style="--c:var(--cr)">${GLY.rup} ${f1(pc('rup'))}% ruptura</span><span style="--c:var(--crit)">${GLY.crit} ${f1(pc('crit'))}% crítico</span>`;
 histGrava();renderHist();
 const K=[['rup','Ruptura','estoque zerado/negativo','var(--cr)'],['crit','Crítico','cobertura total < 7 dias','var(--crit)'],['aten','Atenção','cobertura total de 7 a 15 dias','var(--am)'],['ok','Saudável','cobertura total de 15 dias ou mais','var(--ok)'],['sg','Sem giro',`com estoque, MDV 0 e sem venda há mais de ${SG_DIAS} dias`,'var(--sg)'],['nd','Sem MDV','sem MDV para calcular a cobertura','var(--mu)']];
 if(transitLoaded)K.push(['tr','Em trânsito','itens com entrada a caminho','var(--in)']);   // não é situação: faixa larga embaixo
 const pct=k=>{const v=c[k]/n*100;return v>0&&v<0.1?'&lt;0,1%':f1(v)+'%'};   // % de todos os produtos
 $('kpis').innerHTML=K.map(k=>`<button class="kpi${k[0]==='tr'?' kw':''}" data-k="${k[0]}" style="--c:${k[3]}" title="${k[2]}" type="button"><span class="n num">${f0(c[k[0]])}</span><span class="l"><b><span class="kg" aria-hidden="true">${k[0]==='tr'?'⇢':GLY[k[0]]}</span>${k[1]}</b></span><span class="kr"><i class="kb"><u style="width:${Math.max(2,c[k[0]]/n*100).toFixed(1)}%"></u></i><span class="pc num">${pct(k[0])}</span></span></button>`).join('');
 renderCats();renderTodo()}
/* Categorias com mais alertas — por sistemática. Só a Sist. 1 (CD) tem a divisão "dá para pedir" × "sem no CD" */
/* ═══ PARA FAZER HOJE (nov/2026): o Resumo mostra o próximo passo, não só o estado. Cada linha só aparece se tiver itens
   e abre Produtos já filtrado (F.todo). Conta só a Sistemática padrão (ENT0), como a lista abre. ═══ */
const hojeISO=()=>ofISO(new Date());
const axHoje=(e,t)=>!!e&&(t==='pf'?(e.pf.includes(hojeISO())||(e.pfp||[]).some(p=>hojeISO()>=p.ini&&hojeISO()<=p.fim)):e[t].includes(hojeISO()));
const TODO={
  critf:{ic:'🟠',t:'Críticos sem trânsito e fora do pedido',f:(r,P)=>r._k==='crit'&&!(transitLoaded&&r._t>0)&&!P.has(r.produto)&&!r._d},
  enc:{ic:'📋',t:'Panfleto com falta no CD',f:r=>{const e=axBuild().get(r.produto);return !!(e&&e.enc)&&cdRisk(r)&&!(encPer&&encPer.fim&&hojeISO()>encPer.fim)}},
  lam:{ic:'🧾',t:'Lâmina de hoje com ruptura ou crítico',f:r=>(r._k==='rup'||r._k==='crit')&&axHoje(axBuild().get(r.produto),'pf')},
  of:{ic:'⭐',t:'Oferta de hoje com ruptura ou crítico',f:r=>(r._k==='rup'||r._k==='crit')&&axHoje(axBuild().get(r.produto),'of')},
  neg:{ic:'▼',t:'Estoque negativo (conferir)',f:r=>r._e<0&&!r._d},
  f20:{ic:'🏭',t:'Fornecedores (Sist. 20) com cobertura baixa',f:(r,P)=>r._sist==='20'&&(r._k==='rup'||r._k==='crit')&&!(transitLoaded&&r._t>0)&&!P.has(r.produto)&&!r._d,ent:'20'}};
/* fornecedor: chave sem zeros à esquerda (o mesmo fornecedor vem como 00543219 e 543219) · nome para mostrar = "código · nome" */
const fornKey=r=>{const t=fornTxt(r),m=/^0*(\d+)/.exec(t);return m?m[1]:t};
const fornNome=r=>{const t=fornTxt(r),m=/^0*(\d+)\s*·\s*(.*)$/.exec(t);return m?m[1].padStart(8,'0')+' · '+m[2]:t};   // código sempre com 8 dígitos
let todoF20=false;   // lista de fornecedores aberta no Resumo?
const todoOk=r=>{if(!F.todo)return true;const T=TODO[F.todo];return !T||T.f(r,todoP||(todoP=pedSet()))};let todoP=null;
function renderTodo(){const el=$('todo');if(!el)return;if(!allRecords.length){el.innerHTML='';return}
  const P=pedSet(),c={};for(const k in TODO)c[k]=0;
  const entPad=r=>ENT0==='1'?isCD(r):!ENT0||r._sist===ENT0;
  const forn={};
  for(const r of allRecords){if(r._sist==='20'){if(TODO.f20.f(r,P)){c.f20++;const k=fornKey(r);(forn[k]=forn[k]||{n:0,t:fornNome(r)}).n++}continue}
    if(!entPad(r))continue;const esc_=hideCD(r,true,noCDTr);for(const k in TODO)if(k!=='f20'&&(k==='enc'||!esc_)&&TODO[k].f(r,P))c[k]++}   // falta no CD fora (é o que a lista mostra)
  const urg=pedido.filter(x=>!x.done&&x.u==='a'&&!inTransit(x)&&!x.rcd&&!(pedNoCD&&pedFaltaCD(x))).length;   // igual ao que o Pedido mostra
  const FS=Object.entries(forn).sort((a,b)=>b[1].n-a[1].n||a[1].t.localeCompare(b[1].t));
  const L=Object.keys(TODO).filter(k=>c[k]).map(k=>`<li><a class="item-link item-content${k==='f20'?' td-f20'+(todoF20?' open':''):''}" data-todo="${k}"><div class="item-media td-ic">${TODO[k].ic}</div><div class="item-inner"><div class="item-title">${TODO[k].t}${k==='f20'?`<small>${f0(FS.length)} fornecedores · toque para ${todoF20?'fechar':'ver'}</small>`:''}</div><div class="item-after"><b class="num">${f0(c[k])}</b></div></div></a></li>`
    +(k==='f20'&&todoF20?FS.map(([fk,v])=>`<li class="td-sub"><a class="item-link item-content" data-forn="${esc(fk)}"><div class="item-inner"><div class="item-title">${esc(v.t)}</div><div class="item-after"><b class="num">${f0(v.n)}</b></div></div></a></li>`).join(''):''));
  const rv=rcdVelhos();
  if(rv)L.push(`<li><a class="item-link item-content" data-todo="rcdv"><div class="item-media td-ic">⛔</div><div class="item-inner"><div class="item-title">Ruptura no CD há ${RCD_VELHO}+ dias (reconferir)</div><div class="item-after"><b class="num">${f0(rv)}</b></div></div></a></li>`);
  if(urg)L.unshift(`<li><a class="item-link item-content" data-todo="urg"><div class="item-media td-ic">🔥</div><div class="item-inner"><div class="item-title">Urgentes no pedido para pedir</div><div class="item-after"><b class="num">${f0(urg)}</b></div></div></a></li>`);
  el.innerHTML=L.length?`<div class="block-title">Para fazer hoje</div><div class="list list-strong inset list-dividers todo-l"><ul>${L.join('')}</ul></div>`:''}
$('todo').onclick=e=>{const fa=e.target.closest('[data-forn]');
  if(fa){todoP=null;F={chip:'all',cat:'',q:'',sort:'cobt',ent:'20',todo:'f20',forn:fa.dataset.forn};$('q').value='';return go('prod')}
  const a=e.target.closest('[data-todo]');if(!a)return;const k=a.dataset.todo;
  if(k==='urg')return go('ped');
  if(k==='rcdv'){dropOpen.rcd=true;return go('ped')}
  if(k==='f20'){todoF20=!todoF20;return renderTodo()}
  todoP=null;if(!noCD){noCD=true;salvaCD()}   // do Resumo sempre com "Esconder falta no CD" ligado
  F={chip:k==='enc'?'cd':'all',cat:'',q:'',sort:'cobt',ent:ENT0,todo:k};$('q').value='';go('prod')};
/* ═══ HISTÓRICO LEVE (nov/2026): 1 resumo por data de planograma (% por situação, todos e só Sist. 1), últimos 60 dias.
   O Resumo mostra a tendência da ruptura com uma linha pequena — dá para ver se o trabalho está fazendo efeito. ═══ */
const LSH='planograma_hist2';try{localStorage.removeItem('planograma_hist')}catch{}   // hist2: a conta mudou (sem falta no CD) — recomeça para não comparar com a conta antiga
let HIST={};try{HIST=JSON.parse(localStorage.getItem(LSH)||'{}')||{}}catch{HIST={}}
const isoDe=s=>{const d=dmy(s);return d?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'):''};
function histGrava(){const k=isoDe(currentMeta&&currentMeta.date);if(!k||!allRecords.length||!estoqueLoaded)return;   // sem Cobertura a base de cálculo é outra: não grava
  const conta=R=>{const c={n:R.length,rup:0,crit:0,aten:0,ok:0};for(const r of R)if(r._k in c)c[r._k]++;return c};
  const base=allRecords.filter(r=>!hideCD(r,true,noCDTr)),novo={t:conta(base),s1:conta(base.filter(isCD))},velho=HIST[k];
  if(velho&&JSON.stringify(velho)===JSON.stringify(novo))return;
  HIST[k]=novo;const ks=Object.keys(HIST).sort();while(ks.length>60)delete HIST[ks.shift()];
  try{localStorage.setItem(LSH,JSON.stringify(HIST))}catch{}}
function renderHist(){const el=$('h-hist');if(!el)return;const ks=Object.keys(HIST).sort().slice(-30),m=hSist==='1'?'s1':hSist?'':'t';if(!m){el.innerHTML='';return}
  const pts=ks.map(k=>{const c=HIST[k][m];return c&&c.n?{k,v:c.rup/c.n*100}:null}).filter(Boolean);
  if(pts.length<2){el.innerHTML='';return}
  const a=pts[pts.length-2],b=pts[pts.length-1],d=b.v-a.v,dd=k=>k.slice(8,10)+'/'+k.slice(5,7);
  const W=84,H=22,mx=Math.max(...pts.map(p=>p.v)),mn=Math.min(...pts.map(p=>p.v)),sp=mx-mn||1;
  const xy=pts.map((p,i)=>`${(i/(pts.length-1)*W).toFixed(1)},${(H-2-(p.v-mn)/sp*(H-4)).toFixed(1)}`).join(' ');
  const cor=d<-0.05?'var(--ok)':d>0.05?'var(--cr)':'var(--mu)';
  el.innerHTML=`<div class="hist" title="Ruptura por data de planograma (${pts.length} dias guardados)"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><polyline points="${xy}" fill="none" stroke="${cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>
   <span>Ruptura <b>${f1(b.v)}%</b> · <b style="color:${cor}">${Math.abs(d)<0.05?'igual':(d<0?'▼ ':'▲ ')+f1(Math.abs(d))+' p.p.'}</b> desde ${dd(a.k)}</span></div>`}
function renderCats(){
  document.querySelectorAll('#cats-sw button').forEach(b=>{const on=b.dataset.cs===catSist;b.classList.toggle('on',on);b.classList.toggle('button-active',on)});
  if(!allRecords.length){$('cats').innerHTML='<div class="empty">—</div>';return}
  const one=catSist==='1',g={};
  for(const r of allRecords)if((r._k==='rup'||r._k==='crit')&&(one?isCD(r):r._sist===catSist)){if(hideCD(r,true,noCDTr))continue;const o=g[r.categoria]||(g[r.categoria]={y:0,cd:0});o.y++}   // falta no CD fica fora da conta (igual ao resto do Resumo)
  const rows=Object.entries(g).sort((a,b)=>b[1].y+b[1].cd-a[1].y-a[1].cd).slice(0,6).sort((a,b)=>b[1].y-a[1].y||a[1].cd-b[1].cd),mx=Math.max(...rows.map(([,v])=>v.y+v.cd),1);   // 6 com mais alertas
  const leg='';
  $('cats').innerHTML=rows.length?leg+rows.map(([k,v])=>`<button class="bar" data-c="${esc(k)}" type="button"><span class="r"><span>${esc(short(k))}</span><b class="num"><span style="color:var(--am)">${v.y}</span></b></span><i><u style="width:${(v.y+v.cd)/mx*100}%">${v.y?`<s style="flex:${v.y}"></s>`:''}${v.cd?`<s class="cd" style="flex:${v.cd}"></s>`:''}</u></i></button>`).join(''):'<div class="empty">Sem alertas nessa sistemática</div>'}
$('h-load').onclick=()=>$('f-plano').click();                                // Resumo vazio: abre direto o seletor do relatório
$('cats-sw').onclick=e=>{const b=e.target.closest('button');if(!b||b.dataset.cs===catSist)return;catSist=b.dataset.cs;try{localStorage.setItem('planograma_catsist',catSist)}catch{};renderCats()};
$('h-ring').onclick=()=>{if(!allRecords.length)return;setHSist(hSist?'':'1')};
$('kpis-sw').onclick=e=>{const b=e.target.closest('button');if(!b||b.dataset.hs===hSist)return;setHSist(b.dataset.hs)};
$('h-ring').setAttribute('role','button');
$('h-sub').onclick=e=>{if(!e.target.closest('#h-fcd'))return;F={chip:'cd',cat:'',q:'',sort:'cobt',ent:hSist};$('q').value='';go('prod')};
$('kpis').onclick=e=>{const b=e.target.closest('.kpi');if(!b)return;const k=b.dataset.k;if(!noCD){noCD=true;salvaCD()}F={chip:k==='tr'?'trans':k,cat:'',q:'',sort:k==='ok'?'nome':'cobt',ent:hSist};$('q').value='';go('prod')};   // a lista bate com o número tocado (todas ou só Sist. 1)
$('cats').onclick=e=>{const b=e.target.closest('.bar');if(!b)return;if(!noCD){noCD=true;salvaCD()}F={chip:'alert',cat:b.dataset.c,q:'',sort:'cobt',ent:catSist};$('q').value='';go('prod')};
function renderSug(){const el=$('sug');
  if(!allRecords.length){el.innerHTML='<div class="empty">—</div>';return}
  if(!estoqueLoaded){el.innerHTML='<div class="empty" style="padding:18px 12px">Carregue o relatório de <b>Cobertura</b> na aba <b>Dados</b> para ver a sugestão de pedido e as coberturas reais.</div>';return}
  const all=allRecords.filter(r=>r._sg>0&&!r._d&&isCD(r)),neg=allRecords.filter(r=>cdRisk(r)&&r._m&&!r._d).length;   // neg: venderiam, mas estão em falta no CD (estoque < 1 caixa, sem trânsito)
  const cd=neg?`<div class="sg-cd">${ic('warn',14)} ${f0(neg)} itens em falta no CD ficam fora da sugestão · <button class="lnk" id="sg-cd" type="button">ver</button></div>`:'';
  if(!all.length){el.innerHTML=`<div class="empty" style="padding:20px 12px 8px">Nada para repor agora 🎉</div><div style="padding:0 14px 14px">${cd}</div>`;return}
  const fresh=all.filter(r=>!inPed(r.produto));
  const top=[...fresh].sort((a,b)=>Math.max(a._ct,0)-Math.max(b._ct,0)||b._m-a._m).slice(0,5);   // mais perto de zerar primeiro
  el.innerHTML=`<div class="sug-h"><div class="sug-n">${ic('bulb',20)}<b>${f0(all.length)}</b><span>produtos para repor</span></div><div class="ln">Só Sistemática 1 · repor até a capacidade do planograma, em caixas fechadas · cobertura total &lt; ${SUG_DIAS} dias${transitLoaded?'':' · <b style="color:var(--am)">carregue o Trânsito para descontar o que já está a caminho</b>'}</div>${cd}</div>`
   +(top.length?'<div class="urgs">'+top.map(r=>`<div class="urg" data-p="${esc(r.produto)}" style="--c:${COLOR[r._k]}"><div class="d">${esc(r.descricao)}<small>estoque ${f0(r._e)}${r._t>0?' · trânsito '+f0(r._t):''} · MDV ${f1(r._m)}</small></div><div class="uc"><b class="num">${f0(Math.max(r._ct,0))}</b><small>dias</small></div></div>`).join('')+'</div>':'<div class="empty" style="padding:14px">Todas as sugestões já estão no pedido ✓</div>')
   +`<div class="sug-b"><button class="button button-tonal button-large" id="sg-all" type="button">Ver todas (${f0(all.length)})</button><button class="button button-fill button-large" id="sg-add" type="button"${fresh.length?'':' disabled'}>🛒 Adicionar ${f0(fresh.length)}</button></div>`}
$('sug').onclick=e=>{
  const u=e.target.closest('.urg');if(u)return openSheet(byProd.get(u.dataset.p));
  if(e.target.closest('#sg-cd')){F={chip:'cd',cat:'',q:'',sort:'cobt',ent:'1'};$('q').value='';return go('prod')}
  if(e.target.closest('#sg-all')){F={chip:'sug',cat:'',q:'',sort:'cobt',ent:'1'};$('q').value='';return go('prod')}
  if(e.target.closest('#sg-add')){const P=pedSet(),f=allRecords.filter(r=>r._sg>0&&!r._d&&isCD(r)&&!P.has(r.produto));if(!f.length)return;
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
let vl=null,CH=0;
/* ⚡ altura fixa: todo cartão de Produtos tem a mesma altura (nome em 2 linhas com "…", 1 linha de código/medidas/selos,
   números sem quebrar). Mede-se UM cartão e o Framework7 posiciona os outros por conta — sem medir 9 mil cartões ao rolar. */
function medeCartao(){const L=$('list'),r=list[0]||allRecords[0];if(!L||!r||!L.offsetWidth)return 0;
  const u=document.createElement('ul');u.style.cssText='position:absolute;left:0;right:0;top:0;visibility:hidden;margin:0;padding:0;list-style:none';
  L.style.removeProperty('--ph');u.innerHTML=card(r);L.appendChild(u);const li=u.firstElementChild,p=li.querySelector('.p');
  const h=li.offsetHeight,ph=p?p.offsetHeight:0;u.remove();if(ph)L.style.setProperty('--ph',ph+'px');return h}
function ajustaAltura(){if(!vl)return;const h=medeCartao();if(h&&h!==CH){CH=h;vl.params.height=h;vl.setListSize();vl.render(true)}}
function ensureVL(){if(vl)return vl;CH=medeCartao();
  vl=app.virtualList.create({el:$('list'),items:[],height:CH||120,renderItem:r=>card(r),scrollableParentEl:$('s-prod'),setListHeight:true,rowsBefore:10,rowsAfter:5});   // janela menor = cada redesenho troca menos cartões (tranco menor ao rolar rápido)
  return vl}
window.addEventListener('resize',debounce(ajustaAltura,150));   // girou o celular / mudou o tamanho da letra: mede de novo
function renderList(reset){todoP=null;   // o conjunto do pedido do "Para fazer hoje" é refeito a cada lista
const T=toks(F.q);
 refreshDep();{const n=nFiltros(),fb=$('flt-btn');$('flt-n').textContent=n;$('flt-n').hidden=!n;fb.classList.toggle('on',!!n);   // botão "Filtros" com quantos estão ligados
  const nm=F.chip==='all'?'':(FLT_SHORT[F.chip]||(CHIPS.find(c=>c[0]===F.chip)||[])[1]||'');fb.title='Filtros'+(nm?' · '+nm:'');fb.setAttribute('aria-label',fb.title)}
 $('sort').value=F.sort;
 $('catx').innerHTML=(F.cat?`<button class="catx" data-x="cat" type="button">✕ ${esc(short(F.cat))}</button>`:'')+(F.cob?`<button class="catx" data-x="cob" type="button">✕ ${cobTxt(F.cob)}</button>`:'')+(F.giro?`<button class="catx" data-x="giro" type="button">✕ Giro ${esc(F.giro)}</button>`:'')+(F.capx?`<button class="catx" data-x="capx" type="button">✕ Capacidade &lt; 1 caixa</button>`:'')+(F.cadx?`<button class="catx" data-x="cadx" type="button">✕ Não entraram no cadastro</button>`:'')+(F.todo&&TODO[F.todo]&&!F.forn?`<button class="catx" data-x="todo" type="button">✕ ${TODO[F.todo].t}</button>`:'')+(F.forn?`<button class="catx" data-x="forn" type="button">✕ ${esc((()=>{const r=allRecords.find(x=>fornKey(x)===F.forn);return r?fornNome(r):'Fornecedor '+F.forn})())} · cobertura baixa</button>`:'');
 const fAct=F.chip!=='all'||!!F.cat||!!F.ent||noCD;   // algum filtro ligado?
 const semCD=r=>catOk(r)&&entOk(r)&&cobPass(r,F.cob)&&(!F.d111||is111(r))&&(!F.capx||capMenor(r))&&giroOk(r)&&(!F.cadx||cadNao.has(r.produto))&&todoOk(r)&&(!F.forn||fornKey(r)===F.forn);   // todos os filtros, menos o chip e o F/CD
 const base=T.length?(()=>true):r=>semCD(r)&&passesChip(r);   // BUSCANDO: os filtros (chip, categoria, sistemática, F/CD) não escondem nada
 let rel=false;
 list=allRecords.filter(r=>base(r)&&(!T.length||(r._s=score(r,T))>0));
 if(T.length>1&&!list.length){rel=true;list=allRecords.filter(r=>base(r)&&(r._s=score(r,T,true))>0)}   // nada tem TODAS as palavras → mostra os que têm parte
 const S={cobt:(a,b)=>Math.max(a._ct??1e9,0)-Math.max(b._ct??1e9,0)||(b._m||0)-(a._m||0),   /* cobertura total (estoque + trânsito) ÷ MDV; sem MDV vai pro fim */
  cob:(a,b)=>Math.max(a._c??1e9,0)-Math.max(b._c??1e9,0)||(b._m||0)-(a._m||0),   /* cobertura mín. 0; empate → quem mais vende primeiro */
  est:(a,b)=>a._e-b._e,nome:(a,b)=>a.descricao.localeCompare(b.descricao)};
 /* mesmas ordens do Pedido: maior cobertura · maior MDV · menor MDV (item sem número vai para o fim; empate → nome A–Z) */
 const cobV=r=>r._ct!==null&&r._k!=='sg'?Math.max(r._ct,0):null,mdvV=r=>r._m||null;
 const by=(f,dir)=>(a,b)=>{const va=f(a),vb=f(b);if(va===null||vb===null)return(va===null)-(vb===null)||S.nome(a,b);return(va-vb)*dir||S.nome(a,b)};
 S.cob_d=by(cobV,-1);S.mdv_d=by(mdvV,-1);S.mdv_a=by(mdvV,1);
 /* Altura × Largura: sem medidas cadastradas primeiro, depois 1×1, 1×2, 1×3… 2×1, 2×2…; empate → profundidade, depois nome A–Z */
 S.dim=(a,b)=>{const A=num(a.altura),B=num(b.altura),la=num(a.largura),lb=num(b.largura),sa=!(A&&la),sb=!(B&&lb);
  return (sb-sa)||(sa?S.nome(a,b):A-B||la-lb||num(a.prof)-num(b.prof)||S.nome(a,b))};if(!S[F.sort])F.sort='cobt';
 list.sort(T.length?(a,b)=>b._s-a._s||S[F.sort](a,b):S[F.sort]);$('cnt').textContent=f0(list.length)+(rel?' itens parciais — nenhum tem todas as palavras':' itens')+(T.length?(fAct?' · busca ignora os filtros':''):(()=>{if(!noCD||['cd','dep','sug'].includes(F.chip))return '';const n=allRecords.filter(r=>hideCD(r)&&semCD(r)&&passesChip(r,F.chip,true)).length;return n?' · ocultando '+f0(n)+' (falta no CD)':''})());   // conta com TODOS os filtros ligados (antes ignorava giro, 1×1, fornecedor…)
 $('q-x').classList.toggle('on',!!F.q);
 $('list-empty').hidden=!!list.length;$('exp-txt').hidden=!list.length;
 if(!$('s-prod').classList.contains('on')&&!vl)return;                     // a lista virtual nasce quando a aba abre (precisa da altura da tela)
 ensureVL().replaceAllItems(list);if(!CH)ajustaAltura();   // aba estava escondida na 1ª vez: mede agora
 if(reset&&$('s-prod').scrollTop>0)$('s-prod').scrollTop=0}
/* escolheu (abriu) um item achado na busca que algum filtro esconderia → desmarca só esse(s) filtro(s), para ele não sumir da lista depois */
function relaxFiltersFor(r){
  const off=[];
  if(!cobPass(r,F.cob)){F.cob=null;off.push('cobertura')}
  if(F.d111&&!is111(r)){F.d111=false;off.push('1×1')}
  if(F.capx&&!capMenor(r)){F.capx=false;off.push('capacidade < 1 caixa')}
  if(!giroOk(r)){F.giro='';off.push('giro')}
  if(!catOk(r)){F.cat='';off.push('categoria')}
  if(!entOk(r)){F.ent='';off.push('sistemática')}
  if(!passesChip(r,F.chip,true)){off.push(FLT_SHORT[F.chip]||(CHIPS.find(c=>c[0]===F.chip)||[])[1]||'filtro');F.chip='all'}
  if(hideCD(r)&&F.chip!=='cd'&&F.chip!=='dep'){if(cdRisk(r))noCD=false;else noCDTr=false;salvaCD();off.push(cdRisk(r)?'F/CD':'F/CD em trânsito')}
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
function cardBody(r,acts,extra,noPed,nova){
  const dias=v=>v>999?'+999':f0(Math.max(v,0));   // coberturas já vêm arredondadas (dias inteiros)
  const rel=r._c!==null;                                                        // sempre mostra também a cobertura do relatório de Cobertura
  const ebx=num(r.emb)||1;
  const unCx=n=>`<span class="un">${f0(n)}<i>un</i></span>${ebx>1&&n>=0?`<wbr><span class="cx"><i class="sep">|</i>${n>0&&n<ebx?'<span style="color:var(--cr)">&lt;1</span>':f0(Math.floor(n/ebx))}<i>cx</i></span>`:''}`;   // "276un | 46cx" (Estoque e Trânsito iguais)
  const neg=r._e<0?` <span class="neg" title="Estoque negativo${r._t>0?' · já em trânsito':isCD(r)?' · falta no CD':' · falta pedir ao fornecedor'}">▼ ${r._t>0?'negativo':isCD(r)?'falta no CD':'falta pedir'}</span>`
    :cdRisk(r)?` <span class="neg cdw" title="Sistemática 1, menos de 1 caixa e sem trânsito: o pedido automático não mandou — provável falta no CD">⚠ falta no CD</span>`:'';   // estoque 0 ou positivo também (nov/2026)
  const sel=(r._sist?`<span class="ent e${esc(r._sist)}">${esc(ENT[r._sist]||'Sist. '+r._sist)}</span>`:'')+(!noPed&&inPed(r.produto)?' '+PEDBADGE:'')+pedTag(r.produto)+axBadges(r)+neg;
  const cob=r._k==='sg'?(semVendaDias(r)===Infinity?'—':f0(semVendaDias(r))+'<i>d s/ venda</i>'):r._ct===null?'—':dias(r._ct)+(rel||r._c999?`<i class="sep">|</i><i class="rr" title="R = cobertura do relatório de Cobertura de Estoque${r._c999?' (veio 999 = sem cálculo)':''}">R:</i>${rel?dias(r._c):'—'}`:'<i>d</i>');
  return `<div class="hd"><div class="nm">${esc(r.descricao)}</div><div class="acts">${acts}${INFOBTN}</div></div>
 <div class="sb"><span class="sbt"><span class="cod">${esc(r.produto)}</span> · ${r._np?'<span title="Fora do planograma">s/ plano</span>':(nova===undefined?dimTxt(r):nova?(()=>{const i=novaInfo(r,NOVA)||{};return `<b class="nv" title="Medida nova (era ${dimTxt(r).replace(/<[^>]+>/g,'')}): ${NOVA} dias × MDV ${f1(r._m)} ÷ emb ${f0(num(r.emb)||1)} = ${i.quer}${i.cap?` · cortado no máximo do sistema (${LIMITE} dias ≈ ${f0(i.q)} un)`:''}">➜ 1×${nova}×${porCx(r)}${i.cap?' <small class="nvx">máx.</small>':''}</b>`})():`<b class="nv nv0" title="Sem MDV: não dá para calcular (fica fora do TXT)">${dimTxt(r).replace(/<[^>]+>/g,'')} · sem MDV</b>`)+(nova?'':' · '+embTxt(r))}</span>${sel?`<span class="sbb"> ${sel}</span>`:''}</div>
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
function card(r){const dp=DEP.has(r.produto);return swli(`<div class="p ${r._d?'done':''}${dp?' dep':''}" data-p="${esc(r.produto)}" style="--c:${COLOR[r._k]}">${cardBody(r,dp?DEPI:'',undefined,undefined,F.d111&&NOVA>0&&is111(r)?novaDim(r):undefined)}</div>`,r._d,'add',inPed(r.produto)?'Já no pedido':'Pedido','🛒')}

/* ═══ Exportar a lista da tela (filtros + ordem) para o script de cadastro: lista_cadastro.txt = produto;altura;largura;profundidade ═══ */
function exportaCadastro(){if(!list.length)return toast('Nenhum item na lista');
  const L=[],sem=[];
  for(const r of list){let a=num(r.altura),l=num(r.largura),p=num(r.prof);
    if(F.d111&&NOVA>0&&is111(r)){const n=novaLarg(r,NOVA);if(!n){sem.push(r.produto);continue}a=1;l=n;p=porCx(r)}   // 1 × (dias × MDV ÷ emb) × itens por caixa
    else if(!(a&&l&&p)){a=1;l=1;p=num(r.emb)||1}                                                           // sem medidas: 1 × 1 × embalagem (igual ao script antigo)
    L.push(`${r.produto};${a};${l};${p}`)}
  if(!L.length)return toast('Nenhum item para exportar (todos sem MDV)');
  cadGuarda(L);   // guarda o que foi mandado para conferir com o planograma de amanhã
  const d=new Date(),dt=d.toLocaleString('pt-BR');
  const H=[`# Lista para cadastro - ${dt} - ${L.length} itens`,`# ${(currentMeta.filial||'').replace(/ - Produtos.*/i,'')}${F.d111&&NOVA>0?` - 1x1 com nova cobertura de ${NOVA} dias`:''}`,'# produto;1;dias x MDV / emb;itens por caixa'];
  downloadBlob(new Blob(['\ufeff'+[...H,...L].join('\r\n')+'\r\n'],{type:'text/plain;charset=utf-8'}),'lista_cadastro.txt');
  toast(`${f0(L.length)} itens exportados`+(sem.length?` · ${f0(sem.length)} sem MDV ficaram de fora`:''))}
/* ═══ BAIXAR (nov/2026): botão "⤓ Baixar" com 2 opções — Planograma (.txt p/ o script) ou Relatório (planilha .xlsx) ═══ */
function fechaBaixar(){const m=$('exp-menu');if(m)m.remove();document.removeEventListener('click',foraBaixar,true)}
function foraBaixar(e){if(!e.target.closest('#exp-menu')&&!e.target.closest('#exp-txt'))fechaBaixar()}
$('exp-txt').onclick=()=>{if($('exp-menu'))return fechaBaixar();
  const b=$('exp-txt'),m=document.createElement('div');m.id='exp-menu';m.className='exp-menu';
  m.innerHTML=`<button type="button" data-exp="txt"><b>📄 Planograma (.txt)</b><small>Lista para o script de cadastro</small></button>
   <button type="button" data-exp="xlsx"><b>📊 Relatório (planilha)</b><small>Os ${f0(list.length)} itens da tela, como nos cartões, pronto para imprimir</small></button>`;
  b.parentNode.style.position='relative';b.parentNode.appendChild(m);
  m.onclick=e=>{const x=e.target.closest('[data-exp]');if(!x)return;fechaBaixar();x.dataset.exp==='txt'?exportaCadastro():exportaRelatorio()};
  setTimeout(()=>document.addEventListener('click',foraBaixar,true),0)};

/* Relatório .xlsx montado do zero (JSZip): cada produto = bloco de 3 linhas igual ao cartão
   (nome · código/medidas/emb/selos · Estoque | Trânsito | MDV | Situação), faixa com a cor da situação à esquerda,
   e a folha pronta para imprimir igual à exportação do Panfleto: A4 retrato, 1 página de largura,
   margens mínimas, sem cabeçalho/rodapé — e sem cortar um bloco entre duas páginas. */
const REL_COR={rup:['E03131','FDECEC'],crit:['E8590C','FFF0E6'],aten:['B7791F','FFF6DB'],ok:['2F9E44','E9F7EC'],nd:['6B7280','F1F3F5'],sg:['7048E8','F1ECFE']};
const REL_K=['rup','crit','aten','ok','nd','sg'];
const xEsc=s=>String(s??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const semTag=h=>{const d=document.createElement('div');d.innerHTML=h;return d.textContent.replace(/\s+/g,' ').trim()};
function relFiltros(){const p=[];
  if(F.chip!=='all')p.push(FLT_SHORT[F.chip]||(CHIPS.find(c=>c[0]===F.chip)||[])[1]||F.chip);
  if(F.ent)p.push('Sistemática '+((ENTS.find(e=>e[0]===F.ent)||[])[1]||F.ent));
  if(F.giro)p.push('Giro '+F.giro);if(F.cat)p.push(short(F.cat));if(F.cob)p.push('Cobertura '+cobTxt(F.cob));
  if(F.d111)p.push('Só 1×1'+(NOVA>0?` · nova cobertura ${NOVA} dias`:''));if(noCD)p.push('sem falta no CD'+(noCDTr?' (nem em trânsito)':''));
  if(F.q)p.push('busca "'+F.q+'"');return p.join(' · ')}
function relLinha(r){
  const ebx=num(r.emb)||1,unCx=n=>`${f0(n)} un`+(ebx>1&&n>=0?` | ${n>0&&n<ebx?'<1':f0(Math.floor(n/ebx))} cx`:'');
  const dias=v=>v>999?'+999':f0(Math.max(v,0)),rel=r._c!==null;
  const cob=r._k==='sg'?(semVendaDias(r)===Infinity?'—':f0(semVendaDias(r))+' d s/ venda'):r._ct===null?'—':dias(r._ct)+(rel||r._c999?' | R: '+(rel?dias(r._c):'—'):' d');
  const nova=F.d111&&NOVA>0&&is111(r)?novaDim(r):undefined;
  const dim=r._np?'Fora do planograma':nova===undefined?semTag(dimTxt(r)):nova?`➜ 1×${nova}×${porCx(r)} (nova${(novaInfo(r,NOVA)||{}).cap?', máx. do sistema':''})`:'1×1 · sem MDV';
  const selos=[r._sist?(ENT[r._sist]||'Sist. '+r._sist):'',inPed(r.produto)?'🛒 no pedido':'',semTag(axBadges(r)),
    r._e<0?'▼ negativo · '+(r._t>0?'em trânsito':isCD(r)?'falta no CD':'falta pedir'):cdRisk(r)?'⚠ falta no CD':''].filter(Boolean).join(' · ');
  return {k:REL_K.includes(r._k)?r._k:'nd',nome:r.descricao||'',sb:[r.produto,dim,embTxt(r),selos].filter(Boolean).join(' · '),
    est:unCx(r._e),tr:transitLoaded?unCx(r._t):'—',mdv:r._m?f1(r._m):'—',sit:`${GLY[r._k]||''} ${SLBL[r._k]||''}`.trim(),cob}}
async function exportaRelatorio(){
  if(!list.length)return toast('Nenhum item na lista');
  try{await ensureJSZip()}catch(e){return toast('Não consegui montar a planilha — '+e.message)}
  toast('Montando a planilha…');await new Promise(r=>setTimeout(r,30));
  const fil=(currentMeta.filial||'').replace(/ - Produtos.*/i,''),hoje=new Date().toLocaleDateString('pt-BR');
  /* estilos: fontes · preenchimentos · bordas · formatos de célula */
  const fonts=['<font><sz val="11"/><name val="Calibri"/></font>','<font><b/><sz val="12"/><name val="Calibri"/></font>','<font><sz val="9"/><color rgb="FF6B7280"/><name val="Calibri"/></font>',
    '<font><b/><sz val="15"/><name val="Calibri"/></font>','<font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>'];
  const fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>','<fill><patternFill patternType="solid"><fgColor rgb="FFF1F3F5"/><bgColor indexed="64"/></patternFill></fill>'];
  REL_K.forEach(k=>fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${REL_COR[k][1]}"/><bgColor indexed="64"/></patternFill></fill>`));   // 3..8
  const W='<right style="thin"><color rgb="FFFFFFFF"/></right>';
  const borders=['<border><left/><right/><top/><bottom/><diagonal/></border>',`<border><left/>${W}<top/><bottom/><diagonal/></border>`];
  REL_K.forEach(k=>borders.push(`<border><left style="thick"><color rgb="FF${REL_COR[k][0]}"/></left>${W}<top/><bottom/><diagonal/></border>`));                // 2..7
  const xf=(f,fi,b,al)=>`<xf numFmtId="0" fontId="${f}" fillId="${fi}" borderId="${b}" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment ${al}/></xf>`;
  const L='horizontal="left" vertical="center" wrapText="1" indent="1"',C='horizontal="left" vertical="center" wrapText="1" indent="1"';
  const xfs=[xf(0,0,0,'vertical="center"'),xf(3,0,0,'vertical="center"'),xf(4,0,0,'vertical="center" wrapText="1"')];   // 0 padrão · 1 título · 2 subtítulo
  const S={};REL_K.forEach((k,i)=>{S[k]={nome:xfs.push(xf(1,0,2+i,L))-1,sb:xfs.push(xf(2,0,2+i,L))-1,box1:xfs.push(xf(0,2,2+i,C))-1,sit:xfs.push(xf(0,3+i,1,C))-1}});
  const BOX=xfs.push(xf(0,2,1,C))-1;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  /* células */
  const run=(t,o)=>`<r><rPr>${o.b?'<b/>':''}<sz val="${o.sz}"/><color rgb="FF${o.c}"/><rFont val="Calibri"/></rPr><t xml:space="preserve">${xEsc(t)}</t></r>`;
  const caixa=(ref,s,rot,val,cor)=>`<c r="${ref}" s="${s}" t="inlineStr"><is>${run(rot,{sz:8,c:cor||'6B7280'})}${run('\n'+val,{b:1,sz:12,c:cor||'111827'})}</is></c>`;
  const txt=(ref,s,t)=>`<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xEsc(t)}</t></is></c>`;
  const vazio=(ref,s)=>`<c r="${ref}" s="${s}"/>`;
  const rows=[],merges=[],breaks=[];let n=1;
  rows.push(`<row r="${n}" ht="24" customHeight="1">${txt('A'+n,1,`Relatório do Planograma${fil?' — '+fil:''}`)}</row>`);merges.push(`A${n}:D${n}`);n++;
  const flt=relFiltros();
  rows.push(`<row r="${n}" ht="30" customHeight="1">${txt('A'+n,2,`${hoje} · ${f0(list.length)} itens${currentMeta.date?' · planograma de '+currentMeta.date:''}${flt?' · filtros: '+flt:''}`)}</row>`);merges.push(`A${n}:D${n}`);n++;
  rows.push(`<row r="${n}" ht="8" customHeight="1"/>`);n++;
  const POR_PAG=10;let naPag=1;   // 1ª página já tem o título (conta como 1 bloco)
  for(const r of list){const x=relLinha(r),s=S[x.k],cor=REL_COR[x.k][0];
    if(naPag>=POR_PAG){breaks.push(n-1);naPag=0}naPag++;
    rows.push(`<row r="${n}" ht="20" customHeight="1">${txt('A'+n,s.nome,x.nome)}${vazio('B'+n,0)}${vazio('C'+n,0)}${vazio('D'+n,0)}</row>`);merges.push(`A${n}:D${n}`);n++;
    rows.push(`<row r="${n}" ht="16" customHeight="1">${txt('A'+n,s.sb,x.sb)}${vazio('B'+n,0)}${vazio('C'+n,0)}${vazio('D'+n,0)}</row>`);merges.push(`A${n}:D${n}`);n++;
    rows.push(`<row r="${n}" ht="34" customHeight="1">${caixa('A'+n,s.box1,'Estoque',x.est)}${caixa('B'+n,BOX,'Trânsito',x.tr)}${caixa('C'+n,BOX,'MDV',x.mdv)}${caixa('D'+n,s.sit,x.sit,x.cob,cor)}</row>`);n++;
    rows.push(`<row r="${n}" ht="9" customHeight="1"/>`);n++}
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:D${n-1}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="26" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/><col min="3" max="3" width="12" customWidth="1"/><col min="4" max="4" width="26" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(m=>`<mergeCell ref="${m}"/>`).join('')}</mergeCells><pageMargins left="0.2" right="0.2" top="0.2" bottom="0.2" header="0" footer="0"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/><headerFooter/>${breaks.length?`<rowBreaks count="${breaks.length}" manualBreakCount="${breaks.length}">${breaks.map(b=>`<brk id="${b}" max="16383" man="1"/>`).join('')}</rowBreaks>`:''}</worksheet>`;
  const zip=new JSZip();
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatório" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('xl/styles.xml',styles);zip.file('xl/worksheets/sheet1.xml',sheet);
  const out=await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'});
  const d=new Date(),dt=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  downloadBlob(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`relatorio_planograma_${dt}.xlsx`);
  toast(`Relatório com ${f0(list.length)} itens baixado · pronto para imprimir`)}
/* ═══ CONFERÊNCIA DO CADASTRO (nov/2026) ═══
   Ao baixar o TXT, guarda produto → medidas mandadas (+ quando). Quando entra um planograma gerado DEPOIS desse envio,
   compara: medidas iguais = entrou certo (sai da lista) · diferentes = NÃO entrou (fica para recadastrar).
   Fica no aparelho (planograma_cadconf) até entrar certo ou você limpar. */
const LSCAD='planograma_cadconf';let CAD={};try{CAD=JSON.parse(localStorage.getItem(LSCAD)||'{}')||{}}catch{CAD={}}
let CADOK=0,cadNao=new Set();try{CADOK=+localStorage.getItem('planograma_cadok')||0}catch{}   // CADOK = quantos entraram certo na última conferência · cadNao = códigos que não entraram
const cadSalva=()=>{try{localStorage.setItem(LSCAD,JSON.stringify(CAD))}catch{}};
function cadGuarda(L){const ts=Date.now();for(const ln of L){const [p,a,l,f]=ln.split(';'),r=byProd.get(p);
    if(r&&num(r.altura)===+a&&num(r.largura)===+l&&num(r.prof)===+f)continue;   // medida igual à atual: não é cadastro novo, não entra na conferência
    CAD[p]=[+a,+l,+f,ts]}cadSalva();cadConfere()}
const planoTs=()=>{const d=dmy(currentMeta&&currentMeta.date);if(!d)return 0;const h=/(\d\d):(\d\d)/.exec(currentMeta.hora||'');if(h)d.setHours(+h[1],+h[2]);else d.setHours(23,59);return +d};
function cadConfere(){cadNao=new Set();const pt=planoTs();let ok=0,mud=false;
  if(pt&&allRecords.length)for(const p in CAD){const [a,l,f,ts]=CAD[p];if(pt<=ts)continue;              // planograma é de antes do envio: ainda não dá para saber
    const r=byProd.get(p);if(!r)continue;
    if(num(r.altura)===a&&num(r.largura)===l&&num(r.prof)===f){delete CAD[p];ok++;mud=true}else cadNao.add(p)}
  if(mud){CADOK+=ok;cadSalva();try{localStorage.setItem('planograma_cadok',CADOK)}catch{}}}
const cadEspera=()=>{const pt=planoTs();let n=0;for(const p in CAD)if(!(pt>CAD[p][3]))n++;return n};
function renderCadBan(){const el=$('cadban');if(!el)return;const n=cadNao.size,ag=cadEspera();
  if(!n&&!CADOK&&!ag){el.hidden=true;el.innerHTML='';return}el.hidden=false;
  el.innerHTML=`<div class="cadb"><b>📋 Conferência do cadastro</b><span>${CADOK?`✅ <b>${f0(CADOK)}</b> entraram certo`:''}${CADOK&&n?' · ':''}${n?`❌ <b>${f0(n)}</b> não entraram`:''}${(CADOK||n)&&ag?' · ':''}${ag?`⏳ ${f0(ag)} aguardando o planograma de amanhã`:''}</span>
   <div class="cadb-b">${n?'<button type="button" class="button button-small button-fill" id="cad-ver">Ver os que não entraram</button>':''}<button type="button" class="button button-small button-tonal" id="cad-limpa">${n||ag?'Limpar conferência':'Ok, entendi'}</button></div></div>`}
$('cadban').onclick=e=>{
  if(e.target.closest('#cad-ver')){F={chip:'all',cat:'',q:'',sort:F.sort||'cobt',ent:'',cadx:true};$('q').value='';go('prod');return}
  if(e.target.closest('#cad-limpa')){const tudo=cadNao.size||cadEspera();if(tudo&&!confirm('Limpar a conferência? Os itens deixam de ser acompanhados.'))return;
    if(tudo){CAD={};cadSalva();cadNao=new Set()}CADOK=0;try{localStorage.setItem('planograma_cadok',0)}catch{}if(F.cadx)F.cadx=false;renderCadBan();toast('Conferência limpa')}};
const qGo=debounce(()=>renderList(true),180);
$('q').oninput=e=>{F.q=e.target.value;qGo()};
$('q-x').onclick=()=>{$('q').value='';F.q='';renderList(true);$('q').focus()};
$('sort').onchange=e=>{F.sort=e.target.value;renderList(true)};
$('catx').onclick=e=>{const b=e.target.closest('.catx');if(!b)return;if(b.dataset.x==='cob')F.cob=null;else if(b.dataset.x==='giro')F.giro='';else if(b.dataset.x==='cadx')F.cadx=false;else if(b.dataset.x==='capx')F.capx=false;else if(b.dataset.x==='todo')F.todo='';else if(b.dataset.x==='forn'){F.forn='';F.todo=''}else F.cat='';renderList(true)};

/* ── Categoria em árvore: toca num nível com filhos → entra; "Filtrar …" aplica aquele nível; folha aplica direto ── */
let catPath=[];   // caminho atual, ex.: ['MERCEARIA','LIMPEZA']
/* F/CD em trânsito: estoque menor que 1 caixa, mas com trânsito a caminho (só esconde se a sub-opção estiver ligada) */
let noCDTr=false;try{noCDTr=localStorage.getItem('planograma_nocdtr')==='1'}catch{}
const cdTr=r=>isCD(r)&&r._t>0&&r._e<(num(r.emb)||1);
const hideCD=(r,on=noCD,tr=noCDTr)=>on&&(cdRisk(r)||(tr&&cdTr(r)));
const salvaCD=()=>{try{localStorage.setItem('planograma_nocd',noCD?'1':'0');localStorage.setItem('planograma_nocdtr',noCDTr?'1':'0')}catch{}};
/* ═══ 1×1 + nova cobertura (nov/2026). No sistema: 1º campo = 1 · campo do meio = dias × MDV ÷ embalagem · 3º campo = itens por caixa.
   Filtro "Só 1×1" (olha só os 2 primeiros campos) e, com dias informados, medida proposta 1 × (dias × MDV ÷ emb) × itens por caixa ═══ */
const is111=r=>num(r.altura)===1&&num(r.largura)===1;
/* CAPACIDADE MENOR QUE 1 CAIXA (nov/2026): a caixa fechada não cabe no espaço cadastrado → candidatos a recadastro */
const capMenor=r=>{if(r._np)return false;const c=capOf(r);return c>0&&c<(num(r.emb)||1)};
const porCx=r=>num(r.prof)||num(r.emb)||1;   // 3º campo = itens na caixa (sem ele, usa a embalagem)
/* TETO DO SISTEMA: ele recusa se a quantidade do planograma passar de LIMITE dias de cobertura, calculada com o MDV DELE
   (que não é o MDV da tela). O MDV dele sai do próprio relatório de planograma: total ÷ Cob.Plan. Como o sistema TRUNCA
   a cobertura (37,6 → "37"), usa-se total ÷ (Cob.Plan + 1): o MDV mais baixo possível → o teto nunca passa do limite. */
let LIMITE=30;try{const v=parseInt(localStorage.getItem('planograma_limcob'),10);if(v>0)LIMITE=v}catch{}
const qMaxSis=r=>{const cp=num(r.cobplan),tot=capOf(r);if(!(tot>0)||String(r.cobplan??'').trim()===''||cp>=999)return null;return Math.floor(LIMITE*tot/(cp+1))};
function novaInfo(r,d){if(!(r._m>0&&d>0))return null;
  const quer=Math.max(1,Math.ceil(d*r._m/(num(r.emb)||1)));                         // a sua conta: dias × MDV ÷ embalagem, para cima
  const q=qMaxSis(r),lMax=q===null?Infinity:Math.max(1,Math.floor(q/porCx(r)));     // o máximo que o sistema aceita (para baixo)
  return {l:Math.min(quer,lMax),quer,cap:quer>lMax,q}}
const novaLarg=(r,d)=>{const i=novaInfo(r,d);return i?i.l:null};
const novaDim=r=>F.d111&&NOVA>0&&is111(r)?novaLarg(r,NOVA):null;
/* GIRO (nov/2026): filtro da folha de Filtros de Produtos ('' = todos) */
const giroR=r=>String(r.giro||'').trim().toUpperCase();
const giroOk=(r,g=F.giro)=>!g||giroR(r)===g;
const catOk=r=>!F.cat||r.categoria===F.cat||(r.categoria||'').startsWith(F.cat+'->');   // nível pai inclui os filhos
function passesChip(r,ch=F.chip,ignNoCD){
  return (ignNoCD||ch==='cd'||ch==='dep'||ch==='sug'||!hideCD(r))&&
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
const nFiltros=()=>(F.chip!=='all')+(F.d111?1:0)+(F.capx?1:0)+(F.giro?1:0)+(F.cadx?1:0)+(F.todo?1:0)+(F.forn?1:0)+(!!F.cat)+((F.ent||'')!==ENT0)+(noCD?1:0)+(F.cob?1:0);
/* COBERTURA TOTAL maior/menor que N dias — usa o mesmo número arredondado do cartão; "Sem giro" e item sem MDV/cobertura ficam de fora */
const cobDia=r=>r._ct!==null&&r._k!=='sg'?Math.max(r._ct,0):null;
const cobOn=c=>!!(c&&(c.op==='lt'||c.op==='gt')&&Number.isFinite(c.d)&&c.d>=0);
const cobPass=(r,c)=>{if(!cobOn(c))return true;const v=cobDia(r);return v!==null&&(c.op==='lt'?v<c.d:v>c.d)};
const cobTxt=c=>`Cob. ${c.op==='lt'?'<':'>'} ${f0(c.d)} dias`;
const dCat=r=>!D.cat||r.categoria===D.cat||(r.categoria||'').startsWith(D.cat+'->');
const dEnt=r=>!D.ent||(D.ent==='np'?!!r._np:D.ent==='1'?isCD(r):r._sist===D.ent);
const dChip=(r,ch=D.chip)=>(ch==='cd'||ch==='dep'||ch==='sug'||!hideCD(r,D.noCD,D.noCDTr))&&passesChip(r,ch,true);
const ENT0='1';   // filtro padrão de Sistemática (ao abrir o app e no "Limpar")
const ENTS=[['','Todas'],['1','1'],['10','10'],['20','20'],['np','Sem plano']];
const COBOPS=[['','Qualquer'],['lt','Menor que'],['gt','Maior que']];
/* só os números (contagens e "Ver N itens") — usado enquanto digita os dias, sem redesenhar a folha */
function fltCounts(){
  const bs=[...document.querySelectorAll('#flt-list .fs-s')],ch=bs.map(b=>b.dataset.c),n=ch.map(()=>0);let sel=0;
  const ext=r=>D.limpou||(todoOk(r)&&(!F.forn||fornKey(r)===F.forn)&&(!F.cadx||cadNao.has(r.produto)));   // filtros que vêm do Resumo (todo/fornecedor/conferência)
  for(const r of allRecords){if(!(dCat(r)&&dEnt(r)&&cobPass(r,D.cob)&&(!D.d111||is111(r))&&(!D.capx||capMenor(r))&&giroOk(r,D.giro)&&ext(r)))continue;   // ⚡ 1 passada: conta todas as situações juntas (mesmo dChip de antes)
    for(let i=0;i<ch.length;i++)if(dChip(r,ch[i]))n[i]++;if(dChip(r))sel++}
  bs.forEach((b,i)=>{b.querySelector('small').textContent=f0(n[i])});
  $('flt-apply').textContent=`Ver ${f0(sel)} itens`;
  $('flt-clear').style.visibility=(D.chip!=='all'||D.cat||(D.ent||'')!==ENT0||D.noCD||D.d111||D.capx||D.giro||cobOn(D.cob)||(!D.limpou&&(F.todo||F.forn||F.cadx)))?'':'hidden'}
function renderFlt(){refreshDep();
  const sit=CHIPS.filter(c=>c[0]!=='trans'||transitLoaded).map(c=>{
    const g=GLY[c[0]]||(c[2]?ic(c[2],13):'');
    return `<button type="button" class="fs-s${D.chip===c[0]?' on':''}" data-c="${c[0]}" style="--c:${CHIP_C[c[0]]||'var(--tx)'}"><b>${g?`<i>${g}</i>`:''}${c[0]==='dep'?'🔎 Depósito':c[1]}</b><small></small></button>`}).join('');
  const op=D.cob?D.cob.op:'',dd=D.cob&&Number.isFinite(D.cob.d)?D.cob.d:'';
  $('flt-list').innerHTML=`<h5>Situação</h5><div class="fs-grid">${sit}</div>
   <h5>Cobertura total <span class="fs-hint">(estoque + trânsito) ÷ MDV</span></h5><div class="fs-seg">${COBOPS.map(([v,l])=>`<button type="button" data-cop="${v}" class="${op===v?'on':''}">${l}</button>`).join('')}</div>
   ${op?`<div class="fs-cob"><div class="fs-num"><button type="button" data-cstep="-1" aria-label="Menos 1 dia">−</button><input id="fs-cobd" type="number" inputmode="numeric" min="0" step="1" value="${dd}" aria-label="Dias de cobertura"><span>dias</span><button type="button" data-cstep="1" aria-label="Mais 1 dia">+</button></div><div class="fs-q">${[3,7,15,30].map(n=>`<button type="button" data-cq="${n}" class="${dd===n?'on':''}">${n}</button>`).join('')}</div></div>`:''}
   <h5>Planograma</h5>
   <label class="fs-ln"><span>Só 1×1<small>Os dois primeiros campos = 1 (qualquer quantidade por caixa)</small></span><input type="checkbox" id="fs-111" class="sw-i"${D.d111?' checked':''}><span class="sw-t fs-tg"></span></label>${D.d111?`
   <div class="fs-nova"><span class="fs-nl">Nova cobertura<small>campo do meio = dias × MDV ÷ embalagem (arredondado para cima)</small></span><div class="fs-cob"><div class="fs-num"><button type="button" data-nstep="-1" aria-label="Menos 1 dia">−</button><input id="fs-nova" type="number" inputmode="numeric" min="0" step="1" value="${D.nova>0?D.nova:''}" placeholder="—" aria-label="Dias da nova cobertura"><span>dias</span><button type="button" data-nstep="1" aria-label="Mais 1 dia">+</button></div><div class="fs-q">${[7,15,21,30].map(n=>`<button type="button" data-nq="${n}" class="${D.nova===n?'on':''}">${n}</button>`).join('')}</div></div>
   <span class="fs-nl fs-lim">Limite do sistema<small>Cob. Limite da tela do sistema — corta no máximo aceito (sem o alerta)</small></span><div class="fs-cob"><div class="fs-num"><input id="fs-lim" type="number" inputmode="numeric" min="1" step="1" value="${D.lim||LIMITE}" aria-label="Limite de cobertura do sistema em dias"><span>dias</span></div></div></div>`:''}
   <label class="fs-ln"><span>Capacidade menor que 1 caixa<small>A caixa fechada não cabe no espaço cadastrado — candidatos a recadastro</small></span><input type="checkbox" id="fs-capx" class="sw-i"${D.capx?' checked':''}><span class="sw-t fs-tg"></span></label>
   ${(()=>{const gs=[...new Set(allRecords.map(giroR).filter(Boolean))].sort();return gs.length?`<h5>Giro</h5><div class="fs-seg">${[['','Todos'],...gs.map(g=>[g,g])].map(([v,l])=>`<button type="button" data-giro="${esc(v)}" class="${(D.giro||'')===v?'on':''}">${esc(l)}</button>`).join('')}</div>`:''})()}
   <h5>Sistemática</h5><div class="fs-seg">${ENTS.map(([v,l])=>`<button type="button" data-ent="${v}" class="${(D.ent||'')===v?'on':''}">${l}</button>`).join('')}</div>
   <h5>Categoria</h5><button type="button" class="fs-ln" id="cat-pick-btn"><span>${D.cat?esc(short(D.cat)):'Todas as categorias'}<small>${D.cat?'Toque para trocar':'Toque para escolher na árvore'}</small></span>${D.cat?'<i class="fs-cx" id="fs-catx" role="button" aria-label="Tirar categoria">✕</i>':'<i class="fs-ar">›</i>'}</button>
   <label class="fs-ln"><span>Esconder falta no CD (F/CD)<small>Estoque menor que 1 caixa, sem trânsito</small></span><input type="checkbox" id="fs-nocd" class="sw-i"${D.noCD?' checked':''}><span class="sw-t fs-tg"></span></label>${D.noCD?`
   <label class="fs-ln fs-sub"><span>Esconder também os em trânsito<small>Estoque menor que 1 caixa, com trânsito a caminho</small></span><input type="checkbox" id="fs-nocdtr" class="sw-i"${D.noCDTr?' checked':''}><span class="sw-t fs-tg"></span></label>`:''}`;
  fltCounts()}
function openFlt(keep){if(!keep||!D)D={chip:F.chip,cat:F.cat||'',ent:F.ent||'',giro:F.giro||'',noCD,noCDTr,d111:!!F.d111,capx:!!F.capx,nova:NOVA||null,cob:F.cob?{...F.cob}:null};renderFlt();fltSheet.open();pushOv('flt')}
function closeFlt(){if(fltSheet.opened)fltSheet.close()}
$('flt-btn').onclick=()=>openFlt();
$('flt-sheet-x').onclick=closeFlt;$('flt-cancel').onclick=closeFlt;
$('flt-clear').onclick=()=>{D={chip:'all',cat:'',ent:ENT0,giro:'',noCD:false,noCDTr:false,d111:false,capx:false,nova:D.nova,cob:null,limpou:true};renderFlt()};
$('flt-apply').onclick=()=>{if(D.limpou){F.todo='';F.forn='';F.cadx=false;todoP=null}   // Limpar também tira os filtros que vieram do Resumo
  F.chip=D.chip;F.cat=D.cat;F.ent=D.ent;F.giro=D.giro||'';F.cob=cobOn(D.cob)?{op:D.cob.op,d:D.cob.d}:null;noCD=D.noCD;noCDTr=!!D.noCDTr;salvaCD();if(D.lim>0){LIMITE=D.lim;try{localStorage.setItem('planograma_limcob',LIMITE)}catch{}}F.d111=!!D.d111;F.capx=!!D.capx;NOVA=D.nova>0?D.nova:null;try{localStorage.setItem('planograma_cobnova',NOVA||'')}catch{};closeFlt();renderList(true)};
$('flt-list').onclick=e=>{
  const nq=e.target.closest('[data-nq]');if(nq){D.nova=+nq.dataset.nq;return renderFlt()}
  const ns=e.target.closest('[data-nstep]');if(ns){D.nova=Math.max(0,(D.nova>0?D.nova:0)+ +ns.dataset.nstep)||null;return renderFlt()}
  const b=e.target.closest('.fs-s');if(b){D.chip=b.dataset.c;return renderFlt()}
  const co=e.target.closest('[data-cop]');if(co){const v=co.dataset.cop;D.cob=v?{op:v,d:D.cob&&Number.isFinite(D.cob.d)?D.cob.d:7}:null;return renderFlt()}
  const st=e.target.closest('[data-cstep]');if(st&&D.cob){D.cob.d=Math.max(0,(Number.isFinite(D.cob.d)?D.cob.d:0)+ +st.dataset.cstep);return renderFlt()}
  const q=e.target.closest('[data-cq]');if(q&&D.cob){D.cob.d=+q.dataset.cq;return renderFlt()}
  const g=e.target.closest('[data-ent]');if(g){D.ent=g.dataset.ent;return renderFlt()}
  const gi=e.target.closest('[data-giro]');if(gi){D.giro=gi.dataset.giro;return renderFlt()}
  if(e.target.closest('#fs-catx')){D.cat='';return renderFlt()}
  if(e.target.closest('#cat-pick-btn'))openCatPicker()};
$('flt-list').onchange=e=>{if(e.target.id==='fs-nocd'){D.noCD=e.target.checked;renderFlt()}if(e.target.id==='fs-nocdtr'){D.noCDTr=e.target.checked;renderFlt()}if(e.target.id==='fs-111'){D.d111=e.target.checked;renderFlt()}if(e.target.id==='fs-capx'){D.capx=e.target.checked;fltCounts()}};
$('flt-list').addEventListener('input',e=>{if(e.target.id==='fs-lim'){const v=parseInt(e.target.value,10);D.lim=v>0?v:null;return}
  if(e.target.id==='fs-nova'){const v=parseInt(e.target.value,10);D.nova=v>0?v:null;
  document.querySelectorAll('#flt-list [data-nq]').forEach(b=>b.classList.toggle('on',+b.dataset.nq===D.nova));return}
  if(e.target.id!=='fs-cobd'||!D.cob)return;const v=parseInt(e.target.value,10);D.cob.d=Number.isFinite(v)&&v>=0?v:NaN;
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

/* ═══ TECLADO E LEITOR DE TELA (revisão nov/2026) ═══
   1) Tudo que é clicável mas não é <button> (links do F7 sem href, cartões de lista, itens do "Para fazer hoje"…) ganha
      tabindex="0" + role="button" e passa a funcionar com Enter/Espaço.
   2) Botões de escolha (segmentados, situação, giro, dias, urgência, chips) anunciam se estão ligados (aria-pressed).
   Um único observador cuida das telas que são redesenhadas pelo JS. */
const A11Y_CLICK='a.item-link:not([href]),a.link:not([href]),.urg,.pfh,.pfn,#h-ring,.enc-drop,[data-todo],[data-forn]';
const A11Y_PRESS='.fs-s,.fs-seg button,.ofdays button,#theme-seg .button,#ax-seg .button,#cats-sw .button,#kpis-sw .button,[data-u],#pc-dep,#pc-fcd';
function a11yFix(root){if(!root||!root.querySelectorAll)return;
  const all=sel=>[...(root.matches&&root.matches(sel)?[root]:[]),...root.querySelectorAll(sel)];
  for(const e of all(A11Y_CLICK)){if(!e.hasAttribute('tabindex'))e.setAttribute('tabindex','0');if(!e.hasAttribute('role'))e.setAttribute('role','button')}
  for(const e of all(A11Y_PRESS)){const on=e.classList.contains('on')||e.classList.contains('button-active');if(e.getAttribute('aria-pressed')!==String(on))e.setAttribute('aria-pressed',String(on))}}
a11yFix(document.body);
new MutationObserver(ms=>{for(const m of ms){if(m.type==='attributes')a11yFix(m.target);else for(const n of m.addedNodes)if(n.nodeType===1)a11yFix(n)}})
  .observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const t=e.target;
  if(!t||!t.matches||t.matches('button,input,textarea,select,a[href]'))return;
  if(t.matches('[role=button],[tabindex="0"]')){e.preventDefault();t.click()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('exp-menu')){fechaBaixar();$('exp-txt').focus()}});
