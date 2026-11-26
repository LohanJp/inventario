/* Planograma Mobile — PEDIDO: lista, 🔎 depósito, gestos dos cartões (Framework7 swipeout) e ficha do produto.
   Ordem de carregamento (index.html): framework7 → leitura → estado → base → telas → encarte → oferta → pedido → precos → arquivos → nuvem → historico → ajuda.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa.
   Os dados do pedido (planograma_pedido no aparelho + live/pedido na nuvem) têm o MESMO formato da versão anterior. */

const LSP='planograma_pedido';let pedido=[];try{pedido=JSON.parse(localStorage.getItem(LSP)||'[]')}catch{}
pedido.forEach(x=>{if(!x.added)x.added=ymd0()});function ymd0(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>ymd(new Date()),tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return ymd(d)};
const inPed=p=>pedido.find(x=>x.p===p&&!x.done);
const pedSet=()=>{const s=new Set();for(const x of pedido)if(!x.done)s.add(x.p);return s};   // ⚡ p/ filtrar 9 mil itens: inPed() varre o pedido inteiro a cada item
const inTransit=x=>{const r=byProd.get(x.p);return !!(transitLoaded&&r&&r._t>0)};   // mercadoria a caminho: não dá para pedir até chegar
const pend=()=>pedido.filter(x=>!x.done&&!inTransit(x)&&!x.rcd&&!pedFaltaCD(x));   // ⛔ ruptura no CD não conta como "para pedir"
/* ═══ URGÊNCIA e ⛔ RUPTURA NO CD (nov/2026) — ficam no próprio item do pedido (x.u = 'a' urgente | 'b' baixa · x.rcd = data),
   então vão para a nuvem junto com o pedido. Urgência manda na ordem: urgentes no topo, baixa no fim, em qualquer ordenação. */
const pedItem=p=>pedido.find(x=>x.p===p&&!x.done);
/* ⚠ FALTA NO CD no Pedido (nov/2026): liga sozinho toda vez que você entra no Pedido (go) — os itens que o CD não tem
   (Sist. 1, sem trânsito, abaixo de 40% do cadastro) saem de "Para pedir" e ficam no grupo ⊘ Ruptura CD. */
const pedFaltaCD=x=>{const r=byProd.get(x.p);return !!r&&cdRisk(r)};
/* há quantos dias o item está marcado como ⛔ Ruptura no CD · RCD_VELHO dias sem reconferir → entra no "Para fazer hoje" */
const RCD_VELHO=7;
const rcdDias=x=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(x&&x.rcd||''));if(!m)return 0;const h=new Date();h.setHours(0,0,0,0);return Math.max(0,Math.round((h-new Date(+m[1],+m[2]-1,+m[3]))/864e5))};
const rcdVelhos=()=>pedido.filter(x=>x.rcd&&!x.done&&!inTransit(x)&&rcdDias(x)>=RCD_VELHO).length;
const URG={a:{t:'🔥 Urgente',c:'urg'},b:{t:'⬇ Baixa',c:'baixa'}};
/* ⏳ há quantos dias o item está em trânsito (data anotada pelo app a cada relatório de Trânsito) */
function trTag(r){const n=r?trDias(r):-1;return n<0?'':` <span class="ent trg${n>=TR_ATRASO?' atr':''}" title="Em trânsito desde ${isoBr(trDesde(r))}${n>=TR_ATRASO?' — atrasado':''}">⏳ ${n}d</span>`}
function pedTag(p){const x=pedItem(p);if(!x)return'';
  const d=rcdDias(x);
  return (x.rcd?` <span class="ent rcd" title="Você marcou em ${esc(String(x.rcd).split('-').reverse().join('/'))}: o CD está sem o produto">⛔ CD confirmado${d>0?' · '+d+'d':''}</span>`:'')+(URG[x.u]?` <span class="ent ${URG[x.u].c}">${URG[x.u].t}</span>`:'')+(x.done?'':trTag(byProd.get(p)))}
function setUrg(r,u){let x=pedItem(r.produto);if(!x){if(!u)return;addPed(r,'',true);x=pedItem(r.produto)}
  if(u)x.u=u;else delete x.u;savePed()}
function setRcd(r,v){let x=pedItem(r.produto);if(!x){if(!v)return;addPed(r,'',true);x=pedItem(r.produto)}
  if(v)x.rcd=today();else delete x.rcd;savePed()}
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
/* CONCLUÍDOS DO PEDIDO (nov/2026): antes ficavam para sempre no grupo "✓ Concluídos".
   Agora saem ao carregar o planograma de um DIA NOVO (igual aos feitos de Produtos) e há o botão "Limpar concluídos" no grupo. */
function pedLimpaConcl(){const n=pedido.filter(x=>x.done).length;if(n){pedido=pedido.filter(x=>!x.done);savePed()}return n}
/* ═══ FEITO É UM SÓ (nov/2026, v59): concluir no Pedido e marcar feito em Produtos são a MESMA coisa.
   Qualquer um dos três caminhos (deslizar em Produtos, deslizar no Pedido, botão "Feito" da ficha) passa por aqui e marca/desmarca os dois. */
function setFeito(prod,v){v=!!v;const r=byProd.get(prod);if(r&&!!r._d!==v){v?doneSet.add(key(r)):doneSet.delete(key(r));r._d=v;lsSave()}
  const x=pedido.find(y=>y.p===prod);if(x&&!!x.done!==v){x.done=v;savePed()}}
function addPed(r,q,noSave){if(inPed(r.produto))return false;
  const old=pedido.find(x=>x.p===r.produto&&x.done);   // v83 FEITO É UM SÓ: item concluído que volta ao pedido é REABERTO (mantém urgência/obs.) e deixa de ser feito em todo lugar
  if(old){old.done=false;old.date=tomorrow();if(q)old.q=q}else{pedido=pedido.filter(x=>x.p!==r.produto);pedido.push({p:r.produto,d:r.descricao,q:q||'',date:tomorrow(),added:today(),done:false})}
  if(r._d){doneSet.delete(key(r));r._d=false;lsSave()}
  if(!noSave)savePed();return true}
