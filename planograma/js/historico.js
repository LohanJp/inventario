/* Planograma Mobile — HISTÓRICO DO ITEM (v77)
   Grava: o PC, no envio para a nuvem (Alt+R / Enviar), guarda 1 linha por item para o dia do relatório de Cobertura:
     /planograma/{code}/hist/{AAAAMM}/{produto}/{DD} = [estoque, MDV, trânsito, preço normal, preço clube]
   Itens parados (sem estoque, sem MDV e sem trânsito) não são gravados. Guarda 13 meses: o mês 14 para trás é apagado no envio.
   Lê: só ao abrir a aba "Histórico" da ficha, e só daquele item (≈ 4 KB por 90 dias). O que já foi visto fica guardado no
   aparelho (IndexedDB) e aparece sem internet.
   Venda ESTIMADA = estoque de ontem − estoque de hoje + o que chegou (queda do trânsito). Quebra, perda, ajuste de inventário
   e transferência também baixam o estoque — por isso é estimativa, e dia fora do normal vira "?" e fica fora do diagnóstico. */
const HIST_MIN=14;                                   // dias com venda estimada para dar diagnóstico
const H_MESES=13;                                    // quanto tempo guardar
const hYmd=s=>{const m=/^(\d\d)\/(\d\d)\/(\d{4})$/.exec(String(s||'').trim());return m?m[3]+m[2]+m[1]:''};   // "25/11/2026" → "20261125"
const hMes=(ym,n)=>{let y=+ym.slice(0,4),m=+ym.slice(4,6)+n;while(m<1){m+=12;y--}while(m>12){m-=12;y++}return y+String(m).padStart(2,'0')};
const hR2=v=>Math.round((+v||0)*100)/100;

/* ═══ GRAVAR (no envio do PC) ═══ */
async function histEnvia(c){
  if(!estoqueLoaded||!allRecords.length)return 0;
  const d=hYmd(estoqueMeta&&estoqueMeta.date);if(!d)return 0;   // sem data no relatório de Cobertura: não dá para saber o dia
  const ym=d.slice(0,6),dd=d.slice(6),up={};let n=0;
  for(const r of allRecords){const e=+r._e||0,m=+r._m||0,t=+r._t||0;if(e<=0&&!m&&!t)continue;   // item parado: não ocupa espaço
    const p=typeof precoDe==='function'?precoDe(r):null;
    up[r.produto+'/'+dd]=[hR2(e),hR2(m),hR2(t),p?hR2(p.n):0,p?hR2(p.c):0];n++}
  if(!n)return 0;
  await histConserta(c,ym).catch(()=>{});
  const rs=await cf(cuG(c,'hist/'+ym),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(up)});   // ⚠ JSON puro: a "/" em "produto/dia" é o caminho (v80 trocava por "_")
  if(!rs.ok)throw Error('hist');
  put(c,'hist/'+hMes(ym,-(H_MESES+1)),null);          // o mês que passou dos 13 sai (apagar de novo um mês vazio não custa nada)
  return n}

/* v82: o envio da v80/v81 gravou "produto_dia" (a "/" virou "_"). Move para produto/dia e apaga o errado — roda só se achar */
async function histConserta(c,ym){
  const sh=await cf(cu(c,'hist/'+ym)+'?shallow=true').then(r=>r.json());if(!sh||typeof sh!=='object')return 0;
  const ruins=Object.keys(sh).filter(k=>/^[^_]+_\d\d$/.test(k));if(!ruins.length)return 0;
  const tudo=await cf(cu(c,'hist/'+ym)).then(r=>r.json());const up={};
  for(const k of ruins){const v=tudo&&tudo[k];const i=k.lastIndexOf('_');if(Array.isArray(v))up[k.slice(0,i)+'/'+k.slice(i+1)]=v;up[k]=null}
  const r=await cf(cuG(c,'hist/'+ym),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(up)});return r.ok?ruins.length:0}

