// Screenshot + checks do fluxograma do boot.
import { chromium } from "playwright";

const URL = "http://localhost:8081/docs/mockups/boot-fluxograma-2026-07.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1500 } });
const erros = [];
page.on("pageerror", (e) => erros.push(String(e)));
await page.goto(URL, { waitUntil: "networkidle" });

const n = await page.evaluate(() => ({
  frames: document.querySelectorAll(".frame").length,
  piscas: document.querySelectorAll(".seta .pisca").length,
  splashes2: document.querySelectorAll(".mini-splash").length,
  temTravessao: /[—–]/.test(document.body.innerText),
  overflowOk: Array.from(document.querySelectorAll(".trilho")).every((t) => t.scrollWidth >= t.clientWidth),
}));
await page.screenshot({ path: "scratchpad/audit/out/boot-fluxo-claro.png", fullPage: true });
await page.click(".tema");
await page.waitForTimeout(250);
await page.screenshot({ path: "scratchpad/audit/out/boot-fluxo-escuro.png", fullPage: true });
console.log(JSON.stringify({ n, erros }, null, 2));
await browser.close();
// 4 frames no caminho 1 + 7 no caminho 2 = 11; 7 selos PISCA (2 + 5); 3 splashes (1 + 2)
const ok = n.frames === 11 && n.piscas === 7 && n.splashes2 === 3 && !n.temTravessao && !erros.length;
if (!ok) { console.error("FALHOU"); process.exit(1); }
console.log("OK");
