// Verifica o ONBOARDING PREMIUM (v407, mock docs/mockups/onboarding-premium-2026-07.html):
//  - ordem do gate 1º acesso intocada (senha -> adesão -> canal -> onboarding, fonte);
//  - abre no 1º acesso (localStorage sem a marca) e NÃO reabre depois (marca gravada);
//  - anel segmentado: N gomos gerados, estado done/current/future por passo, e um
//    re-render do app (fora do #view) NÃO reconstrói nem re-anima o overlay;
//  - navegação por toque (zonas) e por swipe (pointer), mais "Pular" indo pro card final;
//  - card final: cartão do vídeo (source /tutorial-fiopulse.mp4) + os 2 CTAs;
//  - selo de estreia presente com a flag ON e ausente com a flag OFF (app.js reescrito);
//  - "Tour do app" na Conta com as 2 opções e abrindo o overlay;
//  - prefers-reduced-motion: nenhuma animação roda;
//  - re-render idêntico da Conta (no-op de verdade).
// Servidor estático na 8081 servindo a raiz do repo (srv8081.cjs).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const b = await chromium.launch();
const erros = [];
const FALHAS = [];
const ok = (nome, cond, extra) => { if (cond) console.log("  ok:", nome); else { console.log("  FALHA:", nome, extra != null ? "-> " + JSON.stringify(extra) : ""); FALHAS.push(nome); } };
const URL = "http://localhost:8081/public/index.html";

// ============================================================
// 0) Ordem do gate (checagem estática da fonte, não do runtime)
// ============================================================
console.log("GATE (fonte):");
const src = readFileSync("public/app.js", "utf8");
const seq = ["mostrarTrocaSenha(", "mostrarTermoAdesao(", "mostrarTermoCanalDenuncia(", "mostrarOnboarding("];
let cursor = -1, ordemOk = true, posicoes = [];
for (const marca of seq) {
  const at = src.indexOf(marca, cursor + 1);
  posicoes.push(at);
  if (at <= cursor) ordemOk = false;
  cursor = at;
}
ok("Gate na ordem senha -> adesão -> canal -> onboarding", ordemOk && posicoes.every((n) => n > 0), posicoes);

