// ============================================================
// PROBE das FÉRIAS DO PRÓPRIO COLABORADOR (v398, versão ENXUTA/factual). Prova:
//   1) CHIP DE SITUAÇÃO na home (3 estados: de férias verde / licença azul / ausente);
//   2) ABA FÉRIAS enxuta: DOIS stat cards (proporcional + a agendar), PERÍODOS em accordion
//      nativo (datas só ao expandir, 7 situações do WK sem cair sem estilo), ÚLTIMAS FÉRIAS
//      com 1 linha por gozo + linha irmã por ABONO vendido (conta 20+10=30 no fixture);
//   3) tom FACTUAL: zero strings de "direito"/convite/botão da GP no HTML renderizado;
//   4) atalho Férias (deep-link), re-render idêntico, troca de aba sem re-fetch;
//   5) GESTOR: renderFuncFeriasTab ganha a linha de abono (palavra "comprados").
// Roda contra o srv8081 (modo demo). Fixtures deterministas semeados direto no state.
//
// PEGADINHAS: renderApp coalescido (usa _renderAppNow); serviceWorkers bloqueados;
// firebase.config.js abortado (modo demo); #toast-root NUNCA removido.
// ============================================================
import { chromium } from "playwright";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
await p.addInitScript(() => { window.__semVT = true; });
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

const falhas = [];
const check = (cond, msg) => { console.log(`  ${cond ? "ok" : "FALHOU"}: ${msg}`); if (!cond) falhas.push(msg); };

// ---- login como colaborador + neutraliza o mural assíncrono ----
await p.evaluate(() => {
  _changelogChecado = true;
  window.carregarReacoesAniversario = async () => null;
  window.carregarFotosReatores = async () => {};
  state.aniversariantes = { pessoas: [], recemChegados: [], tempoCasa: [] };
  state._reacoesCache = {};
  const f0 = state.funcionarios[0] || {};
  state.users.push({ id: "colab-fer", usuario: "colab", senha: "x", role: "colaborador", nome: "Camila Fixtures", funcionarioId: f0.id, funcionarioCodigo: f0.codigo, codigo: f0.codigo });
  login("colab-fer", "x");
});
await p.waitForFunction(() => state?.currentUserId);
await p.evaluate(() => { document.querySelector(".modal-backdrop button")?.click(); document.querySelector("#acesso")?.remove(); });

