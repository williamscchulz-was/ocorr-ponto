// ============================================================
// PROBE — Oportunidades internas no Portal do Colaborador (v409: chip de STATUS)
// ------------------------------------------------------------
// Dirige o APP REAL (localhost:8081, demo, sem Firebase), loga como colaborador e semeia
// o proprio funcionario + state.vagasInternasColab + state.meusInteressesInternos. Prova:
//   1) zero pageerror
//   2) home: card discreto "Oportunidade interna aberta" com o titulo da vaga
//   3) tela colab-oportunidades: cards, um com interesse (vio--st + chip de status), cabecalho
//   4) OS 4 ROTULOS DE GENTE (v409): recebida/nova => "Recebido pela GP"; em-analise => "Em
//      analise"; aprovada E contratada => "Aprovado, a GP vai falar com voce"; nao-seguiu =>
//      "Processo encerrado" (tons neu/info/ok/ok/end)
//   5) bottom sheet: abre, 3 linhas do snapshot, microcopy de discricao EXATA, textarea max 300
//   6) envio: passa o snapshot correto + motivacao ao registrarInteresseInterno; sucesso mostra
//      cerimonia (vi-sheet--ok) e persiste o chip
//   7) repetir NEGA gracioso (rule rejeita)
//   8) SHAPE 1:1: chaves do payload do cliente (firebase.js) == hasOnly do criaInterna
//   9) RETIRAR interesse: acao so no card com interesse; confirmar chama retirarInteresseInterno
//  10) re-render FORCADO da tela nasce identico (m1 anti-flicker), antes e depois de retirar
//
// Uso: node scratchpad/audit/vagas-internas-colab-verify.mjs   (servidor 8081 na raiz)
// ============================================================
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";

const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:8081/public/index.html";

const fails = [], ok = [];
const check = (c, m) => (c ? ok : fails).push(m);
const normaliza = (html) => String(html || "").replace(/gmg\d+/g, "gmgN").replace(/gm[a-z]+\d+w?/g, "gmsN");

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
await p.addInitScript(() => { window.__semVT = true; });
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));

await p.goto(URL, { waitUntil: "networkidle" });

// login como colaborador (demo) com vinculo + codigo
await p.evaluate(() => {
  _changelogChecado = true;
  state.users.push({ id: "colab-vi", usuario: "colab", senha: "x", role: "colaborador", nome: "Camila Souza", funcionarioId: "f-0428", codigo: "0428" });
  login("colab-vi", "x");
});
await p.waitForTimeout(300);
await p.evaluate(() => { document.querySelector("#acesso")?.remove(); });

// SEED: meu funcionario (snapshot) + vagas internas + meu interesse na vi-2
await p.evaluate(() => {
  state.funcionarios = [{ id: "f-0428", nome: "Camila Souza", cargo: "Op. de Máquina", setor: "Produção", turno: 1, admissao: "2023-07-23", codigo: "0428" }];
  state.vagasInternasColab = [
    { id: "vi-1", titulo: "Auxiliar de Controle de Qualidade", setor: "Qualidade", turno: "1º turno", cidade: "Indaial, SC", descricao: "Apoio à rotina de inspeção e controle de qualidade." },
    { id: "vi-2", titulo: "Assistente Administrativo", setor: "Administrativo", turno: "Geral", cidade: "Indaial, SC", descricao: "Rotinas administrativas de apoio às áreas." },
  ];
  state.meusInteressesInternos = { "vi-2": { status: "nova", em: "2026-07-20T10:00:00.000Z" } };
  state.view.page = "colab-home";
  _renderAppNow();
});
await p.waitForTimeout(300);

// 1) zero pageerror
check(jsErros.length === 0, "zero pageerror" + (jsErros.length ? " · " + jsErros.join(" | ") : ""));

// 2) home: card discreto (título quando 1 vaga; contagem quando N)
const home = await p.evaluate(() => {
  const nudge2 = document.querySelector("#view .vi-nudge");
  const t2 = (nudge2?.querySelector(".vi-nudge__t")?.textContent || "").trim();
  const nav = nudge2?.dataset.nav;
  const bak = state.vagasInternasColab;
  state.vagasInternasColab = [bak[0]]; _renderAppNow();
  const t1 = (document.querySelector("#view .vi-nudge .vi-nudge__t")?.textContent || "").trim();
  state.vagasInternasColab = bak; _renderAppNow();
  return { existe: !!nudge2, t1, t2, nav };
});
check(home.existe, "home tem o card 'Oportunidade interna aberta'");
check(home.t1 === "Auxiliar de Controle de Qualidade", "com 1 vaga, o card mostra o título → " + JSON.stringify(home.t1));
check(home.t2 === "2 oportunidades abertas", "com N vagas, o card resume a contagem → " + JSON.stringify(home.t2));
check(home.nav === "colab-oportunidades", "card leva à tela nova (data-nav)");

