/* Teste de fumaça (roda no GitHub a cada envio — sem relatórios, que não vão para o repositório público):
   abre o app num celular simulado, passa por todas as abas e falha se aparecer qualquer erro de JavaScript.
   Uso:  node tests/fumaca.js   (na pasta planograma; precisa do Playwright com Chromium) */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium,devices}=require('playwright');
const RAIZ=path.join(__dirname,'..');
const TIPOS={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const srv=http.createServer((q,r)=>{let f=path.join(RAIZ,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
  if(!f.startsWith(RAIZ)||!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TIPOS[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
(async()=>{
  // a versão do código (APP_VER em js/nuvem.js) tem que ser igual à do cache (V em sw.js)
  const vSw=(/const V='planograma-condor-(v\d+)/.exec(fs.readFileSync(path.join(RAIZ,'sw.js'),'utf8'))||[])[1],vJs=(/const APP_VER='(v\d+)'/.exec(fs.readFileSync(path.join(RAIZ,'js/nuvem.js'),'utf8'))||[])[1];
  if(!vSw||vSw!==vJs){console.error(`✗ Versões diferentes: sw.js=${vSw} · APP_VER=${vJs} — atualize as duas juntas`);process.exit(1)}
  console.log('versão '+vSw+' (sw.js = APP_VER)');
  await new Promise(ok=>srv.listen(0,ok));const url=`http://127.0.0.1:${srv.address().port}/index.html`;
  const br=await chromium.launch(),erros=[];let falhou=false;
  for(const dev of ['Pixel 7','iPhone 14']){
    const ctx=await br.newContext({...devices[dev],serviceWorkers:'block'}),p=await ctx.newPage();
    p.on('pageerror',e=>erros.push(`${dev}: ${e.message}`));
    p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|firebase|net::/i.test(m.text()))erros.push(`${dev} console: ${m.text()}`)});
    await p.route(/firebaseio|googleapis|gstatic|cdnjs/,r=>r.abort());          // sem internet externa no teste
    await p.goto(url);await p.waitForTimeout(1500);
    // produtos FICTÍCIOS (gerados aqui — nenhum dado da loja vai para o repositório público)
    try{await p.evaluate(async()=>{const S=['rup','crit','ok'],recs=[],est={},tr={};
      for(let i=0;i<120;i++){const cod=String(1000000+i).padStart(8,'0'),um=i%4===0;
        recs.push({st:'A',automacao:String(7890000000000+i),produto:cod,descricao:'PRODUTO TESTE '+i+(i%3?' 1KG':' 500ML'),emb:String([6,12,24][i%3]).padStart(4,'0'),
          referencia:'R'+i,fornec:'1000',nome:'FORNECEDOR TESTE',sist:['01','10','20'][i%3],giro:['A','B','C'][i%3],corredor:String(i%10),
          altura:um?'1':String(1+i%4),largura:um?'1':String(1+i%3),prof:String([6,12,24][i%3]),total:'',cobplan:String(i%30),qtdestoque:String(i%7===0?0:i*3),pbl:'',categoria:['MERCEARIA->ARROZ','LIMPEZA->SABAO','BEBIDAS->AGUA'][i%3]});
        est[cod]={estq:i%7===0?(i%2?-3:0):i*3,compra:0,bloq:false,mdv:i%9,cob:i%40,cl:'B',vda12:i*100,sist:['1','10','20'][i%3],d:'PRODUTO TESTE '+i,r:'R'+i,f:'1000 FORNECEDOR TESTE',c:'MERCEARIA',ue:'01/10/26',uv:'30/10/26'};
        tr[cod]={qt_transito:i%5===0?12:0}}
      estoqueMap=est;estoqueLoaded=true;estoqueMeta={date:'01/11/2026',hora:'08:00:00'};
      await loadRecords(recs,{date:'01/11/2026',hora:'08:00:00',filial:'000 - LOJA TESTE'},'teste',tr,false);transitMeta={date:'01/11/2026',hora:'08:00:00'};derive()})}
    catch(e){erros.push(`${dev} · carregar produtos de teste: ${e.message.split('\n').slice(0,2).join(' ')}`)}
    // passa pelas telas e pelas ações principais
    const passos=[['Resumo',()=>go('home')],['Produtos',()=>go('prod')],['Ficha',()=>openSheet(list[0])],['Fecha ficha',()=>closeSheet()],
      ['Filtros',()=>{openFlt();renderFlt()}],['Ordenar',()=>{F.sort='dim';renderList(true)}],['1x1 nova cobertura',()=>{F.d111=true;NOVA=15;renderList(true)}],
      ['Pedido',()=>{allRecords.slice(0,15).forEach(r=>addPed(r,'',true));savePed();go('ped')}],['Urgência',()=>{setUrg(allRecords[3],'a');setRcd(allRecords[4],true);renderPed()}],
      ['Anexos',()=>go('enc')],['Dados',()=>go('data')],['Atualizar',()=>puxarAtualizar()],['Resumo de novo',()=>{setHSist('20');setHSist('');go('home')}]];
    for(const [nome,fn] of passos){try{await p.evaluate(fn);await p.waitForTimeout(250)}catch(e){erros.push(`${dev} · ${nome}: ${e.message.split('\n')[0]}`)}}
    const ok=await p.evaluate(()=>typeof app!=='undefined'&&!!document.querySelector('#nav'));
    if(!ok){erros.push(`${dev}: o app não montou a tela`)}
    console.log(`${dev}: ${ok?'abriu':'NÃO abriu'} · telas e ações visitadas`);await ctx.close()}
  await br.close();srv.close();
  if(erros.length){console.error('\n✗ Erros encontrados:\n  '+erros.join('\n  '));falhou=true}
  else console.log('\n✓ Tudo certo — o app abre, carrega produtos de teste e todas as telas funcionam sem erro');
  process.exit(falhou?1:0)})();
