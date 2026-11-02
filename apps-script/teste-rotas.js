// Testa as regras de rota/pontuação com casos conhecidos. Rodar: node apps-script/teste-rotas.js
const R = require("../aplicacao-regras.js"); const O = R.OPCOES;
let falhas = 0;
function caso(nome, r, perfil, temp) {
  const c = R.classificar(r);
  const ok = c.perfil === perfil && (!temp || c.temperatura === temp);
  if (!ok) { falhas++; console.log("FALHOU", nome, c); } else console.log("ok  ", nome, c.perfil, c.pontuacao, c.temperatura);
}
const base = { fase: O.fase[0], ingles: O.ingles[0], experiencia: O.experiencia[2], urgencia: O.urgencia[0], investimento: O.investimento[2] };
caso("Iniciante com mais de R$300 vira A", base, "A");
caso("Básico com mais de R$300 vira A", { ...base, ingles: O.ingles[1], investimento: O.investimento[2] }, "A");
caso("Iniciante até R$100 vira A2", { ...base, investimento: O.investimento[0] }, "A2");
caso("Básico agora não consigo vira A2", { ...base, ingles: O.ingles[1], investimento: O.investimento[3] }, "A2");
caso("Iniciante só pesquisando com caixa vira D", { ...base, urgencia: O.urgencia[3] }, "D");
caso("Intermediário pronto vira B quente", { ...base, ingles: O.ingles[2], investimento: O.investimento[2], experiencia: O.experiencia[0] }, "B", "quente");
caso("Avançado 3-6 meses mais de R$300 vira B", { ...base, ingles: O.ingles[3], urgencia: O.urgencia[1] }, "B");
caso("Intermediário mais de 6 meses vira A", { ...base, ingles: O.ingles[2], urgencia: O.urgencia[2] }, "A");
caso("Intermediário só pesquisando vira D", { ...base, ingles: O.ingles[2], urgencia: O.urgencia[3] }, "D");
caso("Intermediário agora não consigo vira D", { ...base, ingles: O.ingles[2], investimento: O.investimento[3] }, "D");
caso("Intermediário R$100-300 vira A", { ...base, ingles: O.ingles[2], investimento: O.investimento[1] }, "A");
caso("Avançado até R$100 vira A2", { ...base, ingles: O.ingles[3], investimento: O.investimento[0] }, "A2");
caso("Avançado até R$100 e só pesquisando vira D", { ...base, ingles: O.ingles[3], investimento: O.investimento[0], urgencia: O.urgencia[3] }, "D");
caso("Intermediário R$300+ com mais de 6 meses vira A", { ...base, ingles: O.ingles[2], investimento: O.investimento[2], urgencia: O.urgencia[2] }, "A");
caso("Aprovado vira C mesmo com inglês alto", { ...base, fase: O.fase[4], ingles: O.ingles[3] }, "C");
caso("Aprovado com inglês baixo e sem caixa ainda é C", { ...base, fase: O.fase[4], investimento: O.investimento[0] }, "C");
caso("Frio", { fase: O.fase[0], ingles: O.ingles[0], experiencia: O.experiencia[2], urgencia: O.urgencia[3], investimento: O.investimento[3] }, "A2", "frio");
// Todas as combinações têm perfil e pontuação válidos
let n = 0;
for (const f of O.fase) for (const i of O.ingles) for (const e of O.experiencia) for (const u of O.urgencia) for (const v of O.investimento) {
  const c = R.classificar({ fase: f, ingles: i, experiencia: e, urgencia: u, investimento: v }); n++;
  if (!c.perfil || c.pontuacao < 0 || c.pontuacao > 12) { falhas++; console.log("INVÁLIDO", c); }
}
console.log(n + " combinações verificadas;", falhas ? falhas + " falhas" : "tudo certo");
process.exit(falhas ? 1 : 0);
