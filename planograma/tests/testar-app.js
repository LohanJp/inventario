#!/usr/bin/env node
/* ═══ TESTE DO APP NO NAVEGADOR (opcional) ══════════════════════════════════════
   Abre o app num Chrome invisível (tamanho de celular), carrega os relatórios de tests/relatorios/ pela aba Dados
   (como você faria) e passa por todas as abas. Falha se aparecer QUALQUER erro de JavaScript.
   Precisa instalar 1 vez:   npm install   e   npx playwright install chromium
   Rodar:                    npm run test:app
   A nuvem fica desligada durante o teste (nada é enviado ao Firebase).
   Versão Framework7: mesmos passos da versão anterior, com os seletores da interface nova
   (abas = #nav [data-s=…], Anexos = #ax-seg [data-axs=…]) e passos a mais para a lista virtual, gestos, ficha e tema. */
const http=require('http'),fs=require('fs'),path=require('path');
const RAIZ=path.join(__dirname,'..'),PASTA=path.join(__dirname,'relatorios');
let chromium;try{({chromium}=require('playwright'))}catch{console.log('Falta o Playwright: rode  npm install  e  npx playwright install chromium');process.exit(1)}

/* reconhece o tipo de cada relatório pelo cabeçalho (mesma regra do testar-leitura.js) */
const cabeca=f=>fs.readFileSync(f).subarray(0,6000).toString('utf8');
const arqs=fs.existsSync(PASTA)?fs.readdirSync(PASTA).filter(f=>/\.txt$/i.test(f)).map(f=>path.join(PASTA,f)):[];
const achar=re=>arqs.find(f=>re.test(cabeca(f)));
const R={plano:achar(/Automacao/),cob:achar(/Vda 12 meses/),trans:achar(/Qt\.Transito/)};
/* sem os .txt: usa o arquivo "Baixar tudo da nuvem" (planograma_nuvem_*.json) — traz Planograma, Cobertura e Trânsito juntos */
const NUVEM=fs.existsSync(PASTA)?fs.readdirSync(PASTA).filter(f=>/^planograma_nuvem.*\.json$/i.test(f)).sort().pop():null;
if((!R.plano||process.argv.includes('--nuvem'))&&NUVEM){R.plano=path.join(PASTA,NUVEM);R.nuvem=true;R.cob=R.trans=null}
if(!R.plano){console.log('Coloque em tests/relatorios/ o relatório de Planograma (.txt) ou o arquivo planograma_nuvem_*.json do app');process.exit(1)}

