// Verificacao do comportamento REAL do app (nao do mock) da feature aprovada em
// docs/mockups/termos-documentos-2026-07.html: os TERMOS ASSINADOS na tela Documentos do
// colaborador (grupo "Meus termos"), + a adicao pequena do PERCENTUAL na tela de atualizacao.
//
// Padrao escolha-portal/gami/flicker-guard: server 8081, aborta firebase.config+gstatic,
// bloqueia SW, login(id,senha) do demo, _renderAppNow sincrono. pdf.js do app vem do cdnjs
// (BLOQUEADO neste ambiente); pdf-lib vem do jsdelivr (OK) — geramos PDF de verdade e damos
// um SHIM do pdf.js pelo jsdelivr so pro viewer renderizar e pra extrair texto (prova de campos).
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:8081/public/index.html";
const OUT = "C:/projetos/ocorr-ponto/scratchpad/audit/out";
fs.mkdirSync(OUT, { recursive: true });
const PJ = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build";

const b = await chromium.launch();
const FALHAS = [];
const erros = [];
const ok = (nome, cond) => { if (cond) console.log("  ok:", nome); else { console.log("  FALHA:", nome); FALHAS.push(nome); } };

async function abrir(viewport = { width: 420, height: 900 }, opts = {}) {
  const ctx = await b.newContext({ viewport, serviceWorkers: "block", ...opts });
  await ctx.route("**/firebase.config.js*", (r) => r.abort());
  await ctx.route("**gstatic.com**", (r) => r.abort());
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  await p.goto(BASE, { waitUntil: "load" });
  await p.evaluate(() => { try { _changelogChecado = true; } catch (e) {} });
  await p.waitForTimeout(200);
  return { ctx, p };
}

// SHIM do pdf.js pelo jsdelivr (o app usa cdnjs, bloqueado aqui). Preenche window.pdfjsLib
// -> loadPdfJs() retorna cedo e o viewer/extracao funcionam. Anexa __pdfTexto (extrai texto).
async function shimPdfJs(p) {
  return p.evaluate(async (base) => {
    try {
      await new Promise((res, rej) => { const s = document.createElement("script"); s.src = base + "/pdf.min.js"; s.onload = res; s.onerror = () => rej(new Error("pdf.js jsdelivr falhou")); document.head.appendChild(s); });
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "/pdf.worker.min.js";
      window.__pdfTexto = async (dataUrl) => {
        const bin = atob(dataUrl.split(",")[1]); const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const pdf = await window.pdfjsLib.getDocument({ data: arr }).promise;
        let txt = "";
        for (let n = 1; n <= pdf.numPages; n++) { const pg = await pdf.getPage(n); const c = await pg.getTextContent(); txt += " " + c.items.map((i) => i.str).join(" "); }
        return txt;
      };
      return true;
    } catch (e) { return String(e); }
  }, PJ);
}

// Login demo como COLABORADOR (padrao flicker-guard) + nome/CPF deterministicos pro termoCampos.
async function loginColab(p) {
  await p.evaluate(() => {
    state.users.push({ id: "colab-guard", usuario: "colab", senha: "x", role: "colaborador", nome: "Alan Carlos Santos Bastos", funcionarioCodigo: state.funcionarios[0]?.codigo });
    login("colab-guard", "x");
  });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    document.querySelector("#acesso")?.remove();
    if (state.funcionarios[0]) state.funcionarios[0].nome = "Alan Carlos Santos Bastos";
    try { localStorage.setItem("fiopulse:ultimoCpf", "04781522014"); } catch (e) {}
    document.documentElement.classList.add("modo-colab");
  });
}

const ADESAO_EM = "2026-07-10T12:14:00.000Z"; // 09:14 local (UTC-3) -> bate com o mock
const CANAL_EM = "2026-07-16T12:30:00.000Z";
async function setTermos(p, tipos) {
  await p.evaluate(({ tipos, aEm, cEm }) => {
    const uid = state.currentUserId || "colab-guard";
    const todos = {
      adesao: { tipo: "adesao", em: aEm, versao: TERMO_VERSAO, hashSha256: TERMO_HASH, id: "termoAdesao/" + uid },
      canal: { tipo: "canal", em: cEm, versao: TERMO_CANAL_VERSAO, hashSha256: TERMO_CANAL_HASH, id: "termoCanalDenuncia/" + uid },
    };
    state.meusTermos = tipos.map((t) => todos[t]);
    state.view.page = "colab-documentos";
    _renderAppNow();
  }, { tipos, aEm: ADESAO_EM, cEm: CANAL_EM });
  await p.waitForTimeout(60);
}

