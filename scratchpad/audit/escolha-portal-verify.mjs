// Verificação do comportamento REAL do app (não do mock) das 2 features aprovadas em
// docs/mockups/escolha-portal-2026-07.html:
//   F1 ESCOLHA DE PORTAL SEMPRE — boot com sessão restaurada estaciona na escolha;
//      toque no card da sessão viva entra direto; "Trocar de portal" nos 2 portais
//      leva à escolha sem deslogar; Sair leva à escolha; re-render idêntico.
//   F2 TELA DE ATUALIZAÇÃO — texto exato, barra, SKIP_WAITING postado, reload 1x.
// Padrão gami-verify/vagas-cand: server 8081, aborta firebase.config+gstatic, bloqueia
// service workers, login(id,senha) do demo, _renderAppNow síncrono (renderApp é rAF).
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:8081/public/index.html";
const OUT = "C:/projetos/ocorr-ponto/scratchpad/audit/out";
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const FALHAS = [];
const erros = [];
const ok = (nome, cond) => { if (cond) console.log("  ok:", nome); else { console.log("  FALHA:", nome); FALHAS.push(nome); } };

async function abrir(viewport = { width: 420, height: 900 }, opts = {}) {
  const ctx = await b.newContext({ viewport, serviceWorkers: "block", ...opts });
  await ctx.route("**/firebase.config.js*", (r) => r.abort());
  await ctx.route("**gstatic.com**", (r) => r.abort());
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  await p.goto(BASE, { waitUntil: "load" });
  await p.evaluate(() => { window._changelogChecado = true; try { _changelogChecado = true; } catch (e) {} });
  await p.waitForTimeout(200);
  return { ctx, p };
}
const gate = async (p) => p.evaluate(() => ({
  acesso: !document.querySelector("#acesso").classList.contains("hidden"),
  app: !document.querySelector("#app").classList.contains("hidden"),
  login: !document.querySelector("#login").classList.contains("hidden"),
  loginColab: !document.querySelector("#login-colab").classList.contains("hidden"),
  uid: state.currentUserId || null,
  page: state.view?.page || null,
  escolhaFlag: !!window.__escolhaPortal,
}));

