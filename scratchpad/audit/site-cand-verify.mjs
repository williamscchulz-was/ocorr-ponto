import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(RAIZ, "scratchpad", "audit", "out");
const FIX = path.join(RAIZ, "scratchpad", "audit", "fixtures");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FIX, { recursive: true });

// ---- fixtures PDF ----
const PDF_MIN = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF\n";
const smallPdf = path.join(FIX, "cv-ok.pdf");
const bigPdf = path.join(FIX, "cv-grande.pdf");
fs.writeFileSync(smallPdf, PDF_MIN);
fs.writeFileSync(bigPdf, Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(3.3 * 1024 * 1024, 65)])); // > 3MB

// ---- servidor estatico (repo root) na 8081 ----
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  let alvo = path.normalize(path.join(RAIZ, url));
  if (!alvo.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(alvo) && fs.statSync(alvo).isDirectory()) alvo = path.join(alvo, "index.html");
  fs.readFile(alvo, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(alvo).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
});
let servidorProprio = false;
await new Promise((resolve) => {
  srv.once("error", (e) => { if (e.code === "EADDRINUSE") { console.log("porta 8081 ja em uso, reusando servidor existente"); resolve(); } else throw e; });
  srv.listen(8081, () => { servidorProprio = true; resolve(); });
});
const URL = "http://localhost:8081/public-vagas/index.html";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 900, height: 900 }, serviceWorkers: "block" });
const p = await ctx.newPage();
const pageErrs = [];   // exceptions JS do codigo (fatal p/ (g))
const consoleErrs = []; // console.error (inclui 404 benigno do firebase.config.js ausente em dev)
p.on("pageerror", (e) => pageErrs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text()); });
// 404 esperado em dev: firebase.config.js (gitignored, presente so em prod)
const consoleFatais = () => consoleErrs.filter((t) => !/Failed to load resource/.test(t));

const FALHAS = [];
const ok = (nome, cond) => { if (cond) console.log("  ok:", nome); else { console.log("  FALHA:", nome); FALHAS.push(nome); } };
const wait = (ms) => p.waitForTimeout(ms);

// injeta stubs + uma vaga fake (dev sem FIREBASE_CONFIG => lista fica em "manutencao").
// Ficha real hoje = 7 painéis (PANES) em 6 etapas nomeadas (STEP_NOMES), a candidatura +
// o email "recebida" saem no MESMO commit (doCommit, batch atômico) e o WhatsApp de
// recebida sai numa escrita separada pós-commit (doSetWaMsg) — os 3 stubs abaixo cobrem
// exatamente essas 3 saídas (upload/commit/waMsg), casando com __testMode do index.html.
async function preparar() {
  await p.evaluate(() => {
    window.__spy = { uploads: [], commits: [], sets: [], mails: [], waMsgs: [], failNextCommit: null };
    window.__testMode = {
      upload: function (file, path) {
        window.__spy.uploads.push({ name: file && file.name, size: file && file.size, path: path });
        return Promise.resolve();
      },
      commit: function (writes) {
        window.__spy.commits.push(writes);
        var cand = writes.find(function (w) { return w.col === "candidaturas"; });
        var mail = writes.find(function (w) { return w.col === "mail"; });
        if (cand) window.__spy.sets.push(Object.assign({ docId: cand.id }, cand.data));
        if (mail) window.__spy.mails.push(Object.assign({ docId: mail.id }, mail.data));
        if (window.__spy.failNextCommit) { var e = new Error("dup"); e.code = window.__spy.failNextCommit; window.__spy.failNextCommit = null; return Promise.reject(e); }
        return Promise.resolve();
      },
      waMsg: function (id, data) {
        window.__spy.waMsgs.push({ id: id, data: data });
        return Promise.resolve();
      }
    };
    var lista = document.getElementById("lista");
    lista.innerHTML = '<button type="button" class="cta cta--form" data-vaga-id="vagaX" data-vaga-titulo="Operador de Maquina">Candidatar-se</button>';
  });
}
async function abrir() { await p.click(".cta--form"); await wait(120); }
async function fechar() { await p.evaluate(() => document.getElementById("dlgCandidatura").close()); await wait(80); }
async function limparSpy() { await p.evaluate(() => { window.__spy.uploads = []; window.__spy.commits = []; window.__spy.sets = []; window.__spy.mails = []; window.__spy.waMsgs = []; window.__spy.failNextCommit = null; }); }
async function spy() { return p.evaluate(() => window.__spy); }

