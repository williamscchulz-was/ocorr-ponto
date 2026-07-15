// Prova da IMPLEMENTACAO (nao o mock) do PROTOCOLO DE ACOMPANHAMENTO da denuncia.
// FASE A  Firestore STUBADO: extrai as funcoes REAIS de public/firebase.js e roda com
//         primitivos fake (o IIFE nao roda fora do browser). Prova: codigo forte no
//         formato FBR-XXXX-XXXX (alfabeto sem ambiguos), batch atomico com os 2 docs e
//         shape content-free do espelho; consulta normaliza e devolve/null; triagem
//         carimba o espelho; expurgo apaga o espelho junto; ZERO log nos fluxos do colab.
// FASE B  APP REAL no harness demo (localhost:8081): porta (bifurcacao), cerimonia com
//         codigo + copiar + hash expansivel, consulta com linha do tempo, mensagem neutra
//         identica p/ invalido e inexistente, re-render identico, e window.logEvento
//         instrumentado sem chamada nos fluxos. Screenshots porta/cerimonia/consulta
//         claro+escuro em scratchpad/audit/out/.
// Uso: node scratchpad/audit/acomp-den-app-verify.mjs   (inicia servidor 8081 se preciso)
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });
const errors = [];
const log = [];
const check = (name, cond) => { log.push((cond ? "PASS " : "FAIL ") + name); if (!cond) errors.push("CHECK FAIL: " + name); };

// ============================================================
// FASE A  extracao + Firestore stub (sem browser)
// ============================================================
const src = readFileSync("public/firebase.js", "utf8");
// Casa a chave que fecha o corpo. A MARCA termina no '{' do corpo (evita o pega-ratao do
// parametro desestruturado ({ categoria, ... }), cujo '{' viria antes do corpo).
function corpo(marca) {
  const ini = src.indexOf(marca);
  if (ini < 0) throw new Error("marca ausente no fonte: " + marca);
  const abre = ini + marca.length - 1; // ultimo char da marca = '{' do corpo
  let prof = 0, fim = -1;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === "{") prof++;
    else if (src[i] === "}") { prof--; if (prof === 0) { fim = i; break; } }
  }
  return { ini, fim, txt: src.slice(ini, fim + 1) };
}
// Bloco contiguo: helpers (_denunciaHashHex, _COD_ALFA, _gerarCodigoAcomp) + enviarDenuncia.
const iniHelpers = src.indexOf("const _denunciaHashHex");
const envMark = corpo("window.enviarDenuncia = async function ({ categoria, texto, contato }) {");
const blocoEnviar = src.slice(iniHelpers, envMark.fim + 1);
const blocoConsultar = corpo("window.consultarDenunciaStatus = async function (codigo) {").txt;
const blocoTriar = corpo("window.triarDenuncia = async function (id, status, nota, desfecho, guardaPermanente) {").txt;
const blocoExcluir = corpo("window.excluirDenuncia = async function (id) {").txt;

// Guarda ESTATICA: nenhum log/auditoria/storage nos fluxos do colaborador (envio+consulta).
const proibidos = ["logEvento", "registrarAuditoria", "localStorage", "sessionStorage"];
for (const t of proibidos) {
  check(`envio nao referencia ${t}`, !blocoEnviar.includes(t));
  check(`consulta nao referencia ${t}`, !blocoConsultar.includes(t));
}

// --- stub de Firestore que grava as operacoes ---
function makeDb({ docs = {}, failDelete = null } = {}) {
  const ops = [];
  const doc = (c, id) => {
    const path = c + "/" + (id === undefined ? "<auto>" : id);
    return {
      _path: path,
      get: async () => {
        if (docs[path] === "ERRO") throw Object.assign(new Error("unavailable"), { code: "unavailable" });
        const d = docs[path];
        return { exists: d != null, data: () => d || {} };
      },
      update: async (data) => { ops.push({ op: "update", path, data }); },
      delete: async () => {
        if (failDelete === path) throw Object.assign(new Error("not-found"), { code: "not-found" });
        ops.push({ op: "delete", path });
      },
    };
  };
  const db = {
    collection: (c) => ({ doc: (id) => doc(c, id) }),
    batch: () => ({
      set: (ref, data) => ops.push({ op: "set", path: ref._path, data }),
      update: (ref, data) => ops.push({ op: "update", path: ref._path, data }),
      delete: (ref) => ops.push({ op: "delete", path: ref._path }),
      commit: async () => ops.push({ op: "commit" }),
    }),
  };
  return { db, ops };
}
const FV = { serverTimestamp: () => "SVR_TS" };
const CRYPTO = globalThis.crypto || (await import("node:crypto")).webcrypto;
const noop = () => {};
const tsToIso = (v) => (v && typeof v.toDate === "function") ? v.toDate().toISOString() : (v || null);
const COD_RE = /^FBR-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

