// ============================================================
// test-chat-formatacao-tempo.mjs
// Testes da lógica de formatação de hora/dia do chat do FioPulse:
//   formatHoraCurta(iso), formatHoraOuDia(iso), labelDiaChat(dia)
//   + diaLocalISO(d)  (introduzido no fix de fuso da auditoria do chat)
// Essas funções vivem em public/utils.js (helpers PUROS).
//
// utils.js NÃO tem exports (é script global de browser). Para testar o
// CÓDIGO REAL (não um espelho), este teste LÊ o source de utils.js, extrai
// as definições exatas das funções relevantes + dependências e as avalia
// num escopo controlado. Assim os testes batem na lógica de verdade.
//
// NOTA: a auditoria do chat (jun/2026) CORRIGIU o bug de fuso — antes
// hoje/ontem eram calculados em UTC (toISOString), errando entre 21h–00h
// BRT. Agora usam o dia LOCAL (diaLocalISO via toLocaleDateString en-CA).
// Estes testes validam a versão CORRIGIDA, de forma independente de fuso:
// expectativas e código usam a mesma noção de "dia local" do runner.
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
  if (cond) { pass++; console.log(`OK    ${nome}`); }
  else { fail++; falhas.push(nome + (extra ? ` — ${extra}` : "")); console.log(`FALHA ${nome}${extra ? "  ::  " + extra : ""}`); }
}
function eq(nome, got, want) {
  check(nome, got === want, `esperado=${JSON.stringify(want)} obtido=${JSON.stringify(got)}`);
}

// ---------- carregar as funções REAIS de utils.js ----------
const src = readFileSync(UTILS_PATH, "utf8");
function extrair(re, rotulo) {
  const m = src.match(re);
  if (!m) throw new Error(`Não consegui extrair ${rotulo} de utils.js (regex não bateu). O código mudou?`);
  return m[0];
}
const srcTodayIso  = extrair(/const todayIso = \(\) => [^;]+;/, "todayIso");
const srcDiaLocal  = extrair(/const diaLocalISO = \(d\) => \{[\s\S]*?\n\};/, "diaLocalISO");
const srcFormatDate = extrair(/const formatDate = \(iso\) => \{[\s\S]*?\n\};/, "formatDate");
const srcHoraCurta = extrair(/function formatHoraCurta\(iso\) \{[\s\S]*?\n\}/, "formatHoraCurta");
const srcHoraOuDia = extrair(/function formatHoraOuDia\(iso\) \{[\s\S]*?\n\}/, "formatHoraOuDia");
const srcLabelDia  = extrair(/function labelDiaChat\(dia\) \{[\s\S]*?\n\}/, "labelDiaChat");

const bundle = `
${srcTodayIso}
${srcDiaLocal}
${srcFormatDate}
${srcHoraCurta}
${srcHoraOuDia}
${srcLabelDia}
return { todayIso, diaLocalISO, formatDate, formatHoraCurta, formatHoraOuDia, labelDiaChat };
`;
const fabricar = new Function("window", "location", bundle);
const U = fabricar({}, { hostname: "node-test" });

console.log("=== Funções carregadas do utils.js REAL ===\nPath:", UTILS_PATH, "\n");

// Dia local do runner — MESMA noção que o código usa agora (TZ-independente).
const hojeLocal = new Date().toLocaleDateString("en-CA");
const ontemLocal = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

// ============================================================
// 1) formatHoraCurta — ISO -> HH:MM (hora LOCAL), "" se inválido
// ============================================================
console.log("--- formatHoraCurta ---");
eq("horaCurta('') => ''", U.formatHoraCurta(""), "");
eq("horaCurta(null) => ''", U.formatHoraCurta(null), "");
eq("horaCurta(undefined) => ''", U.formatHoraCurta(undefined), "");
eq("horaCurta('banana') => ''", U.formatHoraCurta("banana"), "");
eq("horaCurta('2026-13-45T99:99') => ''", U.formatHoraCurta("2026-13-45T99:99"), "");
{
  const iso = "2026-06-13T14:05:00-03:00";
  const got = U.formatHoraCurta(iso);
  const want = new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  eq("horaCurta(ISO c/ offset) bate com toLocaleTimeString local", got, want);
  check("horaCurta formato HH:MM", /^\d{2}:\d{2}$/.test(got), `obtido=${JSON.stringify(got)}`);
}

