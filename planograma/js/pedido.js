/* Planograma Mobile — PEDIDO: lista, 🔎 depósito, gestos dos cartões (Framework7 swipeout), segurar = 🔎 e ficha do produto.
   Ordem de carregamento (index.html): framework7 → leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa.
   Os dados do pedido (planograma_pedido no aparelho + live/pedido na nuvem) têm o MESMO formato da versão anterior. */

const LSP='planograma_pedido';let pedido=[];try{pedido=JSON.parse(localStorage.getItem(LSP)||'[]')}catch{}
pedido.forEach(x=>{if(!x.added)x.added=ymd0()});function ymd0(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>ymd(new Date()),tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return ymd(d)};
const inPed=p=>pedido.find(x=>x.p===p&&!x.done);
const inTransit=x=>{const r=byProd.get(x.p);return !!(transitLoaded&&r&&r._t>0)};   // mercadoria a caminho: não dá para pedir até chegar
const pend=()=>pedido.filter(x=>!x.done&&!inTransit(x));
addEventListener('pagehide',()=>{try{localStorage.setItem(LSP,JSON.stringify(pedido))}catch{}});   // não perde o que está pendente
function updBadge(){const n=pend().length,b=$('pbadge');b.textContent=n;b.style.display=n?'':'none'}
/* 🔎 PROCURAR NO DEPÓSITO: marca por produto (independe do pedido). Guardada no aparelho e na nuvem em live/dep */
function saveDep(){try{localStorage.setItem(LSDEP,JSON.stringify(Object.keys(depMap)))}catch{}cloudWriteDep()}
function depRefresh(){refreshDep();const s=document.querySelector('section.on');if(!s)return;const id=s.id.slice(2);if(id==='ped')renderPed();else if(id==='prod')renderList(false);else if(id==='enc'&&axCur==='pan')renderPf();else if(id==='enc'&&axCur==='dia')renderOf()}
function setDep(p,v){if(v)depMap[p]=true;else delete depMap[p];saveDep();depRefresh()}
function toggleDep(p){const v=!depMap[p];setDep(p,v);if(navigator.vibrate)navigator.vibrate(15);
  toastUndo(v?'🔎 Procurar no depósito':'Saiu de "Procurar no depósito"',()=>setDep(p,!v))}
function savePed(){
  try{localStorage.setItem(LSP,JSON.stringify(pedido))}catch{}
  updBadge();
  cloudWritePedido();   // só em ação do usuário
}
function addPed(r,q,noSave){if(inPed(r.produto))return false;pedido=pedido.filter(x=>x.p!==r.produto);pedido.push({p:r.produto,d:r.descricao,q:q||'',date:tomorrow(),added:today(),done:false});if(!noSave)savePed();return true}
function renderBan(){const n=pend().length,t=pedido.filter(x=>!x.done&&inTransit(x)).length;
 $('pban').innerHTML=n||t?`<button class="pban" data-go="ped" type="button"><span class="pb-ic">🛒</span><span class="pb-tx"><b>${n?`${n} ${n>1?'itens':'item'} para pedir`:'Nada para pedir agora'}</b>${t?`<small>${t} aguardando trânsito</small>`:'<small>Toque para abrir o pedido</small>'}</span><span class="pb-go">›</span></button>`:''}
