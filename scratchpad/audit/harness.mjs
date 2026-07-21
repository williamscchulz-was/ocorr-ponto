// ============================================================
// Harness Playwright — auditoria FioPulse (FASE 0, RIG A)
// ============================================================
// Renderiza o app LOGADO sem tocar produção. NUNCA editar public/ a partir
// daqui; tudo que este arquivo faz é injetar estado via page.evaluate DEPOIS
// do load. Receita completa em docs/AUDITORIA-POLISH-2026.md (seção Ferramental).
//
// Uso típico:
//   import { abrirContexto, seedGestor, seedColab, setTema, medirLatenciaClique } from "./harness.mjs";
//   const { browser, context, page } = await abrirContexto({ viewport: "desktop" });
//   await page.goto(URL);
//   await seedGestor(page);
//   await page.screenshot({ path: "out/foo.png" });
//   await browser.close();
//
// Servidor estático: `node scratchpad/audit/server.mjs 8081` deve estar no ar
// (ou use iniciarServidor()/pararServidor() deste módulo).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PORT = 8081;
export const BASE_URL = `http://localhost:${PORT}/public/index.html`;
export const OUT_DIR = path.join(__dirname, "out");

// ------------------------------------------------------------
// Servidor estático (opcional — o chamador também pode subir por conta própria)
// ------------------------------------------------------------
let _serverProc = null;
export function iniciarServidor() {
  return new Promise((resolve, reject) => {
    _serverProc = spawn(process.execPath, [path.join(__dirname, "server.mjs"), String(PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let resolved = false;
    _serverProc.stdout.on("data", (d) => {
      if (!resolved && String(d).includes("servindo")) { resolved = true; resolve(_serverProc); }
    });
    _serverProc.on("error", reject);
    setTimeout(() => { if (!resolved) { resolved = true; resolve(_serverProc); } }, 1500);
  });
}
export function pararServidor() {
  if (_serverProc) { _serverProc.kill(); _serverProc = null; }
}

// ------------------------------------------------------------
// SEGURANÇA INEGOCIÁVEL: bloqueia toda request não-localhost.
// O app carrega firebase.config.js real (existe no disco do William) — sem
// este bloqueio o SDK do Firebase tentaria falar com produção de verdade.
// ------------------------------------------------------------
const HOSTS_PERMITIDOS = new Set(["localhost", "127.0.0.1"]);
async function bloquearRedeExterna(context) {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (HOSTS_PERMITIDOS.has(url.hostname)) return route.continue();
    return route.abort();
  });
}

// ------------------------------------------------------------
// Contextos desktop (1440x900) e mobile (iPhone 390x844, touch, DPR 2)
// ------------------------------------------------------------
const UA_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

export async function abrirContexto({ viewport = "desktop", recordVideo = null, colorScheme = null } = {}) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const opts = {
    serviceWorkers: "block", // PEGADINHA conhecida: SW cache-first serve JS velho
  };
  if (viewport === "mobile") {
    Object.assign(opts, {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: UA_IPHONE,
    });
  } else {
    Object.assign(opts, { viewport: { width: 1440, height: 900 } });
  }
  if (recordVideo) opts.recordVideo = { dir: recordVideo, size: opts.viewport };
  if (colorScheme) opts.colorScheme = colorScheme;

  const context = await browser.newContext(opts);
  await bloquearRedeExterna(context);
  const page = await context.newPage();
  // PEGADINHA (2026-07-07): firebase.js:106 chama alert() se o SDK falhar antes do
  // toast existir (rede bloqueada = sempre falha). alert nativo congela a pagina e
  // pendura qualquer evaluate. Dismissamos todo dialog nativo.
  page.on("dialog", (d) => d.dismiss().catch(() => {}));

  // Coleta de erros de console/página — o chamador decide o que fazer com isso.
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push({ type: "console.error", text: msg.text() });
  });
  page.on("pageerror", (err) => {
    consoleErrors.push({ type: "pageerror", text: String(err?.message || err) });
  });
  page._consoleErrors = consoleErrors; // pendurado pra o chamador inspecionar

  return { browser, context, page };
}

