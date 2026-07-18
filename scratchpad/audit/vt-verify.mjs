// Contrato da View Transition de NAVEGACAO (feature apple-onda1, v340/1.71.0). A
// transicao vive no agendador renderApp() e SO envolve a troca de PAGINA; re-render
// da mesma tela nunca transiciona. Este probe prova, com um stub contador de
// document.startViewTransition:
//   1. navegar (trocar state.view.page) => startViewTransition chamado 1x;
//   2. re-render da MESMA pagina        => 0 chamadas (troca seca, sem transicao);
//   3. sem suporte (funcao deletada)    => render continua funcionando, sem erro.
// Roda no portal do COLABORADOR (a melhoria 5 e a fluidez da navegacao dele), mas o
// agendador e o mesmo dos dois portais. NAO seta __semVT: aqui a intencao e VER a VT.
import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, serviceWorkers: "block", reducedMotion: "no-preference" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const erros = []; p.on("pageerror", (e) => erros.push(String(e).slice(0, 160)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => typeof login === "function" && state?.users?.length, null, { timeout: 8000 });
const r = await p.evaluate(async () => {
  // renderApp e coalescido por rAF: espera 2 frames + um respiro pro callback assentar.
  const raf2 = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 30))));
  const titulo = () => (document.querySelector("#topbar-title")?.textContent || "");
  _changelogChecado = true;
  state.users.push({ id: "cp", usuario: "cp", senha: "x", role: "colaborador", nome: "Probe VT", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("cp", "x");
  document.querySelector("#acesso")?.remove();
  await raf2(); // deixa o renderApp do login assentar (_ultimaPageRenderizada definido)

  // Stub contador: nao anima (resolve na hora), so conta e executa a troca de verdade.
  window.__vt = 0;
  const origVT = document.startViewTransition;
  document.startViewTransition = function (cb) {
    window.__vt++;
    try { cb(); } catch (e) { /* */ }
    return { ready: Promise.resolve(), finished: Promise.resolve(), updateCallbackDone: Promise.resolve(), skipTransition() {} };
  };

  // aquece: uma navegacao pra cravar _ultimaPageRenderizada = colab-home
  state.view.page = "colab-home"; renderApp(); await raf2();
  window.__vt = 0;

  // 1. NAVEGACAO (troca de pagina) => VT 1x
  state.view.page = "colab-conta"; renderApp(); await raf2();
  const vtNav = window.__vt;
  const navRendeu = /Conta/.test(titulo());

  // 2. RE-RENDER da MESMA pagina => VT 0x
  window.__vt = 0;
  renderApp(); await raf2();
  const vtMesmaPagina = window.__vt;

  // 3. SEM SUPORTE: funcao deletada, render segue igual
  window.__vt = 0;
  document.startViewTransition = undefined;
  state.view.page = "colab-home"; renderApp(); await raf2();
  const vtSemSuporte = window.__vt;
  const semSuporteRendeu = /Início/.test(titulo());

  document.startViewTransition = origVT;
  return { vtNav, navRendeu, vtMesmaPagina, vtSemSuporte, semSuporteRendeu };
});
console.log(JSON.stringify({ r, erros }, null, 2));
await b.close();
const ok = r.vtNav === 1 && r.navRendeu && r.vtMesmaPagina === 0 && r.vtSemSuporte === 0 && r.semSuporteRendeu && !erros.length;
if (!ok) { console.error("FALHOU"); process.exit(1); }
console.log("VT NAV OK (navegacao dispara startViewTransition 1x; mesma pagina 0x; sem suporte funciona igual)");
