// PROVA do pacote duplo:
//  PARTE A · Termo do canal de denuncias (2o gate do 1o acesso, DEPOIS da adesao):
//    - gate NAO aparece enquanto a adesao esta pendente (SO depois do gate de adesao);
//    - com a adesao ok e o canal pendente, o gate aparece; checkbox habilita o botao;
//    - aceite chama o registro (stub) -> overlay some + cerimonia com a nota "registro
//      imutavel, versao 2026-07-v1"; segundo acesso (termoCanalOk=true) NAO mostra o gate;
//    - gestor NUNCA ve o gate.
//    - consistencia de shape: constante do front (TERMO_CANAL_HASH) == hash cravado na regra
//      == sha256 do texto canonico (docs/termo-canal-denuncia-2026-07-v1.txt, LF).
//  PARTE B · Copiar link de divulgacao na tela Vagas do gestor:
//    - acao "Copiar link" so em vaga PUBLICADA (rascunho/encerrada nao tem);
//    - clipboard stubado recebe a URL canonica https://vagas.fiobras.com.br/#vaga=<id>;
//    - feedback inline (rotulo -> "Copiado").
// Uso: node scratchpad/audit/termo-canal-verify.mjs   (server em localhost:8081)
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const BASE = "http://localhost:8081/public/index.html";
const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });

const errors = [];
const log = [];
const check = (name, cond) => { log.push((cond ? "PASS " : "FAIL ") + name); if (!cond) errors.push("CHECK FAIL: " + name); };

// ---- consistencia de shape (node-side): file == rule == front ----
const canonBuf = readFileSync("docs/termo-canal-denuncia-2026-07-v1.txt");
const hashFile = createHash("sha256").update(canonBuf).digest("hex");
const rules = readFileSync("docs/firestore.rules", "utf8");
const utils = readFileSync("public/utils.js", "utf8");
const hashRule = (rules.match(/termoCanalDenuncia[\s\S]*?hashSha256 == '([0-9a-f]{64})'/) || [])[1];
const hashFront = (utils.match(/TERMO_CANAL_HASH = "([0-9a-f]{64})"/) || [])[1];
check("shape: sem CR no texto canonico (LF)", !canonBuf.includes(0x0d));
check("shape: hash do arquivo == hash cravado na regra", hashFile === hashRule);
check("shape: hash do arquivo == constante do front (utils.js)", hashFile === hashFront);
log.push("      hash canonico = " + hashFile);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 920 }, deviceScaleFactor: 2, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
page.on("dialog", (d) => { errors.push("DIALOG: " + d.message()); d.dismiss().catch(() => {}); });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => {
  _changelogChecado = true;
  document.querySelector(".modal-backdrop button")?.click();
  document.querySelector("#acesso")?.remove();
});

// ===================================================================
// PARTE B (gestor) + "gestor nunca ve o gate do canal"
// ===================================================================
await page.evaluate(() => {
  if (!currentUser() || currentUser().role !== "admin") login("admin", "admin");
  document.querySelector("#acesso")?.remove();
  state.vagas = [
    { id: "vg-pub-1", titulo: "Operador de maquina", setor: "Producao", turno: "1º turno", status: "publicada", publicadaEm: "2026-07-10" },
    { id: "vg-rasc-1", titulo: "Analista de RH", setor: "RH", turno: "Geral", status: "rascunho" },
    { id: "vg-enc-1", titulo: "Estagio administrativo", setor: "Adm", turno: "Geral", status: "encerrada" },
  ];
  state.candidaturas = [];
  state.vagasConfig = { whatsapp: "", beneficiosCatalogo: [] };
  state.view.page = "vagas"; state.view.vagaEdit = null; state.view.vagaSubtab = "vagas"; state.view.vagaCandAberta = null;
  _renderAppNow();
});
await page.waitForTimeout(250);
check("B: login admin (gestor)", await page.evaluate(() => currentUser()?.role === "admin"));
check("B: acao 'Copiar link' presente na vaga PUBLICADA", await page.locator('[data-vaga-link="vg-pub-1"]').count() === 1);
check("B: rascunho NAO tem 'Copiar link'", await page.locator('[data-vaga-link="vg-rasc-1"]').count() === 0);
check("B: encerrada NAO tem 'Copiar link'", await page.locator('[data-vaga-link="vg-enc-1"]').count() === 0);
check("A: gestor NUNCA ve o gate do canal", await page.locator("#termo-canal-overlay").count() === 0);
await page.screenshot({ path: `${OUT}/vagas-copiar-link.png` });

// clipboard stubado + clique
await page.evaluate(() => {
  window.__clip = null;
  // navigator.clipboard e um getter read-only no Chromium; sobrescreve via defineProperty.
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: (t) => { window.__clip = t; return Promise.resolve(); } },
  });
});
await page.click('[data-vaga-link="vg-pub-1"]');
await page.waitForTimeout(200);
check("B: clipboard recebeu a URL canonica com o id",
  await page.evaluate(() => window.__clip === "https://vagas.fiobras.com.br/#vaga=vg-pub-1"));
check("B: feedback inline (rotulo -> 'Copiado')",
  (await page.locator('[data-vaga-link="vg-pub-1"] [data-cop-lbl]').innerText()).trim() === "Copiado");

