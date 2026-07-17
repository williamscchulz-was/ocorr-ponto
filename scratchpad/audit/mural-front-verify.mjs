// Verifica o front do mural com rosto (v363): fix do chip "WS" (foto do users doc),
// fotos dos colegas via placar (_fotoReatorCache), contador +N e o card tempo de casa
// (outro com coração; o próprio sem). Bootstrap = o mesmo do flicker-guard (demo, SW
// bloqueado, firebase.config abortado): verificação de TEMPLATE, dado injetado no state.
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
  const mes = hoje.getMonth() + 1, dia = hoje.getDate();
  // Minha foto no users doc (a fonte CERTA; o funcionário segue sem foto, como em prod)
  const eu = state.users.find((u) => u.id === state.currentUserId);
  eu.fotoBase64 = PNG_VERDE;
  // O "eu" da home é funcionarios[0] (mesma fonte de nome do pipeline em prod).
  const nomeF = state.funcionarios[0].nome;
  state.aniversariantes = {
    pessoas: [{ nome: "Jhenyffer Teste", mes, dia }],
    recemChegados: [],
    tempoCasa: [
      { nome: "Vorlei Teste", mes, dia, anos: 9 },
      { nome: nomeF, mes, dia, anos: 2 }, // eu: card destaque sem coração
    ],
  };
  const ano = hoje.getFullYear();
  const postAniv = `aniv-jhenyffer-teste-${ano}`;
  const postTdc = `tdc-vorlei-teste-${ano}`;
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
    [postAniv]: { reacoes: cinco, minhaReacao: true, total: 5 },
    [postTdc]: { reacoes: cinco.slice(0, 3), minhaReacao: true, total: 3 },
    [postMeu]: { reacoes: cinco.slice(1, 3), minhaReacao: false, total: 2 },
  };
  state._fotoReatorCache = { uMaria: PNG_VERM, uJoao: PNG_VERM, uCarla: "", uPedro: "" };
  state.view.page = "colab-home";
  _renderAppNow();
  await new Promise((res) => setTimeout(res, 900));

  const q = (sel) => document.querySelectorAll(sel);
  const cardAniv = document.querySelector(`[data-bday-post="${postAniv}"]`);
  const cardTdc = document.querySelector(`[data-bday-post="${postTdc}"]`);
  const cardMeu = document.querySelector(`[data-bday-post="${postMeu}"]`);
  const stackDe = (c) => c ? Array.from(c.querySelectorAll(".pp-bday__stk")).map((s) => ({
    foto: s.classList.contains("pp-bday__stk--foto"),
    bg: (s.style.backgroundImage || "").slice(0, 30),
    ini: s.textContent.trim(),
    title: s.getAttribute("title"),
  })) : null;
  return {
    aniv: cardAniv ? {
      stack: stackDe(cardAniv),
      mais: cardAniv.querySelector(".pp-bday__mais")?.textContent || null,
      texto: cardAniv.querySelector("[data-bday-count]")?.textContent,
      temCoracao: !!cardAniv.querySelector("[data-bday-heart]"),
    } : null,
    tdc: cardTdc ? {
      titulo: cardTdc.querySelector(".pp-bday__t")?.textContent,
      texto: cardTdc.querySelector("[data-bday-count]")?.textContent,
      temCoracao: !!cardTdc.querySelector("[data-bday-heart]"),
      classeTdc: cardTdc.classList.contains("pp-bday--tdc"),
      stack: stackDe(cardTdc),
    } : null,
    meu: cardMeu ? {
      titulo: cardMeu.querySelector(".pp-bday__t")?.textContent,
      texto: cardMeu.querySelector("[data-bday-count]")?.textContent,
      temCoracao: !!cardMeu.querySelector("[data-bday-heart]"),
      me: cardMeu.hasAttribute("data-bday-me"),
    } : null,
    totalCardsTdc: q(".pp-bday--tdc").length,
  };
}, { PNG_VERDE, PNG_VERM });

