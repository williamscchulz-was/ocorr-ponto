// ============================================================
// GUARDA ANTI-FLICKER (metodologia 2026-07-14, pedido do William:
// "não pode acontecer em lugar algum, as pessoas precisam ver muito cuidado").
//
// Contrato que ele impõe: TODA tela, uma vez carregada, re-renderiza IDÊNTICA
// quando o state não mudou. É exatamente o que mata o "some e volta":
// placeholder que renasce em re-render = diferença entre snapshot A (tela
// estabilizada) e snapshot B (re-render imediato) = FALHA nomeando a tela.
//
// Dinâmico de propósito: as telas vêm de NAV_GRUPOS (gestor) e COLAB_NAV
// (colaborador) EM RUNTIME, então tela nova entra no pente fino sozinha.
// Roda no ritual de release: node scratchpad/audit/flicker-guard.mjs
// (servidor local na 8081 servindo a raiz do repo).
// ============================================================
import { chromium } from "playwright";

// IDs gerados por render (gradientes SVG com sequência global) mudam sem efeito
// visual: normaliza antes de comparar pra não acusar falso flicker.
const normaliza = (html) => String(html || "")
  .replace(/gmg\d+/g, "gmgN")
  .replace(/gm[a-z]+\d+w?/g, "gmsN");

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

const falhas = [];
async function varre(portal, paginas) {
  for (const pg of paginas) {
    const r = await p.evaluate(async (pagina) => {
      state.view.page = pagina;
      try { _renderAppNow(); } catch (e) { return { erro: String(e).slice(0, 200) }; }
      // estabiliza: preenchedores assíncronos, cargas lazy, contagem animada (700ms)
      // e a limpeza do stagger (850ms)
      await new Promise((res) => setTimeout(res, 1000));
      const view = document.querySelector("#view") || document.body;
      const a = view.innerHTML;
      try { _renderAppNow(); } catch (e) { return { erro: String(e).slice(0, 200) }; }
      const bHtml = view.innerHTML; // IMEDIATO: sem esperar async, é aqui que o flicker mora
      return { a, b: bHtml };
    }, pg);
    if (r.erro) { falhas.push(`${portal}/${pg}: ERRO DE RENDER ${r.erro}`); console.log(`  ${portal}/${pg}: ERRO`); continue; }
    const A = normaliza(r.a), B = normaliza(r.b);
    if (A !== B) {
      let i = 0;
      while (i < Math.min(A.length, B.length) && A[i] === B[i]) i++;
      falhas.push(`${portal}/${pg}: FLICKER no offset ${i}\n    estabilizado: ...${A.slice(Math.max(0, i - 40), i + 80)}...\n    re-render:    ...${B.slice(Math.max(0, i - 40), i + 80)}...`);
      console.log(`  ${portal}/${pg}: FLICKER`);
    } else {
      console.log(`  ${portal}/${pg}: ok`);
    }
  }
}

// ---- GESTOR (admin do demo; paginas de NAV_GRUPOS em runtime) ----
await p.evaluate(() => {
  _changelogChecado = true;
  const u = state.users.find((x) => x.role === "admin");
  login(u.id, u.senha);
});
await p.waitForFunction(() => state?.currentUserId);
await p.evaluate(() => {
  document.querySelector(".modal-backdrop button")?.click();
  document.querySelector("#acesso")?.remove();
  // dados que os cards assíncronos consomem (senão a tela nem tem o que piscar)
  const hoje = new Date();
  const admIso = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  state.aniversariantes = {
    pessoas: [{ nome: "Fulana Guarda", mes: hoje.getMonth() + 1, dia: hoje.getDate() }],
    recemChegados: [{ nome: "Novato Guarda", admissao: admIso, setor: "Producao" }],
  };
});
console.log("GESTOR:");
const paginasGestor = await p.evaluate(() => NAV_GRUPOS.flatMap((g) => g[1]));
await varre("gestor", paginasGestor);

// ---- COLABORADOR (paginas de COLAB_NAV em runtime) ----
await p.evaluate(() => {
  state.users.push({ id: "colab-guard", usuario: "colab", senha: "x", role: "colaborador", nome: "Colab Guarda", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("colab-guard", "x");
});
await p.waitForTimeout(300);
await p.evaluate(() => { document.querySelector("#acesso")?.remove(); });
console.log("COLAB:");
const paginasColab = await p.evaluate(() => COLAB_NAV.map((x) => x.id));
await varre("colab", paginasColab);

await b.close();
if (jsErros.length) console.log("\npageErrors:", jsErros);
if (falhas.length) {
  console.log(`\n${falhas.length} TELA(S) COM FLICKER:\n` + falhas.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log(`\nTodas as ${paginasGestor.length + paginasColab.length} telas re-renderizam identicas. Guarda anti-flicker: PASSOU.`);
