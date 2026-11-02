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
var TEMPO_MINIMO_S = 8; // o site já barra abaixo de 15 s; aqui é a segunda trava

function doGet() {
  return ContentService.createTextOutput("Formulário DCPM v2 no ar.");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var corpo = JSON.parse(e.postData.contents);
    var r = limpar_(corpo);
    if (r.erro) return resposta_({ ok: false, erro: r.erro });
    if (duplicado_(r)) return resposta_({ ok: true, repetido: true });

    var cls = DCPMRegras.classificar(r.dados);
    var linha = montarLinha_(r.dados, cls, "");
    var aba = aba_();
    aba.appendRow(linha);
    var numero = aba.getLastRow();

    var status = enviarCrm_(r.dados, cls);
    aba.getRange(numero, COLUNAS.indexOf("crm_status") + 1).setValue(status);
    return resposta_({ ok: true, perfil: cls.perfil, temperatura: cls.temperatura });
  } catch (err) {
    console.error(err);
    return resposta_({ ok: false, erro: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Valida e limpa. Opções precisam ser exatamente as do formulário.
function limpar_(c) {
  if (c.site) return { erro: "isca" };                                   // campo isca preenchido
  if (Number(c.tempo_s) < TEMPO_MINIMO_S) return { erro: "rapido" };     // rápido demais para ser gente
  if (c.consentimento !== "sim") return { erro: "sem_consentimento" };

  var nome = txt_(c.nome, 80);
  if (nome.length < 2 || /https?:|www\.|@/i.test(nome)) return { erro: "nome" };
  var whats = String(c.whatsapp || "").replace(/\D/g, "");
  if (whats.indexOf("55") === 0 && whats.length === 13) whats = whats.slice(2);
  if (!/^[1-9][1-9]9\d{8}$/.test(whats)) return { erro: "whatsapp" };
  var email = txt_(c.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erro: "email" };

  var d = { nome: nome, whatsapp: "55" + whats, email: email, id_resposta: txt_(c.id_resposta, 60) };
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
  ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) { d[k] = txt_(c[k], 120); });
  d.consentimento = "sim";
  if (!d.id_resposta) d.id_resposta = Utilities.getUuid();
  return { dados: d };
}

function txt_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

// Evita linha dupla quando o navegador reenvia a mesma resposta (mesmo id) em 10 min.
function duplicado_(r) {
  var cache = CacheService.getScriptCache();
  var chave = "id:" + r.dados.id_resposta;
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

function enviarCrm_(d, cls) {
  var url = PropertiesService.getScriptProperties().getProperty("CRM_URL");
  if (!url) return "sem CRM_URL";
  var payload = {
    evento: "lead",
    nome: d.nome,
    email: d.email,
    telefone: d.whatsapp,
    produto: "Formulário DCPM v2",
    ingles: d.ingles,
    etiquetas: ["form-v2", cls.etiquetaPerfil, cls.temperatura],
    id: d.id_resposta,
    fase: d.fase, cargo: d.cargo, experiencia: d.experiencia, urgencia: d.urgencia,
    obstaculo: d.obstaculo, investimento: d.investimento, origem: d.origem,
    idade: d.idade, instagram: d.instagram, motivo: d.motivo,
    perfil: cls.perfil, pontuacao: String(cls.pontuacao), temperatura: cls.temperatura,
    respostas: textoRespostas_(d, cls),
    utm_source: d.utm_source, utm_medium: d.utm_medium, utm_campaign: d.utm_campaign, utm_content: d.utm_content
  };
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

// Reenvia ao CRM as linhas que falharam (rode à mão pelo menu Executar, quando precisar).
function reenviarFalhas() {
  var aba = aba_();
  var dados = aba.getDataRange().getValues();
  var h = dados[0];
  var col = function (n) { return h.indexOf(n); };
  for (var i = 1; i < dados.length; i++) {
    var st = String(dados[i][col("crm_status")]);
    if (st === "ok") continue;
    var d = {};
    COLUNAS.forEach(function (c) { d[c] = dados[i][col(c)]; });
    d.whatsapp = String(d.whatsapp);
    var cls = DCPMRegras.classificar(d);
    aba.getRange(i + 1, col("crm_status") + 1).setValue(enviarCrm_(d, cls));
  }
}

// ---------- Teste manual (Executar > testar) ----------
function testar() {
  var fake = {
    nome: "Teste Formulario", whatsapp: "11900000001", email: "teste.form.v2@example.com",
    fase: DCPMRegras.OPCOES.fase[0], ingles: DCPMRegras.OPCOES.ingles[0], cargo: "Bar Server",
    experiencia: "Não", urgencia: DCPMRegras.OPCOES.urgencia[0], obstaculo: DCPMRegras.OPCOES.obstaculo[0],
    investimento: DCPMRegras.OPCOES.investimento[2], origem: "Instagram (post ou reels)",
    consentimento: "sim", tempo_s: 60, site: "", id_resposta: "teste-" + Date.now()
  };
  var saida = doPost({ postData: { contents: JSON.stringify(fake) } });
  Logger.log(saida.getContent());
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
      "De R$ 300 a R$ 600",
      "De R$ 600 a R$ 1.200",
      "Acima de R$ 1.200",
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
    p += [0, 0, 1, 2, 3, 0][inv] || 0;
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

  // Devolve o perfil: A, A2, B, C ou D. Ordem importa.
  function perfil(r) {
    if (r.fase === OPCOES.fase[4]) return "C";
    var inglesBaixo = r.ingles === OPCOES.ingles[0] || r.ingles === OPCOES.ingles[1];
    var semCaixa = r.investimento === OPCOES.investimento[0] || r.investimento === OPCOES.investimento[5];
    var pesquisando = r.urgencia === OPCOES.urgencia[3];
    if (inglesBaixo) {
      if (semCaixa) return "A2";
      if (pesquisando) return "D";
      return "A";
    }
    var naoPodeInvestir = r.investimento === OPCOES.investimento[5];
    if (pesquisando || naoPodeInvestir) return "D";
    var embarcaLogo = r.urgencia === OPCOES.urgencia[0] || r.urgencia === OPCOES.urgencia[1];
    var temCaixa = OPCOES.investimento.indexOf(r.investimento) >= 2 && r.investimento !== OPCOES.investimento[5];
    if (embarcaLogo && temCaixa) return "B";
    return "D";
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
