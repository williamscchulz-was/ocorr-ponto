// Verifica o front da FAIXA DE STORIES "Hoje na Fiobras" + o bottom sheet do parabéns
// (v379, direção A do mock home-premium-2026-07). Contrato:
//  - FAIXA: um rosto (56px) por homenageado do dia (aniversário do colega + tempo de casa de
//    todos, inclusive o próprio). Foto real quando houver no placar/users, senão iniciais.
//    Anel TRACEJADO em quem falta parabenizar; SÓLIDO + selo de coração em quem já foi; o
//    próprio homenageado (self) tem selo especial (st--self) e o sheet dele NÃO tem coração.
//    Rótulo "N colegas". Cada rosto carrega data-story (abre o sheet) + data-bday-post (o anel
//    deriva de minhaReacao no cache).
//  - SHEET: toque no rosto abre um bottom sheet (nasce/morre no body) com o CARD CHEIO: título,
//    pilha de reatores (minha foto do users / colega com foto do placar / iniciais / +N) e o
//    coração grande. Curtir ali: cache -> reconcile (o anel da faixa vira sólido) + claim
//    mockado creditado + sheet fecha. Self: sheet sem coração.
//  - m1 LOCAL: um rebuild FORÇADO da região mural:strip nasce idêntico (variante = f(state)).
// Bootstrap = o mesmo do flicker-guard (demo, SW bloqueado, firebase.config abortado):
// verificação de TEMPLATE, dado injetado no state.
import { chromium } from "playwright";

const PNG_VERDE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PNG_VERM = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 1200 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

await p.evaluate(() => {
  _changelogChecado = true;
  state.users.push({ id: "colab-probe", usuario: "colabp", senha: "x", role: "colaborador", nome: "Colab Guarda", funcionarioCodigo: state.funcionarios[0]?.codigo, fotoBase64: null });
  login("colab-probe", "x");
});
await p.waitForFunction(() => state?.currentUserId);

