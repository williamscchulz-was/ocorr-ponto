// Verifica as 7 micro-interacoes texteis APROVADAS aplicadas no site REAL de vagas
// (public-vagas/index.html). Pecas: 2 costura no hover, 3 tingimento (DISC), 4 tear no
// upload, 5 contagem viva, 6 stepper de linha, 7 cerimonia em pico (ECG), 8 sheen no
// marcador. (Peca 1 fio-no-scroll foi REJEITADA, nao entra.)
//
// Harness hermetico: bloqueia o SDK do firebase (gstatic), injeta FIREBASE_CONFIG + um stub
// do firebase + um cache de sessao com 3 vagas, entao o caminho REAL de render (carregar.then)
// desenha os cards + a contagem sem tocar a rede. Assim as pecas 2 e 5 sao testadas no codigo
// de producao, nao em markup fabricado.
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHOTS = path.join(RAIZ, "scratchpad", "audit", "micro-vagas-site-shots");
const FIX = path.join(RAIZ, "scratchpad", "audit", "fixtures");
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(FIX, { recursive: true });

const PDF_MIN = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF\n";
const smallPdf = path.join(FIX, "cv-ok.pdf");
fs.writeFileSync(smallPdf, PDF_MIN);

// ---- servidor estatico (raiz do repo) na 8081, reusa se ja estiver de pe ----
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  let alvo = path.normalize(path.join(RAIZ, url));
  if (!alvo.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(alvo) && fs.statSync(alvo).isDirectory()) alvo = path.join(alvo, "index.html");
  fs.readFile(alvo, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(alvo).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
});
let servidorProprio = false;
await new Promise((resolve) => {
  srv.once("error", (e) => { if (e.code === "EADDRINUSE") { console.log("porta 8081 ja em uso, reusando"); resolve(); } else throw e; });
  srv.listen(8081, () => { servidorProprio = true; resolve(); });
});
const URL = "http://localhost:8081/public-vagas/index.html";

const FALHAS = [];
const ok = (nome, cond) => { if (cond) console.log("  ok:", nome); else { console.log("  FALHA:", nome); FALHAS.push(nome); } };

const browser = await chromium.launch();

// seed do cache + stub do firebase, aplicados ANTES de qualquer script da pagina.
const initScript = () => {
  window.FIREBASE_CONFIG = { apiKey: "demo", projectId: "demo-vagas", appId: "demo" };
  var noop = function () {};
  var snapVazio = { exists: false, data: function () { return {}; }, docs: [] };
  var q = { where: function () { return q; }, get: function () { return Promise.resolve(snapVazio); },
    doc: function () { return { get: function () { return Promise.resolve(snapVazio); }, set: function () { return Promise.resolve(); } }; } };
  var firestoreFn = function () { return { collection: function () { return q; }, batch: function () { return { set: noop, commit: function () { return Promise.resolve(); } }; } }; };
  firestoreFn.FieldValue = { serverTimestamp: function () { return { __ts: true }; } };
  window.firebase = {
    initializeApp: noop,
    firestore: firestoreFn,
    storage: function () { return { ref: function () { return { child: function () { return { put: function () { return Promise.resolve(); } }; } }; } }; },
  };
  try {
    sessionStorage.setItem("vagas-cache-v5", JSON.stringify({
      t: Date.now(),
      vagas: [
        { id: "v1", titulo: "Auxiliar de Producao", setor: "Producao", turno: "1º turno", cidade: "Indaial, SC", descricao: "Atuar na linha de producao textil com foco em qualidade.", requisitos: "Ensino fundamental completo.", beneficios: ["Vale-transporte", "Refeitorio", "Plano de saude", "PLR"], pub: Date.now() },
        { id: "v2", titulo: "Tecelao", setor: "Tecelagem", turno: "2º turno", cidade: "Indaial, SC", descricao: "Operar teares e acompanhar a qualidade do tecido.", requisitos: "Experiencia com teares.", beneficios: ["Vale-transporte", "Refeitorio"], pub: Date.now() - 1000 },
        { id: "v3", titulo: "Analista de Qualidade", setor: "Qualidade", turno: "Administrativo", cidade: "Indaial, SC", descricao: "Inspecionar lotes e registrar nao conformidades.", requisitos: "Tecnico em textil.", beneficios: ["Plano de saude"], pub: Date.now() - 2000 },
      ],
    }));
  } catch (e) {}
};

async function novoContexto(opts) {
  const ctx = await browser.newContext(Object.assign({ serviceWorkers: "block" }, opts));
  await ctx.route("**/firebasejs/**", (r) => r.abort());
  await ctx.addInitScript(initScript);
  return ctx;
}
function ligarErros(p, pageErrs, consoleErrs) {
  p.on("pageerror", (e) => pageErrs.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text()); });
}
const wait = (p, ms) => p.waitForTimeout(ms);

const pageErrs = [], consoleErrs = [];
// benigno em dev: firebasejs bloqueado + firebase.config.js 404 (ambos "Failed to load resource")
const consoleFatais = () => consoleErrs.filter((t) => !/Failed to load resource/i.test(t));

