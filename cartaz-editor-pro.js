/* Editor profissional do cartaz — VERSÃO DE TESTE
   Só é carregado quando o botão "Versão de teste" é clicado (o modo normal do cartaz.html não muda).
   Este arquivo só carrega as partes do editor, que ficam na pasta editor-pro/:
     editor-pro.css  estilos (tudo que é interface some no PDF e na impressão)
     nucleo.js       elementos, geometria, seleção, histórico, camadas, modelo e arquivo do projeto
     interface.js    faixa de ferramentas, inspetor (Propriedades / Camadas), cores, fontes, menus, atalhos
     interacao.js    alças, arrastar/redimensionar/girar, laço, guias, régua, grade, zoom, teclado, copiar/colar
     pecas.js        peças do cartaz padrão para inserir (caixas de preço, nome, rodapé, moldura)
     paginas.js      cabeçalho de cada cartaz (olho para ocultar, duplicar, excluir) e área "Ocultos"
   Usa do cartaz.html: modoEditavel, formatoAtual, ajustarNomes, ICONES, CORES_ICONE, iconePadrao, corPadrao, svgIcone.
   Posições ficam em fração do cartaz (cqw/cqh), então valem igual em A3 e A5. */
(function () {
  if (window.EditorPro) return;
  const VERSAO = '4';
  const atual = document.currentScript && document.currentScript.src;
  const base = atual ? new URL('editor-pro/', atual).href : 'editor-pro/';
  let ativo = false, pronto = false, falhou = false, pendente = null;

  const quando = fn => { if (pronto) fn(); else pendente = fn; };
  let faltam = 6;
  const carregou = () => { if (--faltam === 0) { pronto = true; if (pendente) { const f = pendente; pendente = null; f(); } } };
  const erro = () => {
    if (falhou) return;
    falhou = true; ativo = false;
    const b = document.getElementById('btn-teste');
    if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = 'Versão de teste'; }
    alert('Não consegui carregar a versão de teste (pasta editor-pro). Recarregue a página.');
  };

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + 'editor-pro.css?v=' + VERSAO;
  css.onload = carregou; css.onerror = erro;
  document.head.appendChild(css);
  ['nucleo.js', 'interface.js', 'interacao.js', 'pecas.js', 'paginas.js'].forEach(nome => {
    const s = document.createElement('script');
    s.src = base + nome + '?v=' + VERSAO;
    s.async = false; // executa na ordem
    s.onload = carregou; s.onerror = erro;
    document.body.appendChild(s);
  });

  window.EditorPro = {
    ligar() { ativo = true; quando(() => { if (ativo) window.EP.ligar(); }); },
    desligar() { ativo = false; quando(() => { if (!ativo) window.EP.desligar(); }); },
    get ativo() { return ativo; }
  };
})();
