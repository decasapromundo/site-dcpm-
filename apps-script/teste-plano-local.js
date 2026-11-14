// Prévia local do Plano de Embarque: serve o site em http://localhost:8091 e simula o Apps Script em /exec,
// rodando o MESMO código de plano-de-embarque.gs. A planilha vira saida-plano.jsonl e o e-mail vira saida-email-plano.html.
// Uso: node apps-script/teste-plano-local.js   e abra http://localhost:8091/plano-de-embarque.html?endpoint=/exec
const http = require("http"), fs = require("fs"), path = require("path"), vm = require("vm");
const raiz = path.join(__dirname, "..");
const PORTA = Number(process.env.PORT || 8091);
const linhas = [];
const aba = {
  getLastRow: () => linhas.length + 1,
  appendRow: l => { linhas.push(l.slice()); grava(); },
  setFrozenRows() {},
  getRange(row, col, nr = 1, nc = 1) {
    return {
      getValue: () => (linhas[row - 2] || [])[col - 1],
      setValues: v => { linhas[row - 2] = v[0].slice(); grava(); },
      setFontWeight() {},
      createTextFinder: txt => ({ matchEntireCell() { return this; }, findNext() {
        const i = linhas.findIndex(l => l[col - 1] === txt); return i < 0 ? null : { getRow: () => i + 2 }; } })
    };
  }
};
function grava() { fs.writeFileSync(path.join(__dirname, "saida-plano.jsonl"), linhas.map(l => JSON.stringify(l)).join("\n") + "\n"); }
const ctx = {
  console, JSON, Date, String, Number, RegExp, Math, Array,
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => aba }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
  Session: { getEffectiveUser: () => ({ getEmail: () => "dono-do-script@exemplo.com" }) },
  Utilities: { formatDate: d => new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 19).replace("T", " ") },
  MailApp: { sendEmail: o => { fs.writeFileSync(path.join(__dirname, "saida-email-plano.html"), `<!-- para: ${o.to} | responder para: ${o.replyTo} | assunto: ${o.subject} -->\n` + o.htmlBody); console.log("E-MAIL:", o.subject, "->", o.to, "reply:", o.replyTo); } },
  ContentService: { MimeType: { JSON: "json" }, createTextOutput: t => ({ getContent: () => t, setMimeType() { return this; } }) }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "plano-de-embarque.gs"), "utf8"), ctx);
const tipos = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Headers": "*" }); res.end(); return; }
  if (url.pathname === "/exec" && req.method === "POST") {
    let b = ""; req.on("data", c => b += c); req.on("end", () => {
      const out = ctx.doPost({ postData: { contents: b } });
      console.log("POST /exec", out.getContent()); res.writeHead(200, { "Content-Type": "application/json" }); res.end(out.getContent());
    }); return;
  }
  const f = path.join(raiz, decodeURIComponent(url.pathname === "/" ? "/plano-de-embarque.html" : url.pathname));
  if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "Content-Type": tipos[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(PORTA, () => console.log("Prévia em http://localhost:" + PORTA + "/plano-de-embarque.html?endpoint=/exec"));
