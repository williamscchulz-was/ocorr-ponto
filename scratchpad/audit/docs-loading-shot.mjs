import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 430, height: 980 } });
const erros = []; p.on("pageerror", (e) => erros.push(String(e)));
await p.goto("http://localhost:8081/docs/mockups/documentos-loading-2026-07.html", { waitUntil: "networkidle" });
await p.waitForTimeout(400);
const meio = await p.evaluate(() => ({ sk: document.getElementById("skel").style.display !== "none", ct: document.getElementById("conteudo").style.display === "none" }));
await p.screenshot({ path: "scratchpad/audit/out/docsload-skeleton.png" });
await p.waitForTimeout(1700);
const fim = await p.evaluate(() => ({ sk: document.getElementById("skel").style.display, ct: document.getElementById("conteudo").style.display, trav: /[—–]/.test(document.body.innerText) }));
await p.screenshot({ path: "scratchpad/audit/out/docsload-pronto.png" });
console.log(JSON.stringify({ meio, fim, erros }));
await b.close();
if (!meio.sk || !meio.ct || fim.sk !== "none" || fim.ct !== "block" || fim.trav || erros.length) { console.error("FALHOU"); process.exit(1); }
console.log("OK");
