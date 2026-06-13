// ============================================================
// test-chat-formatacao-tempo.mjs
// Testes da lógica de formatação de hora/dia do chat do FioPulse:
//   formatHoraCurta(iso), formatHoraOuDia(iso), labelDiaChat(dia)
// Essas funções vivem em public/utils.js (helpers PUROS).
//
// utils.js NÃO tem exports (é script global de browser que usa
// document/location/window). Para testar o CÓDIGO REAL (e não um
// espelho), este teste LÊ o source de utils.js, extrai as definições
// exatas das funções relevantes + suas dependências (todayIso,
// formatDate) e as avalia num escopo controlado com shims mínimos de
// window/location. Assim os testes batem na lógica de verdade.
//
// Rodar:  node C:/projetos/ocorr-ponto/scripts/test-chat-formatacao-tempo.mjs
// ============================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UTILS_PATH = join(__dirname, "..", "public", "utils.js");

// ---------- runner mínimo (sem framework) ----------
let total = 0, pass = 0, fail = 0;
const falhas = [];
function check(nome, cond, extra = "") {
  total++;
  if (cond) {
    pass++;
    console.log(`OK    ${nome}`);
  } else {
    fail++;
    falhas.push(nome + (extra ? ` — ${extra}` : ""));
    console.log(`FALHA ${nome}${extra ? "  ::  " + extra : ""}`);
  }
}
function eq(nome, got, want) {
  check(nome, got === want, `esperado=${JSON.stringify(want)} obtido=${JSON.stringify(got)}`);
}

// ---------- carregar as funções REAIS de utils.js ----------
// Extraímos só o que precisamos por regex sobre o source. Se a forma
// do código mudar, o teste falha alto (melhor que testar um espelho
// desatualizado em silêncio).
const src = readFileSync(UTILS_PATH, "utf8");

function extrair(re, rotulo) {
  const m = src.match(re);
  if (!m) throw new Error(`Não consegui extrair ${rotulo} de utils.js (regex não bateu). O código mudou?`);
  return m[0];
}

// const todayIso = () => new Date().toISOString().slice(0, 10);
const srcTodayIso = extrair(/const todayIso = \(\) => [^;]+;/, "todayIso");
// const formatDate = (iso) => { ... };  (multi-linha)
const srcFormatDate = extrair(/const formatDate = \(iso\) => \{[\s\S]*?\n\};/, "formatDate");
// function formatHoraCurta(iso) { ... }
const srcHoraCurta = extrair(/function formatHoraCurta\(iso\) \{[\s\S]*?\n\}/, "formatHoraCurta");
// function formatHoraOuDia(iso) { ... }
const srcHoraOuDia = extrair(/function formatHoraOuDia\(iso\) \{[\s\S]*?\n\}/, "formatHoraOuDia");
// function labelDiaChat(dia) { ... }
const srcLabelDia = extrair(/function labelDiaChat\(dia\) \{[\s\S]*?\n\}/, "labelDiaChat");

// Monta um módulo avaliável. Ordem importa (todayIso/formatDate primeiro).
const bundle = `
${srcTodayIso}
${srcFormatDate}
${srcHoraCurta}
${srcHoraOuDia}
${srcLabelDia}
return { todayIso, formatDate, formatHoraCurta, formatHoraOuDia, labelDiaChat };
`;
// Shims: utils.js global usa window em outras funções, mas as nossas não.
// Ainda assim, fornecemos um window vazio por segurança caso o trecho
// extraído referencie algo no futuro.
const fabricar = new Function("window", "location", bundle);
const U = fabricar({}, { hostname: "node-test" });

console.log("=== Funções carregadas do utils.js REAL ===");
console.log("Path:", UTILS_PATH);
console.log("");

// ---------- helpers de data ----------
// Hoje/ontem segundo a MESMA regra do código (UTC, via toISOString).
const hojeUTC = new Date().toISOString().slice(0, 10);
const ontemUTC = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

// ============================================================
// 1) formatHoraCurta — ISO -> HH:MM (hora LOCAL), "" se inválido
// ============================================================
console.log("--- formatHoraCurta ---");

