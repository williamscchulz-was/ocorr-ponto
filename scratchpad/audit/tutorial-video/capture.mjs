// Captura TODAS as cenas do tutorial v2 como PNGs nitidos (DSF2, 780x1688), legenda queimada.
// Modo demo (firebase.config.js bloqueado). Zero pageerror = meta.
//   vinheta            -> pageStage (setContent animado, frames vig_NNN.png)
//   cartoes/instalacao -> pageStage (setContent)  [iOS de docs p3, Android de docs p2]
//   telas do app       -> pageApp (app demo real, semeado uma vez, TUDO)
// Saida: stills/<id>.png  (pares -> <id>__a.png e <id>__b.png) + vig/vig_NNN.png
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { scenes } from "./scenes.mjs";
import { FONT_CSS, CAPTION_CSS, CARD_CSS, INSTALL_CSS, cardHtml, captionHtml, vignetteHtml } from "./brand.mjs";

const BASE = "http://localhost:8081/public/index.html";
const TUT = "http://localhost:8081/docs/tutorial-instalar-app.html";
const OUT = path.resolve("scratchpad/audit/tutorial-video/stills");
const VIG = path.resolve("scratchpad/audit/tutorial-video/vig");
mkdirSync(OUT, { recursive: true });
rmSync(VIG, { recursive: true, force: true });
mkdirSync(VIG, { recursive: true });
const VIG_FRAMES = 72;

const errors = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, serviceWorkers: "block", reducedMotion: "reduce",
  locale: "pt-BR",
});
await ctx.route("**/*", (route) => {
  const h = new URL(route.request().url()).hostname;
  if (h === "localhost" || h === "127.0.0.1") {
    if (/firebase\.config\.js/.test(route.request().url())) return route.abort();
    return route.continue();
  }
  return route.abort();
});
const pageStage = await ctx.newPage();
const pageApp = await ctx.newPage();
for (const p of [pageStage, pageApp]) {
  p.on("dialog", (d) => d.dismiss().catch(() => {}));
  p.on("pageerror", (e) => errors.push(`[${p === pageApp ? "app" : "stage"}] ${String(e).slice(0, 200)}`));
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(page, name) {
  await page.evaluate(() => {
    document.querySelectorAll(".demo-banner").forEach((n) => n.remove());
    document.querySelectorAll("#toast-root > *, .cerimonia-ov, .cerimonia").forEach((n) => n.remove());
  });
  await wait(110);
  await page.screenshot({ path: path.join(OUT, name + ".png") });
  console.log("  shot", name);
}

// ---------- Fase 0 · telefones de instalacao (element screenshot do PDF) ----------
// iOS de docs (pagina 3, .p3), Android de docs (pagina 2, .p2). Mesma linguagem visual.
const iosPhones = {}, andPhones = {};
await pageStage.goto(TUT, { waitUntil: "networkidle" });
await pageStage.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
// Força TODAS as imagens a decodificar ANTES do screenshot: um decode tardio reflui o .fone e o
// "wait for stable" do Playwright estoura (era o timeout intermitente do Android p2).
await pageStage.evaluate(() => Promise.all([...document.images].map((im) => (im.decode ? im.decode().catch(() => {}) : null)))).catch(() => {});
await wait(500);
const _foneShot = { omitBackground: true, animations: "disabled", timeout: 30000 };
for (let k = 1; k <= 4; k++) {
  const eli = pageStage.locator(`.p3 .grade .step:nth-of-type(${k}) .fone`).first();
  await eli.scrollIntoViewIfNeeded(); await wait(80);
  iosPhones[k] = "data:image/png;base64," + (await eli.screenshot(_foneShot)).toString("base64");
  const ela = pageStage.locator(`.p2 .grade .step:nth-of-type(${k}) .fone`).first();
  await ela.scrollIntoViewIfNeeded(); await wait(80);
  andPhones[k] = "data:image/png;base64," + (await ela.screenshot(_foneShot)).toString("base64");
}
console.log("telefones capturados: iOS", Object.keys(iosPhones).length, "Android", Object.keys(andPhones).length);

// ---------- Fase 1 · VINHETA (frames animados) ----------
await pageStage.setContent(vignetteHtml(), { waitUntil: "load" });
await pageStage.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
await wait(200);
for (let i = 0; i < VIG_FRAMES; i++) {
  const p = Math.min(1, (i / (VIG_FRAMES - 1)) * 1.18); // satura ~85%, segura o wordmark
  await pageStage.evaluate((pp) => window.__setVig(pp), p);
  await wait(16);
  await pageStage.screenshot({ path: path.join(VIG, "vig_" + String(i).padStart(3, "0") + ".png") });
}
console.log("vinheta:", VIG_FRAMES, "frames");

// ---------- helpers de palco (cartao / instalacao) ----------
async function renderCard(scene) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390, initial-scale=1, viewport-fit=cover"><style>${FONT_CSS}${CARD_CSS}</style></head><body>${cardHtml(scene.card)}</body></html>`;
  await pageStage.setContent(html, { waitUntil: "load" });
  await pageStage.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await wait(200);
  await shot(pageStage, scene.id);
}
async function renderInstall(scene) {
  const plat = scene.plat === "android" ? "android" : "ios";
  const img = (plat === "android" ? andPhones : iosPhones)[scene.step];
  const lbl = plat === "android" ? "Android" : "iPhone";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390, initial-scale=1, viewport-fit=cover"><style>${FONT_CSS}${CAPTION_CSS}${INSTALL_CSS}</style></head><body>
    <div class="ins-plat">${lbl}</div>
    <div class="ins-wrap"><img class="ins-fone" src="${img}" alt="${lbl} passo ${scene.step}"></div>
    ${captionHtml(scene.cap, scene.capPos || "bottom")}</body></html>`;
  await pageStage.setContent(html, { waitUntil: "load" });
  await pageStage.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await wait(220);
  await shot(pageStage, scene.id);
}

// ---------- app: boot + legenda + seed ----------
await pageApp.goto(BASE, { waitUntil: "networkidle" });
await pageApp.evaluate(() => { try { _changelogChecado = true; } catch {} });
await pageApp.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
await pageApp.addStyleTag({ content: CAPTION_CSS });
await pageApp.evaluate(() => {
  try { localStorage.setItem("fiopulse:tema", "claro"); } catch {}
  window.__setCap = (text, pos) => {
    document.getElementById("tut-cap")?.remove();
    if (!text) return;
    const d = document.createElement("div");
    d.id = "tut-cap"; d.className = "pos-" + (pos || "bottom");
    d.innerHTML = `<div class="tut-cap__in">${text}</div>`;
    document.body.appendChild(d);
  };
});
await wait(300);
// Legenda transparente (camada separada, sobreposta APOS o zoom no assemble): so pra cenas
// com "focus" (close-up), onde queimar a legenda no still a cortaria no push-in.
async function capImage(sc) {
  if (!sc.cap) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390, initial-scale=1"><style>${FONT_CSS}${CAPTION_CSS}html,body{background:transparent;margin:0;width:390px;height:844px}</style></head><body>${captionHtml(sc.cap, sc.capPos || "bottom")}</body></html>`;
  await pageStage.setContent(html, { waitUntil: "load" });
  await pageStage.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await wait(150);
  await pageStage.screenshot({ path: path.join(OUT, "cap_" + sc.id + ".png"), omitBackground: true });
}
async function setCap(sc) {
  if (sc.focus) { await pageApp.evaluate(() => window.__setCap("")); await capImage(sc); return; }
  await pageApp.evaluate(({ t, p }) => window.__setCap(t, p), { t: sc.cap || "", p: sc.capPos || "bottom" }); await wait(70);
}

