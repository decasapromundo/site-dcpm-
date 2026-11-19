/* Página de vendas da consultoria RADAR: formulário de aplicação dentro da página, botão fixo e medição.
   O envio vai para o mesmo Apps Script do formulário v2 (planilha + CRM). A chave do CRM fica lá, nunca aqui. */
(function () {
  "use strict";

  var NUMERO = "5513996540972";
  var O = window.DCPMRegras.OPCOES;
  var VERSAO_CONSENTIMENTO = "2026-11-02";
  var TEMPO_MINIMO_S = 15;        // abaixo disso a resposta é de robô: finge sucesso e não envia
  var TEMPO_MINIMO_PARCIAL_S = 6;

  // Só as perguntas de aplicação. As opções são as mesmas do formulário v2 (o servidor confere uma a uma).
  var PASSOS = [
    { id: "contato", tipo: "contato", titulo: "Comece pelos seus dados", ajuda: "É por eles que eu te chamo. Se o celular oferecer, toque para preencher tudo de uma vez." },
    { id: "cargo", tipo: "opcao", titulo: "Qual cargo você quer a bordo?", duas: true },
    { id: "experiencia", tipo: "opcao", titulo: "Você já trabalhou com atendimento ao público?", ajuda: "Bar, restaurante, hotel, vendas." },
    { id: "ingles", tipo: "opcao", titulo: "Como está o seu inglês hoje?", ajuda: "Escolha pelo que você consegue fazer hoje. A entrevista se treina." },
    { id: "fase", tipo: "opcao", titulo: "Em que ponto do processo seletivo você está?" },
    { id: "urgencia", tipo: "opcao", titulo: "Quando você quer embarcar?" },
    { id: "investimento", tipo: "opcao", titulo: "Quanto você está pronto para investir na sua preparação?", ajuda: "Sua resposta me ajuda a indicar o plano certo para o seu momento." }
  ];

  var el = {
    form: document.getElementById("rd-form"),
    caixa: document.querySelector(".rd-form-caixa"),
    pergunta: document.getElementById("rd-f-pergunta"),
    final: document.getElementById("rd-f-final"),
    barra: document.getElementById("rd-f-barra"),
    progresso: document.querySelector(".rd-f-progresso"),
    contador: document.getElementById("rd-f-contador"),
    titulo: document.getElementById("rd-f-titulo"),
    ajuda: document.getElementById("rd-f-ajuda"),
    corpo: document.getElementById("rd-f-corpo"),
    erro: document.getElementById("rd-f-erro"),
    voltar: document.getElementById("rd-f-voltar"),
    continuar: document.getElementById("rd-f-continuar"),
    fechar: document.getElementById("rd-f-fechar"),
    isca: document.getElementById("rd-f-isca"),
    envio: document.getElementById("rd-f-envio"),
    wa: document.getElementById("rd-f-wa"),
    finalTitulo: document.getElementById("rd-f-final-titulo"),
    barraFixa: document.getElementById("rd-barra")
  };

  var respostas = {};
  var atual = 0;
  var inicioEm = 0;
  var iniciado = false;
  var concluido = false;
  var planoInteresse = "";
  var avisouEmail = null;
  var quemAbriu = null;
  var idResposta = novoId();

  // ---------- utilidades ----------
  function novoId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function push(evento, extra) {
    window.dataLayer = window.dataLayer || [];
    var d = { event: evento };
    for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) d[k] = extra[k]; }
    window.dataLayer.push(d);
  }
  function guardar(chave, valor) { try { sessionStorage.setItem(chave, valor); } catch (e) {} }
  function ler(chave) { try { return sessionStorage.getItem(chave) || ""; } catch (e) { return ""; } }
  function soDigitos(s) { return (s || "").replace(/\D/g, ""); }
  function primeiroNome(n) { return String(n || "").trim().split(/\s+/)[0]; }

  // UTMs: lê da URL e guarda para o caso de a pessoa recarregar a página
  var utms = {};
  (function () {
    var params = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) {
      var v = (params.get(k) || "").slice(0, 120);
      if (v) guardar("dcpm_" + k, v);
      utms[k] = v || ler("dcpm_" + k);
    });
  })();

  function endpoint() {
    var padrao = window.DCPM_ENDPOINT || "";
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (local) return new URLSearchParams(location.search).get("endpoint") || ""; // em prévia local nunca envia para a produção
    return padrao.indexOf("http") === 0 ? padrao : "";
  }

  // ---------- telefone, nome e e-mail ----------
  var PAISES = [
    { c: "BR", nome: "Brasil", ddi: "55", m: "(##) #####-####", ph: "(11) 91234-5678" },
    { c: "PT", nome: "Portugal", ddi: "351", m: "### ### ###", ph: "912 345 678" },
    { c: "US", nome: "Estados Unidos / Canadá", ddi: "1", m: "(###) ###-####", ph: "(415) 555-2671" },
    { c: "ES", nome: "Espanha", ddi: "34", m: "### ## ## ##", ph: "612 34 56 78" },
    { c: "GB", nome: "Reino Unido", ddi: "44", m: "#### ######", ph: "7912 345678" },
    { c: "IE", nome: "Irlanda", ddi: "353", m: "## ### ####", ph: "85 123 4567" },
    { c: "IT", nome: "Itália", ddi: "39", m: "### ### ####", ph: "312 345 6789" },
    { c: "XX", nome: "Outro país (digite o código)", ddi: "", m: "", ph: "+49 151 23456789" }
  ];
  var pais = PAISES[0];
  function acharPais(c) { for (var i = 0; i < PAISES.length; i++) if (PAISES[i].c === c) return PAISES[i]; return PAISES[0]; }
  function tamanhoPais(p) { return p.m ? (p.m.match(/#/g) || []).length : 15; }
  function mascararTelefone(valor, p) {
    p = p || pais;
    var d = soDigitos(valor);
    var max = tamanhoPais(p);
    if (p.ddi && d.indexOf(p.ddi) === 0 && d.length > max) d = d.slice(p.ddi.length);
    d = d.slice(0, max);
    if (!p.m) return d ? "+" + d : "";
    var saida = "", k = 0;
    for (var i = 0; i < p.m.length && k < d.length; i++) saida += p.m.charAt(i) === "#" ? d.charAt(k++) : p.m.charAt(i);
    return saida;
  }
  function validarNome(v) {
    v = v.trim();
    if (v.length < 2) return "Escreva o seu nome.";
    if (!/[A-Za-zÀ-ÿ]{2}/.test(v) || /https?:|www\.|@/i.test(v)) return "Escreva o seu nome, por favor.";
    return "";
  }
  var DDDS_BR = "11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99".split(" ");
  function validarWhatsapp(v) {
    var d = soDigitos(v);
    if (pais.c === "BR") {
      if (d.length !== 11) return "Digite o DDD e o número com 9 dígitos. Exemplo: (11) 91234-5678.";
      if (DDDS_BR.indexOf(d.slice(0, 2)) === -1) return "Esse DDD não existe. Confira o DDD.";
      if (d.charAt(2) !== "9") return "Celular começa com 9 depois do DDD.";
      if (/^(\d)\1+$/.test(d.slice(2))) return "Confira o número.";
      return "";
    }
    var okTam = pais.m ? d.length === tamanhoPais(pais) : (d.length >= 8 && d.length <= 15);
    if (!okTam || /^0/.test(d) || /^(\d)\1+$/.test(d)) return "Confira o número. Exemplo: " + pais.ph + ".";
    return "";
  }
  var TYPOS = { "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.con": "gmail.com", "gmail.com.br": "gmail.com", "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmail.con": "hotmail.com", "outlok.com": "outlook.com", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com" };
  function validarEmail(v) {
    v = v.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 120) return "Esse e-mail parece incompleto. Exemplo: nome@gmail.com.";
    return "";
  }
  function sugerirEmail(v) {
    var partes = v.trim().toLowerCase().split("@");
    return partes.length === 2 && TYPOS[partes[1]] ? partes[0] + "@" + TYPOS[partes[1]] : "";
  }

  // ---------- abrir e fechar ----------
  function abrir(origem, plano, botao) {
    quemAbriu = botao || null;
    if (plano) planoInteresse = plano;
    el.form.hidden = false;
    document.body.classList.add("rd-form-aberto");
    el.barraFixa.hidden = true;
    push("radar_aplicar_click", { posicao: origem, plano: plano || "nao_escolhido" });
    if (!concluido && leadPronto()) return; // já respondeu a avaliação do perfil: não pergunta tudo de novo
    if (concluido) { el.finalTitulo.focus(); return; }
    if (!iniciado) { iniciado = true; inicioEm = Date.now(); push("form_inicio", { form: "radar" }); }
    render(atual);
  }
  function fechar() {
    el.form.hidden = true;
    document.body.classList.remove("rd-form-aberto");
    el.barraFixa.hidden = false;
    if (quemAbriu && quemAbriu.focus) quemAbriu.focus();
  }

  // Quem acabou de responder a avaliação do perfil (aplicacao.html) já está no CRM com as respostas.
  // Aqui a aplicação só confirma e abre a conversa, sem enviar nada de novo.
  function leadPronto() {
    var lead = {};
    try { lead = JSON.parse(sessionStorage.getItem("dcpm_lead") || "{}") || {}; } catch (e) {}
    if (!lead.concluido || !lead.nome) return false;
    concluido = true;
    respostas.nome = lead.nome;
    mostrarFinal("Sua aplicação já está comigo");
    push("radar_aplicacao_ja_respondida", { plano: planoInteresse || "nao_escolhido" });
    return true;
  }

  function mostrarFinal(frase) {
    var nome = primeiroNome(respostas.nome);
    el.finalTitulo.textContent = frase + (nome ? ", " + nome : "") + ".";
    var m = "Oi Augusto" + (nome ? ", aqui é " + nome : "") + ". Acabei de fazer a minha aplicação para a consultoria RADAR";
    m += planoInteresse ? " e quero entender o plano " + planoInteresse + "." : ".";
    el.wa.href = "https://wa.me/" + NUMERO + "?text=" + encodeURIComponent(m);
    el.pergunta.hidden = true;
    el.final.hidden = false;
    el.barra.style.width = "100%";
    el.caixa.scrollTop = 0;
    el.finalTitulo.focus();
  }

  // ---------- telas ----------
  function campo(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) e[k] = attrs[k]; }
    return e;
  }
  function rotulo(texto, para) { return campo("label", { className: "rd-f-rotulo", htmlFor: para, textContent: texto }); }

  function render(i) {
    atual = i;
    var p = PASSOS[i];
    avisouEmail = null;
    el.pergunta.hidden = false;
    el.final.hidden = true;
    var pct = Math.round((i / PASSOS.length) * 100);
    el.barra.style.width = Math.max(pct, 6) + "%";
    el.progresso.setAttribute("aria-valuenow", String(pct));
    el.erro.textContent = "";
    el.titulo.textContent = p.titulo;
    el.ajuda.textContent = p.ajuda || "";
    el.ajuda.hidden = !p.ajuda;
    el.contador.textContent = "Pergunta " + (i + 1) + " de " + PASSOS.length;
    el.corpo.innerHTML = "";
    el.continuar.hidden = p.tipo === "opcao";
    el.continuar.disabled = false;
    el.voltar.hidden = i === 0;
    if (p.tipo === "opcao") renderOpcoes(p); else renderContato();
    push("form_passo", { form: "radar", form_passo: p.id, form_passo_n: i + 1 });
    el.caixa.scrollTop = 0;
    var alvo = el.corpo.querySelector("input");
    if (alvo && !alvo.value) alvo.focus(); else el.titulo.focus();
  }

  // Nome, e-mail e telefone na mesma tela: o celular preenche os três de uma vez.
  function renderContato() {
    var nome = campo("input", { className: "rd-f-campo", id: "rd-f-nome", type: "text", name: "name", placeholder: "Nome e sobrenome", autocomplete: "name", maxLength: 80, value: respostas.nome || "" });
    var email = campo("input", { className: "rd-f-campo", id: "rd-f-email", type: "email", name: "email", placeholder: "voce@exemplo.com", autocomplete: "email", inputMode: "email", maxLength: 120, spellcheck: false, value: respostas.email || "" });
    email.setAttribute("autocapitalize", "none");

    pais = acharPais(respostas.pais);
    var sel = campo("select", { className: "rd-f-campo", id: "rd-f-pais" });
    sel.setAttribute("aria-label", "País do WhatsApp");
    PAISES.forEach(function (x) {
      var o = campo("option", { value: x.c, textContent: x.nome + (x.ddi ? " (+" + x.ddi + ")" : "") });
      if (x.c === pais.c) o.selected = true;
      sel.appendChild(o);
    });
    var caixa = campo("div", { className: "rd-f-tel" });
    var ddi = campo("span", { className: "rd-f-ddi" });
    ddi.setAttribute("aria-hidden", "true");
    var tel = campo("input", { className: "rd-f-campo", id: "rd-f-whatsapp", type: "tel", name: "tel", autocomplete: "tel-national", inputMode: "numeric" });
    function ajustar() {
      ddi.textContent = "+" + pais.ddi;
      ddi.hidden = !pais.ddi;
      caixa.classList.toggle("sem-ddi", !pais.ddi);
      tel.placeholder = pais.ph;
      tel.maxLength = pais.m ? pais.m.length : 17;
    }
    ajustar();
    tel.value = mascararTelefone(respostas.whatsappLocal || "", pais);
    sel.addEventListener("change", function () {
      pais = acharPais(sel.value); respostas.pais = pais.c;
      tel.value = ""; ajustar(); el.erro.textContent = ""; tel.removeAttribute("aria-invalid"); tel.focus();
    });
    tel.addEventListener("input", function () { tel.value = mascararTelefone(tel.value); });
    caixa.appendChild(ddi); caixa.appendChild(tel);

    var consent = campo("label", { className: "rd-f-consent", htmlFor: "rd-f-consent" });
    var caixaConsent = campo("input", { type: "checkbox", id: "rd-f-consent", checked: !!respostas.consentimento });
    var texto = campo("span", {});
    texto.innerHTML = 'Concordo que a De Casa Pro Mundo use os dados que eu informar, mesmo que eu não termine a aplicação, para me chamar no WhatsApp e por e-mail sobre o meu embarque. Posso pedir para sair a qualquer momento. Leia o <a href="privacidade.html" target="_blank" rel="noopener">aviso de privacidade</a>.';
    consent.appendChild(caixaConsent); consent.appendChild(texto);

    el.corpo.appendChild(rotulo("Nome", "rd-f-nome")); el.corpo.appendChild(nome);
    el.corpo.appendChild(rotulo("E-mail", "rd-f-email")); el.corpo.appendChild(email);
    el.corpo.appendChild(rotulo("Telefone (WhatsApp)", "rd-f-whatsapp")); el.corpo.appendChild(sel); el.corpo.appendChild(caixa);
    el.corpo.appendChild(consent);
    [nome, email, tel].forEach(function (i) {
      i.addEventListener("input", function () { i.removeAttribute("aria-invalid"); el.erro.textContent = ""; });
    });
  }

  function renderOpcoes(p) {
    var grupo = campo("div", { className: "rd-f-opcoes" + (p.duas ? " duas" : "") });
    grupo.setAttribute("role", "radiogroup");
    grupo.setAttribute("aria-labelledby", "rd-f-titulo");
    O[p.id].forEach(function (texto) {
      var b = campo("button", { type: "button", className: "rd-f-opcao" });
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", respostas[p.id] === texto ? "true" : "false");
      var caixa = document.createElement("span");
      var i = texto.indexOf(": ");
      if (i > 0 && texto.slice(0, i).indexOf(" ") === -1) {
        caixa.appendChild(campo("strong", { textContent: texto.slice(0, i) }));
        caixa.appendChild(document.createTextNode(texto.slice(i)));
      } else {
        caixa.textContent = texto;
      }
      b.appendChild(caixa);
      b.addEventListener("click", function () {
        respostas[p.id] = texto;
        Array.prototype.forEach.call(grupo.children, function (c) { c.setAttribute("aria-checked", c === b ? "true" : "false"); });
        setTimeout(function () { if (atual === PASSOS.indexOf(p)) avancar(); }, 220);
      });
      grupo.appendChild(b);
    });
    el.corpo.appendChild(grupo);
  }

  // ---------- navegação ----------
  function erro(msg, alvo) {
    el.erro.textContent = msg;
    if (alvo) { alvo.setAttribute("aria-invalid", "true"); alvo.focus(); }
    return false;
  }

  function validarContato() {
    var nome = document.getElementById("rd-f-nome");
    var tel = document.getElementById("rd-f-whatsapp");
    var email = document.getElementById("rd-f-email");
    var consent = document.getElementById("rd-f-consent");
    var msg = validarNome(nome.value);
    if (msg) return erro(msg, nome);
    msg = validarEmail(email.value);
    if (msg) return erro(msg, email);
    msg = validarWhatsapp(tel.value);
    if (msg) return erro(msg, tel);
    var v = email.value;
    var s = sugerirEmail(v);
    if (s && avisouEmail !== v) {
      avisouEmail = v;
      el.erro.textContent = "";
      el.erro.appendChild(document.createTextNode("Você quis dizer "));
      var b = campo("button", { type: "button", textContent: s });
      b.addEventListener("click", function () { email.value = s; avisouEmail = s; el.erro.textContent = ""; });
      el.erro.appendChild(b);
      el.erro.appendChild(document.createTextNode("? Se está certo, toque em Continuar de novo."));
      return false;
    }
    if (!consent.checked) { el.erro.textContent = "Marque a caixa para continuar."; consent.focus(); return false; }
    respostas.nome = nome.value.trim().replace(/\s+/g, " ");
    respostas.whatsappLocal = soDigitos(tel.value);
    respostas.whatsapp = pais.ddi + soDigitos(tel.value);
    respostas.email = v.trim().toLowerCase();
    respostas.consentimento = true;
    return true;
  }

  function avancar() {
    var p = PASSOS[atual];
    if (p.tipo === "opcao") { if (!respostas[p.id]) return erro("Escolha uma opção para continuar."); }
    else if (!validarContato()) return;
    if (p.id === "contato") enviarParcial();
    if (atual === PASSOS.length - 1) return concluir();
    render(atual + 1);
  }

  // ---------- envio ----------
  function base(tipo) {
    return {
      tipo: tipo,
      pagina: "radar",
      id_resposta: idResposta,
      nome: respostas.nome, whatsapp: respostas.whatsapp, email: respostas.email,
      consentimento: "sim", consentimento_versao: VERSAO_CONSENTIMENTO,
      utm_source: utms.utm_source || "", utm_medium: utms.utm_medium || "",
      utm_campaign: utms.utm_campaign || "", utm_content: utms.utm_content || "",
      tempo_s: Math.round((Date.now() - inicioEm) / 1000),
      site: el.isca.value
    };
  }

  // Lead parcial: contato válido e consentimento. É o que permite recuperar quem parou no meio.
  function enviarParcial() {
    var p = base("parcial");
    push("form_contato", { form: "radar" });
    if (el.isca.value !== "" || p.tempo_s < TEMPO_MINIMO_PARCIAL_S) return;
    var url = endpoint();
    if (!url) { if (window.console) console.info("[prévia] lead parcial:", p); return; }
    try { fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: JSON.stringify(p) }).catch(function () {}); } catch (e) {}
  }

  function concluir() {
    if (concluido) return;
    concluido = true;
    var res = window.DCPMRegras.classificar(respostas);
    var p = base("final");
    ["fase", "ingles", "cargo", "experiencia", "urgencia", "investimento"].forEach(function (k) { p[k] = respostas[k]; });
    p.obstaculo = ""; p.origem = ""; p.instagram = ""; p.idade = "";
    p.motivo = planoInteresse ? "Clicou em aplicar no plano " + planoInteresse + " na página /radar." : "";
    p.perfil_site = res.perfil;

    mostrarFinal("Aplicação enviada");
    push("form_concluido", { form: "radar", form_perfil: res.perfil, form_temperatura: res.temperatura, plano: planoInteresse || "nao_escolhido" });

    var robo = el.isca.value !== "" || p.tempo_s < TEMPO_MINIMO_S;
    if (robo) return; // finge sucesso, não envia
    enviar(p);
  }

  var FILA = "dcpm_fila_v2";
  function enviar(payload) {
    var url = endpoint();
    if (!url) {
      el.envio.textContent = "Prévia local: nada foi enviado.";
      if (window.console) console.info("[prévia] payload que seria enviado:", payload);
      return;
    }
    tentar(url, payload, 0);
  }
  function tentar(url, payload, n) {
    fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: JSON.stringify(payload) })
      .then(function () { el.envio.textContent = ""; limparFila(payload.id_resposta); })
      .catch(function () {
        if (n === 0) enfileirar(payload);
        if (n < 3) {
          el.envio.textContent = "Sem conexão. Tentando enviar de novo...";
          setTimeout(function () { tentar(url, payload, n + 1); }, 3000 * (n + 1));
        } else {
          el.envio.textContent = "Não consegui enviar agora. Mantenha esta página aberta, ou me chame no WhatsApp pelo botão acima.";
        }
      });
  }
  function enfileirar(payload) {
    try {
      var f = JSON.parse(localStorage.getItem(FILA) || "[]");
      f.push(payload);
      localStorage.setItem(FILA, JSON.stringify(f.slice(-5)));
    } catch (e) {}
  }
  function limparFila(id) {
    try {
      var f = JSON.parse(localStorage.getItem(FILA) || "[]").filter(function (p) { return p.id_resposta !== id; });
      localStorage.setItem(FILA, JSON.stringify(f));
    } catch (e) {}
  }
  function reenviarFila() {
    var url = endpoint();
    if (!url) return;
    try {
      JSON.parse(localStorage.getItem(FILA) || "[]").forEach(function (p) {
        fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: JSON.stringify(p) })
          .then(function () { limparFila(p.id_resposta); }).catch(function () {});
      });
    } catch (e) {}
  }
  window.addEventListener("online", reenviarFila);
  reenviarFila();

  // ---------- eventos ----------
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-aplicar]") : null;
    if (b) abrir(b.getAttribute("data-aplicar"), b.getAttribute("data-plano") || "", b);
  });
  el.pergunta.addEventListener("submit", function (e) { e.preventDefault(); avancar(); });
  el.voltar.addEventListener("click", function () { if (atual > 0) render(atual - 1); });
  el.fechar.addEventListener("click", fechar);
  el.form.addEventListener("click", function (e) { if (e.target === el.form) fechar(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !el.form.hidden) fechar(); });
  el.wa.addEventListener("click", function () { push("radar_whatsapp_click", { posicao: "pos_aplicacao", plano: planoInteresse || "nao_escolhido" }); });
  document.getElementById("rd-f-agenda").addEventListener("click", function () { push("form_clique", { form_clique: "agenda_radar_pagina" }); });

  // Mais prints
  var verMais = document.getElementById("rd-ver-mais");
  var prints = document.getElementById("rd-prints");
  if (verMais && prints) {
    verMais.addEventListener("click", function () {
      prints.classList.add("is-aberto");
      verMais.parentNode.hidden = true;
      push("radar_prints_abertos", {});
    });
  }

  // Revelação ao rolar e seções vistas
  var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window) {
    var vistos = {};
    var io = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (!it.isIntersecting) return;
        it.target.classList.add("is-visivel");
        var id = it.target.id;
        if (id && !vistos[id]) { vistos[id] = true; push("radar_secao_vista", { secao: id }); }
      });
    }, { threshold: 0.06 });
    var secoes = document.querySelectorAll("main section");
    for (var s = 0; s < secoes.length; s++) {
      if (!reduz && s > 0) secoes[s].classList.add("rd-reveal");
      io.observe(secoes[s]);
    }
  }

  push("radar_pagina_vista", {});
})();
