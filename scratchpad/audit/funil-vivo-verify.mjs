// ============================================================
// PROBE — Funil VIVO + KPI Internos + candidaturas novas (v409)
// ------------------------------------------------------------
// Dirige o APP REAL (localhost:8081, demo, sem Firebase), loga como admin e semeia
// state.vagas + state.candidaturas + um STUB de atualizarStatusCandidatura. Prova:
//   A) funil vivo: trilho (5 nós data-cand-st) + selo + confirmação; status atual ativo;
//      legado 'nova' = Recebida; o botão antigo "Mensagem ao candidato" AUSENTE (data-cand-msg,
//      .g-cand__msg, .g-cand__seg, .msg-canal todos zerados)
//   B) mover status: anima 1x (WAAPI no card), confirmação fresca -> assenta em permanente, flag
//      candJustMoved consumida; re-render FORÇADO nasce idêntico E não re-anima (0 churn)
//   C) reduced-motion: mover = zero animação, confirmação já vai direto pro permanente
//   D) chip "N candidaturas · M novas": com novas (sufixo + dot), zera ao abrir a vaga, e a linha
//      NÃO quebra no pior caso (título longo + Pública e interna + rascunho com botões)
//   E) KPI "Internos": aparece só com canal interno aberto, conta os internos, drill filtra
//   F) central do gestor: entrada "Candidatura nova em {vaga}" com tempo relativo, some ao abrir a
//      vaga; denúncia SEGUE fora da central (invariante)
//
// Uso: node scratchpad/audit/funil-vivo-verify.mjs   (servidor 8081 na raiz)
// ============================================================
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:8081/public/index.html";

const fails = [], ok = [];
const check = (c, m) => (c ? ok : fails).push(m);
// Normaliza ids de gradiente + a serialização do atributo style: depois da animação a bolinha
// tem a posição SETADA por JS (CSSOM serializa "left: 24%;"), enquanto o template escreve
// "left:24%". Renderizam idêntico e o gate real (flicker-guard) nunca move candidatura, então é
// diferença só cosmética entre estilo-setado e estilo-template; normaliza pra comparar o resto.
const normEstilo = (s) => s.replace(/:\s+/g, ":").replace(/;\s*/g, ";").replace(/;$/, "");
const normaliza = (html) => String(html || "").replace(/gmg\d+/g, "gmgN").replace(/gm[a-z]+\d+w?/g, "gmsN")
  .replace(/style="([^"]*)"/g, (m, s) => 'style="' + normEstilo(s) + '"');

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
await p.addInitScript(() => { window.__semVT = true; });
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));

await p.goto(URL, { waitUntil: "networkidle" });
await p.evaluate(() => {
  _changelogChecado = true;
  const u = state.users.find((x) => x.role === "admin");
  login(u.id, u.senha);
});
await p.waitForFunction(() => state?.currentUserId);
await p.evaluate(() => { document.querySelector(".modal-backdrop button")?.click(); document.querySelector("#acesso")?.remove(); });

// SEED + STUB. Zera os vistos por vaga pra "novas" nascer cheio.
await p.evaluate(() => {
  try { localStorage.removeItem("fiopulse:vagasvistas:" + (state.currentUserId || "admin")); } catch (e) {}
  const em = "2026-07-20T12:00:00.000Z";
  state.vagas = [
    { id: "vI", titulo: "Auxiliar de Qualidade", status: "publicada", setor: "Qualidade", turno: "1º turno", visibilidade: "ambas", publicadaEm: "2026-07-15" },
    { id: "vPub", titulo: "Operador Público", status: "publicada", setor: "Produção", turno: "1º turno", visibilidade: "publica", publicadaEm: "2026-07-14" },
  ];
  state.candidaturas = [
    { id: "vI__ana@mail.com", vagaId: "vI", vagaTitulo: "Auxiliar de Qualidade", nome: "Ana Duarte", email: "ana@mail.com", telefone: "47988120009", status: "recebida", em },
    { id: "vI__leg@mail.com", vagaId: "vI", vagaTitulo: "Auxiliar de Qualidade", nome: "Bruno Legado", email: "bruno@mail.com", telefone: "", status: "nova", em },
    { id: "vI__int__f-0428", vagaId: "vI", origem: "interna", uid: "u1", funcionarioId: "f-0428", nome: "Camila Souza", cargo: "Op. de Máquina", setor: "Produção", turno: "1º turno", tempoCasaMeses: 36, motivacao: "Quero crescer na qualidade.", status: "recebida", em },
  ];
  // STUB do write: registra e espelha (retorna true = email enfileirado).
  window.__stub = [];
  window.atualizarStatusCandidatura = async function (id, status) {
    window.__stub.push({ id, status, argc: arguments.length });
    const c = state.candidaturas.find((x) => x.id === id);
    if (c) c.status = status;
    return true;
  };
  state.view.page = "vagas";
  state.view.vagaSubtab = "vagas";
  state.view.vagaEdit = null;
  state.view.vagaCandAberta = "vI";
  state.view.vagaCandFiltro = null;
  state.view.candJustMoved = null;
  _renderAppNow();
});
await p.waitForTimeout(400);