function renderBan(){const n=pend().length,t=pedido.filter(x=>!x.done&&inTransit(x)).length;
 const rn=typeof code==='function'&&code()?[relNovo.p&&'Planograma',relNovo.c&&'Cobertura',relNovo.t&&'Trânsito'].filter(Boolean):[];   // v65
 $('pban').innerHTML=(rn.length?`<button class="pban pb-nv" data-up="1" type="button"><span class="pb-ic">☁️</span><span class="pb-tx"><b>${rn.join(', ').replace(/, ([^,]*)$/,' e $1')} só neste aparelho</b><small>Toque para enviar para a nuvem — os outros aparelhos ainda não receberam</small></span><span class="pb-go">›</span></button>`:'')+(n||t?`<button class="pban" data-go="ped" type="button"><span class="pb-ic">🛒</span><span class="pb-tx"><b>${n?`${n} ${n>1?'itens':'item'} para pedir`:'Nada para pedir agora'}</b>${t?`<small>${t} aguardando trânsito</small>`:'<small>Toque para abrir o pedido</small>'}</span><span class="pb-go">›</span></button>`:'')}
$('pban').onclick=e=>{if(e.target.closest('[data-up]'))return $('b-up').click();if(e.target.closest('[data-go]'))go('ped')};
/* ordem da lista do pedido (vale para Para pedir · Aguardando trânsito · Concluídos) — lembrada no aparelho */
const PED_ORD=[['nome','Nome A–Z'],['cob_a','Menor cobertura'],['cob_d','Maior cobertura'],['mdv_d','Maior MDV'],['mdv_a','Menor MDV']];
let pedSort='nome';try{const v=localStorage.getItem('planograma_pedsort');if(PED_ORD.some(o=>o[0]===v))pedSort=v}catch{}
const fOpen={};let pedGB={};   // v69: fornecedores abertos/fechados (Sist. 20) · corpo dos grupos montado só quando abre
const dropOpen={p20:true,pnd:true,trd:false,rup:false,dnd:false};   // lembra quais grupos do pedido estão abertos ("Para pedir" já começa aberto)
/* dica de gestos: aparece nas 3 primeiras vezes que o Pedido é aberto (ou até tocar no ✕) */
const LSHINT='planograma_dica_gestos';let hintN=0,hintCounted=false;try{hintN=+localStorage.getItem(LSHINT)||0}catch{}
const hintHtml=()=>hintN<=3?'<div class="hint"><span>👉 Deslize → concluir · 👈 excluir ou 🔎 depósito · <button type="button" class="lnk" data-aj="gestos">ver todos os gestos</button></span><button type="button" id="hint-x" aria-label="Fechar dica">✕</button></div>':'';
const CHEV='<svg class="ch" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
function renderPed(){if(abrindo)return;   // v72: sem o relatório os cartões apareceriam como "fora do planograma"

 /* ⛔ Ruptura no CD acaba quando o CD manda: apareceu trânsito → tira a marca (o item segue o caminho normal: trânsito → para pedir/concluir) */
 {let mud=false;for(const x of pedido)if(x.rcd&&!x.done&&inTransit(x)){delete x.rcd;mud=true}if(mud)savePed()}
 updBadge();renderBan();   // badge e faixa acompanham a chave de falta no CD
 if(pedido.length&&!hintCounted){hintCounted=true;hintN++;try{localStorage.setItem(LSHINT,hintN)}catch{}}   // conta 1 vez por abertura do app
 const act0=pedido.filter(x=>!x.done&&!inTransit(x)&&!x.rcd),fcd=act0.filter(pedFaltaCD),act=act0.filter(x=>!pedFaltaCD(x)),
   tr=pedido.filter(x=>!x.done&&inTransit(x)),rc=pedido.filter(x=>!x.done&&!inTransit(x)&&x.rcd),dn=pedido.filter(x=>x.done),n=act.length;
 $('phead').innerHTML=(pedido.length?'':'<div class="ph-vz"><b>Pedido vazio</b> — adicione abaixo ou pelo 🛒 nos produtos.</div>')   // v73: sem a linha grande que repetia os números de baixo
  +(pedido.length?`<div class="ph-st">${rc.length+fcd.length?`<span><b class="num">${n}</b> pedir</span><span><b class="num">${tr.length}</b> trânsito</span><span><b class="num">${rc.length+fcd.length}</b> rupt. CD</span><span><b class="num">${dn.length}</b> feitos</span>`:`<span><b class="num">${n}</b> para pedir</span><span><b class="num">${tr.length}</b> em trânsito</span><span><b class="num">${dn.length}</b> concluídos</span>`}</div>`:'');
 const row0=x=>{const r=byProd.get(x.p),di=depMap[x.p]?DEPI:'';
  if(!r)return `<div class="pi ${x.done?'done':''}${depMap[x.p]?' dep':''}" data-p="${esc(x.p)}"><div class="hd"><div class="nm">${esc(x.d)}</div><div class="acts">${di}</div></div><div class="sb">${esc(x.p)} · fora do planograma carregado</div></div>`;
  return `<div class="p pedc ${x.done?'done':''}${depMap[x.p]?' dep':''}" data-p="${esc(x.p)}" style="--c:${COLOR[r._k]}">${cardBody(r,di,'',true)}</div>`};
 const row=x=>swrap(row0(x),x.done,'del','Excluir','🗑',x.p);
 const nome=(a,b)=>String(a.d||'').localeCompare(String(b.d||'')),R=x=>byProd.get(x.p);
 const cob=x=>{const r=R(x);return r&&r._ct!==null&&r._k!=='sg'?Math.max(r._ct,0):null},mdv=x=>{const r=R(x);return r&&r._m?r._m:null};
 const by=(f,dir)=>(a,b)=>{const va=f(a),vb=f(b);if(va===null||vb===null)return(va===null)-(vb===null)||nome(a,b);return(va-vb)*dir||nome(a,b)};   // sem número vai pro fim
 const ORD={nome,cob_a:by(cob,1),cob_d:by(cob,-1),mdv_d:by(mdv,-1),mdv_a:by(mdv,1)};
 const UO=x=>x.u==='a'?0:x.u==='b'?2:1;   // urgência primeiro, depois a ordenação escolhida
 const ord=l=>l.slice().sort((a,b)=>UO(a)-UO(b)||(ORD[pedSort]||nome)(a,b));
 /* v69: grupo fechado não monta os cartões (abre na hora, no toque) · título lido com pausas pelo leitor de tela */
 pedGB={};
 const det=(g,attr,open,title,sub,n,body,cls='')=>{pedGB[g]=body;return `<details class="trd${cls}" ${attr}${open?' open':''}><summary><span>${title}<small><span class="vh">, </span>${sub}</small></span><span class="cnt"><span class="vh">, </span>${n}<span class="vh"> ${n>1?'itens':'item'}</span></span>${CHEV}</summary><div class="trd-b" data-g="${esc(g)}">${open?body():''}</div></details>`};
 const drop=(id,title,sub,l,topo='')=>l.length?det(id,`id="${id}"`,dropOpen[id],title,sub,l.length,()=>topo+ord(l).map(row).join('')):'';
 /* v69 PARA PEDIR separado: Sist. 20 (direto ao fornecedor, um subgrupo por fornecedor) × Sist. 1 (pedido ao CD; inclui Sist. 10 e quem não tem sistemática) */
 const R20=x=>{const r=byProd.get(x.p);return !!r&&r._sist==='20'},A=act,a20=A.filter(R20),a1=A.filter(x=>!R20(x)),n10=a1.filter(x=>{const r=byProd.get(x.p);return r&&r._sist==='10'}).length;
 const G=new Map();for(const x of a20){const r=byProd.get(x.p),k=fgKey(r);let g=G.get(k);if(!g){g={k,o:k?fgMini(r):null,l:[]};G.set(k,g)}g.l.push(x)}
 const GA=[...G.values()].sort((a,b)=>!a.o-!b.o||fgTit(a.o).localeCompare(fgTit(b.o)));   // ordem fixa A–Z: concluir um item não troca os fornecedores de lugar
 const sub=g=>{const u=g.l.filter(x=>x.u==='a').length;return det('f:'+g.k,`data-fk="${esc(g.k)}"`,fOpen[g.k]!==false,esc(fgTit(g.o)),esc(fgCod(g.o))+(u?` · 🔥 ${u} urgente${u>1?'s':''}`:''),g.l.length,()=>ord(g.l).map(row).join(''),' trf')};
 const p20=a20.length?det('p20','id="p20"',dropOpen.p20,'📞 Para pedir · Sist. 20','Direto ao fornecedor · '+(GA.length>1?GA.length+' fornecedores':esc(fgTit(GA[0].o))),a20.length,()=>GA.length>1?GA.map(sub).join(''):ord(a20).map(row).join('')):'';
 const trHtml=p20+drop('pnd',a20.length?'📋 Para pedir · Sist. 1':'📋 Para pedir',(a20.length?'Pedido ao CD':'Ainda falta pedir')+(n10?` · inclui ${n10} da Sist. 10`:''),a1)+drop('trd','⏳ Aguardando trânsito','Ficam aqui até a mercadoria chegar',tr)+drop('rup','⊘ Ruptura CD',(()=>{   // v74 (Lohan): um grupo só com TODAS as rupturas de CD — as automáticas e as que você confirmou; a Ruptura loja continua em "Para pedir"
    const v=rc.filter(x=>rcdDias(x)>=RCD_VELHO).length;
    return 'O CD não tem — fora de "Para pedir"'+(rc.length?` · ${rc.length} confirmada${rc.length>1?'s':''} por você`+(v?` (${v} há ${RCD_VELHO}+ dias: reconfira)`:''):'')})(),[...rc,...fcd])+drop('dnd','✓ Concluídos','Deslize → para reabrir · saem sozinhos ao carregar o planograma de um dia novo',dn,`<button class="button button-small button-tonal dn-clr" id="pc-clr" type="button">🗑 Limpar ${dn.length} concluído${dn.length>1?'s':''}</button>`);
 const sortBar=`<div class="row2 pedsort"><label class="chip-btn chip-sel ps-sel"><svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/></svg><select id="ped-sort" aria-label="Ordenar lista de pedido">${PED_ORD.map(([v,t])=>`<option value="${v}"${v===pedSort?' selected':''}>${t}</option>`).join('')}</select></label></div>`;
 /* v69: segura na tela o cartão que estava em cima — sem isso a lista "pula" ao concluir/excluir (os cartões fora da tela não têm altura medida) */
 /* mede só os cartões que estão na tela (medir um cartão fora da tela obrigaria o navegador a montá-lo — é o que o content-visibility evita) */
 const SP=$('s-ped');let ancs=[];if(curTab==='ped'&&SP.scrollTop>0){const b=SP.getBoundingClientRect(),hx=b.left+b.width/2;
  for(let y=b.top+90;y<b.top+500;y+=40){const a=document.elementFromPoint(hx,y),c=a&&a.closest('#plist [data-p]');
   if(c){const L=[...$('plist').querySelectorAll('[data-p]')],i=L.indexOf(c);ancs=L.slice(i,i+6).map(x=>[x.dataset.p,x.getBoundingClientRect().top]);break}}}
 $('plist').innerHTML=pedido.length?hintHtml()+sortBar+trHtml:'<div class="empty"><div class="em-ic">🛒</div><p>Sua lista está vazia</p><p class="ln">Busque um produto acima ou adicione pela ficha, na aba Produtos.</p><div style="margin-top:14px"><button class="button button-fill button-large" id="pe-scan" type="button">Ler código</button></div></div>'
 for(const [p,t] of ancs){const c=$('plist').querySelector(`[data-p="${CSS.escape(p)}"]`);if(c&&c.offsetParent){SP.scrollTop+=c.getBoundingClientRect().top-t;break}}}