// ===================== TERMOS NA TELA DOCUMENTOS =====================
console.log("(1) grupo 'Meus termos' lista os aceites:");
const { ctx, p } = await abrir();
const shim = await shimPdfJs(p);
ok("(pre) pdf.js shim (jsdelivr) carregado", shim === true);
await loginColab(p);
await setTermos(p, ["adesao", "canal"]);

const lista = await p.evaluate(() => {
  const view = document.querySelector("#view");
  const html = view.innerHTML;
  const ovls = [...view.querySelectorAll(".pp-ovl")].map((e) => e.textContent);
  const rows = [...view.querySelectorAll(".pp-rw--termo")].map((r) => ({
    titulo: r.querySelector(".pp-rw__t")?.textContent || "",
    sub: r.querySelector(".pp-rw__s")?.textContent || "",
    temComprovante: !!r.querySelector("[data-termo-comprovante]"),
    view: r.getAttribute("data-termo-view") || "",
  }));
  return { html, ovls, rows, temNota: /gerado na hora a partir do registro/.test(html) };
});
ok("(1) grupo 'Meus termos' presente", lista.ovls.some((t) => /Meus termos/.test(t)));
ok("(1) contador do grupo = 2", lista.ovls.some((t) => /Meus termos\s*2$/.test(t)) || lista.rows.length === 2);
ok("(1) duas linhas de termo", lista.rows.length === 2);
ok("(1) linha 1 = Termo de Adesao", lista.rows[0]?.titulo === "Termo de Adesão à Assinatura Eletrônica");
ok("(1) linha 1 subtitulo com data extenso + versao",
  /^Termo · Aceito em 10 de julho de 2026 · v2026-07-v1$/.test(lista.rows[0]?.sub || ""));
ok("(1) linha 2 = Termo do Canal de Denuncias", lista.rows[1]?.titulo === "Termo do Canal de Denúncias");
ok("(1) linha 2 subtitulo com data + versao", /Aceito em 16 de julho de 2026 · v2026-07-v1/.test(lista.rows[1]?.sub || ""));
ok("(1) cada linha tem botao Comprovante", lista.rows.every((r) => r.temComprovante));
ok("(1) nota do rodape (comprovante gerado na hora)", lista.temNota);

console.log("(1b) re-render nasce identico (anti-flicker):");
const identico = await p.evaluate(() => {
  const view = document.querySelector("#view");
  const a = view.innerHTML;
  _renderAppNow();
  return a === view.innerHTML;
});
ok("(1b) #view identico entre dois renders", identico);

await p.waitForTimeout(150);
await p.screenshot({ path: OUT + "/termos-doc-app-lista-claro.png" });
await p.evaluate(() => document.documentElement.classList.add("cp-dark"));
await p.waitForTimeout(200);
await p.screenshot({ path: OUT + "/termos-doc-app-lista-escuro.png" });
await p.evaluate(() => document.documentElement.classList.remove("cp-dark"));

console.log("(2) sem aceite: grupo nao aparece:");
const vazio = await p.evaluate(() => {
  state.meusTermos = [];
  _renderAppNow();
  const view = document.querySelector("#view");
  return { semGrupo: !/Meus termos/.test(view.innerHTML), semLinhas: view.querySelectorAll(".pp-rw--termo").length === 0 };
});
ok("(2) grupo 'Meus termos' ausente sem aceite", vazio.semGrupo && vazio.semLinhas);
await setTermos(p, ["adesao", "canal"]);

console.log("(3) TEXTO canonico correto (builders + PDF real):");
const texto = await p.evaluate(async () => {
  const uid = state.currentUserId;
  const tA = { tipo: "adesao", em: "2026-07-10T12:14:00.000Z", versao: TERMO_VERSAO, hashSha256: TERMO_HASH, id: "termoAdesao/" + uid };
  const tC = { tipo: "canal", em: "2026-07-16T12:30:00.000Z", versao: TERMO_CANAL_VERSAO, hashSha256: TERMO_CANAL_HASH, id: "termoCanalDenuncia/" + uid };
  const cA = termoCampos(tA);
  const runsA = termoAdesaoRuns(cA).map((r) => r.map((s) => s.t).join("")).join("\n");
  const runsC = termoCanalRuns(termoCampos(tC)).map((r) => r.map((s) => s.t).join("")).join("\n");
  const g = await gerarTermoTextoPdf(tA);
  const pdfTxt = (await window.__pdfTexto(g.dataUrl)).replace(/\s+/g, " ");
  return { runsA, runsC, cpf: cA.cpf, pdfTxt, pdfKind: g.dataUrl.slice(0, 30) };
});
ok("(3) adesao: nome preenchido", texto.runsA.includes("Alan Carlos Santos Bastos"));
ok("(3) adesao: CPF formatado preenchido", texto.cpf === "047.815.220-14" && texto.runsA.includes("047.815.220-14"));
ok("(3) adesao: CNPJ canonico completo", texto.runsA.includes("01.475.188/0001-97"));
ok("(3) adesao: clausula juridica canonica", texto.runsA.includes("Código de Processo Civil"));
ok("(3) adesao: local Indaial", texto.runsA.includes("Indaial, SC"));
ok("(3) canal: titulo/email canonicos", texto.runsC.includes("Canal de Denúncias") && texto.runsC.includes("jenifer@fiobras.com.br"));
ok("(3) PDF do texto e application/pdf", texto.pdfKind.startsWith("data:application/pdf"));
ok("(3) PDF do texto tem selo ACEITO", texto.pdfTxt.includes("ACEITO"));
ok("(3) PDF do texto traz o texto canonico + nome", texto.pdfTxt.includes("01.475.188/0001-97") && texto.pdfTxt.includes("Alan Carlos Santos Bastos"));

