// Mock fiel do dark do gestor: aplica tokens dark no APP REAL (tudo token-driven)
// e fotografa a Visao geral. Revela o que recolore sozinho e o que precisa de override.
setTimeout(() => { console.log("HARD-TIMEOUT"); process.exit(9); }, 90000);
const H = await import("./harness.mjs");
await H.iniciarServidor();
const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedGestor(page);

// garante Visao geral
await page.evaluate(() => {
  try { if (typeof irPara === "function") irPara("visao-geral"); } catch {}
  try { if (typeof navegar === "function") navegar("visao-geral"); } catch {}
});
await page.waitForTimeout(500);

const DARK = `
html.cp-dark {
  --bg:#0E130E; --milk:#0E130E; --surface:#161D15; --surface-warm:#1E261D; --milk-warm:#1E261D;
  --border:#232C22; --border-strong:#2A332A; --milk-edge:#2A332A;
  --text:#EDF3EA; --text-body:#EDF3EA; --text-muted:#8A9884;
  --plum:#5FCB85; --plum-soft:#5FCB85; --plum-deep:#9FE0B5;
  --success:#5FCB85; --success-bg:#193220; --warning:#E8B468; --warning-bg:#3A2E18;
  --warning-ink:#E8B468;
  --danger:#E68A86; --danger-bg:rgba(150,47,50,.22); --info:#7FC4F0; --info-bg:rgba(0,118,190,.18);
}
html.cp-dark body, html.cp-dark .app { background: var(--bg); }
/* chrome do gestor: sidebar deixa de ser verde vivo, vira verde MUITO escuro (mantem a identidade) */
html.cp-dark .app__sidebar { background:#0F1A13; border-right:1px solid #1E2A1F; }
html.cp-dark .app__brand-mark { background: var(--plum); color:#0E130E; }
html.cp-dark .topbar { background: var(--surface); color: var(--text-body); }
`;
await page.addStyleTag({ content: DARK });
await page.evaluate(() => document.documentElement.classList.add("cp-dark"));
await page.waitForTimeout(400);

const OUT = "C:/projetos/ocorr-ponto/scratchpad/audit/out";
const limparToasts = () => page.evaluate(() => {
  document.querySelectorAll('[class*="toast"],[id*="toast"],[class*="Toast"]').forEach((e) => e.remove());
});

// 1) Visao geral (landing)
await limparToasts();
await page.waitForTimeout(150);
await page.screenshot({ path: OUT + "/gestor-dark-visaogeral.png", fullPage: true });

// 2) Ocorrencias (lista de trabalho, mostra o selo Conferir no dark)
await page.evaluate(() => {
  try { if (typeof irPara === "function") irPara("ocorrencias"); } catch {}
  try { if (typeof navegar === "function") navegar("ocorrencias"); } catch {}
});
await page.waitForTimeout(500);
await limparToasts();
await page.waitForTimeout(150);
await page.screenshot({ path: OUT + "/gestor-dark-ocorrencias.png", fullPage: true });

const erros = await H.coletarErrosReais(page);
console.log("erros:", erros.length);
await browser.close();
process.exit(0);