// ------------------------------------------------------------
// Seeds de dados realistas — 10 funcionários em estados variados
// ------------------------------------------------------------
function construirFuncionarios() {
  const hoje = new Date();
  const aniversarianteDia = hoje.getDate();
  const aniversarianteMes = hoje.getMonth() + 1;
  return [
    { id: "f-100", nome: "Maria Demo", turno: 1, setor: "Produção", ativo: true, codigo: "100", aniversarioDia: aniversarianteDia, aniversarioMes: aniversarianteMes },
    { id: "f-101", nome: "João Pedro Santos", turno: 1, setor: "Produção", ativo: true, codigo: "101" },
    { id: "f-102", nome: "Carla Renata Souza", turno: 2, setor: "Logística", ativo: true, codigo: "102" },
    { id: "f-103", nome: "Eduardo Lima Ferreira", turno: 3, setor: "Manutenção", ativo: true, codigo: "103" },
    { id: "f-104", nome: "Suyanne Aparecida Cruz", turno: null, setor: "Administrativo", ativo: true, codigo: "104" }, // sem turno
    { id: "f-105", nome: "Roberto Carlos Almeida", turno: 2, setor: "Produção", ativo: true, afastado: true, codigo: "105" }, // afastado
    { id: "f-106", nome: "Patrícia Nunes Costa", turno: 1, setor: "Produção", ativo: false, codigo: "106" }, // inativo
    { id: "f-107", nome: "Lucas Gabriel Oliveira", turno: 1, setor: "Produção", ativo: true, aprendiz: true, codigo: "107" }, // aprendiz
    { id: "f-108", nome: "Fernanda Beatriz Rocha", turno: "geral", setor: "RH", ativo: true, codigo: "108" },
    { id: "f-109", nome: "Diego Henrique Martins", turno: 2, setor: "Produção", ativo: true, demitido: true, situacaoFunc: "Rescisão", codigo: "109" }, // em rescisão
  ];
}

function construirOcorrenciasAuto() {
  // Uma por estágio do fluxo RH→Líder, com marcações/desvios/histórico realistas.
  const marc4 = ["06:02", "10:00", "10:48", "14:03"];
  const marc4Prev = ["06:00", "10:00", "10:48", "14:00"];
  return [
    {
      id: "auto-1", status: "rh_confere", tipo: "atraso", nome: "João Pedro Santos", codigo: "101",
      dataIso: "2026-07-06", data: "06/07", turno: 1, setor: "Produção",
      marcacoesPrevistas: marc4Prev, marcacoesApuradas: marc4,
      horarioRelevante: "06:02", horarioPrevistoRelevante: "06:00",
      desviosMin: [3, null, null, null], duracaoFmt: "3 min",
      historico: [],
    },
    {
      id: "auto-2", status: "com_lider", tipo: "saida-antecipada", nome: "Carla Renata Souza", codigo: "102",
      dataIso: "2026-07-05", data: "05/07", turno: 2, setor: "Logística",
      marcacoesPrevistas: ["14:00", "18:00", "18:48", "22:00"],
      marcacoesApuradas: ["14:00", "18:00", "18:48", "21:49"],
      horarioRelevante: "21:49", horarioPrevistoRelevante: "22:00",
      desviosMin: [null, null, null, 11], duracaoFmt: "11 min",
      historico: [{ acao: "validou", porNome: "Administrador", emIso: "2026-07-05T22:10:00.000Z" }],
    },
    {
      id: "auto-3", status: "confirmada", tipo: "nao-lanche", nome: "Eduardo Lima Ferreira", codigo: "103",
      dataIso: "2026-07-04", data: "04/07", turno: 3, setor: "Manutenção",
      marcacoesPrevistas: ["22:00", "02:00", "02:48", "06:00"],
      marcacoesApuradas: ["22:00", null, null, "06:05"],
      horarioRelevante: "06:05", horarioPrevistoRelevante: "06:00",
      desviosMin: [null, null, null, 5], duracaoFmt: "5 min",
      historico: [
        { acao: "validou", porNome: "Administrador", emIso: "2026-07-04T08:00:00.000Z" },
        { acao: "confirmou", porNome: "Líder 1º Turno", emIso: "2026-07-04T09:30:00.000Z", destino: "Banco de Horas" },
      ],
    },
    {
      id: "auto-4", status: "dispensada", tipo: "falta", nome: "Diego Henrique Martins", codigo: "109",
      dataIso: "2026-07-03", data: "03/07", turno: 2, setor: "Produção",
      marcacoesPrevistas: ["14:00", "18:00", "18:48", "22:00"],
      marcacoesApuradas: [],
      horarioRelevante: null, horarioPrevistoRelevante: "14:00",
      desviosMin: null, duracaoFmt: "",
      demitido: true, situacaoFunc: "Rescisão",
      historico: [
        { acao: "validou", porNome: "Administrador", emIso: "2026-07-03T08:00:00.000Z" },
        { acao: "dispensou", porNome: "Administrador", emIso: "2026-07-03T08:15:00.000Z", obs: "Desligamento em curso, RH já ciente." },
      ],
    },
  ];
}

