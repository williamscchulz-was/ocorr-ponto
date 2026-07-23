// Probe SELO DE 24H + DOSSIÊ + micro-polishes no app DEMO (8081, sem firebase). Cobre:
//  - concluir mostra o AVISO ÂMBAR (data-den-estado="concluir");
//  - concluída recente (3h) mostra a JANELA VIVA com a data certa (concluidaEm+24h);
//  - concluída antiga (25h) SELA: controles travados, selo, Salvar oculto, textarea readonly;
//  - legada sem carimbo NÃO trava (editável, sem selo);
//  - DOSSIÊ: 1440x900 abre 2 colunas SEM scroll interno (colunas e modal), 390px é folha;
//  - botão primário no DARK com contraste medido >= 4.5:1 (fix --text-on-plum);
//  - barra da tela de atualização: nasce em ~0 mesmo com reg.waiting, alvo sobe por
//    estados, e SW mudo -> timeout solta o boot (sem tela infinita);
//  - zero pageerror; screenshots dossie-app-{janela,selado}-{claro,escuro}.png.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });
const errors = [];
const log = [];
const check = (name, cond) => { log.push((cond ? "PASS " : "FAIL ") + name); if (!cond) errors.push("CHECK FAIL: " + name); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
p.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  if (/ERR_FAILED|Failed to load resource|net::/.test(t)) return;
  errors.push("console.error: " + t.slice(0, 200));
});
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

// ---- login admin + injeta denúncias em cada estágio do selo ----
await p.evaluate(() => {
  _changelogChecado = true;
  const u = state.users.find((x) => x.role === "admin");
  login(u.id, u.senha);
});
await p.waitForFunction(() => state?.currentUserId);
await p.evaluate(() => {
  document.querySelector(".modal-backdrop button")?.click();
  document.querySelector("#acesso")?.remove();
  const iso = (d) => d.toISOString();
  const H = 3600 * 1000;
  const relatoLongo = "O líder do meu setor faz comentários humilhantes na frente da equipe quando erramos alguma meta. Já chamou uma colega de incompetente na frente de todo mundo e costuma usar tom de ameaça sobre demissão para pressionar. Isso vem acontecendo há uns três meses e piorou nas últimas semanas. Muita gente está com medo de falar. Estou enviando de forma anônima porque tenho receio de represália, mas queria que a empresa olhasse a situação do turno da tarde.";
  state.denuncias = [
    { id: "d-janela", categoria: "assedio-moral", texto: relatoLongo, hash: "sha256:" + "a".repeat(32), em: iso(new Date(Date.now() - 6 * H)), status: "concluida", desfecho: "procedente", concluidaEm: iso(new Date(Date.now() - 3 * H)) },
    { id: "d-selado", categoria: "seguranca", texto: relatoLongo, hash: "sha256:" + "b".repeat(32), em: iso(new Date(Date.now() - 72 * H)), status: "concluida", desfecho: "improcedente", concluidaEm: iso(new Date(Date.now() - 25 * H)) },
    { id: "d-legada", categoria: "outro", texto: "Relato legado concluído sem carimbo de conclusão (anterior ao selo).", hash: "sha256:" + "c".repeat(32), em: iso(new Date(Date.now() - 100 * H)), status: "concluida", desfecho: "improcedente" },
    { id: "d-analise", categoria: "fraude", texto: "Relato em análise, ainda não concluído.", hash: "sha256:" + "d".repeat(32), em: iso(new Date()), status: "em_analise" },
  ];
  state.denunciasNovas = 0;
  state._denCarregado = true;
  state.view.page = "denuncias";
  _renderAppNow();
});
await p.waitForTimeout(200);
check("4 cards na lista", await p.locator("#view .den-card").count() === 4);

