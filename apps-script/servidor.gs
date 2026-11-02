/**
 * Formulário DCPM v2: recebe o POST do site, grava na planilha e envia ao CRM.
 * A chave do CRM NÃO fica neste código: ela fica em Propriedades do script (CRM_URL).
 * O perfil e a pontuação são recalculados aqui (a parte final do arquivo é a mesma
 * lógica do site, em aplicacao-regras.js).
 */

var COLUNAS = [
  "data_hora", "nome", "whatsapp", "email", "fase", "ingles", "cargo", "experiencia",
  "urgencia", "obstaculo", "investimento", "origem", "instagram", "motivo",
  "perfil", "pontuacao", "temperatura", "id_resposta",
  "idade", "utm_source", "utm_medium", "utm_campaign", "utm_content", "consentimento", "crm_status"
];
var ABA = "Respostas";
var TEMPO_MINIMO_S = 8;          // o site já barra abaixo de 15 s; aqui é a segunda trava
var TEMPO_MINIMO_PARCIAL_S = 4;  // o site já barra abaixo de 6 s

function doGet() {
  return ContentService.createTextOutput("Formulário DCPM v2 no ar.");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var corpo = JSON.parse(e.postData.contents);
    var parcial = corpo.tipo === "parcial";
    var r = limpar_(corpo, parcial);
    if (r.erro) return resposta_({ ok: false, erro: r.erro });
    var aba = aba_();
    var numero = acharLinha_(aba, r.dados.id_resposta);
    return parcial ? tratarParcial_(aba, numero, r.dados) : tratarFinal_(aba, numero, r.dados);
  } catch (err) {
    console.error(err);
    return resposta_({ ok: false, erro: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Lead parcial: contato válido e consentimento. Uma linha por resposta (id_resposta), sem perfil.
function tratarParcial_(aba, numero, d) {
  var cCrm = COLUNAS.indexOf("crm_status") + 1;
  var idCrm = d.id_resposta + "-p";
  if (numero) {
    var atual = aba.getRange(numero, 1, 1, COLUNAS.length).getValues()[0];
    var status = String(atual[cCrm - 1]);
    if (status.indexOf("parcial") !== 0) return resposta_({ ok: true, ignorado: "ja_completo" }); // o final já chegou
    var igual = String(atual[COLUNAS.indexOf("email")]) === d.email && String(atual[COLUNAS.indexOf("whatsapp")]) === d.whatsapp;
    if (igual) return resposta_({ ok: true, repetido: true });
    idCrm = d.id_resposta + "-p-" + new Date().getTime(); // contato corrigido: avisa o CRM de novo
  } else {
    numero = aba.getLastRow() + 1;
  }
  var linha = montarLinha_(d, { perfil: "", pontuacao: "", temperatura: "" }, "parcial");
  aba.getRange(numero, 1, 1, COLUNAS.length).setValues([linha]);
  var st = enviarCrm_(d, null, idCrm);
  aba.getRange(numero, cCrm).setValue(st === "ok" ? "parcial" : "parcial, " + st);
  return resposta_({ ok: true, parcial: true });
}

// Envio final: atualiza a linha do lead parcial (se houver) e o mesmo contato no CRM.
function tratarFinal_(aba, numero, d) {
  if (duplicadoFinal_(d)) return resposta_({ ok: true, repetido: true });
  var cls = DCPMRegras.classificar(d);
  var linha = montarLinha_(d, cls, "");
  if (numero) {
    aba.getRange(numero, 1, 1, COLUNAS.length).setValues([linha]);
  } else {
    aba.appendRow(linha);
    numero = aba.getLastRow();
  }
  var status = enviarCrm_(d, cls, d.id_resposta);
  aba.getRange(numero, COLUNAS.indexOf("crm_status") + 1).setValue(status);
  return resposta_({ ok: true, perfil: cls.perfil, temperatura: cls.temperatura });
}

function acharLinha_(aba, id) {
  var n = aba.getLastRow();
  if (n < 2) return 0;
  var achou = aba.getRange(2, COLUNAS.indexOf("id_resposta") + 1, n - 1, 1)
    .createTextFinder(id).matchEntireCell(true).findNext();
  return achou ? achou.getRow() : 0;
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Valida e limpa. Opções precisam ser exatamente as do formulário.
function limpar_(c, parcial) {
  if (c.site) return { erro: "isca" };                                   // campo isca preenchido
  if (Number(c.tempo_s) < (parcial ? TEMPO_MINIMO_PARCIAL_S : TEMPO_MINIMO_S)) return { erro: "rapido" };
  if (c.consentimento !== "sim") return { erro: "sem_consentimento" };

  var nome = txt_(c.nome, 80);
  if (nome.length < 2 || /https?:|www\.|@/i.test(nome)) return { erro: "nome" };
  var whats = String(c.whatsapp || "").replace(/\D/g, "");
  if (whats.indexOf("55") === 0 && whats.length === 13) whats = whats.slice(2);
  if (!/^[1-9][1-9]9\d{8}$/.test(whats)) return { erro: "whatsapp" };
  var email = txt_(c.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erro: "email" };

  var d = { nome: nome, whatsapp: "55" + whats, email: email, id_resposta: txt_(c.id_resposta, 60) };
  ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) { d[k] = txt_(c[k], 120); });
  d.consentimento = "sim";
  if (parcial) return d.id_resposta ? { dados: d } : { erro: "sem_id" };

  var campos = ["fase", "ingles", "cargo", "experiencia", "urgencia", "obstaculo", "investimento", "origem"];
  for (var i = 0; i < campos.length; i++) {
    var v = String(c[campos[i]] || "");
    if (DCPMRegras.OPCOES[campos[i]].indexOf(v) === -1) return { erro: "opcao:" + campos[i] };
    d[campos[i]] = v;
  }
  var idade = String(c.idade || "");
  d.idade = DCPMRegras.OPCOES.idade.indexOf(idade) === -1 ? "" : idade;
  d.instagram = txt_(c.instagram, 40).replace(/^@+/, "");
  d.motivo = txt_(c.motivo, 300);
  if (!d.id_resposta) d.id_resposta = Utilities.getUuid();
  return { dados: d };
}

function txt_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

// Evita processar duas vezes o mesmo envio final quando o navegador reenvia (mesmo id em 10 min).
function duplicadoFinal_(d) {
  var cache = CacheService.getScriptCache();
  var chave = "final:" + d.id_resposta;
  if (cache.get(chave)) return true;
  cache.put(chave, "1", 600);
  return false;
}

// Evita que texto da planilha seja lido como fórmula (=, +, -, @).
function seguro_(v) {
  v = String(v == null ? "" : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function montarLinha_(d, cls, crmStatus) {
  var mapa = {
    data_hora: Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd HH:mm:ss"),
    perfil: cls.perfil, pontuacao: cls.pontuacao, temperatura: cls.temperatura, crm_status: crmStatus
  };
  return COLUNAS.map(function (c) { return c in mapa ? mapa[c] : seguro_(d[c]); });
}

function aba_() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet() ||
    SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("PLANILHA_ID"));
  var aba = planilha.getSheetByName(ABA) || planilha.insertSheet(ABA);
  if (aba.getLastRow() === 0) {
    aba.appendRow(COLUNAS);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, COLUNAS.length).setFontWeight("bold");
  }
  return aba;
}

// ---------- CRM ----------
function textoRespostas_(d, cls) {
  return [
    "Fase: " + d.fase, "Inglês: " + d.ingles, "Cargo: " + d.cargo, "Experiência: " + d.experiencia,
    "Embarque: " + d.urgencia, "Obstáculo: " + d.obstaculo, "Investimento: " + d.investimento,
    "Origem: " + d.origem, d.idade ? "Idade: " + d.idade : "", d.instagram ? "Instagram: @" + d.instagram : "",
    d.motivo ? "Motivo: " + d.motivo : "",
    "Perfil: " + cls.perfil + " | Pontuação: " + cls.pontuacao + " | Temperatura: " + cls.temperatura
  ].filter(String).join("\n");
}

// cls = null manda só o contato com a etiqueta form-v2-parcial (sem perfil, para não disparar fluxo de venda).
function enviarCrm_(d, cls, idCrm) {
  var url = PropertiesService.getScriptProperties().getProperty("CRM_URL");
  if (!url) return "sem CRM_URL";
  var payload = {
    evento: "lead",
    nome: d.nome,
    email: d.email,
    telefone: d.whatsapp,
    produto: "Formulário DCPM v2",
    id: idCrm,
    utm_source: d.utm_source, utm_medium: d.utm_medium, utm_campaign: d.utm_campaign, utm_content: d.utm_content
  };
  if (!cls) {
    payload.etiquetas = ["form-v2", "form-v2-parcial"];
  } else {
    var extra = {
      ingles: d.ingles,
      etiquetas: ["form-v2", cls.etiquetaPerfil, cls.temperatura],
      fase: d.fase, cargo: d.cargo, experiencia: d.experiencia, urgencia: d.urgencia,
      obstaculo: d.obstaculo, investimento: d.investimento, origem: d.origem,
      idade: d.idade, instagram: d.instagram, motivo: d.motivo,
      perfil: cls.perfil, pontuacao: String(cls.pontuacao), temperatura: cls.temperatura,
      respostas: textoRespostas_(d, cls)
    };
    for (var k in extra) payload[k] = extra[k];
  }
  try {
    var resp = UrlFetchApp.fetch(url, {
      method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    var codigo = resp.getResponseCode();
    return codigo >= 200 && codigo < 300 ? "ok" : "erro " + codigo + ": " + resp.getContentText().slice(0, 150);
  } catch (err) {
    return "erro: " + String(err).slice(0, 150);
  }
}

// Reenvia ao CRM as linhas cujo status começa com "erro" ou termina em erro (rode à mão: Executar > reenviarFalhas).
function reenviarFalhas() {
  var aba = aba_();
  var dados = aba.getDataRange().getValues();
  var h = dados[0];
  var col = function (n) { return h.indexOf(n); };
  for (var i = 1; i < dados.length; i++) {
    var st = String(dados[i][col("crm_status")]);
    if (st === "ok" || st === "parcial") continue;
    var d = {};
    COLUNAS.forEach(function (c) { d[c] = dados[i][col(c)]; });
    d.whatsapp = String(d.whatsapp);
    var parcial = st.indexOf("parcial") === 0;
    var novo = parcial ? enviarCrm_(d, null, d.id_resposta + "-p") : enviarCrm_(d, DCPMRegras.classificar(d), d.id_resposta);
    aba.getRange(i + 1, col("crm_status") + 1).setValue(parcial && novo === "ok" ? "parcial" : novo);
  }
}

// ---------- Teste manual (Executar > testar) ----------
function testar() {
  var id = "teste-" + Date.now();
  var contato = { nome: "Teste Formulario", whatsapp: "11900000001", email: "teste.form.v2@example.com", consentimento: "sim", tempo_s: 60, site: "", id_resposta: id };
  var p = JSON.parse(JSON.stringify(contato)); p.tipo = "parcial";
  Logger.log(doPost({ postData: { contents: JSON.stringify(p) } }).getContent());
  var f = JSON.parse(JSON.stringify(contato));
  f.tipo = "final";
  f.fase = DCPMRegras.OPCOES.fase[0]; f.ingles = DCPMRegras.OPCOES.ingles[0]; f.cargo = "Bar Server";
  f.experiencia = "Não"; f.urgencia = DCPMRegras.OPCOES.urgencia[0]; f.obstaculo = DCPMRegras.OPCOES.obstaculo[0];
  f.investimento = DCPMRegras.OPCOES.investimento[2]; f.origem = "Instagram (post ou reels)";
  Logger.log(doPost({ postData: { contents: JSON.stringify(f) } }).getContent());
}

// ================= Regras de rota (mesma lógica do site) =================