$('plist').addEventListener('change',e=>{if(e.target.id!=='ped-sort')return;pedSort=e.target.value;try{localStorage.setItem('planograma_pedsort',pedSort)}catch{}renderPed()});
$('plist').addEventListener('toggle',e=>{const d=e.target;if(d.id in dropOpen)dropOpen[d.id]=d.open;else if(d.dataset&&d.dataset.fk)fOpen[d.dataset.fk]=d.open;
  const b=d.open&&d.querySelector(':scope>.trd-b');if(b&&!b.childElementCount&&pedGB[b.dataset.g])b.innerHTML=pedGB[b.dataset.g]()},true);   // aberto por outro caminho (Ctrl+F, leitor de tela): monta também   // lembra se o grupo está aberto
$('plist').addEventListener('click',e=>{const s=e.target.closest('summary');if(!s)return;const d=s.parentElement,b=d&&d.querySelector(':scope>.trd-b');   // v69: monta os cartões ANTES de abrir (sem piscar vazio)
  if(d&&!d.open&&b&&!b.childElementCount){const f=pedGB[b.dataset.g];if(f)b.innerHTML=f()}},true);   // lembra se o grupo está aberto
function swAddPed(r,li,c){
  if(inPed(r.produto))return toast('Já está no pedido');
  addS(r);const sp=li&&li.querySelector('[data-sw=add] span');if(sp)sp.textContent='Já no pedido';
  if(c&&!c.querySelector('.ent.ped')){const sb=c.querySelector('.sb');if(sb){const e1=sb.querySelector('.ent');if(e1)e1.insertAdjacentHTML('afterend',' '+PEDBADGE);else sb.insertAdjacentHTML('beforeend',' '+PEDBADGE)}}   // 🛒 logo depois do selo CD
  toastUndo(addMsg(r),()=>{const i=pedido.findIndex(y=>y.p===r.produto&&!y.done);if(i<0)return;pedido.splice(i,1);savePed();if(sp&&sp.isConnected)sp.textContent='Pedido';const b=c&&c.querySelector('.ent.ped');if(b)b.remove();updBadge();const s=document.querySelector('section.on');if(s&&s.id==='s-home')renderHome()})}   // v84: Desfazer também aqui (a ajuda promete em todos os gestos)
