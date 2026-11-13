/* Planograma Mobile — BASE DA INTERFACE: utilitários, busca e cálculo de situação (derive).
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */

/* ═══ INTERFACE ═══ */
const $=id=>document.getElementById(id);
const num=v=>parseFloat(String(v||'0').replace(/\./g,'').replace(',','.'))||0;
const NF0=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}),NF1=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const f0=v=>NF0.format(+v||0),f1=v=>NF1.format(+v||0);   // +v: sempre número (dado vindo da nuvem nunca vira HTML)
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
GLY.rcd='⊘';SLBL.rcd='Ruptura CD';SLBL.rup='Ruptura loja';
const COLOR={rup:'var(--cr)',rcd:'var(--rcd)',crit:'var(--crit)',aten:'var(--am)',ok:'var(--ok)',nd:'var(--mu)',sg:'var(--sg)'};   // Crítico (laranja) ≠ Ruptura (vermelho), igual ao Resumo
const LBL={rup:'Rupt. loja',rcd:'Rupt. CD',crit:'Crítico',aten:'Atenção',ok:'OK',nd:'Sem MDV',sg:'Sem giro'};
/* aviso (toast): máx. 2 linhas (texto inteiro no title); com janela/folha aberta aparece no TOPO, para não cobrir os botões */
const overlayOn=()=>['sheet','scan','flt-sheet','cat-sheet'].some(i=>{const e=$(i);return !!e&&e.classList.contains('on')})||(()=>{const e=$('pf-ask');return !!e&&!!e.style.display&&e.style.display!=='none'})();   // folhas do F7 marcam aberta com .on
let tmr;function showToast(html,act,ms){const t=$('toast');t.innerHTML=html;t.title=t.textContent;t.classList.toggle('act',act);t.classList.toggle('top',overlayOn());t.classList.add('on');clearTimeout(tmr);tmr=setTimeout(()=>t.classList.remove('on','act'),ms)}
function toastUndo(msg,fn){showToast(`<span class="tt">${esc(msg)}</span><button class="tu" id="tu">Desfazer</button>`,true,5000);$('tu').onclick=()=>{fn();$('toast').classList.remove('on','act')}}
function toast(m){showToast(`<span class="tt">${esc(m)}</span>`,false,3200)}
/* diagnóstico: qualquer erro de JavaScript aparece na tela (antes o app só "parava" sem dizer nada) */
let errAt=0;const showErr=m=>{if(Date.now()-errAt<4000)return;errAt=Date.now();try{toast('⚠ Erro no app: '+String(m||'desconhecido').slice(0,140))}catch{}};
addEventListener('error',e=>showErr(e.message+(e.lineno?' (linha '+e.lineno+')':'')));
addEventListener('unhandledrejection',e=>showErr(e.reason&&e.reason.message||e.reason));
/* Tela de carregamento: só aparece se a ação passar de 1 s (now=true: trabalho pesado que trava a tela, mostra já) */
let busyT=null,busyH=null,busyMsg='Carregando…';
function busy(on,m,now){
  const L=$('load');
  if(!on){clearTimeout(busyT);clearTimeout(busyH);busyT=busyH=null;L.classList.remove('on');return}
  if(m)busyMsg=m;
  if(L.classList.contains('on')){$('lmsg').textContent=busyMsg;return}      // já visível: só troca o texto
  if(busyT&&!now)return;                                                   // já aguardando 1 s
  clearTimeout(busyT);
  const show=()=>{busyT=null;$('lmsg').textContent=busyMsg;$('lhint').textContent='';L.classList.add('on');
    clearTimeout(busyH);busyH=setTimeout(()=>{$('lhint').textContent='Ainda trabalhando… pode levar alguns segundos'},6000)};
  if(now)show();else busyT=setTimeout(show,1000);
}
const tick=()=>new Promise(r=>setTimeout(r,30));
/* ⚡ ECONOMIA: debounce (agrupa rajadas de digitação), idle (trabalho não urgente quando a CPU está livre; iOS não tem rIC),
   schedule (junta várias renderizações em UM quadro via requestAnimationFrame), byProd (busca O(1) no lugar de find() em 7 mil itens) */
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const idle=(fn,ms=2000)=>'requestIdleCallback' in window?requestIdleCallback(fn,{timeout:ms}):setTimeout(fn,200);
const rafQ=new Set();let rafId=0;
function schedule(fn){rafQ.add(fn);if(!rafId)rafId=requestAnimationFrame(()=>{rafId=0;const q=[...rafQ];rafQ.clear();q.forEach(f=>f())})}
let byProd=new Map();
/* ═══ BUSCA FÁCIL ═══ cada palavra digitada só precisa aparecer em QUALQUER lugar do nome:
   ordem livre ("1,6 omo" = "omo 1,6"), sem acento, maiúsc./minúsc. iguais e vírgula = ponto (1,6 = 1.6).
   Resultados com palavra no INÍCIO de uma palavra do nome ("omo" em "OMO LIMPEZA") sobem na lista. */
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/,/g,'.');
const toks=q=>norm(q).split(/[\s*+\/-]+/).filter(Boolean).map(t=>/^\d+$/.test(t)?t.replace(/^0+(?=\d)/,''):t);   // código digitado: ignora zeros à esquerda
const NUM=/^[\d.]+$/,AN=/[a-z0-9]/;
function score(r,T,rel){const h=r._h;let sc=0;
  for(const t of T){const wt=NUM.test(t)?1:3;let w=0,i=h.indexOf(t);                 // número pesa menos que palavra
    if(i>=0){w=1;while(i>=0){if(i===0||!AN.test(h[i-1])){w=2;break}i=h.indexOf(t,i+1)}}  // 2 = começa uma palavra · 1 = no meio
    if(!w&&t.length>=5)for(let k=t.length-1;k>=3&&!w;k--){                            // abreviação: "liquido" acha "LIQ."
      const q=t.slice(0,k);let j=h.indexOf(q);
      while(j>=0){if((j===0||!AN.test(h[j-1]))&&!AN.test(h[j+k]||' ')){w=1;break}j=h.indexOf(q,j+1)}}
    if(w)sc+=wt*w;else if(!rel)return 0}                                              // modo parcial (rel) aceita palavras faltando
  return sc}
