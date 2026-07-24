// Prints REAIS do app (v410) pro PDF de instalacao. Modo demo (firebase.config.js bloqueado),
// viewport mobile 390x844 DPR 3, conteudo puro (a moldura de celular vem do HTML do PDF).
// Saida: docs/tutorial-assets/{acesso,meu-ponto,folha,home,onb-novo,ferias,notificacoes,vagas}.png
// Uso: node scratchpad/audit/tutorial-video/pdf-shots.mjs   (srv8081 no ar)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = "http://localhost:8081/public/index.html";
const OUT = path.resolve("docs/tutorial-assets");
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
  isMobile: true, hasTouch: true, serviceWorkers: "block", reducedMotion: "reduce", locale: "pt-BR",
});
await ctx.route("**/*", (route) => {
  const h = new URL(route.request().url()).hostname;
  if (h === "localhost" || h === "127.0.0.1") {
    if (/firebase\.config\.js/.test(route.request().url())) return route.abort();
    return route.continue();
  }
  return route.abort();
});
const page = await ctx.newPage();
page.on("dialog", (d) => d.dismiss().catch(() => {}));
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 160)));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await page.evaluate(() => document.querySelectorAll(".demo-banner").forEach((n) => n.remove()));
  await wait(220);
  await page.screenshot({ path: path.join(OUT, name + ".png") });
  console.log("shot:", name);
};

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => { try { _changelogChecado = true; } catch {} });
await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
await wait(400);

// ---------- 1) Tela de acesso (split) ----------
await page.evaluate(() => {
  document.querySelectorAll(".modal-backdrop").forEach((n) => n.remove());
  document.getElementById("onb-overlay")?.remove();
  document.getElementById("app")?.classList.add("hidden");
  document.getElementById("login")?.classList.add("hidden");
  document.getElementById("login-colab")?.classList.add("hidden");
  document.getElementById("acesso")?.classList.remove("hidden");
});
await shot("acesso");

