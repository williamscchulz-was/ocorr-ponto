// ============================================================
// GUARDA ANTI-FLICKER (metodologia 2026-07-14; estendido 2026-07-15 com a
// arquitetura setHtml validada pelo gate Fable).
//
// DOIS CONTRATOS por tela, ambos exigidos no modo estrito:
//  m1 (disciplina de cache): com window.__fpForceWrite = true, um rebuild
//     FORÇADO nasce byte a byte idêntico à tela estabilizada. Garante que os
//     templates nascem preenchidos (nada de placeholder que renasce).
//  m2 (no-op de verdade): sem force, um re-render sem mudança de state NÃO
//     TOCA o DOM: mesma referência de nó e foco preservado (canal setHtml).
//  Estático: nenhuma escrita crua em #view fora do canal setHtml.
//
// Uso: node scratchpad/audit/flicker-guard.mjs            (m2/estático = aviso)
//      node scratchpad/audit/flicker-guard.mjs --strict   (m2/estático reprovam)
// Servidor local na 8081 servindo a raiz do repo. Telas enumeradas EM RUNTIME
// (NAV_GRUPOS + COLAB_NAV): tela nova entra no pente fino sozinha.
// ============================================================
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const ESTRITO = process.argv.includes("--strict");

// IDs gerados por render (gradientes SVG com sequência global) mudam sem efeito
// visual: normaliza antes de comparar pra não acusar falso flicker.
const normaliza = (html) => String(html || "")
  .replace(/gmg\d+/g, "gmgN")
  .replace(/gm[a-z]+\d+w?/g, "gmsN");

