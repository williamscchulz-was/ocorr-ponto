// ============================================================
// PROBE — Funil de status + mensagem ao candidato (fase 1)
// ------------------------------------------------------------
// Roda o app LOGADO (gestor) no harness demo, injeta vagas+candidaturas e um
// STUB de window.atualizarStatusCandidatura, e prova o contrato da cena 1 do
// mock funil-email-2026-07:
//  - o funil renderiza com o status ATUAL ativo; legado (status 'nova') = Recebida;
//  - clicar "Em análise" persiste (stub recebe SÓ status) e acende o botão;
//  - Email gera mailto com assunto+corpo EXATOS de docs/emails-candidato-2026-07-v1.md;
//  - WhatsApp gera wa.me com 55+dígitos e o MESMO corpo (sem assunto);
//  - XSS em nome/vaga escapado no DOM e nas URLs;
//  - re-render nasce idêntico; zero pageerror.
// Screenshots em out/: funil-app-{recebida,analise}-claro.png + analise-escuro.png.
//
// Uso: node scratchpad/audit/funil-app-verify.mjs
// ============================================================
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { abrirContexto, seedGestor, iniciarServidor, pararServidor, screenshot, coletarErros, BASE_URL } from "./harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MD = readFileSync(path.join(__dirname, "..", "..", "docs", "emails-candidato-2026-07-v1.md"), "utf8");

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok  " : "FALHA ") + msg); if (!cond) falhas++; };

