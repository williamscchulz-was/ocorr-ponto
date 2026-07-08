setTimeout(() => { console.log("HARD-TIMEOUT"); process.exit(9); }, 120000);
const H = await import("./harness.mjs");
await H.iniciarServidor();
const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedGestor(page);
await page.addStyleTag({ content: "#toast-root{display:none!important}" });
await page.waitForTimeout(400);
const OUT = "C:/projetos/ocorr-ponto/scratchpad/audit/out";
const nav = async (rx, file) => {
  await page.evaluate((r) => { const it=[...document.querySelectorAll(".nav__item")].find(n=>new RegExp(r,"i").test(n.textContent)); if(it) it.click(); }, rx);
  await page.waitForTimeout(650);
  // recorta so a area de stats (primeiro .stats da view) + cabecalho
  const el = await page.$("#view");
  await el.screenshot({ path: OUT + "/" + file });
  const info = await page.evaluate(() => {
    const st = document.querySelector("#view .stats");
    return st ? { nCards: st.querySelectorAll(".stat").length, bg: getComputedStyle(st.querySelector(".stat")).backgroundColor } : null;
  });
  return info;
};
console.log("Funcionarios:", JSON.stringify(await nav("Funcion[aá]rios", "st-funcionarios.png")));
console.log("Banco:", JSON.stringify(await nav("Banco de horas", "st-banco.png")));
console.log("Disciplinar:", JSON.stringify(await nav("Disciplinar", "st-disciplinar.png")));
console.log("Comunicados:", JSON.stringify(await nav("Comunicados", "st-comunicados.png")));
console.log("Documentos:", JSON.stringify(await nav("Documentos", "st-documentos.png")));
console.log("erros:", (await H.coletarErrosReais(page)).length);
await browser.close(); process.exit(0);