/* servidor local simples, só para o teste */
const TIPO={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const srv=http.createServer((q,s)=>{const p=path.join(RAIZ,decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/,'/index.html'));
  if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){s.writeHead(404);return s.end()}
  s.writeHead(200,{'Content-Type':TIPO[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(s)});

(async()=>{
  await new Promise(r=>srv.listen(0,r));const URL=`http://localhost:${srv.address().port}/`;
  const br=await chromium.launch(),ctx=await br.newContext({serviceWorkers:'block',viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true}),p=await ctx.newPage();
  const erros=[];let falhas=0;
  p.on('pageerror',e=>erros.push(e.message));p.on('dialog',d=>d.accept());
  await p.route(/firebaseio\.com/,r=>r.abort());                       // nuvem desligada
  const passo=async(nome,fn)=>{const n=erros.length;try{const info=await fn();
      if(erros.length>n)throw Error(erros.slice(n).join(' | '));console.log('  ✓ '+nome+(info?' — '+info:''))}
    catch(e){falhas++;console.log('  ✗ '+nome+' — '+String(e.message).split('\n')[0])}};
  const espera=ms=>p.waitForTimeout(ms);
  console.log('\nTeste do app no navegador'+(R.nuvem?' (arquivo da nuvem .json)':' (relatórios .txt)'));
  await passo('abre o app (Framework7 carregado do próprio app, sem CDN)',async()=>{await p.goto(URL);await espera(800);
    return await p.evaluate(()=>'Framework7 '+Framework7.version+' · tema '+app.theme)});
  await passo(R.nuvem?'carrega o arquivo da nuvem (.json)':'carrega o Planograma',async()=>{await p.setInputFiles('#f-plano',R.plano);await p.waitForFunction(()=>allRecords.length>0,null,{timeout:60000});await espera(R.nuvem?1500:0);
    return (await p.evaluate(()=>allRecords.length+' produtos'+(estoqueLoaded?' · com Cobertura':'')+(transitLoaded?' · com Trânsito':'')))});
  if(R.nuvem)R.nuvemCob=await p.evaluate(()=>estoqueLoaded);   // o arquivo da nuvem já traz a Cobertura (o teste do backup confere)
  if(R.cob)await passo('carrega a Cobertura',async()=>{await p.setInputFiles('#cob-input',R.cob);await p.waitForFunction(()=>estoqueLoaded,null,{timeout:60000});await espera(300);return (await p.evaluate(()=>allRecords.filter(r=>r._m).length))+' com MDV'});
  if(R.trans)await passo('carrega o Trânsito',async()=>{await p.setInputFiles('#f-trans',R.trans);await p.waitForFunction(()=>transitLoaded,null,{timeout:60000});await espera(300);return (await p.evaluate(()=>allRecords.filter(r=>r._t>0).length))+' a caminho'});
  await passo('Resumo mostra os números',async()=>{await p.click('#nav [data-s=home]');await espera(300);
    const k=await p.$$eval('.kpi .n',x=>x.map(e=>e.textContent));if(!k.length)throw Error('sem números no Resumo');return k.join(' · ')});
  await passo('Produtos lista e busca',async()=>{await p.click('#nav [data-s=prod]');await espera(400);
    const t=await p.$eval('#cnt',e=>e.textContent);const nome=await p.$eval('#list .p .nm',e=>e.textContent);
    await p.fill('#q',nome.split(' ').slice(0,2).join(' '));await espera(400);if(!(await p.$('#list .p')))throw Error('busca não achou o próprio produto');return t});
  await passo('lista virtual: só os cartões visíveis ficam na tela',async()=>{await p.fill('#q','');await espera(400);
    const [n,tot]=await p.evaluate(()=>[document.querySelectorAll('#list li').length,list.length]);
    if(tot>200&&n>120)throw Error(`${n} cartões desenhados de ${tot}`);
    await p.evaluate(()=>$('s-prod').scrollTop=60000);await espera(300);const fim=await p.evaluate(()=>document.querySelectorAll('#list li').length);
    await p.evaluate(()=>$('s-prod').scrollTop=0);await espera(200);return `${n} de ${tot} desenhados · rolando: ${fim}`});
  await passo('abre a ficha do produto (folha que sobe de baixo)',async()=>{await p.click('#list .p .infb');await espera(450);
    if(!(await p.evaluate(()=>fichaSheet.opened&&$('sheet').classList.contains('modal-in'))))throw Error('a ficha não abriu');
    const t=await p.$eval('#sheet h3',e=>e.textContent);await p.click('#sh-x');await espera(450);await p.fill('#q','');
    if(await p.evaluate(()=>fichaSheet.opened))throw Error('a ficha não fechou');return t});
  await passo('filtros e categorias (folha única de Filtros)',async()=>{
    for(const c of['sug','cd','rup','ok','all']){await p.click('#flt-btn');await espera(400);await p.click(`#flt-list .fs-s[data-c=${c}]`);await p.click('#flt-apply');await espera(450)}
    await p.click('#flt-btn');await espera(400);await p.click('#cat-pick-btn');await espera(500);await p.click('#cat-list .cs-item[data-action=drill]');await espera(150);await p.click('#cs-apply-btn');await espera(700);
    if(!(await p.evaluate(()=>fltSheet.opened&&!!D&&!!D.cat)))throw Error('não voltou para Filtros com a categoria');
    await p.click('#flt-list [data-ent="1"]');await p.click('#flt-apply');await espera(450);
    const r=await p.evaluate(()=>F.cat+' · Sist. '+F.ent+' · '+list.length+' itens · botão: '+$('flt-n').textContent+' filtros');
    await p.click('#catx .catx');await espera(200);return r});
  await passo('filtro de cobertura total (menor que / maior que)',async()=>{
    await p.click('#flt-btn');await espera(400);await p.click('#flt-list [data-cop=lt]');await p.click('#flt-list [data-cq="7"]');await p.click('#flt-apply');await espera(450);
    const a=await p.evaluate(()=>[list.length,list.filter(r=>!(r._ct!==null&&r._k!=='sg'&&Math.max(r._ct,0)<7)).length]);if(!a[0]||a[1])throw Error(`menor que 7: ${a[1]} itens fora da regra`);
    await p.click('#flt-btn');await espera(400);await p.click('#flt-list [data-cop=gt]');await p.fill('#fs-cobd','30');await p.click('#flt-apply');await espera(450);
    const b=await p.evaluate(()=>[list.length,list.filter(r=>!(r._ct!==null&&r._k!=='sg'&&Math.max(r._ct,0)>30)).length,$('flt-n').textContent]);if(!b[0]||b[1])throw Error(`maior que 30: ${b[1]} itens fora da regra`);
    await p.click('#catx [data-x=cob]');await espera(300);if(await p.evaluate(()=>!!F.cob))throw Error('o ✕ não tirou o filtro');
    return `< 7 dias: ${a[0]} itens · > 30 dias: ${b[0]} itens`});
  await passo('ordenação e sistemática',async()=>{for(const v of['cob_d','mdv_d','mdv_a','cob','est','nome','cobt'])await p.selectOption('#sort',v);
    await p.click('#flt-btn');await espera(400);await p.click('#flt-list [data-ent="20"]');await p.click('#flt-apply');await espera(400);
    const n=await p.evaluate(()=>list.length);await p.click('#flt-btn');await espera(400);await p.click('#flt-clear');await p.click('#flt-apply');await espera(400);
    if(await p.evaluate(()=>nFiltros()))throw Error('Limpar não zerou');return 'Sist. 20: '+n+' itens'});
  await passo('gesto em Produtos: → concluir e ← adicionar ao pedido',async()=>{
    const pr=await p.$eval('#list li .p',e=>e.dataset.p);
    await p.evaluate(()=>{const a=document.querySelector('#list li [data-sw=ok]');a.click()});await espera(350);
    const done=await p.evaluate(pr=>byProd.get(pr)._d,pr);if(!done)throw Error('não marcou como concluído');
    await p.evaluate(()=>{const a=document.querySelector('#list li [data-sw=ok]');a.click()});await espera(350);   // desfaz
    await p.evaluate(()=>{const a=document.querySelector('#list li [data-sw=add]');a.click()});await espera(350);
    if(!(await p.evaluate(pr=>!!inPed(pr),pr)))throw Error('não entrou no pedido');return 'item '+pr});
  await passo('adiciona sugestões ao pedido',async()=>{await p.click('#nav [data-s=home]');await espera(300);if(await p.$('#sg-add:not([disabled])'))await p.click('#sg-add');
    await p.click('#nav [data-s=ped]');await espera(300);return (await p.$eval('#phead .t',e=>e.textContent))});
  await passo('gesto no Pedido: → concluir e ← excluir (com desfazer)',async()=>{
    const n0=await p.evaluate(()=>pedido.length);
    await p.evaluate(()=>document.querySelector('#pnd [data-sw=ok]').click());await espera(500);
    const dn=await p.evaluate(()=>pedido.filter(x=>x.done).length);
    await p.evaluate(()=>document.querySelector('#pnd [data-sw=del]').click());await espera(900);
    const n1=await p.evaluate(()=>pedido.length);if(n1!==n0-1)throw Error(`excluir: ${n0} → ${n1}`);
    await p.click('#tu');await espera(200);const n2=await p.evaluate(()=>pedido.length);if(n2!==n0)throw Error('desfazer não voltou o item');
    return `${dn} concluído(s) · excluir/desfazer ok`});
  await passo('Anexos: Panfleto (antigo Encarte), Lâmina (antigo Panfleto) e Oferta do dia',async()=>{await p.click('#nav [data-s=enc]');await espera(200);
    for(const a of['enc','pan','dia']){await p.click(`#ax-seg [data-axs=${a}]`);await espera(200)}
    await p.click('#ax-seg [data-axs=pan]');
    const nome=await p.evaluate(()=>allRecords[0].descricao);await p.fill('#pf-txt',nome+' · 9,99');
    await p.click('#pf-go');await p.click('#pf-ask-days button');await espera(600);return await p.$eval('#pf-sum',e=>e.textContent)});
  await passo('números calculados sem erro (estoque, trânsito, coberturas)',async()=>{const n=await p.evaluate(()=>allRecords.filter(r=>!Number.isFinite(r._e)||!Number.isFinite(r._t)||(r._ct!==null&&!Number.isFinite(r._ct))||(r._sg!==0&&!(r._sg>0))).length);if(n)throw new Error(n+' produtos com número inválido (NaN)');return 'ok'});
  await passo('aba Dados e backup',async()=>{await p.click('#fresh-gear');await espera(200);const b=await p.evaluate(()=>buildBackup());
    if(!b.records.length)throw Error('backup vazio');if((R.cob||R.nuvemCob)&&!b.estoque)throw Error('backup sem Cobertura')});
  await passo('modo claro e escuro',async()=>{await p.click('#theme-seg [data-t=dark]');const d=await p.evaluate(()=>document.documentElement.classList.contains('dark'));
    await p.click('#theme-seg [data-t=light]');const l=await p.evaluate(()=>!document.documentElement.classList.contains('dark'));
    await p.click('#theme-seg [data-t=auto]');if(!d||!l)throw Error('o tema não trocou');return 'ok'});
  await passo('botão voltar: fecha a ficha e volta ao Resumo',async()=>{await p.click('#nav [data-s=prod]');await espera(300);await p.click('#list .p .infb');await espera(450);
    await p.goBack();await espera(450);if(await p.evaluate(()=>fichaSheet.opened))throw Error('voltar não fechou a ficha');
    await p.goBack();await espera(300);const t=await p.evaluate(()=>curTab);if(t!=='home')throw Error('voltar foi para '+t);return 'ok'});
  await br.close();srv.close();
  console.log(`\n${falhas?falhas+' FALHA(S)':'Tudo certo'}${erros.length?' · erros de JavaScript: '+erros.join(' | '):''}\n`);
  process.exit(falhas?1:0);
})();
