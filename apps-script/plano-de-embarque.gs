/**
 * Plano de Embarque: recebe o POST do formulário do site (plano-de-embarque.html),
 * grava na planilha e manda as respostas organizadas por e-mail.
 * E-mail de destino: propriedade do script EMAIL_AVISO; sem ela, vai para a conta dona do script.
 */

var ABA = "Respostas";
var COLUNAS = ["data_hora", "status", "id", "servico", "nome", "email", "whatsapp", "cidade", "nascimento",
  "departamento", "posicoes", "ingles", "passaporte", "stcw", "visto", "tatuagem", "experiencias", "respostas_json"];

var SECOES = [
  ["Contato", [["Nome", "nome"], ["E-mail", "email"], ["WhatsApp", "whatsapp"], ["Serviço", "servico"], ["Cidade", "cidade"], ["Nascimento", "nascimento"]]],
  ["Objetivo", [["Departamento", "departamento"], ["Cargos de interesse", "posicoes"], ["O que quer resolver na consultoria", "resolver"], ["O que motiva", "motivador"], ["Maior barreira", "desafio"], ["Por que contratou", "porque_contratou"]]],
  ["Experiências", "EXP"],
  ["Formação e habilidades", [["Pausas acima de 6 meses", "pausas"], ["Formação", "formacao"], ["Certificações", "certificacoes"], ["Habilidades", "habilidades"], ["Voluntário", "voluntario"]]],
  ["Idiomas", [["Inglês", "ingles"], ["Prova do inglês", "ingles_prova"], ["Outros idiomas", "outros_idiomas"]]],
  ["Documentos", [["Passaporte", "passaporte"], ["Validade do passaporte", "passaporte_validade"], ["STCW", "stcw"], ["Validade do STCW", "stcw_validade"], ["Visto C1/D", "visto"], ["Tatuagem", "tatuagem"]]],
  ["Entrevista", [["Por que navio", "porque_navio"], ["O que sabe da vida a bordo", "o_que_sabe"], ["Pontos fortes e fraqueza", "fortes_fraqueza"], ["Sob pressão", "pressao"], ["Cliente ou momento difícil", "cliente_dificil"], ["Daqui a 5 anos", "cinco_anos"], ["Salário esperado (US$ por mês)", "salario"]]]
];
var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function doGet(e) {
  var id = e && e.parameter && e.parameter.painel;
  if (id) return painelLer_(String(id));
  return ContentService.createTextOutput("Plano de Embarque no ar.");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var c = JSON.parse(e.postData.contents);
    if (c.site) return resposta_({ ok: true }); // campo isca preenchido: robô
    if (c.tipo === "painel") return painelSalvar_(c);
    var d = c.dados || {};
    if (!c.id || !d.nome || !d.email) return resposta_({ ok: false, erro: "dados incompletos" });
    var aba = aba_();
    var linha = montarLinha_(c, d);
    var numero = acharLinha_(aba, c.id);
    if (numero) {
      var statusAtual = aba.getRange(numero, 2).getValue();
      if (statusAtual === "enviado" && c.tipo !== "final") return resposta_({ ok: true, ignorado: true });
      aba.getRange(numero, 1, 1, COLUNAS.length).setValues([linha]);
    } else {
      aba.appendRow(linha);
    }
    if (c.tipo === "final") enviarEmail_(d);
    return resposta_({ ok: true });
  } catch (err) {
    console.error(err);
    return resposta_({ ok: false, erro: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function montarLinha_(c, d) {
  var v = {
    data_hora: Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd HH:mm:ss"),
    status: c.tipo === "final" ? "enviado" : "começou",
    id: c.id, experiencias: (d.experiencias || []).map(expTexto_).join("\n\n"),
    respostas_json: JSON.stringify(d)
  };
  return COLUNAS.map(function (k) { return limpar_(k in v ? v[k] : d[k]); });
}

function limpar_(x) {
  if (x == null) return "";
  if (Array.isArray(x)) x = x.join(", ");
  x = String(x).slice(0, 45000);
  return /^[=+\-@]/.test(x) ? "'" + x : x; // evita fórmula na planilha
}

function periodo_(x) {
  var ini = x.mes_ini ? MESES[Number(x.mes_ini) - 1] + "/" + x.ano_ini : "?";
  var fim = x.atual ? "atual" : (x.mes_fim ? MESES[Number(x.mes_fim) - 1] + "/" + x.ano_fim : "?");
  return ini + " até " + fim;
}

function expTexto_(x) {
  return [x.cargo + " | " + x.empresa + (x.local ? " | " + x.local : ""), periodo_(x) + " (" + x.tipo + ")",
    "Dia a dia: " + x.tarefas, x.marcante ? "Situação marcante: " + x.marcante : ""].filter(String).join("\n");
}

function esc_(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

function valor_(d, k) {
  var v = d[k];
  if (Array.isArray(v)) v = v.join(", ");
  return v && String(v).trim() ? v : "";
}

function htmlEmail_(d) {
  var navy = "#1D3557", gold = "#E8AB00";
  var h = '<div style="font-family:Arial,sans-serif;max-width:680px;color:#2E2E2E">';
  h += '<div style="background:' + navy + ';color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">' +
    '<div style="color:' + gold + ';font-size:12px;font-weight:bold;letter-spacing:2px">PLANO DE EMBARQUE</div>' +
    '<div style="font-size:22px;font-weight:bold;margin-top:4px">' + esc_(d.nome) + '</div>' +
    '<div style="font-size:14px;color:#C9D2DE;margin-top:4px">' + esc_(d.servico) + ' | ' + esc_(d.departamento) + ' | Inglês: ' + esc_(d.ingles) + '</div></div>';
  h += '<div style="border:1px solid #E4E1D8;border-top:none;padding:8px 24px 20px;border-radius:0 0 10px 10px">';
  SECOES.forEach(function (s) {
    h += '<h3 style="color:' + navy + ';border-bottom:2px solid ' + gold + ';padding-bottom:4px;margin:22px 0 10px;font-size:16px">' + s[0] + '</h3>';
    if (s[1] === "EXP") {
      if (d.sem_experiencia) { h += '<p>Ainda não tem experiência de trabalho.</p>'; return; }
      (d.experiencias || []).forEach(function (x, i) {
        h += '<div style="background:#FAF6EE;border-left:4px solid ' + gold + ';padding:10px 14px;margin-bottom:10px;border-radius:4px">' +
          '<b>' + (i + 1) + '. ' + esc_(x.cargo) + '</b> | ' + esc_(x.empresa) + (x.local ? ' | ' + esc_(x.local) : '') +
          '<div style="color:#6B7C8D;font-size:13px;margin:2px 0 6px">' + esc_(periodo_(x)) + ' (' + esc_(x.tipo) + ')</div>' +
          '<div><b>Dia a dia:</b> ' + esc_(x.tarefas) + '</div>' +
          (x.marcante ? '<div style="margin-top:6px"><b>Situação marcante:</b> ' + esc_(x.marcante) + '</div>' : '') + '</div>';
      });
      return;
    }
    s[1].forEach(function (par) {
      var v = valor_(d, par[1]);
      h += '<p style="margin:0 0 10px"><b style="color:' + navy + '">' + par[0] + ':</b> ' + (v ? esc_(v) : '<span style="color:#7A8696">em branco</span>') + '</p>';
    });
  });
  h += '<p style="color:#7A8696;font-size:12px;margin-top:24px">Responda este e-mail para falar direto com ' + esc_(d.nome) + '. As respostas também estão na planilha.</p></div></div>';
  return h;
}

function textoEmail_(d) {
  var t = "PLANO DE EMBARQUE: " + d.nome + "\n";
  SECOES.forEach(function (s) {
    t += "\n== " + s[0] + " ==\n";
    if (s[1] === "EXP") { t += d.sem_experiencia ? "Sem experiência\n" : (d.experiencias || []).map(expTexto_).join("\n\n") + "\n"; return; }
    s[1].forEach(function (par) { t += par[0] + ": " + (valor_(d, par[1]) || "em branco") + "\n"; });
  });
  return t;
}

function enviarEmail_(d) {
  var para = PropertiesService.getScriptProperties().getProperty("EMAIL_AVISO") || Session.getEffectiveUser().getEmail();
  var opcoes = { to: para, name: "Plano de Embarque", subject: "Plano de Embarque: " + d.nome + " (" + (d.servico || "") + ")",
    htmlBody: htmlEmail_(d), body: textoEmail_(d) };
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(d.email || "").trim())) opcoes.replyTo = String(d.email).trim();
  MailApp.sendEmail(opcoes);
}

function aba_() {
  var pl = SpreadsheetApp.getActiveSpreadsheet();
  var aba = pl.getSheetByName(ABA);
  if (!aba) {
    aba = pl.insertSheet(ABA);
    aba.appendRow(COLUNAS);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, COLUNAS.length).setFontWeight("bold");
  }
  return aba;
}

function acharLinha_(aba, id) {
  var ultima = aba.getLastRow();
  if (ultima < 2) return 0;
  var achou = aba.getRange(2, 3, ultima - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return achou ? achou.getRow() : 0;
}

function resposta_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Painel do aluno (meu-embarque.html) ----------
 * Aba "Painel": uma linha por aluno. O aluno grava o progresso; a coluna "carimbos" é sua:
 * escreva ali os carimbos entregues (ex.: 1,2) e eles aparecem no painel dele. */
var ABA_PAINEL = "Painel";
var COL_PAINEL = ["id", "nome", "plano", "email", "whatsapp", "inicio", "fim", "situacao", "meta_embarque", "cargo", "proximo_passo",
  "itens_feitos", "nivel_ingles", "ingles", "carimbos", "candidaturas", "detalhe_candidaturas", "documentos", "anotacoes", "link", "contrato",
  "termos", "atualizado", "criado",
  "avisos", "dados_json"];
// Colunas que o Augusto edita ou que guardam data: voltam para a planilha do jeito que estão.
var CRUAS_PAINEL = ["carimbos", "contrato", "inicio", "fim", "criado", "avisos"];
var LINK_PAINEL = "https://decasapromundo.com/meu-embarque?a=";
var DOCS_PAINEL = [["passaporte", "Passaporte"], ["stcw", "STCW"], ["visto", "Visto C1/D"], ["medico", "Exame médico"],
  ["vacinas", "Vacinas"], ["antecedentes", "Antecedentes"]];
var CARIMBOS_PAINEL = ["Plano de Embarque pronto", "Primeira aplicação", "Entrevista marcada", "Aprovação na entrevista",
  "Embarque marcado", "A bordo"];
var DIAS_PARA_EXPIRAR = 1825; // cinco anos, como está nos termos de uso // depois do fim da consultoria, os dados do aluno são apagados

function abaPainel_() {
  var pl = SpreadsheetApp.getActiveSpreadsheet();
  var aba = pl.getSheetByName(ABA_PAINEL);
  if (!aba) {
    aba = pl.insertSheet(ABA_PAINEL);
    aba.appendRow(COL_PAINEL);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, COL_PAINEL.length).setFontWeight("bold");
    return aba;
  }
  // Se as colunas mudaram de uma versão para outra, reorganiza as linhas que já existem pelo nome da coluna.
  var larg = aba.getLastColumn(), alt = aba.getLastRow();
  var cab = aba.getRange(1, 1, 1, larg).getValues()[0];
  if (cab.join("|") !== COL_PAINEL.join("|")) {
    var todas = aba.getRange(1, 1, alt, larg).getValues();
    var novas = todas.map(function (l, i) {
      if (i === 0) return COL_PAINEL;
      return COL_PAINEL.map(function (k) {
        if (k === "link") return LINK_PAINEL + l[0];
        var j = cab.indexOf(k); return j > -1 ? l[j] : "";
      });
    });
    aba.clearContents();
    aba.getRange(1, 1, novas.length, COL_PAINEL.length).setValues(novas);
    aba.getRange(1, 1, 1, COL_PAINEL.length).setFontWeight("bold");
  }
  return aba;
}

function linhaPainel_(aba, id) {
  var ultima = aba.getLastRow();
  if (ultima < 2) return 0;
  var achou = aba.getRange(2, 1, ultima - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return achou ? achou.getRow() : 0;
}

function idPainelValido_(id) { return /^[a-z0-9-]{10,40}$/.test(String(id || "")); }
function emailValido_(x) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x || "").trim()); }
function agora_() { return Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd HH:mm:ss"); }
function hoje_() { return agora_().slice(0, 10); }

/* Datas. Por dentro tudo é "aaaa-mm-dd"; a célula da planilha pode vir como data ou como texto. */
function iso_(v) {
  if (Object.prototype.toString.call(v) === "[object Date]") {
    return Utilities.formatDate(v, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd");
  }
  var s = String(v || "").trim(), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return m[1] + "-" + m[2] + "-" + m[3];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  return m ? m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2) : "";
}
function dataBR_(iso) {
  var p = String(iso || "").split("-");
  return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : "";
}
function somar_(iso, dias, meses) {
  var p = iso.split("-");
  return new Date(Date.UTC(+p[0], +p[1] - 1 + (meses || 0), +p[2] + (dias || 0))).toISOString().slice(0, 10);
}
function diasEntre_(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); }
/* Duração de cada plano: Sprint 30 dias, Premium 90 dias, VIP 12 meses. */
function fim_(inicio, plano) {
  if (!inicio) return "";
  if (/VIP/i.test(plano)) return somar_(inicio, 0, 12);
  if (/Sprint/i.test(plano)) return somar_(inicio, 30);
  return somar_(inicio, 90);
}
function avisos_(v) { try { return JSON.parse(v || "{}") || {}; } catch (x) { return {}; } }