/* ═══ LER (na ficha) ═══ */
const hMem=new Map();                                // nesta abertura do app
async function histCarrega(p,forca){
  const k='hist:'+p,mem=hMem.get(p);if(mem&&!forca)return mem;
  let loc=null;try{loc=idb?await idbGet(k):null}catch{}
  const fresco=loc&&Date.now()-loc.at<3*3600e3;      // baixado há menos de 3 h: nem pergunta à nuvem
  const c=code();
  if((fresco&&!forca)||!c||!navigator.onLine){const o=loc?{rows:loc.rows,at:loc.at,off:!fresco}:null;if(o)hMem.set(p,o);return o}
  const ref=hYmd(estoqueMeta&&estoqueMeta.date)||new Date().toISOString().slice(0,10).replace(/-/g,''),ym=ref.slice(0,6),meses=[0,-1,-2,-3].map(i=>hMes(ym,i));
  try{
    const partes=await Promise.all(meses.map(m=>cf(cu(c,'hist/'+m+'/'+p)).then(r=>r.json()).then(v=>[m,v])));
    const rows=[];for(const [m,v] of partes)if(v&&typeof v==='object')for(const dd in v){const a=v[dd];if(Array.isArray(a))rows.push({d:m+dd,e:+a[0]||0,m:+a[1]||0,t:+a[2]||0,pn:+a[3]||0,pc:+a[4]||0})}
    rows.sort((a,b)=>a.d<b.d?-1:1);
    const o={rows,at:Date.now(),off:false};hMem.set(p,o);if(idb)idbSave({id:k,rows,at:o.at}).catch(()=>{});return o
  }catch{const o=loc?{rows:loc.rows,at:loc.at,off:true}:null;if(o)hMem.set(p,o);return o}}

/* venda estimada dia a dia + marcação dos dias fora do normal.  pe = estoque do dia anterior (para saber se havia o que vender) */
const hData=s=>new Date(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8));
const hDl=d=>+d.slice(6,8)+'/'+ +d.slice(4,6);
function histSerie(rows){
  return rows.map((x,i)=>{const a=rows[i-1];let v=null,sus=false,pe=null;
    if(a&&Math.round((hData(x.d)-hData(a.d))/864e5)===1){pe=a.e;
      v=a.e-x.e+Math.max(0,a.t-x.t);                 // chegou = o quanto o trânsito baixou
      const lim=3*Math.max(x.m,a.m,1)+6;
      if(v<0)v=null;                                 // estoque subiu sem trânsito (entrega direta, ajuste): não dá para estimar a venda do dia
      else if(v>lim)sus=true}                        // queda grande demais para o MDV: possível quebra, perda ou ajuste
    return{...x,v,sus,pe}})}

/* DIAGNÓSTICO (revisado com os especialistas de dashboard e de legibilidade)
   · compara a 1ª e a 2ª metade do período, usando SÓ os dias que tinham estoque (dia zerado não é "procura baixa": é falta)
   · cada metade precisa de 5 dias confiáveis · preço novo precisa durar 3 dias · "procura" manda conferir a gôndola */
