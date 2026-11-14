/* Página da consultoria RADAR: botão de WhatsApp, personalização, abas, escolha de plano e medição. */
(function () {
  "use strict";

  var NUMERO = "5513996540972";
  var URL_PAGINA = "https://decasapromundo.com/radar";
  var plano = "";
  var lead = {};
  try { lead = JSON.parse(sessionStorage.getItem("dcpm_lead") || "{}") || {}; } catch (e) { lead = {}; }

  function empurrar(evento, dados) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: evento };
    for (var k in dados) { if (Object.prototype.hasOwnProperty.call(dados, k)) o[k] = dados[k]; }
    window.dataLayer.push(o);
  }

  function primeiroNome(n) { return String(n || "").trim().split(/\s+/)[0]; }

  /* Mensagem pronta do WhatsApp */
  function mensagem(planoDoBotao) {
    var nome = primeiroNome(lead.nome);
    var p = planoDoBotao || plano;
    var m = nome ? "Oi Augusto, aqui é " + nome + ". Respondi" : "Oi Augusto, respondi";
    m += " o formulário da RADAR e li a página.";
    m += p ? " Quero entender o plano " + p + "." : " Quero entender qual plano combina comigo.";
    return m;
  }
  function urlWa(planoDoBotao) { return "https://wa.me/" + NUMERO + "?text=" + encodeURIComponent(mensagem(planoDoBotao)); }

  function atualizarLinks() {
    var botoes = document.querySelectorAll("[data-wa]");
    for (var i = 0; i < botoes.length; i++) {
      botoes[i].href = urlWa(botoes[i].getAttribute("data-plano-wa") || "");
    }
    var comp = document.getElementById("rd-compartilhar");
    if (comp) {
      var t = "Estou olhando a consultoria RADAR do Augusto, para trabalhar em navio de cruzeiro. Dá uma olhada: " + URL_PAGINA;
      comp.href = "https://wa.me/?text=" + encodeURIComponent(t);
    }
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-wa]") : null;
    if (a) empurrar("radar_whatsapp_click", { posicao: a.getAttribute("data-wa"), plano: a.getAttribute("data-plano-wa") || plano || "nao_escolhido" });
    var c = e.target.closest ? e.target.closest("[data-compartilhar]") : null;
    if (c) empurrar("radar_compartilhar", {});
  });

  /* Situação: abas "sozinho x RADAR" */
  var TEXTOS = {
    comecar: {
      sozinho: "Você assiste a vídeos que dizem coisas diferentes e não sabe qual vale para o seu perfil, para o cargo e para a companhia. O tempo passa e o primeiro envio de currículo fica para depois.",
      radar: "Você recebe um caminho: o que fazer primeiro, para qual cargo e companhia faz sentido aplicar e em que ordem. Em vez de quinze vídeos, uma direção para o seu caso."
    },
    ignorado: {
      sozinho: "Sem alguém olhando o seu currículo como o recrutador olha, você não descobre o motivo. Muitas vezes ele não foi rejeitado, foi ignorado: não mostra, em poucos segundos, por que você é a pessoa certa.",
      radar: "O seu currículo é analisado e posicionado antes do próximo envio. Nos planos individuais ele é refeito comigo, a partir do que você já viveu. Você não precisa inventar experiência."
    },
    reprovado: {
      sozinho: "Sem saber onde errou, você tende a repetir as mesmas respostas na próxima. E uma reprovação costuma significar meses de espera para tentar de novo, então errar de novo custa caro.",
      radar: "A gente descobre onde a entrevista travou e treina com perguntas reais e com as suas próprias histórias, em inglês, até a resposta sair natural. Você chega na próxima sabendo o que esperar."
    }
  };
  var abas = document.querySelectorAll(".rd-aba");
  function escolherSituacao(chave, manual) {
    if (!TEXTOS[chave]) chave = "comecar";
    for (var i = 0; i < abas.length; i++) {
      var ativa = abas[i].getAttribute("data-situacao") === chave;
      abas[i].setAttribute("aria-selected", ativa ? "true" : "false");
      abas[i].tabIndex = ativa ? 0 : -1;
    }
    document.getElementById("rd-sozinho-texto").textContent = TEXTOS[chave].sozinho;
    document.getElementById("rd-radar-texto").textContent = TEXTOS[chave].radar;
    if (manual) empurrar("radar_situacao", { situacao: chave });
  }
  for (var i = 0; i < abas.length; i++) {
    abas[i].addEventListener("click", function () { escolherSituacao(this.getAttribute("data-situacao"), true); });
    abas[i].addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var lista = Array.prototype.slice.call(abas);
      var pos = lista.indexOf(this);
      var prox = lista[(pos + (e.key === "ArrowRight" ? 1 : lista.length - 1)) % lista.length];
      prox.focus();
      escolherSituacao(prox.getAttribute("data-situacao"), true);
    });
  }

  /* Personalização com o que o formulário guardou (sem dado na URL) */
  var fase = String(lead.fase || "");
  var situacaoInicial = "comecar";
  var fraseFase = "";
  if (fase.indexOf("Já enviei") === 0) { situacaoInicial = "ignorado"; fraseFase = "já enviou currículo e não foi chamado"; }
  else if (fase.indexOf("Já fiz entrevista") === 0) { situacaoInicial = "reprovado"; fraseFase = "já fez entrevista e não passou"; }
  else if (fase.indexOf("Já pesquisei") === 0) { fraseFase = "já pesquisou, mas ainda não enviou currículo"; }
  else if (fase.indexOf("Ainda não sei") === 0) { fraseFase = "ainda não sabe por onde começar"; }
  var nome = primeiroNome(lead.nome);
  var pessoal = document.getElementById("rd-pessoal");
  if (pessoal && nome && fraseFase) {
    pessoal.textContent = nome + ", você marcou que " + fraseFase + ". A página começa por aí.";
    pessoal.hidden = false;
  }
  escolherSituacao(situacaoInicial, false);

  /* Escolha de plano */
  var RESULTADOS = {
    Sprint: "Pelo que você marcou, comece a conversa pelo Sprint. Você monta o currículo e o roteiro, e eu analiso nas calls em grupo.",
    Premium: "Pelo que você marcou, comece a conversa pelo Premium. Currículo e entrevista feitos comigo, com acompanhamento individual.",
    VIP: "Pelo que você marcou, comece a conversa pelo VIP. Acompanhamento até o embarque e preparo para o que vem depois."
  };
  var opcoes = document.querySelectorAll(".rd-opcao");
  var cartoes = document.querySelectorAll(".rd-plano");
  var resultado = document.getElementById("rd-resultado");
  for (var j = 0; j < opcoes.length; j++) {
    opcoes[j].addEventListener("click", function () {
      plano = this.getAttribute("data-plano");
      for (var k = 0; k < opcoes.length; k++) opcoes[k].setAttribute("aria-pressed", opcoes[k] === this ? "true" : "false");
      for (var m = 0; m < cartoes.length; m++) cartoes[m].classList.toggle("is-escolhido", cartoes[m].getAttribute("data-plano") === plano);
      resultado.textContent = RESULTADOS[plano];
      resultado.hidden = false;
      atualizarLinks();
      empurrar("radar_plano_escolhido", { plano: plano });
    });
  }

  /* Barra fixa do celular: some quando o fecho aparece */
  var barra = document.getElementById("rd-barra");
  var fim = document.getElementById("fim");
  var topoHero = document.querySelector(".rd-hero");
  var heroVisivel = true, fimVisivel = false;
  function sincronizarBarra() { if (barra) barra.classList.toggle("is-oculta", heroVisivel || fimVisivel); }

  /* Revelação, seções vistas e abertura de perguntas */
  var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window) {
    var vistos = {};
    var io = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (it.target === topoHero) { heroVisivel = it.isIntersecting; sincronizarBarra(); return; }
        if (it.target === fim) { fimVisivel = it.isIntersecting; sincronizarBarra(); }
        if (it.isIntersecting) {
          it.target.classList.add("is-visivel");
          var id = it.target.id;
          if (id && !vistos[id]) { vistos[id] = true; empurrar("radar_secao_vista", { secao: id }); }
        }
      });
    }, { threshold: 0.08 });
    var secoes = document.querySelectorAll("main section");
    for (var s = 0; s < secoes.length; s++) {
      if (!reduz && secoes[s] !== topoHero) secoes[s].classList.add("rd-reveal");
      io.observe(secoes[s]);
    }
  } else { heroVisivel = false; sincronizarBarra(); }

  var perguntas = document.querySelectorAll(".rd-faq details");
  for (var q = 0; q < perguntas.length; q++) {
    perguntas[q].addEventListener("toggle", function () {
      if (this.open) empurrar("radar_faq_aberta", { pergunta: this.querySelector("summary").textContent.trim() });
    });
  }

  atualizarLinks();
  empurrar("radar_pagina_vista", { personalizada: !!(nome && fraseFase) });
})();
