// VERIFICAÇÃO das micro interações aplicadas ao site público de vagas
// (public-vagas/index.html) contra o servidor 8081, Firebase STUBBADO com 3 vagas fixture.
// Roda com MOTION LIGADO (ao contrário do card-b-verify, que roda reduced) pra provar:
//   A · morph do Enviar: o botão colapsa em círculo com spinner (envio) e vira CHECK no
//       sucesso real do __testMode; captura da candidatura intacta.
//   B · shake: campo inválido treme (WAAPI) junto do erro ao tentar avançar o passo.
//   E · glare 1x por card: brilho .vshine dispara UMA vez quando o card entra na viewport
//       e NUNCA re-dispara ao rolar de volta; o elemento é efêmero (removido no fim).
// NÃO edita produção. Falha com QUALQUER pageerror.
import { chromium } from "playwright";

const fails = [], ok = [];
const check = (cond, msg) => { (cond ? ok : fails).push(msg); };

const STUB = () => {
  window.FIREBASE_CONFIG = { apiKey: "stub", projectId: "stub", appId: "stub" };
  var BENS = ["Vale alimentação", "Vale transporte", "Plano de saúde", "PPR", "Cesta básica"];
  var now = Date.now();
  function vaga(id, titulo, turno, off) {
    return { id: id, data: function () { return {
      status: "publicada", visibilidade: "publica", titulo: titulo, setor: "Produção", turno: turno, cidade: "Indaial, SC",
      descricao: "Apoiar a operação e manter o setor organizado ao longo do turno.",
      requisitos: "Ensino fundamental completo.", beneficios: BENS,
      publicadaEm: { toMillis: function () { return now - off; } }
    }; } };
  }
  var snapVagas = { docs: [
    vaga("vaga-a", "AUXILIAR DE PRODUÇÃO", "1º turno", 0),
    vaga("vaga-b", "OPERADOR DE MÁQUINAS", "2º turno", 1000),
    vaga("vaga-c", "CONTROLADOR DE MATERIAIS", "Geral", 2000),
  ] };
  function coll(name) {
    var snap = function () { return Promise.resolve(name === "vagas" ? snapVagas : { docs: [] }); };
    // where CHAINAVEL (a query do site fase 2 encadeia .where(status).where(visibilidade)).
    var q = { where: function () { return q; }, get: snap };
    return {
      where: function () { return q; },
      doc: function () { return { get: function () { return Promise.resolve({ exists: false }); }, set: function () { return Promise.resolve(); } }; },
      get: snap
    };
  }
  var fs2 = function () { return { collection: coll }; };
  fs2.FieldValue = { serverTimestamp: function () { return "__ts__"; } };
  window.firebase = {
    initializeApp: function () {},
    firestore: fs2,
    storage: function () { return { ref: function () { return { child: function () { return { put: function () { return Promise.resolve(); } }; } }; } }; }
  };
  window.__captured = null;
  window.__testMode = {
    commit: function (writes) {
      for (var i = 0; i < writes.length; i++) { if (writes[i].col === "candidaturas") window.__captured = { docId: writes[i].id, payload: writes[i].data }; }
      // delay pra dar pra observar o círculo + spinner (morph de 340ms) antes do check
      return new Promise(function (res) { setTimeout(res, 520); });
    },
    upload: function () { return Promise.resolve(); }
  };
  // Conta os glares (.vshine) DESDE O INIT, em subtree do documento inteiro. Com o header
  // slim (variante A) a lista pode nascer parcialmente acima da dobra no mobile 390, então
  // o glare de um card já visível dispara na 1ª carga, ANTES de qualquer observer instalado
  // pós-load. Contar desde o init captura tanto os glares de carga quanto os de rolagem —
  // sem depender de a lista estar abaixo da dobra (premissa que o header slim invalidou).
  window.__glareCount = {};
  function __bumpGlare(nd) {
    if (nd.nodeType === 1 && nd.classList && nd.classList.contains("vshine")) {
      var card = nd.closest && nd.closest(".vcompact");
      if (card) { var id = card.getAttribute("data-vaga-id"); window.__glareCount[id] = (window.__glareCount[id] || 0) + 1; }
    }
  }
  var __glareMo = new MutationObserver(function (muts) { muts.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, __bumpGlare); }); });
  function __startGlareMo() { if (document.documentElement) __glareMo.observe(document.documentElement, { childList: true, subtree: true }); }
  if (document.documentElement) __startGlareMo();
  else document.addEventListener("DOMContentLoaded", __startGlareMo);
};