console.log("(4) tocar na LINHA abre o texto no viewer:");
await p.evaluate(() => document.querySelector('[data-termo-view="adesao"]').click());
await p.waitForTimeout(1400); // gera PDF real + renderiza via pdf.js (shim)
const viewer = await p.evaluate(() => {
  const dv = document.querySelector(".modal-backdrop--docview");
  return dv ? { titulo: dv.querySelector(".cp-docview__t b")?.textContent || "", sub: dv.querySelector(".cp-docview__t span")?.textContent || "", temCanvas: !!dv.querySelector("canvas") } : null;
});
ok("(4) viewer aberto ao tocar a linha", !!viewer);
ok("(4) titulo do viewer = termo", viewer?.titulo === "Termo de Adesão à Assinatura Eletrônica");
ok("(4) subtitulo do viewer = 'Termo · Aceito'", viewer?.sub === "Termo · Aceito");
ok("(4) PDF renderizado (canvas presente)", viewer?.temCanvas === true);
await p.evaluate(() => document.querySelector(".modal-backdrop--docview [data-docview-close]")?.click());
await p.waitForTimeout(150);

console.log("(5) COMPROVANTE: gera PDF real e prova os campos:");
const comp = await p.evaluate(async () => {
  const t = state.meusTermos.find((x) => x.tipo === "adesao");
  const g = await gerarComprovanteTermoPdf(t);
  const txt = (await window.__pdfTexto(g.dataUrl)).replace(/\s+/g, " ");
  const nospace = txt.replace(/\s+/g, "");
  return { kind: g.dataUrl.slice(0, 30), txt, nospace, hash: t.hashSha256, id: t.id };
});
ok("(5) comprovante e application/pdf", comp.kind.startsWith("data:application/pdf"));
ok("(5) cabecalho 'Comprovante de ciencia eletronica'", comp.txt.includes("Comprovante de ciência eletrônica"));
ok("(5) campo nome", comp.txt.includes("Alan Carlos Santos Bastos"));
ok("(5) campo CPF", comp.nospace.includes("047.815.220-14"));
ok("(5) campo data e hora (10/07/2026 09:14)", comp.txt.includes("10/07/2026 09:14"));
ok("(5) campo versao aceita", comp.txt.includes("2026-07-v1"));
ok("(5) campo hash SHA-256 do texto canonico", comp.nospace.includes(comp.hash));
ok("(5) campo identificador do registro", comp.nospace.includes(comp.id.replace(/\s/g, "")));
ok("(5) localizacao = Indaial, SC (sem coordenadas fabricadas)", comp.txt.includes("Indaial, SC") && !comp.txt.includes("precisão") && !/-\d\d\.\d{3}/.test(comp.txt));
ok("(5) nivel de seguranca honesto (sem geolocalizacao inventada)", comp.txt.includes("credenciais de acesso") && !comp.txt.includes("geolocaliza"));
ok("(5) assinatura carimbada (ciencia eletronica do signatario)", comp.txt.includes("Ciência eletrônica do signatário"));

