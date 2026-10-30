/* Planograma Mobile — PEDIDO: lista, 🔎 depósito, deslizar/segurar cartões e ficha do produto.
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */

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
/* depMap/LSDEP agora são declarados antes de refreshDep (acima) */
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
 $('pban').innerHTML=n||t?`<button class="pban" data-go="ped"><b>🛒 ${n?`${n} ${n>1?'itens':'item'} para pedir`:'Nada para pedir agora'}</b>${t?`<small>${t} aguardando trânsito</small>`:''}</button>`:''}
$('pban').onclick=e=>{if(e.target.closest('[data-go]'))go('ped')};
let depOnly=false;   // filtro "🔎 Procurar no depósito" ligado?
const dropOpen={pnd:true,trd:false,dnd:false};   // lembra quais dropdowns do pedido estão abertos ("Para pedir" já começa aberto)
/* dica de gestos: aparece nas 3 primeiras vezes que o Pedido é aberto (ou até tocar no ✕) */
const LSHINT='planograma_dica_gestos';let hintN=0,hintCounted=false;try{hintN=+localStorage.getItem(LSHINT)||0}catch{}
const hintHtml=()=>hintN<=3?'<div class="hint"><span>Deslize → concluir · ← excluir · segure o cartão = 🔎 depósito</span><button type="button" id="hint-x" aria-label="Fechar dica">✕</button></div>':'';
function renderPed(){
 if(pedido.length&&!hintCounted){hintCounted=true;hintN++;try{localStorage.setItem(LSHINT,hintN)}catch{}}   // conta 1 vez por abertura do app
 const act=pedido.filter(x=>!x.done&&!inTransit(x)),tr=pedido.filter(x=>!x.done&&inTransit(x)),dn=pedido.filter(x=>x.done),n=act.length;
 $('phead').innerHTML=`<div class="t">${n?`${n} ${n>1?'itens':'item'} para pedir`:(pedido.length?'Nada para pedir agora':'Pedido vazio')}</div><div class="s">${tr.length?`${tr.length} aguardando chegada do trânsito`:(pedido.length?'Itens fora do trânsito aparecem na lista abaixo':'Adicione abaixo ou pelo 🛒 nos produtos.')}</div>`;
 const nd=pedido.filter(x=>depMap[x.p]&&!x.done).length;if(depOnly&&!nd)depOnly=false;   // tirou o último: desliga o filtro
 const fl=l=>depOnly?l.filter(x=>depMap[x.p]):l;
 const row0=x=>{const r=byProd.get(x.p),di=depMap[x.p]?'<span class="depi" title="Procurar no depósito">🔎</span>':'';
  if(!r)return `<div class="pi ${x.done?'done':''}${depMap[x.p]?' dep':''}" data-p="${esc(x.p)}"><div class="hd"><div class="nm">${esc(x.d)}</div><div class="acts">${di}</div></div><div class="sb">${esc(x.p)} · fora do planograma carregado</div></div>`;
  return `<div class="p pedc ${x.done?'done':''}${depMap[x.p]?' dep':''}" data-p="${esc(x.p)}" style="--c:${COLOR[r._k]}">${cardBody(r,di,'',true)}</div>`};
 const row=x=>swrap(row0(x),x.done,'del','Excluir','🗑');
 const ord=l=>l.slice().sort((a,b)=>String(a.d||'').localeCompare(String(b.d||'')));
 const drop=(id,title,sub,l)=>l.length?`<details class="trd" id="${id}"${dropOpen[id]?' open':''}><summary><span>${title}<small>${sub}</small></span><span class="cnt">${l.length}</span><svg class="ch" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></summary>${ord(l).map(row).join('')}</details>`:'';
 const trHtml=drop('pnd','📋 Para pedir','Ainda falta pedir',fl(act))+drop('trd','⏳ Aguardando trânsito','Ficam aqui até a mercadoria chegar',fl(tr))+drop('dnd','✓ Concluídos','Deslize → para reabrir',fl(dn));
 const chip=(nd||depOnly)?`<div style="margin-top:6px"><button class="chip ${depOnly?'on':''}" id="pc-dep">🔎 Procurar no depósito (${nd})</button></div>`:'';
 $('plist').innerHTML=pedido.length?hintHtml()+chip+trHtml:'<div class="empty"><p>Sua lista está vazia</p><div class="btns" style="margin-top:14px"><button class="btn" id="pe-sug" style="margin:0">Adicionar sugestões</button><button class="btn o" id="pe-scan" style="margin:0">Ler código</button></div></div>'}
