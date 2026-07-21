// Auditoria do pisca de navegacao (v370): cascata roda 1x POR NAVEGACAO;
// re-render da MESMA pagina com DOM novo NAO re-cascateia.
import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
// __semVT: harness mede a cascata pp-anima com _renderAppNow direto; desligar a View
// Transition de navegação evita que o renderApp agendado pelo login() dispare uma
// transição async e polua a medição (ver flicker-guard.mjs).
await p.addInitScript(() => { window.__semVT = true; });
const erros = []; p.on("pageerror", (e) => erros.push(String(e).slice(0, 160)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => typeof login === "function" && state?.users?.length, null, { timeout: 8000 });
const r = await p.evaluate(async () => {
  _changelogChecado = true;
  state.users.push({ id: "cp", usuario: "cp", senha: "x", role: "colaborador", nome: "Probe Colab", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("cp", "x");
  document.querySelector("#acesso")?.remove();
  const hoje = new Date();
  state.aniversariantes = { pessoas: [{ nome: "Fulana Probe", mes: hoje.getMonth() + 1, dia: hoje.getDate() }], recemChegados: [], tempoCasa: [] };
  const animandoNoView = () => Array.from(document.querySelectorAll("#view .pp-fade > *"))
    .reduce((n, el) => n + (el.getAnimations?.() || []).filter((a) => a.playState === "running").length, 0);
  // deixa o render coalescido do login assentar (senao ele roda DEPOIS da minha
  // navegacao com a MESMA page e desliga a classe no meio da medicao)
  await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 80)));
  // 1. NAVEGACAO -> colab-home: cascata RODA (pp-anima ligado)
  state.view.page = "colab-home"; _renderAppNow();
  await new Promise((res) => setTimeout(res, 80));
  const navAnima = animandoNoView() > 0;
  const classeLigada = document.documentElement.classList.contains("pp-anima");
  // espera a cascata acabar
  await new Promise((res) => setTimeout(res, 700));
  // 2. RE-RENDER da MESMA pagina com DOM NOVO (state muda): cascata NAO roda
  state.aniversariantes.pessoas.push({ nome: "Novo Dado Probe", mes: hoje.getMonth() + 1, dia: hoje.getDate() });
  window.__fpForceWrite = true; _renderAppNow(); window.__fpForceWrite = false;
  await new Promise((res) => setTimeout(res, 80));
  const rerenderAnima = animandoNoView();
  const classeDesligada = !document.documentElement.classList.contains("pp-anima");
  // v379: o homenageado novo entra como um ROSTO na faixa de stories (o título cheio "Hoje é
  // aniversário de Novo" agora vive no bottom sheet). Confere que o rosto do "Novo" entrou.
  const domNovoEntrou = Array.from(document.querySelectorAll("#view [data-story] .st__nm")).some((el) => el.textContent.trim() === "Novo");
  return { navAnima, classeLigada, rerenderAnima, classeDesligada, domNovoEntrou };
});
console.log(JSON.stringify({ r, erros }, null, 2));
await b.close();
const ok = r.navAnima && r.classeLigada && r.rerenderAnima === 0 && r.classeDesligada && r.domNovoEntrou && !erros.length;
if (!ok) { console.error("FALHOU"); process.exit(1); }
console.log("PISCA NAV OK (cascata 1x por navegacao; re-render nao re-cascateia)");