$('pban').onclick=e=>{if(e.target.closest('[data-go]'))go('ped')};
/* ordem da lista do pedido (vale para Para pedir · Aguardando trânsito · Concluídos) — lembrada no aparelho */
const PED_ORD=[['nome','Nome A–Z'],['cob_a','Menor cobertura'],['cob_d','Maior cobertura'],['mdv_d','Maior MDV'],['mdv_a','Menor MDV']];
let pedSort='nome';try{const v=localStorage.getItem('planograma_pedsort');if(PED_ORD.some(o=>o[0]===v))pedSort=v}catch{}
let depOnly=false;   // filtro "🔎 Procurar no depósito" ligado?
const dropOpen={pnd:true,trd:false,dnd:false};   // lembra quais grupos do pedido estão abertos ("Para pedir" já começa aberto)
/* dica de gestos: aparece nas 3 primeiras vezes que o Pedido é aberto (ou até tocar no ✕) */
const LSHINT='planograma_dica_gestos';let hintN=0,hintCounted=false;try{hintN=+localStorage.getItem(LSHINT)||0}catch{}
const hintHtml=()=>hintN<=3?'<div class="hint"><span>👉 Deslize → concluir · 👈 excluir · segure o cartão = 🔎 depósito</span><button type="button" id="hint-x" aria-label="Fechar dica">✕</button></div>':'';
const CHEV='<svg class="ch" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
function renderPed(){
 if(pedido.length&&!hintCounted){hintCounted=true;hintN++;try{localStorage.setItem(LSHINT,hintN)}catch{}}   // conta 1 vez por abertura do app
 const act=pedido.filter(x=>!x.done&&!inTransit(x)),tr=pedido.filter(x=>!x.done&&inTransit(x)),dn=pedido.filter(x=>x.done),n=act.length;
 $('phead').innerHTML=`<div class="ph-row"><div class="ph-n num">${n}</div><div><div class="t">${n?`${n} ${n>1?'itens':'item'} para pedir`:(pedido.length?'Nada para pedir agora':'Pedido vazio')}</div><div class="s">${tr.length?`${tr.length} aguardando chegada do trânsito`:(pedido.length?'Itens fora do trânsito aparecem na lista abaixo':'Adicione abaixo ou pelo 🛒 nos produtos.')}</div></div></div>`
  +(pedido.length?`<div class="ph-st"><span><b class="num">${n}</b> para pedir</span><span><b class="num">${tr.length}</b> em trânsito</span><span><b class="num">${dn.length}</b> concluídos</span></div>`:'');
 const nd=pedido.filter(x=>depMap[x.p]&&!x.done).length;if(depOnly&&!nd)depOnly=false;   // tirou o último: desliga o filtro
 const fl=l=>depOnly?l.filter(x=>depMap[x.p]):l;
 const row0=x=>{const r=byProd.get(x.p),di=depMap[x.p]?DEPI:'';
  if(!r)return `<div class="pi ${x.done?'done':''}${depMap[x.p]?' dep':''}" data-p="${esc(x.p)}"><div class="hd"><div class="nm">${esc(x.d)}</div><div class="acts">${di}</div></div><div class="sb">${esc(x.p)} · fora do planograma carregado</div></div>`;
  return `<div class="p pedc ${x.done?'done':''}${depMap[x.p]?' dep':''}" data-p="${esc(x.p)}" style="--c:${COLOR[r._k]}">${cardBody(r,di,'',true)}</div>`};
 const row=x=>swrap(row0(x),x.done,'del','Excluir','🗑');
 const nome=(a,b)=>String(a.d||'').localeCompare(String(b.d||'')),R=x=>byProd.get(x.p);
 const cob=x=>{const r=R(x);return r&&r._ct!==null&&r._k!=='sg'?Math.max(r._ct,0):null},mdv=x=>{const r=R(x);return r&&r._m?r._m:null};
 const by=(f,dir)=>(a,b)=>{const va=f(a),vb=f(b);if(va===null||vb===null)return(va===null)-(vb===null)||nome(a,b);return(va-vb)*dir||nome(a,b)};   // sem número vai pro fim
 const ORD={nome,cob_a:by(cob,1),cob_d:by(cob,-1),mdv_d:by(mdv,-1),mdv_a:by(mdv,1)};
 const ord=l=>l.slice().sort(ORD[pedSort]||nome);
 const drop=(id,title,sub,l)=>l.length?`<details class="trd" id="${id}"${dropOpen[id]?' open':''}><summary><span>${title}<small>${sub}</small></span><span class="cnt">${l.length}</span>${CHEV}</summary><div class="trd-b">${ord(l).map(row).join('')}</div></details>`:'';
 const trHtml=drop('pnd','📋 Para pedir','Ainda falta pedir',fl(act))+drop('trd','⏳ Aguardando trânsito','Ficam aqui até a mercadoria chegar',fl(tr))+drop('dnd','✓ Concluídos','Deslize → para reabrir',fl(dn));
 const chip=(nd||depOnly)?`<button class="chip-btn ${depOnly?'on':''}" id="pc-dep" type="button" style="--c:var(--in)">🔎 Procurar no depósito (${nd})</button>`:'';
 const sortBar=`<div class="row2 pedsort">${chip}<label class="chip-btn chip-sel ps-sel"><svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/></svg><select id="ped-sort" aria-label="Ordenar lista de pedido">${PED_ORD.map(([v,t])=>`<option value="${v}"${v===pedSort?' selected':''}>${t}</option>`).join('')}</select></label></div>`;
 $('plist').innerHTML=pedido.length?hintHtml()+sortBar+trHtml:'<div class="empty"><div class="em-ic">🛒</div><p>Sua lista está vazia</p><div class="grid grid-cols-2 grid-gap" style="margin-top:14px"><button class="button button-fill button-large" id="pe-sug" type="button">Adicionar sugestões</button><button class="button button-tonal button-large" id="pe-scan" type="button">Ler código</button></div></div>'}