// ---- clique otimista (v364): o chip entra/sai da pilha NA HORA do toque ----
const clique = await p.evaluate(async () => {
  window.toggleReacaoAniversario = async () => true; // demo: só o otimista importa aqui
  const card = document.querySelector(`[data-bday-post^="tdc-vorlei"]`);
  const heart = card.querySelector("[data-bday-heart]");
  const stack = card.querySelector("[data-bday-stack]");
  const chips = () => Array.from(stack.querySelectorAll(".pp-bday__stk")).map((s) => s.getAttribute("title"));
  const antes = chips(); // seed: mine=true, meu chip presente
  heart.click(); // desligar
  await new Promise((r) => setTimeout(r, 50));
  const aposUnlike = { chips: chips(), texto: card.querySelector("[data-bday-count]").textContent };
  heart.click(); // ligar de novo
  await new Promise((r) => setTimeout(r, 50));
  const aposLike = {
    chips: chips(),
    texto: card.querySelector("[data-bday-count]").textContent,
    meuChipFoto: !!stack.querySelector('.pp-bday__stk--foto[title="Você"]'),
    meuPrimeiro: stack.firstElementChild?.getAttribute("title"),
  };
  // erro na escrita: reverte a pilha
  window.toggleReacaoAniversario = async () => { throw new Error("prob"); };
  heart.click();
  await new Promise((r) => setTimeout(r, 80));
  const aposErro = { chips: chips(), on: heart.classList.contains("on") };
  return { antes, aposUnlike, aposLike, aposErro };
});

await p.screenshot({ path: "scratchpad/audit/out/mural-front-home.png", fullPage: false });
console.log(JSON.stringify(r, null, 2));
if (jsErros.length) console.log("pageErrors:", jsErros);
await b.close();

const falhas = [];
const st = r.aniv?.stack || [];
if (!r.aniv) falhas.push("card aniversario nao renderizou");
if (st[0]?.foto !== true || st[0]?.title !== "Você") falhas.push("chip 1 (eu) nao saiu com FOTO do users doc");
if (st[1]?.foto !== true) falhas.push("chip 2 (Maria, placar) nao saiu com foto");
if (st[2]?.foto !== false || st[2]?.ini !== "CS") falhas.push("chip 3 (Carla sem foto) nao caiu nas iniciais");
if (st.length !== 4) falhas.push(`stack com ${st.length} chips (esperado 4)`);
if (r.aniv?.mais !== "+1") falhas.push(`contador +N errado: ${r.aniv?.mais}`);
if (!r.tdc) falhas.push("card tempo de casa (outro) nao renderizou");
if (r.tdc && !/Vorlei completa 9 anos de Fiobras hoje/.test(r.tdc.titulo)) falhas.push(`titulo tdc: ${r.tdc?.titulo}`);
if (r.tdc && !r.tdc.temCoracao) falhas.push("tdc do colega sem coracao");
if (r.tdc && !r.tdc.classeTdc) falhas.push("tdc sem a classe --tdc (tinta verde)");
if (!r.meu) falhas.push("card tempo de casa (proprio) nao renderizou");
if (r.meu && !/^Você completa 2 anos de Fiobras hoje/.test(r.meu.titulo)) falhas.push(`titulo self: ${r.meu?.titulo}`);
if (r.meu && r.meu.temCoracao) falhas.push("self com coracao (nao devia)");
if (r.meu && !/2 colegas já te parabenizaram/.test(r.meu.texto)) falhas.push(`texto self: ${r.meu?.texto}`);
if (clique.antes.includes("Você") !== true) falhas.push("seed do clique sem meu chip");
if (clique.aposUnlike.chips.includes("Você")) falhas.push("unlike nao tirou meu chip na hora");
if (!/2 parabéns/.test(clique.aposUnlike.texto)) falhas.push(`texto pos-unlike: ${clique.aposUnlike.texto}`);
if (clique.aposLike.meuPrimeiro !== "Você") falhas.push("like nao pos meu chip NA FRENTE da pilha na hora");
if (!clique.aposLike.meuChipFoto) falhas.push("meu chip otimista sem FOTO");
if (!/Você e mais 2 parabenizaram/.test(clique.aposLike.texto)) falhas.push(`texto pos-like: ${clique.aposLike.texto}`);
// clique 3 parte do estado LIGADO: o otimista desliga, a escrita falha, o revert
// devolve o estado anterior (coracao ON e meu chip de volta na pilha).
if (clique.aposErro.on !== true || !clique.aposErro.chips.includes("Você")) falhas.push("erro na escrita nao reverteu a pilha");
if (jsErros.length) falhas.push("pageErrors");
if (falhas.length) { console.error("FALHOU:\n- " + falhas.join("\n- ")); process.exit(1); }
console.log("MURAL FRONT OK");
