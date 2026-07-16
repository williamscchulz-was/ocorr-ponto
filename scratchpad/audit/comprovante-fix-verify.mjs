// ============================================================
// comprovante-fix-verify.mjs — prova do fix do botão "Comprovante"
// ============================================================
// Bug (William, print, dark): documento assinado mostra "Comprovante" e o clique
// NÃO FAZ NADA (nem toast). Fix em 3 camadas:
//   1) autodiagnóstico: abrirComprovanteColab + handler da trilha ganham try/catch
//      próprio e toast ESPECÍFICO pela causa (código do Storage), nunca silêncio.
//   2) tolerância de pasta irmã na leitura (urlArquivoAssinado) — comprovante cujo
//      dono gravado no path não bate com a claim atual abre pela pasta certa.
//   3) trilha IMUTÁVEL: só leitura tolerante, nunca reescreve o arquivoPath.
//
// Este probe:
//   PARTE A — injeta o CÓDIGO REAL de urlArquivoAssinado (bytes de firebase.js) com
//             firebase.storage() stubado e testa a/b/c/e/f (a função vive dentro de
//             installFirebaseStore, que não roda no demo offline — por isso a injeção).
//   PARTE B — dirige os handlers REAIS do app (colab): toast por causa + viewer + o
//             try/catch que segura exceção inesperada. Screenshots do toast e do viewer.
//   PARTE C — handler REAL da trilha do gestor: passa o funcionarioId do assinante e
//             toast específico. Screenshot.
//
// Uso: node scratchpad/audit/comprovante-fix-verify.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { abrirContexto, seedColab, seedGestor, setTema, iniciarServidor, pararServidor, BASE_URL, OUT_DIR } from "./harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIREBASE_JS = path.join(__dirname, "..", "..", "public", "firebase.js");

// --- extrai o texto EXATO da função real (não reescreve nada) ---
const src = fs.readFileSync(FIREBASE_JS, "utf8");
const ini = src.indexOf("window.urlArquivoAssinado = async function");
const fim = src.indexOf("// ===== Disciplinares", ini);
if (ini < 0 || fim < 0) { console.error("FALHA: não achei urlArquivoAssinado no firebase.js"); process.exit(1); }
const FONTE_URL_ASSINADO = src.slice(ini, fim).trim();

const resultados = [];
const ok = (nome, cond, extra = "") => { resultados.push({ nome, pass: !!cond, extra }); console.log(`${cond ? "PASS" : "FALHA"} · ${nome}${extra ? " · " + extra : ""}`); };

// Instala o stub de Storage + injeta a fonte real da função. `behavior` mapeia
// path -> { url } | { throw: code }; default (path não listado) = object-not-found.
async function instalarUrlAssinadoReal(page, { uid = "uid-atual" } = {}) {
  await page.evaluate(({ fonte, uid }) => {
    window.__attempts = [];
    window.__behavior = {};
    window.auth = { currentUser: uid ? { uid } : null };
    window.firebase = {
      storage: () => ({
        ref: (p) => ({
          getDownloadURL: async () => {
            window.__attempts.push(p);
            const b = window.__behavior[p];
            if (b && b.url) return b.url;
            const code = (b && b.throw) || "storage/object-not-found";
            const e = new Error(code); e.code = code; throw e;
          },
        }),
      }),
    };
    // (re)define window.urlArquivoAssinado com os MESMOS bytes que firebase.js embarca
    (0, eval)(fonte);
  }, { fonte: FONTE_URL_ASSINADO, uid });
}

async function rodarUrl(page, { behavior, uid, arquivoPath, opts }) {
  return page.evaluate(async ({ behavior, uid, arquivoPath, opts }) => {
    window.__attempts = [];
    window.__behavior = behavior || {};
    if (uid !== undefined) window.auth = { currentUser: uid ? { uid } : null };
    const url = await window.urlArquivoAssinado(arquivoPath, opts);
    return { url, attempts: window.__attempts.slice(), erro: window.__ultimoErroStorage };
  }, { behavior, uid, arquivoPath, opts });
}

async function lerToast(page) {
  return page.evaluate(() => (document.getElementById("toast-root")?.textContent || "").trim());
}
async function limparToast(page) {
  await page.evaluate(() => { const r = document.getElementById("toast-root"); if (r) r.innerHTML = ""; });
}

