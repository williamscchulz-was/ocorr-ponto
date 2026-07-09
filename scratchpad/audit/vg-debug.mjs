import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 820, height: 420 } });
await p.goto("http://localhost:8080/scratchpad/vg-pair-verify.html", { waitUntil: "networkidle" });
const d = await p.evaluate(() => {
  const grid = document.querySelector(".vg-grid");
  const card0 = document.querySelectorAll(".vg-grid > .vg-card")[0];
  const gs = getComputedStyle(grid), cs = getComputedStyle(card0);
  return {
    grid_display: gs.display,
    grid_alignItems: gs.alignItems,
    grid_gridTemplateColumns: gs.gridTemplateColumns,
    card0_alignSelf: cs.alignSelf,
    card0_height: cs.height,
    card0_display: cs.display,
    // a regra .vg-grid > .vg-card existe no CSS servido?
    regraFlex: [...document.styleSheets].flatMap(s => { try { return [...s.cssRules] } catch { return [] } })
      .filter(r => r.selectorText && r.selectorText.includes("vg-card__body") || (r.selectorText||"").includes(".vg-grid > .vg-card")).map(r => r.cssText),
  };
});
console.log(JSON.stringify(d, null, 2));
await b.close();
