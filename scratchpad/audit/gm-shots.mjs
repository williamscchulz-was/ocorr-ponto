import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1100 } });
const erros = [];
p.on("pageerror", (e) => erros.push(e.message));
await p.goto("http://localhost:8081/docs/mockups/gamificacao-mock-2026-07.html", { waitUntil: "networkidle" });
for (const t of ["fluxo", "chome", "cpts", "cqst", "gcfg", "gfila"]) {
  await p.click(`[data-t="${t}"]`);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `scratchpad/audit/out/gm-${t}.png`, fullPage: t === "fluxo" || t === "cpts" || t === "cqst" });
}
console.log("erros:", erros.length ? erros : "nenhum");
await b.close();