(async () => {
  await iniciarServidor();
  const shots = [];
  try {
    // ================= PARTE A: urlArquivoAssinado REAL (unit, storage stub) =================
    {
      const { browser, page } = await abrirContexto({ viewport: "mobile", colorScheme: "dark" });
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await seedColab(page); // currentUser().funcionarioId === "f-100"
      await instalarUrlAssinadoReal(page, { uid: "uid-atual" });

      // (a) path aninhado certo abre direto, sem fallback
      let r = await rodarUrl(page, { arquivoPath: "documentos-assinados/f-100/doc9-v1.pdf",
        behavior: { "documentos-assinados/f-100/doc9-v1.pdf": { url: "data:ok-a" } } });
      ok("A(a) path aninhado certo -> url, 1 tentativa, sem erro",
        r.url === "data:ok-a" && r.attempts.length === 1 && r.erro === null, JSON.stringify(r.attempts));

      // (b) dono gravado (OLD) falha -> variante com funcionarioId atual (f-100) abre
      r = await rodarUrl(page, { arquivoPath: "documentos-assinados/OLD/doc9-v1.pdf",
        behavior: { "documentos-assinados/f-100/doc9-v1.pdf": { url: "data:ok-b" } } });
      ok("A(b) fallback pra pasta do funcionarioId atual",
        r.url === "data:ok-b" && r.attempts[0] === "documentos-assinados/OLD/doc9-v1.pdf"
          && r.attempts.includes("documentos-assinados/f-100/doc9-v1.pdf") && r.erro === null,
        JSON.stringify(r.attempts));

      // (b2) funcionarioId falha -> variante com uid abre (legado do fallback || uid)
      r = await rodarUrl(page, { uid: "uid-atual", arquivoPath: "documentos-assinados/OLD/doc9-v1.pdf",
        behavior: { "documentos-assinados/uid-atual/doc9-v1.pdf": { url: "data:ok-b2" } } });
      ok("A(b2) fallback pra pasta do uid atual",
        r.url === "data:ok-b2" && r.attempts.includes("documentos-assinados/uid-atual/doc9-v1.pdf"),
        JSON.stringify(r.attempts));

      // (c) tudo falha (object-not-found) -> null + erro = código do path ORIGINAL
      r = await rodarUrl(page, { arquivoPath: "documentos-assinados/OLD/doc9-v1.pdf", behavior: {} });
      ok("A(c) todas falham (not-found) -> null + erro do path original",
        r.url === null && r.erro === "storage/object-not-found", JSON.stringify(r));

      // (c2) path original com unauthorized -> erro preservado = unauthorized
      r = await rodarUrl(page, { arquivoPath: "documentos-assinados/OLD/doc9-v1.pdf",
        behavior: { "documentos-assinados/OLD/doc9-v1.pdf": { throw: "storage/unauthorized" } } });
      ok("A(c2) unauthorized no path original -> erro = unauthorized",
        r.url === null && r.erro === "storage/unauthorized", JSON.stringify(r));

      // (e) contexto gestor: opts.funcionarioId (assinante) é a 1ª variante tentada
      r = await rodarUrl(page, { arquivoPath: "documentos-assinados/OLD/doc9-v1.pdf",
        opts: { funcionarioId: "f-777" },
        behavior: { "documentos-assinados/f-777/doc9-v1.pdf": { url: "data:ok-e" } } });
      ok("A(e) gestor: abre pela pasta do funcionarioId do assinante",
        r.url === "data:ok-e" && r.attempts[1] === "documentos-assinados/f-777/doc9-v1.pdf" && r.erro === null,
        JSON.stringify(r.attempts));

      // (f) recibos: prefixo diferente -> ZERO variante, contrato url|null intacto
      r = await rodarUrl(page, { arquivoPath: "recibos/f-100/assinado/x-v1.pdf", behavior: {} });
      ok("A(f) recibos falho -> null e NENHUMA variante tentada",
        r.url === null && r.attempts.length === 1 && r.attempts[0] === "recibos/f-100/assinado/x-v1.pdf",
        JSON.stringify(r.attempts));
      r = await rodarUrl(page, { arquivoPath: "recibos/f-100/assinado/x-v1.pdf",
        behavior: { "recibos/f-100/assinado/x-v1.pdf": { url: "data:recibo" } } });
      ok("A(f) recibos ok -> url direto (call site de recibos preservado)",
        r.url === "data:recibo" && r.attempts.length === 1, JSON.stringify(r.attempts));

      await browser.close();
    }

    // ================= PARTE B: handlers REAIS do colaborador (demo, dark) =================
    {
      const { browser, page } = await abrirContexto({ viewport: "mobile", colorScheme: "dark" });
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await seedColab(page);
      await setTema(page, "escuro");
      // insere o documento assinado do print no state do colaborador
      await page.evaluate(() => {
        state.documentosColab = state.documentosColab || [];
        state.documentosColab.push({ id: "doc-assin", titulo: "Regulamento Interno 5a Ed", tipo: "regulamento",
          confirmacao: "assinatura", versao: 1,
          minhaAssinatura: { arquivoPath: "documentos-assinados/f-100/doc-assin-v1.pdf", versaoAssinada: 1 } });
      });

      // msgErroComprovante: mapa de causa (função REAL do app.js)
      const m = await page.evaluate(() => ({
        nf: msgErroComprovante("storage/object-not-found"),
        un: msgErroComprovante("storage/unauthorized"),
        outro: msgErroComprovante("storage/canceled"),
      }));
      ok("B mapa de causa: object-not-found", m.nf === "O comprovante desta assinatura não está no cofre.", m.nf);
      ok("B mapa de causa: unauthorized", m.un === "Sem permissão para abrir o comprovante.", m.un);
      ok("B mapa de causa: fallback genérico", /Não consegui abrir o comprovante/.test(m.outro), m.outro);

      // (c) todas as variantes falham -> TOAST específico visível (prova: nunca silêncio)
      await limparToast(page);
      await page.evaluate(async () => {
        window.__ultimoErroStorage = null;
        window.urlArquivoAssinado = async () => { window.__ultimoErroStorage = "storage/object-not-found"; return null; };
        await abrirComprovanteColab("doc-assin");
      });
      let t = await lerToast(page);
      ok("B(c) not-found -> toast específico VISÍVEL", /não está no cofre/.test(t), t);
      shots.push(await screenshotDoc(page, "comprovante-toast-notfound.png"));

      await limparToast(page);
      await page.evaluate(async () => {
        window.urlArquivoAssinado = async () => { window.__ultimoErroStorage = "storage/unauthorized"; return null; };
        await abrirComprovanteColab("doc-assin");
      });
      t = await lerToast(page);
      ok("B(c) unauthorized -> toast de permissão VISÍVEL", /Sem permissão/.test(t), t);

      // (d) exceção INESPERADA dentro do fluxo -> try/catch novo segura com toast genérico
      await limparToast(page);
      await page.evaluate(async () => {
        window.urlArquivoAssinado = async () => "data:application/pdf;base64,JVBERi0=";
        window.__openDocViewerReal = openDocViewer;
        openDocViewer = () => { throw new Error("explosão inesperada no viewer"); };
        await abrirComprovanteColab("doc-assin");
        openDocViewer = window.__openDocViewerReal;
      });
      t = await lerToast(page);
      ok("B(d) exceção inesperada -> toast genérico (try/catch segura, sem silêncio)",
        /Não consegui abrir o comprovante/.test(t), t);

      // (a/b) sucesso -> viewer REAL abre (screenshot do viewer)
      await limparToast(page);
      await page.evaluate(async () => {
        // PDF mínimo válido em data: (ehUrlSegura aceita data:pdf; pdf.js pode não
        // decodificar offline, mas o modal do viewer abre com título — é o que provamos)
        window.urlArquivoAssinado = async () => "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDM+PnN0cmVhbQpIaQplbmRzdHJlYW0KZW5kb2JqCg==";
        await abrirComprovanteColab("doc-assin");
      });
      const viewer = await page.evaluate(() => {
        const el = document.querySelector(".modal-backdrop--docview");
        return { existe: !!el, titulo: el ? (el.querySelector(".cp-docview__t b")?.textContent || "") : "" };
      });
      ok("B(a) sucesso -> viewer aberto com o título do comprovante",
        viewer.existe && /Regulamento Interno 5a Ed|Comprovante/.test(viewer.titulo), JSON.stringify(viewer));
      shots.push(await screenshotDoc(page, "comprovante-viewer-aberto.png"));

      await browser.close();
    }

    // ================= PARTE C: handler REAL da trilha do gestor =================
    {
      const { browser, page } = await abrirContexto({ viewport: "desktop" });
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await seedGestor(page);
      const res = await page.evaluate(async () => {
        // spy que captura (path, opts) e nega -> handler deve toastar por causa
        window.__spy = null;
        window.urlArquivoAssinado = async (p, opts) => { window.__spy = { p, opts }; window.__ultimoErroStorage = "storage/unauthorized"; return null; };
        const d = { id: "doc-assin", titulo: "Regulamento Interno 5a Ed", versao: 1 };
        const f = { id: "f-777", nome: "Fulano Assinante", turno: 1, setor: "Produção" };
        const x = { funcionarioId: "f-777", arquivoPath: "documentos-assinados/OLD/doc-assin-v1.pdf",
          em: "2026-07-10T12:00:00.000Z", userAgent: "UA", hashSha256: "abc123",
          geo: { lat: 1, lng: 2 }, aceiteTexto: "Li e concordo" };
        abrirTrilhaConfirmacao(d, f, x, true);
        const btn = document.querySelector("[data-trg-comprovante]");
        if (!btn) return { erro: "sem botão comprovante na trilha" };
        btn.click();
        await new Promise((r) => setTimeout(r, 60));
        return { spy: window.__spy, toast: (document.getElementById("toast-root")?.textContent || "").trim() };
      });
      ok("C trilha: passa o funcionarioId do ASSINANTE pra o fallback",
        res.spy && res.spy.opts && res.spy.opts.funcionarioId === "f-777", JSON.stringify(res.spy));
      ok("C trilha: unauthorized -> toast de permissão específico", /Sem permissão/.test(res.toast || ""), res.toast);
      shots.push(await screenshotDoc(page, "comprovante-trilha-gestor.png"));
      await browser.close();
    }
  } finally {
    pararServidor();
  }

  const fal = resultados.filter((r) => !r.pass);
  console.log(`\n${resultados.length - fal.length}/${resultados.length} PASS · screenshots: ${shots.filter(Boolean).join(", ")}`);
  if (fal.length) { console.log("FALHAS:\n" + fal.map((r) => "- " + r.nome + " · " + r.extra).join("\n")); process.exit(1); }
  console.log("TODOS OS TESTES PASSARAM");
})();

async function screenshotDoc(page, nome) {
  try { const dest = path.join(OUT_DIR, nome); await page.screenshot({ path: dest }); return dest; } catch (e) { return null; }
}
