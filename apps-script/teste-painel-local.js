// Prévia local do painel do aluno: serve o site em http://localhost:8092 e simula o Apps Script em /exec,
// rodando o MESMO código de plano-de-embarque.gs. As abas viram saida-painel.json.
// Uso: node apps-script/teste-painel-local.js   e abra http://localhost:8092/meu-embarque.html?endpoint=/exec
const http = require("http"), fs = require("fs"), path = require("path"), vm = require("vm");
const raiz = path.join(__dirname, "..");
const PORTA = Number(process.env.PORT || 8092);
const abas = {};
const grava = () => fs.writeFileSync(path.join(__dirname, "saida-painel.json"), JSON.stringify(abas, null, 1));
function aba(nome) {
  const L = abas[nome];
  return {
    getLastRow: () => L.length,
    getLastColumn: () => (L[0] || []).length,
    clearContents: () => { L.length = 0; },
    appendRow: l => { L.push(l.slice()); grava(); },
    setFrozenRows() {},
    getRange(row, col, nr = 1, nc = 1) {
      return {
        getValue: () => (L[row - 1] || [])[col - 1],
        getValues: () => { const o = []; for (let i = 0; i < nr; i++) o.push((L[row - 1 + i] || []).slice(col - 1, col - 1 + nc)); return o; },
        setValues: v => { v.forEach((l, i) => { L[row - 1 + i] = l.slice(); }); grava(); },
        setFontWeight() {},
        createTextFinder: txt => ({ matchEntireCell() { return this; }, findNext() {
          for (let i = 0; i < nr; i++) if ((L[row - 1 + i] || [])[col - 1] === txt) return { getRow: () => row + i };
          return null; } })
      };
    }
  };
}
const ctx = {
  console, JSON, Date, String, Number, RegExp, Math, Array, Object,
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => abas[n] ? aba(n) : null, insertSheet: n => { abas[n] = []; return aba(n); } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
  Session: { getEffectiveUser: () => ({ getEmail: () => "dono@exemplo.com" }) },
  Utilities: { formatDate: d => new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 19).replace("T", " ") },
  MailApp: { sendEmail: o => console.log("E-MAIL:", o.to || "(dono)", "|", o.subject) },
  ContentService: { MimeType: { JSON: "json" }, createTextOutput: t => ({ getContent: () => t, setMimeType() { return this; } }) }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "plano-de-embarque.gs"), "utf8"), ctx);
const tipos = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/exec") {
    if (req.method === "POST") {
      let b = ""; req.on("data", c => b += c); req.on("end", () => {
        const out = ctx.doPost({ postData: { contents: b } }).getContent();
        console.log("POST", out); res.writeHead(200, { "Content-Type": "application/json" }); res.end(out);
      }); return;
    }
    if (url.searchParams.get("carimbos")) { // atalho só da prévia: simula o Augusto escrevendo na coluna carimbos
      const L = abas.Painel || []; const l = L.find(x => x[0] === url.searchParams.get("painel")); if (l) { l[13] = url.searchParams.get("carimbos"); l[18] = url.searchParams.get("contrato") || ""; grava(); }
    }
    if (url.searchParams.get("rotina")) { ctx.rotinaPainel(url.searchParams.get("rotina")); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(abas.Painel)); return; } // só da prévia: roda os avisos como se hoje fosse a data dada
    const out = ctx.doGet({ parameter: Object.fromEntries(url.searchParams) }).getContent();
    res.writeHead(200, { "Content-Type": "application/json" }); res.end(out); return;
  }
  const f = path.join(raiz, decodeURIComponent(url.pathname === "/" ? "/meu-embarque.html" : url.pathname));
  if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "Content-Type": tipos[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(PORTA, () => console.log("Prévia em http://localhost:" + PORTA + "/meu-embarque.html?endpoint=/exec"));