console.log("(5b) tocar em Comprovante abre o viewer + screenshots:");
await p.evaluate(() => document.querySelector('[data-termo-comprovante="adesao"]').click());
await p.waitForTimeout(1500);
const cv = await p.evaluate(() => {
  const dv = document.querySelector(".modal-backdrop--docview");
  return dv ? { titulo: dv.querySelector(".cp-docview__t b")?.textContent || "", sub: dv.querySelector(".cp-docview__t span")?.textContent || "", canvas: !!dv.querySelector("canvas") } : null;
});
ok("(5b) viewer do comprovante aberto", !!cv);
ok("(5b) titulo = 'Comprovante · Termo de Adesao'", cv?.titulo === "Comprovante · Termo de Adesão");
ok("(5b) subtitulo = 'Ciencia eletronica'", cv?.sub === "Ciência eletrônica");
ok("(5b) comprovante renderizado (canvas)", cv?.canvas === true);
await p.screenshot({ path: OUT + "/termos-doc-app-comprovante-claro.png" });
await p.evaluate(() => document.documentElement.classList.add("cp-dark"));
await p.waitForTimeout(250);
await p.screenshot({ path: OUT + "/termos-doc-app-comprovante-escuro.png" });
await p.evaluate(() => { document.documentElement.classList.remove("cp-dark"); document.querySelector(".modal-backdrop--docview [data-docview-close]")?.click(); });
await p.waitForTimeout(150);

console.log("(6) falha na geracao vira toast (nunca mudo):");
const falha = await p.evaluate(async () => {
  const real = gerarComprovanteTermoPdf;
  window.gerarComprovanteTermoPdf = async () => { throw new Error("boom-teste"); };
  document.querySelector('[data-termo-comprovante="adesao"]').click();
  await new Promise((r) => setTimeout(r, 400));
  const toastEl = document.querySelector("#toast-root .toast--danger span");
  const msg = toastEl ? toastEl.textContent : "";
  const viewerAberto = !!document.querySelector(".modal-backdrop--docview");
  window.gerarComprovanteTermoPdf = real;
  return { msg, viewerAberto };
});
ok("(6) toast de erro claro ao falhar a geracao", /Não consegui gerar o comprovante/.test(falha.msg));
ok("(6) sem viewer aberto quando a geracao falha", falha.viewerAberto === false);
ok("(0) sem pageerror ao longo dos termos", erros.length === 0);
await ctx.close();

// ===================== PERCENTUAL NA TELA DE ATUALIZACAO =====================
console.log("(7) tela de atualizacao: percentual acompanha a barra:");
{
  const { ctx: c2, p: p2 } = await abrir();
  const r = await p2.evaluate(async () => {
    window.__reloads = [];
    window.__swReload = () => window.__reloads.push({ pct: document.querySelector(".up-screen__pct")?.textContent || "" });
    aplicarAtualizacaoBoot({ state: "installed", postMessage: () => {} });
    const existe = !!document.querySelector(".up-screen__pct");
    const inicio = document.querySelector(".up-screen__pct")?.textContent || "";
    swRecarregarUmaVez();
    await new Promise((res) => setTimeout(res, 700));
    const meio = document.querySelector(".up-screen__pct")?.textContent || "";
    await new Promise((res) => setTimeout(res, 2700)); // ~3.4s: palco + fecho + reload
    return { existe, inicio, meio, reloads: window.__reloads };
  });
  ok("(7) elemento de percentual existe", r.existe);
  ok("(7) comeca em 0%", r.inicio === "0%");
  const meioN = parseInt(r.meio, 10);
  ok("(7) cresce no meio do palco (0 < n < 100)", meioN > 0 && meioN < 100);
  ok("(7) mostra 100% no reload (1x)", r.reloads.length === 1 && r.reloads[0].pct === "100%");
  await c2.close();
}

console.log("(7b) reduced motion: comeca em 0%, 100% no fim:");
{
  const { ctx: c3, p: p3 } = await abrir({ width: 420, height: 900 }, { reducedMotion: "reduce" });
  const r = await p3.evaluate(async () => {
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.__reloads = [];
    window.__swReload = () => window.__reloads.push({ pct: document.querySelector(".up-screen__pct")?.textContent || "" });
    aplicarAtualizacaoBoot({ state: "installing", postMessage: () => {} });
    const inicio = document.querySelector(".up-screen__pct")?.textContent || "";
    swRecarregarUmaVez();
    await new Promise((res) => setTimeout(res, 3400));
    return { rm, inicio, reloads: window.__reloads };
  });
  ok("(7b) contexto reduced-motion ativo", r.rm === true);
  ok("(7b) comeca em 0%", r.inicio === "0%");
  ok("(7b) 100% no reload (1x)", r.reloads.length === 1 && r.reloads[0].pct === "100%");
  await c3.close();
}

await b.close();
console.log("\nerros de pagina:", erros.length ? erros : "nenhum");
console.log(FALHAS.length ? `RESULTADO: ${FALHAS.length} FALHA(S)` : "RESULTADO: TUDO OK");
process.exit(FALHAS.length || erros.length ? 1 : 0);
