// Servidor local de prévia: serve o site em http://localhost:8080 e simula o Apps Script em /exec,
// rodando o MESMO código de formulario-v2.gs (planilha vira o arquivo saida-local.jsonl).
// Uso:  CRM_URL="https://..." node apps-script/teste-local.js     (sem CRM_URL, só grava o arquivo)
const http = require("http"), fs = require("fs"), path = require("path"), vm = require("vm");
const { spawnSync } = require("child_process");

const raiz = path.join(__dirname, "..");
const saida = path.join(__dirname, "saida-local.jsonl");
const props = { CRM_URL: process.env.CRM_URL || "" };
const cache = {};

// Planilha simulada em memória (linha 1 = cabeçalho). Cada alteração é registrada em saida-local.jsonl.
const hoja = [["cabecalho"]];
const salvar = () => fs.writeFileSync(saida, hoja.slice(1).map(l => JSON.stringify(l)).join("\n") + "\n");
const aba = {
  getLastRow: () => hoja.length,
  appendRow: l => { hoja.push(l.slice()); salvar(); },
  setFrozenRows() {},
  getRange(row, col, nr = 1, nc = 1) {
    return {
      getValues: () => { const o = []; for (let i = 0; i < nr; i++) o.push((hoja[row - 1 + i] || []).slice(col - 1, col - 1 + nc)); return o; },
      setValues: v => { v.forEach((l, i) => { while (hoja.length < row + i) hoja.push([]); l.forEach((x, j) => { hoja[row - 1 + i][col - 1 + j] = x; }); }); salvar(); },
      setValue: x => { while (hoja.length < row) hoja.push([]); hoja[row - 1][col - 1] = x; salvar(); },
      setFontWeight() {},
      createTextFinder: txt => ({ matchEntireCell() { return this; }, findNext() {
        for (let i = 0; i < nr; i++) if ((hoja[row - 1 + i] || [])[col - 1] === txt) return { getRow: () => row + i };
        return null; } })
    };
  }
};
const ctx = {
  console, JSON, Date, String, Number, RegExp, Math,
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k], put: (k, v) => { cache[k] = v; } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] }) },
  Utilities: {
    getUuid: () => require("crypto").randomUUID(),
    formatDate: (d) => new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 19).replace("T", " ")
  },
  ContentService: { MimeType: { JSON: "json" }, createTextOutput: t => ({ getContent: () => t, setMimeType() { return this; } }) },
  Logger: { log: console.log },
  UrlFetchApp: {
    fetch(url, o) {
      const r = spawnSync("curl", ["-s", "-w", "\n%{http_code}", "-X", "POST", "-H", "Content-Type: application/json", "-d", o.payload, url], { encoding: "utf8" });
      const partes = r.stdout.trim().split("\n"); const code = Number(partes.pop());
      return { getResponseCode: () => code, getContentText: () => partes.join("\n") };
    }
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({ getSheetByName: () => aba })
  }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "formulario-v2.gs"), "utf8"), ctx);

const tipos = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/exec") {
    let corpo = ""; req.on("data", c => corpo += c);
    req.on("end", () => {
      const saidaApps = vm.runInContext("doPost", ctx)({ postData: { contents: corpo } });
      console.log("POST /exec ->", saidaApps.getContent());
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); res.end(saidaApps.getContent());
    });
    return;
  }
  let arq = path.join(raiz, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
  if (!fs.existsSync(arq) && fs.existsSync(arq + ".html")) arq += ".html";
  if (!arq.startsWith(raiz) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "application/octet-stream" });
  fs.createReadStream(arq).pipe(res);
}).listen(8080, () => console.log("Prévia em http://localhost:8080/aplicacao  (Apps Script simulado em /exec)"));