function construirOcorrenciasManuais() {
  return [
    { id: "m-1", funcionarioId: "f-100", data: "2026-07-01", tipo: "atraso", horario: "07:45", acao: null, dataConferencia: null, observacao: "Trânsito intenso.", historico: [], criadoPor: "admin", criadoEm: "2026-07-01T10:00:00.000Z" },
    { id: "m-2", funcionarioId: "f-101", data: "2026-06-28", tipo: "esqueceu-cracha", horario: "06:00", acao: "esquecimento", dataConferencia: "2026-06-28", observacao: "", historico: [], criadoPor: "admin", criadoEm: "2026-06-28T09:00:00.000Z" },
    { id: "m-3", funcionarioId: "f-102", data: "2026-07-02", tipo: "saida-intermediaria", horario: "16:00", acao: "banco-horas", dataConferencia: "2026-07-02", observacao: "Consulta médica.", historico: [], criadoPor: "admin", criadoEm: "2026-07-02T09:00:00.000Z" },
    { id: "m-4", funcionarioId: "f-103", data: "2026-07-01", tipo: "nao-entrada", horario: "22:00", acao: null, dataConferencia: null, observacao: "", historico: [], criadoPor: "admin", criadoEm: "2026-07-01T22:30:00.000Z" },
  ];
}

// Dados mínimos pros cards de comunicados/documentos/disciplinares/recibos/BH não
// ficarem vazios nos smokes do gestor/colab.
function construirDadosMinimos() {
  const agora = new Date().toISOString();
  return {
    comunicados: [
      { id: "com-1", titulo: "Ajuste no horário do refeitório", tipo: "comunicado", ativo: true, fixado: true, publicadoEm: agora, autorNome: "Administrador", segmento: { tipo: "todos" }, corpo: "O refeitório passa a funcionar das 11h30 às 13h30 a partir de segunda." },
      { id: "com-2", titulo: "Manutenção do relógio de ponto", tipo: "aviso", ativo: true, fixado: false, publicadoEm: agora, autorNome: "Administrador", segmento: { tipo: "todos" }, corpo: "Relógio do turno 2 passará por manutenção preventiva nesta sexta." },
    ],
    documentos: [
      { id: "doc-1", titulo: "Política de Ponto 2026", tipo: "politica", confirmacao: "aceite", ativo: true, publicadoEm: agora },
      { id: "doc-2", titulo: "Termo de Adesão à Assinatura Eletrônica", tipo: "termo", confirmacao: "assinatura", ativo: true, publicadoEm: agora },
    ],
    disciplinares: [
      { id: "disc-1", funcionarioId: "f-105", tipo: "advertencia", motivo: "Atrasos recorrentes no mês.", dataIso: "2026-06-20", registradoPor: "Administrador", ciencia: null },
    ],
    recibos: [
      { id: "rec-1", funcionarioId: "f-100", competencia: "2026-06", tipo: "holerite", status: "pendente", paginas: 2 },
      { id: "rec-2", funcionarioId: "f-100", competencia: "2026-05", tipo: "holerite", status: "assinado", paginas: 2 },
    ],
    bancoHoras: {
      "f-100": { saldoMin: 125, lancamentos: [{ dataIso: "2026-06-15", min: 45, motivo: "Hora extra aprovada" }, { dataIso: "2026-06-20", min: 80, motivo: "Hora extra aprovada" }] },
      "f-101": { saldoMin: -30, lancamentos: [{ dataIso: "2026-06-18", min: -30, motivo: "Saída antecipada" }] },
    },
    aniversariantes: {
      pessoas: [{ nome: "Maria Demo", dia: new Date().getDate(), mes: new Date().getMonth() + 1 }],
    },
  };
}