/* ═══ GESTOS (Framework7 swipeout) — Produtos, Pedido, Encarte, Panfleto e Oferta do dia ═══
   → concluir / reabrir · ← pedido (Produtos e anexos) ou excluir (Pedido) + 🔎 depósito em todas. Arrastar até o fim já executa a ação. */
let swBlock=0;
app.on('swipeoutOpen swipeoutOpened',()=>{swBlock=Date.now()+350});      // evita o "clique fantasma" que abriria a ficha
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-sw]');if(!a)return;e.preventDefault();
  const li=a.closest('.swipeout'),c=li&&li.querySelector('.swipeout-content>[data-p]');if(!c)return;
  swBlock=Date.now()+350;const act=a.dataset.sw;
  if(act==='dep'){app.swipeout.close(li);const p=c.dataset.p;setTimeout(()=>{toggleDep(p);   // v75: 🔎 Depósito no deslizar ← (todas as telas)
    const v=!!depMap[p];c.classList.toggle('dep',v);if(a.isConnected){a.innerHTML=swDep(v);a.classList.toggle('on',v)}
    const ac=c.querySelector('.acts'),di=c.querySelector('.depi');if(v&&!di&&ac)ac.insertAdjacentHTML('afterbegin',DEPI);else if(!v&&di)di.remove();   // v83: o 🔎 também nas telas que não redesenham
    if(li.closest('#h-top'))renderHome()},260);return}   // telas que não redesenham (Resumo, Encarte)
  if(li.closest('#plist')){                                              // PEDIDO
    const x=pedido.find(y=>y.p===c.dataset.p);if(!x){app.swipeout.close(li);return}
    if(act==='ok'){app.swipeout.close(li);setTimeout(()=>{const v=!x.done,r=byProd.get(x.p),nm=r?r.descricao:x.p;setFeito(x.p,v);renderPed();   // → concluir: volta suave e alterna
      toastUndo((v?'✓ Feito · ':'↩ Reaberto · ')+nm,()=>{setFeito(x.p,!v);renderPed()})},260)}   // v73: aviso com Desfazer (como o excluir)
    else if(act==='del'){app.swipeout.delete(li,()=>{const idx=pedido.indexOf(x);if(idx<0)return;pedido.splice(idx,1);savePed();renderPed();   // ← excluir: sai da tela e aparece "Desfazer"
      toastUndo('Item removido',()=>{if(pedido.some(y=>y.p===x.p))return;pedido.splice(Math.min(idx,pedido.length),0,x);savePed();renderPed()})})}   // v84: se o item já voltou (outro aparelho/leitor), não duplica
    return}
  const r=byProd.get(c.dataset.p);app.swipeout.close(li);if(!r)return;   // PRODUTOS / ANEXOS
  if(act==='ok')toggleDone(r,c);else if(act==='add')swAddPed(r,li,c);
  if(li.closest('#h-top'))setTimeout(renderHome,280)});   // v83: Mais vendidos em risco — a faixa e o "Para fazer hoje" acompanham
