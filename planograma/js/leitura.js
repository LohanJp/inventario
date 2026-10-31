/* Planograma Mobile — LEITURA DOS RELATÓRIOS (.txt): Planograma, Cobertura e Trânsito.
   Só funções puras + metadados: é este arquivo que tests/testar-leitura.js testa, sem navegador.
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */

/* ═══ LEITURA ÚNICA E À PROVA DE DESLOCAMENTO — vale para TODOS os relatórios ═══
   1) Decodifica como UTF-8 (cada acento = 1 coluna) e só cai para Windows-1252 se o arquivo não for UTF-8.
   2) normalize('NFC') junta letra+acento decomposto ("C"+"¸") em 1 caractere.
   3) Cada linha de colunas fixas é CONFERIDA: campos numéricos têm que ser números e os vãos entre colunas só espaços.
      Se não fechar (acento mal codificado, emoji, tab…), tenta realinhar a linha em até ±6 casas; se não der,
      a linha é IGNORADA e o app avisa — melhor sem o item do que com número errado. */
function decodeBuf(buf){let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch{t=new TextDecoder('windows-1252').decode(buf)}return t.normalize('NFC')}
const readReport=file=>file.arrayBuffer().then(decodeBuf);
let parseWarn={realign:0,skip:0};
const warnTxt=()=>(parseWarn.realign||parseWarn.skip)?` · ⚠ ${parseWarn.realign?parseWarn.realign+' linha(s) realinhada(s)':''}${parseWarn.realign&&parseWarn.skip?', ':''}${parseWarn.skip?parseWarn.skip+' ignorada(s)':''}`:'';
/* ícones desenhados (mesmo traço da barra de baixo) e símbolos de situação: cor + FORMA, para não depender só do vermelho/verde */
const IC={ bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
 warn:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
 box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
 folder:'<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'};