// ============================================================
// Boot + login colaborador
// ============================================================
const ctx = await b.newContext({ viewport: { width: 420, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
await p.addInitScript(() => { window.__semVT = true; });
p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
await p.goto(URL, { waitUntil: "networkidle" });

async function loginColab() {
  await p.evaluate(() => {
    _changelogChecado = true;
    if (!state.users.some((x) => x.id === "onb-guard"))
      state.users.push({ id: "onb-guard", usuario: "onbc", senha: "x", role: "colaborador", nome: "Helena Duarte Alves", funcionarioCodigo: state.funcionarios[0]?.codigo });
    login("onb-guard", "x");
  });
  await p.waitForFunction(() => state?.currentUserId);
  await p.evaluate(() => { document.querySelector("#acesso")?.remove(); const t = document.querySelector("#troca-overlay"); if (t) t.hidden = true; });
}
await loginColab();

const N = await p.evaluate(() => ONBOARD_CENAS.length);
ok("ONBOARD_CENAS tem 7 cenas (mock)", N === 7, N);

// helpers de overlay
const abrir = () => p.evaluate(() => { document.getElementById("onb-overlay")?.remove(); mostrarOnboarding(); });
const fechar = () => p.evaluate(() => document.getElementById("onb-overlay")?.remove());
const estado = () => p.evaluate(() => {
  const ov = document.getElementById("onb-overlay");
  if (!ov) return { existe: false };
  const done = ov.querySelectorAll("#onb-ring-g .done").length;
  const segs = ov.querySelectorAll("#onb-ring-g .onb-ring__seg").length;
  const kick = ov.querySelector(".onb-kick")?.textContent || "";
  const img = ov.querySelector(".onb-device__media[src]")?.getAttribute("src") || "";
  const finale = !!ov.querySelector(".onb-fin");
  return { existe: true, done, segs, kick, img, finale, cta: ov.querySelector("#onb-cta")?.textContent.trim(), back: ov.querySelector("#onb-back")?.textContent.trim(), selo: !!ov.querySelector(".onb-selo") };
});

// ============================================================
// 1) Abre no 1º acesso; anel com N gomos; card 0 com selo
// ============================================================
console.log("ABERTURA + ANEL:");
const pendAntes = await p.evaluate(() => onboardingPendente(currentUser()));
ok("onboardingPendente = true antes de ver", pendAntes === true, pendAntes);
await abrir();
let s = await estado();
ok("Overlay abre", s.existe === true, s);
ok("Anel tem N gomos", s.segs === N, s);
ok("Card 0: 0 gomos done (é o corrente)", s.done === 0, s);
ok("Card 0: kicker 'Boas-vindas'", s.kick === "Boas-vindas", s);
ok("Card 0: selo de estreia presente (flag ON)", s.selo === true, s);

// ============================================================
// 2) Navegação por toque (zonas) e por swipe
// ============================================================
console.log("NAVEGAÇÃO:");
await p.evaluate(() => document.getElementById("onb-next").click()); // toque à direita
s = await estado();
ok("Toque direita avança pra card 1 (1 gomo done)", s.done === 1 && s.kick === "Meu ponto", s);
ok("Card 1: screenshot onb/meu-ponto.png no postcard", s.img === "onb/meu-ponto.png", s);
ok("Card 1: selo some fora do card 0", s.selo === false, s);

await p.evaluate(() => { const st = document.getElementById("onb-stage"); st.dispatchEvent(new PointerEvent("pointerdown", { clientX: 320, clientY: 420, bubbles: true })); st.dispatchEvent(new PointerEvent("pointerup", { clientX: 210, clientY: 420, bubbles: true })); }); // swipe esquerda -> avança
s = await estado();
ok("Swipe pra esquerda avança pra card 2", s.done === 2 && s.kick === "Pagamento", s);

await p.evaluate(() => document.getElementById("onb-prev").click()); // toque à esquerda -> volta
s = await estado();
ok("Toque esquerda volta pra card 1", s.done === 1 && s.kick === "Meu ponto", s);

// ============================================================
// 3) Anel não re-anima / overlay não é reconstruído num re-render do app
// ============================================================
console.log("RE-RENDER (overlay intacto):");
const idem = await p.evaluate(async () => {
  const ov = document.getElementById("onb-overlay");
  await new Promise((r) => setTimeout(r, 700)); // deixa a animação one-shot do anel terminar
  const antesNode = ov;
  const antesHtml = ov.outerHTML;
  const antesAnims = ov.getAnimations({ subtree: true }).length;
  state.view.page = "colab-home"; _renderAppNow(); _renderAppNow();
  const depois = document.getElementById("onb-overlay");
  return { mesmoNode: depois === antesNode, htmlIgual: depois && depois.outerHTML === antesHtml, animsDepois: depois ? depois.getAnimations({ subtree: true }).length : -1, antesAnims };
});
ok("Overlay é o MESMO nó após re-render (não reconstruído)", idem.mesmoNode, idem);
ok("Overlay idêntico após re-render (anel não re-desenha)", idem.htmlIgual, idem);
ok("Sem animações vivas no anel após estabilizar", idem.antesAnims === 0 && idem.animsDepois === 0, idem);

// ============================================================
// 4) "Pular" -> card final; final tem os 2 CTAs e grava visto
// ============================================================
console.log("PULAR -> FINAL:");
await p.evaluate(() => document.getElementById("onb-skip").click());
s = await estado();
ok("Pular leva ao card final", s.finale === true && s.done === N, s);
ok("Final: CTA primário 'Começar a usar'", s.cta === "Começar a usar", s);
ok("Final: CTA secundário 'Rever a apresentação'", s.back === "Rever a apresentação", s);
const pendDepois = await p.evaluate(() => onboardingPendente(currentUser()));
ok("Chegar ao final grava o visto (não reabre)", pendDepois === false, pendDepois);

// ============================================================
// 5) Cartão do vídeo revela player nativo apontando pro /tutorial-fiopulse.mp4
// ============================================================
console.log("VÍDEO:");
const vid = await p.evaluate(() => {
  const ov = document.getElementById("onb-overlay");
  const card = ov.querySelector("#onb-tour");
  const temCard = !!card;
  card.click();
  const v = ov.querySelector(".onb-video video source");
  return { temCard, src: v ? v.getAttribute("src") : null, temVideo: !!ov.querySelector(".onb-video video") };
});
ok("Final tem o cartão do tour em vídeo", vid.temCard === true, vid);
ok("Tocar o cartão revela o <video> nativo", vid.temVideo === true, vid);
ok("Vídeo aponta pra /tutorial-fiopulse.mp4", vid.src === "/tutorial-fiopulse.mp4", vid);

// ============================================================
// 6) "Rever a apresentação" (back) volta ao card 0
// ============================================================
const rever = await p.evaluate(() => { document.getElementById("onb-back").click(); const ov = document.getElementById("onb-overlay"); return { kick: ov.querySelector(".onb-kick")?.textContent, done: ov.querySelectorAll("#onb-ring-g .done").length }; });
ok("'Rever a apresentação' volta ao card 0", rever.kick === "Boas-vindas" && rever.done === 0, rever);
await fechar();

// ============================================================
// 7) "Tour do app" na Conta: rótulo, subtítulo e abre o overlay
// ============================================================
console.log("CONTA (reprise):");
const conta = await p.evaluate(() => {
  state.view.page = "colab-conta"; _renderAppNow();
  const row = document.querySelector('#view [data-acao="rever-onboarding"]');
  return { tt: row?.querySelector(".pp-rw__t")?.textContent, st: row?.querySelector(".pp-rw__s")?.textContent };
});
ok("Conta: linha 'Tour do app'", conta.tt === "Tour do app", conta);
ok("Conta: subtítulo cita rever apresentação e vídeo", /Rever a apresenta.*v[ií]deo/i.test(conta.st || ""), conta);
const abriuPelaConta = await p.evaluate(() => {
  document.getElementById("onb-overlay")?.remove();
  document.querySelector('#view [data-acao="rever-onboarding"]').click();
  return !!document.getElementById("onb-overlay");
});
ok("Conta: tocar 'Tour do app' abre o overlay", abriuPelaConta === true, abriuPelaConta);

// re-render idêntico da Conta (no-op de verdade)
await fechar();
const idemConta = await p.evaluate(() => {
  state.view.page = "colab-conta"; _renderAppNow();
  const view = document.querySelector("#view");
  const a = view.innerHTML, no0 = view.firstElementChild;
  _renderAppNow();
  return { igual: view.innerHTML === a, mesmoNo: view.firstElementChild === no0 };
});
ok("Conta: re-render idêntico (HTML + mesmo nó)", idemConta.igual && idemConta.mesmoNo, idemConta);

// ============================================================
// 8) prefers-reduced-motion: nenhuma animação roda
// ============================================================
console.log("REDUCED-MOTION:");
await fechar();
await p.emulateMedia({ reducedMotion: "reduce" });
const rm = await p.evaluate(async () => {
  const semMov = prefereMenosMovimento();
  document.getElementById("onb-overlay")?.remove();
  mostrarOnboarding();
  await new Promise((r) => requestAnimationFrame(r));
  const ov = document.getElementById("onb-overlay");
  return { semMov, anims: ov.getAnimations({ subtree: true }).length, temCena: !!ov.querySelector(".onb-kick"), gomos: ov.querySelectorAll("#onb-ring-g .onb-ring__seg").length };
});
ok("reduced-motion detectado", rm.semMov === true, rm);
ok("reduced-motion: zero animações", rm.anims === 0, rm);
ok("reduced-motion: cena e anel ainda pintam", rm.temCena && rm.gomos === N, rm);
await p.emulateMedia({ reducedMotion: null });
await fechar();

// ============================================================
// 9) Selo OFF: app.js reescrito com a flag em false -> sem selo no card 0
// ============================================================
console.log("SELO OFF (flag desligada):");
await ctx.route("**/app.js*", async (route) => {
  const resp = await route.fetch();
  let body = await resp.text();
  body = body.replace("ONBOARD_SELO_ESTREIA = true", "ONBOARD_SELO_ESTREIA = false");
  await route.fulfill({ response: resp, body });
});
await p.goto(URL, { waitUntil: "networkidle" });
await loginColab();
const seloOff = await p.evaluate(() => {
  const uid = state.currentUserId;
  try { localStorage.removeItem("fiopulse:onboarding:" + uid); } catch {}
  document.getElementById("onb-overlay")?.remove();
  mostrarOnboarding();
  const ov = document.getElementById("onb-overlay");
  return { flag: (typeof ONBOARD_SELO_ESTREIA !== "undefined") ? ONBOARD_SELO_ESTREIA : "?", selo: !!ov.querySelector(".onb-selo"), card0: ov.querySelector(".onb-kick")?.textContent };
});
ok("Flag reescrita pra false", seloOff.flag === false, seloOff);
ok("Selo AUSENTE no card 0 com a flag OFF", seloOff.selo === false && seloOff.card0 === "Boas-vindas", seloOff);

console.log(erros.length ? "\nERROS JS:\n" + erros.join("\n") : "\nsem erros de JS no console");
console.log(`\n${FALHAS.length ? "REPROVADO" : "APROVADO"} · ${FALHAS.length} falha(s)`);
await b.close();
process.exit(FALHAS.length ? 1 : 0);