const b = await chromium.launch({ args: ["--lang=pt-BR"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
await ctx.route("**gstatic.com**", (r) => r.abort());
await ctx.route("**googleapis.com**", (r) => r.abort());
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.addInitScript(STUB);

const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 240)));
const wait = (ms) => page.waitForTimeout(ms);
const URL = "http://localhost:8081/public-vagas/index.html";

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#lista .vcompact", { timeout: 5000 });
await page.evaluate(() => window.scrollTo(0, 0));
await wait(150);

// ============================ E · GLARE 1x POR CARD ============================
// Contagem instalada no init (ver STUB). O glare é um IntersectionObserver (threshold .35)
// com guarda data-glared + unobserve: cada card brilha UMA vez ao entrar na viewport e
// NUNCA re-dispara. Com o header slim os primeiros cards podem já nascer visíveis no mobile,
// então parte dos glares acontece na 1ª carga — a contagem desde o init cobre os dois casos.
const preGlare = await page.evaluate(() => ({
  n: document.querySelectorAll("#lista .vcompact").length,
  count: window.__glareCount,
}));
check(preGlare.n === 3, "E: 3 cards de vaga na lista (" + preGlare.n + ")");
check(Object.keys(preGlare.count).every((k) => preGlare.count[k] <= 1), "E: nenhum card brilhou mais de uma vez na 1ª carga (" + JSON.stringify(preGlare.count) + ")");

