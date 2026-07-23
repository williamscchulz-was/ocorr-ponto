// Recém-chegados na FAIXA DE STORIES (v401). Substitui o antigo card .pp-bday da home: o
// recém-chegado agora vive na faixa "Hoje na Fiobras" como um rosto (anel AMARELO). Contrato:
//   (a) o rosto NASCE na faixa (não depende de reação conhecida como o card antigo);
//   (b) ao dar boas-vindas o anel ESMAECE (st--seen), a pessoa CONTINUA na faixa (não some);
//   (c) reagir é pelo SHEET do novato (mãozinha grande), ligado ao caminho onBoasVindas
//       (aceno _acenarMao no gesto + gami + toggle); reagir de novo desliga;
//   (d) aniversariante do dia vem ANTES do novato; souEu (o próprio novato) sem ação;
//       sem match no gamiTop cai em iniciais; sem aniversário e sem novato a faixa não existe;
//   (e) re-render sem mudança = faixa IDÊNTICA (morph da região).
// Uso: node scratchpad/audit/mural-like-verify.mjs  (reusa o harness/server 8081)
setTimeout(() => { console.error("TIMEOUT"); process.exit(9); }, 60000);
const H = await import("./harness.mjs");
await H.iniciarServidor();

const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedColab(page); // loga como f-100 "Maria Demo"

// Stubs de rede: o cache das reações é escrito por carregarReacoesAniversario (espelha o reader
// real); toggle/gami viram gravadores pra o probe verificar o caminho onBoasVindas sem backend.
await page.evaluate(() => {
  window.__gamiCalls = [];
  window.__toggleCalls = [];
  window.gamiClaim = async (...a) => { window.__gamiCalls.push(a); };
  window.toggleReacaoAniversario = async (...a) => { window.__toggleCalls.push(a); };
  window.carregarReacoesAniversario = async (post) => {
    const o = (state._reacoesCache && state._reacoesCache[post]) || { reacoes: [], minhaReacao: false, total: 0 };
    (state._reacoesCache || (state._reacoesCache = {}))[post] = o;
    return o;
  };
});

const falhas = [];
const check = (cond, msg) => { console.log(`  ${cond ? "ok" : "FALHOU"}: ${msg}`); if (!cond) falhas.push(msg); };
const admIso = (dias) => new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);

