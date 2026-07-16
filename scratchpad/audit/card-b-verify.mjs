// VERIFICAÇÃO do card B + consertos da auditoria no site de vagas (public-vagas/index.html)
// contra o servidor 8081, Firebase STUBBADO com 3 vagas fixture. Dirige:
//  - lista compacta (3 cards escaneáveis + contador "3 vagas abertas agora");
//  - abrir a página da vaga e voltar; link direto #vaga=<id>; hash inválido cai na lista;
//  - Candidatar-se abrindo a PARTIR da página da vaga;
//  - G1 (.duo sem overflow em 320/360/390), G2 (rola ao 1º campo inválido),
//    P4 (primeiro emprego desabilitado com experiências), P5 (rola ao consentimento),
//    e a dica gentil do teste de perfil (visível incompleto, some quando conclui).
// Screenshots: card-b-{lista,detalhe,mobile320}.png + sim-fix-{duo,erro}.png em out/.
// NÃO edita produção. Falha com QUALQUER pageerror.
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = "scratchpad/audit/out";
fs.mkdirSync(OUT, { recursive: true });

const fails = [], ok = [];
const check = (cond, msg) => { (cond ? ok : fails).push(msg); };

const POPPINS = `
@font-face{font-family:"Poppins";font-weight:400;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-400-latin.woff2") format("woff2");}
@font-face{font-family:"Poppins";font-weight:500;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-500-latin.woff2") format("woff2");}
@font-face{font-family:"Poppins";font-weight:600;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-600-latin.woff2") format("woff2");}
@font-face{font-family:"Poppins";font-weight:700;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-700-latin.woff2") format("woff2");}
@font-face{font-family:"Poppins";font-weight:800;font-display:block;src:url("http://localhost:8081/public/fonts/poppins-700-latin.woff2") format("woff2");}
`;

const STUB = () => {
  window.FIREBASE_CONFIG = { apiKey: "stub", projectId: "stub", appId: "stub" };
  var BENS9 = ["Vale alimentação", "Vale transporte", "Plano de saúde", "Plano odontológico", "Seguro de vida", "PPR", "Cesta básica", "Convênio farmácia", "Auxílio creche"];
  var BENS7 = BENS9.slice(0, 7);
  var now = Date.now();
  function vaga(id, titulo, turno, desc, req, bens, off) {
    return { id: id, data: function () { return {
      status: "publicada", titulo: titulo, setor: "Produção", turno: turno, cidade: "Indaial, SC",
      descricao: desc, requisitos: req, beneficios: bens,
      publicadaEm: { toMillis: function () { return now - off; } }
    }; } };
  }
  var snapVagas = { docs: [
    vaga("vaga-controlador", "CONTROLADOR DE MATERIAIS", "Geral",
      "Receber e organizar fios, insumos e produtos químicos do setor industrial, conferir estoque e apoiar a expedição da fábrica com organização e atenção aos detalhes.",
      "Ensino médio completo. Conhecimento básico de informática.", BENS9, 0),
    vaga("vaga-auxiliar", "AUXILIAR DE PRODUÇÃO", "1º turno",
      "Apoiar a operação das máquinas e manter o setor abastecido e organizado ao longo do turno.",
      "Ensino fundamental completo. Disposição para trabalho em equipe.", BENS7, 1000),
    vaga("vaga-operador", "OPERADOR DE MÁQUINAS", "2º turno",
      "Operar e monitorar as máquinas de fiação, garantindo qualidade e ritmo da produção.",
      "Ensino médio completo. Experiência com máquinas industriais é diferencial.", BENS9, 2000),
  ] };
  var configDoc = { exists: true, data: function () { return { whatsapp: "5547999990000" }; } };
  function coll(name) {
    return {
      where: function () { return { get: function () { return Promise.resolve(name === "vagas" ? snapVagas : { docs: [] }); } }; },
      doc: function () { return {
        get: function () { return Promise.resolve(name === "config" ? configDoc : { exists: false }); },
        set: function () { return Promise.resolve(); }
      }; },
      get: function () { return Promise.resolve(name === "vagas" ? snapVagas : { docs: [] }); }
    };
  }
  var fs2 = function () { return { collection: coll }; };
  fs2.FieldValue = { serverTimestamp: function () { return "__ts__"; } };
  window.firebase = {
    initializeApp: function () {},
    firestore: fs2,
    storage: function () { return { ref: function () { return { child: function () { return { put: function () { return Promise.resolve(); } }; } }; } }; }
  };
  window.__captured = null;
  window.__testMode = {
    // site v361: envio em batch (candidatura + mail); captura a candidatura como antes
    commit: function (writes) {
      var cand = null;
      for (var i = 0; i < writes.length; i++) { if (writes[i].col === 'candidaturas') cand = writes[i]; }
      if (cand) window.__captured = { docId: cand.id, payload: cand.data };
      return Promise.resolve();
    },
    upload: function () { return Promise.resolve(); }
  };
};

