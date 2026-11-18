/* Editor profissional do cartaz — VERSÃO DE TESTE
   Arquivo separado do cartaz.html: só é carregado quando o botão "Versão de teste" é clicado.
   Usa do cartaz.html: modoEditavel, ajustarNomes, ICONES, CORES_ICONE, iconePadrao, corPadrao, svgIcone.

   O que faz:
   - selecionar e arrastar nome, preços, rodapé e elementos novos (guias de centro com encaixe)
   - tamanho, giro, cor, fonte, negrito, centralizar, duplicar, excluir/ocultar
   - adicionar texto livre, ícone grande e faixa
   - desfazer/refazer (Ctrl+Z / Ctrl+Y), setas movem, Delete exclui, Ctrl+D duplica
   - aplicar o layout de um cartaz em todos e salvar como modelo para os próximos
   Posições ficam em fração do cartaz (cqw/cqh), então valem igual em A3 e A5. */
(function () {
  if (window.EditorPro) return;

  const area = document.getElementById('preview-area');
  const PAPEIS = [
    { papel: 'titulo', sel: '.row-header', alvo: '.produto-nome', nome: 'Nome do produto' },
    { papel: 'de', sel: '.box-price:first-child', alvo: '.value-price', nome: 'Preço DE' },
    { papel: 'por', sel: '.box-price:last-child', alvo: '.value-price', nome: 'Preço POR' },
    { papel: 'rodape', sel: '.validade', alvo: null, nome: 'Rodapé' }
  ];
  const CORES = ['#222222', '#ffffff', '#e6b800', '#d62828', '#f28c00', '#1a7f3c', '#0b5cad', '#444444'];
  const FONTES = [
    ['', 'Padrão'],
    ['"ImpactCustom", Impact, sans-serif', 'Impact'],
    ['"Arial Black", Arial, sans-serif', 'Arial Black'],
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ['Georgia, serif', 'Georgia'],
    ['"Archivo", system-ui, sans-serif', 'Archivo']
  ];
  const CHAVE_MODELO = 'cartaz-modelo-pro';

  /* ---------- Estilos ---------- */
  const css = document.createElement('style');
  css.textContent = `
    #preview-area .cartaz { container-type: size; }
    .ed { transform: translate(calc(var(--fx, 0) * 100cqw), calc(var(--fy, 0) * 100cqh)) rotate(calc(var(--r, 0) * 1deg)) scale(var(--s, 1)); }
    .ed.oculto { visibility: hidden; }
    .editor-pro .ed.oculto { visibility: visible; opacity: .25; }
    .livre { position: absolute; left: 50%; top: 18%; translate: -50% 0; white-space: nowrap; line-height: 1; z-index: 1; }
    .livre-texto { font-family: "ImpactCustom", Impact, sans-serif; font-size: 7cqw; color: #222; text-transform: uppercase; }
    .cartaz .livre-icone svg.trovao { display: block; width: 32cqw; height: 32cqw; }
    .livre-faixa { left: 0; translate: none; width: 100cqw; top: 8%; padding: 2.4cqw 0; background: #d62828; color: #fff; text-align: center;
      font-family: "ImpactCustom", Impact, sans-serif; font-size: 8cqw; text-transform: uppercase; }
    .editor-pro .ed { cursor: move; }
    .editor-pro .ed:hover { outline: 1px dashed #2b7fff; outline-offset: 3px; }
    .editor-pro .ed.sel { outline: 2px solid #2b7fff; outline-offset: 3px; }
    .guia { position: absolute; background: #ff2d7a; pointer-events: none; z-index: 5; display: none; }
    .guia.v { top: 0; bottom: 0; left: 50%; width: 1px; }
    .guia.h { left: 0; right: 0; top: 50%; height: 1px; }
    .guia.on { display: block; }
    body.arrastando { user-select: none; }
    body.exportando .ed { outline: none !important; }
    body.exportando .ed.oculto { visibility: hidden !important; opacity: 1 !important; }
    body.exportando .guia { display: none !important; }
    @media print { .ed { outline: none !important; } .ed.oculto { visibility: hidden !important; opacity: 1 !important; } .guia, .barra-pro { display: none !important; } }

    /* ---------- Interface do editor ----------
       Faixa fina de ferramentas (inserir, desfazer, layout) + inspetor à direita da mesa.
       O inspetor mostra só as propriedades do elemento selecionado. */
    .barra-pro, .painel-pro { --pro-faixa: 48px; font: 13px/1.3 "Archivo", system-ui, sans-serif; color: var(--tinta, #23262a); }
    .barra-pro, .painel-pro, .pro-menu { display: none; }
    body.editor-pro .barra-pro { display: flex; }
    body.editor-pro .painel-pro { display: flex; }
    body.editor-pro #preview-area { padding-right: calc(var(--pro-largura) + 24px); }

    .barra-pro { position: sticky; top: var(--pro-topo, 61px); z-index: 4; height: 48px; align-items: center; gap: 4px;
      padding: 0 16px 0 24px; background: #fbfcfa; border-bottom: 1px solid #c4c9c1; }
    .barra-pro .grupo { display: flex; align-items: center; gap: 2px; }
    .barra-pro .divisor { width: 1px; height: 22px; background: var(--linha, #dfe2dc); margin: 0 10px; }
    .barra-pro .espaco-pro { flex: 1; }

    .pro-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 32px; height: 32px; padding: 0 10px;
      font: 600 13px/1 "Archivo", system-ui, sans-serif; color: var(--tinta, #23262a); background: transparent; border: 1px solid transparent;
      border-radius: 6px; cursor: pointer; white-space: nowrap; }
    .pro-btn svg { width: 18px; height: 18px; flex: 0 0 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
    .pro-btn.so-icone { padding: 0; width: 32px; }
    .pro-btn:hover:not(:disabled) { background: #eceee9; }
    .pro-btn:active:not(:disabled) { background: #e2e5df; }
    .pro-btn:disabled { color: #a3a8ad; cursor: default; }
    .pro-btn[aria-pressed="true"], .pro-btn[aria-expanded="true"],
    .pro-btn[aria-pressed="true"]:hover:not(:disabled), .pro-btn[aria-expanded="true"]:hover:not(:disabled) { background: var(--tinta, #23262a); border-color: var(--tinta, #23262a); color: #fff; }
    .pro-btn.contorno { border-color: #c9cdc6; background: #fff; }
    .pro-btn.contorno:hover:not(:disabled) { border-color: var(--tinta, #23262a); background: #fff; }
    .pro-btn.perigo { color: #a3262a; }
    .pro-btn.perigo:hover:not(:disabled) { background: #fbeceb; }
    .barra-pro :focus-visible, .painel-pro :focus-visible, .pro-menu :focus-visible { outline: 2px solid var(--tinta, #23262a); outline-offset: 2px; }

    .selo-teste { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px; margin-right: 8px; border-radius: 12px;
      background: #fff6d6; color: #6b5200; font-size: 12px; font-weight: 600; }
    .selo-teste::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--raio, #f2b705); box-shadow: 0 0 0 2px rgba(242,183,5,.3); }
    #pro-status { color: var(--ok, #2f7d4f); font-weight: 600; margin-right: 12px; }
    #pro-status:empty { display: none; }

    .menu-pro { position: relative; }
    .pro-menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 6; width: 280px; padding: 6px; background: #fff;
      border: 1px solid #d3d7d0; border-radius: 10px; box-shadow: 0 12px 32px rgba(30,35,30,.18), 0 2px 6px rgba(30,35,30,.08); }
    .pro-menu.aberto { display: block; }
    .pro-menu button { display: grid; grid-template-columns: 18px 1fr; column-gap: 10px; width: 100%; padding: 9px 10px; text-align: left;
      background: none; border: 0; border-radius: 6px; cursor: pointer; font: 600 13px/1.3 "Archivo", system-ui, sans-serif; color: var(--tinta, #23262a); }
    .pro-menu button:hover { background: #f1f3ef; }
    .pro-menu button svg { width: 18px; height: 18px; grid-row: span 2; margin-top: 1px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
    .pro-menu button small { font-weight: 400; font-size: 12px; color: var(--tinta-suave, #5c6168); }
    .pro-menu hr { border: 0; border-top: 1px solid var(--linha, #dfe2dc); margin: 6px 4px; }
    .pro-menu .perigo { color: #a3262a; }

    /* Inspetor */
    .painel-pro { position: fixed; right: 0; bottom: 0; top: calc(var(--pro-topo, 61px) + 48px); z-index: 3; width: var(--pro-largura);
      flex-direction: column; background: var(--painel, #f7f8f5); border-left: 1px solid #c4c9c1; overflow-y: auto; }
    :root { --pro-largura: 272px; }
    .pro-vazio { padding: 32px 24px; color: var(--tinta-suave, #5c6168); }
    .pro-vazio svg { width: 28px; height: 28px; fill: none; stroke: var(--tinta, #23262a); stroke-width: 1.5; stroke-linejoin: round; margin-bottom: 12px; }
    .pro-vazio strong { display: block; color: var(--tinta, #23262a); font-size: 14px; line-height: 1.35; margin-bottom: 6px; }
    .pro-vazio p { margin: 0; font-size: 13px; }
    .pro-cab { display: flex; align-items: center; gap: 8px; padding: 14px 12px 12px 20px; border-bottom: 1px solid var(--linha, #dfe2dc); }
    .pro-cab div { flex: 1; min-width: 0; }
    #pro-selecionado { display: block; font-size: 15px; font-weight: 700; }
    #pro-onde { display: block; font-size: 12px; color: var(--tinta-suave, #5c6168); }
    .pro-secao { padding: 14px 20px 16px; border-bottom: 1px solid var(--linha, #dfe2dc); }
    .pro-secao h3 { margin: 0 0 10px; font-size: 12px; font-weight: 700; color: var(--tinta-suave, #5c6168); }
    .pro-campo { display: grid; grid-template-columns: 64px 1fr 44px; align-items: center; gap: 8px; margin-bottom: 8px; }
    .pro-campo label { font-size: 13px; }
    .pro-campo output { font-size: 12px; font-variant-numeric: tabular-nums; text-align: right; color: var(--tinta-suave, #5c6168); }
    .pro-campo input[type=range] { width: 100%; margin: 0; accent-color: var(--tinta, #23262a); }
    .pro-linha { display: flex; gap: 6px; }
    .pro-linha .pro-btn { flex: 1; }
    .pro-fonte { display: flex; gap: 6px; margin-bottom: 12px; }
    .pro-fonte select { flex: 1; min-width: 0; height: 32px; padding: 0 8px; font: 13px "Archivo", system-ui, sans-serif; color: var(--tinta, #23262a);
      background: #fff; border: 1px solid #c9cdc6; border-radius: 6px; }
    .pro-fonte .pro-btn { font-weight: 800; font-size: 14px; }
    .pro-rotulo { display: block; font-size: 13px; margin-bottom: 8px; }
    .pro-cores { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; }
    .pro-cores .cor { aspect-ratio: 1; width: 100%; padding: 0; border: 0; border-radius: 50%; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(0,0,0,.18); }
    .pro-cores .cor[aria-pressed="true"] { box-shadow: inset 0 0 0 1px rgba(0,0,0,.18), 0 0 0 2px var(--painel, #f7f8f5), 0 0 0 4px var(--tinta, #23262a); }
    .pro-cores .outra { position: relative; aspect-ratio: 1; border-radius: 50%; overflow: hidden; cursor: pointer;
      background: conic-gradient(#d62828, #f28c00, #e6b800, #1a7f3c, #0b5cad, #7a3db8, #d62828); box-shadow: inset 0 0 0 1px rgba(0,0,0,.18); }
    .pro-cores .outra input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: 0; padding: 0; }
    .pro-cores .outra:focus-within { outline: 2px solid var(--tinta, #23262a); outline-offset: 2px; }
    .pro-dica { margin: 8px 0 0; font-size: 12px; color: var(--tinta-suave, #5c6168); }
    .painel-pro.com-sel .pro-atalhos { display: none; }
    .pro-atalhos h3 { margin: 0 0 10px; font-size: 12px; font-weight: 700; }
    .pro-atalhos { margin-top: auto; padding: 16px 20px 20px; border-top: 1px solid var(--linha, #dfe2dc); font-size: 12px; color: var(--tinta-suave, #5c6168); }
    .pro-atalhos dl { display: grid; grid-template-columns: 96px 1fr; gap: 8px 10px; margin: 0; align-items: baseline; }
    .pro-atalhos dt { white-space: nowrap; }
    .pro-atalhos dd { margin: 0; }
    .pro-atalhos kbd { font: 600 11px/1 "Archivo", system-ui, sans-serif; padding: 3px 5px; border: 1px solid #c9cdc6; border-bottom-width: 2px; border-radius: 4px; background: #fff; color: var(--tinta, #23262a); }
    .painel-pro [hidden] { display: none !important; }

    @media (max-width: 900px) {
      .barra-pro { top: var(--pro-topo, 0px); padding: 0 8px; }
      .barra-pro .rotulo-btn { display: none; }
      .barra-pro .divisor { margin: 0 4px; }
      .selo-teste { margin-right: 4px; }
      body.editor-pro #preview-area { padding-right: 8px; }
      body.editor-pro.pro-com-sel #preview-area { padding-bottom: 52vh; }
      .painel-pro { top: auto; left: 0; width: auto; max-height: 48vh; border-left: 0; border-top: 1px solid #c4c9c1; border-radius: 14px 14px 0 0;
        box-shadow: 0 -10px 30px rgba(30,35,30,.18); }
      body.editor-pro:not(.pro-com-sel) .painel-pro { display: none; }
      .painel-pro::before { content: ""; align-self: center; flex: 0 0 4px; width: 36px; margin-top: 8px; border-radius: 2px; background: #c4c9c1; }
      .pro-cab { position: sticky; top: 0; background: var(--painel, #f7f8f5); z-index: 1; padding-top: 8px; }
      .pro-atalhos { display: none; }
      .pro-corpo { display: grid; grid-template-columns: 1fr; }
      .pro-btn { min-width: 40px; height: 40px; }
      .pro-btn.so-icone { width: 40px; }
      .pro-fonte select { height: 40px; }
    }
    @media (max-width: 900px) and (min-width: 600px) {
      .pro-corpo { grid-template-columns: 1fr 1fr; }
    }
    body.exportando .barra-pro, body.exportando .painel-pro, body.exportando .pro-menu { display: none !important; }
    body.exportando #preview-area { padding-right: 24px; }
    @media print { .barra-pro, .painel-pro, .pro-menu { display: none !important; } body.editor-pro #preview-area { padding: 0 !important; } }
    #btn-teste[aria-pressed="true"] { background: #f2b705; border-color: #f2b705; }
  `;
  document.head.appendChild(css);

  /* ---------- Ícones (traço, 20x20) ---------- */
  const ICO = {
    texto: '<path d="M4.5 5h11M10 5v11M7.5 16h5"/>',
    icone: '<path d="M11.5 2.5 4.5 11h5l-1 6.5 7-8.5h-5z"/>',
    faixa: '<rect x="2.5" y="7" width="15" height="6" rx="1"/><path d="M6 10h8"/>',
    desfazer: '<path d="M7 4.5 3.5 8 7 11.5"/><path d="M3.5 8H12a4.25 4.25 0 0 1 0 8.5H8.5"/>',
    refazer: '<path d="M13 4.5 16.5 8 13 11.5"/><path d="M16.5 8H8a4.25 4.25 0 0 0 0 8.5h3.5"/>',
    layout: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',
    seta: '<path d="m6 8 4 4 4-4"/>',
    centro: '<path d="M10 2.5v15"/><rect x="5" y="6.5" width="10" height="7" rx="1"/>',
    restaurar: '<path d="M4.2 8.5A6 6 0 1 1 5 13"/><path d="M4 3.5V8h4.5"/>',
    duplicar: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7"/>',
    olho: '<path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/>',
    olhoFechado: '<path d="M3 3l14 14"/><path d="M8.2 4.7A8 8 0 0 1 10 4.5c5 0 8 5.5 8 5.5a14 14 0 0 1-2.3 3"/><path d="M5.7 6.2C3.4 7.7 2 10 2 10s3 5.5 8 5.5a7.7 7.7 0 0 0 3.6-.9"/>',
    lixeira: '<path d="M3.5 6h13M8 6V4h4v2M5.5 6l.8 10.5h7.4L14.5 6"/>',
    fechar: '<path d="M5 5l10 10M15 5 5 15"/>',
    aplicar: '<rect x="2.5" y="4" width="6" height="12" rx="1"/><rect x="11.5" y="4" width="6" height="12" rx="1"/><path d="M8.5 10h3"/>',
    salvar: '<path d="M4 3.5h9.5L16.5 6.5V16.5H4z"/><path d="M7 3.5v4h6v-4M7 16.5v-5h6v5"/>',
    apagar: '<path d="M4 4l12 12M16 4 4 16"/>',
    cursor: '<path d="M5 3l11 6.5-5 1.3-2.3 4.7z"/>'
  };
  const svg = n => `<svg viewBox="0 0 20 20" aria-hidden="true">${ICO[n]}</svg>`;

  /* ---------- Faixa de ferramentas ---------- */
  const barra = document.createElement('div');
  barra.className = 'barra-pro';
  barra.setAttribute('role', 'toolbar');
  barra.setAttribute('aria-label', 'Ferramentas do editor');
  barra.innerHTML = `
    <div class="grupo" role="group" aria-label="Adicionar ao cartaz">
      <button type="button" class="pro-btn" data-acao="add-texto" title="Adicionar texto">${svg('texto')}<span class="rotulo-btn">Texto</span></button>
      <button type="button" class="pro-btn" data-acao="add-icone" title="Adicionar ícone grande">${svg('icone')}<span class="rotulo-btn">Ícone grande</span></button>
      <button type="button" class="pro-btn" data-acao="add-faixa" title="Adicionar faixa">${svg('faixa')}<span class="rotulo-btn">Faixa</span></button>
    </div>
    <span class="divisor" aria-hidden="true"></span>
    <div class="grupo" role="group" aria-label="Histórico">
      <button type="button" class="pro-btn so-icone" data-acao="desfazer" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">${svg('desfazer')}</button>
      <button type="button" class="pro-btn so-icone" data-acao="refazer" title="Refazer (Ctrl+Y)" aria-label="Refazer">${svg('refazer')}</button>
    </div>
    <span class="espaco-pro"></span>
    <span id="pro-status" role="status" aria-live="polite"></span>
    <span class="selo-teste" title="Editor em teste: os cartazes saem iguais no PDF, mas a interface ainda pode mudar"><span>Em teste</span></span>
    <div class="menu-pro">
      <button type="button" class="pro-btn" id="pro-menu-btn" aria-haspopup="true" aria-expanded="false" aria-controls="pro-menu">${svg('layout')}<span class="rotulo-btn">Layout</span>${svg('seta')}</button>
      <div class="pro-menu" id="pro-menu" role="menu" aria-label="Layout dos cartazes">
        <button type="button" role="menuitem" data-acao="aplicar-todos">${svg('aplicar')}<span>Aplicar em todos</span><small>Copia o layout deste cartaz para os outros</small></button>
        <hr>
        <button type="button" role="menuitem" data-acao="salvar-modelo">${svg('salvar')}<span>Salvar modelo</span><small>Os próximos cartazes já saem com este layout</small></button>
        <button type="button" role="menuitem" data-acao="esquecer-modelo" class="perigo">${svg('apagar')}<span>Esquecer modelo</span><small>Volta ao layout padrão nos próximos</small></button>
      </div>
    </div>`;
  document.querySelector('.barra').after(barra);

  /* ---------- Inspetor ---------- */
  const painel = document.createElement('aside');
  painel.className = 'painel-pro';
  painel.setAttribute('aria-label', 'Propriedades do elemento');
  painel.innerHTML = `
    <div class="pro-vazio" id="pro-vazio">
      ${svg('cursor')}
      <strong>Clique em um elemento do cartaz para editar</strong>
      <p>Nome, preços e rodapé podem ser movidos. Use a faixa acima para adicionar texto, ícone ou faixa.</p>
    </div>
    <div id="pro-props" hidden>
      <div class="pro-cab">
        <div><span id="pro-selecionado">Nada selecionado</span><span id="pro-onde"></span></div>
        <button type="button" class="pro-btn so-icone pro-fechar" data-acao="fechar" aria-label="Fechar edição (Esc)" title="Fechar (Esc)">${svg('fechar')}</button>
      </div>
      <div class="pro-corpo">
        <section class="pro-secao" aria-labelledby="pro-h-pos">
          <h3 id="pro-h-pos">Posição</h3>
          <div class="pro-campo"><label for="pro-tamanho">Tamanho</label><input id="pro-tamanho" type="range" min="30" max="250" value="100" data-sel><output id="pro-tamanho-v" for="pro-tamanho">100%</output></div>
          <div class="pro-campo"><label for="pro-giro">Girar</label><input id="pro-giro" type="range" min="-30" max="30" value="0" data-sel><output id="pro-giro-v" for="pro-giro">0°</output></div>
          <div class="pro-linha">
            <button type="button" class="pro-btn contorno" data-acao="centro" data-sel title="Centralizar na horizontal">${svg('centro')}Centralizar</button>
            <button type="button" class="pro-btn contorno" data-acao="zerar" data-sel title="Volta posição, tamanho e giro ao original">${svg('restaurar')}Restaurar</button>
          </div>
        </section>
        <section class="pro-secao" aria-labelledby="pro-h-aparencia">
          <h3 id="pro-h-aparencia">Texto</h3>
          <div class="pro-fonte" id="pro-fonte-linha">
            <select id="pro-fonte" data-sel aria-label="Fonte"></select>
            <button type="button" class="pro-btn contorno so-icone" data-acao="negrito" aria-pressed="false" data-sel title="Negrito" aria-label="Negrito">N</button>
          </div>
          <span class="pro-rotulo" id="pro-cor-rotulo">Cor do texto</span>
          <div class="pro-cores" id="pro-cores" role="group" aria-labelledby="pro-cor-rotulo">
            <label class="outra" title="Outra cor"><input id="pro-cor" type="color" value="#222222" aria-label="Outra cor" data-sel></label>
          </div>
        </section>
        <section class="pro-secao" aria-labelledby="pro-h-elem">
          <h3 id="pro-h-elem">Elemento</h3>
          <div class="pro-linha">
            <button type="button" class="pro-btn contorno" data-acao="duplicar" data-sel title="Duplicar (Ctrl+D)">${svg('duplicar')}Duplicar</button>
            <button type="button" class="pro-btn contorno" data-acao="excluir" data-sel title="Delete">${svg('olhoFechado')}<span>Ocultar</span></button>
          </div>
          <p class="pro-dica" id="pro-dica-dup" hidden>Duplicar vale só para o que você adicionou.</p>
        </section>
      </div>
    </div>
    <div class="pro-atalhos">
      <h3>Atalhos</h3>
      <dl>
        <dt><kbd>Setas</kbd></dt><dd>Mover aos poucos</dd>
        <dt><kbd>Shift</kbd> <kbd>Setas</kbd></dt><dd>Mover mais</dd>
        <dt><kbd>Alt</kbd></dt><dd>Arrastar sem encaixe</dd>
        <dt><kbd>Ctrl</kbd> <kbd>D</kbd></dt><dd>Duplicar</dd>
        <dt><kbd>Delete</kbd></dt><dd>Ocultar ou excluir</dd>
        <dt><kbd>Ctrl</kbd> <kbd>Z</kbd></dt><dd>Desfazer</dd>
        <dt><kbd>Ctrl</kbd> <kbd>Y</kbd></dt><dd>Refazer</dd>
      </dl>
    </div>`;
  document.body.appendChild(painel);

  const $ = id => document.getElementById(id);
  const menuBtn = $('pro-menu-btn'), menu = $('pro-menu');
  CORES.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cor'; b.style.background = c; b.dataset.cor = c; b.dataset.sel = '';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Cor ' + c); b.title = c;
    $('pro-cores').insertBefore(b, $('pro-cores').lastElementChild);
  });
  FONTES.forEach(([v, n]) => { const o = document.createElement('option'); o.value = v; o.textContent = n; $('pro-fonte').appendChild(o); });

  // A faixa fica logo abaixo da barra principal, cuja altura muda quando quebra linha
  const barraPrincipal = document.querySelector('.barra');
  const medirTopo = () => document.documentElement.style.setProperty('--pro-topo', barraPrincipal.offsetHeight + 'px');
  medirTopo();
  if (window.ResizeObserver) new ResizeObserver(medirTopo).observe(barraPrincipal);
  else window.addEventListener('resize', medirTopo);

  let tempoStatus = null;
  function avisar(msg) {
    $('pro-status').textContent = msg;
    clearTimeout(tempoStatus);
    tempoStatus = setTimeout(() => { $('pro-status').textContent = ''; }, 2200);
  }
  function abrirMenu(abrir) {
    menu.classList.toggle('aberto', abrir);
    menuBtn.setAttribute('aria-expanded', String(abrir));
    if (abrir) { const p = menu.querySelector('button'); if (p) p.focus(); }
  }
  menuBtn.addEventListener('click', () => abrirMenu(!menu.classList.contains('aberto')));
  document.addEventListener('pointerdown', e => { if (menu.classList.contains('aberto') && !e.target.closest('.menu-pro')) abrirMenu(false); });
  menu.addEventListener('keydown', e => {
    const itens = [...menu.querySelectorAll('button')], i = itens.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); itens[(i + (e.key === 'ArrowDown' ? 1 : itens.length - 1)) % itens.length].focus(); }
    if (e.key === 'Escape') { e.stopPropagation(); abrirMenu(false); menuBtn.focus(); }
  });

  /* ---------- Preparar cartazes ---------- */
  function preparar(cartaz) {
    PAPEIS.forEach(p => {
      const el = cartaz.querySelector(p.sel);
      if (el && !el.dataset.papel) { el.dataset.papel = p.papel; el.classList.add('ed'); }
    });
    if (!cartaz.querySelector('.guia')) cartaz.insertAdjacentHTML('beforeend', '<div class="guia v"></div><div class="guia h"></div>');
  }
  function prepararTodos() { area.querySelectorAll('.cartaz').forEach(preparar); }
  new MutationObserver(() => {
    const novos = [...area.querySelectorAll('.cartaz')].filter(c => !c.querySelector('.guia'));
    novos.forEach(c => { preparar(c); const m = lerModelo(); if (m && ativo) aplicarLayout(c, m); });
  }).observe(area, { childList: true });

  /* ---------- Seleção ---------- */
  let ativo = false, selecionado = null;
  const infoPapel = el => PAPEIS.find(p => p.papel === el.dataset.papel);
  const alvoTexto = el => { const p = infoPapel(el); return (p && p.alvo && el.querySelector(p.alvo)) || el; };
  const num = (el, v, padrao) => { const n = parseFloat(el.style.getPropertyValue(v)); return isNaN(n) ? padrao : n; };

  function selecionar(el) {
    if (selecionado) selecionado.classList.remove('sel');
    selecionado = el;
    if (el) el.classList.add('sel');
    atualizarBarra();
    if (el) requestAnimationFrame(() => manterVisivel(el));
  }
  // Em tela estreita o painel vira folha inferior: rola a página para o elemento não ficar escondido
  function manterVisivel(el) {
    if (!window.matchMedia('(max-width: 900px)').matches || arrasto) return;
    const folha = painel.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.bottom > folha.top - 12) window.scrollBy({ top: r.bottom - folha.top + 24, behavior: 'smooth' });
  }
  const ehLivre = (el, tipo) => el.classList.contains('livre-' + tipo);
  function paraHex(c) {
    const m = String(c).match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return '';
    return '#' + m.slice(0, 3).map(n => Math.round(+n).toString(16).padStart(2, '0')).join('');
  }
  function corDoElemento(el) {
    if (ehLivre(el, 'faixa')) return paraHex(getComputedStyle(el).backgroundColor);
    if (ehLivre(el, 'icone')) return paraHex(getComputedStyle(el).color);
    return paraHex(getComputedStyle(alvoTexto(el)).color);
  }
  function atualizarBarra() {
    const el = selecionado;
    painel.querySelectorAll('[data-sel]').forEach(c => { c.disabled = !el; });
    document.body.classList.toggle('pro-com-sel', !!el);
    painel.classList.toggle('com-sel', !!el);
    $('pro-vazio').hidden = !!el;
    $('pro-props').hidden = !el;
    if (!el) { $('pro-selecionado').textContent = 'Nada selecionado'; return; }
    const p = infoPapel(el);
    $('pro-selecionado').textContent = p ? p.nome : ehLivre(el, 'faixa') ? 'Faixa' : ehLivre(el, 'icone') ? 'Ícone grande' : 'Texto';
    const cartazes = [...area.querySelectorAll('.cartaz')], idx = cartazes.indexOf(el.closest('.cartaz'));
    $('pro-onde').textContent = cartazes.length > 1 && idx >= 0 ? `Cartaz ${idx + 1} de ${cartazes.length}` : '';
    $('pro-tamanho').value = Math.round(num(el, '--s', 1) * 100);
    $('pro-giro').value = num(el, '--r', 0);
    mostrarValores();
    const alvo = alvoTexto(el);
    $('pro-fonte').value = alvo.style.fontFamily && FONTES.some(f => f[0] === alvo.style.fontFamily) ? alvo.style.fontFamily : '';
    painel.querySelector('[data-acao=negrito]').setAttribute('aria-pressed', String(alvo.style.fontWeight === '900' || alvo.style.fontWeight === 'bold'));
    // Ícone não tem texto: some a linha de fonte e o título da seção muda
    const icone = ehLivre(el, 'icone');
    $('pro-fonte-linha').hidden = icone;
    $('pro-h-aparencia').textContent = icone ? 'Aparência' : 'Texto';
    $('pro-cor-rotulo').textContent = ehLivre(el, 'faixa') ? 'Cor do fundo' : icone ? 'Cor do ícone' : 'Cor do texto';
    const cor = corDoElemento(el);
    painel.querySelectorAll('.cor').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cor === cor)));
    if (cor) $('pro-cor').value = cor;
    // Ocultar / Mostrar / Excluir
    const bEx = painel.querySelector('[data-acao=excluir]');
    const livre = el.classList.contains('livre'), oculto = el.classList.contains('oculto');
    bEx.innerHTML = livre ? svg('lixeira') + '<span>Excluir</span>' : oculto ? svg('olho') + '<span>Mostrar</span>' : svg('olhoFechado') + '<span>Ocultar</span>';
    bEx.classList.toggle('perigo', livre);
    const bDup = painel.querySelector('[data-acao=duplicar]');
    bDup.disabled = !livre;
    $('pro-dica-dup').hidden = livre;
  }
  function mostrarValores() {
    $('pro-tamanho-v').textContent = $('pro-tamanho').value + '%';
    $('pro-giro-v').textContent = $('pro-giro').value + '°';
  }

  /* ---------- Histórico ---------- */
  const desfazer = [], refazer = [];
  const fotografia = () => { const c = area.cloneNode(true); c.querySelectorAll('.sel').forEach(e => e.classList.remove('sel')); return c.innerHTML; };
  function registrar() {
    const f = fotografia();
    if (desfazer[desfazer.length - 1] !== f) { desfazer.push(f); if (desfazer.length > 60) desfazer.shift(); }
    refazer.length = 0;
  }
  function restaurar(de, para) {
    if (!de.length) return;
    para.push(fotografia());
    area.innerHTML = de.pop();
    selecionado = null; atualizarBarra();
    if (typeof ajustarNomes === 'function') ajustarNomes();
  }

  /* ---------- Arrastar ---------- */
  let arrasto = null, arrastou = false;
  area.addEventListener('pointerdown', e => {
    if (!ativo || e.button !== 0) return;
    const el = e.target.closest('.ed');
    if (!el) { if (!e.target.closest('.barra-pro')) selecionar(null); return; }
    selecionar(el);
    const cartaz = el.closest('.cartaz');
    arrasto = { el, cartaz, x: e.clientX, y: e.clientY, fx: num(el, '--fx', 0), fy: num(el, '--fy', 0), movendo: false, id: e.pointerId };
  });
  window.addEventListener('pointermove', e => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
    if (!arrasto.movendo) {
      if (Math.hypot(dx, dy) < 4) return;
      arrasto.movendo = true; registrar();
      if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
      window.getSelection().removeAllRanges();
      document.body.classList.add('arrastando');
    }
    const r = arrasto.cartaz.getBoundingClientRect();
    let fx = arrasto.fx + dx / r.width, fy = arrasto.fy + dy / r.height;
    const el = arrasto.el;
    el.style.setProperty('--fx', fx.toFixed(4)); el.style.setProperty('--fy', fy.toFixed(4));
    // Encaixe no centro do cartaz (segure Alt para soltar livre)
    const er = el.getBoundingClientRect();
    const cx = (er.left + er.width / 2 - r.left) / r.width, cy = (er.top + er.height / 2 - r.top) / r.height;
    const gv = arrasto.cartaz.querySelector('.guia.v'), gh = arrasto.cartaz.querySelector('.guia.h');
    const encV = !e.altKey && Math.abs(cx - 0.5) < 0.015, encH = !e.altKey && Math.abs(cy - 0.5) < 0.012;
    if (encV) { fx += 0.5 - cx; el.style.setProperty('--fx', fx.toFixed(4)); }
    if (encH) { fy += 0.5 - cy; el.style.setProperty('--fy', fy.toFixed(4)); }
    gv.classList.toggle('on', encV); gh.classList.toggle('on', encH);
  });
  window.addEventListener('pointerup', e => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    if (arrasto.movendo) {
      arrastou = true;
      arrasto.cartaz.querySelectorAll('.guia').forEach(g => g.classList.remove('on'));
      document.body.classList.remove('arrastando');
    }
    arrasto = null;
  });
  // Depois de arrastar, o clique não abre a galeria nem edita o texto
  area.addEventListener('click', e => { if (arrastou) { e.stopPropagation(); e.preventDefault(); arrastou = false; } }, true);

  /* ---------- Ações ---------- */
  function definir(prop, valor) {
    if (!selecionado) return;
    selecionado.style.setProperty(prop, valor);
  }
  function corAtual(cor) {
    if (!selecionado) return;
    registrar();
    if (selecionado.classList.contains('livre-faixa')) selecionado.style.background = cor;
    else if (selecionado.classList.contains('livre-icone')) selecionado.style.color = cor;
    else alvoTexto(selecionado).style.color = cor;
    atualizarBarra();
  }
  function cartazAlvo() { return (selecionado && selecionado.closest('.cartaz')) || area.querySelector('.cartaz'); }
  function adicionar(tipo) {
    const cartaz = cartazAlvo();
    if (!cartaz) { alert('Gere ou crie um cartaz primeiro.'); return; }
    registrar();
    const el = document.createElement('div');
    el.className = 'ed livre livre-' + tipo;
    if (tipo === 'texto') { el.textContent = 'Novo texto'; el.contentEditable = 'true'; el.spellcheck = false; }
    if (tipo === 'faixa') { el.textContent = 'Oferta'; el.contentEditable = 'true'; el.spellcheck = false; }
    if (tipo === 'icone') {
      const id = (typeof iconePadrao !== 'undefined' && iconePadrao !== 'nenhum') ? iconePadrao : 'raio';
      el.style.color = (typeof CORES_ICONE !== 'undefined' && CORES_ICONE[corPadrao]) || '#e6b800';
      el.innerHTML = typeof svgIcone === 'function' ? svgIcone(id, el.style.color, 'left') : '';
      el.dataset.icone = id;
    }
    cartaz.querySelector('.area-util').appendChild(el);
    selecionar(el);
  }
  function excluir() {
    if (!selecionado) return;
    registrar();
    if (selecionado.classList.contains('livre')) { selecionado.remove(); selecionar(null); }
    else { selecionado.classList.toggle('oculto'); atualizarBarra(); }
  }
  function duplicar() {
    if (!selecionado || !selecionado.classList.contains('livre')) {
      if (selecionado) alert('Só dá para duplicar elementos adicionados (texto, ícone grande, faixa).');
      return;
    }
    registrar();
    const c = selecionado.cloneNode(true);
    c.classList.remove('sel');
    c.style.setProperty('--fx', (num(selecionado, '--fx', 0) + 0.03).toFixed(4));
    c.style.setProperty('--fy', (num(selecionado, '--fy', 0) + 0.03).toFixed(4));
    selecionado.after(c); selecionar(c);
  }

  /* ---------- Layout / modelo ---------- */
  function extrairLayout(cartaz) {
    const papeis = {};
    cartaz.querySelectorAll('[data-papel]').forEach(el => {
      const alvo = alvoTexto(el);
      papeis[el.dataset.papel] = { estilo: el.getAttribute('style') || '', oculto: el.classList.contains('oculto'), alvo: alvo !== el ? (alvo.getAttribute('style') || '') : null };
    });
    const livres = [...cartaz.querySelectorAll('.livre')].map(el => { const c = el.cloneNode(true); c.classList.remove('sel'); return c.outerHTML; });
    return { papeis, livres };
  }
  function aplicarLayout(cartaz, layout) {
    preparar(cartaz);
    Object.entries(layout.papeis || {}).forEach(([papel, d]) => {
      const el = cartaz.querySelector(`[data-papel="${papel}"]`);
      if (!el) return;
      el.setAttribute('style', d.estilo);
      el.classList.toggle('oculto', !!d.oculto);
      const alvo = alvoTexto(el);
      // o nome tem a fonte ajustada pelo tamanho do texto: não copia font-size dele
      if (alvo !== el && d.alvo !== null) {
        const tmp = document.createElement('div'); tmp.setAttribute('style', d.alvo);
        ['color', 'fontFamily', 'fontWeight'].forEach(k => { alvo.style[k] = tmp.style[k]; });
      }
    });
    cartaz.querySelectorAll('.livre').forEach(l => l.remove());
    const util = cartaz.querySelector('.area-util');
    (layout.livres || []).forEach(h => util.insertAdjacentHTML('beforeend', h));
  }
  function lerModelo() { try { return JSON.parse(localStorage.getItem(CHAVE_MODELO) || 'null'); } catch (e) { return null; } }

  /* ---------- Eventos da barra ---------- */
  function aoClicar(e) {
    const b = e.target.closest('button');
    if (!b || b.id === 'pro-menu-btn') return;
    if (b.getAttribute('role') === 'menuitem') abrirMenu(false);
    if (b.dataset.cor) { corAtual(b.dataset.cor); return; }
    const acao = b.dataset.acao;
    if (acao === 'add-texto') adicionar('texto');
    if (acao === 'add-icone') adicionar('icone');
    if (acao === 'add-faixa') adicionar('faixa');
    if (acao === 'fechar') selecionar(null);
    if (acao === 'excluir') excluir();
    if (acao === 'duplicar') duplicar();
    if (acao === 'desfazer') restaurar(desfazer, refazer);
    if (acao === 'refazer') restaurar(refazer, desfazer);
    if (acao === 'centro' && selecionado) {
      registrar();
      const r = selecionado.closest('.cartaz').getBoundingClientRect(), er = selecionado.getBoundingClientRect();
      definir('--fx', (num(selecionado, '--fx', 0) + 0.5 - (er.left + er.width / 2 - r.left) / r.width).toFixed(4));
    }
    if (acao === 'zerar' && selecionado) {
      registrar();
      ['--fx', '--fy', '--s', '--r'].forEach(v => selecionado.style.removeProperty(v));
      atualizarBarra();
    }
    if (acao === 'negrito' && selecionado) {
      registrar();
      const alvo = alvoTexto(selecionado);
      alvo.style.fontWeight = b.getAttribute('aria-pressed') === 'true' ? '' : '900';
      atualizarBarra();
    }
    if (acao === 'aplicar-todos') {
      const base = cartazAlvo();
      if (!base) { alert('Gere ou crie um cartaz primeiro.'); return; }
      const outros = [...area.querySelectorAll('.cartaz')].filter(c => c !== base);
      if (!outros.length) { avisar('Só há um cartaz'); return; }
      registrar();
      const layout = extrairLayout(base);
      outros.forEach(c => aplicarLayout(c, layout));
      if (typeof ajustarNomes === 'function') ajustarNomes();
      avisar(outros.length === 1 ? 'Layout aplicado em 1 cartaz' : `Layout aplicado em ${outros.length} cartazes`);
    }
    if (acao === 'salvar-modelo') {
      const base = cartazAlvo();
      if (!base) { alert('Gere ou crie um cartaz primeiro.'); return; }
      try { localStorage.setItem(CHAVE_MODELO, JSON.stringify(extrairLayout(base))); avisar('Modelo salvo'); }
      catch (err) { alert('Não consegui salvar o modelo: ' + err.message); }
    }
    if (acao === 'esquecer-modelo') {
      try { localStorage.removeItem(CHAVE_MODELO); } catch (err) {}
      avisar('Modelo esquecido');
    }
  }
  barra.addEventListener('click', aoClicar);
  painel.addEventListener('click', aoClicar);
  // Sliders: registra o histórico uma vez por arrasto
  ['pro-tamanho', 'pro-giro'].forEach(id => {
    $(id).addEventListener('pointerdown', () => registrar());
    $(id).addEventListener('keydown', () => registrar());
  });
  $('pro-tamanho').addEventListener('input', e => { definir('--s', (e.target.value / 100).toFixed(2)); mostrarValores(); });
  $('pro-giro').addEventListener('input', e => { definir('--r', e.target.value); mostrarValores(); });
  $('pro-cor').addEventListener('change', e => corAtual(e.target.value));
  $('pro-fonte').addEventListener('change', e => { if (!selecionado) return; registrar(); alvoTexto(selecionado).style.fontFamily = e.target.value; if (typeof ajustarNomes === 'function') ajustarNomes(); });

  /* ---------- Teclado ---------- */
  document.addEventListener('keydown', e => {
    if (!ativo) return;
    if (e.key === 'Escape' && menu.classList.contains('aberto')) { abrirMenu(false); menuBtn.focus(); return; }
    if (e.key === 'Escape' && selecionado && document.activeElement && document.activeElement.isContentEditable && area.contains(document.activeElement)) {
      document.activeElement.blur(); window.getSelection().removeAllRanges(); selecionar(null); return;
    }
    const editando = document.activeElement && (document.activeElement.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'z' && !editando) { e.preventDefault(); restaurar(e.shiftKey ? refazer : desfazer, e.shiftKey ? desfazer : refazer); return; }
    if (ctrl && e.key.toLowerCase() === 'y' && !editando) { e.preventDefault(); restaurar(refazer, desfazer); return; }
    if (editando || !selecionado) return;
    if (ctrl && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicar(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); excluir(); return; }
    if (e.key === 'Escape') { selecionar(null); return; }
    const passo = e.shiftKey ? 0.02 : 0.004;
    const mov = { ArrowLeft: ['--fx', -passo], ArrowRight: ['--fx', passo], ArrowUp: ['--fy', -passo], ArrowDown: ['--fy', passo] }[e.key];
    if (mov) {
      e.preventDefault();
      if (!e.repeat) registrar();
      definir(mov[0], (num(selecionado, mov[0], 0) + mov[1]).toFixed(4));
    }
  });

  /* ---------- Ligar / desligar ---------- */
  function ligar() {
    ativo = true;
    document.body.classList.add('editor-pro');
    if (typeof modoEditavel !== 'undefined' && !modoEditavel) document.getElementById('modelo').click();
    prepararTodos();
    atualizarBarra();
  }
  function desligar() {
    ativo = false;
    abrirMenu(false);
    selecionar(null);
    document.body.classList.remove('editor-pro');
  }
  window.EditorPro = { ligar, desligar, get ativo() { return ativo; } };
})();
