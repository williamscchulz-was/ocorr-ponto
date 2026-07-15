// PROBE do GESTOR (public/index.html, modo demo) na 8081. Verifica: sub-aba Benefícios com
// os 8 padrão; formulário da vaga com checkboxes de benefícios (marcado + toggle); card da
// candidatura v4 com campos novos + botão "Ver ficha completa"; modal da ficha completa com
// dados novos + XSS ESCAPADO; candidatura v3 antiga degrada sem quebrar.
import { chromium } from "playwright";

const fails = [], ok = [];
const check = (c, m) => { (c ? ok : fails).push(m); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

await p.evaluate(() => { _changelogChecado = true; const u = state.users.find((x) => x.role === "admin"); login(u.id, u.senha); });
await p.waitForFunction(() => state?.currentUserId);
await p.evaluate(() => { document.querySelector(".modal-backdrop button")?.click(); document.querySelector("#acesso")?.remove(); });

const XSS = '<img src=x onerror=alert(1)>';
const res = await p.evaluate((XSS) => {
  const out = {};
  // ---- seed: vaga + candidaturas (v4 completa com XSS, v3 antiga) ----
  const v4 = {
    id: "cand-v4", vagaId: "v1", vagaTitulo: "Auxiliar de Produção",
    nome: XSS + " Ana Paula", telefone: "(47) 9 9812-3344", email: "ana@email.com", mensagem: "",
    nascimento: "1994-03-12", estadoCivil: "casado", escolaridade: "medio-completo", filhos: 2,
    endereco: "Rua das Palmeiras, 240 · Warnow · Indaial, SC · CEP 89120-000",
    nacionalidade: "Brasileira", naturalidade: "Blumenau, SC",
    experiencias: [{ empresa: XSS + " Tecelagem", admissao: "2019-03-04", demissao: "2023-08-18", salario: 1850, motivoSaida: "Pedido de demissão" }],
    pretensaoSalarial: 1900, comoViria: "moto", indicacao: XSS + " João",
    disc: { d: 3, i: -1, s: 2, c: 4 }, discPrimario: "C", em: "2026-07-15T12:00:00",
  };
  const v3 = { id: "cand-v3", vagaId: "v1", vagaTitulo: "Auxiliar de Produção", nome: "Bruno Velho", telefone: "47999990000", email: "bruno@x.com", mensagem: "", nascimento: "1990-01-01", disc: { d: 1, i: 1, s: 1, c: 1 }, discPrimario: "equilibrado", em: "2026-07-10T09:00:00" };
  state.vagas = [{ id: "v1", titulo: "Auxiliar de Produção", setor: "Produção", turno: "1º turno", status: "publicada", publicadaEm: "2026-07-14", beneficios: ["Vale alimentação", "Plano de saúde"] }];
  state.candidaturas = [v4, v3];
  state.vagasConfig = {};
  state.view.page = "vagas";

  // ---- A) sub-aba Benefícios: 8 padrão ----
  state.view.vagaSubtab = "beneficios"; state.view.vagaEdit = null;
  _renderAppNow();
  const catItens = [...document.querySelectorAll("#view .g-cat-it")];
  out.catCount = catItens.length;
  out.cat0 = catItens[0]?.querySelector("b")?.textContent || "";
  out.temInput = !!document.querySelector("#g-cat-input");
  out.temSubtabs = document.querySelectorAll("#view .g-subtab").length;

  // ---- B) formulário da vaga: benefícios em checkboxes ----
  state.view.vagaSubtab = "vagas"; state.view.vagaEdit = "v1";
  _renderAppNow();
  const bens = [...document.querySelectorAll("#vg-ben .g-ben-it")];
  out.benCount = bens.length;
  out.benMarcados = bens.filter((x) => x.classList.contains("on")).map((x) => x.dataset.ben);
  // toggle: liga um item que estava desligado
  const desligado = bens.find((x) => !x.classList.contains("on"));
  out.toggleAntes = desligado?.classList.contains("on");
  desligado?.click();
  out.toggleDepois = desligado?.classList.contains("on");

  // ---- C) card da candidatura v4 (painel aberto) ----
  state.view.vagaEdit = null; state.view.vagaCandAberta = "v1";
  _renderAppNow();
  const viewHtml = document.querySelector("#view").innerHTML;
  out.cardTemFicha = viewHtml.includes("Ver ficha completa");
  out.cardTemPretensao = viewHtml.includes("Pretensão");
  out.cardEscolaridade = viewHtml.includes("Médio completo");
  out.cardXssEscapado = viewHtml.includes("&lt;img") && !viewHtml.includes("<img src=x onerror");
  // v3 antiga não deve ter botão de ficha (sem campos v4) nem quebrar
  out.v3SemErroRender = viewHtml.includes("Bruno Velho");

  // ---- D) modal Ver ficha completa (v4) ----
  openFichaModal(v4);
  const modal = document.querySelector("#modal-root .modal");
  out.modalAbriu = !!modal;
  const mHtml = modal ? modal.innerHTML : "";
  out.modalCidade = mHtml.includes("Indaial, SC");
  out.modalEstadoCivil = mHtml.includes("Casado(a)");
  out.modalComoViria = mHtml.includes("Moto");
  out.modalExp = mHtml.includes("Tecelagem");
  out.modal2col = !!document.querySelector("#modal-root .modal--wide") && !!document.querySelector("#modal-root .ficha-grid");
  out.modalXssEscapado = mHtml.includes("&lt;img") && !mHtml.includes("<img src=x onerror");
  out.modalSalario = mHtml.includes("1.850") || mHtml.toLowerCase().includes("salário");
  closeModal();

  // ---- E) modal com candidatura v3 antiga: degrada sem quebrar ----
  let v3ok = true, v3msg = "";
  try {
    openFichaModal(v3);
    const m3 = document.querySelector("#modal-root .modal");
    v3msg = m3 ? m3.innerHTML : "";
    closeModal();
  } catch (e) { v3ok = false; v3msg = String(e); }
  out.v3ModalOk = v3ok;
  out.v3SemExp = v3msg.includes("Sem histórico de experiências");

  return out;
}, XSS);

check(res.temSubtabs === 2, "2 sub-abas (Vagas | Benefícios)");
check(res.catCount === 8, "sub-aba Benefícios com 8 itens padrão (" + res.catCount + ")");
check(res.cat0 === "Vale alimentação", "1º item do catálogo = Vale alimentação (" + res.cat0 + ")");
check(res.temInput, "campo de adicionar benefício presente");
check(res.benCount === 8, "formulário da vaga com 8 checkboxes de benefício (" + res.benCount + ")");
check(res.benMarcados.includes("Vale alimentação") && res.benMarcados.includes("Plano de saúde") && res.benMarcados.length === 2, "benefícios da vaga vêm marcados (" + res.benMarcados.join(", ") + ")");
check(res.toggleAntes === false && res.toggleDepois === true, "checkbox de benefício alterna ao clicar");
check(res.cardTemFicha, "card v4 mostra 'Ver ficha completa'");
check(res.cardTemPretensao, "card v4 mostra Pretensão");
check(res.cardEscolaridade, "card v4 mostra escolaridade (Médio completo)");
check(res.cardXssEscapado, "XSS do card ESCAPADO");
check(res.v3SemErroRender, "candidatura v3 antiga renderiza no card sem quebrar");
check(res.modalAbriu, "modal Ver ficha completa abriu");
check(res.modal2col, "modal é wide + ficha-grid (2 colunas)");
check(res.modalEstadoCivil, "modal mostra estado civil por extenso (Casado(a))");
check(res.modalComoViria, "modal mostra como viria por extenso (Moto)");
check(res.modalCidade, "modal mostra endereço");
check(res.modalExp, "modal mostra experiência (Tecelagem)");
check(res.modalXssEscapado, "XSS do modal ESCAPADO");
check(res.v3ModalOk, "modal da candidatura v3 antiga NÃO quebra");
check(res.v3SemExp, "candidatura v3 sem experiências -> nota 'Sem histórico'");

await b.close();
console.log("OK (" + ok.length + "):");
ok.forEach((m) => console.log("  ✓ " + m));
if (jsErros.length) console.log("\npageErrors:\n  " + jsErros.join("\n  "));
if (fails.length || jsErros.length) { console.log("\nFALHAS:"); fails.forEach((m) => console.log("  ✗ " + m)); if (jsErros.length) console.log("  ✗ houve pageError"); process.exit(1); }
console.log("\nPROBE GESTOR FICHA: PASSOU (" + ok.length + " asserções).");
