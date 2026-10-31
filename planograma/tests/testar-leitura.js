#!/usr/bin/env node
/* ═══ TESTE DA LEITURA DOS RELATÓRIOS ═══════════════════════════════════════════
   Roda sem navegador e sem instalar nada (só Node.js 18+):
       node tests/testar-leitura.js              → testa
       node tests/testar-leitura.js --salvar     → guarda o resultado atual como referência (tests/esperado.json)

   1) Testes fixos (sempre rodam): acentos, números pt-BR, linha deslocada que é realinhada e linha quebrada que é ignorada.
   2) Relatórios reais: coloque os .txt em tests/relatorios/ (qualquer nome). O tipo — Planograma, Cobertura ou
      Trânsito — é reconhecido pelo cabeçalho. Para cada um, confere regras que valem para QUALQUER relatório
      (códigos com 8 dígitos, números válidos, quase nenhuma linha ignorada…).
   3) Se o arquivo já tiver referência salva, confere que a leitura dá EXATAMENTE o mesmo resultado de antes:
      assim, qualquer mudança no js/leitura.js que altere um número aparece aqui antes de chegar no celular. */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const RAIZ=path.join(__dirname,'..'),PASTA=path.join(__dirname,'relatorios'),REF=path.join(__dirname,'esperado.json');
const SALVAR=process.argv.includes('--salvar');

/* carrega js/leitura.js exatamente como o navegador carrega (script comum, escopo global) */
const ctx=vm.createContext({TextDecoder,console});
vm.runInContext(fs.readFileSync(path.join(RAIZ,'js/leitura.js'),'utf8'),ctx,{filename:'js/leitura.js'});
const call=(fn,...a)=>{ctx.__a=a;return vm.runInContext(`${fn}(...__a)`,ctx)};
const glob=n=>vm.runInContext(`(typeof ${n}==='undefined'?undefined:JSON.parse(JSON.stringify(${n})))`,ctx);

let falhas=0,avisos=0,ok=0;
const cor=(c,t)=>process.stdout.isTTY?`\x1b[${c}m${t}\x1b[0m`:t;
const pass=m=>{ok++;console.log('  '+cor(32,'✓')+' '+m)};
const fail=m=>{falhas++;console.log('  '+cor(31,'✗ '+m))};
const warn=m=>{avisos++;console.log('  '+cor(33,'⚠ '+m))};
const check=(cond,m,det)=>cond?pass(m):fail(m+(det?' — '+det:''));
const exemplos=(arr,f=x=>x)=>arr.slice(0,3).map(f).join(' | ');

