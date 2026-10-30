# Planograma Mobile — como o código está organizado

O app continua sendo um site estático (abre direto no navegador, sem instalar nada). Só foi dividido em arquivos menores.

## Arquivos do app (estes vão para o servidor)

| Arquivo | O que tem |
|---|---|
| `index.html` | só a estrutura das telas |
| `css/app.css` | todos os estilos (tema claro/escuro, cartões, folhas) |
| `js/leitura.js` | **leitura dos relatórios .txt** (Planograma, Cobertura, Trânsito) — é o que os testes conferem |
| `js/estado.js` | dados carregados + memória do aparelho (IndexedDB, concluídos) |
| `js/base.js` | utilitários, busca, sugestão de pedido, cálculo da situação de cada produto |
| `js/telas.js` | navegação, Resumo, Produtos, filtros e categorias |
| `js/encarte.js` | Encarte, leitura do Panfleto, planilhas, carregamento da Cobertura |
| `js/oferta.js` | Oferta do dia, Panfleto por dia da semana, menu Anexos |
| `js/pedido.js` | Pedido, 🔎 depósito, deslizar/segurar cartões, ficha do produto |
| `js/arquivos.js` | carregar relatórios, aba Dados, backup, leitor de código de barras |
| `js/nuvem.js` | Firebase, pendências offline, tempo real e a inicialização (`boot`) |
| `sw.js`, `manifest.webmanifest`, ícones | PWA / funcionar sem internet |

Os `.js` são scripts comuns que compartilham as mesmas variáveis, por isso **a ordem no `index.html` importa**: não troque a ordem das tags `<script>`.

**Ao publicar uma versão nova:** troque o número em `sw.js` (`planograma-condor-v4` → `v5`). Se criar um arquivo `.js` novo, inclua o nome na lista `JS` do `sw.js` e no `index.html`.

**Não suba a pasta `tests/` para o servidor** — ela guarda os relatórios reais da loja.

## Testes

Precisa do [Node.js](https://nodejs.org) (versão 18 ou mais nova).

1. Coloque relatórios `.txt` em `tests/relatorios/` (qualquer nome — o tipo é reconhecido pelo cabeçalho).
2. No terminal, dentro da pasta do app:

```
node tests/testar-leitura.js
```

Ele confere:
- **testes fixos**: acentos, números como `1.234,56`, linha deslocada que é realinhada, linha quebrada que é ignorada;
- **regras de cada relatório**: códigos com 8 dígitos, números válidos, nenhuma linha perdida…;
- **comparação com a referência**: se o arquivo já foi testado antes, o resultado tem que ser *idêntico* (total de produtos, somas de estoque/MDV, primeiro e último item). Assim, se uma mudança no `js/leitura.js` alterar qualquer número, o teste avisa antes de chegar no celular.

Quando um relatório novo passar nas regras e estiver certo, guarde-o como referência:

```
node tests/testar-leitura.js --salvar
```

### Teste do app no navegador (opcional)

Abre o app num Chrome invisível, carrega os relatórios e passa por todas as abas procurando erros de JavaScript.

```
npm install
npx playwright install chromium
npm run test:app
```
