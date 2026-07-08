setTimeout(() => { console.log("HARD-TIMEOUT"); process.exit(9); }, 90000);
const H = await import("./harness.mjs");
await H.iniciarServidor();
const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedGestor(page);
await page.addStyleTag({ content: "#toast-root{display:none!important}" });
// Documentos: navega e checa stats
await page.evaluate(() => { const it=[...document.querySelectorAll(".nav__item")].find(n=>/Documentos/i.test(n.textContent)); if(it) it.click(); });
await page.waitForTimeout(800);
const doc = await page.evaluate(() => {
  const st = document.querySelector("#view .stats");
  return { temStats: !!st, nCards: st ? st.querySelectorAll(".stat").length : 0, titulo: document.querySelector("#topbar-title")?.textContent };
});
console.log("Documentos:", JSON.stringify(doc));
const elD = await page.$("#view"); await elD.screenshot({ path: "C:/projetos/ocorr-ponto/scratchpad/audit/out/st-documentos2.png" });
// Dark: liga tema e volta em Funcionarios
await page.evaluate(() => { try { localStorage.setItem("fiopulse:tema","escuro"); cpAplicarTema(); renderApp(); } catch {} });
await page.evaluate(() => { const it=[...document.querySelectorAll(".nav__item")].find(n=>/Funcion[aá]rios/i.test(n.textContent)); if(it) it.click(); });
await page.waitForTimeout(700);
const elF = await page.$("#view"); await elF.screenshot({ path: "C:/projetos/ocorr-ponto/scratchpad/audit/out/st-funcionarios-dark.png" });
console.log("erros:", (await H.coletarErrosReais(page)).length);
await browser.close(); process.exit(0);
