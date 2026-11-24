/* Planograma Mobile — COMO FUNCIONA (v74)
   Desenho e fluidez: agente de IHM (nov/2026). Uma folha só, com grupos de abrir/fechar.
   Entradas: Dados (todas fechadas, funciona como índice) e atalhos "?" por bloco (abre já na seção certa):
   Situação dos produtos (Resumo e Filtros) · "Como ler esta ficha" · "Ver todos os gestos" (dica do Pedido) · Anexos · Resumo vazio.
   O texto fica num <template> no index.html: nada é montado até o 1º toque. Aberta pela ficha ou pelos Filtros, ao fechar volta para eles. */
const helpSheet=mkSheet('help-sheet');
let helpVolta=null,helpDe=null;
function openHelp(sec,de){
  if(!$('help-body').firstElementChild){$('help-body').appendChild($('tpl-ajuda').content.cloneNode(true));$('help-x').onclick=()=>helpSheet.close()}
  const alvo=sec?$('aj-'+sec):null;
  document.querySelectorAll('#help-body details.hlp').forEach(d=>d.open=d===alvo);
  helpDe=de||document.activeElement;helpVolta=null;
  if(fichaSheet.opened&&fichaR){const r=fichaR;helpVolta=()=>openSheet(r);sheetSwap=true;fichaSheet.close()}
  else if(fltSheet.opened){helpVolta=()=>openFlt(true);sheetSwap=true;fltSheet.close()}
  helpSheet.open();pushOv('help');
  requestAnimationFrame(()=>{const b=$('help-body');if(alvo){b.scrollTop=alvo.offsetTop-8;alvo.querySelector('summary').focus({preventScroll:true})}else{b.scrollTop=0;$('help-x').focus({preventScroll:true})}});
}
helpSheet.on('closed',()=>{if(helpVolta){const f=helpVolta;helpVolta=null;setTimeout(f,60)}else if(helpDe&&helpDe.focus&&document.contains(helpDe))helpDe.focus({preventScroll:true})});
document.addEventListener('click',e=>{const b=e.target.closest('[data-aj]');if(!b)return;e.preventDefault();e.stopPropagation();openHelp(b.dataset.aj,b)},true);
