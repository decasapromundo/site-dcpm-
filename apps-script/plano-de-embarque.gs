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

function doGet() {
  return ContentService.createTextOutput("Plano de Embarque no ar.");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var c = JSON.parse(e.postData.contents);
    if (c.site) return resposta_({ ok: true }); // campo isca preenchido: robô
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

/* Teste no editor: grava uma linha e manda o e-mail para você. Apague a linha depois. */
function testar() {
  var d = { nome: "Teste Formulario", email: "teste@example.com", whatsapp: "+55 13 99999-0000", servico: "Consultoria RADAR Premium",
    cidade: "Santos, SP", nascimento: "10/04/1995", departamento: "Bar", posicoes: "Bar Server", motivador: "Teste", desafio: "Teste",
    experiencias: [{ cargo: "Garçom", empresa: "Restaurante Teste", local: "Santos, Brasil", mes_ini: "3", ano_ini: "2021", mes_fim: "8", ano_fim: "2023",
      atual: false, tipo: "Contínuo", tarefas: "Atendia 10 mesas por turno.", marcante: "" }],
    habilidades: ["Comunicação", "Organização"], ingles: "Intermediário: entendo e respondo, com erros", passaporte: "Tenho e está válido" };
  doPost({ postData: { contents: JSON.stringify({ tipo: "final", id: "teste-" + new Date().getTime(), dados: d }) } });
}