// ---- ENVIO ----
{
  const { db, ops } = makeDb();
  const win = {}; const logs = [];
  win.logEvento = (...a) => logs.push(["logEvento", ...a]);
  win.registrarAuditoria = (...a) => logs.push(["aud", ...a]);
  const { enviar, gerar, ALFA } = new Function("window", "db", "_FV", "debug", "crypto",
    blocoEnviar + "\nreturn { enviar: window.enviarDenuncia, gerar: _gerarCodigoAcomp, ALFA: _COD_ALFA };")(win, db, FV, noop, CRYPTO);

  check("alfabeto sem ambiguos (0 O 1 I L fora)", !/[01OIL]/.test(ALFA) && ALFA.length === 31);
  const r = await enviar({ categoria: "assedio-moral", texto: "relato de teste com bem mais de dez caracteres", contato: "" });
  check("envio devolve { hash, codigo }", typeof r.hash === "string" && r.hash.length === 64 && COD_RE.test(r.codigo));

  const sets = ops.filter((o) => o.op === "set");
  const commits = ops.filter((o) => o.op === "commit");
  const setDen = sets.find((o) => o.path === "denuncias/<auto>");
  const setEsp = sets.find((o) => o.path === "denunciaStatus/" + r.codigo);
  check("batch: exatamente 2 sets + 1 commit (atomico)", sets.length === 2 && commits.length === 1);
  check("batch: nenhum add() fora do batch", !ops.some((o) => o.op === "add"));
  check("doc da denuncia com id ALEATORIO (doc(), nao derivado)", !!setDen);
  check("denuncia carrega codigoAcompanhamento == codigo", setDen && setDen.data.codigoAcompanhamento === r.codigo);
  check("denuncia status 'nova' + em server", setDen && setDen.data.status === "nova" && setDen.data.em === "SVR_TS");
  check("espelho /denunciaStatus/{codigo} content-free {status,em}", !!setEsp
    && JSON.stringify(Object.keys(setEsp.data).sort()) === JSON.stringify(["em", "status"])
    && setEsp.data.status === "nova" && setEsp.data.em === "SVR_TS");
  check("envio NAO chamou logEvento/registrarAuditoria", logs.length === 0);

  // Codigo FORTE: 800 sorteios, todos no formato, todos unicos, boa dispersao de simbolos.
  const vistos = new Set(); const chars = new Set();
  for (let i = 0; i < 800; i++) { const c = gerar(); if (!COD_RE.test(c)) { vistos.add("BAD"); break; } vistos.add(c); c.replace(/FBR-|-/g, "").split("").forEach((x) => chars.add(x)); }
  check("800 codigos: formato ok, todos unicos", !vistos.has("BAD") && vistos.size === 800);
  check("codigo com boa dispersao (>= 25 simbolos distintos)", chars.size >= 25);
}

// ---- CONSULTA ----
{
  const okDocs = { "denunciaStatus/FBR-7K2M-9QX4": { status: "em_analise", em: { toDate: () => new Date("2026-07-12T14:30:00Z") }, atualizadoEm: { toDate: () => new Date("2026-07-14T09:00:00Z") } } };
  const mk = (docs) => new Function("window", "db", "debug", "tsToIso",
    blocoConsultar + "\nreturn window.consultarDenunciaStatus;")({}, makeDb({ docs }).db, noop, tsToIso);

  const consultar = mk(okDocs);
  const r1 = await consultar("FBR-7K2M-9QX4");
  check("consulta codigo certo -> {status,em,atualizadoEm}", r1 && r1.status === "em_analise" && !!r1.em && !!r1.atualizadoEm);
  const r2 = await consultar("  fbr-7k2m-9qx4 "); // normaliza trim + uppercase
  check("consulta normaliza (minusculo + espacos)", r2 && r2.status === "em_analise");
  check("consulta codigo inexistente -> null", (await consultar("FBR-0000-0000")) === null);
  check("consulta vazio -> null", (await consultar("")) === null);
  const consErro = mk({ "denunciaStatus/FBR-ERRO-ERRO": "ERRO" });
  check("consulta com erro de rede -> null (silencioso)", (await consErro("FBR-ERRO-ERRO")) === null);
}

