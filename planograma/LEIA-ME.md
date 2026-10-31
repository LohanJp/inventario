# Planograma Mobile — versão Framework7

Interface nova feita com **Framework7 9.3** (tema automático: visual de iPhone no iOS e Material no Android).
A leitura dos relatórios, os cálculos, a nuvem, o backup e o .csv são **os mesmos** da versão anterior.

## O que mudou e o que não mudou

| Arquivo | Situação |
|---|---|
| `js/leitura.js`, `js/estado.js`, `js/base.js` | **iguais** (leitura dos .txt, cobertura, 999 → "—", situações, sugestão em caixas) |
| `js/nuvem.js`, `js/encarte.js`, `js/oferta.js`, `js/arquivos.js` | **iguais** (Firebase, Encarte, Panfleto, Oferta do dia, backup .json/.csv, leitor de código) |
| `js/telas.js` | **novo**: app Framework7, tema claro/escuro, abas, Resumo, Produtos com lista virtual, filtros e categorias, cartão de produto |
| `js/pedido.js` | **novo visual**: gestos do Framework7 (swipeout) e ficha em folha que sobe de baixo — dados do pedido no mesmo formato |
| `index.html`, `css/app.css` | **novos** |
| `lib/framework7/` | biblioteca salva junto do app (versão enxuta, ~266 KB de JS) — **não usa CDN** |
| `sw.js` | igual, mais a pasta `lib/framework7` no cache · versão `planograma-condor-v20-f7` |

A ordem dos scripts continua importando: **framework7 → leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem**.

## Nomes na tela (out/2026)

Na tela, o antigo **Encarte** agora se chama **Panfleto**, e o antigo **Panfleto** agora se chama **Lâmina**.
No código, na memória do aparelho e na nuvem os nomes internos continuam os mesmos (`enc`, `pf`, `encarte`, `panfleto-d…`, `live/enc`, `live/pf`),
para não perder o que já está salvo e para continuar sincronizando com a versão anterior.

## Gestos

- **Produtos / Lâmina / Oferta:** deslize → concluir (ou reabrir) · ← adicionar ao pedido.
- **Pedido:** → concluir · ← excluir (com "Desfazer").
- Arrastar até o fim já executa a ação. Segurar o cartão ~1 s marca **🔎 Procurar no depósito**.
- A ficha do produto abre no botão **i** e fecha arrastando para baixo, no ✕ ou no voltar do celular.

## Testes

```
node tests/testar-leitura.js          # leitura dos .txt (sem navegador)
npm install && npx playwright install chromium
npm run test:app                      # app no navegador com os .txt de tests/relatorios/
npm run test:app:nuvem                # o mesmo, abrindo o planograma_nuvem_*.json
```

O teste do app agora também confere a lista virtual, os gestos, a ficha, o tema e o botão voltar.
**Não suba a pasta `tests/` para o servidor.**

## Remontar o Framework7 (só se quiser outra versão)

`build-framework7/` tem a receita: `npm i framework7 esbuild less`, depois
`npx esbuild build-framework7/f7-entry.js --bundle --minify --format=iife --outfile=lib/framework7/framework7.min.js`
e `npx lessc build-framework7/f7.less lib/framework7/framework7.css` (minifique com esbuild).
Os ícones `icon-*.png` deste pacote são provisórios — pode trocar pelos do app atual.