$('plist').onclick=e=>{if(Date.now()<swBlock)return;
  if(e.target.closest('#hint-x')){hintN=99;try{localStorage.setItem(LSHINT,hintN)}catch{}renderPed();return}
  if(e.target.closest('#pc-clr')){const antes=pedido.slice(),n=pedLimpaConcl();renderPed();
    if(n)toastUndo(`${n} concluído${n>1?'s':''} removido${n>1?'s':''} do pedido`,()=>{const tem=new Set(pedido.map(x=>x.p));pedido=[...pedido,...antes.filter(x=>x.done&&!tem.has(x.p))];savePed();renderPed()});return}
  if(e.target.closest('#pe-scan'))return $('b-scan2').click();
const c=e.target.closest('.pedc,.pi');if(!c||(c.classList.contains('pedc')&&!e.target.closest('.infb')))return;openSheet(byProd.get(c.dataset.p))};
$('pq').oninput=debounce(e=>{const T=toks(e.target.value);if(!T.length||T.join('').length<2){$('pres').innerHTML='';return}
 const P=pedSet();let m=allRecords.filter(r=>!P.has(r.produto)&&(r._s=score(r,T))>0);
 if(!m.length&&T.length>1)m=allRecords.filter(r=>!P.has(r.produto)&&(r._s=score(r,T,true))>0);
 m=m.sort((a,b)=>b._s-a._s).slice(0,8);
 $('pres').innerHTML=m.length?'<div class="list list-strong list-dividers inset pres-l"><ul>'+m.map(r=>`<li><a class="item-link item-content pr" data-p="${esc(r.produto)}"><div class="item-media"><i class="pdot" style="--c:${COLOR[r._k]}"></i></div><div class="item-inner"><div class="item-title">${esc(r.descricao)}<div class="item-footer">${esc(r.produto)} · estoque ${f0(r._e)} · ${sitLbl(r)}</div></div><div class="item-after"><b class="pr-add">+</b></div></div></a></li>`).join('')+'</ul></div>':'<div class="empty">Nenhum produto</div>'},180);
$('pres').onclick=e=>{const c=e.target.closest('.pr');if(!c)return;addS(byProd.get(c.dataset.p));$('pq').value='';$('pres').innerHTML='';renderPed();toast(addMsg(byProd.get(c.dataset.p)))};


/* fornecedor = CÓDIGO · NOME. Planograma tem os dois em colunas separadas (nome mais completo); a Cobertura traz "11582844 HERSHEY DO BRASIL" junto */
function fornTxt(r){
  const x=estoqueLoaded?estoqueMap[r.produto]:null,m=/^(\d+)\s+(.*)$/.exec(String((x&&x.f)||'').trim());
  const cod=String(r.fornec||'').trim()||(m?m[1]:''),nm=(r._np?'':String(r.nome||'').trim())||(m?m[2]:String(r.nome||'').trim());
  return cod&&nm?cod+' · '+nm:cod||nm||'—'}
/* ═══ FICHA DO PRODUTO (folha do Framework7 que sobe de baixo; arraste para baixo para fechar)
   topo: situação + os 5 números principais · meio: entrega e datas (rolável, vazios em "Mais detalhes") · ações SEMPRE visíveis embaixo ═══ */