// A) funil vivo + botão antigo ausente
const a = await p.evaluate(() => {
  const ativo = (id) => { const el = document.querySelector(`.rail__node[data-cand-id="${id}"].on`); return el ? el.dataset.candSt : null; };
  const card = document.querySelector('.g-cand[data-cand-card="vI__ana@mail.com"]');
  return {
    temFunil: !!document.querySelector(".g-cand__funil"),
    temRail: !!card && !!card.querySelector(".rail"),
    nNodes: card ? card.querySelectorAll(".rail__node[data-cand-st]").length : 0,
    temSeal: !!card && !!card.querySelector(".seal__pill"),
    temConf: !!card && !!card.querySelector(".conf"),
    ana: ativo("vI__ana@mail.com"),
    legado: ativo("vI__leg@mail.com"),
    msgBtns: document.querySelectorAll("[data-cand-msg]").length,
    msgCls: document.querySelectorAll(".g-cand__msg:not(.g-cand__msg-txt)").length,
    segCls: document.querySelectorAll(".g-cand__seg, .g-cand__st, .msg-canal__ops").length,
    // interno: confirmação lembra que a GP fala pessoalmente
    confInterno: (document.querySelector('.g-cand[data-cand-card="vI__int__f-0428"] .conf')?.textContent || "").replace(/\s+/g, " ").trim(),
  };
});
check(a.temFunil && a.temRail, "funil vivo com trilho renderizado");
check(a.nNodes === 5, "5 nós no trilho (achou " + a.nNodes + ")");
check(a.temSeal, "selo grande do status presente");
check(a.temConf, "linha de confirmação presente");
check(a.ana === "recebida", "status atual ativo (Ana=recebida, achou " + a.ana + ")");
check(a.legado === "recebida", "legado (status 'nova') = Recebida (achou " + a.legado + ")");
check(a.msgBtns === 0, "botão antigo 'Mensagem ao candidato' AUSENTE (data-cand-msg=" + a.msgBtns + ")");
check(a.msgCls === 0 && a.segCls === 0, "markup morto do funil antigo ausente (.g-cand__msg/.g-cand__seg/.msg-canal)");
check(/pessoalmente/i.test(a.confInterno), "interno: confirmação 'a GP fala pessoalmente' → " + JSON.stringify(a.confInterno));

// B) mover status: anima 1x + confirmação assenta + flag consumida + re-render idêntico
await p.evaluate(() => { document.querySelector('.rail__node[data-cand-id="vI__ana@mail.com"][data-cand-st="em-analise"]').click(); });
await p.waitForTimeout(160);
const mov = await p.evaluate(() => {
  const card = document.querySelector('.g-cand[data-cand-card="vI__ana@mail.com"]');
  const anims = (document.getAnimations ? document.getAnimations() : []).filter((an) => an.playState === "running" && card && card.contains(an.effect && an.effect.target));
  return {
    stub: window.__stub.length,
    argc: window.__stub[0] && window.__stub[0].argc,
    ativo: (document.querySelector('.rail__node[data-cand-id="vI__ana@mail.com"].on') || {}).dataset?.candSt,
    animRodando: anims.length,
    flag: state.view.candJustMoved,
    confFresh: (card.querySelector(".conf__chip")?.textContent || "").replace(/\s+/g, " ").trim(),
  };
});
check(mov.stub === 1 && mov.argc === 2, "atualizarStatusCandidatura chamado 1x com SÓ status (argc=" + mov.argc + ")");
check(mov.ativo === "em-analise", "trilho ativo agora Em análise (achou " + mov.ativo + ")");
check(mov.animRodando > 0, "animação disparou no card ao mover (WAAPI rodando: " + mov.animRodando + ")");
check(mov.flag === null, "flag candJustMoved consumida UMA vez (null após o render)");
check(/Mensagem automática enviada/i.test(mov.confFresh), "confirmação fresca 'Mensagem automática enviada' → " + JSON.stringify(mov.confFresh));