// ---- TRIAGEM (admin): carimba o espelho quando o status muda ----
{
  const state = { denuncias: [
    { id: "d1", status: "nova", codigoAcompanhamento: "FBR-AAAA-BBBB" },
    { id: "d2", status: "nova" }, // LEGADA sem codigo
    { id: "d3", status: "em_analise", codigoAcompanhamento: "FBR-CCCC-DDDD" },
  ] };
  const { db, ops } = makeDb();
  const win = { registrarAuditoria: noop };
  const triar = new Function("window", "db", "_FV", "state", "debug",
    blocoTriar + "\nreturn window.triarDenuncia;")(win, db, FV, state, noop);

  await triar("d1", "em_analise", "nota interna");
  const upDen = ops.find((o) => o.op === "update" && o.path === "denuncias/d1");
  const upEsp = ops.find((o) => o.op === "update" && o.path === "denunciaStatus/FBR-AAAA-BBBB");
  check("triagem atualiza a denuncia", !!upDen && upDen.data.status === "em_analise");
  check("triagem carimba o espelho {status, atualizadoEm server}", !!upEsp
    && upEsp.data.status === "em_analise" && upEsp.data.atualizadoEm === "SVR_TS"
    && JSON.stringify(Object.keys(upEsp.data).sort()) === JSON.stringify(["atualizadoEm", "status"]));

  const antes = ops.length;
  await triar("d2", "em_analise", "x"); // legada (sem codigo)
  const nv = ops.slice(antes);
  check("triagem de LEGADA: atualiza a denuncia, nao toca espelho", nv.some((o) => o.path === "denuncias/d2") && !nv.some((o) => String(o.path).startsWith("denunciaStatus")));

  const antes2 = ops.length;
  await triar("d3", "em_analise", "so ajustou nota"); // status igual: sem movimento
  check("triagem sem mudanca de status nao bumpa o espelho", !ops.slice(antes2).some((o) => String(o.path).startsWith("denunciaStatus")));
}

// ---- EXPURGO: apaga o espelho JUNTO da denuncia ----
{
  const state = { denuncias: [
    { id: "d1", status: "concluida", codigoAcompanhamento: "FBR-CCCC-DDDD" },
    { id: "d2", status: "concluida" }, // legada
  ] };
  const { db, ops } = makeDb();
  const excluir = new Function("window", "db", "state", "debug",
    blocoExcluir + "\nreturn window.excluirDenuncia;")({ registrarAuditoria: noop }, db, state, noop);

  await excluir("d1");
  check("expurgo apaga o espelho E a denuncia", ops.some((o) => o.op === "delete" && o.path === "denunciaStatus/FBR-CCCC-DDDD") && ops.some((o) => o.op === "delete" && o.path === "denuncias/d1"));

  const antes = ops.length;
  await excluir("d2");
  check("expurgo de legada apaga so a denuncia", ops.slice(antes).length === 1 && ops[antes].path === "denuncias/d2");

  // espelho ausente (delete rejeita) NAO bloqueia o expurgo do relato
  const st2 = { denuncias: [{ id: "d3", status: "concluida", codigoAcompanhamento: "FBR-EEEE-FFFF" }] };
  const { db: db2, ops: ops2 } = makeDb({ failDelete: "denunciaStatus/FBR-EEEE-FFFF" });
  const excluir2 = new Function("window", "db", "state", "debug",
    blocoExcluir + "\nreturn window.excluirDenuncia;")({ registrarAuditoria: noop }, db2, st2, noop);
  await excluir2("d3");
  check("espelho ausente NAO bloqueia expurgo da denuncia", ops2.some((o) => o.op === "delete" && o.path === "denuncias/d3"));
}

console.log("=== FASE A (Firestore stub) ===");
console.log(log.join("\n"));

// ============================================================
// FASE B  app real no harness demo
// ============================================================
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
function startServer(root, port) {
  return new Promise((resolve) => {
    const srv = createServer(async (req, res) => {
      try {
        let pth = decodeURIComponent(req.url.split("?")[0]);
        if (pth === "/") pth = "/public/index.html";
        const fp = join(root, normalize(pth).replace(/^(\.\.[/\\])+/, ""));
        const buf = await readFile(fp);
        res.writeHead(200, { "content-type": MIME[extname(fp)] || "application/octet-stream" });
        res.end(buf);
      } catch { res.writeHead(404); res.end("404"); }
    });
    srv.on("error", () => resolve(null)); // porta ocupada: usa o servidor ja no ar
    srv.listen(port, () => resolve(srv));
  });
}
const srv = await startServer(process.cwd(), 8081);
const BASE = "http://localhost:8081/public/index.html";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 920 }, deviceScaleFactor: 2, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
page.on("dialog", (d) => { errors.push("DIALOG (XSS?): " + d.message()); d.dismiss().catch(() => {}); });
await page.goto(BASE, { waitUntil: "networkidle" });