$('plist').addEventListener('toggle',e=>{if(e.target.id in dropOpen)dropOpen[e.target.id]=e.target.open},true);   // lembra se o dropdown está aberto
function swAddPed(r,s){
  if(inPed(r.produto))return toast('Já está no pedido');
  addS(r);s.w.querySelector('.swg.add span').textContent='Já no pedido';{const sb=s.c.querySelector('.sb');if(sb&&!sb.querySelector('.ped'))sb.insertAdjacentHTML('beforeend',' '+PEDBADGE)}toast(addMsg(r))}
/* deslizar o cartão (Produtos, Pedido e Encarte): → conclui · ← pedido (Produtos) / exclui (Pedido) */
let sw0=null,swBlock=0;const SW_T=90;
function swReset(s,anim){
  s.c.style.transition=anim?'transform .22s cubic-bezier(.2,.8,.2,1)':'none';s.c.style.transform='';
  s.w.querySelectorAll('.swg').forEach(g=>{g.style.transition=anim?'width .22s cubic-bezier(.2,.8,.2,1)':'none';g.style.width='0'});
  s.w.classList.remove('armed','sw-on')}
function bindSwipe(host,sel,onEnd){
host.addEventListener('touchstart',e=>{
  const c=e.target.closest(sel),w=c&&c.closest('.swr');
  sw0=w&&e.touches.length===1?{c,w,x:e.touches[0].clientX,y:e.touches[0].clientY,m:null,dx:0,armed:false}:null},{passive:true});
host.addEventListener('touchmove',e=>{
  const s=sw0;if(!s)return;const t=e.touches[0],dx=t.clientX-s.x,dy=t.clientY-s.y;
  if(s.m===null){
    if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
    s.m=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';                          // trava no eixo do 1º movimento (rolar a lista não vira swipe)
    if(s.m==='x'){s.c.style.transition='none';s.w.classList.add('sw-on');s.w.querySelectorAll('.swg').forEach(g=>g.style.transition='none')}}
  if(s.m!=='x')return;
  const ok=s.w.querySelector('.swg.ok'),ot=s.w.querySelector('.swg:not(.ok)'),d=(dx>0&&!ok)||(dx<0&&!ot)?0:dx;   // cartão com ação só de um lado ignora o outro
  s.dx=d;const a=Math.abs(d),k=a>SW_T?SW_T+(a-SW_T)*.35:a;                // depois do limite o cartão "pesa"
  s.c.style.transform=`translateX(${Math.sign(d)*k}px)`;
  if(ok)ok.style.width=d>0?k+'px':'0';
  if(ot)ot.style.width=d<0?k+'px':'0';
  s.w.style.setProperty('--p',Math.min(1,a/SW_T));
  const armed=a>=SW_T;
  if(armed!==s.armed){s.armed=armed;s.w.classList.toggle('armed',armed);if(armed&&navigator.vibrate)navigator.vibrate(8)}
},{passive:true});
host.addEventListener('touchcancel',()=>{if(sw0&&sw0.m==='x')swReset(sw0,true);sw0=null},{passive:true});
host.addEventListener('touchend',()=>{
  const s=sw0;sw0=null;if(!s||s.m!=='x')return;
  swBlock=Date.now()+350;                                                // evita o "clique fantasma" que abriria a ficha
  if(Math.abs(s.dx)<SW_T){swReset(s,true);return}
  onEnd(s)},{passive:true})}
