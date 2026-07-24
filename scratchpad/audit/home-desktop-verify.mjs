// ============================================================
// VERIFY v400/v408 — Item 1 (home DESKTOP do colaborador) + Item 2 (fade na troca de tela).
//
// Item 1: grade .pp-home__grid degrada pra coluna única centrada quando a coluna esquerda
//   (col0) não tem conteúdo relevante; com conteúdo fica 2 colunas; o miolo respeita o cap de
//   780px; mobile 390 intocado (DOM idêntico ao desktop = fix só CSS); re-render idêntico.
//   v408 (OPÇÃO B, mock home-desktop-colab-2026-07): ESQUERDA = pontos + faixa + aniversariantes;
//   DIREITA (.pp-home__col--dir) = precisa de atenção + comunicado, com o comunicado IÇADO pra
//   cima no desktop via CSS order (no DOM a ordem é precisa->comunicado, que preserva o mobile).
// Item 2: navegação com View Transition indisponível dispara 1 fade one-shot no #view;
//   re-render da MESMA página dispara 0; reduced-motion não anima.
//
// Servidor local na 8081 (node scratchpad/audit/srv8081.cjs). serviceWorkers bloqueados,
// firebase.config abortado (modo demo).
// ============================================================
import { chromium } from "playwright";

const b = await chromium.launch();
let falhas = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? "ok" : "FALHOU"}: ${msg}`); if (!cond) falhas++; };

// IDs de gradiente SVG mudam sem efeito visual: normaliza p/ comparar re-render.
const normaliza = (h) => String(h || "").replace(/gmg\d+/g, "gmgN").replace(/gm[a-z]+\d+w?/g, "gmsN");

const PREP_VAZIA = `
  state.gamiConfig = null; state.gamiMeu = null;
  state.documentosColab = []; state.disciplinaresColab = [];
  state.pesquisasClimaColab = []; state.ciclosDesempenhoColab = [];
  state.aniversariantes = { pessoas: [], recemChegados: [], tempoCasa: [] };
  state.comunicadosColab = [];
`;
const PREP_CHEIA = `
  state.gamiConfig = { ano: 2026, ativa: true, marcos: [100, 300, 600], tabela: {} };
  state.gamiMeu = { total: 140 };
  state.disciplinaresColab = [{ id: "d1", tipo: "advertencia", motivo: "Teste", minhaCiencia: false }];
  state.documentosColab = []; state.pesquisasClimaColab = []; state.ciclosDesempenhoColab = [];
  state.aniversariantes = { pessoas: [
    { nome: "Camila Ferreira", mes: (new Date().getMonth() + 1), dia: 5 },
    { nome: "Rafael Lima", mes: (new Date().getMonth() + 1), dia: 22 },
  ], recemChegados: [], tempoCasa: [] };
  state.comunicadosColab = [{ id: "c1", titulo: "Parada programada neste sabado", corpo: "Manutencao preventiva.", fixado: true, tipo: "comunicado", publicadoEm: "2026-07-20" }];