let fichaR=null;   // v74: a ficha aberta (a ajuda volta para ela)
function openSheet(r){if(!r)return;fichaR=r;const kv=([a,b])=>`<div class="kv"><span>${a}</span><span>${b}</span></div>`;
 /* ═══ FICHA "MISTA" (nov/2026, v59): faixa na cor da situação com os dias de cobertura + 3 abas.
      Resumo    → selos, aviso, barra do cadastro do planograma, Estoque e MDV em destaque, blocos menores
      Movimento → linha do tempo (última entrada/venda, hoje, quando acaba) e as datas
      Cadastro  → código, categoria, planograma, fornecedor, preço
    Os botões (pedido, urgência, Ruptura no CD, depósito, feito) ficam sempre visíveis embaixo.
    ⚠ Os 3 números do planograma (ex.: 1×91×24) NÃO são espaço físico: são o cadastro (… × caixas × itens por caixa). ═══ */
 const sgk=r._k==='sg',ebx=num(r.emb)||1,x0=pedItem(r.produto)||{},cap=r._np?0:capOf(r);
 const cx=n=>ebx>1&&n>=ebx?` · ${f0(Math.floor(n/ebx))} cx`:'';
 const ctTxt=r._ct===null||sgk?'—':(r._ct>999?'+999':f0(Math.max(r._ct,0))),rcTxt=r._c999?'999':r._c===null||sgk?'':f0(Math.max(r._c,0));
 const sub=`${GLY[r._k]} ${sitLbl(r)}`+(sgk?(semVendaDias(r)===Infinity?' · sem venda registrada':` · sem venda há ${f0(semVendaDias(r))} dias`):rcTxt&&r._m>0&&(r._c999||r._c!==r._ct)?` · relatório diz ${rcTxt}${r._c999?' (sem cálculo)':rcTxt==='1'?' dia':' dias'}`:'');   // v74: só quando difere
 /* —— Resumo —— */
 const neg=r._e<0?(r._t>0?'<span class="ent">▼ negativo</span>':''):'';
 const selos=[r._sist?`<span class="ent e${esc(r._sist)}">${esc(ENT[r._sist]||'Sist. '+r._sist)} · sist. ${esc(r._sist)}</span>`:'',r.giro?`<span class="ent">Giro ${esc(r.giro)}</span>`:'',inPed(r.produto)?PEDBADGE:'',pedTag(r.produto),axBadges(r),neg,r._d?'<span class="ent">✓ feito</span>':''].filter(Boolean).join(' ');
 const aviso=(t,c,m)=>`<div class="fnote" style="--c:${c}"><b>${t}</b> ${m}</div>`;
 const sS=trReg.saiu[r.produto];
 const alerta=(r._k==='nd'&&r._e>0?aviso('Sem MDV.','var(--mu)','Vende pouco (MDV 0 no relatório) — sem como calcular a cobertura.')
   :sgk?aviso('Sem giro.','var(--sg)',`Tem ${f0(r._e)} un em estoque e ${semVendaDias(r)===Infinity?'nenhuma venda registrada':'nenhuma venda há '+f0(semVendaDias(r))+' dias'} — confira se está na gôndola.`)
   :cdRisk(r)?aviso(r._vir?'⚠ Conferir estoque.':'Ruptura CD.','var(--rcd)',`${cap>0?'Menos de 40% do cadastro':'Estoque zerado'} e nada a caminho${r._vir?' — pela cobertura estaria Saudável (MDV baixo), pode ser estoque virtual':''}${x0.rcd?` — você confirmou a Ruptura CD em ${isoBr(x0.rcd)}`:''}.`)
   :r._e<0?(r._t>0?aviso('Estoque negativo.','var(--am)','Já em trânsito — aguardando chegada.'):aviso('Estoque negativo.','var(--cr)','Falta pedir o item.')):'')
   +(sS&&trSumiu(r)?aviso('Saiu do trânsito','var(--am)',`em ${isoBr(sS.d)}, sem entrada no estoque — ${f0(sS.q)} un estavam a caminho desde ${isoBr(sS.desde)}. <button type="button" class="lnk" id="sh-trok">já conferi ✓</button>`):'');
 /* v74: explica as duas coberturas numa linha (antes "R:" e "relatório diz" apareciam sem explicação) */
 const dd=t=>t+(t==='1'?' dia':' dias');
const tP0=r=>transitLoaded&&r._t>0;
 const cobExp=sgk?'':!(r._m>0)?'<div class="fcob"><b>Sem MDV</b>: sem venda média no relatório, não dá para calcular a cobertura</div>':ctTxt==='—'?'':`<div class="fcob"><b>Cobertura ${dd(ctTxt)}</b> = (estoque${tP0(r)?' + trânsito':''}) ÷ MDV${rcTxt?(r._c999?' · o relatório veio <b>999</b> (sem cálculo)':r._c!==r._ct?` · <b>Relatório ${dd(rcTxt)}</b> = só o estoque, pela conta do sistema`:' · igual ao relatório'):''}</div>`;
 const eP=Math.max(r._e,0),tP=transitLoaded?Math.max(r._t,0):0;
 const barra=cap>0?(()=>{const pe=Math.min(100,eP/cap*100),pt=Math.min(100-pe,tP/cap*100);
   return `<div class="fbar"><div class="fbar-h"><span>Cadastro do planograma · ${esc(r.altura||'—')}×${esc(r.largura||'—')}×${esc(r.prof||'—')}</span><b class="num">${f0(Math.round((eP+tP)/cap*100))}% do cadastrado</b></div>
    <div class="fbar-t" role="img" aria-label="Estoque ${f0(r._e)} e trânsito ${f0(tP)} de ${f0(cap)} cadastrados"><i style="width:${pe.toFixed(1)}%"></i><i class="tr" style="width:${pt.toFixed(1)}%"></i></div>
    <div class="fbar-l"><span><i></i>Estoque ${f0(r._e)}</span>${transitLoaded?`<span><i class="tr"></i>Trânsito ${f0(tP)}</span>`:''}<span class="r">cadastrado: ${ebx>1?f0(Math.floor(cap/ebx))+' cx · ':''}${f0(cap)} un</span></div></div>`})():'';
 const tl=(l,v,s,c)=>`<div class="ft"><small>${l}</small><b class="num"${c?` style="color:${c}"`:''}>${v}</b><i>${s||'&nbsp;'}</i></div>`;
 const ref=dmy(estoqueMeta&&estoqueMeta.date)||dmy(currentMeta.date)||new Date(),mais_=n=>{const d=new Date(ref);d.setDate(d.getDate()+n);return d},dm=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
 const soE=r._m>0&&eP>0?Math.floor(eP/r._m):null;                      // dias que SÓ o estoque dura (sem contar o trânsito)
 const pr=typeof precoDe==='function'?precoDe(r):null;
 const peq=[transitLoaded?tl('Trânsito',f0(tP)+' un',tP>0?(ebx>1?f0(Math.floor(tP/ebx))+' cx a caminho':'a caminho')+(trDias(r)>=0?' · '+trDiasTxt(trDias(r)):''):'nada a caminho',tP>0?'var(--tr2)':''):'',
   tP>0&&soE!==null?tl('Só o estoque dura',soE===1?'1 dia':f0(soE)+' dias','acaba em '+dm(mais_(soE)),soE<7?'var(--cr)':''):'',   // v74: a cobertura do relatório agora está na linha que explica as duas (não repete aqui)
   pr&&pr.n?tl('Preço',prcFmt(pr.n),pr.c?'Clube '+prcFmt(pr.c):'sem preço de Clube'):'',
   dmy(r._ue)?(()=>{const hj=new Date();hj.setHours(0,0,0,0);const n=Math.max(0,Math.round((hj-dmy(r._ue))/864e5));return tl('Última entrada',n===0?'hoje':n===1?'há 1 dia':'há '+f0(n)+' dias',esc(r._ue),n>30?'var(--am)':'')})():cap>0?tl('Cadastrado',ebx>1?f0(Math.floor(cap/ebx))+' cx':f0(cap)+' un',`${esc(r.altura)}×${esc(r.largura)}×${esc(r.prof)} = ${f0(cap)} un`):r._np?tl('Planograma','fora','sem cadastro'):''].filter(Boolean).join('');
 const resumo=`${selos?`<div class="fsel">${selos}</div>`:''}${alerta}${cobExp}${barra}
   <div class="fbig"><div class="ft"><small>Estoque</small><b class="num"${r._e<0?' style="color:var(--cr)"':''}>${f0(r._e)}</b><i>un${ebx>1&&r._e>=0?(r._e<ebx?` · menos de 1 cx de ${f0(ebx)}`:` · ${f0(Math.floor(r._e/ebx))} cx de ${f0(ebx)}`):''}</i></div><div class="ft"><small>MDV</small><b class="num">${r._m?f1(r._m):'—'}</b><i>${r._m?'un por dia':'sem MDV no relatório'}</i></div></div>
   ${peq?`<div class="fpeq">${peq}</div>`:''}${pr&&pr.promo?`<div class="ln fpromo">Promoção Clube: ${esc(pr.promo)}</div>`:''}<button type="button" class="lnk f-aj" data-aj="num">Como ler esta ficha</button>`;
 /* —— Movimento —— */
 const hojeD=new Date();hojeD.setHours(0,0,0,0);const refHoje=Math.abs(ref-hojeD)<864e5/2;
 const nos=[];{const ue=dmy(r._ue),uv=dmy(r._uv),td=trDesde(r);
   if(ue)nos.push([ue,'última entrada','var(--mu)',1]);if(uv)nos.push([uv,'última venda','var(--mu)',1]);
   if(td){const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(td);if(m)nos.push([new Date(+m[1],+m[2]-1,+m[3]),'entrou em trânsito','var(--tr2)',1])}
   if(x0.rcd){const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(x0.rcd);if(m)nos.push([new Date(+m[1],+m[2]-1,+m[3]),'Rupt. CD confirmada','var(--cr)',1])}
   nos.sort((a,b)=>a[0]-b[0]);while(nos.length>3)nos.shift();
   nos.push([ref,refHoje?'hoje':'relatório','var(--f7-theme-color)',1]);
   if(soE!==null&&!sgk){nos.push([mais_(soE),tP>0?'só o estoque acaba':'estoque acaba',soE<7?'var(--cr)':'var(--mu)',0]);
     if(tP>0&&r._ct!==null&&r._ct<=999&&Math.floor(r._ct)>soE)nos.push([mais_(Math.floor(r._ct)),'com o trânsito','var(--crit)',0])}}
 const linha=`<div class="ftl"><small>Linha do tempo</small><div class="ftl-r">${nos.map(([d,t,c,f])=>`<div class="ftl-n"><i style="border-color:${c};${f?'background:'+c:''}"></i><b class="num">${dm(d)}</b><span>${t}</span></div>`).join('')}</div></div>`;
 const mov=[transitLoaded?['Em trânsito',tP>0?`${f0(tP)} un${cx(tP)}`:'nada a caminho']:null,
   trDias(r)>=0?['Em trânsito desde',`${isoBr(trDesde(r))} · ${trDiasTxt(trDias(r))}${trDias(r)>=TR_ATRASO?' · <b style="color:var(--am)">atrasado</b>':''}`]:null,
   ['Última entrada',esc(dtTxt(r._ue,'sem registro'))],['Última venda',esc(dtTxt(r._uv,'sem venda registrada'))],
   ['Cobertura total (com o trânsito)',ctTxt==='—'?'—':ctTxt+' dias'],['Cobertura do relatório',r._c999?'999 no relatório (sem cálculo)':rcTxt?rcTxt+' dias':'—'],
   ['Entrega',entTxt(r)],x0.rcd?['Ruptura CD confirmada',`em ${isoBr(x0.rcd)}${rcdDias(x0)>0?' · há '+rcdDias(x0)+' dia'+(rcdDias(x0)>1?'s':''):''}`]:null].filter(Boolean);
 /* —— Cadastro —— */
 const cad=[['Código · EAN',esc(r.produto)+(r.automacao?' · '+esc(r.automacao):'')],['Categoria',esc(String(r.categoria||'Sem categoria').split('->').join(' › '))],
   r._np?['Planograma','Fora do planograma']:['Planograma (cadastro)',`${esc(r.altura||'—')} × ${esc(r.largura||'—')} × ${esc(r.prof||'—')} = ${esc(r.total||f0(cap))} un`],
   r._np?null:['Cob.Plan',r.cobplan?esc(r.cobplan)+' dias':'—'],['Embalagem · Giro',`caixa com ${f0(ebx)} · ${esc(r.giro||'—')}`],r.corredor&&r.corredor!=='0'?['Corredor',esc(r.corredor)]:null,
   ['Fornecedor',fgKey(r)?`<button type="button" class="kv-lnk" data-fg="${esc(r._fk)}" aria-label="Ver todos os itens de ${esc(fgTit(fgMini(r)))}">${esc(fornTxt(r))} ›</button>`:esc(fornTxt(r))],pr&&(pr.n||pr.promo)?['Preço',precoHtml(r)]:null,axBadges(r)?['Anexos',axBadges(r)]:null].filter(Boolean);
 const TABS=[['res','Resumo',resumo],['mov','Movimento',linha+mov.map(kv).join('')],['cad','Cadastro',cad.map(kv).join('')],['hist','Histórico','']];   // v77: Histórico só carrega ao tocar
 const rcdBtn=(isCD(r)&&!(transitLoaded&&r._t>0))||x0.rcd,   // v83: só Sist. 1 sem trânsito (decisão do Lohan); já confirmado continua podendo desconfirmar
      rcdVelho=x0.rcd&&rcdDias(x0)>0;
 $('sheetc').innerHTML=`<div class="fb" style="--c:${COLOR[r._k]}"><div class="fb-n"><b class="num">${ctTxt}</b><small>${ctTxt==='—'?'&nbsp;':ctTxt==='1'?'dia':'dias'}</small></div>
   <div class="fb-t"><span class="fb-s">${sub}</span><h3>${esc(r.descricao)}</h3><span class="fb-c">${esc(r.produto)}${r.automacao?' · EAN '+esc(r.automacao):''}</span></div>
   <button class="shx" id="sh-x" type="button" aria-label="Fechar">✕</button></div>
 <div class="ftabs" role="tablist">${TABS.map(([k,t],i)=>`<button type="button" role="tab" id="ft-${k}" data-ft="${k}" aria-selected="${i===0}" aria-controls="fp-${k}" class="${i===0?'on':''}">${t}</button>`).join('')}</div>
 <div class="shb page-content">${TABS.map(([k,,h],i)=>`<div class="fpane" role="tabpanel" id="fp-${k}" aria-labelledby="ft-${k}"${i?' hidden':''}>${h}</div>`).join('')}</div>
 <div class="shf"><button class="button button-fill button-large" id="sh-ped" type="button">${inPed(r.produto)?'🛒 Remover do pedido':'🛒 Adicionar ao pedido'}</button>
  <div class="shu"><span>Urgência</span><div class="fs-seg shu-seg">${[['a','🔥 Urgente'],['','Normal'],['b','⬇ Baixa']].map(([v,l])=>`<button type="button" data-u="${v}" class="${(x0.u||'')===v?'on':''}">${l}</button>`).join('')}</div></div>
  ${rcdBtn&&rcdVelho?`<div class="grid grid-cols-2 grid-gap"><button class="button button-tonal button-large shr on" id="sh-rcd" type="button">↩ Desconfirmar</button><button class="button button-tonal button-large" id="sh-rcd2" type="button" title="Marcado há ${rcdDias(x0)} dia(s). Conferi hoje: o CD continua sem">⛔ Continua sem (${rcdDias(x0)}d)</button></div>`:''}
  <div class="grid grid-cols-${rcdBtn&&!rcdVelho?3:2} grid-gap sh3">${rcdBtn&&!rcdVelho?`<button class="button button-tonal button-large shr${x0.rcd?' on':''}" id="sh-rcd" type="button">${x0.rcd?'↩ Desconfirmar':'⛔ Confirmar CD'}</button>`:''}<button class="button button-tonal button-large" id="sh-dep" type="button">${depMap[r.produto]?'↩ Depósito':'🔎 Depósito'}</button><button class="button button-tonal button-large" id="sh-done" type="button" title="Marca o produto como feito — vale para a aba Produtos e para o Pedido.">${r._d?'↩ Desfazer feito':'✓ Feito'}</button></div></div>`;
 document.querySelectorAll('#sheetc [data-ft]').forEach(b=>b.onclick=()=>{const k=b.dataset.ft;
   document.querySelectorAll('#sheetc [data-ft]').forEach(o=>{const on=o===b;o.classList.toggle('on',on);o.setAttribute('aria-selected',on)});
   document.querySelectorAll('#sheetc .fpane').forEach(p=>p.hidden=p.id!=='fp-'+k);document.querySelector('#sheetc .shb').scrollTop=0;if(k==='hist')histAba(r)});
 shOn('sheet',true);if(!fichaSheet.opened)fichaSheet.open();pushOv('sheet');$('sh-x').onclick=closeSheet;
 const aba=()=>{const s=document.querySelector('section.on').id.slice(2);if(s==='enc')go('enc');else renderAtual()};   // v73: redesenha sem voltar a lista para o topo
 /* remover pela ficha agora tem "Desfazer" (volta o item inteiro: quantidade, urgência, ruptura no CD) */
 $('sh-ped').onclick=()=>{if(inPed(r.produto)){const tirados=pedido.map((x,i)=>[i,x]).filter(([,x])=>x.p===r.produto);pedido=pedido.filter(x=>x.p!==r.produto);savePed();
     toastUndo('Removido do pedido',()=>{for(const [i,x] of tirados)pedido.splice(Math.min(i,pedido.length),0,x);savePed();aba()})}else{addS(r);toast(addMsg(r))}closeSheet();aba()};
 /* ✓ concluir sem precisar deslizar (o mesmo que deslizar → no Pedido) */
 document.querySelectorAll('#sheetc [data-u]').forEach(b=>b.onclick=()=>{const u=b.dataset.u,novo=!inPed(r.produto)&&u;setUrg(r,u);
   toast(u?`${URG[u].t}${novo?' · adicionado ao pedido':''}`:'Urgência normal');closeSheet();aba()});
 if($('sh-trok'))$('sh-trok').onclick=()=>{delete trReg.saiu[r.produto];trDirty=true;trSalva();if(typeof trEnvia==='function')trEnvia();toast('Conferido — aviso removido');closeSheet();aba()};
 if($('sh-rcd2'))$('sh-rcd2').onclick=()=>{const x=pedItem(r.produto);if(x){x.rcd=today();savePed()}toast('⛔ Ruptura CD confirmada de novo — conferido hoje');closeSheet();aba()};
 if($('sh-rcd'))$('sh-rcd').onclick=()=>{const v=!(pedItem(r.produto)||{}).rcd,novo=v&&!inPed(r.produto);setRcd(r,v);
   toast(v?`⛔ Ruptura CD confirmada${novo?' · entrou no pedido':''} — sai de "Para pedir"`:'Ruptura CD desconfirmada');closeSheet();aba()};
 $('sh-dep').onclick=()=>{const v=!depMap[r.produto];setDep(r.produto,v);toast(v?'🔎 Procurar no depósito':'Saiu de "Procurar no depósito"');closeSheet()};
 /* v58: "Marcar feito" e "Concluir no pedido" viraram UM botão — marca feito e, se o item está no pedido, conclui lá também (e desfaz os dois juntos) */
 $('sh-done').onclick=()=>{const marking=!r._d;setFeito(r.produto,marking);if(marking)copyEAN(r.automacao||r.produto,'✓ Feito');else toast('↩ Reaberto');closeSheet();aba()}}   // ✓ Marcar feito: fica na aba em que estava (antes ia sempre para Produtos)


/* v70: tocar no fornecedor da ficha (aba Cadastro) → Produtos com todos os itens dele */
$('sheetc').addEventListener('click',e=>{const b=e.target.closest('.kv-lnk[data-fg]');if(!b)return;const k=b.dataset.fg;closeSheet();
  setTimeout(()=>{F={chip:'all',cat:'',q:'',sort:F.sort,ent:ENT0};fgEnter(k)},380)});   // espera a ficha fechar (e o voltar do histórico) antes de trocar de tela