// ---------- SEED de colaborador (mesma forma do capture do video) ----------
await page.evaluate(() => {
  _changelogChecado = true;
  try { localStorage.setItem("fiopulse:tema", "claro"); } catch {}
  if (!state.users.find((u) => u.id === "colab-tut"))
    state.users.push({ id: "colab-tut", usuario: "colab", senha: "x", role: "colaborador", nome: state.funcionarios[0]?.nome || "Colaborador", funcionarioCodigo: state.funcionarios[0]?.codigo, codigo: state.funcionarios[0]?.codigo });
  logout(); login("colab-tut", "x");
  try { marcarOnbVisto("colab-tut"); } catch {}
  document.getElementById("acesso")?.remove();
  document.getElementById("onb-overlay")?.remove();
  document.getElementById("termo-overlay")?.remove();
  document.querySelectorAll(".modal-backdrop").forEach((n) => n.remove());
  state.termoAdesaoOk = true; state.termoCanalOk = true;
  delete state._termoAdesaoAceitoAgora; delete state._termoCanalAceitoAgora;

  const f = state.funcionarios[0] || {};
  try { localStorage.setItem("gami-marco-celebrado", JSON.stringify({ [String(new Date().getFullYear())]: 99999 })); } catch {}
  f.cargo = f.cargo || "Operadora de produção"; f.setor = f.setor || "Produção"; f.turno = f.turno || 1;
  f.admissao = f.admissao || "2020-06-01";
  const mes = new Date().getMonth() + 1, dia = new Date().getDate(), ano = new Date().getFullYear();
  const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

  const dias = [
    { dataIso: `${ano}-07-22`, marcacoes: ["07:26","12:00","13:01","16:49"], saldoDiaOriginalFmt: "+08:00", maduro: true },
    { dataIso: `${ano}-07-21`, marcacoes: ["07:31","12:02","13:00","16:52"], saldoDiaOriginalFmt: "+07:45", maduro: true },
    { dataIso: `${ano}-07-20`, marcacoes: ["07:28","12:01","12:59","16:44"], saldoDiaOriginalFmt: "+07:20", maduro: true },
    { dataIso: `${ano}-07-17`, marcacoes: ["07:25","12:00","13:03","16:50"], saldoDiaOriginalFmt: "+07:05", maduro: true },
    { dataIso: `${ano}-07-16`, marcacoes: ["07:33","12:04","13:00","16:48"], saldoDiaOriginalFmt: "+06:40", maduro: true },
  ];
  state.meuSaldoBH = { saldoMin: 480, minutos: 480, minutosOriginal: 480, saldoFormatado: "08:00", saldoOriginalFormatado: "08:00", atualizadoEm: new Date().toISOString(), dias };

  state.gamiConfig = { ativa: true, ano, marcos: [50, 100, 200, 500], tabela: { streak: 5 } };
  state.gamiMeu = { total: 120 }; state.gamiStreakDias = 4;

  state.comunicadosColab = [
    { id: "c1", titulo: "Ajuste no horário do refeitório", corpo: "A partir de segunda-feira, o refeitório passa a funcionar das 11h30 às 13h30.", fixado: true, tipo: "comunicado", publicadoEm: new Date().toISOString(), autorNome: "Gente e Pessoas", minhaLeitura: null },
    { id: "c2", titulo: "Campanha de vacinação da gripe", corpo: "A enfermaria estará aplicando a vacina da gripe nesta quinta e sexta, das 8h às 16h.", fixado: false, tipo: "aviso", publicadoEm: new Date(Date.now() - 2 * 864e5).toISOString(), autorNome: "Gente e Pessoas", minhaLeitura: new Date(Date.now() - 1 * 864e5).toISOString() },
  ];
  state.comunicados = state.comunicadosColab;

  state.aniversariantes = {
    pessoas: [ { nome: "Carla Nunes Ribeiro", dia, mes }, { nome: "Ana Beatriz Costa", dia: (dia % 27) + 1, mes } ],
    tempoCasa: [ { nome: "Roberto Lima", dia, mes, anos: 5 } ],
    recemChegados: [ { nome: "Marcos Vinícius Alves", admissao: new Date(Date.now() - 9 * 864e5).toISOString(), setor: "Produção" } ],
  };
  const cc = state._reacoesCache || (state._reacoesCache = {});
  try { cc[muralPostId("Carla Nunes Ribeiro")] = { reacoes: [], total: 2, minhaReacao: false }; } catch {}
  try { cc[bvPostId("Marcos Vinícius Alves", state.aniversariantes.recemChegados[0].admissao)] = { reacoes: [], total: 1, minhaReacao: false }; } catch {}

  state.pesquisasClimaColab = [
    { id: "pc1", titulo: "Como você está se sentindo no trabalho?", jaRespondi: false, anonima: true, fim: new Date(Date.now() + 6 * 864e5).toISOString(), publicadoEm: new Date(Date.now() - 1 * 864e5).toISOString() },
  ];

  state.vagasInternasColab = [
    { id: "vg1", titulo: "Auxiliar de logística", setor: "Logística", turno: "1º turno", cidade: "Indaial, SC", descricao: "Apoio na separação e conferência de materiais. Boa oportunidade para quem quer conhecer a área." },
    { id: "vg2", titulo: "Assistente de qualidade", setor: "Qualidade", turno: "1º turno", cidade: "Indaial, SC", descricao: "Apoio nas inspeções e nos registros da área de qualidade." },
  ];
  state.meusInteressesInternos = { vg2: { status: "em-analise", em: new Date(Date.now() - 3 * 864e5).toISOString() } };

  state.feriasMinha = {
    resumo: { proporcionalAtual: 17.5, temVencida: false, diasVencidos: 0, deFeriasAgora: true },
    periodos: [
      { situacao: "em gozo", aquisitivoInicio: `${ano - 1}-01-15`, aquisitivoFim: `${ano}-01-14`, direito: 30, gozos: [ { dias: 15, inicio: iso(-4), fim: iso(10) } ] },
      { situacao: "em aquisicao", aquisitivoInicio: `${ano}-01-15`, avos: 7, saldo: 17.5, direito: 30 },
      { situacao: "concluidas", aquisitivoInicio: `${ano - 2}-01-15`, aquisitivoFim: `${ano - 1}-01-14`, direito: 30, gozos: [ { dias: 20, inicio: `${ano - 1}-07-01`, fim: `${ano - 1}-07-20` } ], abonos: [ { dias: 10, inicio: `${ano - 1}-07-21`, fim: `${ano - 1}-07-30`, pagamento: `${ano - 1}-06-30` } ] },
    ],
  };

  state.meusRecibos = [
    { id: "rcb-atual", tipo: "recibo", competencia: `${ano}-06`, paginas: 1 },
    { id: "rcb-05", tipo: "recibo", competencia: `${ano}-05`, paginas: 1, minhaAssinatura: { em: `${ano}-06-05T10:12:00` } },
    { id: "rcb-04", tipo: "recibo", competencia: `${ano}-04`, paginas: 1, minhaAssinatura: { em: `${ano}-05-06T09:40:00` } },
    { id: "cp-atual", tipo: "cartao-ponto", competencia: `${ano}-06`, paginas: 1 },
  ];

  state.ocorrenciasColab = [
    { id: "o1", data: `${ano}-07-18`, tipo: "Atraso", duracao: "00:12", status: "confirmada", origem: "Marcação" },
    { id: "o2", data: `${ano}-07-11`, tipo: "Saída antecipada", duracao: "00:20", status: "confirmada", origem: "Marcação" },
  ];

  state.documentosColabProntos = true;
  state.documentosColab = [
    { id: "d1", titulo: "Código de conduta", tipo: "politica", confirmacao: "aceite", publicadoEm: new Date(Date.now() - 20 * 864e5).toISOString() },
    { id: "d2", titulo: "Política de segurança do trabalho", tipo: "politica", confirmacao: "assinatura", publicadoEm: new Date(Date.now() - 40 * 864e5).toISOString() },
  ];
});

const go = async (pg, extra) => {
  await page.evaluate(({ pg, extra }) => {
    state.view.page = pg; if (extra) Object.assign(state.view, extra); _renderAppNow();
    document.querySelectorAll(".demo-banner").forEach((n) => n.remove());
    document.getElementById("onb-overlay")?.remove();
    window.scrollTo(0, 0);
  }, { pg, extra });
  await wait(320);
};

// ---------- telas do app ----------
await go("colab-home"); await shot("home");
await go("colab-ponto", { pontoTab: "bh" }); await shot("meu-ponto");
await go("colab-folha"); await shot("folha");
await go("colab-ponto", { pontoTab: "ferias" }); await shot("ferias");
await go("colab-notificacoes"); await shot("notificacoes");
await go("colab-oportunidades"); await shot("vagas");

// ---------- onboarding NOVO (card 0: anel + selo de estreia + hero) ----------
await page.evaluate(() => { document.getElementById("onb-overlay")?.remove(); if (typeof mostrarOnboarding === "function") mostrarOnboarding(); });
await wait(500);
await shot("onb-novo");
await page.evaluate(() => document.getElementById("onb-overlay")?.remove());

console.log("\n=== pageerrors (" + errors.length + ") ===");
console.log(errors.length ? [...new Set(errors)].join("\n") : "nenhum");
await browser.close();
process.exit(0);