// 3) tela colab-oportunidades
const tela = await p.evaluate(() => {
  document.querySelector("#view .vi-nudge")?.click(); // navega via bindColabNav
  _renderAppNow();
  const cards = [...document.querySelectorAll("#view .vio")];
  const stCard = cards.find((c) => c.classList.contains("vio--st"));
  return {
    page: state.view.page,
    n: cards.length,
    stIdx: cards.findIndex((c) => c.classList.contains("vio--st")),
    temHead: !!document.querySelector("#view .cp-head"),
    chipTxt: (stCard?.querySelector(".vio-st")?.textContent || "").replace(/\s+/g, " ").trim(),
    btnLivre: !!cards.find((c) => !c.classList.contains("vio--st"))?.querySelector("[data-vi-interesse]"),
  };
});
check(tela.page === "colab-oportunidades", "navegou para a tela nova");
check(tela.n === 2, "2 cards de oportunidade (achou " + tela.n + ")");
check(tela.temHead, "cabeçalho com voltar + título");
check(tela.stIdx === 1, "a vaga com interesse (vi-2) aparece com o chip de status");
check(tela.chipTxt === "Recebido pela GP", "status 'nova' vira o rótulo 'Recebido pela GP' → " + JSON.stringify(tela.chipTxt));
check(tela.btnLivre, "a vaga sem interesse tem o botão 'Tenho interesse'");

// 4) OS 4 ROTULOS DE GENTE (nunca o jargão do funil), com o tom certo
const rotulos = await p.evaluate(() => {
  const casos = [
    ["nova", "Recebido pela GP", "vio-st--neu"],
    ["recebida", "Recebido pela GP", "vio-st--neu"],
    ["em-analise", "Em análise", "vio-st--info"],
    ["aprovada", "Aprovado, a GP vai falar com você", "vio-st--ok"],
    ["contratada", "Aprovado, a GP vai falar com você", "vio-st--ok"],
    ["nao-seguiu", "Processo encerrado", "vio-st--end"],
  ];
  const out = [];
  for (const [st, txt, tone] of casos) {
    state.meusInteressesInternos = { "vi-2": { status: st, em: "2026-07-20T10:00:00.000Z" } };
    state.view.page = "colab-oportunidades"; _renderAppNow();
    const card = [...document.querySelectorAll("#view .vio")][1];
    const chip = card?.querySelector(".vio-st");
    out.push({ st, txt, tone, got: (chip?.textContent || "").replace(/\s+/g, " ").trim(), toneOk: !!chip && chip.classList.contains(tone) });
  }
  return out;
});
rotulos.forEach((r) => {
  check(r.got === r.txt, `status '${r.st}' => "${r.txt}" (achou ${JSON.stringify(r.got)})`);
  check(r.toneOk, `status '${r.st}' com o tom ${r.tone}`);
});

// restaura o estado base (nova) pra os próximos passos
await p.evaluate(() => { state.meusInteressesInternos = { "vi-2": { status: "nova", em: "2026-07-20T10:00:00.000Z" } }; _renderAppNow(); });

// 5) bottom sheet
const sheet = await p.evaluate(async () => {
  document.querySelector("#view .vio:not(.vio--st) [data-vi-interesse]").click();
  await new Promise((r) => setTimeout(r, 120));
  const s = document.querySelector(".vi-sheet");
  return {
    aberto: !!s && s.classList.contains("on"),
    recvN: s ? s.querySelectorAll(".vi-recv__it").length : 0,
    disc: (s?.querySelector(".vi-disc")?.textContent || "").replace(/\s+/g, " ").trim(),
    cargoRow: (s?.querySelectorAll(".vi-recv__v")[1]?.textContent || "").trim(),
    turnoRow: (s?.querySelectorAll(".vi-recv__v")[2]?.textContent || "").trim(),
    maxlen: s?.querySelector("#vi-mot-tx")?.getAttribute("maxlength"),
  };
});
check(sheet.aberto, "bottom sheet abriu (.vi-sheet.on)");
check(sheet.recvN === 3, "3 linhas do snapshot 'A GP recebe' (achou " + sheet.recvN + ")");
check(sheet.disc.includes("Só a equipe de Gestão de Pessoas vê o seu interesse. O seu líder não é avisado."), "microcopy de discrição EXATA do mock");
check(/Op\. de Máquina · Produção/.test(sheet.cargoRow), "linha cargo·setor do snapshot correta → " + JSON.stringify(sheet.cargoRow));
check(/1º Turno/.test(sheet.turnoRow), "linha turno·tempo de casa do snapshot → " + JSON.stringify(sheet.turnoRow));
check(sheet.maxlen === "300", "motivação com maxlength 300 (achou " + sheet.maxlen + ")");