// ============================================================
// 1) AVISO ÂMBAR ao concluir (em_analise -> Concluída, antes de salvar)
// ============================================================
await p.locator('#view .den-card[data-den-card="d-analise"]').click();
await p.waitForTimeout(200);
check("modal abre (dossiê)", await p.locator("#modal-root .den-mdl").count() === 1);
check("estado inicial 'aberta' (em análise)", await p.locator('#modal-root .den-mdl[data-den-estado="aberta"]').count() === 1);
check("aviso âmbar OCULTO antes de concluir", !(await p.locator("#modal-root .den-aviso-24").isVisible()));
await p.locator('#modal-root [data-den-st="concluida"]').click();
await p.waitForTimeout(150);
check("estado vira 'concluir' ao marcar Concluída", await p.locator('#modal-root .den-mdl[data-den-estado="concluir"]').count() === 1);
check("aviso âmbar VISÍVEL ao concluir", await p.locator("#modal-root .den-aviso-24").isVisible());
const avisoTxt = (await p.locator("#modal-root .den-aviso-24").textContent()).replace(/\s+/g, " ").trim();
check("aviso âmbar cita 24 horas", /24 horas/.test(avisoTxt) && /selado/.test(avisoTxt));
await p.evaluate(() => closeModal());
await p.waitForTimeout(150);

// ============================================================
// 2) JANELA VIVA (concluída há 3h) — rodapé com a data certa (concluidaEm+24h)
// ============================================================
await p.locator('#view .den-card[data-den-card="d-janela"]').click();
await p.waitForTimeout(200);
check("estado inicial 'janela' (concluída há 3h)", await p.locator('#modal-root .den-mdl[data-den-estado="janela"]').count() === 1);
check("rodapé é a janela viva (den-retencao--janela)", await p.locator("#modal-root .den-retencao--janela").count() === 1);
check("Salvar VISÍVEL na janela (ainda editável)", await p.locator("#modal-root #den-salvar").isVisible());
check("selo 'Registro selado' OCULTO na janela", !(await p.locator("#modal-root .den-selado").isVisible()));
const janelaOk = await p.evaluate(() => {
  const conc = new Date(state.denuncias.find((x) => x.id === "d-janela").concluidaEm);
  const fim = new Date(conc.getTime() + 24 * 3600 * 1000);
  const dm = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(fim);
  const foot = document.querySelector("#modal-root #den-ret-slot").textContent.replace(/\s+/g, " ");
  return { esperado: dm, temData: foot.includes(dm), temPrazo: /Ajustes poss[ií]veis at[ée]/.test(foot), temSub: /5 anos/.test(foot) };
});
check("janela: rodapé traz a DATA certa (concluidaEm+24h): " + janelaOk.esperado, janelaOk.temData);
check("janela: rodapé traz 'Ajustes possíveis até'", janelaOk.temPrazo);
check("janela: sub-linha mantém os 5 anos", janelaOk.temSub);
// ---- DOSSIÊ: 1440x900 abre 2 colunas SEM scroll interno ----
const dossieMed = await p.evaluate(() => {
  const relato = document.querySelector("#modal-root .den-mdl__col--relato");
  const apur = document.querySelector("#modal-root .den-mdl__col--apuracao");
  const modal = document.querySelector("#modal-root .modal");
  const sideBySide = Math.abs(relato.offsetTop - apur.offsetTop) < 4 && apur.offsetLeft > relato.offsetLeft + 100;
  const colSemScroll = (el) => el.scrollHeight <= el.clientHeight + 1;
  return {
    sideBySide,
    relatoSemScroll: colSemScroll(relato),
    apurSemScroll: colSemScroll(apur),
    modalSemScroll: modal.scrollHeight <= modal.clientHeight + 1,
  };
});
check("dossiê 1440x900: 2 colunas lado a lado", dossieMed.sideBySide);
check("dossiê: coluna do relato SEM scroll (scrollH<=clientH)", dossieMed.relatoSemScroll);
check("dossiê: coluna da apuração SEM scroll", dossieMed.apurSemScroll);
check("dossiê: modal SEM scroll interno", dossieMed.modalSemScroll);
await p.locator("#modal-root .modal").screenshot({ path: `${OUT}/dossie-app-janela-claro.png` });
// dark
await p.evaluate(() => { document.documentElement.classList.add("cp-dark"); document.documentElement.classList.remove("modo-colab"); });
await p.waitForTimeout(150);
await p.locator("#modal-root .modal").screenshot({ path: `${OUT}/dossie-app-janela-escuro.png` });

