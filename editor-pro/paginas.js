/* Editor profissional — cartazes como páginas (como no Canva):
   - cabeçalho discreto acima de cada cartaz, FORA da folha: "Cartaz N" + ocultar (olho), duplicar e excluir;
   - cartaz oculto (classe cartaz-oculto) não sai no PDF nem na impressão (o cartaz.html pula essa classe),
     sai da lista e vai para a área recolhível "Ocultos (N)" no fim da mesa, fechada por padrão;
   - a contagem da barra mostra "3 cartazes · 2 ocultos".
   O cartaz oculto continua no mesmo lugar do DOM (só a ordem visual muda, com CSS "order"): ao mostrar de
   novo ele volta à posição original, e o PDF/impressão seguem a ordem do DOM.
   Decisão: ao sair da versão de teste o estado oculto CONTINUA valendo. Para não ficar nada escondido sem
   aviso, a área "Ocultos" e a contagem continuam visíveis no modo normal, com "Mostrar todos". */
(function () {
  const EP = window.EP, ui = EP.ui, area = EP.area, svg = ui.svg;

  /* ---------- Cabeçalhos (camada própria no body, fora do cartaz e da camada de seleção) ---------- */
  const camada = document.createElement('div');
  camada.className = 'pro-cabecalhos';
  document.body.appendChild(camada);
  const cabs = []; // reaproveitados por posição: o foco do teclado não se perde ao redesenhar

  function criarCab() {
    const h = document.createElement('div');
    h.className = 'pro-cab-cartaz';
    h.innerHTML = `<button type="button" class="pro-cab-nome" data-cab="ativar"></button>
      <span class="pro-cab-acoes">
        <button type="button" class="pro-btn so-icone" data-cab="olho"></button>
        <button type="button" class="pro-btn so-icone" data-cab="duplicar">${svg('duplicar')}</button>
        <button type="button" class="pro-btn so-icone" data-cab="excluir">${svg('lixeira')}</button>
      </span>`;
    camada.appendChild(h);
    return h;
  }
  function desenharCabecalhos() {
    if (!EP.ativo) { cabs.forEach(h => { h.hidden = true; }); return; }
    const todos = EP.cartazes(), regua = document.body.classList.contains('pro-com-regua');
    const alvo = EP.cartazAlvo();
    todos.forEach((c, i) => {
      const h = cabs[i] || (cabs[i] = criarCab());
      const r = c.getBoundingClientRect();
      if (!r.width) { h.hidden = true; return; } // oculto com a área "Ocultos" fechada
      const oculto = EP.cartazOculto(c), n = i + 1;
      h.hidden = false;
      h.classList.toggle('oculto', oculto);
      h.classList.toggle('ativo', !oculto && c === alvo);
      h.style.left = (r.left + window.scrollX) + 'px';
      h.style.top = (r.top + window.scrollY - (regua ? 24 : 0) - 32) + 'px';
      h.style.width = r.width + 'px';
      const nome = h.querySelector('.pro-cab-nome');
      const prod = c.querySelector('.produto-nome');
      const rot = `Cartaz ${n}` + (oculto ? ' · oculto' : '');
      if (nome.textContent !== rot) nome.textContent = rot;
      nome.title = (prod && prod.textContent.trim()) || (c.dataset.branco ? 'Folha em branco' : '');
      const olho = h.querySelector('[data-cab=olho]');
      const rotOlho = oculto ? `Mostrar cartaz ${n}` : `Ocultar cartaz ${n}`;
      if (olho.getAttribute('aria-label') !== rotOlho) {
        olho.innerHTML = svg(oculto ? 'olhoFechado' : 'olho');
        olho.setAttribute('aria-label', rotOlho);
        olho.setAttribute('aria-pressed', String(oculto));
        olho.title = oculto ? 'Mostrar: volta para o PDF e a impressão' : 'Ocultar: não sai no PDF nem na impressão';
        const dup = h.querySelector('[data-cab=duplicar]'), exc = h.querySelector('[data-cab=excluir]');
        dup.setAttribute('aria-label', `Duplicar cartaz ${n}`); dup.title = 'Duplicar cartaz';
        exc.setAttribute('aria-label', `Excluir cartaz ${n}`); exc.title = 'Excluir cartaz';
      }
      h.querySelector('[data-cab=duplicar]').hidden = h.querySelector('[data-cab=excluir]').hidden = oculto;
    });
    cabs.slice(todos.length).forEach(h => { h.hidden = true; });
  }
  EP.ouvir('desenho', desenharCabecalhos);

  /* ---------- Ações ---------- */
  const nomeDe = c => 'Cartaz ' + (EP.cartazes().indexOf(c) + 1);
  EP.ocultarCartaz = (c, ocultar) => {
    if (!c) return;
    if (ocultar === undefined) ocultar = !EP.cartazOculto(c);
    if (ocultar === EP.cartazOculto(c)) return;
    if (EP.ativo) EP.registrar();
    const ae = document.activeElement;
    if (ocultar && ae && c.contains(ae)) ae.blur();
    c.classList.toggle('cartaz-oculto', ocultar);
    if (ocultar) {
      if (EP.sel.some(e => c.contains(e))) EP.selecionar([]);
      if (EP.cartazAtivo === c) {
        const vis = EP.visiveis(), todos = EP.cartazes(), i = todos.indexOf(c);
        EP.cartazAtivo = vis.find(v => todos.indexOf(v) > i) || vis[vis.length - 1] || null;
      }
    } else {
      EP.cartazAtivo = c;
    }
    sincronizar();
    EP.emitir('mudou');
    if (ui.avisar) ui.avisar(ocultar ? `${nomeDe(c)} oculto: não sai no PDF` : `${nomeDe(c)} de volta`);
    if (!ocultar) requestAnimationFrame(() => { if (c.isConnected) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  };
  EP.duplicarCartaz = c => {
    if (!c) return null;
    EP.registrar();
    const k = c.cloneNode(true);
    k.classList.remove('cartaz-oculto');
    k.querySelectorAll('.sel, .editando-texto').forEach(e => e.classList.remove('sel', 'editando-texto'));
    k.querySelectorAll('[data-uid]').forEach(e => { e.dataset.uid = EP.novoUid(); });
    delete k.dataset.cid;
    c.after(k);
    EP.selecionar([]);
    EP.cartazAtivo = k;
    EP.emitir('mudou');
    if (ui.avisar) ui.avisar(`${nomeDe(k)} criado (cópia)`);
    return k;
  };
  EP.excluirCartaz = c => {
    if (!c) return;
    const nome = nomeDe(c);
    EP.registrar();
    if (EP.sel.some(e => c.contains(e))) EP.selecionar([]);
    const todos = EP.cartazes(), i = todos.indexOf(c);
    c.remove();
    if (EP.cartazAtivo === c || !EP.cartazAtivo || !EP.cartazAtivo.isConnected) {
      const vis = EP.visiveis();
      EP.cartazAtivo = vis[Math.min(i, vis.length - 1)] || null;
    }
    EP.emitir('mudou');
    if (ui.avisar) ui.avisar(`${nome} excluído (Ctrl+Z desfaz)`);
  };

  camada.addEventListener('click', e => {
    const b = e.target.closest('[data-cab]');
    if (!b || !EP.ativo) return;
    const h = b.closest('.pro-cab-cartaz'), c = EP.cartazes()[cabs.indexOf(h)];
    if (!c) return;
    const acao = b.dataset.cab;
    if (acao === 'olho') EP.ocultarCartaz(c);
    else if (acao === 'duplicar') EP.duplicarCartaz(c);
    else if (acao === 'excluir') EP.excluirCartaz(c);
    else if (acao === 'ativar' && !EP.cartazOculto(c)) { EP.cartazAtivo = c; EP.selecionar([]); }
    if (e.detail) b.blur(); // clique de mouse: o teclado volta para a mesa
  });

  /* ---------- Área "Ocultos" (dentro da mesa, depois de todos os cartazes) ---------- */
  function barraOcultos() {
    let b = area.querySelector(':scope > .pro-ocultos');
    if (!b) {
      b = document.createElement('div');
      b.className = 'pro-ocultos';
      b.innerHTML = `<button type="button" class="pro-ocultos-alternar" aria-expanded="false">${svg('seta')}<span></span></button>
        <span class="pro-ocultos-nota">Não saem no PDF nem na impressão.</span>
        <button type="button" class="pro-ocultos-todos">${svg('olho')}<span>Mostrar todos</span></button>`;
      area.appendChild(b);
    }
    return b;
  }
  let alterouContagem = false;
  function sincronizar() {
    const ocultos = area.querySelectorAll('.cartaz.cartaz-oculto').length;
    const existente = area.querySelector(':scope > .pro-ocultos');
    if (!ocultos) {
      if (existente) existente.remove();
      // só mexe na classe se ela existe: remover classe ausente ainda grava o atributo e o observador rodaria sem parar
      if (area.classList.contains('mostrar-ocultos')) area.classList.remove('mostrar-ocultos');
    } else {
      const b = existente || barraOcultos();
      const aberto = area.classList.contains('mostrar-ocultos');
      const rot = `Ocultos (${ocultos})`;
      const t = b.querySelector('.pro-ocultos-alternar');
      if (t.querySelector('span').textContent !== rot) t.querySelector('span').textContent = rot;
      t.setAttribute('aria-expanded', String(aberto));
      t.title = aberto ? 'Recolher os cartazes ocultos' : 'Ver os cartazes ocultos';
    }
    // contagem da barra do cartaz.html: os ocultos não contam
    const cont = document.getElementById('contagem');
    if (!cont) return;
    const total = area.querySelectorAll('.cartaz').length;
    if (ocultos) {
      const v = total - ocultos;
      const txt = `${v ? v + (v > 1 ? ' cartazes' : ' cartaz') : 'Nenhum visível'} · ${ocultos} oculto${ocultos > 1 ? 's' : ''}`;
      if (cont.textContent !== txt) cont.textContent = txt;
      alterouContagem = true;
    } else if (alterouContagem) {
      cont.textContent = total ? `${total} cartaz${total > 1 ? 'es' : ''}` : 'Nenhum cartaz';
      alterouContagem = false;
    }
  }
  EP.sincronizarOcultos = sincronizar;
  area.addEventListener('click', e => {
    const t = e.target.closest('.pro-ocultos-alternar');
    if (t) {
      area.classList.toggle('mostrar-ocultos');
      sincronizar();
      if (EP.agendar) EP.agendar();
      if (area.classList.contains('mostrar-ocultos')) {
        // a barra sobe para o alto da mesa: aparecem ela, o cabeçalho e o começo do 1º oculto
        requestAnimationFrame(() => {
          const barras = [...document.querySelectorAll('.barra, .barra-pro')].filter(x => x.offsetParent);
          const topo = Math.max(0, ...barras.map(x => x.getBoundingClientRect().bottom));
          window.scrollBy({ top: t.getBoundingClientRect().top - topo - 16, behavior: 'smooth' });
        });
      }
      return;
    }
    if (e.target.closest('.pro-ocultos-todos')) {
      const lista = [...area.querySelectorAll('.cartaz.cartaz-oculto')];
      if (!lista.length) return;
      if (EP.ativo) EP.registrar();
      lista.forEach(c => c.classList.remove('cartaz-oculto'));
      sincronizar();
      if (EP.ativo) { EP.emitir('mudou'); if (ui.avisar) ui.avisar(lista.length > 1 ? `${lista.length} cartazes de volta` : '1 cartaz de volta'); }
    }
  });
  // Vale também com a versão de teste desligada (o estado oculto continua valendo no PDF e na impressão)
  new MutationObserver(sincronizar).observe(area, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  sincronizar();
})();