// 6) envio: captura snapshot + motivacao; sucesso -> cerimonia + persiste o chip
const envio = await p.evaluate(async () => {
  window.__intArgs = null;
  window.registrarInteresseInterno = async (vagaId, snapshot, motivacao) => {
    window.__intArgs = { vagaId, snapshot, motivacao };
    state.meusInteressesInternos[vagaId] = { status: "nova", em: new Date().toISOString() };
  };
  document.querySelector("#vi-mot-tx").value = "  Tenho acompanhado as inspeções.  ";
  document.querySelector("#vi-confirm").click();
  await new Promise((r) => setTimeout(r, 300));
  const s = document.querySelector(".vi-sheet");
  return { args: window.__intArgs, okShown: !!s && s.classList.contains("vi-sheet--ok") };
});
check(!!envio.args && envio.args.vagaId === "vi-1", "envio dispara para a vaga certa (vi-1)");
check(!!envio.args && envio.args.snapshot && envio.args.snapshot.cargo === "Op. de Máquina" && envio.args.snapshot.setor === "Produção", "snapshot: cargo/setor corretos");
check(!!envio.args && envio.args.snapshot && envio.args.snapshot.turno === "1º Turno" && Number.isInteger(envio.args.snapshot.tempoCasaMeses) && envio.args.snapshot.tempoCasaMeses >= 0, "snapshot: turno formatado + tempoCasaMeses inteiro (" + (envio.args && envio.args.snapshot && envio.args.snapshot.tempoCasaMeses) + ")");
check(!!envio.args && envio.args.motivacao === "Tenho acompanhado as inspeções.", "motivação trimada e passada");
check(envio.okShown, "sucesso mostra a cerimônia (vi-sheet--ok)");

// fecha a cerimonia e confere que o card virou chip de status
const persist = await p.evaluate(async () => {
  document.querySelector("#vi-close")?.click();
  await new Promise((r) => setTimeout(r, 350));
  _renderAppNow();
  const c = [...document.querySelectorAll("#view .vio")][0];
  return { done: !!c && c.classList.contains("vio--st"), chip: (c?.querySelector(".vio-st")?.textContent || "").trim(), semSheet: !document.querySelector(".vi-sheet") };
});
check(persist.done, "após enviar, o card vi-1 mostra o chip de status (persistente)");
check(/Recebido pela GP/.test(persist.chip), "o chip persistido mostra 'Recebido pela GP'");
check(persist.semSheet, "sheet removido do DOM ao fechar");

// 7) repetir NEGA gracioso (a rule rejeita)
const nega = await p.evaluate(async () => {
  state.meusInteressesInternos = {}; // reabre o botao pra forcar a tentativa
  _renderAppNow();
  document.querySelector("#view .vio:not(.vio--st) [data-vi-interesse]").click();
  await new Promise((r) => setTimeout(r, 120));
  window.registrarInteresseInterno = async () => { const e = new Error("denied"); e.code = "permission-denied"; throw e; };
  document.querySelector("#vi-confirm").click();
  await new Promise((r) => setTimeout(r, 250));
  return { erro: (document.querySelector(".vi-erro")?.textContent || "").trim(), okShown: !!document.querySelector(".vi-sheet.vi-sheet--ok") };
});
check(/já demonstrou interesse/i.test(nega.erro), "repetir mostra mensagem graciosa → " + JSON.stringify(nega.erro));
check(!nega.okShown, "erro NÃO mostra a cerimônia de sucesso (não é falso-sucesso)");

await p.evaluate(() => { document.querySelector(".vi-sheet")?.remove(); });

// 8) SHAPE 1:1: chaves do payload do cliente == hasOnly do criaInterna
const fbSrc = readFileSync("public/firebase.js", "utf8");
const mPay = fbSrc.match(/registrarInteresseInterno[\s\S]*?const payload = \{([\s\S]*?)\};/);
const keys = mPay ? [...mPay[1].matchAll(/^\s*([a-zA-Z]+)\s*[:,]/gm)].map((x) => x[1]) : [];
const esperado = ["vagaId", "origem", "uid", "funcionarioId", "nome", "cargo", "setor", "turno", "tempoCasaMeses", "motivacao", "em", "status"];
check(JSON.stringify([...keys].sort()) === JSON.stringify([...esperado].sort()), "payload do cliente = 12 chaves do criaInterna → " + JSON.stringify(keys));