// Fixtures deterministas ------------------------------------------------------
const FUNC_LIMPO = { id: "f-1", nome: "Camila Fixtures", turno: 1, situacao: null, afastado: false, aniversarioDia: 1, aniversarioMes: 1 };
const FUNC_AFAST = { ...FUNC_LIMPO, afastado: true, situacao: "Licença Médica" };
// Rider v399: "Trabalhando" é o estado NORMAL do pipeline, não é ausência. Sem deFeriasAgora
// e sem afastado, NÃO gera chip na home (era ruído "Trabalhando em andamento", print William).
const FUNC_TRAB = { ...FUNC_LIMPO, situacao: "Trabalhando" };
// Fixture cheio (Rafael): 1 aquisição + 1 vencida + 2 concluídas; 1 gozo + 1 abono vendido.
const FVENC = {
  resumo: { temVencida: true, diasVencidos: 27.5, proporcionalAtual: 20.6, deFeriasAgora: false, diasAbonoTotal: 10 },
  periodos: [
    { situacao: "Em aquisição", aquisitivoInicio: "2025-10-15", aquisitivoFim: "2026-10-14", direito: 30, avos: 9, saldo: 20.6, gozos: [], abonos: [] },
    { situacao: "Vencidas", aquisitivoInicio: "2023-10-15", aquisitivoFim: "2024-10-14", concessivoInicio: "2024-10-15", concessivoFim: "2025-10-14", direito: 30, saldo: 27.5, gozos: [], abonos: [] },
    { situacao: "Concluídas", aquisitivoInicio: "2022-10-15", aquisitivoFim: "2023-10-14", direito: 30, gozos: [{ dias: 20, inicio: "2023-11-06", fim: "2023-11-25" }], abonos: [{ dias: 10, inicio: "2024-01-11", fim: "2024-01-20", pagamento: "2023-12-20" }] },
    { situacao: "Concluídas", aquisitivoInicio: "2021-10-15", aquisitivoFim: "2022-10-14", direito: 30, gozos: [], abonos: [] },
  ],
};
// Em dia: só a proporcional (6 avos) + 1 concluída com 1 gozo.
const FPROP = {
  resumo: { temVencida: false, diasVencidos: 0, proporcionalAtual: 13.75, deFeriasAgora: false, diasAbonoTotal: 0 },
  periodos: [
    { situacao: "Em aquisição", aquisitivoInicio: "2026-01-08", aquisitivoFim: "2027-01-07", direito: 30, avos: 6, saldo: 13.75, gozos: [], abonos: [] },
    { situacao: "Concluídas", aquisitivoInicio: "2024-01-08", aquisitivoFim: "2025-01-07", direito: 30, gozos: [{ dias: 30, inicio: "2025-03-03", fim: "2025-04-01" }], abonos: [] },
  ],
};
// Todas as 7 situações do WK + 1 desconhecida (deve cair em neutro, nunca sem estilo).
const FSIT = {
  resumo: { proporcionalAtual: 5, temVencida: true, diasVencidos: 10 },
  periodos: [
    { situacao: "Em aquisição", aquisitivoInicio: "2026-01-01", aquisitivoFim: "2027-01-01", avos: 2, saldo: 5, direito: 30, gozos: [], abonos: [] },
    { situacao: "Pendentes", aquisitivoInicio: "2025-01-01", aquisitivoFim: "2026-01-01", concessivoFim: "2027-01-01", saldo: 30, direito: 30, gozos: [], abonos: [] },
    { situacao: "Vencidas", aquisitivoInicio: "2024-01-01", aquisitivoFim: "2025-01-01", concessivoFim: "2026-01-01", saldo: 10, direito: 30, gozos: [], abonos: [] },
    { situacao: "Concluídas", aquisitivoInicio: "2023-01-01", aquisitivoFim: "2024-01-01", direito: 30, gozos: [], abonos: [] },
    { situacao: "Indenizadas", aquisitivoInicio: "2022-01-01", aquisitivoFim: "2023-01-01", direito: 30, saldo: 30, gozos: [], abonos: [] },
    { situacao: "Canceladas", aquisitivoInicio: "2021-01-01", aquisitivoFim: "2022-01-01", direito: 30, gozos: [], abonos: [] },
    { situacao: "Perdidas", aquisitivoInicio: "2020-01-01", aquisitivoFim: "2021-01-01", direito: 30, saldo: 30, gozos: [], abonos: [] },
    { situacao: "Programadas", aquisitivoInicio: "2019-01-01", aquisitivoFim: "2020-01-01", direito: 30, gozos: [], abonos: [] },
  ],
};