/* ── 1) TESTES FIXOS ─────────────────────────────────────────────────────────── */
console.log(cor(1,'\nTestes fixos'));
{
  const txt='AÇÃO Nº 1 — Pão';
  check(call('decodeBuf',Buffer.from(txt,'utf8'))===txt,'UTF-8 com acentos é lido certo');
  check(call('decodeBuf',Buffer.from('AÇÃO Nº 1','latin1'))==='AÇÃO Nº 1','arquivo Windows-1252 (latin1) também é lido');
  check(call('decodeBuf',Buffer.from('C\u0327','utf8'))==='Ç','acento decomposto vira 1 caractere (não desloca colunas)');
  check(JSON.stringify(call('metaOf','Data: 28/10/2026  Hora:   16:31:59'))==='{"date":"28/10/2026","hora":"16:31:59"}','data e hora do cabeçalho');

  // linha de Cobertura montada nas posições do relatório (estoque 73–84 · compra 85–91 · MDV 92–98 · cobertura 99–106)
  const put=(a,s,end,v,dir='r')=>{v=String(v);const st=dir==='r'?end-v.length:s;for(let i=0;i<v.length;i++)a[st+i]=v[i]};
  const linha=(desc,{estq='1.234,00',compra='0',mdv='12',cob='103'}={})=>{const a=Array(230).fill(' ');
    put(a,0,0,'A','l');put(a,2,0,'12345678','l');put(a,11,0,desc,'l');put(a,0,72,'01');
    put(a,73,84,estq);put(a,85,91,compra);put(a,92,98,mdv);put(a,99,106,cob);put(a,107,0,'A','l');return a.join('')};
  const cab='Data: 28/10/2026 Hora: 16:31:59\n         Mercadologico: 01.001.010 - MERCEARIA->TESTE\n';
  let m=call('parseEstoqueFile',cab+linha('PRODUTO TESTE 1KG'));
  check(m['12345678']&&m['12345678'].estq===1234&&m['12345678'].mdv===12&&m['12345678'].cob===103,'Cobertura: "1.234,00" → 1234 · MDV 12 · cobertura 103',JSON.stringify(m['12345678']));
  check(m['12345678']&&m['12345678'].c==='MERCEARIA->TESTE','Cobertura: categoria vem da linha "Mercadologico"');
  m=call('parseEstoqueFile',cab+linha('PRODUTO TESTE',{compra:'BLOQ'}));
  check(m['12345678']&&m['12345678'].bloq===true,'Cobertura: "BLOQ" na coluna Compra marca item bloqueado');
  // desloca a linha 2 casas (como um emoji/acento mal codificado na descrição faria)
  const desl=l=>l.slice(0,30)+'  '+l.slice(30,200);
  m=call('parseEstoqueFile',cab+desl(linha('PRODUTO TESTE')));
  check(m['12345678']&&m['12345678'].estq===1234&&glob('parseWarn').realign===1,'linha deslocada é REALINHADA com os números certos',JSON.stringify(glob('parseWarn')));
  m=call('parseEstoqueFile',cab+linha('PRODUTO TESTE',{estq:'12X34'}));
  check(!m['12345678']&&glob('parseWarn').skip===1,'linha com número quebrado é IGNORADA (melhor sem o item do que com número errado)');
}

/* ── 2) RELATÓRIOS REAIS ─────────────────────────────────────────────────────── */
const TIPOS={
  planograma:{nome:'Planograma',reconhece:t=>/listaplanograma|Planograma/i.test(t.slice(0,3000))&&/Automacao/.test(t.slice(0,5000))},
  cobertura:{nome:'Cobertura',reconhece:t=>/analiseestqloja/.test(t.slice(0,3000))&&/Vda 12 meses/.test(t.slice(0,5000))},
  transito:{nome:'Trânsito',reconhece:t=>/analiseestqloja/.test(t.slice(0,3000))&&/Qt\.Transito/.test(t.slice(0,5000))}};
const tipoDe=t=>Object.keys(TIPOS).find(k=>TIPOS[k].reconhece(t));
const NUMF=/^-?\d[\d.]*(,\d+)?$|^$/,DATA=/^\d\d\/\d\d\/\d{4}$/,DT2=/^(\d\d\/\d\d\/\d\d)?$/;
const soma=(xs,f)=>Math.round(xs.reduce((a,x)=>a+(+f(x)||0),0)*100)/100;
const linhasDeProduto=(t,re)=>t.split(/\r?\n/).filter(l=>re.test(l)).length;

/* lê o arquivo e devolve um "resumo" estável (é ele que vai para o esperado.json) */
function ler(tipo,t){
  if(tipo==='planograma'){const p=call('parseFile',t),w=glob('parseWarn'),R=p.records;
    return{dados:R,meta:p.meta,warn:w,linhas:linhasDeProduto(t,/^([A-Z])\s{2}(\d{13})/),
      resumo:{total:R.length,...w,meta:p.meta,somaEstoque:soma(R,r=>String(r.qtdestoque).replace(/\./g,'').replace(',','.')),
        somaCapacidade:soma(R,r=>r.total),categorias:new Set(R.map(r=>r.categoria)).size,primeiro:R[0],ultimo:R[R.length-1]}}}
  if(tipo==='cobertura'){const m=call('parseEstoqueFile',t),w=glob('parseWarn'),meta=glob('estoqueMeta'),E=Object.entries(m);
    return{dados:E,meta,warn:w,linhas:linhasDeProduto(t,/^[A-Z] \d{8}/),
      resumo:{total:E.length,...w,meta,somaEstoque:soma(E,([,x])=>x.estq),somaMDV:soma(E,([,x])=>x.mdv),somaCob:soma(E,([,x])=>x.cob),
        bloqueados:E.filter(([,x])=>x.bloq).length,porSist:E.reduce((a,[,x])=>(a[x.sist]=(a[x.sist]||0)+1,a),{}),primeiro:E[0],ultimo:E[E.length-1]}}}
  const m=call('parseTransitFile',t),meta=glob('transitMeta'),E=Object.entries(m);
  return{dados:E,meta,warn:{realign:0,skip:0},linhas:linhasDeProduto(t,/^[A-Z] \d{8}/),
    resumo:{total:E.length,meta,somaTransito:soma(E,([,x])=>x.qt_transito),comTransito:E.filter(([,x])=>x.qt_transito>0).length,primeiro:E[0],ultimo:E[E.length-1]}}}