// 9) m1 idempotente da tela (com interesse)
const m1 = await p.evaluate(() => {
  state.meusInteressesInternos = { "vi-2": { status: "em-analise", em: "2026-07-20T10:00:00.000Z" } };
  state.view.page = "colab-oportunidades"; _renderAppNow();
  const view = document.querySelector("#view");
  const a = view.innerHTML;
  window.__fpForceWrite = true; _renderAppNow(); window.__fpForceWrite = false;
  return { a, b: view.innerHTML };
});
check(normaliza(m1.a) === normaliza(m1.b), "re-render forçado da tela nasce idêntico (m1)" + (normaliza(m1.a) !== normaliza(m1.b) ? " · DIVERGIU" : ""));

// 10) RETIRAR interesse (v2): so aparece no card com interesse; confirmar chama a func real
const retirar = await p.evaluate(async () => {
  state.meusInteressesInternos = { "vi-2": { status: "nova", em: "2026-07-20T10:00:00.000Z" } };
  state.view.page = "colab-oportunidades"; _renderAppNow();
  const cards = [...document.querySelectorAll("#view .vio")];
  const stCard = cards.find((c) => c.classList.contains("vio--st"));
  const livreCard = cards.find((c) => !c.classList.contains("vio--st"));
  const undoDone = stCard?.querySelector("[data-vi-retirar]");
  const undoLivre = livreCard?.querySelector("[data-vi-retirar]");
  const undoVisivelDone = !!undoDone && getComputedStyle(undoDone).display !== "none";
  const semUndoLivre = !undoLivre; // no card livre o botão nem existe (não é renderizado)
  const undoAlvo = undoDone?.dataset.viRetirar;
  window.__retirado = null;
  window.retirarInteresseInterno = async (vagaId) => {
    window.__retirado = vagaId;
    if (state.meusInteressesInternos) delete state.meusInteressesInternos[vagaId];
  };
  undoDone?.click();
  await new Promise((r) => setTimeout(r, 140));
  const dlg = document.querySelector(".modal-backdrop--confirm");
  const okBtn = dlg?.querySelector("[data-ok]");
  const okLabel = (okBtn?.textContent || "").trim();
  okBtn?.click();
  await new Promise((r) => setTimeout(r, 320));
  _renderAppNow();
  const card = [...document.querySelectorAll("#view .vio")][1];
  return {
    undoVisivelDone, semUndoLivre, undoAlvo,
    temDlg: !!dlg, okLabel,
    retirado: window.__retirado,
    stateLimpo: !state.meusInteressesInternos["vi-2"],
    cardLivre: !!card && !card.classList.contains("vio--st"),
    btnVoltou: !!card?.querySelector("[data-vi-interesse]"),
  };
});
check(retirar.undoVisivelDone, "botão 'Retirar interesse' visível no card com interesse");
check(retirar.semUndoLivre, "card livre NÃO renderiza o botão 'Retirar interesse'");
check(retirar.undoAlvo === "vi-2", "retirar aponta pra vaga certa (vi-2)");
check(retirar.temDlg && /retirar interesse/i.test(retirar.okLabel), "confirmação aparece com ação 'Retirar interesse' → " + JSON.stringify(retirar.okLabel));
check(retirar.retirado === "vi-2", "confirmar chama retirarInteresseInterno(vi-2)");
check(retirar.stateLimpo, "estado limpo: meusInteressesInternos['vi-2'] removido");
check(retirar.cardLivre, "card vi-2 volta ao estado livre (sem vio--st)");
check(retirar.btnVoltou, "card volta a mostrar 'Tenho interesse'");

// 11) m1 idempotente após retirar
const m1b = await p.evaluate(() => {
  state.view.page = "colab-oportunidades"; _renderAppNow();
  const view = document.querySelector("#view");
  const a = view.innerHTML;
  window.__fpForceWrite = true; _renderAppNow(); window.__fpForceWrite = false;
  return { a, b: view.innerHTML };
});
check(normaliza(m1b.a) === normaliza(m1b.b), "re-render forçado após retirar nasce idêntico (m1)" + (normaliza(m1b.a) !== normaliza(m1b.b) ? " · DIVERGIU" : ""));

try { await p.evaluate(() => { state.meusInteressesInternos = { "vi-2": { status: "aprovada", em: "2026-07-20T10:00:00.000Z" } }; state.view.page = "colab-oportunidades"; _renderAppNow(); }); const el = await p.$("#view"); await el.screenshot({ path: OUT + "/vagas-internas-colab.png" }); } catch { /* */ }
await b.close();

console.log("\n=== VAGAS INTERNAS (colaborador) · verificação ===");
ok.forEach((m) => console.log("  OK   " + m));
fails.forEach((m) => console.log("  FAIL " + m));
console.log("\n" + ok.length + " ok, " + fails.length + " fail");
process.exit(fails.length ? 1 : 0);