// String vazia / null / undefined -> "" (msg otimista sem timestamp)
eq("horaCurta('') => ''", U.formatHoraCurta(""), "");
eq("horaCurta(null) => ''", U.formatHoraCurta(null), "");
eq("horaCurta(undefined) => ''", U.formatHoraCurta(undefined), "");

// ISO claramente inválido -> "" (Date inválido)
eq("horaCurta('banana') => ''", U.formatHoraCurta("banana"), "");
eq("horaCurta('2026-13-45T99:99') => ''", U.formatHoraCurta("2026-13-45T99:99"), "");

// ISO válido com fuso explícito: comparamos contra o que o próprio
// Intl/Date produz no fuso LOCAL do runner (a função usa toLocaleTimeString
// sem timeZone => fuso do ambiente). Garantimos formato HH:MM 2 dígitos.
{
  const iso = "2026-06-13T14:05:00-03:00";
  const got = U.formatHoraCurta(iso);
  const want = new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  eq("horaCurta(ISO c/ offset) bate com toLocaleTimeString local", got, want);
  check("horaCurta formato HH:MM", /^\d{2}:\d{2}$/.test(got), `obtido=${JSON.stringify(got)}`);
}

// ISO em UTC 'Z'
{
  const iso = "2026-06-13T00:30:00Z";
  const got = U.formatHoraCurta(iso);
  const want = new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  eq("horaCurta(ISO Z) bate com toLocaleTimeString local", got, want);
}

// ============================================================
// 2) formatHoraOuDia — hoje->HH:MM, ontem->"ontem", senão data curta
//    (usa iso.slice(0,10) comparado contra todayIso()/ontem em UTC)
// ============================================================
console.log("");
console.log("--- formatHoraOuDia ---");

eq("horaOuDia('') => ''", U.formatHoraOuDia(""), "");
eq("horaOuDia(null) => ''", U.formatHoraOuDia(null), "");

// HOJE (data UTC de hoje): deve devolver HH:MM (== formatHoraCurta do ISO)
{
  const isoHoje = hojeUTC + "T13:37:00Z";
  const got = U.formatHoraOuDia(isoHoje);
  const want = U.formatHoraCurta(isoHoje);
  eq("horaOuDia(hoje) => HH:MM (== formatHoraCurta)", got, want);
  check("horaOuDia(hoje) tem formato HH:MM", /^\d{2}:\d{2}$/.test(got), `obtido=${JSON.stringify(got)}`);
}

// ONTEM (data UTC de ontem): deve devolver literalmente "ontem"
{
  const isoOntem = ontemUTC + "T10:00:00Z";
  eq("horaOuDia(ontem) => 'ontem'", U.formatHoraOuDia(isoOntem), "ontem");
}

// DATA ANTIGA: deve cair no formatDate(dia) -> "dd de mês"
{
  const got = U.formatHoraOuDia("2024-01-15T08:00:00Z");
  const want = U.formatDate("2024-01-15");
  eq("horaOuDia(antiga) => formatDate(dia)", got, want);
  check("horaOuDia(antiga) NÃO é HH:MM nem 'ontem'",
    got !== "ontem" && !/^\d{2}:\d{2}$/.test(got), `obtido=${JSON.stringify(got)}`);
}

// ============================================================
// 3) labelDiaChat — separador de dia da thread: 'Hoje'/'Ontem'/data
//    (recebe SÓ a data 'YYYY-MM-DD', sem hora)
// ============================================================
console.log("");
console.log("--- labelDiaChat ---");

eq("labelDiaChat(hojeUTC) => 'Hoje'", U.labelDiaChat(hojeUTC), "Hoje");
eq("labelDiaChat(ontemUTC) => 'Ontem'", U.labelDiaChat(ontemUTC), "Ontem");
{
  const got = U.labelDiaChat("2024-01-15");
  const want = U.formatDate("2024-01-15");
  eq("labelDiaChat(antiga) => formatDate", got, want);
}

// ============================================================
// 4) VIRADA DE MEIA-NOITE + FUSO — o teste adversário central.
//    O código calcula hoje/ontem via new Date().toISOString() (UTC),
//    mas o usuário (e os timestamps formatados) estão em BRT (UTC-3).
//    Entre 21:00 e 23:59 BRT, a data UTC já virou pro dia seguinte.
//    Simulamos congelando Date.
// ============================================================
console.log("");
console.log("--- virada de meia-noite / fuso (Date congelado) ---");

