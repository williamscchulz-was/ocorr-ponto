// Smoke: boota o app demo, loga como colab, semeia estado rico, screenshot da home (DSF2)
// + grava 3s de video pra medir nitidez. Extrai 1 frame do video.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = "http://localhost:8081/public/index.html";
const OUT = path.resolve("scratchpad/audit/tutorial-video");
mkdirSync(path.join(OUT, "smoke"), { recursive: true });
const errors = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, serviceWorkers: "block",
  recordVideo: { dir: path.join(OUT, "smoke"), size: { width: 780, height: 1688 } },
});
await ctx.route("**/*", (route) => {
  const h = new URL(route.request().url()).hostname;
  if (h === "localhost" || h === "127.0.0.1") {
    if (/firebase\.config\.js/.test(route.request().url())) return route.abort();
    return route.continue();
  }
  return route.abort();
});
const page = await ctx.newPage();
page.on("dialog", (d) => d.dismiss().catch(() => {}));
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => { try { _changelogChecado = true; } catch {} });
await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
await page.waitForTimeout(400);

// login + seed rico
const seedInfo = await page.evaluate(() => {
  _changelogChecado = true;
  if (!state.users.find((u) => u.id === "colab-tut"))
    state.users.push({ id: "colab-tut", usuario: "colab", senha: "x", role: "colaborador", nome: state.funcionarios[0]?.nome || "Colaborador", funcionarioCodigo: state.funcionarios[0]?.codigo });
  logout(); login("colab-tut", "x");
  try { marcarOnbVisto("colab-tut"); } catch {}
  document.getElementById("acesso")?.remove();
  document.querySelectorAll(".modal-backdrop").forEach((n) => n.remove());
  state.termoAdesaoOk = true; state.termoCanalOk = true;
  const mes = new Date().getMonth() + 1, dia = new Date().getDate();
  state.meuSaldoBH = { saldoMin: 480, minutos: 480, minutosOriginal: 480, saldoFormatado: "08:00", saldoOriginalFormatado: "08:00", atualizadoEm: new Date().toISOString() };
  state.gamiConfig = { ativa: true, ano: new Date().getFullYear(), marcos: [50, 100, 200, 500] };
  state.gamiMeu = { total: 120 };
  state.comunicadosColab = [{ id: "c1", titulo: "Ajuste no horario do refeitorio", corpo: "A partir de segunda, o refeitorio funciona das 11h30 as 13h30.", fixado: true, tipo: "comunicado", publicadoEm: new Date().toISOString(), autorNome: "Gente e Pessoas" }];
  state.comunicados = state.comunicadosColab;
  // aniversariante do dia + recem chegado + aniversariantes do mes
  const meuNome = state.funcionarios[0]?.nome || "Colaborador";
  state.aniversariantes = {
    pessoas: [ { nome: "Carla Nunes Ribeiro", dia, mes }, { nome: "Ana Beatriz Costa", dia: (dia % 28) + 1, mes }, { nome: "Joao Paulo da Silva", dia: ((dia + 5) % 28) + 1, mes } ],
    recemChegados: [ { nome: "Marcos Vinicius Alves", admissao: new Date(Date.now() - 9 * 864e5).toISOString(), setor: "Producao" } ],
  };
  // cache de reacoes conhecido (nao-meu) pros cards nascerem
  const cc = state._reacoesCache || (state._reacoesCache = {});
  try { cc[muralPostId("Carla Nunes Ribeiro")] = { reacoes: [], total: 2, minhaReacao: false }; } catch {}
  try { cc[bvPostId("Marcos Vinicius Alves", state.aniversariantes.recemChegados[0].admissao)] = { reacoes: [], total: 1, minhaReacao: false }; } catch {}
  state.view.page = "colab-home";
  _renderAppNow();
  return { nome: meuNome, temMuralPostId: typeof muralPostId === "function", temBvPostId: typeof bvPostId === "function" };
});
await page.waitForTimeout(600);
await page.evaluate(() => document.querySelectorAll(".demo-banner").forEach((n) => n.remove()));
await page.screenshot({ path: path.join(OUT, "smoke", "home-dsf2.png") });

// checa presenca dos blocos ricos na home
const blocos = await page.evaluate(() => ({
  faixa: !!document.querySelector(".mural-strip"),
  boasVindas: !!document.querySelector(".pp-bday"),
  oportunidade: !!document.querySelector(".vi-nudge"),
  comunicado: !!document.querySelector(".pp-card--pin, [data-nav='colab-comunicados']"),
  pontos: !!document.querySelector(".pts-slim, [data-nav='colab-conquistas']"),
  atalhos: document.querySelectorAll("[data-nav='colab-ponto'],[data-nav='colab-folha']").length,
  denuncia: !!document.querySelector(".den-row"),
  aniversariantesMes: !!document.querySelector(".pp-aniv-d"),
}));
console.log("BLOCOS HOME:", JSON.stringify(blocos));
console.log("SEED:", JSON.stringify(seedInfo));

// scroll lento (pra medir nitidez em movimento) e fecha
for (let y = 0; y <= 600; y += 60) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(80); }
await page.waitForTimeout(400);
const vpath = await page.video().path();
await ctx.close();
await browser.close();

// extrai 1 frame do video
try {
  execFileSync(ffmpeg, ["-y", "-i", vpath, "-vf", "select=eq(n\\,20)", "-vframes", "1", path.join(OUT, "smoke", "video-frame.png")]);
  console.log("frame do video extraido");
} catch (e) { console.log("falha frame:", String(e).slice(0,120)); }
console.log("VIDEO:", vpath);
console.log("pageerrors:", errors.length ? errors.join(" | ") : "nenhum");
process.exit(0);