bindSwipe($('plist'),'.pedc,.pi',s=>{
  const x=pedido.find(y=>y.p===s.c.dataset.p);if(!x){swReset(s,true);return}
  if(s.dx>0){                                                            // → concluir: volta suave e alterna
    swReset(s,true);setTimeout(()=>{x.done=!x.done;savePed();renderPed()},200)
  }else{                                                                 // ← excluir: sai da tela, linha recolhe, aparece "Desfazer"
    const W=s.w.offsetWidth,del=s.w.querySelector('.swg.del');
    s.c.style.transition='transform .2s ease-in';s.c.style.transform=`translateX(${-W}px)`;
    del.style.transition='width .2s ease-in';del.style.width=W+'px';
    setTimeout(()=>{s.w.style.height=s.w.offsetHeight+'px';s.w.offsetHeight;s.w.style.transition='height .18s ease,margin-top .18s ease';s.w.style.height='0';s.w.style.marginTop='0'},200);
    setTimeout(()=>{const idx=pedido.indexOf(x);if(idx<0)return;pedido.splice(idx,1);savePed();renderPed();
      toastUndo('Item removido',()=>{pedido.splice(idx,0,x);savePed();renderPed()})},400)}});
bindSwipe($('list'),'.p',s=>{
  swReset(s,true);const r=byProd.get(s.c.dataset.p);if(!r)return;
  if(s.dx>0)return toggleDone(r,s.c);                                    // → concluir / reabrir
  swAddPed(r,s)});                                                       // ← adiciona ao pedido
bindSwipe($('enc-list'),'.p',s=>{swReset(s,true);const r=byProd.get(s.c.dataset.p);if(r&&s.dx<0)swAddPed(r,s)});
const swProd=s=>{swReset(s,true);const r=byProd.get(s.c.dataset.p);if(!r)return;if(s.dx>0)return toggleDone(r,s.c);swAddPed(r,s)};   // Panfleto e Oferta do dia: igual à lista de Produtos
bindSwipe($('pf-list'),'.pfc',swProd);bindSwipe($('of-list'),'.pfc',swProd);   // Encarte: só ← adiciona ao pedido
/* segurar o cartão ~0,8 s (LP_MS) liga/desliga 🔎 (Produtos e Pedido). Android manda "contextmenu" ao segurar; iOS só o timer — por isso os dois */
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
 $('pres').innerHTML=m.map(r=>`<div class="pr" data-p="${esc(r.produto)}"><div>${esc(r.descricao)}<small>${esc(r.produto)} · estoque ${f0(r._e)}</small></div><b>+</b></div>`).join('')||'<div class="empty">Nenhum produto</div>'},180);
$('pres').onclick=e=>{const c=e.target.closest('.pr');if(!c)return;addS(byProd.get(c.dataset.p));$('pq').value='';$('pres').innerHTML='';renderPed();toast(addMsg(byProd.get(c.dataset.p)))};


/* fornecedor = CÓDIGO · NOME. Planograma tem os dois em colunas separadas (nome mais completo); a Cobertura traz "11582844 HERSHEY DO BRASIL" junto */
function fornTxt(r){
  const x=estoqueLoaded?estoqueMap[r.produto]:null,m=/^(\d+)\s+(.*)$/.exec(String((x&&x.f)||'').trim());
  const cod=String(r.fornec||'').trim()||(m?m[1]:''),nm=(r._np?'':String(r.nome||'').trim())||(m?m[2]:String(r.nome||'').trim());
  return cod&&nm?cod+' · '+nm:cod||nm||'—'}
