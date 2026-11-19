/* Editor profissional — interface: faixa de ferramentas, inspetor (Propriedades / Camadas),
   popovers (cores, fontes, formas, ícones, zoom, arquivo, layout), menu de contexto e painel de atalhos. */
(function () {
  const EP = window.EP;
  const $ = EP.$;
  const ui = EP.ui = {};

  /* ---------- Ícones de interface (traço 20x20) ---------- */
  const ICO = {
    texto: '<path d="M4.5 5h11M10 5v11M7.5 16h5"/>',
    formas: '<rect x="2.5" y="9" width="8" height="8" rx="1"/><circle cx="13.5" cy="6.5" r="4"/>',
    icone: '<path d="M11.5 2.5 4.5 11h5l-1 6.5 7-8.5h-5z"/>',
    imagem: '<rect x="2.5" y="3.5" width="15" height="13" rx="1.5"/><circle cx="7" cy="8" r="1.5"/><path d="m3 15 4.5-4.5 3 3 2-2 4.5 4"/>',
    faixa: '<rect x="2.5" y="7" width="15" height="6" rx="1"/><path d="M6 10h8"/>',
    desfazer: '<path d="M7 4.5 3.5 8 7 11.5"/><path d="M3.5 8H12a4.25 4.25 0 0 1 0 8.5H8.5"/>',
    refazer: '<path d="M13 4.5 16.5 8 13 11.5"/><path d="M16.5 8H8a4.25 4.25 0 0 0 0 8.5h3.5"/>',
    menos: '<path d="M5 10h10"/>',
    mais: '<path d="M5 10h10M10 5v10"/>',
    regua: '<path d="M2.5 13.5 13.5 2.5l4 4-11 11z"/><path d="m6 10 1.5 1.5M8.5 7.5 10 9M11 5l1.5 1.5"/>',
    grade: '<rect x="3" y="3" width="14" height="14" rx="1"/><path d="M3 7.7h14M3 12.3h14M7.7 3v14M12.3 3v14"/>',
    folha: '<path d="M5 2.5h6.5l3.5 3.5v11.5H5z"/><path d="M11.5 2.5V6H15"/><path d="M10 9.5v5M7.5 12h5"/>',
    arquivo: '<path d="M5 2.5h6.5l3.5 3.5v11.5H5z"/><path d="M11.5 2.5V6H15"/>',
    layout: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',
    ajuda: '<circle cx="10" cy="10" r="7.5"/><path d="M7.8 7.8a2.3 2.3 0 1 1 3 2.2c-.6.2-.8.7-.8 1.2v.5"/><path d="M10 14.3v.2"/>',
    seta: '<path d="m6 8 4 4 4-4"/>',
    fechar: '<path d="M5 5l10 10M15 5 5 15"/>',
    cursor: '<path d="M5 3l11 6.5-5 1.3-2.3 4.7z"/>',
    duplicar: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7"/>',
    olho: '<path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/>',
    olhoFechado: '<path d="M3 3l14 14"/><path d="M8.2 4.7A8 8 0 0 1 10 4.5c5 0 8 5.5 8 5.5a14 14 0 0 1-2.3 3"/><path d="M5.7 6.2C3.4 7.7 2 10 2 10s3 5.5 8 5.5a7.7 7.7 0 0 0 3.6-.9"/>',
    lixeira: '<path d="M3.5 6h13M8 6V4h4v2M5.5 6l.8 10.5h7.4L14.5 6"/>',
    cadeado: '<rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>',
    cadeadoAberto: '<rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 5.8-1"/>',
    agrupar: '<rect x="2.5" y="2.5" width="15" height="15" rx="2" stroke-dasharray="2.5 2"/><rect x="5.5" y="5.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>',
    desagrupar: '<rect x="3" y="3" width="6.5" height="6.5" rx="1"/><rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1"/>',
    frente: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" fill-opacity=".18"/><path d="M13 4.5V3.5A1 1 0 0 0 12 2.5H3.5a1 1 0 0 0-1 1V12a1 1 0 0 0 1 1h1"/>',
    tras: '<rect x="2.5" y="2.5" width="10" height="10" rx="1.5" fill="currentColor" fill-opacity=".18"/><path d="M15.5 7.5h1a1 1 0 0 1 1 1V16.5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1"/>',
    topo: '<path d="M10 16V4M5.5 8.5 10 4l4.5 4.5M4 2.5h12"/>',
    fundo: '<path d="M10 4v12M5.5 11.5 10 16l4.5-4.5M4 17.5h12"/>',
    alEsq: '<path d="M3 2.5v15"/><rect x="5.5" y="5" width="11" height="3.5" rx=".8"/><rect x="5.5" y="11.5" width="6.5" height="3.5" rx=".8"/>',
    alCentro: '<path d="M10 2.5v15"/><rect x="4" y="5" width="12" height="3.5" rx=".8"/><rect x="6.5" y="11.5" width="7" height="3.5" rx=".8"/>',
    alDir: '<path d="M17 2.5v15"/><rect x="3.5" y="5" width="11" height="3.5" rx=".8"/><rect x="8" y="11.5" width="6.5" height="3.5" rx=".8"/>',
    alTopo: '<path d="M2.5 3h15"/><rect x="5" y="5.5" width="3.5" height="11" rx=".8"/><rect x="11.5" y="5.5" width="3.5" height="6.5" rx=".8"/>',
    alMeio: '<path d="M2.5 10h15"/><rect x="5" y="4" width="3.5" height="12" rx=".8"/><rect x="11.5" y="6.5" width="3.5" height="7" rx=".8"/>',
    alBase: '<path d="M2.5 17h15"/><rect x="5" y="3.5" width="3.5" height="11" rx=".8"/><rect x="11.5" y="8" width="3.5" height="6.5" rx=".8"/>',
    distH: '<path d="M2.5 3v14M17.5 3v14"/><rect x="7.5" y="6" width="5" height="8" rx=".8"/>',
    distV: '<path d="M3 2.5h14M3 17.5h14"/><rect x="6" y="7.5" width="8" height="5" rx=".8"/>',
    txtEsq: '<path d="M3 5h14M3 8.5h9M3 12h14M3 15.5h9"/>',
    txtCentro: '<path d="M3 5h14M5.5 8.5h9M3 12h14M5.5 15.5h9"/>',
    txtDir: '<path d="M3 5h14M8 8.5h9M3 12h14M8 15.5h9"/>',
    espelharH: '<path d="M10 2.5v15" stroke-dasharray="2 2"/><path d="M7.5 5 3 15h4.5zM12.5 5 17 15h-4.5z"/>',
    espelharV: '<path d="M2.5 10h15" stroke-dasharray="2 2"/><path d="M5 7.5 15 3v4.5zM5 12.5 15 17v-4.5z"/>',
    copiar: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7"/>',
    colar: '<rect x="4" y="3.5" width="12" height="14" rx="1.5"/><path d="M7.5 3.5V2.5h5v1M7 8h6M7 11h6M7 14h3.5"/>',
    recortar: '<circle cx="5.5" cy="14.5" r="2.5"/><circle cx="14.5" cy="14.5" r="2.5"/><path d="M7.3 12.7 15 3M12.7 12.7 5 3"/>',
    abrir: '<path d="M2.5 5.5v10h13l2-7h-13l-2 7"/><path d="M2.5 5.5h5l1.5 1.5h6v1.5"/>',
    salvar: '<path d="M4 3.5h9.5L16.5 6.5V16.5H4z"/><path d="M7 3.5v4h6v-4M7 16.5v-5h6v5"/>',
    aplicar: '<rect x="2.5" y="4" width="6" height="12" rx="1"/><rect x="11.5" y="4" width="6" height="12" rx="1"/><path d="M8.5 10h3"/>',
    apagar: '<path d="M4 4l12 12M16 4 4 16"/>',
    gotas: '<path d="m12.5 4.5 3 3M14 3a2.1 2.1 0 0 1 3 3l-2 2-3-3z"/><path d="m12 7-7.5 7.5-.8 2.8 2.8-.8L14 9"/>',
    restaurar: '<path d="M4.2 8.5A6 6 0 1 1 5 13"/><path d="M4 3.5V8h4.5"/>',
    girar: '<path d="M15.5 9.5a5.5 5.5 0 1 1-1.8-4.1"/><path d="M15.5 3.5v3h-3"/>',
    estilo: '<path d="M4 3.5h10v4H4z"/><path d="M14 5.5h2v4.5h-6.5v2.5"/><rect x="8" y="12.5" width="3" height="5" rx=".8"/>',
    cartaz: '<rect x="4.5" y="2.5" width="11" height="15" rx="1"/><path d="M7 11h6M7 13.5h4"/>',
    selecionar: '<rect x="3" y="3" width="14" height="14" rx="1" stroke-dasharray="2.5 2"/>',
    mais3: '<circle cx="4.5" cy="10" r="1.3" fill="currentColor"/><circle cx="10" cy="10" r="1.3" fill="currentColor"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor"/>'
  };
  const svg = (n, cls) => `<svg viewBox="0 0 20 20" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${ICO[n] || ''}</svg>`;
  ui.svg = svg; ui.ICO = ICO;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MAC = /Mac|iPhone|iPad/.test(navigator.platform);
  const K = MAC ? '⌘' : 'Ctrl';

  /* ---------- Faixa de ferramentas ---------- */
  const barra = document.createElement('div');
  barra.className = 'barra-pro';
  barra.setAttribute('role', 'toolbar');
  barra.setAttribute('aria-label', 'Ferramentas do editor');
  barra.innerHTML = `
    <div class="grupo" role="group" aria-label="Nova folha">
      <button type="button" class="pro-btn" aria-label="Folha em branco" data-acao="nova-folha" title="Folha em branco, sem modelo pronto (Shift+N)">${svg('folha')}<span class="rotulo-btn">Folha em branco</span></button>
    </div>
    <span class="divisor" aria-hidden="true"></span>
    <div class="grupo" role="group" aria-label="Adicionar ao cartaz">
      <button type="button" class="pro-btn" aria-label="Texto" data-acao="add-texto" title="Adicionar texto (T)">${svg('texto')}<span class="rotulo-btn">Texto</span></button>
      <button type="button" class="pro-btn" aria-label="Formas" data-pop="formas" aria-haspopup="true" aria-expanded="false" title="Adicionar forma">${svg('formas')}<span class="rotulo-btn">Formas</span>${svg('seta', 'seta-menu')}</button>
      <button type="button" class="pro-btn" aria-label="Ícone" data-pop="icones" aria-haspopup="true" aria-expanded="false" title="Adicionar ícone">${svg('icone')}<span class="rotulo-btn">Ícone</span>${svg('seta', 'seta-menu')}</button>
      <button type="button" class="pro-btn" aria-label="Imagem" data-acao="add-imagem" title="Adicionar imagem do computador">${svg('imagem')}<span class="rotulo-btn">Imagem</span></button>
      <button type="button" class="pro-btn" aria-label="Faixa" data-acao="add-faixa" title="Adicionar faixa">${svg('faixa')}<span class="rotulo-btn">Faixa</span></button>
    </div>
    <span class="divisor" aria-hidden="true"></span>
    <div class="grupo" role="group" aria-label="Histórico">
      <button type="button" class="pro-btn so-icone" data-acao="desfazer" title="Desfazer (${K}+Z)" aria-label="Desfazer">${svg('desfazer')}</button>
      <button type="button" class="pro-btn so-icone" data-acao="refazer" title="Refazer (${K}+Y)" aria-label="Refazer">${svg('refazer')}</button>
    </div>
    <span class="divisor" aria-hidden="true"></span>
    <div class="grupo" role="group" aria-label="Zoom">
      <button type="button" class="pro-btn so-icone so-largo" data-acao="zoom-menos" title="Diminuir zoom (${K}+−)" aria-label="Diminuir zoom">${svg('menos')}</button>
      <button type="button" class="pro-btn pro-zoom-valor" data-pop="zoom" aria-haspopup="true" aria-expanded="false" title="Zoom (${K}+roda do mouse)" id="pro-zoom-valor">50%</button>
      <button type="button" class="pro-btn so-icone so-largo" data-acao="zoom-mais" title="Aumentar zoom (${K}+=)" aria-label="Aumentar zoom">${svg('mais')}</button>
    </div>
    <div class="grupo" role="group" aria-label="Ajudas visuais">
      <button type="button" class="pro-btn so-icone" data-acao="regua" aria-pressed="false" title="Régua em mm (Shift+R)" aria-label="Régua">${svg('regua')}</button>
      <button type="button" class="pro-btn so-icone" data-acao="grade" aria-pressed="false" title="Grade de 10 mm (Shift+G)" aria-label="Grade">${svg('grade')}</button>
    </div>
    <span class="espaco-pro"></span>
    <span class="selo-teste" title="Editor em teste: os cartazes saem iguais no PDF, mas a interface ainda pode mudar"><span>Em teste</span></span>
    <button type="button" class="pro-btn" aria-label="Arquivo" data-pop="arquivo" aria-haspopup="true" aria-expanded="false" title="Abrir e salvar projeto">${svg('arquivo')}<span class="rotulo-btn">Arquivo</span>${svg('seta', 'seta-menu')}</button>
    <button type="button" class="pro-btn" aria-label="Layout" data-pop="layout" aria-haspopup="true" aria-expanded="false" title="Layout dos cartazes">${svg('layout')}<span class="rotulo-btn">Layout</span>${svg('seta', 'seta-menu')}</button>
    <button type="button" class="pro-btn so-icone" data-acao="atalhos" title="Atalhos do teclado (?)" aria-label="Atalhos do teclado">${svg('ajuda')}</button>
    <button type="button" class="pro-btn so-icone" data-pop="mais" aria-haspopup="true" aria-expanded="false" title="Mais: zoom, régua, grade, arquivo, layout e atalhos" aria-label="Mais opções">${svg('mais3')}</button>`;
  document.querySelector('.barra').after(barra);

  /* ---------- Inspetor ---------- */
  const painel = document.createElement('aside');
  painel.className = 'painel-pro';
  painel.setAttribute('aria-label', 'Inspetor');
  const deslize = (id, rot, min, max, passo, un) => `
    <div class="pro-deslize"><label for="${id}">${rot}</label>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${passo}">
      <span class="pro-num"><input type="number" id="${id}-n" min="${min}" max="${max}" step="${passo}" aria-label="${rot}"><span class="un">${un}</span></span></div>`;
  const numero = (id, rot, un, extra) => `<span class="pro-num"><span class="rot" aria-hidden="true">${rot}</span><input type="number" id="${id}" step="any" aria-label="${extra || rot}"><span class="un">${un}</span></span>`;
  const corBtn = (id, rot, so) => `<button type="button" class="pro-cor-btn${so ? ' so' : ''}" id="${id}" title="${rot}" aria-label="${rot}"><i></i>${so ? '' : `<span>${rot}</span>`}</button>`;
  painel.innerHTML = `
    <div class="pro-abas" role="tablist">
      <button type="button" role="tab" id="pro-aba-p" aria-selected="true" aria-controls="pro-props">Propriedades</button>
      <button type="button" role="tab" id="pro-aba-c" aria-selected="false" aria-controls="pro-camadas-aba">Camadas<span class="conta" id="pro-conta-camadas">0</span></button>
    </div>
    <div class="pro-rolagem" id="pro-props" role="tabpanel" aria-labelledby="pro-aba-p">
      <div class="pro-cab" id="pro-cab">
        <div><span id="pro-selecionado">Cartaz</span><span id="pro-onde"></span></div>
        <button type="button" class="pro-btn so-icone" data-acao="fechar" id="pro-fechar" aria-label="Tirar seleção (Esc)" title="Tirar seleção (Esc)">${svg('fechar')}</button>
      </div>
      <div class="pro-trava-aviso" id="pro-trava-aviso" hidden>${svg('cadeado')}<span>Travado: não move nem edita.</span><button type="button" data-acao="travar">Destravar</button></div>

      <div class="pro-vazio" id="pro-vazio">
        ${svg('cursor')}
        <strong>Clique em um elemento para editar</strong>
        <p>Arraste na mesa para selecionar vários. Use a faixa acima para adicionar texto, formas, ícones e imagens.</p>
      </div>

      <details class="pro-secao" data-secao="cartaz" open><summary>Cartaz</summary><div class="pro-corpo-secao">
        <div class="pro-l">${corBtn('pi-fundo', 'Cor do fundo')}<button type="button" class="pro-btn contorno cresce" data-acao="fundo-todos" title="Usa esta cor de fundo em todos os cartazes">Usar em todos</button></div>
        <div class="pro-acoes coluna">
          <button type="button" class="pro-btn contorno" data-acao="selecionar-tudo">${svg('selecionar')}<span>Selecionar tudo (${K}+A)</span></button>
          <button type="button" class="pro-btn contorno" data-acao="colar">${svg('colar')}<span>Colar (${K}+V)</span></button>
        </div>
      </div></details>

      <details class="pro-secao" data-secao="texto" open><summary>Texto</summary><div class="pro-corpo-secao">
        <button type="button" class="pro-campo-sel" id="pi-fonte" aria-haspopup="true"><span>Impact</span>${svg('seta')}</button>
        <div class="pro-l">
          <span class="pro-num tam"><button type="button" data-passo="-1" aria-label="Diminuir fonte" title="Diminuir fonte">−</button><input type="number" id="pi-tam" min="1" max="2000" step="1" aria-label="Tamanho da fonte em pontos"><span class="un">pt</span><button type="button" data-passo="1" aria-label="Aumentar fonte" title="Aumentar fonte">+</button></span>
          <span class="cresce"></span>
          ${corBtn('pi-cor-texto', 'Cor do texto').replace('<span>Cor do texto</span>', '<span>Cor</span>')}
        </div>
        <div class="pro-l">
          <span class="pro-seg" role="group" aria-label="Estilo">
            <button type="button" class="pro-btn letra" data-acao="negrito" aria-pressed="false" title="Negrito (${K}+B)" aria-label="Negrito"><b>N</b></button>
            <button type="button" class="pro-btn letra" data-acao="italico" aria-pressed="false" title="Itálico (${K}+I)" aria-label="Itálico"><i style="font-family:Georgia,serif">I</i></button>
            <button type="button" class="pro-btn letra" data-acao="sublinhado" aria-pressed="false" title="Sublinhado (${K}+U)" aria-label="Sublinhado"><u>S</u></button>
            <button type="button" class="pro-btn letra" data-acao="caixa" id="pi-caixa" title="Maiúsculas / minúsculas (${K}+Shift+K)" aria-label="Maiúsculas e minúsculas">AA</button>
          </span>
          <span class="cresce"></span>
          <span class="pro-seg" role="group" aria-label="Alinhamento do texto">
            <button type="button" class="pro-btn" data-acao="txt-left" aria-pressed="false" title="Alinhar texto à esquerda" aria-label="Texto à esquerda">${svg('txtEsq')}</button>
            <button type="button" class="pro-btn" data-acao="txt-center" aria-pressed="false" title="Centralizar texto" aria-label="Texto centralizado">${svg('txtCentro')}</button>
            <button type="button" class="pro-btn" data-acao="txt-right" aria-pressed="false" title="Alinhar texto à direita" aria-label="Texto à direita">${svg('txtDir')}</button>
          </span>
        </div>
        ${deslize('pi-letras', 'Espaço entre letras', -100, 800, 10, '')}
        ${deslize('pi-linhas', 'Espaço entre linhas', 0.6, 2.5, 0.05, '')}
        <p class="pro-dica" id="pi-dica-linha">Shift+Enter quebra a linha no texto.</p>
      </div></details>

      <details class="pro-secao" data-secao="efeitos"><summary>Efeitos do texto</summary><div class="pro-corpo-secao">
        <div class="pro-efeito" data-efeito="sombra"><header><span>Sombra</span><button type="button" class="pro-chave" role="switch" aria-checked="false" id="pi-sombra" aria-label="Sombra"></button></header>
          <div class="corpo" hidden>
            ${deslize('pi-sombra-dist', 'Distância', 0, 30, 1, '')}
            ${deslize('pi-sombra-dir', 'Direção', 0, 359, 1, '°')}
            ${deslize('pi-sombra-blur', 'Desfoque', 0, 30, 1, '')}
            ${deslize('pi-sombra-op', 'Opacidade', 0, 100, 1, '%')}
            ${corBtn('pi-sombra-cor', 'Cor da sombra')}
          </div></div>
        <div class="pro-efeito" data-efeito="contorno"><header><span>Contorno</span><button type="button" class="pro-chave" role="switch" aria-checked="false" id="pi-contorno" aria-label="Contorno"></button></header>
          <div class="corpo" hidden>
            ${deslize('pi-contorno-esp', 'Espessura', 1, 20, 1, '')}
            ${corBtn('pi-contorno-cor', 'Cor do contorno')}
          </div></div>
        <div class="pro-efeito" data-efeito="destaque"><header><span>Fundo do texto</span><button type="button" class="pro-chave" role="switch" aria-checked="false" id="pi-destaque" aria-label="Fundo do texto"></button></header>
          <div class="corpo" hidden>
            ${corBtn('pi-destaque-cor', 'Cor do fundo')}
            ${deslize('pi-destaque-raio', 'Arredondamento', 0, 50, 1, '')}
          </div></div>
      </div></details>

      <details class="pro-secao" data-secao="faixa" open><summary>Faixa</summary><div class="pro-corpo-secao">
        ${corBtn('pi-faixa-cor', 'Cor da faixa')}
      </div></details>

      <details class="pro-secao" data-secao="forma" open><summary>Forma</summary><div class="pro-corpo-secao">
        <div class="pro-grade2">${corBtn('pi-preench', 'Cor')}${corBtn('pi-borda', 'Borda')}</div>
        <div id="pi-borda-esp-linha">${deslize('pi-borda-esp', 'Espessura da borda', 0, 5, 0.1, '')}</div>
        <div id="pi-raio-linha">${deslize('pi-raio', 'Cantos arredondados', 0, 20, 0.5, '')}</div>
        <div id="pi-linha-esp-linha">${deslize('pi-linha-esp', 'Espessura da linha', 0.2, 6, 0.1, '')}</div>
      </div></details>

      <details class="pro-secao" data-secao="icone" open><summary>Ícone</summary><div class="pro-corpo-secao">
        <div class="pro-grade-icones" id="pi-icones" role="group" aria-label="Trocar ícone"></div>
        ${corBtn('pi-icone-cor', 'Cor do ícone')}
      </div></details>

      <details class="pro-secao" data-secao="imagem" open><summary>Imagem</summary><div class="pro-corpo-secao">
        <button type="button" class="pro-btn contorno" data-acao="trocar-imagem">${svg('imagem')}Trocar imagem</button>
        ${deslize('pi-img-raio', 'Cantos arredondados', 0, 50, 1, '%')}
      </div></details>

      <details class="pro-secao" data-secao="detalhes" open><summary>Detalhes</summary><div class="pro-corpo-secao">
        <div class="pro-grade2" id="pi-partes"></div>
      </div></details>

      <details class="pro-secao" data-secao="posicao" open><summary>Posição</summary><div class="pro-corpo-secao">
        <div class="pro-grade2">${numero('pi-x', 'X', 'mm', 'Posição X em mm')}${numero('pi-y', 'Y', 'mm', 'Posição Y em mm')}</div>
        <div class="pro-grade2">${numero('pi-l', 'L', 'mm', 'Largura em mm')}${numero('pi-a', 'A', 'mm', 'Altura em mm')}</div>
        <div class="pro-grade2">${numero('pi-giro', '', '°', 'Giro em graus').replace('<span class="rot" aria-hidden="true"></span>', `<span class="rot" aria-hidden="true">${svg('girar').replace('<svg', '<svg style="width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8"')}</span>`)}
          <span id="pi-escala-caixa">${numero('pi-escala', '', '%', 'Escala em porcentagem').replace('<span class="rot" aria-hidden="true"></span>', '<span class="rot" aria-hidden="true">⤢</span>')}</span></div>
        <div class="pro-l">
          <span class="pro-seg" role="group" aria-label="Alinhar">
            <button type="button" class="pro-btn" data-acao="alinhar-esq" title="Alinhar à esquerda" aria-label="Alinhar à esquerda">${svg('alEsq')}</button>
            <button type="button" class="pro-btn" data-acao="alinhar-centro" title="Centralizar na horizontal" aria-label="Centralizar na horizontal">${svg('alCentro')}</button>
            <button type="button" class="pro-btn" data-acao="alinhar-dir" title="Alinhar à direita" aria-label="Alinhar à direita">${svg('alDir')}</button>
            <button type="button" class="pro-btn" data-acao="alinhar-topo" title="Alinhar ao topo" aria-label="Alinhar ao topo">${svg('alTopo')}</button>
            <button type="button" class="pro-btn" data-acao="alinhar-meio" title="Centralizar na vertical" aria-label="Centralizar na vertical">${svg('alMeio')}</button>
            <button type="button" class="pro-btn" data-acao="alinhar-base" title="Alinhar à base" aria-label="Alinhar à base">${svg('alBase')}</button>
          </span>
        </div>
        <div class="pro-l" id="pi-alinhar-ref"><span class="pro-rot cresce" id="pi-alinhar-rot">Alinha em relação ao cartaz</span>
          <button type="button" class="pro-chave" role="switch" aria-checked="false" id="pi-ao-cartaz" aria-label="Alinhar ao cartaz"></button></div>
        <div class="pro-l" id="pi-distribuir"><span class="pro-rot cresce">Distribuir</span>
          <span class="pro-seg" role="group" aria-label="Distribuir">
            <button type="button" class="pro-btn" data-acao="distribuir-h" title="Distribuir na horizontal" aria-label="Distribuir na horizontal">${svg('distH')}</button>
            <button type="button" class="pro-btn" data-acao="distribuir-v" title="Distribuir na vertical" aria-label="Distribuir na vertical">${svg('distV')}</button>
          </span></div>
        <div class="pro-l"><span class="pro-rot cresce">Camada</span>
          <span class="pro-seg" role="group" aria-label="Ordem das camadas">
            <button type="button" class="pro-btn" data-acao="topo" title="Trazer para o topo (${K}+Shift+])" aria-label="Trazer para o topo">${svg('topo')}</button>
            <button type="button" class="pro-btn" data-acao="frente" title="Trazer para frente (${K}+])" aria-label="Trazer para frente">${svg('frente')}</button>
            <button type="button" class="pro-btn" data-acao="tras" title="Enviar para trás (${K}+[)" aria-label="Enviar para trás">${svg('tras')}</button>
            <button type="button" class="pro-btn" data-acao="fundo" title="Enviar para o fundo (${K}+Shift+[)" aria-label="Enviar para o fundo">${svg('fundo')}</button>
          </span></div>
        <div class="pro-l" id="pi-espelhar"><span class="pro-rot cresce">Espelhar</span>
          <span class="pro-seg" role="group" aria-label="Espelhar">
            <button type="button" class="pro-btn" data-acao="espelhar-h" aria-pressed="false" title="Espelhar na horizontal" aria-label="Espelhar na horizontal">${svg('espelharH')}</button>
            <button type="button" class="pro-btn" data-acao="espelhar-v" aria-pressed="false" title="Espelhar na vertical" aria-label="Espelhar na vertical">${svg('espelharV')}</button>
          </span></div>
        <button type="button" class="pro-btn contorno" data-acao="zerar" title="Volta posição, tamanho e giro ao original">${svg('restaurar')}Restaurar posição</button>
      </div></details>

      <details class="pro-secao" data-secao="elemento" open><summary>Elemento</summary><div class="pro-corpo-secao">
        ${deslize('pi-opacidade', 'Transparência', 0, 100, 1, '%')}
        <div class="pro-acoes">
          <button type="button" class="pro-btn contorno" data-acao="duplicar" title="Duplicar (${K}+D)">${svg('duplicar')}Duplicar</button>
          <button type="button" class="pro-btn contorno" data-acao="agrupar" id="pi-agrupar" title="Agrupar (${K}+G)">${svg('agrupar')}<span>Agrupar</span></button>
          <button type="button" class="pro-btn contorno" data-acao="travar" id="pi-travar" title="Travar (Alt+Shift+L)">${svg('cadeado')}<span>Travar</span></button>
          <button type="button" class="pro-btn contorno" data-acao="ocultar" id="pi-ocultar" title="Ocultar">${svg('olhoFechado')}<span>Ocultar</span></button>
          <button type="button" class="pro-btn contorno" data-acao="copiar-estilo" id="pi-copiar-estilo" title="Copiar estilo (${K}+Alt+C)">${svg('estilo')}<span>Copiar estilo</span></button>
          <button type="button" class="pro-btn contorno perigo" data-acao="excluir" id="pi-excluir" title="Excluir (Delete)">${svg('lixeira')}<span>Excluir</span></button>
        </div>
      </div></details>
    </div>
    <div class="pro-rolagem" id="pro-camadas-aba" role="tabpanel" aria-labelledby="pro-aba-c" hidden>
      <ol class="pro-camadas" id="pro-camadas" aria-label="Camadas do cartaz, a de cima primeiro"></ol>
    </div>
    <div class="pro-rodape-painel"><kbd>?</kbd> atalhos do teclado <button type="button" class="pro-btn" data-acao="atalhos">Ver todos</button></div>`;
  document.body.appendChild(painel);

  // Popover, menu de contexto, diálogo e arquivos escondidos
  const pop = document.createElement('div');
  pop.className = 'pro-pop';
  pop.setAttribute('role', 'dialog');
  document.body.appendChild(pop);
  const ctx = document.createElement('div');
  ctx.className = 'pro-ctx';
  ctx.setAttribute('role', 'menu');
  document.body.appendChild(ctx);
  const dlg = document.createElement('dialog');
  dlg.className = 'pro-dialogo';
  dlg.setAttribute('aria-labelledby', 'pro-atalhos-titulo');
  document.body.appendChild(dlg);
  const inputImg = document.createElement('input');
  inputImg.type = 'file'; inputImg.accept = 'image/*'; inputImg.hidden = true;
  const inputProj = document.createElement('input');
  inputProj.type = 'file'; inputProj.accept = '.json,application/json'; inputProj.hidden = true;
  document.body.append(inputImg, inputProj);

  // A faixa fica logo abaixo da barra principal, cuja altura muda quando quebra linha
  const barraPrincipal = document.querySelector('.barra');
  const medirTopo = () => document.documentElement.style.setProperty('--pro-topo', barraPrincipal.offsetHeight + 'px');
  medirTopo();
  if (window.ResizeObserver) new ResizeObserver(medirTopo).observe(barraPrincipal);
  else window.addEventListener('resize', medirTopo);

  /* ---------- Aviso (flutua sobre a mesa: não ocupa lugar na faixa) ---------- */
  const aviso = document.createElement('div');
  aviso.id = 'pro-status';
  aviso.className = 'pro-aviso';
  aviso.setAttribute('role', 'status');
  aviso.setAttribute('aria-live', 'polite');
  document.body.appendChild(aviso);
  let tempoStatus = null;
  function posicionarAviso() {
    const b = barra.getBoundingClientRect();
    const p = painel.getBoundingClientRect();
    const lateral = window.innerWidth > 900 && getComputedStyle(painel).display !== 'none';
    const dir = lateral ? p.left : b.right;
    aviso.style.left = Math.round((Math.max(b.left, 0) + Math.min(dir, window.innerWidth)) / 2) + 'px';
    aviso.style.top = Math.round(Math.max(b.bottom, 0) + 12) + 'px';
  }
  ui.avisar = msg => {
    aviso.textContent = msg;
    posicionarAviso();
    clearTimeout(tempoStatus);
    tempoStatus = setTimeout(() => { aviso.textContent = ''; }, 2400);
  };

  /* ---------- Faixa que cabe na tela ---------- */
  // Em vez de cortar o que passa da borda, a faixa vai se compactando por níveis até caber:
  // c1 some −/+ do zoom · c2 some o rótulo de Imagem, Faixa, Arquivo e Layout · c3 o de Folha em branco ·
  // c4 some todo rótulo (fica o ícone, com title e aria-label) · c5 o selo "Em teste" vira só o ponto ·
  // c6 somem as setinhas dos menus · c7 régua, grade, selo, Arquivo, Layout e atalhos vão para o menu "Mais" ·
  // c8 o zoom também · c9 Folha em branco e Faixa também (celular de 360 px).
  // Se nem assim couber (tela muito estreita), a faixa rola de lado.
  const NIVEIS_BARRA = 9;
  ui.ajustarBarra = () => {
    if (!barra.clientWidth) return; // editor desligado (faixa escondida)
    for (let n = 1; n <= NIVEIS_BARRA; n++) barra.classList.remove('c' + n);
    let n = 0;
    while (barra.scrollWidth > barra.clientWidth + 1 && n < NIVEIS_BARRA) barra.classList.add('c' + (++n));
    barra.dataset.nivel = n;
    if (popAncora && !popAncora.offsetParent) ui.fecharPop();
  };
  if (window.ResizeObserver) new ResizeObserver(() => ui.ajustarBarra()).observe(barra);
  window.addEventListener('resize', () => ui.ajustarBarra());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ui.ajustarBarra());
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => ui.ajustarBarra());

  /* ---------- Popover genérico ---------- */
  let popAncora = null, popFechar = null;
  ui.fecharPop = () => {
    if (!pop.classList.contains('aberto')) return;
    pop.classList.remove('aberto');
    pop.className = 'pro-pop';
    if (popAncora) { popAncora.setAttribute('aria-expanded', 'false'); }
    const f = popFechar; popFechar = null;
    if (f) f();
    popAncora = null;
  };
  ui.abrirPop = (ancora, classe, montar) => {
    const mesma = popAncora === ancora && pop.classList.contains('aberto');
    ui.fecharPop();
    if (mesma) return;
    pop.innerHTML = '';
    pop.className = 'pro-pop aberto' + (classe ? ' ' + classe : '');
    popFechar = montar(pop) || null;
    popAncora = ancora;
    if (ancora.hasAttribute('aria-expanded')) ancora.setAttribute('aria-expanded', 'true');
    posicionar(pop, ancora.getBoundingClientRect());
    const primeiro = pop.querySelector('input.hex, button, input');
    if (primeiro && classe !== 'cores') primeiro.focus({ preventScroll: true });
  };
  function posicionar(caixa, r) {
    const pw = caixa.offsetWidth, ph = caixa.offsetHeight, m = 8;
    let x = r.left, y = r.bottom + 6;
    if (x + pw > window.innerWidth - m) x = Math.max(m, r.right - pw);
    if (x + pw > window.innerWidth - m) x = window.innerWidth - m - pw;
    if (y + ph > window.innerHeight - m) y = r.top - ph - 6;
    if (y < m) y = Math.max(m, window.innerHeight - m - ph);
    caixa.style.left = Math.max(m, x) + 'px';
    caixa.style.top = y + 'px';
  }
  document.addEventListener('pointerdown', e => {
    if (pop.classList.contains('aberto') && !pop.contains(e.target) && !(popAncora && popAncora.contains(e.target))) ui.fecharPop();
    if (ctx.classList.contains('aberto') && !ctx.contains(e.target)) ui.fecharContexto();
  }, true);
  window.addEventListener('resize', () => { ui.fecharPop(); ui.fecharContexto(); });
  pop.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); const a = popAncora; ui.fecharPop(); if (a) a.focus(); }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && document.activeElement.classList.contains('pro-item')) {
      e.preventDefault();
      const itens = [...pop.querySelectorAll('.pro-item:not(:disabled)')], i = itens.indexOf(document.activeElement);
      itens[(i + (e.key === 'ArrowDown' ? 1 : itens.length - 1)) % itens.length].focus();
    }
  });

  const itemMenu = (acao, icone, rot, dica, extra) =>
    `<button type="button" class="pro-item${extra && extra.perigo ? ' perigo' : ''}" role="menuitem" data-acao="${acao}"${extra && extra.dis ? ' disabled' : ''}>${icone ? svg(icone) : '<span></span>'}<span>${rot}</span>${extra && extra.kbd ? `<kbd>${extra.kbd}</kbd>` : '<span></span>'}${dica ? `<small>${dica}</small>` : ''}</button>`;

  const POPS = {
    formas: p => {
      p.innerHTML = `<h4>Formas</h4><div class="pro-grade-formas">${Object.entries(EP.FORMAS).map(([id, f]) =>
        `<button type="button" data-forma="${id}">${EP.svgForma(id, id === 'linha' ? 40 : f.w, id === 'linha' ? 3 : f.h, f.preench, '', 0, id === 'retangulo' ? 2 : 0).replace('preserveAspectRatio="none"', 'preserveAspectRatio="xMidYMid meet"').replace('<svg', `<svg style="width:40px;height:32px"`)}<span>${f.nome}</span></button>`).join('')}</div>`;
      p.addEventListener('click', e => { const b = e.target.closest('[data-forma]'); if (b) { ui.fecharPop(); EP.acao('add-forma', b.dataset.forma); } });
    },
    icones: p => {
      const cor = (typeof CORES_ICONE !== 'undefined' && CORES_ICONE[corPadrao]) || '#e6b800';
      p.innerHTML = `<h4>Ícones</h4><div class="pro-grade-icones">${Object.entries(ICONES).filter(([, ic]) => ic.svg).map(([id, ic]) =>
        `<button type="button" data-icone="${id}" title="${esc(ic.nome)}" aria-label="${esc(ic.nome)}" style="color:${cor}"><svg viewBox="${ic.vb}" fill="currentColor" aria-hidden="true">${ic.svg}</svg></button>`).join('')}</div>`;
      p.addEventListener('click', e => { const b = e.target.closest('[data-icone]'); if (b) { ui.fecharPop(); EP.acao('add-icone', b.dataset.icone); } });
    },
    zoom: p => {
      const z = EP.zoomAtual ? EP.zoomAtual() : 1;
      p.innerHTML = itemMenu('zoom-ajustar', '', 'Ajustar à tela', '', { kbd: 'Shift+1' }) + '<hr>' +
        [0.25, 0.35, 0.5, 0.75, 1, 1.5, 2].map(v => `<button type="button" class="pro-item" role="menuitemradio" aria-checked="${Math.abs(z - v) < 0.005}" data-acao="zoom-valor" data-valor="${v}"><span></span><span>${Math.round(v * 100)}%</span>${v === 1 ? '<kbd>Shift+0</kbd>' : '<span></span>'}</button>`).join('');
    },
    arquivo: p => {
      p.innerHTML = itemMenu('nova-folha', 'folha', 'Folha em branco', 'Cartaz vazio, sem modelo pronto, para montar do zero', { kbd: 'Shift+N' }) + '<hr>' +
        itemMenu('abrir-projeto', 'abrir', 'Abrir projeto…', 'Volta a editar cartazes salvos', { kbd: K + '+O' }) +
        itemMenu('salvar-projeto', 'salvar', 'Salvar projeto', 'Baixa um arquivo .cartaz.json com todos os cartazes', { kbd: K + '+S' }) + '<hr>' +
        itemMenu('add-imagem', 'imagem', 'Inserir imagem do computador…', 'Também dá para arrastar o arquivo ou colar (' + K + '+V)');
    },
    layout: p => {
      p.innerHTML = itemMenu('aplicar-todos', 'aplicar', 'Aplicar em todos', 'Copia o layout deste cartaz para os outros') + '<hr>' +
        itemMenu('salvar-modelo', 'salvar', 'Salvar modelo', 'Os próximos cartazes já saem com este layout') +
        itemMenu('esquecer-modelo', 'apagar', 'Esquecer modelo', 'Volta ao layout padrão nos próximos', { perigo: true });
    },
    // Tela estreita: o que saiu da faixa fica aqui (nada some de vez)
    mais: p => {
      const z = EP.zoomAtual ? Math.round(EP.zoomAtual() * 100) : 100;
      const marcado = (acao, ic, rot, kbd, on) => `<button type="button" class="pro-item" role="menuitemcheckbox" aria-checked="${on}" data-acao="${acao}">${svg(ic)}<span>${rot}</span><kbd>${kbd}</kbd></button>`;
      const regua = barra.querySelector('[data-acao=regua]').getAttribute('aria-pressed') === 'true';
      const grade = barra.querySelector('[data-acao=grade]').getAttribute('aria-pressed') === 'true';
      const fora = acao => !barra.querySelector(`[data-acao=${acao}]`).offsetParent;
      const inserir = (fora('nova-folha') ? itemMenu('nova-folha', 'folha', 'Folha em branco', '', { kbd: 'Shift+N' }) : '') +
        (fora('add-faixa') ? itemMenu('add-faixa', 'faixa', 'Adicionar faixa', '') : '');
      p.innerHTML = (inserir ? inserir + '<hr>' : '') + `<h4>Zoom: ${z}%</h4>` +
        itemMenu('zoom-ajustar', '', 'Ajustar à tela', '', { kbd: 'Shift+1' }) +
        itemMenu('zoom-mais', 'mais', 'Aumentar zoom', '', { kbd: K + '+=' }) +
        itemMenu('zoom-menos', 'menos', 'Diminuir zoom', '', { kbd: K + '+−' }) +
        marcado('regua', 'regua', 'Régua', 'Shift+R', regua) + marcado('grade', 'grade', 'Grade', 'Shift+G', grade) + '<hr>' +
        '<h4>Arquivo</h4>' +
        itemMenu('abrir-projeto', 'abrir', 'Abrir projeto…', '', { kbd: K + '+O' }) +
        itemMenu('salvar-projeto', 'salvar', 'Salvar projeto', '', { kbd: K + '+S' }) + '<hr>' +
        '<h4>Layout</h4>' +
        itemMenu('aplicar-todos', 'aplicar', 'Aplicar em todos', '') +
        itemMenu('salvar-modelo', 'salvar', 'Salvar modelo', '') +
        itemMenu('esquecer-modelo', 'apagar', 'Esquecer modelo', '', { perigo: true }) + '<hr>' +
        itemMenu('atalhos', 'ajuda', 'Atalhos do teclado', '', { kbd: '?' }) +
        '<p class="pro-nota-teste">Editor em teste: os cartazes saem iguais no PDF, mas a interface ainda pode mudar.</p>';
    }
  };
  pop.addEventListener('click', e => {
    const b = e.target.closest('.pro-item[data-acao]');
    if (!b || b.disabled) return;
    ui.fecharPop();
    EP.acao(b.dataset.acao, b.dataset.valor);
    if (document.activeElement && pop.contains(document.activeElement)) document.activeElement.blur();
  });
  barra.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pop) { ui.abrirPop(b, b.dataset.pop, POPS[b.dataset.pop]); return; }
    // depois de criar algo o teclado volta para a mesa (senão Espaço/Enter repetiriam o botão, ex.: outra folha em branco)
    if (b.dataset.acao) { EP.acao(b.dataset.acao); if (/^(add-|nova-folha$)/.test(b.dataset.acao)) b.blur(); }
  });

  /* ---------- Painel de cores ---------- */
  // opc: { atual, semCor, titulo, aoEscolher(cor) } — registra o histórico uma vez por escolha
  ui.cores = (ancora, opc) => {
    ui.abrirPop(ancora, 'cores', p => {
      const cartaz = EP.cartazAlvo();
      const doc = EP.coresDoc(cartaz), rec = EP.recentes();
      const atual = EP.paraHex(opc.atual) || '';
      const amostra = c => `<button type="button" data-cor="${c}" style="background:${c}" title="${c}" aria-label="Cor ${c}" aria-pressed="${c === atual}"></button>`;
      p.innerHTML = `
        <h4>${esc(opc.titulo || 'Cor')}</h4>
        <h4>Cores deste cartaz</h4><div class="pro-amostras">${doc.map(amostra).join('') || '<span class="vazio-cores">Nenhuma ainda.</span>'}</div>
        ${rec.length ? `<h4>Usadas por último</h4><div class="pro-amostras">${rec.map(amostra).join('')}</div>` : ''}
        <h4>Paleta</h4><div class="pro-amostras">${EP.PALETA.map(amostra).join('')}${opc.semCor ? '<button type="button" class="sem" data-cor="" title="Sem cor" aria-label="Sem cor"></button>' : ''}</div>
        <div class="pro-cor-linha">
          <input class="hex" type="text" maxlength="7" spellcheck="false" aria-label="Código da cor (hex)" value="${atual || ''}" placeholder="#RRGGBB">
          <label class="pro-cor-livre" title="Outra cor"><input type="color" value="${atual || '#222222'}" aria-label="Escolher outra cor"></label>
          ${'EyeDropper' in window ? `<button type="button" class="pro-btn contorno so-icone" data-gotas title="Conta-gotas: pegar cor da tela" aria-label="Conta-gotas">${svg('gotas')}</button>` : ''}
        </div>`;
      p.querySelector('h4').style.cssText = 'color:var(--tinta);font-size:13px';
      let registrado = false;
      const aplicar = (cor, final) => {
        if (!registrado) { EP.registrar(); registrado = true; }
        opc.aoEscolher(cor);
        EP.emitir('mudou');
        if (final) { if (cor) EP.usarCor(cor); registrado = false; }
        p.querySelectorAll('[data-cor]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cor === EP.paraHex(cor))));
        const hex = p.querySelector('.hex'); if (hex && document.activeElement !== hex) hex.value = cor || '';
      };
      p.addEventListener('click', e => {
        const b = e.target.closest('[data-cor]');
        if (b) { aplicar(b.dataset.cor, true); return; }
        if (e.target.closest('[data-gotas]')) {
          new window.EyeDropper().open().then(r => aplicar(r.sRGBHex, true)).catch(() => {});
        }
      });
      const livre = p.querySelector('input[type=color]');
      livre.addEventListener('input', () => aplicar(livre.value, false));
      livre.addEventListener('change', () => aplicar(livre.value, true));
      const hex = p.querySelector('.hex');
      hex.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          let v = hex.value.trim(); if (v && v[0] !== '#') v = '#' + v;
          const h = EP.paraHex(v);
          if (h) aplicar(h, true); else hex.select();
        }
      });
    });
  };

  /* ---------- Ações ---------- */
  const sel = () => EP.sel;
  const comTexto = () => EP.sel.filter(EP.temTexto);
  const destravados = () => EP.sel.filter(e => !EP.travado(e));
  function mudar(fn, lista) {
    lista = lista || destravados();
    if (!lista.length) return;
    EP.registrar();
    lista.forEach(fn);
    if (typeof ajustarNomes === 'function') ajustarNomes();
    EP.emitir('mudou');
  }
  ui.mudar = mudar;
  let estiloCopiado = null;

  EP.acao = (acao, valor) => {
    const s = sel();
    switch (acao) {
      case 'add-texto': EP.criar('texto'); break;
      case 'add-faixa': EP.criar('faixa'); break;
      case 'add-icone': EP.criar('icone', { icone: valor }); break;
      case 'add-forma': EP.criar('forma', { forma: valor || 'retangulo' }); break;
      case 'add-imagem': if (!EP.cartazAlvo()) { alert('Gere ou crie um cartaz primeiro.'); break; } modoImagem = 'inserir'; inputImg.click(); break;
      case 'trocar-imagem': modoImagem = 'trocar'; inputImg.click(); break;
      case 'desfazer': EP.desfazer(); break;
      case 'refazer': EP.refazer(); break;
      case 'fechar': EP.selecionar([]); break;
      case 'duplicar': {
        if (!s.length) break;
        if (!s.some(e => e.classList.contains('livre'))) { ui.avisar('Nome, preços e rodapé não duplicam'); break; }
        EP.registrar(); const c = EP.duplicar(s); EP.selecionar(c, { sozinho: true }); break;
      }
      case 'excluir': {
        const lista = destravados(); if (!lista.length) break;
        EP.registrar(); EP.excluir(lista);
        const resto = lista.filter(e => e.isConnected);
        EP.selecionar(resto, { sozinho: true });
        if (resto.length) ui.avisar('Nome, preços e rodapé ficam ocultos');
        break;
      }
      case 'ocultar': {
        if (!s.length) break;
        const ocultar = !s.every(EP.oculto);
        mudar(e => e.classList.toggle('oculto', ocultar), s); break;
      }
      case 'travar': {
        if (!s.length) break;
        const travar = !s.every(EP.travado);
        EP.registrar(); EP.travar(s, travar); EP.emitir('mudou');
        ui.avisar(travar ? 'Travado' : 'Destravado'); break;
      }
      case 'agrupar': {
        if (s.length > 1 && !(s.every(e => e.dataset.grupo && e.dataset.grupo === s[0].dataset.grupo))) {
          EP.registrar(); EP.agrupar(); EP.emitir('mudou'); ui.avisar('Agrupado');
        } else if (s.some(e => e.dataset.grupo)) { EP.registrar(); EP.desagrupar(); EP.emitir('mudou'); ui.avisar('Desagrupado'); }
        break;
      }
      case 'desagrupar': if (s.some(e => e.dataset.grupo)) { EP.registrar(); EP.desagrupar(); EP.emitir('mudou'); ui.avisar('Desagrupado'); } break;
      case 'frente': case 'tras': case 'topo': case 'fundo':
        if (!s.length) break; EP.registrar(); EP.ordenar(acao); EP.emitir('mudou'); break;
      case 'alinhar-esq': case 'alinhar-centro': case 'alinhar-dir': case 'alinhar-topo': case 'alinhar-meio': case 'alinhar-base':
        if (!destravados().length) break;
        EP.registrar(); EP.alinhar(acao.slice(8), aoCartaz || EP.unidades().length < 2); EP.emitir('mudou'); break;
      case 'distribuir-h': case 'distribuir-v':
        if (EP.unidades().length < 3) { ui.avisar('Selecione 3 ou mais'); break; }
        EP.registrar(); EP.distribuir(acao.slice(-1)); EP.emitir('mudou'); break;
      case 'espelhar-h': mudar(e => { if (EP.podeEspelhar(e)) e.style.setProperty('--fh', EP.num(e, '--fh', 1) === -1 ? '1' : '-1'); }); break;
      case 'espelhar-v': mudar(e => { if (EP.podeEspelhar(e)) e.style.setProperty('--fv', EP.num(e, '--fv', 1) === -1 ? '1' : '-1'); }); break;
      case 'zerar': mudar(e => ['--fx', '--fy', '--s', '--r', '--fh', '--fv'].forEach(v => e.style.removeProperty(v))); break;
      case 'selecionar-tudo': {
        const c = EP.cartazAlvo(); if (!c) break;
        EP.selecionar(EP.elementos(c).filter(e => !EP.travado(e) && !EP.oculto(e)), { sozinho: true }); break;
      }
      case 'copiar': EP.copiar && EP.copiar(); break;
      case 'recortar': EP.recortar && EP.recortar(); break;
      case 'colar': EP.colar && EP.colar(); break;
      case 'copiar-estilo': {
        const el = s[0]; if (!el) break;
        estiloCopiado = { tipo: EP.tipo(el), estilo: copiarEstilo(el) };
        ui.avisar('Estilo copiado'); EP.emitir('mudou'); break;
      }
      case 'colar-estilo': {
        if (!estiloCopiado) { ui.avisar('Copie um estilo antes'); break; }
        mudar(e => colarEstilo(e, estiloCopiado.estilo)); ui.avisar('Estilo aplicado'); break;
      }
      case 'negrito': mudar(e => { const a = EP.alvoTexto(e); a.style.fontWeight = parseInt(getComputedStyle(EP.alvoTexto(comTexto()[0])).fontWeight, 10) >= 600 ? '400' : '800'; }, destravados().filter(EP.temTexto)); break;
      case 'italico': { const on = getComputedStyle(EP.alvoTexto(comTexto()[0] || document.body)).fontStyle !== 'italic'; mudar(e => { EP.alvoTexto(e).style.fontStyle = on ? 'italic' : 'normal'; }, destravados().filter(EP.temTexto)); break; }
      case 'sublinhado': { const l = destravados().filter(e => EP.temTexto(e) && EP.tipo(e) !== 'faixa'); if (!l.length) break; const on = !EP.alvoTexto(l[0]).classList.contains('pro-sub'); mudar(e => EP.alvoTexto(e).classList.toggle('pro-sub', on), l); break; }
      case 'caixa': {
        const l = destravados().filter(EP.temTexto); if (!l.length) break;
        const at = getComputedStyle(EP.alvoTexto(l[0])).textTransform;
        const prox = at === 'uppercase' ? 'lowercase' : at === 'lowercase' ? 'none' : 'uppercase';
        mudar(e => { EP.alvoTexto(e).style.textTransform = prox; }, l); break;
      }
      case 'txt-left': case 'txt-center': case 'txt-right': mudar(e => { EP.alvoTexto(e).style.textAlign = acao.slice(4); }, destravados().filter(EP.temTexto)); break;
      case 'fundo-todos': {
        const c = EP.cartazAlvo(); if (!c) break;
        EP.registrar(); EP.cartazes().forEach(k => { k.style.background = c.style.background; }); EP.emitir('mudou'); ui.avisar('Fundo aplicado em todos'); break;
      }
      case 'zoom-mais': EP.zoomPasso && EP.zoomPasso(1); break;
      case 'zoom-menos': EP.zoomPasso && EP.zoomPasso(-1); break;
      case 'zoom-ajustar': EP.zoomAjustar && EP.zoomAjustar(); break;
      case 'zoom-valor': EP.definirZoom && EP.definirZoom(parseFloat(valor)); break;
      case 'regua': EP.alternarRegua && EP.alternarRegua(); break;
      case 'grade': EP.alternarGrade && EP.alternarGrade(); break;
      case 'atalhos': abrirAtalhos(); break;
      case 'nova-folha': EP.novaFolha(); ui.avisar('Folha em branco criada'); break;
      case 'salvar-projeto': if (EP.salvarProjeto()) ui.avisar('Projeto salvo'); break;
      case 'abrir-projeto': inputProj.click(); break;
      case 'aplicar-todos': {
        const base = EP.cartazAlvo();
        if (!base) { alert('Gere ou crie um cartaz primeiro.'); break; }
        const outros = EP.cartazes().filter(c => c !== base);
        if (!outros.length) { ui.avisar('Só há um cartaz'); break; }
        EP.registrar();
        const layout = EP.extrairLayout(base);
        outros.forEach(c => EP.aplicarLayout(c, layout));
        if (typeof ajustarNomes === 'function') ajustarNomes();
        EP.emitir('mudou');
        ui.avisar(outros.length === 1 ? 'Layout aplicado em 1 cartaz' : `Layout aplicado em ${outros.length} cartazes`);
        break;
      }
      case 'salvar-modelo': {
        const base = EP.cartazAlvo();
        if (!base) { alert('Gere ou crie um cartaz primeiro.'); break; }
        try { localStorage.setItem(EP.CHAVE_MODELO, JSON.stringify(EP.extrairLayout(base))); ui.avisar('Modelo salvo'); }
        catch (err) { alert('Não consegui salvar o modelo (imagens grandes ocupam muito espaço): ' + err.message); }
        break;
      }
      case 'esquecer-modelo': try { localStorage.removeItem(EP.CHAVE_MODELO); } catch (err) {} ui.avisar('Modelo esquecido'); break;
    }
  };

  // Estilo copiável (pincel): texto + aparência, sem posição
  const PROPS_TEXTO = ['fontFamily', 'fontWeight', 'fontStyle', 'textTransform', 'textAlign', 'letterSpacing', 'lineHeight', 'color', 'textShadow', 'padding', 'borderRadius'];
  function copiarEstilo(el) {
    const e = { opacidade: el.style.opacity };
    if (EP.temTexto(el)) {
      const a = EP.alvoTexto(el);
      e.texto = {}; PROPS_TEXTO.forEach(p => { e.texto[p] = a.style[p]; });
      e.efx = a.dataset.efx || ''; e.sub = a.classList.contains('pro-sub');
      e.bg = a.style.getPropertyValue('--pro-bg');
      if (EP.tipo(el) === 'faixa') e.fundo = el.style.getPropertyValue('--pro-bg');
    }
    if (EP.tipo(el) === 'forma') e.forma = { preench: el.dataset.preench || '', borda: el.dataset.borda || '', esp: el.dataset.esp || '', raio: el.dataset.raio || '' };
    if (EP.tipo(el) === 'icone') e.cor = el.style.color;
    return e;
  }
  function colarEstilo(el, e) {
    el.style.opacity = e.opacidade || '';
    if (e.texto && EP.temTexto(el)) {
      const a = EP.alvoTexto(el);
      PROPS_TEXTO.forEach(p => { a.style[p] = e.texto[p] || ''; });
      if (e.efx) a.dataset.efx = e.efx; else delete a.dataset.efx;
      if (EP.tipo(el) !== 'faixa') {
        a.classList.toggle('pro-sub', !!e.sub);
        if (e.bg && e.efx && e.efx.includes('destaque')) a.style.setProperty('--pro-bg', e.bg); else a.style.removeProperty('--pro-bg');
      }
      if (e.fundo && EP.tipo(el) === 'faixa') el.style.setProperty('--pro-bg', e.fundo);
    }
    if (e.forma && EP.tipo(el) === 'forma') { Object.entries(e.forma).forEach(([k, v]) => { if (v) el.dataset[k] = v; else delete el.dataset[k]; }); EP.desenharForma(el); }
    if (e.cor && EP.tipo(el) === 'icone') { el.style.color = e.cor; const s = el.querySelector('svg'); if (s) s.style.color = e.cor; }
    if (e.cor && EP.tipo(el) === 'forma') { /* ícone → forma: nada */ }
  }

  /* ---------- Imagem e projeto ---------- */
  let modoImagem = 'inserir';
  ui.lerImagem = (arquivo, opc) => new Promise((res, rej) => {
    if (!arquivo || !/^image\//.test(arquivo.type)) { rej(new Error('Escolha um arquivo de imagem (PNG, JPG, WEBP, SVG…).')); return; }
    const fr = new FileReader();
    fr.onload = () => {
      // imagens muito grandes são reduzidas: o PDF sai em ~150 dpi e o histórico fica leve
      const img = new Image();
      img.onload = () => {
        const max = 1800, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        if (k >= 1 || /svg/.test(arquivo.type)) { res(fr.result); return; }
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL(/png|gif|webp/.test(arquivo.type) ? 'image/png' : 'image/jpeg', 0.9));
      };
      img.onerror = () => res(fr.result);
      img.src = fr.result;
    };
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(arquivo);
  });
  ui.inserirImagemArquivo = async (arquivo, opc) => {
    try {
      const src = await ui.lerImagem(arquivo);
      return EP.criar('imagem', Object.assign({ src }, opc || {}));
    } catch (err) { alert(err.message); return null; }
  };
  inputImg.addEventListener('change', async () => {
    const f = inputImg.files[0]; inputImg.value = '';
    if (!f) return;
    if (modoImagem === 'trocar' && EP.sel[0] && EP.tipo(EP.sel[0]) === 'imagem') {
      try { const src = await ui.lerImagem(f); EP.registrar(); EP.sel[0].querySelector('img').src = src; setTimeout(() => EP.emitir('mudou'), 50); }
      catch (err) { alert(err.message); }
    } else ui.inserirImagemArquivo(f);
  });
  inputProj.addEventListener('change', async () => {
    const f = inputProj.files[0]; inputProj.value = '';
    if (!f) return;
    try { const n = EP.abrirProjetoTexto(await f.text()); ui.avisar(n === 1 ? '1 cartaz aberto' : `${n} cartazes abertos`); }
    catch (err) { alert(err.message); }
  });

  /* ---------- Inspetor: ligações ---------- */
  let aoCartaz = false;
  painel.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.acao) { EP.acao(b.dataset.acao); return; }
    if (b.dataset.passo) { passoFonte(+b.dataset.passo); return; }
  });
  // clique com o mouse numa aba devolve o teclado para a mesa (setas movem o elemento)
  $('pro-aba-p').addEventListener('click', e => { mostrarAba('p'); if (e.detail) e.currentTarget.blur(); });
  $('pro-aba-c').addEventListener('click', e => { mostrarAba('c'); if (e.detail) e.currentTarget.blur(); });
  painel.querySelector('.pro-abas').addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const c = $('pro-aba-p').getAttribute('aria-selected') === 'true'; mostrarAba(c ? 'c' : 'p'); (c ? $('pro-aba-c') : $('pro-aba-p')).focus(); }
  });
  function mostrarAba(a) {
    $('pro-aba-p').setAttribute('aria-selected', String(a === 'p'));
    $('pro-aba-c').setAttribute('aria-selected', String(a === 'c'));
    $('pro-props').hidden = a !== 'p';
    $('pro-camadas-aba').hidden = a !== 'c';
    document.body.classList.toggle('pro-camadas-aberto', a === 'c');
    if (a === 'c') desenharCamadas();
  }
  ui.mostrarAba = mostrarAba;
  // Seções recolhíveis lembram o estado
  const CHAVE_SECOES = 'cartaz-pro-secoes';
  let secoes = {}; try { secoes = JSON.parse(localStorage.getItem(CHAVE_SECOES) || '{}'); } catch (e) {}
  painel.querySelectorAll('details.pro-secao').forEach(d => {
    if (secoes[d.dataset.secao] !== undefined) d.open = secoes[d.dataset.secao];
    d.addEventListener('toggle', () => { secoes[d.dataset.secao] = d.open; try { localStorage.setItem(CHAVE_SECOES, JSON.stringify(secoes)); } catch (e) {} });
  });

  // Deslizante + número ligados; registra o histórico uma vez por gesto
  function ligarDeslize(id, aplicar) {
    const r = $(id), n = $(id + '-n');
    let sessao = false;
    const valor = v => { if (!sessao) { EP.registrar(); sessao = true; } aplicar(+v); EP.emitir('mudou'); };
    r.addEventListener('input', () => { n.value = r.value; valor(r.value); });
    r.addEventListener('change', () => { sessao = false; });
    n.addEventListener('change', () => { if (n.value === '') return; const v = Math.min(+n.max, Math.max(+n.min, +n.value)); n.value = v; r.value = v; valor(v); sessao = false; });
  }
  const destravadosTexto = () => destravados().filter(EP.temTexto);
  ligarDeslize('pi-letras', v => destravadosTexto().forEach(e => { EP.alvoTexto(e).style.letterSpacing = (v / 1000) + 'em'; }));
  ligarDeslize('pi-linhas', v => destravadosTexto().forEach(e => { EP.alvoTexto(e).style.lineHeight = String(v); }));
  ligarDeslize('pi-opacidade', v => destravados().forEach(e => { e.style.opacity = v >= 100 ? '' : (v / 100).toFixed(2); }));
  ligarDeslize('pi-borda-esp', v => destravados().filter(e => EP.tipo(e) === 'forma').forEach(e => { e.dataset.esp = v; if (v > 0 && !e.dataset.borda) e.dataset.borda = '#222222'; EP.desenharForma(e); }));
  ligarDeslize('pi-raio', v => destravados().filter(e => EP.tipo(e) === 'forma').forEach(e => { e.dataset.raio = v; EP.desenharForma(e); }));
  ligarDeslize('pi-linha-esp', v => destravados().filter(e => e.dataset.forma === 'linha').forEach(e => { const g = EP.geo(e); e.style.height = v + 'cqw'; EP.desenharForma(e); EP.definirCentro(e, g.cx, g.cy); }));
  ligarDeslize('pi-img-raio', v => destravados().filter(e => EP.tipo(e) === 'imagem').forEach(e => { e.querySelector('img').style.borderRadius = v ? v / 2 + '%' : ''; e.dataset.raio = v; }));

  // Efeitos
  const EFX_PADRAO = {
    sombra: { dist: 6, dir: 45, blur: 6, op: 55, cor: '#000000' },
    contorno: { esp: 5, cor: '#ffffff' },
    destaque: { cor: '#ffe066', raio: 12 }
  };
  function mudarEfeito(nome, fn) {
    destravadosTexto().forEach(e => {
      const a = EP.alvoTexto(e), fx = EP.lerEfeitos(a);
      fx[nome] = fn(fx[nome]);
      EP.gravarEfeitos(a, fx);
    });
  }
  ['sombra', 'contorno', 'destaque'].forEach(nome => {
    $('pi-' + nome).addEventListener('click', () => {
      const ligar = $('pi-' + nome).getAttribute('aria-checked') !== 'true';
      EP.registrar();
      mudarEfeito(nome, at => ligar ? Object.assign({}, EFX_PADRAO[nome], at || {}) : null);
      EP.emitir('mudou');
    });
  });
  [['sombra', 'dist'], ['sombra', 'dir'], ['sombra', 'blur'], ['sombra', 'op'], ['contorno', 'esp'], ['destaque', 'raio']].forEach(([nome, k]) => {
    ligarDeslize(`pi-${nome}-${k}`, v => mudarEfeito(nome, at => Object.assign({}, EFX_PADRAO[nome], at || {}, { [k]: v })));
  });
  [['sombra', 'Cor da sombra'], ['contorno', 'Cor do contorno'], ['destaque', 'Cor do fundo do texto']].forEach(([nome, titulo]) => {
    $(`pi-${nome}-cor`).addEventListener('click', e => {
      const a = EP.alvoTexto(destravadosTexto()[0]); if (!a) return;
      const fx = EP.lerEfeitos(a)[nome] || EFX_PADRAO[nome];
      ui.cores(e.currentTarget, { titulo, atual: fx.cor, aoEscolher: c => mudarEfeito(nome, at => Object.assign({}, EFX_PADRAO[nome], at || {}, { cor: c || '#000000' })) });
    });
  });

  // Cores simples
  const ligarCor = (id, titulo, ler, gravar, semCor) => $(id).addEventListener('click', e => {
    const l = destravados(); if (!l.length && id !== 'pi-fundo') return;
    ui.cores(e.currentTarget, { titulo, atual: ler(), semCor, aoEscolher: c => gravar(c) });
  });
  const primeiro = () => destravados()[0];
  ligarCor('pi-cor-texto', 'Cor do texto', () => getComputedStyle(EP.alvoTexto(primeiro())).color,
    c => destravadosTexto().forEach(e => { EP.alvoTexto(e).style.color = c; if (EP.infoPapel(e) && EP.infoPapel(e).papel === 'rodape') e.querySelectorAll('span').forEach(s => { s.style.color = ''; }); }));
  ligarCor('pi-faixa-cor', 'Cor da faixa', () => getComputedStyle(primeiro()).backgroundColor,
    c => destravados().filter(e => EP.tipo(e) === 'faixa').forEach(e => { e.style.background = ''; e.style.setProperty('--pro-bg', c || 'transparent'); }), true);
  ligarCor('pi-preench', 'Preenchimento', () => primeiro().dataset.preench,
    c => destravados().filter(e => EP.tipo(e) === 'forma').forEach(e => { e.dataset.preench = c; EP.desenharForma(e); }), true);
  ligarCor('pi-borda', 'Cor da borda', () => primeiro().dataset.borda,
    c => destravados().filter(e => EP.tipo(e) === 'forma').forEach(e => { if (c) { e.dataset.borda = c; if (!+e.dataset.esp) e.dataset.esp = '0.6'; } else delete e.dataset.borda; EP.desenharForma(e); }), true);
  ligarCor('pi-icone-cor', 'Cor do ícone', () => getComputedStyle(primeiro()).color,
    c => destravados().filter(e => EP.tipo(e) === 'icone').forEach(e => { e.style.color = c; const s = e.querySelector('svg'); if (s) s.style.color = c; }));
  $('pi-fundo').addEventListener('click', e => {
    const c = EP.cartazAlvo(); if (!c) return;
    ui.cores(e.currentTarget, { titulo: 'Fundo do cartaz', atual: getComputedStyle(c).backgroundColor, aoEscolher: cor => { c.style.background = cor || ''; } });
  });
  $('pi-partes').addEventListener('click', e => {
    const b = e.target.closest('[data-parte]'); if (!b) return;
    const el = primeiro(); const p = EP.infoPapel(el); if (!p) return;
    const parte = p.partes[+b.dataset.parte];
    const alvos = () => destravados().filter(x => EP.infoPapel(x) && EP.infoPapel(x).papel === p.papel)
      .flatMap(x => parte.sel ? [...x.querySelectorAll(parte.sel)] : [x]);
    ui.cores(b, { titulo: parte.rot, atual: getComputedStyle(alvos()[0])[parte.prop], aoEscolher: c => alvos().forEach(n => { n.style[parte.prop] = c; }) });
  });
  $('pi-icones').addEventListener('click', e => {
    const b = e.target.closest('[data-icone]'); if (!b) return;
    mudar(el => { if (EP.tipo(el) !== 'icone') return; const g = EP.geo(el); el.dataset.icone = b.dataset.icone; el.innerHTML = svgIcone(b.dataset.icone, el.style.color, 'left'); EP.definirCentro(el, g.cx, g.cy); });
  });

  // Fonte
  $('pi-fonte').addEventListener('click', e => {
    const l = destravadosTexto(); if (!l.length) return;
    const atual = EP.alvoTexto(l[0]).style.fontFamily;
    ui.abrirPop(e.currentTarget, 'fontes', p => {
      p.innerHTML = EP.FONTES.map(([v, n], i) => `<button type="button" class="pro-item" role="menuitemradio" data-fonte="${i}" aria-checked="${v === atual || (!v && !atual)}" style="font-family:${esc(v || '"ImpactCustom", Impact, sans-serif')}"><span>${esc(n)}</span></button>`).join('');
      p.addEventListener('click', ev => {
        const b = ev.target.closest('[data-fonte]'); if (!b) return;
        const v = EP.FONTES[+b.dataset.fonte][0];
        ui.fecharPop();
        mudar(el => { const g = EP.geo(el); EP.alvoTexto(el).style.fontFamily = v; if (el.classList.contains('livre')) EP.definirCentro(el, g.cx, g.cy); }, destravadosTexto());
      });
    });
  });
  // Tamanho da fonte em pontos (do papel real)
  const ptDe = el => {
    const a = EP.alvoTexto(el), c = el.closest('.cartaz');
    return parseFloat(getComputedStyle(a).fontSize) * EP.num(el, '--s', 1) * EP.mmPorUn(c) / 0.3528;
  };
  function definirPt(pt) {
    const l = destravadosTexto(); if (!l.length || !(pt > 0)) return;
    EP.registrar();
    l.forEach(el => { const at = ptDe(el); if (at > 0) EP.escalar(el, pt / at); });
    EP.emitir('mudou');
  }
  function passoFonte(d) {
    const l = destravadosTexto(); if (!l.length) return;
    const at = Math.round(ptDe(l[0]));
    const passo = at >= 200 ? 10 : at >= 60 ? 4 : at >= 24 ? 2 : 1;
    definirPt(Math.max(1, at + d * passo));
  }
  $('pi-tam').addEventListener('change', e => definirPt(+e.target.value));

  // Posição em mm
  function lerPos() {
    const l = sel(); if (!l.length) return null;
    const c = l[0].closest('.cartaz'), mm = EP.mmPorUn(c), u = EP.uniao(l), g = EP.geo(l[0]);
    return { mm, u, g, um: l.length === 1 };
  }
  const aoMudarNum = (id, fn) => $(id).addEventListener('change', e => {
    const v = parseFloat(String(e.target.value).replace(',', '.'));
    if (isNaN(v)) { sincronizar(); return; }
    const p = lerPos(); if (!p || !destravados().length) return;
    EP.registrar(); fn(v, p); EP.emitir('mudou');
  });
  aoMudarNum('pi-x', (v, p) => destravados().forEach(e => EP.mover(e, v / p.mm - p.u.x0, 0)));
  aoMudarNum('pi-y', (v, p) => destravados().forEach(e => EP.mover(e, 0, v / p.mm - p.u.y0)));
  aoMudarNum('pi-l', (v, p) => {
    const el = destravados()[0]; if (!el || v <= 0) return;
    if (EP.tipo(el) === 'forma') { const g = EP.geo(el); EP.aplicarMedida(el, EP.medida(el), v / p.mm / g.w, 1); EP.definirCentro(el, g.cx, g.cy); }
    else EP.escalar(el, v / p.mm / p.g.w);
  });
  aoMudarNum('pi-a', (v, p) => {
    const el = destravados()[0]; if (!el || v <= 0) return;
    if (EP.tipo(el) === 'forma') { const g = EP.geo(el); EP.aplicarMedida(el, EP.medida(el), 1, v / p.mm / g.h); EP.definirCentro(el, g.cx, g.cy); }
    else EP.escalar(el, v / p.mm / p.g.h);
  });
  aoMudarNum('pi-giro', v => destravados().forEach(e => { let r = ((v % 360) + 540) % 360 - 180; e.style.setProperty('--r', EP.fix(r)); }));
  aoMudarNum('pi-escala', (v, p) => { const el = destravados()[0]; if (el && v > 0) EP.escalar(el, (v / 100) / EP.num(el, '--s', 1)); });
  [...painel.querySelectorAll('.pro-num input')].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); i.dispatchEvent(new Event('change')); i.select(); } }));
  $('pi-ao-cartaz').addEventListener('click', () => { aoCartaz = !aoCartaz; sincronizar(); });

  /* ---------- Inspetor: sincronizar com a seleção ---------- */
  const mostrar = (secao, sim) => { const d = painel.querySelector(`[data-secao="${secao}"]`); if (d) d.hidden = !sim; };
  const pintar = (id, cor) => { const i = $(id).querySelector('i'); const h = EP.paraHex(cor); i.className = h ? '' : 'sem'; i.style.background = h || ''; };
  const valor = (id, v) => { const r = $(id), n = $(id + '-n'); if (document.activeElement !== n) n.value = v; r.value = v; };
  const numSet = (id, v) => { const n = $(id); if (document.activeElement !== n) n.value = v; };
  const r1 = v => (Math.round(v * 10) / 10).toString();

  function sincronizar() {
    const l = sel(), um = l.length === 1, el = l[0];
    const nada = !l.length;
    document.body.classList.toggle('pro-com-sel', !nada);
    $('pro-vazio').hidden = !nada;
    $('pro-cab').hidden = false;
    const cartazes = EP.cartazes(), c = EP.cartazAlvo(), idx = cartazes.indexOf(c);
    const onde = cartazes.length > 1 && idx >= 0 ? `Cartaz ${idx + 1} de ${cartazes.length}` : '';
    $('pro-fechar').hidden = nada;
    if (nada) {
      $('pro-selecionado').textContent = c ? 'Cartaz' : 'Nenhum cartaz';
      $('pro-onde').textContent = onde;
      ['texto', 'efeitos', 'faixa', 'forma', 'icone', 'imagem', 'detalhes', 'posicao', 'elemento'].forEach(s => mostrar(s, false));
      mostrar('cartaz', !!c);
      if (c) pintar('pi-fundo', getComputedStyle(c).backgroundColor);
      $('pro-trava-aviso').hidden = true;
      return;
    }
    mostrar('cartaz', false);
    const tipos = new Set(l.map(EP.tipo));
    const grupoUnico = l.length > 1 && l.every(e => e.dataset.grupo && e.dataset.grupo === el.dataset.grupo);
    $('pro-selecionado').textContent = um ? EP.nome(el) : grupoUnico ? `Grupo (${l.length})` : `${l.length} elementos`;
    $('pro-onde').textContent = [onde, um && el.dataset.grupo ? 'em um grupo' : ''].filter(Boolean).join(' · ');
    const travados = l.every(EP.travado);
    $('pro-trava-aviso').hidden = !travados;
    // Seções contextuais
    const todosTexto = l.every(EP.temTexto);
    mostrar('texto', todosTexto);
    mostrar('efeitos', todosTexto);
    mostrar('faixa', tipos.size === 1 && tipos.has('faixa'));
    mostrar('forma', tipos.size === 1 && tipos.has('forma'));
    mostrar('icone', tipos.size === 1 && tipos.has('icone'));
    mostrar('imagem', um && tipos.has('imagem'));
    const partes = um && EP.infoPapel(el) ? EP.infoPapel(el).partes : null;
    mostrar('detalhes', !!partes);
    mostrar('posicao', true);
    mostrar('elemento', true);
    painel.querySelectorAll('[data-secao] input, [data-secao] button, #pi-fonte').forEach(b => {
      const livre = b.closest('[data-secao="elemento"]') && (b.id === 'pi-travar');
      b.disabled = travados && !livre;
    });

    if (todosTexto) {
      const a = EP.alvoTexto(el), cs = getComputedStyle(a);
      const fam = a.style.fontFamily;
      const f = EP.FONTES.find(x => x[0] === fam);
      const nomeFonte = f ? f[1] : (fam ? fam.split(',')[0].replace(/"/g, '') : (cs.fontFamily.includes('Impact') ? 'Impact' : cs.fontFamily.split(',')[0].replace(/"/g, '')));
      $('pi-fonte').querySelector('span').textContent = nomeFonte;
      $('pi-fonte').querySelector('span').style.fontFamily = fam || cs.fontFamily;
      numSet('pi-tam', Math.round(ptDe(el)));
      pintar('pi-cor-texto', cs.color);
      painel.querySelector('[data-acao=negrito]').setAttribute('aria-pressed', String(parseInt(cs.fontWeight, 10) >= 600));
      painel.querySelector('[data-acao=italico]').setAttribute('aria-pressed', String(cs.fontStyle === 'italic'));
      const sub = painel.querySelector('[data-acao=sublinhado]');
      sub.setAttribute('aria-pressed', String(a.classList.contains('pro-sub')));
      sub.disabled = sub.disabled || EP.tipo(el) === 'faixa';
      $('pi-caixa').textContent = cs.textTransform === 'uppercase' ? 'AA' : cs.textTransform === 'lowercase' ? 'aa' : 'Aa';
      ['left', 'center', 'right'].forEach(al => painel.querySelector(`[data-acao=txt-${al}]`).setAttribute('aria-pressed', String(cs.textAlign === al || (al === 'left' && cs.textAlign === 'start'))));
      const fsz = parseFloat(cs.fontSize) || 1;
      valor('pi-letras', Math.round((parseFloat(cs.letterSpacing) || 0) / fsz * 1000));
      const lh = cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / fsz;
      valor('pi-linhas', Math.round(lh * 100) / 100);
      $('pi-dica-linha').hidden = !(um && EP.tipo(el) === 'texto');
      const fx = EP.lerEfeitos(a);
      ['sombra', 'contorno', 'destaque'].forEach(n => {
        const on = !!fx[n];
        $('pi-' + n).setAttribute('aria-checked', String(on));
        $('pi-' + n).closest('.pro-efeito').querySelector('.corpo').hidden = !on;
        const v = Object.assign({}, EFX_PADRAO[n], fx[n] || {});
        Object.keys(v).forEach(k => { if (k === 'cor') pintar(`pi-${n}-cor`, v.cor); else if ($(`pi-${n}-${k}`)) valor(`pi-${n}-${k}`, v[k]); });
      });
    }
    if (tipos.has('faixa') && tipos.size === 1) pintar('pi-faixa-cor', getComputedStyle(el).backgroundColor);
    if (tipos.has('forma') && tipos.size === 1) {
      pintar('pi-preench', el.dataset.preench);
      pintar('pi-borda', el.dataset.borda);
      const linha = el.dataset.forma === 'linha';
      $('pi-borda').hidden = linha;
      $('pi-borda-esp-linha').hidden = linha;
      $('pi-raio-linha').hidden = el.dataset.forma !== 'retangulo';
      $('pi-linha-esp-linha').hidden = !linha;
      valor('pi-borda-esp', +el.dataset.esp || 0);
      valor('pi-raio', +el.dataset.raio || 0);
      if (linha) valor('pi-linha-esp', Math.round(parseFloat(el.style.height) * 10) / 10);
    }
    if (tipos.has('icone') && tipos.size === 1) {
      pintar('pi-icone-cor', getComputedStyle(el).color);
      const grade = $('pi-icones');
      if (!grade.childElementCount) grade.innerHTML = Object.entries(ICONES).filter(([, ic]) => ic.svg).map(([id, ic]) =>
        `<button type="button" data-icone="${id}" title="${esc(ic.nome)}" aria-label="${esc(ic.nome)}"><svg viewBox="${ic.vb}" fill="currentColor" aria-hidden="true">${ic.svg}</svg></button>`).join('');
      grade.querySelectorAll('button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.icone === el.dataset.icone)); b.style.color = getComputedStyle(el).color; b.disabled = travados; });
    }
    if (um && tipos.has('imagem')) valor('pi-img-raio', +el.dataset.raio || 0);
    if (partes) {
      $('pi-partes').innerHTML = partes.map((p, i) => {
        const alvo = p.sel ? el.querySelector(p.sel) : el;
        const h = alvo ? EP.paraHex(getComputedStyle(alvo)[p.prop]) : '';
        return `<button type="button" class="pro-cor-btn" data-parte="${i}"${travados ? ' disabled' : ''}><i style="background:${h}"></i><span>${p.rot}</span></button>`;
      }).join('');
    }
    // Posição
    const p = lerPos();
    numSet('pi-x', r1(p.u.x0 * p.mm)); numSet('pi-y', r1(p.u.y0 * p.mm));
    numSet('pi-l', r1((um ? p.g.w : p.u.x1 - p.u.x0) * p.mm)); numSet('pi-a', r1((um ? p.g.h : p.u.y1 - p.u.y0) * p.mm));
    $('pi-l').disabled = $('pi-a').disabled = !um || travados;
    numSet('pi-giro', um ? r1(p.g.r) : (l.every(e => EP.num(e, '--r', 0) === EP.num(el, '--r', 0)) ? r1(EP.num(el, '--r', 0)) : ''));
    const escalaVale = um && !['forma', 'imagem'].includes(EP.tipo(el));
    $('pi-escala-caixa').style.visibility = escalaVale ? '' : 'hidden';
    if (escalaVale) numSet('pi-escala', Math.round(EP.num(el, '--s', 1) * 100));
    const unidades = EP.unidades().length;
    $('pi-alinhar-ref').hidden = unidades < 2;
    $('pi-ao-cartaz').setAttribute('aria-checked', String(aoCartaz));
    $('pi-alinhar-rot').textContent = aoCartaz ? 'Alinha em relação ao cartaz' : 'Alinha entre os selecionados';
    $('pi-distribuir').hidden = unidades < 3;
    const esp = l.some(EP.podeEspelhar);
    $('pi-espelhar').hidden = !esp;
    if (esp) {
      painel.querySelector('[data-acao=espelhar-h]').setAttribute('aria-pressed', String(EP.num(el, '--fh', 1) === -1));
      painel.querySelector('[data-acao=espelhar-v]').setAttribute('aria-pressed', String(EP.num(el, '--fv', 1) === -1));
    }
    // Elemento
    const op = parseFloat(el.style.opacity);
    valor('pi-opacidade', isNaN(op) ? 100 : Math.round(op * 100));
    const temGrupo = l.some(e => e.dataset.grupo);
    const ag = $('pi-agrupar');
    ag.querySelector('span').textContent = (grupoUnico || (um && temGrupo)) ? 'Desagrupar' : 'Agrupar';
    ag.innerHTML = ag.innerHTML.replace(/<svg[\s\S]*?<\/svg>/, svg((grupoUnico || (um && temGrupo)) ? 'desagrupar' : 'agrupar'));
    ag.disabled = travados || (l.length < 2 && !temGrupo);
    $('pi-travar').innerHTML = svg(travados ? 'cadeadoAberto' : 'cadeado') + `<span>${travados ? 'Destravar' : 'Travar'}</span>`;
    const ocultos = l.every(EP.oculto);
    $('pi-ocultar').innerHTML = svg(ocultos ? 'olho' : 'olhoFechado') + `<span>${ocultos ? 'Mostrar' : 'Ocultar'}</span>`;
    const algumLivre = l.some(e => e.classList.contains('livre'));
    $('pi-excluir').disabled = travados || !algumLivre;
    painel.querySelector('[data-acao=duplicar]').disabled = travados || !algumLivre;
    $('pi-copiar-estilo').disabled = !um;
  }
  ui.sincronizar = sincronizar;

  /* ---------- Camadas ---------- */
  const ICO_TIPO = { fixo: 'cartaz', texto: 'texto', faixa: 'faixa', icone: 'icone', forma: 'formas', imagem: 'imagem' };
  const coresGrupo = ['#1d63ed', '#d62828', '#1a7f3c', '#f28c00', '#7a3db8'];
  function desenharCamadas() {
    const lista = $('pro-camadas'), c = EP.cartazAlvo();
    $('pro-conta-camadas').textContent = c ? c.querySelectorAll('.ed').length : 0;
    if ($('pro-camadas-aba').hidden) return;
    if (!c) { lista.innerHTML = '<li class="pro-camadas-vazio">Gere ou crie um cartaz primeiro.</li>'; lista.dataset.assinatura = ''; return; }
    if (lista.querySelector('input')) return; // renomeando
    const els = EP.elementos(c).reverse();
    // Se só mudou a seleção, atualiza no lugar (não recria a lista: o duplo clique para renomear continua funcionando)
    const assinatura = els.map(el => [el.dataset.uid, EP.nome(el), EP.travado(el), EP.oculto(el), el.dataset.grupo || ''].join('|')).join('/');
    if (assinatura === lista.dataset.assinatura) {
      lista.querySelectorAll('li[data-uid]').forEach(li => li.setAttribute('aria-selected', String(EP.sel.some(x => x.dataset.uid === li.dataset.uid))));
      return;
    }
    lista.dataset.assinatura = assinatura;
    const grupos = [...new Set(els.map(e => e.dataset.grupo).filter(Boolean))];
    lista.innerHTML = els.map(el => {
      const g = el.dataset.grupo, trav = EP.travado(el), oc = EP.oculto(el);
      return `<li draggable="true" tabindex="0" data-uid="${el.dataset.uid}" aria-selected="${EP.sel.includes(el)}" class="${oc ? 'oculto' : ''}${g ? ' em-grupo' : ''}"${g ? ` style="--grupo-cor:${coresGrupo[grupos.indexOf(g) % coresGrupo.length]}"` : ''}>
        <span class="tipo">${svg(ICO_TIPO[EP.tipo(el)])}</span>
        <span class="nome" title="Clique duas vezes para renomear">${esc(EP.nome(el))}</span>
        <button type="button" class="pro-btn${trav ? ' ligado' : ''}" data-camada="travar" aria-pressed="${trav}" title="${trav ? 'Destravar' : 'Travar'}" aria-label="${trav ? 'Destravar' : 'Travar'} ${esc(EP.nome(el))}">${svg(trav ? 'cadeado' : 'cadeadoAberto')}</button>
        <button type="button" class="pro-btn${oc ? ' ligado' : ''}" data-camada="ocultar" aria-pressed="${oc}" title="${oc ? 'Mostrar' : 'Ocultar'}" aria-label="${oc ? 'Mostrar' : 'Ocultar'} ${esc(EP.nome(el))}">${svg(oc ? 'olhoFechado' : 'olho')}</button>
      </li>`;
    }).join('');
  }
  ui.desenharCamadas = desenharCamadas;
  const lista_assin_reset = () => { $('pro-camadas').dataset.assinatura = ''; };
  const porUid = uid => EP.area.querySelector(`.ed[data-uid="${uid}"]`);
  $('pro-camadas').addEventListener('click', e => {
    const li = e.target.closest('li[data-uid]'); if (!li) return;
    const el = porUid(li.dataset.uid); if (!el) return;
    const b = e.target.closest('[data-camada]');
    if (b) {
      EP.registrar();
      if (b.dataset.camada === 'travar') EP.travar([el], !EP.travado(el));
      else el.classList.toggle('oculto');
      EP.emitir('mudou');
      if (e.detail) b.blur();
      return;
    }
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const l = EP.sel.includes(el) ? EP.sel.filter(x => x !== el) : EP.sel.concat(el);
      EP.selecionar(l, { sozinho: true });
    } else EP.selecionar([el], { sozinho: true });
    // clique de mouse devolve o teclado para a mesa (setas movem o elemento, como antes)
    if (e.detail && document.activeElement && $('pro-camadas').contains(document.activeElement)) document.activeElement.blur();
  });
  $('pro-camadas').addEventListener('dblclick', e => {
    const nome = e.target.closest('.nome'); if (nome) renomear(nome);
  });
  // Teclado na lista: Enter/Espaço seleciona, setas andam na lista (não movem o elemento), F2 renomeia
  $('pro-camadas').addEventListener('keydown', e => {
    const li = e.target.closest('li[data-uid]');
    if (!li || e.target !== li) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation();
      const el = porUid(li.dataset.uid); if (!el) return;
      if (e.shiftKey || e.ctrlKey || e.metaKey) EP.selecionar(EP.sel.includes(el) ? EP.sel.filter(x => x !== el) : EP.sel.concat(el), { sozinho: true });
      else EP.selecionar([el], { sozinho: true });
      const vivo = $('pro-camadas').querySelector(`li[data-uid="${li.dataset.uid}"]`); if (vivo) vivo.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); e.stopPropagation();
      const itens = [...$('pro-camadas').querySelectorAll('li[data-uid]')], i = itens.indexOf(li);
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? itens.length - 1 : Math.min(itens.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
      itens[j].focus();
    } else if (e.key === 'F2') {
      e.preventDefault(); e.stopPropagation();
      renomear(li.querySelector('.nome'));
    }
  });
  function renomear(nome) {
    const li = nome.closest('li'), el = porUid(li.dataset.uid); if (!el) return;
    const uid = li.dataset.uid, teclado = li === document.activeElement;
    nome.innerHTML = `<input type="text" value="${esc(EP.nome(el))}" aria-label="Nome da camada">`;
    const i = nome.querySelector('input');
    i.focus(); i.select();
    let feito = false;
    const fim = salvar => {
      if (feito) return; feito = true;
      const v = i.value.trim();
      nome.innerHTML = ''; lista_assin_reset();
      if (salvar && v !== EP.nome(el)) { EP.registrar(); if (v && v !== EP.nomePadrao(el)) el.dataset.nome = v; else delete el.dataset.nome; }
      desenharCamadas(); sincronizar();
      if (teclado) { const vivo = $('pro-camadas').querySelector(`li[data-uid="${uid}"]`); if (vivo) vivo.focus(); }
    };
    i.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); fim(true); } if (ev.key === 'Escape') { ev.preventDefault(); fim(false); } });
    i.addEventListener('blur', () => fim(true));
  }
  // Arrastar na lista reordena
  let arrastandoUid = null;
  $('pro-camadas').addEventListener('dragstart', e => {
    const li = e.target.closest('li[data-uid]'); if (!li) return;
    arrastandoUid = li.dataset.uid; li.classList.add('arrastando');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', 'camada'); } catch (err) {}
  });
  $('pro-camadas').addEventListener('dragover', e => {
    if (!arrastandoUid) return;
    const li = e.target.closest('li[data-uid]'); if (!li) return;
    e.preventDefault();
    const r = li.getBoundingClientRect(), cima = e.clientY < r.top + r.height / 2;
    $('pro-camadas').querySelectorAll('li').forEach(x => x.classList.remove('alvo-cima', 'alvo-baixo'));
    li.classList.add(cima ? 'alvo-cima' : 'alvo-baixo');
  });
  $('pro-camadas').addEventListener('drop', e => {
    if (!arrastandoUid) return;
    e.preventDefault();
    const li = e.target.closest('li[data-uid]');
    const el = porUid(arrastandoUid);
    if (li && el && li.dataset.uid !== arrastandoUid) {
      const alvo = porUid(li.dataset.uid), cima = li.classList.contains('alvo-cima');
      const c = el.closest('.cartaz');
      const ordem = EP.elementos(c).filter(x => x !== el);
      const i = ordem.indexOf(alvo);
      // lista mostra de cima para baixo; "cima" = acima na pilha
      ordem.splice(cima ? i + 1 : i, 0, el);
      EP.registrar(); EP.aplicarOrdem(c, ordem); EP.emitir('mudou');
    }
  });
  $('pro-camadas').addEventListener('dragend', () => { arrastandoUid = null; lista_assin_reset(); desenharCamadas(); });

  /* ---------- Menu de contexto ---------- */
  ui.fecharContexto = () => { ctx.classList.remove('aberto'); };
  ui.abrirContexto = (x, y) => {
    const l = sel(), tem = l.length > 0, livre = l.some(e => e.classList.contains('livre'));
    const trav = tem && l.every(EP.travado), grupo = l.some(e => e.dataset.grupo);
    const it = (acao, ic, rot, kbd, dis, perigo) => itemMenu(acao, ic, rot, '', { kbd, dis, perigo });
    let html = '';
    if (tem) {
      html += it('copiar', 'copiar', 'Copiar', K + '+C', !livre) + it('colar', 'colar', 'Colar', K + '+V', !EP.temClipboard || !EP.temClipboard()) +
        it('duplicar', 'duplicar', 'Duplicar', K + '+D', !livre || trav) + it('excluir', 'lixeira', livre ? 'Excluir' : 'Ocultar', 'Delete', trav, livre) + '<hr>' +
        it('copiar-estilo', 'estilo', 'Copiar estilo', K + '+Alt+C', l.length !== 1) + it('colar-estilo', 'estilo', 'Colar estilo', K + '+Alt+V', !estiloCopiado || trav) + '<hr>' +
        it('topo', 'topo', 'Trazer para o topo', K + '+Shift+]') + it('frente', 'frente', 'Trazer para frente', K + '+]') +
        it('tras', 'tras', 'Enviar para trás', K + '+[') + it('fundo', 'fundo', 'Enviar para o fundo', K + '+Shift+[') + '<hr>' +
        (l.length > 1 && !(grupo && l.every(e => e.dataset.grupo === l[0].dataset.grupo)) ? it('agrupar', 'agrupar', 'Agrupar', K + '+G', trav) : '') +
        (grupo ? it('desagrupar', 'desagrupar', 'Desagrupar', K + '+Shift+G', trav) : '') +
        it('travar', trav ? 'cadeadoAberto' : 'cadeado', trav ? 'Destravar' : 'Travar', 'Alt+Shift+L') +
        it('alinhar-centro', 'alCentro', l.length > 1 ? 'Centralizar entre si' : 'Centralizar no cartaz', '', trav);
    } else {
      html += it('colar', 'colar', 'Colar', K + '+V', !EP.temClipboard || !EP.temClipboard()) + it('selecionar-tudo', 'selecionar', 'Selecionar tudo', K + '+A') + '<hr>' +
        it('add-texto', 'texto', 'Adicionar texto', 'T') + it('add-forma', 'formas', 'Adicionar retângulo', 'R') + it('add-imagem', 'imagem', 'Adicionar imagem…', '') + '<hr>' +
        it('aplicar-todos', 'aplicar', 'Aplicar layout em todos', '');
    }
    ctx.innerHTML = html;
    ctx.classList.add('aberto');
    const w = ctx.offsetWidth, h = ctx.offsetHeight;
    ctx.style.left = Math.min(x, window.innerWidth - w - 8) + 'px';
    ctx.style.top = (y + h > window.innerHeight - 8 ? Math.max(8, y - h) : y) + 'px';
    const p = ctx.querySelector('.pro-item:not(:disabled)'); if (p) p.focus({ preventScroll: true });
  };
  ctx.addEventListener('click', e => {
    const b = e.target.closest('.pro-item'); if (!b || b.disabled) return;
    ui.fecharContexto(); EP.acao(b.dataset.acao);
  });
  ctx.addEventListener('keydown', e => {
    const itens = [...ctx.querySelectorAll('.pro-item:not(:disabled)')], i = itens.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); itens[(i + (e.key === 'ArrowDown' ? 1 : itens.length - 1)) % itens.length].focus(); }
    if (e.key === 'Escape') { e.stopPropagation(); ui.fecharContexto(); }
  });
  ctx.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- Atalhos ---------- */
  // "Ctrl+Shift+]" vira teclas; palavras de mouse (clique, arrastar...) ficam como texto
  const NAO_TECLA = /^(clique|cliques|2 cliques|arrastar|girar|roda)$/;
  const kb = s => s.split(/( \/ | ou | e )/).map(parte => {
    if (/^ (\/|ou|e) $/.test(parte)) return `<span> ${parte.trim()} </span>`;
    return parte.split('+').map(k => NAO_TECLA.test(k) ? `<span>${k}</span>` : `<kbd>${k}</kbd>`).join(' ');
  }).join('');
  const GRUPOS_ATALHOS = [
    ['Selecionar e mover', [['Selecionar vários', 'Shift+clique'], ['Selecionar tudo', K + '+A'], ['Próximo elemento (com algo selecionado)', 'Tab'], ['Tirar seleção', 'Esc'], ['Ir para a faixa e o inspetor', 'Esc e Tab'], ['Mover 1 mm', 'Setas'], ['Mover 10 mm', 'Shift+Setas'], ['Duplicar arrastando', 'Alt+arrastar'], ['Arrastar sem encaixe', K + '+arrastar'], ['Girar de 15 em 15°', 'Shift+girar']]],
    ['Editar', [['Folha em branco', 'Shift+N'], ['Desfazer', K + '+Z'], ['Refazer', K + '+Y'], ['Copiar', K + '+C'], ['Colar', K + '+V'], ['Recortar', K + '+X'], ['Duplicar', K + '+D'], ['Excluir', 'Delete'], ['Copiar estilo', K + '+Alt+C'], ['Colar estilo', K + '+Alt+V']]],
    ['Camadas', [['Trazer para frente', K + '+]'], ['Enviar para trás', K + '+['], ['Trazer para o topo', K + '+Shift+]'], ['Enviar para o fundo', K + '+Shift+['], ['Renomear camada (na lista)', 'F2'], ['Agrupar', K + '+G'], ['Desagrupar', K + '+Shift+G'], ['Travar / destravar', 'Alt+Shift+L']]],
    ['Texto', [['Editar texto', 'Enter ou 2 cliques'], ['Nova linha', 'Shift+Enter'], ['Negrito', K + '+B'], ['Itálico', K + '+I'], ['Sublinhado', K + '+U'], ['Maiúsculas', K + '+Shift+K'], ['Alinhar à esquerda', K + '+Shift+L'], ['Centralizar texto', K + '+Shift+E'], ['Alinhar à direita', K + '+Shift+R']]],
    ['Inserir', [['Texto', 'T'], ['Retângulo', 'R'], ['Círculo', 'C'], ['Linha', 'L']]],
    ['Ver e arquivo', [['Aumentar / diminuir zoom', K + '+= / ' + K + '+−'], ['Zoom com a roda', K + '+roda'], ['Ajustar à tela', 'Shift+1'], ['Tamanho real', 'Shift+0'], ['Régua', 'Shift+R'], ['Grade', 'Shift+G'], ['Salvar projeto', K + '+S'], ['Abrir projeto', K + '+O'], ['Esta lista', '?']]]
  ];
  function abrirAtalhos() {
    dlg.innerHTML = `<div class="corpo"><header><h2 id="pro-atalhos-titulo">Atalhos do teclado</h2><button type="button" class="pro-btn so-icone" data-fechar aria-label="Fechar">${svg('fechar')}</button></header>
      <div class="pro-atalhos-grade">${GRUPOS_ATALHOS.map(([t, itens]) => `<section><h3>${t}</h3><dl>${itens.map(([a, k]) => `<dt>${a}</dt><dd>${kb(k)}</dd>`).join('')}</dl></section>`).join('')}</div></div>`;
    dlg.showModal();
  }
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-fechar]')) dlg.close(); });
  ui.abrirAtalhos = abrirAtalhos;
  ui.dialogoAberto = () => dlg.open || (document.getElementById('galeria') && document.getElementById('galeria').open);

  /* ---------- Estado dos botões ---------- */
  function estadoBarra() {
    barra.querySelector('[data-acao=desfazer]').disabled = !EP.hist.desfazer.length;
    barra.querySelector('[data-acao=refazer]').disabled = !EP.hist.refazer.length;
  }
  EP.ouvir('historico', estadoBarra);
  EP.ouvir('mudou', () => { sincronizar(); desenharCamadas(); estadoBarra(); });
  EP.ouvir('selecao', () => { if (window.matchMedia('(max-width: 900px)').matches && EP.sel.length) mostrarAba('p'); });
  ui.estadoZoom = (z, regua, grade) => {
    $('pro-zoom-valor').textContent = Math.round(z * 100) + '%';
    barra.querySelector('[data-acao=regua]').setAttribute('aria-pressed', String(regua));
    barra.querySelector('[data-acao=grade]').setAttribute('aria-pressed', String(grade));
    ui.ajustarBarra();
  };
  estadoBarra();
})();
