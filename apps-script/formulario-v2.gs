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
  if (/^[1-9][1-9]9\d{8}$/.test(whats)) whats = "55" + whats; // formato antigo: só DDD + número do Brasil
  var br = whats.indexOf("55") === 0;
  var okBr = /^55[1-9][1-9]9\d{8}$/.test(whats);
  var okOutro = !br && /^[1-9]\d{7,14}$/.test(whats) && !/^(\d)\1+$/.test(whats);
  if (!okBr && !okOutro) return { erro: "whatsapp" };
  var email = txt_(c.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erro: "email" };

  var d = { nome: nome, whatsapp: whats, email: email, id_resposta: txt_(c.id_resposta, 60) };
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
// Regras de rota e pontuação do formulário de aplicação v2.
// A mesma lógica roda no site (para escolher a tela final) e no Apps Script
// (que recalcula tudo no servidor). Se mudar aqui, copie para apps-script/formulario-v2.gs
// e rode apps-script/teste-paridade.js.
(function (raiz) {
  var OPCOES = {
    fase: [
      "Ainda não sei por onde começar",
      "Já pesquisei, mas não enviei currículo",
      "Já enviei currículo e não fui chamado",
      "Já fiz entrevista e não passei",
      "Já fui aprovado e aguardo embarque"
    ],
    ingles: [
      "Iniciante: não consigo me apresentar em inglês",
      "Básico: entendo um pouco, mas travo para responder",
      "Intermediário: me viro numa conversa simples, mas quero treinar a entrevista",
      "Avançado: converso bem e quero aperfeiçoar para o navio"
    ],
    cargo: [
      "Bar Server", "Restaurante", "Galley Steward", "Cabin Steward (Housekeeping)", "Recepção",
      "Animação", "Vendas", "Casino", "Fotografia", "Estética", "Ainda não sei"
    ],
    experiencia: [
      "Sim, há mais de 1 ano",
      "Sim, há menos de 1 ano",
      "Não"
    ],
    urgencia: [
      "Em até 3 meses",
      "De 3 a 6 meses",
      "Mais de 6 meses",
      "Só estou pesquisando"
    ],
    obstaculo: [
      "Não sei montar o currículo",
      "Não entendo como funciona o processo",
      "Medo da entrevista em inglês",
      "Já fui reprovado e não sei por quê",
      "Falta de passaporte ou documentos",
      "Dinheiro para começar"
    ],
    investimento: [
      "Até R$ 100",
      "De R$ 100 a R$ 300",
      "Mais de R$ 300",
      "Agora não consigo investir"
    ],
    origem: [
      "YouTube", "Instagram (post ou reels)", "Anúncio", "Indicação", "Outro"
    ],
    idade: [
      "18 a 24", "25 a 30", "31 a 35", "36 a 46", "Acima de 46", "Prefiro não dizer"
    ]
  };

  function pontuar(r) {
    var p = 0;
    var urg = OPCOES.urgencia.indexOf(r.urgencia);
    p += [3, 2, 1, 0][urg] || 0;
    var inv = OPCOES.investimento.indexOf(r.investimento);
    p += [0, 0, 2, 0][inv] || 0;
    var exp = OPCOES.experiencia.indexOf(r.experiencia);
    p += [2, 1, 0][exp] || 0;
    var fase = OPCOES.fase.indexOf(r.fase);
    p += [0, 1, 2, 2, 0][fase] || 0;
    var ing = OPCOES.ingles.indexOf(r.ingles);
    p += [0, 1, 2, 2][ing] || 0;
    return p;
  }

  function temperatura(pontos) {
    if (pontos >= 8) return "quente";
    if (pontos >= 4) return "morno";
    return "frio";
  }

  // Devolve o perfil: A, A2, B, C ou D. A ordem das regras importa.
  function perfil(r) {
    if (r.fase === OPCOES.fase[4]) return "C";
    var inglesBaixo = r.ingles === OPCOES.ingles[0] || r.ingles === OPCOES.ingles[1];
    var ateCem = r.investimento === OPCOES.investimento[0];
    var naoPodeInvestir = r.investimento === OPCOES.investimento[3];
    var pesquisando = r.urgencia === OPCOES.urgencia[3];
    if (inglesBaixo) {
      if (ateCem || naoPodeInvestir) return "A2";
      if (pesquisando) return "D";
      return "A";
    }
    // Intermediário ou Avançado
    if (naoPodeInvestir || pesquisando) return "D";
    if (ateCem) return "A2";
    var embarcaLogo = r.urgencia === OPCOES.urgencia[0] || r.urgencia === OPCOES.urgencia[1];
    var a300ouMais = r.investimento === OPCOES.investimento[2]; // mais de R$ 300
    return embarcaLogo && a300ouMais ? "B" : "A";
  }

  var ETIQUETA_PERFIL = { A: "acelerando", A2: "ingles-entrevista", B: "consultoria", C: "aprovado", D: "nutrir" };

  function classificar(r) {
    var pontos = pontuar(r);
    var pf = perfil(r);
    return { perfil: pf, etiquetaPerfil: ETIQUETA_PERFIL[pf], pontuacao: pontos, temperatura: temperatura(pontos) };
  }

  var api = { OPCOES: OPCOES, pontuar: pontuar, temperatura: temperatura, perfil: perfil, classificar: classificar, ETIQUETA_PERFIL: ETIQUETA_PERFIL };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.DCPMRegras = api;
})(typeof window !== "undefined" ? window : this);