// ============================================================
// GRUPO A — carga normal, desktop 1280
// ============================================================
console.log("\nGRUPO A — carga normal (desktop 1280)");
let ctx = await novoContexto({ viewport: { width: 1280, height: 900 } });
let p = await ctx.newPage();
ligarErros(p, pageErrs, consoleErrs);
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => document.querySelectorAll(".vcompact").length > 0, null, { timeout: 8000 }).catch(() => {});
await wait(p, 900);

const nCards = await p.evaluate(() => document.querySelectorAll(".vcompact").length);
ok("A0 setup: 3 cards reais renderizados pelo template de producao", nCards === 3);

// ---- Peca 5: contagem viva ----
const cont = await p.evaluate(() => {
  var c = document.getElementById("contagem");
  var tr = c.querySelector(".cont-tr");
  var t = tr ? getComputedStyle(tr).transform : "";
  var m = /matrix\([^)]*,\s*(-?\d+\.?\d*)\)/.exec(t);
  return {
    hidden: c.hidden, viva: c.hasAttribute("data-viva"),
    temDot: !!c.querySelector(".cont-dot"),
    cols: c.querySelectorAll(".cont-col").length,
    digito: tr ? tr.getAttribute("data-d") : null,
    ty: m ? parseFloat(m[1]) : null,
    dotAnim: c.querySelector(".cont-dot") ? getComputedStyle(c.querySelector(".cont-dot")).animationName : "",
    label: c.textContent,
  };
});
ok("5 contagem visivel com dot + odometro (N=3 => 1 coluna, digito 3)", !cont.hidden && cont.viva && cont.temDot && cont.cols === 1 && cont.digito === "3");
ok("5 odometro rolou ate o digito final (translateY ~ -54px)", cont.ty !== null && Math.abs(cont.ty - -54) < 2);
ok("5 dot respira em loop (animation contbreathe)", cont.dotAnim === "contbreathe");
ok("5 label textual preservado ('vagas abertas agora')", /vagas abertas agora/.test(cont.label));
await p.locator(".hero__in").screenshot({ path: SHOTS + "/p5-contagem.png" });

// ---- Peca 2: costura no hover ----
const stitchRest = await p.evaluate(() => {
  var cards = document.querySelectorAll(".vcompact");
  var comStitch = Array.prototype.every.call(cards, (c) => !!c.querySelector(".stitch rect"));
  var op = getComputedStyle(document.querySelector(".stitch rect")).opacity;
  return { comStitch, op: parseFloat(op) };
});
ok("2 todo card tem o overlay .stitch rect", stitchRest.comStitch);
ok("2 em repouso o pontilhado esta invisivel (opacity 0)", stitchRest.op === 0);
await p.locator(".vcompact").first().hover();
await wait(p, 200);
const stitchHover = await p.evaluate(() => {
  var rect = document.querySelector(".vcompact:hover .stitch rect");
  if (!rect) return { visivel: false, anim: "" };
  return { visivel: parseFloat(getComputedStyle(rect).opacity) > 0.5, anim: getComputedStyle(rect).animationName };
});
ok("2 no hover o pontilhado aparece e caminha (animation vmarch)", stitchHover.visivel && stitchHover.anim === "vmarch");
await p.locator(".vcompact").first().screenshot({ path: SHOTS + "/p2-stitch-hover.png" });
await p.mouse.move(1, 1);

// ---- Peca 8: sheen no marcador ----
const sheenEstrut = await p.evaluate(() => {
  var m = document.querySelector(".hero h1 .marca");
  var sheen = document.getElementById("heroSheen");
  var zVerbo = getComputedStyle(m.querySelector(".verbo")).zIndex;
  var zSheenbox = getComputedStyle(m.querySelector(".sheenbox")).zIndex;
  return { temSheenbox: !!m.querySelector(".sheenbox"), temSheen: !!sheen, zVerbo, zSheenbox };
});
ok("8 marcador tem sheenbox + sheen, verbo (z1) acima do sheen (z0)", sheenEstrut.temSheenbox && sheenEstrut.temSheen && sheenEstrut.zVerbo === "1" && sheenEstrut.zSheenbox === "0");
// captura um sweep REAL: espera o proximo swap do trio (intervalo 3500ms) e o brilho anima.
const sweepFired = await p.waitForFunction(() => document.getElementById("heroSheen").getAnimations().length > 0, null, { timeout: 6000 }).then(() => true).catch(() => false);
ok("8 na troca do verbo o sheen varre (WAAPI ativa no #heroSheen)", sweepFired);
await p.locator(".hero h1").screenshot({ path: SHOTS + "/p8-sheen.png" });

