// Verifica o front do mural com rosto + a LINHA COMPACTA pós-like (v378, opção A do mock
// card-pos-like-2026-07). Contrato:
//  - card CHEIO (não curtido, ou reexpandido): pilha de rostos (minha foto do users doc,
//    colegas do placar, iniciais de quem não tem foto, +N do restante) e coração.
//  - já curtido (minhaReacao=true) E não reexpandido -> nasce LINHA COMPACTA (.pp-bday--mini):
//    ícone mini, texto único, mini-pilha 16px, coração cheio decorativo, data-bday-expand.
//  - o próprio homenageado (data-bday-me, sem coração) NUNCA compacta.
//  - like ao vivo: card cheio COLAPSA na linha; tocar na linha REEXPANDE; descurtir volta cheio.
//  - erro na escrita reverte pro estado anterior.
//  - m1 LOCAL: um re-render FORÇADO das regiões do mural nasce idêntico (variante = f(state)).
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
  // Minha foto no users doc (a fonte CERTA; o funcionário segue sem foto, como em prod)
  const eu = state.users.find((u) => u.id === state.currentUserId);
  eu.fotoBase64 = PNG_VERDE;
  // O "eu" da home é funcionarios[0] (mesma fonte de nome do pipeline em prod).
  const nomeF = state.funcionarios[0].nome;
  state.aniversariantes = {
    pessoas: [{ nome: "Jhenyffer Teste", mes, dia }],
    recemChegados: [],
    tempoCasa: [
      { nome: "Vorlei Teste", mes, dia, anos: 9 },   // curtido -> LINHA COMPACTA
      { nome: "Gesto Teste", mes, dia, anos: 3 },     // NÃO curtido -> card CHEIO (alvo do gesto)
      { nome: nomeF, mes, dia, anos: 2 },             // eu: card destaque sem coração
    ],
  };
  const postAniv = `aniv-jhenyffer-teste-${ano}`;
  const postTdc = `tdc-vorlei-teste-${ano}`;
  const postGesto = `tdc-gesto-teste-${ano}`;
  const postMeu = tdcPostId(nomeF);
  // Reações: eu + colega com foto no placar + colega sem foto + mais 2 (vira +1)
  const cinco = [
    { uid: state.currentUserId, nome: "Colab Guarda" },
    { uid: "uMaria", nome: "Maria Placar" },
    { uid: "uCarla", nome: "Carla Souza" },
    { uid: "uJoao", nome: "Joao Placar" },
    { uid: "uPedro", nome: "Pedro Lima" },
  ];
  state._reacoesCache = {
    [postAniv]: { reacoes: cinco, minhaReacao: true, total: 5 },        // reexpandido abaixo -> CHEIO
    [postTdc]: { reacoes: cinco.slice(0, 3), minhaReacao: true, total: 3 }, // COMPACTO (não reexpandido)
    [postGesto]: { reacoes: [cinco[1]], minhaReacao: false, total: 1 }, // CHEIO com coração
    [postMeu]: { reacoes: cinco.slice(1, 3), minhaReacao: false, total: 2 },
  };
  state._fotoReatorCache = { uMaria: PNG_VERM, uJoao: PNG_VERM, uCarla: "", uPedro: "" };
  // postAniv reexpandido: testa a PILHA CHEIA (minha foto + colegas + iniciais + +N) mesmo com
  // minhaReacao=true, provando que a variante deriva de minhaReacao E _muralExp.
  state._muralExp = new Set([postAniv]);
  state.view.page = "colab-home";
  _renderAppNow();
  await new Promise((res) => setTimeout(res, 900));

  const cardAniv = document.querySelector(`[data-bday-post="${postAniv}"]`);
  const cardTdc = document.querySelector(`[data-bday-post="${postTdc}"]`);
  const cardGesto = document.querySelector(`[data-bday-post="${postGesto}"]`);
  const cardMeu = document.querySelector(`[data-bday-post="${postMeu}"]`);
  const stackDe = (c) => c ? Array.from(c.querySelectorAll(".pp-bday__stk")).map((s) => ({
    foto: s.classList.contains("pp-bday__stk--foto"),
    ini: s.textContent.trim(),
    title: s.getAttribute("title"),
  })) : null;

  // m1 LOCAL: um rebuild FORÇADO das regiões do mural nasce idêntico ao estabilizado (variante
  // determinística a partir do state: cheio/compacto/self, sem placeholder que renasça).
  const regioes = () => ["mural:aniv", "mural:tdc"]
    .map((k) => document.querySelector(`#view [data-region="${k}"]`)?.innerHTML || "").join("|~|");
  const antesForce = regioes();
  window.__fpForceWrite = true;
  _renderAppNow();
  window.__fpForceWrite = false;
  const m1Identico = regioes() === antesForce;

  return {
    postAniv, postTdc, postGesto, postMeu,
    aniv: cardAniv ? {
      cheio: cardAniv.classList.contains("pp-bday") && !cardAniv.classList.contains("pp-bday--mini"),
      stack: stackDe(cardAniv),
      mais: cardAniv.querySelector(".pp-bday__mais")?.textContent || null,
      temCoracao: !!cardAniv.querySelector("[data-bday-heart]"),
    } : null,
    tdc: cardTdc ? {
      mini: cardTdc.classList.contains("pp-bday--mini"),
      expand: cardTdc.hasAttribute("data-bday-expand"),
      role: cardTdc.getAttribute("role"),
      temCoracaoBotao: !!cardTdc.querySelector("[data-bday-heart]"),
      miniHeart: !!cardTdc.querySelector(".pp-mini__heart svg"),
      miniStack: cardTdc.querySelectorAll(".pp-mini__stk").length,
      texto: cardTdc.querySelector(".pp-mini__t")?.textContent,
    } : null,
    gesto: cardGesto ? {
      cheio: cardGesto.classList.contains("pp-bday") && !cardGesto.classList.contains("pp-bday--mini"),
      temCoracao: !!cardGesto.querySelector("[data-bday-heart]"),
      on: !!cardGesto.querySelector(".pp-bday__heart.on"),
    } : null,
    meu: cardMeu ? {
      titulo: cardMeu.querySelector(".pp-bday__t")?.textContent,
      cheio: cardMeu.classList.contains("pp-bday") && !cardMeu.classList.contains("pp-bday--mini"),
      temCoracao: !!cardMeu.querySelector("[data-bday-heart]"),
      me: cardMeu.hasAttribute("data-bday-me"),
    } : null,
    m1Identico,
  };
}, { PNG_VERDE, PNG_VERM });