// ===== painel 1 (Dados pessoais), 2 sub-painéis: cp1a identificação, cp1b endereço+contato =====
async function preencherP1a(nome, nasc) {
  await p.evaluate(({ nome, nasc }) => {
    document.getElementById("ci-nome").value = nome;
    document.getElementById("ci-nasc").value = nasc;
  }, { nome, nasc });
}
async function preencherP1b(email, tel) {
  await p.evaluate(({ email, tel }) => {
    document.getElementById("ci-cep").value = "89100-000";
    document.getElementById("ci-rua").value = "Rua das Flores, 100";
    document.getElementById("ci-bairro").value = "Centro";
    document.getElementById("ci-cidade").value = "Indaial, SC";
    document.getElementById("ci-nac").value = "Brasileira";
    document.getElementById("ci-nat").value = "Indaial, SC";
    document.getElementById("ci-zap").value = tel;
    document.getElementById("ci-mail").value = email;
  }, { email, tel });
}
async function preencherP5() {
  await p.evaluate(() => {
    document.getElementById("ci-pret").value = "2500,00";
    document.querySelector('#chips-vem .chip[data-val="carro"]').click();
  });
}
async function marcarHoneypot() {
  await p.evaluate(() => { document.getElementById("candSite").value = "http://spam"; });
}

// ===== painel 4 (Perfil / DISC): mesmo teste de 8 grupos mais/menos de sempre =====
async function clicaDim(dim) {
  await p.evaluate((d) => {
    var el = document.querySelector('#discCard .disc-opt[data-dim="' + d + '"]:not([disabled])');
    if (el) el.click();
  }, dim);
}
async function bloco(most, least) { await clicaDim(most); await wait(320); await clicaDim(least); await wait(400); }
async function completaDiscDD() { for (let i = 0; i < 8; i++) await bloco("D", "S"); await wait(250); }

async function estado() {
  return p.evaluate(() => {
    var PANES = ["cp1a", "cp1b", "cp2", "cp3", "cp4", "cp5", "cp6"];
    return {
      pane: PANES.find(function (id) { return !document.getElementById(id).hidden; }),
      step: document.getElementById("stepCount").textContent,
      footHidden: document.getElementById("candFoot").hidden,
      primTxt: document.getElementById("candPrim").textContent,
      primDisabled: document.getElementById("candPrim").disabled,
      cerOn: document.getElementById("cer").classList.contains("on"),
      discDone: document.getElementById("discDone").classList.contains("on"),
      erroGeral: document.getElementById("erroGeral").textContent,
      cvErro: document.getElementById("cvErro").textContent,
      chipOn: document.getElementById("cvChip").classList.contains("on"),
      nome: document.getElementById("ci-nome").value,
      email: document.getElementById("ci-mail").value
    };
  });
}

// ============================================================
await p.goto(URL, { waitUntil: "load" });
// Da folga pro SDK do firebase (CDN gstatic) terminar de carregar antes de abrir a
// ficha: sem isso, "em" (FieldValue.serverTimestamp) pode chegar null por pura corrida
// de rede, não por bug do site.
await p.waitForFunction(() => window.firebase && window.firebase.firestore, null, { timeout: 8000 }).catch(() => {});
await wait(200);

