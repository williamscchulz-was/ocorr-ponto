import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
await p.goto("http://localhost:8080/public/index.html", { waitUntil: "networkidle" });
await p.evaluate(() => { const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
await p.waitForFunction(() => state?.currentUserId, null, { timeout: 8000 });
// injeta 2 recem-chegados no demo (10 e 40 dias) e re-renderiza
await p.evaluate(() => {
  const f = state.funcionarios[0], g = state.funcionarios[1];
  f.admissao = new Date(Date.now() - 10 * 864e5).toISOString(); f.ativo = true;
  g.admissao = new Date(Date.now() - 40 * 864e5).toISOString(); g.ativo = true;
  (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
});
await p.waitForTimeout(800);
const r = await p.evaluate(() => ({
  hands: document.querySelectorAll("[data-bv-hand]").length,
  posts: [...document.querySelectorAll("[data-bv-post]")].map(e => e.getAttribute("data-bv-post")),
  counts: [...document.querySelectorAll("[data-bv-count]")].map(e => e.textContent),
}));
console.log(JSON.stringify(r, null, 2));
if (r.hands > 0) {
  await p.evaluate(() => document.querySelector("[data-bv-hand]").click());
  await p.waitForTimeout(100);
  console.log("otimista:", JSON.stringify(await p.evaluate(() => ({ on: document.querySelector("[data-bv-hand]").classList.contains("on"), txt: document.querySelector("[data-bv-count]").textContent }))));
  await p.waitForTimeout(700);
  console.log("apos catch (demo sem firebase, deve reverter):", JSON.stringify(await p.evaluate(() => ({ on: document.querySelector("[data-bv-hand]").classList.contains("on"), txt: document.querySelector("[data-bv-count]").textContent }))));
  
  await p.locator("[data-bv-post]").first().scrollIntoViewIfNeeded(); await p.screenshot({ path: "scratchpad/audit/out/bv-card.png" });
}
console.log("erros:", erros.length ? erros.slice(0, 5) : "nenhum");
await b.close();
