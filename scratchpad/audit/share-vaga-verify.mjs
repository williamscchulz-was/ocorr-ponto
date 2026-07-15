// VERIFICAÇÃO do botão "Compartilhar" na página da vaga do site público (public-vagas/index.html)
// contra o servidor 8081, Firebase STUBBADO com 1 vaga fixture. Dirige:
//  - botão presente no rodapé fixo ao lado do Candidatar-se, alvo de toque >= 44px;
//  - navigator.share estubado (celular): recebe title/text/url com a URL CANÔNICA
//    (https://vagas.fiobras.com.br/#vaga=<id>), mesmo servindo de localhost:8081;
//  - AbortError do share (usuário fechou a folha) não gera pageerror nem mensagem de erro;
//  - sem navigator.share (desktop): clipboard.writeText recebe a URL canônica e a
//    mensagem "Link copiado" aparece e some sozinha;
//  - zero pageerror.
// Screenshot: share-vaga.png em out/ (rodapé com os dois botões).
// NÃO edita produção.
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = "scratchpad/audit/out";
fs.mkdirSync(OUT, { recursive: true });

const fails = [], ok = [];
const check = (cond, msg) => { (cond ? ok : fails).push(msg); };

const POPPINS = `
@font-face{font-family:"Poppins";font-weight:400;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-400-latin.woff2") format("woff2");}
@font-face{font-family:"Poppins";font-weight:500;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-500-latin.woff2") format("woff2");}
@font-face{font-family:"Poppins";font-weight:600;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-600-latin.woff2") format("woff2");}
@font-face{font-family:"Poppins";font-weight:700;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-700-latin.woff2") format("woff2");}
@font-face{font-family:"Poppins";font-weight:800;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-700-latin.woff2") format("woff2");}
`;

const STUB = () => {
  window.FIREBASE_CONFIG = { apiKey: "stub", projectId: "stub", appId: "stub" };
  var BENS = ["Vale alimentação", "Vale transporte", "Plano de saúde"];
  var now = Date.now();
  function vaga(id, titulo, turno, desc, req, bens, off) {
    return { id: id, data: function () { return {
      status: "publicada", titulo: titulo, setor: "Produção", turno: turno, cidade: "Indaial, SC",
      descricao: desc, requisitos: req, beneficios: bens,
      publicadaEm: { toMillis: function () { return now - off; } }
    }; } };
  }
  var snapVagas = { docs: [
    vaga("vaga-controlador", "CONTROLADOR DE MATERIAIS", "Geral",
      "Receber e organizar fios, insumos e produtos químicos do setor industrial.",
      "Ensino médio completo.", BENS, 0),
  ] };
  var configDoc = { exists: true, data: function () { return { whatsapp: "5547999990000" }; } };
  function coll(name) {
    return {
      where: function () { return { get: function () { return Promise.resolve(name === "vagas" ? snapVagas : { docs: [] }); } }; },
      doc: function () { return {
        get: function () { return Promise.resolve(name === "config" ? configDoc : { exists: false }); },
        set: function () { return Promise.resolve(); }
      }; },
      get: function () { return Promise.resolve(name === "vagas" ? snapVagas : { docs: [] }); }
    };
  }
  var fs2 = function () { return { collection: coll }; };
  fs2.FieldValue = { serverTimestamp: function () { return "__ts__"; } };
  window.firebase = {
    initializeApp: function () {},
    firestore: fs2,
    storage: function () { return { ref: function () { return { child: function () { return { put: function () { return Promise.resolve(); } }; } }; } }; }
  };
};

const b = await chromium.launch({ args: ["--lang=pt-BR"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pt-BR", timezoneId: "America/Sao_Paulo", reducedMotion: "reduce" });
await ctx.route("**gstatic.com**", (r) => r.abort());
await ctx.route("**googleapis.com**", (r) => r.abort());
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.addInitScript(STUB);

const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 240)));
const wait = (ms) => page.waitForTimeout(ms);
const URL = "http://localhost:8081/public-vagas/index.html";
const CANONICA = "https://vagas.fiobras.com.br/#vaga=vaga-controlador";

async function load(hash) {
  await page.goto("about:blank");
  await page.goto(URL + (hash || ""), { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: POPPINS });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForSelector("#lista .vcompact", { timeout: 5000 });
  await wait(200);
}

async function abrirVagaControlador() {
  await load();
  await page.click("#lista .vcompact"); // única vaga do fixture
  await wait(300);
}

