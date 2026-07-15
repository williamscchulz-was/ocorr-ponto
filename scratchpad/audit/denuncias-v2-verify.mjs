// Probe DENÚNCIAS v2 no app DEMO (8081, sem firebase). Cobre:
//  - lacre dourado aparece com denúncia 'nova' e some ao abrir a tela;
//  - concluir SEM desfecho bloqueia com erro inline FIXO (modal não fecha);
//  - concluir com desfecho salva e o rodapé mostra a data prevista de expurgo (+5 anos);
//  - toggle Guarda permanente muda o rodapé e faz aparecer o selo;
//  - botão "Excluir de vez" AUSENTE do modal;
//  - re-render idêntico da lista (#view no-op);
//  - zero pageerror; screenshots do lacre e do modal (claro e escuro).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "scratchpad/audit/out";
mkdirSync(OUT, { recursive: true });
const errors = [];
const log = [];
const check = (name, cond) => { log.push((cond ? "PASS " : "FAIL ") + name); if (!cond) errors.push("CHECK FAIL: " + name); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
p.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  // Ruído deliberado: abortamos firebase.config.js e gstatic pra forçar o modo demo.
  if (/ERR_FAILED|Failed to load resource|net::/.test(t)) return;
  errors.push("console.error: " + t.slice(0, 200));
});
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

// ---- login admin + injeta denúncias de teste ----
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
  const umAnoAtras = new Date(); umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  state.denuncias = [
    { id: "d-nova", categoria: "assedio-moral", texto: "Relato de teste ainda nova, aguardando triagem.", hash: "a".repeat(40), em: iso(new Date()), status: "nova" },
    { id: "d-analise", categoria: "seguranca", texto: "Relato em analise pela direcao.", hash: "b".repeat(40), em: iso(new Date()), status: "em_analise" },
    { id: "d-concl", categoria: "outro", texto: "Relato ja concluido ha um ano.", hash: "c".repeat(40), em: iso(umAnoAtras), status: "concluida", desfecho: "improcedente", concluidaEm: iso(umAnoAtras) },
  ];
  state.denunciasNovas = 1;
  state._denCarregado = true;   // evita lazy-load (inexistente no demo)
  state._denVisto = false;      // lacre ainda não visto
  state.view.page = "visao-geral";
  _renderAppNow();
});
await p.waitForTimeout(200);

// ---- 1) LACRE aparece com 'nova' e não estando na tela ----
const lacreItem = p.locator('#nav .nav__item--lacre[aria-label="Denúncias"]');
check("lacre dourado no item Denúncias (há nova, não aberto)", await lacreItem.count() === 1);
// Enquadra o item Denúncias (com vizinhos) pra o filete dourado aparecer claro.
const shotLacre = async (arq) => {
  await lacreItem.scrollIntoViewIfNeeded();
  const box = await lacreItem.boundingBox();
  const clip = box
    ? { x: 0, y: Math.max(0, box.y - 130), width: Math.min(360, box.x + box.width + 24), height: 300 }
    : undefined;
  await p.screenshot({ path: arq, clip });
};
await shotLacre(`${OUT}/denuncias-v2-lacre-claro.png`);

// dark: mesmo estado, tema escuro do gestor
await p.evaluate(() => { document.documentElement.classList.add("cp-dark"); document.documentElement.classList.remove("modo-colab"); });
await p.waitForTimeout(120);
await shotLacre(`${OUT}/denuncias-v2-lacre-escuro.png`);
await p.evaluate(() => document.documentElement.classList.remove("cp-dark"));

// ---- 2) abrir a tela ZERA o lacre ----
await p.evaluate(() => { state.view.page = "denuncias"; _renderAppNow(); });
await p.waitForTimeout(200);
check("lacre some ao abrir a tela de Denúncias", await p.locator('#nav .nav__item--lacre').count() === 0);
check("3 cards na lista", await p.locator("#view .den-card").count() === 3);

// re-render idêntico (#view no-op)
const antes = await p.evaluate(() => document.querySelector("#view").innerHTML);
await p.evaluate(() => _renderAppNow());
await p.waitForTimeout(50);
const depois = await p.evaluate(() => document.querySelector("#view").innerHTML);
check("re-render idêntico da lista (#view no-op)", antes === depois);