// SEED completo de colaborador (roda uma vez). TUDO: home, situacao ferias, faixa 3 tipos,
// notificacoes, pesquisa, vagas, gamificacao (streak/badges), documentos, recibos, ponto.
async function seedColab() {
  await pageApp.evaluate(() => {
    _changelogChecado = true;
    if (!state.users.find((u) => u.id === "colab-tut"))
      state.users.push({ id: "colab-tut", usuario: "colab", senha: "x", role: "colaborador", nome: state.funcionarios[0]?.nome || "Colaborador", funcionarioCodigo: state.funcionarios[0]?.codigo, codigo: state.funcionarios[0]?.codigo });
    logout(); login("colab-tut", "x");
    try { marcarOnbVisto("colab-tut"); } catch {}
    document.getElementById("acesso")?.remove();
    document.getElementById("onb-overlay")?.remove();
    document.getElementById("termo-overlay")?.remove();
    document.querySelectorAll(".modal-backdrop").forEach((n) => n.remove());
    state.termoAdesaoOk = true; state.termoCanalOk = true;
    delete state._termoAdesaoAceitoAgora; delete state._termoCanalAceitoAgora;

    const f = state.funcionarios[0] || {};
    try { localStorage.setItem("gami-marco-celebrado", JSON.stringify({ [String(new Date().getFullYear())]: 99999 })); } catch {}
    f.cargo = f.cargo || "Operadora de produção";
    f.setor = f.setor || "Produção";
    f.turno = f.turno || 1;
    f.admissao = f.admissao || "2020-06-01"; // ~6 anos -> medalhas 1/3/5 anos + veterano
    const mes = new Date().getMonth() + 1, dia = new Date().getDate(), ano = new Date().getFullYear();
    const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

    // Banco de horas + espelho (7 dias) + saldo pra folga
    const dias = [
      { dataIso: `${ano}-07-22`, marcacoes: ["07:26","12:00","13:01","16:49"], saldoDiaOriginalFmt: "+08:00", maduro: true },
      { dataIso: `${ano}-07-21`, marcacoes: ["07:31","12:02","13:00","16:52"], saldoDiaOriginalFmt: "+07:45", maduro: true },
      { dataIso: `${ano}-07-20`, marcacoes: ["07:28","12:01","12:59","16:44"], saldoDiaOriginalFmt: "+07:20", maduro: true },
      { dataIso: `${ano}-07-17`, marcacoes: ["07:25","12:00","13:03","16:50"], saldoDiaOriginalFmt: "+07:05", maduro: true },
      { dataIso: `${ano}-07-16`, marcacoes: ["07:33","12:04","13:00","16:48"], saldoDiaOriginalFmt: "+06:40", maduro: true },
      { dataIso: `${ano}-07-15`, marcacoes: ["07:27","12:00","13:02","16:47"], saldoDiaOriginalFmt: "+06:25", maduro: true },
      { dataIso: `${ano}-07-14`, marcacoes: ["07:29","12:01","13:00","16:45"], saldoDiaOriginalFmt: "+06:10", maduro: true },
    ];
    state.meuSaldoBH = { saldoMin: 480, minutos: 480, minutosOriginal: 480, saldoFormatado: "08:00", saldoOriginalFormatado: "08:00", atualizadoEm: new Date().toISOString(), dias };

    // Gamificacao: temporada ativa, streak ligado (tabela.streak), extrato com TODAS as formas
    // de pontuar. SEM gamiTop (ranking) -> tom de progresso pessoal, sem comparacao.
    state.gamiConfig = { ativa: true, ano, marcos: [50, 100, 200, 500], tabela: { streak: 5 } };
    state.gamiMeu = { total: 120 };
    state.gamiStreakDias = 4; // "4 de 5 dias" na saudacao
    state.gamiExtrato = [
      { id: "e1", acao: "assinatura", rotulo: "Assinou o recibo de junho", pontos: 20, em: new Date(Date.now() - 2 * 864e5).toISOString() },
      { id: "e2", acao: "parabens", rotulo: "Parabenizou uma colega de equipe", pontos: 5, em: new Date(Date.now() - 3 * 864e5).toISOString() },
      { id: "e3", acao: "ciencia", rotulo: "Deu ciência em um comunicado", pontos: 10, em: new Date(Date.now() - 5 * 864e5).toISOString() },
      { id: "e4", acao: "presenca", rotulo: "5 dias seguidos no app", pontos: 15, em: new Date(Date.now() - 8 * 864e5).toISOString() },
      { id: "e5", acao: "boasvindas", rotulo: "Deu as boas-vindas a um novato", pontos: 5, em: new Date(Date.now() - 11 * 864e5).toISOString() },
      { id: "e6", acao: "pesquisa", rotulo: "Respondeu à pesquisa de clima", pontos: 30, em: new Date(Date.now() - 16 * 864e5).toISOString() },
      { id: "e7", acao: "documento", rotulo: "Leu o código de conduta", pontos: 10, em: new Date(Date.now() - 22 * 864e5).toISOString() },
    ];

    // Comunicados: 1 fixado (nao lido) + 1 aviso lido + 1 comunicado lido (variedade p/ notif)
    state.comunicadosColab = [
      { id: "c1", titulo: "Ajuste no horário do refeitório", corpo: "A partir de segunda-feira, o refeitório passa a funcionar das 11h30 às 13h30. Contamos com todos para manter o rodízio tranquilo.", fixado: true, tipo: "comunicado", publicadoEm: new Date().toISOString(), autorNome: "Gente e Pessoas", minhaLeitura: null },
      { id: "c2", titulo: "Campanha de vacinação da gripe", corpo: "A enfermaria estará aplicando a vacina da gripe nesta quinta e sexta, das 8h às 16h. Participe.", fixado: false, tipo: "aviso", publicadoEm: new Date(Date.now() - 2 * 864e5).toISOString(), autorNome: "Gente e Pessoas", minhaLeitura: new Date(Date.now() - 1 * 864e5).toISOString() },
      { id: "c3", titulo: "Resultado da pesquisa de clima", corpo: "Obrigado a quem participou. Em breve compartilhamos os próximos passos com cada área.", fixado: false, tipo: "comunicado", publicadoEm: new Date(Date.now() - 6 * 864e5).toISOString(), autorNome: "Gente e Pessoas", minhaLeitura: new Date(Date.now() - 5 * 864e5).toISOString() },
    ];
    state.comunicados = state.comunicadosColab;

    // Faixa "Hoje na Fiobras": aniversariante (heart) + tempo de casa + recem chegado (mao)
    state.aniversariantes = {
      pessoas: [ { nome: "Carla Nunes Ribeiro", dia, mes }, { nome: "Ana Beatriz Costa", dia: (dia % 27) + 1, mes }, { nome: "João Paulo da Silva", dia: ((dia + 4) % 27) + 1, mes } ],
      tempoCasa: [ { nome: "Roberto Lima", dia, mes, anos: 5 } ],
      recemChegados: [ { nome: "Marcos Vinícius Alves", admissao: new Date(Date.now() - 9 * 864e5).toISOString(), setor: "Produção" } ],
    };
    const cc = state._reacoesCache || (state._reacoesCache = {});
    try { cc[muralPostId("Carla Nunes Ribeiro")] = { reacoes: [], total: 2, minhaReacao: false }; } catch {}
    try { cc[tdcPostId("Roberto Lima")] = { reacoes: [], total: 3, minhaReacao: false }; } catch {}
    try { cc[bvPostId("Marcos Vinícius Alves", state.aniversariantes.recemChegados[0].admissao)] = { reacoes: [], total: 1, minhaReacao: false }; } catch {}

    // Pesquisa de clima aberta (convite na home + notificacao). Anonima.
    state.pesquisasClimaColab = [
      { id: "pc1", titulo: "Como você está se sentindo no trabalho?", jaRespondi: false, anonima: true, fim: new Date(Date.now() + 6 * 864e5).toISOString(), publicadoEm: new Date(Date.now() - 1 * 864e5).toISOString() },
    ];

    // Oportunidades internas: vg1 sem interesse (fluxo "demonstrar interesse"); vg2 com
    // interesse JÁ demonstrado e status "em análise" (fluxo "acompanhar o andamento", cena c11-status).
    state.vagasInternasColab = [
      { id: "vg1", titulo: "Auxiliar de logística", setor: "Logística", turno: "1º turno", cidade: "Indaial, SC", descricao: "Apoio na separação e conferência de materiais. Boa oportunidade para quem quer conhecer a área." },
      { id: "vg2", titulo: "Assistente de qualidade", setor: "Qualidade", turno: "1º turno", cidade: "Indaial, SC", descricao: "Apoio nas inspeções e nos registros da área de qualidade." },
    ];
    state.meusInteressesInternos = { vg2: { status: "em-analise", em: new Date(Date.now() - 3 * 864e5).toISOString() } };

    // Ferias: DE FERIAS AGORA (chip verde "até DD/MM") + periodos ricos na aba Ferias
    state.feriasMinha = {
      resumo: { proporcionalAtual: 17.5, temVencida: false, diasVencidos: 0, deFeriasAgora: true },
      periodos: [
        { situacao: "em gozo", aquisitivoInicio: `${ano - 1}-01-15`, aquisitivoFim: `${ano}-01-14`, direito: 30,
          gozos: [ { dias: 15, inicio: iso(-4), fim: iso(10) } ] },
        { situacao: "em aquisicao", aquisitivoInicio: `${ano}-01-15`, avos: 7, saldo: 17.5, direito: 30 },
        { situacao: "concluidas", aquisitivoInicio: `${ano - 2}-01-15`, aquisitivoFim: `${ano - 1}-01-14`, direito: 30,
          gozos: [ { dias: 20, inicio: `${ano - 1}-07-01`, fim: `${ano - 1}-07-20` } ], abonos: [ { dias: 10, inicio: `${ano - 1}-07-21`, fim: `${ano - 1}-07-30`, pagamento: `${ano - 1}-06-30` } ] },
      ],
    };

    // Recibos (pendente do mes + assinados) + cartao ponto
    state.meusRecibos = [
      { id: "rcb-atual", tipo: "recibo", competencia: `${ano}-06`, paginas: 1 },
      { id: "rcb-05", tipo: "recibo", competencia: `${ano}-05`, paginas: 1, minhaAssinatura: { em: `${ano}-06-05T10:12:00` } },
      { id: "rcb-04", tipo: "recibo", competencia: `${ano}-04`, paginas: 1, minhaAssinatura: { em: `${ano}-05-06T09:40:00` } },
      { id: "cp-atual", tipo: "cartao-ponto", competencia: `${ano}-06`, paginas: 1 },
    ];

    // Ocorrencias (poucas, so acompanhar)
    state.ocorrenciasColab = [
      { id: "o1", data: `${ano}-07-18`, tipo: "Atraso", duracao: "00:12", status: "confirmada", origem: "Marcação" },
      { id: "o2", data: `${ano}-07-11`, tipo: "Saída antecipada", duracao: "00:20", status: "confirmada", origem: "Marcação" },
    ];

    // Documentos institucionais + termos aceitos
    state.documentosColabProntos = true;
    state.meusTermos = [
      { id: "t1", tipo: "adesao", titulo: "Termo de adesão à assinatura eletrônica", curto: "Adesão", aceitoEm: new Date(Date.now() - 30 * 864e5).toISOString() },
    ];
    state.documentosColab = [
      { id: "d1", titulo: "Código de conduta", tipo: "politica", confirmacao: "aceite", publicadoEm: new Date(Date.now() - 20 * 864e5).toISOString() },
      { id: "d2", titulo: "Política de segurança do trabalho", tipo: "politica", confirmacao: "assinatura", publicadoEm: new Date(Date.now() - 40 * 864e5).toISOString() },
      { id: "d3", titulo: "Manual do colaborador", tipo: "manual", confirmacao: "nenhuma", publicadoEm: new Date(Date.now() - 90 * 864e5).toISOString() },
    ];
  });
}

