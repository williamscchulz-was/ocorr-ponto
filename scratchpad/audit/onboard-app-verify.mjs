// Verificação do SUPER ONBOARDING do 1º acesso (colaborador) NO APP (não o mock).
// Cobre: gate dispara no 1º acesso, navegação das 7 cenas, concluir grava a chave e
// some, re-render com chave gravada NÃO reabre, reload NÃO mostra, "Rever a apresentação"
// da Conta reabre, e Pular grava e fecha.
// Uso (servidor local na 8081 servindo a raiz do repo): node scratchpad/audit/onboard-app-verify.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:8081/public/index.html";
const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });

const errors = [];
const log = [];
const check = (name, cond) => { log.push((cond ? "PASS " : "FAIL ") + name); if (!cond) errors.push("CHECK FAIL: " + name); };
const KEY = "fiopulse:onboarding:colab-guard";
const VERSAO = "2026-07-v1";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 920 }, deviceScaleFactor: 2, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
page.on("dialog", (d) => { errors.push("DIALOG (XSS?) : " + d.message()); d.dismiss().catch(() => {}); });

await page.goto(BASE, { waitUntil: "networkidle" });

// entra como colaborador simulando SESSÃO REAL com os termos apurados (o gate exige
// termoAdesaoOk === true, o que exclui demo/harness onde fica undefined) e a chave limpa.
async function abrirComoPrimeiroAcesso() {
  await page.evaluate((KEY) => {
    _changelogChecado = true;
    try { localStorage.removeItem(KEY); } catch {}
    if (!state.users.find((u) => u.id === "colab-guard"))
      state.users.push({ id: "colab-guard", usuario: "colab", senha: "x", role: "colaborador", nome: "Maria Onboarding", funcionarioCodigo: state.funcionarios[0]?.codigo });
    logout();
    login("colab-guard", "x");
    document.querySelector("#acesso")?.remove();
    document.querySelector(".modal-backdrop button")?.click();
    state.termoAdesaoOk = true;
    state.termoCanalOk = true;
    delete state._termoAdesaoAceitoAgora;
    delete state._termoCanalAceitoAgora;
    state.view.page = "colab-home";
    _renderAppNow();
  }, KEY);
  await page.waitForTimeout(300);
}

// texto cru (o kicker tem text-transform:uppercase, então innerText viria maiúsculo).
const kicker = () => page.locator("#onb-overlay #onb-kicker").textContent().then((t) => (t || "").trim());
const titulo = () => page.locator("#onb-overlay #onb-title").textContent().then((t) => (t || "").trim());

// ---------- 1º acesso: gate abre o overlay ----------
await abrirComoPrimeiroAcesso();
check("gate abre o overlay no 1º acesso", await page.locator("#onb-overlay").count() === 1);
check("barra segmentada com 7 segmentos", await page.locator("#onb-overlay #onb-bars > i").count() === 7);
// nome vem do cadastro (state.funcionarios[0]), mesma fonte da saudação/Conta.
const primeiroNome = await page.evaluate(() => {
  const f = state.funcionarios && state.funcionarios[0];
  const nome = (f && f.nome) || "";
  return (nome.trim().split(/\s+/)[0]) || "você";
});
check("cena 1: kicker Boas-vindas", (await kicker()) === "Boas-vindas");
check("cena 1: título saúda pelo nome do cadastro", (await titulo()).includes("Que bom te ver") && (await titulo()).includes(primeiroNome));
check("chave AINDA não gravada ao abrir", await page.evaluate((KEY) => localStorage.getItem(KEY), KEY) === null);
check("Pular visível na cena 1", await page.locator("#onb-overlay #onb-skip").isVisible());
await page.screenshot({ path: `${OUT}/onboard-app-cena1.png` });

// ---------- navegar as 7 cenas ----------
// voltar não faz nada na 1ª (i=0); avança até a última.
await page.click("#onb-overlay #onb-cta"); // -> cena 2
await page.waitForTimeout(120);
check("cena 2 após avançar", (await kicker()) === "Início");
check("Voltar visível a partir da cena 2", await page.locator("#onb-overlay #onb-back").isVisible());
await page.click("#onb-overlay #onb-back"); // <- cena 1
await page.waitForTimeout(120);
check("Voltar retorna à cena 1", (await kicker()) === "Boas-vindas");
// avança as 6 vezes até a última cena (índice 6)
for (let n = 0; n < 6; n++) { await page.click("#onb-overlay #onb-cta"); await page.waitForTimeout(90); }
check("cena 7: kicker Canal de denúncia", (await kicker()) === "Canal de denúncia");
check("cena 7: CTA vira Começar a usar", (await page.locator("#onb-overlay #onb-cta").innerText()).includes("Começar a usar"));
check("Pular oculto na última cena", !(await page.locator("#onb-overlay #onb-skip").isVisible()));
const barsPreenchidas = await page.locator("#onb-overlay #onb-bars > i.done, #onb-overlay #onb-bars > i.on").count();
check("todas as 7 barras preenchidas na última", barsPreenchidas === 7);
await page.screenshot({ path: `${OUT}/onboard-app-cena7.png` });

