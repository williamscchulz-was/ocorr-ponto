// Verifica as 6 micro-interações v376 NO APP (mock micro-interacoes-2026-07.html, aprovado):
//   A morph do botão de aceite (termo) · B shake de erro (login gestor + código denúncia) ·
//   C anel no badge de avisos (aumento real) · D faísca no crédito de ponto (extrato cresce) ·
//   E glare 1x (marco recém-cruzado + lacre da cerimônia) · F reveal da saudação (1x por dia).
// Contrato: cada letra DISPARA no gesto real e NÃO dispara num re-render; F respeita a marca
// do dia. Bootstrap = o mesmo do flicker-guard (demo, SW bloqueado, firebase.config abortado).
import { chromium } from "playwright";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 1200 }, serviceWorkers: "block" });
await ctx.route("**/firebase.config.js*", (r) => r.abort());
await ctx.route("**gstatic.com**", (r) => r.abort());
const p = await ctx.newPage();
const jsErros = [];
p.on("pageerror", (e) => jsErros.push(String(e).slice(0, 200)));
await p.goto("http://localhost:8081/public/index.html", { waitUntil: "networkidle" });

await p.evaluate(() => {
  _changelogChecado = true;
  state.users.push({ id: "colab-mi", usuario: "colabmi", senha: "x", role: "colaborador", nome: "Colab Guarda", funcionarioCodigo: state.funcionarios[0]?.codigo, fotoBase64: null });
  login("colab-mi", "x");
});
await p.waitForFunction(() => state?.currentUserId);