// ===== (a) fluxo completo (7 painéis / 6 etapas nomeadas) navegável + voltar preserva =====
console.log("\n(a) fluxo completo (Dados pessoais x2, Experiências, Currículo, Perfil, Adicionais, Revisão) + voltar preserva");
await preparar();
await abrir();
let st = await estado();
ok("(a) abre na Etapa 1 de 6, painel cp1a", st.step === "Etapa 1 de 6" && st.pane === "cp1a");
await p.locator("#dlgCandidatura").screenshot({ path: OUT + "/site-cand-1.png" });
await preencherP1a("Marcos Pereira", "1990-05-10");
await p.click("#candPrim"); await wait(300);            // cp1a -> cp1b (mesma Etapa 1)
st = await estado();
ok("(a) avancou pro painel cp1b, mesma Etapa 1 de 6", st.pane === "cp1b" && st.step === "Etapa 1 de 6");
await preencherP1b("navega@x.com", "(47) 9 8812-4407");
await p.click("#candPrim"); await wait(300);            // cp1b -> cp2 (Experiências)
st = await estado();
ok("(a) avancou pra Etapa 2 (Experiências), painel cp2", st.step === "Etapa 2 de 6" && st.pane === "cp2");
await p.click("#candPrim"); await wait(300);            // cp2 -> cp3 (Currículo), sem experiencia obrigatoria
st = await estado();
ok("(a) avancou pra Etapa 3 (Currículo), painel cp3", st.step === "Etapa 3 de 6" && st.pane === "cp3");
await p.setInputFiles("#cvInput", smallPdf); await wait(1800); // o tear (peca 4) tece ~1.5s antes de assentar no chip
st = await estado();
ok("(a) chip do curriculo apareceu", st.chipOn === true);
await p.locator("#dlgCandidatura").screenshot({ path: OUT + "/site-cand-2.png" });
await p.click("#candPrim"); await wait(400);            // cp3 -> cp4 (Perfil/DISC)
st = await estado();
ok("(a) Etapa 4 (Perfil), footer escondido ate concluir DISC", st.step === "Etapa 4 de 6" && st.pane === "cp4" && st.footHidden === true);
await p.locator("#dlgCandidatura").screenshot({ path: OUT + "/site-cand-3.png" });
await completaDiscDD();
st = await estado();
ok("(a) DISC concluido, footer liberado", st.discDone === true && st.footHidden === false);
await p.locator("#dlgCandidatura").screenshot({ path: OUT + "/site-cand-3-done.png" });
await p.click("#candPrim"); await wait(400);            // cp4 -> cp5 (Adicionais)
st = await estado();
ok("(a) Etapa 5 (Adicionais), painel cp5", st.step === "Etapa 5 de 6" && st.pane === "cp5");
await preencherP5();
await p.click("#candPrim"); await wait(400);            // cp5 -> cp6 (Revisão)
st = await estado();
ok("(a) Etapa 6 (Revisão), painel cp6", st.step === "Etapa 6 de 6" && st.pane === "cp6");
await p.locator("#dlgCandidatura").screenshot({ path: OUT + "/site-cand-4.png" });
// voltar 6 -> 5 -> 4 -> 3 -> 2 -> 1b -> 1a preservando os dados de cada painel
await p.click("#candBack"); await wait(350);
st = await estado();
ok("(a) voltou pro painel cp5, Adicionais", st.pane === "cp5" && st.step === "Etapa 5 de 6");
await p.click("#candBack"); await wait(350);
st = await estado();
ok("(a) voltou pro painel cp4, DISC ainda concluido", st.pane === "cp4" && st.discDone === true);
await p.click("#candBack"); await wait(350);
st = await estado();
ok("(a) voltou pro painel cp3, chip do curriculo preservado", st.pane === "cp3" && st.chipOn === true);
await p.click("#candBack"); await wait(350);
st = await estado();
ok("(a) voltou pro painel cp2, Experiências", st.pane === "cp2");
await p.click("#candBack"); await wait(350);
st = await estado();
ok("(a) voltou pro painel cp1b, e-mail preservado", st.pane === "cp1b" && st.email === "navega@x.com");
await p.click("#candBack"); await wait(350);
st = await estado();
ok("(a) voltou pro painel cp1a, Etapa 1 de 6, nome preservado", st.pane === "cp1a" && st.step === "Etapa 1 de 6" && st.nome === "Marcos Pereira");
await fechar();