// assenta: espera > 2.2s e confere o registro permanente + fim da animação
await p.waitForTimeout(2600);
const assent = await p.evaluate(() => {
  const card = document.querySelector('.g-cand[data-cand-card="vI__ana@mail.com"]');
  return {
    perm: (card.querySelector(".conf__perm")?.textContent || "").replace(/\s+/g, " ").trim(),
    semFresh: !card.querySelector(".conf__chip"),
  };
});
check(assent.semFresh && /Avisado por email e WhatsApp/i.test(assent.perm), "confirmação assenta em 'Avisado por email e WhatsApp' → " + JSON.stringify(assent.perm));

// re-render FORÇADO: idêntico E não re-anima (flag já consumida)
const rr = await p.evaluate(async () => {
  const view = document.querySelector("#view");
  const a = view.innerHTML;
  window.__fpForceWrite = true; _renderAppNow(); window.__fpForceWrite = false;
  const bHtml = view.innerHTML;
  await new Promise((r) => requestAnimationFrame(r));
  const nascidas = (document.getAnimations ? document.getAnimations() : []).filter((an) => an.playState === "running" && (an.currentTime || 0) < 100 && view.contains(an.effect && an.effect.target) && !/^(fpHalo|fpPing|fpSpin|confPulseLive)$/.test(an.animationName || "")).length;
  return { ident: a, b: bHtml, nascidas };
});
{
  const A = normaliza(rr.ident), B = normaliza(rr.b);
  let ctx = "";
  if (A !== B) { let i = 0; while (i < Math.min(A.length, B.length) && A[i] === B[i]) i++; ctx = " · @" + i + "\n    est: ..." + A.slice(Math.max(0, i - 30), i + 60) + "...\n    reb: ..." + B.slice(Math.max(0, i - 30), i + 60) + "..."; }
  check(A === B, "re-render forçado do funil nasce idêntico (m1)" + ctx);
}
check(rr.nascidas === 0, "re-render NÃO re-anima o funil (churn " + rr.nascidas + ")");

// C) reduced-motion: mover = zero animação, confirmação direto no permanente
await p.emulateMedia({ reducedMotion: "reduce" });
await p.evaluate(() => { const c = state.candidaturas.find((x) => x.id === "vI__ana@mail.com"); c.status = "recebida"; state.view.candJustMoved = null; _renderAppNow(); });
await p.waitForTimeout(60);
await p.evaluate(() => { document.querySelector('.rail__node[data-cand-id="vI__ana@mail.com"][data-cand-st="aprovada"]').click(); });
await p.waitForTimeout(160);
const rm = await p.evaluate(() => {
  const card = document.querySelector('.g-cand[data-cand-card="vI__ana@mail.com"]');
  const anims = (document.getAnimations ? document.getAnimations() : []).filter((an) => an.playState === "running" && (an.currentTime || 0) < 100 && card && card.contains(an.effect && an.effect.target));
  return { anims: anims.length, semFresh: !card.querySelector(".conf__chip"), perm: !!card.querySelector(".conf__perm") };
});
check(rm.anims === 0, "reduced-motion: zero animação ao mover (achou " + rm.anims + ")");
check(rm.semFresh && rm.perm, "reduced-motion: confirmação vai direto pro registro permanente");
await p.emulateMedia({ reducedMotion: null });