// ---- Peca 3: tingimento na selecao (DISC), sessao dedicada ----
async function abrirFicha() {
  await p.locator(".vcompact").first().click();
  await wait(p, 250);
  await p.click("#vpCta");
  await wait(p, 250);
}
async function fecharTudo() {
  await p.evaluate(() => {
    var d = document.getElementById("dlgCandidatura"); if (d.open) d.close();
    var vp = document.getElementById("vagapage"); vp.classList.remove("on"); vp.hidden = true;
    document.body.classList.remove("vp-lock");
  });
  await wait(p, 150);
}
async function preencherP1a() { await p.evaluate(() => { document.getElementById("ci-nome").value = "Maria Silva"; document.getElementById("ci-nasc").value = "1992-04-12"; }); }
async function preencherP1b() {
  await p.evaluate(() => {
    document.getElementById("ci-cep").value = "89100-000";
    document.getElementById("ci-rua").value = "Rua das Flores, 100";
    document.getElementById("ci-bairro").value = "Centro";
    document.getElementById("ci-cidade").value = "Indaial, SC";
    document.getElementById("ci-nac").value = "Brasileira";
    document.getElementById("ci-nat").value = "Indaial, SC";
    document.getElementById("ci-zap").value = "(47) 9 8812-4407";
    document.getElementById("ci-mail").value = "maria@x.com";
  });
}
async function preencherP5() {
  await p.evaluate(() => { document.getElementById("ci-pret").value = "2500,00"; document.querySelector('#chips-vem .chip[data-val="carro"]').click(); });
}
async function irAteDisc() {
  await abrirFicha();
  await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
  await preencherP1b(); await p.click("#candPrim"); await wait(p, 300); // -> cp2
  await p.click("#candPrim"); await wait(p, 300);                       // -> cp3
  await p.click("#btnPular"); await wait(p, 350);                       // -> cp4 (DISC)
}

