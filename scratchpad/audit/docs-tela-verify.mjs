import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const erros = []; p.on("pageerror", (e) => erros.push(String(e).slice(0, 160)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => typeof login === "function" && state?.users?.length, null, { timeout: 8000 });
const r = await p.evaluate(async () => {
  _changelogChecado = true;
  state.users.push({ id: "cp", usuario: "cp", senha: "x", role: "colaborador", nome: "Probe Colab", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("cp", "x");
  document.querySelector("#acesso")?.remove();
  // forca a 1a carga da sessao: termos chegam ASSINCRONOS (800ms)
  state.meusTermos = undefined;
  window.carregarMeusTermos = () => new Promise((res) => setTimeout(() => { state.meusTermos = []; res({ ok: true }); }, 800));
  state.view.page = "colab-documentos";
  _renderAppNow();
  await new Promise((res) => setTimeout(res, 120));
  const sk = {
    ics: document.querySelectorAll(".cpdoc-sk__ic").length,
    bar: !!document.querySelector(".cpdoc-ld__bar i"),
    conteudoAusente: !document.body.innerHTML.includes("Publicados"),
  };
  await new Promise((res) => setTimeout(res, 1200));
  const fim = {
    ics: document.querySelectorAll(".cpdoc-sk__ic").length,
    h1: document.querySelector("#view h1")?.textContent,
    revelou: state._docsRevelar === false || state._docsRevelar === undefined ? true : false,
  };
  // re-render sem mudanca de state: DOM identico (disciplina de cache)
  const a = document.querySelector("#view").innerHTML;
  _renderAppNow();
  await new Promise((res) => setTimeout(res, 60));
  const identico = document.querySelector("#view").innerHTML === a;
  return { sk, fim, identico };
});
console.log(JSON.stringify({ r, erros }, null, 2));
await b.close();
const ok = r.sk.ics === 5 && r.sk.bar && r.sk.conteudoAusente && r.fim.ics === 0 && r.fim.h1 === "Documentos" && r.identico && !erros.length;
if (!ok) { console.error("FALHOU"); process.exit(1); }
console.log("DOCS TELA OK");
