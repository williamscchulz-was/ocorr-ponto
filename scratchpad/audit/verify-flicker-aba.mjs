setTimeout(() => { console.log("HARD-TIMEOUT"); process.exit(9); }, 90000);
const H = await import("./harness.mjs");
await H.iniciarServidor();
const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedGestor(page);
await page.waitForTimeout(500);
// troca de aba (Funcionarios) e amostra a opacidade do .page-header nos primeiros frames
const amostra = await page.evaluate(async () => {
  const it = [...document.querySelectorAll(".nav__item")].find(n => /Funcion/i.test(n.textContent));
  it.click();
  const ops = [];
  for (let i = 0; i < 8; i++) {
    await new Promise(r => requestAnimationFrame(r));
    const h = document.querySelector("#view .page-header");
    ops.push(h ? Number(getComputedStyle(h).opacity).toFixed(2) : "n/a");
  }
  return ops;
});
console.log("opacidade .page-header nos 8 primeiros frames pos-troca:", JSON.stringify(amostra));
await browser.close(); process.exit(0);