// ===== (1) boot com sessão demo restaurada estaciona na escolha =====
console.log("(1) boot restaurado estaciona na escolha:");
{
  const { ctx, p } = await abrir();
  const g0 = await gate(p);
  ok("(1) deslogado abre na escolha", g0.acesso && !g0.app && !g0.uid);
  // Login demo do gestor (admin) → app; persiste currentUserId no store.
  await p.evaluate(() => { const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
  await p.waitForFunction(() => !document.querySelector("#app").classList.contains("hidden"));
  // Reboot: recarrega a página. store.init restaura currentUserId → boot ESTACIONA.
  await p.reload({ waitUntil: "load" });
  await p.evaluate(() => { try { _changelogChecado = true; } catch (e) {} });
  await p.waitForTimeout(700);
  const g1 = await gate(p);
  ok("(1) boot restaurado: escolha visível, app oculto", g1.acesso && !g1.app);
  ok("(1) sessão continua viva (uid restaurado)", g1.uid === "admin");
  ok("(1) flag de escolha ligada (trava render em background)", g1.escolhaFlag === true);

  // ===== (2) toque no portal da sessão viva entra sem login =====
  console.log("(2) toque no card da sessão viva entra direto:");
  await p.evaluate(() => document.getElementById("acesso-gestor").click());
  await p.waitForFunction(() => !document.querySelector("#app").classList.contains("hidden"), null, { timeout: 4000 }).catch(() => {});
  const g2 = await gate(p);
  ok("(2) entrou no app sem passar por login", g2.app && !g2.acesso && !g2.login);
  ok("(2) landing do gestor = visao-geral", g2.page === "visao-geral");
  ok("(2) flag de escolha desligada ao entrar", g2.escolhaFlag === false);

  // ===== (6) re-render da escolha nasce idêntico (contrato anti-flicker) =====
  console.log("(6) re-render da escolha nasce idêntico:");
  const r6 = await p.evaluate(() => {
    trocarDePortal(); // volta à escolha SEM deslogar (sessão viva + flag ligada)
    const ac = document.querySelector("#acesso");
    const html0 = ac.outerHTML;
    const node0 = ac.firstElementChild;
    // Um render em background (guard) + re-mostrar a escolha NÃO podem tocar o DOM.
    _renderAppNow();
    mostrarAcesso();
    return {
      voltouEscolha: !ac.classList.contains("hidden") && document.querySelector("#app").classList.contains("hidden"),
      htmlIdentico: ac.outerHTML === html0,
      mesmoNo: ac.firstElementChild === node0,
      naoEntrou: document.querySelector("#app").classList.contains("hidden"),
      uid: state.currentUserId,
    };
  });
  ok("(6) Trocar de portal volta à escolha sem deslogar", r6.voltouEscolha && r6.uid === "admin");
  ok("(6) #acesso idêntico após re-render (HTML)", r6.htmlIdentico);
  ok("(6) #acesso preservou o nó (sem churn de DOM)", r6.mesmoNo);
  ok("(6) render em background NÃO empurrou pro app (guard)", r6.naoEntrou);
  await ctx.close();
}

// ===== (3) "Trocar de portal" presente nos DOIS portais e leva à escolha sem deslogar =====
console.log('(3) "Trocar de portal" no gestor e no colaborador:');
{
  // Gestor: menu do usuário (openProfileModal)
  const { ctx, p } = await abrir({ width: 1280, height: 900 });
  await p.evaluate(() => { const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
  await p.waitForFunction(() => !document.querySelector("#app").classList.contains("hidden"));
  await p.evaluate(() => openProfileModal());
  await p.waitForTimeout(200);
  const gestorTem = await p.evaluate(() => !!document.querySelector("#btn-trocar-portal"));
  ok("(3) gestor: botão Trocar de portal no menu do usuário", gestorTem);
  await p.evaluate(() => document.querySelector("#btn-trocar-portal").click());
  await p.waitForTimeout(200);
  const gGestor = await gate(p);
  ok("(3) gestor: leva à escolha sem deslogar", gGestor.acesso && !gGestor.app && gGestor.uid === "admin" && gGestor.escolhaFlag === true);
  await ctx.close();

  // Colaborador: aba Conta
  const { ctx: ctx2, p: p2 } = await abrir();
  await p2.evaluate(() => {
    state.users.push({ id: "colab-guard", senha: "x", role: "colaborador", nome: "Colab Guarda", funcionarioCodigo: state.funcionarios[0]?.codigo });
    login("colab-guard", "x");
  });
  await p2.waitForFunction(() => !document.querySelector("#app").classList.contains("hidden"));
  await p2.evaluate(() => { state.view.page = "colab-conta"; _renderAppNow(); });
  await p2.waitForTimeout(200);
  const colabTem = await p2.evaluate(() => !!document.querySelector('[data-acao="trocar-portal"]'));
  ok("(3) colaborador: linha Trocar de portal na Conta", colabTem);
  await p2.evaluate(() => document.querySelector('[data-acao="trocar-portal"]').click());
  await p2.waitForTimeout(200);
  const gColab = await gate(p2);
  ok("(3) colaborador: leva à escolha sem deslogar", gColab.acesso && !gColab.app && gColab.uid === "colab-guard" && gColab.escolhaFlag === true);
  ok("(3) colaborador: modo-colab removido na escolha (tela sempre clara)", await p2.evaluate(() => !document.documentElement.classList.contains("modo-colab")));
  await ctx2.close();
}

// ===== (4) Sair leva à escolha =====
console.log("(4) Sair leva à escolha:");
{
  const { ctx, p } = await abrir({ width: 1280, height: 900 });
  await p.evaluate(() => { const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
  await p.waitForFunction(() => !document.querySelector("#app").classList.contains("hidden"));
  await p.evaluate(() => logout()); // Sair (o botão do menu chama logout)
  await p.waitForTimeout(200);
  const g = await gate(p);
  ok("(4) Sair desloga e volta pra escolha", g.acesso && !g.app && !g.uid && g.escolhaFlag === false);
  await ctx.close();
}

// ===== (5) tela de atualização: texto exato, barra, SKIP_WAITING, palco mínimo,
// reload 1x SÓ depois de ~2s com a barra passando por 100% antes =====
console.log("(5) tela de atualização (SW):");
{
  const { ctx, p } = await abrir();
  // reg.waiting no boot + controllerchange IMEDIATO (worker rápido, o caso que o
  // William viu piscar): o reload NÃO pode ocorrer antes do palco mínimo (~2s) e a
  // barra tem que estar em 100% quando ele ocorrer.
  const r = await p.evaluate(async () => {
    window.__swPosted = [];
    window.__reloads = [];
    const t0 = Date.now();
    window.__swReload = () => window.__reloads.push({
      t: Date.now() - t0,
      w: document.querySelector(".up-screen__bar i")?.style.width || "",
    });
    const worker = { state: "installed", postMessage: (m) => window.__swPosted.push(m) };
    aplicarAtualizacaoBoot(worker); // tela + piso do estado + SKIP_WAITING
    swRecarregarUmaVez();           // controllerchange imediato (worker rápido)
    await new Promise((res) => setTimeout(res, 250));
    const cedo = {
      titulo: document.querySelector(".up-screen__t")?.textContent || "",
      sub: document.querySelector(".up-screen__s")?.textContent || "",
      temBarra: !!document.querySelector(".up-screen__bar i"),
      w250: parseFloat(document.querySelector(".up-screen__bar i")?.style.width) || 0,
      reloads250: window.__reloads.length,
    };
    await new Promise((res) => setTimeout(res, 1250)); // ~1.5s de palco
    const meio = {
      reloads1500: window.__reloads.length,
      w1500: parseFloat(document.querySelector(".up-screen__bar i")?.style.width) || 0,
    };
    await new Promise((res) => setTimeout(res, 1600)); // ~3.1s: palco + pausa vencidos
    swRecarregarUmaVez(); // 2ª chamada tem que ser no-op (anti-loop)
    await new Promise((res) => setTimeout(res, 400));
    return { ...cedo, ...meio, posted: window.__swPosted, reloads: window.__reloads };
  });
  ok('(5) título exato "Estamos atualizando o app"', r.titulo === "Estamos atualizando o app");
  ok('(5) subtítulo exato "pra você ter uma experiência melhor"', r.sub === "pra você ter uma experiência melhor");
  ok("(5) SKIP_WAITING postado ao worker", Array.isArray(r.posted) && r.posted.includes("SKIP_WAITING"));
  ok("(5) barra presente, regida pelo piso do estado (>=72%, <100%)", r.temBarra && r.w250 >= 72 && r.w250 < 100);
  ok("(5) palco mínimo: ZERO reload até ~1.5s", r.reloads250 === 0 && r.reloads1500 === 0);
  ok("(5) barra segue enchendo durante o palco (monotônica)", r.w1500 >= r.w250 && r.w1500 <= 90);
  ok("(5) reload 1x, só após ~2s + pausa (anti-loop na 2ª chamada)",
    r.reloads.length === 1 && r.reloads[0].t >= 2100 && r.reloads[0].t <= 3400);
  ok("(5) barra passou por 100% ANTES do reload", r.reloads[0]?.w === "100%");
  await ctx.close();
}

// ===== (5b) reduced motion: tempo mínimo mantido, passos discretos, sem exceção =====
console.log("(5b) tela de atualização com prefers-reduced-motion:");
{
  const { ctx, p } = await abrir({ width: 420, height: 900 }, { reducedMotion: "reduce" });
  const r = await p.evaluate(async () => {
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.__reloads = [];
    const t0 = Date.now();
    window.__swReload = () => window.__reloads.push({
      t: Date.now() - t0,
      w: document.querySelector(".up-screen__bar i")?.style.width || "",
    });
    // Estado "installing" (piso 35): deixa os PASSOS discretos do tempo visíveis.
    const worker = { state: "installing", postMessage: () => {} };
    aplicarAtualizacaoBoot(worker);
    swRecarregarUmaVez();
    await new Promise((res) => setTimeout(res, 1200)); // frac ~0.6 → passo 45
    const w1200 = document.querySelector(".up-screen__bar i")?.style.width || "";
    await new Promise((res) => setTimeout(res, 1900)); // ~3.1s
    return { rm, w1200, reloads: window.__reloads };
  });
  ok("(5b) contexto com prefers-reduced-motion ativo", r.rm === true);
  // Meio do palco = passo 45%; 67.5% aceito se o timer atrasar pro passo seguinte.
  ok("(5b) barra anda em passos discretos (sem easing)", r.w1200 === "45%" || r.w1200 === "67.5%");
  ok("(5b) tempo mínimo mantido + reload 1x com barra em 100%",
    r.reloads.length === 1 && r.reloads[0].t >= 2100 && r.reloads[0].t <= 3400 && r.reloads[0].w === "100%");
  await ctx.close();
}

// ===== screenshots: escolha (sessão viva) + tela de atualização, claro e escuro =====
console.log("screenshots:");
{
  const { ctx, p } = await abrir();
  // Escolha com sessão viva (parkeada). Claro.
  await p.evaluate(() => { const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); trocarDePortal(); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + "/escolha-portal-app-claro.png" });
  // Escuro (forçado; o app mantém a escolha clara por design, isto é só o token dark).
  await p.evaluate(() => document.documentElement.classList.add("cp-dark"));
  await p.waitForTimeout(150);
  await p.screenshot({ path: OUT + "/escolha-portal-app-escuro.png" });

  // Tela de atualização, claro.
  await p.evaluate(() => { document.documentElement.classList.remove("cp-dark"); _upScreenEl = null; document.querySelector(".up-screen")?.remove(); const w = { state: "installing", postMessage: () => {} }; aplicarAtualizacaoBoot(w); progressoAtualizacao("activating"); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + "/tela-atualizacao-claro.png" });
  // Tela de atualização, escuro.
  await p.evaluate(() => document.documentElement.classList.add("cp-dark"));
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + "/tela-atualizacao-escuro.png" });
  console.log("  escolha-portal-app-{claro,escuro}.png, tela-atualizacao-{claro,escuro}.png");
  await ctx.close();
}

await b.close();
console.log("\nerros de página:", erros.length ? erros : "nenhum");
console.log(FALHAS.length ? `RESULTADO: ${FALHAS.length} FALHA(S)` : "RESULTADO: TUDO OK");
process.exit(FALHAS.length || erros.length ? 1 : 0);
