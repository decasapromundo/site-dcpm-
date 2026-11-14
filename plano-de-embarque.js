/* Formulário do Plano de Embarque (Consultoria RADAR).
   Etapas por assunto, exemplos em cada pergunta difícil, rascunho salvo no aparelho
   e envio para o Apps Script, que grava na planilha e manda as respostas por e-mail. */
(function () {
  "use strict";

  var CHAVE = "dcpm-plano-embarque-v1";
  var tSalvar;
  var $ = function (id) { return document.getElementById(id); };
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var ANO = new Date().getFullYear();

  var HABILIDADES = ["Comunicação", "Proatividade", "Atendimento ao cliente", "Trabalho em equipe", "Informática",
    "Aprende rápido", "Resolve problemas", "Atenção a detalhes", "Pensamento crítico", "Flexibilidade",
    "Organização", "Inteligência emocional", "Responsabilidade", "Liderança", "Vendas", "Trabalho sob pressão"];

  var POSICOES = {
    "Restaurante": "Assistant Waiter, Waiter, Buffet Steward",
    "Bar": "Bar Server (Bar Waiter), Bartender, Barista",
    "Housekeeping": "Cabin Steward, Housekeeping Attendant, Laundry Attendant",
    "Recepção": "Guest Service Associate, Front Desk",
    "Entretenimento": "Youth Staff, Animation Host, Entertainment Staff",
    "Lojas": "Shop Assistant, Sales Associate",
    "Cozinha": "Commis, Cook, Utility Galley",
    "Ainda não sei": "Pode deixar em branco: eu te ajudo a escolher"
  };

  /* Cada etapa: título, ajuda e campos. Tipos: texto, email, tel, data, area, opcoes, chips, experiencias. */
  var ETAPAS = [
    { titulo: "Para começar, quem é você?", ajuda: "É por aqui que eu te identifico e te mando o material.", campos: [
      { id: "nome", tipo: "texto", rotulo: "Nome completo", obrig: true, auto: "name", ex: "Do jeito que está no passaporte. Ele vai no topo do currículo." },
      { id: "email", tipo: "email", rotulo: "E-mail", obrig: true, auto: "email" },
      { id: "whatsapp", tipo: "tel", rotulo: "WhatsApp com DDD", obrig: true, auto: "tel", ex: "Exemplo: +55 11 91234-5678" }
    ]},
    { titulo: "Mais um pouco sobre você", campos: [
      { id: "servico", tipo: "opcoes", rotulo: "Qual serviço você contratou?", obrig: true,
        opcoes: ["Consultoria RADAR Sprint", "Consultoria RADAR Premium", "Consultoria RADAR VIP", "Consultoria Currículo", "Consultoria Entrevista"] },
      { id: "cidade", tipo: "texto", rotulo: "Cidade e estado onde você mora", obrig: true, auto: "address-level2", ex: "Exemplo: Santos, SP" },
      { id: "nascimento", tipo: "nasc", rotulo: "Data de nascimento", obrig: true }
    ]},
    { titulo: "Para onde você quer ir", ajuda: "Aqui eu entendo o seu objetivo e o que pode te travar no caminho.", campos: [
      { id: "departamento", tipo: "opcoes", rotulo: "Em qual departamento você quer começar a bordo?", obrig: true, duas: true, opcoes: Object.keys(POSICOES) },
      { id: "posicoes", tipo: "texto", rotulo: "Quais cargos te interessam?", ex: "Escolha um departamento acima para ver exemplos de cargos.", dinamico: "posicoes" },
      { id: "resolver", tipo: "area", rotulo: "O que você quer resolver com esta consultoria?", obrig: true,
        ex: "Exemplo: \"Já apliquei 5 vezes e nunca me chamaram, quero entender o que está errado\" ou \"Quero sair com o currículo em inglês pronto e perder o medo da entrevista\". É nisso que a gente vai trabalhar." },
      { id: "motivador", tipo: "area", rotulo: "O que mais te motiva a se dedicar a esse processo agora?", obrig: true,
        ex: "Exemplo: \"Quero juntar dinheiro para comprar a minha casa em 3 anos e ajudar a minha mãe.\" Seja específico: um motivo concreto vale mais do que \"realizar um sonho\"." },
      { id: "desafio", tipo: "area", rotulo: "Qual é a sua maior barreira hoje?", obrig: true,
        ex: "Exemplo: \"Meu inglês trava quando tenho que falar\" ou \"Nunca trabalhei com atendimento\". Pode ser sincero: é isso que eu vou atacar primeiro." },
      { id: "porque_contratou", tipo: "area", rotulo: "O que te deu segurança para contratar a consultoria?", ex: "Exemplo: \"Vi o depoimento da Ana, que tinha o mesmo perfil que eu.\"" }
    ]},
    { titulo: "Suas experiências de trabalho", ajuda: "Esta é a parte mais importante do formulário: é dela que saem o seu currículo e as suas melhores respostas de entrevista. Uma experiência por cartão, da mais recente para a mais antiga.", campos: [
      { id: "experiencias", tipo: "experiencias" },
      { id: "pausas", tipo: "area", rotulo: "Ficou algum período de mais de 6 meses sem trabalhar? Conte o porquê.",
        ex: "Exemplo: \"De 2021 a 2022 cuidei do meu pai doente.\" O recrutador sempre pergunta, então é melhor a gente preparar a resposta. Se não ficou, deixe em branco." }
    ]},
    { titulo: "Formação e habilidades", campos: [
      { id: "formacao", tipo: "area", rotulo: "Sua formação", obrig: true, curto: true,
        ex: "Curso, instituição e ano de conclusão. Exemplo: \"Ensino médio, E.E. Martim Afonso, 2015\" ou \"Técnico em Hotelaria, Senac, 2019\"." },
      { id: "certificacoes", tipo: "area", rotulo: "Cursos e certificados que tenham a ver com o navio", curto: true,
        ex: "Exemplo: \"Curso de Garçom, Senac, 2022\", \"Manipulação de alimentos\", \"Primeiros socorros\". Se não tiver, deixe em branco." },
      { id: "habilidades", tipo: "chips", rotulo: "Escolha pelo menos 6 habilidades que você tem de verdade", min: 6, opcoes: HABILIDADES,
        ex: "Escolha as que você consegue provar com uma história. Eu vou te perguntar." },
      { id: "voluntario", tipo: "area", rotulo: "Já fez trabalho voluntário?", curto: true,
        ex: "Exemplo: \"Ajudei na cozinha da igreja aos sábados, de 2019 a 2021.\" Se não fez, deixe em branco." }
    ]},
    { titulo: "Idiomas", ajuda: "Seja honesto no nível. É com ele que eu ajusto o currículo e as respostas ao que você consegue falar.", campos: [
      { id: "ingles", tipo: "opcoes", rotulo: "Qual é o seu nível de inglês hoje?", obrig: true, opcoes: [
        "Iniciante: quase não entendo nem falo",
        "Básico: entendo um pouco, mas travo para responder",
        "Intermediário: entendo e respondo, com erros",
        "Avançado: converso bem e quero ajustar para o navio"] },
      { id: "ingles_prova", tipo: "texto", rotulo: "Tem algum teste, certificado ou vivência que mostre o seu inglês?",
        ex: "Exemplo: \"EF SET 52, B2\", \"Morei 1 ano na Irlanda\", \"Curso no CNA até o avançado\". Se não tiver, deixe em branco: eu te passo um teste gratuito." },
      { id: "outros_idiomas", tipo: "texto", rotulo: "Fala outros idiomas? Quais e em que nível?", ex: "Exemplo: \"Espanhol intermediário, italiano básico\"." }
    ]},
    { titulo: "Documentos", ajuda: "Se ainda não tem algum, tudo bem. Nada aqui te impede de começar.", campos: [
      { id: "passaporte", tipo: "opcoes", rotulo: "Passaporte", obrig: true, opcoes: ["Tenho e está válido", "Tenho, mas está vencido", "Está em andamento", "Ainda não tenho"] },
      { id: "passaporte_validade", tipo: "texto", rotulo: "Se tem, válido até quando?", ex: "Mês e ano. Exemplo: 08/2031", mostrarSe: ["passaporte", "Tenho e está válido"] },
      { id: "stcw", tipo: "opcoes", rotulo: "STCW", obrig: true, opcoes: ["Tenho e está válido", "Tenho, mas está vencido", "Ainda não tenho"],
        ex: "Se ainda não tem, não se preocupe: o recomendado é fazer depois de passar na entrevista." },
      { id: "stcw_validade", tipo: "texto", rotulo: "Válido até quando?", ex: "Mês e ano. Exemplo: 03/2029", mostrarSe: ["stcw", "Tenho e está válido"] },
      { id: "visto", tipo: "opcoes", rotulo: "Visto americano de tripulante (C1/D)", obrig: true, opcoes: ["Tenho e está válido", "Não tenho"] },
      { id: "tatuagem", tipo: "opcoes", rotulo: "Tem tatuagem visível?", obrig: true, opcoes: ["Não", "Sim, fora do rosto", "Sim, no rosto ou no pescoço"],
        ex: "Tatuagem fora do rosto em geral não é problema." }
    ]},
    { titulo: "Para a sua entrevista", ajuda: "Responda em português, do seu jeito. Eu transformo em respostas em inglês, na sua voz. Quanto mais real e específico, melhor.", campos: [
      { id: "porque_navio", tipo: "area", rotulo: "Por que você quer trabalhar em navio de cruzeiro?", obrig: true,
        ex: "Exemplo: \"Trabalho com atendimento há 4 anos e quero fazer isso num lugar com gente do mundo inteiro, juntando dinheiro.\" Evite só \"conhecer o mundo\": todo mundo diz isso." },
      { id: "o_que_sabe", tipo: "area", rotulo: "O que você já sabe sobre a vida e o trabalho a bordo?", obrig: true,
        ex: "Exemplo: \"Contratos de 6 a 9 meses, 7 dias por semana, dividindo cabine.\" Vale o que você aprendeu nas aulas." },
      { id: "fortes_fraqueza", tipo: "area", rotulo: "3 pontos fortes e 1 fraqueza real", obrig: true,
        ex: "Fortes: \"paciência com cliente difícil, pontualidade, aprendo rápido\". Fraqueza de verdade, com o que você faz para melhorar: \"travo no inglês quando estou nervoso, e estou treinando com áudios todo dia\"." },
      { id: "pressao", tipo: "area", rotulo: "Conte uma vez em que você trabalhou sob pressão", obrig: true,
        ex: "Conte como uma cena: onde você estava, o que aconteceu, o que você fez e como terminou. Exemplo: \"Sábado de casa cheia, faltaram dois garçons, eu assumi seis mesas e...\"" },
      { id: "cliente_dificil", tipo: "area", rotulo: "Conte uma vez em que você lidou com um cliente difícil ou um momento difícil no trabalho", obrig: true,
        ex: "Mesmo formato: a cena, o que você fez e o resultado. Exemplo: \"Um cliente reclamou alto que o prato chegou frio. Pedi desculpas, troquei na hora e ofereci a sobremesa. Ele voltou na semana seguinte.\" Essa pergunta cai em quase toda entrevista." },
      { id: "cinco_anos", tipo: "area", rotulo: "Onde você se vê daqui a 5 anos?", curto: true, ex: "Exemplo: \"Como Bartender, e com a entrada do meu apartamento paga.\"" },
      { id: "salario", tipo: "numero", rotulo: "Quanto você espera ganhar por mês a bordo, em dólares?", ex: "Só o número. Serve para eu alinhar a sua expectativa com o cargo." }
    ]}
  ];

  var estado = { etapa: 0, dados: { experiencias: [novaExp()] }, id: "" };

  function novaExp() { return { cargo: "", empresa: "", local: "", mes_ini: "", ano_ini: "", mes_fim: "", ano_fim: "", atual: false, tipo: "Contínuo", tarefas: "", marcante: "" }; }

  /* ---------- rascunho no aparelho ---------- */
  function salvar() {
    if (enviado) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) {}
    var s = $("pe-salvo"); if (s) s.textContent = "Rascunho salvo neste aparelho.";
  }
  function carregar() { try { var r = localStorage.getItem(CHAVE); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  var enviado = false;
  function limpar() { clearTimeout(tSalvar); try { localStorage.removeItem(CHAVE); } catch (e) {} }

  /* ---------- helpers de DOM ---------- */
  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) n.appendChild(typeof f === "string" ? document.createTextNode(f) : f); });
    return n;
  }
  function rotulo(c, forId) {
    return el("label", { class: "campo-rotulo", for: forId }, [c.rotulo, c.obrig ? null : el("small", { text: " (opcional)" })]);
  }
  function exemplo(texto, id) { return texto ? el("p", { class: "pe-exemplo", id: id, text: texto }) : document.createTextNode(""); }

  function visivel(c) { return !c.mostrarSe || estado.dados[c.mostrarSe[0]] === c.mostrarSe[1]; }

  /* ---------- montar etapa ---------- */
  function montar() {
    var et = ETAPAS[estado.etapa];
    $("pe-contador").textContent = "Etapa " + (estado.etapa + 1) + " de " + ETAPAS.length;
    $("pe-titulo").textContent = et.titulo;
    $("pe-ajuda").textContent = et.ajuda || "";
    $("pe-erro").textContent = "";
    $("pe-salvo").textContent = "";
    var corpo = $("pe-corpo"); corpo.innerHTML = "";
    et.campos.forEach(function (c) { if (visivel(c)) corpo.appendChild(campo(c)); });
    $("pe-voltar").hidden = false;
    $("pe-avancar").textContent = estado.etapa === ETAPAS.length - 1 ? "Enviar meu Plano de Embarque" : "Continuar";
    var pct = Math.round((estado.etapa / ETAPAS.length) * 100);
    $("pe-progresso").hidden = false;
    $("pe-progresso").setAttribute("aria-valuenow", pct);
    $("pe-progresso-barra").style.width = pct + "%";
  }

  function campo(c) {
    var d = estado.dados, idEx = "ex-" + c.id, wrap = el("div", { class: "pe-campo", "data-campo": c.id });
    if (c.tipo === "experiencias") return experiencias();
    if (c.tipo === "opcoes") {
      wrap.appendChild(el("p", { class: "campo-rotulo", id: "rot-" + c.id, text: c.rotulo }));
      var grupo = el("div", { class: "opcoes" + (c.duas ? " duas" : ""), role: "radiogroup", "aria-labelledby": "rot-" + c.id });
      c.opcoes.forEach(function (o) {
        grupo.appendChild(el("button", { type: "button", class: "opcao", role: "radio", "aria-checked": d[c.id] === o ? "true" : "false",
          onclick: function () {
            d[c.id] = o; salvar();
            if (c.id === "departamento" || ETAPAS[estado.etapa].campos.some(function (x) { return x.mostrarSe && x.mostrarSe[0] === c.id; })) { montar(); focoCampo(c.id); }
            else grupo.querySelectorAll(".opcao").forEach(function (b) { b.setAttribute("aria-checked", b.textContent === o ? "true" : "false"); });
          } }, [o]));
      });
      wrap.appendChild(grupo);
      wrap.appendChild(exemplo(c.ex, idEx));
      return wrap;
    }
    if (c.tipo === "chips") {
      var sel = d[c.id] || [];
      wrap.appendChild(el("p", { class: "campo-rotulo", id: "rot-" + c.id, text: c.rotulo }));
      wrap.appendChild(exemplo(c.ex, idEx));
      var cont = el("p", { class: "pe-contagem", "aria-live": "polite" });
      var lista = el("div", { class: "pe-chips", role: "group", "aria-labelledby": "rot-" + c.id });
      function atualizar() { cont.textContent = sel.length + " de pelo menos " + c.min + " escolhidas"; cont.classList.toggle("ok", sel.length >= c.min); }
      c.opcoes.forEach(function (o) {
        lista.appendChild(el("button", { type: "button", class: "pe-chip", "aria-pressed": sel.indexOf(o) > -1 ? "true" : "false",
          onclick: function (ev) {
            var i = sel.indexOf(o); if (i > -1) sel.splice(i, 1); else sel.push(o);
            d[c.id] = sel; ev.currentTarget.setAttribute("aria-pressed", i > -1 ? "false" : "true"); atualizar(); salvar();
          } }, [o]));
      });
      wrap.appendChild(lista); wrap.appendChild(cont); atualizar();
      return wrap;
    }
    var idc = "f-" + c.id;
    if (c.tipo === "nasc") {
      var partes = (d[c.id] || "").split("/");
      wrap.appendChild(el("p", { class: "campo-rotulo", id: "rot-" + c.id, text: c.rotulo }));
      function lista(id, rot, ops) {
        return el("select", { class: "campo pe-sel", id: id, "aria-label": rot, autocomplete: { "f-nascimento": "bday-day", "f-nascimento-mes": "bday-month", "f-nascimento-ano": "bday-year" }[id] },
          [el("option", { value: "", text: rot })].concat(ops.map(function (o) { return el("option", { value: o[0], text: o[1] }); })));
      }
      var pad = function (n) { return (n < 10 ? "0" : "") + n; };
      var sd = lista(idc, "Dia", Array.from({ length: 31 }, function (_, k) { return [pad(k + 1), String(k + 1)]; }));
      var sm = lista(idc + "-mes", "Mês", MESES.map(function (m, k) { return [pad(k + 1), m]; }));
      var sa = lista(idc + "-ano", "Ano", Array.from({ length: 60 }, function (_, k) { var a = String(ANO - 16 - k); return [a, a]; }));
      sd.value = partes[0] || ""; sm.value = partes[1] || ""; sa.value = partes[2] || "";
      [sd, sm, sa].forEach(function (x) { x.addEventListener("change", function () {
        d[c.id] = (sd.value && sm.value && sa.value) ? sd.value + "/" + sm.value + "/" + sa.value : "";
        [sd, sm, sa].forEach(function (y) { y.removeAttribute("aria-invalid"); }); salvar();
      }); });
      wrap.appendChild(el("div", { class: "pe-nasc", role: "group", "aria-labelledby": "rot-" + c.id }, [sd, sm, sa]));
      return wrap;
    }
    wrap.appendChild(rotulo(c, idc));
    if (c.tipo === "numero") {
      var num = el("input", { id: idc, type: "text", inputmode: "numeric", class: "campo", placeholder: "1500", "aria-describedby": "ex-" + c.id });
      num.value = d[c.id] || "";
      num.addEventListener("input", function () { num.value = num.value.replace(/\D/g, "").slice(0, 6); d[c.id] = num.value; salvarDepois(); });
      wrap.appendChild(el("div", { class: "campo-tel" }, [el("span", { class: "ddi", text: "US$" }), num]));
      wrap.appendChild(exemplo(c.ex, "ex-" + c.id));
      return wrap;
    }
    var tipoInput = { texto: "text", email: "email", tel: "tel", data: "date" }[c.tipo];
    var inp = c.tipo === "area"
      ? el("textarea", { id: idc, class: "campo" + (c.curto ? " pe-curto" : ""), rows: c.curto ? 3 : 5, "aria-describedby": c.ex ? idEx : null })
      : el("input", { id: idc, type: tipoInput, class: "campo", autocomplete: c.auto || "off", inputmode: c.tipo === "tel" ? "tel" : null, "aria-describedby": c.ex ? idEx : null });
    if (c.tipo === "data") { inp.max = (ANO - 16) + "-12-31"; inp.min = "1950-01-01"; }
    inp.value = d[c.id] || "";
    inp.addEventListener("input", function () { d[c.id] = inp.value; inp.removeAttribute("aria-invalid"); salvarDepois(); });
    wrap.appendChild(inp);
    var texto = c.ex;
    if (c.dinamico === "posicoes" && d.departamento) texto = "Exemplos em " + d.departamento + ": " + POSICOES[d.departamento] + ".";
    wrap.appendChild(exemplo(texto, idEx));
    return wrap;
  }

  function salvarDepois() { clearTimeout(tSalvar); tSalvar = setTimeout(salvar, 600); }

  /* ---------- experiências ---------- */
  function experiencias() {
    var d = estado.dados, box = el("div", { class: "pe-exps", "data-campo": "experiencias" });
    box.appendChild(el("details", { class: "pe-modelo" }, [
      el("summary", { text: "Ver um exemplo bem preenchido" }),
      el("div", { class: "pe-modelo-corpo" }, [
        el("p", { html: "<strong>Cargo:</strong> Garçom &nbsp; <strong>Empresa:</strong> Restaurante Bella Vista &nbsp; <strong>Cidade:</strong> Santos, SP" }),
        el("p", { html: "<strong>Período:</strong> mar/2021 até ago/2023, contínuo" }),
        el("p", { html: "<strong>No dia a dia:</strong> atendia de 8 a 10 mesas por turno, anotava os pedidos no sistema, sugeria vinhos e sobremesas, fechava a conta e o caixa no fim da noite e treinava os garçons novos." }),
        el("p", { class: "pe-ruim", html: "<strong>Evite:</strong> \"atendimento ao cliente, trabalho em equipe\". Isso não diz o que você fazia." })
      ])
    ]));
    if (!d.sem_experiencia) d.experiencias.forEach(function (x, i) { box.appendChild(cartaoExp(x, i)); });
    var acoes = el("div", { class: "pe-exps-acoes" });
    if (!d.sem_experiencia) acoes.appendChild(el("button", { type: "button", class: "btn btn-secundario", onclick: function () {
      d.experiencias.push(novaExp()); salvar(); montar(); focoCampo("exp-" + (d.experiencias.length - 1) + "-cargo");
    } }, ["+ Adicionar outra experiência"]));
    var semId = "f-sem-exp";
    acoes.appendChild(el("label", { class: "consentimento pe-sem-exp", for: semId }, [
      el("input", { type: "checkbox", id: semId, checked: d.sem_experiencia ? true : null, onchange: function (e) { d.sem_experiencia = e.target.checked; salvar(); montar(); } }),
      el("span", { text: "Ainda não tenho nenhuma experiência de trabalho" })
    ]));
    box.appendChild(acoes);
    if (d.sem_experiencia) box.appendChild(el("p", { class: "pe-exemplo", text: "Sem problema. Nas próximas etapas, conte o máximo que puder sobre cursos, trabalho voluntário e coisas que você fez na escola, na igreja ou em casa. Tudo isso entra no currículo." }));
    return box;
  }

  function cartaoExp(x, i) {
    var d = estado.dados, pre = "exp-" + i + "-";
    function inp(chave, rot, ex, tipo) {
      var id = "f-" + pre + chave;
      var n = tipo === "area" ? el("textarea", { id: id, class: "campo", rows: chave === "tarefas" ? 5 : 3, "aria-describedby": ex ? id + "-ex" : null })
        : el("input", { id: id, type: "text", class: "campo", "aria-describedby": ex ? id + "-ex" : null });
      n.value = x[chave] || "";
      n.addEventListener("input", function () { x[chave] = n.value; n.removeAttribute("aria-invalid"); salvarDepois(); });
      var w = el("div", { class: "pe-campo", "data-campo": pre + chave }, [el("label", { class: "campo-rotulo", for: id }, [rot[0], rot[1] ? el("small", { text: " (opcional)" }) : null]), n]);
      if (ex) w.appendChild(el("p", { class: "pe-exemplo", id: id + "-ex", text: ex }));
      return w;
    }
    function data(lado) {
      var mes = el("select", { class: "campo pe-sel", "aria-label": (lado === "ini" ? "Mês de início" : "Mês de saída"), id: "f-" + pre + "mes_" + lado },
        [el("option", { value: "", text: "Mês" })].concat(MESES.map(function (m, k) { return el("option", { value: String(k + 1), text: m }); })));
      var ano = el("select", { class: "campo pe-sel", "aria-label": (lado === "ini" ? "Ano de início" : "Ano de saída"), id: "f-" + pre + "ano_" + lado },
        [el("option", { value: "", text: "Ano" })].concat(Array.from({ length: ANO - 1984 }, function (_, k) { var a = String(ANO - k); return el("option", { value: a, text: a }); })));
      mes.value = x["mes_" + lado]; ano.value = x["ano_" + lado];
      [mes, ano].forEach(function (s) { s.addEventListener("change", function () { x["mes_" + lado] = mes.value; x["ano_" + lado] = ano.value; s.removeAttribute("aria-invalid"); salvar(); }); });
      return el("div", { class: "pe-data", "data-campo": pre + "data_" + lado }, [mes, ano]);
    }
    var fim = el("div", { class: "pe-periodo-lado" }, [el("p", { class: "campo-rotulo", text: "Saída" }), x.atual ? el("p", { class: "pe-atual", text: "Trabalho atual" }) : data("fim")]);
    var card = el("fieldset", { class: "pe-exp" }, [
      el("legend", { class: "pe-exp-topo" }, [el("span", { text: "Experiência " + (i + 1) })]),
      d.experiencias.length > 1 ? el("button", { type: "button", class: "pe-remover", "aria-label": "Remover a experiência " + (i + 1), onclick: function () {
        if (!confirm("Remover a experiência " + (i + 1) + "?")) return; d.experiencias.splice(i, 1); salvar(); montar();
      } }, ["Remover"]) : null,
      el("div", { class: "pe-grade2" }, [inp("cargo", ["Cargo"], "Exemplo: Garçom, Recepcionista, Vendedora"), inp("empresa", ["Empresa"], "Exemplo: Hotel Mercure")]),
      inp("local", ["Cidade e país", true], "Exemplo: Florianópolis, Brasil"),
      el("div", { class: "pe-periodo" }, [el("div", { class: "pe-periodo-lado" }, [el("p", { class: "campo-rotulo", text: "Início" }), data("ini")]), fim]),
      el("label", { class: "consentimento pe-check", for: "f-" + pre + "atual" }, [
        el("input", { type: "checkbox", id: "f-" + pre + "atual", checked: x.atual ? true : null, onchange: function (e) { x.atual = e.target.checked; salvar(); montar(); focoCampo(pre + "atual"); } }),
        el("span", { text: "Ainda trabalho aqui" })
      ]),
      el("div", { class: "pe-campo" }, [
        el("p", { class: "campo-rotulo", id: "rot-" + pre + "tipo", text: "Como era esse trabalho?" }),
        (function () {
          var g = el("div", { class: "opcoes pe-tipo", role: "radiogroup", "aria-labelledby": "rot-" + pre + "tipo" });
          ["Contínuo", "Temporada ou eventos", "Freelancer ou bico"].forEach(function (o) {
            g.appendChild(el("button", { type: "button", class: "opcao", role: "radio", "aria-checked": x.tipo === o ? "true" : "false", onclick: function () {
              x.tipo = o; salvar(); g.querySelectorAll(".opcao").forEach(function (b) { b.setAttribute("aria-checked", b.textContent === o ? "true" : "false"); });
            } }, [o]));
          });
          return g;
        })(),
        el("p", { class: "pe-exemplo", text: "Se era por temporada (verão, eleição, Natal), conte os anos nas tarefas. Exemplo: \"temporadas de verão de 2019, 2020 e 2022\"." })
      ]),
      inp("tarefas", ["O que você fazia no dia a dia?"], "Escreva como se contasse para um amigo, com números quando puder: quantos clientes, quantas mesas, o que você controlava. Exemplo: \"atendia uns 80 clientes por dia no caixa, conferia o estoque na segunda e abria a loja\".", "area"),
      inp("marcante", ["Uma situação marcante nesse trabalho", true], "Um dia difícil, um elogio, um problema que você resolveu. Vira história de entrevista.", "area")
    ]);
    return card;
  }

  function focoCampo(id) {
    var n = document.querySelector('[data-campo="' + id + '"] input, [data-campo="' + id + '"] textarea, [data-campo="' + id + '"] .opcao') || $("f-" + id);
    if (n) n.focus();
  }

  /* ---------- validação ---------- */
  function validar() {
    var et = ETAPAS[estado.etapa], d = estado.dados, erros = [];
    function marcar(id, msg) {
      erros.push({ id: id, msg: msg });
      var n = $("f-" + id); if (n) n.setAttribute("aria-invalid", "true");
    }
    et.campos.forEach(function (c) {
      if (!visivel(c)) return;
      var v = d[c.id];
      if (c.tipo === "experiencias") {
        if (d.sem_experiencia) return;
        d.experiencias.forEach(function (x, i) {
          var p = "exp-" + i + "-", n = " na experiência " + (i + 1);
          if (!x.cargo.trim()) marcar(p + "cargo", "Falta o cargo" + n + ".");
          if (!x.empresa.trim()) marcar(p + "empresa", "Falta a empresa" + n + ".");
          if (!x.mes_ini || !x.ano_ini) { marcar(p + "mes_ini", "Falta o mês e o ano de início" + n + "."); $("f-" + p + "ano_ini").setAttribute("aria-invalid", "true"); }
          if (!x.atual && (!x.mes_fim || !x.ano_fim)) { marcar(p + "mes_fim", "Falta o mês e o ano de saída" + n + ", ou marque \"Ainda trabalho aqui\"."); var a = $("f-" + p + "ano_fim"); if (a) a.setAttribute("aria-invalid", "true"); }
          if (!x.atual && x.ano_ini && x.ano_fim && (Number(x.ano_fim) * 12 + Number(x.mes_fim)) < (Number(x.ano_ini) * 12 + Number(x.mes_ini))) marcar(p + "ano_fim", "A saída está antes do início" + n + ".");
          if (x.tarefas.trim().length < 60) marcar(p + "tarefas", "Conte um pouco mais do seu dia a dia" + n + ": o que você fazia, com quantas pessoas, o que controlava.");
        });
        return;
      }
      if (c.tipo === "chips") { if ((v || []).length < c.min) erros.push({ id: c.id, msg: "Escolha pelo menos " + c.min + " habilidades." }); return; }
      if (c.obrig && (!v || !String(v).trim())) {
        marcar(c.id, c.tipo === "opcoes" ? "Escolha uma opção em \"" + c.rotulo + "\"." : c.tipo === "nasc" ? "Escolha o dia, o mês e o ano do seu nascimento." : "Preencha \"" + c.rotulo + "\".");
        if (c.tipo === "nasc") ["-mes", "-ano"].forEach(function (x) { var n = $("f-" + c.id + x); if (n && !n.value) n.setAttribute("aria-invalid", "true"); });
        return;
      }
      if (c.tipo === "email" && v && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim())) marcar(c.id, "Confira o e-mail: parece que falta alguma coisa.");
      if (c.tipo === "tel" && v && v.replace(/\D/g, "").length < 10) marcar(c.id, "Confira o WhatsApp, com DDD.");
      if (c.tipo === "area" && c.obrig && v && v.trim().length < 15) marcar(c.id, "Conte um pouco mais em \"" + c.rotulo + "\".");
    });
    $("pe-erro").textContent = erros.length ? erros[0].msg + (erros.length === 2 ? " O outro ponto que falta está marcado em vermelho." : erros.length > 2 ? " Os outros " + (erros.length - 1) + " pontos que faltam estão marcados em vermelho." : "") : "";
    if (erros.length) focoCampo(erros[0].id);
    return !erros.length;
  }

  /* ---------- envio ---------- */
  function endpoint() {
    var q = new URLSearchParams(location.search).get("endpoint");
    return q || window.PE_ENDPOINT;
  }
  function payload(tipo) {
    return { tipo: tipo, id: estado.id, site: $("pe-isca").value, inicio: estado.inicio, dados: estado.dados };
  }
  function postar(corpo) {
    var url = endpoint();
    if (!url || url.indexOf("COLE_AQUI") === 0) return Promise.reject(new Error("sem endereco"));
    return fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: JSON.stringify(corpo) });
  }

  function avancar(ev) {
    ev.preventDefault();
    if (!validar()) return;
    salvar();
    if (estado.etapa === 0) postar(payload("parcial")).catch(function () {});
    if (estado.etapa < ETAPAS.length - 1) { estado.etapa++; salvar(); mostrarEtapa(); return; }
    var b = $("pe-avancar"); b.disabled = true; b.textContent = "Enviando...";
    postar(payload("final")).then(function () {
      enviado = true; limpar(); final();
    }).catch(function () {
      b.disabled = false; b.textContent = "Tentar enviar de novo";
      $("pe-erro").textContent = "Não consegui enviar agora. Confira a internet e tente de novo. As suas respostas continuam salvas neste aparelho.";
    });
  }

  function mostrarEtapa() {
    $("pe-inicio").hidden = true; $("pe-final").hidden = true; $("pe-etapa").hidden = false;
    montar(); window.scrollTo(0, 0); $("pe-titulo").focus();
  }
  function final() {
    $("pe-etapa").hidden = true; $("pe-final").hidden = false;
    $("pe-progresso-barra").style.width = "100%"; $("pe-progresso").setAttribute("aria-valuenow", 100);
    var nome = (estado.dados.nome || "").trim().split(/\s+/)[0] || "";
    $("pe-final-titulo").textContent = (nome ? "Pronto, " + nome + ". " : "Pronto. ") + "Seu Plano de Embarque entrou em produção.";
    window.scrollTo(0, 0); $("pe-final-titulo").focus();
  }

  /* ---------- início ---------- */
  function novoId() { return "pe-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  function comecar(manter) {
    if (!manter) { estado = { etapa: 0, dados: { experiencias: [novaExp()] }, id: novoId(), inicio: Date.now() }; }
    salvar(); mostrarEtapa();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var r = carregar();
    if (r && r.dados && (r.dados.nome || r.etapa > 0)) {
      $("pe-retomar").hidden = false; $("pe-comecar").hidden = true;
      $("pe-continuar").addEventListener("click", function () { estado = r; comecar(true); });
      $("pe-recomecar").addEventListener("click", function () { if (confirm("Apagar o que você já escreveu e começar do zero?")) { limpar(); comecar(false); } });
    }
    $("pe-comecar").addEventListener("click", function () { comecar(false); });
    $("pe-etapa").addEventListener("submit", avancar);
    $("pe-voltar").addEventListener("click", function () {
      if (estado.etapa === 0) { $("pe-etapa").hidden = true; $("pe-inicio").hidden = false; $("pe-progresso").hidden = true; return; }
      estado.etapa--; salvar(); mostrarEtapa();
    });
  });
})();