/* regras que valem para QUALQUER relatório daquele tipo */
function regras(tipo,r){
  const {dados,meta,warn:w,linhas}=r;
  check(dados.length>0,`${dados.length.toLocaleString('pt-BR')} produtos lidos`);
  check(meta&&DATA.test(meta.date)&&/^\d\d:\d\d:\d\d$/.test(meta.hora),`data/hora do relatório: ${meta&&meta.date} ${meta&&meta.hora}`);
  const perdidas=w.skip/(linhas||1);
  check(perdidas<0.005,`linhas ignoradas: ${w.skip} · realinhadas: ${w.realign} (limite: 0,5% ignoradas)`);
  if(tipo==='planograma'){
    check(dados.length===linhas-w.skip,'toda linha de produto do arquivo virou um produto',`${linhas} linhas × ${dados.length} produtos`);
    const b1=dados.filter(x=>!/^\d{8}$/.test(x.produto));check(!b1.length,'código do produto sempre com 8 dígitos',exemplos(b1,x=>x.produto));
    const b2=dados.filter(x=>!/^\d{8,14}$/.test(x.automacao));check(!b2.length,'EAN (automação) sempre numérico',exemplos(b2,x=>x.automacao+' '+x.descricao));
    for(const k of['emb','corredor','altura','largura','prof','total','cobplan','qtdestoque']){
      const b=dados.filter(x=>!NUMF.test(x[k]));check(!b.length,`coluna "${k}" sempre é número`,exemplos(b,x=>x.produto+'='+JSON.stringify(x[k])))}
    const b3=dados.filter(x=>!x.descricao);check(!b3.length,'todo produto tem descrição');
    const b4=dados.filter(x=>!x.categoria);b4.length?warn(`${b4.length} produtos sem categoria`):pass('todo produto tem categoria');
    const dup=dados.length-new Set(dados.map(x=>x.produto)).size;dup?warn(`${dup} códigos repetidos (o último vence no app)`):pass('nenhum código repetido');
  }else{
    check(dados.length===linhas-w.skip,'toda linha de produto do arquivo virou um produto',`${linhas} linhas × ${dados.length} produtos (códigos repetidos contam 1 vez)`);
    const b1=dados.filter(([k])=>!/^\d{8}$/.test(k));check(!b1.length,'código do produto sempre com 8 dígitos',exemplos(b1,([k])=>k));
    if(tipo==='cobertura'){
      for(const k of['estq','mdv','cob','vda12']){const b=dados.filter(([,x])=>!Number.isFinite(x[k]));check(!b.length,`"${k}" sempre é número`,exemplos(b,([p,x])=>p+'='+x[k]))}
      const b2=dados.filter(([,x])=>x.mdv<0||x.cob<0);check(!b2.length,'MDV e cobertura nunca negativos',exemplos(b2,([p,x])=>`${p} mdv ${x.mdv} cob ${x.cob}`));
      const b3=dados.filter(([,x])=>!/^\d{1,2}$/.test(x.sist));check(!b3.length,'sistemática (1 · 10 · 20) sempre lida',exemplos(b3,([p,x])=>p+'='+x.sist));
      const b4=dados.filter(([,x])=>!x.d);check(!b4.length,'todo produto tem descrição');
      const b5=dados.filter(([,x])=>!DT2.test(x.ue)||!DT2.test(x.uv));check(!b5.length,'última entrada/venda no formato dd/mm/aa (ou vazias)',exemplos(b5,([p,x])=>`${p} ${x.ue}|${x.uv}`));
      const b6=dados.filter(([,x])=>!x.c);b6.length?warn(`${b6.length} produtos sem categoria`):pass('todo produto tem categoria');
    }else{
      const b=dados.filter(([,x])=>!Number.isFinite(x.qt_transito)||x.qt_transito<0);check(!b.length,'quantidade em trânsito sempre número ≥ 0',exemplos(b,([p,x])=>p+'='+x.qt_transito));
    }
  }
}

