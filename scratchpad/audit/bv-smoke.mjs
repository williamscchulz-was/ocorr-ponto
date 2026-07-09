import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
const p = await ctx.newPage();
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const erros = [];
p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
await p.goto("http://localhost:8080/public/index.html", { waitUntil: "networkidle" });
await p.evaluate(() => {
  const u = (state?.users || []).find((x) => x.role === "admin") || (state?.users || [])[0];
  login(u.id, u.senha);
});
await p.waitForFunction(() => state?.currentUserId, null, { timeout: 8000 });
await p.waitForTimeout(1000); // rAF + preenchimentos
const r = await p.evaluate(() => ({
  user: state.currentUserId,
  page: state.view?.page,
  temCard: !!document.querySelector("[data-bv-post]"),
  hands: document.querySelectorAll("[data-bv-hand]").length,
  posts: [...document.querySelectorAll("[data-bv-post]")].map(e => e.getAttribute("data-bv-post")),
  counts: [...document.querySelectorAll("[data-bv-count]")].map(e => e.textContent),
}));
console.log(JSON.stringify(r, null, 2));
if (r.hands > 0) {
  await p.evaluate(() => document.querySelector("[data-bv-hand]").click());
  await p.waitForTimeout(120); // otimista ligou (demo sem firebase, ainda nao reverteu)
  const otim = await p.evaluate(() => ({ on: document.querySelector("[data-bv-hand]").classList.contains("on"), txt: document.querySelector("[data-bv-count]").textContent }));
  console.log("otimista imediato:", JSON.stringify(otim));
  await p.waitForTimeout(600); // demo: toggle inexistente -> catch -> reverte + toast
  const fim = await p.evaluate(() => ({ on: document.querySelector("[data-bv-hand]").classList.contains("on"), txt: document.querySelector("[data-bv-count]").textContent, toast: !!document.querySelector("#toast-root .toast, .toast") }));
  console.log("apos catch (esperado reverter):", JSON.stringify(fim));
  await p.screenshot({ path: "scratchpad/audit/out/bv-card.png", clip: { x: 300, y: 0, width: 980, height: 800 } });
}
console.log("erros:", erros.length ? erros.slice(0, 5) : "nenhum");
await b.close();