// ===== (b)+(c) payload correto (nascimento/disc/discPrimario/curriculoPath) + charset do
// arquivo + email "recebida" e WhatsApp "recebida" enfileirados no mesmo fluxo =====
console.log("\n(b)+(c) payload + charset do nome do arquivo (email com '+') + mail/waMsg de recebida");
await limparSpy();
await abrir();
await preencherP1a("Marcos Pereira", "1990-05-10");
await p.click("#candPrim"); await wait(300);
await preencherP1b("joao+teste@x.com", "(47) 9 8812-4407");
await p.click("#candPrim"); await wait(300);            // -> cp2
await p.click("#candPrim"); await wait(300);            // -> cp3
await p.setInputFiles("#cvInput", smallPdf); await wait(300);
await p.click("#candPrim"); await wait(400);            // -> cp4
await completaDiscDD();
await p.click("#candPrim"); await wait(400);            // -> cp5
await preencherP5();
await p.click("#candPrim"); await wait(400);            // -> cp6 (revisao)
await p.click("#cLgpd"); await wait(150);
st = await estado();
ok("(b) enviar habilita so apos LGPD", st.primDisabled === false);
await p.click("#candPrim"); await wait(600);            // envia (commit + mail no mesmo batch, waMsg depois)
let s = await spy();
const set = s.sets[0], up = s.uploads[0], mail = s.mails[0], wa = s.waMsgs[0];
ok("(b) 1 commit com a candidatura", s.sets.length === 1);
ok("(b) nascimento correto", set && set.nascimento === "1990-05-10");
ok("(b) disc = {d:8,i:0,s:-8,c:0} (sempre D-mais, S-menos)", set && JSON.stringify(set.disc) === JSON.stringify({ d: 8, i: 0, s: -8, c: 0 }));
ok("(b) discPrimario = D", set && set.discPrimario === "D");
ok("(b) mensagem sempre vazia (não há campo de texto livre na ficha)", set && set.mensagem === "");
ok("(b) endereço composto (rua/bairro/cidade/cep)", set && /Rua das Flores, 100/.test(set.endereco) && /CEP 89100-000/.test(set.endereco));
ok("(b) pretensão salarial numérica", set && set.pretensaoSalarial === 2500);
ok("(b) como viria = carro", set && set.comoViria === "carro");
ok("(b) status nova + em serverTimestamp", set && set.status === "nova" && set.em != null);
ok("(b) docId = vagaX__joao+teste@x.com (email real, '+' preservado)", set && set.docId === "vagaX__joao+teste@x.com");
ok("(b) curriculoPath presente", set && ("curriculoPath" in set) && !!set.curriculoPath);
ok("(c) curriculoPath casa charset do Storage", set && /^curriculos\/[A-Za-z0-9@._-]+\.pdf$/.test(set.curriculoPath));
ok("(c) '+' do email virou '-' no nome do arquivo", set && set.curriculoPath.indexOf("+") === -1 && set.curriculoPath.indexOf("joao-teste@x.com") !== -1);
ok("(c) upload gravou o mesmo path", up && up.path === set.curriculoPath);
ok("(b) email 'recebida' no MESMO commit, to = e-mail do candidato", mail && mail.docId === set.docId && mail.to === set.email);
ok("(b) template do e-mail = candidatura-recebida, com 1o nome + vaga", mail && mail.template && mail.template.name === "candidatura-recebida" && mail.template.data.nome === "Marcos" && mail.template.data.vaga === "Operador de Maquina");
ok("(b) waMsg de recebida enfileirado (fire-and-forget pós-commit)", wa && wa.id === set.docId && wa.data.template === "candidatura_recebida");
ok("(b) waMsg com telefone exato e 1o nome do candidato", wa && wa.data.para === set.telefone && wa.data.params.nome === "Marcos" && wa.data.params.vaga === "Operador de Maquina");
st = await estado();
ok("(b) cerimonia exibida apos envio", st.cerOn === true);
await p.locator("#dlgCandidatura").screenshot({ path: OUT + "/site-cand-cer.png" });
await fechar();

// ===== (d) pular curriculo -> payload SEM curriculoPath =====
console.log("\n(d) pular curriculo");
await limparSpy();
await abrir();
await preencherP1a("Marcos Pereira", "1990-05-10");
await p.click("#candPrim"); await wait(300);
await preencherP1b("semcv@x.com", "(47) 9 8812-4407");
await p.click("#candPrim"); await wait(300);            // -> cp2
await p.click("#candPrim"); await wait(300);            // -> cp3
await p.click("#btnPular"); await wait(400);            // pula -> cp4
await completaDiscDD();
await p.click("#candPrim"); await wait(400);            // -> cp5
await preencherP5();
await p.click("#candPrim"); await wait(400);            // -> cp6
await p.click("#cLgpd"); await wait(120);
await p.click("#candPrim"); await wait(500);
s = await spy();
ok("(d) 1 commit, sem upload", s.sets.length === 1 && s.uploads.length === 0);
ok("(d) payload NAO tem curriculoPath", s.sets[0] && !("curriculoPath" in s.sets[0]));
await fechar();

