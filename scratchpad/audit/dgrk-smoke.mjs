import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1360, height: 950 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });
await p.waitForFunction(() => typeof state !== "undefined" && typeof login === "function", null, { timeout: 10000 });
await p.evaluate(() => { _changelogChecado = true; const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
await p.waitForFunction(() => state?.currentUserId, null, { timeout: 8000 });
// dados demo podem nao ter idade/escolaridade/naturalidade: injeta pra exercitar tudo
await p.evaluate(() => {
  const CIDADES = ["Brusque", "Guabiruba", "Botuvera", "Blumenau"];
  const ESC = ["Ensino médio completo", "Fundamental completo", "Superior completo"];
  state.funcionarios.forEach((f, i) => {
    f.idade = 22 + (i % 30); f.grauInstrucao = ESC[i % 3]; f.naturalidade = CIDADES[i % 4];
    f.diasNaEmpresa = 200 + i * 173; f.sexo = i % 2 ? "Feminino" : "Masculino";
  });
  state.view.page = "visao-geral";
  (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
});
await p.waitForTimeout(800);
const r = await p.evaluate(() => {
  const cards = [...document.querySelectorAll(".vg-grid")].map((g) => [...g.children].map((c) => Math.round(c.getBoundingClientRect().width)));
  const dg = document.querySelector(".dg-body");
  return {
    heroes: document.querySelectorAll(".dg-box__hero").length,
    barras: document.querySelectorAll(".dg-barra span").length,
    sexbar: !!document.querySelector(".dg-sexbar"),
    chips: document.querySelectorAll(".rk2__pos").length,
    top3: document.querySelectorAll(".rk2--top").length,
    largurasIguais: cards.every((par) => par.length !== 2 || Math.abs(par[0] - par[1]) <= 1),
    temDg: !!dg,
  };
});
console.log(JSON.stringify(r));
// print da regiao dos 2 cards
const el = await p.locator(".dg-body").first().boundingBox();
if (el) await p.evaluate(() => document.querySelector(".dg-body").closest(".vg-grid").scrollIntoView());
await p.waitForTimeout(200);
const grid = await p.locator(".dg-body").first().locator("xpath=ancestor::div[contains(@class,'vg-grid')]").boundingBox();
if (grid) await p.screenshot({ path: "scratchpad/audit/out/dgrk.png", clip: { x: Math.max(0, grid.x - 8), y: Math.max(0, grid.y - 8), width: Math.min(1360, grid.width + 16), height: Math.min(940, grid.height + 16) } });
console.log("erros:", erros.length ? erros.slice(0, 3) : "nenhum");
await b.close();