function painelLer_(id) {
  if (!idPainelValido_(id)) return resposta_({ ok: false, erro: "id" });
  var aba = abaPainel_();
  var n = linhaPainel_(aba, id);
  if (!n) return resposta_({ ok: true, existe: false });
  var l = aba.getRange(n, 1, 1, COL_PAINEL.length).getValues()[0];
  var c = function (k) { return l[COL_PAINEL.indexOf(k)]; };
  if (c("situacao") === "expirado") return resposta_({ ok: true, existe: true, expirado: true });
  var dados = {};
  try { dados = JSON.parse(c("dados_json") || "{}"); } catch (x) {}
  var inicio = iso_(c("inicio")) || iso_(c("criado"));
  return resposta_({ ok: true, existe: true, dados: dados, carimbos: String(c("carimbos") || ""), contrato: String(c("contrato") || ""),
    inicio: inicio, fim: fim_(inicio, String(c("plano") || dados.plano || "")) });
}

function painelSalvar_(c) {
  if (!idPainelValido_(c.id)) return resposta_({ ok: false, erro: "id" });
  var d = c.dados || {};
  var json = JSON.stringify(d);
  if (json.length > 40000) return resposta_({ ok: false, erro: "grande demais" });
  var cands = Array.isArray(d.candidaturas) ? d.candidaturas : [];
  var aba = abaPainel_();
  var n = linhaPainel_(aba, c.id);
  var antiga = n ? aba.getRange(n, 1, 1, COL_PAINEL.length).getValues()[0] : null;
  var col = function (k) { return antiga ? antiga[COL_PAINEL.indexOf(k)] : ""; };
  if (col("situacao") === "expirado") return resposta_({ ok: false, erro: "expirado" });
  var meta = String(d.meta || "").split("-");
  var docs = d.docs || {};
  var inicio = iso_(col("inicio")) || iso_(col("criado")) || hoje_();
  var fim = fim_(inicio, String(d.plano || ""));
  var av = avisos_(col("avisos"));
  var email = String(d.email || "").trim();
  if (!av.bv && emailValido_(email) && d.nome) {
    try { emailBoasVindas_(email, d.nome, LINK_PAINEL + c.id, fim); av.bv = hoje_(); } catch (x) { console.error(x); }
  }
  var v = {
    id: c.id, criado: antiga ? col("criado") : agora_(), atualizado: agora_(),
    nome: d.nome, plano: d.plano, email: email, whatsapp: d.whatsapp,
    inicio: antiga && col("inicio") ? col("inicio") : inicio, fim: fim, situacao: hoje_() > fim ? "encerrada" : "ativa",
    proximo_passo: c.proximo, itens_feitos: Object.keys(d.feitos || {}).length,
    ingles: Array.isArray(d.ingles) && d.ingles.length ? d.ingles.length + (d.ingles.length === 1 ? " dia" : " dias") + " de prática (último em " + dataBR_(d.ingles[d.ingles.length - 1]) + ")" : "",
    meta_embarque: meta.length === 2 ? MESES[Number(meta[1]) - 1] + " de " + meta[0] : "", cargo: d.cargo,
    candidaturas: cands.length,
    detalhe_candidaturas: cands.map(function (x) {
      return [x.onde, x.cargo, dataBR_(x.data), x.status].filter(function (t) { return t; }).join(" · ");
    }).join("\n"),
    documentos: DOCS_PAINEL.map(function (k) {
      var x = docs[k[0]] || {};
      return k[1] + ": " + (x.status || "sem resposta") + (x.validade && dataBR_(x.validade) ? " (válido até " + dataBR_(x.validade) + ")" : "");
    }).join("\n"),
    nivel_ingles: { basico: "Básico", intermediario: "Intermediário", avancado: "Avançado" }[d.nivel] || "", anotacoes: d.notas, termos: dataBR_(d.termos) ? "aceitos em " + dataBR_(d.termos) : "",
    link: LINK_PAINEL + c.id,
    carimbos: col("carimbos"), contrato: col("contrato"), avisos: JSON.stringify(av), dados_json: json
  };
  var linha = COL_PAINEL.map(function (k) { return CRUAS_PAINEL.indexOf(k) > -1 ? v[k] : limpar_(v[k]); });
  if (n) aba.getRange(n, 1, 1, COL_PAINEL.length).setValues([linha]); else aba.appendRow(linha);
  return resposta_({ ok: true });
}