// ---------- concluir grava a chave e mostra o estado final; Explorar fecha ----------
await page.click("#onb-overlay #onb-cta"); // Começar a usar -> concluir
await page.waitForTimeout(200);
check("estado final visível após concluir", await page.locator("#onb-overlay #onb-done.on").count() === 1);
check("estado final: h2 com o nome do cadastro", (await page.locator("#onb-overlay #onb-done-t").textContent()).includes(primeiroNome));
check("estado final: nota aponta pra Conta", (await page.locator("#onb-overlay .onb-note").innerText()).includes("Conta"));
check("chave gravada ao concluir", await page.evaluate((KEY) => localStorage.getItem(KEY), KEY) === VERSAO);
await page.screenshot({ path: `${OUT}/onboard-app-final.png` });
await page.click("#onb-overlay #onb-explorar");
await page.waitForTimeout(300);
check("Explorar o portal fecha o overlay", await page.locator("#onb-overlay").count() === 0);

// ---------- gate NÃO reabre com a chave gravada (mesmo acesso) ----------
await page.evaluate(() => { state.view.page = "colab-home"; _renderAppNow(); });
await page.waitForTimeout(200);
check("re-render não reabre com chave gravada", await page.locator("#onb-overlay").count() === 0);

// ---------- reload NÃO mostra (chave persiste no localStorage) ----------
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => {
  _changelogChecado = true;
  if (!state.users.find((u) => u.id === "colab-guard"))
    state.users.push({ id: "colab-guard", usuario: "colab", senha: "x", role: "colaborador", nome: "Maria Onboarding", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("colab-guard", "x");
  document.querySelector("#acesso")?.remove();
  document.querySelector(".modal-backdrop button")?.click();
  state.termoAdesaoOk = true; state.termoCanalOk = true;
  state.view.page = "colab-home"; _renderAppNow();
});
await page.waitForTimeout(300);
check("reload com chave gravada NÃO mostra", await page.locator("#onb-overlay").count() === 0);

// ---------- "Rever a apresentação" da Conta reabre ----------
await page.evaluate(() => { state.view.page = "colab-conta"; _renderAppNow(); });
await page.waitForTimeout(300);
check("Conta tem a linha 'Rever a apresentação'", await page.locator('#view [data-acao="rever-onboarding"]').count() === 1);
await page.click('#view [data-acao="rever-onboarding"]');
await page.waitForTimeout(300);
check("Rever reabre o overlay", await page.locator("#onb-overlay").count() === 1);
check("reabre na cena 1", (await kicker()) === "Boas-vindas");
await page.screenshot({ path: `${OUT}/onboard-app-rever.png` });

// ---------- Pular grava e fecha (limpa a chave antes pra provar a gravação) ----------
await page.evaluate((KEY) => { try { localStorage.removeItem(KEY); } catch {} }, KEY);
await page.click("#onb-overlay #onb-skip");
await page.waitForTimeout(300);
check("Pular fecha o overlay", await page.locator("#onb-overlay").count() === 0);
check("Pular grava a chave", await page.evaluate((KEY) => localStorage.getItem(KEY), KEY) === VERSAO);

// ---------- gestor NUNCA vê ----------
await page.evaluate(() => {
  logout();
  login("admin", "admin");
  document.querySelector("#acesso")?.remove();
  document.querySelector(".modal-backdrop button")?.click();
  _renderAppNow();
});
await page.waitForTimeout(250);
check("gestor não tem overlay de onboarding", await page.locator("#onb-overlay").count() === 0);

console.log(log.join("\n"));
console.log("\n=== ERROS (" + errors.length + ") ===");
console.log(errors.length ? errors.join("\n") : "nenhum");
await browser.close();
process.exit(errors.length ? 1 : 0);
