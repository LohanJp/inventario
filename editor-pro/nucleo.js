/* Editor profissional — núcleo: modelo dos elementos, geometria, seleção, histórico, camadas, modelos e arquivo.
   Coordenadas: "unidades do cartaz" = px de layout do cartaz sem zoom (offsetWidth/offsetHeight).
   O deslocamento salvo no elemento é fração do cartaz (--fx, --fy), então vale igual em A3 e A5. */
(function () {
  const EP = window.EP = window.EP || {};
  const area = EP.area = document.getElementById('preview-area');
  EP.ativo = false;
  EP.sel = [];
  EP.cartazAtivo = null;

  /* ---------- Eventos internos ---------- */
  const ouvintes = {};
  EP.ouvir = (nome, fn) => { (ouvintes[nome] = ouvintes[nome] || []).push(fn); };
  EP.emitir = (nome, dado) => { (ouvintes[nome] || []).forEach(fn => { try { fn(dado); } catch (e) { console.error(e); } }); };

  /* ---------- Papéis fixos do cartaz ---------- */
  // Cada caixa de preço vira 3 elementos separados (moldura, rótulo e valor), agrupados por padrão.
  // A caixa (.box-price) continua só como molde do layout: a borda dela fica transparente e quem
  // desenha o contorno é a .moldura-price (mesma borda, raio e cor), então a aparência não muda.
  EP.PAPEIS = [
    { papel: 'titulo', sel: '.row-header', alvo: '.produto-nome', nome: 'Nome do produto',
      partes: [{ rot: 'Barras', sel: '.bar-top, .bar-bottom', prop: 'backgroundColor' }] },
    { papel: 'de-moldura', sel: '.box-price:first-child > .moldura-price', nome: 'Moldura DE' },
    { papel: 'de-rotulo', sel: '.box-price:first-child > .label-price', nome: 'Rótulo DE' },
    { papel: 'de', sel: '.box-price:first-child > .value-price', nome: 'Preço DE' },
    { papel: 'por-moldura', sel: '.box-price:last-child > .moldura-price', nome: 'Moldura POR' },
    { papel: 'por-rotulo', sel: '.box-price:last-child > .label-price', nome: 'Rótulo POR' },
    { papel: 'por', sel: '.box-price:last-child > .value-price', nome: 'Preço POR' },
    { papel: 'rodape', sel: '.validade', alvo: null, nome: 'Rodapé',
      partes: [{ rot: 'Linha', sel: null, prop: 'borderTopColor' }] }
  ];
  EP.FONTES = [
    ['', 'Padrão do cartaz'],
    ['"ImpactCustom", Impact, sans-serif', 'Impact'],
    ['Anton, Impact, sans-serif', 'Anton'],
    ['"Arial Black", Arial, sans-serif', 'Arial Black'],
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ['"Archivo", system-ui, sans-serif', 'Archivo'],
    ['Verdana, sans-serif', 'Verdana'],
    ['Tahoma, sans-serif', 'Tahoma'],
    ['"Trebuchet MS", sans-serif', 'Trebuchet MS'],
    ['"Segoe UI", system-ui, sans-serif', 'Segoe UI'],
    ['Georgia, serif', 'Georgia'],
    ['"Times New Roman", serif', 'Times New Roman'],
    ['"Courier New", monospace', 'Courier New'],
    ['"Comic Sans MS", cursive', 'Comic Sans MS']
  ];
  EP.PALETA = ['#222222', '#444444', '#777777', '#bbbbbb', '#ffffff', '#fff3c4', '#ffe066', '#e6b800',
               '#f28c00', '#d62828', '#a4161a', '#ffd6d6', '#1a7f3c', '#2a9d8f', '#0b5cad', '#7a3db8'];
  EP.FORMAS = {
    retangulo: { nome: 'Retângulo', w: 40, h: 26, preench: '#e6b800', borda: '', esp: 0, raio: 0 },
    circulo: { nome: 'Círculo', w: 30, h: 30, preench: '#d62828', borda: '', esp: 0 },
    linha: { nome: 'Linha', w: 50, h: 0.9, preench: '#222222' },
    seta: { nome: 'Seta', w: 34, h: 12, preench: '#d62828', borda: '', esp: 0 },
    estrela: { nome: 'Estrela', w: 28, h: 27, preench: '#e6b800', borda: '', esp: 0 },
    selo: { nome: 'Selo', w: 30, h: 30, preench: '#d62828', borda: '', esp: 0 }
  };

  const $ = id => document.getElementById(id);
  EP.$ = $;
  const num = EP.num = (el, v, padrao) => { const n = parseFloat(el.style.getPropertyValue(v)); return isNaN(n) ? padrao : n; };
  EP.fix = n => (Math.round(n * 100000) / 100000).toString();

  /* ---------- Tipos ---------- */
  EP.infoPapel = el => EP.PAPEIS.find(p => p.papel === el.dataset.papel);
  EP.tipo = el => {
    if (el.dataset.papel) return 'fixo';
    for (const t of ['texto', 'faixa', 'icone', 'forma', 'imagem']) if (el.classList.contains('livre-' + t)) return t;
    return 'texto';
  };
  // Moldura de caixa de preço de cartaz gerado: elemento fixo, mas com controles de forma
  EP.ehMoldura = el => !!el && /-moldura$/.test(el.dataset.papel || '');
  EP.temTexto = el => ['fixo', 'texto', 'faixa'].includes(EP.tipo(el)) && !EP.ehMoldura(el);
  EP.alvoTexto = el => { const p = EP.infoPapel(el); return (p && p.alvo && el.querySelector(p.alvo)) || el; };
  EP.podeEspelhar = el => ['icone', 'forma', 'imagem'].includes(EP.tipo(el));
  EP.nomePadrao = el => {
    const p = EP.infoPapel(el);
    if (p) return p.nome;
    const t = EP.tipo(el);
    if (t === 'texto') { const tx = el.textContent.trim().replace(/\s+/g, ' '); return tx ? (tx.length > 24 ? tx.slice(0, 24) + '…' : tx) : 'Texto'; }
    if (t === 'faixa') return 'Faixa: ' + (el.textContent.trim().slice(0, 18) || '');
    if (t === 'icone') return 'Ícone' + (typeof ICONES !== 'undefined' && ICONES[el.dataset.icone] ? ': ' + ICONES[el.dataset.icone].nome : '');
    if (t === 'forma') return (EP.FORMAS[el.dataset.forma] || { nome: 'Forma' }).nome;
    if (t === 'imagem') return 'Imagem';
    return 'Elemento';
  };
  EP.nome = el => el.dataset.nome || EP.nomePadrao(el);
  EP.travado = el => el.hasAttribute('data-trava');
  EP.oculto = el => el.classList.contains('oculto');

  let contador = 0;
  EP.novoUid = () => 'e' + Date.now().toString(36) + (contador++).toString(36);
  EP.uid = el => el.dataset.uid || (el.dataset.uid = EP.novoUid());

  /* ---------- Geometria ---------- */
  EP.dim = c => ({ W: c.offsetWidth || 1, H: c.offsetHeight || 1 });
  function caixaLayout(el, cartaz) {
    let x = 0, y = 0, n = el;
    while (n && n !== cartaz) {
      x += n.offsetLeft; y += n.offsetTop;
      const p = n.offsetParent;
      if (p && p !== cartaz) { x += p.clientLeft; y += p.clientTop; }
      n = p;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  EP.caixaLayout = caixaLayout;
  EP.geo = el => {
    const c = el.closest('.cartaz');
    const { W, H } = EP.dim(c);
    const b = caixaLayout(el, c);
    const s = num(el, '--s', 1), r = num(el, '--r', 0);
    const cx = b.x + b.w / 2 + num(el, '--fx', 0) * W, cy = b.y + b.h / 2 + num(el, '--fy', 0) * H;
    const w = b.w * s, h = b.h * s;
    const rad = r * Math.PI / 180, co = Math.abs(Math.cos(rad)), si = Math.abs(Math.sin(rad));
    const aw = w * co + h * si, ah = w * si + h * co;
    return { cx, cy, w, h, r, s, W, H, lw: b.w, lh: b.h, x0: cx - aw / 2, y0: cy - ah / 2, x1: cx + aw / 2, y1: cy + ah / 2 };
  };
  EP.definirCentro = (el, cx, cy) => {
    const c = el.closest('.cartaz'), { W, H } = EP.dim(c), b = caixaLayout(el, c);
    el.style.setProperty('--fx', EP.fix((cx - b.x - b.w / 2) / W));
    el.style.setProperty('--fy', EP.fix((cy - b.y - b.h / 2) / H));
  };
  EP.mover = (el, dx, dy) => {
    const { W, H } = EP.dim(el.closest('.cartaz'));
    el.style.setProperty('--fx', EP.fix(num(el, '--fx', 0) + dx / W));
    el.style.setProperty('--fy', EP.fix(num(el, '--fy', 0) + dy / H));
  };
  EP.uniao = lista => {
    const gs = lista.map(EP.geo);
    return { x0: Math.min(...gs.map(g => g.x0)), y0: Math.min(...gs.map(g => g.y0)), x1: Math.max(...gs.map(g => g.x1)), y1: Math.max(...gs.map(g => g.y1)) };
  };
  // mm do papel por unidade do cartaz
  EP.mmPorUn = c => (c.classList.contains('a3') ? 297 : 148) / EP.dim(c).W;

  // "Medida" que escala: retorna o estado para poder reaplicar com fator k
  EP.medida = el => {
    const t = EP.tipo(el);
    if (t === 'forma') return { w: parseFloat(el.style.width) || 30, h: parseFloat(el.style.height) || 30 };
    if (t === 'imagem') return { w: parseFloat(el.style.width) || 40 };
    if (EP.ehMoldura(el)) return { s: num(el, '--s', 1), mx: num(el, '--mx', 0), my: num(el, '--my', 0), lw: el.offsetWidth, lh: el.offsetHeight };
    return { s: num(el, '--s', 1) };
  };
  EP.aplicarMedida = (el, m, kx, ky) => {
    // Moldura de cartaz gerado: canto = escala por igual (--s, como era a caixa);
    // lado = estica só largura ou altura (--mx/--my aumentam a caixa para os dois lados, em cqw)
    if (EP.ehMoldura(el) && ky !== undefined && m.lw !== undefined) {
      const W = EP.dim(el.closest('.cartaz')).W;
      if (kx !== 1) el.style.setProperty('--mx', EP.fix(m.mx + (Math.max(4, m.lw * kx) - m.lw) / 2 / W * 100));
      if (ky !== 1) el.style.setProperty('--my', EP.fix(m.my + (Math.max(4, m.lh * ky) - m.lh) / 2 / W * 100));
      return;
    }
    if (ky === undefined) ky = kx;
    const t = EP.tipo(el);
    if (t === 'forma') {
      const min = el.dataset.forma === 'linha' ? 0.1 : 1;
      el.style.width = EP.fix(Math.max(1, m.w * kx)) + 'cqw';
      el.style.height = EP.fix(Math.max(min, m.h * ky)) + 'cqw';
      EP.desenharForma(el);
    } else if (t === 'imagem') el.style.width = EP.fix(Math.max(2, m.w * kx)) + 'cqw';
    else el.style.setProperty('--s', EP.fix(Math.min(12, Math.max(0.08, m.s * kx))));
  };
  // Escala mantendo o centro
  EP.escalar = (el, k) => {
    const g = EP.geo(el);
    EP.aplicarMedida(el, EP.medida(el), k);
    EP.definirCentro(el, g.cx, g.cy);
  };

  /* ---------- Formas (SVG: sai no PDF igual à tela) ---------- */
  function poligonoEstrela(pontas, cx, cy, rx, ry, interno) {
    const pts = [];
    for (let i = 0; i < pontas * 2; i++) {
      const a = -Math.PI / 2 + i * Math.PI / pontas, f = i % 2 ? interno : 1;
      pts.push((cx + Math.cos(a) * rx * f).toFixed(1) + ',' + (cy + Math.sin(a) * ry * f).toFixed(1));
    }
    return pts.join(' ');
  }
  EP.svgForma = (forma, W, H, preench, borda, esp, raio, tracejado) => {
    const sw = borda ? esp : 0, i = sw / 2;
    const fill = preench || 'none', st = borda ? ` stroke="${borda}" stroke-width="${sw}" stroke-linejoin="round"` : '';
    let corpo = '';
    if (forma === 'retangulo') {
      const rr = Math.max(0, Math.min(raio || 0, (W - sw) / 2, (H - sw) / 2));
      corpo = `<rect x="${i}" y="${i}" width="${Math.max(0, W - sw)}" height="${Math.max(0, H - sw)}" rx="${rr}" ry="${rr}" fill="${fill}"${st}/>`;
    } else if (forma === 'circulo') {
      corpo = `<ellipse cx="${W / 2}" cy="${H / 2}" rx="${Math.max(0, W / 2 - i)}" ry="${Math.max(0, H / 2 - i)}" fill="${fill}"${st}/>`;
    } else if (forma === 'linha' && tracejado) {
      // linha tracejada (rodapé de validade): traços de 3x a espessura, como a borda "dashed" do navegador
      corpo = `<line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="${preench || '#222'}" stroke-width="${H}" stroke-dasharray="${+(H * 3).toFixed(2)} ${+(H * 3).toFixed(2)}"/>`;
    } else if (forma === 'linha') {
      corpo = `<rect x="0" y="0" width="${W}" height="${H}" rx="${raio ? H / 2 : 0}" fill="${preench || '#222'}"/>`;
    } else if (forma === 'seta') {
      const t = H * 0.38, hl = Math.min(H * 1.05, W * 0.55), m = H / 2;
      const p = [[i, m - t / 2], [W - hl, m - t / 2], [W - hl, i], [W - i, m], [W - hl, H - i], [W - hl, m + t / 2], [i, m + t / 2]];
      corpo = `<polygon points="${p.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" fill="${fill}"${st}/>`;
    } else if (forma === 'estrela') {
      corpo = `<polygon points="${poligonoEstrela(5, W / 2, H * 0.53, W / 2 - i, H * 0.53 - i, 0.42)}" fill="${fill}"${st}/>`;
    } else if (forma === 'selo') {
      corpo = `<polygon points="${poligonoEstrela(16, W / 2, H / 2, W / 2 - i, H / 2 - i, 0.84)}" fill="${fill}"${st}/>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${corpo}</svg>`;
  };
  EP.desenharForma = el => {
    const w = (parseFloat(el.style.width) || 30) * 10, h = (parseFloat(el.style.height) || 30) * 10, d = el.dataset;
    el.innerHTML = EP.svgForma(d.forma, +w.toFixed(1), +h.toFixed(1), d.preench, d.borda, (+d.esp || 0) * 10, (+d.raio || 0) * 10, d.tracejado === '1');
  };

  /* ---------- Moldura de cartaz gerado (CSS: borda e fundo da .moldura-price) ---------- */
  // Valores em cqw, na mesma escala dos controles de forma do inspetor
  EP.lerMoldura = el => {
    const c = el.closest('.cartaz'), cs = getComputedStyle(el), W = EP.dim(c).W;
    // a espessura calculada vem arredondada para o pixel da tela (zoom da mesa): sem valor próprio, usa a do cartaz
    // (A3: 0,8 mm de 297 mm; A5: 2 px de 558 px)
    const propria = parseFloat(el.style.borderWidth);
    const bw = parseFloat(cs.borderTopWidth) || 0;
    const esp = !isNaN(propria) && /cqw$/.test(el.style.borderWidth) ? propria : (c.classList.contains('a3') ? 0.8 / 297 * 100 : 2 / 558 * 100);
    return { preench: EP.paraHex(cs.backgroundColor), borda: cs.borderTopStyle === 'none' || !bw ? '' : EP.paraHex(cs.borderTopColor),
      esp: bw ? esp : 0, raio: (parseFloat(cs.borderTopLeftRadius) || 0) / W * 100 };
  };
  EP.gravarMoldura = (el, campo, v) => {
    if (campo === 'preench') el.style.backgroundColor = v || '';
    if (campo === 'borda') { el.style.borderColor = v || 'transparent'; if (v && !(EP.lerMoldura(el).esp > 0)) el.style.borderWidth = '0.3cqw'; }
    if (campo === 'esp') el.style.borderWidth = EP.fix(v) + 'cqw';
    if (campo === 'raio') el.style.borderRadius = EP.fix(v) + 'cqw';
  };

  /* ---------- Efeitos de texto (text-shadow e fundo: o html2canvas 1.4.1 desenha os dois) ---------- */
  EP.lerEfeitos = alvo => { try { return JSON.parse(alvo.dataset.efx || '{}'); } catch (e) { return {}; } };
  function rgba(hex, op) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex || '#000';
    const n = parseInt(m[1], 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${(op === undefined ? 1 : op).toFixed(2)})`;
  }
  EP.rgba = rgba;
  EP.gravarEfeitos = (alvo, fx) => {
    const limpo = {};
    Object.entries(fx).forEach(([k, v]) => { if (v) limpo[k] = v; });
    if (Object.keys(limpo).length) alvo.dataset.efx = JSON.stringify(limpo); else delete alvo.dataset.efx;
    const sombras = [];
    if (limpo.contorno) {
      const t = limpo.contorno.esp / 200, n = 16;
      for (let i = 0; i < n; i++) {
        const a = i * 2 * Math.PI / n;
        sombras.push(`${(Math.cos(a) * t).toFixed(4)}em ${(Math.sin(a) * t).toFixed(4)}em 0 ${limpo.contorno.cor}`);
      }
    }
    if (limpo.sombra) {
      const s = limpo.sombra, a = s.dir * Math.PI / 180, d = s.dist / 100;
      sombras.push(`${(Math.cos(a) * d).toFixed(4)}em ${(Math.sin(a) * d).toFixed(4)}em ${(s.blur / 100).toFixed(3)}em ${rgba(s.cor, s.op / 100)}`);
    }
    alvo.style.textShadow = sombras.join(', ');
    if (limpo.destaque) {
      alvo.style.setProperty('--pro-bg', limpo.destaque.cor);
      alvo.style.padding = '0.06em 0.22em';
      alvo.style.borderRadius = (limpo.destaque.raio / 100).toFixed(3) + 'em';
    } else { alvo.style.removeProperty('--pro-bg'); alvo.style.padding = ''; alvo.style.borderRadius = ''; }
  };

  /* ---------- Caixas de preço: moldura, rótulo e valor separados ---------- */
  const VARS_GEO = ['--fx', '--fy', '--s', '--r'];
  const qualCaixa = box => (box.parentElement && box.parentElement.firstElementChild === box ? 'de' : 'por');
  EP.separarCaixas = cartaz => {
    const { W, H } = EP.dim(cartaz);
    cartaz.querySelectorAll('.precos > .box-price').forEach(box => {
      if (box.classList.contains('pro-separada')) return;
      const label = box.querySelector(':scope > .label-price'), valor = box.querySelector(':scope > .value-price');
      if (!label || !valor) return;
      const q = qualCaixa(box);
      // Caixa da versão anterior (a caixa inteira era o elemento "de"/"por"): guarda o que tinha
      const antiga = !!box.dataset.papel;
      const v = { fx: num(box, '--fx', 0), fy: num(box, '--fy', 0), s: num(box, '--s', 1), r: num(box, '--r', 0) };
      const velho = antiga ? {
        z: box.style.zIndex, op: box.style.opacity, borda: box.style.borderColor, oculto: box.classList.contains('oculto'),
        trava: box.hasAttribute('data-trava'), nome: box.dataset.nome || '', grupo: box.dataset.grupo || '', uid: box.dataset.uid || ''
      } : null;
      if (antiga) {
        // destrava antes (devolve contenteditable aos textos) para poder travar os 3 depois
        if (velho.trava) EP.travar([box], false);
        box.removeAttribute('style');
        box.classList.remove('ed', 'sel', 'oculto');
        ['papel', 'uid', 'nome', 'grupo'].forEach(k => delete box.dataset[k]);
      }
      const mold = document.createElement('div');
      mold.className = 'moldura-price';
      box.prepend(mold);
      box.classList.add('pro-separada');
      const membros = [[mold, q + '-moldura'], [label, q + '-rotulo'], [valor, q]];
      const grupo = (velho && velho.grupo) || ('g' + EP.novoUid());
      membros.forEach(([el, papel]) => {
        el.dataset.papel = papel; el.classList.add('ed'); el.dataset.uid = EP.novoUid(); el.dataset.grupo = grupo;
      });
      if (!antiga) return;
      // Migração: a transformação da caixa (posição, escala e giro em volta do centro dela) vira a
      // transformação equivalente em cada parte, que gira/escala em volta do próprio centro.
      const cb = caixaLayout(box, cartaz), c = { x: cb.x + cb.w / 2, y: cb.y + cb.h / 2 };
      const rad = v.r * Math.PI / 180, co = Math.cos(rad), si = Math.sin(rad);
      membros.forEach(([el]) => {
        let tx = v.fx * W, ty = v.fy * H;
        if (el !== mold) {
          const b = caixaLayout(el, cartaz), dx = b.x + b.w / 2 - c.x, dy = b.y + b.h / 2 - c.y;
          tx += v.s * (dx * co - dy * si) - dx;
          ty += v.s * (dx * si + dy * co) - dy;
        }
        if (tx) el.style.setProperty('--fx', EP.fix(tx / W));
        if (ty) el.style.setProperty('--fy', EP.fix(ty / H));
        if (v.s !== 1) el.style.setProperty('--s', EP.fix(v.s));
        if (v.r) el.style.setProperty('--r', EP.fix(v.r));
        if (velho.z) el.style.zIndex = velho.z;
        if (velho.op) el.style.opacity = velho.op;
        if (velho.oculto) el.classList.add('oculto');
      });
      if (velho.borda) mold.style.borderColor = velho.borda;
      if (velho.nome) valor.dataset.nome = velho.nome;
      if (velho.uid) valor.dataset.uid = velho.uid; // seleção/histórico que apontavam para a caixa seguem o preço
      if (velho.trava) EP.travar(membros.map(m => m[0]), true);
    });
  };
  // Volta a caixa ao formato antigo (só para aplicar um modelo salvo na versão anterior; depois separa de novo)
  EP.juntarCaixas = cartaz => {
    cartaz.querySelectorAll('.precos > .box-price.pro-separada').forEach(box => {
      const filhos = [...box.querySelectorAll(':scope > .label-price, :scope > .value-price')];
      EP.travar(filhos, false);
      box.querySelectorAll(':scope > .moldura-price').forEach(m => m.remove());
      filhos.forEach(f => {
        f.classList.remove('ed', 'sel', 'oculto');
        ['papel', 'uid', 'nome', 'grupo'].forEach(k => delete f.dataset[k]);
        VARS_GEO.concat(['z-index', 'opacity']).forEach(p => f.style.removeProperty(p));
      });
      box.classList.remove('pro-separada');
      box.dataset.papel = qualCaixa(box); box.classList.add('ed'); box.dataset.uid = EP.novoUid();
    });
  };

  /* ---------- Preparar cartazes ---------- */
  EP.preparar = cartaz => {
    EP.separarCaixas(cartaz);
    EP.PAPEIS.forEach(p => {
      const el = cartaz.querySelector(p.sel);
      if (el && !el.dataset.papel) { el.dataset.papel = p.papel; el.classList.add('ed'); }
    });
    cartaz.querySelectorAll('.guia').forEach(g => g.remove());
    const { W } = EP.dim(cartaz);
    cartaz.querySelectorAll('.ed').forEach(el => {
      if (!el.dataset.uid) {
        // Elementos da versão anterior usavam "translate: -50% 0" (o html2canvas ignora essa propriedade):
        // converte para o deslocamento --fx, que sai certo no PDF
        if (el.classList.contains('livre') && !el.classList.contains('livre-faixa') && !el.dataset.v) {
          el.style.setProperty('--fx', EP.fix(num(el, '--fx', 0) - (el.offsetWidth / 2) / W));
        }
        if (el.classList.contains('livre')) el.dataset.v = '2';
        // faixa antiga: cor em "background" (sumia no PDF) → variável --pro-bg
        if (el.classList.contains('livre-faixa') && el.style.background) {
          const cor = el.style.backgroundColor || el.style.background; el.style.background = ''; el.style.setProperty('--pro-bg', cor);
        }
        EP.uid(el);
      }
    });
    EP.normalizarZ(cartaz);
  };
  EP.prepararTodos = () => area.querySelectorAll('.cartaz').forEach(EP.preparar);
  // Todos os cartazes (a numeração "Cartaz N" conta os ocultos: ao mostrar de novo ele volta ao mesmo lugar)
  EP.cartazes = () => [...area.querySelectorAll('.cartaz')];
  // Cartazes ocultos (olho) não saem no PDF nem na impressão e ficam na área "Ocultos", no fim da mesa
  EP.cartazOculto = c => !!c && c.classList.contains('cartaz-oculto');
  EP.visiveis = () => EP.cartazes().filter(c => !EP.cartazOculto(c));
  EP.avisoSemCartaz = () => alert(area.querySelector('.cartaz.cartaz-oculto')
    ? 'Todos os cartazes estão ocultos. Mostre um deles (área Ocultos, no fim da mesa) ou crie uma folha em branco.'
    : 'Gere ou crie um cartaz primeiro.');

  /* ---------- Camadas (z-index explícito: o html2canvas respeita) ---------- */
  EP.elementos = cartaz => {
    const els = [...cartaz.querySelectorAll('.ed')];
    return els.map((el, i) => ({ el, i, z: parseInt(el.style.zIndex, 10) || (el.classList.contains('livre') ? 1 : 0) }))
      .sort((a, b) => a.z - b.z || a.i - b.i).map(o => o.el);
  };
  EP.normalizarZ = cartaz => EP.elementos(cartaz).forEach((el, i) => { el.style.zIndex = String(i + 1); });
  EP.aplicarOrdem = (cartaz, ordem) => ordem.forEach((el, i) => { el.style.zIndex = String(i + 1); });
  EP.ordenar = (acao, lista) => {
    lista = lista || EP.sel;
    if (!lista.length) return;
    const cartaz = lista[0].closest('.cartaz');
    let ordem = EP.elementos(cartaz);
    const selec = new Set(lista);
    if (acao === 'topo') ordem = ordem.filter(e => !selec.has(e)).concat(ordem.filter(e => selec.has(e)));
    else if (acao === 'fundo') ordem = ordem.filter(e => selec.has(e)).concat(ordem.filter(e => !selec.has(e)));
    else if (acao === 'frente') {
      for (let i = ordem.length - 2; i >= 0; i--) if (selec.has(ordem[i]) && !selec.has(ordem[i + 1])) [ordem[i], ordem[i + 1]] = [ordem[i + 1], ordem[i]];
    } else if (acao === 'tras') {
      for (let i = 1; i < ordem.length; i++) if (selec.has(ordem[i]) && !selec.has(ordem[i - 1])) [ordem[i], ordem[i - 1]] = [ordem[i - 1], ordem[i]];
    }
    EP.aplicarOrdem(cartaz, ordem);
  };

  /* ---------- Seleção ---------- */
  EP.membrosGrupo = el => {
    const g = el.dataset.grupo;
    if (!g) return [el];
    return [...el.closest('.cartaz').querySelectorAll(`.ed[data-grupo="${g}"]`)];
  };
  // Expande grupos (a menos que se peça o item sozinho)
  EP.expandir = lista => {
    const out = [];
    lista.forEach(el => EP.membrosGrupo(el).forEach(m => { if (!out.includes(m)) out.push(m); }));
    return out;
  };
  EP.selecionar = (lista, opc) => {
    opc = opc || {};
    lista = (lista || []).filter(Boolean);
    if (!opc.sozinho) lista = EP.expandir(lista);
    // seleção sempre num cartaz só
    if (lista.length) { const c = lista[0].closest('.cartaz'); lista = lista.filter(e => e.closest('.cartaz') === c); EP.cartazAtivo = c; }
    EP.sel.forEach(e => e.classList.remove('sel'));
    EP.sel = lista;
    EP.sel.forEach(e => e.classList.add('sel'));
    EP.emitir('selecao');
    EP.emitir('mudou');
  };
  EP.unidades = lista => {
    // grupos contam como um bloco (alinhar/distribuir)
    const vistos = new Set(), out = [];
    (lista || EP.sel).forEach(el => {
      const g = el.dataset.grupo;
      if (g) { if (vistos.has(g)) return; vistos.add(g); out.push(EP.membrosGrupo(el).filter(m => (lista || EP.sel).includes(m))); }
      else out.push([el]);
    });
    return out;
  };

  /* ---------- Histórico ---------- */
  // Cada passo guarda a mesa, a seleção e o cartaz em que se trabalhava NAQUELE momento:
  // desfazer/refazer devolvem os três juntos (o inspetor e as próximas inserções seguem o cartaz certo).
  const hist = EP.hist = { desfazer: [], refazer: [] };
  EP.fotografia = () => {
    const c = area.cloneNode(true);
    c.querySelectorAll('.sel').forEach(e => e.classList.remove('sel'));
    c.querySelectorAll('.editando-texto').forEach(e => e.classList.remove('editando-texto'));
    c.querySelectorAll('.pro-ocultos').forEach(e => e.remove()); // barra "Ocultos" é interface (refeita sozinha)
    return c.innerHTML;
  };
  EP.estado = html => ({
    html: html === undefined ? EP.fotografia() : html,
    sel: EP.sel.map(e => e.dataset.uid).filter(Boolean),
    ativo: EP.cartazes().indexOf(EP.cartazAlvo())
  });
  EP.registrar = foto => {
    const f = !foto ? EP.estado() : typeof foto === 'string' ? EP.estado(foto) : foto;
    const topo = hist.desfazer[hist.desfazer.length - 1];
    if (!topo || topo.html !== f.html) { hist.desfazer.push(f); if (hist.desfazer.length > 80) hist.desfazer.shift(); }
    hist.refazer.length = 0;
    EP.emitir('historico');
  };
  EP.restaurar = (de, para) => {
    if (!de.length) return false;
    para.push(EP.estado());
    const alvo = de.pop();
    if (document.activeElement && area.contains(document.activeElement)) document.activeElement.blur();
    area.innerHTML = alvo.html;
    if (typeof ajustarNomes === 'function') ajustarNomes();
    const cartazes = EP.cartazes();
    EP.cartazAtivo = cartazes[Math.min(Math.max(alvo.ativo, 0), cartazes.length - 1)] || null;
    EP.selecionar(alvo.sel.map(u => area.querySelector(`.ed[data-uid="${u}"]`)).filter(Boolean), { sozinho: true });
    // se o que voltou está fora da vista (outro cartaz), rola até ele
    const foco = EP.cartazAlvo();
    if (foco) {
      const r = foco.getBoundingClientRect(), barra = document.querySelector('.barra-pro');
      const topo = barra ? barra.getBoundingClientRect().bottom : 0;
      if (r.bottom < topo + 40 || r.top > window.innerHeight - 40) window.scrollBy(0, r.top - topo - 20);
    }
    EP.emitir('historico');
    return true;
  };
  EP.desfazer = () => EP.restaurar(hist.desfazer, hist.refazer);
  EP.refazer = () => EP.restaurar(hist.refazer, hist.desfazer);

  /* ---------- Criar elementos ---------- */
  EP.cartazAlvo = () => (EP.sel[0] && EP.sel[0].closest('.cartaz')) ||
    (EP.cartazAtivo && area.contains(EP.cartazAtivo) && !EP.cartazOculto(EP.cartazAtivo) ? EP.cartazAtivo : null) ||
    area.querySelector('.cartaz:not(.cartaz-oculto)');
  // Centro da parte visível do cartaz (onde o usuário está olhando)
  EP.centroVisivel = cartaz => {
    const r = cartaz.getBoundingClientRect(), { W, H } = EP.dim(cartaz);
    const painel = document.querySelector('.painel-pro');
    const direita = painel && getComputedStyle(painel).display !== 'none' && window.innerWidth > 900 ? painel.getBoundingClientRect().left : window.innerWidth;
    const topo = (document.querySelector('.barra-pro') || {}).getBoundingClientRect ? document.querySelector('.barra-pro').getBoundingClientRect().bottom : 0;
    const x0 = Math.max(r.left, 0), x1 = Math.min(r.right, direita), y0 = Math.max(r.top, topo), y1 = Math.min(r.bottom, window.innerHeight);
    if (x1 - x0 < 40 || y1 - y0 < 40) return { x: W / 2, y: H * 0.3 };
    return { x: ((x0 + x1) / 2 - r.left) / r.width * W, y: ((y0 + y1) / 2 - r.top) / r.height * H };
  };
  EP.inserir = (el, cartaz, centro) => {
    cartaz = cartaz || EP.cartazAlvo();
    if (!cartaz) { EP.avisoSemCartaz(); return null; }
    el.classList.add('ed', 'livre');
    el.dataset.v = '2';
    el.dataset.uid = EP.novoUid();
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') el.spellcheck = false;
    el.style.zIndex = String(EP.elementos(cartaz).length + 1);
    cartaz.querySelector('.area-util').appendChild(el);
    const c = centro || EP.centroVisivel(cartaz);
    EP.definirCentro(el, c.x, c.y);
    return el;
  };
  EP.criar = (tipo, opc) => {
    opc = opc || {};
    const cartaz = opc.cartaz || EP.cartazAlvo();
    if (!cartaz) { EP.avisoSemCartaz(); return null; }
    EP.registrar();
    const el = document.createElement('div');
    el.className = 'livre-' + tipo;
    if (tipo === 'texto') { el.textContent = opc.texto || 'Novo texto'; el.setAttribute('contenteditable', 'true'); }
    if (tipo === 'faixa') { el.textContent = 'Oferta'; el.setAttribute('contenteditable', 'true'); }
    if (tipo === 'icone') {
      const id = opc.icone || ((typeof iconePadrao !== 'undefined' && iconePadrao !== 'nenhum') ? iconePadrao : 'raio');
      el.style.color = opc.cor || (typeof CORES_ICONE !== 'undefined' && CORES_ICONE[corPadrao]) || '#e6b800';
      el.dataset.icone = id;
      el.innerHTML = typeof svgIcone === 'function' ? svgIcone(id, el.style.color, 'left') : '';
    }
    if (tipo === 'forma') {
      const f = EP.FORMAS[opc.forma] || EP.FORMAS.retangulo;
      el.dataset.forma = opc.forma || 'retangulo';
      el.style.width = f.w + 'cqw'; el.style.height = f.h + 'cqw';
      el.dataset.preench = f.preench || '';
      if (f.borda) el.dataset.borda = f.borda;
      if (f.esp) el.dataset.esp = f.esp;
      if (f.raio) el.dataset.raio = f.raio;
      EP.desenharForma(el);
    }
    if (tipo === 'imagem') {
      const img = document.createElement('img');
      img.src = opc.src; img.alt = '';
      el.appendChild(img);
      el.style.width = (opc.largura || 40) + 'cqw';
    }
    if (tipo === 'faixa') {
      // faixa ocupa a largura toda: centro horizontal no meio
      const c = EP.centroVisivel(cartaz);
      EP.inserir(el, cartaz, { x: EP.dim(cartaz).W / 2, y: opc.centro ? opc.centro.y : c.y });
    } else EP.inserir(el, cartaz, opc.centro);
    if (tipo === 'imagem') {
      const img = el.querySelector('img');
      const recentrar = () => { const g = EP.geo(el); EP.definirCentro(el, opc.centro ? opc.centro.x : g.cx, opc.centro ? opc.centro.y : EP.centroVisivel(cartaz).y); EP.emitir('mudou'); };
      if (!img.complete) img.addEventListener('load', recentrar, { once: true });
    }
    EP.selecionar([el]);
    return el;
  };

  EP.duplicar = (lista, deslocar) => {
    lista = (lista || EP.sel).filter(e => e.classList.contains('livre'));
    if (!lista.length) return [];
    const mapaGrupo = {};
    const clones = lista.map(el => {
      const c = el.cloneNode(true);
      c.classList.remove('sel', 'editando-texto');
      c.dataset.uid = EP.novoUid();
      if (c.dataset.grupo) c.dataset.grupo = mapaGrupo[c.dataset.grupo] || (mapaGrupo[c.dataset.grupo] = 'g' + EP.novoUid());
      el.closest('.area-util').appendChild(c);
      if (deslocar !== false) { const { W } = EP.dim(el.closest('.cartaz')); EP.mover(c, W * 0.03, W * 0.03); }
      return c;
    });
    const cartaz = lista[0].closest('.cartaz');
    const ordem = EP.elementos(cartaz).filter(e => !clones.includes(e)).concat(clones);
    EP.aplicarOrdem(cartaz, ordem);
    return clones;
  };

  EP.excluir = lista => {
    lista = lista || EP.sel;
    if (!lista.length) return;
    const livres = lista.filter(e => e.classList.contains('livre'));
    const fixos = lista.filter(e => !e.classList.contains('livre'));
    livres.forEach(e => e.remove());
    // fixos não somem do cartaz: ficam ocultos (dá para mostrar de novo)
    fixos.forEach(e => e.classList.add('oculto'));
  };

  /* ---------- Grupos ---------- */
  EP.agrupar = () => {
    if (EP.sel.length < 2) return false;
    const g = 'g' + EP.novoUid();
    EP.sel.forEach(e => { e.dataset.grupo = g; });
    // grupo fica junto na ordem das camadas (na posição do item mais alto)
    const cartaz = EP.sel[0].closest('.cartaz'), ordem = EP.elementos(cartaz);
    const topo = Math.max(...EP.sel.map(e => ordem.indexOf(e)));
    const fora = ordem.filter(e => !EP.sel.includes(e));
    const antes = fora.filter(e => ordem.indexOf(e) < topo);
    EP.aplicarOrdem(cartaz, antes.concat(EP.sel.slice().sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b)), fora.filter(e => ordem.indexOf(e) > topo)));
    return true;
  };
  EP.desagrupar = () => {
    const tem = EP.sel.some(e => e.dataset.grupo);
    EP.sel.forEach(e => { delete e.dataset.grupo; });
    return tem;
  };

  /* ---------- Trava ---------- */
  EP.travar = (lista, travar) => {
    lista.forEach(el => {
      if (travar) {
        el.setAttribute('data-trava', '');
        el.querySelectorAll('[contenteditable="true"]').forEach(t => { t.setAttribute('contenteditable', 'false'); t.dataset.ce = '1'; });
        if (el.getAttribute('contenteditable') === 'true') { el.setAttribute('contenteditable', 'false'); el.dataset.ce = '1'; }
      } else {
        el.removeAttribute('data-trava');
        el.querySelectorAll('[data-ce]').forEach(t => { t.setAttribute('contenteditable', 'true'); delete t.dataset.ce; });
        if (el.dataset.ce) { el.setAttribute('contenteditable', 'true'); delete el.dataset.ce; }
      }
    });
  };

  /* ---------- Alinhar e distribuir ---------- */
  EP.alinhar = (modo, aoCartaz) => {
    const unidades = EP.unidades();
    if (!unidades.length) return;
    const cartaz = EP.sel[0].closest('.cartaz'), { W, H } = EP.dim(cartaz);
    const ref = (aoCartaz || unidades.length < 2) ? { x0: 0, y0: 0, x1: W, y1: H } : EP.uniao(EP.sel);
    unidades.forEach(u => {
      const b = EP.uniao(u);
      let dx = 0, dy = 0;
      if (modo === 'esq') dx = ref.x0 - b.x0;
      if (modo === 'centro') dx = (ref.x0 + ref.x1) / 2 - (b.x0 + b.x1) / 2;
      if (modo === 'dir') dx = ref.x1 - b.x1;
      if (modo === 'topo') dy = ref.y0 - b.y0;
      if (modo === 'meio') dy = (ref.y0 + ref.y1) / 2 - (b.y0 + b.y1) / 2;
      if (modo === 'base') dy = ref.y1 - b.y1;
      u.forEach(el => EP.mover(el, dx, dy));
    });
  };
  EP.distribuir = eixo => {
    const unidades = EP.unidades().map(u => ({ u, b: EP.uniao(u) }));
    if (unidades.length < 3) return false;
    const [a0, a1] = eixo === 'h' ? ['x0', 'x1'] : ['y0', 'y1'];
    unidades.sort((p, q) => (p.b[a0] + p.b[a1]) - (q.b[a0] + q.b[a1]));
    const ini = unidades[0].b[a0], fim = unidades[unidades.length - 1].b[a1];
    const total = unidades.reduce((s, o) => s + (o.b[a1] - o.b[a0]), 0);
    const vao = (fim - ini - total) / (unidades.length - 1);
    let pos = ini;
    unidades.forEach(o => {
      const d = pos - o.b[a0];
      o.u.forEach(el => EP.mover(el, eixo === 'h' ? d : 0, eixo === 'h' ? 0 : d));
      pos += (o.b[a1] - o.b[a0]) + vao;
    });
    return true;
  };

  /* ---------- Cores do documento e recentes ---------- */
  EP.paraHex = c => {
    if (!c) return '';
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(c)) return ('#' + c.slice(1).split('').map(x => x + x).join('')).toLowerCase();
    const m = String(c).match(/[\d.]+/g);
    if (!m || m.length < 3) return '';
    if (m.length >= 4 && +m[3] === 0) return '';
    return '#' + m.slice(0, 3).map(n => Math.round(+n).toString(16).padStart(2, '0')).join('');
  };
  EP.coresDoc = cartaz => {
    if (!cartaz) return [];
    const cores = new Map();
    const add = c => { const h = EP.paraHex(c); if (h) cores.set(h, (cores.get(h) || 0) + 1); };
    add(getComputedStyle(cartaz).backgroundColor);
    cartaz.querySelectorAll('.ed, .ed *').forEach(n => {
      if (n.closest('.oculto')) return;
      const cs = getComputedStyle(n);
      if (n.childNodes.length && [...n.childNodes].some(t => t.nodeType === 3 && t.textContent.trim())) add(cs.color);
      if (cs.backgroundColor) add(cs.backgroundColor);
      if (parseFloat(cs.borderTopWidth) > 0) add(cs.borderTopColor);
      if (n.getAttribute && n.getAttribute('fill') && n.getAttribute('fill') !== 'none' && n.getAttribute('fill') !== 'currentColor') add(n.getAttribute('fill'));
      if (n.getAttribute && n.getAttribute('stroke') && n.getAttribute('stroke') !== 'currentColor') add(n.getAttribute('stroke'));
      if (n.tagName === 'svg' && n.closest('.livre-icone, .col-thunder')) add(cs.color);
    });
    return [...cores.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 16);
  };
  const CHAVE_RECENTES = 'cartaz-pro-cores-recentes';
  EP.recentes = () => { try { return JSON.parse(localStorage.getItem(CHAVE_RECENTES) || '[]'); } catch (e) { return []; } };
  EP.usarCor = c => {
    const h = EP.paraHex(c); if (!h) return;
    const l = [h].concat(EP.recentes().filter(x => x !== h)).slice(0, 8);
    try { localStorage.setItem(CHAVE_RECENTES, JSON.stringify(l)); } catch (e) {}
  };

  /* ---------- Layout: aplicar em todos / modelo ---------- */
  const CHAVE_MODELO = EP.CHAVE_MODELO = 'cartaz-modelo-pro';
  const ignorarFilho = n => n.closest('.col-thunder');
  EP.extrairLayout = cartaz => {
    const papeis = {};
    cartaz.querySelectorAll('[data-papel]').forEach(el => {
      const filhos = [];
      [...el.querySelectorAll('*')].forEach((n, i) => {
        if (ignorarFilho(n)) return;
        const st = n.getAttribute('style'), cl = n.classList.contains('pro-sub');
        if (st || cl || n.dataset.efx) filhos.push([i, st || '', n.dataset.efx || '', cl ? 1 : 0]);
      });
      papeis[el.dataset.papel] = {
        estilo: el.getAttribute('style') || '', oculto: el.classList.contains('oculto'), filhos,
        nome: el.dataset.nome || '', trava: EP.travado(el), grupo: el.dataset.grupo || '', efx: el.dataset.efx || '', sub: el.classList.contains('pro-sub')
      };
    });
    const livres = [...cartaz.querySelectorAll('.livre')].map(el => {
      const c = el.cloneNode(true); c.classList.remove('sel', 'editando-texto'); return c.outerHTML;
    });
    // versão 3: caixas de preço separadas em moldura / rótulo / valor
    return { versao: 3, fundo: cartaz.style.background || '', papeis, livres };
  };
  EP.aplicarLayout = (cartaz, layout) => {
    EP.preparar(cartaz);
    // Modelo salvo antes da separação: "de"/"por" eram a caixa inteira. Volta a caixa ao formato
    // antigo, aplica e separa de novo (o preparar do fim converte posição, giro e escala exatos
    // para as 3 partes, medindo neste cartaz e neste formato).
    const antigo = !(layout.versao >= 3) && layout.papeis && (layout.papeis.de || layout.papeis.por);
    if (antigo) EP.juntarCaixas(cartaz);
    if (layout.fundo !== undefined) cartaz.style.background = layout.fundo;
    Object.entries(layout.papeis || {}).forEach(([papel, d]) => {
      const el = cartaz.querySelector(`[data-papel="${papel}"]`);
      if (!el) return;
      const uid = el.dataset.uid;
      el.setAttribute('style', d.estilo || '');
      el.classList.toggle('oculto', !!d.oculto);
      if (d.filhos) {
        el.classList.toggle('pro-sub', !!d.sub);
        if (d.efx) el.dataset.efx = d.efx; else delete el.dataset.efx;
        const todos = [...el.querySelectorAll('*')];
        todos.forEach(n => { if (!ignorarFilho(n)) { n.removeAttribute('style'); n.classList.remove('pro-sub'); delete n.dataset.efx; } });
        d.filhos.forEach(([i, st, efx, sub]) => {
          const n = todos[i]; if (!n || ignorarFilho(n)) return;
          if (st) n.setAttribute('style', st);
          if (efx) n.dataset.efx = efx;
          if (sub) n.classList.add('pro-sub');
        });
        if (d.nome) el.dataset.nome = d.nome; else delete el.dataset.nome;
        if (d.grupo) el.dataset.grupo = d.grupo; else delete el.dataset.grupo;
        EP.travar([el], !!d.trava);
      } else if (d.alvo) {
        // modelo salvo pela versão anterior
        const alvo = el.classList.contains('box-price') ? el.querySelector('.value-price') : EP.alvoTexto(el);
        if (alvo && alvo !== el) { const tmp = document.createElement('div'); tmp.setAttribute('style', d.alvo); ['color', 'fontFamily', 'fontWeight'].forEach(k => { alvo.style[k] = tmp.style[k]; }); }
      }
      if (uid) el.dataset.uid = uid;
    });
    cartaz.querySelectorAll('.livre').forEach(l => l.remove());
    const util = cartaz.querySelector('.area-util');
    (layout.livres || []).forEach(h => {
      util.insertAdjacentHTML('beforeend', h);
      const el = util.lastElementChild;
      if (el) delete el.dataset.uid; // ganha id próprio neste cartaz
    });
    EP.preparar(cartaz);
    // O estilo copiado traz o tamanho que o cartaz.html calculou para o nome DAQUELE produto:
    // recalcula para o nome deste (senão nome comprido sai cortado e nome curto sai miúdo)
    const nome = cartaz.querySelector('.produto-nome');
    if (nome && typeof ajustarNome === 'function') ajustarNome(nome);
  };
  EP.lerModelo = () => { try { return JSON.parse(localStorage.getItem(CHAVE_MODELO) || 'null'); } catch (e) { return null; } };

  /* ---------- Folha em branco (sem modelo pronto) ---------- */
  EP.novaFolha = () => {
    EP.registrar();
    if (typeof modoEditavel !== 'undefined' && !modoEditavel) {
      // liga o modo editável sem criar o cartaz de exemplo
      modoEditavel = true; document.body.classList.add('modo-editavel');
    }
    const f = typeof formatoAtual !== 'undefined' ? formatoAtual : 'a3';
    const c = document.createElement('article');
    c.className = 'cartaz ' + f;
    c.dataset.branco = '1';
    c.innerHTML = '<div class="area-util"></div>';
    area.appendChild(c);
    EP.preparar(c);
    c.dataset.pro = '1';
    EP.selecionar([]);
    EP.cartazAtivo = c;
    EP.emitir('mudou');
    c.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return c;
  };

  /* ---------- Projeto em arquivo (.json) ---------- */
  function limparHtml(raiz) {
    raiz.querySelectorAll('script, iframe, object, embed, link, meta, style, form, input, textarea, button').forEach(n => n.remove());
    raiz.querySelectorAll('*').forEach(n => {
      [...n.attributes].forEach(a => {
        const nome = a.name.toLowerCase();
        if (nome.startsWith('on')) n.removeAttribute(a.name);
        if ((nome === 'src' || nome === 'href' || nome === 'xlink:href') && !/^(data:image\/|#)/i.test(a.value.trim())) n.removeAttribute(a.name);
      });
    });
  }
  EP.salvarProjeto = () => {
    const cartazes = EP.cartazes();
    if (!cartazes.length) { alert('Gere ou crie um cartaz primeiro.'); return false; }
    const html = cartazes.map(c => {
      const k = c.cloneNode(true);
      k.querySelectorAll('.sel, .editando-texto').forEach(e => e.classList.remove('sel', 'editando-texto'));
      return k.outerHTML;
    });
    const dados = { tipo: 'cartaz-pro', versao: 1, salvoEm: new Date().toISOString(),
      formato: typeof formatoAtual !== 'undefined' ? formatoAtual : 'a3',
      icone: typeof iconePadrao !== 'undefined' ? iconePadrao : 'raio', cor: typeof corPadrao !== 'undefined' ? corPadrao : 'amarelo', cartazes: html };
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date(), dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    a.href = URL.createObjectURL(blob);
    a.download = `Cartazes_${dia}.cartaz.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  };
  EP.abrirProjetoTexto = texto => {
    let dados;
    try { dados = JSON.parse(texto); } catch (e) { throw new Error('O arquivo não é um projeto de cartaz válido.'); }
    if (!dados || dados.tipo !== 'cartaz-pro' || !Array.isArray(dados.cartazes)) throw new Error('O arquivo não é um projeto de cartaz (.cartaz.json).');
    const tmp = document.createElement('div');
    tmp.innerHTML = dados.cartazes.join('');
    limparHtml(tmp);
    const cartazes = [...tmp.children].filter(n => n.classList.contains('cartaz'));
    if (!cartazes.length) throw new Error('O projeto não tem cartazes.');
    EP.registrar();
    if (typeof modoEditavel !== 'undefined' && !modoEditavel) document.getElementById('modelo').click();
    area.innerHTML = '';
    // já vêm prontos do projeto: o modelo salvo não deve ser aplicado por cima
    cartazes.forEach(c => { c.dataset.pro = '1'; area.appendChild(c); });
    const f = dados.formato === 'a5' ? 'a5' : 'a3';
    const botao = document.querySelector(`.segmento [data-formato="${f}"]`);
    if (botao) botao.click();
    EP.prepararTodos();
    if (typeof ajustarNomes === 'function') ajustarNomes();
    EP.selecionar([]);
    EP.cartazAtivo = area.querySelector('.cartaz');
    return cartazes.length;
  };
})();