$('plist').addEventListener('change',e=>{if(e.target.id!=='ped-sort')return;pedSort=e.target.value;try{localStorage.setItem('planograma_pedsort',pedSort)}catch{}renderPed()});
$('plist').addEventListener('toggle',e=>{if(e.target.id in dropOpen)dropOpen[e.target.id]=e.target.open},true);   // lembra se o grupo está aberto
function swAddPed(r,li,c){
  if(inPed(r.produto))return toast('Já está no pedido');
  addS(r);const sp=li&&li.querySelector('[data-sw=add] span');if(sp)sp.textContent='Já no pedido';
  if(c&&!c.querySelector('.ent.ped')){const sb=c.querySelector('.sb');if(sb){const e1=sb.querySelector('.ent');if(e1)e1.insertAdjacentHTML('afterend',' '+PEDBADGE);else sb.insertAdjacentHTML('beforeend',' '+PEDBADGE)}}   // 🛒 logo depois do selo CD
  toast(addMsg(r))}
/* ═══ GESTOS (Framework7 swipeout) — Produtos, Pedido, Encarte, Panfleto e Oferta do dia ═══
   → concluir / reabrir · ← pedido (Produtos e anexos) · ← excluir (Pedido). Arrastar até o fim já executa a ação. */
let swBlock=0;
app.on('swipeoutOpen swipeoutOpened',()=>{swBlock=Date.now()+350});      // evita o "clique fantasma" que abriria a ficha
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-sw]');if(!a)return;e.preventDefault();
  const li=a.closest('.swipeout'),c=li&&li.querySelector('.swipeout-content>[data-p]');if(!c)return;
  swBlock=Date.now()+350;const act=a.dataset.sw;
  if(li.closest('#plist')){                                              // PEDIDO
    const x=pedido.find(y=>y.p===c.dataset.p);if(!x){app.swipeout.close(li);return}
    if(act==='ok'){app.swipeout.close(li);setTimeout(()=>{x.done=!x.done;savePed();renderPed()},260)}   // → concluir: volta suave e alterna
    else if(act==='del'){app.swipeout.delete(li,()=>{const idx=pedido.indexOf(x);if(idx<0)return;pedido.splice(idx,1);savePed();renderPed();   // ← excluir: sai da tela e aparece "Desfazer"
      toastUndo('Item removido',()=>{pedido.splice(idx,0,x);savePed();renderPed()})})}
    return}
  const r=byProd.get(c.dataset.p);app.swipeout.close(li);if(!r)return;   // PRODUTOS / ANEXOS
  if(act==='ok')toggleDone(r,c);else if(act==='add')swAddPed(r,li,c)});