const setTema = (dark) => page.evaluate((d) => {
  document.documentElement.classList.add("modo-colab");
  document.documentElement.classList.toggle("cp-dark", d);
}, dark);
const shot = async (nome) => { await page.waitForTimeout(140); await page.screenshot({ path: `${OUT}/${nome}.png` }); log.push("shot " + nome + ".png"); };

// login colaborador + instrumenta os logs (prova de nao-chamada nos fluxos)
await page.evaluate(() => {
  _changelogChecado = true;
  state.users.push({ id: "colab-guard", usuario: "colab", senha: "x", role: "colaborador", nome: "Maria Colab", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("colab-guard", "x");
  state.view.page = "colab-home";
  _renderAppNow();
  document.querySelector("#acesso")?.remove();
  document.querySelector(".modal-backdrop button")?.click();
  window.__logCalls = [];
  const o1 = window.logEvento, o2 = window.registrarAuditoria;
  window.logEvento = (...a) => { window.__logCalls.push(["logEvento", ...a]); return o1 && o1(...a); };
  window.registrarAuditoria = (...a) => { window.__logCalls.push(["aud", ...a]); return o2 && o2(...a); };
});
await page.waitForTimeout(200);

// ---- PORTA (bifurcacao) ----
await page.click("#view [data-den-abrir]");
await page.waitForTimeout(250);
check("porta: 2 caminhos", await page.locator("#view .den-path").count() === 2);
check("porta: 'Fazer uma denúncia'", (await page.locator("#view").innerText()).includes("Fazer uma denúncia"));
check("porta: 'Acompanhar uma denúncia'", (await page.locator("#view").innerText()).includes("Acompanhar uma denúncia"));
check("porta: âncora Lei 14.457", (await page.locator("#view .den-lei").innerText()).includes("14.457"));
await setTema(false); await shot("acomp-den-app-porta-claro");
await setTema(true); await shot("acomp-den-app-porta-escuro");
await setTema(false);

// ---- ACOMPANHAR: consulta com codigo certo -> linha do tempo ----
await page.evaluate(() => {
  window.consultarDenunciaStatus = async (codigo) => {
    const id = String(codigo || "").trim().toUpperCase();
    return id === "FBR-7K2M-9QX4"
      ? { status: "em_analise", em: "2026-07-12T14:30:00.000Z", atualizadoEm: "2026-07-14T09:00:00.000Z" }
      : null;
  };
});
await page.click("#view [data-den-acompanhar]");
await page.waitForTimeout(250);
check("acompanhar: campo unico monospace", await page.locator("#view #den-cod").count() === 1);
check("acompanhar: micro-texto 'não registra quem você é'", (await page.locator("#view .den-acpriv").innerText()).toLowerCase().includes("não registra quem você"));
await page.fill("#view #den-cod", "FBR-7K2M-9QX4");
await page.click("#view [data-den-consultar]");
await page.waitForTimeout(350);
check("consulta certa: linha do tempo com 3 estágios", await page.locator("#view .den-tl__step").count() === 3);
check("consulta certa: estágio atual aceso = Em análise", (await page.locator("#view .den-tl__step.now .den-tl__body b").innerText()).includes("Em análise"));
check("consulta certa: Recebida com data", (await page.locator("#view .den-tl__step").first().innerText()).includes("jul 2026"));
check("consulta certa: protocolo ecoado", (await page.locator("#view .den-acres__code").innerText()).includes("FBR-7K2M-9QX4"));
await setTema(false); await shot("acomp-den-app-consulta-claro");
await setTema(true); await shot("acomp-den-app-consulta-escuro");
await setTema(false);

// re-render IDENTICO (nasce do state, sem flicker)
const idem = await page.evaluate(() => { const v = document.querySelector("#view"); const a = v.innerHTML; _renderAppNow(); const b = v.innerHTML; return a === b; });
check("acompanhar: re-render idêntico (state-driven)", idem);

// ---- ANTI-ENUMERACAO: invalido e inexistente = MESMA mensagem, sem toast ----
await page.fill("#view #den-cod", "FBR-3T9P-1KZ0");
await page.click("#view [data-den-consultar]");
await page.waitForTimeout(300);
check("consulta errada: mensagem neutra (sem linha do tempo)", await page.locator("#view .den-acnone").count() === 1 && await page.locator("#view .den-tl").count() === 0);
const msgA = (await page.locator("#view .den-acnone span").innerText()).trim();
await page.fill("#view #den-cod", "ZZZ-9999-9999");
await page.click("#view [data-den-consultar]");
await page.waitForTimeout(300);
const msgB = (await page.locator("#view .den-acnone span").innerText()).trim();
check("anti-enumeração: mensagem idêntica p/ códigos diferentes", msgA.length > 0 && msgA === msgB);
check("consulta errada: nenhum toast", await page.locator("#toast-root .toast").count() === 0);

// ---- CERIMONIA: envio -> codigo protagonista + copiar + hash expansivel ----
await page.click("#view [data-den-voltar]"); // acompanhar -> porta
await page.waitForTimeout(200);
await page.click("#view [data-den-fazer]");  // porta -> fluxo etapa 1
await page.waitForTimeout(200);
await page.click("#view [data-den-comecar]");
await page.waitForTimeout(200);
await page.click("#view .den-chip:nth-child(1)");
await page.fill("#view #den-ta", "Relato de teste com detalhes suficientes para passar do minimo.");
await page.waitForTimeout(80);
await page.click("#view [data-den-continuar]");
await page.waitForTimeout(200);
// stub do envio (demo nao tem firestore): devolve hash + codigo, como a funcao real
await page.evaluate(() => {
  window.enviarDenuncia = async () => ({ hash: "62fa84a9d3c1b7e04f8a6c2d19b3e5f7a0c4d8e2b6f1a9c3d7e5b0f4a8c2e327ef", codigo: "FBR-7K2M-9QX4" });
});
await page.click("#view [data-den-enviar]");
await page.waitForTimeout(1200);
check("cerimonia: título Denúncia recebida", (await page.locator("#view .den-cer__t").innerText()).includes("Denúncia recebida"));
check("cerimonia: código protagonista visível", (await page.locator("#view .den-key__code").innerText()).trim() === "FBR-7K2M-9QX4");
check("cerimonia: botão Copiar código", await page.locator("#view [data-den-copcod]").count() === 1);
check("cerimonia: guarda 'sua chave pra acompanhar'", (await page.locator("#view .den-guard").innerText()).toLowerCase().includes("chave pra acompanhar"));
check("cerimonia: selo anônima", (await page.locator("#view .den-cer__prot").innerText()).includes("anônima"));
check("cerimonia: anel de confirmação", await page.locator("#view .cer__ring").count() === 1);
// integridade rebaixada, expansivel
check("cerimonia: integridade rebaixada (linha discreta)", (await page.locator("#view .den-cint__tog").innerText()).toLowerCase().includes("integridade do relato"));
check("cerimonia: hash recolhido por padrão", await page.locator("#view .den-cint.open").count() === 0);
check("cerimonia: hash truncado 62fa84…e327ef", (await page.locator("#view .den-cint__short").innerText()).includes("62fa84") && (await page.locator("#view .den-cint__short").innerText()).includes("e327ef"));
await page.click("#view [data-den-integ]");
await page.waitForTimeout(200);
check("cerimonia: toque expande p/ hash completo", await page.locator("#view .den-cint.open").count() === 1 && (await page.locator("#view .den-cint__hash").innerText()).includes("62fa84a9d3c1b7e04f8a6c2d19b3e5f7a0c4d8e2b6f1a9c3d7e5b0f4a8c2e327ef"));
check("cerimonia: hash expandido tem copiar", await page.locator("#view [data-den-cophash]").count() === 1);
await page.click("#view [data-den-integ]"); // recolhe p/ o screenshot nominal
await page.waitForTimeout(150);
// copiar codigo nao quebra (clipboard pode falhar headless) e da feedback via toast
await page.click("#view [data-den-copcod]");
await page.waitForTimeout(250);
await setTema(false); await shot("acomp-den-app-cerimonia-claro");
await setTema(true); await shot("acomp-den-app-cerimonia-escuro");
await setTema(false);
// re-render IDENTICO da cerimonia
const idemCer = await page.evaluate(() => { const v = document.querySelector("#view"); const a = v.innerHTML; _renderAppNow(); const b = v.innerHTML; return a === b; });
check("cerimonia: re-render idêntico (state-driven)", idemCer);

// ---- ZERO log/auditoria nos fluxos do colaborador (envio + consulta) ----
const logCalls = await page.evaluate(() => window.__logCalls || []);
check("ZERO logEvento/registrarAuditoria nos fluxos do colab", logCalls.length === 0);

await browser.close();
if (srv) srv.close();

console.log("\n=== FASE B (app real) + total ===");
console.log(log.join("\n"));
console.log("\n=== ERROS (" + errors.length + ") ===");
console.log(errors.length ? errors.join("\n") : "nenhum");
process.exit(errors.length ? 1 : 0);
