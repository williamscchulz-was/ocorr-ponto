// Verifica o boot continuo REAL (v366): cortina unica, atualizacao 1a tela,
// retomada pos-reload e saida suave do acesso. Demo (config abortado), SW bloqueado.
import { chromium } from "playwright";

const URL = "http://localhost:8081/public/index.html";
const b = await chromium.launch();
const falhas = [];
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

  // maquinaria: mostrarTelaAtualizacao morfa A MESMA cortina; barra monotonica;
  // fecho recarrega 1x, seta swReloaded e LIMPA o updatePendente.
  const m = await p.evaluate(async () => {
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
    return {
      f1, f2, mesmoEl, semTelaPropria, reloads,
      swReloaded: sessionStorage.getItem("fiopulse:swReloaded"),
      pendente: localStorage.getItem("fiopulse:updatePendente"),
      pct: document.querySelector(".splash-up__pct").textContent,
    };
  });
  ok(m.mesmoEl && m.semTelaPropria, "A: atualizacao nao esta na cortina (ou up-screen renasceu)");
  ok(m.f2 >= m.f1 && m.f2 > 0, `A: barra nao monotonica (${m.f1} -> ${m.f2})`);
  ok(m.reloads === 1, `A: reload chamado ${m.reloads}x (esperado 1)`);
  ok(m.swReloaded === "1", "A: swReloaded nao marcado");
  ok(m.pendente === null, "A: updatePendente nao foi limpo no apply");
  ok(m.pct === "100%", `A: fecho sem 100% (${m.pct})`);
  if (p.__erros.length) falhas.push("A pageErrors: " + p.__erros.join(" | "));
  await ctx.close();
}

// ---------- B. retomada pos-reload: cortina re-pinta sem replay ----------
{
  const { ctx, p } = await pagina(() => {
    sessionStorage.setItem("fiopulse:swReloaded", "1");
    localStorage.setItem("fiopulse:manterConectado", "1");
  });
  const r = await p.evaluate(() => ({
    retomada: document.documentElement.classList.contains("splash-retomada"),
    atualizando: document.documentElement.classList.contains("splash-atualizando"),
    splashVisivel: getComputedStyle(document.getElementById("splash")).display,
    min: window.__splashMin,
  }));
  ok(r.retomada, "B: sem splash-retomada");
  ok(!r.atualizando, "B: retomada nao pode nascer atualizando");
  ok(r.splashVisivel !== "none", "B: cortina fora de cena na retomada");
  ok(r.min === 0, "B: retomada devia revelar sem minimo");
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
  if (p.__erros.length) falhas.push("C pageErrors: " + p.__erros.join(" | "));
  await ctx.close();
}

await b.close();
if (falhas.length) { console.error("FALHOU:\n- " + falhas.join("\n- ")); process.exit(1); }
console.log("BOOT CONTINUO OK (A primeira tela + maquinaria, B retomada, C costura + saida suave)");
