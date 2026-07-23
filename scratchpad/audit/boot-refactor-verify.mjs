// Verifica o boot continuo REAL (v366): cortina unica, atualizacao 1a tela,
// retomada pos-reload e saida suave do acesso. Demo (config abortado), SW bloqueado.
import { chromium } from "playwright";

const URL = "http://localhost:8081/public/index.html";
const b = await chromium.launch();
const falhas = [];
let bootMarks = null; // marcos de instrumentacao (demo: head/appjs/revelado)
const ok = (cond, msg) => { if (!cond) falhas.push(msg); };

async function pagina(init) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, serviceWorkers: "block" });
  await ctx.route("**/firebase.config.js*", (r) => r.abort());
  await ctx.route("**gstatic.com**", (r) => r.abort());
  const p = await ctx.newPage();
  p.__erros = [];
  p.on("pageerror", (e) => p.__erros.push(String(e).slice(0, 160)));
  if (init) await p.addInitScript(init);
  await p.goto(URL, { waitUntil: "domcontentloaded" });
  return { ctx, p };
}

// ---------- A. atualizacao e a PRIMEIRA tela (sinal local) ----------
{
  const { ctx, p } = await pagina(() => {
    localStorage.setItem("fiopulse:updatePendente", "1");
    localStorage.setItem("fiopulse:manterConectado", "1");
  });
  const a = await p.evaluate(() => ({
    classe: document.documentElement.classList.contains("splash-atualizando"),
    upVisivel: getComputedStyle(document.querySelector(".splash-up")).opacity,
    ecgOculto: getComputedStyle(document.querySelector(".splash-pl__ecg")).display,
    splashVisivel: getComputedStyle(document.getElementById("splash")).display,
    min: window.__splashMin,
  }));
  ok(a.classe, "A: html sem splash-atualizando no 1o frame");
  ok(Number(a.upVisivel) === 1, `A: bloco de atualizacao invisivel (${a.upVisivel})`);
  ok(a.ecgOculto === "none", "A: ECG deveria sumir no estado atualizando");
  ok(a.splashVisivel !== "none", "A: cortina fora de cena");
  ok(a.min === 0, "A: __splashMin devia ser 0");
  await p.screenshot({ path: "scratchpad/audit/out/bootref-primeira-tela.png" });

  // maquinaria: mostrarTelaAtualizacao morfa A MESMA cortina; barra monotonica; fecho
  // recarrega 1x, grava upRetomada (timestamp, iOS-safe) e LIMPA o updatePendente.
  // __upReset primeiro: devolve a cortina a um estado VISIVEL (o hideSplash demo pode ja
  // ter comecado a despedida) pra o apply nao cair no ramo de "update tardio".
  const m = await p.evaluate(async () => {
    window.__upReset();
    let reloads = 0;
    window.__swReload = () => { reloads++; };
    aplicarAtualizacaoBoot(null);
    await new Promise((r) => setTimeout(r, 300));
    const f1 = window.__upDbg().frac;
    progressoAtualizacao("installed");
    await new Promise((r) => setTimeout(r, 400));
    const f2 = window.__upDbg().frac;
    const mesmoEl = document.getElementById("splash").classList.contains("splash--atualizando");
    const semTelaPropria = !document.getElementById("up-screen");
    swRecarregarUmaVez();
    await new Promise((r) => setTimeout(r, 2600));
    const upRet = localStorage.getItem("fiopulse:upRetomada");
    return {
      f1, f2, mesmoEl, semTelaPropria, reloads,
      upRetSet: upRet != null && Number(upRet) > 0,
      pendente: localStorage.getItem("fiopulse:updatePendente"),
      pct: document.querySelector(".splash-up__pct").textContent,
    };
  });
  ok(m.mesmoEl && m.semTelaPropria, "A: atualizacao nao esta na cortina (ou up-screen renasceu)");
  ok(m.f2 >= m.f1 && m.f2 > 0, `A: barra nao monotonica (${m.f1} -> ${m.f2})`);
  ok(m.reloads === 1, `A: reload chamado ${m.reloads}x (esperado 1)`);
  ok(m.upRetSet, "A: upRetomada nao gravado (timestamp) no reload");
  ok(m.pendente === null, "A: updatePendente nao foi limpo no apply");
  ok(m.pct === "100%", `A: fecho sem 100% (${m.pct})`);
  if (p.__erros.length) falhas.push("A pageErrors: " + p.__erros.join(" | "));
  await ctx.close();
}

