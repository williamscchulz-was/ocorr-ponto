import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));
const FALHAS = [];
const ok = (n, c) => { if (c) console.log("  ok:", n); else { console.log("  FALHA:", n); FALHAS.push(n); } };

await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });
await p.waitForFunction(() => typeof state !== "undefined" && typeof login === "function", null, { timeout: 10000 });
await p.evaluate(() => { _changelogChecado = true; const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
await p.waitForFunction(() => state?.currentUserId, null, { timeout: 8000 });
await p.evaluate(() => {
  // injeta 1 card rotaBH em rh_confere + 1 rh_confere normal (controle)
  state.ocorrenciasAuto = [
    { id: "bh1", nome: "Ivan Carlos Machado", tipo: "Atrasos", status: "rh_confere", turno: "geral",
      rotaBH: true, acaoSugerida: "banco-horas-geral", data: "09/07/2026", dataIso: "2026-07-09",
      setor: "Administrativo", historico: [], marcacoes: "", horarioRelevante: "08:12" },
    { id: "n1", nome: "Fulano Normal", tipo: "Atrasos", status: "rh_confere", turno: 1,
      data: "09/07/2026", dataIso: "2026-07-09", setor: "Producao", historico: [], marcacoes: "", horarioRelevante: "06:10" },
  ];
  window.__conf = null;
  window.confirmarOcorrenciaAuto = async (id, extras) => { window.__conf = { id, extras }; };
  state.view.page = "dashboard"; state.view.filterTab = "rh-confere";
  (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
});
await p.waitForTimeout(700);
console.log("== card rotaBH ==");
let r = await p.evaluate(() => {
  const card = document.querySelector('[data-oca-id="bh1"]');
  const normal = document.querySelector('[data-oca-id="n1"]');
  return {
    badge: (card?.textContent || "").includes("Resolvido no Banco de Horas"),
    umBotao: card?.querySelectorAll(".rhacts button").length,
    semDispensar: !card?.querySelector("[data-oca-dispensar]"),
    btnConferir: !!card?.querySelector("[data-oca-confirmar]"),
    normalDoisBotoes: normal?.querySelectorAll(".rhacts button").length,
    normalSemBadge: !(normal?.textContent || "").includes("Resolvido no Banco"),
  };
});
ok("badge Resolvido no Banco de Horas", r.badge);
ok("2 botoes (Conferir + Dispensar)", r.umBotao === 2 && !r.semDispensar && r.btnConferir);
ok("card normal intacto (2 botoes, sem badge)", r.normalDoisBotoes === 2 && r.normalSemBadge);

console.log("== modal direto da GP ==");
await p.evaluate(() => document.querySelector('[data-oca-id="bh1"] [data-oca-confirmar]').click());
await p.waitForTimeout(500);
r = await p.evaluate(() => ({
  abriu: !!document.getElementById("oca-acao"),
  preSel: document.getElementById("oca-acao")?.value,
  etapa: (document.querySelector("#modal-root .modal__header p")?.textContent || ""),
  hint: (document.querySelector("#modal-root .field__hint")?.textContent || "").includes("regra do Turno Geral"),
}));
ok("modal de Acao abriu DIRETO de rh_confere", r.abriu);
ok("acao pre-selecionada banco-horas-geral", r.preSel === "banco-horas-geral");
ok("subtitulo da etapa (conferencia da GP)", r.etapa.includes("conferência da GP"));
ok("hint explica o roteamento", r.hint);

console.log("== confirmar ==");
await p.evaluate(() => { document.getElementById("oca-obs").value = "Corrigido no WK."; document.getElementById("oca-confirmar-btn").click(); });
await p.waitForTimeout(600);
r = await p.evaluate(() => window.__conf);
ok("confirmou com acaoId banco-horas-geral + obs", !!r && r.id === "bh1" && r.extras.acaoId === "banco-horas-geral" && r.extras.acaoLabel === "Banco de Horas Geral" && r.extras.observacao === "Corrigido no WK.");

console.log("== dispensar rotaBH ==");
await p.evaluate(() => { closeModal?.(); document.querySelector('[data-oca-id="bh1"] [data-oca-dispensar]').click(); });
await p.waitForTimeout(400);
r = await p.evaluate(() => ({
  abriu: !!document.getElementById("oca-disp-motivo"),
  ph: document.getElementById("oca-disp-motivo")?.placeholder || "",
}));
ok("modal de dispensa abre no rotaBH", r.abriu);
ok("placeholder contextual (sem falar de lider)", r.ph.includes("nenhuma") && !r.ph.includes("líder"));
console.log("erros:", erros.length ? erros.slice(0, 3) : "nenhum");
console.log(FALHAS.length ? "RESULTADO: " + FALHAS.length + " falha(s)" : "RESULTADO: TUDO OK");
await b.close();
process.exit(FALHAS.length || erros.length ? 1 : 0);