// C2) canalPreferido (adendo William): a COPY reflete o canal que saiu. SEM data (gate
// v409): o doc não persiste quando o aviso saiu; data da renderização mentiria depois.
const copyCasos = await p.evaluate(() => {
  const casos = [[undefined, "email e WhatsApp"], ["email", "email"], ["whatsapp", "WhatsApp"]];
  const out = [];
  for (const [pref, txt] of casos) {
    const c = state.candidaturas.find((x) => x.id === "vI__ana@mail.com");
    c.status = "em-analise"; c.canalPreferido = pref; state.view.candJustMoved = null;
    state.view.vagaCandAberta = "vI"; _renderAppNow();
    const card = document.querySelector('.g-cand[data-cand-card="vI__ana@mail.com"]');
    out.push({ pref: String(pref), perm: (card.querySelector(".conf__perm")?.textContent || "").replace(/\s+/g, " ").trim(), txt });
  }
  return out;
});
copyCasos.forEach((cc) => check(cc.perm === "Avisado por " + cc.txt, "canalPreferido '" + cc.pref + "': permanente = 'Avisado por " + cc.txt + "' sem data (achou " + JSON.stringify(cc.perm) + ")"));
// fresh: nº de ícones = canais que saíram (ambos=2, email/whatsapp=1)
const freshIco = await p.evaluate(async () => {
  const out = {};
  for (const [pref, key] of [[undefined, "ambos"], ["email", "email"], ["whatsapp", "whatsapp"]]) {
    const c = state.candidaturas.find((x) => x.id === "vI__ana@mail.com");
    c.status = "recebida"; c.canalPreferido = pref; state.view.candJustMoved = null; _renderAppNow();
    document.querySelector('.rail__node[data-cand-id="vI__ana@mail.com"][data-cand-st="em-analise"]').click();
    await new Promise((r) => setTimeout(r, 260));
    const chip = document.querySelector('.g-cand[data-cand-card="vI__ana@mail.com"] .conf__chip');
    out[key] = chip ? chip.querySelectorAll(".ico2 svg").length : -1;
    await new Promise((r) => setTimeout(r, 2400));
  }
  return out;
});
check(freshIco.ambos === 2, "fresh 'ambos': 2 ícones (email + WhatsApp) → " + freshIco.ambos);
check(freshIco.email === 1, "fresh 'email': 1 ícone → " + freshIco.email);
check(freshIco.whatsapp === 1, "fresh 'whatsapp': 1 ícone → " + freshIco.whatsapp);
// detalhe discreto do canal preferido no bloco de contato
const canalPref = await p.evaluate(() => {
  const c = state.candidaturas.find((x) => x.id === "vI__ana@mail.com");
  c.status = "recebida"; c.canalPreferido = "whatsapp"; state.view.candJustMoved = null; _renderAppNow();
  const comZap = (document.querySelector('.g-cand[data-cand-card="vI__ana@mail.com"] .g-cand__canalpref')?.textContent || "").trim();
  c.canalPreferido = undefined; _renderAppNow();
  const semDefault = !document.querySelector('.g-cand[data-cand-card="vI__ana@mail.com"] .g-cand__canalpref');
  return { comZap, semDefault };
});
check(/prefere WhatsApp/.test(canalPref.comZap), "detalhe discreto 'prefere WhatsApp' no contato → " + JSON.stringify(canalPref.comZap));
check(canalPref.semDefault, "canal 'ambos'/ausente NÃO mostra o detalhe (sem poluir)");

// D) chip "N candidaturas · M novas" + zera ao abrir + linha não quebra
const VK = "fiopulse:vagasvistas:admin"; // "{}" força vistas vazias (vence o fallback de memória)
const novas = await p.evaluate((VK) => {
  // fecha o painel e zera vistos: as 3 candidaturas de vI são "novas"
  try { localStorage.setItem(VK, "{}"); } catch (e) {}
  state.view.vagaCandAberta = null; state.view.vagaCandFiltro = null; _renderAppNow();
  const row = [...document.querySelectorAll("#view .g-vaga")].find((r) => /Auxiliar de Qualidade/.test(r.textContent));
  const badge = row?.querySelector(".g-cand-badge");
  const temSfx = !!row?.querySelector(".nv-sfx");
  const temDot = !!row?.querySelector(".nv-dot");
  const sfxTxt = (row?.querySelector(".nv-sfx")?.textContent || "").replace(/\s+/g, " ").trim();
  return { badgeTxt: (badge?.textContent || "").replace(/\s+/g, " ").trim(), temSfx, temDot, sfxTxt };
}, VK);
check(novas.temSfx && novas.temDot, "chip com novas: sufixo + dot presentes");
check(/·\s*3 novas/.test(novas.badgeTxt), "sufixo mostra '· 3 novas' → " + JSON.stringify(novas.badgeTxt));