console.log("\n  peca 3 (tingimento no DISC)");
await irAteDisc();
// dispatch sincrono: le a origem --mx/--my ANTES do auto-advance de 250ms
const dye = await p.evaluate(() => {
  var btn = document.querySelector("#discCard .disc-opt");
  var r = btn.getBoundingClientRect();
  btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: r.left + 40, clientY: r.top + 22 }));
  return { hasMost: btn.classList.contains("most"), mx: btn.style.getPropertyValue("--mx"), my: btn.style.getPropertyValue("--my"), temDye: !!btn.querySelector(".dye") };
});
ok("3 opcao marcada 'most' ganha o dye e a origem --mx/--my do clique", dye.hasMost && dye.temDye && dye.mx !== "" && dye.my !== "");
await wait(p, 450); // avanca pro estagio 'menos'; a opcao 'mais' fica travada e ja tingida
const dyeFill = await p.evaluate(() => {
  var locked = document.querySelector("#discCard .disc-opt.most .dye");
  return locked ? getComputedStyle(locked).clipPath : "";
});
ok("3 o dye inunda a opcao selecionada (clip-path circle preenchido, nao 0%)", /circle/.test(dyeFill) && !/circle\(0/.test(dyeFill));
await p.locator("#dlgCandidatura").screenshot({ path: SHOTS + "/p3-tingimento.png" });
await fecharTudo();

// ============================================================
// FLUXO COMPLETO (pecas 6, 4, 7) + candidatura inteira funciona
// ============================================================
console.log("\n  fluxo completo da candidatura (pecas 6 stepper / 4 tear / 7 cerimonia)");
await abrirFicha();
// Peca 6: stepper rail presente e no estado inicial
let stp = await p.evaluate(() => {
  var bar = document.getElementById("stepBar");
  var nodes = bar.querySelectorAll(".stp-node"), conns = bar.querySelectorAll(".stp-conn");
  return { nNodes: nodes.length, nConns: conns.length, node0now: nodes[0].classList.contains("now"), node0done: nodes[0].classList.contains("done"), overflow: bar.scrollWidth > bar.clientWidth + 1 };
});
ok("6 rail com 6 nos + 5 conectores", stp.nNodes === 6 && stp.nConns === 5);
ok("6 no 1 comeca como 'atual' (aro), nenhum concluido ainda", stp.node0now && !stp.node0done);
ok("6 rail nao transborda o cabecalho do dialog", !stp.overflow);

await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await preencherP1b(); await p.click("#candPrim"); await wait(p, 350); // -> cp2 (Etapa 2)
stp = await p.evaluate(() => {
  var nodes = document.querySelectorAll("#stepBar .stp-node");
  return { node0done: nodes[0].classList.contains("done"), node1now: nodes[1].classList.contains("now"), conn0fill: document.querySelectorAll("#stepBar .stp-conn")[0].classList.contains("fill") };
});
ok("6 ao avancar, no 1 vira 'concluido' (check), no 2 'atual', conector 1 preenche", stp.node0done && stp.node1now && stp.conn0fill);
await p.click("#candPrim"); await wait(p, 300); // -> cp3 (Curriculo)

// Peca 4: tear no upload
await p.setInputFiles("#cvInput", smallPdf);
await wait(p, 250);
const tecendo = await p.evaluate(() => {
  var prog = document.getElementById("cvProg");
  return { progOn: prog.classList.contains("on"), fillW: parseFloat(getComputedStyle(document.getElementById("cvFill")).width) >= 0, shuttleVis: parseFloat(getComputedStyle(document.getElementById("cvShuttle")).opacity) > 0 };
});
ok("4 durante o tear a barra aparece (cvProg.on) com a lancadeira visivel", tecendo.progOn && tecendo.shuttleVis);
await p.locator("#dlgCandidatura").screenshot({ path: SHOTS + "/p4-tear.png" });
await wait(p, 1700); // deixa a lancadeira concluir e assentar no chip
const assentou = await p.evaluate(() => ({
  chip: document.getElementById("cvChip").classList.contains("on"),
  okDrawn: document.getElementById("cvOk").classList.contains("drawn"),
  progOff: !document.getElementById("cvProg").classList.contains("on"),
}));
ok("4 assenta no chip com o check desenhado e a barra some", assentou.chip && assentou.okDrawn && assentou.progOff);
await p.locator("#dlgCandidatura").screenshot({ path: SHOTS + "/p4-chip.png" });
await p.click("#candPrim"); await wait(p, 400); // -> cp4 (DISC)

// completa o DISC (clica 1a 'mais' e 1a 'menos' disponiveis por bloco)
for (let i = 0; i < 8; i++) {
  await p.locator("#discCard .disc-opt:not([disabled])").first().click(); await wait(p, 320);
  await p.locator("#discCard .disc-opt:not([disabled])").first().click(); await wait(p, 400);
}
await wait(p, 250);
const discFeito = await p.evaluate(() => document.getElementById("discDone").classList.contains("on"));
ok("A DISC completo (8 blocos mais/menos) => tela 'Pronto!'", discFeito);
// captura o stepper num passo do meio (nos concluidos com check + atual com aro)
await p.locator(".cand__stepper").screenshot({ path: SHOTS + "/p6-stepper.png" });
await p.click("#candPrim"); await wait(p, 400); // -> cp5 (Adicionais)
await preencherP5(); await p.click("#candPrim"); await wait(p, 400); // -> cp6 (Revisao)
const naRevisao = await p.evaluate(() => document.getElementById("stepCount").textContent);
ok("A chega na Revisao (Etapa 6 de 6)", /Etapa 6 de 6/.test(naRevisao));
await p.click("#cLgpd"); await wait(p, 150);
await p.click("#candPrim"); // envia (stub commit resolve) -> cerimonia
await wait(p, 700);
// Peca 7: cerimonia com ECG desenhando antes do texto
const cerMid = await p.evaluate(() => {
  var line = document.getElementById("cerLine");
  var off = parseFloat(getComputedStyle(line).strokeDashoffset);
  var len = line.getTotalLength();
  return { cerOn: document.getElementById("cer").classList.contains("on"), temEcg: !!line, drawing: off > 1 && off <= len + 1 };
});
ok("7 cerimonia exibida com a linha de ECG (nao ha mais anel/check)", cerMid.cerOn && cerMid.temEcg);
await p.locator(".cer").screenshot({ path: SHOTS + "/p7-cerimonia.png" });
await wait(p, 1400); // ECG (900ms) + cascata do texto
const cerFim = await p.evaluate(() => {
  var line = document.getElementById("cerLine");
  var off = parseFloat(getComputedStyle(line).strokeDashoffset);
  var tOp = parseFloat(getComputedStyle(document.getElementById("cerT")).opacity);
  return { desenhado: off <= 1, textoVisivel: tOp > 0.9 };
});
ok("7 ao fim o ECG esta 100% desenhado e o texto subiu (visivel)", cerFim.desenhado && cerFim.textoVisivel);
await p.locator(".cer").screenshot({ path: SHOTS + "/p7-cerimonia-fim.png" });
await ctx.close();

// ============================================================
// GRUPO B — movimento reduzido (desktop 1280, reducedMotion:reduce)
// ============================================================
console.log("\nGRUPO B — movimento reduzido (estados finais instantaneos)");
ctx = await novoContexto({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
p = await ctx.newPage();
ligarErros(p, pageErrs, consoleErrs);
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => document.querySelectorAll(".vcompact").length > 0, null, { timeout: 8000 }).catch(() => {});
await wait(p, 700);
const rmLanding = await p.evaluate(() => {
  var running = document.getAnimations().filter((a) => a.playState === "running").length;
  var tr = document.querySelector("#contagem .cont-tr");
  var t = tr ? getComputedStyle(tr).transform : "";
  var m = /matrix\([^)]*,\s*(-?\d+\.?\d*)\)/.exec(t);
  var dotAnim = getComputedStyle(document.querySelector("#contagem .cont-dot")).animationName;
  return { running, ty: m ? parseFloat(m[1]) : null, dotAnim };
});
ok("B nenhuma animacao rodando na landing sob movimento reduzido", rmLanding.running === 0);
ok("B contagem ja no estado final (digito 3, translateY -54) sem rolar", rmLanding.ty !== null && Math.abs(rmLanding.ty - -54) < 2);
ok("B respiro do dot desligado (animation none)", rmLanding.dotAnim === "none");

// dialog sob reduzido: tear vai direto ao chip, cerimonia ja desenhada
p2b: {
  await p.locator(".vcompact").first().click(); await wait(p, 200);
  await p.click("#vpCta"); await wait(p, 200);
  await p.evaluate(() => { document.getElementById("ci-nome").value = "Ana"; document.getElementById("ci-nasc").value = "1990-01-01"; });
  await p.click("#candPrim"); await wait(p, 250);
  await p.evaluate(() => {
    document.getElementById("ci-cep").value = "89100-000"; document.getElementById("ci-rua").value = "Rua A, 1";
    document.getElementById("ci-bairro").value = "Centro"; document.getElementById("ci-cidade").value = "Indaial, SC";
    document.getElementById("ci-nac").value = "Brasileira"; document.getElementById("ci-nat").value = "Indaial, SC";
    document.getElementById("ci-zap").value = "(47) 9 8812-4407"; document.getElementById("ci-mail").value = "ana@x.com";
  });
  await p.click("#candPrim"); await wait(p, 250); // cp2
  await p.click("#candPrim"); await wait(p, 250); // cp3
  await p.setInputFiles("#cvInput", smallPdf); await wait(p, 250);
  const rmTear = await p.evaluate(() => ({ chip: document.getElementById("cvChip").classList.contains("on"), okDrawn: document.getElementById("cvOk").classList.contains("drawn"), progOff: !document.getElementById("cvProg").classList.contains("on") }));
  ok("B tear instantaneo: chip + check ja assentados, sem barra tecendo", rmTear.chip && rmTear.okDrawn && rmTear.progOff);
  await p.click("#candPrim"); await wait(p, 300); // cp4
  for (let i = 0; i < 8; i++) { await p.locator("#discCard .disc-opt:not([disabled])").first().click(); await wait(p, 320); await p.locator("#discCard .disc-opt:not([disabled])").first().click(); await wait(p, 400); }
  await wait(p, 150);
  await p.click("#candPrim"); await wait(p, 300); // cp5
  await p.evaluate(() => { document.getElementById("ci-pret").value = "2500,00"; document.querySelector('#chips-vem .chip[data-val="carro"]').click(); });
  await p.click("#candPrim"); await wait(p, 300); // cp6
  await p.click("#cLgpd"); await wait(p, 120);
  await p.click("#candPrim"); await wait(p, 300);
  const rmCer = await p.evaluate(() => {
    var line = document.getElementById("cerLine");
    var off = parseFloat(getComputedStyle(line).strokeDashoffset);
    return { cerOn: document.getElementById("cer").classList.contains("on"), desenhado: off <= 1, textoVisivel: parseFloat(getComputedStyle(document.getElementById("cerT")).opacity) > 0.9 };
  });
  ok("B cerimonia instantanea: ECG ja 100% desenhado e texto visivel", rmCer.cerOn && rmCer.desenhado && rmCer.textoVisivel);
}
await ctx.close();

// ============================================================
// GRUPO C — overflow horizontal = 0 (mobile 430 e desktop 1280)
// ============================================================
console.log("\nGRUPO C — overflow horizontal (mobile 430 e desktop 1280)");
for (const vp of [{ w: 430, h: 900, label: "mobile 430" }, { w: 1280, h: 900, label: "desktop 1280" }]) {
  const c = await novoContexto({ viewport: { width: vp.w, height: vp.h } });
  const pg = await c.newPage();
  ligarErros(pg, pageErrs, consoleErrs);
  await pg.goto(URL, { waitUntil: "load" });
  await pg.waitForFunction(() => document.querySelectorAll(".vcompact").length > 0, null, { timeout: 8000 }).catch(() => {});
  await wait(pg, 500);
  const landOv = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("C " + vp.label + ": landing sem overflow horizontal", landOv <= 0);
  // com o dialog aberto (stepper rail visivel)
  await pg.locator(".vcompact").first().click(); await wait(pg, 200);
  await pg.click("#vpCta"); await wait(pg, 250);
  const dlgOv = await pg.evaluate(() => {
    var bodyOv = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    var bar = document.getElementById("stepBar");
    return { bodyOv, railOv: bar.scrollWidth - bar.clientWidth };
  });
  ok("C " + vp.label + ": dialog aberto sem overflow (body)", dlgOv.bodyOv <= 0);
  ok("C " + vp.label + ": rail do stepper cabe (sem overflow)", dlgOv.railOv <= 1);
  if (vp.w === 430) await pg.locator(".cand__stepper").screenshot({ path: SHOTS + "/p6-stepper-mobile.png" });
  await c.close();
}

// ============================================================
// GRUPO E — seletor de pais (variante A) + canal preferido de aviso
// ============================================================
console.log("\nGRUPO E — seletor de pais no WhatsApp + canal preferido");
ctx = await novoContexto({ viewport: { width: 1280, height: 900 } });
p = await ctx.newPage();
ligarErros(p, pageErrs, consoleErrs);
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => document.querySelectorAll(".vcompact").length > 0, null, { timeout: 8000 }).catch(() => {});
await wait(p, 700);
// spy do funil de recebida (mesma costura __testMode do site-cand-verify): captura payload,
// se o /mail entrou no commit e se o /waMsg foi enfileirado.
await p.evaluate(() => {
  window.__spy = { sets: [], mails: [], waMsgs: [] };
  window.__testMode = {
    upload: function () { return Promise.resolve(); },
    commit: function (writes) {
      var cand = writes.find(function (w) { return w.col === "candidaturas"; });
      var mail = writes.find(function (w) { return w.col === "mail"; });
      if (cand) window.__spy.sets.push(cand.data);
      window.__spy.mails.push(mail ? 1 : 0);
      return Promise.resolve();
    },
    waMsg: function () { window.__spy.waMsgs.push(1); return Promise.resolve(); },
  };
});
const limparSpy = () => p.evaluate(() => { window.__spy = { sets: [], mails: [], waMsgs: [] }; });
const spy = () => p.evaluate(() => window.__spy);