/* segurar o cartão ~0,8 s (LP_MS) liga/desliga 🔎 (Produtos, Pedido, Panfleto, Oferta). Android manda "contextmenu" ao segurar; iOS só o timer — por isso os dois */
const LP_MS=800;   // tempo segurando o cartão para marcar 🔎 Procurar no depósito
function bindLP(host,sel){
  let T=null,V=null,p0=null,C=null,At=0,t0=0;
  const cancel=()=>{clearTimeout(T);clearTimeout(V);T=V=null;p0=null;if(C){C.classList.remove('lpress');C=null}};
  const fire=p=>{if(Date.now()-At<900)return;At=Date.now();swBlock=Date.now()+700;toggleDep(p)};   // evita disparar 2× (timer + menu)
  host.addEventListener('touchstart',e=>{cancel();const c=e.target.closest(sel);if(!c||e.touches.length!==1)return;
    p0={x:e.touches[0].clientX,y:e.touches[0].clientY};C=c;t0=Date.now();
    V=setTimeout(()=>{if(C)C.classList.add('lpress')},LP_MS*.45);                       // o card "acende" enquanto segura
    T=setTimeout(()=>{T=null;fire(c.dataset.p)},LP_MS)},{passive:true});
  host.addEventListener('touchmove',e=>{if(!p0)return;const t=e.touches[0];if(Math.abs(t.clientX-p0.x)>10||Math.abs(t.clientY-p0.y)>10)cancel()},{passive:true});   // deslizar/rolar cancela
  host.addEventListener('touchend',cancel,{passive:true});                       // (touchcancel não cancela: o Android manda ao abrir o menu)
  host.addEventListener('contextmenu',e=>{const c=e.target.closest(sel);if(!c)return;e.preventDefault();if(p0&&Date.now()-t0>=LP_MS-40)fire(c.dataset.p)});
}
bindLP($('plist'),'.pedc,.pi');bindLP($('list'),'.p');bindLP($('pf-list'),'.pfc');bindLP($('of-list'),'.pfc');
$('plist').onclick=e=>{if(Date.now()<swBlock)return;
  if(e.target.closest('#hint-x')){hintN=99;try{localStorage.setItem(LSHINT,hintN)}catch{}renderPed();return}
  if(e.target.closest('#pc-dep')){depOnly=!depOnly;renderPed();return}
  if(e.target.closest('#pe-sug')){const f=allRecords.filter(r=>r._sg>0&&!r._d&&!inPed(r.produto));if(!f.length)return toast('Nenhuma sugestão no momento');f.forEach(r=>addPed(r,'',true));savePed();renderPed();return toast(f0(f.length)+' produtos adicionados')}
  if(e.target.closest('#pe-scan'))return $('b-scan2').click();
const c=e.target.closest('.pedc,.pi');if(!c||(c.classList.contains('pedc')&&!e.target.closest('.infb')))return;openSheet(byProd.get(c.dataset.p))};
$('pq').oninput=debounce(e=>{const T=toks(e.target.value);if(!T.length||T.join('').length<2){$('pres').innerHTML='';return}
 let m=allRecords.filter(r=>!inPed(r.produto)&&(r._s=score(r,T))>0);
 if(!m.length&&T.length>1)m=allRecords.filter(r=>!inPed(r.produto)&&(r._s=score(r,T,true))>0);
 m=m.sort((a,b)=>b._s-a._s).slice(0,8);
 $('pres').innerHTML=m.length?'<div class="list list-strong list-dividers inset pres-l"><ul>'+m.map(r=>`<li><a class="item-link item-content pr" data-p="${esc(r.produto)}"><div class="item-media"><i class="pdot" style="--c:${COLOR[r._k]}"></i></div><div class="item-inner"><div class="item-title">${esc(r.descricao)}<div class="item-footer">${esc(r.produto)} · estoque ${f0(r._e)} · ${SLBL[r._k]}</div></div><div class="item-after"><b class="pr-add">+</b></div></div></a></li>`).join('')+'</ul></div>':'<div class="empty">Nenhum produto</div>'},180);
