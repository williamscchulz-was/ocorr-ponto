// Verifica que os reveals convertidos pra WAAPI REALMENTE animam no reveal real (não só
// que o guard passa por não haver churn). Conta getAnimations rodando logo após o reveal.
import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const erros = []; p.on("pageerror", (e) => erros.push(String(e).slice(0, 160)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => typeof login === "function" && state?.users?.length, null, { timeout: 8000 });
const r = await p.evaluate(async () => {
  _changelogChecado = true;
  state.users.push({ id: "cp", usuario: "cp", senha: "x", role: "colaborador", nome: "Probe", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("cp", "x");
  document.querySelector("#acesso")?.remove();
  const rodando = (sel) => { const el = document.querySelector(sel); return el ? (el.getAnimations?.() || []).filter((a) => a.playState === "running").length : -1; };
  const anima = (sel) => { const el = document.querySelector(sel); if (!el) return -1; let n = 0; el.querySelectorAll("*").forEach((c) => n += (c.getAnimations?.() || []).filter((a) => a.playState === "running").length); return n + (el.getAnimations?.() || []).filter((a) => a.playState === "running").length; };

  // 1) ACOMPANHAR: consultar (código vazio -> "nada") deve revelar .den-acnone via WAAPI
  state.view.page = "colab-denuncia"; state.view.denVista = "acompanhar"; state.view.denCodConsulta = "";
  state.view.denConsulta = null; _renderAppNow();
  await new Promise((res) => requestAnimationFrame(res));
  denConsultar(document.querySelector("[data-den-consultar]"));
  await new Promise((res) => setTimeout(res, 40));
  const acnoneAnima = rodando(".den-acnone") > 0;

  // 2) ACOMPANHAR ok: resultado com timeline -> .den-acres anima
  state.view.denConsulta = null; _denAcRevelar = false;
  state.view.denCodConsulta = "FBR-7K2M-9QX4";
  _denAcRevelar = true;
  state.view.denConsulta = { estado: "ok", status: "em_analise", em: "2026-07-12T14:30:00.000Z", atualizadoEm: null, codigo: "FBR-7K2M-9QX4" };
  _renderAppNow();
  await new Promise((res) => requestAnimationFrame(res));
  const acresAnima = rodando(".den-acres") > 0;

  // 3) CERIMONIA: intro do anel via WAAPI quando _denCerRevelar
  state.view.denEnviada = true; state.view.denHash = "62fa84a9d3c1b7e04f8a6c2d19b3e5f7a0c4d8e2b6f1a9c3d7e5b0f4a8c2e327ef";
  state.view.denCodigo = "FBR-7K2M-9QX4"; state.view.denIdentEnviada = false;
  _denCerRevelar = true; _renderAppNow();
  await new Promise((res) => requestAnimationFrame(res));
  const cerAnima = anima(".cer__ring") > 0;
  // anel nasce ASSENTADO sem a flag (re-render): sem WAAPI novo
  _denCerRevelar = false; window.__fpForceWrite = true; _renderAppNow(); window.__fpForceWrite = false;
  await new Promise((res) => requestAnimationFrame(res));
  const cerAssentado = anima(".cer__ring") === 0;

  return { acnoneAnima, acresAnima, cerAnima, cerAssentado };
});
console.log(JSON.stringify({ r, erros }, null, 2));
await b.close();
const ok = r.acnoneAnima && r.acresAnima && r.cerAnima && r.cerAssentado && !erros.length;
if (!ok) { console.error("FALHOU"); process.exit(1); }
console.log("REVEAL OK (acnone/acres/cerimonia animam no reveal; anel re-render nasce assentado)");