// Timeout no LADO DO NODE pro evaluate do seed — plano B se o handshake
// CDP/Playwright travar de novo por algum motivo ainda não visto. Em uso
// normal o evaluate único (seed+render) retorna em <1s; se estourar 8s,
// falha com erro explícito em vez de pendurar o processo pra sempre.
function comTimeout(promise, ms, rotulo) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout de ${ms}ms em ${rotulo} — handshake CDP travou`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// ------------------------------------------------------------
// Seed compartilhado: injeta dados + abre os portões + neutraliza rede/auth.
// Roda DEPOIS do load (DOMContentLoaded), ANTES de renderApp().
// ------------------------------------------------------------
async function seedComum(page, { userId, users, funcionarios }) {
  const ocorrenciasAuto = construirOcorrenciasAuto();
  const ocorrenciasManuais = construirOcorrenciasManuais();
  const dadosMin = construirDadosMinimos();

  const status = await comTimeout(page.evaluate(
    ({ userId, users, funcionarios, ocorrenciasAuto, ocorrenciasManuais, dadosMin }) => {
      // 1) Neutraliza o portão de auth ANTES de tudo — onAuthStateChanged(null)
      //    tardio (o Firebase real, mesmo com rede bloqueada, ainda dispara esse
      //    callback ao falhar) chamaria window.__portaoSemSessao() e reabriria
      //    a tela de acesso por cima do app semeado. Neutraliza os DOIS pontos
      //    (o disparo direto e os helpers que ele invoca) por redundância.
      window.__portaoSemSessao = function () {};
      window.mostrarAcesso = function () {};
      window.mostrarLoginGestor = function () {};
      window.mostrarLoginColaborador = function () {};
      window.__forcarLoginGestor = false;

      // 2) Sem popup de Novidades.
      window._changelogChecado = true;
      try { _changelogChecado = true; } catch (e) {}

      // 3) Anula loaders/writers de rede (defensivo — com a rede externa
      //    bloqueada essas funções normalmente nem chegam a existir, porque
      //    installFirebaseStore/wireAuthFlow só rodam se o SDK carregar).
      const noopAsync = async () => {};
      window.recarregarOcorrenciasAuto = null;
      window.recarregarVolateis = noopAsync;
      window.recarregarComunicados = noopAsync;
      window.recarregarDocumentos = noopAsync;
      // CAUSA RAIZ DO TRAVAMENTO (2026-07-07, achada por bisseção CDP): um
      // noop "burro" aqui NUNCA seta state.eventosRecentes. vgAtividadeHtml()
      // (chamada por renderVisaoGeral, a tela default) vê state.eventosRecentes
      // == null pra sempre e, no .finally() de CADA chamada, dispara
      // renderApp() de novo — um loop recursivo via microtask que nunca
      // estabiliza (confirmado: 5000+ chamadas de renderApp em 3s). O V8 fica
      // 100% ocupado processando a fila de microtasks e para de responder a
      // QUALQUER comando CDP, inclusive um Runtime.evaluate("1+1") cru — por
      // isso o page.evaluate seguinte "trava" sem nenhum erro/exceção no
      // caminho. Em produção isso não acontece porque a função real sempre
      // popula state.eventosRecentes (mesmo que com array vazio). O fix é
      // replicar esse contrato aqui: popular o campo ANTES de resolver.
      window.carregarEventosRecentes = async () => { state.eventosRecentes = state.eventosRecentes || []; };
      window.registrarTermoAdesao = async () => ({ ok: true });
      window.registrarVisualizacaoComunicado = noopAsync;
      window.logEvento = noopAsync;

      // 4) Splash: nunca deve aparecer no meio de um seed do RIG (o piloto
      //    trata o splash à parte, num contexto limpo).
      window.__splashMin = 0;
      document.documentElement.classList.remove("splash-estreia", "splash-skeleton");
      document.documentElement.classList.add("splash-off");
      if (window.hideSplash) window.hideSplash();

      // 5) Popula o state direto.
      state.users = users;
      state.funcionarios = funcionarios;
      state.ocorrenciasAuto = ocorrenciasAuto;
      state.ocorrencias = ocorrenciasManuais;
      state.comunicados = dadosMin.comunicados;
      state.comunicadosColab = dadosMin.comunicados;
      state.documentos = dadosMin.documentos;
      state.documentosColab = dadosMin.documentos;
      state.disciplinares = dadosMin.disciplinares;
      state.recibos = dadosMin.recibos;
      state.bancoHoras = dadosMin.bancoHoras;
      state.aniversariantes = dadosMin.aniversariantes;
      state.tiposCustom = state.tiposCustom || [];
      state.acoesCustom = state.acoesCustom || [];
      state.pjs = state.pjs || [];
      // Redundante com o noop de carregarEventosRecentes acima (defesa em
      // profundidade): pré-popula pra vgAtividadeHtml() nunca ver == null,
      // mesmo se renderApp rodar antes do noop assíncrono resolver.
      state.eventosRecentes = state.eventosRecentes || [];
      state.currentUserId = userId;
      state.termoAdesaoOk = true;
      // v375: com termoAdesaoOk true o gate do ONBOARDING acorda e o #onb-overlay
      // intercepta os cliques dos probes. Marca como "ja visto" pro uid semeado
      // (mesma chave/versao do app; fallback cobre rename futuro) e, por redundancia,
      // remove um overlay que ja tenha nascido.
      try { localStorage.setItem("fiopulse:onboarding:" + userId, (typeof ONBOARD_VERSAO !== "undefined" ? ONBOARD_VERSAO : "2026-07-v1")); } catch (e) {}
      document.getElementById("onb-overlay")?.remove();
      window.__niverToastShown = false; // deixa o toast de aniversariante disparar 1x, como em prod

      // 6) Abre os portões manualmente (redundante com renderApp, mas garante
      //    que os elementos não fiquem hidden mesmo se algo re-render cedo).
      document.getElementById("acesso")?.classList.add("hidden");
      document.getElementById("login")?.classList.add("hidden");
      document.getElementById("login-colab")?.classList.add("hidden");
      document.getElementById("app")?.classList.remove("hidden");

      // 7) Render DENTRO do mesmo evaluate, no fim, com try/catch — e SEM
      //    devolver o retorno de renderApp() pro Node. PEGADINHA (2026-07-07):
      //    chamar renderApp num page.evaluate SEPARADO logo depois do grande
      //    evaluate do seed pendura o protocolo (visto: seedGestor nunca
      //    retorna). renderApp é 100% síncrona (sem await/Promise) — o
      //    travamento é do handshake CDP/Playwright entre dois evaluates em
      //    sequência rápida, não da lógica do app. Renderizar aqui dentro e
      //    devolver só um objeto plano (não o valor de renderApp, que é
      //    undefined mas ainda assim disparava o mesmo problema em alguns
      //    runs) resolve de forma determinística.
      let renderErro = null;
      try {
        if (typeof renderApp === "function") renderApp();
      } catch (e) {
        renderErro = String(e?.message || e);
      }
      return {
        ok: true,
        renderErro,
        appVisivel: !document.getElementById("app")?.classList.contains("hidden"),
        titulo: document.getElementById("topbar-title")?.textContent || null,
      };
    },
    { userId, users, funcionarios, ocorrenciasAuto, ocorrenciasManuais, dadosMin }
  ), 8000, "seedComum");
  return status;
}

export async function seedGestor(page) {
  const users = [{ id: "admin", nome: "Administrador", role: "admin", senha: "admin" }];
  const funcionarios = construirFuncionarios();
  return seedComum(page, { userId: "admin", users, funcionarios });
}

export async function seedColab(page) {
  const users = [{ id: "f-100", nome: "Maria Demo", role: "colaborador", funcionarioId: "f-100", codigo: "100", senha: "14071990" }];
  const funcionarios = construirFuncionarios();
  return seedComum(page, { userId: "f-100", users, funcionarios });
}

// ------------------------------------------------------------
// Tema — cp-dark é o único dark mode que existe hoje (SÓ no colaborador,
// gated por html.modo-colab.cp-dark; confirmado em styles.css linha 43 e
// app.js cpAplicarTema). No gestor não existe estado escuro real — chamar
// setTema(page, 'escuro') num contexto gestor é no-op por design, não bug.
// ------------------------------------------------------------
export async function setTema(page, modo) {
  await page.evaluate((modo) => {
    try {
      if (modo === "escuro") localStorage.setItem("fiopulse:tema", "escuro");
      else localStorage.setItem("fiopulse:tema", "claro");
    } catch (e) {}
    if (typeof cpAplicarTema === "function") cpAplicarTema();
    else document.documentElement.classList.toggle("cp-dark", modo === "escuro");
  }, modo);
}

// ------------------------------------------------------------
// Métricas utilitárias
// ------------------------------------------------------------

// Clique → primeira mutação DOM observada via MutationObserver. Resolve com o
// tempo em ms, ou null se nada mutou dentro do timeout.
export async function medirLatenciaClique(page, selector, { timeout = 2000 } = {}) {
  await page.evaluate(() => {
    window.__latObserver && window.__latObserver.disconnect();
    window.__latT0 = null;
    window.__latDelta = null;
    window.__latObserver = new MutationObserver(() => {
      if (window.__latT0 != null && window.__latDelta == null) {
        window.__latDelta = performance.now() - window.__latT0;
      }
    });
    window.__latObserver.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
  });
  await page.evaluate(() => { window.__latT0 = performance.now(); });
  await page.click(selector);
  try {
    await page.waitForFunction(() => window.__latDelta != null, { timeout });
  } catch (e) {
    return null;
  }
  return page.evaluate(() => window.__latDelta);
}

export async function screenshot(page, name) {
  const dest = path.join(OUT_DIR, name.endsWith(".png") ? name : `${name}.png`);
  await page.screenshot({ path: dest });
  return dest;
}

// ------------------------------------------------------------
// Filtro de "ruído esperado": com a rede externa bloqueada (por segurança —
// ver bloquearRedeExterna acima), o SDK do Firebase SEMPRE falha ao carregar
// e loga isso no console. Confirmado via probe isolado (2026-07-07):
//   1) "Failed to load resource: net::ERR_FAILED" — a própria request abortada
//   2) "[Firebase] erro ao iniciar: ... gstatic.com/firebasejs/..." — firebase.js
//      reportando a falha de carga do SDK
// Erros REAIS de app (bug de render, TypeError, etc.) não batem esses padrões
// e continuam contando. Generaliza pra outros hosts do SDK (gstatic/gcm/
// googleapis) e pra ERR_FAILED/ERR_ABORTED (aborts de qualquer request).
// ------------------------------------------------------------
const PADROES_RUIDO_ESPERADO = [
  /net::ERR_FAILED/,
  /net::ERR_ABORTED/,
  /\[Firebase\] erro ao iniciar/,
  /gstatic\.com/,
  /googleapis\.com/,
  /firebasejs/,
  /fcm(-server)?\.(googleapis|google)\.com/,
];

export function ehRuidoEsperado(erro) {
  const texto = String(erro?.text || "");
  return PADROES_RUIDO_ESPERADO.some((re) => re.test(texto));
}

// Todos os erros capturados, sem filtro (uso: debug/auditoria completa).
export async function coletarErros(page) {
  return page._consoleErrors || [];
}

// Só os erros REAIS de app — descarta ruído de rede bloqueada/SDK do Firebase
// (ver ehRuidoEsperado). É isso que smoke.mjs e qualquer auditor devem checar
// pra decidir se um combo "passou" (0 esperado).
export async function coletarErrosReais(page) {
  return (page._consoleErrors || []).filter((e) => !ehRuidoEsperado(e));
}
