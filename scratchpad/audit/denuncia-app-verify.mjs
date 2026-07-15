// Verificação da implementação do CANAL DE DENÚNCIA no APP (não o mock).
// Demo/local: stub de window.enviarDenuncia + injeção de state.denuncias.
// Uso: node scratchpad/audit/denuncia-app-verify.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:8081/public/index.html";
const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });

const errors = [];
const log = [];
const check = (name, cond) => { log.push((cond ? "PASS " : "FAIL ") + name); if (!cond) errors.push("CHECK FAIL: " + name); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 920 }, deviceScaleFactor: 2, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
page.on("dialog", (d) => { errors.push("DIALOG (XSS?) : " + d.message()); d.dismiss().catch(() => {}); });

await page.goto(BASE, { waitUntil: "networkidle" });

// ---- login como COLABORADOR (demo) ----
await page.evaluate(() => {
  _changelogChecado = true;
  state.users.push({ id: "colab-guard", usuario: "colab", senha: "x", role: "colaborador", nome: "Maria Colab", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("colab-guard", "x");
  state.view.page = "colab-home";
  _renderAppNow();
  document.querySelector("#acesso")?.remove();
  document.querySelector(".modal-backdrop button")?.click();
});
await page.waitForTimeout(300);

// card de entrada na home
check("card de entrada na home", await page.locator("#view [data-den-abrir]").count() === 1);
await page.click("#view [data-den-abrir]");
await page.waitForTimeout(300);

// ETAPA 1: acolhimento
check("etapa1 acolhimento (Lei 14.457)", (await page.locator("#view .den-lei").innerText()).includes("14.457"));
check("etapa1 bloco LGPD presente", await page.locator("#view .den-lgpd").count() === 1);
check("etapa1 tem 3 garantias", await page.locator("#view .den-guar").count() === 3);
await page.screenshot({ path: `${OUT}/denuncia-app-colab-etapa1.png` });
await page.click("#view [data-den-comecar]");
await page.waitForTimeout(250);

// ETAPA 2: relato
check("etapa2 tem 7 categorias", await page.locator("#view .den-chip").count() === 7);
check("continuar desabilitado sem dados", await page.locator("#view #den-continuar").isDisabled());
await page.click("#view .den-chip:nth-child(1)");
const TXT = "Um lider faz comentarios constrangedores na troca de turno, na frente de outras pessoas.";
await page.fill("#view #den-ta", TXT);
await page.waitForTimeout(100);
check("contador reflete o texto", (await page.locator("#view #den-count").innerText()).startsWith(String(TXT.length)));
check("continuar habilita com cat+texto", !(await page.locator("#view #den-continuar").isDisabled()));
// TEXTO SOBREVIVE a _renderAppNow no meio
await page.evaluate(() => _renderAppNow());
await page.waitForTimeout(120);
check("texto sobrevive a _renderAppNow", (await page.locator("#view #den-ta").inputValue()) === TXT);
check("categoria selecionada sobrevive", await page.locator("#view .den-chip.on").count() === 1);
await page.screenshot({ path: `${OUT}/denuncia-app-colab-etapa2.png` });
await page.click("#view [data-den-continuar]");
await page.waitForTimeout(250);

// ETAPA 3: identificação
check("etapa3 anonimo default selecionado", (await page.locator('#view [data-den-ident="0"]').getAttribute("class")).includes("sel"));
check("campo contato oculto por padrao", await page.locator("#view #den-contato").isHidden());
await page.click('#view [data-den-ident="1"]');
await page.waitForTimeout(200);
check("contato aparece ao identificar", await page.locator("#view #den-contato").isVisible());
await page.screenshot({ path: `${OUT}/denuncia-app-colab-etapa3.png` });
// volta a anonimo pra enviar anônimo
await page.click('#view [data-den-ident="0"]');
await page.waitForTimeout(150);
check("volta anonimo esconde contato", await page.locator("#view #den-contato").isHidden());

// stub do envio e ENVIAR -> cerimônia
await page.evaluate(() => { window.enviarDenuncia = async () => ({ hash: "abc123def456abc123def456abc123def456abc123def456abc123def456aaaa" }); });
await page.click("#view [data-den-enviar]");
await page.waitForTimeout(1400);
check("cerimonia: titulo Denuncia recebida", (await page.locator("#view .den-cer__t").innerText()).includes("Denúncia recebida"));
check("cerimonia: hash exibido", (await page.locator("#view #den-hash").innerText()).includes("abc123def456"));
check("cerimonia: texto do hash calibrado", (await page.locator("#view .den-cer__s").innerText()).includes("código de integridade") && (await page.locator("#view .den-cer__s").innerText()).includes("não foi alterado"));
check("cerimonia: selo anonima", (await page.locator("#view .den-cer__prot").innerText()).includes("anônima"));
check("cerimonia: botao copiar codigo", await page.locator("#view [data-den-copiar]").count() === 1);
await page.screenshot({ path: `${OUT}/denuncia-app-colab-cerimonia.png` });
// voltar ao inicio limpa o fluxo
await page.click("#view [data-den-inicio]");
await page.waitForTimeout(250);
check("voltar ao inicio -> home", await page.locator("#view [data-den-abrir]").count() === 1);
check("residuo limpo (denTexto vazio)", await page.evaluate(() => (state.view.denTexto || "") === "" && state.view.denEnviada === false));

// ================= ADMIN =================
await page.setViewportSize({ width: 1280, height: 900 });
await page.evaluate(() => {
  logout();
  login("admin", "admin");
  document.querySelector("#acesso")?.remove();
  document.querySelector(".modal-backdrop button")?.click();
  // injeta denúncias fake (uma com XSS no texto, uma identificada)
  const iso = new Date("2026-07-14T08:14:00").toISOString();
  state.denuncias = [
    { id: "dx", categoria: "assedio-sexual", texto: "Primeira linha do relato.\nSegunda com payload <b>xss</b> <script>alert(1)</script> fim.", hash: "deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb", em: iso, status: "nova" },
    { id: "dy", categoria: "seguranca", texto: "Saida de emergencia bloqueada por paletes ha uma semana.", hash: "aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44ee55ff66aa11bb22cc33dd44", em: iso, status: "nova", contato: "Joao (47) 9 9999-0000" },
    { id: "dz", categoria: "fraude", texto: "Horas extras lancadas em nome de gente de ferias.", hash: "99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa", em: iso, status: "em_analise" },
  ];
  state._denCarregado = true; // evita loader (inexistente no demo)
  state.view.page = "denuncias";
  _renderAppNow();
});
await page.waitForTimeout(300);

// nav item presente pra admin
check("nav Denuncias presente (admin)", await page.locator('#nav [data-page="denuncias"]').count() === 1);
check("3 cards na lista", await page.locator("#view .den-card").count() === 3);
check("contador '2 novas'", (await page.locator("#view .den-counter b").innerText()).trim() === "2");
check("aviso caixa reservada", (await page.locator("#view .den-adminaviso").innerText()).includes("GP e líderes não têm acesso"));
check("card identificada mostra selo", await page.locator('#view .den-card[data-den-card="dy"] .den-selo--ident').count() === 1);
await page.screenshot({ path: `${OUT}/denuncia-app-admin-lista.png` });

// filtro: Concluídas -> 0 cards; Novas -> 2
await page.click('#view [data-den-filt="concluidas"]');
await page.waitForTimeout(150);
check("filtro concluidas -> vazio de filtro", await page.locator("#view .den-empty--filtro").count() === 1);
await page.click('#view [data-den-filt="novas"]');
await page.waitForTimeout(150);
check("filtro novas -> 2 cards", await page.locator("#view .den-card").count() === 2);
await page.click('#view [data-den-filt="todas"]');
await page.waitForTimeout(150);

// abre detalhe do card com XSS
await page.click('#view .den-card[data-den-card="dx"]');
await page.waitForTimeout(250);
check("detalhe: selo Relato integro", (await page.locator("#modal-root .den-integ").innerText()).includes("Relato íntegro"));
check("detalhe: hash completo", (await page.locator("#modal-root .den-integ__hash").innerText()).includes("deadbeef"));
// XSS: o texto aparece como TEXTO (escapado), sem <b> real nem script
check("XSS: texto escapado visivel", (await page.locator("#modal-root .den-ptext").innerText()).includes("<b>xss</b>"));
check("XSS: sem elemento <b> injetado", await page.locator("#modal-root .den-ptext b").count() === 0);
check("XSS: sem <script> injetado", await page.locator("#modal-root .den-ptext script").count() === 0);
check("detalhe: contato anonimo sem-dados", await page.locator("#modal-root .den-contact-none").count() === 1);
await page.screenshot({ path: `${OUT}/denuncia-app-admin-detalhe.png` });
await page.locator("#modal-root [data-close]").click();
await page.waitForTimeout(200);

// detalhe identificada: selo "não verificado"
await page.click('#view .den-card[data-den-card="dy"]');
await page.waitForTimeout(250);
check("detalhe identificada: selo nao verificado", (await page.locator("#modal-root .den-contact").innerText()).includes("não verificado"));
// triagem: muda status pra Em análise e salva
await page.click('#modal-root .den-stopt[data-v="em_analise"]');
await page.fill("#modal-root #den-nota", "Encaminhado ao juridico.");
await page.click("#modal-root #den-salvar");
await page.waitForTimeout(350);
check("triagem salva refletiu status", await page.evaluate(() => (state.denuncias.find((d) => d.id === "dy") || {}).status === "em_analise"));
check("triagem salva nota", await page.evaluate(() => ((state.denuncias.find((d) => d.id === "dy") || {}).nota || "").includes("juridico")));
check("contador cai pra 1 apos triagem", (await page.locator("#view .den-counter b").innerText()).trim() === "1");

// ================= RH não vê o nav =================
await page.evaluate(() => {
  logout();
  login("rh1", "rh1");
  document.querySelector("#acesso")?.remove();
  document.querySelector(".modal-backdrop button")?.click();
  _renderAppNow();
});
await page.waitForTimeout(250);
check("nav Denuncias AUSENTE (rh)", await page.locator('#nav [data-page="denuncias"]').count() === 0);
// rh tentando entrar via rota é redirecionado
await page.evaluate(() => { state.view.page = "denuncias"; _renderAppNow(); });
await page.waitForTimeout(150);
check("rota denuncias bloqueada pra rh (redirect)", await page.evaluate(() => state.view.page !== "denuncias"));

console.log(log.join("\n"));
console.log("\n=== ERROS (" + errors.length + ") ===");
console.log(errors.length ? errors.join("\n") : "nenhum");
await browser.close();
process.exit(errors.length ? 1 : 0);