const ic=(k,sz=16)=>`<svg class="ic" viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const GLY={rup:'●',crit:'▲',aten:'◆',ok:'✓',nd:'–',sg:'■'},SLBL={rup:'Ruptura',crit:'Crítico',aten:'Atenção',ok:'Saudável',nd:'Sem MDV',sg:'Sem giro'};
const NUMF=/^-?\d[\d.]*(,\d+)?$|^$/;                     // 999 · -94 · 2.207 · 1.234,56 · vazio
function colsOk(line,cols,d){
  for(let i=0;i<cols.length;i++){const c=cols[i],nx=cols[i+1];
    const v=line.substring(c.start+d,c.end+d).replace(/_+/g,'').trim();
    if(!NUMF.test(v)&&!(c.txt&&c.txt.test(v)))return false;   // txt: além de número, a coluna aceita SÓ esse texto (ex.: BLOQ) — aceitar qualquer texto deixava linha quebrada "encaixar" deslocada, com números errados
    if(line.substring(c.end+d,nx?nx.start+d:c.end+d+1).trim())return false}      // vão entre colunas = só espaço
  return true}
function findShift(line,cols){
  if(colsOk(line,cols,0))return 0;
  for(const d of [2,1,3,-1,-2,4,-3,-4,5,6,-5,-6])if(colsOk(line,cols,d))return d;
  return null}

/* datas dos relatórios (cabeçalho "Data: dd/mm/aaaa Hora: hh:mm:ss") para a faixa de idade dos dados */
let estoqueMeta=null,transitMeta=null;
function metaOf(t){const d=/Data:\s*(\d{2}\/\d{2}\/\d{4})/.exec(t),h=/Hora:\s*(\d{2}:\d{2}:\d{2})/.exec(t);return{date:d?d[1]:'',hora:h?h[1]:''}}
/* ═══ DADOS (leitura dos relatórios, memória do navegador) ═══ */
const COLS = [
  { key:'st',         start:0,   end:2   },
  { key:'automacao',  start:3,   end:16  },
  { key:'produto',    start:17,  end:25  },
  { key:'descricao',  start:26,  end:66  },
  { key:'emb',        start:66,  end:72  },  // widened to catch right-aligned values
  { key:'referencia', start:72,  end:87  },
  { key:'fornec',     start:88,  end:96  },
  { key:'nome',       start:97,  end:119 },
  { key:'sist',       start:120, end:124 },
  { key:'giro',       start:125, end:129 },
  { key:'corredor',   start:130, end:138 },
  { key:'altura',     start:139, end:146 },
  { key:'largura',    start:147, end:154 },
  { key:'prof',       start:155, end:162 },
  { key:'total',      start:163, end:170 },
  { key:'cobplan',    start:171, end:179 },
  { key:'qtdestoque', start:180, end:191 },
  { key:'pbl',        start:192, end:195 },
];
const RE_ROW = /^[A-Z] \d{8}/;   // linha de produto nos relatórios de Cobertura e de Trânsito

/* Parse Análise de Estoque .txt — colunas de posição fixa */
const ES_NUM=[{start:73,end:84},{start:85,end:91,txt:/^BLOQ$/i},{start:92,end:98},{start:99,end:106}];   // estoque · compra (número OU "BLOQ") · MDV · cobertura
function parseEstoqueFile(text) {
  estoqueMeta = metaOf(text);
  const map = {};
  let cat = '';                                        // categoria vem da linha "Mercadologico: 01.001.010 - A->B->C"
  parseWarn = {realign:0, skip:0};
  for (const line of text.split(/\n/)) {
    const l = line.replace(/\r$/, '');
    const mm = /^\s+Mercadologico:\s*[\d.]+\s*-\s*(.+?)\s*$/.exec(l);
    if (mm) { cat = mm[1]; continue; }
    if (!RE_ROW.test(l)) continue;
    const d = findShift(l, ES_NUM);                    // linha deslocada? realinha ou ignora
    if (d === null) { parseWarn.skip++; continue; }
    if (d !== 0) parseWarn.realign++;
    const produto = l.substring(2, 10).trim();
    const parse  = (s, e) => parseFloat((l.substring(s + d, e + d) || '0').replace(/\./g, '').replace(',', '.')) || 0;
    map[produto] = {
      estq:   parse(73, 84),
      compra: parse(85, 91),
      bloq:   /BLOQ/i.test(l.substring(85 + d, 91 + d)),   // item bloqueado para compra
      mdv:    parse(92, 98),
      cob:    parse(99, 106),
      cl:     l.substring(107 + d, 109 + d).trim(),
      vda12:  parse(110, 124),
      sist:   l.substring(68 + d, 72 + d).trim().replace(/^0+(?=\d)/, ''),   // tipo de entrega: 1 CD · 10 forn. via CD · 20 fornecedor
      d:      l.substring(11 + d, 46 + d).trim(),                              // descrição (p/ itens que não estão no planograma)
      r:      l.substring(47 + d, 62 + d).trim(),
      f:      l.substring(167 + d, 193 + d).trim(),
      c:      cat,
      ue:     l.substring(194 + d, 202 + d).trim(),                            // última entrada (dd/mm/aa)
      uv:     l.substring(214 + d, 222 + d).trim(),                            // última venda (dd/mm/aa)
    };
  }
  return map;
}

/* Trânsito: só a quantidade a caminho é usada (MDV e cobertura vêm sempre do relatório de Cobertura) */
function parseTransitFile(text) {
  transitMeta = metaOf(text);
  const map = {};
  // pt-BR: "1.234,50" → remove o ponto de milhar e troca a vírgula por ponto
  const num = str => parseFloat((str || '0').trim().replace(/\./g, '').replace(',', '.')) || 0;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!RE_ROW.test(line)) continue;
    const produto = line.substring(2, 10).trim();
    // Lê pelo padrão do texto (Sist, Estoque, MDV, Cobert, Cl, Qt.Trânsito, Ped.Pend)
    // — acentos/caracteres especiais na descrição deslocam as colunas fixas.
    const m = /\s\d{2}\s+(-?[\d.]*,\d{2})\s+(\d+)\s+(\d+)\s+[A-Z]{1,2}\s+(-?[\d.]*,\d{2})\s+(-?[\d.]*,\d{2})/
              .exec(line.substring(45));
    const qt_transito = m ? num(m[4]) : num(line.substring(105, 116));   // fallback: posição fixa
    map[produto] = { qt_transito };
  }
  return map;
}

const RE_CAT    = /^\s{2,}\d{2}\.\d{3}\.\d{3}\.\d{3}\s+(.+)/;
const RE_PLANO  = /^([A-Z])\s{2}(\d{13})/;   // linha de produto no relatório de Planograma
const RE_DATE   = /Data:\s*([\d/]+)/;
const RE_FILIAL = /Filial:\s*(.+?)\s{3,}/;
const RE_HORA   = /Hora:\s*([\d:]+)/;

/* ────────────────────────────────────────────────────────
   PARSER
──────────────────────────────────────────────────────── */
function extractField(line, col) {
  if (line.length <= col.start) return '';
  return (line.substring(col.start, col.end) || '').trim();
}

function parseLine(line) {
  const row = {};
  for (const col of COLS) row[col.key] = extractField(line, col);
  return row;
}

const PL_NUM = COLS.filter(c => ['corredor','altura','largura','prof','total','cobplan','qtdestoque'].includes(c.key));
function parseFile(text) {
  parseWarn = {realign:0, skip:0};
  const lines = text.split(/\r?\n/);
  const records = [];
  let currentCat = '';
  let metaDate = '', metaFilial = '', metaHora = '';

  for (const line of lines) {
    if (!metaDate)   { const m = RE_DATE.exec(line);   if (m) metaDate   = m[1]; }
    if (!metaHora)   { const m = RE_HORA.exec(line);   if (m) metaHora   = m[1]; }
    if (!metaFilial) {
      const m = RE_FILIAL.exec(line);
      if (m) metaFilial = m[1].replace(/CONDOR SUPER CENTER LTDA\.\s*/i,'').trim();
    }
    const catM = RE_CAT.exec(line);
    if (catM) { currentCat = catM[1].trim(); continue; }
    if (RE_PLANO.test(line)) {
      const row = parseLine(line);
      const d = findShift(line, PL_NUM);               // linha deslocada? realinha ou ignora
      if (d === null) { parseWarn.skip++; continue; }
      if (d !== 0) { parseWarn.realign++; for (const col of COLS) if (col.start >= 120) row[col.key] = extractField(line, {start:col.start + d, end:col.end + d}); }
      row.categoria = currentCat;
      ['corredor','altura','largura','prof','total','cobplan','qtdestoque'].forEach(k => {
        if (row[k]) row[k] = row[k].replace(/_+/g,'').trim();
      });
      records.push(row);
    }
  }
  return { records, meta:{ date:metaDate, filial:metaFilial, hora:metaHora } };
}
