// PROBE do site de vagas (public-vagas/index.html) contra o servidor 8081, com Firebase
// STUBBADO (__testMode). Preenche a FICHA COMPLETA e AFIRMA que o payload casa campo a
// campo com o contrato do create de /candidaturas (docs/firestore.rules): enums
// hifenizados, filhos int, pretensaoSalarial/salario number, datas, mensagem "", indicacao
// string, docId = vagaId__email. Também prova o XSS ESCAPADO na revisão.
import { chromium } from "playwright";

const ALLOWED = ["vagaId", "vagaTitulo", "nome", "telefone", "email", "mensagem", "em", "status", "nascimento", "estadoCivil", "escolaridade", "filhos", "endereco", "nacionalidade", "naturalidade", "experiencias", "pretensaoSalarial", "comoViria", "indicacao", "disc", "discPrimario", "curriculoPath"];
const REQUIRED = ["vagaId", "vagaTitulo", "nome", "telefone", "email", "mensagem", "em", "status", "nascimento", "estadoCivil", "escolaridade", "filhos", "endereco", "nacionalidade", "naturalidade", "experiencias", "pretensaoSalarial", "comoViria", "indicacao"];
const EC = ["solteiro", "casado", "uniao-estavel", "divorciado", "viuvo"];
const ESC = ["fundamental", "medio-incompleto", "medio-completo", "tecnico", "superior-incompleto", "superior-completo", "pos"];
const VEM = ["a-pe", "bicicleta", "moto", "carro", "carona", "onibus"];
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

const fails = [];
const ok = [];
const check = (cond, msg) => { (cond ? ok : fails).push(msg); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
await ctx.addInitScript(() => {
  // serverTimestamp sem SDK real
  window.firebase = { firestore: (function () { const f = function () {}; f.FieldValue = { serverTimestamp: () => "__server_ts__" }; return f; })() };
  window.__captured = null;
  window.__capturedMail = null;
  window.__testMode = {
    // site v361: envio virou BATCH (candidatura + mail juntos); o stub captura os dois
    commit: (writes) => {
      const cand = writes.find((w) => w.col === "candidaturas");
      const mail = writes.find((w) => w.col === "mail");
      if (cand) window.__captured = { docId: cand.id, payload: cand.data };
      if (mail) window.__capturedMail = { docId: mail.id, payload: mail.data };
      return Promise.resolve();
    },
    upload: () => Promise.resolve(),
  };
});
const p = await ctx.newPage();
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));
await p.goto("http://localhost:8081/public-vagas/index.html", { waitUntil: "domcontentloaded" });

