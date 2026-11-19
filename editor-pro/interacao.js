/* Editor profissional — interação: caixa de seleção com alças, arrastar/redimensionar/girar, laço,
   guias inteligentes com distâncias, régua, grade, zoom da mesa, teclado, área de transferência,
   arrastar imagens do computador e menu de contexto. Tudo que desenha aqui fica FORA do cartaz. */
(function () {
  const EP = window.EP, ui = EP.ui, area = EP.area;

  /* ---------- Camada de interface (no body, coordenadas da página) ---------- */
  const camada = document.createElement('div');
  camada.className = 'pro-camada-ui';
  camada.setAttribute('aria-hidden', 'true');
  const sub = () => { const d = document.createElement('div'); camada.appendChild(d); return d; };
  const lGrade = sub(), lRegua = sub(), lAtivo = sub(), lItens = sub(), lSel = sub(), lGuias = sub(), lMedida = sub(), lLaco = sub();
  document.body.appendChild(camada);
  const estiloCamada = document.createElement('style');
  estiloCamada.textContent = '.pro-camada-ui > div > * { position: absolute; }';
  document.head.appendChild(estiloCamada);

  const quadro = cartaz => {
    const r = cartaz.getBoundingClientRect(), { W, H } = EP.dim(cartaz);
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, k: r.width / W, W, H, r };
  };
  // ponto do cartaz (unidades) a partir do ponteiro
  const pontoCartaz = (cartaz, cx, cy) => { const r = cartaz.getBoundingClientRect(), { W } = EP.dim(cartaz), k = r.width / W; return { x: (cx - r.left) / k, y: (cy - r.top) / k }; };
  const rot = (x, y, graus) => { const a = graus * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return { x: x * c - y * s, y: x * s + y * c }; };
  const norm = r => { r = ((r % 360) + 360) % 360; return r > 180 ? r - 360 : r; };
  const r1 = v => (Math.round(v * 10) / 10).toLocaleString('pt-BR');

  let regua = false, grade = false;
  try { regua = localStorage.getItem('cartaz-pro-regua') === '1'; grade = localStorage.getItem('cartaz-pro-grade') === '1'; } catch (e) {}

  /* ---------- Desenho ---------- */
  let pedido = 0;
  const agendar = EP.agendar = () => { if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; desenhar(); }); };
  const DIRS = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
  const ANG = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 };
  const CURSORES = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
  const cursor = (al, r) => CURSORES[Math.round((((ANG[al] + r) % 180) + 180) % 180 / 45) % 4];
  const ICO_GIRAR = '<svg viewBox="0 0 20 20"><path d="M15.5 9.5a5.5 5.5 0 1 1-1.8-4.1"/><path d="M15.5 3.5v3h-3"/></svg>';

  function caixaDiv(q, cx, cy, w, h, r, cls) {
    const d = document.createElement('div');
    d.className = 'pro-cx' + (cls ? ' ' + cls : '');
    d.style.cssText = `left:${q.x + cx * q.k - w * q.k / 2}px;top:${q.y + cy * q.k - h * q.k / 2}px;width:${w * q.k}px;height:${h * q.k}px;transform:rotate(${r}deg)`;
    return d;
  }
  function desenhar() {
    lSel.innerHTML = ''; lItens.innerHTML = ''; lAtivo.innerHTML = ''; lRegua.innerHTML = ''; lGrade.innerHTML = '';
    if (!EP.ativo) return;
    const vivos = EP.sel.filter(e => e.isConnected);
    if (vivos.length !== EP.sel.length) { EP.selecionar(vivos, { sozinho: true }); return; }
    const cartazes = EP.cartazes();
    // Cartaz ativo (quando há mais de um e nada selecionado)
    if (!vivos.length && EP.cartazAtivo && EP.cartazAtivo.isConnected && cartazes.length > 1) {
      const q = quadro(EP.cartazAtivo);
      const d = document.createElement('div'); d.className = 'pro-cartaz-ativo';
      d.style.cssText = `left:${q.x}px;top:${q.y}px;width:${q.W * q.k}px;height:${q.H * q.k}px`;
      lAtivo.appendChild(d);
    }
    if (grade) cartazes.forEach(c => desenharGrade(c));
    if (regua) cartazes.forEach(c => desenharRegua(c, vivos.length && vivos[0].closest('.cartaz') === c ? EP.uniao(vivos) : null));
    if (!vivos.length) return;
    const c = vivos[0].closest('.cartaz'), q = quadro(c);
    const trav = vivos.every(EP.travado);
    const um = vivos.length === 1;
    let quadroSel;
    if (um) {
      const g = EP.geo(vivos[0]);
      quadroSel = { cx: g.cx, cy: g.cy, w: g.w, h: g.h, r: g.r };
    } else {
      vivos.forEach(el => { const g = EP.geo(el); lItens.appendChild(caixaDiv(q, g.cx, g.cy, g.w, g.h, g.r, 'fino')); });
      const u = EP.uniao(vivos);
      quadroSel = { cx: (u.x0 + u.x1) / 2, cy: (u.y0 + u.y1) / 2, w: u.x1 - u.x0, h: u.y1 - u.y0, r: 0 };
    }
    const grupo = !um && vivos.every(e => e.dataset.grupo && e.dataset.grupo === vivos[0].dataset.grupo);
    const box = caixaDiv(q, quadroSel.cx, quadroSel.cy, quadroSel.w, quadroSel.h, quadroSel.r, (um ? '' : 'multi') + (trav ? ' travado' : '') + (grupo ? ' grupo' : ''));
    lSel.appendChild(box);
    if (!um) {
      const ar = document.createElement('div'); ar.className = 'pro-cx-arrasto'; box.appendChild(ar);
    }
    if (trav || arrasto) return;
    const pw = quadroSel.w * q.k, ph = quadroSel.h * q.k;
    const lados = um && EP.tipo(vivos[0]) === 'forma';
    const alcas = ['nw', 'ne', 'se', 'sw'];
    if (lados) {
      if (vivos[0].dataset.forma === 'linha') alcas.push('e', 'w');
      else { if (pw > 36) alcas.push('n', 's'); if (ph > 36) alcas.push('e', 'w'); }
    }
    alcas.forEach(al => {
      const [dx, dy] = DIRS[al];
      if (vivos[0].dataset.forma === 'linha' && um && al.length === 2) return; // linha: só pelas pontas
      const h = document.createElement('div');
      h.className = 'pro-al' + (al.length === 1 ? ' lado ' + (dy ? 'h' : 'v') : '');
      h.dataset.al = al;
      h.style.left = (dx + 1) * 50 + '%'; h.style.top = (dy + 1) * 50 + '%';
      h.style.cursor = cursor(al, quadroSel.r);
      box.appendChild(h);
    });
    const g = document.createElement('div');
    g.className = 'pro-al girar'; g.dataset.al = 'girar'; g.title = 'Girar (Shift: de 15 em 15°)';
    g.style.left = '50%'; g.style.top = `calc(100% + ${ph < 30 ? 20 : 26}px)`;
    g.innerHTML = ICO_GIRAR;
    box.appendChild(g);
  }

  function desenharGrade(c) {
    const q = quadro(c), mm = EP.mmPorUn(c), passo = 10 / mm * q.k, forte = 50 / mm * q.k;
    const d = document.createElement('div'); d.className = 'pro-grade';
    d.style.cssText = `left:${q.x}px;top:${q.y}px;width:${q.W * q.k}px;height:${q.H * q.k}px;` +
      `background-image:linear-gradient(to right, rgba(29,99,237,.32) 1px, transparent 1px), linear-gradient(to bottom, rgba(29,99,237,.32) 1px, transparent 1px),` +
      `linear-gradient(to right, rgba(29,99,237,.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(29,99,237,.14) 1px, transparent 1px);` +
      `background-size:${forte}px ${forte}px, ${forte}px ${forte}px, ${passo}px ${passo}px, ${passo}px ${passo}px`;
    lGrade.appendChild(d);
    // linhas do centro
    ['v', 'h'].forEach(e => {
      const l = document.createElement('div'); l.className = 'pro-guia ' + e;
      l.style.cssText = e === 'v' ? `left:${q.x + q.W * q.k / 2}px;top:${q.y}px;height:${q.H * q.k}px;opacity:.35` : `left:${q.x}px;top:${q.y + q.H * q.k / 2}px;width:${q.W * q.k}px;opacity:.35`;
      lGrade.appendChild(l);
    });
  }
  function desenharRegua(c, destaque) {
    const q = quadro(c), mm = EP.mmPorUn(c), ppm = q.k / mm, t = 18, dpr = window.devicePixelRatio || 1;
    const passoMenor = ppm >= 4 ? 1 : ppm * 5 >= 4 ? 5 : 10;
    const passoRot = ppm * 10 >= 30 ? 10 : ppm * 50 >= 30 ? 50 : 100;
    [true, false].forEach(horiz => {
      const len = horiz ? q.W * q.k : q.H * q.k, totalMm = (horiz ? q.W : q.H) * mm;
      const cv = document.createElement('canvas');
      cv.className = 'pro-regua';
      cv.width = Math.round((horiz ? len : t) * dpr); cv.height = Math.round((horiz ? t : len) * dpr);
      cv.style.cssText = horiz ? `left:${q.x}px;top:${q.y - t - 6}px;width:${len}px;height:${t}px` : `left:${q.x - t - 6}px;top:${q.y}px;width:${t}px;height:${len}px`;
      const g = cv.getContext('2d');
      g.scale(dpr, dpr);
      if (!horiz) { g.translate(t, 0); g.rotate(Math.PI / 2); }
      g.fillStyle = '#fbfcfa'; g.fillRect(0, 0, len, t);
      if (destaque) {
        const a = (horiz ? destaque.x0 : destaque.y0) * q.k, b = (horiz ? destaque.x1 : destaque.y1) * q.k;
        g.fillStyle = 'rgba(29,99,237,.16)'; g.fillRect(a, 0, b - a, t);
      }
      g.fillStyle = '#7d838a'; g.font = '600 9px Archivo, system-ui, sans-serif'; g.textBaseline = 'top';
      for (let m = 0; m <= totalMm + 0.01; m += passoMenor) {
        const x = Math.round(m * ppm) + 0.5, rotulo = m % passoRot === 0, medio = m % 10 === 0;
        const alt = rotulo ? t : medio ? t * 0.5 : m % 5 === 0 ? t * 0.35 : t * 0.22;
        g.fillRect(x - 0.5, horiz ? t - alt : t - alt, 1, alt);
        if (rotulo && m > 0 && m < totalMm - 4) g.fillText(String(m), x + 3, 2);
      }
      lRegua.appendChild(cv);
    });
  }

  /* ---------- Guias inteligentes ---------- */
  function linhasAlvo(cartaz, excluir) {
    const { W, H } = EP.dim(cartaz);
    const v = [{ p: 0, a: 0, b: H, borda: 1 }, { p: W / 2, a: 0, b: H, centro: 1 }, { p: W, a: 0, b: H, borda: 1 }];
    const h = [{ p: 0, a: 0, b: W, borda: 1 }, { p: H / 2, a: 0, b: W, centro: 1 }, { p: H, a: 0, b: W, borda: 1 }];
    const caixas = [];
    cartaz.querySelectorAll('.ed').forEach(el => {
      if (excluir.includes(el) || EP.oculto(el)) return;
      const g = EP.geo(el);
      caixas.push(g);
      [g.x0, (g.x0 + g.x1) / 2, g.x1].forEach(p => v.push({ p, a: g.y0, b: g.y1 }));
      [g.y0, (g.y0 + g.y1) / 2, g.y1].forEach(p => h.push({ p, a: g.x0, b: g.x1 }));
    });
    return { v, h, caixas, W, H };
  }
  function encaixar(cx, alvos, tol) {
    // cx: caixa já deslocada; retorna correção e guias
    const xs = [cx.x0, (cx.x0 + cx.x1) / 2, cx.x1], ys = [cx.y0, (cx.y0 + cx.y1) / 2, cx.y1];
    let bx = null, by = null;
    alvos.v.forEach(t => xs.forEach(x => { const d = t.p - x; if (Math.abs(d) <= tol && (bx === null || Math.abs(d) < Math.abs(bx))) bx = d; }));
    alvos.h.forEach(t => ys.forEach(y => { const d = t.p - y; if (Math.abs(d) <= tol && (by === null || Math.abs(d) < Math.abs(by))) by = d; }));
    return { dx: bx || 0, dy: by || 0 };
  }
  function guiasAtivas(cx, alvos) {
    const out = [], e = 0.6;
    const xs = [cx.x0, (cx.x0 + cx.x1) / 2, cx.x1], ys = [cx.y0, (cx.y0 + cx.y1) / 2, cx.y1];
    alvos.v.forEach(t => { if (xs.some(x => Math.abs(t.p - x) < e)) out.push({ e: 'v', p: t.p, a: Math.min(t.a, cx.y0), b: Math.max(t.b, cx.y1) }); });
    alvos.h.forEach(t => { if (ys.some(y => Math.abs(t.p - y) < e)) out.push({ e: 'h', p: t.p, a: Math.min(t.a, cx.x0), b: Math.max(t.b, cx.x1) }); });
    return out;
  }
  function distancias(cx, alvos) {
    // menor distância livre em cada direção (até outro elemento que se sobrepõe na outra direção, ou até a borda)
    const out = [];
    const sobreV = g => g.y0 < cx.y1 && g.y1 > cx.y0, sobreH = g => g.x0 < cx.x1 && g.x1 > cx.x0;
    const meioY = (cx.y0 + cx.y1) / 2, meioX = (cx.x0 + cx.x1) / 2;
    let esq = { d: cx.x0, de: 0 }, dir = { d: alvos.W - cx.x1, ate: alvos.W }, cima = { d: cx.y0, de: 0 }, baixo = { d: alvos.H - cx.y1, ate: alvos.H };
    alvos.caixas.forEach(g => {
      if (sobreV(g)) {
        if (g.x1 <= cx.x0 && cx.x0 - g.x1 < esq.d) esq = { d: cx.x0 - g.x1, de: g.x1 };
        if (g.x0 >= cx.x1 && g.x0 - cx.x1 < dir.d) dir = { d: g.x0 - cx.x1, ate: g.x0 };
      }
      if (sobreH(g)) {
        if (g.y1 <= cx.y0 && cx.y0 - g.y1 < cima.d) cima = { d: cx.y0 - g.y1, de: g.y1 };
        if (g.y0 >= cx.y1 && g.y0 - cx.y1 < baixo.d) baixo = { d: g.y0 - cx.y1, ate: g.y0 };
      }
    });
    if (esq.d > 0.5) out.push({ e: 'h', a: esq.de, b: cx.x0, p: meioY, d: esq.d });
    if (dir.d > 0.5) out.push({ e: 'h', a: cx.x1, b: dir.ate, p: meioY, d: dir.d });
    if (cima.d > 0.5) out.push({ e: 'v', a: cima.de, b: cx.y0, p: meioX, d: cima.d });
    if (baixo.d > 0.5) out.push({ e: 'v', a: cx.y1, b: baixo.ate, p: meioX, d: baixo.d });
    return out;
  }
  function desenharGuias(cartaz, guias, dists) {
    lGuias.innerHTML = '';
    const q = quadro(cartaz), mm = EP.mmPorUn(cartaz);
    guias.forEach(g => {
      const d = document.createElement('div'); d.className = 'pro-guia ' + g.e;
      d.style.cssText = g.e === 'v' ? `left:${q.x + g.p * q.k}px;top:${q.y + g.a * q.k}px;height:${(g.b - g.a) * q.k}px` : `left:${q.x + g.a * q.k}px;top:${q.y + g.p * q.k}px;width:${(g.b - g.a) * q.k}px`;
      lGuias.appendChild(d);
    });
    (dists || []).forEach(g => {
      const comp = (g.b - g.a) * q.k;
      if (comp < 18) return;
      const d = document.createElement('div'); d.className = 'pro-dist ' + g.e;
      d.style.cssText = g.e === 'h' ? `left:${q.x + g.a * q.k}px;top:${q.y + g.p * q.k}px;width:${comp}px` : `left:${q.x + g.p * q.k}px;top:${q.y + g.a * q.k}px;height:${comp}px`;
      d.innerHTML = `<b>${r1(g.d * mm)} mm</b>`;
      lGuias.appendChild(d);
    });
  }
  function medida(cartaz, texto, cx, y) {
    lMedida.innerHTML = '';
    if (!texto) return;
    const q = quadro(cartaz);
    const d = document.createElement('div'); d.className = 'pro-medida';
    d.textContent = texto;
    d.style.left = (q.x + cx * q.k) + 'px'; d.style.top = (q.y + y * q.k + 12) + 'px';
    lMedida.appendChild(d);
  }

  /* ---------- Ponteiro ---------- */
  let arrasto = null;          // estado do gesto em andamento
  let suprimirClique = false;  // depois de arrastar (ou do clique que só seleciona) o clique não edita nem abre galeria
  let bloquearMouse = false;   // impede o foco/caret no primeiro clique (selecionar antes de editar, como no Canva)

  function pressionar(e, el, cartaz) {
    ui.fecharContexto();
    suprimirClique = false; bloquearMouse = false;
    // o foco sai dos botões/campos da interface: atalhos do teclado passam a valer para a mesa
    const foco = document.activeElement;
    if (foco && foco !== document.body && !area.contains(foco)) foco.blur();
    if (el) {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && el.contains(ae)) return; // editando texto: arrastar seleciona letras
      let permitir = false, sozinho = null;
      if (e.shiftKey) {
        const membros = EP.membrosGrupo(el);
        let nova;
        if (EP.sel.length && EP.sel[0].closest('.cartaz') !== el.closest('.cartaz')) nova = membros;
        else nova = EP.sel.includes(el) ? EP.sel.filter(x => !membros.includes(x)) : EP.sel.concat(membros.filter(m => !EP.sel.includes(m)));
        EP.selecionar(nova, { sozinho: true });
        if (!nova.includes(el)) { e.preventDefault(); bloquearMouse = true; suprimirClique = true; return; }
      } else if (!EP.sel.includes(el)) {
        EP.selecionar([el]);
      } else {
        const grupoSel = el.dataset.grupo && EP.sel.length > 1 && EP.sel.every(x => x.dataset.grupo === el.dataset.grupo);
        if (grupoSel) sozinho = el;
        else if (EP.sel.length === 1) permitir = true;
      }
      // Nunca dá foco no pointerdown: assim dá para arrastar um texto já selecionado.
      // Clique sem arrastar num texto já selecionado entra na edição (ao soltar), como no Canva.
      e.preventDefault(); bloquearMouse = true;
      suprimirClique = !permitir || EP.travado(el);
      if (EP.travado(el)) return;
      const editar = permitir ? (e.target.closest('[contenteditable="true"]') || null) : null;
      arrasto = { modo: 'mover?', id: e.pointerId, x: e.clientX, y: e.clientY, alt: e.altKey, sozinho, editar, cartaz: el.closest('.cartaz') };
    } else {
      if (cartaz) EP.cartazAtivo = cartaz;
      const ae = document.activeElement;
      if (ae && area.contains(ae)) ae.blur();
      if (!e.shiftKey) EP.selecionar([]); else EP.emitir('mudou');
      if (e.pointerType !== 'touch') {
        e.preventDefault();
        arrasto = { modo: 'laco?', id: e.pointerId, x: e.clientX, y: e.clientY, cartaz, base: e.shiftKey ? EP.sel.slice() : [] };
      }
    }
  }
  area.addEventListener('pointerdown', e => {
    if (!EP.ativo || e.button !== 0) return;
    if (!e.target.closest('.cartaz') && !e.target.closest('#preview-area')) return;
    pressionar(e, e.target.closest('.ed'), e.target.closest('.cartaz'));
  });
  // A mesa fora dos cartazes também começa o laço
  document.querySelector('.mesa').addEventListener('pointerdown', e => {
    if (!EP.ativo || e.button !== 0 || area.contains(e.target) || e.target.closest('.barra, .barra-pro, .vazio, button, input, select, textarea')) return;
    pressionar(e, null, null);
  });
  area.addEventListener('mousedown', e => { if (EP.ativo && bloquearMouse) e.preventDefault(); }, true);
  area.addEventListener('click', e => {
    if (!EP.ativo) return;
    if (suprimirClique) { e.stopPropagation(); e.preventDefault(); suprimirClique = false; }
  }, true);

  // Alças e caixa de seleção múltipla
  camada.addEventListener('pointerdown', e => {
    if (!EP.ativo || e.button !== 0) return;
    const al = e.target.closest('.pro-al');
    if (al) { e.preventDefault(); e.stopPropagation(); iniciarAlca(e, al.dataset.al); return; }
    if (e.target.closest('.pro-cx-arrasto')) {
      e.preventDefault();
      // clique dentro da caixa: acha o elemento embaixo (para Shift+clique e para entrar no grupo)
      const embaixo = elementoEmbaixo(e.clientX, e.clientY);
      if (embaixo && (e.shiftKey || (EP.sel.includes(embaixo) && embaixo.dataset.grupo))) { pressionar(e, embaixo, embaixo.closest('.cartaz')); return; }
      if (embaixo && !EP.sel.includes(embaixo)) { pressionar(e, embaixo, embaixo.closest('.cartaz')); return; }
      if (EP.sel.every(EP.travado)) return;
      arrasto = { modo: 'mover?', id: e.pointerId, x: e.clientX, y: e.clientY, alt: e.altKey, cartaz: EP.sel[0].closest('.cartaz') };
      suprimirClique = true;
    }
  });
  camada.addEventListener('contextmenu', e => { if (EP.ativo) { e.preventDefault(); ui.abrirContexto(e.clientX, e.clientY); } });
  function elementoEmbaixo(x, y) {
    const pilha = document.elementsFromPoint(x, y);
    for (const n of pilha) { if (camada.contains(n)) continue; const el = n.closest && n.closest('.ed'); if (el && area.contains(el)) return el; if (n.classList && n.classList.contains('cartaz')) return null; }
    return null;
  }

  function quadroSelecao() {
    const vivos = EP.sel;
    if (vivos.length === 1) { const g = EP.geo(vivos[0]); return { cx: g.cx, cy: g.cy, w: g.w, h: g.h, r: g.r }; }
    const u = EP.uniao(vivos);
    return { cx: (u.x0 + u.x1) / 2, cy: (u.y0 + u.y1) / 2, w: u.x1 - u.x0, h: u.y1 - u.y0, r: 0 };
  }
  function iniciarAlca(e, al) {
    const lista = EP.sel.filter(x => !EP.travado(x));
    if (!lista.length) return;
    const cartaz = lista[0].closest('.cartaz');
    EP.registrar();
    const f = quadroSelecao();
    const itens = lista.map(el => ({ el, m: EP.medida(el), g: EP.geo(el) }));
    document.body.classList.add('pro-arrastando');
    if (al === 'girar') {
      const p = pontoCartaz(cartaz, e.clientX, e.clientY);
      arrasto = { modo: 'girar', id: e.pointerId, cartaz, f, itens, a0: Math.atan2(p.y - f.cy, p.x - f.cx) };
      document.body.classList.add('pro-cursor-girar');
    } else {
      arrasto = { modo: al.length === 1 ? 'lado' : 'escala', al, id: e.pointerId, cartaz, f, itens };
      document.body.style.cursor = cursor(al, f.r);
    }
    agendar();
  }

  window.addEventListener('pointermove', e => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const a = arrasto;
    if (a.modo === 'mover?' || a.modo === 'laco?') {
      if (Math.hypot(e.clientX - a.x, e.clientY - a.y) < 4) return;
      if (a.modo === 'mover?') iniciarMover(); else a.modo = 'laco';
    }
    if (a.modo === 'mover') moverPara(e);
    else if (a.modo === 'laco') laco(e);
    else if (a.modo === 'escala' || a.modo === 'lado') escalar(e);
    else if (a.modo === 'girar') girar(e);
  });
  function fimArrasto(e) {
    if (!arrasto || (e && e.pointerId !== arrasto.id)) return;
    const a = arrasto;
    arrasto = null;
    document.body.classList.remove('pro-arrastando', 'pro-cursor-girar');
    document.body.style.cursor = '';
    lGuias.innerHTML = ''; lMedida.innerHTML = ''; lLaco.innerHTML = '';
    if (a.modo === 'mover?' && a.sozinho) EP.selecionar([a.sozinho], { sozinho: true });
    if (a.modo === 'mover?' && a.editar && a.editar.isConnected) {
      a.editar.focus();
      // o cartaz.html seleciona o texto todo no foco e confirma no mouseup
      a.editar.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    }
    if (['mover', 'escala', 'lado', 'girar'].includes(a.modo)) { suprimirClique = true; if (typeof ajustarNomes === 'function' && a.modo !== 'mover') ajustarNomes(); EP.emitir('mudou'); }
    if (a.modo === 'laco') EP.emitir('mudou');
    agendar();
  }
  window.addEventListener('pointerup', fimArrasto);
  window.addEventListener('pointercancel', fimArrasto);

  function iniciarMover() {
    const a = arrasto;
    EP.registrar();
    const ae = document.activeElement;
    if (ae && ae.isContentEditable && area.contains(ae)) ae.blur();
    window.getSelection().removeAllRanges();
    if (a.alt && EP.sel.some(x => x.classList.contains('livre'))) {
      const clones = EP.duplicar(EP.sel, false);
      EP.selecionar(clones, { sozinho: true });
      a.duplicou = true;
    }
    const lista = EP.sel.filter(x => !EP.travado(x));
    a.cartaz = (lista[0] || EP.sel[0]).closest('.cartaz');
    a.itens = lista.map(el => ({ el, fx: EP.num(el, '--fx', 0), fy: EP.num(el, '--fy', 0) }));
    a.caixa = EP.uniao(lista);
    a.alvos = linhasAlvo(a.cartaz, lista);
    a.q = quadro(a.cartaz);
    a.modo = 'mover';
    document.body.classList.add('pro-arrastando');
    agendar();
  }
  function moverPara(e) {
    const a = arrasto;
    if (!a.itens.length) return;
    let dx = (e.clientX - a.x) / a.q.k, dy = (e.clientY - a.y) / a.q.k;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    const semEncaixe = e.ctrlKey || e.metaKey || (e.altKey && !a.alt);
    let cx = { x0: a.caixa.x0 + dx, x1: a.caixa.x1 + dx, y0: a.caixa.y0 + dy, y1: a.caixa.y1 + dy };
    if (!semEncaixe) {
      const c = encaixar(cx, a.alvos, 6 / a.q.k);
      if (e.shiftKey) { if (dy === 0) c.dy = 0; else c.dx = 0; }
      dx += c.dx; dy += c.dy;
      cx = { x0: a.caixa.x0 + dx, x1: a.caixa.x1 + dx, y0: a.caixa.y0 + dy, y1: a.caixa.y1 + dy };
    }
    const { W, H } = a.alvos;
    a.itens.forEach(it => {
      it.el.style.setProperty('--fx', EP.fix(it.fx + dx / W));
      it.el.style.setProperty('--fy', EP.fix(it.fy + dy / H));
    });
    desenharGuias(a.cartaz, semEncaixe ? [] : guiasAtivas(cx, a.alvos), distancias(cx, a.alvos));
    const mm = EP.mmPorUn(a.cartaz);
    medida(a.cartaz, `X ${r1(cx.x0 * mm)}  Y ${r1(cx.y0 * mm)} mm`, (cx.x0 + cx.x1) / 2, cx.y1);
    agendar();
  }
  function laco(e) {
    const a = arrasto;
    const x0 = Math.min(a.x, e.clientX), x1 = Math.max(a.x, e.clientX), y0 = Math.min(a.y, e.clientY), y1 = Math.max(a.y, e.clientY);
    lLaco.innerHTML = `<div class="pro-laco" style="left:${x0 + scrollX}px;top:${y0 + scrollY}px;width:${x1 - x0}px;height:${y1 - y0}px"></div>`;
    let cartaz = a.cartaz;
    if (!cartaz) {
      cartaz = EP.cartazes().find(c => { const r = c.getBoundingClientRect(); return r.left < x1 && r.right > x0 && r.top < y1 && r.bottom > y0; });
      if (!cartaz) return;
    }
    const q = quadro(cartaz), rx0 = (x0 - q.r.left) / q.k, rx1 = (x1 - q.r.left) / q.k, ry0 = (y0 - q.r.top) / q.k, ry1 = (y1 - q.r.top) / q.k;
    const pegos = [...cartaz.querySelectorAll('.ed')].filter(el => {
      if (EP.travado(el) || EP.oculto(el)) return false;
      const g = EP.geo(el);
      return g.x0 < rx1 && g.x1 > rx0 && g.y0 < ry1 && g.y1 > ry0;
    });
    const base = a.base.filter(b => b.closest('.cartaz') === cartaz);
    const nova = base.concat(EP.expandir(pegos).filter(p => !base.includes(p)));
    if (nova.length !== EP.sel.length || nova.some((n, i) => EP.sel[i] !== n)) EP.selecionar(nova, { sozinho: true });
  }
  function escalar(e) {
    const a = arrasto, f = a.f;
    const p = pontoCartaz(a.cartaz, e.clientX, e.clientY);
    const [dx, dy] = DIRS[a.al];
    const centro = e.altKey && a.modo === 'escala';
    let ancora;
    if (centro) ancora = { x: f.cx, y: f.cy };
    else { const al = rot(-dx * f.w / 2, -dy * f.h / 2, f.r); ancora = { x: f.cx + al.x, y: f.cy + al.y }; }
    const v = rot(p.x - ancora.x, p.y - ancora.y, -f.r);
    const div = centro ? 2 : 1;
    if (a.modo === 'escala') {
      const d0 = { x: dx * f.w / div, y: dy * f.h / div };
      let k = (v.x * d0.x + v.y * d0.y) / (d0.x * d0.x + d0.y * d0.y);
      const minimo = Math.max(...a.itens.map(it => 4 / Math.max(1, Math.min(it.g.w, it.g.h))));
      k = Math.max(k, minimo, 0.03);
      a.itens.forEach(it => {
        EP.aplicarMedida(it.el, it.m, k);
        EP.definirCentro(it.el, ancora.x + (it.g.cx - ancora.x) * k, ancora.y + (it.g.cy - ancora.y) * k);
      });
      const nw = f.w * k, nh = f.h * k, mm = EP.mmPorUn(a.cartaz);
      medida(a.cartaz, `${r1(nw * mm)} × ${r1(nh * mm)} mm`, f.cx, ancora.y + (f.cy - ancora.y) * k + nh / 2);
    } else {
      // lateral: só formas (largura ou altura livre)
      const it = a.itens[0];
      const horiz = dx !== 0;
      const tam = Math.max(horiz ? 4 : (it.el.dataset.forma === 'linha' ? 0.5 : 4), (horiz ? v.x * dx : v.y * dy) * div);
      const kx = horiz ? tam / f.w : 1, ky = horiz ? 1 : tam / f.h;
      EP.aplicarMedida(it.el, it.m, kx, ky);
      const meio = centro ? { x: 0, y: 0 } : rot(horiz ? dx * tam / 2 : 0, horiz ? 0 : dy * tam / 2, f.r);
      EP.definirCentro(it.el, ancora.x + meio.x, ancora.y + meio.y);
      const mm = EP.mmPorUn(a.cartaz);
      medida(a.cartaz, `${r1(f.w * kx * mm)} × ${r1(f.h * ky * mm)} mm`, f.cx, f.cy + f.h * ky / 2);
    }
    agendar();
  }
  function girar(e) {
    const a = arrasto, f = a.f;
    const p = pontoCartaz(a.cartaz, e.clientX, e.clientY);
    let da = (Math.atan2(p.y - f.cy, p.x - f.cx) - a.a0) * 180 / Math.PI;
    let total = f.r + da;
    if (e.shiftKey) total = Math.round(total / 15) * 15;
    else { const m = Math.round(total / 45) * 45; if (Math.abs(total - m) < 3) total = m; }
    da = total - f.r;
    a.itens.forEach(it => {
      it.el.style.setProperty('--r', EP.fix(norm(it.g.r + da)));
      if (a.itens.length > 1) { const o = rot(it.g.cx - f.cx, it.g.cy - f.cy, da); EP.definirCentro(it.el, f.cx + o.x, f.cy + o.y); }
    });
    medida(a.cartaz, `${Math.round(norm(total))}°`, f.cx, f.cy + Math.max(f.w, f.h) / 2);
    agendar();
  }

  /* ---------- Menu de contexto ---------- */
  area.addEventListener('contextmenu', e => {
    if (!EP.ativo) return;
    const ae = document.activeElement;
    if (ae && ae.isContentEditable && ae.contains(e.target)) return; // menu do navegador (corretor, colar) ao editar texto
    e.preventDefault();
    const el = e.target.closest('.ed'), cartaz = e.target.closest('.cartaz');
    if (el && !EP.sel.includes(el)) EP.selecionar([el]);
    if (!el) { if (cartaz) EP.cartazAtivo = cartaz; EP.selecionar([]); }
    ui.abrirContexto(e.clientX, e.clientY);
  });

  /* ---------- Edição de texto: histórico e estado ---------- */
  let fotoAntesTexto = null;
  area.addEventListener('focusin', e => {
    if (!EP.ativo) return;
    const ed = e.target.closest && e.target.closest('.ed');
    if (!ed || !e.target.isContentEditable) return;
    fotoAntesTexto = EP.fotografia();
    ed.classList.add('editando-texto');
    if (!EP.sel.includes(ed)) EP.selecionar([ed], { sozinho: true });
  });
  area.addEventListener('focusout', e => {
    const ed = e.target.closest && e.target.closest('.ed');
    if (ed) ed.classList.remove('editando-texto');
    if (fotoAntesTexto !== null) { const antes = fotoAntesTexto; fotoAntesTexto = null; if (EP.fotografia() !== antes) EP.registrar(antes); }
    if (EP.ativo) EP.emitir('mudou');
  });
  area.addEventListener('input', () => { if (EP.ativo) agendar(); });
  // Shift+Enter quebra linha no texto livre (Enter sozinho confirma, como antes)
  area.addEventListener('keydown', e => {
    if (!EP.ativo || e.key !== 'Enter' || !e.shiftKey) return;
    if (e.target.closest && e.target.closest('.livre-texto') && e.target.isContentEditable) {
      e.preventDefault(); e.stopPropagation();
      document.execCommand('insertLineBreak');
    }
  }, true);

  /* ---------- Área de transferência ---------- */
  let clip = null, colouEvento = false, colagens = 0;
  const CHAVE_CLIP = 'cartaz-pro-clip';
  EP.temClipboard = () => !!(clip || (() => { try { return localStorage.getItem(CHAVE_CLIP); } catch (e) { return null; } })());
  const livres = () => EP.sel.filter(x => x.classList.contains('livre'));
  EP.copiar = () => {
    const l = livres();
    if (!l.length) { if (EP.sel.length) ui.avisar('Nome, preços e rodapé não são copiados'); return false; }
    const cartaz = l[0].closest('.cartaz');
    if (!cartaz.dataset.cid) cartaz.dataset.cid = EP.novoUid();
    clip = { tipo: 'cartaz-pro-elementos', origem: cartaz.dataset.cid, itens: EP.elementos(cartaz).filter(x => l.includes(x)).map(el => { const c = el.cloneNode(true); c.classList.remove('sel', 'editando-texto'); return c.outerHTML; }) };
    colagens = 0;
    try { localStorage.setItem(CHAVE_CLIP, JSON.stringify(clip)); } catch (e) {}
    ui.avisar(l.length === 1 ? 'Copiado' : `${l.length} copiados`);
    return true;
  };
  EP.recortar = () => {
    if (!EP.copiar()) return;
    EP.registrar(); EP.excluir(livres());
    EP.selecionar(EP.sel.filter(x => x.isConnected), { sozinho: true });
    ui.avisar('Recortado');
  };
  EP.colar = dados => {
    if (!dados) { dados = clip; if (!dados) { try { dados = JSON.parse(localStorage.getItem(CHAVE_CLIP) || 'null'); } catch (e) {} } }
    if (!dados || !Array.isArray(dados.itens) || !dados.itens.length) { ui.avisar('Nada para colar'); return; }
    const cartaz = EP.cartazAlvo();
    if (!cartaz) { alert('Gere ou crie um cartaz primeiro.'); return; }
    EP.registrar();
    const tmp = document.createElement('div');
    tmp.innerHTML = dados.itens.join('');
    tmp.querySelectorAll('script, iframe, object, embed').forEach(n => n.remove());
    tmp.querySelectorAll('*').forEach(n => [...n.attributes].forEach(at => { if (/^on/i.test(at.name)) n.removeAttribute(at.name); }));
    const util = cartaz.querySelector('.area-util'), mapa = {}, novos = [];
    const mesmo = cartaz.dataset.cid && cartaz.dataset.cid === dados.origem;
    if (mesmo) colagens++;
    [...tmp.children].forEach(n => {
      if (!n.classList.contains('livre')) return;
      n.dataset.uid = EP.novoUid(); n.dataset.v = '2';
      if (n.dataset.grupo) n.dataset.grupo = mapa[n.dataset.grupo] || (mapa[n.dataset.grupo] = 'g' + EP.novoUid());
      util.appendChild(n); novos.push(n);
    });
    if (mesmo) { const { W } = EP.dim(cartaz); novos.forEach(n => EP.mover(n, W * 0.03 * colagens, W * 0.03 * colagens)); }
    EP.aplicarOrdem(cartaz, EP.elementos(cartaz).filter(x => !novos.includes(x)).concat(novos));
    EP.selecionar(novos, { sozinho: true });
    ui.avisar(novos.length === 1 ? 'Colado' : `${novos.length} colados`);
  };
  const editandoAlgo = () => { const ae = document.activeElement; return ae && (ae.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(ae.tagName)); };
  document.addEventListener('copy', e => {
    if (!EP.ativo || editandoAlgo() || !clip || !livres().length) return;
    try {
      e.clipboardData.setData('application/x-cartaz-pro', JSON.stringify(clip));
      e.clipboardData.setData('text/plain', livres().map(x => x.textContent.trim()).filter(Boolean).join('\n') || ' ');
      e.preventDefault();
    } catch (err) {}
  });
  document.addEventListener('paste', e => {
    if (!EP.ativo || editandoAlgo()) return;
    const dt = e.clipboardData; if (!dt) return;
    colouEvento = true;
    const nosso = dt.getData('application/x-cartaz-pro');
    if (nosso) { e.preventDefault(); try { EP.colar(JSON.parse(nosso)); } catch (err) { EP.colar(); } return; }
    const img = [...dt.files].find(f => /^image\//.test(f.type));
    if (img) { e.preventDefault(); ui.inserirImagemArquivo(img); return; }
    const txt = (dt.getData('text/plain') || '').trim();
    if (txt && !(clip && txt === livres().map(x => x.textContent.trim()).join('\n'))) {
      e.preventDefault();
      const el = EP.criar('texto', { texto: txt.split(/\r?\n/)[0].slice(0, 120) });
      if (el) ui.avisar('Texto colado');
      return;
    }
    e.preventDefault(); EP.colar();
  });

  /* ---------- Arrastar arquivo de imagem para o cartaz ---------- */
  let soltaAlvo = null;
  const temArquivo = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  area.addEventListener('dragover', e => {
    if (!EP.ativo || !temArquivo(e)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    const c = e.target.closest('.cartaz');
    if (c !== soltaAlvo) {
      soltaAlvo = c; lLaco.innerHTML = '';
      if (c) { const q = quadro(c); lLaco.innerHTML = `<div class="pro-solta" style="left:${q.x}px;top:${q.y}px;width:${q.W * q.k}px;height:${q.H * q.k}px"></div>`; }
    }
  });
  area.addEventListener('dragleave', e => { if (!area.contains(e.relatedTarget)) { soltaAlvo = null; lLaco.innerHTML = ''; } });
  area.addEventListener('drop', e => {
    if (!EP.ativo || !temArquivo(e)) return;
    e.preventDefault();
    lLaco.innerHTML = ''; soltaAlvo = null;
    const f = [...e.dataTransfer.files].find(x => /^image\//.test(x.type));
    if (!f) { alert('Solte um arquivo de imagem (PNG, JPG, WEBP, SVG…).'); return; }
    const cartaz = e.target.closest('.cartaz') || EP.cartazAlvo();
    if (!cartaz) return;
    const p = pontoCartaz(cartaz, e.clientX, e.clientY);
    ui.inserirImagemArquivo(f, { cartaz, centro: p });
  });

  /* ---------- Zoom da mesa (não muda o PDF: na exportação o zoom volta a 1) ---------- */
  const estiloZoom = document.createElement('style');
  document.head.appendChild(estiloZoom);
  const zoom = { a3: null, a5: null };
  const formato = () => (typeof formatoAtual !== 'undefined' ? formatoAtual : 'a3');
  const zoomPadrao = f => f === 'a3' ? (window.matchMedia('(max-width: 900px)').matches ? 0.35 : 0.5) : 1;
  EP.zoomAtual = () => { const f = formato(); return zoom[f] !== null ? zoom[f] : zoomPadrao(f); };
  function aplicarZoom() {
    const css = [];
    if (zoom.a3 !== null) css.push(`body.editor-pro #preview-area .cartaz.a3 { zoom: ${zoom.a3} !important; }`);
    if (zoom.a5 !== null) css.push(`body.editor-pro #preview-area .cartaz:not(.a3) { zoom: ${zoom.a5} !important; }`);
    estiloZoom.textContent = css.length ? '@media screen { ' + css.join(' ') + ' }' : '';
    ui.estadoZoom(EP.zoomAtual(), regua, grade);
    agendar();
  }
  EP.definirZoom = (z, ancora) => {
    z = Math.min(4, Math.max(0.1, z));
    let antes = null;
    const c = (ancora && ancora.cartaz) || EP.cartazAlvo();
    if (c && ancora) antes = { p: pontoCartaz(c, ancora.x, ancora.y), x: ancora.x, y: ancora.y };
    zoom[formato()] = Math.round(z * 1000) / 1000;
    aplicarZoom();
    if (antes) {
      const r = c.getBoundingClientRect(), k = r.width / EP.dim(c).W;
      window.scrollBy(r.left + antes.p.x * k - antes.x, r.top + antes.p.y * k - antes.y);
    }
  };
  const NIVEIS = [0.1, 0.15, 0.2, 0.25, 0.35, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4];
  EP.zoomPasso = d => {
    const z = EP.zoomAtual();
    const prox = d > 0 ? NIVEIS.find(n => n > z + 0.001) : [...NIVEIS].reverse().find(n => n < z - 0.001);
    if (prox) EP.definirZoom(prox);
  };
  EP.zoomAjustar = () => {
    const c = EP.cartazAlvo(); if (!c) return;
    const { W, H } = EP.dim(c);
    const barraPro = document.querySelector('.barra-pro').getBoundingClientRect();
    const estreito = window.matchMedia('(max-width: 900px)').matches;
    const painel = document.querySelector('.painel-pro');
    const direita = !estreito && painel ? painel.getBoundingClientRect().left : window.innerWidth;
    const esquerda = area.getBoundingClientRect().left;
    const folga = regua ? 72 : 48;
    const z = Math.min((direita - esquerda - folga) / W, (window.innerHeight - barraPro.bottom - folga) / H);
    EP.definirZoom(z);
    requestAnimationFrame(() => {
      const r = c.getBoundingClientRect();
      window.scrollBy(0, r.top - barraPro.bottom - (regua ? 36 : 20));
    });
  };
  window.addEventListener('wheel', e => {
    if (!EP.ativo || !(e.ctrlKey || e.metaKey)) return;
    if (!e.target.closest || !e.target.closest('.mesa') || e.target.closest('.barra-pro, .painel-pro')) return;
    e.preventDefault();
    const c = e.target.closest('.cartaz') || EP.cartazAlvo();
    EP.definirZoom(EP.zoomAtual() * Math.exp(-e.deltaY * 0.0018), { x: e.clientX, y: e.clientY, cartaz: c });
  }, { passive: false });
  // Trocar A3/A5 muda o zoom mostrado
  document.querySelectorAll('.segmento [data-formato]').forEach(b => b.addEventListener('click', () => setTimeout(aplicarZoom, 0)));

  EP.alternarRegua = () => {
    regua = !regua;
    try { localStorage.setItem('cartaz-pro-regua', regua ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('pro-com-regua', regua && EP.ativo);
    aplicarZoom();
  };
  EP.alternarGrade = () => {
    grade = !grade;
    try { localStorage.setItem('cartaz-pro-grade', grade ? '1' : '0'); } catch (e) {}
    aplicarZoom();
  };

  /* ---------- Teclado ---------- */
  let esperaColar = null;
  document.addEventListener('keydown', e => {
    if (!EP.ativo || e.defaultPrevented && e.key !== 'Escape') return;
    if (ui.dialogoAberto()) return;
    const ae = document.activeElement;
    const editandoTexto = ae && ae.isContentEditable && area.contains(ae);
    const emCampo = ae && !editandoTexto && (/INPUT|TEXTAREA|SELECT/.test(ae.tagName) || ae.isContentEditable);
    const ctrl = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase(), code = e.code || '';
    if (emCampo) { if (e.key === 'Escape' && ae.closest('.painel-pro')) ae.blur(); return; }
    if (editandoTexto) {
      if (e.key === 'Escape') { e.preventDefault(); ae.blur(); window.getSelection().removeAllRanges(); return; }
      if (ctrl && !e.altKey && ['b', 'i', 'u'].includes(k)) { e.preventDefault(); EP.acao({ b: 'negrito', i: 'italico', u: 'sublinhado' }[k]); return; }
      return;
    }
    if (e.key === 'Escape') {
      if (document.querySelector('.pro-pop.aberto')) { ui.fecharPop(); return; }
      if (document.querySelector('.pro-ctx.aberto')) { ui.fecharContexto(); return; }
      if (EP.sel.length) { e.preventDefault(); EP.selecionar([]); }
      return;
    }
    const fazer = (acao, v) => { e.preventDefault(); EP.acao(acao, v); };
    if (ctrl && !e.altKey) {
      if (k === 'z') return fazer(e.shiftKey ? 'refazer' : 'desfazer');
      if (k === 'y') return fazer('refazer');
      if (k === 's') return fazer('salvar-projeto');
      if (k === 'o') return fazer('abrir-projeto');
      if (k === '=' || k === '+' || code === 'NumpadAdd') return fazer('zoom-mais');
      if (k === '-' || code === 'NumpadSubtract') return fazer('zoom-menos');
      if (k === 'a') return fazer('selecionar-tudo');
      if (k === 'c') { EP.copiar(); return; } // o evento "copy" também grava na área de transferência do sistema
      if (k === 'x') { e.preventDefault(); EP.recortar(); return; }
      if (k === 'v') { colouEvento = false; clearTimeout(esperaColar); esperaColar = setTimeout(() => { if (!colouEvento) EP.colar(); }, 120); return; }
    }
    if (ctrl && e.altKey && code === 'KeyC') return fazer('copiar-estilo');
    if (ctrl && e.altKey && code === 'KeyV') return fazer('colar-estilo');
    if (e.shiftKey && !ctrl && !e.altKey) {
      if (code === 'Digit1') return fazer('zoom-ajustar');
      if (code === 'Digit0') return fazer('zoom-valor', '1');
      if (code === 'KeyR') return fazer('regua');
      if (code === 'KeyG') return fazer('grade');
      if (code === 'KeyN') return fazer('nova-folha');
    }
    if (e.key === '?') return fazer('atalhos');
    if (!ctrl && !e.altKey && !e.shiftKey) {
      if (k === 't') return fazer('add-texto');
      if (k === 'r') return fazer('add-forma', 'retangulo');
      if (k === 'c') return fazer('add-forma', 'circulo');
      if (k === 'l') return fazer('add-forma', 'linha');
    }
    if (e.key === 'Tab' && !ctrl && !e.altKey && ae && (ae === document.body || area.contains(ae) || camada.contains(ae))) {
      const c = EP.cartazAlvo(); if (!c) return;
      const els = EP.elementos(c).filter(x => !EP.oculto(x));
      if (!els.length) return;
      e.preventDefault();
      const i = EP.sel.length ? els.indexOf(EP.sel[EP.sel.length - 1]) : -1;
      EP.selecionar([els[(i + (e.shiftKey ? els.length - 1 : 1) + els.length) % els.length]], { sozinho: true });
      return;
    }
    if (!EP.sel.length) return;
    if (ctrl && !e.altKey) {
      if (k === 'd') return fazer('duplicar');
      if (k === 'g') return fazer(e.shiftKey ? 'desagrupar' : 'agrupar');
      if (code === 'BracketRight' || e.key === ']' || e.key === '}') return fazer(e.shiftKey ? 'topo' : 'frente');
      if (code === 'BracketLeft' || e.key === '[' || e.key === '{') return fazer(e.shiftKey ? 'fundo' : 'tras');
      if (k === 'b') return fazer('negrito');
      if (k === 'i') return fazer('italico');
      if (k === 'u') return fazer('sublinhado');
      if (e.shiftKey && code === 'KeyK') return fazer('caixa');
      if (e.shiftKey && code === 'KeyL') return fazer('txt-left');
      if (e.shiftKey && code === 'KeyE') return fazer('txt-center');
      if (e.shiftKey && code === 'KeyR') return fazer('txt-right');
    }
    if (e.altKey && e.shiftKey && code === 'KeyL') return fazer('travar');
    if (e.key === 'Delete' || e.key === 'Backspace') return fazer('excluir');
    if (e.key === 'Enter' && EP.sel.length === 1 && !EP.travado(EP.sel[0])) {
      const el = EP.sel[0];
      const t = el.getAttribute('contenteditable') === 'true' ? el : el.querySelector('[contenteditable="true"]');
      if (t) { e.preventDefault(); t.focus(); }
      return;
    }
    const passoMm = e.shiftKey ? 10 : 1;
    const mov = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (mov && !ctrl) {
      e.preventDefault();
      const l = EP.sel.filter(x => !EP.travado(x)); if (!l.length) return;
      if (!e.repeat) EP.registrar();
      const un = passoMm / EP.mmPorUn(l[0].closest('.cartaz'));
      l.forEach(x => EP.mover(x, mov[0] * un, mov[1] * un));
      EP.emitir('mudou');
    }
  });

  /* ---------- Observar a mesa ---------- */
  new MutationObserver(muts => {
    if (!EP.ativo) return;
    let novos = false;
    muts.forEach(m => { if (m.type === 'childList' && m.target === area) novos = true; });
    if (novos) {
      const modelo = EP.lerModelo();
      EP.cartazes().forEach(c => {
        if (c.dataset.pro) return;
        EP.preparar(c);
        if (modelo && !c.dataset.branco) EP.aplicarLayout(c, modelo);
        c.dataset.pro = '1';
      });
      if (EP.sel.some(x => !x.isConnected)) EP.selecionar(EP.sel.filter(x => x.isConnected), { sozinho: true });
      else EP.emitir('mudou');
    }
    agendar();
  }).observe(area, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ['style', 'class'] });
  window.addEventListener('resize', agendar);
  if (window.ResizeObserver) new ResizeObserver(agendar).observe(area);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendar);
  EP.ouvir('mudou', agendar);
  // No celular o inspetor vira folha inferior: rola a mesa para o selecionado não ficar escondido atrás dela
  EP.ouvir('selecao', () => {
    if (!EP.ativo || arrasto || !EP.sel.length || !window.matchMedia('(max-width: 900px)').matches) return;
    requestAnimationFrame(() => {
      if (!EP.sel.length || !EP.sel[0].isConnected) return;
      const folha = document.querySelector('.painel-pro').getBoundingClientRect();
      const topo = document.querySelector('.barra-pro').getBoundingClientRect().bottom;
      const q = quadro(EP.sel[0].closest('.cartaz')), u = EP.uniao(EP.sel);
      const y0 = q.r.top + u.y0 * q.k, y1 = q.r.top + u.y1 * q.k;
      if (y1 > folha.top - 12) window.scrollBy({ top: Math.min(y1 - folha.top + 24, y0 - topo - 12), behavior: 'smooth' });
      else if (y0 < topo + 8) window.scrollBy({ top: y0 - topo - 16, behavior: 'smooth' });
    });
  });

  /* ---------- Ligar / desligar ---------- */
  EP.ligar = () => {
    EP.ativo = true;
    document.body.classList.add('editor-pro');
    document.body.classList.toggle('pro-com-regua', regua);
    if (typeof modoEditavel !== 'undefined' && !modoEditavel) document.getElementById('modelo').click();
    EP.cartazes().forEach(c => { EP.preparar(c); c.dataset.pro = '1'; });
    EP.cartazAtivo = EP.cartazAtivo && EP.cartazAtivo.isConnected ? EP.cartazAtivo : area.querySelector('.cartaz');
    aplicarZoom();
    EP.emitir('historico');
    EP.emitir('mudou');
  };
  EP.desligar = () => {
    EP.ativo = false;
    ui.fecharPop(); ui.fecharContexto();
    EP.selecionar([]);
    document.body.classList.remove('editor-pro', 'pro-com-regua', 'pro-com-sel', 'pro-camadas-aberto');
    camada.querySelectorAll(':scope > div').forEach(d => { d.innerHTML = ''; });
  };
})();