// ---- CONTRASTE do botão primário no DARK (fix --text-on-plum) ----
const contrasteDark = await p.evaluate(() => {
  const parse = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const btn = document.querySelector("#modal-root #den-salvar");
  const cs = getComputedStyle(btn);
  const fg = parse(cs.color), bg = parse(cs.backgroundColor);
  const L1 = lum(fg), L2 = lum(bg);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return { ratio: (hi + 0.05) / (lo + 0.05), fg, bg };
});
check("botão primário DARK contraste >= 4.5:1 (medido " + contrasteDark.ratio.toFixed(2) + ")", contrasteDark.ratio >= 4.5);
await p.evaluate(() => { document.documentElement.classList.remove("cp-dark"); closeModal(); });
await p.waitForTimeout(150);

// ============================================================
// 3) SELADO (concluída há 25h) — travado, selo, Salvar oculto, textarea readonly
// ============================================================
await p.locator('#view .den-card[data-den-card="d-selado"]').click();
await p.waitForTimeout(200);
check("estado inicial 'selado' (concluída há 25h)", await p.locator('#modal-root .den-mdl[data-den-estado="selado"]').count() === 1);
check("selo 'Registro selado' VISÍVEL", await p.locator("#modal-root .den-selado").isVisible());
const seloTxt = (await p.locator("#modal-root .den-selado").textContent()).replace(/\s+/g, " ").trim();
check("selo cita 'Registro selado'", /Registro selado/.test(seloTxt));
check("Salvar OCULTO no selado", !(await p.locator("#modal-root #den-salvar").isVisible()));
check("textarea readonly no selado", await p.locator("#modal-root #den-nota[readonly]").count() === 1);
check("rodapé de expurgo no selado (den-retencao--expurgo)", await p.locator("#modal-root .den-retencao--expurgo").count() === 1);
// trava de fato: clicar num status NÃO muda o estado (pointer-events:none via CSS)
const antesEstado = await p.locator("#modal-root .den-mdl").getAttribute("data-den-estado");
await p.locator('#modal-root [data-den-st="nova"]').click({ force: true }).catch(() => {});
await p.waitForTimeout(120);
const depoisEstado = await p.locator("#modal-root .den-mdl").getAttribute("data-den-estado");
check("selado: clicar status não altera nada (segue selado)", antesEstado === "selado" && depoisEstado === "selado");
await p.locator("#modal-root .modal").screenshot({ path: `${OUT}/dossie-app-selado-claro.png` });
await p.evaluate(() => { document.documentElement.classList.add("cp-dark"); document.documentElement.classList.remove("modo-colab"); });
await p.waitForTimeout(150);
await p.locator("#modal-root .modal").screenshot({ path: `${OUT}/dossie-app-selado-escuro.png` });
await p.evaluate(() => { document.documentElement.classList.remove("cp-dark"); closeModal(); });
await p.waitForTimeout(150);

// ============================================================
// 4) LEGADA sem carimbo — NÃO trava (editável, sem selo)
// ============================================================
await p.locator('#view .den-card[data-den-card="d-legada"]').click();
await p.waitForTimeout(200);
check("legada: NÃO abre selada", await p.locator('#modal-root .den-mdl[data-den-estado="selado"]').count() === 0);
check("legada: selo OCULTO", !(await p.locator("#modal-root .den-selado").isVisible()));
check("legada: Salvar VISÍVEL (segue editável)", await p.locator("#modal-root #den-salvar").isVisible());
check("legada: textarea NÃO é readonly", await p.locator("#modal-root #den-nota[readonly]").count() === 0);
await p.evaluate(() => closeModal());
await p.waitForTimeout(120);

