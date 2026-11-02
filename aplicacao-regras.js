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
