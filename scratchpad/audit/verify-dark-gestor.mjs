// Verifica o tema escuro do gestor pela VIA REAL (pref localStorage -> cpAplicarTema).
// Captura telas-chave + modal Minha conta e conta erros.
setTimeout(() => { console.log("HARD-TIMEOUT"); process.exit(9); }, 120000);
const H = await import("./harness.mjs");
await H.iniciarServidor();
const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedGestor(page);

// ativa dark pela via real (a mesma do toggle)
await page.evaluate(() => {
  try { localStorage.setItem("fiopulse:tema", "escuro"); } catch {}
  try { cpAplicarTema(); } catch {}
  try { renderApp(); } catch {}
});
await page.waitForTimeout(500);

const OUT = "C:/projetos/ocorr-ponto/scratchpad/audit/out";
const limpar = () => page.evaluate(() => document.querySelectorAll('[class*="toast"],[id*="toast"]').forEach((e) => e.remove()));
const nav = async (rx) => {
  await page.evaluate((r) => { const it = [...document.querySelectorAll(".nav__item")].find((n) => new RegExp(r, "i").test(n.textContent)); if (it) it.click(); }, rx);
  await page.waitForTimeout(650); await limpar(); await page.waitForTimeout(130);
};

// confirma que cp-dark foi aplicado e modo-colab NAO
const estado = await page.evaluate(() => ({
  cpDark: document.documentElement.classList.contains("cp-dark"),
  modoColab: document.documentElement.classList.contains("modo-colab"),
}));
console.log("estado:", JSON.stringify(estado));

await nav("Vis[aã]o geral"); await page.screenshot({ path: OUT + "/dk-1-visaogeral.png", fullPage: true });
await nav("Banco de horas"); await page.screenshot({ path: OUT + "/dk-2-bancohoras.png", fullPage: true });
await nav("Funcion[aá]rios"); await page.screenshot({ path: OUT + "/dk-3-funcionarios.png", fullPage: true });
await nav("Configura"); await page.screenshot({ path: OUT + "/dk-4-config.png", fullPage: true });

// modal Minha conta (mostra o segmented Aparencia + tematizacao do modal)
await page.evaluate(() => { try { openProfileModal(); } catch {} });
await page.waitForTimeout(450); await limpar(); await page.waitForTimeout(130);
await page.screenshot({ path: OUT + "/dk-5-minhaconta.png", fullPage: true });

const erros = await H.coletarErrosReais(page);
console.log("erros:", erros.length, JSON.stringify(erros.slice(0, 3)));
await browser.close();
process.exit(0);