// remove o bloco "Top 10 da Fiobras" da tela Conquistas (tom pessoal, sem comparacao)
async function tirarRanking() {
  await pageApp.evaluate(() => {
    const corpo = document.querySelector('[data-region="conquistas:corpo"]') || document.querySelector("#view");
    if (!corpo) return;
    const h2s = [...corpo.querySelectorAll(".gm-h2")];
    const top = h2s.find((h) => /top\s*10/i.test(h.textContent || ""));
    if (!top) return;
    let n = top.nextElementSibling;
    top.remove();
    while (n && !n.classList.contains("gm-h2")) { const nx = n.nextElementSibling; n.remove(); n = nx; }
  });
}

// ---------- despachante por acao (telas do app) ----------
async function goApp(page, act) {
  return await page.evaluate((act) => {
    const go = (pg, ex) => { state.view.page = pg; if (ex) Object.assign(state.view, ex); _renderAppNow(); };
    switch (act) {
      case "homeTop": case "homeSit": case "atalhos": case "navbar": case "gamiHome":
      case "notifBell": case "pesquisa": go("colab-home"); window.scrollTo(0, 0); break;
      case "pontoBH": go("colab-ponto", { pontoTab: "bh" }); window.scrollTo(0, 0); break;
      case "pontoOcc": go("colab-ponto", { pontoTab: "ocorrencias" }); window.scrollTo(0, 0); break;
      case "pontoFerias": go("colab-ponto", { pontoTab: "ferias" }); window.scrollTo(0, 0); break;
      case "folha": go("colab-folha"); window.scrollTo(0, 0); break;
      case "documentos": go("colab-documentos"); window.scrollTo(0, 0); break;
      case "avisos": go("colab-comunicados"); window.scrollTo(0, 0); break;
      case "conquistas": go("colab-conquistas"); window.scrollTo(0, 0); break;
      case "conta": go("colab-conta"); window.scrollTo(0, 0); break;
      case "vagasTela": go("colab-oportunidades"); window.scrollTo(0, 0); break;
      case "notifCentral": case "notifLidas": go("colab-notificacoes"); window.scrollTo(0, 0); break;
    }
    document.querySelectorAll(".demo-banner").forEach((n) => n.remove());
    document.getElementById("onb-overlay")?.remove();
    return { page: state.view.page };
  }, act);
}
const scrollTo = (y) => pageApp.evaluate((yy) => window.scrollTo(0, yy), y);
const scrollCenter = (sel) => pageApp.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: "center" }); }, sel);