async function preencherFicha(opts) {
  return await p.evaluate(async (o) => {
    const $ = (id) => document.getElementById(id);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const set = (id, val) => { const el = $(id); el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
    // abre o dialog via botão de vaga injetado
    document.querySelectorAll(".cta--form._probe").forEach((x) => x.remove());
    const btn = document.createElement("button");
    btn.className = "cta cta--form _probe";
    btn.setAttribute("data-vaga-id", o.vagaId);
    btn.setAttribute("data-vaga-titulo", o.vagaTitulo);
    document.getElementById("lista").appendChild(btn);
    btn.click();
    await sleep(60);
    // cp1a
    set("ci-nome", o.nome);
    set("ci-nasc", "1994-03-12");
    set("ci-ec", "casado");
    set("ci-esc", "medio-completo");
    if (o.filhos) { $("seg-filhos").querySelector('[data-val="sim"]').click(); $("nstep-filhos").querySelector('[data-d="1"]').click(); }
    $("candPrim").click(); await sleep(60);
    // cp1b
    set("ci-cep", "89120-000");
    set("ci-rua", "Rua das Palmeiras, 240");
    set("ci-bairro", "Warnow");
    set("ci-cidade", "Indaial, SC");
    set("ci-nac", "Brasileira");
    set("ci-nat", "Blumenau, SC");
    set("ci-zap", "(47) 9 9812-3344");
    set("ci-mail", o.email);
    $("candPrim").click(); await sleep(60);
    // cp2 experiências
    if (o.primeiroEmprego) {
      $("expPrimeiro").click(); await sleep(20);
    } else {
      $("expAdd").click(); await sleep(30);
      set("ci-emp", "Tecelagem Malhas SC");
      set("ci-adm", "2019-03-04");
      set("ci-dem", "2023-08-18");
      set("ci-sal", "185000");
      set("ci-mot", "Pedido de demissão");
      $("candPrim").click(); await sleep(40); // salvar experiência
    }
    $("candPrim").click(); await sleep(60); // continuar -> cp3
    // cp3 currículo: pular
    $("candPrim").click(); await sleep(80); // -> cp4
    // cp4 DISC (16 toques: most+least de 8 blocos)
    for (let i = 0; i < 16; i++) {
      const opt = document.querySelector("#discCard .disc-opt:not([disabled])");
      if (!opt) break;
      opt.click();
      await sleep(420);
    }
    await sleep(500);
    $("candPrim").click(); await sleep(80); // -> cp5
    // cp5 adicionais
    set("ci-pret", "190000");
    $("chips-vem").querySelector('[data-val="moto"]').click();
    $("seg-conhece").querySelector('[data-val="sim"]').click();
    set("ci-quem", o.indicacao);
    $("candPrim").click(); await sleep(80); // -> cp6
    const revHtml = $("revCard").innerHTML;
    const stepTxt = $("stepCount").textContent;
    $("cLgpd").click(); await sleep(20);
    $("candPrim").click(); await sleep(80); // enviar
    return { captured: window.__captured, capturedMail: window.__capturedMail, revHtml, stepTxt };
  }, opts);
}

// ---- cenário principal: com experiência + XSS ----
const XSS_NOME = '<img src=x onerror=alert(1)> Ana Paula';
const XSS_QUEM = '<b>João</b> da Producao';
const r = await preencherFicha({ vagaId: "vaga123", vagaTitulo: "Auxiliar de Produção", nome: XSS_NOME, email: "ana@email.com", indicacao: XSS_QUEM, filhos: true, primeiroEmprego: false });

check(!!r.captured, "payload capturado pelo __testMode.commit (batch)");
// email 1 (recebida) no MESMO batch, shape exato da rule /mail
check(!!r.capturedMail, "mail doc capturado no mesmo batch");
if (r.capturedMail) {
  const m = r.capturedMail.payload;
  check(r.capturedMail.docId === "vaga123__ana@email.com", "mail docId == candidatura docId");
  check(Object.keys(m).every((k) => ["to", "template"].includes(k)), "mail hasOnly to/template");
  check(m.to === "ana@email.com", "mail.to == email da candidatura");
  check(m.template && m.template.name === "candidatura-recebida", "molde pinado candidatura-recebida");
  check(m.template && m.template.data && typeof m.template.data.nome === "string" && !m.template.data.nome.includes(" "), "data.nome = primeiro nome (1 token)");
  check(m.template && m.template.data && m.template.data.vaga === "Auxiliar de Produção", "data.vaga = título da vaga");
}
if (r.captured) {
  const pl = r.captured.payload;
  const keys = Object.keys(pl);
  check(keys.every((k) => ALLOWED.includes(k)), "sem chave fora do hasOnly das rules (extra: " + keys.filter((k) => !ALLOWED.includes(k)).join(",") + ")");
  check(REQUIRED.every((k) => k in pl), "todos os obrigatórios presentes (faltando: " + REQUIRED.filter((k) => !(k in pl)).join(",") + ")");
  check(pl.vagaId === "vaga123", "vagaId ok");
  check(pl.vagaTitulo === "Auxiliar de Produção", "vagaTitulo == título da vaga");
  check(r.captured.docId === "vaga123__ana@email.com", "docId = vagaId__email.lower (" + r.captured.docId + ")");
  check(pl.status === "nova", "status == nova");
  check(pl.mensagem === "", "mensagem == '' (obrigatório)");
  check(pl.em === "__server_ts__", "em presente (serverTimestamp)");
  check(typeof pl.nome === "string" && pl.nome.includes("<img"), "nome cru preservado no payload (dado, não HTML)");
  check(DATE.test(pl.nascimento), "nascimento é YYYY-MM-DD");
  check(EC.includes(pl.estadoCivil), "estadoCivil enum hifenizado: " + pl.estadoCivil);
  check(ESC.includes(pl.escolaridade), "escolaridade enum hifenizado: " + pl.escolaridade);
  check(Number.isInteger(pl.filhos) && pl.filhos === 2, "filhos int == 2 (" + pl.filhos + ", type " + typeof pl.filhos + ")");
  check(typeof pl.endereco === "string" && pl.endereco.length >= 1 && pl.endereco.length <= 200, "endereco string 1..200");
  check(typeof pl.nacionalidade === "string" && pl.nacionalidade.length <= 60, "nacionalidade string <=60");
  check(typeof pl.naturalidade === "string" && pl.naturalidade.length <= 60, "naturalidade string <=60");
  check(Array.isArray(pl.experiencias) && pl.experiencias.length === 1, "experiencias lista com 1 item (" + (pl.experiencias || []).length + ")");
  const e = (pl.experiencias || [])[0] || {};
  const ekeys = Object.keys(e).sort().join(",");
  check(ekeys === "admissao,demissao,empresa,motivoSaida,salario", "experiencia shape fechado: " + ekeys);
  check(typeof e.salario === "number" && e.salario === 1850, "salario number == 1850 (" + e.salario + ", type " + typeof e.salario + ")");
  check(DATE.test(e.admissao) && DATE.test(e.demissao), "admissao/demissao YYYY-MM-DD");
  check(typeof e.motivoSaida === "string" && e.motivoSaida === "Pedido de demissão", "motivoSaida string (enviado como texto): " + e.motivoSaida);
  check(typeof e.empresa === "string" && e.empresa.length >= 1 && e.empresa.length <= 80, "empresa string 1..80");
  check(typeof pl.pretensaoSalarial === "number" && pl.pretensaoSalarial === 1900, "pretensaoSalarial number == 1900 (" + pl.pretensaoSalarial + ", type " + typeof pl.pretensaoSalarial + ")");
  check(VEM.includes(pl.comoViria) && pl.comoViria === "moto", "comoViria enum hifenizado == moto: " + pl.comoViria);
  check(typeof pl.indicacao === "string" && pl.indicacao.includes("João") && pl.indicacao.length <= 80, "indicacao string com nome (<=80)");
  check(pl.disc && typeof pl.disc === "object" && ["d", "i", "s", "c"].every((k) => Number.isInteger(pl.disc[k])), "disc {d,i,s,c} ints");
  check(["D", "I", "S", "C", "equilibrado"].includes(pl.discPrimario), "discPrimario válido: " + pl.discPrimario);
  check(!("curriculoPath" in pl), "sem curriculoPath quando não anexou (opcional)");
}
// XSS escapado na revisão
check(r.revHtml.includes("&lt;img") && !r.revHtml.includes("<img src=x onerror"), "XSS de nome ESCAPADO na revisão");
check(r.revHtml.includes("&lt;b&gt;João") && !r.revHtml.includes("<b>João"), "XSS de indicação ESCAPADO na revisão");
check(r.stepTxt === "Etapa 6 de 6", "stepper chegou em Etapa 6 de 6 (" + r.stepTxt + ")");

// ---- cenário 2: primeiro emprego => experiencias [] ----
const r2 = await preencherFicha({ vagaId: "vagaZ", vagaTitulo: "Auxiliar de Produção", nome: "Bruno Souza", email: "bruno@email.com", indicacao: "", filhos: false, primeiroEmprego: true });
check(!!r2.captured, "cenário 2 capturado");
if (r2.captured) {
  const pl2 = r2.captured.payload;
  check(Array.isArray(pl2.experiencias) && pl2.experiencias.length === 0, "primeiro emprego -> experiencias == [] (" + JSON.stringify(pl2.experiencias) + ")");
  check(pl2.filhos === 0 && Number.isInteger(pl2.filhos), "filhos 'não' -> 0 int");
  check(pl2.indicacao === "", "indicação 'não conhece' -> '' ");
}

// ---- cenário 3: EMPREGO ATUAL (motivo "Ainda trabalho aqui" -> demissao "") ----
// Fluxo próprio até cp2 pra o probe (a) medir o campo Demissão sumindo, (b) tirar print,
// (c) provar que trocar o motivo o traz de volta, (d) capturar payload com demissao "".
await p.evaluate(async () => {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const set = (id, val) => { const el = $(id); el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  document.querySelectorAll(".cta--form._probe").forEach((x) => x.remove());
  const btn = document.createElement("button");
  btn.className = "cta cta--form _probe";
  btn.setAttribute("data-vaga-id", "vagaAtual");
  btn.setAttribute("data-vaga-titulo", "Auxiliar de Produção");
  document.getElementById("lista").appendChild(btn);
  btn.click(); await sleep(60);
  set("ci-nome", "Carla Atual"); set("ci-nasc", "1990-05-05"); set("ci-ec", "solteiro"); set("ci-esc", "medio-completo");
  $("candPrim").click(); await sleep(60);
  set("ci-cep", "89120-000"); set("ci-rua", "Rua X, 10"); set("ci-bairro", "Centro"); set("ci-cidade", "Indaial, SC");
  set("ci-nac", "Brasileira"); set("ci-nat", "Indaial, SC"); set("ci-zap", "47999990000"); set("ci-mail", "carla@email.com");
  $("candPrim").click(); await sleep(60);
  // cp2: abre o form de experiência e preenche tudo MENOS a demissão
  $("expAdd").click(); await sleep(30);
  set("ci-emp", "Fiobras"); set("ci-adm", "2012-02-01"); set("ci-sal", "250000");
});
const demAntes = await p.evaluate(() => document.getElementById("cf-dem").hidden);
check(demAntes === false, "campo Demissão visível com o motivo padrão");
// escolhe "Ainda trabalho aqui"
await p.evaluate(() => { const s = document.getElementById("ci-mot"); s.value = "Ainda trabalho aqui"; s.dispatchEvent(new Event("change", { bubbles: true })); });
const comAtual = await p.evaluate(() => ({
  demHidden: document.getElementById("cf-dem").hidden,
  demValue: document.getElementById("ci-dem").value,
  duoSolo: document.getElementById("duo-datas").classList.contains("solo"),
}));
check(comAtual.demHidden === true, "campo Demissão SOME com 'Ainda trabalho aqui'");
check(comAtual.demValue === "", "campo Demissão é LIMPO ao virar emprego atual");
check(comAtual.duoSolo === true, "grid de datas vira coluna única (solo), sem buraco");
// screenshot do formulário com o campo escondido
await p.screenshot({ path: "scratchpad/audit/out/vagas-emprego-atual-form.png" });
// troca pra outro motivo: o campo VOLTA e volta a ser obrigatório
await p.evaluate(() => { const s = document.getElementById("ci-mot"); s.value = "Pedido de demissão"; s.dispatchEvent(new Event("change", { bubbles: true })); });
const volta = await p.evaluate(() => ({ demHidden: document.getElementById("cf-dem").hidden, duoSolo: document.getElementById("duo-datas").classList.contains("solo") }));
check(volta.demHidden === false, "trocar pra outro motivo TRAZ o campo Demissão de volta");
check(volta.duoSolo === false, "grid volta a 2 colunas com outro motivo");
// valida inline coerente: com "Ainda trabalho aqui", salvar NÃO exige data (nada de 'Informe a data')
const r3 = await p.evaluate(async () => {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const set = (id, val) => { const el = $(id); el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  const s = $("ci-mot"); s.value = "Ainda trabalho aqui"; s.dispatchEvent(new Event("change", { bubbles: true }));
  $("candPrim").click(); await sleep(40); // salvar experiência (sem erro de data)
  const demErr = $("cf-dem").classList.contains("err");
  const inForm = !$("expForm").hidden; // se salvou, saiu do form
  const cardHtml = $("expCards").innerHTML;
  $("candPrim").click(); await sleep(60); // cp2 -> cp3
  $("candPrim").click(); await sleep(80); // cp3 -> cp4
  for (let i = 0; i < 16; i++) { const opt = document.querySelector("#discCard .disc-opt:not([disabled])"); if (!opt) break; opt.click(); await sleep(420); }
  await sleep(500);
  $("candPrim").click(); await sleep(80); // cp4 -> cp5
  set("ci-pret", "300000");
  $("chips-vem").querySelector('[data-val="carro"]').click();
  $("seg-conhece").querySelector('[data-val="nao"]').click();
  $("candPrim").click(); await sleep(80); // cp5 -> cp6
  const revHtml = $("revCard").innerHTML;
  $("cLgpd").click(); await sleep(20);
  $("candPrim").click(); await sleep(80); // enviar
  return { captured: window.__captured, revHtml, cardHtml, demErr, inForm };
});
check(r3.demErr === false && r3.inForm === false, "emprego atual salva SEM 'Informe a data' (nunca mais exige demissão)");
check(r3.cardHtml.includes("atual") && !/—/.test(r3.cardHtml), "card da experiência mostra 'atual' (sem intervalo com fim)");
check(/·\s*atual/.test(r3.revHtml), "revisão da ficha mostra '· atual' no lugar do fim");
check(!!r3.captured && r3.captured.docId === "vagaAtual__carla@email.com", "cenário atual: docId ok (" + (r3.captured && r3.captured.docId) + ")");
if (r3.captured) {
  const ea = (r3.captured.payload.experiencias || [])[0] || {};
  check(ea.demissao === "", "payload: experiencia.demissao === '' (emprego atual, casa com as rules)");
  check(DATE.test(ea.admissao), "payload: admissao segue YYYY-MM-DD (só a demissão fica vazia)");
  check(Object.keys(ea).sort().join(",") === "admissao,demissao,empresa,motivoSaida,salario", "payload: shape da experiência intacto (chave demissao PRESENTE, valor '')");
  check(ea.motivoSaida === "Ainda trabalho aqui", "payload: motivoSaida = 'Ainda trabalho aqui'");
}

await b.close();
console.log("OK (" + ok.length + "):");
ok.forEach((m) => console.log("  ✓ " + m));
if (jsErros.length) console.log("\npageErrors:\n  " + jsErros.join("\n  "));
if (fails.length) { console.log("\nFALHAS (" + fails.length + "):"); fails.forEach((m) => console.log("  ✗ " + m)); process.exit(1); }
console.log("\nPROBE SITE FICHA: PASSOU (" + ok.length + " asserções).");
