/* Painel do aluno (Meu Embarque), Consultoria RADAR.
   Sem login: o link pessoal (?a=codigo) é a chave. O progresso fica no aparelho e é copiado
   para a aba "Painel" da planilha pelo mesmo Apps Script do Plano de Embarque. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var ALPA = "https://t2e.alpaclass.com/curso/";
  var APOSTILA = "https://t2e.alpaclass.com/curso/4yRppO/aula/HXcBhH";
  var PLANOS = ["Consultoria RADAR Sprint", "Consultoria RADAR Premium", "Consultoria RADAR VIP"];
  var NOMES_CARIMBO = ["Plano de Embarque pronto", "Primeira aplicação", "Entrevista marcada", "Aprovação na entrevista", "Embarque marcado", "A bordo"];

  /* A trilha segue os 7 cursos da fileira Consultoria RADAR na Alpa Class.
     auto: item marcado sozinho a partir do que o aluno registra em outra aba. */
  var ETAPAS = [
    { titulo: "Comece por aqui", curso: "4yRppO", itens: [
      ["boasvindas", "Ler as boas-vindas", "Como funciona a sua consultoria, em 5 minutos."],
      ["apostila", "Abrir a apostila da consultoria", "O material que acompanha você em todas as etapas.", APOSTILA],
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

  /* Treino do dia, por nível de inglês: um item por dia, o mesmo para todo mundo, em ciclo. */
  var FRASES = [
    ["Hello, nice to meet you.", "Olá, prazer em conhecer você.", "Primeiro cumprimento na entrevista."],
    ["Thank you for your time.", "Obrigado pelo seu tempo.", "No começo ou no fim da entrevista."],
    ["I am excited about this opportunity.", "Estou animado com esta oportunidade.", "Para mostrar interesse na vaga."],
    ["I have experience in customer service.", "Tenho experiência em atendimento ao cliente.", "Para falar do seu currículo."],
    ["I am a hard worker and a team player.", "Sou trabalhador e jogo em equipe.", "Quando perguntarem sobre os seus pontos fortes."],
    ["I am a fast learner.", "Aprendo rápido.", "Quando perguntarem sobre os seus pontos fortes."],
    ["I work well under pressure.", "Trabalho bem sob pressão.", "Para responder sobre dias cheios e pressão."],
    ["I enjoy working with people.", "Gosto de trabalhar com pessoas.", "Para falar de atendimento e equipe."],
    ["I enjoy serving people from different cultures.", "Gosto de atender pessoas de culturas diferentes.", "Para falar de trabalhar com pessoas de vários países."],
    ["I am looking for new challenges.", "Estou em busca de novos desafios.", "Quando perguntarem por que você quer mudar de emprego."],
    ["I am looking for a job where I can grow with the company.", "Procuro um emprego onde eu possa crescer com a empresa.", "Quando perguntarem o que você procura."],
    ["I would like to grow in this company.", "Eu gostaria de crescer nesta empresa.", "Quando perguntarem sobre o seu futuro."],
    ["I am actively job searching right now.", "Estou procurando emprego ativamente agora.", "Quando perguntarem sobre a sua situação atual."],
    ["I saw the position on a career website.", "Vi a vaga em um site de carreiras.", "Quando perguntarem como você soube da vaga."],
    ["I found the position on a job board.", "Encontrei a vaga em um quadro de empregos.", "Quando perguntarem como você soube da vaga."],
    ["I saw an advertisement for the job opening.", "Vi um anúncio da vaga.", "Quando perguntarem como você soube da vaga."],
    ["I have done my research about your company.", "Pesquisei sobre a sua empresa.", "Quando perguntarem o que você sabe sobre a companhia."],
    ["My skills make me a perfect fit.", "As minhas habilidades fazem de mim a pessoa certa.", "Quando perguntarem por que devem contratar você."],
    ["My experience makes me a perfect fit.", "A minha experiência faz de mim a pessoa certa.", "Quando perguntarem por que devem contratar você."],
    ["I am available to start right away.", "Estou disponível para começar imediatamente.", "Quando perguntarem sobre a sua disponibilidade."],
    ["I am available to embark as soon as possible.", "Estou disponível para embarcar o quanto antes.", "Quando perguntarem quando você pode embarcar."],
    ["I am ready to work on a cruise ship.", "Estou pronto para trabalhar em um navio de cruzeiro.", "Para mostrar que você está preparado."],
    ["I like to help guests.", "Gosto de ajudar os hóspedes.", "Para falar de hospitalidade."],
    ["I am very organized and punctual.", "Sou muito organizado e pontual.", "Quando perguntarem sobre os seus pontos fortes."],
    ["I speak Portuguese and English.", "Falo português e inglês.", "Quando perguntarem sobre idiomas."],
    ["Yes, I do.", "Sim, eu tenho.", "Resposta para: Do you have any questions for us?"],
    ["What is the typical day for this position like?", "Como é o dia a dia nesta posição?", "Uma pergunta boa para fazer no fim da entrevista."],
    ["Can you talk about company culture?", "Você pode falar sobre a cultura da empresa?", "Outra pergunta boa para fazer no fim da entrevista."],
    ["Thank you for this opportunity.", "Obrigado por esta oportunidade.", "Para encerrar a entrevista."],
    ["I look forward to hearing from you.", "Aguardo o seu retorno.", "Para encerrar a entrevista."]
  ];

  // Como se fala, no jeito do Augusto (artefato Pronúncia Fácil): mesma ordem de FRASES
  var FALADO = [
    "Relou, nais tu mit iú.",
    "Fénk iú for iór taim.",
    "Ai ém eksáitid abáut dis óportiúniti.",
    "Ai rév ekspíriens in kâstomer sérvis.",
    "Ai ém a rárd uârker énd a tim plêier.",
    "Ai ém a fést lârner.",
    "Ai uârk uél ânder préxer.",
    "Ai indjói uârkin uíd pípol.",
    "Ai indjói sârvin pípol fróm díferent kâltchers.",
    "Ai ém lúkin for niú tchélendjis.",
    "Ai ém lúkin for a djób uér ai kén grôu uíd dâ kâmpani.",
    "Ai uúd laik tu grôu in dis kâmpani.",
    "Ai ém éktivli djób sârtchin ráit náu.",
    "Ai só dâ pozíxan ón a karíar uébsait.",
    "Ai fáund dâ pozíxan ón a djób bórd.",
    "Ai só ân edvârtáizment for dâ djób ôupenin.",
    "Ai rév dân mai risârtch abáut iór kâmpani.",
    "Mai skíls mêik mi a pârfekt fit.",
    "Mai ekspíriens mêiks mi a pârfekt fit.",
    "Ai ém avêilabol tu stárt ráit auêi.",
    "Ai ém avêilabol tu embárk és sun és pósibol.",
    "Ai ém rédi tu uârk ón a kruz xip.",
    "Ai laik tu rélp guésts.",
    "Ai ém véri órganaizd énd pânktchual.",
    "Ai spik pórtiguis énd ínglix.",
    "Iés, ai du.",
    "Uót is dâ típikal dêi for dis pozíxan laik?",
    "Kén iú tók abáut kâmpani kâltcher?",
    "Fénk iú for dis óportiúniti.",
    "Ai lúk fórduard tu ríarin fróm iú."
  ];
  var PERGUNTAS = [
    ["Tell me about yourself.", "Fale sobre você.", "Use o seu Universo, que está no Plano de Embarque: quem você é, o que já fez e por que navio."],
    ["Why do you want to work on a cruise ship?", "Por que você quer trabalhar em navio de cruzeiro?", "Dê um motivo seu, ligado ao trabalho, e não só a viajar."],
    ["Why should we hire you?", "Por que devemos contratar você?", "Ligue uma experiência sua ao cargo que você quer."],
    ["What do you know about our company?", "O que você sabe sobre a nossa companhia?", "Cite dois fatos da companhia para a qual você aplicou: navios, rotas ou público."],
    ["Tell me about a time you dealt with a difficult customer.", "Conte uma vez em que você lidou com um cliente difícil.", "Conte em três partes: o que aconteceu, o que você fez e como terminou."],
    ["How do you feel about working long hours, seven days a week?", "Como você lida com trabalhar muitas horas, sete dias por semana?", "Mostre que você sabe como é a rotina e dê um exemplo de quando já trabalhou assim."],
    ["How do you feel about being away from home for months?", "Como você lida com ficar meses longe de casa?", "Seja sincero e diga como você se organiza para isso."],
    ["Have you worked with people from other countries?", "Você já trabalhou com pessoas de outros países?", "Se já, conte como foi. Se não, conte uma vez em que se adaptou a um grupo diferente."],
    ["What would you do if a guest was rude to you?", "O que você faria se um hóspede fosse grosseiro com você?", "Manter a calma, ouvir, resolver o que der e chamar o supervisor se precisar."],
    ["What are your strengths?", "Quais são os seus pontos fortes?", "Escolha dois e dê um exemplo real para cada um."],
    ["What is your biggest weakness?", "Qual é o seu maior ponto fraco?", "Diga um ponto real e o que você faz para melhorar."],
    ["How do you handle pressure?", "Como você lida com pressão?", "Conte um dia cheio de verdade e o que você fez para dar conta."],
    ["What would you do if you saw a colleague breaking a safety rule?", "O que você faria se visse um colega quebrando uma regra de segurança?", "Segurança vem primeiro: avisar o colega e comunicar o supervisor."],
    ["Are you comfortable sharing a cabin?", "Você fica à vontade dividindo cabine?", "Mostre que sabe que a cabine é compartilhada e como você convive bem."],
    ["Where do you see yourself in five years?", "Onde você se vê daqui a cinco anos?", "Fale de crescer dentro da função ou da companhia."]
  ];
  // Exemplo de resposta em inglês para cada pergunta do intermediário (modelo para a pessoa adaptar)
  var RESPOSTAS = [
    "I am a hard worker and I enjoy helping people. I have experience in customer service, and I learn fast. Now I want to build my career on a cruise ship.",
    "I love working with people from different cultures. I also want to grow in my career and learn something new every day. A cruise ship is the perfect place for that.",
    "I am responsible, I work well in a team, and I stay calm under pressure. I always put the guest first. I am ready to give my best every day.",
    "I did my research about your company. I know you care about guest service and teamwork. I would be proud to be part of your team.",
    "Once, a customer was upset because his order was late. I listened carefully, I said sorry, and I fixed the problem quickly. In the end, he thanked me.",
    "I understand that the work on board is intense. I am used to long hours, and I keep my energy with good rest and a positive attitude. I am ready for this rhythm.",
    "I will miss my family, but I am prepared. I plan to call them in my free time and focus on my work. My goal is worth it.",
    "Yes, I enjoy it. I learn a lot from different cultures. I always respect everyone and I communicate in a clear and simple way.",
    "I would stay calm and listen to the guest. I would say sorry and try to solve the problem. If I cannot, I would call my supervisor.",
    "My strengths are teamwork and patience. I stay calm with guests, and I help my colleagues when they need me.",
    "Sometimes I am shy to speak first in English. To improve, I practice every day and I ask questions. It is getting better every week.",
    "I stay calm and I focus on one task at a time. I ask for help when I need it. Pressure helps me stay focused.",
    "Safety comes first. I would talk to my colleague politely and remind them of the rule. If it continues, I would tell my supervisor.",
    "Yes, I am comfortable with it. I respect other people's space and I keep my area clean. I get along well with different people.",
    "In five years, I want to grow in this company and take more responsibility. I hope to become a leader in my department."
  ];
  var SITUACOES = [
    ["A guest complains that the cabin next door is too noisy at midnight.", "Um hóspede reclama que a cabine ao lado está barulhenta à meia-noite.", "Peça desculpas, mostre que entendeu e diga o que você vai fazer agora."],
    ["A guest says the food arrived cold.", "Um hóspede diz que a comida chegou fria.", "Peça desculpas, ofereça trocar e diga em quanto tempo volta."],
    ["A guest lost their cruise card.", "Um hóspede perdeu o cartão do cruzeiro.", "Acalme o hóspede e diga para onde ele deve ir para fazer outro."],
    ["A guest wants a table by the window, but the restaurant is full.", "Um hóspede quer uma mesa na janela, mas o restaurante está cheio.", "Diga não com educação e ofereça uma alternativa."],
    ["A guest asks about an excursion you know nothing about.", "Um hóspede pergunta sobre uma excursão que você não conhece.", "Não invente. Diga que vai confirmar e para onde ele pode ir."],
    ["A guest is upset because the pool is closed for maintenance.", "Um hóspede está chateado porque a piscina fechou para manutenção.", "Reconheça a frustração e sugira outra opção a bordo."],
    ["A guest with a nut allergy asks if the dessert is safe.", "Um hóspede com alergia a castanhas pergunta se a sobremesa é segura.", "Nunca chute. Diga que vai confirmar com a cozinha antes de servir."],
    ["A guest asks you to break a rule, just this once.", "Um hóspede pede para você quebrar uma regra, só desta vez.", "Recuse com firmeza e gentileza, e explique o motivo em uma frase."],
    ["Your supervisor asks why you were five minutes late.", "O seu supervisor pergunta por que você chegou cinco minutos atrasado.", "Assuma, sem desculpa longa, e diga o que vai fazer para não repetir."],
    ["A new colleague does not understand your instructions.", "Um colega novo não entende as suas instruções.", "Explique de novo com palavras simples e mostre como se faz."],
    ["A guest feels seasick and asks you for help.", "Um hóspede está enjoado e pede a sua ajuda.", "Mostre cuidado e indique o centro médico ou a recepção."],
    ["A child is lost and crying near the buffet.", "Uma criança está perdida e chorando perto do buffet.", "Acalme a criança, fique com ela e avise a segurança ou o seu supervisor."]
  ];
  var NIVEIS = [
    ["basico", "Básico", "Entendo pouco e falo frases curtas.", "Frase para repetir", "Fale em voz alta três vezes."],
    ["intermediario", "Intermediário", "Entendo e respondo, com erros.", "Pergunta de entrevista", "Responda em voz alta por um minuto. Depois escreva a sua resposta nas anotações."],
    ["avancado", "Avançado", "Converso sem travar.", "Situação a bordo", "Responda em inglês, em voz alta, por 30 segundos, sem ler."]
  ];

  var ONDE = ["ISMBR", "Infinity Brazil", "MSC (site da companhia)", "Corazul (site da companhia)", "Cast-A-Way", "Outra"];
  var STATUS_CAND = ["Enviada", "Entrevista marcada", "Aprovado", "Não passou"];
  var CHECK_ENTREVISTA = [
    ["cam", "Testei a webcam e a internet"],
    ["mic", "Testei o microfone e o fone"],
    ["lugar", "Escolhi um lugar silencioso, com luz no rosto e o fundo limpo"],
    ["sim", "Fiz a simulação de entrevista"],
    ["roteiro", "Li o meu roteiro de respostas"],
    ["notas", "Preparei os lembretes (sticky notes) ao lado da tela"]
  ];

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
      ["Apostila da consultoria", "O material que acompanha você em todas as etapas.", APOSTILA],
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
      ["Seaman Náutica (STCW)", "Escola parceira. Diga que é aluno da De Casa Pro Mundo.", "https://www.seaman.com.br/"],
      ["Wise", "Conta internacional para receber e mandar dinheiro.", "https://wise.com/invite/ilpn/augustos21"],
      ["Airalo", "Chip virtual para ter internet ao pousar. Código AUGUST6205.", "https://airalo.go.link/gPpe8"],
      ["Lista da mala na Amazon", "Os itens que valem a pena comprar.", "https://www.amazon.com.br/shop/decasa.promundo/list/1HU2F503E7OWG?ref_=aipsflist&tag=augustocesa00-20"],
      ["Lista da mala no Mercado Livre", "A mesma ideia, para quem prefere.", "https://mercadolivre.com/sec/2BHxGDj"]
    ], "Exame médico: Premedical e Sampletrip têm clínicas credenciadas no Brasil todo. Wise, Airalo e as listas são links de indicação meus."]
  ];

  var audioIngles = null;
  var estado = null;   // { id, dados: { nome, plano, feitos, candidaturas, docs, t } }
  var carimbos = [], contrato = "", planoLink = "", entrevistaLink = "", prazo = { inicio: "", fim: "" };
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
  function vazio() { return { nome: "", plano: "", email: "", whatsapp: "", inicio: "", meta: "", cargo: "", nivel: "", notas: "", termos: "", ingles: [], feitos: {}, candidaturas: [], docs: {}, t: 0 }; }

  /* Datas: o aluno digita dia/mês/ano; por dentro fica aaaa-mm-dd. */
  var MESES_NOME = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  function dataBR(iso) { var p = String(iso || "").split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : ""; }
  function isoDe(br) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || "").trim()); if (!m) return null;
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    if (d.getFullYear() !== +m[3] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[1] || +m[3] < 1990 || +m[3] > 2100) return null;
    return m[3] + "-" + m[2] + "-" + m[1];
  }
  function mascaraData(campo) {
    campo.addEventListener("input", function () {
      var n = campo.value.replace(/\D/g, "").slice(0, 8);
      campo.value = n.length > 4 ? n.slice(0, 2) + "/" + n.slice(2, 4) + "/" + n.slice(4) : n.length > 2 ? n.slice(0, 2) + "/" + n.slice(2) : n;
    });
  }
  function hojeISO() { var h = new Date(); return h.getFullYear() + "-" + ("0" + (h.getMonth() + 1)).slice(-2) + "-" + ("0" + h.getDate()).slice(-2); }
  /* Duração de cada plano: Sprint 30 dias, Premium 90 dias, VIP 12 meses. A conta vale a do servidor; esta é só para a primeira tela. */
  function fimDe(inicio, plano) {
    var p = String(inicio || "").split("-"); if (p.length !== 3) return "";
    var vip = /VIP/.test(plano), dias = vip ? 0 : /Sprint/.test(plano) ? 30 : 90;
    return new Date(Date.UTC(+p[0], +p[1] - 1 + (vip ? 12 : 0), +p[2] + dias)).toISOString().slice(0, 10);
  }
  function hojeBR() { var h = new Date(); return ("0" + h.getDate()).slice(-2) + "/" + ("0" + (h.getMonth() + 1)).slice(-2) + "/" + h.getFullYear(); }

  /* Meta de embarque: mês e ano escolhidos pelo aluno (aaaa-mm). */
  function montarMeta(mes, ano, valor) {
    mes.innerHTML = ""; ano.innerHTML = "";
    mes.appendChild(el("option", { value: "", text: "Mês" })); ano.appendChild(el("option", { value: "", text: "Ano" }));
    MESES_NOME.forEach(function (n, i) { mes.appendChild(el("option", { value: ("0" + (i + 1)).slice(-2), text: n })); });
    var p = String(valor || "").split("-"), a0 = new Date().getFullYear();
    if (p.length === 2 && +p[0] < a0) a0 = +p[0];
    for (var a = a0; a <= new Date().getFullYear() + 3; a++) ano.appendChild(el("option", { value: String(a), text: String(a) }));
    if (p.length === 2) { ano.value = p[0]; mes.value = p[1]; }
  }
  function lerMeta(mes, ano) { return mes.value && ano.value ? ano.value + "-" + mes.value : ""; }
  function metaTexto(m) { var p = String(m || "").split("-"); return p.length === 2 ? MESES_NOME[+p[1] - 1] + " de " + p[0] : ""; }
  function diasAte(m) {
    var p = String(m || "").split("-"); if (p.length !== 2) return null;
    var h = new Date(); h.setHours(0, 0, 0, 0);
    return Math.round((new Date(+p[0], +p[1] - 1, 1) - h) / 864e5);
  }
  function normalizar(d) {
    d = d || {}; var b = vazio();
    b.nome = String(d.nome || "").slice(0, 60); b.meta = /^\d{4}-\d{2}$/.test(d.meta || "") ? d.meta : ""; b.cargo = String(d.cargo || "").slice(0, 40);
    b.email = String(d.email || "").slice(0, 80); b.whatsapp = String(d.whatsapp || "").slice(0, 20); b.inicio = /^\d{4}-\d{2}-\d{2}$/.test(d.inicio || "") ? d.inicio : ""; b.plano = PLANOS.indexOf(d.plano) > -1 ? d.plano : "";
    b.feitos = d.feitos && typeof d.feitos === "object" ? d.feitos : {};
    b.candidaturas = (Array.isArray(d.candidaturas) ? d.candidaturas.slice(0, 40) : []).map(function (c) { c = c || {}; if (c.status === "Em análise" || STATUS_CAND.indexOf(c.status) < 0) c.status = "Enviada"; c.aprovado = /^\d{4}-\d{2}-\d{2}$/.test(c.aprovado || "") ? c.aprovado : ""; c.nota = String(c.nota || "").slice(0, 600); c.motivo = String(c.motivo || "").slice(0, 300); c.lista = c.lista && typeof c.lista === "object" ? c.lista : {}; return c; });
    b.docs = d.docs && typeof d.docs === "object" ? d.docs : {};
    b.ingles = (Array.isArray(d.ingles) ? d.ingles : []).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); }).slice(-120);
    b.nivel = ["basico", "intermediario", "avancado"].indexOf(d.nivel) > -1 ? d.nivel : ""; b.notas = String(d.notas || "").slice(0, 3000);
    b.termos = /^\d{4}-\d{2}-\d{2}$/.test(d.termos || "") ? d.termos : "";
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
    var url = endpoint(); if (!url || !estado) return;
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

  /* Selo "Novo" por 48 horas, contadas da primeira vez que esta pessoa vê o link neste aparelho */
  function ehNovo(url) {
    var chave = CHAVE + "-vistos", mapa = {}, agora = Date.now();
    try { mapa = JSON.parse(localStorage.getItem(chave) || "{}") || {}; } catch (e) { mapa = {}; }
    if (!mapa[url]) { mapa[url] = agora; try { localStorage.setItem(chave, JSON.stringify(mapa)); } catch (e) {} }
    return agora - mapa[url] < 48 * 36e5;
  }
  function seloNovo(url) { return ehNovo(url) ? el("i", { class: "me-novo", text: "Novo" }) : null; }

  function desenharTopo() {
    var d = estado.dados;
    $("me-plano").textContent = d.plano.replace("Consultoria ", "");
    $("me-ola").textContent = d.nome;
    $("me-meta-txt").textContent = metaTexto(d.meta) || "defina a sua meta";
    $("me-cargo-txt").textContent = d.cargo || "A definir";
    var dias = diasAte(d.meta), abordo = carimbos.indexOf(6) > -1;
    $("me-faltam-rot").textContent = abordo ? "Situação" : dias > 0 ? "Faltam" : "Meta";
    $("me-faltam").textContent = abordo ? "A bordo" : dias == null ? "A definir" : dias > 0 ? dias + (dias === 1 ? " dia" : " dias") : "É agora";
    var p = $("me-passaporte"); p.innerHTML = "";
    NOMES_CARIMBO.forEach(function (nome, i) {
      var tem = carimbos.indexOf(i + 1) > -1;
      p.appendChild(el("div", { class: "me-carimbo" + (tem ? " tem" : ""), role: "img", "aria-label": "Carimbo " + (i + 1) + ", " + nome + (tem ? ": conquistado" : ": ainda não"), title: nome, text: String(i + 1) }));
    });
    var fim = prazo.fim || fimDe(d.inicio, d.plano), pz = $("me-prazo"); pz.innerHTML = ""; pz.hidden = !fim;
    if (fim) {
      var resta = Math.round((Date.parse(fim) - Date.parse(hojeISO())) / 864e5);
      pz.appendChild(el("span", { text: resta >= 0 ? "Sua consultoria vai até " + dataBR(fim) : "Sua consultoria terminou em " + dataBR(fim) }));
      if (resta >= 0) pz.appendChild(el("b", { text: resta === 0 ? "Último dia" : resta === 1 ? "Falta 1 dia" : "Faltam " + resta + " dias" }));
    }
    var cx = $("me-contrato"); cx.innerHTML = "";
    if (contrato || planoLink || entrevistaLink) cx.appendChild(el("h3", { class: "me-docs-titulo", text: "Seus documentos" }));
    if (contrato) cx.appendChild(externo(el("a", { class: "me-contrato", href: contrato }, [el("span", null, [el("b", { text: "Seu contrato" }, [seloNovo(contrato)]), el("small", { text: "Toque para abrir e assinar." })])])));
    if (planoLink) cx.appendChild(externo(el("a", { class: "me-contrato", href: planoLink }, [el("span", null, [el("b", { text: "Seu Plano de Embarque" }, [seloNovo(planoLink)]), el("small", { text: "O documento da sua consultoria. Toque para abrir." })])])));
    if (entrevistaLink) cx.appendChild(externo(el("a", { class: "me-contrato", href: entrevistaLink }, [el("span", null, [el("b", { text: "Sua Entrevista" }, [seloNovo(entrevistaLink)]), el("small", { text: "As perguntas e respostas para treinar. Toque para abrir." })])])));
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

  function sequencia(dias) {
    var tem = {}; dias.forEach(function (x) { tem[x] = 1; });
    var d = new Date(); d.setHours(12, 0, 0, 0);
    var chave = function () { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
    if (!tem[chave()]) d.setDate(d.getDate() - 1); // quem ainda não praticou hoje não perde a sequência de ontem
    var n = 0; while (tem[chave()]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function iconeWhats() {
    var i = document.createElement("i"); i.className = "me-wa-ico"; i.setAttribute("aria-hidden", "true");
    i.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91a9.85 9.85 0 0 0-2.9-7.01A9.83 9.83 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29z"/></svg>';
    return i;
  }
  function desenharPratica() {
    var box = $("me-pratica"), d = estado.dados; box.innerHTML = "";
    var g = el("div", { class: "opcoes", role: "radiogroup", "aria-label": "Seu nível de inglês hoje" });
    NIVEIS.forEach(function (n) {
      g.appendChild(el("button", { type: "button", class: "opcao me-nivel", role: "radio", "aria-checked": d.nivel === n[0] ? "true" : "false",
        onclick: function () { d.nivel = n[0]; mudou(); desenharPratica(); } }, [el("b", { text: n[1] }), el("small", { text: n[2] })]));
    });
    box.appendChild(el("h3", { class: "me-sub", text: "Seu nível de inglês hoje" }));
    box.appendChild(g);

    var nivel = NIVEIS.filter(function (n) { return n[0] === d.nivel; })[0];
    if (!nivel) {
      box.appendChild(el("p", { class: "me-vazio", text: "Escolha o seu nível para ver o treino de hoje." }));
    } else {
      var lista = nivel[0] === "basico" ? FRASES : nivel[0] === "intermediario" ? PERGUNTAS : SITUACOES;
      var dias = d.ingles, hoje = hojeISO(), feitoHoje = dias.indexOf(hoje) > -1, h = new Date();
      var ix = Math.floor(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate()) / 864e5) % lista.length, f = lista[ix];
      var arq = "audio/ingles/" + (nivel[0] === "basico" ? "f" : nivel[0] === "intermediario" ? "p" : "s") + "-" + (ix < 10 ? "0" : "") + ix + ".mp3";
      var seq = sequencia(dias);
      var acoes = el("div", { class: "me-acoes" });
      // Voz gravada (mp3, toca em qualquer celular). Se o arquivo faltar, usa a voz do aparelho como reserva.
      function tocar(arquivo, texto) {
        function reserva() { try { var u = new SpeechSynthesisUtterance(texto); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }
        var pode = window.speechSynthesis && window.SpeechSynthesisUtterance;
        try {
          if (audioIngles) audioIngles.pause();
          audioIngles = new Audio(arquivo + "?v=3");
          audioIngles.addEventListener("error", function () { if (pode) reserva(); });
          var pr = audioIngles.play(); if (pr && pr.catch) pr.catch(function () { if (pode) reserva(); });
        } catch (e) { if (pode) reserva(); }
      }
      var intermediario = nivel[0] === "intermediario", resposta = intermediario ? RESPOSTAS[ix] : null;
      var arqResp = "audio/ingles/r-" + (ix < 10 ? "0" : "") + ix + ".mp3";
      acoes.appendChild(el("button", { class: "btn btn-secundario", type: "button", onclick: function () { tocar(arq, f[0]); } },
        [nivel[0] === "basico" ? "Ouvir em inglês" : "Ouvir a pergunta"]));
      if (resposta) acoes.appendChild(el("button", { class: "btn btn-secundario", type: "button", onclick: function () { tocar(arqResp, resposta); } }, ["Ouvir a resposta"]));
      // Botão do WhatsApp: só Premium e VIP (o Sprint não tem). Abre a conversa com a frase; a pessoa grava e envia o áudio lá.
      var comWhats = /Premium|VIP/.test(d.plano || "");
      var whats = comWhats ? externo(el("a", { class: "btn btn-secundario me-ingles-whats", href: "https://wa.me/5513996540972?text=" + encodeURIComponent(
        "Oi Augusto! Aqui é " + String(d.nome || "").split(" ")[0] + ". Vou te mandar o áudio da minha prática de hoje: \"" + f[0] + "\"") },
        [iconeWhats(), el("span", { text: nivel[0] === "basico" ? "Mandar meu áudio para o Augusto" : "Mandar minha resposta para o Augusto" })])) : null;
      acoes.appendChild(el("button", { class: "btn" + (feitoHoje ? " me-ok" : ""), type: "button", disabled: feitoHoje ? true : null, onclick: function () {
        if (dias.indexOf(hoje) < 0) { dias.push(hoje); d.ingles = dias.slice(-120); mudou(); desenharPratica(); }
      } }, [feitoHoje ? "Feito hoje ✓" : "Pratiquei hoje"]));
      box.appendChild(el("h3", { class: "me-sub", text: "Treino de hoje" }));
      box.appendChild(el("div", { class: "me-ingles" }, [
        el("div", { class: "me-ingles-topo" }, [el("span", { text: nivel[3] }),
          el("span", { text: seq ? "Sequência: " + seq + (seq === 1 ? " dia" : " dias") : "Comece a sua sequência" })]),
        el("p", { class: "me-ingles-frase", lang: "en", text: f[0] }),
        nivel[0] === "basico" && FALADO[ix] ? el("p", { class: "me-ingles-falado" }, [el("small", { text: "Como se fala" }), el("b", { text: FALADO[ix] })]) : null,
        resposta ? el("div", { class: "me-ingles-resp" }, [el("small", { text: "Exemplo de resposta" }), el("p", { lang: "en", text: resposta }),
          el("span", { text: "É um modelo: troque pelos seus dados e pela sua história." })]) : el("p", { class: "me-ingles-trad", text: f[1] }),
        el("p", { class: "me-ingles-uso", text: f[2] }),
        el("p", { class: "me-ingles-tarefa", text: nivel[4] }),
        acoes,
        whats
      ]));
    }

    var notas = el("textarea", { class: "campo me-notas", id: "me-notas", rows: "7", maxlength: "3000",
      placeholder: "Exemplo: minha resposta para \"Tell me about yourself\", palavras que eu travo, dúvidas para a simulação." });
    notas.value = d.notas || "";
    notas.addEventListener("input", function () { d.notas = notas.value.slice(0, 3000); mudou(); });
    box.appendChild(el("h3", { class: "me-sub", text: "Minhas respostas e anotações" }));
    box.appendChild(el("p", { class: "me-dica", text: "Escreva aqui as suas respostas de entrevista. O Augusto consegue ver o que você escreve." }));
    box.appendChild(notas);
    box.appendChild(externo(el("a", { class: "btn btn-secundario me-pratica-link", href: ALPA + "9SPS9g" }, ["Abrir as aulas de entrevista"])));
    box.appendChild(externo(el("a", { class: "btn btn-secundario me-pratica-link", href: ALPA + "OSIUvH" }, ["Abrir o planner e as aulas de inglês"])));
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
  function desenharCands() {
    var box = $("me-cands"), L = estado.dados.candidaturas; box.innerHTML = "";
    if (!L.length) box.appendChild(el("p", { class: "me-vazio", text: "Nenhuma candidatura registrada ainda. Quando enviar a primeira, anote aqui." }));
    L.forEach(function (c, i) {
      var sel = el("select", { class: "campo me-sel", "aria-label": "Situação da candidatura em " + c.onde },
        STATUS_CAND.map(function (s) { return el("option", { value: s, text: s }); }));
      sel.value = c.status;
      var extra = el("div", { class: "me-cand-extra" }), notaBox = el("div", { class: "me-cand-notabox" });
      function desenharExtra() {
        extra.innerHTML = "";
        if (c.status === "Entrevista marcada") {
          c.lista = c.lista || {};
          var feitos = CHECK_ENTREVISTA.filter(function (it) { return c.lista[it[0]]; }).length;
          var conta = el("span", { class: "me-cand-conta", text: feitos + " de " + CHECK_ENTREVISTA.length });
          var ul = el("ul", { class: "me-itens" });
          CHECK_ENTREVISTA.forEach(function (it) {
            var idc = "me-ck-" + i + "-" + it[0];
            var cb = el("input", { type: "checkbox", id: idc, checked: c.lista[it[0]] ? true : null, onchange: function (ev) {
              if (ev.target.checked) c.lista[it[0]] = 1; else delete c.lista[it[0]];
              ev.target.parentNode.className = "me-item" + (ev.target.checked ? " feito" : "");
              conta.textContent = CHECK_ENTREVISTA.filter(function (x) { return c.lista[x[0]]; }).length + " de " + CHECK_ENTREVISTA.length;
              mudou();
            } });
            ul.appendChild(el("li", { class: "me-item" + (c.lista[it[0]] ? " feito" : "") }, [cb, el("label", { for: idc, text: it[1] })]));
          });
          extra.appendChild(el("div", { class: "me-cand-check" }, [el("div", { class: "me-cand-check-topo" }, [el("b", { text: "Checklist da entrevista" }), conta]), ul]));
        } else if (c.status === "Aprovado") {
          var ida = "me-cand-aprov-" + i;
          if (!c.aprovado) { c.aprovado = hojeISO(); mudou(); }
          var dt = el("input", { class: "campo", id: ida, type: "text", inputmode: "numeric", maxlength: "10", placeholder: "dd/mm/aaaa", autocomplete: "off" });
          var erroA = el("p", { class: "erro", role: "alert" });
          mascaraData(dt); dt.value = dataBR(c.aprovado);
          dt.addEventListener("change", function () {
            var iso = isoDe(dt.value);
            if (!iso) { erroA.textContent = "Escreva a data com dia, mês e ano. Exemplo: 21/11/2026."; return; }
            erroA.textContent = ""; c.aprovado = iso; mudou();
          });
          extra.appendChild(el("div", { class: "me-cand-motivo" }, [el("label", { class: "me-cand-rot", for: ida, text: "Data da aprovação" }), dt, erroA]));
        } else if (c.status === "Não passou") {
          var idm = "me-cand-motivo-" + i;
          var mot = el("textarea", { class: "campo me-cand-nota", id: idm, rows: "3", maxlength: "300", placeholder: "O que a empresa disse ou o que você acha que pesou. Isso ajuda a ajustar a próxima." });
          mot.value = c.motivo || "";
          mot.addEventListener("input", function () { c.motivo = mot.value.slice(0, 300); mudou(); });
          extra.appendChild(el("div", { class: "me-cand-motivo" }, [el("label", { class: "me-cand-rot", for: idm, text: "Por que não passou?" }), mot]));
        }
        notaBox.hidden = c.status === "Aprovado"; // quem foi aprovado não precisa de anotações
      }
      sel.addEventListener("change", function () { c.status = sel.value; desenharExtra(); mudou(); });
      desenharExtra();
      var idn = "me-cand-nota-" + i;
      var nota = el("textarea", { class: "campo me-cand-nota", id: idn, rows: "3", maxlength: "600", placeholder: "Perguntas que podem cair, o que lembrar, nome de quem falou com você..." });
      nota.value = c.nota || "";
      nota.addEventListener("input", function () { c.nota = nota.value.slice(0, 600); mudou(); });
      notaBox.appendChild(el("label", { class: "me-cand-rot", for: idn, text: "Anotações desta candidatura" }));
      notaBox.appendChild(nota);
      notaBox.hidden = c.status === "Aprovado";
      box.appendChild(el("div", { class: "me-cand" }, [
        el("div", { class: "me-cand-topo" }, [el("b", { text: c.onde }), el("span", { text: "Enviada em " + dataBR(c.data) })]),
        c.cargo ? el("span", { text: c.cargo }) : null,
        sel,
        extra,
        notaBox,
        el("button", { class: "me-cand-remover", type: "button", "aria-label": "Remover a candidatura em " + c.onde,
          onclick: function () { if (confirm("Remover a candidatura em " + c.onde + "?")) { L.splice(i, 1); mudou(); desenharTudo(); } } }, ["Remover"])
      ]));
    });
  }
  function prepararFormCand() {
    var so = $("me-cand-onde");
    mascaraData($("me-cand-data"));
    ONDE.forEach(function (o) { so.appendChild(el("option", { value: o, text: o })); });
    so.addEventListener("change", function () { $("me-cand-outra").hidden = so.value !== "Outra"; });
    $("me-nova-cand").addEventListener("click", function () {
      $("me-form-cand").hidden = false; $("me-nova-cand").hidden = true;
      $("me-cand-data").value = hojeBR();
      so.focus();
    });
    function fechar() { $("me-form-cand").hidden = true; $("me-nova-cand").hidden = false; $("me-form-cand").reset(); $("me-cand-outra").hidden = true; $("me-erro-cand").textContent = ""; }
    $("me-cand-cancelar").addEventListener("click", fechar);
    $("me-form-cand").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var onde = so.value === "Outra" ? $("me-cand-outra").value.trim() : so.value;
      if (!onde) { $("me-erro-cand").textContent = "Escreva o nome da companhia ou agência."; $("me-cand-outra").focus(); return; }
      var quando = isoDe($("me-cand-data").value);
      if (!quando) { $("me-erro-cand").textContent = "Escreva a data com dia, mês e ano. Exemplo: 21/11/2026."; $("me-cand-data").focus(); return; }
      estado.dados.candidaturas.unshift({ onde: onde.slice(0, 60), cargo: $("me-cand-cargo").value.trim().slice(0, 60), data: quando, status: "Enviada", nota: "" });
      fechar(); mudou(); desenharTudo();
    });
  }

  /* ---------- documentos ---------- */
  function desenharDocs() {
    var box = $("me-docs"); if (box.children.length) return; // campos mantêm o foco; só monta uma vez
    DOCS.forEach(function (doc) {
      var d = estado.dados.docs[doc[0]] || (estado.dados.docs[doc[0]] = { status: STATUS_DOC[0], validade: "" });
      var sel = el("select", { class: "campo me-sel", "aria-label": doc[1] + ": situação" }, STATUS_DOC.map(function (s) { return el("option", { value: s, text: s }); }));
      var idv = "me-val-" + doc[0];
      var val = el("input", { class: "campo", id: idv, type: "text", inputmode: "numeric", maxlength: "10", placeholder: "dd/mm/aaaa", autocomplete: "off" });
      var erro = el("p", { class: "erro", role: "alert" });
      var caixa = el("div", { class: "me-validade" }, [el("label", { for: idv, text: "Válido até (dia, mês e ano)" }), val, erro]);
      mascaraData(val);
      sel.value = d.status; val.value = dataBR(d.validade);
      function ver() { caixa.hidden = sel.value !== "Tenho e está válido"; }
      sel.addEventListener("change", function () { d.status = sel.value; if (sel.value !== "Tenho e está válido") { d.validade = ""; val.value = ""; erro.textContent = ""; } ver(); mudou(); });
      val.addEventListener("change", function () {
        var iso = isoDe(val.value);
        if (val.value && !iso) { erro.textContent = "Escreva a data até quando vale. Exemplo: 10/05/2030."; return; }
        erro.textContent = ""; d.validade = iso || ""; mudou();
      });
      ver();
      box.appendChild(el("div", { class: "me-doc" }, [el("b", { text: doc[1] }), el("small", { text: doc[2] }), el("div", { class: "me-doc-linha" }, [sel, caixa])]));
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

  function desenharTudo() { desenharTopo(); desenharProximo(); desenharPratica(); desenharTrilha(); desenharCands(); desenharDocs(); desenharLinks(); }

  function irPara(aba) {
    document.querySelectorAll(".me-secao").forEach(function (s) { s.hidden = s.dataset.aba !== aba; });
    var topo = document.querySelector(".me-saudacao"); if (topo) topo.hidden = aba !== "trilha";
    var flut = $("me-avisos"); if (flut) flut.hidden = aba !== "trilha"; // o cartão de embarque só aparece na página principal
    document.querySelectorAll("#me-nav button").forEach(function (b) { if (b.dataset.ir === aba) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
  }

  function abrirPainel() {
    $("me-entrada").hidden = true; $("me-painel").hidden = false; $("me-nav").hidden = false;
    var u = new URL(location.href); if (u.searchParams.get("a") !== estado.id) { u.searchParams.set("a", estado.id); history.replaceState(null, "", u); }
    instalavel();
    desenharTudo();
    desenharAvisos(null);
    iniciarPush().then(function (os) { try { os.login(estado.id); } catch (e) {} desenharAvisos(os); });
  }

  /* Avisos no celular (OneSignal). Só liga no endereço oficial do site, que é o que está cadastrado lá. */
  var pushPronto = null;
  function ehIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  function naTelaDeInicio() { return navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches); }
  function iniciarPush() {
    if (pushPronto) return pushPronto;
    pushPronto = new Promise(function (ok) {
      if (!/(^|\.)decasapromundo\.com$/.test(location.hostname)) return;
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(function (os) {
        return os.init({ appId: "2651117a-bf3d-4320-9e39-43d67fca5665", safari_web_id: "web.onesignal.auto.45e32f52-047f-48ea-8b6f-5a9d2fcde2db" })
          .then(function () { ok(os); }, function () {});
      });
    });
    return pushPronto;
  }
  function desenharAvisos(os) {
    var box = $("me-avisos"); box.innerHTML = "";
    var chave = CHAVE + "-avisos", dispensou = false;
    try { dispensou = localStorage.getItem(chave) === "nao"; } catch (e) {}
    if (dispensou || (window.Notification && Notification.permission === "denied")) return;
    var agoraNao = el("button", { class: "btn btn-secundario", type: "button", onclick: function () {
      try { localStorage.setItem(chave, "nao"); } catch (e) {} box.innerHTML = "";
    } }, ["Agora não"]);
    if (ehIOS() && !naTelaDeInicio()) {
      box.appendChild(el("div", { class: "me-chave me-avisar" }, [
        el("h3", { text: "Quer receber avisos no celular?" }),
        el("p", { text: "No iPhone, primeiro coloque o painel na tela de início e abra por lá. O passo a passo está na aba Links." }),
        el("div", { class: "me-acoes" }, [el("button", { class: "btn", type: "button", onclick: function () { irPara("links"); } }, ["Ver como"]), agoraNao])
      ]));
      return;
    }
    if (!os) return;
    var suporta = false, ja = false;
    try { suporta = os.Notifications.isPushSupported(); ja = os.Notifications.permission; } catch (e) {}
    if (!suporta || ja) return;
    box.appendChild(el("div", { class: "me-chave me-avisar" }, [
      el("h3", { text: "Ative os avisos no celular" }),
      el("p", { text: "Você recebe um aviso quando o contrato chegar, quando ganhar um carimbo e quando o prazo estiver perto." }),
      el("div", { class: "me-acoes" }, [el("button", { class: "btn", type: "button", onclick: function () {
        os.Notifications.requestPermission().then(function () { try { os.login(estado.id); } catch (e) {} desenharAvisos(os); }, function () {});
      } }, ["Ativar avisos"]), agoraNao])
    ]));
  }

  /* Manifesto feito na hora, para o atalho da tela de início já abrir no painel desta pessoa. */
  function instalavel() {
    if (ehIOS()) return; // no iPhone vale o arquivo fixo: o atalho guarda o endereço em que a pessoa está, que já tem o código dela
    try {
      var base = location.origin + "/", m = {
        name: "Meu Embarque", short_name: "Meu Embarque", display: "standalone", background_color: "#13233b", theme_color: "#13233b",
        start_url: location.origin + location.pathname + "?a=" + estado.id, scope: base,
        icons: [{ src: base + "assets/share/icone-512.png", sizes: "512x512", type: "image/png" }]
      };
      var l = document.querySelector('link[rel="manifest"]') || document.head.appendChild(el("link", { rel: "manifest" }));
      l.href = "data:application/manifest+json," + encodeURIComponent(JSON.stringify(m));
    } catch (e) {}
  }

  function pedirEntrada(id) {
    $("me-entrada").hidden = false;
    var escolhido = "", g = $("me-planos");
    montarMeta($("me-meta-mes"), $("me-meta-ano"), "");
    PLANOS.forEach(function (p) {
      g.appendChild(el("button", { type: "button", class: "opcao", role: "radio", "aria-checked": "false", onclick: function (ev) {
        escolhido = p; g.querySelectorAll(".opcao").forEach(function (b) { b.setAttribute("aria-checked", b === ev.currentTarget ? "true" : "false"); });
      } }, [p.replace("Consultoria RADAR ", "")]));
    });
    $("me-form-entrada").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var nome = $("me-nome").value.trim().replace(/\s+/g, " "), meta = lerMeta($("me-meta-mes"), $("me-meta-ano"));
      if (nome.split(" ").length < 2) { $("me-erro-entrada").textContent = "Escreva o seu nome e sobrenome."; $("me-nome").focus(); return; }
      var email = $("me-email").value.trim(), whats = $("me-whats").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $("me-erro-entrada").textContent = "Confira o seu e-mail."; $("me-email").focus(); return; }
      if (whats.replace(/\D/g, "").length < 10) { $("me-erro-entrada").textContent = "Escreva o seu WhatsApp com DDD."; $("me-whats").focus(); return; }
      if (!escolhido) { $("me-erro-entrada").textContent = "Escolha o seu plano."; return; }
      if (!meta) { $("me-erro-entrada").textContent = "Escolha o mês e o ano em que você quer embarcar."; $("me-meta-mes").focus(); return; }
      estado = { id: id || novoId(), dados: vazio() };
      estado.dados.nome = nome.slice(0, 60); estado.dados.plano = escolhido;
      estado.dados.meta = meta; estado.dados.cargo = $("me-cargo").value.trim().slice(0, 40);
      estado.dados.email = email.slice(0, 80); estado.dados.whatsapp = whats.slice(0, 20); estado.dados.inicio = hojeISO(); estado.dados.termos = hojeISO();
      mudou(); abrirPainel();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    prepararFormCand();
    function fecharMeta() { $("me-form-meta").hidden = true; $("me-editar-meta").hidden = false; $("me-erro-meta").textContent = ""; }
    $("me-editar-meta").addEventListener("click", function () {
      montarMeta($("me-meta-mes2"), $("me-meta-ano2"), estado.dados.meta); $("me-cargo2").value = estado.dados.cargo;
      $("me-form-meta").hidden = false; $("me-editar-meta").hidden = true; $("me-meta-mes2").focus();
    });
    $("me-meta-cancelar").addEventListener("click", fecharMeta);
    $("me-form-meta").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var meta = lerMeta($("me-meta-mes2"), $("me-meta-ano2"));
      if (!meta) { $("me-erro-meta").textContent = "Escolha o mês e o ano."; return; }
      estado.dados.meta = meta; estado.dados.cargo = $("me-cargo2").value.trim().slice(0, 40);
      fecharMeta(); mudou(); desenharTopo();
    });
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
      if (r && r.ok && r.expirado) {
        try { localStorage.removeItem(CHAVE); } catch (e) {}
        clearTimeout(tEnvio); estado = null;
        $("me-painel").hidden = true; $("me-nav").hidden = true; $("me-entrada").hidden = true; $("me-expirado").hidden = false;
        return;
      }
      if (r && r.ok && r.existe) {
        prazo = { inicio: r.inicio || "", fim: r.fim || "" };
        carimbos = String(r.carimbos || "").split(/[^0-9]+/).map(Number).filter(function (n) { return n >= 1 && n <= 6; });
        contrato = /^https:\/\/\S+$/.test(String(r.contrato || "").trim()) ? String(r.contrato).trim() : "";
        planoLink = /^https:\/\/\S+$/.test(String(r.plano_embarque || "").trim()) ? String(r.plano_embarque).trim() : "";
        entrevistaLink = /^https:\/\/\S+$/.test(String(r.sua_entrevista || "").trim()) ? String(r.sua_entrevista).trim() : "";
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