// abrir a vaga zera o "novas"
const zera = await p.evaluate(() => {
  const badge = [...document.querySelectorAll("#view .g-vaga .g-cand-badge")].find((el) => /Auxiliar de Qualidade/.test(el.closest(".g-vaga").textContent));
  badge.click(); _renderAppNow();
  const row = [...document.querySelectorAll("#view .g-vaga")].find((r) => /Auxiliar de Qualidade/.test(r.textContent));
  return { temSfx: !!row?.querySelector(".nv-sfx"), badgeTxt: (row?.querySelector(".g-cand-badge")?.textContent || "").replace(/\s+/g, " ").trim() };
});
check(!zera.temSfx, "abrir a vaga zera o 'novas' (sufixo some) → " + JSON.stringify(zera.badgeTxt));

// linha NÃO quebra POR CAUSA do sufixo: pior caso realista (Pública e interna = selo + publicada
// = 3 botões). O contrato do item f do v408 é que o sufixo de "novas" não ADICIONE uma linha:
// mede a altura da linha COM novas e SEM novas (mesmo título) e exige igualdade.
const wrap = await p.evaluate((VK) => {
  state.vagas = [{ id: "vLong", titulo: "Auxiliar de Produção e Logística", status: "publicada", setor: "Produção", turno: "1º turno", visibilidade: "ambas", publicadaEm: "2026-07-16" }];
  state.candidaturas = [
    { id: "vLong__a@x.com", vagaId: "vLong", vagaTitulo: "X", nome: "A", email: "a@x.com", status: "recebida", em: "2026-07-20T12:00:00.000Z" },
    { id: "vLong__b@x.com", vagaId: "vLong", vagaTitulo: "X", nome: "B", email: "b@x.com", status: "recebida", em: "2026-07-20T12:00:00.000Z" },
  ];
  state.view.vagaCandAberta = null; state.view.vagaCandFiltro = null;
  try { localStorage.setItem(VK, "{}"); } catch (e) {}
  _renderAppNow();
  const rowN = document.querySelector("#view .g-vaga");
  const hNovas = rowN ? rowN.offsetHeight : 0;
  const temSfx = !!rowN?.querySelector(".nv-sfx");
  const temSelo = !!rowN?.querySelector(".vsel");
  try { localStorage.setItem(VK, JSON.stringify({ vLong: 2 })); } catch (e) {}
  _renderAppNow();
  const rowB = document.querySelector("#view .g-vaga");
  const hBase = rowB ? rowB.offsetHeight : 0;
  const semSfx = !rowB?.querySelector(".nv-sfx");
  return { hNovas, hBase, temSfx, temSelo, semSfx };
}, VK);
check(wrap.temSfx && wrap.temSelo, "pior caso montado (sufixo de novas + selo Pública e interna)");
check(wrap.semSfx, "sem novas o chip volta ao normal (baseline)");
check(wrap.hNovas > 0 && wrap.hNovas <= wrap.hBase + 6, "o sufixo de 'novas' NÃO adiciona linha (com=" + wrap.hNovas + "px, sem=" + wrap.hBase + "px)");