let currentMeta={},savedInfo=null,F={chip:'all',cat:'',q:'',sort:'cobt',ent:'1'},shown=40,list=[];
let catSist='1';try{const v=localStorage.getItem('planograma_catsist');if(v==='10'||v==='20')catSist=v}catch{}   // ⚠ declarado aqui no topo: renderCats() roda dentro de renderHome()
const key=r=>r.automacao||r.produto;

/* (nov/2026, v57) A SUGESTÃO DE QUANTIDADE foi removida do app a pedido: não era usada. Continua existindo só a
   "Nova cobertura" do filtro 1×1 (telas.js: novaInfo), que gera o TXT para o cadastro automático do planograma. */
const TR_ATRASO=4,TR_SAIU_DIAS=7;   // trânsito: 4+ dias = atrasado (normal: 2–3) · aviso de "saiu sem entrar no estoque" dura 7 dias
const capOf=r=>{const c=num(r.total);return c>0?c:num(r.altura)*num(r.largura)*num(r.prof)};
/* ═══ SITUAÇÕES (nov/2026, v60 — regras do Lohan) ═══
   Ruptura loja → estoque ≤ 0 (com trânsito a caminho, ou fora da Sist. 1)
   Ruptura CD   → Sist. 1, SEM trânsito e estoque < 40% do cadastro do planograma (sem cadastro: estoque ≤ 0)
                  = a antiga "falta no CD". Pedir não resolve, por isso Crítico/Atenção/Saudável NÃO contam esses itens.
   Sem giro / Sem MDV → valem mesmo se o item estiver em Ruptura CD
   Crítico < 7 dias · Atenção 7 a 14 · Saudável 15+ (cobertura total = estoque + trânsito ÷ MDV)
   r._vir: Ruptura CD que pela cobertura seria Saudável (MDV caiu) → selo "⚠ conferir estoque" (pode ser estoque virtual) */