// ---------- B. retomada pos-reload: ATO UNICO, nasce na tela de atualizacao no FIM ----------
{
  const { ctx, p } = await pagina(() => {
    localStorage.setItem("fiopulse:upRetomada", String(Date.now()));
    localStorage.setItem("fiopulse:manterConectado", "1");
  });
  const r = await p.evaluate(() => ({
    fim: document.documentElement.classList.contains("splash-atualizando-fim"),
    atualizando: document.documentElement.classList.contains("splash-atualizando"),
    upRetFlag: window.__upRetomada === true,
    splashVisivel: getComputedStyle(document.getElementById("splash")).display,
    upVisivel: getComputedStyle(document.querySelector(".splash-up")).opacity,
    // ATO UNICO: a MESMA tela de atualizacao (sem ECG batendo, sem "Carregando..."), nunca
    // um terceiro ato "FioPulse quieto". O estado atualizando ja esconde ECG e mensagem.
    ecgOculto: getComputedStyle(document.querySelector(".splash-pl__ecg")).display,
    msgOculto: getComputedStyle(document.querySelector(".splash-sk__msg")).display,
  }));
  ok(r.fim, "B: retomada nao nasceu em splash-atualizando-fim (ato unico)");
  ok(r.atualizando, "B: retomada devia estar no estado atualizando");
  ok(r.upRetFlag, "B: window.__upRetomada nao setado pelo head");
  ok(r.splashVisivel !== "none", "B: cortina fora de cena na retomada");
  ok(Number(r.upVisivel) === 1, `B: bloco de atualizacao invisivel na retomada (${r.upVisivel})`);
  ok(r.ecgOculto === "none", "B: ECG deveria sumir na retomada (sem segundo pulso)");
  ok(r.msgOculto === "none", "B: 'Carregando...' deveria sumir na retomada");
  if (p.__erros.length) falhas.push("B pageErrors: " + p.__erros.join(" | "));
  await ctx.close();
}

// ---------- C. caminho normal: costura da despedida + saida suave do acesso ----------
{
  const { ctx, p } = await pagina(() => { localStorage.setItem("fiopulse:manterConectado", "1"); });
  await p.waitForFunction(() => typeof login === "function" && state?.users?.length, null, { timeout: 8000 });
  const c = await p.evaluate(async () => {
    // demo: sessao viva estacionada na escolha; a cortina revela COM a costura
    _changelogChecado = true;
    const u = state.users.find((x) => x.role === "admin");
    state.currentUserId = u.id;
    window.__escolhaPortal = true;
    mostrarAcesso();
    window.hideSplash();
    await new Promise((r) => setTimeout(r, 700));
    const brand = document.querySelector(".acesso__brand");
    const costurou = (brand.getAnimations?.() || []).length > 0 || getComputedStyle(brand).opacity !== "";
    const anims = document.querySelectorAll(".acesso__half").length;
    const splashSaindo = document.getElementById("splash").classList.contains("splash--out");
    // toque no card do MESMO portal -> entrarPortalComSessao -> saida em fade
    document.getElementById("acesso-gestor").click();
    await new Promise((r) => setTimeout(r, 60));
    const acDurante = document.getElementById("acesso");
    const virouOverlay = acDurante.style.position === "fixed";
    await new Promise((r) => setTimeout(r, 420));
    return {
      costurou, anims, splashSaindo, virouOverlay,
      acessoEscondido: document.getElementById("acesso").classList.contains("hidden"),
      estiloLimpo: document.getElementById("acesso").style.position === "",
      appVisivel: !document.getElementById("app").classList.contains("hidden"),
    };
  });
  ok(c.splashSaindo, "C: cortina nao entrou em despedida");
  ok(c.virouOverlay, "C: acesso nao virou overlay na saida (corte seco?)");
  ok(c.acessoEscondido && c.estiloLimpo, "C: acesso nao fechou/limpou apos o fade");
  ok(c.appVisivel, "C: app nao ficou visivel");
  // Instrumentacao honesta: os marcos do boot (demo tem head/appjs/revelado; firebaseReady
  // e authResolved so aparecem em modo Firebase real). Impressos no fim pra decidir cortes.
  bootMarks = await p.evaluate(() => (typeof window.__bootDbg === "function" ? window.__bootDbg() : {}));
  ok(bootMarks && typeof bootMarks.appjs === "number", "C: __bootMarks.appjs ausente (instrumentacao)");
  ok(bootMarks && typeof bootMarks.revelado === "number", "C: __bootMarks.revelado ausente (instrumentacao)");
  if (p.__erros.length) falhas.push("C pageErrors: " + p.__erros.join(" | "));
  await ctx.close();
}