async function preencherEndereco(mail) {
  await p.evaluate((m) => {
    document.getElementById("ci-cep").value = "89100-000";
    document.getElementById("ci-rua").value = "Rua A, 1";
    document.getElementById("ci-bairro").value = "Centro";
    document.getElementById("ci-cidade").value = "Indaial, SC";
    document.getElementById("ci-nac").value = "Brasileira";
    document.getElementById("ci-nat").value = "Indaial, SC";
    document.getElementById("ci-mail").value = m;
  }, mail);
}
async function escolherPais(nome) {
  await p.click("#zapPrefix"); await wait(p, 180);
  await p.evaluate((nm) => { var li = Array.prototype.find.call(document.querySelectorAll("#zapList li"), function (l) { var n = l.querySelector(".nm"); return n && n.textContent === nm; }); if (li) li.click(); }, nome);
  await wait(p, 180);
}
async function escolherOutro(ddi) {
  await p.click("#zapPrefix"); await wait(p, 180);
  await p.evaluate(() => { var lo = document.querySelector("#zapList li.other"); if (lo) lo.click(); });
  await wait(p, 120);
  await p.fill("#zapDdi", ddi); await wait(p, 80);
  await p.click("#zapUsar"); await wait(p, 180);
}
async function enviarFluxo() {
  await p.click("#candPrim"); await wait(p, 300);            // cp1b -> cp2
  await p.click("#candPrim"); await wait(p, 300);            // cp2 -> cp3
  await p.click("#btnPular"); await wait(p, 350);            // cp3 -> cp4
  for (let i = 0; i < 8; i++) { await p.locator("#discCard .disc-opt:not([disabled])").first().click(); await wait(p, 320); await p.locator("#discCard .disc-opt:not([disabled])").first().click(); await wait(p, 400); }
  await wait(p, 200);
  await p.click("#candPrim"); await wait(p, 350);            // cp4 -> cp5
  await p.evaluate(() => { document.getElementById("ci-pret").value = "2500,00"; document.querySelector('#chips-vem .chip[data-val="carro"]').click(); });
  await p.click("#candPrim"); await wait(p, 350);            // cp5 -> cp6
  await p.click("#cLgpd"); await wait(p, 150);
  await p.click("#candPrim"); await wait(p, 600);            // envia
}