// ============================================================
// 2) diaLocalISO — dia local YYYY-MM-DD; "" se inválido
// ============================================================
console.log("\n--- diaLocalISO ---");
check("diaLocalISO(Date) formato YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(U.diaLocalISO(new Date())));
eq("diaLocalISO('banana') => ''", U.diaLocalISO("banana"), "");
eq("diaLocalISO('') => ''", U.diaLocalISO(""), "");
{
  // O dia local de um instante bate com toLocaleDateString en-CA do mesmo instante.
  const iso = "2026-06-13T14:05:00-03:00";
  eq("diaLocalISO(iso) == toLocaleDateString en-CA", U.diaLocalISO(iso), new Date(iso).toLocaleDateString("en-CA"));
}

// ============================================================
// 3) formatHoraOuDia — hoje->HH:MM, ontem->"ontem", senão data curta
//    (agora por DIA LOCAL, não UTC)
// ============================================================
console.log("\n--- formatHoraOuDia ---");
eq("horaOuDia('') => ''", U.formatHoraOuDia(""), "");
eq("horaOuDia(null) => ''", U.formatHoraOuDia(null), "");
{
  // Timestamp local de hoje (sem 'Z' => parse local) => HH:MM
  const isoHoje = hojeLocal + "T13:37:00";
  const got = U.formatHoraOuDia(isoHoje);
  eq("horaOuDia(hoje local) => HH:MM (== formatHoraCurta)", got, U.formatHoraCurta(isoHoje));
  check("horaOuDia(hoje) tem formato HH:MM", /^\d{2}:\d{2}$/.test(got), `obtido=${JSON.stringify(got)}`);
}
{
  const isoOntem = ontemLocal + "T10:00:00";
  eq("horaOuDia(ontem local) => 'ontem'", U.formatHoraOuDia(isoOntem), "ontem");
}
{
  const got = U.formatHoraOuDia("2024-01-15T08:00:00");
  eq("horaOuDia(antiga) => formatDate(dia)", got, U.formatDate("2024-01-15"));
  check("horaOuDia(antiga) NÃO é HH:MM nem 'ontem'", got !== "ontem" && !/^\d{2}:\d{2}$/.test(got), `obtido=${JSON.stringify(got)}`);
}

// ============================================================
// 4) labelDiaChat — 'Hoje'/'Ontem'/data, por DIA LOCAL
// ============================================================
console.log("\n--- labelDiaChat ---");
eq("labelDiaChat(hojeLocal) => 'Hoje'", U.labelDiaChat(hojeLocal), "Hoje");
eq("labelDiaChat(ontemLocal) => 'Ontem'", U.labelDiaChat(ontemLocal), "Ontem");
eq("labelDiaChat(antiga) => formatDate", U.labelDiaChat("2024-01-15"), U.formatDate("2024-01-15"));

// ============================================================
// 5) FIX DE FUSO — agora hoje/ontem usam o DIA LOCAL (não UTC).
//    Congelamos Date e verificamos que a regra é auto-consistente no
//    fuso local do runner — independente de qual seja (era ISSO que o
//    bug antigo quebrava entre 21h–00h BRT).
// ============================================================
console.log("\n--- fix de fuso (Date congelado, TZ-independente) ---");
const RealDate = Date;
function congelar(isoFixo) {
  const fixedMs = new RealDate(isoFixo).getTime();
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(fixedMs); else super(...a); }
    static now() { return fixedMs; }
  }
  globalThis.Date = FakeDate;
}
function restaurar() { globalThis.Date = RealDate; }

// Instante de fim de noite (o horário onde o bug UTC mordia). Seja qual for
// o fuso do runner, o dia LOCAL de "agora" deve ser rotulado 'Hoje', e o
// anterior 'Ontem' — sem o salto de um dia que o cálculo em UTC causava.
congelar("2026-06-13T02:30:00Z");
{
  const hoje = U.diaLocalISO(new Date());
  const ontem = U.diaLocalISO(new Date(Date.now() - 86400000));
  eq("[fuso] labelDiaChat(diaLocal de agora) => 'Hoje'", U.labelDiaChat(hoje), "Hoje");
  eq("[fuso] labelDiaChat(diaLocal de ontem) => 'Ontem'", U.labelDiaChat(ontem), "Ontem");
  // Uma msg criada "agora" (mesmo instante congelado) é HOJE pra formatHoraOuDia.
  const agoraIso = new RealDate("2026-06-13T02:30:00Z").toISOString();
  check("[fuso] formatHoraOuDia(agora) => HH:MM (não 'ontem')",
    /^\d{2}:\d{2}$/.test(U.formatHoraOuDia(agoraIso)),
    `obtido=${JSON.stringify(U.formatHoraOuDia(agoraIso))}`);
}
restaurar();

// Virada de ano: ontem cruza pro ano anterior corretamente.
congelar("2027-01-01T12:00:00Z");
{
  const hoje = U.diaLocalISO(new Date());
  const ontem = U.diaLocalISO(new Date(Date.now() - 86400000));
  eq("[ano-novo] labelDiaChat(hoje) => 'Hoje'", U.labelDiaChat(hoje), "Hoje");
  eq("[ano-novo] labelDiaChat(ontem) => 'Ontem'", U.labelDiaChat(ontem), "Ontem");
  check("[ano-novo] ontem é dezembro/2026", ontem.startsWith("2026-12-3"), `ontem=${ontem}`);
}
restaurar();

// ============================================================
// 6) ROBUSTEZ — entradas estranhas não devem lançar
// ============================================================
console.log("\n--- robustez ---");
function naoLanca(nome, fn) {
  total++;
  try { fn(); pass++; console.log(`OK    ${nome}`); }
  catch (e) { fail++; falhas.push(`${nome} — lançou: ${e.message}`); console.log(`FALHA ${nome}  ::  lançou ${e.message}`); }
}
naoLanca("formatHoraCurta(123456) não lança", () => U.formatHoraCurta(123456));
naoLanca("formatHoraOuDia(123456) não lança", () => U.formatHoraOuDia(123456));
naoLanca("labelDiaChat('') não lança", () => U.labelDiaChat(""));
naoLanca("labelDiaChat(null) não lança", () => U.labelDiaChat(null));
eq("labelDiaChat('') => formatDate('') => '—'", U.labelDiaChat(""), "—");
eq("labelDiaChat(null) => formatDate(null) => '—'", U.labelDiaChat(null), "—");

// ============================================================
console.log("\n============================================");
console.log(`TOTAL: ${total}  |  PASSOU: ${pass}  |  FALHOU: ${fail}`);
if (falhas.length) { console.log("Falhas:"); for (const f of falhas) console.log("  - " + f); }
console.log("============================================");
process.exitCode = fail > 0 ? 1 : 0;
