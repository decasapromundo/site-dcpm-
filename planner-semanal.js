/* Planner Semanal de Inglês. A pessoa avalia a semana, o planner mostra o ponto mais fraco e monta os dias de estudo.
   Tudo fica salvo só neste aparelho (localStorage). Nada é enviado. */
(function () {
  "use strict";

  var HAB = [
    { id: "speaking", nome: "Speaking", pt: "falar", q: [
      "Falei inglês em voz alta por pelo menos 10 minutos no total.",
      "Consegui contar algo meu (rotina, opinião) sem travar a cada frase.",
      "Entendi quem falou comigo e consegui responder em inglês."
    ] },
    { id: "writing", nome: "Writing", pt: "escrever", q: [
      "Escrevi pelo menos um parágrafo de 5 frases ou mais em inglês.",
      "Escrevi pensando em inglês, sem traduzir palavra por palavra do português.",
      "Reli o que escrevi e consegui achar e corrigir meus erros."
    ] },
    { id: "listening", nome: "Listening", pt: "ouvir", q: [
      "Entendi a ideia principal de um vídeo ou podcast sem ler legenda.",
      "Peguei detalhes (nomes, números, motivos) em um áudio.",
      "Acompanhei uma fala em velocidade natural sem pausar toda hora."
    ] },
    { id: "reading", nome: "Reading", pt: "ler", q: [
      "Li um texto de uma página ou mais em inglês.",
      "Entendi o texto sem traduzir cada palavra.",
      "Adivinhei o significado de palavras novas pelo contexto."
    ] }
  ];
  var ESCALA = ["Não consegui", "Com muita dificuldade", "Com alguma dificuldade", "Foi fácil"];

  // Atividades por habilidade e nível (1 = A1/A2, 2 = B1, 3 = B2/C1). Três por nível, trocam de semana em semana.
  var TAREFAS = {
    speaking: {
      1: [
        ["Shadowing de 1 minuto", "Escolha um vídeo curto com legenda em inglês. Ouça uma frase, pause e repita imitando ritmo e entonação. Repita o trecho 3 vezes."],
        ["Meu dia em voz alta", "Grave um áudio de 1 minuto contando o que você fez hoje (I woke up, I went to, I ate). Ouça e anote 2 palavras em que travou."],
        ["Nomeie o que você vê", "Olhe ao redor e descreva 15 objetos em frases completas: This is a blue cup. I use it every morning."]
      ],
      2: [
        ["Gravação de 2 minutos", "Grave 2 minutos respondendo: What was the best part of your week and why? Regrave melhorando uma única coisa (pausas, vocabulário ou pronúncia)."],
        ["Shadowing e resumo", "Faça shadowing de 3 minutos de um podcast ou entrevista. Depois resuma em voz alta, em 5 frases, o que você ouviu."],
        ["Entrevista com você mesmo", "Simule uma entrevista de trabalho fazendo as duas vozes: Tell me about yourself, Why do you want to work on a ship? Grave e ouça depois."]
      ],
      3: [
        ["Opinião de 3 minutos", "Dê sua opinião sobre uma notícia da semana com 2 argumentos e 1 exemplo. Grave e confira se usou conectores (however, on the other hand, as a result)."],
        ["Explique seu trabalho", "Explique em 3 minutos o que você faz (trabalho ou estudo) para um estrangeiro. Sem pausas longas e sem recorrer ao português."],
        ["Situação difícil a bordo", "Grave como você responderia a um hóspede irritado com um pedido que atrasou. Peça desculpa, explique e ofereça uma solução."]
      ]
    },
    writing: {
      1: [
        ["5 frases sobre a rotina", "Escreva 5 frases sobre sua rotina (I wake up at…). Releia e confira o verbo de cada frase."],
        ["Diário de 3 linhas", "Escreva: Today I… / I felt… / Tomorrow I will… Repita por 3 dias, mudando as ideias."],
        ["Descreva uma foto", "Escolha uma foto sua ou de um lugar e descreva em 6 frases: quem, onde, o que está acontecendo."]
      ],
      2: [
        ["Parágrafo de 8 frases", "Escreva sobre seu fim de semana em 8 frases. Releia em voz alta e corrija pelo menos 3 erros."],
        ["E-mail pedindo informação", "Escreva um e-mail de 80 a 100 palavras pedindo informação sobre um curso, vaga ou reserva. Tenha saudação, pedido e despedida."],
        ["Reescreva com conectores", "Pegue um texto seu e reescreva usando 3 conectores novos (because, so, but, although)."]
      ],
      3: [
        ["Texto de opinião", "Escreva 150 a 200 palavras opinando sobre um tema, com introdução, 2 argumentos e conclusão."],
        ["E-mail formal", "Escreva um e-mail formal (candidatura ou reclamação) em 150 palavras. Peça a um professor ou a uma IA para apontar 3 melhorias."],
        ["Resumo sem copiar", "Resuma em 100 palavras um artigo ou vídeo da semana sem copiar frases do original."]
      ]
    },
    listening: {
      1: [
        ["Música com letra", "Ouça uma música curta lendo a letra. Depois ouça de novo e complete 8 linhas com lacunas escritas por você."],
        ["Vídeo curto em 2 passadas", "Assista a um vídeo de 2 a 3 minutos para iniciantes com legenda em inglês. Veja de novo sem legenda e anote 5 palavras que reconheceu."],
        ["Ditado de 30 segundos", "Escolha um áudio de 30 segundos. Pause a cada frase e escreva o que ouviu. Depois confira com a transcrição."]
      ],
      2: [
        ["Podcast de 10 minutos", "Ouça 10 minutos de um podcast de nível intermediário. Anote 5 ideias principais."],
        ["YouTube sem legenda", "Assista a um vídeo sem legenda. Depois ative a legenda e compare 3 trechos que você não entendeu."],
        ["Ditado de 1 minuto", "Faça o ditado de um áudio de 1 minuto em partes de 10 segundos. Confira e marque os sons que errou."]
      ],
      3: [
        ["Entrevista em velocidade normal", "Ouça 15 minutos de uma entrevista ou podcast sem pausar. Resuma em 5 frases o que foi dito."],
        ["Série ou filme com legenda em inglês", "Assista a 15 minutos e anote 8 expressões ou gírias novas, com a frase em que apareceram."],
        ["Dois sotaques", "Ouça dois falantes com sotaques diferentes (britânico e americano, por exemplo) sobre o mesmo tema. Anote 3 diferenças de pronúncia ou vocabulário."]
      ]
    },
    reading: {
      1: [
        ["Texto curto com 5 palavras", "Leia um texto de uns 100 palavras. Sublinhe 5 palavras novas, procure o significado e escreva uma frase sua com cada uma."],
        ["Leitura do dia a dia", "Leia rótulos, legendas, cardápios ou mensagens em inglês por 10 minutos e anote 5 palavras úteis."],
        ["Diálogo e perguntas", "Leia um diálogo curto e responda por escrito 3 perguntas sobre ele, em inglês."]
      ],
      2: [
        ["Notícia de 300 palavras", "Leia uma notícia, grife 8 palavras novas e resuma em 3 frases em inglês."],
        ["Livro adaptado", "Leia 10 páginas de um livro adaptado para o seu nível. Anote só as palavras que aparecem mais de uma vez."],
        ["Blog sobre um assunto seu", "Leia um post sobre algo que você curte (viagens, esporte, culinária) e anote 5 combinações de palavras que se repetem."]
      ],
      3: [
        ["Artigo longo", "Leia um artigo de 600 palavras ou mais. Escreva a ideia principal e 2 argumentos do autor."],
        ["Capítulo sem dicionário", "Leia 15 minutos de um livro sem consultar dicionário. No fim, confira apenas 5 palavras."],
        ["Dois pontos de vista", "Leia dois textos sobre o mesmo tema com opiniões diferentes. Escreva em 5 frases onde eles concordam e onde discordam."]
      ]
    }
  };

  var CHAVE = "dcpm-planner-semanal-v1";

  function $(s) { return document.querySelector(s); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- Armazenamento ---------- */
  function carregar() {
    try {
      var d = JSON.parse(localStorage.getItem(CHAVE));
      if (d && Array.isArray(d.semanas)) return d;
    } catch (e) {}
    return { semanas: [] };
  }
  var dados = carregar();
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch (e) {} }

  /* ---------- Datas ---------- */
  function segundaDe(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function iso(d) {
    var m = d.getMonth() + 1, dia = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dia < 10 ? "0" : "") + dia;
  }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function curto(s) { return parse(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""); }
  function fimDe(s) { var d = parse(s); d.setDate(d.getDate() + 6); return iso(d); }
  var semanaAtual = iso(segundaDe(new Date()));
  function daSemana() { return dados.semanas.filter(function (w) { return w.id === semanaAtual; })[0]; }
  function porId(id) { return HAB.filter(function (h) { return h.id === id; })[0]; }

  /* ---------- Cálculo ---------- */
  function nota(respostas, id) {
    var soma = 0;
    respostas[id].forEach(function (v) { soma += v; });
    return Math.round((soma - 3) / 9 * 100);
  }

  // Mais dias para a habilidade mais fraca; nunca a mesma habilidade em dois dias seguidos quando dá para evitar.
  function montarPlano(notas, nivel, dias, minutos, deslocamento) {
    var peso = {}, total = 0, cota = {}, usados = 0;
    HAB.forEach(function (h) { peso[h.id] = 1 + (100 - notas[h.id]) / 50; total += peso[h.id]; });
    HAB.forEach(function (h) {
      var q = dias * peso[h.id] / total;
      cota[h.id] = Math.floor(q); usados += cota[h.id]; peso[h.id] = q - cota[h.id];
    });
    var ordem = HAB.map(function (h) { return h.id; }).sort(function (a, b) { return peso[b] - peso[a]; });
    for (var i = 0; usados < dias; i++, usados++) cota[ordem[i % ordem.length]]++;

    var seq = [], ultimo = null;
    for (var n = 0; n < dias; n++) {
      var melhor = null;
      HAB.forEach(function (h) {
        if (cota[h.id] <= 0) return;
        var pri = cota[h.id] + (h.id === ultimo ? -100 : 0);
        if (!melhor || pri > melhor.pri) melhor = { id: h.id, pri: pri };
      });
      seq.push(melhor.id); cota[melhor.id]--; ultimo = melhor.id;
    }
    var vez = {};
    return seq.map(function (id) {
      vez[id] = vez[id] || 0;
      var t = TAREFAS[id][nivel][(vez[id] + deslocamento) % 3];
      vez[id]++;
      return { hab: id, titulo: t[0], texto: t[1], min: minutos, feito: false };
    });
  }

  /* ---------- Abas ---------- */
  function mostrar(aba) {
    ["aval", "plano", "hist"].forEach(function (t) {
      $("#ps-" + t).hidden = (t !== aba);
      $("#ps-aba-" + t).setAttribute("aria-selected", t === aba ? "true" : "false");
    });
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-aba],[data-ir]");
    if (b) { mostrar(b.getAttribute("data-aba") || b.getAttribute("data-ir")); window.scrollTo(0, 0); }
  });

  /* ---------- Avaliação ---------- */
  function montarPerguntas() {
    var h = "";
    HAB.forEach(function (hab) {
      h += '<fieldset class="ps-bloco"><legend class="ps-bloco-topo">' + hab.nome + ' <small>(' + hab.pt + ')</small></legend>';
      hab.q.forEach(function (q, qi) {
        h += '<div class="ps-q" role="radiogroup" aria-label="' + esc(q) + '"><p>' + esc(q) + '</p><div class="ps-escala">';
        ESCALA.forEach(function (rot, vi) {
          var id = "ps-" + hab.id + "-" + qi + "-" + (vi + 1);
          h += '<label for="' + id + '"><input type="radio" id="' + id + '" name="' + hab.id + '-' + qi + '" value="' + (vi + 1) + '"><span>' + rot + '</span></label>';
        });
        h += '</div></div>';
      });
      h += '</fieldset>';
    });
    $("#ps-perguntas").innerHTML = h;
  }
  function preencher() {
    var w = daSemana(); if (!w) return;
    $("#ps-nivel").value = w.nivel; $("#ps-dias").value = w.dias; $("#ps-min").value = w.min;
    HAB.forEach(function (h) {
      w.respostas[h.id].forEach(function (v, qi) {
        var el = document.getElementById("ps-" + h.id + "-" + qi + "-" + v);
        if (el) el.checked = true;
      });
    });
  }
  $("#ps-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var respostas = {}, faltam = 0;
    HAB.forEach(function (h) {
      respostas[h.id] = [];
      h.q.forEach(function (_, qi) {
        var c = document.querySelector('input[name="' + h.id + "-" + qi + '"]:checked');
        if (c) respostas[h.id].push(+c.value); else faltam++;
      });
    });
    if (faltam) {
      $("#ps-erro").textContent = "Faltam " + faltam + (faltam > 1 ? " respostas." : " resposta.") + " Responda todas para gerar o plano.";
      return;
    }
    $("#ps-erro").textContent = "";
    var notas = {};
    HAB.forEach(function (h) { notas[h.id] = nota(respostas, h.id); });
    var nivel = +$("#ps-nivel").value, dias = +$("#ps-dias").value, min = +$("#ps-min").value;
    var anteriores = dados.semanas.filter(function (w) { return w.id !== semanaAtual; }).length;
    dados.semanas = dados.semanas.filter(function (w) { return w.id !== semanaAtual; });
    dados.semanas.push({ id: semanaAtual, nivel: nivel, dias: dias, min: min, respostas: respostas, notas: notas, plano: montarPlano(notas, nivel, dias, min, anteriores) });
    dados.semanas.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    salvar(); desenharPlano(); desenharHistorico(); mostrar("plano"); window.scrollTo(0, 0);
  });

  /* ---------- Plano ---------- */
  function desenharPlano() {
    var w = daSemana(), el = $("#ps-plano");
    if (!w) {
      el.innerHTML = '<div class="ps-vazio"><p>Você ainda não fez a avaliação desta semana.</p><button class="btn" type="button" data-ir="aval">Fazer a avaliação</button></div>';
      return;
    }
    var ordem = HAB.slice().sort(function (a, b) { return w.notas[a.id] - w.notas[b.id]; });
    var fraca = ordem[0];
    var feitos = w.plano.filter(function (d) { return d.feito; }).length;
    var pct = Math.round(feitos / w.plano.length * 100);

    var h = '<span class="eyebrow">Semana de ' + curto(w.id) + ' a ' + curto(fimDe(w.id)) + '</span>';
    h += '<h2 tabindex="-1">O seu foco: ' + fraca.nome + '.</h2>';
    h += '<p class="ps-foco-txt">É a habilidade com a menor nota desta semana (' + w.notas[fraca.id] + ' de 100). Por isso ela aparece mais vezes nos seus dias.</p>';
    h += '<div class="ps-barras">';
    ordem.forEach(function (hab, i) {
      h += '<div class="ps-barra' + (i === 0 ? " foco" : "") + '"><b>' + hab.nome + '</b><div class="ps-trilho"><span style="width:' + Math.max(w.notas[hab.id], 3) + '%"></span></div><em>' + w.notas[hab.id] + '</em></div>';
    });
    h += '</div>';
    h += '<div class="ps-prog"><span>' + feitos + ' de ' + w.plano.length + ' dias</span><div class="ps-trilho" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div><span>' + pct + '%</span></div>';
    h += '<div class="ps-dias">';
    w.plano.forEach(function (d, i) {
      h += '<div class="ps-dia' + (d.feito ? " feito" : "") + '"><input type="checkbox" data-dia="' + i + '" id="ps-d' + i + '" aria-label="Marcar o dia ' + (i + 1) + ' como feito"' + (d.feito ? " checked" : "") + '>';
      h += '<div class="ps-dia-topo"><span>Dia ' + (i + 1) + '</span><b>' + porId(d.hab).nome + '</b><span>' + d.min + ' min</span></div>';
      h += '<h3><label for="ps-d' + i + '">' + esc(d.titulo) + '</label></h3><p>' + esc(d.texto) + '</p></div>';
    });
    h += '</div>';
    h += '<p class="ps-dica"><strong>Dica:</strong> escolha dias e horário fixos. Fazer ' + w.min + ' minutos todo dia rende mais do que uma tarde inteira no fim de semana. Na semana que vem, refaça a avaliação para ver o que mudou.</p>';
    el.innerHTML = h;
  }
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.matches && t.matches("input[data-dia]")) {
      var w = daSemana(); if (!w) return;
      w.plano[+t.getAttribute("data-dia")].feito = t.checked;
      salvar(); desenharPlano(); desenharHistorico();
    }
  });

  /* ---------- Histórico ---------- */
  function desenharHistorico() {
    var el = $("#ps-hist");
    var h = '<span class="eyebrow">Seu progresso</span><h2 tabindex="-1">Suas semanas.</h2>';
    if (!dados.semanas.length) {
      el.innerHTML = h + '<div class="ps-vazio"><p>Nenhuma semana registrada ainda. Depois da primeira avaliação, o seu progresso aparece aqui.</p></div>';
      return;
    }
    var media = function (w) { var t = 0; HAB.forEach(function (x) { t += w.notas[x.id]; }); return Math.round(t / 4); };
    if (dados.semanas.length > 1) {
      var a = dados.semanas[dados.semanas.length - 2], b = dados.semanas[dados.semanas.length - 1], dif = media(b) - media(a);
      h += '<p class="ps-tendencia">Média geral: <strong>' + media(b) + ' de 100</strong>, ' + (dif > 0 ? "+" + dif + " em relação" : dif < 0 ? dif + " em relação" : "igual") + (dif === 0 ? " à" : " à") + ' semana anterior.</p>';
    }
    h += '<div class="ps-semanas">';
    dados.semanas.slice().reverse().forEach(function (w) {
      var feitos = w.plano.filter(function (d) { return d.feito; }).length;
      var menor = HAB.slice().sort(function (x, y) { return w.notas[x.id] - w.notas[y.id]; })[0].id;
      h += '<div class="ps-semana"><div class="ps-semana-topo"><h3>' + curto(w.id) + ' a ' + curto(fimDe(w.id)) + (w.id === semanaAtual ? " (esta semana)" : "") + '</h3><span>' + feitos + ' de ' + w.plano.length + ' dias feitos</span></div><div class="ps-mini">';
      HAB.forEach(function (x) {
        h += '<div class="' + (x.id === menor ? "foco" : "") + '"><small>' + x.nome + ' · ' + w.notas[x.id] + '</small><div class="ps-trilho"><span style="width:' + Math.max(w.notas[x.id], 3) + '%"></span></div></div>';
      });
      h += '</div></div>';
    });
    h += '</div><button class="ps-apagar" type="button" id="ps-apagar">Apagar o histórico deste aparelho</button>';
    el.innerHTML = h;
    var ap = $("#ps-apagar");
    ap.addEventListener("click", function () {
      if (ap.getAttribute("data-certeza")) { dados = { semanas: [] }; salvar(); desenharPlano(); desenharHistorico(); }
      else { ap.setAttribute("data-certeza", "1"); ap.textContent = "Clique de novo para confirmar. Não dá para desfazer."; }
    });
  }

  /* ---------- Início ---------- */
  montarPerguntas(); preencher(); desenharPlano(); desenharHistorico();
  if (daSemana()) mostrar("plano");
})();
