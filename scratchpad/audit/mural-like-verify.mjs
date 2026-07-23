// Verifica o filtro "por pessoa" do card de boas-vindas na home do colaborador
// (William, 2026-07-16): quem ja deu o like nao ve mais o card (some antes dos
// 15 dias); quem ainda nao deu continua vendo ate o fim da janela.
// P3 (BOOT PERFEITO, v397): o card so nasce com a reacao CONHECIDA (cache quente). Por
// isso os setups semeiam state._reacoesCache com "conhecido, ainda nao reagi" antes de
// esperar o card visivel (com reacao DESCONHECIDA o card nao nasceria, por design).
// Uso: node scratchpad/audit/mural-like-verify.mjs  (reusa o harness/server 8081)
setTimeout(() => { console.error("TIMEOUT"); process.exit(9); }, 60000);
const H = await import("./harness.mjs");
await H.iniciarServidor();

const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedColab(page);

// ---------- (a) sem reacao: o card nasce visivel ----------
const semReacao = await page.evaluate(() => {
  window.gamiClaim = async () => true;
  window.toggleReacaoAniversario = async () => true;
  const hoje = new Date();
  const admissao = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 5).toISOString();
  const nome = "Carlos Recente";
  state.aniversariantes = { pessoas: [], recemChegados: [{ nome, admissao, setor: "Produção" }] };
  // P3: reação CONHECIDA e ainda não reagida -> o card nasce (cache quente via P1 no app real).
  const post = bvPostId(nome, admissao);
  state._reacoesCache = { [post]: { reacoes: [], minhaReacao: false, total: 0 } };
  state.view.page = "colab-home";
  _renderAppNow();
  const el = document.querySelector("[data-bv-post]");
  return {
    temCard: !!el,
    post: el ? el.getAttribute("data-bv-post") : null,
    temHand: !!document.querySelector("[data-bv-hand]"),
    texto: el ? el.querySelector(".pp-bday__t")?.textContent : null,
  };
});
console.log("(a) sem reacao (deve ver o card):", JSON.stringify(semReacao));

// ---------- (d.1) re-render duplo no estado "sem reacao": DOM identico ----------
const dupSemReacao = await page.evaluate(() => {
  const view = document.querySelector("#view");
  const antes = view.innerHTML;
  const no0 = document.querySelector("[data-bv-post]");
  _renderAppNow();
  return { htmlIdentico: antes === view.innerHTML, mesmoNo: no0 === document.querySelector("[data-bv-post]") };
});
console.log("(d.1) re-render duplo, sem reacao:", JSON.stringify(dupSemReacao));

// ---------- (b) cache quente com minha reacao: o card nao nasce ----------
const comReacaoCache = await page.evaluate(() => {
  const post = document.querySelector("[data-bv-post]").getAttribute("data-bv-post");
  state._reacoesCache[post] = { reacoes: [{ uid: "eu", nome: "Maria Demo" }], minhaReacao: true, total: 1 };
  _renderAppNow();
  return { post, temCard: !!document.querySelector(`[data-bv-post="${post}"]`) };
});
console.log("(b) cache quente, ja reagiu (nao deve nascer):", JSON.stringify(comReacaoCache));

// ---------- (d.2) re-render duplo no estado "ja reagiu": segue ausente, DOM identico ----------
const dupComReacao = await page.evaluate(() => {
  const view = document.querySelector("#view");
  const antes = view.innerHTML;
  _renderAppNow();
  return { htmlIdentico: antes === view.innerHTML, aindaAusente: !document.querySelector("[data-bv-post]") };
});
console.log("(d.2) re-render duplo, ja reagiu:", JSON.stringify(dupComReacao));

// ---------- (c) dar o like ao vivo: card colapsa depois do feedback ----------
const cliqueSetup = await page.evaluate(() => {
  const hoje = new Date();
  const admissao = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 5).toISOString();
  const nome = "Beatriz Recente";
  state.aniversariantes = { pessoas: [], recemChegados: [{ nome, admissao, setor: "Logística" }] };
  const post = bvPostId(nome, admissao);
  state._reacoesCache = { [post]: { reacoes: [], minhaReacao: false, total: 0 } };
  _renderAppNow();
  const el = document.querySelector("[data-bv-post]");
  return { temCard: !!el, post: el ? el.getAttribute("data-bv-post") : null };
});
console.log("(c) setup (card fresco, sem reacao):", JSON.stringify(cliqueSetup));

await page.click("[data-bv-hand]");
await page.waitForTimeout(150); // otimista: a pessoa ve a confirmacao (mao acesa + contagem)
const logoAposClique = await page.evaluate(() => {
  const hand = document.querySelector("[data-bv-hand]");
  const card = document.querySelector("[data-bv-post]");
  return {
    handOn: hand ? hand.classList.contains("on") : null,
    cardAindaPresente: !!card,
    texto: card ? card.querySelector(".pp-bday__s")?.textContent : null,
  };
});
console.log("(c) logo apos o clique (deve mostrar confirmacao ANTES de sumir):", JSON.stringify(logoAposClique));

await page.waitForTimeout(1000); // 550ms de espera + 320ms de colapso + folga
const aposColapso = await page.evaluate(() => ({ cardPresente: !!document.querySelector("[data-bv-post]") }));
console.log("(c) apos o colapso (card deve ter sumido):", JSON.stringify(aposColapso));

const erros = await H.coletarErrosReais(page);
console.log("erros reais (ruido de rede/SDK ja filtrado):", JSON.stringify(erros));

await browser.close();

const ok = semReacao.temCard && semReacao.temHand
  && dupSemReacao.htmlIdentico && dupSemReacao.mesmoNo
  && !comReacaoCache.temCard
  && dupComReacao.htmlIdentico && dupComReacao.aindaAusente
  && cliqueSetup.temCard
  && logoAposClique.handOn === true && logoAposClique.cardAindaPresente === true
  && aposColapso.cardPresente === false
  && erros.length === 0;

console.log(ok ? "\nPROBE mural-like-verify: PASSOU" : "\nPROBE mural-like-verify: FALHOU");
process.exit(ok ? 0 : 1);