// rola a lista inteira: todo card entra na viewport e brilha (os que já não brilharam na carga)
await page.$eval("#vagas", (el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
await wait(400);
await page.$eval("#lista .vcompact:last-child", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
await wait(1300); // > 900ms do sweep + margem pro onfinish remover o elemento
const eFirst = await page.evaluate(() => ({
  count: window.__glareCount,
  glared: Array.prototype.map.call(document.querySelectorAll("#lista .vcompact"), (c) => c.getAttribute("data-glared")),
  liveShines: document.querySelectorAll("#lista .vcompact .vshine").length,
}));
const todosGlared = eFirst.glared.length === 3 && eFirst.glared.every((g) => g === "1");
const cadaUmaVez = Object.keys(eFirst.count).length === 3 && Object.keys(eFirst.count).every((k) => eFirst.count[k] === 1);
check(todosGlared, "E: os 3 cards ganharam data-glared após entrar na viewport (" + JSON.stringify(eFirst.glared) + ")");
check(cadaUmaVez, "E: cada card brilhou EXATAMENTE 1x (" + JSON.stringify(eFirst.count) + ")");
check(eFirst.liveShines === 0, "E: elemento .vshine é efêmero, removido ao terminar (vivos: " + eFirst.liveShines + ")");

// rola pra longe e volta: NÃO pode brilhar de novo
await page.evaluate(() => window.scrollTo(0, 0));
await wait(400);
await page.$eval("#vagas", (el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
await page.$eval("#lista .vcompact:last-child", (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
await wait(1300);
const eBack = await page.evaluate(() => ({
  count: window.__glareCount,
  liveShines: document.querySelectorAll("#lista .vcompact .vshine").length,
}));
const semReDisparo = Object.keys(eBack.count).length === 3 && Object.keys(eBack.count).every((k) => eBack.count[k] === 1);
check(semReDisparo, "E: rolar de volta NÃO re-dispara o glare (" + JSON.stringify(eBack.count) + ")");
check(eBack.liveShines === 0, "E: sem .vshine residual após o retorno");

// ============================ B · SHAKE DE ERRO ============================
const bRes = await page.evaluate(async () => {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelectorAll(".cta--form._probe").forEach((x) => x.remove());
  const btn = document.createElement("button");
  btn.className = "cta cta--form _probe";
  btn.setAttribute("data-vaga-id", "vagaB");
  btn.setAttribute("data-vaga-titulo", "AUXILIAR DE PRODUÇÃO");
  document.getElementById("lista").appendChild(btn);
  btn.click();
  await sleep(80);
  // cp1a com nome e nascimento vazios: avançar dispara validação
  $("ci-nome").value = ""; $("ci-nasc").value = "";
  $("candPrim").click(); // valida e chama focarPrimeiroErro (marca + treme)
  const nomeField = $("cf-nome"), nascField = $("cf-nasc");
  const out = {
    nomeErr: nomeField.classList.contains("err"),
    nomeAnims: nomeField.getAnimations ? nomeField.getAnimations().length : 0,
    nascAnims: nascField.getAnimations ? nascField.getAnimations().length : 0,
    aindaCp1a: !$("cp1a").hidden,
  };
  document.getElementById("dlgCandidatura").close();
  return out;
}, {});
check(bRes.nomeErr, "B: campo inválido entra em erro (.err)");
check(bRes.nomeAnims >= 1, "B: campo inválido TREME (WAAPI ativa: " + bRes.nomeAnims + ")");
check(bRes.nascAnims >= 1, "B: todos os inválidos do passo tremem juntos (nasc: " + bRes.nascAnims + ")");
check(bRes.aindaCp1a, "B: com erro, não avança de passo");

// ============================ A · MORPH DO ENVIAR ============================
// Preenche a ficha completa (primeiro emprego pra pular o form de experiência) até o cp6
// com consentimento, SEM enviar; o envio e a amostragem do morph acontecem fora do evaluate.
await page.evaluate(async () => {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const set = (id, val) => { const el = $(id); el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  document.querySelectorAll(".cta--form._probe").forEach((x) => x.remove());
  const btn = document.createElement("button");
  btn.className = "cta cta--form _probe";
  btn.setAttribute("data-vaga-id", "vaga-a");
  btn.setAttribute("data-vaga-titulo", "AUXILIAR DE PRODUÇÃO");
  document.getElementById("lista").appendChild(btn);
  btn.click(); await sleep(80);
  set("ci-nome", "Ana Paula Teste"); set("ci-nasc", "1994-03-12"); set("ci-ec", "casado"); set("ci-esc", "medio-completo");
  $("candPrim").click(); await sleep(80); // -> cp1b
  set("ci-cep", "89120-000"); set("ci-rua", "Rua das Palmeiras, 240"); set("ci-bairro", "Warnow"); set("ci-cidade", "Indaial, SC");
  set("ci-nac", "Brasileira"); set("ci-nat", "Blumenau, SC"); set("ci-zap", "(47) 9 9812-3344"); set("ci-mail", "ana@email.com");
  $("candPrim").click(); await sleep(80); // -> cp2
  $("expPrimeiro").click(); await sleep(30); // primeiro emprego
  $("candPrim").click(); await sleep(80); // -> cp3
  $("candPrim").click(); await sleep(80); // pula currículo -> cp4
  for (let i = 0; i < 16; i++) { const opt = document.querySelector("#discCard .disc-opt:not([disabled])"); if (!opt) break; opt.click(); await sleep(430); }
  await sleep(500);
  $("candPrim").click(); await sleep(100); // -> cp5
  set("ci-pret", "190000");
  $("chips-vem").querySelector('[data-val="moto"]').click();
  $("candPrim").click(); await sleep(100); // -> cp6
  $("cLgpd").click(); await sleep(40); // consente
});
const noCp6 = await page.evaluate(() => ({ txt: document.getElementById("stepCount").textContent }));
check(noCp6.txt === "Etapa 6 de 6", "A: fluxo chegou ao cp6 pra enviar (" + noCp6.txt + ")");

// clica Enviar e amostra a fase do SPINNER (envio em andamento, commit ainda pendente).
// espera > 340ms (morph de largura terminou, círculo estável) e < 520ms (commit pendente).
await page.click("#candPrim");
await wait(390);
const aSpin = await page.evaluate(() => {
  const btn = document.getElementById("candPrim");
  return {
    morphing: btn.classList.contains("morphing"),
    done: btn.classList.contains("morph-done"),
    temSpin: !!btn.querySelector(".cta__spin"),
    circulo: Math.abs(btn.offsetWidth - btn.offsetHeight) <= 2,
  };
});
check(aSpin.morphing && aSpin.circulo, "A: ao enviar, o botão colapsa em CÍRCULO (morphing, w≈h)");
check(aSpin.temSpin && !aSpin.done, "A: fase de envio mostra o SPINNER, ainda sem check");

// depois do commit resolver (520ms): vira CHECK (morph-done) antes da cerimônia
await wait(450);
const aChk = await page.evaluate(() => {
  const btn = document.getElementById("candPrim");
  const chk = btn.querySelector(".cta__chk");
  return {
    done: btn.classList.contains("morph-done"),
    checkVisivel: chk ? getComputedStyle(chk).opacity : "0",
    captured: window.__captured ? window.__captured.docId : null,
  };
});
check(aChk.done, "A: no sucesso real o botão vira CHECK (morph-done)");
check(parseFloat(aChk.checkVisivel) >= 0.99, "A: o check fica visível (opacity " + aChk.checkVisivel + ")");
check(aChk.captured === "vaga-a__ana@email.com", "A: candidatura enviada e capturada (" + aChk.captured + ")");

await b.close();

console.log("OK (" + ok.length + "):");
ok.forEach((m) => console.log("  ✓ " + m));
if (pageErrors.length) { console.log("\nPAGE ERRORS (" + pageErrors.length + "):"); pageErrors.forEach((e) => console.log("  " + e)); }
else console.log("\nZERO pageerror.");
if (fails.length) { console.log("\nFALHAS (" + fails.length + "):"); fails.forEach((m) => console.log("  ✗ " + m)); process.exit(1); }
console.log("\nMICRO VAGAS VERIFY: PASSOU (" + ok.length + " asserções).");
