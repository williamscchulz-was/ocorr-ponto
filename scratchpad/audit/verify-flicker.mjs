setTimeout(() => { console.log("HARD-TIMEOUT"); process.exit(9); }, 90000);
const H = await import("./harness.mjs");
await H.iniciarServidor();
const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedGestor(page);
await page.waitForTimeout(500);

// 1) COALESCE: rajada de 5 renderApp() -> quantas vezes o <h1> e reconstruido?
const coalesce = await page.evaluate(async () => {
  const view = document.querySelector("#view");
  let rebuilds = 0, last = document.querySelector("#view h1");
  const obs = new MutationObserver(() => {
    const h1 = document.querySelector("#view h1");
    if (h1 && h1 !== last) { rebuilds++; last = h1; }
  });
  obs.observe(view, { childList: true, subtree: true });
  for (let i = 0; i < 5; i++) renderApp();          // rajada (antes: 5 rebuilds)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 60));
  obs.disconnect();
  return { rebuildsAposRajadaDe5: rebuilds, h1: document.querySelector("#view h1")?.textContent?.slice(0, 30) };
});
console.log("COALESCE:", JSON.stringify(coalesce));

// 2) NAVEGACAO ainda renderiza
await page.evaluate(() => { const it=[...document.querySelectorAll(".nav__item")].find(n=>/Funcion/i.test(n.textContent)); it && it.click(); });
await page.waitForTimeout(250);
const nav = await page.evaluate(() => document.querySelector("#topbar-title")?.textContent);
console.log("NAV apos click Funcionarios:", nav);

// 3) MODAL abre
await page.evaluate(() => { try { openProfileModal(); } catch {} });
await page.waitForTimeout(250);
const modal = await page.evaluate(() => !!document.querySelector(".modal") && document.querySelector(".modal h2")?.textContent);
console.log("MODAL:", modal);

console.log("erros:", (await H.coletarErrosReais(page)).length);
await browser.close(); process.exit(0);