// E) KPI "Internos" + drill (re-semeia o cenário com interno)
await p.evaluate(() => {
  const em = "2026-07-20T12:00:00.000Z";
  state.vagas = [
    { id: "vI", titulo: "Auxiliar de Qualidade", status: "publicada", setor: "Qualidade", turno: "1º turno", visibilidade: "ambas", publicadaEm: "2026-07-15" },
    { id: "vPub", titulo: "Operador Público", status: "publicada", setor: "Produção", turno: "1º turno", visibilidade: "publica", publicadaEm: "2026-07-14" },
  ];
  state.candidaturas = [
    { id: "vI__ana@mail.com", vagaId: "vI", vagaTitulo: "Auxiliar de Qualidade", nome: "Ana Duarte", email: "ana@mail.com", telefone: "47988120009", status: "recebida", em },
    { id: "vI__int__f-0428", vagaId: "vI", origem: "interna", funcionarioId: "f-0428", nome: "Camila Souza", cargo: "Op. de Máquina", setor: "Produção", turno: "1º turno", tempoCasaMeses: 36, status: "recebida", em },
  ];
  state.view.vagaCandAberta = null; state.view.vagaCandFiltro = null; _renderAppNow();
});
const kpi = await p.evaluate(() => {
  const card = document.querySelector("[data-cand-filtro-int]");
  return { existe: !!card, valor: (card?.querySelector(".stat__value")?.textContent || "").trim() };
});
check(kpi.existe, "KPI 'Internos' presente (há canal interno aberto)");
check(kpi.valor === "1", "KPI 'Internos' conta 1 interno (achou " + kpi.valor + ")");
const drill = await p.evaluate(() => {
  document.querySelector("[data-cand-filtro-int]").click(); _renderAppNow();
  const painel = document.querySelector(".vg-int-drill");
  const cards = painel ? painel.querySelectorAll(".g-cand--int").length : 0;
  const on = document.querySelector("[data-cand-filtro-int]")?.classList.contains("on");
  // toggle off
  document.querySelector("[data-cand-filtro-int]").click(); _renderAppNow();
  const sumiu = !document.querySelector(".vg-int-drill");
  return { painel: !!painel, cards, on, sumiu };
});
check(drill.painel && drill.cards === 1 && drill.on, "drill: filtro abre painel com 1 candidato interno + card aceso");
check(drill.sumiu, "drill: clicar de novo limpa o filtro (painel some)");
// KPI Internos some quando não há canal interno aberto
const semInterno = await p.evaluate(() => {
  state.vagas = [{ id: "vPub", titulo: "Operador Público", status: "publicada", setor: "Produção", turno: "1º turno", visibilidade: "publica", publicadaEm: "2026-07-14" }];
  state.candidaturas = [{ id: "vPub__x@x.com", vagaId: "vPub", vagaTitulo: "Operador Público", nome: "X", email: "x@x.com", status: "recebida", em: "2026-07-20T12:00:00.000Z" }];
  state.view.vagaCandFiltro = null; _renderAppNow();
  return !document.querySelector("[data-cand-filtro-int]");
});
check(semInterno, "KPI 'Internos' some sem canal interno aberto (só vaga pública)");

// F) central do gestor: "Candidatura nova em {vaga}" com tempo relativo; some ao abrir; sem denúncia
const central = await p.evaluate((VK) => {
  const em = new Date(Date.now() - 2 * 3600000).toISOString(); // 2h atrás
  try { localStorage.setItem(VK, "{}"); } catch (e) {}
  state.vagas = [{ id: "vI", titulo: "Auxiliar de Qualidade", status: "publicada", setor: "Qualidade", turno: "1º turno", visibilidade: "ambas", publicadaEm: "2026-07-15" }];
  state.candidaturas = [{ id: "vI__ana@mail.com", vagaId: "vI", vagaTitulo: "Auxiliar de Qualidade", nome: "Ana", email: "ana@mail.com", status: "recebida", em }];
  const lista = notifLista("gestor");
  const item = lista.find((it) => /^g-vaga-nova:/.test(it.id));
  const temDenuncia = lista.some((it) => /denunc/i.test(it.id) || /denúncia|denuncia/i.test(it.t || ""));
  return {
    tem: !!item,
    titulo: item?.t,
    quando: item && item.ts != null ? notifQuando(item.ts, Date.now()) : null,
    temDenuncia,
  };
}, VK);
check(central.tem, "central do gestor: entrada 'Candidatura nova em {vaga}'");
check(/Candidatura nova em Auxiliar de Qualidade/.test(central.titulo || ""), "título da entrada com o nome da vaga → " + JSON.stringify(central.titulo));
check(/h|min|agora/.test(central.quando || ""), "entrada tem tempo relativo → " + JSON.stringify(central.quando));
check(!central.temDenuncia, "denúncia SEGUE fora da central (invariante)");
// abrir a vaga marca vista -> a entrada some da central
const somiu = await p.evaluate(() => {
  _vagaMarcarVista("vI");
  return !notifLista("gestor").some((it) => /^g-vaga-nova:/.test(it.id));
});
check(somiu, "abrir a vaga (marcar vista) tira a entrada da central");