// ---- E1: abre, busca, seleciona Haiti (+509) ----
console.log("\n  E1 seletor abre / busca / Haiti");
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300); // -> cp1b
await preencherEndereco("cand@x.com");
const fechado = await p.evaluate(() => ({ dial: document.querySelector("#zapWrap .dial").textContent, temFlag: !!document.querySelector("#zapWrap .pf-flag .flagsvg") }));
ok("E1 prefixo nasce Brasil (+55) com bandeira desenhada (SVG)", fechado.dial === "+55" && fechado.temFlag);
await p.locator("#cf-zap").screenshot({ path: SHOTS + "/p-zap-fechado.png" });
await p.click("#zapPrefix"); await wait(p, 250);
const aberto = await p.evaluate(() => ({ on: document.getElementById("zapPop").classList.contains("on"), itens: document.querySelectorAll("#zapList li").length }));
ok("E1 dropdown abre com a lista curada (21 paises + Outro pais)", aberto.on && aberto.itens === 22);
await p.locator("#dlgCandidatura").screenshot({ path: SHOTS + "/p-zap-aberto.png" });
await p.fill("#zapBusca", "hai"); await wait(p, 200);
const busca = await p.evaluate(() => {
  var vis = Array.prototype.filter.call(document.querySelectorAll("#zapList li"), function (l) { return l.style.display !== "none" && !l.classList.contains("other"); });
  return { n: vis.length, primeiro: vis[0] ? vis[0].querySelector(".nm").textContent : "" };
});
ok("E1 busca 'hai' filtra ate o Haiti", busca.n === 1 && busca.primeiro === "Haiti");
// tambem por codigo
await p.fill("#zapBusca", "351"); await wait(p, 150);
const buscaCod = await p.evaluate(() => { var vis = Array.prototype.filter.call(document.querySelectorAll("#zapList li"), function (l) { return l.style.display !== "none" && !l.classList.contains("other"); }); return vis.length === 1 && vis[0].querySelector(".nm").textContent === "Portugal"; });
ok("E1 busca por codigo '351' acha Portugal", buscaCod);
await p.fill("#zapBusca", ""); await wait(p, 100);
await p.evaluate(() => { var li = Array.prototype.find.call(document.querySelectorAll("#zapList li"), function (l) { var n = l.querySelector(".nm"); return n && n.textContent === "Haiti"; }); if (li) li.click(); });
await wait(p, 200);
const haiti = await p.evaluate(() => ({ dial: document.querySelector("#zapWrap .dial").textContent, popOff: !document.getElementById("zapPop").classList.contains("on") }));
ok("E1 escolher Haiti troca o prefixo pra +509 e fecha o dropdown", haiti.dial === "+509" && haiti.popOff);
await p.locator("#cf-zap").screenshot({ path: SHOTS + "/p-zap-haiti.png" });
// captura o canal segmentado
await p.locator("#cf-canal").screenshot({ path: SHOTS + "/p-canal-seg.png" });
await fecharTudo();