const r = await p.evaluate(async () => {
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const rodando = (el) => el ? el.getAnimations().filter((a) => a.playState === "running").length : -1;
  const frescas = (root) => (document.getAnimations ? document.getAnimations() : [])
    .filter((a) => a.playState === "running" && (a.currentTime || 0) < 120 && root.contains(a.effect && a.effect.target)).length;
  document.querySelector("#acesso")?.remove();
  const uid = state.currentUserId;
  const out = {};

  // ===== F · TEXT REVEAL da saudação (1x por dia) =====
  // O login-landing já pode ter revelado a saudação (e setado a marca); deixa assentar/restaurar
  // antes de simular a "1ª carga do dia" limpando a marca.
  await sleep(900);
  try { localStorage.removeItem("fiopulse:saudacaoDia:" + uid); } catch (e) {}
  state.view.page = "colab-home";
  _renderAppNow();
  await sleep(30);
  const greetH1 = () => document.querySelector('#view [data-region="home:greet"] h1');
  out.F = {
    disparou: document.querySelectorAll('#view [data-region="home:greet"] .mi-w').length,
    marca: (() => { try { return localStorage.getItem("fiopulse:saudacaoDia:" + uid); } catch (e) { return null; } })(),
  };
  const hoje = new Date().toISOString().slice(0, 10);
  out.F.marcaHoje = out.F.marca === hoje;
  await sleep(850); // deixa o reveal terminar e restaurar o DOM limpo (restore <= ~750ms)
  out.F.restaurou = document.querySelectorAll('#view [data-region="home:greet"] .mi-w').length === 0;
  out.F.textoOk = !!(greetH1() && /,/.test(greetH1().textContent)); // "Saudação, Nome" intacto
  // 2ª carga do dia: marca setada -> NÃO revela de novo
  _renderAppNow();
  await sleep(20);
  out.F.naoRefez = document.querySelectorAll('#view [data-region="home:greet"] .mi-w').length === 0;

  // ===== A · MORPH do botão de aceite (termo de adesão) =====
  document.getElementById("termo-overlay")?.remove();
  state.termoAdesaoOk = false;
  window.registrarTermoAdesao = async () => { await sleep(120); return { ok: true }; };
  mostrarTermoAdesao();
  const aBtn = document.getElementById("termo-aceitar");
  const chk = document.getElementById("termo-chk");
  chk.checked = true; chk.dispatchEvent(new Event("change"));
  aBtn.click();
  await sleep(70);
  out.A = { morphou: aBtn.classList.contains("mba"), animandoNoBotao: rodando(aBtn) > 0 };
  await sleep(360); // pós-sucesso
  out.A.done = aBtn.classList.contains("mba--done");
  out.A.checkVisivel = aBtn.querySelector(".mba__chk") ? getComputedStyle(aBtn.querySelector(".mba__chk")).opacity === "1" : false;
  await sleep(600); // o overlay se remove e a cerimônia aparece; limpa
  document.querySelector(".cer-ov")?.remove();
  document.getElementById("termo-overlay")?.remove();
  // A · erro restaura o botão
  window.registrarTermoAdesao = async () => { await sleep(60); return { ok: false, msg: "x" }; };
  mostrarTermoAdesao();
  const aBtn2 = document.getElementById("termo-aceitar");
  const rotuloOrig = aBtn2.textContent.trim();
  const chk2 = document.getElementById("termo-chk");
  chk2.checked = true; chk2.dispatchEvent(new Event("change"));
  aBtn2.click();
  await sleep(220);
  out.A.erroRestaura = !aBtn2.classList.contains("mba") && !aBtn2.disabled && aBtn2.textContent.trim() === rotuloOrig;
  document.getElementById("termo-overlay")?.remove();
  document.querySelector(".cer-ov")?.remove();

  // ===== B · SHAKE de erro =====
  // (b1) login gestor errado -> campo da senha treme
  login("naoexiste", "errada");
  await sleep(20);
  const campoSenha = document.getElementById("login-pass")?.closest(".field");
  out.B = { loginGestor: rodando(campoSenha) > 0, helperExposto: typeof window.sacudirErro === "function" };
  // (b2) código de denúncia não localizado -> campo treme (1x por consulta, não em re-render)
  state.view.page = "colab-denuncia"; state.view.denVista = "acompanhar"; state.view.denEnviada = false; state.view.denHash = ""; state.view.denConsulta = null;
  _renderAppNow(); await sleep(40);
  window.consultarDenunciaStatus = async () => null; // qualquer código cai em "não localizado"
  state.view.denCodConsulta = "FBR-9Z9Z-9Z9Z";
  denConsultar(document.querySelector("[data-den-consultar]"));
  await sleep(140); // withBusy + render coalescido + reveal + shake
  const acfield = document.querySelector(".den-acfield");
  out.B.denShake = rodando(acfield) > 0;
  out.B.denNaoEncontrado = !!document.querySelector(".den-acnone");
  await sleep(520); // deixa o shake terminar
  window.__fpForceWrite = true; _renderAppNow(); window.__fpForceWrite = false;
  await sleep(30);
  out.B.denNaoRefez = rodando(document.querySelector(".den-acfield")) === 0;

  // ===== C · EXPAND RING no badge de avisos =====
  state.comunicadosColab = [{ id: "c1", minhaLeitura: true }]; // 0 não lidos (baseline)
  state.view.page = "colab-home"; _renderAppNow(); await sleep(30);
  _renderAppNow(); await sleep(20); // re-render sem mudança
  out.C = { semAumento: document.querySelectorAll(".mi-anel").length };
  state.comunicadosColab = [{ id: "c1", minhaLeitura: true }, { id: "c2", minhaLeitura: false }, { id: "c3", minhaLeitura: false }];
  _renderAppNow(); await sleep(40);
  out.C.comAumento = document.querySelectorAll(".mi-anel").length; // anel na sidebar + na barra
  await sleep(640); // anéis terminam
  _renderAppNow(); await sleep(20); // re-render, contagem igual -> sem novo anel
  out.C.naoRefez = document.querySelectorAll(".mi-anel").length;

  // ===== D · SPARKLE no crédito de ponto (extrato cresce) =====
  try { localStorage.setItem("gami-marco-celebrado", JSON.stringify({ [String(new Date().getFullYear())]: 100 })); } catch (e) {} // sem celebração de marco aqui
  state.gamiConfig = { ativa: true, ano: new Date().getFullYear(), marcos: [25, 50, 100], tabela: {} };
  state.gamiMeu = { total: 40 };
  state.gamiTop = []; state.gamiEntregas = [];
  state.gamiExtrato = [{ pontos: 10, rotulo: "Assinou", acao: "assinatura", em: Date.now() }, { pontos: 5, rotulo: "Ciência", acao: "ciencia", em: Date.now() }];
  state.view.page = "colab-conquistas"; state.view.gamiTab = "pts";
  _renderAppNow(); await sleep(40); // baseline extrato len 2
  _renderAppNow(); await sleep(20);
  out.D = { semCredito: document.querySelectorAll(".mi-spark").length };
  state.gamiExtrato = [{ pontos: 1, rotulo: "Novo", acao: "coracao", em: Date.now() }, ...state.gamiExtrato];
  state.gamiMeu = { total: 41 };
  _renderAppNow(); await sleep(40);
  out.D.comCredito = document.querySelectorAll(".mi-spark").length; // 3 faíscas
  await sleep(820);
  _renderAppNow(); await sleep(20); // extrato igual -> sem faísca nova
  out.D.naoRefez = document.querySelectorAll(".mi-spark").length;

  // ===== E · GLARE 1x =====
  // (e1) marco recém-cruzado
  try { localStorage.removeItem("gami-marco-celebrado"); } catch (e) {}
  state.gamiMeu = { total: 60 }; // cruza o marco 50 (novo)
  state.gamiExtrato = state.gamiExtrato.slice(); // sem crédito novo (mesma len)
  _gamiExtLen = state.gamiExtrato.length; // fixa baseline da faísca pra não interferir
  state.view.page = "colab-conquistas"; state.view.gamiTab = "pts";
  _renderAppNow(); await sleep(60);
  const marco50 = [...document.querySelectorAll("#view .gm-trilha .gm-tmarco")].find((el) => (el.querySelector("b")?.textContent || "").trim() === "50");
  out.E = { marcoGlare: marco50 ? !!marco50.querySelector(".mi-shine") : false };
  document.querySelector(".cer-ov")?.remove(); // fecha a cerimônia de marco
  await sleep(900);
  _renderAppNow(); await sleep(30); // já celebrado -> sem novo glare
  const marco50b = [...document.querySelectorAll("#view .gm-trilha .gm-tmarco")].find((el) => (el.querySelector("b")?.textContent || "").trim() === "50");
  out.E.marcoNaoRefez = marco50b ? !marco50b.querySelector(".mi-shine") : true;
  document.querySelector(".cer-ov")?.remove();
  // (e2) lacre da cerimônia da denúncia
  window.enviarDenuncia = async () => ({ hash: "a".repeat(64), codigo: "FBR-1234-5678" });
  state.view.page = "colab-denuncia"; state.view.denVista = "fluxo"; state.view.denEtapa = 3;
  state.view.denCat = "assedio"; state.view.denTexto = "relato de teste com mais de dez caracteres"; state.view.denIdent = false; state.view.denEnviada = false;
  _renderAppNow(); await sleep(40);
  document.querySelector("[data-den-enviar]").click();
  await sleep(260); // withBusy + render da cerimônia + glare (delay 180)
  const denKey = document.querySelector(".den-key");
  out.E.lacreGlare = denKey ? !!denKey.querySelector(".mi-shine") : false;
  await sleep(900);
  window.__fpForceWrite = true; _renderAppNow(); window.__fpForceWrite = false;
  await sleep(30);
  const denKey2 = document.querySelector(".den-key");
  out.E.lacreNaoRefez = denKey2 ? !denKey2.querySelector(".mi-shine") : true;

  return out;
});

