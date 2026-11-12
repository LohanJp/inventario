/* Planograma Mobile — PREÇOS (opcional, nov/2026): preço de venda e preço do Clube Condor na ficha do produto.
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → precos → arquivos → nuvem.

   Dois relatórios, os dois OPCIONAIS, escolhidos na mesma linha "Preços" da aba Dados (pode escolher os dois de uma vez;
   o app reconhece cada um pelo conteúdo, não pelo nome do arquivo):

   1) PRODUTO.TXT — preço de venda de TODOS os itens da loja. Uma linha por código de barras:
        0000032080339  VINHO ARG.PORTENO CBT           0000042,900000000.00
        └ EAN (13)     └ descrição curta               └ preço (10) + campo zerado (10)
      → liga no planograma pelo EAN (campo "automacao").

   2) Precos_AAAA-MM-DD.txt — "CONFERENCIA DE PRECOS CLUBE CONDOR": só os itens com preço de Clube.
        00350567 ARROZ URBANO PARB.5KG   UN/1   7896038306039   18,98   17,98 A
        └ código                                └ EAN           └ normal └ clube
      (linha só com EAN + preços = outro código de barras do MESMO produto de cima)
      No fim vem a "RELACAO DE PROMOCOES" (leve 3 pague 2 etc.): cada bloco "Promoção: nº texto" + "Validade" + os produtos.
      → liga no planograma pelo CÓDIGO do produto.

   Relação na ficha:  Preço = PRODUTO.TXT (pelo EAN); se não tiver, o "preço normal" do relatório do Clube.
                      Clube = só aparece quando é MENOR que o preço (é desconto).
   Nada disso entra em cálculo nenhum (cobertura, situação, sugestão): é só informação na ficha. */

/* PRC.p = {map:{ean:preço}, name, savedAt, at, dirty}   ·   PRC.c = {map:{codigo:[normal,clube,promo?]}, meta:{date,hora}, name, savedAt, at, dirty}
   at = carimbo da versão que está na nuvem · dirty = carregado de arquivo neste aparelho e ainda não enviado */
let PRC={p:null,c:null};
const prcNum=s=>{const n=parseFloat(String(s).replace(/\./g,'').replace(',','.'));return n>0?Math.round(n*100)/100:0};
const prcFmt=v=>'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

function prcParseProd(text){const map={};
  for(const l of text.split(/\r?\n/)){const m=/^(\d{8,14})\s+.*?(\d{7},\d{2})\d{7}\.\d{2}\s*$/.exec(l);if(!m)continue;
    const e=zeros(m[1]),v=prcNum(m[2]);if(e&&v)map[e]=v}
  return map}

function prcPromoTxt(raw,cortada){                               // "NOME + NOME - Leva \ 3\ , paga \ 2\ . Neste pack, cada…" → "Leva 3, paga 2"   (cortada: o relatório corta a linha em 122 caracteres)
  let t=raw;const i=t.indexOf(' - ');if(i>=0)t=t.slice(i+3);
  t=t.replace(/\\/g,'').replace(/\s+/g,' ').replace(/\s+([,.])/g,'$1').trim();
  let m=/^Leva (\d+), paga (\d+)/.exec(t);if(m)return`Leva ${m[1]}, paga ${m[2]}`;
  if((m=/^Leva (\d+)/.exec(t)))return`Leva ${m[1]}, paga menos`;                 // linha cortada antes do "paga N"
  t=t.replace(/\.(?=[A-Z])/g,'. ');
  const t2=t.replace(/\.\s*Ne[^.]*$/,'').trim();                 // tira o "Neste pack, cada uma sai por…" (quase sempre cortado)
  return t2!==t?t2:(cortada?t.replace(/[\s.,]+$/,'')+'…':t.replace(/\.$/,''))}

function prcParseClube(text){const map={},meta={};let cur=null,promo=null;
  const d=/Data:\s*(\d\d\/\d\d\/\d{4})/.exec(text),h=/Hora:\s*(\d\d:\d\d:\d\d)/.exec(text);if(d)meta.date=d[1];if(h)meta.hora=h[1];
  for(const l of text.split(/\r?\n/)){let m;
    if((m=/^(\d{8}) .{20,45}? \S+\s+\d{6,14}\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+\S/.exec(l))){   // produto com preço normal e de clube
      cur=zeros(m[1]);if(!map[cur])map[cur]=[prcNum(m[2]),prcNum(m[3])];else if(!map[cur][0]){map[cur][0]=prcNum(m[2]);map[cur][1]=prcNum(m[3])}continue}
    if((m=/^Promo\S{1,8}:\s+\d+\s+(.*)$/.exec(l))){promo={t:prcPromoTxt(m[1],l.replace(/\s+$/,'').length>=118),ate:''};continue}                  // bloco de promoção (leve/pague)
    if(promo&&(m=/^Validade\s*:\s*\S+\s+ATE\s+(\d\d\/\d\d)/i.exec(l))){promo.ate=m[1];continue}
    if(promo&&(m=/^(\d{8})\s+\d{6,14}\s.+\s(Principal|Promocao)\s+[\d.,]+\s+[\d.,]+\s*$/.exec(l))){
      const k=zeros(m[1]),tx=promo.t+(promo.ate?' (até '+promo.ate+')':'');const it=map[k]||(map[k]=[0,0]);
      if(!it[2])it[2]=tx;else if(!it[2].includes(promo.t)&&it[2].split(' | ').length<2)it[2]+=' | '+tx}}
  return{map,meta}}