// ---- E2: validacao BR (10-11) vs internacional (6-12) ----
console.log("\n  E2 validacao BR vs internacional");
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await preencherEndereco("cand2@x.com");
await p.fill("#ci-zap", "479881"); await wait(p, 60);       // BR, 6 digitos -> invalido
await p.click("#candPrim"); await wait(p, 250);
let stv = await p.evaluate(() => ({ pane: ["cp1a", "cp1b", "cp2"].find(function (id) { return !document.getElementById(id).hidden; }), err: document.getElementById("cf-zap").classList.contains("err") }));
ok("E2 BR com 6 digitos e invalido (fica na cp1b, campo em erro)", stv.pane === "cp1b" && stv.err);
await p.fill("#ci-zap", "47988124407"); await wait(p, 60);  // BR, 11 digitos -> valido
await p.click("#candPrim"); await wait(p, 350);
stv = await p.evaluate(() => ["cp1a", "cp1b", "cp2"].find(function (id) { return !document.getElementById(id).hidden; }));
ok("E2 BR com 11 digitos e valido (avanca pra cp2)", stv === "cp2");
await fecharTudo();
// internacional: Haiti 5 (invalido) -> 8 (valido)
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await preencherEndereco("cand3@x.com");
await escolherPais("Haiti");
await p.fill("#ci-zap", "34567"); await wait(p, 60);        // 5 digitos -> invalido (min 6)
await p.click("#candPrim"); await wait(p, 250);
stv = await p.evaluate(() => ({ pane: ["cp1b", "cp2"].find(function (id) { return !document.getElementById(id).hidden; }), err: document.getElementById("cf-zap").classList.contains("err") }));
ok("E2 Haiti com 5 digitos e invalido (min 6)", stv.pane === "cp1b" && stv.err);
await p.fill("#ci-zap", "34567890"); await wait(p, 60);     // 8 digitos -> valido
await p.click("#candPrim"); await wait(p, 350);
stv = await p.evaluate(() => ["cp1b", "cp2"].find(function (id) { return !document.getElementById(id).hidden; }));
ok("E2 Haiti com 8 digitos e valido (avanca)", stv === "cp2");
await fecharTudo();