console.log(JSON.stringify(r, null, 2));
if (jsErros.length) console.log("pageErrors:", jsErros);
await b.close();

const F = [];
// A
if (!r.A.morphou || !r.A.animandoNoBotao) F.push("A: botão não colapsou em círculo/spinner no clique");
if (!r.A.done || !r.A.checkVisivel) F.push("A: sucesso real não pintou o check no botão");
if (!r.A.erroRestaura) F.push("A: erro não restaurou o botão ao estado original");
// B
if (!r.B.loginGestor) F.push("B: login gestor errado não tremeu o campo");
if (!r.B.helperExposto) F.push("B: window.sacudirErro não exposto (login colaborador não teria como tremer)");
if (!r.B.denNaoEncontrado) F.push("B: consulta não caiu em 'não localizado'");
if (!r.B.denShake) F.push("B: código de denúncia não localizado não tremeu o campo");
if (!r.B.denNaoRefez) F.push("B: shake da denúncia RE-disparou num re-render");
// C
if (r.C.semAumento !== 0) F.push(`C: anel apareceu sem aumento (${r.C.semAumento})`);
if (!(r.C.comAumento > 0)) F.push("C: aumento de avisos não emanou o anel");
if (r.C.naoRefez !== 0) F.push(`C: anel RE-disparou num re-render sem aumento (${r.C.naoRefez})`);
// D
if (r.D.semCredito !== 0) F.push(`D: faísca apareceu sem crédito (${r.D.semCredito})`);
if (r.D.comCredito !== 3) F.push(`D: crédito real não gerou as 3 faíscas (${r.D.comCredito})`);
if (r.D.naoRefez !== 0) F.push(`D: faísca RE-disparou num re-render sem crédito (${r.D.naoRefez})`);
// E
if (!r.E.marcoGlare) F.push("E: marco recém-cruzado não recebeu o brilho");
if (!r.E.marcoNaoRefez) F.push("E: brilho do marco RE-disparou num re-render");
if (!r.E.lacreGlare) F.push("E: lacre da cerimônia da denúncia não recebeu o brilho");
if (!r.E.lacreNaoRefez) F.push("E: brilho do lacre RE-disparou num re-render");
// F
if (!(r.F.disparou > 0)) F.push("F: saudação não revelou por palavra na 1ª carga do dia");
if (!r.F.marcaHoje) F.push(`F: marca do dia não gravada com a data de hoje (${r.F.marca})`);
if (!r.F.restaurou) F.push("F: reveal não restaurou o DOM limpo (sobrou .mi-w)");
if (!r.F.textoOk) F.push("F: saudação ficou quebrada após o reveal");
if (!r.F.naoRefez) F.push("F: saudação revelou de novo na 2ª carga do mesmo dia");

if (jsErros.length) F.push("pageErrors: " + jsErros.join(" | "));
if (F.length) { console.error("FALHOU:\n- " + F.join("\n- ")); process.exit(1); }
console.log("MICRO APP OK (A morph · B shake · C anel · D faísca · E glare · F reveal)");
