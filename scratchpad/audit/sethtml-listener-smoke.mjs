// ============================================================
// Smoke de listener duplicado — migração setHtml (2026-07-14/15).
// Nas 5 telas mais interativas: renderiza, espera assentar, força 3
// re-renders SEM mudança de state (_renderAppNow x3, simulando o padrão
// "renderApp chamado de novo sem nada ter mudado"), instrumenta UM handler
// representativo (stub em window ANTES do clique) e prova que 1 clique =
// 1 efeito (contador === 1, não 2/3/4 por causa de listener duplicado).
// Reusa o harness padrão (seedGestor/seedColab), NÃO edita public/.
// ============================================================
import { abrirContexto, seedGestor, seedColab, BASE_URL, coletarErrosReais } from "./harness.mjs";

const resultados = [];
let falhou = false;

async function preparar(page, page2render, { colab = false } = {}) {
  const seedStatus = colab ? await seedColab(page) : await seedGestor(page);
  await page.evaluate((pg) => { state.view.page = pg; renderApp(); }, page2render);
  await page.waitForTimeout(400);
  // 3 re-renders sem mudança de state — se algum site ainda escrevesse cru,
  // isso já teria recriado o DOM e reatado handlers (o guard m2 cobre isso à
  // parte); aqui o alvo é confirmar que o contrato "attach só quando escreveu"
  // segura mesmo sob chamadas repetidas.
  await page.evaluate(() => { _renderAppNow(); _renderAppNow(); _renderAppNow(); });
  return seedStatus;
}

async function testarClique({ nome, pageId, colab, stubFn, selector, esperado = 1 }) {
  const { browser, page } = await abrirContexto({ viewport: "desktop" });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await preparar(page, pageId, { colab });

  // Stub DEPOIS do assentamento (o click handler resolve o nome global em
  // tempo de clique, não captura a função original por valor).
  await page.evaluate((fn) => {
    window.__cliqueCount = 0;
    window[fn] = () => { window.__cliqueCount++; };
  }, stubFn);

  const alvo = await page.$(selector);
  const alvoExiste = !!alvo;
  if (alvo) await alvo.click();
  await page.waitForTimeout(150);

  const count = await page.evaluate(() => window.__cliqueCount);
  const erros = await coletarErrosReais(page);
  const ok = alvoExiste && count === esperado && erros.length === 0;
  if (!ok) falhou = true;
  resultados.push({ nome, alvoExiste, count, esperado, erros: erros.length, ok });
  console.log(`[${nome}] alvo=${alvoExiste ? "achado" : "AUSENTE"} cliques_efetivos=${count} (esperado ${esperado}) erros_reais=${erros.length} => ${ok ? "OK" : "FALHOU"}`);
  if (erros.length) erros.forEach((e) => console.log(`    ERRO: [${e.type}] ${e.text}`));
  await browser.close();
}

// 1) Funcionários — clique numa linha abre o modal (renderFuncList, gated).
await testarClique({
  nome: "funcionarios",
  pageId: "funcionarios",
  stubFn: "openFuncionarioModal",
  selector: "#func-list .func-row",
});

// 2) Banco de horas — clique num card abre o popup do espelho (renderBHList, gated).
await testarClique({
  nome: "banco-horas",
  pageId: "banco-horas",
  stubFn: "openEspelhoPopupBH",
  selector: "#bh-list [data-bh-espelho]",
});

// 3) Comunicados (gestor) — "Novo comunicado" (handler delegado global _comBound,
// ligado 1x no load do módulo; smoke confirma que a migração não regrediu isso).
await testarClique({
  nome: "comunicados-gestor",
  pageId: "comunicados",
  stubFn: "openComunicadoModal",
  selector: "[data-com-nova]",
});

// 4) Documentos (gestor) — "Novo documento" (handler delegado global _docBound).
await testarClique({
  nome: "documentos-gestor",
  pageId: "documentos",
  stubFn: "openDocumentoModal",
  selector: "[data-doc-novo]",
});

// 5) Colab home — atalho de navegação (bindColabNav, gated). Stub em renderApp
// (chamado por nome pelo handler) em vez de deixar a navegação real acontecer.
await testarClique({
  nome: "colab-home",
  pageId: "colab-home",
  colab: true,
  stubFn: "renderApp",
  // noviCard (.pp-novi, "Novidades"): visível no desktop. colabAtalhosHtml() TAMBÉM
  // tem um atalho data-nav="colab-roadmap" (hub mobile-only, CSS esconde >900px) —
  // mira a classe específica do noviCard pra não cair no duplicado oculto.
  selector: '.pp-novi[data-nav="colab-roadmap"]',
});

console.log("\n=== RESUMO smoke listener duplicado ===");
resultados.forEach((r) => console.log(`  ${r.ok ? "OK  " : "FAIL"} ${r.nome}`));
process.exit(falhou ? 1 : 0);
