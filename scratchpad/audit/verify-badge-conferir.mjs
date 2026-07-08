setTimeout(() => { console.log("HARD-TIMEOUT"); process.exit(9); }, 90000);
const H = await import("./harness.mjs");
await H.iniciarServidor();
const { browser, page } = await H.abrirContexto({ viewport: "desktop" });
await page.goto(H.BASE_URL, { waitUntil: "domcontentloaded" });
await H.seedGestor(page);

const r = await page.evaluate(() => {
  const casos = [
    { id: "m1", nome: "Moises Silva de Carvalho", tipo: "Não Registrou Entrada/Saída Lanche", status: "rh_confere",
      dataIso: "2026-07-06", data: "06/07/2026", setor: "Preparação", turno: 2, fonteInferida: true,
      classificacaoIncerta: true, motivoIncerteza: "ambíguo entre 2 posições possíveis",
      marcacoesPrevistas: ["13:30", "17:00", "17:30", "22:00"], marcacoesApuradas: ["13:31", "17:02", "22:00"] },
    { id: "d1", nome: "Diana", tipo: "Marcação Não Identificada", status: "rh_confere",
      dataIso: "2026-07-06", data: "06/07/2026", fonteInferida: true,
      classificacaoIncerta: true, motivoIncerteza: "só 1 de 4 marcações esperadas bateram",
      marcacoesPrevistas: ["05:00", "09:00", "09:30", "14:20"], marcacoesApuradas: ["05:02"] },
    { id: "v1", nome: "Vinicius", tipo: "Não registrou entrada", status: "rh_confere",
      dataIso: "2026-07-06", data: "06/07/2026", fonteInferida: true,
      classificacaoIncerta: false, horarioPrevistoRelevante: "13:30",
      marcacoesPrevistas: ["13:30", "17:00", "17:30", "22:00"],
      apuradasAlinhadas: [null, "17:35", "18:07", "22:00"], marcacoesApuradas: ["17:35", "18:07", "22:00"] },
  ];
  return casos.map((doc) => {
    const div = document.createElement("div"); div.innerHTML = ocaDashCardHtml(doc);
    const conf = div.querySelector(".badge--conferir");
    const badges = [...div.querySelectorAll(".badge")].map((b) => b.textContent.trim());
    return {
      id: doc.id,
      badges,
      temSeloConferir: !!conf,
      seloTemIcone: conf ? !!conf.querySelector("svg") : false,
      motivoAindaNoCard: !!div.querySelector(".occ__incerto"), // deve ser false agora
    };
  });
});
console.log(JSON.stringify(r, null, 1));

// screenshot: os 2 cards incertos + 1 confiante numa lista real (light; gestor nao tem dark)
await page.evaluate(() => {
  const docs = [
    { id: "m1", nome: "Moises Silva de Carvalho", tipo: "Não Registrou Entrada/Saída Lanche", status: "rh_confere",
      dataIso: "2026-07-06", data: "06/07/2026", setor: "Preparação", turno: 2, fonteInferida: true,
      classificacaoIncerta: true, motivoIncerteza: "ambíguo entre 2 posições possíveis",
      marcacoesPrevistas: ["13:30", "17:00", "17:30", "22:00"], marcacoesApuradas: ["13:31", "17:02", "22:00"] },
    { id: "d1", nome: "Daiane Ferreira", tipo: "Marcação Não Identificada", status: "rh_confere",
      dataIso: "2026-07-06", data: "06/07/2026", fonteInferida: true,
      classificacaoIncerta: true, motivoIncerteza: "só 1 de 4 marcações esperadas bateram",
      marcacoesPrevistas: ["05:00", "09:00", "09:30", "14:20"], marcacoesApuradas: ["05:02"] },
    { id: "e1", nome: "Edmar Souza", tipo: "Não registrou entrada", status: "rh_confere",
      dataIso: "2026-07-06", data: "06/07/2026", fonteInferida: true,
      classificacaoIncerta: false, horarioPrevistoRelevante: "13:30",
      marcacoesPrevistas: ["13:30", "17:00", "17:30", "22:00"],
      apuradasAlinhadas: [null, "17:35", "18:07", "22:00"], marcacoesApuradas: ["17:35", "18:07", "22:00"] },
  ];
  const alvo = document.querySelector("#view") || document.body;
  const wrap = document.createElement("div");
  wrap.id = "probe-badge"; wrap.style.cssText = "max-width:1100px;margin:20px auto;background:var(--bg);padding:14px;display:flex;flex-direction:column;gap:10px;";
  wrap.innerHTML = docs.map(ocaDashCardHtml).join("");
  alvo.prepend(wrap);
});
await page.waitForTimeout(220);
const el = await page.$("#probe-badge");
await el.screenshot({ path: "scratchpad/audit/out/badge-conferir.png" });
const erros = await H.coletarErrosReais(page);
console.log("erros:", erros.length);
await browser.close();
process.exit(0);