const RealDate = Date;
function congelarData(isoFixo) {
  // Substitui o global Date por uma subclasse cujo "now" é fixo,
  // mantendo o resto do comportamento (parsing, toISOString, etc).
  const fixedMs = new RealDate(isoFixo).getTime();
  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(fixedMs);
      else super(...args);
    }
    static now() { return fixedMs; }
  }
  // eslint-disable-next-line no-global-assign
  globalThis.Date = FakeDate;
}
function restaurarData() {
  globalThis.Date = RealDate;
}

// As funções extraídas referenciam o `Date` global no escopo do módulo
// criado por new Function — esse `Date` resolve para globalThis.Date,
// então o congelamento afeta o código REAL. Confirmamos abaixo.

// Cenário A: 2026-06-12 23:30 BRT == 2026-06-13 02:30 UTC.
// Em BRT ainda é dia 12; em UTC já é dia 13.
// O código usa todayIso() = UTC = "2026-06-13".
// Uma mensagem com criadoEm "2026-06-12T23:30:00-03:00" tem
// iso.slice(0,10) == "2026-06-12" (a string preserva o dia local-offset).
congelarData("2026-06-13T02:30:00Z"); // = 23:30 BRT do dia 12
{
  const tHoje = U.todayIso();
  eq("[meia-noite] todayIso() é UTC (dia 13, não 12)", tHoje, "2026-06-13");

  // Mensagem enviada "agora" em BRT (23:30 do dia 12):
  const isoMsg = "2026-06-12T23:30:00-03:00"; // slice(0,10) = "2026-06-12"
  const labelOuDia = U.formatHoraOuDia(isoMsg);
  // BUG potencial: para o usuário BRT a msg é de HOJE (mesmo dia, 23:30),
  // mas como todayIso()=UTC=dia13 e a string=dia12, o código NÃO casa
  // "hoje". Cai em "ontem" (dia12 == ontemUTC? ontemUTC aqui = dia12).
  // Documentamos o comportamento real:
  console.log(`      [diag] formatHoraOuDia('${isoMsg}') = ${JSON.stringify(labelOuDia)} (todayIso=${tHoje})`);

  // O separador de dia da thread usa labelDiaChat(dia) onde `dia` é a
  // data EXTRAÍDA do criadoEm pela thread. Se a thread fatia criadoEm
  // como .slice(0,10) também em local/string, ela passaria "2026-06-12".
  const labelSep = U.labelDiaChat("2026-06-12");
  console.log(`      [diag] labelDiaChat('2026-06-12') = ${JSON.stringify(labelSep)} (todayIso=${tHoje})`);

  // ASSERT do bug de fuso: uma mensagem mandada HÁ POUCO (23:30 BRT)
  // NÃO é rotulada "Hoje" pelo labelDiaChat — vira "Ontem".
  check(
    "[FUSO/BUG] msg de 23:30 BRT (dia local de hoje) é rotulada 'Ontem' pelo labelDiaChat",
    labelSep === "Ontem",
    `labelDiaChat('2026-06-12')=${JSON.stringify(labelSep)} enquanto em BRT é 'Hoje'`
  );

  // -- CAMINHO REAL DE PRODUÇÃO --
  // firebase.js tsToIso() faz .toISOString() => SEMPRE UTC 'Z'. O thread
  // (app.js:6776) faz: const dia = (m.criadoEm||"").slice(0,10); labelDiaChat(dia).
  // Logo `dia` é a data UTC. Mensagem mandada às 23:30 BRT do dia 12:
  //   instante = 2026-06-13T02:30:00.000Z  =>  slice(0,10) = "2026-06-13".
  // Aqui o congelado já está em 02:30 UTC do dia 13, então essa msg
  // recém-enviada CASA "Hoje" (dia 13 == todayIso UTC). MAS uma msg
  // mandada às 20:00 BRT do dia 12 (= 2026-06-12T23:00:00.000Z) tem
  // dia UTC = "2026-06-12" => labelDiaChat => "Ontem", embora em BRT
  // ainda seja o MESMO dia de hoje (12) p/ o usuário às 23:30.
  const criadoEm_20hBRT = new RealDate("2026-06-12T20:00:00-03:00").toISOString(); // -> ...23:00Z dia 12
  const diaProd = criadoEm_20hBRT.slice(0, 10); // espelha app.js:6776
  const labelProd = U.labelDiaChat(diaProd);
  console.log(`      [diag] PROD criadoEm(20h BRT)=${JSON.stringify(criadoEm_20hBRT)} -> dia=${diaProd} -> labelDiaChat=${JSON.stringify(labelProd)}`);
  check(
    "[FUSO/BUG-PROD] msg 20:00 BRT (mesmo dia BRT que 'agora' 23:30) vira separador 'Ontem'",
    labelProd === "Ontem",
    `caminho real app.js:6776 -> labelDiaChat('${diaProd}')=${JSON.stringify(labelProd)}`
  );
}
restaurarData();