async function seed(page, func, feriasMinha, pontoTab) {
  await p.evaluate(({ page, func, feriasMinha, pontoTab }) => {
    state.funcionarios = func ? [func] : [];
    state.feriasMinha = feriasMinha;
    state.view.page = page;
    if (pontoTab !== undefined) state.view.pontoTab = pontoTab;
    _renderAppNow();
  }, { page, func, feriasMinha, pontoTab });
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// ---------------- 1. CHIP DE SITUAÇÃO (home) — aprovado, inalterado ----------------
console.log("CHIP DE SITUAÇÃO (home):");
const chipFer = await p.evaluate(() => {
  const hoje = new Date(), iso = (d) => d.toISOString().slice(0, 10);
  const ini = new Date(hoje.getTime() - 3 * 864e5), fim = new Date(hoje.getTime() + 7 * 864e5);
  // esperado deriva do MESMO iso que alimenta o fixture (o chip formata a string, não o Date):
  // usar getDate() local aqui divergia do iso UTC à noite (off-by-one), deixando o check flaky.
  const fimIso = iso(fim);
  const esperado = fimIso.slice(8, 10) + "/" + fimIso.slice(5, 7);
  state.funcionarios = [{ id: "f-1", nome: "Camila Fixtures", turno: 1, aniversarioDia: 1, aniversarioMes: 1 }];
  state.feriasMinha = { resumo: { deFeriasAgora: true }, periodos: [{ situacao: "Concluídas", gozos: [{ dias: 10, inicio: iso(ini), fim: iso(fim) }] }] };
  state.view.page = "colab-home"; _renderAppNow();
  const el = document.querySelector('#view [data-region="home:sit"] .pp-sit');
  return { cls: el ? el.className : "", txt: el ? el.textContent.replace(/\s+/g, " ").trim() : "", esperado };
});
check(/pp-sit--fer/.test(chipFer.cls) && chipFer.txt.includes("até " + chipFer.esperado), `de férias: chip verde "até ${chipFer.esperado}" — foi "${chipFer.txt}"`);
await seed("colab-home", FUNC_AFAST, null);
const chipLic = await p.evaluate(() => { const el = document.querySelector('#view [data-region="home:sit"] .pp-sit'); return { cls: el ? el.className : "", txt: el ? el.textContent.replace(/\s+/g, " ").trim() : "" }; });
check(/pp-sit--lic/.test(chipLic.cls) && /Licença Médica em andamento/.test(chipLic.txt), `afastado: chip azul informativo — foi "${chipLic.txt}"`);
await seed("colab-home", FUNC_LIMPO, null);
check(await p.evaluate(() => document.querySelectorAll('#view [data-region="home:sit"] .pp-sit').length) === 0, "sem situação: o chip NÃO existe");
await seed("colab-home", FUNC_TRAB, null);
check(await p.evaluate(() => document.querySelectorAll('#view [data-region="home:sit"] .pp-sit').length) === 0, "Trabalhando (estado normal): o chip NÃO existe");

// ---------------- 2. ABA FÉRIAS ENXUTA — fixture cheio ----------------
console.log("\nABA FÉRIAS (enxuta) · fixture cheio:");
await seed("colab-ponto", FUNC_LIMPO, FVENC, "ferias");
const cheio = await p.evaluate(() => {
  const v = document.querySelector("#view");
  const stats = Array.from(v.querySelectorAll(".fc-stat"));
  const prop = stats.find((s) => !s.classList.contains("fc-stat--venc"));
  const venc = stats.find((s) => s.classList.contains("fc-stat--venc"));
  const pers = Array.from(v.querySelectorAll(".fc-per"));
  const vencPer = v.querySelector(".fc-per--venc");
  const concl2223 = pers.find((d) => d.querySelector(".fc-per__ano")?.textContent === "2022/2023");
  const gozos = Array.from(v.querySelectorAll(".fc-gozo")).map((g) => g.textContent.replace(/\s+/g, " ").trim());
  return {
    nStats: stats.length,
    propBig: (prop?.querySelector(".fc-stat__big") || {}).textContent || "",
    miniOn: prop ? prop.querySelectorAll(".fc-mini-meter i.on").length : -1,
    propSub: (prop?.querySelector(".fc-stat__sub") || {}).textContent.replace(/\s+/g, " ").trim() || "",
    vencBig: (venc?.querySelector(".fc-stat__big") || {}).textContent || "",
    vencSub: (venc?.querySelector(".fc-stat__sub") || {}).textContent.replace(/\s+/g, " ").trim() || "",
    nPer: pers.length,
    perAbertoInicial: pers.filter((d) => d.open).length,
    vencSummary: vencPer ? vencPer.querySelector("summary").textContent.replace(/\s+/g, " ").trim() : "",
    vencDet: vencPer ? vencPer.querySelector(".fc-per__det").textContent.replace(/\s+/g, " ").trim() : "",
    concl2223Dias: concl2223 ? concl2223.querySelector(".fc-per__dias").textContent.trim() : "",
    concl2223Det: concl2223 ? concl2223.querySelector(".fc-per__det").textContent.replace(/\s+/g, " ").trim() : "",
    gozos,
    corpoHtml: (v.querySelector('[data-region="ponto:corpo"]') || v).innerHTML,
  };
});
check(cheio.nStats === 2, `dois stat cards no topo — foi ${cheio.nStats}`);
check(cheio.propBig.replace(/\s+/g, "").includes("20,6"), `proporcional 20,6 — foi "${cheio.propBig}"`);
check(cheio.miniOn === 9 && /9 de 12 avos/.test(cheio.propSub), `medidor inline 9 de 12 avos — foi ${cheio.miniOn} / "${cheio.propSub}"`);
check(cheio.vencBig.replace(/\s+/g, "").includes("27,5"), `card "a agendar" 27,5 dias — foi "${cheio.vencBig}"`);
check(/Período 2023\/2024/.test(cheio.vencSub) && /prazo passou em 14\/10\/2025/.test(cheio.vencSub), `card a agendar: período + prazo — foi "${cheio.vencSub}"`);
check(cheio.nPer === 4, `4 linhas de período (accordion) — foi ${cheio.nPer}`);
check(cheio.perAbertoInicial === 0, `accordion nasce FECHADO (datas escondidas) — abertos ${cheio.perAbertoInicial}`);
check(/2023\/2024/.test(cheio.vencSummary) && !/15\/10/.test(cheio.vencSummary), `vencida: summary tem ano, SEM as datas — foi "${cheio.vencSummary}"`);
check(/15\/10\/2023/.test(cheio.vencDet) && /prazo de agendamento passou em 14\/10\/2025/.test(cheio.vencDet), `vencida: datas SÓ no det (expandido) — foi "${cheio.vencDet}"`);
check(cheio.concl2223Dias === "30 dias", `concluída 2022/2023: conta 20+10=30 dias — foi "${cheio.concl2223Dias}"`);
check(/20 dias gozados, 10 vendidos/.test(cheio.concl2223Det), `concluída 2022/2023 det: 20 gozados, 10 vendidos — foi "${cheio.concl2223Det}"`);
check(/^10 dias/.test(cheio.gozos[0]) && cheio.gozos[0].includes("vendidos · 11 a 20/01/2024 · pagos em 20/12/2023"), `abono como 1ª linha das últimas férias — foi "${cheio.gozos[0]}"`);
check(/^20 dias/.test(cheio.gozos[1]) && cheio.gozos[1].includes("06 a 25/11/2023"), `gozo como 2ª linha — foi "${cheio.gozos[1]}"`);
// SWEEP: nada de entitlement/convite/botão da GP no HTML renderizado
const ENT = [/seus por direito/i, /por direito/i, /n[ãa]o se perdem/i, /Falar com a Gest[ãa]o de Pessoas/i, /tem direito/i, /convite/i, /vamos combinar/i];
const sujas = ENT.filter((re) => re.test(cheio.corpoHtml)).map((re) => re.source);
check(sujas.length === 0, `sweep factual: zero strings de entitlement no HTML — achou: [${sujas.join(", ")}]`);

// accordion abre ao tocar
const abriu = await p.evaluate(() => { const d = document.querySelector("#view .fc-per--venc"); d.querySelector("summary").click(); return d.open; });
check(abriu === true, "accordion: tocar no summary EXPANDE (details nativo)");

// ---------------- 3. ABA FÉRIAS — em dia (solo) ----------------
console.log("\nABA FÉRIAS · em dia (solo):");
await seed("colab-ponto", FUNC_LIMPO, FPROP, "ferias");
const emdia = await p.evaluate(() => {
  const v = document.querySelector("#view");
  return {
    solo: !!v.querySelector(".fc-stats--solo"),
    nStats: v.querySelectorAll(".fc-stat").length,
    temVenc: !!v.querySelector(".fc-stat--venc, .fc-per--venc"),
    propSub: (v.querySelector(".fc-stat__sub") || {}).textContent.replace(/\s+/g, " ").trim() || "",
    gozo: (v.querySelector(".fc-gozo") || {}).textContent.replace(/\s+/g, " ").trim() || "",
  };
});
check(emdia.solo && emdia.nStats === 1, `em dia: um stat card só (fc-stats--solo) — foi ${emdia.nStats}`);
check(!emdia.temVenc, "em dia: SEM card/linha âmbar");
check(/6 de 12 avos/.test(emdia.propSub) && /sem nada a agendar/.test(emdia.propSub), `em dia: "6 de 12 avos · sem nada a agendar" — foi "${emdia.propSub}"`);
check(/^30 dias/.test(emdia.gozo) && emdia.gozo.includes("03/03 a 01/04/2025"), `gozo cruzando mês: "03/03 a 01/04/2025" — foi "${emdia.gozo}"`);

// ---------------- 4. VAZIO HONESTO ----------------
console.log("\nABA FÉRIAS · sem doc:");
await seed("colab-ponto", FUNC_LIMPO, null, "ferias");
const vazio = await p.evaluate(() => { const v = document.querySelector("#view"); return { stub: !!v.querySelector(".cp-stub"), fc: !!v.querySelector(".fc-stat, .fc-per, .fc-gozos"), txt: (v.querySelector(".cp-stub p") || {}).textContent || "" }; });
check(vazio.stub && !vazio.fc, "sem doc: vazio honesto (.cp-stub, sem stat/período/gozo)");
check(/assim que o RH sincronizar seus períodos/i.test(vazio.txt), "sem doc: texto do mock");

// ---------------- 5. 7 SITUAÇÕES + desconhecida = neutro ----------------
console.log("\nPERÍODOS · 7 situações do WK + desconhecida:");
await seed("colab-ponto", FUNC_LIMPO, FSIT, "ferias");
const sit = await p.evaluate(() => {
  const v = document.querySelector("#view");
  const KN = ["venc", "pend", "aquis", "concl", "neu"];
  const pers = Array.from(v.querySelectorAll(".fc-per"));
  const semEstilo = pers.filter((d) => !KN.some((k) => d.classList.contains("fc-per--" + k))).length;
  const cnt = (c) => v.querySelectorAll(".fc-per--" + c).length;
  return { n: pers.length, semEstilo, aquis: cnt("aquis"), pend: cnt("pend"), venc: cnt("venc"), concl: cnt("concl"), neu: cnt("neu"), chipNeu: v.querySelectorAll(".fc-chip--neu").length };
});
check(sit.n === 8 && sit.semEstilo === 0, `nenhum período cai sem estilo — ${sit.semEstilo} sem classe de ${sit.n}`);
check(sit.aquis === 1 && sit.pend === 1 && sit.venc === 1 && sit.concl === 1, `aquis/pend/venc/concl mapeados (1 cada) — ${sit.aquis}/${sit.pend}/${sit.venc}/${sit.concl}`);
check(sit.neu === 4 && sit.chipNeu === 4, `Indenizadas+Canceladas+Perdidas+desconhecida = neutro (4) — foi ${sit.neu}`);

// ---------------- 6. ATALHOS: 5º VAGAS (variante B, v403) + Férias deep-link ----------------
console.log("\nATALHOS · 5º Vagas (deslizável) + Férias deep-link:");
await seed("colab-home", FUNC_LIMPO, FPROP);
// 1 vaga interna aberta -> badge "1"; mede o 5º espiando na borda (variante B)
const vg1 = await p.evaluate(() => {
  state.vagasInternasColab = [{ id: "vg-x", titulo: "Auxiliar de Produção · turno 2", setor: "Produção", turno: "2º turno", cidade: "Barra Velha", descricao: "Vaga aberta." }];
  state.meusInteressesInternos = {};
  _renderAppNow();
  const row = document.querySelector("#view .pp-atl");
  const its = Array.from(row.querySelectorAll(".pp-atl__it"));
  const fifth = its[4];
  const svg = fifth.querySelector("svg");
  const badge = fifth.querySelector(".pp-atl__b");
  const rowRect = row.getBoundingClientRect();
  const fRect = fifth.getBoundingClientRect();
  return {
    n: its.length,
    lbl: fifth.querySelector(".pp-atl__l").textContent,
    nav: fifth.getAttribute("data-nav"),
    // growth = 2 polylines, sem circle/rect/path (distinto de clock/file/sun)
    growth: svg.querySelectorAll("polyline").length === 2 && !svg.querySelector("circle, rect, path"),
    badge: badge ? badge.textContent.trim() : null,
    fifthRight: fRect.right - rowRect.left,
    clientW: row.clientWidth,
    scrollW: row.scrollWidth,
    rail: !!document.querySelector("#view .pp-rail"),
  };
});
check(vg1.n === 5, `5 atalhos na fileira — foi ${vg1.n}`);
check(vg1.lbl === "Vagas" && vg1.nav === "colab-oportunidades", `5º atalho "Vagas" -> colab-oportunidades — foi "${vg1.lbl}"/"${vg1.nav}"`);
check(vg1.growth, "5º atalho usa o ícone growth (seta de crescimento)");
check(vg1.rail, "fileira embrulhada em .pp-rail (âncora do fade da borda)");
check(vg1.badge === "1", `badge "1" com 1 vaga interna aberta — foi ${JSON.stringify(vg1.badge)}`);
check(vg1.scrollW > vg1.clientW + 1, `fileira ROLA (scrollWidth ${Math.round(vg1.scrollW)} > clientWidth ${Math.round(vg1.clientW)})`);
check(vg1.fifthRight > vg1.clientW, `5º ESPIA na borda em 390px (right ${Math.round(vg1.fifthRight)} > clientWidth ${Math.round(vg1.clientW)})`);
// re-render idêntico com o atalho + badge presentes
check(await p.evaluate(async () => { const v = document.querySelector("#view"); const a = v.innerHTML; _renderAppNow(); await new Promise((r) => requestAnimationFrame(r)); return a === v.innerHTML; }), "home com atalho Vagas + badge: re-render nasce IDÊNTICO");

// 0 vagas -> atalho segue, SEM badge
const vg0 = await p.evaluate(() => {
  state.vagasInternasColab = []; state.meusInteressesInternos = {}; _renderAppNow();
  const its = Array.from(document.querySelectorAll("#view .pp-atl .pp-atl__it"));
  return { n: its.length, lbl: its[4].querySelector(".pp-atl__l").textContent, badge: !!its[4].querySelector(".pp-atl__b") };
});
check(vg0.n === 5 && vg0.lbl === "Vagas", "sem vaga interna: os 5 atalhos seguem (Vagas incluso)");
check(vg0.badge === false, "sem vaga interna (0): atalho Vagas SEM badge, igual aos outros");

// clique em Vagas navega pra Oportunidades internas
const navVg = await p.evaluate(() => {
  const its = Array.from(document.querySelectorAll("#view .pp-atl .pp-atl__it"));
  its[4].click(); _renderAppNow();
  return { page: state.view.page, temTela: (document.querySelector("#view .cp-head__tx h2") || {}).textContent || "" };
});
check(navVg.page === "colab-oportunidades" && /Oportunidades internas/.test(navVg.temTela), "clique em Vagas: abre Oportunidades internas");

// Férias deep-link (agora o 4º atalho) segue funcionando
await seed("colab-home", FUNC_LIMPO, FPROP);
const atl = await p.evaluate(() => {
  const its = Array.from(document.querySelectorAll("#view .pp-atl .pp-atl__it"));
  const fer = its.find((b) => (b.querySelector(".pp-atl__l") || {}).textContent === "Férias");
  fer.click(); _renderAppNow();
  const chipOn = document.querySelector('#view #cp-ponto-tabs .pp-chip-f.on');
  return { page: state.view.page, tab: state.view.pontoTab, flag: state.view.pontoTabInit == null, abaOn: chipOn ? chipOn.textContent.trim() : "", temAba: !!document.querySelector("#view .fc-stat, #view .cp-stub") };
});
check(atl.page === "colab-ponto" && atl.tab === "ferias" && atl.flag && atl.abaOn === "Férias" && atl.temAba, "Férias (4º atalho): abre Meu ponto na aba Férias e limpa a flag transitória");

// DESKTOP preservado: >900px esconde a fileira inteira (.pp-rail display:none)
await seed("colab-home", FUNC_LIMPO, FPROP);
await p.evaluate(() => { state.vagasInternasColab = [{ id: "vg-x", titulo: "T" }]; _renderAppNow(); });
await p.setViewportSize({ width: 1200, height: 900 });
await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const desk = await p.evaluate(() => { const rail = document.querySelector("#view .pp-rail"); return rail ? getComputedStyle(rail).display : "(sem rail)"; });
check(desk === "none", `desktop >900px: fileira de atalhos escondida (.pp-rail display:none) — foi "${desk}"`);
await p.setViewportSize({ width: 390, height: 844 });
await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// ---------------- 7. RE-RENDER IDÊNTICO (home + aba) ----------------
console.log("\nRE-RENDER IDÊNTICO:");
await seed("colab-home", FUNC_AFAST, null);
check(await p.evaluate(async () => { const v = document.querySelector("#view"); const a = v.innerHTML; _renderAppNow(); await new Promise((r) => requestAnimationFrame(r)); return a === v.innerHTML; }), "home (com chip): re-render nasce IDÊNTICO");
await seed("colab-ponto", FUNC_LIMPO, FVENC, "ferias");
check(await p.evaluate(async () => { const v = document.querySelector("#view"); const a = v.innerHTML; _renderAppNow(); await new Promise((r) => requestAnimationFrame(r)); return a === v.innerHTML; }), "aba Férias (fixture cheio): re-render nasce IDÊNTICO");

// ---------------- 8. TROCA DE ABA SEM RE-FETCH ----------------
console.log("\nTROCA DE ABA (sem re-fetch):");
const troca = await p.evaluate(() => {
  state.funcionarios = [{ id: "f-1", nome: "Camila Fixtures", turno: 1 }];
  state.feriasMinha = { resumo: { proporcionalAtual: 5 }, periodos: [{ situacao: "Em aquisição", avos: 2, direito: 30, saldo: 5, gozos: [], abonos: [] }] };
  state.view.page = "colab-ponto"; state.view.pontoTab = "bh"; _renderAppNow();
  const ref = state.feriasMinha;
  Array.from(document.querySelectorAll("#view #cp-ponto-tabs .pp-chip-f")).find((b) => b.dataset.pontoTab === "ferias").click();
  _renderAppNow();
  return { mesmoObj: state.feriasMinha === ref, aba: state.view.pontoTab === "ferias", temFc: !!document.querySelector("#view .fc-stat") };
});
check(troca.aba && troca.temFc, "troca de aba: a aba Férias renderiza");
check(troca.mesmoObj, "troca de aba: state.feriasMinha PRESERVADO (sem re-fetch)");

// ---------------- 9. GESTOR: renderFuncFeriasTab ganha a linha de abono (comprados) ----------------
console.log("\nGESTOR · renderFuncFeriasTab (abono = comprados):");
const gestor = await p.evaluate(() => {
  state.ferias = { "f-1": { periodos: [{ situacao: "Concluídas", aquisitivoInicio: "2022-10-15", aquisitivoFim: "2023-10-14", direito: 30, gozos: [{ dias: 20, inicio: "2023-11-06", fim: "2023-11-25", retorno: "2023-11-26" }], abonos: [{ dias: 10, inicio: "2024-01-11", fim: "2024-01-20", pagamento: "2023-12-20" }] }] } };
  const html = renderFuncFeriasTab({ id: "f-1" });
  return { comprados: /comprados/.test(html), pago: /pago em 20\/12\/2023/.test(html), gozo: /20 dias/.test(html), abonoAntes: html.indexOf("comprados") < html.indexOf("retorno") };
});
check(gestor.comprados && gestor.pago, "gestor: linha de abono com 'comprados' + 'pago em 20/12/2023'");
check(gestor.gozo && gestor.abonoAntes, "gestor: abono e gozo na mesma seção, mais recente (abono) primeiro");

await b.close();
if (jsErros.length) { console.log("\npageErrors:", jsErros); falhas.push("pageError(s): " + jsErros.length); }

if (falhas.length) {
  console.log(`\n${falhas.length} CHECK(S) REPROVARAM:\n` + falhas.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("\nferias-colab-verify: PASSOU (enxuto: stat cards, accordion datas-ao-expandir, abono 20+10=30, sweep factual, 7 situações, atalho Vagas 5º deslizável+badge+nav, deep-link Férias, desktop preservado, re-render idêntico, gestor comprados).");