// ===== (e) curriculo > 3MB rejeitado com mensagem =====
console.log("\n(e) curriculo > 3MB rejeitado");
await limparSpy();
await abrir();
await preencherP1a("Marcos Pereira", "1990-05-10");
await p.click("#candPrim"); await wait(300);
await preencherP1b("grande@x.com", "(47) 9 8812-4407");
await p.click("#candPrim"); await wait(300);            // -> cp2
await p.click("#candPrim"); await wait(300);            // -> cp3
await p.setInputFiles("#cvInput", bigPdf); await wait(300);
st = await estado();
ok("(e) mensagem de 3 MB exibida", /3 MB/.test(st.cvErro));
ok("(e) chip NAO apareceu (arquivo recusado)", st.chipOn === false);
await fechar();

// ===== (f) honeypot: preenchido finge sucesso e NAO envia =====
console.log("\n(f) honeypot");
await limparSpy();
await abrir();
await preencherP1a("Marcos Pereira", "1990-05-10");
await p.click("#candPrim"); await wait(300);
await preencherP1b("bot@x.com", "(47) 9 8812-4407");
await marcarHoneypot();
await p.click("#candPrim"); await wait(300);            // -> cp2
await p.click("#candPrim"); await wait(300);            // -> cp3
await p.click("#btnPular"); await wait(400);            // -> cp4
await completaDiscDD();
await p.click("#candPrim"); await wait(400);            // -> cp5
await preencherP5();
await p.click("#candPrim"); await wait(400);            // -> cp6
await p.click("#cLgpd"); await wait(120);
await p.click("#candPrim"); await wait(600);            // "envia" (honeypot; cerimonia tem delay de 460ms)
s = await spy();
st = await estado();
ok("(f) honeypot: nenhum commit gravado", s.sets.length === 0);
ok("(f) honeypot: nenhum waMsg enfileirado", s.waMsgs.length === 0);
ok("(f) honeypot: cerimonia exibida mesmo assim", st.cerOn === true);
await fechar();

// ===== extra: erro de duplicada reaproveita a mensagem existente =====
console.log("\n(extra) mensagem de candidatura duplicada");
await limparSpy();
await p.evaluate(() => { window.__spy.failNextCommit = "permission-denied"; });
await abrir();
await preencherP1a("Marcos Pereira", "1990-05-10");
await p.click("#candPrim"); await wait(300);
await preencherP1b("dup@x.com", "(47) 9 8812-4407");
await p.click("#candPrim"); await wait(300);            // -> cp2
await p.click("#candPrim"); await wait(300);            // -> cp3
await p.click("#btnPular"); await wait(400);            // -> cp4
await completaDiscDD();
await p.click("#candPrim"); await wait(400);            // -> cp5
await preencherP5();
await p.click("#candPrim"); await wait(400);            // -> cp6
await p.click("#cLgpd"); await wait(120);
await p.click("#candPrim"); await wait(500);
st = await estado();
ok("(extra) erro duplicada exibido", /Ja recebemos|Já recebemos/.test(st.erroGeral));
await fechar();

// ===== (g) zero pageerror =====
console.log("\n(g) pageerrors:", pageErrs.length ? pageErrs : "nenhum");
console.log("    console.error benignos (404 esperado do firebase.config.js em dev):", consoleErrs.length ? consoleErrs : "nenhum");
ok("(g) zero pageerror (excecao JS)", pageErrs.length === 0);
ok("(g) zero console.error fatal (fora o 404 de config em dev)", consoleFatais().length === 0);

console.log("\n" + (FALHAS.length ? "RESULTADO: " + FALHAS.length + " falha(s)" : "RESULTADO: TUDO OK"));
await b.close();
if (servidorProprio) srv.close();
process.exit(FALHAS.length ? 1 : 0);
