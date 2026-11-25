/* Planograma Mobile — ESTADO DOS DADOS + memória do aparelho (IndexedDB e concluídos no localStorage).
   Ordem de carregamento (index.html): leitura → estado → base → telas → encarte → oferta → pedido → arquivos → nuvem.
   Todos são scripts comuns que compartilham o mesmo escopo global, então a ORDEM importa. */

let transitMap = {};   // { produto_code → { qt_transito } }
let transitLoaded = false;
/* Análise de Estoque (relatório com MDV e cobertura reais) */
let estoqueMap={},estoqueLoaded=false;

const IDB_NAME    = 'PlanogramaDB';
const IDB_VERSION = 1;
const IDB_STORE   = 'files';

let idb = null; // will hold the opened IDBDatabase

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath:'id' });
    };
    req.onsuccess = e => { idb = e.target.result; resolve(idb); };
    req.onerror   = e => reject(e.target.error);
  });
}

function idbSave(record) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(record);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

function idbGet(id) {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}

let lsKey  = 'planograma_done_default';
let doneSet = new Set();

/* v83: "dia novo" de verdade = já havia um planograma de OUTRO dia neste aparelho e o novo é de data MAIOR.
   Aparelho novo (chave padrão), dados limpos ou arquivo mais antigo NÃO limpam os concluídos (antes apagava os do Pedido de todos). */
const dataNum=s=>{const m=/(\d\d)\/(\d\d)\/(\d{4})/.exec(String(s||''));return m?+(m[3]+m[2]+m[1]):0};
const diaNovo=(kA,mA,mN)=>!!kA&&kA!=='planograma_done_default'&&kA!==lsKey&&dataNum(mN&&mN.date)>dataNum(mA&&mA.date)&&dataNum(mA&&mA.date)>0;
function lsKeyFor(filial, date) {
  const slug = (filial + '_' + date).replace(/[^a-zA-Z0-9]/g,'_').toLowerCase();
  return 'planograma_done_' + (slug || 'default');
}

function lsLoad()  {
  try { doneSet = new Set(JSON.parse(localStorage.getItem(lsKey) || '[]')); }
  catch { doneSet = new Set(); }
}
function lsSave()  {
  try { localStorage.setItem(lsKey, JSON.stringify([...doneSet])); } catch {}
  // Write to Firebase live/done (fire-and-forget — UI already updated locally)
  cloudWriteDone();
}
function lsClear() {
  doneSet.clear();
  try { localStorage.removeItem(lsKey); } catch {}
  cloudWriteDone();
}

let allRecords=[],planoRecs=[];   // planoRecs = só o que veio do planograma · allRecords = planograma + itens só da Cobertura
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* v72 — ABERTURA: abre o banco e já pede ao aparelho os registros da abertura enquanto o Framework7 ainda está iniciando.
   O boot() (nuvem.js) usa estas mesmas promessas. */
const BOOT_IDS=['carimbo','estoque','transitmeta','encarte','current',...[0,1,2,3,4,5,6].flatMap(w=>['oferta-d'+w,'panfleto-d'+w])];
const bootPre=(async()=>{try{await idbOpen()}catch{}const m=new Map();
  if(idb)for(const id of BOOT_IDS)m.set(id,new Promise(r=>{try{idbGet(id).then(r,()=>r(null))}catch{r(null)}}));return m})();