// Cenário B: confirmar que o congelamento realmente afeta o código real.
// Em pleno meio-dia UTC, todayIso deve refletir a data congelada.
congelarData("2030-03-10T12:00:00Z");
{
  eq("[congelado] todayIso() reflete Date global congelado", U.todayIso(), "2030-03-10");
  eq("[congelado] labelDiaChat('2030-03-10') => 'Hoje'", U.labelDiaChat("2030-03-10"), "Hoje");
  eq("[congelado] labelDiaChat('2030-03-09') => 'Ontem'", U.labelDiaChat("2030-03-09"), "Ontem");
  // virada exata: 2030-03-11 é amanhã -> cai em formatDate
  eq("[congelado] labelDiaChat('2030-03-11') => formatDate(amanhã)",
     U.labelDiaChat("2030-03-11"), U.formatDate("2030-03-11"));
}
restaurarData();

// Cenário C: 01/01 — virada de ANO sob meia-noite.
// 2027-01-01 01:00 BRT == 2027-01-01 04:00 UTC. Mesmo dia nos dois.
// Testa que ontem cruza o ano corretamente (UTC): ontem = 2026-12-31.
congelarData("2027-01-01T04:00:00Z");
{
  eq("[ano-novo] todayIso() => 2027-01-01", U.todayIso(), "2027-01-01");
  eq("[ano-novo] labelDiaChat('2026-12-31') => 'Ontem'", U.labelDiaChat("2026-12-31"), "Ontem");
  eq("[ano-novo] labelDiaChat('2027-01-01') => 'Hoje'", U.labelDiaChat("2027-01-01"), "Hoje");
}
restaurarData();

// ============================================================
// 5) ROBUSTEZ — entradas estranhas que NÃO devem quebrar (throw)
// ============================================================
console.log("");
console.log("--- robustez / entradas adversárias ---");

function naoLanca(nome, fn) {
  total++;
  try {
    fn();
    pass++;
    console.log(`OK    ${nome}`);
  } catch (e) {
    fail++;
    falhas.push(`${nome} — lançou: ${e.message}`);
    console.log(`FALHA ${nome}  ::  lançou ${e.message}`);
  }
}

naoLanca("formatHoraCurta(123456) não lança", () => U.formatHoraCurta(123456));
naoLanca("formatHoraOuDia(123456) não lança", () => U.formatHoraOuDia(123456));
naoLanca("labelDiaChat('') não lança", () => U.labelDiaChat(""));
naoLanca("labelDiaChat(null) não lança", () => U.labelDiaChat(null));

// labelDiaChat(null/'') NÃO casa hoje/ontem => cai em formatDate.
// formatDate(null|'') retorna "—" (guard !iso). Confirmamos:
eq("labelDiaChat('') => formatDate('') => '—'", U.labelDiaChat(""), "—");
eq("labelDiaChat(null) => formatDate(null) => '—'", U.labelDiaChat(null), "—");

// ============================================================
// resumo
// ============================================================
console.log("");
console.log("============================================");
console.log(`TOTAL: ${total}  |  PASSOU: ${pass}  |  FALHOU: ${fail}`);
if (falhas.length) {
  console.log("Falhas:");
  for (const f of falhas) console.log("  - " + f);
}
console.log("============================================");

process.exitCode = fail > 0 ? 1 : 0;