// ---------- D. fonte nunca pula: preload no index + rota persistente do SW ----------
{
  // D1. Preloads de fonte presentes e com crossorigin (roda com SW bloqueado, tanto faz).
  const { ctx, p } = await pagina();
  const d = await p.evaluate(() => {
    const links = [...document.querySelectorAll('link[rel="preload"][as="font"]')];
    const byHref = (frag) => links.find((l) => (l.getAttribute("href") || "").includes(frag));
    const mich = byHref("michroma-400-latin.woff2");
    const pop = byHref("poppins-600-latin.woff2");
    return {
      michPreload: !!mich, michCross: !!mich && mich.hasAttribute("crossorigin"), michType: mich && mich.getAttribute("type"),
      popPreload: !!pop, popCross: !!pop && pop.hasAttribute("crossorigin"),
    };
  });
  ok(d.michPreload, "D: preload da fonte Michroma ausente no index");
  ok(d.michCross, "D: preload Michroma sem crossorigin (baixaria em dobro / nao casa com o uso)");
  ok(d.michType === "font/woff2", `D: preload Michroma com type errado (${d.michType})`);
  ok(d.popPreload, "D: preload da Poppins 600 (fallback do wordmark) ausente");
  ok(d.popCross, "D: preload Poppins 600 sem crossorigin");
  if (p.__erros.length) falhas.push("D pageErrors: " + p.__erros.join(" | "));
  await ctx.close();
}
{
  // D2. Rota de fonte servindo do cache PERSISTENTE via SW (fetch interceptado 2x).
  // Contexto COM service worker (o pagina() bloqueia SW; aqui deixamos rodar de verdade).
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 } });
  await ctx.route("**/firebase.config.js*", (r) => r.abort());
  await ctx.route("**gstatic.com**", (r) => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(String(e).slice(0, 160)));
  await p.goto(URL, { waitUntil: "domcontentloaded" });
  let controlou = true;
  try {
    await p.waitForFunction(() => navigator.serviceWorker && !!navigator.serviceWorker.controller, null, { timeout: 10000 });
  } catch (e) { controlou = false; }
  ok(controlou, "D2: service worker nao assumiu o controle (cache de fonte nao testavel)");
  if (controlou) {
    const s = await p.evaluate(async () => {
      const fontUrl = "fonts/michroma-400-latin.woff2";
      const r1 = await fetch(fontUrl, { mode: "cors" }); // 1a busca: semeia o FONT_CACHE via SW
      await new Promise((res) => setTimeout(res, 80));
      const keys = await caches.keys();
      const fontCacheName = keys.find((k) => /fontes/.test(k));
      const verName = keys.find((k) => /^fiopulse-v\d/.test(k));
      const fc = fontCacheName ? await caches.open(fontCacheName) : null;
      const naFonte = fc ? !!(await fc.match(fontUrl)) : false;
      const vc = verName ? await caches.open(verName) : null;
      const noVersionado = vc ? !!(await vc.match(fontUrl)) : false;
      const r2 = await fetch(fontUrl, { mode: "cors" }); // 2a busca: servida do cache persistente
      return { keys, r1ok: r1.ok, r2ok: r2.ok, temFontCache: !!fontCacheName, naFonte, noVersionado };
    });
    ok(s.temFontCache, `D2: cache persistente de fontes nao criado (${s.keys.join(", ")})`);
    ok(s.naFonte, "D2: fonte nao foi semeada no cache persistente");
    ok(!s.noVersionado, "D2: fonte vazou pro cache versionado (seria purgada no activate)");
    ok(s.r1ok && s.r2ok, "D2: rota de fonte nao serviu 200 nas 2 buscas");
  }
  if (erros.length) falhas.push("D2 pageErrors: " + erros.join(" | "));
  await ctx.close();
}

await b.close();
if (bootMarks) console.log("boot marks (demo, ms rel. head):", JSON.stringify(bootMarks));
if (falhas.length) { console.error("FALHOU:\n- " + falhas.join("\n- ")); process.exit(1); }
console.log("BOOT CONTINUO OK (A primeira tela + maquinaria, B retomada ato unico (atualizando-fim), C costura + saida suave + marcos, D preload + cache persistente de fonte)");
