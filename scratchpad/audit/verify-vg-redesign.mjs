setTimeout(() => { console.log("HARD-TIMEOUT"); process.exit(9); }, 90000);
const H = await import("./harness.mjs");
await H.iniciarServidor();
const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedGestor(page);
await page.addStyleTag({ content: "#toast-root{display:none!important}" }); // esconde toasts SEM apagar o root
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelectorAll("details.vg-exp").forEach(d => d.open = true));
await page.waitForTimeout(250);
await page.screenshot({ path: "C:/projetos/ocorr-ponto/scratchpad/audit/out/vg-real-redesign.png", fullPage: true });
const erros = await H.coletarErrosReais(page);
console.log("erros:", erros.length, JSON.stringify(erros.slice(0, 3)));
await browser.close(); process.exit(0);