// ---- 3) concluir SEM desfecho bloqueia com erro inline fixo ----
await p.locator('#view .den-card[data-den-card="d-nova"]').click();
await p.waitForTimeout(200);
check("modal abre", await p.locator("#modal-root .den-mdl").count() === 1);
check("botão 'Excluir de vez' AUSENTE do modal", await p.locator("#modal-root #den-excluir, #modal-root .btn--danger-ghost").count() === 0);
check("aviso vermelho .den-lgpd AUSENTE do modal", await p.locator("#modal-root .den-lgpd").count() === 0);
check("desfecho oculto enquanto não é Concluída", await p.locator("#modal-root #den-desfecho").isHidden());
await p.locator('#modal-root [data-den-st="concluida"]').click();
await p.waitForTimeout(120);
check("bloco de desfecho aparece ao marcar Concluída", await p.locator("#modal-root #den-desfecho").isVisible());
await p.locator("#modal-root #den-salvar").click();
await p.waitForTimeout(150);
check("salvar sem desfecho NÃO fecha o modal", await p.locator("#modal-root .den-mdl").count() === 1);
check("erro inline fixo visível (den-desfecho.pendente)", await p.locator("#modal-root #den-desfecho.pendente").count() === 1);
check("hint 'Escolha o desfecho' visível", await p.locator("#modal-root .den-req-hint").isVisible());
await p.locator("#modal-root .modal").screenshot({ path: `${OUT}/denuncias-v2-modal-erro-claro.png` });

// escolhe desfecho -> erro some -> salva
await p.locator('#modal-root [data-den-df="procedente"]').click();
await p.waitForTimeout(80);
check("erro some ao escolher desfecho", await p.locator("#modal-root #den-desfecho.pendente").count() === 0);
await p.locator("#modal-root #den-salvar").click();
await p.waitForTimeout(250);
check("modal fecha ao salvar com desfecho", await p.locator("#modal-root .den-mdl").count() === 0);
check("d-nova virou concluída no state", await p.evaluate(() => state.denuncias.find((x) => x.id === "d-nova")?.status === "concluida"));
check("denunciasNovas recomputado para 0", await p.evaluate(() => state.denunciasNovas === 0));

// ---- 4) rodapé de retenção com data +5 anos (denúncia já concluída) ----
await p.locator('#view .den-card[data-den-card="d-concl"]').click();
await p.waitForTimeout(200);
const footTxt = (await p.locator("#modal-root #den-ret-slot").textContent()).replace(/\s+/g, " ").trim();
check("rodapé mostra retenção de 5 anos", /5\s*anos/.test(footTxt));
check("rodapé mostra 'Expurgo previsto para'", /Expurgo previsto para/.test(footTxt));
check("desfecho pré-selecionado (improcedente)", await p.locator('#modal-root [data-den-df="improcedente"].sel').count() === 1);
await p.locator("#modal-root .modal").screenshot({ path: `${OUT}/denuncias-v2-modal-concluida-claro.png` });

// ---- 5) toggle Guarda permanente muda o rodapé e mostra o selo ----
check("selo Permanente ausente antes de ligar", await p.locator("#modal-root .den-perm-tag").count() === 0);
await p.locator("#modal-root #den-perm").click();
await p.waitForTimeout(120);
check("toggle liga (aria-checked=true)", await p.locator('#modal-root #den-perm[aria-checked="true"]').count() === 1);
check("rodapé vira 'Guarda permanente' (não expira)", await p.locator("#modal-root .den-retencao--perm").count() === 1);
check("selo Permanente aparece no header do modal", await p.locator("#modal-root .den-perm-tag").count() === 1);
await p.locator("#modal-root .modal").screenshot({ path: `${OUT}/denuncias-v2-modal-permanente-claro.png` });

// dark: mesmo modal permanente
await p.evaluate(() => { document.documentElement.classList.add("cp-dark"); document.documentElement.classList.remove("modo-colab"); });
await p.waitForTimeout(150);
await p.locator("#modal-root .modal").screenshot({ path: `${OUT}/denuncias-v2-modal-permanente-escuro.png` });
await p.evaluate(() => document.documentElement.classList.remove("cp-dark"));

// ---- 6) salvar com permanente ON -> selo no card da lista ----
await p.locator("#modal-root #den-salvar").click();
await p.waitForTimeout(250);
check("modal fecha ao salvar", await p.locator("#modal-root .den-mdl").count() === 0);
check("guardaPermanente persistido no state", await p.evaluate(() => state.denuncias.find((x) => x.id === "d-concl")?.guardaPermanente === true));
check("selo Permanente no card da lista após salvar", await p.locator('#view .den-card[data-den-card="d-concl"] .den-perm-tag').count() === 1);

console.log(log.join("\n"));
console.log("\n=== ERROS (" + errors.length + ") ===");
console.log(errors.length ? errors.join("\n") : "nenhum");
await b.close();
process.exit(errors.length ? 1 : 0);
