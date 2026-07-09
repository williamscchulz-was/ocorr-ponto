import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 420 } });
await p.goto("http://localhost:8080/scratchpad/vg-pair-verify.html", { waitUntil: "networkidle" });
const m = await p.evaluate(() => {
  const cards = [...document.querySelectorAll(".vg-grid > .vg-card")];
  const info = cards.map((c) => {
    const body = c.querySelector(".vg-card__body");
    const cr = c.getBoundingClientRect(), br = body.getBoundingClientRect();
    return {
      titulo: c.querySelector(".vg-h span")?.textContent,
      altura: Math.round(cr.height),
      folgaAcimaDoBody: Math.round(br.top - cr.top),       // espaco do topo do card ate o body
      folgaAbaixoDoBody: Math.round((cr.bottom) - br.bottom), // espaco do body ate o fim do card
    };
  });
  return info;
});
console.log(JSON.stringify(m, null, 2));
const alturas = m.map(x => x.altura);
console.log("alturas iguais?", alturas.every(a => Math.abs(a - alturas[0]) <= 1) ? "SIM ("+alturas[0]+"px)" : "NAO "+alturas.join(" vs "));
await p.screenshot({ path: "scratchpad/audit/out/vg-pair.png" });
console.log("screenshot: scratchpad/audit/out/vg-pair.png");
await b.close();