const isCD=r=>!r._sist||r._sist==='1';   // Ruptura CD só vale p/ sistemática 1; sist 10/20 ≤ 0 = Ruptura loja (falta pedir ao fornecedor)
const RCD_PCT=0.4;
const abaixoCD=r=>{const c=r._np?0:capOf(r);return c>0?r._e<RCD_PCT*c:r._e<=0};   // estoque abaixo de 40% do cadastro (sem cadastro: zerado)
const faltaCD=r=>isCD(r)&&!(r._t>0)&&abaixoCD(r);
const cdRisk=r=>r._k==='rcd';   // "falta no CD" = Ruptura CD (o selo, o filtro F/CD, o Pedido e o Para fazer hoje usam este)
let noCD=false;try{noCD=localStorage.getItem('planograma_nocd')==='1'}catch{}
const addMsg=r=>transitLoaded&&r&&r._t>0?'Adicionado — aguardando chegada do trânsito':'Adicionado ao pedido';
const addS=r=>addPed(r);
/* ═══ TIPO DE ENTREGA + DATAS ═══ Sist 1 = CD · 20 = fornecedor direto · 10 = fornecedor através do CD */
const ENT={'1':'CD','10':'Forn. via CD','20':'Fornecedor'};
const entTxt=r=>r._sist?`<b class="ent e${esc(r._sist)}">${esc(ENT[r._sist]||'Sist. '+r._sist)}</b> <small>(sist. ${esc(r._sist)})</small>`:'—';
function dtTxt(s,vazio){const m=/^(\d\d)\/(\d\d)\/(\d\d)$/.exec(s||'');if(!m)return vazio||'—';
  const d=new Date(2000+ +m[3],+m[2]-1,+m[1]),h=new Date();h.setHours(0,0,0,0);const n=Math.round((h-d)/864e5);
  return `${m[1]}/${m[2]}/20${m[3]} · ${n<=0?'hoje':n===1?'ontem':'há '+f0(n)+' dias'}`}
const entOk=r=>!F.ent||(F.ent==='np'?!!r._np:F.ent==='1'?isCD(r):r._sist===F.ent);
const rawRec=r=>{const o={};for(const k in r)if(k[0]!=='_')o[k]=r[k];return o};   // tira os campos calculados (_e, _k…) antes de salvar/enviar
/* junta o planograma com TODOS os itens da Cobertura: quem não está no planograma (sist 10/20) entra com os dados da Cobertura/Trânsito */
let _mFor={p:null,e:null,l:null};
function mergeRecs(){
  if(_mFor.p===planoRecs&&_mFor.e===estoqueMap&&_mFor.l===estoqueLoaded)return;
  _mFor={p:planoRecs,e:estoqueMap,l:estoqueLoaded};
  const out=planoRecs.slice();
  if(estoqueLoaded){const have=new Set(planoRecs.map(r=>r.produto));
    for(const p in estoqueMap){const x=estoqueMap[p];if(!x||!x.d||have.has(p))continue;
      out.push({st:'A',automacao:'',produto:p,descricao:x.d,emb:'',referencia:x.r||'',fornec:'',nome:x.f||'',sist:x.sist||'',giro:'',corredor:'',altura:'',largura:'',prof:'',total:'',cobplan:'',qtdestoque:'',categoria:x.c||'',_np:true})}}
  allRecords=out}
/* ═══ SEM GIRO ═══ tem estoque, MDV 0 e nenhuma venda há mais de SG_DIAS dias (conta a partir da data do relatório de Cobertura).
   O MDV do relatório vem sem casas decimais: MDV 0 com venda recente é só item que vende pouco (fica pela cobertura normal). */