// render do sino: a linha mostra o tempo relativo
const drow = await p.evaluate((VK) => {
  try { localStorage.setItem(VK, "{}"); } catch (e) {}
  renderNotifBellGestor();
  document.getElementById("notif-bell")?.click();
  const row = [...document.querySelectorAll("#notif-drop .ntf-drow")].find((r) => /Candidatura nova/.test(r.textContent));
  return { tem: !!row, when: (row?.querySelector(".ntf-drow__when")?.textContent || "").trim() };
}, VK);
check(drow.tem && /h|min|agora/.test(drow.when), "sino: a linha mostra o 'quando' → " + JSON.stringify(drow.when));

await b.close();

// G) FILA por canalPreferido: roda a FUNÇÃO REAL de firebase.js (extraída do fonte, padrão
// email-wiring-verify) com um db fake que registra /mail e /waMsg. Prova doc criado/omitido.
{
  const appSrc = readFileSync("public/app.js", "utf8");
  const fbSrc = readFileSync("public/firebase.js", "utf8");
  const braceBlock = (src, marker) => {
    const ini = src.indexOf(marker); if (ini < 0) throw new Error("nao achei: " + marker);
    const abre = src.indexOf("{", ini); let prof = 0, fim = -1;
    for (let i = abre; i < src.length; i++) { if (src[i] === "{") prof++; else if (src[i] === "}") { prof--; if (prof === 0) { fim = i; break; } } }
    return src.slice(ini, fim + 1) + ";";
  };
  const atePV = (src, marker) => { const ini = src.indexOf(marker); return src.slice(ini, src.indexOf(";", ini) + 1); };
  const PRIMEIRO_NOME = braceBlock(appSrc, "function primeiroNomeCand");
  const ROTULO = atePV(fbSrc, "const _CAND_STATUS_ROTULO");
  const STATUS_FN = braceBlock(fbSrc, "window.atualizarStatusCandidatura = async function");
  const fakeFirebase = { firestore: { FieldValue: { serverTimestamp: () => "ts" } } };
  const mkFn = (state, db) => new Function("window", "state", "db", "debug", "firebase",
    PRIMEIRO_NOME + "\n" + ROTULO + "\n" + STATUS_FN + "\nreturn window.atualizarStatusCandidatura;")({ registrarAuditoria: () => {} }, state, db, () => {}, fakeFirebase);
  const fakeDb = () => { const s = { mail: {}, waMsg: {} }; return { _s: s, collection(col) { return { doc(id) { return { update: async () => {}, set: async (data) => { if (col !== "mail" && col !== "waMsg") return; if (s[col][id]) { const e = new Error("denied"); e.code = "permission-denied"; throw e; } s[col][id] = data; } }; } }; } }; };
  const cenario = async (pref, telefone) => {
    const c = { id: "vX__a@mail.com", email: "a@mail.com", telefone, nome: "Ana Duarte", vagaTitulo: "Vaga X", status: "recebida", canalPreferido: pref };
    const state = { candidaturas: [c] };
    const db = fakeDb();
    const r = await mkFn(state, db)("vX__a@mail.com", "em-analise");
    return { mail: !!db._s.mail["vX__a@mail.com-em-analise"], wa: !!db._s.waMsg["vX__a@mail.com-em_analise"], r };
  };
  const ambos = await cenario(undefined, "47988120009");
  const email = await cenario("email", "47988120009");
  const zap = await cenario("whatsapp", "47988120009");
  const zapSemTel = await cenario("whatsapp", "");
  check(ambos.mail && ambos.wa, "fila 'ambos' (ausente): cria /mail E /waMsg");
  check(email.mail && !email.wa, "fila 'email': cria /mail, OMITE /waMsg (mesmo com telefone)");
  check(!zap.mail && zap.wa, "fila 'whatsapp': OMITE /mail, cria /waMsg");
  check(!zapSemTel.mail && !zapSemTel.wa, "fila 'whatsapp' sem telefone: não cria nada");
  check(ambos.r === true && email.r === true && zap.r === false, "retorno = email enfileirado (ambos/email true, whatsapp false)");
}
console.log("\n=== FUNIL VIVO + KPI INTERNOS + NOVAS · verificação ===");
if (jsErros.length) console.log("pageErrors:", jsErros);
ok.forEach((m) => console.log("  OK   " + m));
fails.forEach((m) => console.log("  FAIL " + m));
console.log("\n" + ok.length + " ok, " + fails.length + " fail" + (jsErros.length ? " · " + jsErros.length + " pageerror" : ""));
process.exit(fails.length || jsErros.length ? 1 : 0);