/* ---------- E-mails para o aluno ---------- */
function escP_(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function primeiroNome_(nome) { return String(nome || "").trim().split(/\s+/)[0] || ""; }

function emailPainel_(para, assunto, nome, paragrafos, botao, link) {
  var p = function (t) { return '<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#13233b">' + t + "</p>"; };
  var html = '<div style="background:#ffffff;padding:24px 16px;font-family:Arial,Helvetica,sans-serif">' +
    '<div style="max-width:520px;margin:0 auto">' + p("Oi, " + escP_(primeiroNome_(nome)) + ".") +
    paragrafos.map(function (t) { return p(escP_(t)); }).join("") +
    '<p style="margin:26px 0"><a href="' + escP_(link) + '" style="display:inline-block;background:#13233b;color:#ffffff;' +
    'text-decoration:none;font-weight:bold;font-size:16px;padding:14px 26px;border-radius:999px">' + escP_(botao) + "</a></p>" +
    '<p style="margin:0;font-size:14px;line-height:1.5;color:#5b6676">Augusto<br>De Casa Pro Mundo</p></div></div>';
  var texto = "Oi, " + primeiroNome_(nome) + ".\n\n" + paragrafos.join("\n\n") + "\n\n" + botao + ": " + link + "\n\nAugusto\nDe Casa Pro Mundo";
  MailApp.sendEmail({ to: para, subject: assunto, htmlBody: html, body: texto, name: "Augusto | De Casa Pro Mundo" });
}

function emailBoasVindas_(para, nome, link, fim) {
  emailPainel_(para, "Seu painel de embarque está aqui", nome, [
    "Este é o link do seu painel. Guarde este e-mail: se você trocar de celular ou perder o link, é por aqui que você volta.",
    "No painel você vê o seu próximo passo, anota as candidaturas e acompanha os documentos.",
    "Sua consultoria vai até " + dataBR_(fim) + "."
  ], "Abrir meu painel", link);
}

/* Aviso no celular (OneSignal), para quem ativou os avisos no painel. A chave secreta fica na propriedade do script ONESIGNAL_KEY. */
var ONESIGNAL_APP = "2651117a-bf3d-4320-9e39-43d67fca5665";
function push_(id, titulo, texto, link) {
  try {
    var chave = PropertiesService.getScriptProperties().getProperty("ONESIGNAL_KEY");
    if (!chave) return "sem chave";
    var r = UrlFetchApp.fetch("https://api.onesignal.com/notifications", {
      method: "post", contentType: "application/json", muteHttpExceptions: true, headers: { Authorization: "Key " + chave },
      payload: JSON.stringify({ app_id: ONESIGNAL_APP, target_channel: "push", include_aliases: { external_id: [String(id)] },
        headings: { en: titulo, pt: titulo }, contents: { en: texto, pt: texto }, url: link })
    });
    return r.getResponseCode() + " " + r.getContentText().slice(0, 300);
  } catch (x) { console.error(x); return String(x); }
}
/* Manda o mesmo aviso por e-mail (se houver e-mail) e para o celular. */
function avisar_(id, para, assunto, nome, paragrafos, botao, link) {
  if (emailValido_(para)) emailPainel_(para, assunto, nome, paragrafos, botao, link);
  push_(id, assunto, paragrafos[0], link);
}
/* Teste no editor: manda um aviso de celular para o painel mexido por último. O resultado aparece no registro de execução. */
function testarPush() {
  var aba = abaPainel_(), ult = aba.getLastRow();
  if (ult < 2) { console.log("Nenhum painel na planilha."); return; }
  var I = {}; COL_PAINEL.forEach(function (k, i) { I[k] = i; });
  var linhas = aba.getRange(2, 1, ult - 1, COL_PAINEL.length).getValues().filter(function (l) { return l[I.id] && l[I.situacao] !== "expirado"; });
  linhas.sort(function (a, b) { return String(iso_(b[I.atualizado]) + b[I.atualizado]) > String(iso_(a[I.atualizado]) + a[I.atualizado]) ? 1 : -1; });
  var l = linhas[0];
  console.log("Painel: " + l[I.nome] + " | resposta: " + push_(l[I.id], "Teste do Meu Embarque", "Se você está vendo isto, os avisos no celular estão funcionando.", l[I.link]));
}

/* Roda de hora em hora (ver ligarAvisos). Confere contrato e carimbos novos, prazo, aluno parado e painel expirado.
   Cada aviso sai uma vez só: o que já foi mandado fica anotado na coluna "avisos". */
function rotinaPainel(hojeTeste) {
  var teste = typeof hojeTeste === "string";
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var hoje = teste ? hojeTeste : hoje_();
    var hora = Number(agora_().slice(11, 13));
    var horaBoa = teste || (hora >= 9 && hora < 20); // lembretes só saem em horário comercial
    var aba = abaPainel_(), ult = aba.getLastRow();
    if (ult < 2) return;
    var I = {}; COL_PAINEL.forEach(function (k, i) { I[k] = i; });
    var linhas = aba.getRange(2, 1, ult - 1, COL_PAINEL.length).getValues();
    linhas.forEach(function (l, n) {
      if (!l[I.id] || l[I.situacao] === "expirado") return;
      var antes = JSON.stringify(l);
      var plano = String(l[I.plano] || ""), inicio = iso_(l[I.inicio]) || iso_(l[I.criado]), fim = fim_(inicio, plano);
      if (fim && diasEntre_(fim, hoje) > DIAS_PARA_EXPIRAR) { // apaga os dados do aluno, guarda só o registro de que existiu
        COL_PAINEL.forEach(function (k) { if (["id", "plano", "inicio", "fim", "criado"].indexOf(k) < 0) l[I[k]] = ""; });
        l[I.situacao] = "expirado";
        aba.getRange(n + 2, 1, 1, COL_PAINEL.length).setValues([l]);
        return;
      }
      if (iso_(l[I.fim]) !== fim) l[I.fim] = fim;
      var situacao = fim && hoje > fim ? "encerrada" : "ativa";
      if (l[I.situacao] !== situacao) l[I.situacao] = situacao;

      var para = String(l[I.email] || "").trim(), nome = l[I.nome], link = String(l[I.link] || LINK_PAINEL + l[I.id]);
      var av = avisos_(l[I.avisos]), proximo = String(l[I.proximo_passo] || "");
      {
        try {
          var ct = String(l[I.contrato] || "").trim();
          if (/^https:\/\/\S+$/.test(ct) && av.contrato !== ct) {
            avisar_(l[I.id], para, "Seu contrato está no painel", nome, [
              "Coloquei o seu contrato no painel.", "Abre, lê com calma e assina por lá."], "Abrir meu painel", link);
            av.contrato = ct;
          }
          var nums = String(l[I.carimbos] || "").split(/[^0-9]+/).map(Number).filter(function (x) { return x >= 1 && x <= 6; });
          var ja = av.carimbos || [];
          var novos = nums.filter(function (x) { return ja.indexOf(x) < 0; });
          if (novos.length) {
            avisar_(l[I.id], para, "Carimbo novo no seu passaporte", nome,
              novos.map(function (x) { return "Você conquistou o carimbo " + x + ": " + CARIMBOS_PAINEL[x - 1] + "."; })
                .concat(["Ele já aparece no seu cartão de embarque."]), "Ver meu passaporte", link);
            av.carimbos = nums;
          }
          if (horaBoa && situacao === "ativa" && fim) {
            var faltam = diasEntre_(hoje, fim), mandouHoje = false;
            var avisoPrazo = function () {
              avisar_(l[I.id], para, faltam === 1 ? "Falta 1 dia da sua consultoria" : "Faltam " + faltam + " dias da sua consultoria", nome, [
                "Sua consultoria vai até " + dataBR_(fim) + ".",
                proximo && proximo !== "Trilha completa" ? "Seu próximo passo no painel é: " + proximo + "." : "Você fez todos os passos do painel.",
                "Se travou em alguma coisa, me chama no grupo."], "Abrir meu painel", link);
              mandouHoje = true;
            };
            if (faltam <= 3 && faltam >= 1 && av.p3 !== fim) { avisoPrazo(); av.p3 = fim; av.p15 = fim; }
            else if (faltam <= 15 && faltam > 3 && av.p15 !== fim) { avisoPrazo(); av.p15 = fim; }
            var atual = iso_(l[I.atualizado]);
            if (!mandouHoje && atual && diasEntre_(atual, hoje) >= 7 && av.parado !== atual && proximo && proximo !== "Trilha completa") {
              avisar_(l[I.id], para, "Seu próximo passo no painel", nome, [
                "Faz uns dias que você não marca nada no painel.",
                "Seu próximo passo é: " + proximo + ".",
                "Se travou, me conta no grupo o que está pegando."], "Abrir meu painel", link);
              av.parado = atual;
            }
          }
        } catch (x) { console.error(x); }
      }
      var avTxt = JSON.stringify(av);
      if (avTxt !== "{}" || l[I.avisos]) l[I.avisos] = avTxt;
      if (JSON.stringify(l) !== antes) aba.getRange(n + 2, 1, 1, COL_PAINEL.length).setValues([l]);
    });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* Rode UMA vez no editor para ligar os avisos automáticos (o Google pede autorização). */
function ligarAvisos() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "rotinaPainel") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("rotinaPainel").timeBased().everyHours(1).create();
}