// ============================================================
// 5) DOSSIÊ vira FOLHA no celular (390px): colunas empilham, modal rola
// ============================================================
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(150);
await p.locator('#view .den-card[data-den-card="d-janela"]').click();
await p.waitForTimeout(250);
const folha = await p.evaluate(() => {
  const relato = document.querySelector("#modal-root .den-mdl__col--relato");
  const apur = document.querySelector("#modal-root .den-mdl__col--apuracao");
  const modal = document.querySelector("#modal-root .modal");
  return {
    empilhado: apur.offsetTop > relato.offsetTop + 50,
    rolavel: modal.scrollHeight > modal.clientHeight + 1 || getComputedStyle(modal).overflowY === "auto",
  };
});
check("390px: colunas EMPILHAM (folha)", folha.empilhado);
check("390px: folha é rolável (não trava conteúdo)", folha.rolavel);
await p.evaluate(() => closeModal());
await p.setViewportSize({ width: 1440, height: 900 });

// ============================================================
// 6) BARRA DA TELA DE ATUALIZAÇÃO (bug William v353)
// ============================================================
// 6a) alvo sobe por estados (installing<installed<activating)
const floors = await p.evaluate(() => {
  window.__upReset();
  const seq = [];
  progressoAtualizacao("installing"); seq.push(window.__upDbg().floor);
  progressoAtualizacao("installed"); seq.push(window.__upDbg().floor);
  progressoAtualizacao("activating"); seq.push(window.__upDbg().floor);
  return seq;
});
check("update: alvo sobe por estados (35<72<90)", floors[0] === 35 && floors[1] === 72 && floors[2] === 90);

// 6b) barra INICIA em ~0 mesmo com reg.waiting presente desde o boot
const frac0 = await p.evaluate(() => {
  window.__upReset();
  window.__upFallbackMs = 999999; // não deixa o fallback disparar durante o teste
  window.__swReload = () => { window.__swReloadCalled = true; };
  aplicarAtualizacaoBoot({ state: "installed", postMessage() {} }); // simula reg.waiting no boot
  // Boot continuo (v366+): a atualizacao e um ESTADO da cortina (#splash.splash--atualizando),
  // nunca mais uma tela propria (#up-screen morreu). O sinal de "no ar" e a classe.
  return { frac: window.__upDbg().frac, ativo: window.__upDbg().ativo, tela: document.getElementById("splash").classList.contains("splash--atualizando") };
});
check("update: barra NASCE em ~0 mesmo com reg.waiting no boot (frac " + frac0.frac.toFixed(3) + ")", frac0.frac < 0.15);
check("update: tela de atualização no ar", frac0.tela === true);
check("update: flag __atualizandoApp ativa (corta boot pesado)", frac0.ativo === true);
// avança ~1s: a barra encheu progressivamente (subiu de ~0, sem estourar 90)
await p.waitForTimeout(1000);
const fracMid = await p.evaluate(() => window.__upDbg().frac);
check("update: barra encheu progressivamente até ~90% (0.4..0.92): " + fracMid.toFixed(3), fracMid > 0.4 && fracMid <= 0.92);

// 6c) SW mudo -> timeout de segurança solta o boot (sem tela infinita)
const fallback = await p.evaluate(async () => {
  window.__upReset();
  window.__swReloadCalled = false;
  window.__upFallbackMs = 150; // timeout curto pro teste
  window.__swReload = () => { window.__swReloadCalled = true; };
  aplicarAtualizacaoBoot({ state: "installed", postMessage() {} });
  await new Promise((r) => setTimeout(r, 300)); // passa do timeout, controllerchange NUNCA vem
  return { reload: window.__swReloadCalled === true, ativo: window.__upDbg().ativo };
});
check("update: SW mudo -> fallback chamou o reload (solta o boot)", fallback.reload);
check("update: fallback baixou __atualizandoApp (boot normal liberado)", fallback.ativo === false);
await p.evaluate(() => window.__upReset());

console.log(log.join("\n"));
console.log("\n=== ERROS (" + errors.length + ") ===");
console.log(errors.length ? errors.join("\n") : "nenhum");
await b.close();
process.exit(errors.length ? 1 : 0);
