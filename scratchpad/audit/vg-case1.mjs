import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 500 } });
await p.goto("http://localhost:8080/scratchpad/vg-case1-verify.html", { waitUntil: "networkidle" });
const m = await p.evaluate(() => {
  const cards = [...document.querySelectorAll(".vg-grid > .vg-card")];
  const grid = document.querySelector(".dashboard-demografia__grid");
  const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  const rankRows = document.querySelectorAll(".dashboard-ranking .rk").length;
  const rankCols = getComputedStyle(document.querySelector(".dashboard-ranking")).gridTemplateColumns;
  return {
    alturas: cards.map(c => Math.round(c.getBoundingClientRect().height)),
    demografiaColunas: cols,
    rankingLinhas: rankRows,
    rankingDisplay: getComputedStyle(document.querySelector(".dashboard-ranking")).display,
    // ha algum <details> ou <summary> sobrando na visao?
    detailsSobrando: document.querySelectorAll("details.vg-exp, .vg-grid summary").length,
  };
});
console.log(JSON.stringify(m, null, 2));
console.log("alturas iguais?", m.alturas.every(a => Math.abs(a - m.alturas[0]) <= 1) ? "SIM ("+m.alturas[0]+"px)" : "NAO "+m.alturas.join(" vs "));
await p.screenshot({ path: "scratchpad/audit/out/vg-case1.png" });
await b.close();