/* Teste no editor: grava uma linha e manda o e-mail para você. Apague a linha depois. */
function testar() {
  var d = { nome: "Teste Formulario", email: "teste@example.com", whatsapp: "+55 13 99999-0000", servico: "Consultoria RADAR Premium",
    cidade: "Santos, SP", nascimento: "10/04/1995", departamento: "Bar", posicoes: "Bar Server", motivador: "Teste", desafio: "Teste",
    experiencias: [{ cargo: "Garçom", empresa: "Restaurante Teste", local: "Santos, Brasil", mes_ini: "3", ano_ini: "2021", mes_fim: "8", ano_fim: "2023",
      atual: false, tipo: "Contínuo", tarefas: "Atendia 10 mesas por turno.", marcante: "" }],
    habilidades: ["Comunicação", "Organização"], ingles: "Intermediário: entendo e respondo, com erros", passaporte: "Tenho e está válido" };
  doPost({ postData: { contents: JSON.stringify({ tipo: "final", id: "teste-" + new Date().getTime(), dados: d }) } });
}

/* Rode UMA vez no editor para o Google pedir a permissão de falar com o OneSignal. */
function autorizarAvisosNoCelular() {
  UrlFetchApp.fetch("https://api.onesignal.com/", { muteHttpExceptions: true });
}