/* preço de um produto do planograma → {n: preço, c: clube (só se menor), promo} ou null */
function precoDe(r){if(!r||(!PRC.p&&!PRC.c))return null;
  const c=PRC.c&&PRC.c.map[zeros(r.produto)]||null,p=PRC.p&&PRC.p.map[zeros(r.automacao)]||0,n=p||(c&&c[0])||0;
  if(!n&&!(c&&c[2]))return null;
  return{n,c:c&&c[1]>0&&n&&c[1]<n-0.004?c[1]:0,promo:c&&c[2]||''}}
/* linha "Preço" da ficha — sem destaque, só a informação */
function precoHtml(r){const x=precoDe(r);if(!x)return'';
  return(x.n?prcFmt(x.n):'—')+(x.c?` · Clube ${prcFmt(x.c)}`:'')+(x.promo?`<small class="kvs">Promoção Clube: ${esc(x.promo)}</small>`:'')}

function prcStatus(){const el=$('d-preco');if(!el)return;const p=PRC.p,c=PRC.c;
  if(!p&&!c){el.textContent='Não carregado · opcional: PRODUTO.TXT e Preços do Clube';return}
  el.innerHTML=(p?`<b>✓ Preços</b> · ${f0(Object.keys(p.map).length)} itens · ${esc(p.savedAt||'')}`:'Preços (PRODUTO.TXT): não carregado')+'<br>'
    +(c?`<b>✓ Clube Condor</b> · ${f0(Object.keys(c.map).length)} itens${c.meta&&c.meta.date?' · '+esc(c.meta.date.slice(0,5))+(c.meta.hora?' '+esc(c.meta.hora.slice(0,5)):''):''}`:'Clube Condor: não carregado')}
const prcSave=k=>{if(idb&&PRC[k])idbSave({id:'preco_'+k,...PRC[k]}).catch(()=>{})};
async function prcRestaura(){for(const k of['p','c'])try{const r=await idbGet('preco_'+k);if(r&&r.map){const{id,...resto}=r;PRC[k]=resto}}catch{}prcStatus()}

async function loadPrecoFiles(files){busy(true,'Lendo preços…');const ok=[],ruim=[];
  for(const f of files)try{const text=await readReport(f),quando=new Date().toLocaleString('pt-BR');
    if(/CONFERENCIA DE PRECOS/i.test(text.slice(0,4000))||/PRECO NORMAL\s+PRECO CLUBE/i.test(text.slice(0,4000))){
      const r=prcParseClube(text),n=Object.keys(r.map).length;if(!n){ruim.push(f.name);continue}
      PRC.c={map:r.map,meta:r.meta,name:f.name,savedAt:quando,at:0,dirty:true};prcSave('c');ok.push(`Clube ${f0(n)}`)}
    else{const map=prcParseProd(text),n=Object.keys(map).length;if(n<5){ruim.push(f.name);continue}
      PRC.p={map,name:f.name,savedAt:quando,at:0,dirty:true};prcSave('p');ok.push(`Preços ${f0(n)}`)}
  }catch{ruim.push(f.name)}
  busy(false);prcStatus();
  toast((ok.length?'💲 '+ok.join(' · ')+' itens'+(code()?' — envie para a nuvem':''):'')+(ruim.length?(ok.length?' · ':'')+'Não reconheci: '+ruim.join(', ')+' (esperado: PRODUTO.TXT ou o relatório de Preços do Clube)':''))}
$('f-preco').onchange=e=>{const fs=[...e.target.files];if(fs.length)loadPrecoFiles(fs);e.target.value=''};

/* ── NUVEM: /planograma/{code}/prc/info = {p:{at,name,n,savedAt}, c:{at,name,n,meta,savedAt}} · /prc/p e /prc/c = o mapa em TEXTO (JSON)
   (em texto para o Firebase não transformar os códigos numéricos em lista). Só envia o que foi carregado neste aparelho e ainda não foi. */
async function prcEnvia(c,now){const feitos=[];
  for(const k of['p','c']){const x=PRC[k];if(!x||!x.dirty)continue;
    const r1=await cf(cu(c,'prc/'+k),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(JSON.stringify(x.map))});if(!r1.ok)throw Error('prc');
    const r2=await cf(cu(c,'prc/info'),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({[k]:{at:now,name:x.name||'',n:Object.keys(x.map).length,meta:x.meta||null,savedAt:x.savedAt||''}})});if(!r2.ok)throw Error('prc');
    x.at=now;x.dirty=false;prcSave(k);feitos.push(k)}
  return feitos}
/* baixa da nuvem só a parte que mudou (compara o carimbo); nunca troca o que foi carregado aqui e ainda não foi enviado */
async function prcSync(c){const info=await cf(cu(c,'prc/info')).then(r=>r.json()).catch(()=>null);if(!info||typeof info!=='object')return false;let mud=false;
  for(const k of['p','c']){const i=info[k],x=PRC[k];if(!i||!i.at||(x&&(x.dirty||x.at===i.at)))continue;
    const txt=await cf(cu(c,'prc/'+k)).then(r=>r.json()).catch(()=>null);let map=null;try{map=typeof txt==='string'?JSON.parse(txt):null}catch{}
    if(!map||typeof map!=='object')continue;
    PRC[k]={map,meta:i.meta||null,name:i.name||'nuvem',savedAt:i.savedAt||'',at:i.at,dirty:false};prcSave(k);mud=true}
  if(mud)prcStatus();return mud}