// ---- contrato estático: escrita crua em #view fora do canal ----
const src = readFileSync("public/app.js", "utf8");
const crus = src.split("\n").map((l, i) => [i + 1, l])
  .filter(([, l]) => /(\$\("#view"\)|\bview)\.innerHTML\s*=/.test(l) && !/setHtml\(/.test(l));

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
// __semVT: desliga a View Transition de navegação no harness. login() agenda um
// renderApp e a troca de portal (gestor -> colab) mudaria de página; sem esta flag
// isso viraria uma transição async de 240ms com pseudo-elementos, contaminando a
// medição de flicker. Os re-renders do probe já usam _renderAppNow direto.
await p.addInitScript(() => { window.__semVT = true; });
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

const falhasM1 = [], falhasM2 = [];
async function varre(portal, paginas) {
  for (const ent of paginas) {
    // Entrada = id da pagina (string) OU { page, prep, label }: prep injeta sub-estado
    // em state.view antes do render (ex.: as vistas do canal de denuncia: porta ja e o
    // default, acompanhar/cerimonia/naoencontrado entram por aqui).
    const item = typeof ent === "string" ? { page: ent, prep: null, label: ent } : ent;
    const pg = item.label;
    const r = await p.evaluate(async ({ pagina, prep }) => {
      window.__fpForceWrite = false;
      state.view.page = pagina;
      if (prep) Object.assign(state.view, prep);
      try { _renderAppNow(); } catch (e) { return { erro: String(e).slice(0, 200) }; }
      // estabiliza: preenchedores assíncronos, cargas lazy, contagem animada (700ms)
      await new Promise((res) => setTimeout(res, 1000));
      const view = document.querySelector("#view") || document.body;

      // ---- m2: re-render SEM force = no-op de verdade (nó e foco intactos) ----
      const no0 = view.firstElementChild;
      const input = view.querySelector("input:not([type=hidden]), textarea");
      if (input) try { input.focus(); } catch (e) { /* */ }
      const focado = document.activeElement;
      try { _renderAppNow(); } catch (e) { return { erro: String(e).slice(0, 200) }; }
      const m2 = { mesmoNo: view.firstElementChild === no0, focoOk: !input || document.activeElement === focado };

      // ---- m1: rebuild FORÇADO nasce idêntico ao estabilizado ----
      const a = view.innerHTML;
      window.__fpForceWrite = true;
      try { _renderAppNow(); } catch (e) { window.__fpForceWrite = false; return { erro: String(e).slice(0, 200) }; }
      window.__fpForceWrite = false;
      const bHtml = view.innerHTML; // IMEDIATO: sem esperar async, é aqui que o flicker mora
      // ---- m3 (consultoria 2026-07-17): CHURN DE ANIMAÇÃO = 0, binário ----
      // Um re-render da MESMA tela (o rebuild forçado acima) não pode parir animação
      // NOVA rodando do frame 0 (a cascata re-disparando = o pisca que o olho vê e
      // que a comparação de HTML não pega). Espera 1 frame pro CSS avaliar.
      await new Promise((res) => requestAnimationFrame(res));
      // Isenção de decoração AMBIENTE contínua (roadmap: fpHalo/fpPing/fpSpin). São
      // animações INFINITAS, não entradas one-shot: não podem ser guardadas por pp-anima
      // (congelariam no 1o re-render) e nesta tela os re-renders reais são NO-OP (dados
      // estáticos; expandir/recolher é DOM-direto), então nunca reiniciam em produção — só
      // o rebuild FORÇADO daqui as recria. Contar isso seria falso-positivo (auditoria
      // 2026-07-18). Qualquer animação one-shot re-disparada segue reprovando.
      const AMBIENTE = /^(fpHalo|fpPing|fpSpin)$/;
      const nascidas = (document.getAnimations ? document.getAnimations() : [])
        .filter((an) => an.playState === "running" && (an.currentTime || 0) < 100
          && view.contains(an.effect && an.effect.target)
          && !AMBIENTE.test(an.animationName || "")).length;
      return { a, b: bHtml, m2, m3: { nascidas } };
    }, { pagina: item.page, prep: item.prep });
    if (r.erro) { falhasM1.push(`${portal}/${pg}: ERRO DE RENDER ${r.erro}`); console.log(`  ${portal}/${pg}: ERRO`); continue; }
    const A = normaliza(r.a), B = normaliza(r.b);
    let status = [];
    if (r.m3 && r.m3.nascidas > 0) {
      falhasM1.push(`${portal}/${pg}: ${r.m3.nascidas} animação(ões) re-disparada(s) no re-render (churn m3)`);
      status.push("m3 CHURN");
    }
    if (A !== B) {
      let i = 0;
      while (i < Math.min(A.length, B.length) && A[i] === B[i]) i++;
      falhasM1.push(`${portal}/${pg}: FLICKER m1 no offset ${i}\n    estabilizado: ...${A.slice(Math.max(0, i - 40), i + 80)}...\n    re-render:    ...${B.slice(Math.max(0, i - 40), i + 80)}...`);
      status.push("m1 FLICKER");
    }
    if (!r.m2.mesmoNo || !r.m2.focoOk) {
      falhasM2.push(`${portal}/${pg}: m2 ${!r.m2.mesmoNo ? "recriou o DOM" : ""}${!r.m2.focoOk ? " perdeu o foco" : ""}`.trim());
      status.push("m2 no-op falhou");
    }
    console.log(`  ${portal}/${pg}: ${status.length ? status.join(" + ") : "ok"}`);
  }
}

// ---- GESTOR (admin do demo; paginas de NAV_GRUPOS em runtime) ----
await p.evaluate(() => {
  _changelogChecado = true;
  const u = state.users.find((x) => x.role === "admin");
  login(u.id, u.senha);
});
await p.waitForFunction(() => state?.currentUserId);
await p.evaluate(() => {
  document.querySelector(".modal-backdrop button")?.click();
  document.querySelector("#acesso")?.remove();
  // dados que os cards assíncronos consomem (senão a tela nem tem o que piscar)
  const hoje = new Date();
  const admIso = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  state.aniversariantes = {
    pessoas: [{ nome: "Fulana Guarda", mes: hoje.getMonth() + 1, dia: hoje.getDate() }],
    recemChegados: [{ nome: "Novato Guarda", admissao: admIso, setor: "Producao" }],
    tempoCasa: [{ nome: "Veterano Guarda", mes: hoje.getMonth() + 1, dia: hoje.getDate(), anos: 9 }],
  };
});
console.log("GESTOR:");
const paginasGestor = await p.evaluate(() => NAV_GRUPOS.flatMap((g) => g[1]));
await varre("gestor", paginasGestor);

// ---- COLABORADOR (paginas de COLAB_NAV em runtime) ----
await p.evaluate(() => {
  state.users.push({ id: "colab-guard", usuario: "colab", senha: "x", role: "colaborador", nome: "Colab Guarda", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("colab-guard", "x");
});
await p.waitForTimeout(300);
await p.evaluate(() => { document.querySelector("#acesso")?.remove(); });
console.log("COLAB:");
const paginasColab = await p.evaluate(() => COLAB_NAV.map((x) => x.id));
// Canal de denuncia: colab-denuncia e filha-do-hub (fora de COLAB_NAV), entao TODAS as
// vistas entram aqui como sub-estados, inclusive a porta (bifurcacao) e a tela nova.
paginasColab.push(
  { page: "colab-denuncia", label: "colab-denuncia:porta", prep: { denVista: "porta", denEnviada: false, denHash: "", denConsulta: null } },
  { page: "colab-denuncia", label: "colab-denuncia:acompanhar", prep: { denVista: "acompanhar", denEnviada: false, denHash: "", denCodConsulta: "FBR-7K2M-9QX4", denConsulta: { estado: "ok", status: "em_analise", em: "2026-07-12T14:30:00.000Z", atualizadoEm: null, codigo: "FBR-7K2M-9QX4" } } },
  { page: "colab-denuncia", label: "colab-denuncia:naoencontrado", prep: { denVista: "acompanhar", denEnviada: false, denHash: "", denCodConsulta: "FBR-3T9P-1KZ0", denConsulta: { estado: "nada" } } },
  { page: "colab-denuncia", label: "colab-denuncia:cerimonia", prep: { denVista: "fluxo", denEnviada: true, denIdentEnviada: false, denCodigo: "FBR-7K2M-9QX4", denHash: "62fa84a9d3c1b7e04f8a6c2d19b3e5f7a0c4d8e2b6f1a9c3d7e5b0f4a8c2e327ef" } },
);
await varre("colab", paginasColab);

// ============================================================
// FASE NOVA (piloto de regiões v373): mede 3 interações na tela colab-ponto e reprova se o
// morph do updateRegion piscar (CLS), travar (longtask), re-semear animação em nó que já
// existia (churn) ou divergir do rebuild forçado (paridade). A base é semeada com fixtures
// deterministas (não depende do dado do demo). As 3 interações: troca de aba (shell reescreve,
// status quo), refetch com dia novo no espelho, refetch com ocorrência nova.
// ============================================================
const falhasM4 = [];
const DIAS3 = [
  { dataIso: "2026-07-16", diaSemana: "qui", marcacoes: ["07:02", "12:00", "13:00", "17:04"], maduro: true, saldoDiaOriginalFmt: "+00:06" },
  { dataIso: "2026-07-15", diaSemana: "qua", marcacoes: ["07:00", "12:01", "13:00", "16:58"], maduro: true, saldoDiaOriginalFmt: "-00:02" },
  { dataIso: "2026-07-14", diaSemana: "ter", marcacoes: ["06:59", "12:00", "13:02", "17:00"], maduro: true, saldoDiaOriginalFmt: "+00:01" },
];
const OCC2 = [
  { id: "occ-a", tipo: "atraso", data: "2026-07-10", horario: "07:18" },
  { id: "occ-b", tipo: "falta", data: "2026-07-08", horario: "" },
];

async function mediaInteracao(rotulo, tipo) {
  const r = await p.evaluate(async ({ tipo, DIAS3, OCC2, ambienteSrc }) => {
    const AMBIENTE = new RegExp(ambienteSrc);
    const view = document.querySelector("#view");
    window.__fpForceWrite = false;
    const ehHome = (tipo === "like" || tipo === "reacoes");
    // prep: fixture-base + estabiliza (mesma página, sem cascata de navegação — o aquecimento
    // abaixo garante isso, senão a cascata one-shot contaria como churn falso).
    let postAniv, postTdc;
    if (ehHome) {
      // HOME (faixa de stories v379): 1 aniversariante do dia + 1 colega no tempo de casa, cada
      // um vira um rosto na faixa "Hoje na Fiobras". Cache SEMEADO com minhaReacao=false (anel
      // TRACEJADO): "like" liga o meu parabéns (o anel do rosto vira SÓLIDO no reconcile, o mesmo
      // efeito de tocar o coração no bottom sheet) e "reacoes" simula +1 reação chegando. O
      // caminho medido é o reconcile (o pisca mora aqui); a WAAPI do anel enchendo dispara só no
      // like REAL via sheet (mural-front-verify cobre o fluxo do sheet ponta a ponta).
      const hoje = new Date();
      const mes = hoje.getMonth() + 1, dia = hoje.getDate(), ano = hoje.getFullYear();
      state.aniversariantes = {
        pessoas: [{ nome: "Aniv Guarda", mes, dia }],
        recemChegados: [],
        tempoCasa: [{ nome: "Casa Guarda", mes, dia, anos: 5 }],
      };
      postAniv = `aniv-aniv-guarda-${ano}`;
      postTdc = `tdc-casa-guarda-${ano}`;
      state._reacoesCache = {
        [postAniv]: { reacoes: [{ uid: "uA", nome: "Colega A" }, { uid: "uB", nome: "Colega B" }], minhaReacao: false, total: 2 },
        [postTdc]: { reacoes: [{ uid: "uA", nome: "Colega A" }], minhaReacao: false, total: 1 },
      };
      state._fotoReatorCache = { uA: "", uB: "" };
      state.view.page = "colab-home";
    } else if (tipo === "aviso") {
      // AVISOS (rollout de regiões v390): lista keyed. 2 avisos CURTOS (sem imagem/corpo, pra o
      // insert no topo ficar sob o limiar de CLS, como o card de ocorrência) e a ação insere 1
      // aviso novo no topo: o morph mete 1 linha keyed nova (entrada one-shot) sem rebuild da lista.
      const A = new Date().toISOString();
      state.disciplinaresColab = [];
      state.comunicadosColab = [
        { id: "gav-1", titulo: "Aviso um", tipo: "comunicado", ativo: true, fixado: false, publicadoEm: A, autorNome: "GP", segmento: { tipo: "todos" } },
        { id: "gav-2", titulo: "Aviso dois", tipo: "comunicado", ativo: true, fixado: false, publicadoEm: A, autorNome: "GP", segmento: { tipo: "todos" } },
      ];
      state.view.page = "colab-comunicados";
      state.view.avFiltro = "todos";
    } else {
      if (state.funcionarios && state.funcionarios[0]) state.funcionarios[0].bhExempt = false;
      state.meuSaldoBH = { minutosOriginal: 90, saldoOriginalFormatado: "+01:30", dias: DIAS3.map((d) => ({ ...d })) };
      state.ocorrenciasColab = OCC2.map((o) => ({ ...o }));
      state.view.page = "colab-ponto";
      state.view.pontoTab = (tipo === "occ") ? "ocorrencias" : "bh";
    }
    _renderAppNow();
    await new Promise((res) => setTimeout(res, 80));
    // snapshot dos nós ANTES da ação: churn só conta re-semeadura em nó pré-existente (linha
    // nova legítima anima e é nó novo, fora deste conjunto — é o comportamento esperado).
    const antes = new Set([view, ...view.querySelectorAll("*")]);
    let cls = 0;
    const poCls = new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; });
    try { poCls.observe({ type: "layout-shift", buffered: false }); } catch (e) { /* */ }
    let longMax = 0;
    const poLt = new PerformanceObserver((l) => { for (const e of l.getEntries()) longMax = Math.max(longMax, e.duration); });
    try { poLt.observe({ type: "longtask", buffered: false }); } catch (e) { /* */ }
    // AÇÃO: muda o state e re-renderiza (updateRegion dispara o morph). aba = shell reescreve;
    // dia/occ = shell no-op e a região do corpo morpha (insere 1 linha keyed nova); like/reacoes
    // = shell no-op e a região do mural morpha o card no lugar (coração, contagem, pilha).
    if (tipo === "aba") state.view.pontoTab = "ocorrencias";
    else if (tipo === "dia") state.meuSaldoBH.dias.unshift({ dataIso: "2026-07-17", diaSemana: "sex", marcacoes: ["07:01", "12:00", "13:00", "17:03"], maduro: true, saldoDiaOriginalFmt: "+00:05" });
    else if (tipo === "occ") state.ocorrenciasColab.unshift({ id: "occ-novo", tipo: "atraso", data: "2026-07-15", horario: "07:22" });
    else if (tipo === "aviso") state.comunicadosColab.unshift({ id: "gav-novo", titulo: "Aviso novo", tipo: "comunicado", ativo: true, fixado: false, publicadoEm: new Date().toISOString(), autorNome: "GP", segmento: { tipo: "todos" } });
    else if (tipo === "like") _setReacaoOtimista(postTdc, true, 2); // liga meu coração no card do colega
    else if (tipo === "reacoes") { const c = state._reacoesCache[postAniv]; state._reacoesCache[postAniv] = { ...c, reacoes: [...c.reacoes, { uid: "uC", nome: "Colega C" }], total: 3 }; }
    let erro = null;
    try { _renderAppNow(); } catch (e) { erro = String(e).slice(0, 200); }
    await new Promise((res) => requestAnimationFrame(res));
    const morphHtml = view.innerHTML;
    // churn = animação NOVA one-shot (WAAPI/CSS-animation) re-semeada num nó que já existia.
    // CSS transition NÃO conta: é a resposta suave a uma mudança real (ex.: o coração muda de
    // cor ao curtir), não um pisca; CSSTransition tem transitionProperty, entrada/pulso não.
    const churn = (document.getAnimations ? document.getAnimations() : [])
      .filter((an) => an.playState === "running" && (an.currentTime || 0) < 100
        && an.transitionProperty === undefined
        && view.contains(an.effect && an.effect.target)
        && antes.has(an.effect && an.effect.target)
        && !AMBIENTE.test(an.animationName || "")).length;
    await new Promise((res) => setTimeout(res, 350)); // deixa os observers coletarem CLS/longtask
    poCls.disconnect(); poLt.disconnect();
    // PARIDADE: o rebuild FORÇADO (cru) tem que nascer idêntico ao resultado do morph.
    window.__fpForceWrite = true;
    try { _renderAppNow(); } catch (e) { window.__fpForceWrite = false; return { erro: String(e).slice(0, 200) }; }
    window.__fpForceWrite = false;
    const rawHtml = view.innerHTML;
    return { erro, cls, longMax, churn, morphHtml, rawHtml };
  }, { tipo, DIAS3, OCC2, ambienteSrc: "^(fpHalo|fpPing|fpSpin)$" });

  if (r.erro) { falhasM4.push(`${rotulo}: ERRO ${r.erro}`); console.log(`  ${rotulo}: ERRO ${r.erro}`); return; }
  const status = [];
  if (r.cls >= 0.02) { falhasM4.push(`${rotulo}: CLS ${r.cls.toFixed(4)} (>= 0.02)`); status.push("CLS"); }
  if (r.longMax > 50) { falhasM4.push(`${rotulo}: longtask ${r.longMax.toFixed(0)}ms (> 50)`); status.push("longtask"); }
  if (r.churn > 0) { falhasM4.push(`${rotulo}: ${r.churn} animação(ões) re-semeada(s) em nó pré-existente (churn)`); status.push("churn"); }
  const A = normaliza(r.morphHtml), B = normaliza(r.rawHtml);
  if (A !== B) {
    let i = 0; while (i < Math.min(A.length, B.length) && A[i] === B[i]) i++;
    falhasM4.push(`${rotulo}: PARIDADE morph != rebuild no offset ${i}\n    morph:   ...${A.slice(Math.max(0, i - 40), i + 80)}...\n    rebuild: ...${B.slice(Math.max(0, i - 40), i + 80)}...`);
    status.push("paridade");
  }
  console.log(`  ${rotulo}: ${status.length ? status.join(" + ") + " REPROVOU" : `ok (CLS ${r.cls.toFixed(4)}, longtask ${r.longMax.toFixed(0)}ms, churn ${r.churn}, paridade ok)`}`);
}

console.log("FASE NOVA (piloto de regiões, colab-ponto):");
// aquece a tela piloto e deixa a cascata de navegação terminar, pra os re-renders das
// interações serem SEMPRE mesma-página (pp-anima desligada = sem cascata = sem churn falso).
await p.evaluate(() => { state.view.page = "colab-ponto"; state.view.pontoTab = "bh"; _renderAppNow(); });
await p.waitForTimeout(700);
await mediaInteracao("troca de aba bh<->ocorrencias", "aba");
await mediaInteracao("refetch: dia novo no espelho", "dia");
await mediaInteracao("refetch: ocorrência nova", "occ");

// aquece a HOME (piloto estendido v374): deixa a cascata de navegação terminar, pra os
// re-renders das interações do mural serem SEMPRE mesma-página (sem cascata = sem churn falso).
console.log("FASE NOVA (piloto de regiões, colab-home / faixa de stories):");
await p.evaluate(() => { state.view.page = "colab-home"; _renderAppNow(); });
await p.waitForTimeout(700);
await mediaInteracao("like via sheet (anel da faixa reflete)", "like");
await mediaInteracao("chegada de reações novas no cache", "reacoes");

// aquece AVISOS (rollout v390): a lista keyed. O aquecimento navega pra tela (stub vazio, pois
// o seed dos avisos só entra no evaluate da mediaInteracao) e deixa a cascata terminar.
console.log("FASE NOVA (rollout de regiões, colab-comunicados):");
await p.evaluate(() => { state.view.page = "colab-comunicados"; _renderAppNow(); });
await p.waitForTimeout(700);
await mediaInteracao("chegada de aviso novo (lista keyed)", "aviso");

await b.close();
if (jsErros.length) console.log("\npageErrors:", jsErros);

let reprova = false;
if (falhasM1.length) {
  reprova = true;
  console.log(`\n${falhasM1.length} TELA(S) REPROVADAS no m1 (cache):\n` + falhasM1.map((f) => "- " + f).join("\n"));
}
if (falhasM4.length) {
  // Falha do piloto de regiões é HARD (reprova mesmo sem --strict): morph quebrado pisca de
  // verdade. CLS/longtask/churn/paridade são o contrato do updateRegion.
  reprova = true;
  console.log(`\n${falhasM4.length} FALHA(S) na FASE NOVA (piloto de regiões):\n` + falhasM4.map((f) => "- " + f).join("\n"));
}
if (falhasM2.length) {
  console.log(`\n${falhasM2.length} tela(s) sem no-op m2${ESTRITO ? " (REPROVA, modo estrito)" : " (aviso; reprova com --strict)"}:\n` + falhasM2.map((f) => "- " + f).join("\n"));
  if (ESTRITO) reprova = true;
}
if (crus.length) {
  console.log(`\n${crus.length} escrita(s) CRUA(S) em #view fora do canal setHtml${ESTRITO ? " (REPROVA)" : " (aviso; reprova com --strict)"}:\n` + crus.slice(0, 8).map(([n, l]) => `- app.js:${n} ${l.trim().slice(0, 90)}`).join("\n") + (crus.length > 8 ? `\n  ... e mais ${crus.length - 8}` : ""));
  if (ESTRITO) reprova = true;
}
if (reprova) process.exit(1);
console.log(`\nGuarda anti-flicker: PASSOU (${paginasGestor.length + paginasColab.length} telas${ESTRITO ? ", modo estrito" : ""}).`);