$('pres').onclick=e=>{const c=e.target.closest('.pr');if(!c)return;addS(byProd.get(c.dataset.p));$('pq').value='';$('pres').innerHTML='';renderPed();toast(addMsg(byProd.get(c.dataset.p)))};


/* fornecedor = CÓDIGO · NOME. Planograma tem os dois em colunas separadas (nome mais completo); a Cobertura traz "11582844 HERSHEY DO BRASIL" junto */
function fornTxt(r){
  const x=estoqueLoaded?estoqueMap[r.produto]:null,m=/^(\d+)\s+(.*)$/.exec(String((x&&x.f)||'').trim());
  const cod=String(r.fornec||'').trim()||(m?m[1]:''),nm=(r._np?'':String(r.nome||'').trim())||(m?m[2]:String(r.nome||'').trim());
  return cod&&nm?cod+' · '+nm:cod||nm||'—'}
/* ═══ FICHA DO PRODUTO (folha do Framework7 que sobe de baixo; arraste para baixo para fechar)
   topo: situação + os 5 números principais · meio: entrega e datas (rolável, vazios em "Mais detalhes") · ações SEMPRE visíveis embaixo ═══ */
function openSheet(r){if(!r)return;const kv=([a,b])=>`<div class="kv"><span>${a}</span><span>${b}</span></div>`;
 const vazio=v=>v==='—'||/^—( dias)?$/.test(v);
 const sgk=r._k==='sg';   // sem giro: sem MDV a cobertura não tem sentido
 const prin=[['Cobertura total ((estoque + trânsito) ÷ MDV)',r._ct===null||sgk?'—':(r._ct>999?'+999':f0(Math.max(r._ct,0)))+' dias'],['Cobertura do relatório de Cobertura',r._c999?'999 no relatório (sem cálculo)':r._c===null||sgk?'—':f0(Math.max(r._c,0))+' dias'],
   ['Estoque',f0(r._e)],['Em trânsito',transitLoaded?f0(r._t):'—'],['MDV (relatório de Cobertura)',r._m?f1(r._m):'—'],['Tipo de entrega',entTxt(r)],
   ['Última entrada',esc(dtTxt(r._ue,'sem registro'))],['Última venda',esc(dtTxt(r._uv,'sem venda registrada'))]];
 const alerta=r._k==='nd'&&r._e>0?kv(['Sem MDV','<b style="color:var(--mu)">Vende pouco (MDV 0 no relatório) — sem como calcular a cobertura</b>']):r._k==='sg'?kv(['Sem giro',`<b style="color:var(--sg)">Tem ${f0(r._e)} un em estoque e ${semVendaDias(r)===Infinity?'nenhuma venda registrada':'nenhuma venda há '+f0(semVendaDias(r))+' dias'} — confira se está na gôndola</b>`]):r._sg>0?kv(['💡 Sugestão de pedido',`<b style="color:var(--am)">${sugTxt(r)}</b>`]):r._e<0?(r._t>0?kv(['Estoque negativo','<b style="color:var(--am)">Já em trânsito — aguardando chegada</b>']):isCD(r)?kv(['⚠ Falta no CD','<b style="color:var(--cr)">Estoque negativo — fora da sugestão</b>']):kv(['⚠ Estoque negativo','<b style="color:var(--cr)">Falta pedir o item</b>'])):'';
 const det=[...(r._np?[['Planograma','Fora do planograma']]:[['Cob.Plan',r.cobplan?esc(r.cobplan)+' dias':'—'],['Capacidade (alt × larg × prof)',`${esc(r.altura||'—')} × ${esc(r.largura||'—')} × ${esc(r.prof||'—')} = ${esc(r.total||'—')}`]]),
   ['Corredor',esc(r.corredor||'—')],['Giro',esc(r.giro||'—')],['Embalagem',esc(r.emb||'—')],['Código / EAN',esc(r.produto)+(r.automacao?' · '+esc(r.automacao):'')],['Fornecedor',esc(fornTxt(r))]];
 const mais=[...prin.filter(x=>vazio(x[1])),...det];                          // tudo que é secundário ou está vazio
 const ebx=num(r.emb)||1,tile=(l,v,s,big)=>`<div class="ft${big?' big':''}"><small>${l}</small><b class="num">${v}</b>${s?`<i>${s}</i>`:''}</div>`;
 const tiles=tile('Cobertura total',prin[0][1]==='—'?'—':prin[0][1].replace(' dias',''),prin[0][1]==='—'?'':'dias',true)
   +tile('Relatório (R)',r._c999?'999':prin[1][1]==='—'?'—':prin[1][1].replace(' dias',''),r._c999?'sem cálculo':prin[1][1]==='—'?'':'dias')
   +tile('Estoque',prin[2][1],ebx>1&&r._e>=0?f0(Math.floor(r._e/ebx))+' cx de '+f0(ebx):'un')
   +tile('Trânsito',prin[3][1],transitLoaded&&r._t>0&&ebx>1?f0(Math.floor(r._t/ebx))+' cx':'')
   +tile('MDV',prin[4][1],r._m?'un/dia':'');
 const rows=prin.slice(5).filter(x=>!vazio(x[1]));
 $('sheetc').innerHTML=`<div class="fh" style="--c:${COLOR[r._k]}"><div class="fh-top"><div class="fh-t"><span class="pill">${GLY[r._k]} ${LBL[r._k]}</span><h3>${esc(r.descricao)}</h3><div class="ln">${esc(r.produto)}${r.automacao?' · EAN '+esc(r.automacao):''} · ${esc(short(r.categoria))}</div></div><button class="shx" id="sh-x" type="button" aria-label="Fechar">✕</button></div>
 <div class="fts">${tiles}</div></div>
 <div class="shb page-content">${alerta}${rows.map(kv).join('')}<details class="more"><summary>Mais detalhes ${CHEV}</summary>${mais.map(kv).join('')}</details></div>
 <div class="shf"><button class="button button-fill button-large" id="sh-ped" type="button">${inPed(r.produto)?'🛒 Remover do pedido':'🛒 Adicionar ao pedido'+(r._sg>0?' · '+f0(r._sg)+' un':'')}</button>
  <div class="grid grid-cols-2 grid-gap"><button class="button button-tonal button-large" id="sh-dep" type="button">${depMap[r.produto]?'🔎 Tirar do depósito':'🔎 Depósito'}</button><button class="button button-tonal button-large" id="sh-done" type="button">${r._d?'↩ Desfazer feito':'✓ Marcar feito'}</button></div></div>`;
 shOn('sheet',true);if(!fichaSheet.opened)fichaSheet.open();pushOv('sheet');$('sh-x').onclick=closeSheet;
 $('sh-ped').onclick=()=>{if(inPed(r.produto)){pedido=pedido.filter(x=>x.p!==r.produto);savePed();toast('Removido do pedido')}else{addS(r);toast(addMsg(r))}closeSheet();go(document.querySelector('section.on').id.slice(2))};
 $('sh-dep').onclick=()=>{const v=!depMap[r.produto];setDep(r.produto,v);toast(v?'🔎 Procurar no depósito':'Saiu de "Procurar no depósito"');closeSheet()};
 $('sh-done').onclick=()=>{const marking=!r._d;r._d?doneSet.delete(key(r)):doneSet.add(key(r));r._d=!r._d;lsSave();if(marking)copyEAN(r.automacao||r.produto);closeSheet();go($('s-home').classList.contains('on')?'home':'prod')}}