// ---- gesto ao vivo: like COLAPSA -> tocar na linha REEXPANDE -> descurtir volta CHEIO ----
const gesto = await p.evaluate(async ({ postGesto }) => {
  window.toggleReacaoAniversario = async () => true; // demo: só o otimista + morph importam
  const sel = `[data-bday-post="${postGesto}"]`;
  const esperar = (ms) => new Promise((res) => setTimeout(res, ms));

  // (1) like no coração do card cheio -> colapsa na linha compacta
  document.querySelector(sel).querySelector("[data-bday-heart]").click();
  await esperar(450); // 340ms de altura + 200ms de crossfade + folga
  const c1 = document.querySelector(sel);
  const aposLike = {
    mini: !!c1 && c1.classList.contains("pp-bday--mini"),
    expand: !!c1 && c1.hasAttribute("data-bday-expand"),
    miniHeart: !!c1 && !!c1.querySelector(".pp-mini__heart svg"),
    meNaPilha: !!c1 && Array.from(c1.querySelectorAll(".pp-mini__stk")).some((s) => s.getAttribute("title") === "Você"),
    semFantasma: !!c1 && !c1.querySelector('[aria-hidden="true"]'), // o clone do crossfade já saiu
  };

  // (2) toque na linha -> reexpande pro card cheio (coração ON, mine segue true)
  document.querySelector(sel).click();
  await esperar(450);
  const c2 = document.querySelector(sel);
  const aposExpandir = {
    cheio: !!c2 && c2.classList.contains("pp-bday") && !c2.classList.contains("pp-bday--mini"),
    coracaoOn: !!c2 && !!c2.querySelector(".pp-bday__heart.on"),
    meNaPilha: !!c2 && Array.from(c2.querySelectorAll(".pp-bday__stk")).some((s) => s.getAttribute("title") === "Você"),
  };

  // (3) descurtir no card reexpandido -> volta cheio com coração vazio
  document.querySelector(sel).querySelector("[data-bday-heart]").click();
  await esperar(120);
  const c3 = document.querySelector(sel);
  const aposDescurtir = {
    cheio: !!c3 && c3.classList.contains("pp-bday") && !c3.classList.contains("pp-bday--mini"),
    coracaoOn: !!c3 && !!c3.querySelector(".pp-bday__heart.on"),
  };

  // (4) erro na escrita: like otimista colapsa, a escrita falha, o revert devolve o card cheio
  window.toggleReacaoAniversario = async () => { throw new Error("prob"); };
  document.querySelector(sel).querySelector("[data-bday-heart]").click();
  await esperar(500);
  const c4 = document.querySelector(sel);
  const aposErro = {
    cheio: !!c4 && c4.classList.contains("pp-bday") && !c4.classList.contains("pp-bday--mini"),
    coracaoOn: !!c4 && !!c4.querySelector(".pp-bday__heart.on"),
  };
  return { aposLike, aposExpandir, aposDescurtir, aposErro };
}, { postGesto: r.postGesto });