const SG_DIAS=30;
const dmy=s=>{const m=/^(\d\d)\/(\d\d)\/(\d{2,4})$/.exec(String(s||'').trim());if(!m)return null;const y=+m[3];return new Date(y<100?2000+y:y,+m[2]-1,+m[1])};
const semVendaDias=r=>{const ref=dmy(estoqueMeta&&estoqueMeta.date)||new Date(),uv=dmy(r._uv);return uv?Math.round((ref-uv)/864e5):Infinity};
const semGiro=r=>estoqueLoaded&&r._e>0&&!r._m&&semVendaDias(r)>SG_DIAS;
function derive(){mergeRecs();byProd=new Map(allRecords.map(r=>[r.produto,r]));for(const r of allRecords){const t=transitLoaded?transitMap[r.produto]:null;
 const _x=estoqueLoaded?estoqueMap[r.produto]:null;
 // ESTOQUE vem da Cobertura (mais recente); o Planograma só serve de reserva (e para a capacidade alt × larg × prof)
 r._e=_x&&typeof _x.estq==='number'?_x.estq:num(r.qtdestoque);r._t=t?t.qt_transito:0;
 r._sist=(_x&&_x.sist)||String(r.sist||'').trim().replace(/^0+(?=\d)/,'');r._ue=(_x&&_x.ue)||'';r._uv=(_x&&_x.uv)||'';
 const _es=estoqueLoaded?estoqueMap[r.produto]:null;
 r._m=_es&&_es.mdv>0?_es.mdv:null;
 r._c=_es?_es.cob:null; // cobertura do relatório (vem em número inteiro)
 // 999 no relatório = "sem cálculo" (aparece até em item que vende: Açúcar 1 un, MDV 2 → 999). Não é cobertura de verdade: vira "R: —"
 r._c999=r._c!==null&&r._c>=999;if(r._c999)r._c=null;
 // relatório arredonda: 0 com estoque na loja → usa estoque (un) ÷ MDV com casas decimais
 if(r._c===0&&r._e>0&&r._m>0)r._c=r._e/r._m;
 // COBERTURA TOTAL = (estoque + trânsito) ÷ MDV — com casas decimais. A cobertura do relatório (r._c) continua separada.
 r._ct=r._m>0?(Math.max(r._e,0)+(r._t>0?r._t:0))/r._m:(r._c===0&&r._e>0?null:r._c);   // MDV 0 com estoque e "cobertura 0" no relatório = vende pouco → "Sem MDV" (antes virava Crítico · 0 dias)   // sem MDV: só a cobertura do relatório (se ela for 999 = sem cálculo → situação "Sem MDV")
 // ARREDONDA as duas coberturas para dias inteiros: ,5 ou mais sobe · abaixo de ,5 desce (6,4 → 6 · 6,5 → 7). A situação usa o número arredondado, igual ao que aparece na tela.
 const rnd=v=>v===null?null:Math.round(v);r._c=rnd(r._c);r._ct=rnd(r._ct);
 // SITUAÇÃO pela cobertura TOTAL: item com mercadoria a caminho não fica "Crítico" à toa. Ruptura continua sendo estoque ≤ 0 (gôndola vazia agora).
 {const fc=faltaCD(r);r._k=r._e<=0?(fc?'rcd':'rup'):semGiro(r)?'sg':r._ct===null?'nd':fc?'rcd':r._ct<7?'crit':r._ct<15?'aten':'ok';r._vir=r._k==='rcd'&&r._e>0&&r._ct!==null&&r._ct>=15}r._d=doneSet.has(key(r));if(!r._h)r._h=norm(r.descricao+' '+r.produto+' '+r.automacao+' '+String(r.produto||'').replace(/^0+(?=\d)/,'')+' '+String(r.automacao||'').replace(/^0+(?=\d)/,''))}
  updBadge();
  if(encItems.length){encDirty=true;if(curTab==='enc'&&axCur==='enc')setTimeout(renderEnc,0)}   // ⚡ Encarte escondido: só marca (redesenha ao abrir)
  if($('pf-txt'))setTimeout(pfSync,0);            // e o Panfleto
  if($('of-list'))setTimeout(ofSync,0)}            // e a Oferta do dia
const short=c=>(c||'Sem categoria').split('->').slice(-2).join(' › ');
