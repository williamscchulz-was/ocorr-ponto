// Verificacao da gamificacao (fase 4): colab (card home, barra 4, hub, tela
// Conquistas Pontos/Badges, equipar decoracao) + gestor (nav, config, entregas).
// Demo mode + stubs da camada de dados (padrao dsmp-verify).
import { chromium } from "playwright";
const b = await chromium.launch();
const erros = [];
const FALHAS = [];
const ok = (nome, cond) => { if (cond) console.log("  ok:", nome); else { console.log("  FALHA:", nome); FALHAS.push(nome); } };

const CFG = { ano: String(new Date().getFullYear()), ativa: true, marcos: [25, 50, 100, 150, 200],
  tabela: { "cartao-ponto": 1, folha: 1, comunicado: 1, "documento-leitura": 1, "documento-assinatura": 5, pesquisa: 5, termo: 5 } };

async function abrir(viewport, quem) {
  const ctx = await b.newContext({ viewport, serviceWorkers: "block" });
  await ctx.route("**/firebase.config.js*", (r) => r.abort());
  await ctx.route("**gstatic.com**", (r) => r.abort());
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });
  await p.evaluate(() => { _changelogChecado = true; });
  if (quem === "colab") {
    await p.evaluate(() => {
      const f = state.funcionarios.find((x) => x.status !== "inativo") || state.funcionarios[0];
      state.users.push({ id: "colab-demo", nome: f.nome, role: "colaborador", funcionarioId: f.id, senha: "x" });
      login("colab-demo", "x");
    });
  } else {
    await p.evaluate(() => { const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
  }
  await p.waitForFunction(() => state?.currentUserId, null, { timeout: 8000 });
  await p.waitForTimeout(500);
  await p.evaluate(() => { document.querySelector(".modal-backdrop button")?.click(); });
  return { ctx, p };
}

// ---------- COLAB (mobile 390) ----------
{
  const { ctx, p } = await abrir({ width: 390, height: 844 }, "colab");
  await p.evaluate((cfg) => {
    state.gamiConfig = cfg;
    state.gamiMeu = { total: 112, nome: state.users.find((u) => u.id === "colab-demo").nome, ultimoEvento: "pesquisa_p1" };
    state.gamiTop = [
      { uid: "u1", pos: 1, nome: "Ana Carolina", total: 248, decoracao: "ouro" },
      { uid: "u2", pos: 2, nome: "Joao Paulo", total: 212 },
      { uid: "u3", pos: 3, nome: "Ricardo Cruz", total: 197 },
      { uid: "colab-demo", pos: 4, nome: state.gamiMeu.nome, total: 112 },
    ];
    state.gamiExtrato = [
      { id: "pesquisa_p1", acao: "pesquisa", pontos: 5, rotulo: "Pesquisa de clima: Julho", em: "2026-07-08T12:00:00Z" },
      { id: "folha_r1", acao: "folha", pontos: 1, rotulo: "Folha de pagamento 2026-06", em: "2026-07-05T12:00:00Z" },
    ];
    state.gamiEntregas = [{ id: "colab-demo_25", uid: "colab-demo", marco: 25, premio: "Caneca da firma", em: "2026-03-02T12:00:00Z" }];
    window.__eq = [];
    window.carregarGamificacaoColab = async () => state.gamiMeu;
    window.gamiCatchUp = async () => false;
    window.equiparDecoracao = async (d) => { window.__eq.push(d); const u = state.users.find((x) => x.id === "colab-demo"); u.decoracao = d; };
    state.view.page = "colab-home";
    (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
  }, CFG);
  await p.waitForTimeout(500);

  console.log("== COLAB: home ==");
  let r = await p.evaluate(() => ({
    card: !!document.querySelector("#view .gm-card"),
    cardTotal: document.querySelector("#view .gm-card__pts")?.textContent.trim() || "",
    selosOk: document.querySelectorAll("#view .gm-selo.ok").length,
    hubConq: !!document.querySelector('.pp-atl [data-nav="colab-conquistas"]'),
    barra: Array.from(document.querySelectorAll("#bottom-nav .bottom-nav__item")).map((x) => x.dataset.page),
  }));
  ok("card de pontos na home (112)", r.card && r.cardTotal.startsWith("112"));
  ok("3 selos de marco conquistados", r.selosOk === 3);
  ok("atalho Conquistas no hub", r.hubConq);
  ok("barra com 4 itens incluindo conquistas", r.barra.length === 4 && r.barra.includes("colab-conquistas"));

  console.log("== COLAB: Conquistas · Pontos ==");
  await p.evaluate(() => document.querySelector("#view .gm-card").click());
  await p.waitForTimeout(500);
  r = await p.evaluate(() => ({
    page: state.view.page,
    tabs: document.querySelectorAll("#view [data-gami-tab]").length,
    hero: document.querySelector("#view .gm-card__pts")?.textContent.trim() || "",
    marcos: document.querySelectorAll("#view .gm-tmarco").length,
    marcosOk: document.querySelectorAll("#view .gm-tmarco.ok").length,
    premioRevelado: document.body.textContent.includes("Caneca da firma"),
    surpresa: document.body.textContent.includes("surpresa a caminho"),
    pod: document.querySelectorAll("#view .gm-pod__c").length,
    coroaTop1: !!document.querySelector("#view .gm-pod__c.p1 .gav__coroa"),
    linhasTop: document.querySelectorAll("#view .gm-toprow").length,
    eu: !!document.querySelector("#view .gm-toprow.me"),
    ext: document.querySelectorAll("#view .gm-ext").length,
  }));
  ok("card home navegou pra conquistas", r.page === "colab-conquistas");
  ok("2 abas", r.tabs === 2);
  ok("hero 112", r.hero.startsWith("112"));
  ok("5 marcos, 3 conquistados", r.marcos === 5 && r.marcosOk === 3);
  ok("premio do 25 revelado pela entrega", r.premioRevelado);
  ok("50/100 conquistados sem entrega = surpresa a caminho", r.surpresa);
  ok("podio 3 + coroa no 1o", r.pod === 3 && r.coroaTop1);
  ok("minha linha destacada no top", r.eu);
  ok("extrato com 2 itens", r.ext === 2);

  console.log("== COLAB: Conquistas · Badges ==");
  await p.evaluate(() => document.querySelector('[data-gami-tab="bdg"]').click());
  await p.waitForTimeout(500);
  r = await p.evaluate(() => ({
    perfil: !!document.querySelector("#view .gmc-perfil"),
    decos: document.querySelectorAll("#view .gmc-deco").length,
    locks: Array.from(document.querySelectorAll("#view .gmc-deco")).filter((d) => d.classList.contains("lock")).length,
    medalhas: document.querySelectorAll("#view .gqb").length,
    medalhsLock: document.querySelectorAll("#view .gqb.lock").length,
    svgs: document.querySelectorAll("#view .gqb__art svg").length,
  }));
  ok("hero de perfil", r.perfil);
  ok("6 cards de decoracao", r.decos === 6);
  ok("medalhas renderizadas (11 com svg)", r.medalhas === 11 && r.svgs === 11);
  // equipa o aro ouro (desbloqueado com 112 pts)
  await p.evaluate(() => document.querySelector('[data-gami-deco="ouro"]').click());
  await p.waitForTimeout(600);
  r = await p.evaluate(() => ({
    chamadas: window.__eq,
    sel: document.querySelector('[data-gami-deco="ouro"]')?.classList.contains("sel"),
    heroAro: !!document.querySelector("#view .gmc-perfil .gav--ouro"),
  }));
  ok("equipar chamou equiparDecoracao('ouro')", r.chamadas.length === 1 && r.chamadas[0] === "ouro");
  ok("card ficou selecionado e hero ganhou o aro", r.sel && r.heroAro);

  console.log("== COLAB: temporada ausente ==");
  await p.evaluate(() => { state.gamiConfig = null; state.view.page = "colab-conquistas"; (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)(); });
  await p.waitForTimeout(400);
  r = await p.evaluate(() => ({
    stub: document.body.textContent.includes("temporada de pontos ainda não começou"),
    cardHome: (state.view.page = "colab-home", (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)(), null),
  }));
  await p.waitForTimeout(400);
  const semCard = await p.evaluate(() => !document.querySelector("#view .gm-card"));
  ok("tela dormente sem temporada", r.stub);
  ok("home sem card quando dormente", semCard);
  await ctx.close();
}

// ---------- GESTOR (desktop 1280) ----------
{
  const { ctx, p } = await abrir({ width: 1280, height: 900 }, "gestor");
  await p.evaluate((cfg) => {
    window.__salvo = [];
    window.carregarGamiConfig = async () => (state.gamiConfig = cfg);
    window.carregarGamiPremios = async () => ({ m25: "Caneca da firma", m100: "Vale-compras" });
    window.carregarGamiGestor = async () => {
      state.gamiRanking = [
        { uid: "u1", pos: 1, nome: "Ana Carolina", total: 248 },
        { uid: "u2", pos: 2, nome: "Joao Paulo", total: 112 },
        { uid: "u3", pos: 3, nome: "Ricardo Cruz", total: 8 },
      ];
      state.gamiEntregasTodas = [{ id: "u1_25", uid: "u1", marco: 25, premio: "Caneca da firma" }];
    };
    window.salvarGamiConfig = async (...a) => window.__salvo.push(["cfg", ...a]);
    window.salvarGamiPremios = async (p2) => window.__salvo.push(["premios", p2]);
    window.registrarGamiEntrega = async (...a) => window.__salvo.push(["entrega", ...a]);
    state.view.page = "gamificacao";
    (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)();
  }, CFG);
  await p.waitForTimeout(700);

  console.log("== GESTOR: nav + config ==");
  let r = await p.evaluate(() => ({
    navItem: !!document.querySelector('#nav [data-page="gamificacao"]'),
    acoes: document.querySelectorAll("#view [data-gami-acao]").length,
    marcos: document.querySelectorAll("#view [data-gami-marco]").length,
    premios: document.querySelectorAll("#view [data-gami-premio]").length,
    premioValor: document.querySelector('#view [data-gami-premio="0"]')?.value || "",
    ativa: document.querySelector("#gami-ativa")?.checked,
  }));
  ok("item Gamificação na sidebar", r.navItem);
  ok("7 acoes editaveis (autoavaliacao fora, William 2026-07-14)", r.acoes === 7);
  ok("5 marcos + 5 premios", r.marcos === 5 && r.premios === 5);
  ok("premio do 25 pre-carregado", r.premioValor === "Caneca da firma");
  ok("toggle temporada ativa marcado", r.ativa === true);
  // salvar
  await p.evaluate(() => document.querySelector("#gami-salvar").click());
  await p.waitForTimeout(600);
  r = await p.evaluate(() => window.__salvo.map((x) => x[0]));
  ok("salvar gravou config + premios", r.includes("cfg") && r.includes("premios"));

  console.log("== GESTOR: entregas e ranking ==");
  await p.evaluate(() => document.querySelector('[data-gami-gtab="entregas"]').click());
  await p.waitForTimeout(600);
  r = await p.evaluate(() => ({
    fila: document.querySelectorAll("#view .gami-fila").length,
    rk: document.querySelectorAll("#view table tbody tr").length,
  }));
  // fila derivada: u1 cruzou 25(entregue),50,100,150,200 -> 4 pendentes (50/150/200 sem premio cadastrado, 100 com);
  // u2 cruzou 25,50,100 -> 3; u3 nada. Total 7.
  ok("fila derivada com 7 pendencias", r.fila === 7);
  ok("ranking completo com 3 pessoas", r.rk >= 3);
  // entrega do marco 100 do u2 (premio cadastrado)
  const btn = await p.evaluate(() => {
    const b2 = Array.from(document.querySelectorAll("[data-gami-entregar]")).find((x) => x.dataset.gamiEntregar === "u2" && x.dataset.marco === "100");
    if (b2) b2.click();
    return !!b2;
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => { document.querySelector(".modal-backdrop--confirm [data-ok]")?.click(); });
  await p.waitForTimeout(600);
  r = await p.evaluate(() => window.__salvo.filter((x) => x[0] === "entrega"));
  ok("marcar como entregue registrou (u2, 100)", btn && r.length === 1 && r[0][1] === "u2" && r[0][2] === 100);
  // sem premio cadastrado -> barra com toast e nao registra
  await p.evaluate(() => {
    const b2 = Array.from(document.querySelectorAll("[data-gami-entregar]")).find((x) => x.dataset.marco === "50");
    b2?.click();
  });
  await p.waitForTimeout(400);
  r = await p.evaluate(() => window.__salvo.filter((x) => x[0] === "entrega").length);
  ok("entrega sem premio cadastrado bloqueada", r === 1);
  await ctx.close();
}

// ---------- GESTOR mobile: atalho no hub ----------
{
  const { ctx, p } = await abrir({ width: 390, height: 844 }, "gestor");
  await p.evaluate(() => { state.view.page = "visao-geral"; (typeof _renderAppNow === "function" ? _renderAppNow : renderApp)(); });
  await p.waitForTimeout(500);
  const hub = await p.evaluate(() => !!document.querySelector('.ghub [data-ghub="gamificacao"]'));
  ok("atalho Gamificação no hub mobile do gestor", hub);
  await ctx.close();
}

console.log("erros de pagina:", erros.length ? erros : "nenhum");
console.log(FALHAS.length ? `FALHAS: ${FALHAS.length}` : "TUDO OK");
await b.close();
process.exit(FALHAS.length || erros.length ? 1 : 0);