await p.screenshot({ path: "scratchpad/audit/out/mural-front-home.png", fullPage: false });
console.log(JSON.stringify({ r, gesto }, null, 2));
if (jsErros.length) console.log("pageErrors:", jsErros);
await b.close();

const falhas = [];
// --- card CHEIO reexpandido: pilha completa (minha foto / colega foto / iniciais / +N) ---
const st = r.aniv?.stack || [];
if (!r.aniv) falhas.push("card aniversario nao renderizou");
if (!r.aniv?.cheio) falhas.push("aniv reexpandido nao esta no formato CHEIO");
if (st[0]?.foto !== true || st[0]?.title !== "Você") falhas.push("chip 1 (eu) nao saiu com FOTO do users doc");
if (st[1]?.foto !== true) falhas.push("chip 2 (Maria, placar) nao saiu com foto");
if (st[2]?.foto !== false || st[2]?.ini !== "CS") falhas.push("chip 3 (Carla sem foto) nao caiu nas iniciais");
if (st.length !== 4) falhas.push(`stack com ${st.length} chips (esperado 4)`);
if (r.aniv?.mais !== "+1") falhas.push(`contador +N errado: ${r.aniv?.mais}`);
if (!r.aniv?.temCoracao) falhas.push("aniv reexpandido sem coracao");
// --- LINHA COMPACTA (Vorlei, curtido e não reexpandido) ---
if (!r.tdc) falhas.push("card tempo de casa (Vorlei) nao renderizou");
if (!r.tdc?.mini) falhas.push("Vorlei curtido NAO nasceu como linha compacta (.pp-bday--mini)");
if (!r.tdc?.expand || r.tdc?.role !== "button") falhas.push("linha compacta sem data-bday-expand/role=button");
if (r.tdc?.temCoracaoBotao) falhas.push("linha compacta tem botao de coracao (nao devia; toque reexpande)");
if (!r.tdc?.miniHeart) falhas.push("linha compacta sem coracao cheio decorativo");
if (!(r.tdc?.miniStack >= 1)) falhas.push("linha compacta sem mini-pilha de rostos");
if (!/Vorlei/.test(r.tdc?.texto || "") || !/9 anos/.test(r.tdc?.texto || "")) falhas.push(`texto da linha: ${r.tdc?.texto}`);
// --- card CHEIO do gesto (Gesto, não curtido) ---
if (!r.gesto?.cheio || !r.gesto?.temCoracao || r.gesto?.on) falhas.push("card do gesto nao nasceu cheio/coracao-off");
// --- self (data-bday-me, sem coracao, sempre cheio) ---
if (!r.meu) falhas.push("card tempo de casa (proprio) nao renderizou");
if (r.meu && !/^Você completa 2 anos de Fiobras hoje/.test(r.meu.titulo)) falhas.push(`titulo self: ${r.meu?.titulo}`);
if (r.meu && !r.meu.cheio) falhas.push("self compactou (nao devia)");
if (r.meu && r.meu.temCoracao) falhas.push("self com coracao (nao devia)");
if (r.meu && !r.meu.me) falhas.push("self sem data-bday-me");
// --- m1 local ---
if (!r.m1Identico) falhas.push("m1 local: rebuild forcado das regioes do mural NAO nasceu identico");
// --- gesto ao vivo ---
if (!gesto.aposLike.mini || !gesto.aposLike.expand) falhas.push("like nao colapsou o card na linha compacta");
if (!gesto.aposLike.miniHeart) falhas.push("linha pos-like sem coracao cheio");
if (!gesto.aposLike.meNaPilha) falhas.push("linha pos-like sem meu rosto na mini-pilha");
if (!gesto.aposLike.semFantasma) falhas.push("fantasma do crossfade nao foi removido");
if (!gesto.aposExpandir.cheio || !gesto.aposExpandir.coracaoOn) falhas.push("toque na linha nao reexpandiu pro card cheio com coracao ON");
if (!gesto.aposExpandir.meNaPilha) falhas.push("card reexpandido sem meu rosto na pilha");
if (!gesto.aposDescurtir.cheio || gesto.aposDescurtir.coracaoOn) falhas.push("descurtir nao voltou ao card cheio com coracao vazio");
if (!gesto.aposErro.cheio || gesto.aposErro.coracaoOn) falhas.push("erro na escrita nao reverteu pro card cheio");
if (jsErros.length) falhas.push("pageErrors");
if (falhas.length) { console.error("FALHOU:\n- " + falhas.join("\n- ")); process.exit(1); }
console.log("MURAL FRONT OK");