// ---- E3: payload telefone + canalPreferido + recebida honrando o canal ----
console.log("\n  E3 payload telefone/canal + recebida honrando o canal");
// E3a Haiti + ambos
await limparSpy();
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await preencherEndereco("haiti@x.com");
await escolherPais("Haiti");
await p.fill("#ci-zap", "34567890");
await enviarFluxo();
let s = await spy();
ok("E3a Haiti/ambos: telefone gravado = '+509 34567890'", s.sets[0] && s.sets[0].telefone === "+509 34567890");
ok("E3a canalPreferido = 'ambos', e /mail + /waMsg os dois", s.sets[0] && s.sets[0].canalPreferido === "ambos" && s.mails[0] === 1 && s.waMsgs.length === 1);
await fecharTudo();
// E3b BR + so email
await limparSpy();
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await preencherEndereco("bremail@x.com");
await p.fill("#ci-zap", "47988124407");
await p.click('#seg-canal button[data-val="email"]'); await wait(p, 80);
await enviarFluxo();
s = await spy();
ok("E3b BR: telefone gravado como hoje (local, sem +55)", s.sets[0] && s.sets[0].telefone === "47988124407");
ok("E3b canalPreferido = 'email': /mail SIM, /waMsg NAO", s.sets[0] && s.sets[0].canalPreferido === "email" && s.mails[0] === 1 && s.waMsgs.length === 0);
await fecharTudo();
// E3c BR + so whatsapp
await limparSpy();
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await preencherEndereco("brzap@x.com");
await p.fill("#ci-zap", "47988124407");
await p.click('#seg-canal button[data-val="whatsapp"]'); await wait(p, 80);
await enviarFluxo();
s = await spy();
ok("E3c canalPreferido = 'whatsapp': /mail NAO, /waMsg SIM", s.sets[0] && s.sets[0].canalPreferido === "whatsapp" && s.mails[0] === 0 && s.waMsgs.length === 1);
await fecharTudo();
// E3d Outro pais (DDI manual 44) + ambos
await limparSpy();
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await preencherEndereco("outro@x.com");
await escolherOutro("44");
const outroDial = await p.evaluate(() => document.querySelector("#zapWrap .dial").textContent);
ok("E3d Outro pais aplica DDI manual (+44) com o globo", outroDial === "+44");
await p.fill("#ci-zap", "2079460958");
await p.locator("#dlgCandidatura").screenshot({ path: SHOTS + "/p-zap-outro-aplicado.png" });
await enviarFluxo();
s = await spy();
ok("E3d Outro pais grava telefone '+44 2079460958'", s.sets[0] && s.sets[0].telefone === "+44 2079460958");
await fecharTudo();
// screenshot do painel "Outro pais" aberto
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await p.click("#zapPrefix"); await wait(p, 200);
await p.evaluate(() => { var lo = document.querySelector("#zapList li.other"); if (lo) lo.click(); });
await wait(p, 200);
await p.locator("#dlgCandidatura").screenshot({ path: SHOTS + "/p-zap-outro.png" });
await fecharTudo();
await ctx.close();

// ---- E-mobile: dropdown vira sheet de baixo (position fixed) ----
console.log("\n  E-mobile sheet + E-rm reduced-motion");
ctx = await novoContexto({ viewport: { width: 430, height: 880 } });
p = await ctx.newPage();
ligarErros(p, pageErrs, consoleErrs);
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => document.querySelectorAll(".vcompact").length > 0, null, { timeout: 8000 }).catch(() => {});
await wait(p, 500);
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await p.click("#zapPrefix"); await wait(p, 300);
const sheet = await p.evaluate(() => {
  var pop = document.getElementById("zapPop"), cs = getComputedStyle(pop);
  var handleVis = getComputedStyle(document.querySelector("#zapPop .phone__handle")).display !== "none";
  var bd = document.getElementById("zapBackdrop");
  return { fixed: cs.position === "fixed", bottom: cs.bottom === "0px", handle: handleVis, backdropOn: bd.classList.contains("on"), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
ok("E-mobile dropdown vira sheet de baixo (fixed, bottom 0, alca + backdrop)", sheet.fixed && sheet.bottom && sheet.handle && sheet.backdropOn);
ok("E-mobile sheet aberto nao causa overflow horizontal", sheet.ov <= 0);
await p.locator("#dlgCandidatura").screenshot({ path: SHOTS + "/p-zap-sheet-mobile.png" });
await ctx.close();

// reduced-motion: pop abre sem animacao
ctx = await novoContexto({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
p = await ctx.newPage();
ligarErros(p, pageErrs, consoleErrs);
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => document.querySelectorAll(".vcompact").length > 0, null, { timeout: 8000 }).catch(() => {});
await wait(p, 500);
await abrirFicha();
await preencherP1a(); await p.click("#candPrim"); await wait(p, 300);
await p.click("#zapPrefix"); await wait(p, 200);
const rmPop = await p.evaluate(() => {
  var pop = document.getElementById("zapPop");
  var running = pop.getAnimations().filter(function (a) { return a.playState === "running"; }).length;
  return { on: pop.classList.contains("on"), running: running };
});
ok("E-rm dropdown abre e funciona sem animacao sob movimento reduzido", rmPop.on && rmPop.running === 0);
await ctx.close();

// ============================================================
// GRUPO D — zero pageerror / zero console.error fatal
// ============================================================
console.log("\nGRUPO D — erros de pagina/console");
console.log("  pageerrors:", pageErrs.length ? pageErrs : "nenhum");
console.log("  console.error benignos (firebasejs/config bloqueados):", consoleErrs.length);
if (consoleFatais().length) console.log("  console.error FATAIS:", consoleFatais());
ok("D zero pageerror (excecao JS)", pageErrs.length === 0);
ok("D zero console.error fatal (fora firebasejs/config 404)", consoleFatais().length === 0);

console.log("\n" + (FALHAS.length ? "RESULTADO: " + FALHAS.length + " falha(s) -> " + FALHAS.join(" | ") : "RESULTADO: TUDO OK"));
console.log("shots em:", SHOTS);
await browser.close();
if (servidorProprio) srv.close();
process.exit(FALHAS.length ? 1 : 0);
