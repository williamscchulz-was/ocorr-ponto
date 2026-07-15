// ============================================================
// ONDA 1 — verificação da navegação com continuidade (View Transitions).
// Padrão do harness demo: chromium, aborta firebase.config.js + gstatic, SW block,
// _changelogChecado=true, login admin e colab demo. Navega ENTRE páginas via
// renderApp() (a transição vive no agendador), espera >=2 frames, e prova:
//  - Chrome headless tem document.startViewTransition;
//  - cross-page vira transição de verdade (contador do wrapper sobe 1 por navegação);
//  - re-render da MESMA página NÃO transiciona (contador não sobe);
//  - o par de shared element do avatar (colab-home <-> colab-conta) NÃO aborta;
//  - zero pageerror, página certa após cada navegação.
// ============================================================
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();

const pageErros = [];
p.on("pageerror", (e) => pageErros.push(String(e).slice(0, 200)));
const consoleAvisos = [];
p.on("console", (m) => { const t = m.text(); if (/view-transition|duplicate/i.test(t)) consoleAvisos.push(`[${m.type()}] ${t.slice(0, 160)}`); });

await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

// ---- suporte nativo ----
const temVT = await p.evaluate(() => !!document.startViewTransition);
console.log("document.startViewTransition disponível:", temVT);
if (!temVT) { console.log("ABORTA: chromium sem View Transitions, nada a verificar."); await b.close(); process.exit(1); }

// ---- wrapper contador: instala UMA vez (re-wrap encadearia e contaria dobrado) ----
async function instalarWrapper() {
  await p.evaluate(() => {
    if (window.__vtWrapped) { window.__vt = { count: 0, ok: 0, rej: 0 }; return; }
    window.__vtWrapped = true;
    window.__vt = { count: 0, ok: 0, rej: 0 };
    const orig = document.startViewTransition.bind(document);
    document.startViewTransition = function (cb) {
      window.__vt.count++;
      const t = orig(cb);
      try { t.ready.then(() => window.__vt.ok++, () => window.__vt.rej++); } catch (e) {}
      return t;
    };
  });
}
const contadores = () => p.evaluate(() => ({ ...window.__vt }));
// dá 2 frames pro agendador (rAF) + folga pra o update-callback da transição aplicar o DOM
const espera = async () => { await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await p.waitForTimeout(380); };

async function navega(pagina) {
  await p.evaluate((pg) => { state.view.page = pg; renderApp(); }, pagina);
  await espera();
  return p.evaluate(() => ({ page: state.view.page, viewLen: (document.querySelector("#view")?.textContent || "").trim().length }));
}

// ========================= GESTOR =========================
await p.evaluate(() => {
  _changelogChecado = true;
  const u = state.users.find((x) => x.role === "admin");
  login(u.id, u.senha);
});
await p.waitForFunction(() => state?.currentUserId);
await p.evaluate(() => { document.querySelector(".modal-backdrop button")?.click(); document.querySelector("#acesso")?.remove(); });
await espera(); // deixa o render de login assentar (_ultimaPageRenderizada = página atual)
await instalarWrapper();

console.log("\nGESTOR — navegação via renderApp():");
const rotaGestor = ["funcionarios", "banco-horas", "comunicados", "visao-geral"];
let falhas = 0;
for (const pg of rotaGestor) {
  const antes = (await contadores()).count;
  const r = await navega(pg);
  const depois = (await contadores()).count;
  const subiu = depois - antes;
  const ok = r.page === pg && r.viewLen > 0 && subiu === 1;
  if (!ok) falhas++;
  console.log(`  -> ${pg}: page=${r.page} viewLen=${r.viewLen} vtCount+${subiu} ${ok ? "OK" : "FALHA"}`);
}
await p.screenshot({ path: `${OUT}/onda1-gestor-comunicados.png` }).catch(() => {});
// screenshot numa tela conhecida
await navega("visao-geral");
await p.screenshot({ path: `${OUT}/onda1-gestor-visaogeral.png` });