// ---------- (a) o recém-chegado NASCE na faixa, anel amarelo, iniciais sem match no gamiTop ----------
const a = await page.evaluate(async (adm) => {
  state.gamiTop = []; // sem placar quente -> o rosto cai nas INICIAIS (caminho feliz do probe)
  state.aniversariantes = { pessoas: [], recemChegados: [{ nome: "Rafael Nunes", admissao: adm, setor: "Producao" }], tempoCasa: [] };
  state._reacoesCache = {};
  state.view.page = "colab-home";
  _renderAppNow();
  await new Promise((r) => setTimeout(r, 40));
  const el = document.querySelector('#view .mural-strip [data-story^="bv-"]');
  return {
    tem: !!el, cls: el ? el.className : null,
    iniciais: el ? el.querySelector(".st__av")?.textContent : null,
    fotoBg: el ? /url\(/.test(el.querySelector(".st__av")?.getAttribute("style") || "") : null,
    mk: el ? el.querySelector(".st__mk--novo")?.textContent : null,
    dash: el ? el.querySelector(".st__rsvg circle")?.getAttribute("stroke-dasharray") : null,
  };
}, admIso(3));
check(a.tem, "colab: o recém-chegado NASCE na faixa (rosto sempre presente na janela)");
check(/st--novo/.test(a.cls || ""), "colab: rosto do recém-chegado tem anel amarelo (st--novo)");
check(a.iniciais === "RN" && a.fotoBg === false, "colab: sem match no gamiTop cai em INICIAIS (RN)");
check(a.mk === "novo na equipe", "colab: micro-rótulo 'novo na equipe'");
check(a.dash !== "0", "colab: anel TRACEJADO enquanto faltam boas-vindas");

// ---------- (b) já dei boas-vindas: o anel ESMAECE e a pessoa CONTINUA na faixa (não some) ----------
const bSeen = await page.evaluate(async (adm) => {
  const post = bvPostId("Rafael Nunes", adm);
  state._reacoesCache = { [post]: { reacoes: [{ uid: "eu" }], minhaReacao: true, total: 1 } };
  _renderAppNow();
  await new Promise((r) => setTimeout(r, 40));
  const el = document.querySelector('#view .mural-strip [data-story^="bv-"]');
  return { presente: !!el, cls: el ? el.className : null, dash: el ? el.querySelector(".st__rsvg circle")?.getAttribute("stroke-dasharray") : null };
}, admIso(3));
check(bSeen.presente, "colab: quem já recebeu minhas boas-vindas CONTINUA na faixa (esmaecer, não sumir)");
check(/st--seen/.test(bSeen.cls || "") && /st--donebv/.test(bSeen.cls || ""), "colab: o rosto fica ESMAECIDO (st--seen st--donebv)");
check(bSeen.dash === "0", "colab: anel do esmaecido fica sólido");

// ---------- (c) ordem na faixa: aniversariante do dia ANTES do novato ----------
const ordem = await page.evaluate(async (adm) => {
  const hoje = new Date();
  state.aniversariantes = {
    pessoas: [{ nome: "Marina Duarte", mes: hoje.getMonth() + 1, dia: hoje.getDate() }],
    recemChegados: [{ nome: "Rafael Nunes", admissao: adm, setor: "Producao" }],
    tempoCasa: [],
  };
  state._reacoesCache = {};
  _renderAppNow();
  await new Promise((r) => setTimeout(r, 40));
  const posts = [...document.querySelectorAll('#view .mural-strip [data-story]')].map((el) => el.getAttribute("data-story"));
  return { posts };
}, admIso(3));
check(ordem.posts[0]?.startsWith("aniv-") && ordem.posts[1]?.startsWith("bv-"), "colab: aniversariante do dia vem ANTES do recém-chegado na faixa");

// ---------- (d) souEu (o próprio novato): anel âmbar, sheet SEM mãozinha ----------
const souEu = await page.evaluate(async (adm) => {
  const u = currentUser();
  state.aniversariantes = { pessoas: [], recemChegados: [{ nome: u.nome, admissao: adm, setor: "Producao" }], tempoCasa: [] };
  state._reacoesCache = {};
  _renderAppNow();
  await new Promise((r) => setTimeout(r, 40));
  const st = document.querySelector('#view .mural-strip [data-story^="bv-"]');
  const clsStory = st ? st.className : null;
  abrirMuralSheet(st.getAttribute("data-story"));
  await new Promise((r) => setTimeout(r, 30));
  const bvv = document.querySelector(".mural-sheet .bvv");
  const r = { clsStory, self: /bvv--self/.test(bvv?.className || ""), semMao: !bvv?.querySelector(".bvv__hand"), nm: bvv?.querySelector(".bvv__nm")?.textContent };
  document.querySelector(".mural-sheet")?.remove();
  return r;
}, admIso(3));
check(/st--self/.test(souEu.clsStory || ""), "colab: o próprio novato tem anel âmbar (st--self)");
check(souEu.self && souEu.semMao, "colab: o sheet do próprio novato NÃO tem mãozinha (só recebe)");
check(souEu.nm === "Você entrou pra equipe", "colab: o sheet do próprio diz 'Você entrou pra equipe'");

// ---------- (e) reagir pelo SHEET: liga a mão + aceno WAAPI + gami/toggle + faixa esmaece ----------
const react = await page.evaluate(async (adm) => {
  state.aniversariantes = { pessoas: [], recemChegados: [{ nome: "Rafael Nunes", admissao: adm, setor: "Producao" }], tempoCasa: [] };
  const post = bvPostId("Rafael Nunes", adm);
  state._reacoesCache = { [post]: { reacoes: [], minhaReacao: false, total: 0 } };
  window.__gamiCalls = []; window.__toggleCalls = [];
  _renderAppNow();
  // O rosto pode ter entrado por morph-insert (entrada one-shot de 340ms). O morph NÃO patcha
  // atributo de nó em plena entrada (contrato anti-flicker); na vida real o usuário reage muito
  // depois. Espera a entrada TERMINAR antes de reagir, pra o esmaecer refletir de imediato.
  await new Promise((r) => setTimeout(r, 40));
  await Promise.all([...document.querySelectorAll("#view .mural-strip .st")].flatMap((el) => el.getAnimations()).map((a) => a.finished.catch(() => {})));
  abrirMuralSheet(post);
  await new Promise((r) => setTimeout(r, 30));
  const hand = document.querySelector(".mural-sheet .bvv__hand");
  hand.click(); // handler local: onBoasVindas (aplica+aceno) + reconcile + fecha depois
  const svg = hand.querySelector("svg");
  const on1 = hand.classList.contains("on");
  const fill1 = svg?.getAttribute("fill");
  const aceno = (document.getAnimations ? document.getAnimations() : []).some((an) => an.playState === "running" && an.effect && an.effect.target === svg && an.transitionProperty === undefined);
  const cacheOn = !!(state._reacoesCache[post] && state._reacoesCache[post].minhaReacao);
  await new Promise((r) => setTimeout(r, 10)); // deixa o await do onBoasVindas resolver p/ gami/toggle
  const gami = (window.__gamiCalls[0] || [])[0];
  const toggle = (window.__toggleCalls[0] || []);
  // a faixa (na home, atrás do sheet) já reconciliou pro estado esmaecido
  const st = document.querySelector('#view .mural-strip [data-story^="bv-"]');
  const esmaeceu = /st--seen/.test(st?.className || "");
  return { on1, fill1, aceno, cacheOn, gami, togglePost: toggle[0], toggleTipo: toggle[2], esmaeceu };
}, admIso(3));
check(react.on1 === true && react.fill1 === "currentColor", "colab: tocar a mão no sheet LIGA (on, mão cheia)");
check(react.aceno === true, "colab: aceno WAAPI dispara no gesto");
check(react.cacheOn === true, "colab: o cache reflete a reação (caminho onBoasVindas)");
check(react.gami === "boas-vindas", "colab: pontua pelo caminho onBoasVindas (gamiClaim 'boas-vindas')");
check(react.toggleTipo === "bemvindo", "colab: escreve a reação 'bemvindo'");
check(react.esmaeceu === true, "colab: a faixa esmaece o rosto ao reagir (reconcile)");

// ---------- (e.2) reagir de novo DESLIGA (toggle) ----------
const off = await page.evaluate(async (adm) => {
  const post = bvPostId("Rafael Nunes", adm);
  document.querySelector(".mural-sheet")?.remove(); // fecha o sheet anterior antes de reabrir
  // reabre o sheet (agora no estado 'welcomed')
  abrirMuralSheet(post);
  await new Promise((r) => setTimeout(r, 30));
  const hand = document.querySelector(".mural-sheet .bvv__hand");
  const antesOn = hand.classList.contains("on");
  hand.click();
  const depoisOn = hand.classList.contains("on");
  const cacheOff = !(state._reacoesCache[post] && state._reacoesCache[post].minhaReacao);
  document.querySelector(".mural-sheet")?.remove();
  return { antesOn, depoisOn, cacheOff };
}, admIso(3));
check(off.antesOn === true && off.depoisOn === false && off.cacheOff === true, "colab: reagir de novo DESLIGA (toggle, como o coração)");

// ---------- (f) match no gamiTop: foto no rosto (background-image) ----------
const foto = await page.evaluate(async (adm) => {
  const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  state.gamiTop = [{ nome: "Rafael Nunes", foto: dataUrl }];
  state.aniversariantes = { pessoas: [], recemChegados: [{ nome: "Rafael Nunes", admissao: adm, setor: "Producao" }], tempoCasa: [] };
  state._reacoesCache = {};
  _renderAppNow();
  await new Promise((r) => setTimeout(r, 40));
  const av = document.querySelector('#view .mural-strip [data-story^="bv-"] .st__av');
  return { fotoBg: /url\(/.test(av?.getAttribute("style") || ""), semIniciais: (av?.textContent || "") === "" };
}, admIso(3));
check(foto.fotoBg && foto.semIniciais, "colab: com match no gamiTop o rosto usa a FOTO (sem iniciais)");

// ---------- (g) sem aniversário e sem recém-chegado: a faixa NÃO existe ----------
const vazio = await page.evaluate(async () => {
  state.aniversariantes = { pessoas: [], recemChegados: [], tempoCasa: [] };
  state._reacoesCache = {};
  _renderAppNow();
  await new Promise((r) => setTimeout(r, 40));
  const region = document.querySelector('#view [data-region="mural:strip"]');
  return { temStrip: !!document.querySelector("#view .mural-strip"), regionVazia: region ? region.children.length === 0 : null };
});
check(!vazio.temStrip && vazio.regionVazia === true, "colab: sem aniversário e sem recém-chegado a faixa não existe (região vazia)");

// ---------- (h) re-render sem mudança = faixa IDÊNTICA (morph da região) ----------
const idem = await page.evaluate(async (adm) => {
  const hoje = new Date();
  state.aniversariantes = {
    pessoas: [{ nome: "Marina Duarte", mes: hoje.getMonth() + 1, dia: hoje.getDate() }],
    recemChegados: [{ nome: "Rafael Nunes", admissao: adm, setor: "Producao" }],
    tempoCasa: [],
  };
  state._reacoesCache = {};
  _renderAppNow();
  await preencherCardsBoasVindas(); // aquece o cache das boas-vindas
  await new Promise((r) => setTimeout(r, 40));
  const region = document.querySelector('#view [data-region="mural:strip"]');
  const no0 = region.firstElementChild;
  const antes = region.innerHTML;
  _renderAppNow();
  const depois = region.innerHTML;
  return { igual: antes === depois, mesmoNo: region.firstElementChild === no0 };
}, admIso(3));
check(idem.igual && idem.mesmoNo, "colab: re-render sem mudança = faixa IDÊNTICA (morph no-op, nó preservado)");

const erros = await H.coletarErrosReais(page);
check(erros.length === 0, "colab: sem erros reais de app (" + JSON.stringify(erros) + ")");

await browser.close();
if (falhas.length) {
  console.log(`\n${falhas.length} CHECK(S) REPROVARAM:\n` + falhas.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("\nmural-like-verify: PASSOU (faixa nasce, esmaece sem sumir, reagir pelo sheet liga a mão + pontua, ordem, souEu, iniciais, vazio, idêntico).");
process.exit(0);
