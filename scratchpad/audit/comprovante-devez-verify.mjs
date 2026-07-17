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
  const toasts = [];
  window.toast = (m) => toasts.push(String(m));
  const doc = { id: "doc-probe", titulo: "Regulamento Interno", tipo: "regulamento", versao: 1, confirmacao: "assinatura",
    minhaAssinatura: { em: new Date().toISOString(), versaoAssinada: 1, arquivoPath: "documentos-assinados/x/doc-probe-v1.pdf", hashOriginal: "abc123" },
    conteudo: { texto: "Texto do regulamento de teste para o comprovante." } };
  state.documentosColab = [doc];
  // cenario 1: cofre FALHA (resolve null) -> geracao local abre o viewer
  window.urlArquivoAssinado = async () => null;
  await abrirComprovanteColab("doc-probe");
  const v1 = document.querySelector(".docviewer, .dv, [class*='viewer']");
  const titulo1 = document.body.innerText.includes("Comprovante");
  const abriu1 = !!v1 || titulo1;
  document.querySelectorAll(".docviewer, .dv-ov, [class*='viewer']").forEach((el) => el.remove());
  // cenario 2: cofre ESTOURA (throw) -> ainda abre local
  window.urlArquivoAssinado = async () => { throw new Error("boom"); };
  await abrirComprovanteColab("doc-probe");
  const abriu2 = document.body.innerText.includes("Comprovante");
  return { abriu1, abriu2, toasts };
});
console.log(JSON.stringify({ r, erros }, null, 2));
await b.close();
if (!r.abriu1 || !r.abriu2 || r.toasts.some((t) => /Não consegui/.test(t)) || erros.length) { console.error("FALHOU"); process.exit(1); }
console.log("COMPROVANTE DE VEZ OK");
