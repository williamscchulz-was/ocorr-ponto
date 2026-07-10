import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
const FALHAS = [];
const ok = (nome, cond) => { if (cond) console.log("  ok:", nome); else { console.log("  FALHA:", nome); FALHAS.push(nome); } };

await p.goto("http://localhost:8080/public/index.html", { waitUntil: "networkidle" });
await p.evaluate(() => { _changelogChecado = true; }); // sem pop-up de Novidades nos prints

// ---------- GESTOR (admin demo) ----------
await p.evaluate(() => { const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
await p.waitForFunction(() => state?.currentUserId, null, { timeout: 8000 });
await p.waitForTimeout(400);
await p.evaluate(() => { document.querySelector(".modal-backdrop button[aria-label], .modal-backdrop .x, .modal-backdrop button")?.click(); });
// Stub da camada de dados (demo nao tem firebase) + 1 ciclo ativo e 1 rascunho.
await p.evaluate(() => {
  window.__chamadas = [];
  const fid0 = state.funcionarios[0].id;
  const ciclo = { id: "cx1", nome: "Ciclo teste 2026", modalidade: "auto", escalaMax: 5, status: "ativo",
    competencias: [{ id: "c1", nome: "Qualidade", peso: 2 }, { id: "c2", nome: "Equipe", peso: 1 }],
    publico: { tipo: "todos", valores: [] }, periodoInicio: { seconds: 1751328000 }, periodoFim: { seconds: 1767139200 } };
  const rasc = { ...ciclo, id: "cx2", nome: "Rascunho teste", status: "rascunho" };
  window.carregarCiclosDesempenhoGestor = async () => (state.ciclosDesempenho = [ciclo, rasc]);
  window.carregarAvaliacoesCicloGP = async () => [{ alvoFid: fid0, avaliadorUid: "u1", papel: "gestor", notas: { c1: 4, c2: 5 }, status: "concluida" }];
  window.carregarAvaliacaoDoAlvo = async () => null;
  window.salvarAvaliacaoDesempenho = async (...a) => { window.__chamadas.push(["salvar", ...a.slice(0, 4)]); return "id"; };
  window.criarCicloDesempenho = async (cfg) => { window.__chamadas.push(["criar", cfg]); return "novoid"; };
  window.editarCicloDesempenho = async () => {};
  window.ativarCicloDesempenho = async (id) => { window.__chamadas.push(["ativar", id]); };
  window.encerrarCicloDesempenho = async () => {};
  state.view.page = "avaliacoes"; state.view.avalTab = "desempenho"; state.view.dsmpScreen = "lista";
  (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
});
await p.waitForTimeout(700);
console.log("== GESTOR: lista ==");
let r = await p.evaluate(() => ({
  cards: document.querySelectorAll("[data-dsmp-card]").length,
  temNovo: !!document.querySelector("[data-dsmp-novo]"),
}));
ok("2 cards de ciclo", r.cards === 2);
ok("botao novo ciclo (gp)", r.temNovo);

// Detalhe do ciclo ativo
await p.evaluate(() => document.querySelector('[data-dsmp-card="cx1"]').click());
await p.waitForTimeout(700);
console.log("== GESTOR: detalhe ==");
r = await p.evaluate(() => ({
  alvos: document.querySelectorAll("[data-dsmp-alvo]").length,
  badgeConcluida: !!document.querySelector(".badge--success"),
  temEncerrar: !!document.querySelector("[data-dsmp-encerrar]"),
}));
ok("lista de alvos > 0", r.alvos > 0);
ok("badge concluida (do stub)", r.badgeConcluida);
ok("acao encerrar (gp)", r.temEncerrar);

// Form de avaliar: abre um alvo SEM avaliacao concluida (a do stub e do fid0), da notas, salva rascunho
await p.evaluate(() => {
  const alvos = [...document.querySelectorAll("[data-dsmp-alvo]")];
  (alvos[1] || alvos[0]).click();
});
await p.waitForTimeout(500);
console.log("== GESTOR: avaliar ==");
r = await p.evaluate(() => ({ chips: document.querySelectorAll(".dsmp-chip").length, temSalvar: !!document.querySelector("[data-dsmp-av-salvar]") }));
ok("chips de nota (2 comps x 5)", r.chips === 10);
ok("botao salvar rascunho", r.temSalvar);
await p.evaluate(() => {
  document.querySelector('.dsmp-chip[data-comp="c1"][data-v="4"]').click();
  document.querySelector('.dsmp-chip[data-comp="c2"][data-v="3"]').click();
  document.getElementById("dsmp-feedback").value = "Bom periodo.";
  document.querySelector("[data-dsmp-av-salvar]").click();
});
await p.waitForTimeout(600);
r = await p.evaluate(() => window.__chamadas.find((c) => c[0] === "salvar"));
ok("salvou rascunho com notas certas", !!r && r[2] === "gestor" && r[4].notas.c1 === 4 && r[4].notas.c2 === 3 && r[4].feedbackGeral === "Bom periodo.");

// Construtor
await p.evaluate(() => { state.view.dsmpScreen = "lista"; state.view.dsmpId = null; (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)(); });
await p.waitForTimeout(400);
await p.evaluate(() => document.querySelector("[data-dsmp-novo]").click());
await p.waitForTimeout(500);
console.log("== GESTOR: construtor ==");
r = await p.evaluate(() => ({
  nome: !!document.getElementById("dsmp-nome"),
  comps: document.querySelectorAll(".dsmp-comp").length,
  mod: document.querySelectorAll("#dsmp-mod .anon-opt").length,
  seg: document.querySelectorAll("#dsmp-seg .com-seg__chip").length,
}));
ok("campo nome", r.nome);
ok("competencias do modelo (5)", r.comps === 5);
ok("2 modalidades", r.mod === 2);
ok("3 chips de publico", r.seg === 3);
const dbg = await p.evaluate(() => ({ user: state.currentUserId, page: state.view.page, dscreen: state.view.dsmpScreen,
  acessoVisivel: !!document.querySelector("#acesso") && !document.querySelector("#acesso").classList.contains("hidden"),
  viewTem: (document.querySelector("#view")?.textContent || "").slice(0, 60) }));
void dbg;
await p.evaluate(() => { document.querySelector("#acesso")?.classList.add("hidden"); document.querySelector("#login")?.classList.add("hidden"); }); // overlay demo por cima, so artefato de print
await p.screenshot({ path: "scratchpad/audit/out/dsmp-construtor.png" });

// ---------- COLAB ----------
console.log("== COLAB ==");
// O demo nao tem user colaborador no login rapido: injeta um ligado ao 1o funcionario.
await p.evaluate(() => {
  const f0 = state.funcionarios[0];
  state.users.push({ id: "colabx", senha: "x", role: "colaborador", nome: f0.nome, funcionarioId: f0.id });
});
const temColab = true;
if (!temColab) { console.log("  (demo sem user colaborador, pulo o colab)"); }
else {
  await p.evaluate(() => { login("colabx", "x"); });
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelector(".modal-backdrop button[aria-label], .modal-backdrop .x, .modal-backdrop button")?.click(); });
  await p.evaluate(() => { const f0 = state.funcionarios.find((f) => f.id === currentUser().funcionarioId); if (f0) state.funcionarios = [f0]; });
  await p.evaluate(() => {
    window.salvarAvaliacaoDesempenho = async (...a) => { window.__chamadasColab = [...a.slice(0, 4)]; return "id"; };
    state.ciclosDesempenhoColab = [{ id: "cx1", nome: "Ciclo teste 2026", modalidade: "auto", escalaMax: 5, status: "ativo",
      competencias: [{ id: "c1", nome: "Qualidade", peso: 2 }, { id: "c2", nome: "Equipe", peso: 1 }],
      publico: { tipo: "todos", valores: [] }, minhaAuto: null }];
    (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
  });
  await p.waitForTimeout(600);
  let c = await p.evaluate(() => ({ convite: !!document.querySelector("[data-dsmp-resp]") }));
  ok("convite de autoavaliacao na home", c.convite);
  await p.evaluate(() => document.querySelector("[data-dsmp-resp]").click());
  await p.waitForTimeout(600);
  c = await p.evaluate(() => ({ chips: document.querySelectorAll("#view .dsmp-chip").length, concluir: !!document.getElementById("dsmp-auto-concluir") }));
  ok("form auto com chips", c.chips === 10);
  ok("botao concluir", c.concluir);
  await p.evaluate(() => {
    document.querySelector('#view .dsmp-chip[data-comp="c1"][data-v="5"]').click();
    document.querySelector('#view .dsmp-chip[data-comp="c2"][data-v="4"]').click();
    document.getElementById("dsmp-auto-concluir").click();
  });
  await p.waitForTimeout(700);
  c = await p.evaluate(() => ({ ch: window.__chamadasColab, page: state.view.page }));
  ok("concluiu auto com notas certas", !!c.ch && c.ch[1] === "auto" && c.ch[3].notas.c1 === 5 && c.ch[3].notas.c2 === 4);
  ok("voltou pra home apos concluir", c.page === "colab-home");
  // Resultado (ciclo encerrado)
  await p.evaluate(() => {
    state.ciclosDesempenhoColab = [{ id: "cx9", nome: "Ciclo encerrado", modalidade: "auto", escalaMax: 5, status: "encerrado",
      competencias: [{ id: "c1", nome: "Qualidade", peso: 2 }, { id: "c2", nome: "Equipe", peso: 1 }],
      meuResultado: { notas: { c1: 4, c2: 3 }, status: "concluida", feedbackGeral: "Evoluiu bem no semestre." },
      minhaAuto: { notas: { c1: 5, c2: 3 }, status: "concluida" } }];
    state.view.dsmpColabId = "cx9"; state.view.page = "colab-desempenho-res";
    (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
  });
  await p.waitForTimeout(500);
  c = await p.evaluate(() => ({
    barras: document.querySelectorAll(".dsmp-bar").length,
    autoTx: document.querySelectorAll(".dsmp-auto-tx").length,
    feedback: (document.body.textContent || "").includes("Evoluiu bem no semestre"),
    nota: (document.querySelector(".resp-intro h2")?.textContent || ""),
  }));
  ok("barras por competencia", c.barras === 2);
  ok("comparativo com a auto", c.autoTx === 2);
  ok("feedback do gestor visivel", c.feedback);
  ok("nota ponderada no titulo (3,7)", c.nota.includes("3,7"));
  await p.evaluate(() => { document.querySelector("#acesso")?.classList.add("hidden"); document.querySelector("#login")?.classList.add("hidden"); });
  await p.screenshot({ path: "scratchpad/audit/out/dsmp-resultado.png" });
}
console.log("erros de pagina:", erros.length ? erros.slice(0, 5) : "nenhum");
console.log(FALHAS.length ? "RESULTADO: " + FALHAS.length + " falha(s)" : "RESULTADO: TUDO OK");
await b.close();
process.exit(FALHAS.length || erros.length ? 1 : 0);