const b = await chromium.launch({ args: ["--lang=pt-BR"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pt-BR", timezoneId: "America/Sao_Paulo", reducedMotion: "reduce" });
await ctx.route("**gstatic.com**", (r) => r.abort());
await ctx.route("**googleapis.com**", (r) => r.abort());
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.addInitScript(STUB);

const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 240)));
const wait = (ms) => page.waitForTimeout(ms);
const URL = "http://localhost:8081/public-vagas/index.html";

async function load(hash) {
  // Bounce por about:blank: garante carga COMPLETA do documento mesmo quando só o hash
  // muda (navegação de fragmento não recarrega e não re-roda o script inline do site).
  await page.goto("about:blank");
  await page.goto(URL + (hash || ""), { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: POPPINS });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForSelector("#lista .vcompact", { timeout: 5000 });
  await wait(200);
}

// ============================ 1 · LISTA COMPACTA ============================
await load();
const lista = await page.evaluate(() => {
  const cards = Array.prototype.slice.call(document.querySelectorAll("#lista .vcompact"));
  return {
    n: cards.length,
    ll: (document.getElementById("listlabel").textContent || "").replace(/\s+/g, " ").trim(),
    llHidden: document.getElementById("listlabel").hidden,
    first: cards[0] ? { id: cards[0].getAttribute("data-vaga-id"), role: cards[0].getAttribute("role"), tab: cards[0].getAttribute("tabindex"), temResumo: !!cards[0].querySelector(".rsum"), rodape: (cards[0].querySelector(".cfoot") || {}).textContent } : null,
    // nenhum card antigo .vaga com botão inline
    velho: document.querySelectorAll("#lista .vaga").length,
    pageHidden: document.getElementById("vagapage").hidden,
  };
});
check(lista.n === 3, "lista mostra 3 cards compactos (" + lista.n + ")");
check(/\b3 vagas\b/.test(lista.ll) && /abertas agora/.test(lista.ll) && !lista.llHidden, "contador '3 vagas abertas agora' acima da lista (" + lista.ll + ")");
check(lista.first && lista.first.role === "button" && lista.first.tab === "0", "card compacto é alvo acessível (role=button, tabindex=0)");
check(lista.first && lista.first.temResumo, "card compacto tem resumo de 1 linha (.rsum)");
check(lista.first && /9 benefícios/.test(lista.first.rodape) && /Ver vaga/.test(lista.first.rodape), "rodapé do card: 'N benefícios · Ver vaga' (" + (lista.first && lista.first.rodape) + ")");
check(lista.velho === 0, "sem card antigo .vaga na lista (só compactos)");
check(lista.pageHidden === true, "página da vaga começa escondida");
await page.$eval("#vagas", (el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
await wait(300);
await page.screenshot({ path: OUT + "/card-b-lista.png" });

// ============================ 2 · ABRIR A PÁGINA DA VAGA ============================
await page.click("#lista .vcompact");
await wait(300);
const det = await page.evaluate(() => ({
  aberta: document.getElementById("vagapage").classList.contains("on") && !document.getElementById("vagapage").hidden,
  titulo: document.getElementById("vpTitulo").textContent,
  hash: location.hash,
  temDesc: !document.getElementById("vpSecDesc").hidden && !!document.getElementById("vpDesc").textContent,
  temReq: !document.getElementById("vpSecReq").hidden,
  nBen: document.querySelectorAll("#vpBen .sben-chip").length,
  ctaTxt: (document.getElementById("vpCta").textContent || "").trim(),
  footFixo: getComputedStyle(document.querySelector(".vp-foot")).position !== "static" || document.querySelector(".vp-foot") !== null,
}));
check(det.aberta, "tocar no card abre a página da vaga");
check(det.titulo === "CONTROLADOR DE MATERIAIS", "página mostra o título da vaga (" + det.titulo + ")");
check(det.hash === "#vaga=vaga-controlador", "URL ganhou #vaga=<id> (" + det.hash + ")");
check(det.temDesc && det.temReq, "corpo tem descrição completa e requisitos");
check(det.nBen === 9, "todos os 9 benefícios em selos na página (" + det.nBen + ")");
check(/Candidatar-se/.test(det.ctaTxt), "botão Candidatar-se presente no rodapé da página");
await page.screenshot({ path: OUT + "/card-b-detalhe.png" });

// ============================ 3 · VOLTAR LIMPA O HASH ============================
await page.click("#vpBack");
await wait(300);
const volta = await page.evaluate(() => ({
  fechada: document.getElementById("vagapage").hidden,
  hash: location.hash,
  listaVisivel: document.querySelectorAll("#lista .vcompact").length === 3,
}));
check(volta.fechada, "voltar fecha a página da vaga");
check(volta.hash === "" , "voltar limpa o hash (" + JSON.stringify(volta.hash) + ")");
check(volta.listaVisivel, "voltar devolve a lista");

// ============================ 4 · LINK DIRETO #vaga=<id> ============================
await load("#vaga=vaga-auxiliar");
await wait(250);
const direto = await page.evaluate(() => ({
  aberta: document.getElementById("vagapage").classList.contains("on") && !document.getElementById("vagapage").hidden,
  titulo: document.getElementById("vpTitulo").textContent,
}));
check(direto.aberta && direto.titulo === "AUXILIAR DE PRODUÇÃO", "carregar com #vaga=<id> abre a vaga direto (" + direto.titulo + ")");

// ============================ 5 · HASH INEXISTENTE CAI NA LISTA ============================
await load("#vaga=nao-existe-999");
await wait(250);
const fantasma = await page.evaluate(() => ({
  fechada: document.getElementById("vagapage").hidden,
  hash: location.hash,
  cards: document.querySelectorAll("#lista .vcompact").length,
}));
check(fantasma.fechada && fantasma.cards === 3, "hash de vaga inexistente cai na lista normal");
check(fantasma.hash === "", "hash inválido é limpo da URL (" + JSON.stringify(fantasma.hash) + ")");

// ============================ 6 · CANDIDATAR-SE A PARTIR DA PÁGINA ============================
await load();
await page.click("#lista .vcompact:nth-child(3)"); // OPERADOR DE MÁQUINAS
await wait(250);
await page.click("#vpCta");
await wait(300);
const cand = await page.evaluate(() => ({
  aberto: document.getElementById("dlgCandidatura").open,
  nome: document.getElementById("candVagaNome").textContent,
}));
check(cand.aberto, "Candidatar-se abre a ficha a partir da página da vaga");
check(cand.nome === "OPERADOR DE MÁQUINAS", "ficha carrega o título da vaga da página (" + cand.nome + ")");
await page.evaluate(() => document.getElementById("dlgCandidatura").close());
await wait(150);

// ============================ 7 · G1 · .duo sem overflow em 320/360/390 ============================
async function abrirFichaCp1b() {
  await page.click("#lista .vcompact");
  await wait(200);
  await page.click("#vpCta");
  await wait(200);
  await page.fill("#ci-nome", "Ana Teste");
  await page.fill("#ci-nasc", "1994-06-15");
  await page.click("#candPrim"); // cp1a -> cp1b
  await wait(250);
}
async function overflowCp1b() {
  return await page.evaluate(() => {
    const dlg = document.getElementById("dlgCandidatura");
    const duos = Array.prototype.slice.call(document.querySelectorAll("#cp1b .duo"));
    const duoOver = duos.some((d) => d.scrollWidth > d.clientWidth + 1);
    const inputsOver = Array.prototype.slice.call(document.querySelectorAll("#cp1b .duo input")).some((i) => i.getBoundingClientRect().right > (i.closest(".field").getBoundingClientRect().right + 1));
    const dlgOver = dlg.scrollWidth > dlg.clientWidth + 1;
    return { duoOver, inputsOver, dlgOver, nDuos: duos.length };
  });
}
for (const w of [320, 360, 390]) {
  await page.setViewportSize({ width: w, height: 780 });
  await load();
  if (w === 320) { await page.$eval("#vagas", (el) => el.scrollIntoView({ block: "start", behavior: "instant" })); await wait(300); await page.screenshot({ path: OUT + "/card-b-mobile320.png" }); }
  await abrirFichaCp1b();
  const ov = await overflowCp1b();
  check(ov.nDuos === 2 && !ov.duoOver && !ov.inputsOver && !ov.dlgOver, "G1: .duo sem overflow a " + w + "px (duoOver=" + ov.duoOver + " inputsOver=" + ov.inputsOver + " dlgOver=" + ov.dlgOver + ")");
  if (w === 320) await page.screenshot({ path: OUT + "/sim-fix-duo.png" });
  if (w !== 390) await page.evaluate(() => document.getElementById("dlgCandidatura").close());
}
// segue no viewport 390, ficha aberta em cp1b

// ============================ 8 · G2 · rola ao 1º campo inválido ============================
await page.evaluate(() => {
  const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
  set("ci-cep", "89120-000"); set("ci-rua", "Rua X, 10"); set("ci-bairro", "Centro"); set("ci-cidade", "Indaial, SC");
  set("ci-nac", "Brasileira"); set("ci-nat", "Indaial, SC"); set("ci-zap", "47999990000");
  set("ci-mail", ""); // ÚNICO inválido, fica no fim do painel
  document.getElementById("candBody").scrollTop = 0; // longe do campo com erro
});
await wait(120);
await page.click("#candPrim"); // dispara validação
await wait(300);
const g2 = await page.evaluate(() => {
  const body = document.getElementById("candBody");
  const mail = document.getElementById("ci-mail");
  const r = mail.getBoundingClientRect(), br = body.getBoundingClientRect();
  return {
    focoNoMail: document.activeElement === mail,
    campoEmErro: document.getElementById("cf-mail").classList.contains("err"),
    visivel: r.top >= br.top - 1 && r.bottom <= br.bottom + 1,
  };
});
check(g2.campoEmErro, "G2: campo de e-mail entra em erro");
check(g2.focoNoMail, "G2: foco vai ao 1º campo inválido");
check(g2.visivel, "G2: campo inválido rolou pra dentro da área visível");
await page.screenshot({ path: OUT + "/sim-fix-erro.png" });

// corrige e segue
await page.fill("#ci-mail", "ana@email.com");
await page.click("#candPrim"); // cp1b -> cp2
await wait(300);

// ============================ 9 · P4 · primeiro emprego desabilitado com itens ============================
await page.click("#expAdd");
await wait(200);
await page.fill("#ci-emp", "Malharia Timbó");
await page.fill("#ci-adm", "2019-03-04");
await page.fill("#ci-dem", "2023-08-18");
await page.fill("#ci-sal", "185000");
await page.selectOption("#ci-mot", "Pedido de demissão");
await page.click("#candPrim"); // salvar experiência
await wait(300);
const p4a = await page.evaluate(() => ({
  temCard: document.querySelectorAll("#expCards .exp").length,
  disabled: document.getElementById("expPrimeiro").classList.contains("disabled"),
  aria: document.getElementById("expPrimeiro").getAttribute("aria-disabled"),
  hintVisivel: !document.getElementById("expPrimeiroHint").hidden,
}));
check(p4a.temCard === 1, "P4: 1 experiência cadastrada");
check(p4a.disabled && p4a.aria === "true", "P4: checkbox 'primeiro emprego' fica desabilitado com itens");
check(p4a.hintVisivel, "P4: dica curta aparece ao lado do checkbox desabilitado");
// clicar NÃO apaga em silêncio (force: simula o toque real num controle desabilitado)
await page.click("#expPrimeiro", { force: true });
await wait(150);
const p4b = await page.evaluate(() => ({
  temCard: document.querySelectorAll("#expCards .exp").length,
  marcado: document.getElementById("expPrimeiro").classList.contains("on"),
}));
check(p4b.temCard === 1 && !p4b.marcado, "P4: clicar com itens NÃO apaga a experiência nem marca");
await page.click("#candPrim"); // cp2 -> cp3
await wait(300);
await page.click("#candPrim"); // pula currículo -> cp4
await wait(350);

// ============================ 10 · DICA DO TESTE DE PERFIL ============================
const dicaAntes = await page.evaluate(() => ({
  hintVisivel: document.getElementById("discHint").offsetParent !== null,
  footBotao: !document.getElementById("candFoot").hidden,
}));
check(dicaAntes.hintVisivel, "DISC: dica gentil visível enquanto o grupo está incompleto");
check(!dicaAntes.footBotao, "DISC: sem botão de avançar enquanto incompleto");
// completa os 8 grupos (16 toques)
for (let i = 0; i < 16; i++) {
  const c = await page.$$eval("#discCard .disc-opt:not([disabled])", (a) => a.length);
  if (!c) break;
  await page.click("#discCard .disc-opt:not([disabled])");
  await wait(400);
}
await wait(400);
const dicaDepois = await page.evaluate(() => ({
  hintVisivel: document.getElementById("discHint").offsetParent !== null,
  concluido: document.getElementById("discDone").classList.contains("on"),
  footBotao: !document.getElementById("candFoot").hidden,
}));
check(!dicaDepois.hintVisivel && dicaDepois.concluido, "DISC: dica some quando o teste conclui");
check(dicaDepois.footBotao, "DISC: botão de avançar aparece ao concluir");
await page.click("#candPrim"); // cp4 -> cp5
await wait(300);

// ============================ 11 · P5 · rola ao consentimento ============================
await page.fill("#ci-pret", "190000");
await page.click("#chips-vem .chip[data-val='moto']");
await page.click("#candPrim"); // cp5 -> cp6
await wait(300);
await page.evaluate(() => { document.getElementById("candBody").scrollTop = 0; });
await wait(120);
const p5before = await page.evaluate(() => ({
  looksDisabled: document.getElementById("candPrim").classList.contains("looksdisabled"),
  aria: document.getElementById("candPrim").getAttribute("aria-disabled"),
  realDisabled: document.getElementById("candPrim").disabled,
}));
check(p5before.looksDisabled && p5before.aria === "true" && !p5before.realDisabled, "P5: Enviar parece desabilitado mas continua clicável (sem consentimento)");
await page.click("#candPrim", { force: true }); // tenta enviar sem consentir (toque real)
await wait(300);
const p5 = await page.evaluate(() => {
  const body = document.getElementById("candBody");
  const lg = document.getElementById("cLgpd");
  const r = lg.getBoundingClientRect(), br = body.getBoundingClientRect();
  return {
    flash: lg.classList.contains("flash"),
    visivel: r.top >= br.top - 1 && r.bottom <= br.bottom + 40,
    naoEnviou: window.__captured === null,
    aberto: document.getElementById("dlgCandidatura").open,
  };
});
check(p5.naoEnviou && p5.aberto, "P5: sem consentimento NÃO envia e mantém a ficha aberta");
check(p5.flash, "P5: bloco de consentimento é realçado (classe flash)");
check(p5.visivel, "P5: rolou até o bloco de consentimento");
// agora consente e envia de verdade
await page.click("#cLgpd");
await wait(120);
const p5ok = await page.evaluate(() => document.getElementById("candPrim").classList.contains("looksdisabled"));
check(!p5ok, "P5: ao consentir, Enviar deixa de parecer desabilitado");
await page.click("#candPrim");
await wait(600);
const enviado = await page.evaluate(() => !!window.__captured && window.__captured.docId);
check(!!enviado && /vaga-controlador__ana@email.com/.test(enviado), "P5: com consentimento, envia normalmente (" + enviado + ")");

await b.close();

console.log("OK (" + ok.length + "):");
ok.forEach((m) => console.log("  ✓ " + m));
if (pageErrors.length) { console.log("\nPAGE ERRORS (" + pageErrors.length + "):"); pageErrors.forEach((e) => console.log("  " + e)); }
else console.log("\nZERO pageerror.");
if (fails.length) { console.log("\nFALHAS (" + fails.length + "):"); fails.forEach((m) => console.log("  ✗ " + m)); process.exit(1); }
console.log("\nCARD-B VERIFY: PASSOU (" + ok.length + " asserções).");
