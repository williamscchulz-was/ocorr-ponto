// v410: a tela colab-roadmap foi removida. Navegar pra ela por hash/nav antigo
// (bookmark velho, deep-link) NAO pode quebrar: cai no fallback digno (Home do
// colaborador), zero pageerror. Servidor local na 8081, raiz do repo.
import { chromium } from "playwright";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
await p.addInitScript(() => { window.__semVT = true; });
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

// entra no portal do colaborador (mesmo padrao do flicker-guard)
await p.evaluate(() => {
  state.users.push({ id: "colab-probe", usuario: "colab", senha: "x", role: "colaborador", nome: "Colab Probe", funcionarioCodigo: state.funcionarios[0]?.codigo });
  login("colab-probe", "x");
});
await p.waitForTimeout(300);
await p.evaluate(() => { document.querySelector("#acesso")?.remove(); });

// navega pro id fossil, por 3 caminhos plausiveis de "nav antigo"
const r = await p.evaluate(() => {
  const out = {};
  // 1) deep-link direto (bookmark/estado velho)
  state.view.page = "colab-roadmap";
  try { _renderAppNow(); out.render = "ok"; } catch (e) { out.render = "EXC:" + String(e).slice(0, 160); }
  const view = document.querySelector("#view");
  out.temFpRoot = !!view?.querySelector(".fp-root");           // artefato da tela removida
  out.temHomeHero = !!view?.querySelector(".pp-hero, .pp-home__grid, .pp-atalhos, .pp-saud"); // marca da Home
  out.titulo = document.querySelector("#topbar-title")?.textContent || "";
  // 2) hash antigo, se houver roteador por hash
  try { location.hash = "#colab-roadmap"; } catch (e) {}
  out.h1 = view?.querySelector("h1")?.textContent || "";
  return out;
});

console.log("resultado:", JSON.stringify(r, null, 2));
console.log("pageerrors:", jsErros.length, jsErros);

const ok = r.render === "ok" && r.temFpRoot === false && jsErros.length === 0;
await b.close();
console.log(ok ? "\nPROBE FALLBACK: PASSOU (colab-roadmap cai na Home, sem artefato do mapa, zero pageerror)"
              : "\nPROBE FALLBACK: FALHOU");
process.exit(ok ? 0 : 1);