// ---------- LOOP principal ----------
let seeded = false;
async function ensureSeed() { if (!seeded) { await seedColab(); seeded = true; } }

for (const sc of scenes) {
  if (sc.kind === "vignette") continue; // frames ja capturados na fase 1
  if (sc.kind === "card") { await renderCard(sc); continue; }
  if (sc.kind === "install") { await renderInstall(sc); continue; }

  // ---- app ----
  if (sc.act === "acesso") {
    await pageApp.evaluate(() => {
      document.querySelectorAll(".modal-backdrop").forEach((n) => n.remove());
      document.getElementById("onb-overlay")?.remove();
      document.getElementById("app")?.classList.add("hidden");
      document.getElementById("login")?.classList.add("hidden");
      document.getElementById("login-colab")?.classList.add("hidden");
      document.getElementById("acesso")?.classList.remove("hidden");
    });
    await setCap(sc); await wait(140); await shot(pageApp, sc.id); continue;
  }
  if (sc.act === "login") {
    await pageApp.evaluate(() => {
      document.getElementById("acesso")?.classList.add("hidden");
      document.getElementById("login")?.classList.add("hidden");
      document.getElementById("app")?.classList.add("hidden");
      document.getElementById("login-colab")?.classList.remove("hidden");
      const cc = document.getElementById("colab-cpf"), cs = document.getElementById("colab-senha");
      if (cc) cc.value = "123.456.789-00";
      if (cs) cs.value = "••••••••";
    });
    await setCap(sc); await wait(140); await shot(pageApp, sc.id); continue;
  }
  if (sc.act === "termo") {
    await pageApp.evaluate(() => {
      try { localStorage.setItem("fiopulse:ultimoCpf", "12345678900"); } catch {}
      document.getElementById("login-colab")?.classList.add("hidden");
      document.getElementById("acesso")?.classList.add("hidden");
      document.getElementById("termo-overlay")?.remove();
      if (typeof mostrarTermoAdesao === "function") mostrarTermoAdesao();
    });
    await wait(300); await setCap(sc); await wait(120); await shot(pageApp, sc.id);
    await pageApp.evaluate(() => document.getElementById("termo-overlay")?.remove());
    continue;
  }
  if (sc.act === "onb1" || sc.act === "onb2") {
    await ensureSeed();
    if (sc.act === "onb1") {
      await pageApp.evaluate(() => { document.getElementById("onb-overlay")?.remove(); if (typeof mostrarOnboarding === "function") mostrarOnboarding(); });
      await wait(360);
    } else {
      await pageApp.evaluate(() => { document.getElementById("onb-cta")?.click(); });
      await wait(360);
    }
    await setCap(sc); await wait(120); await shot(pageApp, sc.id);
    if (sc.act === "onb2") await pageApp.evaluate(() => document.getElementById("onb-overlay")?.remove());
    continue;
  }

  await ensureSeed();

  // ---- HOME e variacoes (still simples, focus no assemble) ----
  if (["homeTop", "homeSit", "notifBell", "gamiHome", "pesquisa"].includes(sc.act)) {
    await goApp(pageApp, sc.act); await wait(240);
    if (sc.act === "gamiHome") await scrollCenter(".pts-slim");
    if (sc.act === "pesquisa") await scrollCenter("[data-clima-resp]");
    await wait(180); await setCap(sc); await shot(pageApp, sc.id); continue;
  }
  if (sc.act === "atalhos") {
    await goApp(pageApp, sc.act); await wait(240);
    await scrollCenter(".pp-atl"); await wait(180);
    await setCap(sc); await shot(pageApp, sc.id); continue;
  }
  if (sc.act === "navbar") {
    await goApp(pageApp, sc.act); await wait(240); await scrollTo(0); await wait(120);
    await setCap(sc); await shot(pageApp, sc.id); continue;
  }

  // ---- FAIXA: parabenizar (heart) ----
  if (sc.act === "faixaSheet") {
    await goApp(pageApp, "homeTop"); await wait(200);
    await pageApp.evaluate(() => { try { if (typeof abrirMuralSheet === "function") abrirMuralSheet(muralPostId("Carla Nunes Ribeiro")); } catch {} });
    await wait(380); await setCap(sc); await shot(pageApp, sc.id + "__a");
    await pageApp.evaluate(() => {
      const h = document.querySelector(".mural-sheet [data-bday-heart]");
      if (h) { h.classList.add("on"); h.setAttribute("aria-pressed", "true"); try { if (typeof _muralHeart === "function") h.innerHTML = _muralHeart(true); } catch {} }
      const hint = document.querySelector(".mural-sheet [data-sheet-hint]");
      if (hint) hint.textContent = "Pronto, você parabenizou Carla.";
    });
    await wait(380); await shot(pageApp, sc.id + "__b");
    await pageApp.evaluate(() => document.querySelector(".mural-sheet")?.remove());
    continue;
  }
  // ---- FAIXA: close-up do coracao ----
  if (sc.act === "faixaClose") {
    await goApp(pageApp, "homeTop"); await wait(180);
    await pageApp.evaluate(() => { try { if (typeof abrirMuralSheet === "function") abrirMuralSheet(muralPostId("Carla Nunes Ribeiro")); } catch {} });
    await wait(360);
    await pageApp.evaluate(() => {
      const h = document.querySelector(".mural-sheet [data-bday-heart]");
      if (h) { h.classList.add("on"); h.setAttribute("aria-pressed", "true"); try { if (typeof _muralHeart === "function") h.innerHTML = _muralHeart(true); } catch {} }
      const hint = document.querySelector(".mural-sheet [data-sheet-hint]");
      if (hint) hint.textContent = "Pronto, você parabenizou Carla.";
    });
    await wait(320); await setCap(sc); await shot(pageApp, sc.id);
    await pageApp.evaluate(() => document.querySelector(".mural-sheet")?.remove());
    continue;
  }
  // ---- FAIXA: boas-vindas ao novato (mao) ----
  if (sc.act === "novato") {
    await goApp(pageApp, "homeTop"); await wait(200);
    await pageApp.evaluate(() => {
      try {
        const adm = state.aniversariantes.recemChegados[0].admissao;
        if (typeof abrirMuralSheet === "function") abrirMuralSheet(bvPostId("Marcos Vinícius Alves", adm));
      } catch {}
    });
    await wait(380); await setCap(sc); await shot(pageApp, sc.id + "__a");
    await pageApp.evaluate(() => {
      const hand = document.querySelector(".mural-sheet .bvv__hand");
      if (hand) { hand.classList.add("on"); hand.setAttribute("aria-pressed", "true"); try { if (typeof _bvHand === "function") hand.innerHTML = _bvHand(true); } catch {} }
      const hint = document.querySelector(".mural-sheet [data-sheet-hint]");
      if (hint) hint.textContent = "Pronto, você deu as boas-vindas a Marcos.";
    });
    await wait(380); await shot(pageApp, sc.id + "__b");
    await pageApp.evaluate(() => document.querySelector(".mural-sheet")?.remove());
    continue;
  }

  // ---- NOTIFICACOES ----
  if (sc.act === "notifCentral") {
    await goApp(pageApp, sc.act); await wait(260); await setCap(sc); await shot(pageApp, sc.id); continue;
  }
  if (sc.act === "notifLidas") {
    await goApp(pageApp, sc.act); await wait(260); await setCap(sc); await shot(pageApp, sc.id + "__a");
    await pageApp.evaluate(() => { document.querySelector("[data-notif-allread]")?.click(); });
    await wait(340); await shot(pageApp, sc.id + "__b");
    continue;
  }

  // ---- PONTO / PAGAMENTO / DOCS / AVISOS / VAGAS (telas simples) ----
  if (["pontoBH", "pontoOcc", "pontoFerias", "folha", "documentos", "avisos", "vagasTela", "conta"].includes(sc.act)) {
    await goApp(pageApp, sc.act); await wait(280); await scrollTo(0); await wait(100); await setCap(sc); await shot(pageApp, sc.id); continue;
  }
  if (sc.act === "assinar") {
    await goApp(pageApp, "folha"); await wait(220);
    await pageApp.evaluate(() => { if (typeof openAssinarReciboSheet === "function") openAssinarReciboSheet("rcb-atual"); });
    await wait(360); await setCap(sc); await shot(pageApp, sc.id + "__a");
    await pageApp.evaluate(() => {
      if (typeof _assState !== "undefined" && _assState) {
        _assState.geo = { lat: -26.8975, lng: -49.2317, acc: 12 };
        _assState.passo = "senha"; _assState.aceite = true;
        assRender();
        const s = document.getElementById("ass-senha"); if (s) s.value = "••••••••";
      }
    });
    await wait(360); await shot(pageApp, sc.id + "__b");
    await pageApp.evaluate(() => { try { _assState = null; } catch {} if (typeof closeModal === "function") closeModal(); document.querySelectorAll(".modal-backdrop").forEach((n) => n.remove()); });
    continue;
  }
  if (sc.act === "docViewer") {
    await goApp(pageApp, "documentos"); await wait(220);
    await pageApp.evaluate(() => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='620' height='877' viewBox='0 0 620 877'><rect width='620' height='877' fill='%23ffffff'/><rect x='0' y='0' width='620' height='96' fill='%23046a30'/><text x='40' y='60' font-family='Poppins,Arial' font-size='30' fill='%23ffffff' font-weight='700'>Código de conduta</text><text x='40' y='150' font-family='Arial' font-size='18' fill='%23204'>Fiobras · Gestão de Pessoas</text><text x='40' y='210' font-family='Arial' font-size='15' fill='%23333'>1. Respeito e convivência</text><text x='40' y='245' font-family='Arial' font-size='13' fill='%23555'>Tratamos todos com respeito, dentro e fora da empresa.</text><text x='40' y='300' font-family='Arial' font-size='15' fill='%23333'>2. Segurança em primeiro lugar</text><text x='40' y='335' font-family='Arial' font-size='13' fill='%23555'>Use os equipamentos de proteção e siga os procedimentos.</text><text x='40' y='390' font-family='Arial' font-size='15' fill='%23333'>3. Uso responsável dos recursos</text><text x='40' y='425' font-family='Arial' font-size='13' fill='%23555'>Cuidamos do patrimônio e do meio ambiente.</text></svg>`;
      const url = "data:image/svg+xml;charset=utf-8," + svg;
      if (typeof openDocViewer === "function") openDocViewer({ titulo: "Código de conduta", tipo: "politica", exigeAssinatura: false, anexo: { url, nome: "codigo-conduta.svg", mime: "image/svg+xml" } });
    });
    await wait(460); await setCap(sc); await shot(pageApp, sc.id);
    await pageApp.evaluate(() => document.querySelector(".modal-backdrop--docview")?.remove());
    continue;
  }
  if (sc.act === "vagasInteresse") {
    await goApp(pageApp, "vagasTela"); await wait(220);
    await pageApp.evaluate(() => { if (typeof abrirInteresseInterno === "function") abrirInteresseInterno("vg1"); });
    await wait(380); await setCap(sc); await shot(pageApp, sc.id + "__a");
    await pageApp.evaluate(() => { const s = document.querySelector(".vi-sheet"); if (s) s.classList.add("vi-sheet--ok"); });
    await wait(360); await shot(pageApp, sc.id + "__b");
    await pageApp.evaluate(() => document.querySelector(".vi-sheet")?.remove());
    continue;
  }
  // ---- VAGAS: acompanhar o status da candidatura interna (chip "Em análise" em vg2) ----
  if (sc.act === "vagasStatus") {
    await goApp(pageApp, "vagasTela"); await wait(280);
    await scrollCenter(".vio--st"); await wait(180);
    await setCap(sc); await shot(pageApp, sc.id); continue;
  }

  // ---- CONQUISTAS ----
  if (sc.act === "conquistas") {
    await goApp(pageApp, sc.act); await wait(320);
    await pageApp.evaluate(() => _renderAppNow()); await wait(160);
    await tirarRanking(); await scrollTo(0); await wait(140);
    await setCap(sc); await shot(pageApp, sc.id); continue;
  }
  if (sc.act === "conquistasBadges") {
    await pageApp.evaluate(() => { state.view.page = "colab-conquistas"; state.view.gamiTab = "bdg"; _renderAppNow(); });
    await wait(340); await pageApp.evaluate(() => _renderAppNow()); await wait(160);
    await scrollTo(0); await wait(140);
    await setCap(sc); await shot(pageApp, sc.id);
    await pageApp.evaluate(() => { state.view.gamiTab = "pts"; });
    continue;
  }
  if (sc.act === "conquistasComo") {
    await pageApp.evaluate(() => { state.view.page = "colab-conquistas"; state.view.gamiTab = "pts"; _renderAppNow(); });
    await wait(320); await pageApp.evaluate(() => _renderAppNow()); await wait(160);
    await tirarRanking();
    await pageApp.evaluate(() => {
      const h2s = [...document.querySelectorAll('[data-region="conquistas:corpo"] .gm-h2, #view .gm-h2')];
      const como = h2s.find((h) => /como voc/i.test(h.textContent || ""));
      if (como) como.scrollIntoView({ block: "start" });
    });
    await wait(200); await setCap(sc); await shot(pageApp, sc.id); continue;
  }

  // ---- CONTA · tema ----
  if (sc.act === "contaTema") {
    await goApp(pageApp, "conta"); await wait(220);
    await scrollCenter('#cp-seg-tema'); await wait(160);
    await setCap(sc); await shot(pageApp, sc.id + "__a");
    await pageApp.evaluate(() => { document.querySelector('#cp-seg-tema [data-tema="escuro"]')?.click(); });
    await wait(420); await scrollCenter('#cp-seg-tema'); await wait(140);
    await shot(pageApp, sc.id + "__b");
    await pageApp.evaluate(() => { document.querySelector('#cp-seg-tema [data-tema="claro"]')?.click(); });
    await wait(200);
    continue;
  }

  // fallback: tela simples
  await goApp(pageApp, sc.act); await wait(260); await setCap(sc); await shot(pageApp, sc.id);
}

writeFileSync(path.join(OUT, "_vigframes.json"), JSON.stringify({ frames: VIG_FRAMES }));
console.log("\n=== pageerrors (" + errors.length + ") ===");
console.log(errors.length ? [...new Set(errors)].slice(0, 40).join("\n") : "nenhum");
await browser.close();
process.exit(0);