// ===================================================================
// PARTE A (colaborador)
// ===================================================================
await page.evaluate(() => {
  state.users.push({ id: "colab-guard", usuario: "colab", senha: "x", role: "colaborador", nome: "Maria Colab", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("colab-guard", "x");
  state.view.page = "colab-home";
  document.querySelector("#acesso")?.remove();
});
await page.waitForTimeout(200);
check("A: login colaborador (demo)", await page.evaluate(() => currentUser()?.role === "colaborador"));

// stub do registro (firebase.js nao carrega em demo)
await page.evaluate(() => {
  window.__canalReg = 0;
  window.registrarTermoCanalDenuncia = async () => { window.__canalReg++; return { ok: true }; };
});

// A1: adesao PENDENTE -> so o gate de adesao, canal NAO aparece (SO depois do gate de adesao)
await page.evaluate(() => {
  document.getElementById("termo-overlay")?.remove();
  document.getElementById("termo-canal-overlay")?.remove();
  state.termoAdesaoOk = false; state.termoCanalOk = false; state._termoAdesaoAceitoAgora = false;
  _renderAppNow();
});
await page.waitForTimeout(150);
check("A1: com adesao pendente, gate de ADESAO aparece", await page.locator("#termo-overlay").count() === 1);
check("A1: com adesao pendente, gate do CANAL NAO aparece", await page.locator("#termo-canal-overlay").count() === 0);

// A2: adesao OK + canal pendente -> gate do canal aparece; checkbox habilita o botao
await page.evaluate(() => {
  document.getElementById("termo-overlay")?.remove();
  state.termoAdesaoOk = true; state.termoCanalOk = false; state._termoAdesaoAceitoAgora = false;
  _renderAppNow();
});
await page.waitForTimeout(150);
check("A2: adesao ok + canal pendente -> gate do CANAL aparece", await page.locator("#termo-canal-overlay").count() === 1);
check("A2: titulo do gate correto", (await page.locator("#termo-canal-titulo").innerText()).includes("canal de denúncias"));
check("A2: nome/CPF auto-preenchidos (destaque .termo-campo)", await page.locator("#termo-canal-overlay .termo-campo").count() >= 2);
check("A2: botao comeca DESABILITADO", await page.locator("#termo-canal-aceitar").isDisabled());
await page.screenshot({ path: `${OUT}/termo-canal-gate-claro.png` });
await page.check("#termo-canal-chk");
await page.waitForTimeout(80);
check("A2: checkbox HABILITA o botao", await page.locator("#termo-canal-aceitar").isEnabled());

// screenshot do gate no tema ESCURO
await page.evaluate(() => document.documentElement.classList.add("cp-dark"));
await page.waitForTimeout(120);
await page.screenshot({ path: `${OUT}/termo-canal-gate-escuro.png` });
await page.evaluate(() => document.documentElement.classList.remove("cp-dark"));

// A3: aceite -> registro (stub) chamado, overlay some, cerimonia com a nota
await page.click("#termo-canal-aceitar");
await page.waitForTimeout(500);
check("A3: registro do canal chamado 1x (stub)", await page.evaluate(() => window.__canalReg === 1));
check("A3: overlay do gate removido apos aceite", await page.locator("#termo-canal-overlay").count() === 0);
check("A3: cerimonia 'Termo aceito' visivel", (await page.locator(".cer-ov .cer__t").innerText()).includes("Termo aceito"));
check("A3: cerimonia mostra a nota 'Registro imutavel'", (await page.locator(".cer-ov .cer__det").innerText()).includes("Registro imutável"));
check("A3: cerimonia mostra a versao 2026-07-v1", (await page.locator(".cer-ov .cer__det").innerText()).includes("2026-07-v1"));
check("A3: state.termoCanalOk = true", await page.evaluate(() => state.termoCanalOk === true));
await page.evaluate(() => document.querySelector(".cer-ov [data-cer-ok]")?.click());
await page.waitForTimeout(300);

// A4: segundo acesso (termoCanalOk = true) -> gate NAO reaparece
await page.evaluate(() => {
  document.getElementById("termo-canal-overlay")?.remove();
  state.termoCanalOk = true; state._termoAdesaoAceitoAgora = false;
  _renderAppNow();
});
await page.waitForTimeout(150);
check("A4: segundo acesso (ja aceitou) NAO mostra o gate", await page.locator("#termo-canal-overlay").count() === 0);

// A5: quem aceita a adesao AGORA nao ve o canal no mesmo acesso (espera o proximo)
await page.evaluate(() => {
  document.getElementById("termo-canal-overlay")?.remove();
  state.termoAdesaoOk = true; state.termoCanalOk = false; state._termoAdesaoAceitoAgora = true;
  _renderAppNow();
});
await page.waitForTimeout(150);
check("A5: adesao aceita no MESMO acesso adia o canal (nao empilha)", await page.locator("#termo-canal-overlay").count() === 0);

console.log(log.join("\n"));
console.log("\n=== ERROS (" + errors.length + ") ===");
console.log(errors.length ? errors.join("\n") : "nenhum");
await browser.close();
process.exit(errors.length ? 1 : 0);