`;

async function novaPaginaColab(ctx, initScript) {
  const p = await ctx.newPage();
  if (initScript) await p.addInitScript(initScript);
  await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });
  await p.evaluate(() => {
    _changelogChecado = true;
    state.users.push({ id: "colab-guard", usuario: "colab", senha: "x", role: "colaborador", nome: "Colab Guarda", funcionarioCodigo: state.funcionarios[0]?.codigo });
    login("colab-guard", "x");
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => { document.querySelector("#acesso")?.remove(); });
  return p;
}

// ---- renderiza um caso e ESTABILIZA (mural/boas-vindas/reveal 1x/dia assíncronos) ----
async function renderCaso(p, prep) {
  await p.evaluate((prepStr) => { eval(prepStr); state.view.page = "colab-home"; window.__fpForceWrite = false; _renderAppNow(); }, prep);
  await p.waitForTimeout(1000);
}
// ---- mede o layout do DOM ATUAL (sem rebuild; nós vivos) ----
async function medirLayout(p) {
  return p.evaluate(() => {
    const view = document.querySelector("#view");
    const fade = view.querySelector(".pp-fade");
    const grid = view.querySelector(".pp-home__grid");
    const cols = grid ? [...grid.querySelectorAll(":scope > .pp-home__col")] : [];
    const box = (el) => { const b = el.getBoundingClientRect(); return { left: Math.round(b.left), width: Math.round(b.width) }; };
    const rf = fade.getBoundingClientRect();
    return {
      win: window.innerWidth,
      fadeLeft: Math.round(rf.left), fadeWidth: Math.round(rf.width), fadeMax: getComputedStyle(fade).maxWidth,
      gridDisplay: grid ? getComputedStyle(grid).display : null,
      col0: cols[0] ? { ...box(cols[0]), display: getComputedStyle(cols[0]).display, elhijos: cols[0].querySelectorAll("*").length } : null,
      col1: cols[1] ? { ...box(cols[1]), display: getComputedStyle(cols[1]).display } : null,
      innerHTML: view.innerHTML,
    };
  });
}
// ---- OPÇÃO B (v408): quem está em cada coluna + ordem visual comunicado x precisa ----
async function medirColunasB(p) {
  return p.evaluate(() => {
    const grid = document.querySelector("#view .pp-home__grid");
    const cols = grid ? [...grid.querySelectorAll(":scope > .pp-home__col")] : [];
    const L = cols[0], R = cols[1];
    const top = (el) => el ? Math.round(el.getBoundingClientRect().top) : null;
    const card = R && R.querySelector(".pp-card--pin");
    const pend = R && R.querySelector(".pp-pend");
    const anivEl = document.querySelector("#view .pp-aniv-d");
    return {
      Rdir: !!(R && R.classList.contains("pp-home__col--dir")),
      L_pts: !!(L && L.querySelector(".pts-slim")),
      L_strip: !!(L && L.querySelector('[data-region="mural:strip"]')),
      L_aniv: !!(L && L.querySelector(".pp-aniv-d")),
      L_pend: !!(L && L.querySelector(".pp-pend")),
      L_com: !!(L && L.querySelector(".pp-card--pin")),
      R_pend: !!pend, R_com: !!card, R_aniv: !!(R && R.querySelector(".pp-aniv-d")),
      cardTop: top(card), pendTop: top(pend),
      anivDisplay: anivEl ? getComputedStyle(anivEl).display : null,
    };
  });
}

// ---- identidade: rebuild FORÇADO nasce idêntico ao estabilizado (contrato flicker-guard) ----
async function reRenderIdentico(p) {
  return p.evaluate(() => {
    const view = document.querySelector("#view");
    const antes = view.innerHTML;
    window.__fpForceWrite = true; _renderAppNow(); window.__fpForceWrite = false;
    return antes === view.innerHTML;
  });
}

// ============================================================
// CONTEXTO 1 — layout desktop + mobile + identidade (usa __semVT p/ determinismo)
// ============================================================
{
  const ctx = await b.newContext({ viewport: { width: 1900, height: 900 }, serviceWorkers: "block" });
  await ctx.route("**/firebase.config.js*", (r) => r.abort());
  await ctx.route("**gstatic.com**", (r) => r.abort());
  const jsErros = [];
  const p = await novaPaginaColab(ctx, () => { window.__semVT = true; });
  p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));

  console.log("\nItem 1 · DESKTOP 1900 · caso A (col0 VAZIA, gami dormente + zero pendências):");
  await renderCaso(p, PREP_VAZIA);
  const A = await medirLayout(p);
  ok(A.gridDisplay === "block", `grade colapsou p/ block (display=${A.gridDisplay})`);
  ok(A.col0 && A.col0.display === "none", `col0 recolhida (display=${A.col0 && A.col0.display})`);
  ok(A.col1 && Math.abs(A.col1.left - A.fadeLeft) <= 2, `col1 alinhada à esquerda do miolo (col1.left=${A.col1 && A.col1.left} fade.left=${A.fadeLeft}) = SEM buraco à esquerda`);
  ok(A.fadeWidth <= 780 && A.fadeMax === "780px", `miolo respeita o cap 780 (width=${A.fadeWidth} max=${A.fadeMax})`);
  ok(await reRenderIdentico(p), "re-render idêntico (rebuild forçado == estabilizado)");

  // MOBILE (mesmo render, só troca o viewport — nenhum re-render de JS, então o innerHTML
  // TEM que ser idêntico ao desktop: prova que o fix é 100% CSS e o mobile fica intocado).
  console.log("\nItem 1 · MOBILE 390 · caso A (MESMO render, só resize): DOM idêntico + col0 NÃO recolhida:");
  await p.setViewportSize({ width: 390, height: 800 });
  const mA = await medirLayout(p);
  ok(normaliza(mA.innerHTML) === normaliza(A.innerHTML), "innerHTML mobile == desktop (resize não re-renderiza; fix é só CSS)");
  ok(mA.col0 && mA.col0.display !== "none", `col0 presente/visível no mobile (display=${mA.col0 && mA.col0.display}) = colapso não vaza p/ <=900px`);
  ok(mA.gridDisplay !== "block" || (mA.col0 && mA.col0.display !== "none"), "mobile NÃO recolhe col0 (ordem [col0,col1] preservada)");
  await p.setViewportSize({ width: 1900, height: 900 });

  console.log("\nItem 1 · DESKTOP 1900 · caso B (col0 CHEIA, gami ativa + pendência):");
  await renderCaso(p, PREP_CHEIA);
  const B = await medirLayout(p);
  ok(B.gridDisplay === "grid", `grade em 2 colunas (display=${B.gridDisplay})`);
  ok(B.col0 && B.col0.display !== "none" && B.col0.width > 200, `col0 visível com largura (width=${B.col0 && B.col0.width})`);
  ok(B.col0 && B.col0.elhijos > 0, `col0 tem conteúdo (elementos=${B.col0 && B.col0.elhijos})`);
  ok(B.col1 && B.col1.left > B.col0.left + 100, `col1 à direita de col0 (2 colunas de verdade)`);
  ok(await reRenderIdentico(p), "re-render idêntico (rebuild forçado == estabilizado)");

  console.log("\nItem 1b · OPÇÃO B (desktop 1900): quem está em cada coluna + comunicado acima de precisa:");
  const bl = await medirColunasB(p);
  ok(bl.Rdir, "coluna direita marcada .pp-home__col--dir");
  ok(bl.L_pts && bl.L_strip && bl.L_aniv, `esquerda = pontos + faixa + aniversariantes (pts=${bl.L_pts} faixa=${bl.L_strip} aniv=${bl.L_aniv})`);
  ok(!bl.L_pend && !bl.L_com, "esquerda NÃO tem precisa nem comunicado");
  ok(bl.R_pend && bl.R_com && !bl.R_aniv, `direita = precisa + comunicado, sem aniversariantes (pend=${bl.R_pend} com=${bl.R_com} aniv=${bl.R_aniv})`);
  ok(bl.cardTop != null && bl.pendTop != null && bl.cardTop < bl.pendTop, `desktop: comunicado ACIMA de precisa (cardTop=${bl.cardTop} pendTop=${bl.pendTop})`);

  console.log("\nItem 1 · MOBILE 390 · caso B (MESMO render, só resize): DOM idêntico ao desktop:");
  await p.setViewportSize({ width: 390, height: 800 });
  const mB = await medirLayout(p);
  ok(normaliza(mB.innerHTML) === normaliza(B.innerHTML), "innerHTML mobile (col0 cheia) == desktop");
  const mbl = await medirColunasB(p);
  ok(mbl.anivDisplay === "none", `mobile: aniversariantes escondida (display=${mbl.anivDisplay})`);
  ok(mbl.pendTop != null && mbl.cardTop != null && mbl.pendTop < mbl.cardTop, `mobile: precisa ACIMA de comunicado (ordem de origem preservada; pendTop=${mbl.pendTop} cardTop=${mbl.cardTop})`);
  await p.setViewportSize({ width: 1900, height: 900 });

  await ctx.close();
  if (jsErros.length) { console.log("  pageErrors:", jsErros); falhas += jsErros.length; }
}

// ============================================================
// CONTEXTO 2 — fade na troca de tela (SEM __semVT, p/ o fade rodar de verdade)
// ============================================================
async function contaAnimView(p) {
  return p.evaluate(() => {
    const view = document.getElementById("view");
    return (document.getAnimations ? document.getAnimations() : [])
      .filter((an) => an.playState === "running" && (an.effect && an.effect.target) === view).length;
  });
}
// dois rAF p/ garantir que o rAF do agendador renderApp já disparou
const flush = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  await ctx.route("**/firebase.config.js*", (r) => r.abort());
  await ctx.route("**gstatic.com**", (r) => r.abort());
  const jsErros = [];
  const p = await novaPaginaColab(ctx, null); // SEM __semVT
  p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));

  console.log("\nItem 2 · FADE na troca de tela (View Transition indisponível):");
  // baseline: fixa _ultimaPageRenderizada em colab-home (via o agendador renderApp)
  await p.evaluate(() => { state.view.page = "colab-home"; renderApp(); });
  await flush(p);
  // VT indisponível (simula iOS sem suporte); scroll no topo; sem reduced-motion
  await p.evaluate(() => { document.startViewTransition = undefined; window.scrollTo(0, 0); });

  // TROCA de página -> deve nascer 1 animação one-shot no #view
  await p.evaluate(() => { state.view.page = "colab-ponto"; renderApp(); });
  await flush(p);
  const nTroca = await contaAnimView(p);
  ok(nTroca >= 1, `troca de página dispara fade no #view (animações rodando=${nTroca})`);

  await p.waitForTimeout(160); // fade (~90ms) termina; fill:none volta opacity ao normal
  const opacityLimpa = await p.evaluate(() => document.getElementById("view").style.opacity === "" ? "sem-inline" : document.getElementById("view").style.opacity);
  ok(opacityLimpa === "sem-inline", `fade não sujou o DOM (view.style.opacity=${opacityLimpa}, fill:none)`);

  // RE-RENDER da MESMA página -> 0 animações novas
  await p.evaluate(() => { state.view.page = "colab-ponto"; renderApp(); });
  await flush(p);
  const nMesma = await contaAnimView(p);
  ok(nMesma === 0, `re-render da mesma página NÃO anima (animações rodando=${nMesma})`);

  // REDUCED-MOTION -> troca instantânea, sem fade
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.evaluate(() => { state.view.page = "colab-home"; renderApp(); });
  await flush(p);
  const nReduzido = await contaAnimView(p);
  ok(nReduzido === 0, `reduced-motion: troca instantânea, sem fade (animações=${nReduzido})`);

  await ctx.close();
  if (jsErros.length) { console.log("  pageErrors:", jsErros); falhas += jsErros.length; }
}

await b.close();
console.log(`\n${falhas ? falhas + " FALHA(S)" : "TODOS OS CASOS PASSARAM"}`);
process.exit(falhas ? 1 : 0);
