// Animação de entrada: adiciona "visivel" quando o elemento entra na tela
(function () {
  var elementos = document.querySelectorAll(".revelar");
  if (!("IntersectionObserver" in window)) {
    elementos.forEach(function (el) { el.classList.add("visivel"); });
    return;
  }
  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("visivel");
        observador.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.15 });
  elementos.forEach(function (el) { observador.observe(el); });
})();

// Carrossel de fotos: setas, pontos e avanço automático (pausa com o mouse)
(function () {
  var carrossel = document.querySelector("[data-carrossel]");
  if (!carrossel) return;
  var trilho = carrossel.querySelector("[data-trilho]");
  var slides = trilho.children;
  var pontosBox = carrossel.querySelector("[data-pontos]");
  var atual = 0;
  var pausado = false;
  var reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (var i = 0; i < slides.length; i++) {
    var botao = document.createElement("button");
    botao.type = "button";
    botao.setAttribute("aria-label", "Foto " + (i + 1));
    (function (indice) {
      botao.addEventListener("click", function () { irPara(indice); });
    })(i);
    pontosBox.appendChild(botao);
  }

  function irPara(indice) {
    atual = (indice + slides.length) % slides.length;
    trilho.scrollTo({ left: slides[atual].offsetLeft, behavior: "smooth" });
    atualizarPontos();
  }

  function atualizarPontos() {
    var botoes = pontosBox.children;
    for (var j = 0; j < botoes.length; j++) {
      botoes[j].setAttribute("aria-current", j === atual ? "true" : "false");
    }
  }

  carrossel.querySelector("[data-proxima]").addEventListener("click", function () { irPara(atual + 1); });
  carrossel.querySelector("[data-anterior]").addEventListener("click", function () { irPara(atual - 1); });
  carrossel.addEventListener("mouseenter", function () { pausado = true; });
  carrossel.addEventListener("mouseleave", function () { pausado = false; });

  trilho.addEventListener("scroll", function () {
    var largura = trilho.clientWidth || 1;
    var novo = Math.round(trilho.scrollLeft / largura);
    if (novo !== atual) { atual = novo; atualizarPontos(); }
  }, { passive: true });

  atualizarPontos();
  if (!reduzirMovimento) {
    setInterval(function () { if (!pausado) irPara(atual + 1); }, 4500);
  }
})();

// Formulário de contato: envia para o endpoint configurado no atributo data-endpoint
(function () {
  var form = document.querySelector("form[data-endpoint]");
  if (!form) return;
  var aviso = form.querySelector(".aviso");

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    var endpoint = form.getAttribute("data-endpoint");
    if (endpoint.indexOf("SEU_ID") !== -1) {
      aviso.textContent = "Formulário ainda não configurado. Veja o README.";
      return;
    }
    aviso.textContent = "Enviando...";
    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    }).then(function (resposta) {
      if (resposta.ok) {
        form.reset();
        aviso.textContent = "Recebido! Em breve entro em contato.";
      } else {
        aviso.textContent = "Não foi possível enviar. Tente novamente.";
      }
    }).catch(function () {
      aviso.textContent = "Erro de conexão. Tente novamente.";
    });
  });
})();
