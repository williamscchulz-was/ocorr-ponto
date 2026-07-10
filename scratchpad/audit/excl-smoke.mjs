import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));
await p.goto("http://localhost:8080/public/index.html", { waitUntil: "networkidle" });
await p.evaluate(() => { _changelogChecado = true; const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
await p.waitForFunction(() => state?.currentUserId, null, { timeout: 8000 });
await p.evaluate(() => {
  const o0 = state.ocorrencias[0];
  state.ocorrenciasExcluidas = [{ ...o0, id: "occ-excl-1", excluida: true, excluidaEm: "2026-07-09T12:00:00", excluidaPor: "admin" }];
  window.restaurarOcorrencia = async (id) => { window.__restaurou = id; };
  state.view.page = "dashboard"; state.view.filterTab = "excluidas";
  (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
});
await p.waitForTimeout(700);
const r = await p.evaluate(() => ({
  abaExcluidas: !!document.querySelector('[data-tab="excluidas"]'),
  contagem: document.querySelector('[data-tab="excluidas"] .tab__count')?.textContent,
  cards: document.querySelectorAll("#occ-list .occ").length,
  seloExcluida: (document.querySelector("#occ-list .occ .occ__status")?.textContent || "").includes("Excluída"),
}));
console.log(JSON.stringify(r));
await p.evaluate(() => document.querySelector("#occ-list .occ").click());
await p.waitForTimeout(500);
const m = await p.evaluate(() => ({
  banner: (document.querySelector(".modal-colab-banner")?.textContent || "").includes("excluída"),
  temRestaurar: !!document.getElementById("btn-restaurar-occ"),
  semExcluirBtn: !document.getElementById("btn-del-occ"),
  semLancarBtn: !document.getElementById("btn-lancar"),
}));
console.log(JSON.stringify(m));
await p.evaluate(() => document.getElementById("btn-restaurar-occ").click());
await p.waitForTimeout(300);
console.log("restaurou chamado:", await p.evaluate(() => window.__restaurou));
console.log("erros:", erros.length ? erros.slice(0, 3) : "nenhum");
await b.close();
