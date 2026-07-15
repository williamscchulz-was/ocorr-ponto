// Verificacao da micro-linha de sequencia no card de pontos da home do colaborador
// (ideia A do mock docs/mockups/streak-home-2026-07.html, aprovada por William 2026-07-15).
// state.gamiStreakDias e a MESMA fonte do task 93 (gamiPingStreak em firebase.js), so
// cacheada em state pro card nascer preenchido (mesmo padrao de state.gamiMeu.total).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "C:/projetos/ocorr-ponto/scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const erros = [];
const FALHAS = [];
const ok = (nome, cond) => { if (cond) console.log("  ok:", nome); else { console.log("  FALHA:", nome); FALHAS.push(nome); } };

const CFG = (streakPts) => ({
  ano: String(new Date().getFullYear()), ativa: true, marcos: [25, 50, 100, 150, 200],
  tabela: { "cartao-ponto": 1, folha: 1, comunicado: 1, pesquisa: 5, streak: streakPts },
});

const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });
await p.evaluate(() => { _changelogChecado = true; });
await p.evaluate(() => {
  const f = state.funcionarios.find((x) => x.status !== "inativo") || state.funcionarios[0];
  state.users.push({ id: "colab-streak-demo", nome: f.nome, role: "colaborador", funcionarioId: f.id, senha: "x" });
  login("colab-streak-demo", "x");
});
await p.waitForFunction(() => state?.currentUserId, null, { timeout: 8000 });
await p.waitForTimeout(400);
await p.evaluate(() => { document.querySelector(".modal-backdrop button")?.click(); });

async function render(cfgTabelaStreak, dias) {
  await p.evaluate((args) => {
    state.gamiConfig = args.cfg;
    state.gamiMeu = { total: 16, nome: state.users.find((u) => u.id === "colab-streak-demo").nome };
    state.gamiStreakDias = args.dias;
    state.view.page = "colab-home";
    (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
  }, { cfg: CFG(cfgTabelaStreak), dias });
  await p.waitForTimeout(150);
  return p.evaluate(() => {
    const strk = document.querySelector("#view .gm-strk");
    return {
      presente: !!strk,
      cheia: strk ? strk.classList.contains("gm-strk--full") : null,
      dotsOn: strk ? strk.querySelectorAll(".gm-strk__dots i.on").length : 0,
      dotsTotal: strk ? strk.querySelectorAll(".gm-strk__dots i").length : 0,
      legenda: strk ? strk.querySelector(".gm-strk__lbl")?.textContent.trim() : null,
    };
  });
}

console.log("== (a) streak 3/5, dots no meio ==");
let r = await render(1, 3);
ok("linha presente", r.presente);
ok("3 pontinhos acesos de 5", r.dotsOn === 3 && r.dotsTotal === 5);
ok("legenda 3/5 dias seguidos", r.legenda === "3/5 dias seguidos");
ok("NAO dourada (meio da sequencia)", r.cheia === false);

console.log("== (b) streak 5/5, dourado ==");
r = await render(1, 5);
ok("linha presente", r.presente);
ok("5 pontinhos acesos", r.dotsOn === 5 && r.dotsTotal === 5);
ok("legenda 5/5 dias seguidos", r.legenda === "5/5 dias seguidos");
ok("classe gm-strk--full (dourado)", r.cheia === true);

console.log("== (b2) ciclo continua: streak 8 dias = posicao 3/5 do ciclo novo ==");
r = await render(1, 8);
ok("linha presente", r.presente);
ok("3 pontinhos acesos (ciclo 6,7,8 -> pos 1,2,3)", r.dotsOn === 3);
ok("legenda 3/5 dias seguidos", r.legenda === "3/5 dias seguidos");

console.log("== (b3) ciclo continua: streak 10 dias = ciclo cheio de novo ==");
r = await render(1, 10);
ok("dourado de novo no 2o ciclo (10 = multiplo de 5)", r.cheia === true && r.dotsOn === 5);

console.log("== (c) streak 0 e 1: linha ausente (nao polui) ==");
r = await render(1, 0);
ok("streak 0 = ausente", r.presente === false);
r = await render(1, 1);
ok("streak 1 = ausente (recem comecou / logo apos premio)", r.presente === false);

console.log("== (d) config tabela.streak = 0: linha ausente mesmo com sequencia valendo ==");
r = await render(0, 3);
ok("tabela.streak=0 = ausente", r.presente === false);

console.log("== (e) re-render duplo identico (sem mudanca de state) ==");
const dup = await p.evaluate(() => {
  state.gamiConfig = { ano: String(new Date().getFullYear()), ativa: true, marcos: [25, 50, 100, 150, 200], tabela: { streak: 1 } };
  state.gamiMeu = { total: 16 };
  state.gamiStreakDias = 3;
  state.view.page = "colab-home";
  (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
  const view = document.querySelector("#view");
  const no0 = view.firstElementChild;
  const html0 = view.innerHTML;
  (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
  return { mesmoNo: view.firstElementChild === no0, htmlIgual: view.innerHTML === html0 };
});
ok("re-render sem mudanca de state = mesmo no (DOM identico)", dup.mesmoNo);
ok("html identico byte a byte", dup.htmlIgual);

console.log("== screenshots claro + escuro ==");
await render(1, 5);
await p.evaluate(() => document.documentElement.classList.remove("cp-dark"));
await p.waitForTimeout(150);
await p.locator(".gm-mid").screenshot({ path: `${OUT}/streak-app-claro.png` });
await p.evaluate(() => document.documentElement.classList.add("cp-dark"));
await p.waitForTimeout(150);
await p.locator(".gm-mid").screenshot({ path: `${OUT}/streak-app-escuro.png` });
console.log("  screenshots salvos em", OUT);

console.log("\nerros de pagina:", erros.length ? erros : "nenhum");
ok("zero pageerror", erros.length === 0);
console.log(FALHAS.length ? `\nFALHAS: ${FALHAS.length}\n- ${FALHAS.join("\n- ")}` : "\nTUDO OK");
await b.close();
process.exit(FALHAS.length ? 1 : 0);
