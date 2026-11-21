/* Painel do aluno (Meu Embarque), Consultoria RADAR.
   Sem login: o link pessoal (?a=codigo) é a chave. O progresso fica no aparelho e é copiado
   para a aba "Painel" da planilha pelo mesmo Apps Script do Plano de Embarque. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var ALPA = "https://t2e.alpaclass.com/curso/";
  var PLANOS = ["Consultoria RADAR Sprint", "Consultoria RADAR Premium", "Consultoria RADAR VIP"];
  var NOMES_CARIMBO = ["Plano de Embarque pronto", "Primeira aplicação", "Entrevista marcada", "Aprovação na entrevista", "Embarque marcado", "A bordo"];

  /* A trilha segue os 7 cursos da fileira Consultoria RADAR na Alpa Class.
     auto: item marcado sozinho a partir do que o aluno registra em outra aba. */
  var ETAPAS = [
    { titulo: "Comece por aqui", curso: "4yRppO", itens: [
      ["boasvindas", "Ler as boas-vindas", "Como funciona a sua consultoria, em 5 minutos."],
      ["plano", "Preencher o Plano de Embarque", "Uns 30 minutos. É com ele que eu monto o seu currículo e a sua entrevista.", "plano-de-embarque"],
      ["cv_atual", "Mandar o currículo atual no grupo", "Só se você já tiver um. Do jeito que está."],
      ["efset", "Fazer o teste de inglês", "Gratuito, uns 20 minutos. Me manda o resultado no grupo.", "https://www.efset.org/"],
      ["posicao", "Ver qual posição combina com você"]
    ]},
    { titulo: "Como funciona o processo seletivo", curso: "tsiJPm", itens: [
      ["processo", "Assistir às aulas do processo seletivo", "Agências, empresas que contratam e posições."],
      ["companhias", "Escolher as companhias que mais te interessam", "Me conta no grupo quais são."]
    ]},
    { titulo: "Seu currículo e as candidaturas", curso: "AyDQCQ", itens: [
      ["call", "Fazer a call de Plano de Rota", "É nela que você recebe o Currículo Vencedor e o roteiro de entrevista."],
      ["ler_plano", "Ler o seu Plano de Embarque inteiro"],
      ["checklist_cv", "Conferir o checklist antes de enviar o currículo"],
      ["cand1", "Enviar a primeira candidatura", "Registre na aba Candidaturas e ela marca aqui sozinha.", null, function (d) { return d.candidaturas.length >= 1; }],
      ["cand3", "Chegar a três candidaturas", null, null, function (d) { return d.candidaturas.length >= 3; }]
    ]},
    { titulo: "Sua entrevista", curso: "9SPS9g", itens: [
      ["perguntas", "Estudar as perguntas que mais caem"],
      ["universo", "Ler o seu Universo em voz alta três vezes", "Ele está no seu Plano de Embarque."],
      ["audio", "Gravar um áudio de resposta e mandar no grupo", "Eu te devolvo os ajustes."],
      ["simulacoes", "Treinar com as simulações gravadas"],
      ["ebooks", "Baixar os eBooks de entrevista"],
      ["aovivo", "Agendar a simulação ao vivo", "Quando a entrevista estiver marcada."]
    ]},
    { titulo: "Inglês de bordo", curso: "OSIUvH", itens: [
      ["maritimo", "Estudar o inglês marítimo"],
      ["ouvido", "Treinar o ouvido com os sotaques"],
      ["planner", "Montar a rotina com o planner de estudo"]
    ]},
    { titulo: "Do aprovado ao embarque", curso: "2MsM1h", itens: [
      ["docs", "Conferir os documentos", "Atualize também a aba Documentos."],
      ["dinheiro", "Organizar o dinheiro e abrir as contas"],
      ["mala", "Fazer a mala com a lista"],
      ["viagem", "Rever o checklist do dia da viagem"]
    ]},
    { titulo: "Seu primeiro dia e a vida a bordo", curso: "N7Xa1a", itens: [
      ["primeiro_dia", "Ver como é o primeiro dia"],
      ["drill", "Ler o Drill em uma página"],
      ["vocabulario", "Treinar o que falar no primeiro dia"],
      ["entrevista_dep", "Assistir à entrevista do seu departamento"],
      ["foto", "Mandar uma foto a bordo no grupo", "É o seu sexto carimbo."]
    ]}
  ];

  var ONDE = ["ISMBR", "Infinity Brazil", "MSC (site da companhia)", "Corazul (site da companhia)", "Cast-A-Way", "Outra"];
  var STATUS_CAND = ["Enviada", "Em análise", "Entrevista marcada", "Aprovado", "Não passou"];

  var DOCS = [
    ["passaporte", "Passaporte", "Precisa estar válido. Se vence em menos de 6 meses, renove antes de aplicar."],
    ["stcw", "STCW", "O recomendado é fazer depois de passar na entrevista. Algumas companhias dão o curso."],
    ["visto", "Visto americano C1/D", "Só se o seu navio passar pelos Estados Unidos."],
    ["medico", "Exame médico", "Feito em clínica credenciada, depois da aprovação."],
    ["vacinas", "Vacinas e certificado internacional", "Febre amarela e as que a companhia pedir."],
    ["antecedentes", "Antecedentes criminais", "Certidão da Polícia Federal, pelo gov.br."]
  ];
  var STATUS_DOC = ["Ainda não tenho", "Em andamento", "Tenho e está válido", "Tenho, mas está vencido", "Não preciso"];

  var LINKS = [
    ["Sua consultoria", [
      ["Plataforma de aulas", "Os 7 cursos da sua trilha.", "https://t2e.alpaclass.com/conteudos"],
      ["Plano de Embarque", "O formulário que monta o seu material.", "plano-de-embarque"],
      ["Caixa Preta do Tripulante", "Modelos e materiais de apoio.", "https://drive.google.com/drive/folders/1uNxSZKLOMAeDd8PljM2q7kpmpCJQgfWV?usp=drive_link"]
    ]],
    ["Para aplicar", [
      ["ISMBR", "Agência. Costa, Disney e outras.", "https://ismbr.com.br/"],
      ["Infinity Brazil", "Agência. Costa e outras.", "https://infinitybrazil.com.br/"],
      ["MSC Cruises", "Candidatura direta, pelo site da companhia.", "https://careers.msccruises.com/gb/en"],
      ["Corazul", "Candidatura direta, pelo site da companhia.", "https://corazulcruceros.es/pt-br/trabalhe-connosco/"],
      ["Cast-A-Way", "Agência internacional.", "https://cast-a-way.com/"]
    ], "Em novembro de 2026, Royal Caribbean, Carnival, Norwegian e Princess não estão contratando brasileiros. Se você foi reprovado em uma agência, a espera para reaplicar é de 6 meses."],
    ["Antes de embarcar", [
      ["Teste de inglês EF SET", "Gratuito, com resultado na hora.", "https://www.efset.org/"],
      ["Wise", "Conta internacional para receber e mandar dinheiro.", "https://wise.com/invite/ilpn/augustos21"],
      ["Airalo", "Chip virtual para ter internet ao pousar. Código AUGUST6205.", "https://airalo.go.link/gPpe8"],
      ["Lista da mala na Amazon", "Os itens que valem a pena comprar.", "https://www.amazon.com.br/shop/decasa.promundo/list/1HU2F503E7OWG?ref_=aipsflist&tag=augustocesa00-20"],
      ["Lista da mala no Mercado Livre", "A mesma ideia, para quem prefere.", "https://mercadolivre.com/sec/2BHxGDj"]
    ], "STCW: a escola parceira é a Seaman Náutica. Diga que é aluno da De Casa Pro Mundo. Exame médico: Premedical e Sampletrip têm clínicas credenciadas no Brasil todo. Wise, Airalo e as listas são links de indicação meus."]
  ];

  var estado = null;   // { id, dados: { nome, plano, feitos, candidaturas, docs, t } }
  var carimbos = [];
  var CHAVE = "dcpm-meu-embarque-v1";

  /* ---------- util ---------- */
  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) n.appendChild(typeof f === "string" ? document.createTextNode(f) : f); });
    return n;
  }
  function endpoint() { return new URLSearchParams(location.search).get("endpoint") || window.ME_ENDPOINT; }
  function novoId() {
    var a = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(a);
    return "me-" + Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function idValido(id) { return /^[a-z0-9-]{10,40}$/.test(id || ""); }
  function vazio() { return { nome: "", plano: "", feitos: {}, candidaturas: [], docs: {}, t: 0 }; }
  function normalizar(d) {
    d = d || {}; var b = vazio();
    b.nome = String(d.nome || "").slice(0, 40); b.plano = PLANOS.indexOf(d.plano) > -1 ? d.plano : "";
    b.feitos = d.feitos && typeof d.feitos === "object" ? d.feitos : {};
    b.candidaturas = Array.isArray(d.candidaturas) ? d.candidaturas.slice(0, 40) : [];
    b.docs = d.docs && typeof d.docs === "object" ? d.docs : {};
    b.t = Number(d.t) || 0;
    return b;
  }

  /* ---------- guardar ---------- */
  function guardarLocal() { try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) {} }
  function lerLocal() { try { return JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch (e) { return null; } }
  var tEnvio;
  function mudou() {
    estado.dados.t = Date.now();
    guardarLocal();
    clearTimeout(tEnvio); tEnvio = setTimeout(enviar, 1200);
  }
  function enviar() {
    var url = endpoint(); if (!url) return;
    var prox = proximo();
    var corpo = JSON.stringify({ tipo: "painel", id: estado.id, proximo: prox ? prox.item[1] : "Trilha completa", dados: estado.dados });
    fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: corpo })
      .then(function () { $("me-status").textContent = "Progresso salvo."; })
      .catch(function () { $("me-status").textContent = "Sem internet agora. O progresso fica salvo neste aparelho e sobe quando a conexão voltar."; });
  }
  function buscar(id) {
    var url = endpoint(); if (!url) return Promise.resolve(null);
    return fetch(url + (url.indexOf("?") > -1 ? "&" : "?") + "painel=" + encodeURIComponent(id))
      .then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  /* ---------- trilha ---------- */
  function feito(item) { return item[4] ? !!item[4](estado.dados) : !!estado.dados.feitos[item[0]]; }
  function proximo() {
    for (var i = 0; i < ETAPAS.length; i++) for (var j = 0; j < ETAPAS[i].itens.length; j++) {
      if (!feito(ETAPAS[i].itens[j])) return { etapa: ETAPAS[i], n: i, item: ETAPAS[i].itens[j] };
    }
    return null;
  }
  function linkDe(etapa, item) { return item[3] || ALPA + etapa.curso; }
  function externo(a) { if (/^https?:/.test(a.getAttribute("href"))) { a.target = "_blank"; a.rel = "noopener"; } return a; }

  function desenharTopo() {
    var d = estado.dados;
    $("me-plano").textContent = d.plano;
    $("me-ola").textContent = "Oi, " + d.nome + ".";
    var p = $("me-passaporte"); p.innerHTML = "";
    NOMES_CARIMBO.forEach(function (nome, i) {
      var tem = carimbos.indexOf(i + 1) > -1;
      p.appendChild(el("div", { class: "me-carimbo" + (tem ? " tem" : ""), role: "img", "aria-label": "Carimbo " + (i + 1) + ", " + nome + (tem ? ": conquistado" : ": ainda não"), title: nome, text: String(i + 1) }));
    });
    var total = 0, ok = 0;
    ETAPAS.forEach(function (e) { e.itens.forEach(function (it) { total++; if (feito(it)) ok++; }); });
    var pct = Math.round(ok / total * 100);
    $("me-barra").setAttribute("aria-valuenow", pct);
    $("me-barra").firstElementChild.style.width = pct + "%";
    $("me-barra-texto").textContent = ok + " de " + total + " passos feitos. Carimbos no passaporte: " + carimbos.length + " de 6.";
  }

  function desenharProximo() {
    var box = $("me-proximo"), px = proximo(); box.innerHTML = "";
    if (!px) {
      box.appendChild(el("p", { class: "me-rotulo", text: "Trilha completa" }));
      box.appendChild(el("h2", { text: "Você fez todos os passos." }));
      box.appendChild(el("p", { text: "Me conta no grupo como está o seu contrato. Eu te vejo a bordo." }));
      return;
    }
    box.appendChild(el("p", { class: "me-rotulo", text: "Seu próximo passo · Etapa " + (px.n + 1) }));
    box.appendChild(el("h2", { text: px.item[1] }));
    box.appendChild(el("p", { text: px.item[2] || "Está na etapa \"" + px.etapa.titulo + "\"." }));
    var acoes = el("div", { class: "me-acoes" });
    if (px.item[4]) {
      acoes.appendChild(el("button", { class: "btn", type: "button", onclick: function () { irPara("candidaturas"); } }, ["Registrar candidatura"]));
    } else {
      acoes.appendChild(externo(el("a", { class: "btn", href: linkDe(px.etapa, px.item) }, [px.item[3] ? "Abrir" : "Abrir a aula"])));
      acoes.appendChild(el("button", { class: "btn me-feito", type: "button", onclick: function () { marcar(px.item[0], true); } }, ["Já fiz"]));
    }
    box.appendChild(acoes);
  }

  function marcar(id, valor) {
    if (valor) estado.dados.feitos[id] = 1; else delete estado.dados.feitos[id];
    mudou(); desenharTudo();
  }

  function desenharTrilha() {
    var abertos = {}; document.querySelectorAll(".me-etapa[open]").forEach(function (d) { abertos[d.dataset.n] = 1; });
    var primeira = !document.querySelector(".me-etapa");
    var px = proximo(), box = $("me-trilha"); box.innerHTML = "";
    ETAPAS.forEach(function (e, i) {
      var ok = e.itens.filter(feito).length, completa = ok === e.itens.length;
      var lista = el("ul", { class: "me-itens" });
      e.itens.forEach(function (it) {
        var idc = "me-i-" + it[0], f = feito(it);
        var cb = el("input", { type: "checkbox", id: idc, checked: f ? true : null, disabled: it[4] ? true : null,
          onchange: function (ev) { marcar(it[0], ev.target.checked); } });
        lista.appendChild(el("li", { class: "me-item" + (f ? " feito" : "") }, [cb,
          el("label", { for: idc }, [it[1], it[2] ? el("small", { text: it[2] }) : null])]));
      });
      var det = el("details", { class: "me-etapa" + (completa ? " completa" : ""), "data-n": i,
        open: (primeira ? (px && px.n === i) : abertos[i]) ? true : null }, [
        el("summary", null, [
          el("span", { class: "me-num", "aria-hidden": "true", text: completa ? "✓" : String(i + 1) }),
          el("span", { class: "me-etapa-titulo", text: e.titulo }),
          el("span", { class: "me-etapa-conta", text: ok + "/" + e.itens.length })
        ]),
        lista,
        externo(el("a", { class: "btn btn-secundario me-etapa-abrir", href: ALPA + e.curso }, ["Abrir as aulas desta etapa"]))
      ]);
      box.appendChild(det);
    });
  }

  /* ---------- candidaturas ---------- */
  function dataBR(iso) { var p = String(iso || "").split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : ""; }
  function desenharCands() {
    var box = $("me-cands"), L = estado.dados.candidaturas; box.innerHTML = "";
    if (!L.length) box.appendChild(el("p", { class: "me-vazio", text: "Nenhuma candidatura registrada ainda. Quando enviar a primeira, anote aqui." }));
    L.forEach(function (c, i) {
      var sel = el("select", { class: "campo me-sel", "aria-label": "Situação da candidatura em " + c.onde },
        STATUS_CAND.map(function (s) { return el("option", { value: s, text: s }); }));
      sel.value = c.status;
      sel.addEventListener("change", function () { c.status = sel.value; mudou(); });
      box.appendChild(el("div", { class: "me-cand" }, [
        el("div", { class: "me-cand-topo" }, [el("b", { text: c.onde }), el("span", { text: dataBR(c.data) })]),
        c.cargo ? el("span", { text: c.cargo }) : null,
        sel,
        el("button", { class: "me-cand-remover", type: "button", "aria-label": "Remover a candidatura em " + c.onde,
          onclick: function () { if (confirm("Remover a candidatura em " + c.onde + "?")) { L.splice(i, 1); mudou(); desenharTudo(); } } }, ["Remover"])
      ]));
    });
  }
  function prepararFormCand() {
    var so = $("me-cand-onde");
    ONDE.forEach(function (o) { so.appendChild(el("option", { value: o, text: o })); });
    so.addEventListener("change", function () { $("me-cand-outra").hidden = so.value !== "Outra"; });
    $("me-nova-cand").addEventListener("click", function () {
      $("me-form-cand").hidden = false; $("me-nova-cand").hidden = true;
      $("me-cand-data").value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      so.focus();
    });
    function fechar() { $("me-form-cand").hidden = true; $("me-nova-cand").hidden = false; $("me-form-cand").reset(); $("me-cand-outra").hidden = true; $("me-erro-cand").textContent = ""; }
    $("me-cand-cancelar").addEventListener("click", fechar);
    $("me-form-cand").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var onde = so.value === "Outra" ? $("me-cand-outra").value.trim() : so.value;
      if (!onde) { $("me-erro-cand").textContent = "Escreva o nome da companhia ou agência."; $("me-cand-outra").focus(); return; }
      estado.dados.candidaturas.unshift({ onde: onde.slice(0, 60), cargo: $("me-cand-cargo").value.trim().slice(0, 60), data: $("me-cand-data").value, status: "Enviada" });
      fechar(); mudou(); desenharTudo();
    });
  }

  /* ---------- documentos ---------- */
  function desenharDocs() {
    var box = $("me-docs"); if (box.children.length) return; // campos mantêm o foco; só monta uma vez
    DOCS.forEach(function (doc) {
      var d = estado.dados.docs[doc[0]] || (estado.dados.docs[doc[0]] = { status: STATUS_DOC[0], validade: "" });
      var sel = el("select", { class: "campo me-sel", "aria-label": doc[1] + ": situação" }, STATUS_DOC.map(function (s) { return el("option", { value: s, text: s }); }));
      var val = el("input", { class: "campo", type: "month", "aria-label": doc[1] + ": válido até" });
      sel.value = d.status; val.value = d.validade || "";
      function ver() { val.hidden = sel.value.indexOf("Tenho") !== 0; }
      sel.addEventListener("change", function () { d.status = sel.value; ver(); mudou(); });
      val.addEventListener("change", function () { d.validade = val.value; mudou(); });
      ver();
      box.appendChild(el("div", { class: "me-doc" }, [el("b", { text: doc[1] }), el("small", { text: doc[2] }), el("div", { class: "me-doc-linha" }, [sel, val])]));
    });
  }

  /* ---------- links ---------- */
  function desenharLinks() {
    var box = $("me-links"); if (box.children.length) return;
    LINKS.forEach(function (g) {
      var grupo = el("div", { class: "me-links-grupo" }, [el("h3", { text: g[0] })]);
      g[1].forEach(function (l) {
        grupo.appendChild(externo(el("a", { class: "me-link", href: l[2] }, [el("span", null, [el("b", { text: l[0] }), el("small", { text: l[1] })])])));
      });
      if (g[2]) grupo.appendChild(el("p", { class: "me-nota", text: g[2] }));
      box.appendChild(grupo);
    });
  }

  function desenharTudo() { desenharTopo(); desenharProximo(); desenharTrilha(); desenharCands(); desenharDocs(); desenharLinks(); }

  function irPara(aba) {
    document.querySelectorAll(".me-secao").forEach(function (s) { s.hidden = s.dataset.aba !== aba; });
    document.querySelectorAll("#me-nav button").forEach(function (b) { if (b.dataset.ir === aba) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
  }

  function abrirPainel() {
    $("me-entrada").hidden = true; $("me-painel").hidden = false; $("me-nav").hidden = false;
    var u = new URL(location.href); if (u.searchParams.get("a") !== estado.id) { u.searchParams.set("a", estado.id); history.replaceState(null, "", u); }
    desenharTudo();
  }

  function pedirEntrada(id) {
    $("me-entrada").hidden = false;
    var escolhido = "", g = $("me-planos");
    PLANOS.forEach(function (p) {
      g.appendChild(el("button", { type: "button", class: "opcao", role: "radio", "aria-checked": "false", onclick: function (ev) {
        escolhido = p; g.querySelectorAll(".opcao").forEach(function (b) { b.setAttribute("aria-checked", b === ev.currentTarget ? "true" : "false"); });
      } }, [p.replace("Consultoria RADAR ", "")]));
    });
    $("me-form-entrada").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var nome = $("me-nome").value.trim().split(/\s+/)[0] || "";
      if (!nome) { $("me-erro-entrada").textContent = "Escreva o seu primeiro nome."; $("me-nome").focus(); return; }
      if (!escolhido) { $("me-erro-entrada").textContent = "Escolha o seu plano."; return; }
      estado = { id: id || novoId(), dados: vazio() };
      estado.dados.nome = nome.slice(0, 40); estado.dados.plano = escolhido;
      mudou(); abrirPainel();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    prepararFormCand();
    document.querySelectorAll("#me-nav button").forEach(function (b) { b.addEventListener("click", function () { irPara(b.dataset.ir); }); });
    $("me-copiar").addEventListener("click", function () {
      var link = location.origin + location.pathname + "?a=" + estado.id;
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () {
        $("me-copiado").textContent = "Link copiado.";
      }).catch(function () { $("me-copiado").textContent = link; });
    });

    var idUrl = new URLSearchParams(location.search).get("a"), local = lerLocal();
    if (idUrl && !idValido(idUrl)) idUrl = null;
    var id = idUrl || (local && local.id);
    if (local && local.id === id) { estado = { id: id, dados: normalizar(local.dados) }; }

    if (!id) { pedirEntrada(null); return; }
    if (estado && estado.dados.nome) abrirPainel();

    buscar(id).then(function (r) {
      if (r && r.ok && r.existe) {
        carimbos = String(r.carimbos || "").split(/[^0-9]+/).map(Number).filter(function (n) { return n >= 1 && n <= 6; });
        var remoto = normalizar(r.dados);
        if (!estado || remoto.t > estado.dados.t) { estado = { id: id, dados: remoto }; guardarLocal(); }
        else if (estado.dados.t > remoto.t) enviar();
        abrirPainel();
      } else if (estado && estado.dados.nome) {
        if (r && r.ok && !r.existe) enviar();
      } else {
        pedirEntrada(id);
      }
    });
  });
})();
