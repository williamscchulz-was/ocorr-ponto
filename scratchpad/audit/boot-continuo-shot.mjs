// Roda a simulação do boot contínuo nos 2 caminhos e prova que ela completa.
import { chromium } from "playwright";

const URL = "http://localhost:8081/docs/mockups/boot-continuo-2026-07.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
const erros = [];
page.on("pageerror", (e) => erros.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
await page.goto(URL, { waitUntil: "networkidle" });

const temTravessao = await page.evaluate(() => /[—–]/.test(document.body.innerText));

// ---- caminho normal: ícone -> cortina -> escolha -> portal -> home ----
await page.click("#icone");
await page.waitForTimeout(700);
const meioNormal = await page.evaluate(() => ({
  cortina: getComputedStyle(document.getElementById("cortina")).opacity,
  marca: getComputedStyle(document.getElementById("marca")).opacity,
}));
await page.waitForFunction(() => document.getElementById("legenda").textContent.includes("Escolha de portal"), null, { timeout: 8000 });
await page.screenshot({ path: "scratchpad/audit/out/boot-cont-escolha.png" });
await page.click("[data-portal]");
await page.waitForFunction(() => document.getElementById("legenda").textContent.includes("Fim do caminho"), null, { timeout: 5000 });
const homeVisivel = await page.evaluate(() => getComputedStyle(document.getElementById("layHome")).opacity);
await page.screenshot({ path: "scratchpad/audit/out/boot-cont-home.png" });

// ---- caminho com atualização: a PRIMEIRA tela ja e a atualizacao (William) ----
await page.click("#btnUpdate");
await page.waitForTimeout(550); // cortina acabou de entrar (fade .35s)
const primeiraTela = await page.evaluate(() => ({
  ecg: getComputedStyle(document.getElementById("ecg")).opacity,
  up: getComputedStyle(document.getElementById("up")).opacity,
  cortina: getComputedStyle(document.getElementById("cortina")).opacity,
}));
await page.waitForFunction(() => document.getElementById("pct").textContent === "100%", null, { timeout: 8000 });
await page.screenshot({ path: "scratchpad/audit/out/boot-cont-update.png" });
await page.waitForFunction(() => document.getElementById("legenda").textContent.includes("Reload invisível"), null, { timeout: 5000 });
await page.waitForTimeout(400); // o selo entra em fade de 0,3s; le depois de assentar
const selo = await page.evaluate(() => getComputedStyle(document.getElementById("seloReload")).opacity);
const cortinaDuranteReload = await page.evaluate(() => getComputedStyle(document.getElementById("cortina")).opacity);
await page.screenshot({ path: "scratchpad/audit/out/boot-cont-reload.png" });
await page.waitForFunction(() => document.getElementById("legenda").textContent.includes("Escolha de portal"), null, { timeout: 9000 });
await page.click("[data-portal]");
await page.waitForFunction(() => document.getElementById("legenda").textContent.includes("Fim do caminho"), null, { timeout: 5000 });

console.log(JSON.stringify({ temTravessao, meioNormal, primeiraTela, homeVisivel, selo, cortinaDuranteReload, erros }, null, 2));
await browser.close();
const ok = !temTravessao && Number(meioNormal.cortina) > 0.9 && Number(homeVisivel) > 0.9
  && Number(primeiraTela.cortina) > 0.9 && Number(primeiraTela.up) > 0.9 && Number(primeiraTela.ecg) < 0.1
  && Number(selo) > 0.9 && Number(cortinaDuranteReload) > 0.9 && !erros.length;
if (!ok) { console.error("FALHOU"); process.exit(1); }
console.log("OK");
