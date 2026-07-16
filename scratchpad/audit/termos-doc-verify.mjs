import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = "http://localhost:8081/docs/mockups/termos-documentos-2026-07.html";
const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });

const errors = [];
const externas = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1300, height: 1200 } });
const page = await ctx.newPage();
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("console.error: " + m.text()); });
page.on("request", r => { const u = r.url(); if (!u.startsWith("http://localhost:8081") && !u.startsWith("data:")) externas.push(u); });

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const log = [];
const check = (name, cond) => { log.push((cond ? "PASS " : "FAIL ") + name); if (!cond) errors.push("CHECK FAIL: " + name); };

// fontes locais carregadas
check("Poppins local carregada", await page.evaluate(() => document.fonts.check('700 20px Poppins')));
check("GreatVibes local carregada", await page.evaluate(() => document.fonts.check('30px GreatVibes')));

// estrutura: 3 quadros, 6 aparelhos (claro+escuro cada)
check("3 secoes (quadros)", await page.locator(".sec").count() === 3);
check("6 aparelhos", await page.locator(".phone").count() === 6);

// quadro 1: grupo Meus termos com 2 linhas de termo, cada uma com Comprovante
const listaTxt = await page.locator("#ph-lista-claro").innerText();
// nota: .pp-ovl e .cpv__lbl usam text-transform:uppercase, entao innerText vem em CAIXA ALTA (usar /i)
check("titulo Documentos", /Documentos/.test(listaTxt));
check("grupo Publicados presente", /Publicados/i.test(listaTxt));
check("grupo Meus termos presente", /Meus termos/i.test(listaTxt));
check("Termo de Adesao na lista", /Termo de Adesão à Assinatura Eletrônica/.test(listaTxt));
check("Termo do Canal na lista", /Termo do Canal de Denúncias/.test(listaTxt));
check("subtitulo aceito em 10 de julho", /Aceito em 10 de julho de 2026 · v2026-07-v1/.test(listaTxt));
check("subtitulo aceito em 16 de julho", /Aceito em 16 de julho de 2026 · v2026-07-v1/.test(listaTxt));
check("linhas de termo tem botao Comprovante", await page.locator("#ph-lista-claro .pp-rw--termo .pp-rw__ro").count() === 2);
check("linhas de termo usam pp-ico verde", await page.locator("#ph-lista-claro .pp-rw--termo .pp-ico--green").count() === 2);

// subtitulo do termo NAO fica truncado (quebra em 2 linhas, cabe > 1 altura de linha)
const subH = await page.locator("#ph-lista-claro .pp-rw--termo").first().locator(".pp-rw__s").evaluate(el => el.getBoundingClientRect().height);
check("subtitulo do termo nao truncado (quebra de linha)", subH > 20);

// quadro 2: viewer interno com texto do termo + selo Aceito
const textoTxt = await page.locator("#ph-texto-claro").innerText();
check("viewer mostra texto do termo", /Do objeto/.test(textoTxt) && /Do consentimento LGPD/.test(textoTxt));
check("texto com nome e CPF preenchidos", /Alan Carlos Santos Bastos/.test(textoTxt) && /047\.815\.220-14/.test(textoTxt));
check("selo Aceito presente", await page.locator("#ph-texto-claro .doc__seal").count() === 1 && /ACEITO/.test(await page.locator("#ph-texto-claro .doc__seal").innerText()));
check("viewer reusa cp-docview (dv)", await page.locator("#ph-texto-claro .dv").count() === 1);

// quadro 3: comprovante A4 no padrao dos documentos
const compTxt = await page.locator("#ph-comprovante-claro").innerText();
check("cabecalho FioPulse na faixa verde", /FioPulse/.test(await page.locator("#ph-comprovante-claro .cpv__bar").innerText()));
check("titulo Comprovante de ciencia eletronica", /Comprovante de ciência eletrônica/.test(compTxt));
check("comprovante tem nome e CPF", /Alan Carlos Santos Bastos · CPF 047\.815\.220-14/.test(compTxt));
check("comprovante tem data e hora", /10\/07\/2026 09:14/.test(compTxt));
check("comprovante tem versao do termo", /2026-07-v1/.test(compTxt));
check("comprovante tem hash SHA-256", /SHA-256 do texto canônico/i.test(compTxt) && /b3f1c0a9d47e2a68/.test(compTxt));
check("comprovante tem local Indaial SC", /Indaial, SC/.test(compTxt));
check("comprovante tem frase de validade", /A validade depende da trilha registrada no sistema/.test(compTxt));
check("comprovante tem assinatura carimbada", await page.locator("#ph-comprovante-claro .cpv__signame").count() === 1);

// nota de rodape: aceites imutaveis, comprovante gerado do registro
const footTxt = await page.locator(".foot").innerText();
check("rodape: registros imutaveis", /registros imutáveis/i.test(footTxt));
check("rodape: comprovante gerado do registro", /gerado do registro/i.test(footTxt));
check("nota: nada novo pra vazar", /nada novo pra vazar/i.test(await page.evaluate(() => document.body.innerText)));

// sem hifen/travessao como separador de frase nos textos visiveis
const bodyTxt = await page.evaluate(() => document.body.innerText);
check("sem travessao (em dash / en dash)", !/[–—]/.test(bodyTxt));

// screenshots por aparelho
const pairs = [
  ["lista", "#ph-lista-claro", "#ph-lista-escuro"],
  ["texto", "#ph-texto-claro", "#ph-texto-escuro"],
  ["comprovante", "#ph-comprovante-claro", "#ph-comprovante-escuro"],
];
for (const [nome, claro, escuro] of pairs) {
  const c = page.locator(claro), e = page.locator(escuro);
  await c.scrollIntoViewIfNeeded(); await page.waitForTimeout(120);
  await c.screenshot({ path: `${OUT}/termos-doc-${nome}-claro.png` });
  await e.scrollIntoViewIfNeeded(); await page.waitForTimeout(120);
  await e.screenshot({ path: `${OUT}/termos-doc-${nome}-escuro.png` });
}

check("zero requisicao externa", externas.length === 0);
check("zero pageerror / console.error", errors.filter(x => !x.startsWith("CHECK FAIL")).length === 0);

console.log(log.join("\n"));
console.log("\n=== REQUISICOES EXTERNAS (" + externas.length + ") ===");
console.log(externas.length ? externas.join("\n") : "nenhuma");
console.log("\n=== ERROS (" + errors.length + ") ===");
console.log(errors.length ? errors.join("\n") : "nenhum");

await browser.close();
process.exit(errors.length ? 1 : 0);
