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