// --- Oracle: deriva assunto+corpo do doc v1, mesma regra do app (parágrafos por linha
// em branco; último bloco = assinatura, preserva a quebra; os demais fluem). ---
function docMsg(key) {
  const sec = MD.split(/^## /m).map((s) => s.trim()).find((s) => s.startsWith(key));
  const lines = sec.split("\n");
  const aLine = lines.find((l) => /^Assunto:/.test(l));
  const assunto = aLine.replace(/^Assunto:\s*/, "").trim();
  const body = lines.slice(lines.indexOf(aLine) + 1).join("\n").trim();
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const paras = blocks.map((b, i) => (i === blocks.length - 1 ? b : b.replace(/\n/g, " ")));
  return { assunto, corpo: paras.join("\n\n") };
}
const fill = (s, nome, vaga) => s.replace(/\{\{nome\}\}/g, nome).replace(/\{\{vaga\}\}/g, vaga);
const DOCKEY = { recebida: "candidatura-recebida", "em-analise": "candidatura-em-analise", aprovada: "candidatura-aprovada", "nao-seguiu": "candidatura-nao-seguiu" };

const XSS_NOME = 'Ítalo <img src=x onerror="alert(1)">';
const XSS_VAGA = 'Op "<script>alert(2)</script>"';

async function main() {
  await iniciarServidor();
  const { browser, page } = await abrirContexto({ viewport: "desktop" });
  page.on("dialog", (d) => d.dismiss().catch(() => {})); // XSS payload nunca deve disparar, mas guarda
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await seedGestor(page);

  // ---- injeta vagas + candidaturas + stub e renderiza a tela Vagas com o painel aberto ----
  await page.evaluate(({ xssNome, xssVaga }) => {
    const iso = new Date().toISOString();
    state.vagas = [{ id: "vX", titulo: "Controlador de Materiais", setor: "Almoxarifado", turno: "1º turno", cidade: "Indaial, SC", status: "publicada", publicadaEm: iso }];
    state.candidaturas = [
      { id: "vX__ana@mail.com", vagaId: "vX", vagaTitulo: "Controlador de Materiais", nome: "Ana Carolina Duarte", telefone: "(47) 9 9614-2085", email: "ana.duarte@email.com", status: "recebida", em: iso },
      { id: "vX__legado@mail.com", vagaId: "vX", vagaTitulo: "Controlador de Materiais", nome: "Bruno Legado", telefone: "47988887777", email: "bruno@mail.com", status: "nova", em: iso },
      { id: "vX__xss@mail.com", vagaId: "vX", vagaTitulo: xssVaga, nome: xssNome, telefone: "47999990000", email: "xss@mail.com", status: "recebida", em: iso },
    ];
    // STUB: registra as chamadas e o nº de argumentos (prova "update SÓ de status").
    window.__stub = [];
    window.atualizarStatusCandidatura = async function (id, status) {
      window.__stub.push({ id, status, argc: arguments.length });
      const c = state.candidaturas.find((x) => x.id === id);
      if (c) c.status = status;
    };
    state.view.page = "vagas";
    state.view.vagaCandAberta = "vX";
    state.view.candMsgAceso = undefined;
    _renderAppNow();
  }, { xssNome: XSS_NOME, xssVaga: XSS_VAGA });

  // ---- A) funil renderiza com o status atual ativo; legado = Recebida ----
  const estadoInicial = await page.evaluate(() => {
    const ativo = (id) => { const el = document.querySelector(`[data-cand-id="${id}"].on`); return el ? el.dataset.candSt : null; };
    return {
      ana: ativo("vX__ana@mail.com"),
      legado: ativo("vX__legado@mail.com"),
      xss: ativo("vX__xss@mail.com"),
      temFunil: !!document.querySelector(".g-cand__funil"),
      nSeg: document.querySelectorAll('[data-cand-id="vX__ana@mail.com"][data-cand-st]').length,
    };
  });
  ok(estadoInicial.temFunil, "funil presente no card");
  ok(estadoInicial.nSeg === 4, `4 passos no segmented (achou ${estadoInicial.nSeg})`);
  ok(estadoInicial.ana === "recebida", `status atual ativo (Ana=recebida, achou ${estadoInicial.ana})`);
  ok(estadoInicial.legado === "recebida", `legado (status 'nova') = Recebida (achou ${estadoInicial.legado})`);

  await screenshot(page, "funil-app-recebida-claro.png");

  // ---- B) re-render idêntico (estado inicial, sem aceso) ----
  const identA = await page.evaluate(() => {
    const a = document.querySelector("#view").innerHTML;
    _renderAppNow();
    return a === document.querySelector("#view").innerHTML;
  });
  ok(identA, "re-render idêntico (estado inicial)");

  // ---- C) clicar "Em análise" na Ana: persiste (stub só status) + acende o botão ----
  await page.click('[data-cand-id="vX__ana@mail.com"][data-cand-st="em-analise"]');
  await page.waitForTimeout(50);
  const posMove = await page.evaluate(() => {
    const el = document.querySelector('[data-cand-id="vX__ana@mail.com"].on');
    const btn = document.querySelector('[data-cand-msg="vX__ana@mail.com"]');
    return {
      stub: window.__stub,
      ativo: el ? el.dataset.candSt : null,
      aceso: !!btn && btn.classList.contains("aceso"),
    };
  });
  ok(posMove.stub.length === 1, `stub chamado 1x (achou ${posMove.stub.length})`);
  ok(posMove.stub[0] && posMove.stub[0].id === "vX__ana@mail.com" && posMove.stub[0].status === "em-analise", "stub recebeu (id da Ana, 'em-analise')");
  ok(posMove.stub[0] && posMove.stub[0].argc === 2, `stub recebeu SÓ status (argc=2, achou ${posMove.stub[0] && posMove.stub[0].argc})`);
  ok(posMove.ativo === "em-analise", `funil ativo agora Em análise (achou ${posMove.ativo})`);
  ok(posMove.aceso, "botão 'Mensagem ao candidato' acendeu (aceso)");

  await screenshot(page, "funil-app-analise-claro.png");

  // ---- D) re-render idêntico COM aceso (estado persistente reproduzido) ----
  const identB = await page.evaluate(() => {
    const a = document.querySelector("#view").innerHTML;
    _renderAppNow();
    return a === document.querySelector("#view").innerHTML;
  });
  ok(identB, "re-render idêntico (com botão aceso)");

  // ---- E) Email/WhatsApp: URLs EXATAS do doc v1, pros 4 status ----
  for (const st of ["recebida", "em-analise", "aprovada", "nao-seguiu"]) {
    const urls = await page.evaluate((status) => {
      const c = state.candidaturas.find((x) => x.id === "vX__ana@mail.com");
      c.status = status;
      _renderAppNow();
      document.querySelector('[data-cand-msg="vX__ana@mail.com"]').click();
      const email = document.querySelector('.msg-canal__op[data-canal="email"]');
      const zap = document.querySelector('.msg-canal__op[data-canal="whatsapp"]');
      const r = { email: email ? email.href : null, zap: zap ? zap.getAttribute("href") : null };
      document.querySelector(".modal-backdrop--confirm [data-fechar]")?.click();
      return r;
    }, st);

    const esperado = docMsg(DOCKEY[st]);
    const nome = "Ana"; // primeiro nome de "Ana Carolina Duarte"
    const vaga = "Controlador de Materiais";
    const assuntoEsp = fill(esperado.assunto, nome, vaga);
    const corpoEsp = fill(esperado.corpo, nome, vaga);

    // mailto: decodifica subject/body
    const q = urls.email.slice(urls.email.indexOf("?") + 1);
    const params = new URLSearchParams(q);
    ok(urls.email.startsWith("mailto:ana.duarte%40email.com?") || urls.email.startsWith("mailto:ana.duarte@email.com?"), `[${st}] mailto pro email do candidato`);
    ok(params.get("subject") === assuntoEsp, `[${st}] assunto EXATO do doc v1`);
    ok(params.get("body") === corpoEsp, `[${st}] corpo EXATO do doc v1`);

    // wa.me: 55 + dígitos, texto = corpo (sem assunto)
    const waUrl = urls.zap.replace(/&amp;/g, "&");
    const waText = decodeURIComponent(waUrl.slice(waUrl.indexOf("text=") + 5));
    ok(/^https:\/\/wa\.me\/5547996142085\?text=/.test(waUrl), `[${st}] wa.me com 55+dígitos (5547996142085)`);
    ok(waText === corpoEsp, `[${st}] texto do WhatsApp = MESMO corpo (sem assunto)`);
  }

  // ---- F) XSS em nome/vaga escapado no DOM e nas URLs ----
  const xss = await page.evaluate(() => {
    const c = state.candidaturas.find((x) => x.id === "vX__xss@mail.com");
    c.status = "aprovada"; // corpo com {{vaga}} => payload da vaga flui pro body da URL
    _renderAppNow();
    // DOM do card XSS: nenhum <img>/<script> injetado; o nome completo (com payload)
    // aparece no cabeçalho SEMPRE via escapeHtml (o funil usa só o primeiro nome).
    const card = [...document.querySelectorAll(".g-cand")].find((el) => el.querySelector('[data-cand-id="vX__xss@mail.com"]'));
    const injImg = !!card.querySelector('img[src="x"]');
    const injScript = card.querySelectorAll("script").length;
    const idt = card.querySelector(".g-cand__idt b");
    const idtEscapado = idt.innerHTML.includes("&lt;img") && idt.textContent.includes("<img");
    // abre o chooser e lê as URLs (a vaga com <script> vai no body do mailto/wa)
    document.querySelector('[data-cand-msg="vX__xss@mail.com"]').click();
    const email = document.querySelector('.msg-canal__op[data-canal="email"]').href;
    const zap = document.querySelector('.msg-canal__op[data-canal="whatsapp"]').getAttribute("href");
    const chooserInjImg = !!document.querySelector(".modal-backdrop--confirm img[src='x'], .modal-backdrop--confirm script");
    document.querySelector(".modal-backdrop--confirm [data-fechar]")?.click();
    return { injImg, injScript, idtEscapado, email, zap, chooserInjImg };
  });
  ok(!xss.injImg && xss.injScript === 0, "XSS: nenhum elemento injetado no card do XSS");
  ok(xss.idtEscapado, "XSS: nome completo escapado no cabeçalho (&lt;img, texto cru no textContent)");
  ok(!xss.chooserInjImg, "XSS: nada injetado no chooser");
  ok(!/[<">]/.test(xss.email.slice(7)), "XSS: mailto sem < > \" crus (tudo percent-encoded)");
  ok(!/[<"]/.test(xss.zap), "XSS: wa.me sem < \" crus na URL");

  // ---- G) screenshot DARK (Em análise) ----
  await page.evaluate(() => {
    const c = state.candidaturas.find((x) => x.id === "vX__ana@mail.com");
    c.status = "em-analise";
    state.view.candMsgAceso = "vX__ana@mail.com";
    _renderAppNow(); // renderiza o estado; o tema recolore in-place logo abaixo
    // Dark do gestor = html.cp-dark:not(.modo-colab). Pela pref (localStorage) + cpAplicarTema,
    // que é como o app liga (o toggle manual é apagado pelo shell de acesso, ver app.js:892).
    try { localStorage.setItem("fiopulse:tema", "escuro"); } catch {}
    document.documentElement.classList.remove("modo-colab");
    if (typeof cpAplicarTema === "function") cpAplicarTema();
    else document.documentElement.classList.add("cp-dark");
  });
  await page.waitForTimeout(120);
  const darkOk = await page.evaluate(() => document.documentElement.classList.contains("cp-dark"));
  ok(darkOk, "tema escuro do gestor ativo (cp-dark)");
  await screenshot(page, "funil-app-analise-escuro.png");

  // ---- H) zero pageerror (erros reais, fora do ruído de rede bloqueada) ----
  const erros = (await coletarErros(page)).filter((e) => e.type === "pageerror");
  ok(erros.length === 0, `zero pageerror (achou ${erros.length}${erros.length ? ": " + JSON.stringify(erros).slice(0, 300) : ""})`);

  await browser.close();
  pararServidor();

  console.log(`\n${falhas === 0 ? "PASSOU" : falhas + " FALHA(S)"} — funil-app-verify`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); pararServidor(); process.exit(1); });