const r = await p.evaluate(async ({ PNG_VERDE, PNG_VERM }) => {
  document.querySelector("#acesso")?.remove();
  const hoje = new Date();
  const mes = hoje.getMonth() + 1, dia = hoje.getDate(), ano = hoje.getFullYear();
  // Minha foto no users doc (a fonte CERTA; o funcionário segue sem foto, como em prod).
  const eu = state.users.find((u) => u.id === state.currentUserId);
  eu.fotoBase64 = PNG_VERDE;
  // O "eu" da home é funcionarios[0] (mesma fonte de nome do pipeline em prod).
  const nomeF = state.funcionarios[0].nome;
  state.aniversariantes = {
    pessoas: [{ nome: "Jhenyffer Teste", mes, dia }],   // aniversário de colega -> anel tracejado
    recemChegados: [],
    tempoCasa: [
      { nome: "Vorlei Teste", mes, dia, anos: 9 },   // já parabenizei -> anel SÓLIDO + coração; foto do placar
      { nome: "Gesto Teste", mes, dia, anos: 3 },     // NÃO parabenizei -> tracejado, iniciais (alvo do gesto)
      { nome: nomeF, mes, dia, anos: 2 },             // eu: selo especial (st--self), sheet sem coração
    ],
  };
  const postAniv = `aniv-jhenyffer-teste-${ano}`;
  const postVorlei = `tdc-vorlei-teste-${ano}`;
  const postGesto = `tdc-gesto-teste-${ano}`;
  const postMeu = tdcPostId(nomeF);
  // Placar da gamificação: Vorlei tem foto -> o rosto dele na faixa é FOTO; Gesto não está no
  // placar -> iniciais. (state.gamiTop é a fonte da foto do HOMENAGEADO.)
  state.gamiTop = [{ uid: "uVorlei", pos: 1, nome: "Vorlei Teste", foto: PNG_VERM, total: 99 }];
  // Reatores (pilha do sheet): eu (foto do users) + colega com foto no placar + colega sem foto
  // + mais 2 (vira +1). Fotos dos reatores vêm do _fotoReatorCache (uid).
  const cinco = [
    { uid: state.currentUserId, nome: "Colab Guarda" },
    { uid: "uMaria", nome: "Maria Placar" },
    { uid: "uCarla", nome: "Carla Souza" },
    { uid: "uJoao", nome: "Joao Placar" },
    { uid: "uPedro", nome: "Pedro Lima" },
  ];
  state._reacoesCache = {
    [postAniv]: { reacoes: [cinco[1]], minhaReacao: false, total: 1 },          // tracejado
    [postVorlei]: { reacoes: cinco, minhaReacao: true, total: 5 },              // SÓLIDO; pilha cheia no sheet
    [postGesto]: { reacoes: [cinco[1]], minhaReacao: false, total: 1 },         // tracejado (alvo do gesto)
    [postMeu]: { reacoes: cinco.slice(1, 3), minhaReacao: false, total: 2 },
  };
  state._fotoReatorCache = { uMaria: PNG_VERM, uJoao: PNG_VERM, uCarla: "", uPedro: "" };
  state.view.page = "colab-home";
  _renderAppNow();
  await new Promise((res) => setTimeout(res, 400));

  const strip = document.querySelector('#view [data-region="mural:strip"]');
  const storyDe = (post) => strip && Array.from(strip.querySelectorAll("[data-story]")).find((el) => el.getAttribute("data-story") === post);
  const lerStory = (post) => {
    const st = storyDe(post);
    if (!st) return null;
    const circle = st.querySelector(".st__rsvg circle");
    const av = st.querySelector(".st__av");
    return {
      done: st.classList.contains("st--done"),
      self: st.classList.contains("st--self"),
      dash: circle ? circle.getAttribute("stroke-dasharray") : null,
      badgeHeartVisivel: st.classList.contains("st--done"), // CSS mostra o coração só com st--done
      temFoto: !!(av && /url\(/.test(av.style.backgroundImage || "")),
      fotoVerm: !!(av && (av.style.backgroundImage || "").includes(PNG_VERM.slice(-24))),
      fotoVerde: !!(av && (av.style.backgroundImage || "").includes(PNG_VERDE.slice(-24))),
      ini: (av && !/url\(/.test(av.style.backgroundImage || "")) ? av.textContent.trim() : "",
      temBadgeType: !!st.querySelector(".st__badge--type"),
      nm: (st.querySelector(".st__nm") || {}).textContent,
      dataBdayPost: st.getAttribute("data-bday-post"),
    };
  };

  const nStories = strip ? strip.querySelectorAll("[data-story]").length : 0;
  const ct = strip ? (strip.querySelector(".pp-ovl .pp-ct") || {}).textContent : null;

  // m1 LOCAL: rebuild FORÇADO da região mural:strip nasce idêntico ao estabilizado.
  const antesForce = strip ? strip.innerHTML : "";
  window.__fpForceWrite = true;
  _renderAppNow();
  window.__fpForceWrite = false;
  const m1Identico = strip ? (strip.innerHTML === antesForce) : false;

  return {
    postAniv, postVorlei, postGesto, postMeu,
    temFaixa: !!strip && !!strip.querySelector(".mural-strip"),
    nStories, ct,
    aniv: lerStory(postAniv),
    vorlei: lerStory(postVorlei),
    gesto: lerStory(postGesto),
    meu: lerStory(postMeu),
    m1Identico,
  };
}, { PNG_VERDE, PNG_VERM });

// ---- toque abre o SHEET; pilha completa dentro dele ----
const sheet = await p.evaluate(async ({ postVorlei, postMeu, PNG_VERDE, PNG_VERM }) => {
  const esperar = (ms) => new Promise((res) => setTimeout(res, ms));
  const strip = document.querySelector('#view [data-region="mural:strip"]');
  const clicar = (post) => Array.from(strip.querySelectorAll("[data-story]")).find((el) => el.getAttribute("data-story") === post)?.click();

  // (A) Sheet do Vorlei (já parabenizado): pilha completa (minha foto / colega foto / iniciais / +N).
  clicar(postVorlei);
  await esperar(120);
  const ov = document.querySelector(".mural-sheet");
  const card = ov && ov.querySelector(".mural-sheet__card .pp-bday");
  const chips = card ? Array.from(card.querySelectorAll(".pp-bday__stack .pp-bday__stk")).map((s) => ({
    foto: s.classList.contains("pp-bday__stk--foto"),
    ini: s.textContent.trim(),
    title: s.getAttribute("title"),
  })) : null;
  const vorleiSheet = {
    abriu: !!ov,
    titulo: card ? (card.querySelector(".pp-bday__t") || {}).textContent : null,
    temCoracao: !!(card && card.querySelector("[data-bday-heart]")),
    coracaoOn: !!(card && card.querySelector(".pp-bday__heart.on")),
    chips,
    mais: card ? ((card.querySelector(".pp-bday__mais") || {}).textContent || null) : null,
  };
  // fecha (clique no scrim)
  ov?.click();
  await esperar(400);

  // (B) Sheet do SELF (tempo de casa): STORY RICO .cr (v404), sem ação, com marco + contagem.
  clicar(postMeu);
  await esperar(120);
  const ovMeu = document.querySelector(".mural-sheet");
  const cardMeu = ovMeu && ovMeu.querySelector(".mural-sheet__card .cr");
  const selfSheet = {
    abriu: !!ovMeu,
    rico: !!cardMeu,
    tdc: !!(cardMeu && cardMeu.classList.contains("cr--tdc")),
    semAcao: !!(cardMeu && !cardMeu.querySelector("[data-bday-heart]") && !cardMeu.querySelector(".bvv__hand")),
    mark: cardMeu ? ((cardMeu.querySelector(".cr__mark") || {}).textContent || "").trim() : null,
    count: cardMeu ? ((cardMeu.querySelector(".cr__count") || {}).textContent || "").trim() : null,
    reatores: cardMeu ? cardMeu.querySelectorAll(".cr-react").length : 0,
  };
  ovMeu?.click();
  await esperar(400);

  return { vorleiSheet, selfSheet };
}, { postVorlei: r.postVorlei, postMeu: r.postMeu, PNG_VERDE, PNG_VERM });

// ---- like no sheet: anel da faixa vira sólido + claim mockado creditado + sheet fecha ----
const gesto = await p.evaluate(async ({ postGesto }) => {
  const esperar = (ms) => new Promise((res) => setTimeout(res, ms));
  window.toggleReacaoAniversario = async () => true; // demo: só o otimista + reconcile importam
  const claims = [];
  window.gamiClaim = (acao, post, rotulo) => { claims.push({ acao, post, rotulo }); };
  const strip = document.querySelector('#view [data-region="mural:strip"]');
  const storyDe = () => Array.from(strip.querySelectorAll("[data-story]")).find((el) => el.getAttribute("data-story") === postGesto);

  const antesDash = storyDe().querySelector(".st__rsvg circle").getAttribute("stroke-dasharray");
  storyDe().click(); // abre o sheet do Gesto
  await esperar(120);
  const ov = document.querySelector(".mural-sheet");
  const heart = ov && ov.querySelector("[data-bday-heart]");
  const heartAntes = !!heart && !heart.classList.contains("on");
  heart?.click(); // curte
  await esperar(160); // otimista + reconcile já rodaram (síncronos antes do await do toggle)
  const st = storyDe();
  const aposLike = {
    heartOffAntes: heartAntes,
    antesTracejado: antesDash !== "0",
    anelSolido: st.querySelector(".st__rsvg circle").getAttribute("stroke-dasharray") === "0",
    storyDone: st.classList.contains("st--done"),
    claimAcao: claims[0] && claims[0].acao,
    claimPost: claims[0] && claims[0].post,
  };
  await esperar(1000); // 620ms (feedback) + 220ms (descida) + folga
  aposLike.sheetFechou = !document.querySelector(".mural-sheet");
  return aposLike;
}, { postGesto: r.postGesto });

await p.screenshot({ path: "scratchpad/audit/out/mural-faixa-home.png", fullPage: false });
console.log(JSON.stringify({ r, sheet, gesto }, null, 2));
if (jsErros.length) console.log("pageErrors:", jsErros);
await b.close();

const falhas = [];
// --- FAIXA existe + contador ---
if (!r.temFaixa) falhas.push("faixa de stories (mural:strip) nao renderizou");
if (r.nStories !== 4) falhas.push(`faixa com ${r.nStories} rostos (esperado 4)`);
if (!/4 colegas/.test(r.ct || "")) falhas.push(`contador da faixa errado: ${r.ct}`);
// --- Jhenyffer (aniversário de colega, NAO parabenizado): tracejado, sem done/self ---
if (!r.aniv) falhas.push("rosto do aniversariante (Jhenyffer) nao renderizou");
if (r.aniv && (r.aniv.done || r.aniv.self)) falhas.push("Jhenyffer nao devia estar done/self");
if (r.aniv && r.aniv.dash === "0") falhas.push("anel de Jhenyffer devia ser TRACEJADO (falta parabenizar)");
if (r.aniv && r.aniv.dataBdayPost !== r.postAniv) falhas.push("Jhenyffer sem data-bday-post");
// --- Vorlei (tempo de casa, JA parabenizado): solido + done + foto do placar ---
if (!r.vorlei) falhas.push("rosto de Vorlei nao renderizou");
if (r.vorlei && !r.vorlei.done) falhas.push("Vorlei (parabenizado) nao esta done (anel sem selo de coracao)");
if (r.vorlei && r.vorlei.dash !== "0") falhas.push("anel de Vorlei devia ser SOLIDO (ja parabenizei)");
if (r.vorlei && !r.vorlei.fotoVerm) falhas.push("rosto de Vorlei nao usou a foto do placar (gamiTop)");
// --- Gesto (tempo de casa, NAO parabenizado): tracejado + iniciais ---
if (!r.gesto) falhas.push("rosto de Gesto nao renderizou");
if (r.gesto && (r.gesto.done || r.gesto.dash === "0")) falhas.push("Gesto nao parabenizado devia ser tracejado, nao done");
if (r.gesto && (r.gesto.temFoto || r.gesto.ini !== "GT")) falhas.push(`rosto de Gesto devia cair nas iniciais GT (got: foto=${r.gesto.temFoto} ini=${r.gesto.ini})`);
// --- Self (proprio): selo especial (st--self), foto do users, no sheet sem coracao ---
if (!r.meu) falhas.push("rosto do proprio (self) nao renderizou");
if (r.meu && !r.meu.self) falhas.push("self sem st--self (selo especial)");
if (r.meu && r.meu.done) falhas.push("self nao devia estar done");
if (r.meu && !r.meu.fotoVerde) falhas.push("rosto do self nao usou minha foto do users doc");
// --- m1 local ---
if (!r.m1Identico) falhas.push("m1 local: rebuild forcado da regiao mural:strip NAO nasceu identico");
// --- SHEET do Vorlei: pilha completa ---
const sv = sheet.vorleiSheet;
const st = sv.chips || [];
if (!sv.abriu) falhas.push("toque no rosto NAO abriu o bottom sheet");
if (!/Vorlei completa 9 anos/.test(sv.titulo || "")) falhas.push(`titulo do sheet do Vorlei: ${sv.titulo}`);
if (!sv.temCoracao || !sv.coracaoOn) falhas.push("sheet do Vorlei (parabenizado) devia ter coracao ON");
if (st[0]?.foto !== true || st[0]?.title !== "Você") falhas.push("chip 1 (eu) nao saiu com FOTO do users doc / title Você");
if (st[1]?.foto !== true) falhas.push("chip 2 (Maria, placar) nao saiu com foto");
if (st[2]?.foto !== false || st[2]?.ini !== "CS") falhas.push("chip 3 (Carla sem foto) nao caiu nas iniciais CS");
if (st.length !== 4) falhas.push(`pilha do sheet com ${st.length} chips (esperado 4)`);
if (sv.mais !== "+1") falhas.push(`contador +N do sheet errado: ${sv.mais}`);
// --- SHEET do self (v404): STORY RICO, sem acao, marco + contagem ---
if (!sheet.selfSheet.abriu) falhas.push("sheet do self nao abriu");
if (!sheet.selfSheet.rico) falhas.push("sheet do self NAO e o story rico (.cr)");
if (!sheet.selfSheet.tdc) falhas.push("story do self (tempo de casa) sem cr--tdc");
if (!sheet.selfSheet.semAcao) falhas.push("story do self NAO devia ter acao (coracao/mao)");
if (!/2 anos de Fiobras/.test(sheet.selfSheet.mark || "")) falhas.push(`marco do self: ${sheet.selfSheet.mark}`);
if (!/2 colegas/.test(sheet.selfSheet.count || "")) falhas.push(`contagem do self: ${sheet.selfSheet.count}`);
if (sheet.selfSheet.reatores !== 2) falhas.push(`reatores no story do self: ${sheet.selfSheet.reatores} (esperado 2)`);
// --- like no sheet: anel reflete + claim + fecha ---
if (!gesto.heartOffAntes) falhas.push("sheet do Gesto devia abrir com coracao vazio");
if (!gesto.antesTracejado) falhas.push("anel do Gesto devia estar tracejado antes do like");
if (!gesto.anelSolido || !gesto.storyDone) falhas.push("like no sheet NAO deixou o anel da faixa solido/done");
if (gesto.claimAcao !== "tempo-casa") falhas.push(`claim nao creditou tempo-casa (got: ${gesto.claimAcao})`);
if (gesto.claimPost !== r.postGesto) falhas.push("claim com post errado");
if (!gesto.sheetFechou) falhas.push("sheet nao fechou depois do like");
if (jsErros.length) falhas.push("pageErrors");
if (falhas.length) { console.error("FALHOU:\n- " + falhas.join("\n- ")); process.exit(1); }
console.log("MURAL FAIXA + SHEET OK");