/* FICHA DO PRODUTO — cabeçalho com ✕ · informações roláveis (campos vazios ficam em "Mais detalhes") · ações SEMPRE visíveis embaixo */
function openSheet(r){if(!r)return;const kv=([a,b])=>`<div class="kv"><span>${a}</span><span>${b}</span></div>`;
 const vazio=v=>v==='—'||/^—( dias)?$/.test(v);
 const prin=[['Cobertura total ((estoque + trânsito) ÷ MDV)',r._ct===null?'—':(r._ct>999?'+999':f1(Math.max(r._ct,0)))+' dias'],['Cobertura do relatório de Cobertura',r._c===null?'—':f1(Math.max(r._c,0))+' dias'],
   ['Estoque',f0(r._e)],['Em trânsito',transitLoaded?f0(r._t):'—'],['MDV (relatório de Cobertura)',r._m?f1(r._m):'—'],['Tipo de entrega',entTxt(r)],
   ['Última entrada',esc(dtTxt(r._ue,'sem registro'))],['Última venda',esc(dtTxt(r._uv,'sem venda registrada'))]];
 const alerta=r._sg>0?kv(['💡 Sugestão de pedido',`<b style="color:var(--am)">${sugTxt(r)}</b>`]):r._e<0?(r._t>0?kv(['Estoque negativo','<b style="color:var(--am)">Já em trânsito — aguardando chegada</b>']):isCD(r)?kv(['⚠ Falta no CD','<b style="color:var(--cr)">Estoque negativo — fora da sugestão</b>']):kv(['⚠ Estoque negativo','<b style="color:var(--cr)">Falta pedir o item</b>'])):'';
 const det=[...(r._np?[['Planograma','Fora do planograma']]:[['Cob.Plan',r.cobplan?esc(r.cobplan)+' dias':'—'],['Capacidade (alt × larg × prof)',`${esc(r.altura||'—')} × ${esc(r.largura||'—')} × ${esc(r.prof||'—')} = ${esc(r.total||'—')}`]]),
   ['Corredor',esc(r.corredor||'—')],['Giro',esc(r.giro||'—')],['Embalagem',esc(r.emb||'—')],['Código / EAN',esc(r.produto)+(r.automacao?' · '+esc(r.automacao):'')],['Fornecedor',esc(fornTxt(r))]];
 const mais=[...prin.filter(x=>vazio(x[1])),...det];                          // tudo que é secundário ou está vazio
 $('sheetc').innerHTML=`<div class="shh"><div><h3>${esc(r.descricao)}</h3><div class="ln" style="margin:0"><b style="color:${COLOR[r._k]}">${LBL[r._k]}</b> · ${esc(short(r.categoria))}</div></div><button class="shx" id="sh-x" type="button" aria-label="Fechar">✕</button></div>
 <div class="shb">${alerta}${prin.filter(x=>!vazio(x[1])).map(kv).join('')}<details class="more"><summary>Mais detalhes ▾</summary>${mais.map(kv).join('')}</details></div>
 <div class="shf"><button class="btn" id="sh-ped">${inPed(r.produto)?'🛒 Remover do pedido':'🛒 Adicionar ao pedido'+(r._sg>0?' · '+f0(r._sg)+' un':'')}</button>
  <div class="btns"><button class="btn o" id="sh-dep">${depMap[r.produto]?'🔎 Tirar do depósito':'🔎 Depósito'}</button><button class="btn o" id="sh-done">${r._d?'↩ Desfazer feito':'✓ Marcar feito'}</button></div></div>`;
 $('sheet').classList.add('on');pushOv('sheet');$('sh-x').onclick=closeSheet;
 $('sh-ped').onclick=()=>{if(inPed(r.produto)){pedido=pedido.filter(x=>x.p!==r.produto);savePed();toast('Removido do pedido')}else{addS(r);toast(addMsg(r))}closeSheet();go(document.querySelector('section.on').id.slice(2))};
 $('sh-dep').onclick=()=>{const v=!depMap[r.produto];setDep(r.produto,v);toast(v?'🔎 Procurar no depósito':'Saiu de "Procurar no depósito"');closeSheet()};
 $('sh-done').onclick=()=>{const marking=!r._d;r._d?doneSet.delete(key(r)):doneSet.add(key(r));r._d=!r._d;lsSave();if(marking)copyEAN(r.automacao||r.produto);closeSheet();go($('s-home').classList.contains('on')?'home':'prod')}}
$('sheet').onclick=e=>{if(e.target.id==='sheet')closeSheet()};