// ---- prova: re-render da MESMA página NÃO transiciona ----
const antesMesma = (await contadores()).count;
await p.evaluate(() => { renderApp(); }); // mesma state.view.page
await espera();
await p.evaluate(() => { renderApp(); });
await espera();
const depoisMesma = (await contadores()).count;
const mesmaOk = depoisMesma === antesMesma;
console.log(`  re-render MESMA página (visao-geral) x2: vtCount ${antesMesma} -> ${depoisMesma} ${mesmaOk ? "OK (não transicionou)" : "FALHA (transicionou!)"}`);
if (!mesmaOk) falhas++;

// ========================= COLABORADOR =========================
await p.evaluate(() => {
  state.users.push({ id: "colab-onda1", usuario: "colabo", senha: "x", role: "colaborador", nome: "Colab Onda", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("colab-onda1", "x");
});
await p.waitForTimeout(300);
await p.evaluate(() => { document.querySelector("#acesso")?.remove(); document.querySelector(".modal-backdrop button")?.click(); });
await espera();
await instalarWrapper(); // zera o contador pro trecho colab

console.log("\nCOLAB — navegação via renderApp() (inclui o par de avatar home<->conta):");
const rotaColab = ["colab-conta", "colab-ponto", "colab-comunicados", "colab-home"];
for (const pg of rotaColab) {
  const antes = (await contadores()).count;
  const r = await navega(pg);
  const depois = (await contadores()).count;
  const subiu = depois - antes;
  const ok = r.page === pg && r.viewLen > 0 && subiu === 1;
  if (!ok) falhas++;
  console.log(`  -> ${pg}: page=${r.page} viewLen=${r.viewLen} vtCount+${subiu} ${ok ? "OK" : "FALHA"}`);
}

// ---- prova do PAR de avatar: home -> conta não pode abortar ----
await navega("colab-home");
const cAntes = await contadores();
await navega("colab-conta");
await p.waitForTimeout(200);
const cDepois = await contadores();
const parOk = (cDepois.count - cAntes.count === 1) && (cDepois.rej === cAntes.rej);
console.log(`  par avatar home->conta: vtCount+${cDepois.count - cAntes.count}, rejeições ${cAntes.rej}->${cDepois.rej} ${parOk ? "OK (ready resolveu, sem abort)" : "FALHA (abortou)"}`);
if (!parOk) falhas++;

// re-render MESMA página no colab também
const antesMc = (await contadores()).count;
await p.evaluate(() => { renderApp(); });
await espera();
const depoisMc = (await contadores()).count;
const mcOk = depoisMc === antesMc;
console.log(`  re-render MESMA página (colab-conta): vtCount ${antesMc} -> ${depoisMc} ${mcOk ? "OK" : "FALHA"}`);
if (!mcOk) falhas++;

await p.screenshot({ path: `${OUT}/onda1-colab-conta.png` });
await navega("colab-home");
await p.screenshot({ path: `${OUT}/onda1-colab-home.png` });

const total = await contadores();
console.log("\nresumo wrapper (colab):", JSON.stringify(total));
console.log("pageErrors:", pageErros.length ? pageErros : "nenhum");
console.log("avisos console (view-transition/duplicate):", consoleAvisos.length ? consoleAvisos : "nenhum");

await b.close();
if (pageErros.length) { console.log("\nREPROVA: houve pageerror."); process.exit(1); }
if (consoleAvisos.some((a) => /duplicate/i.test(a))) { console.log("\nREPROVA: aviso de view-transition-name duplicado (par abortando)."); process.exit(1); }
if (falhas) { console.log(`\nREPROVA: ${falhas} verificação(ões) falharam.`); process.exit(1); }
console.log("\nONDA 1 navegação: PASSOU (transição só em troca de página, par de avatar sem abort, zero pageerror).");
