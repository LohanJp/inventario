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

    .barra-pro { position: sticky; top: 61px; z-index: 2; display: none; flex-wrap: wrap; align-items: center; gap: 6px 14px;
      padding: 10px 24px; background: #23262a; color: #fff; font: 13px/1.2 "Archivo", system-ui, sans-serif; }
    .editor-pro .barra-pro { display: flex; }
    .barra-pro .grupo { display: flex; align-items: center; gap: 6px; }
    .barra-pro .rotulo { color: #b9bec5; }
    .barra-pro button { font: 600 13px/1 "Archivo", system-ui, sans-serif; color: #fff; background: #3a3f45; border: 0; border-radius: 6px; padding: 8px 10px; cursor: pointer; }
    .barra-pro button:hover:not(:disabled) { background: #4b5159; }
    .barra-pro button[aria-pressed="true"] { background: #f2b705; color: #23262a; }
    .barra-pro button:disabled, .barra-pro input:disabled, .barra-pro select:disabled { opacity: .4; cursor: default; }
    .barra-pro button:focus-visible, .barra-pro input:focus-visible, .barra-pro select:focus-visible { outline: 2px solid #f2b705; outline-offset: 2px; }
    .barra-pro input[type=range] { width: 110px; accent-color: #f2b705; }
    .barra-pro select { font: 13px "Archivo", system-ui, sans-serif; border-radius: 6px; border: 0; padding: 6px; }
    .barra-pro .cor { width: 22px; height: 22px; padding: 0; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(255,255,255,.35); }
    .barra-pro input[type=color] { width: 26px; height: 26px; padding: 0; border: 0; background: none; cursor: pointer; }
    .barra-pro #pro-selecionado { font-weight: 700; min-width: 120px; }
    .barra-pro .aviso-teste { margin-left: auto; color: #f2b705; font-weight: 700; }
    #btn-teste[aria-pressed="true"] { background: #f2b705; border-color: #f2b705; }
  `;
  document.head.appendChild(css);

  /* ---------- Barra de ferramentas ---------- */
  const barra = document.createElement('div');
  barra.className = 'barra-pro';
  barra.innerHTML = `
    <div class="grupo"><span class="rotulo">Adicionar</span>
      <button type="button" data-acao="add-texto">Texto</button>
      <button type="button" data-acao="add-icone">Ícone grande</button>
      <button type="button" data-acao="add-faixa">Faixa</button>
    </div>
    <div class="grupo"><span id="pro-selecionado">Nada selecionado</span></div>
    <div class="grupo"><label class="rotulo" for="pro-tamanho">Tamanho</label><input id="pro-tamanho" type="range" min="30" max="250" value="100" data-sel></div>
    <div class="grupo"><label class="rotulo" for="pro-giro">Girar</label><input id="pro-giro" type="range" min="-30" max="30" value="0" data-sel></div>
    <div class="grupo"><span class="rotulo">Cor</span><span id="pro-cores" class="grupo"></span><input id="pro-cor" type="color" value="#222222" aria-label="Outra cor" data-sel></div>
    <div class="grupo"><label class="rotulo" for="pro-fonte">Fonte</label><select id="pro-fonte" data-sel></select>
      <button type="button" data-acao="negrito" aria-pressed="false" data-sel title="Negrito">N</button></div>
    <div class="grupo">
      <button type="button" data-acao="centro" data-sel title="Centralizar na horizontal">Centralizar</button>
      <button type="button" data-acao="zerar" data-sel title="Volta posição, tamanho e giro ao original">Restaurar</button>
      <button type="button" data-acao="duplicar" data-sel title="Ctrl+D">Duplicar</button>
      <button type="button" data-acao="excluir" data-sel title="Delete">Excluir</button>
    </div>
    <div class="grupo">
      <button type="button" data-acao="desfazer" title="Ctrl+Z">Desfazer</button>
      <button type="button" data-acao="refazer" title="Ctrl+Y">Refazer</button>
    </div>
    <div class="grupo">
      <button type="button" data-acao="aplicar-todos" title="Copia o layout do cartaz selecionado para todos">Aplicar em todos</button>
      <button type="button" data-acao="salvar-modelo" title="Os próximos cartazes gerados já saem com este layout">Salvar modelo</button>
      <button type="button" data-acao="esquecer-modelo">Esquecer modelo</button>
    </div>
    <span class="aviso-teste">Versão de teste</span>`;
  document.querySelector('.barra').after(barra);
  const $ = id => document.getElementById(id);
  CORES.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cor'; b.style.background = c; b.dataset.cor = c; b.dataset.sel = '';
    b.setAttribute('aria-label', 'Cor ' + c);
    $('pro-cores').appendChild(b);
  });
  FONTES.forEach(([v, n]) => { const o = document.createElement('option'); o.value = v; o.textContent = n; $('pro-fonte').appendChild(o); });

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
  }
  function atualizarBarra() {
    const el = selecionado;
    barra.querySelectorAll('[data-sel]').forEach(c => { c.disabled = !el; });
    if (!el) { $('pro-selecionado').textContent = 'Nada selecionado'; return; }
    const p = infoPapel(el);
    $('pro-selecionado').textContent = p ? p.nome : el.classList.contains('livre-faixa') ? 'Faixa' : el.classList.contains('livre-icone') ? 'Ícone grande' : 'Texto';
    $('pro-tamanho').value = Math.round(num(el, '--s', 1) * 100);
    $('pro-giro').value = num(el, '--r', 0);
    const alvo = alvoTexto(el);
    $('pro-fonte').value = alvo.style.fontFamily && FONTES.some(f => f[0] === alvo.style.fontFamily) ? alvo.style.fontFamily : '';
    barra.querySelector('[data-acao=negrito]').setAttribute('aria-pressed', String(alvo.style.fontWeight === '900' || alvo.style.fontWeight === 'bold'));
    barra.querySelector('[data-acao=excluir]').textContent = el.classList.contains('livre') ? 'Excluir' : (el.classList.contains('oculto') ? 'Mostrar' : 'Ocultar');
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
    if (selecionado.classList.contains('livre-faixa')) { selecionado.style.background = cor; return; }
    if (selecionado.classList.contains('livre-icone')) { selecionado.style.color = cor; return; }
    alvoTexto(selecionado).style.color = cor;
    $('pro-cor').value = cor;
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
  barra.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.cor) { corAtual(b.dataset.cor); return; }
    const acao = b.dataset.acao;
    if (acao === 'add-texto') adicionar('texto');
    if (acao === 'add-icone') adicionar('icone');
    if (acao === 'add-faixa') adicionar('faixa');
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
      if (!base) return;
      registrar();
      const layout = extrairLayout(base);
      area.querySelectorAll('.cartaz').forEach(c => { if (c !== base) aplicarLayout(c, layout); });
      if (typeof ajustarNomes === 'function') ajustarNomes();
    }
    if (acao === 'salvar-modelo') {
      const base = cartazAlvo();
      if (!base) { alert('Gere ou crie um cartaz primeiro.'); return; }
      try { localStorage.setItem(CHAVE_MODELO, JSON.stringify(extrairLayout(base))); b.textContent = 'Modelo salvo'; setTimeout(() => { b.textContent = 'Salvar modelo'; }, 1500); }
      catch (err) { alert('Não consegui salvar o modelo: ' + err.message); }
    }
    if (acao === 'esquecer-modelo') {
      try { localStorage.removeItem(CHAVE_MODELO); } catch (err) {}
      b.textContent = 'Modelo apagado'; setTimeout(() => { b.textContent = 'Esquecer modelo'; }, 1500);
    }
  });
  // Sliders: registra o histórico uma vez por arrasto
  ['pro-tamanho', 'pro-giro'].forEach(id => {
    $(id).addEventListener('pointerdown', () => registrar());
    $(id).addEventListener('keydown', () => registrar());
  });
  $('pro-tamanho').addEventListener('input', e => definir('--s', (e.target.value / 100).toFixed(2)));
  $('pro-giro').addEventListener('input', e => definir('--r', e.target.value));
  $('pro-cor').addEventListener('change', e => corAtual(e.target.value));
  $('pro-fonte').addEventListener('change', e => { if (!selecionado) return; registrar(); alvoTexto(selecionado).style.fontFamily = e.target.value; if (typeof ajustarNomes === 'function') ajustarNomes(); });

  /* ---------- Teclado ---------- */
  document.addEventListener('keydown', e => {
    if (!ativo) return;
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
    selecionar(null);
    document.body.classList.remove('editor-pro');
  }
  window.EditorPro = { ligar, desligar, get ativo() { return ativo; } };
})();