// ============================ 1 · BOTÃO PRESENTE E ALVO >= 44px ============================
await abrirVagaControlador();
const alvo = await page.evaluate(() => {
  const btn = document.getElementById("vpShare");
  const cta = document.getElementById("vpCta");
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  const rc = cta.getBoundingClientRect();
  return {
    existe: true,
    texto: (btn.textContent || "").replace(/\s+/g, " ").trim(),
    w: r.width, h: r.height,
    aoLadoDoCta: Math.abs(r.top - rc.top) < 30, // mesma linha do rodapé
    ctaAindaProtagonista: rc.width > r.width,
  };
});
check(!!alvo && alvo.existe, "botão #vpShare presente na página da vaga");
check(!!alvo && /Compartilhar/.test(alvo.texto), "rótulo 'Compartilhar' no botão (" + (alvo && alvo.texto) + ")");
check(!!alvo && alvo.w >= 44 && alvo.h >= 44, "alvo de toque >= 44px (" + (alvo && alvo.w) + "x" + (alvo && alvo.h) + ")");
check(!!alvo && alvo.aoLadoDoCta, "botão fica ao lado do Candidatar-se no rodapé fixo");
check(!!alvo && alvo.ctaAindaProtagonista, "Candidatar-se continua maior/protagonista que Compartilhar");
await page.screenshot({ path: OUT + "/share-vaga.png" });

// ============================ 2 · navigator.share (mobile): URL canônica ============================
await page.evaluate(() => {
  window.__shareCalls = [];
  navigator.share = function (data) { window.__shareCalls.push(data); return Promise.resolve(); };
});
await page.click("#vpShare");
await wait(150);
const shareData = await page.evaluate(() => window.__shareCalls[0]);
check(!!shareData, "clique com navigator.share disponível chama navigator.share");
check(!!shareData && shareData.url === CANONICA, "URL passada ao share é a CANÔNICA (" + (shareData && shareData.url) + ")");
check(!!shareData && shareData.title === "CONTROLADOR DE MATERIAIS · Fiobras", "title do share inclui o título da vaga (" + (shareData && shareData.title) + ")");
check(!!shareData && shareData.text === "Vaga aberta na Fiobras: CONTROLADOR DE MATERIAIS", "text do share menciona a vaga (" + (shareData && shareData.text) + ")");
const msgAposShare = await page.evaluate(() => document.getElementById("vpShareMsg").classList.contains("on"));
check(!msgAposShare, "caminho do navigator.share não aciona a mensagem 'Link copiado'");

// ============================ 3 · AbortError do share é silêncio, não erro ============================
await page.evaluate(() => {
  navigator.share = function () { var e = new DOMException("cancelado", "AbortError"); return Promise.reject(e); };
});
await page.click("#vpShare");
await wait(200);
check(pageErrors.length === 0, "AbortError do share não gera pageerror (" + pageErrors.length + ")");

// ============================ 4 · fallback clipboard (desktop, sem navigator.share) ============================
await abrirVagaControlador(); // recarrega: contexto novo sem os stubs de share acima
const temShareAntes = await page.evaluate(() => typeof navigator.share);
await page.evaluate(() => {
  // remove/oculta o share pra simular desktop e estuba o clipboard
  try { delete navigator.share; } catch (e) {}
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  window.__clipCalls = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: function (t) { window.__clipCalls.push(t); return Promise.resolve(); } }
  });
});
await page.click("#vpShare");
await wait(150);
const clipText = await page.evaluate(() => window.__clipCalls && window.__clipCalls[0]);
check(clipText === CANONICA, "sem navigator.share, clipboard.writeText recebe a URL canônica (" + clipText + ")");
const msgLigada = await page.evaluate(() => {
  const el = document.getElementById("vpShareMsg");
  return { on: el.classList.contains("on"), texto: el.textContent };
});
check(msgLigada.on && /Link copiado/.test(msgLigada.texto), "feedback 'Link copiado' aparece após copiar (" + JSON.stringify(msgLigada) + ")");
await page.screenshot({ path: OUT + "/share-vaga-copiado.png" });
await wait(2200); // timer da mensagem é 1800ms
const msgDepois = await page.evaluate(() => document.getElementById("vpShareMsg").classList.contains("on"));
check(!msgDepois, "feedback 'Link copiado' some sozinho depois de um tempo");

await b.close();

console.log("temShareAntes (esperado 'undefined' no Chromium desktop padrão): " + temShareAntes);
console.log("OK (" + ok.length + "):");
ok.forEach((m) => console.log("  ✓ " + m));
if (pageErrors.length) { console.log("\nPAGE ERRORS (" + pageErrors.length + "):"); pageErrors.forEach((e) => console.log("  " + e)); }
else console.log("\nZERO pageerror.");
if (fails.length) { console.log("\nFALHAS (" + fails.length + "):"); fails.forEach((m) => console.log("  ✗ " + m)); process.exit(1); }
console.log("\nSHARE-VAGA VERIFY: PASSOU (" + ok.length + " asserções).");
