/* Editor profissional — peças do cartaz padrão para inserir em qualquer cartaz (inclusive na Folha em branco):
   caixa de preço DE, caixa de preço POR, nome do produto (barras + ícones), rodapé de validade e moldura sozinha.
   As medidas saem de um cartaz de verdade montado fora da tela (montarCartaz do cartaz.html, no formato do
   cartaz de destino), então as peças ficam iguais às do cartaz gerado. Tudo é gravado em cqw (fração da
   largura do cartaz), a unidade que o editor já usa. Peça composta entra como GRUPO de elementos livres:
   move junto, e com 2 cliques (ou Desagrupar) dá para mexer em cada parte. */
(function () {
  const EP = window.EP, ui = EP.ui;
  const fix = EP.fix;

  /* ---------- Medir um cartaz padrão ---------- */
  function medir(alvo) {
    const a3 = alvo.classList.contains('a3');
    const caixa = document.createElement('div');
    caixa.setAttribute('aria-hidden', 'true');
    caixa.style.cssText = 'position:absolute;left:-30000px;top:0;visibility:hidden;pointer-events:none;';
    caixa.innerHTML = montarCartaz('NOME DO PRODUTO', '0,00', '0,00', '30/11/2026');
    document.body.appendChild(caixa);
    const c = caixa.querySelector('.cartaz');
    c.className = 'cartaz ' + (a3 ? 'a3' : 'a5');
    c.style.setProperty('zoom', '1', 'important'); // medidas sem o zoom da tela
    c.style.margin = '0';
    c.style.border = 'none'; // como na mesa (#preview-area .cartaz não tem borda)
    c.dataset.icone = iconeId();
    if (typeof desenharIcones === 'function') desenharIcones(c);
    const R = c.getBoundingClientRect(), RW = R.width || 1;
    const un = px => px / RW * 100; // px → cqw
    const ret = el => { const r = el.getBoundingClientRect(); return { x: un(r.left - R.left), y: un(r.top - R.top), w: un(r.width), h: un(r.height) }; };
    const centro = q => ({ cx: q.x + q.w / 2, cy: q.y + q.h / 2 });
    // texto: centro da caixa de conteúdo (sem o padding) e estilo calculado
    const texto = el => {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), pr = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
      const pt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth), pb = parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
      const fs = parseFloat(cs.fontSize) || 16;
      return {
        cx: un(r.left - R.left + pl + (r.width - pl - pr) / 2), cy: un(r.top - R.top + pt + (r.height - pt - pb) / 2),
        w: un(r.width - pl - pr), h: un(r.height - pt - pb),
        fs: un(fs), lh: cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / fs,
        ff: cs.fontFamily, fw: cs.fontWeight, cor: EP.paraHex(cs.color) || '#222222', tt: cs.textTransform
      };
    };
    const caixaPreco = box => {
      const cs = getComputedStyle(box);
      return { ...centro(ret(box)), ...ret(box), esp: un(parseFloat(cs.borderTopWidth) || 0), raio: un(parseFloat(cs.borderTopLeftRadius) || 0),
        borda: EP.paraHex(cs.borderTopColor) || '#cfcfcf',
        rotulo: texto(box.querySelector('.label-price')), valor: texto(box.querySelector('.value-price')) };
    };
    const boxes = c.querySelectorAll('.box-price');
    const rod = c.querySelector('.validade'), csr = getComputedStyle(rod), rr = ret(rod), bt = un(parseFloat(csr.borderTopWidth) || 0);
    const barra = c.querySelector('.bar-top');
    const m = {
      de: caixaPreco(boxes[0]), por: caixaPreco(boxes[1]),
      nome: {
        barras: [...c.querySelectorAll('.bar-top, .bar-bottom')].map(b => ({ ...ret(b), ...centro(ret(b)) })),
        corBarra: EP.paraHex(getComputedStyle(barra).backgroundColor) || '#000000',
        texto: texto(c.querySelector('.produto-nome')),
        icones: [...c.querySelectorAll('.col-thunder svg')].map(s => { const q = ret(s); return { ...q, ...centro(q), lado: s.closest('.col-thunder').dataset.lado }; }),
        corIcone: EP.paraHex(getComputedStyle(c.querySelector('.col-thunder svg') || barra).color) || '#e6b800'
      },
      rodape: {
        linha: { x: rr.x, w: rr.w, cx: rr.x + rr.w / 2, cy: rr.y + bt / 2, h: bt, cor: EP.paraHex(csr.borderTopColor) || '#dddddd' },
        texto: texto(rod)
      }
    };
    caixa.remove();
    return m;
  }
  function iconeId() {
    const id = typeof iconePadrao !== 'undefined' ? iconePadrao : 'raio';
    return typeof ICONES !== 'undefined' && ICONES[id] && ICONES[id].svg ? id : 'raio';
  }

  /* ---------- Fábricas de elementos (cada uma devolve o elemento + centro e tamanho em cqw) ---------- */
  function texto(info, conteudo, nome) {
    const el = document.createElement('div');
    el.className = 'livre-texto';
    el.textContent = conteudo;
    el.setAttribute('contenteditable', 'true');
    el.style.fontFamily = info.ff;
    el.style.fontWeight = info.fw;
    el.style.fontSize = fix(info.fs) + 'cqw';
    el.style.lineHeight = String(+info.lh.toFixed(4));
    el.style.color = info.cor;
    el.style.textTransform = info.tt || 'none';
    el.dataset.nome = nome;
    return { el, cx: info.cx, cy: info.cy, w: info.w, h: info.h };
  }
  function forma(tipo, q, dados, nome) {
    const el = document.createElement('div');
    el.className = 'livre-forma';
    el.dataset.forma = tipo;
    el.style.width = fix(q.w) + 'cqw';
    el.style.height = fix(q.h) + 'cqw';
    Object.entries(dados).forEach(([k, v]) => { if (v !== '' && v !== undefined) el.dataset[k] = String(v); });
    if (dados.preench === '') el.dataset.preench = '';
    EP.desenharForma(el);
    el.dataset.nome = nome;
    return { el, cx: q.cx, cy: q.cy, w: q.w, h: q.h };
  }
  // Moldura igual à borda CSS da caixa: no SVG o traço fica centrado na linha, então o raio é o de fora menos meia espessura
  const moldura = (b, nome) => forma('retangulo', b, { preench: '', borda: b.borda, esp: fix(b.esp), raio: fix(Math.max(0, b.raio - b.esp / 2)) }, nome);
  function icone(q, lado, cor) {
    const id = iconeId();
    const el = document.createElement('div');
    el.className = 'livre-icone';
    el.dataset.icone = id;
    el.style.color = cor;
    el.innerHTML = svgIcone(id, cor, 'left');
    el.style.setProperty('--s', fix(q.w / 32)); // .livre-icone svg mede 32cqw
    if (lado === 'right' && ICONES[id].espelhar) el.style.setProperty('--fh', '-1');
    el.dataset.nome = lado === 'right' ? 'Ícone direito' : 'Ícone esquerdo';
    return { el, cx: q.cx, cy: q.cy, w: q.w, h: q.h };
  }

  const PECAS = {
    de: { nome: 'Preço DE', partes: 'Moldura, rótulo e valor', montar: m => [
      moldura(m.de, 'Moldura DE'), texto(m.de.rotulo, 'DE R$:', 'Rótulo DE'), texto(m.de.valor, '0,00', 'Valor DE')] },
    por: { nome: 'Preço POR', partes: 'Moldura, rótulo e valor', montar: m => [
      moldura(m.por, 'Moldura POR'), texto(m.por.rotulo, 'POR R$:', 'Rótulo POR'), texto(m.por.valor, '0,00', 'Valor POR')] },
    nome: { nome: 'Nome do produto', partes: 'Barras, nome e ícones', montar: m => {
      const cor = (typeof CORES_ICONE !== 'undefined' && CORES_ICONE[corPadrao]) || m.nome.corIcone;
      return [
        ...m.nome.barras.map((b, i) => forma('linha', b, { preench: m.nome.corBarra, raio: 1 }, i ? 'Barra de baixo' : 'Barra de cima')),
        texto(m.nome.texto, 'NOME DO PRODUTO', 'Nome do produto'),
        ...m.nome.icones.map(q => icone(q, q.lado, cor))];
    } },
    rodape: { nome: 'Rodapé de validade', partes: 'Linha e texto', montar: m => [
      forma('linha', m.rodape.linha, { preench: m.rodape.linha.cor, tracejado: 1 }, 'Linha tracejada'),
      texto(m.rodape.texto, 'PRODUTO PRÓXIMO DA VALIDADE: 30/11/2026', 'Validade')] },
    moldura: { nome: 'Moldura', partes: 'Só o contorno', montar: m => [moldura(m.por, 'Moldura')] }
  };
  EP.PECAS = PECAS;

  // Parte visível do cartaz em unidades do cartaz (null se quase nada aparece)
  function areaVisivel(cartaz) {
    const r = cartaz.getBoundingClientRect(), { W, H } = EP.dim(cartaz);
    const painel = document.querySelector('.painel-pro');
    const direita = painel && getComputedStyle(painel).display !== 'none' && window.innerWidth > 900 ? painel.getBoundingClientRect().left : window.innerWidth;
    const barra = document.querySelector('.barra-pro'), topo = barra ? barra.getBoundingClientRect().bottom : 0;
    const x0 = Math.max(r.left, 0), x1 = Math.min(r.right, direita), y0 = Math.max(r.top, topo), y1 = Math.min(r.bottom, window.innerHeight);
    if (x1 - x0 < 40 || y1 - y0 < 40) return null;
    return { x0: (x0 - r.left) / r.width * W, x1: (x1 - r.left) / r.width * W, y0: (y0 - r.top) / r.height * H, y1: (y1 - r.top) / r.height * H };
  }

  /* ---------- Inserir ---------- */
  EP.criarPeca = (id, opc) => {
    opc = opc || {};
    const def = PECAS[id];
    if (!def) return null;
    const cartaz = opc.cartaz || EP.cartazAlvo();
    if (!cartaz) { EP.avisoSemCartaz(); return null; }
    const partes = def.montar(medir(cartaz));
    EP.registrar();
    const { W } = EP.dim(cartaz), k = W / 100; // unidades do cartaz por cqw
    const caixa = { x0: Math.min(...partes.map(p => p.cx - p.w / 2)), x1: Math.max(...partes.map(p => p.cx + p.w / 2)),
      y0: Math.min(...partes.map(p => p.cy - p.h / 2)), y1: Math.max(...partes.map(p => p.cy + p.h / 2)) };
    const natural = { x: (caixa.x0 + caixa.x1) / 2 * k, y: (caixa.y0 + caixa.y1) / 2 * k };
    // Na folha em branco a peça entra no lugar dela no cartaz padrão, se esse lugar está livre (dá para montar
    // o cartaz padrão peça por peça); nos outros casos, no centro da parte visível (como as outras inserções)
    let destino = opc.centro || null, rolar = false;
    if (!destino && cartaz.dataset.branco) {
      const nb = { x0: caixa.x0 * k, x1: caixa.x1 * k, y0: caixa.y0 * k, y1: caixa.y1 * k };
      const livre = ![...cartaz.querySelectorAll('.ed')].some(el => {
        if (EP.oculto(el)) return false;
        const g = EP.geo(el);
        return g.x0 < nb.x1 && g.x1 > nb.x0 && g.y0 < nb.y1 && g.y1 > nb.y0;
      });
      if (livre) {
        destino = natural;
        const vis = areaVisivel(cartaz);
        rolar = !vis || nb.y0 < vis.y0 || nb.y1 > vis.y1;
      }
    }
    if (!destino) destino = EP.centroVisivel(cartaz);
    const dx = destino.x - natural.x, dy = destino.y - natural.y;
    const els = partes.map(p => EP.inserir(p.el, cartaz, { x: p.cx * k + dx, y: p.cy * k + dy }));
    if (els.length > 1) { const g = 'g' + EP.novoUid(); els.forEach(e => { e.dataset.grupo = g; }); }
    EP.cartazAtivo = cartaz;
    EP.selecionar(els, { sozinho: true });
    if (rolar) {
      // lugar da peça fora da vista: rola a mesa até ela
      const r = cartaz.getBoundingClientRect(), q = r.height / EP.dim(cartaz).H;
      const cy = r.top + destino.y * q, barra = document.querySelector('.barra-pro');
      const topo = barra ? barra.getBoundingClientRect().bottom : 0;
      window.scrollBy({ top: cy - (topo + window.innerHeight) / 2, behavior: 'smooth' });
    }
    if (ui && ui.avisar) ui.avisar(els.length > 1 ? `${def.nome}: entrou em grupo` : `${def.nome} inserida`);
    return els;
  };

  /* ---------- Menu "Peças" (miniaturas iguais às peças) ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function mini(id) {
    if (id === 'de' || id === 'por') return `<span class="mini-caixa ${id}"><b>${id === 'de' ? 'DE' : 'POR'} R$:</b><i>0,00</i></span>`;
    if (id === 'nome') {
      const ic = iconeId(), cor = (typeof CORES_ICONE !== 'undefined' && CORES_ICONE[corPadrao]) || '#e6b800';
      return `<span class="mini-nome">${svgIcone(ic, cor, 'left')}<span class="col"><i></i><b>NOME DO PRODUTO</b><i></i></span>${svgIcone(ic, cor, 'right')}</span>`;
    }
    if (id === 'rodape') return '<span class="mini-rodape">PRODUTO PRÓXIMO DA VALIDADE: 30/11</span>';
    return '<span class="mini-moldura"></span>';
  }
  ui.POPS.pecas = p => {
    p.innerHTML = `<h4>Peças do cartaz</h4>
      <p class="pro-pecas-dica">Iguais às do cartaz gerado. Entram em grupo: clique 2 vezes numa parte para mexer só nela.</p>
      <div class="pro-grade-pecas">${Object.entries(PECAS).map(([id, d]) =>
        `<button type="button" data-peca="${id}"${id === 'nome' ? ' class="largo"' : ''} title="${esc(d.nome + ': ' + d.partes.toLowerCase())}">
          <span class="pro-mini" aria-hidden="true">${mini(id)}</span><span class="rot">${esc(d.nome)}</span><small>${esc(d.partes)}</small></button>`).join('')}</div>`;
    p.addEventListener('click', e => {
      const b = e.target.closest('[data-peca]');
      if (!b) return;
      ui.fecharPop();
      EP.acao('add-peca', b.dataset.peca);
    });
  };
})();
