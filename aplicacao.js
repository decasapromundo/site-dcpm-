// Formulário de aplicação v2: uma pergunta por tela, avanço automático nas múltiplas escolhas,
// rota por perfil e envio para o Apps Script (a chave do CRM fica lá, nunca aqui).
(function () {
  var R = window.DCPMRegras;
  var O = R.OPCOES;
  var VERSAO_CONSENTIMENTO = "2026-11-02";
  var TEMPO_MINIMO_S = 15;
  var TEMPO_MINIMO_PARCIAL_S = 6; // nome, WhatsApp e e-mail em menos que isso é robô // abaixo disso a resposta é de robô: finge sucesso e não envia

  var PASSOS = [
    { id: "nome", tipo: "texto", titulo: "Como você se chama?", ph: "Nome e sobrenome", auto: "name" },
    { id: "whatsapp", tipo: "tel", titulo: "Qual é o seu WhatsApp?", ajuda: "É por ele que eu te chamo, em até 1 dia." },
    { id: "email", tipo: "email", titulo: "Qual é o seu e-mail?", ajuda: "Também uso para te enviar materiais." },
    { id: "fase", tipo: "opcao", titulo: "Em que fase do processo seletivo você está?" },
    { id: "ingles", tipo: "opcao", titulo: "Como está o seu inglês hoje?", ajuda: "Escolha pelo que você consegue fazer, não pelo tempo que estudou." },
    { id: "cargo", tipo: "opcao", titulo: "Qual cargo você quer a bordo?", duas: true },
    { id: "experiencia", tipo: "opcao", titulo: "Você já trabalhou com atendimento ao público?", ajuda: "Bar, restaurante, hotel, vendas." },
    { id: "urgencia", tipo: "opcao", titulo: "Quando você quer embarcar?" },
    { id: "obstaculo", tipo: "opcao", titulo: "O que mais trava você hoje?" },
    { id: "investimento", tipo: "opcao", titulo: "Quanto você consegue investir agora para acelerar seu embarque?", ajuda: "Sem compromisso. Serve só para eu indicar o caminho certo." },
    { id: "origem", tipo: "opcao", titulo: "Onde você conheceu a De Casa Pro Mundo?" },
    { id: "final", tipo: "final", titulo: "Quase lá. Três perguntas opcionais.", ajuda: "Pode pular. Ajudam a conversa no WhatsApp ser mais útil para você." }
  ];
  var TOTAL_OBRIGATORIAS = 11;

  var el = {
    inicio: document.getElementById("tela-inicio"),
    pergunta: document.getElementById("tela-pergunta"),
    final: document.getElementById("tela-final"),
    progresso: document.getElementById("progresso"),
    barra: document.getElementById("progresso-barra"),
    contador: document.getElementById("contador"),
    titulo: document.getElementById("pergunta-titulo"),
    ajuda: document.getElementById("pergunta-ajuda"),
    corpo: document.getElementById("pergunta-corpo"),
    erro: document.getElementById("pergunta-erro"),
    voltar: document.getElementById("btn-voltar"),
    continuar: document.getElementById("btn-continuar"),
    isca: document.getElementById("campo-isca"),
    envio: document.getElementById("final-envio")
  };

  var respostas = {};
  var atual = -1;
  var inicioEm = 0;
  var concluido = false;
  var enviando = false;
  var avisouEmail = null;
  var idResposta = novoId();

  // ---------- utilidades ----------
  function novoId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function push(evento, extra) {
    window.dataLayer = window.dataLayer || [];
    var d = { event: evento };
    for (var k in extra) d[k] = extra[k];
    window.dataLayer.push(d);
  }
  function guardar(chave, valor) { try { sessionStorage.setItem(chave, valor); } catch (e) {} }
  function ler(chave) { try { return sessionStorage.getItem(chave) || ""; } catch (e) { return ""; } }

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
    if (local) {
      var o = new URLSearchParams(location.search).get("endpoint");
      if (o) return o;
    }
    return padrao.indexOf("http") === 0 ? padrao : "";
  }

  // ---------- validações e máscara ----------
  function soDigitos(s) { return (s || "").replace(/\D/g, ""); }

  // Países do campo WhatsApp: máscara (# = dígito), tamanho do número nacional e exemplo.
  var PAISES = [
    { c: "BR", nome: "Brasil", flag: "🇧🇷", ddi: "55", m: "(##) #####-####", ph: "(11) 91234-5678" },
    { c: "PT", nome: "Portugal", flag: "🇵🇹", ddi: "351", m: "### ### ###", ph: "912 345 678" },
    { c: "US", nome: "Estados Unidos / Canadá", flag: "🇺🇸", ddi: "1", m: "(###) ###-####", ph: "(415) 555-2671" },
    { c: "ES", nome: "Espanha", flag: "🇪🇸", ddi: "34", m: "### ## ## ##", ph: "612 34 56 78" },
    { c: "GB", nome: "Reino Unido", flag: "🇬🇧", ddi: "44", m: "#### ######", ph: "7912 345678" },
    { c: "IE", nome: "Irlanda", flag: "🇮🇪", ddi: "353", m: "## ### ####", ph: "85 123 4567" },
    { c: "IT", nome: "Itália", flag: "🇮🇹", ddi: "39", m: "### ### ####", ph: "312 345 6789" },
    { c: "FR", nome: "França", flag: "🇫🇷", ddi: "33", m: "# ## ## ## ##", ph: "6 12 34 56 78" },
    { c: "AR", nome: "Argentina", flag: "🇦🇷", ddi: "54", m: "## ####-####", ph: "11 1234-5678" },
    { c: "CL", nome: "Chile", flag: "🇨🇱", ddi: "56", m: "# #### ####", ph: "9 1234 5678" },
    { c: "CO", nome: "Colômbia", flag: "🇨🇴", ddi: "57", m: "### ### ####", ph: "312 345 6789" },
    { c: "MX", nome: "México", flag: "🇲🇽", ddi: "52", m: "## #### ####", ph: "55 1234 5678" },
    { c: "PY", nome: "Paraguai", flag: "🇵🇾", ddi: "595", m: "### ######", ph: "981 123456" },
    { c: "UY", nome: "Uruguai", flag: "🇺🇾", ddi: "598", m: "## ### ###", ph: "94 123 456" },
    { c: "XX", nome: "Outro país (digite o código)", flag: "🌍", ddi: "", m: "", ph: "+49 151 23456789" }
  ];
  var pais = PAISES[0];
  function acharPais(c) { for (var i = 0; i < PAISES.length; i++) if (PAISES[i].c === c) return PAISES[i]; return PAISES[0]; }
  function tamanhoPais(p) { return p.m ? (p.m.match(/#/g) || []).length : 15; }

  // Aplica a máscara do país aos dígitos digitados. "Outro país" aceita o número todo com o código (até 15 dígitos).
  function mascararTelefone(valor, p) {
    p = p || pais;
    var d = soDigitos(valor);
    var max = tamanhoPais(p);
    if (p.ddi && d.indexOf(p.ddi) === 0 && d.length > max) d = d.slice(p.ddi.length);
    d = d.slice(0, max);
    if (!p.m) return d ? "+" + d : "";
    var saida = "", k = 0;
    for (var i = 0; i < p.m.length && k < d.length; i++) {
      saida += p.m.charAt(i) === "#" ? d.charAt(k++) : p.m.charAt(i);
    }
    return saida;
  }

  function validarNome(v) {
    v = v.trim();
    if (v.length < 2) return "Escreva o seu nome.";
    if (!/[A-Za-zÀ-ÿ]{2}/.test(v) || /https?:|www\.|@/i.test(v)) return "Escreva o seu nome, por favor.";
    if (v.length > 80) return "O nome ficou muito longo.";
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

  // ---------- telas ----------
  function mostrar(tela) {
    [el.inicio, el.pergunta, el.final].forEach(function (t) { t.hidden = t !== tela; });
  }

  function progresso(i) {
    var pct = Math.round(((i + 1) / PASSOS.length) * 100);
    el.progresso.hidden = false;
    el.barra.style.width = pct + "%";
    el.progresso.setAttribute("aria-valuenow", String(pct));
  }

  function nomeComDestaque(texto, botao) {
    // "Iniciante: resto" vira <strong>Iniciante</strong>: resto (dentro de um span, por causa do flex)
    var caixa = document.createElement("span");
    var i = texto.indexOf(": ");
    if (i > 0 && texto.slice(0, i).indexOf(" ") === -1) {
      var s = document.createElement("strong");
      s.textContent = texto.slice(0, i);
      caixa.appendChild(s);
      caixa.appendChild(document.createTextNode(texto.slice(i)));
    } else {
      caixa.appendChild(document.createTextNode(texto));
    }
    botao.appendChild(caixa);
  }

  function render(i, historico) {
    atual = i;
    var p = PASSOS[i];
    avisouEmail = null;
    mostrar(el.pergunta);
    progresso(i);
    el.erro.textContent = "";
    el.titulo.textContent = p.titulo;
    el.ajuda.textContent = p.ajuda || "";
    el.contador.textContent = p.tipo === "final" ? "Última etapa" : "Pergunta " + (i + 1) + " de " + TOTAL_OBRIGATORIAS;
    el.corpo.innerHTML = "";
    el.continuar.hidden = p.tipo === "opcao";
    el.continuar.textContent = p.tipo === "final" ? "Enviar" : "Continuar";
    el.continuar.disabled = false;

    if (p.tipo === "opcao") renderOpcoes(p);
    else if (p.tipo === "final") renderFinal();
    else renderCampo(p);

    if (historico !== false) {
      try { history.pushState({ passo: i }, "", location.href); } catch (e) {}
    }
    push("form_passo", { form_passo: p.id, form_passo_n: i + 1 });
    window.scrollTo(0, 0);
    var alvo = el.corpo.querySelector("input, textarea");
    if (alvo && p.tipo !== "final") alvo.focus(); else el.titulo.focus();
  }

  function renderCampo(p) {
    var input = document.createElement("input");
    input.className = "campo";
    input.id = "campo-" + p.id;
    input.value = p.tipo === "tel" ? "" : (respostas[p.id] || "");
    input.setAttribute("aria-labelledby", "pergunta-titulo");
    if (p.tipo === "texto") {
      input.type = "text"; input.placeholder = p.ph; input.autocomplete = "name"; input.maxLength = 80;
      el.corpo.appendChild(input);
    } else if (p.tipo === "email") {
      input.type = "email"; input.placeholder = "voce@exemplo.com"; input.autocomplete = "email";
      input.inputMode = "email"; input.maxLength = 120; input.autocapitalize = "none"; input.spellcheck = false;
      el.corpo.appendChild(input);
    } else if (p.tipo === "tel") {
      pais = acharPais(respostas.pais);
      var sel = document.createElement("select");
      sel.className = "campo campo-pais"; sel.id = "campo-pais";
      sel.setAttribute("aria-label", "País do WhatsApp");
      PAISES.forEach(function (x) {
        var o = document.createElement("option");
        o.value = x.c; o.textContent = x.flag + " " + x.nome + (x.ddi ? " (+" + x.ddi + ")" : "");
        if (x.c === pais.c) o.selected = true;
        sel.appendChild(o);
      });
      var caixa = document.createElement("div");
      caixa.className = "campo-tel";
      var ddi = document.createElement("span");
      ddi.className = "ddi"; ddi.setAttribute("aria-hidden", "true");
      function ajustar() {
        ddi.textContent = pais.ddi ? "+" + pais.ddi : "+";
        ddi.hidden = !pais.ddi;
        caixa.classList.toggle("sem-ddi", !pais.ddi);
        input.placeholder = pais.ph; input.maxLength = pais.m ? pais.m.length : 17;
      }
      input.type = "tel"; input.autocomplete = "tel-national"; input.inputMode = "numeric";
      input.value = mascararTelefone(respostas.whatsappLocal || "", pais);
      ajustar();
      sel.addEventListener("change", function () {
        pais = acharPais(sel.value); respostas.pais = pais.c;
        input.value = ""; ajustar(); el.erro.textContent = ""; input.removeAttribute("aria-invalid"); input.focus();
      });
      input.addEventListener("input", function () { input.value = mascararTelefone(input.value); });
      el.corpo.appendChild(sel);
      caixa.appendChild(ddi); caixa.appendChild(input);
      el.corpo.appendChild(caixa);
    }
    input.addEventListener("input", function () { input.removeAttribute("aria-invalid"); el.erro.textContent = ""; });
  }

  function renderOpcoes(p) {
    var grupo = document.createElement("div");
    grupo.className = "opcoes" + (p.duas ? " duas" : "");
    grupo.setAttribute("role", "radiogroup");
    grupo.setAttribute("aria-labelledby", "pergunta-titulo");
    O[p.id].forEach(function (texto) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opcao";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", respostas[p.id] === texto ? "true" : "false");
      nomeComDestaque(texto, b);
      b.addEventListener("click", function () {
        respostas[p.id] = texto;
        Array.prototype.forEach.call(grupo.children, function (c) { c.setAttribute("aria-checked", c === b ? "true" : "false"); });
        setTimeout(function () { if (atual === PASSOS.indexOf(p)) avancar(); }, 220);
      });
      grupo.appendChild(b);
    });
    el.corpo.appendChild(grupo);
  }

  function renderFinal() {
    var html = [
      '<label class="campo-rotulo" for="campo-instagram">Seu Instagram <small>(opcional)</small></label>',
      '<input class="campo" id="campo-instagram" type="text" placeholder="@seuusuario" maxlength="40" autocapitalize="none" spellcheck="false">',
      '<label class="campo-rotulo" for="campo-motivo">Em uma frase, por que você quer embarcar? <small>(opcional)</small></label>',
      '<textarea class="campo" id="campo-motivo" rows="3" maxlength="300" placeholder="Escreva do seu jeito"></textarea>',
      '<label class="campo-rotulo" for="campo-idade">Sua idade <small>(opcional)</small></label>',
      '<select class="campo" id="campo-idade"><option value="">Escolher</option></select>'
    ].join("");
    el.corpo.innerHTML = html;
    var sel = document.getElementById("campo-idade");
    O.idade.forEach(function (t) { var o = document.createElement("option"); o.value = t; o.textContent = t; sel.appendChild(o); });
    document.getElementById("campo-instagram").value = respostas.instagram || "";
    document.getElementById("campo-motivo").value = respostas.motivo || "";
    sel.value = respostas.idade || "";
  }

  // ---------- navegação ----------
  function erro(msg, campo) {
    el.erro.textContent = msg;
    if (campo) { campo.setAttribute("aria-invalid", "true"); campo.focus(); }
    return false;
  }

  function validarPassoAtual() {
    var p = PASSOS[atual];
    if (p.tipo === "opcao") {
      return respostas[p.id] ? true : erro("Escolha uma opção para continuar.");
    }
    if (p.tipo === "final") return coletarFinal();
    var campo = document.getElementById("campo-" + p.id);
    var v = campo.value;
    var msg = p.id === "nome" ? validarNome(v) : p.id === "whatsapp" ? validarWhatsapp(v) : validarEmail(v);
    if (msg) return erro(msg, campo);
    if (p.id === "email") {
      var s = sugerirEmail(v);
      if (s && avisouEmail !== v) {
        avisouEmail = v;
        el.erro.innerHTML = "";
        var t = document.createElement("span");
        t.className = "sugestao";
        t.appendChild(document.createTextNode("Você quis dizer "));
        var b = document.createElement("button");
        b.type = "button"; b.textContent = s;
        b.addEventListener("click", function () { campo.value = s; avisouEmail = s; el.erro.textContent = ""; });
        t.appendChild(b);
        t.appendChild(document.createTextNode("? Se está certo, toque em Continuar de novo."));
        el.erro.appendChild(t);
        campo.focus();
        return false;
      }
      respostas.email = v.trim().toLowerCase();
    } else if (p.id === "nome") {
      respostas.nome = v.trim().replace(/\s+/g, " ");
    } else {
      respostas.whatsappLocal = soDigitos(v);
      respostas.whatsapp = pais.ddi + soDigitos(v);
    }
    return true;
  }

  function coletarFinal() {
    respostas.instagram = document.getElementById("campo-instagram").value.trim().replace(/^@+/, "").slice(0, 40);
    respostas.motivo = document.getElementById("campo-motivo").value.trim().slice(0, 300);
    respostas.idade = document.getElementById("campo-idade").value;
    return true;
  }

  function avancar() {
    if (!validarPassoAtual()) return;
    if (PASSOS[atual].tipo === "final") return concluir();
    if (PASSOS[atual].id === "email") enviarParcial();
    render(atual + 1);
  }

  function voltar() {
    if (atual <= 0) { irParaInicio(); return; }
    render(atual - 1);
  }

  function irParaInicio() {
    atual = -1;
    mostrar(el.inicio);
    el.progresso.hidden = true;
    el.inicio.querySelector("h1").focus();
  }

  // ---------- conclusão e envio ----------
  var TELAS_FINAIS = { A: "A", A2: "A2", B: "B", C: "C", D: "D" };

  function montarPayload(res) {
    return {
      tipo: "final",
      id_resposta: idResposta,
      nome: respostas.nome,
      whatsapp: respostas.whatsapp,
      email: respostas.email,
      fase: respostas.fase,
      ingles: respostas.ingles,
      cargo: respostas.cargo,
      experiencia: respostas.experiencia,
      urgencia: respostas.urgencia,
      obstaculo: respostas.obstaculo,
      investimento: respostas.investimento,
      origem: respostas.origem,
      instagram: respostas.instagram || "",
      motivo: respostas.motivo || "",
      idade: respostas.idade || "",
      consentimento: "sim",
      consentimento_versao: VERSAO_CONSENTIMENTO,
      utm_source: utms.utm_source || "",
      utm_medium: utms.utm_medium || "",
      utm_campaign: utms.utm_campaign || "",
      utm_content: utms.utm_content || "",
      perfil_site: res.perfil,
      tempo_s: Math.round((Date.now() - inicioEm) / 1000),
      site: el.isca.value
    };
  }

  function concluir() {
    if (concluido || enviando) return;
    enviando = true;
    el.continuar.disabled = true;
    var res = R.classificar(respostas);
    var robo = el.isca.value !== "" || (Date.now() - inicioEm) / 1000 < TEMPO_MINIMO_S;

    concluido = true;
    mostrarFinal(res);
    push("form_concluido", { form_perfil: res.perfil, form_temperatura: res.temperatura });

    if (robo) { el.envio.textContent = ""; return; } // finge sucesso, não envia
    enviar(montarPayload(res));
  }

  function mostrarFinal(res) {
    mostrar(el.final);
    el.progresso.hidden = true;
    var alvo = null;
    Array.prototype.forEach.call(el.final.querySelectorAll(".final"), function (a) {
      var ok = a.getAttribute("data-perfil") === TELAS_FINAIS[res.perfil];
      a.hidden = !ok;
      if (ok) alvo = a;
    });
    if (res.perfil === "C") {
      var texto = "Oi! Descobri a De Casa Pro Mundo e lembrei de você. Responde 2 minutos de perguntas e descobre o melhor próximo passo para embarcar em navio de cruzeiro: https://decasapromundo.com/aplicacao";
      document.getElementById("btn-indicar").href = "https://wa.me/?text=" + encodeURIComponent(texto);
    }
    try { history.pushState({ passo: "final" }, "", location.href); } catch (e) {}
    window.scrollTo(0, 0);
    if (alvo) alvo.querySelector(".final-titulo").focus();
  }

  // Lead parcial: contato válido + consentimento. Melhor esforço, sem fila: o envio final leva tudo de novo.
  function enviarParcial() {
    var url = endpoint();
    var tempo = Math.round((Date.now() - inicioEm) / 1000);
    if (el.isca.value !== "" || tempo < TEMPO_MINIMO_PARCIAL_S) return;
    var p = {
      tipo: "parcial",
      id_resposta: idResposta,
      nome: respostas.nome, whatsapp: respostas.whatsapp, email: respostas.email,
      consentimento: "sim", consentimento_versao: VERSAO_CONSENTIMENTO,
      utm_source: utms.utm_source || "", utm_medium: utms.utm_medium || "",
      utm_campaign: utms.utm_campaign || "", utm_content: utms.utm_content || "",
      tempo_s: tempo, site: el.isca.value
    };
    push("form_contato", {});
    if (!url) { if (window.console) console.info("[prévia] lead parcial:", p); return; }
    try { fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: JSON.stringify(p) }).catch(function () {}); } catch (e) {}
  }

  var FILA = "dcpm_fila_v2";
  function enviar(payload) {
    var url = endpoint();
    if (!url) {
      el.envio.textContent = "Prévia: o envio ainda não está ligado ao Apps Script.";
      if (window.console) console.info("[prévia] payload que seria enviado:", payload);
      return;
    }
    el.envio.textContent = "Enviando suas respostas...";
    tentar(url, payload, 0);
  }

  function tentar(url, payload, n) {
    fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: JSON.stringify(payload) })
      .then(function () { el.envio.textContent = "Respostas enviadas."; limparFila(payload.id_resposta); })
      .catch(function () {
        if (n === 0) enfileirar(payload);
        if (n < 3) {
          el.envio.textContent = "Sem conexão. Tentando de novo...";
          setTimeout(function () { tentar(url, payload, n + 1); }, 3000 * (n + 1));
        } else {
          el.envio.textContent = "Não consegui enviar agora. Vou tentar de novo quando a conexão voltar, mantenha esta página aberta.";
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
  document.getElementById("btn-comecar").addEventListener("click", function () {
    var caixa = document.getElementById("consentimento-inicio");
    if (!caixa.checked) {
      document.getElementById("erro-inicio").textContent = "Marque a caixa para continuar.";
      caixa.focus();
      return;
    }
    document.getElementById("erro-inicio").textContent = "";
    respostas.consentimento = true;
    inicioEm = Date.now();
    push("form_inicio", {});
    render(0);
  });
  el.pergunta.addEventListener("submit", function (e) { e.preventDefault(); avancar(); });
  el.voltar.addEventListener("click", function () {
    if (history.state && typeof history.state.passo === "number") history.back(); else voltar();
  });

  window.addEventListener("popstate", function (e) {
    var s = e.state;
    if (concluido) { try { history.pushState({ passo: "final" }, "", location.href); } catch (x) {} return; }
    if (s && typeof s.passo === "number") render(s.passo, false);
    else irParaInicio();
  });

  // cliques nos botões das telas finais, sem dados pessoais
  el.final.addEventListener("click", function (e) {
    var a = e.target.closest("[data-clique]");
    if (a) push("form_clique", { form_clique: a.getAttribute("data-clique") });
  });
})();