const med=L=>{if(!L.length)return 0;const s=L.slice().sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const avg=L=>L.length?L.reduce((s,v)=>s+v,0)/L.length:0;
function histDiag(S,r){
  const val=S.filter(x=>x.v!==null&&!x.sus);
  const out={n:val.length,rupT:S.filter(x=>x.e<=0).length};
  if(val.length<HIST_MIN)return{...out,cedo:true};
  const meio=S[Math.floor(S.length/2)].d,ini=S[0].d,fim=S[S.length-1].d,antesFim=S[Math.floor(S.length/2)-1].d;
  const comE=x=>x.v!==null&&!x.sus&&x.pe>0;                     // tinha estoque para vender
  const A=S.filter(x=>x.d<meio&&comE(x)).map(x=>x.v),B=S.filter(x=>x.d>=meio&&comE(x)).map(x=>x.v);
  const a=avg(A),b=avg(B);Object.assign(out,{a,b,h:S.length-Math.floor(S.length/2),pA:`${hDl(ini)}–${hDl(antesFim)}`,pB:`${hDl(meio)}–${hDl(fim)}`});
  const ruptB=S.filter(x=>x.d>=meio&&x.e<=0).length,ruptA=S.filter(x=>x.d<meio&&x.e<=0).length;
  const cob=r&&r._ct!==null&&r._ct!==undefined&&isFinite(r._ct)?Math.round(r._ct):null;
  const segura=cob!==null&&cob>30?` ${cob} dias de estoque: segure o pedido.`:'';
  if(A.length<5||B.length<5)return{...out,c:'dem',t:'Poucos dias confiáveis',d:'Faltam dias com estoque e venda calculada para apontar uma causa. Tente um período maior.'};
  const ab=`${f1(a)} → ${f1(b)} por dia`,delta=a?(b-a)/a:1;
  if(ruptB>=2){const perd=Math.round(out.rupT*Math.max(a,b));
    if(delta>-0.15)return{...out,c:'rup',t:'Faltou estoque',d:`Ficou zerado em ${ruptB} dia${ruptB>1?'s':''} dos últimos ${S.length-Math.floor(S.length/2)} dias. Nos dias com estoque a venda seguiu em ~${f1(b)} por dia${perd?` — ≈${f0(perd)} un. deixaram de ser vendidas`:''}.`,
      act:'O MDV do sistema caiu por causa da falta, não da procura: peça antes de zerar.'};
    return{...out,c:'rup',t:'Faltou estoque e a venda caiu',d:`Ficou zerado em ${ruptB} dia${ruptB>1?'s':''}, e mesmo nos dias com estoque a venda caiu: ${ab}.`,act:'Peça antes de zerar e confira se o produto está na gôndola.'}}
  if(delta>-0.15){const t=delta>0.15?'A venda subiu':'Venda estável';
    return{...out,c:'ok',t,d:`Venda estimada ${ab}${ruptA>=2&&delta>0.15?' (na 1ª metade faltou estoque)':''}.`}}
  const pA=S.filter(x=>x.d<meio&&x.pn).map(x=>x.pn),pB=S.filter(x=>x.d>=meio&&x.pn).map(x=>x.pn),ma=med(pA),mb=med(pB);
  if(ma&&mb>ma*1.05&&pB.filter(v=>v>ma*1.05).length>=3){const q=S.find(x=>x.d>=ini&&x.pn>ma*1.05);
    return{...out,c:'pre',t:'Provável causa: o preço subiu',d:`O preço passou de ${prcFmt(ma)} para ${prcFmt(mb)}${q?' em '+hDl(q.d):''} e a venda caiu: ${ab}.`,act:'Confira o preço com o comercial.'+segura}}
  const clA=S.filter(x=>x.d<meio&&x.pc>0).length,clB=S.filter(x=>x.d>=meio&&x.pc>0).length;
  if(clA>=3&&!clB)return{...out,c:'pre',t:'Provável causa: acabou o preço clube',d:`O item saiu do preço clube e a venda caiu: ${ab}.`,act:segura.trim()||''};
  return{...out,c:'dem',t:'A venda caiu sem faltar estoque',d:`Não faltou estoque no sistema e o preço não subiu, mas a venda caiu: ${ab}.`,act:'Confira se o produto está na gôndola (estoque no sistema que não está exposto).'+segura}}

/* ═══ ABA HISTÓRICO ═══ */
let hPer=60,hR=null;
function histAba(r){hR=r;const el=$('fp-hist');if(!el)return;
  el.innerHTML='<p class="hs-msg">Carregando o histórico…</p>';
  histCarrega(r.produto).then(o=>{if(hR!==r||!$('fp-hist'))return;histMostra(r,o)})}
function histMostra(r,o){const el=$('fp-hist');
  if(!o){el.innerHTML='<p class="hs-msg">Precisa de internet para ver o histórico deste item.</p>';return}
  if(!o.rows.length){el.innerHTML='<p class="hs-msg"><b>Ainda sem histórico.</b><br>O PC grava um dia por envio para a nuvem (Alt+R). Volte aqui depois dos próximos envios.</p>';return}
  const R=o.rows,dias=Math.round((hData(R[R.length-1].d)-hData(R[0].d))/864e5)+1,longo=dias>30;
  const per=longo?hPer:90,fim=R[R.length-1].d,ini=(()=>{const d=hData(fim);d.setDate(d.getDate()-per+1);return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')})();
  const S=histSerie(R).filter(x=>x.d>=ini),D=histDiag(S,r),ult=S[S.length-1];
  let topo;
  if(D.cedo){const prev=hData(R[0].d);prev.setDate(prev.getDate()+HIST_MIN);
    topo=`<div class="hs-v cedo"><b>Coletando dados · ${D.n} de ${HIST_MIN} dias</b><span>Começou em ${hDl(R[0].d)}${S.length<2?' · gráfico a partir do próximo envio':''} · diagnóstico por volta de ${prev.getDate()}/${prev.getMonth()+1}.</span></div>`}
  else topo=`<div class="hs-v ${D.c}"><b>${esc(D.t)}</b><span>${esc(D.d)}</span>${D.act?`<em>👉 ${esc(D.act)}</em>`:''}</div>`;
  const kp=D.cedo?'':`<div class="hs-kp"><div><small>Venda/dia (estimada)</small><b class="num">${f1(D.a)} → ${f1(D.b)}</b><span>${D.h} dias antes → últimos ${D.h}</span></div>
   <div><small>MDV do sistema</small><b class="num">${f1(ult.m)}</b><span>era ${f1(S[0].m)} em ${hDl(S[0].d)}</span></div>
   <div><small>Ruptura</small><b class="num">${D.rupT}</b><span>de ${S.length} dias</span></div></div>`;
  const ps=S.map(x=>x.pn).filter(Boolean),pConst=ps.length&&ps.every(v=>v===ps[0]),clube=S.some(x=>x.pc>0);
  const prLinha=!ps.length?'Sem preço nos relatórios deste período':pConst?`Preço ${prcFmt(ps[0])} no período todo${clube?' · teve preço clube':''}`:'';
  el.innerHTML=`${topo}${kp}
   ${S.length<2?'':`<div class="hs-ch">
    <div class="hs-hd">${longo?`<div class="hs-per fs-seg" role="group" aria-label="Período">${[30,60,90].map(n=>`<button type="button" data-hp="${n}" class="${n===hPer?'on':''}">${n} dias</button>`).join('')}</div>`:`<span class="hs-pt">${S.length} dias</span>`}</div>
    <div class="hs-tip" id="hs-tip" aria-live="polite">Toque no gráfico para ver o dia</div>
    <div class="hs-fig"><svg id="hs-s1" role="img" aria-label="Venda estimada e MDV por dia"></svg></div>
    <div class="hs-fig st"><svg id="hs-s3" role="img" aria-label="Estoque por dia"></svg></div>
    ${prLinha?`<p class="hs-pl">${esc(prLinha)}</p>`:'<div class="hs-fig pr"><svg id="hs-s2" role="img" aria-label="Preço por dia"></svg></div>'}
    <div class="hs-leg"><span><i class="lv"></i>venda estimada</span><span><i class="lr"></i>sem estoque</span><span><b>?</b>fora do normal (não conta)</span><span><b>·</b>sem cálculo</span>${!prLinha&&clube?'<span><i class="lc"></i>preço clube</span>':''}</div></div>`}
   <p class="hs-nt">Venda <b>estimada</b> pela queda do estoque: quebra, perda, ajuste ou transferência também baixam o estoque.${o.off?' · Sem internet: mostrando o que já estava guardado.':''}</p>`;
  el.querySelectorAll('[data-hp]').forEach(b=>b.onclick=()=>{hPer=+b.dataset.hp;histMostra(r,o)});
  if(S.length>1)requestAnimationFrame(()=>histDesenha(S,!prLinha))}
function histDesenha(S,comPreco){const s1=$('hs-s1'),s2=$('hs-s2'),s3=$('hs-s3');if(!s1)return;
  const cs=getComputedStyle(document.body),C=v=>cs.getPropertyValue(v).trim();
  const W=s1.clientWidth||320,H=s1.clientHeight||150,pl=24,pr=30,pt=6,pb=4,w=W-pl-pr,h=H-pt-pb,N=S.length,bw=w/N;
  const vmax=Math.max(4,...S.map(x=>x.sus?0:x.v||0),...S.map(x=>x.m))*1.12;
  const X=i=>pl+i*bw,Yv=v=>pt+h-Math.min(v,vmax)/vmax*h;
  let o='',st=null;
  for(let i=0;i<=N;i++){const z=i<N&&S[i].e<=0;if(z&&st===null)st=i;if(!z&&st!==null){const ww=(i-st)*bw;o+=`<rect x="${X(st)}" y="${pt}" width="${ww}" height="${h}" fill="${C('--cr-bg')}"/>${ww>52?`<text x="${X(st)+ww/2}" y="${pt+12}" font-size="10" font-weight="700" text-anchor="middle" fill="${C('--cr')}">sem estoque</text>`:''}`;st=null}}
  const step=vmax>24?10:vmax>12?5:2;for(let t=0;t<vmax;t+=step)o+=`<line x1="${pl}" x2="${W-pr}" y1="${Yv(t)}" y2="${Yv(t)}" stroke="${C('--bd')}"/><text x="${pl-4}" y="${Yv(t)+3.5}" font-size="10" text-anchor="end" fill="${C('--mu')}">${t}</text>`;
  S.forEach((x,i)=>{const bx=X(i)+bw*.12,bb=Math.max(1,bw*.76);
    if(x.v===null){if(x.e>0)o+=`<circle cx="${X(i)+bw/2}" cy="${pt+h-2}" r="1.6" fill="${C('--mu')}"/>`;return}
    if(x.sus){o+=`<text x="${X(i)+bw/2}" y="${pt+h-2}" font-size="11" font-weight="800" text-anchor="middle" fill="${C('--mu')}">?</text>`;return}
    if(x.v>0){const y=Yv(x.v);o+=`<rect x="${bx}" y="${y}" width="${bb}" height="${pt+h-y}" fill="${C('--in')}" opacity=".5" rx="1"/>`}});
  o+=`<path d="${S.map((x,i)=>(i?'L':'M')+(X(i)+bw/2)+','+Yv(x.m)).join(' ')}" fill="none" stroke="${C('--tx')}" stroke-width="2" stroke-linejoin="round"/>`;
  o+=`<text x="${X(N-1)+bw/2+4}" y="${Yv(S[N-1].m)+3.5}" font-size="10.5" font-weight="700" fill="${C('--tx')}">MDV</text>`;
  o+=`<line id="hs-cur" x1="0" x2="0" y1="${pt}" y2="${pt+h}" stroke="${C('--tx')}" stroke-width="1.2" visibility="hidden"/>`;
  s1.innerHTML=o;
  // estoque: faixa própria, mesmo eixo de datas, valor de hoje na ponta
  if(s3){const H3=s3.clientHeight||40,emax=Math.max(1,...S.map(x=>x.e)),Ye=v=>3+(H3-16)*(1-Math.max(0,v)/emax);
    s3.innerHTML=`<text x="${pl-4}" y="11" font-size="10" text-anchor="end" fill="${C('--mu')}">est.</text><path d="M${X(0)+bw/2},${H3-13} ${S.map((x,i)=>`L${X(i)+bw/2},${Ye(x.e)}`).join(' ')} L${X(N-1)+bw/2},${H3-13}Z" fill="${C('--mu')}" opacity=".28"/><path d="${S.map((x,i)=>(i?'L':'M')+(X(i)+bw/2)+','+Ye(x.e)).join(' ')}" fill="none" stroke="${C('--mu')}" stroke-width="1.4"/><text x="${X(N-1)+bw/2+4}" y="${Ye(S[N-1].e)+3.5}" font-size="10.5" font-weight="700" fill="${C('--mu')}">${f0(S[N-1].e)}</text>`
      +[0,N-1].concat(N>8&&W>300?[Math.floor(N/2)]:[]).map(i=>`<text x="${X(i)+bw/2}" y="${H3-2}" font-size="10" text-anchor="${i===0?'start':i===N-1?'end':'middle'}" fill="${C('--mu')}">${hDl(S[i].d)}</text>`).join('')}
  if(comPreco&&s2){const W2=s2.clientWidth||320,H2=s2.clientHeight||44,ps=S.map(x=>x.pn).filter(Boolean),lo=Math.min(...ps)*.97,hi=Math.max(...ps)*1.03,Yp=v=>6+(H2-12)*(1-(v-lo)/((hi-lo)||1));let d='',last=null,lab='';
    S.forEach((x,i)=>{if(!x.pn)return;d+=last===null?`M${X(i)},${Yp(x.pn)}`:` L${X(i)},${Yp(last)} L${X(i)},${Yp(x.pn)}`;
      if(x.pn!==last)lab+=`<text x="${Math.min(X(i)+3,W2-44)}" y="${Yp(x.pn)-4}" font-size="10.5" font-weight="700" fill="${C('--am')}">${prcFmt(x.pn).replace('R$ ','')}</text>`;last=x.pn});
    d+=` L${X(N-1)+bw},${Yp(last)}`;
    s2.innerHTML=`<text x="${pl-4}" y="11" font-size="10" text-anchor="end" fill="${C('--mu')}">R$</text><path d="${d}" fill="none" stroke="${C('--am')}" stroke-width="2.2"/>${lab}`+S.map((x,i)=>x.pc>0?`<rect x="${X(i)}" y="${H2-3}" width="${bw}" height="3" fill="${C('--ok')}"/>`:'').join('')}
  const tip=$('hs-tip'),cur=$('hs-cur');
  s1.onpointerdown=s1.onpointermove=ev=>{if(ev.type==='pointermove'&&!ev.buttons&&ev.pointerType!=='mouse')return;const b=s1.getBoundingClientRect(),i=Math.max(0,Math.min(N-1,Math.floor((ev.clientX-b.left-pl)/bw)));const x=S[i];
    cur.setAttribute('x1',X(i)+bw/2);cur.setAttribute('x2',X(i)+bw/2);cur.setAttribute('visibility','visible');
    tip.innerHTML=`<b>${hDl(x.d)}</b> · venda est. <b>${x.v===null?'—':x.sus?'?':f0(Math.max(0,x.v))}</b> · MDV ${f1(x.m)} · estoque ${f0(x.e)}${x.pn?' · '+prcFmt(x.pn):''}${x.pc?' · clube '+prcFmt(x.pc):''}`;tip.classList.add('on')}}