const ref=fs.existsSync(REF)?JSON.parse(fs.readFileSync(REF,'utf8')):{};
const arquivos=fs.existsSync(PASTA)?fs.readdirSync(PASTA).filter(f=>/\.txt$/i.test(f)).sort():[];
const lidos={};
if(!arquivos.length)console.log(cor(33,`\n(Nenhum relatório em tests/relatorios/ — coloque os .txt lá para testar com dados reais.)`));
for(const f of arquivos){
  const buf=fs.readFileSync(path.join(PASTA,f)),hash=crypto.createHash('sha1').update(buf).digest('hex').slice(0,16);
  const t=call('decodeBuf',buf),tipo=tipoDe(t);
  console.log(cor(1,`\n${f}`)+(tipo?` → ${TIPOS[tipo].nome}`:''));
  if(!tipo){warn('não reconheci o tipo pelo cabeçalho (Planograma, Cobertura ou Trânsito) — arquivo pulado');continue}
  const r=ler(tipo,t);lidos[tipo]=lidos[tipo]||[];lidos[tipo].push(r);
  regras(tipo,r);
  /* 3) mesmo resultado de antes? */
  const atual=JSON.parse(JSON.stringify(r.resumo));
  if(SALVAR){ref[hash]={arquivo:f,tipo,resumo:atual};pass('resultado guardado como referência')}
  else if(ref[hash]){
    const antes=ref[hash].resumo,dif=Object.keys({...antes,...atual}).filter(k=>JSON.stringify(antes[k])!==JSON.stringify(atual[k]));
    check(!dif.length,'leitura igual à referência salva',dif.map(k=>`${k}: era ${JSON.stringify(antes[k])}, agora ${JSON.stringify(atual[k])}`).join(' · ').slice(0,600));
  }else warn('arquivo novo, sem referência — rode com --salvar para guardar este resultado como referência');
}
/* os relatórios conversam entre si? (mesma filial → a maioria dos códigos se repete) */
if(lidos.planograma&&(lidos.cobertura||lidos.transito)){
  console.log(cor(1,'\nRelatórios juntos'));
  const plano=new Set(lidos.planograma[0].dados.map(x=>x.produto));
  for(const k of['cobertura','transito'])if(lidos[k]){const E=lidos[k][0].dados,em=E.filter(([p])=>plano.has(p)).length,pc=em/E.length;
    (pc>=0.5?pass:warn)(`${TIPOS[k].nome}: ${Math.round(pc*100)}% dos códigos estão no Planograma`+(pc<0.5?' — são da mesma filial?':''))}
  const ds=Object.values(lidos).map(l=>l[0].meta.date);if(new Set(ds).size>1)warn(`datas diferentes entre os relatórios (${ds.join(', ')}) — o app avisa isso na faixa do topo`);
}
if(SALVAR){fs.writeFileSync(REF,JSON.stringify(ref,null,1)+'\n');console.log(cor(32,`\nReferência salva em tests/esperado.json`))}
console.log(`\n${falhas?cor(31,falhas+' FALHA(S)'):cor(32,'Tudo certo')} · ${ok} ok · ${avisos} aviso(s)\n`);
process.exit(falhas?1:0);
