// Gera o PDF A4 do tutorial de instalacao a partir do HTML (respeita @page A4 + @media print).
import { chromium } from "playwright";
import path from "node:path";
const OUT_DOCS = path.resolve("docs/tutorial-instalar-app.pdf");
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto("http://localhost:8081/docs/tutorial-instalar-app.html", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
await p.evaluate(() => Promise.all([...document.images].map((im) => (im.decode ? im.decode().catch(() => {}) : null)))).catch(() => {});
await p.waitForTimeout(600);
await p.emulateMedia({ media: "print" });
await p.pdf({ path: OUT_DOCS, preferCSSPageSize: true, printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
await b.close();
console.log("PDF:", OUT_DOCS);
