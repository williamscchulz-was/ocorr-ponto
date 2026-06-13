// test-chat-nao-lidas-conversas.mjs
// -----------------------------------------------------------------------------
// Testes da lógica do chat do FioPulse: "Contagem de não-lidas e resumo de
// conversas". Auto-contido, sem framework, asserts simples.
//
// O QUE ESPELHA (lido do código real, jun/2026):
//  - rebuild()/considerar() de window.escutarMinhasMensagens
//    (public/firebase.js:1445-1467): agrupa msgs por peer (ambas direções),
//    conta não-lidas SÓ das recebidas, escolhe última msg/horário por max
//    criadoEm, e ordena conversas por ultimaEm DESC. Também ordena
//    state.mensagensRecebidas DESC.
//  - contarNaoLidas() (public/app.js:1082): reduce de state.conversas somando
//    c.naoLidas.
//  - formatHoraOuDia(iso) (public/utils.js:213): helper puro de horário/dia da
//    lista de conversas — testado de verdade (reimplementado fielmente com suas
//    deps todayIso/formatDate/formatHoraCurta).
//
// IMPORTANTE: como rebuild/considerar vivem dentro de closures de firebase.js
// (não exportáveis), eu REIMPLEMENTO a MESMA lógica aqui, byte a byte, e testo
// contra entradas adversárias. Qualquer divergência observada entre o
// comportamento esperado pelo dono e o que a lógica REAL produz é registrada
// como bug.
// -----------------------------------------------------------------------------

let casosTotal = 0, passou = 0, falhou = 0;
const bugs = [];
const linhas = [];

function ok(cond, nome, detalhe) {
  casosTotal++;
  if (cond) { passou++; linhas.push(`OK   ${nome}`); }
  else { falhou++; linhas.push(`FALHA ${nome}${detalhe ? " :: " + detalhe : ""}`); }
}
function eq(a, b, nome) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  ok(A === B, nome, `esperado ${B}, obtido ${A}`);
}

// ============================================================================
// ESPELHO FIEL de rebuild()/considerar() — firebase.js:1445-1467
// Recebe { recebidas, enviadas, meu } onde cada item tem
// {id, de, deNome, para, paraNome, texto, criadoEm(ISO|null), lido}.
// Retorna { mensagensRecebidas, conversas } como o state real.
// ============================================================================
function rebuild(recebidas, enviadas, meu) {
  // Recebidas desc (firebase.js:1447-1448)
  const mensagensRecebidas = [...recebidas]
    .sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));

  // Resumo por peer (firebase.js:1451-1465)
  const resumo = new Map();
  const considerar = (m, deMim) => {
    const peer = deMim ? m.para : m.de;
    const peerNome = deMim ? (m.paraNome || "?") : (m.deNome || "?");
    if (!peer || peer === meu) return;
    let r = resumo.get(peer);
    if (!r) { r = { uid: peer, nome: peerNome, ultimaMsg: "", ultimaEm: null, deMim: false, naoLidas: 0 }; resumo.set(peer, r); }
    if ((!r.nome || r.nome === "?") && peerNome) r.nome = peerNome;
    if (!deMim && !m.lido) r.naoLidas += 1;
    if (!r.ultimaEm || (m.criadoEm || "") > r.ultimaEm) {
      r.ultimaEm = m.criadoEm || null; r.ultimaMsg = m.texto || ""; r.deMim = deMim;
    }
  };
  recebidas.forEach((m) => considerar(m, false));
  enviadas.forEach((m) => considerar(m, true));
  const conversas = Array.from(resumo.values())
    .sort((a, b) => (b.ultimaEm || "").localeCompare(a.ultimaEm || ""));

  return { mensagensRecebidas, conversas };
}

// ESPELHO de contarNaoLidas() — app.js:1082
function contarNaoLidas(conversas) {
  return (conversas || []).reduce((acc, c) => acc + (c.naoLidas || 0), 0);
}

// ============================================================================
// HELPERS PUROS REAIS — copiados de utils.js (testados de verdade)
// ============================================================================
const todayIso = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};
function formatHoraCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatHoraOuDia(iso) {
  if (!iso) return "";
  const dia = String(iso).slice(0, 10);
  const hoje = todayIso();
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dia === hoje) return formatHoraCurta(iso);
  if (dia === ontem) return "ontem";
  return formatDate(dia);
}

const MEU = "u_eu";

// ============================================================================
// CASO 1 — várias conversas, mistura de minhas/recebidas, lidas/não-lidas
// ============================================================================
{
  const recebidas = [
    { id: "r1", de: "u_ana", deNome: "Ana", para: MEU, texto: "oi", criadoEm: "2026-06-13T10:00:00.000Z", lido: false },
    { id: "r2", de: "u_ana", deNome: "Ana", para: MEU, texto: "tudo bem?", criadoEm: "2026-06-13T10:05:00.000Z", lido: false },
    { id: "r3", de: "u_bob", deNome: "Bob", para: MEU, texto: "relatorio", criadoEm: "2026-06-13T09:00:00.000Z", lido: true },
    { id: "r4", de: "u_carl", deNome: "Carl", para: MEU, texto: "ok", criadoEm: "2026-06-13T08:00:00.000Z", lido: false },
  ];
  const enviadas = [
    { id: "e1", de: MEU, para: "u_bob", paraNome: "Bob", texto: "ja vi", criadoEm: "2026-06-13T09:30:00.000Z", lido: false },
    { id: "e2", de: MEU, para: "u_dan", paraNome: "Dan", texto: "bom dia", criadoEm: "2026-06-13T11:00:00.000Z", lido: false },
  ];
  const { mensagensRecebidas, conversas } = rebuild(recebidas, enviadas, MEU);

  // não-lidas: Ana 2, Bob 0 (lida), Carl 1, Dan 0 (eu mandei) => 3
  ok(contarNaoLidas(conversas) === 3, "C1: badge soma 3 não-lidas", `obtido ${contarNaoLidas(conversas)}`);

  const byUid = Object.fromEntries(conversas.map((c) => [c.uid, c]));
  ok(byUid.u_ana.naoLidas === 2, "C1: Ana 2 não-lidas", `obtido ${byUid.u_ana?.naoLidas}`);
  ok(byUid.u_bob.naoLidas === 0, "C1: Bob 0 (recebida lida)", `obtido ${byUid.u_bob?.naoLidas}`);
  ok(byUid.u_carl.naoLidas === 1, "C1: Carl 1 não-lida", `obtido ${byUid.u_carl?.naoLidas}`);
  ok(byUid.u_dan.naoLidas === 0, "C1: Dan 0 (só enviada por mim)", `obtido ${byUid.u_dan?.naoLidas}`);

  // ordem por recência (ultimaEm DESC): Dan 11:00, Ana 10:05, Bob 09:30(enviada), Carl 08:00
  eq(conversas.map((c) => c.uid), ["u_dan", "u_ana", "u_bob", "u_carl"], "C1: conversas ordenadas por recência DESC");

  // última msg/horário de Ana = a mais recente dela
  ok(byUid.u_ana.ultimaMsg === "tudo bem?" && byUid.u_ana.ultimaEm === "2026-06-13T10:05:00.000Z" && byUid.u_ana.deMim === false,
    "C1: Ana última msg/horário corretos (recebida)", `obtido ${JSON.stringify(byUid.u_ana)}`);

  // Bob: última é a ENVIADA por mim (09:30 > 09:00) => deMim true
  ok(byUid.u_bob.ultimaMsg === "ja vi" && byUid.u_bob.deMim === true,
    "C1: Bob última msg é a minha (deMim true)", `obtido ${JSON.stringify(byUid.u_bob)}`);

  // mensagensRecebidas em DESC
  eq(mensagensRecebidas.map((m) => m.id), ["r2", "r1", "r3", "r4"], "C1: mensagensRecebidas ordenadas DESC");

  // Total de conversas = 4 peers distintos
  ok(conversas.length === 4, "C1: 4 conversas distintas", `obtido ${conversas.length}`);
}

// ============================================================================
// CASO 2 — mensagem PARA MIM MESMO (peer === meu) deve ser ignorada (sem
// conversa-fantasma e sem badge). Espelha guard `if (!peer || peer === meu)`.
// ============================================================================
{
  const recebidas = [
    { id: "s1", de: MEU, deNome: "Eu", para: MEU, texto: "nota propria", criadoEm: "2026-06-13T10:00:00.000Z", lido: false },
    { id: "r1", de: "u_ana", deNome: "Ana", para: MEU, texto: "oi", criadoEm: "2026-06-13T10:01:00.000Z", lido: false },
  ];
  const enviadas = [
    { id: "es1", de: MEU, para: MEU, paraNome: "Eu", texto: "nota propria", criadoEm: "2026-06-13T10:00:00.000Z", lido: false },
  ];
  const { conversas } = rebuild(recebidas, enviadas, MEU);
  ok(conversas.length === 1 && conversas[0].uid === "u_ana", "C2: msg pra si mesmo não vira conversa", `obtido ${JSON.stringify(conversas.map((c) => c.uid))}`);
  ok(contarNaoLidas(conversas) === 1, "C2: badge não conta órfã pra si mesmo", `obtido ${contarNaoLidas(conversas)}`);
}

// ============================================================================
// CASO 3 — empate de horário (mesmo criadoEm). Com `>` estrito, o PRIMEIRO
// visto vence. recebidas são processadas antes de enviadas (forEach ordem),
// então numa conversa com recebida e enviada no MESMO instante, a recebida
// (deMim=false) prevalece como "última".
// ============================================================================
{
  const T = "2026-06-13T12:00:00.000Z";
  const recebidas = [
    { id: "r1", de: "u_ana", deNome: "Ana", para: MEU, texto: "recebida", criadoEm: T, lido: false },
  ];
  const enviadas = [
    { id: "e1", de: MEU, para: "u_ana", paraNome: "Ana", texto: "enviada", criadoEm: T, lido: false },
  ];
  const { conversas } = rebuild(recebidas, enviadas, MEU);
  const ana = conversas[0];
  // recebida processada primeiro; enviada no MESMO T não substitui (12:00 > 12:00 = false)
  ok(ana.ultimaMsg === "recebida" && ana.deMim === false,
    "C3: empate de horário mantém a primeira vista (recebida)", `obtido ${JSON.stringify(ana)}`);

  // Empate de ultimaEm entre DUAS conversas: ordem é estável (sort não troca iguais)
  const rec2 = [
    { id: "ra", de: "u_a", deNome: "A", para: MEU, texto: "x", criadoEm: T, lido: false },
    { id: "rb", de: "u_b", deNome: "B", para: MEU, texto: "y", criadoEm: T, lido: false },
  ];
  const r2 = rebuild(rec2, [], MEU);
  eq(r2.conversas.map((c) => c.uid), ["u_a", "u_b"], "C3: empate entre conversas mantém ordem de inserção (sort estável)");
}

// ============================================================================
// CASO 4 — peer SEM NOME. Resumo deve cair pro fallback "?" e ser corrigido
// se alguma msg posterior trouxer nome. Espelha:
//   peerNome = deMim ? (m.paraNome || "?") : (m.deNome || "?")
//   if ((!r.nome || r.nome === "?") && peerNome) r.nome = peerNome;
// ============================================================================
{
  // 1ª recebida sem deNome -> nome "?"; 2ª recebida traz "Eva" -> corrige
  const recebidas = [
    { id: "r1", de: "u_eva", deNome: "", para: MEU, texto: "oi", criadoEm: "2026-06-13T10:00:00.000Z", lido: false },
    { id: "r2", de: "u_eva", deNome: "Eva", para: MEU, texto: "de novo", criadoEm: "2026-06-13T10:01:00.000Z", lido: false },
  ];
  const { conversas } = rebuild(recebidas, [], MEU);
  ok(conversas[0].nome === "Eva", "C4: nome '?' é corrigido por msg posterior com nome", `obtido ${conversas[0].nome}`);

  // peer cujo nome nunca chega -> permanece "?"
  const r2 = rebuild([{ id: "x", de: "u_fan", deNome: "", para: MEU, texto: "?", criadoEm: "2026-06-13T09:00:00.000Z", lido: false }], [], MEU);
  ok(r2.conversas[0].nome === "?", "C4: peer sem nome em nenhuma msg fica '?'", `obtido ${r2.conversas[0].nome}`);
}

// ============================================================================
// CASO 5 — criadoEm null (mensagem otimista antes do serverTimestamp resolver).
// ultimaEm: `!r.ultimaEm || (m.criadoEm||"") > r.ultimaEm`. Para 1ª msg com
// criadoEm null: !r.ultimaEm é true => entra, ultimaEm = m.criadoEm||null = null.
// Numa conversa com 1 msg null + 1 msg com data, a com data deve vencer.
// ============================================================================
{
  const recebidas = [
    { id: "n1", de: "u_gus", deNome: "Gus", para: MEU, texto: "otimista", criadoEm: null, lido: false },
    { id: "n2", de: "u_gus", deNome: "Gus", para: MEU, texto: "resolvida", criadoEm: "2026-06-13T10:00:00.000Z", lido: false },
  ];
  const { conversas } = rebuild(recebidas, [], MEU);
  const gus = conversas[0];
  // n1 entra primeiro (ultimaEm null). n2: ("2026..." > null) => "..." > "" no localeCompare path?
  // No considerar a comparação é (m.criadoEm||"") > r.ultimaEm. r.ultimaEm é null.
  // "2026-..." > null  ->  JS coage null para "null" string. "2026.." > "null" === false!
  // Logo n2 NÃO substitui n1. ultimaMsg fica "otimista" e ultimaEm null.
  // Isso é o comportamento REAL — registramos como observação/bug se contraria UX.
  linhas.push(`     [diag C5a] (null antes de dated) gus.ultimaMsg=${JSON.stringify(gus.ultimaMsg)} ultimaEm=${JSON.stringify(gus.ultimaEm)}`);
  // Aqui a msg dated VENCE — mas por ACIDENTE do guard `!r.ultimaEm` (ultimaEm
  // ficou null pela 1ª msg, então !null=true força a troca). Funciona.
  ok(gus.ultimaMsg === "resolvida", "C5a: null seguido de dated => dated vence (via guard !r.ultimaEm)", `obtido ${gus.ultimaMsg}`);

  // C5b — ORDEM ADVERSÁRIA: dated PRIMEIRO, depois msg com criadoEm null.
  // Agora r.ultimaEm já é "2026-...". A nova msg null: `(null||"") > "2026-..."`
  // => `"" > "2026-..."` => false (correto, null não deve substituir dated).
  const rec5b = [
    { id: "d1", de: "u_gus", deNome: "Gus", para: MEU, texto: "resolvida", criadoEm: "2026-06-13T10:00:00.000Z", lido: false },
    { id: "d2", de: "u_gus", deNome: "Gus", para: MEU, texto: "otimista nova", criadoEm: null, lido: false },
  ];
  const g5b = rebuild(rec5b, [], MEU).conversas[0];
  linhas.push(`     [diag C5b] (dated antes de null) ultimaMsg=${JSON.stringify(g5b.ultimaMsg)}`);
  ok(g5b.ultimaMsg === "resolvida", "C5b: dated seguido de null => dated permanece", `obtido ${g5b.ultimaMsg}`);

  // C5c — REGRESSÃO/DIAGNÓSTICO da coerção: provar que `(m.criadoEm||"") > r.ultimaEm`
  // com r.ultimaEm === null usa comparação NUMÉRICA ('2026-...' -> NaN), logo SEMPRE false.
  // Único motivo de C5a funcionar é o ramo `!r.ultimaEm` vir ANTES no ||.
  const coercaoFalsa = (("2026-06-13T10:00:00.000Z" || "") > null) === false;
  ok(coercaoFalsa, "C5c: `'2026-...' > null` é FALSE (coerção numérica → NaN) — guard !r.ultimaEm é o que salva");
  if (coercaoFalsa) {
    bugs.push({
      titulo: "Fragilidade de coerção em considerar(): `(m.criadoEm||'') > r.ultimaEm` quando ultimaEm é null",
      detalhe:
        "firebase.js:1460 — `if (!r.ultimaEm || (m.criadoEm || '') > r.ultimaEm)`. Quando r.ultimaEm é null, a 2ª cláusula " +
        "`(m.criadoEm||'') > null` é uma comparação RELACIONAL string-vs-null: o JS coage AMBOS para Number, '2026-...' vira NaN, " +
        "e qualquer comparação com NaN é false. Verifiquei via node: `('2026-...' || '') > null === false`. " +
        "Hoje o código NÃO quebra porque o ramo `!r.ultimaEm` (null é falsy) curto-circuita antes e força a primeira atribuição. " +
        "Mas é uma fragilidade real: a comparação da direita está logicamente quebrada para o caso null e só não morde por sorte do short-circuit. " +
        "Se alguém refatorar a condição (ex.: trocar a ordem do ||, ou inicializar ultimaEm com '' em vez de null), o bug aflora silenciosamente — " +
        "uma msg dated deixaria de substituir uma 'última' anterior. RISCO: BAIXO hoje, ARMADILHA de manutenção. " +
        "Sugestão defensiva: comparar sempre com fallback nos dois lados — `(m.criadoEm||'') > (r.ultimaEm||'')` — e dispensar o ramo especial.",
    });
  }
}

// ============================================================================
// CASO 6 — recência DESC com ultimaEm null indo pro fim.
// sort: (b.ultimaEm||"").localeCompare(a.ultimaEm||"") => null vira "" => fim.
// ============================================================================
{
  const recebidas = [
    { id: "a", de: "u_h", deNome: "H", para: MEU, texto: "com data", criadoEm: "2026-06-13T10:00:00.000Z", lido: false },
    { id: "b", de: "u_i", deNome: "I", para: MEU, texto: "sem data", criadoEm: null, lido: false },
  ];
  const { conversas } = rebuild(recebidas, [], MEU);
  eq(conversas.map((c) => c.uid), ["u_h", "u_i"], "C6: conversa com ultimaEm null vai pro fim");
}

// ============================================================================
// CASO 7 — badge clampa visualmente em "99+" (app.js:1091). A contagem em si
// não é clampada; testamos a lógica do textContent.
// ============================================================================
{
  const recebidas = [];
  for (let i = 0; i < 120; i++) recebidas.push({ id: "m" + i, de: "u_z", deNome: "Z", para: MEU, texto: "x", criadoEm: "2026-06-13T10:00:00.000Z", lido: false });
  const { conversas } = rebuild(recebidas, [], MEU);
  const n = contarNaoLidas(conversas);
  ok(n === 120, "C7: contagem real soma todas (120)", `obtido ${n}`);
  const label = n > 99 ? "99+" : String(n);
  ok(label === "99+", "C7: badge exibe '99+' acima de 99", `obtido ${label}`);
}

// ============================================================================
// CASO 8 — sem conversas: badge 0/oculto.
// ============================================================================
{
  const { conversas } = rebuild([], [], MEU);
  ok(conversas.length === 0 && contarNaoLidas(conversas) === 0, "C8: sem mensagens => 0 não-lidas, lista vazia");
  ok(contarNaoLidas(undefined) === 0, "C8: contarNaoLidas(undefined) === 0 (guard)");
}

// ============================================================================
// CASO 9 — HELPER PURO REAL formatHoraOuDia (utils.js) testado de verdade.
// ============================================================================
{
  ok(formatHoraOuDia("") === "", "C9: formatHoraOuDia('') === ''");
  ok(formatHoraOuDia(null) === "", "C9: formatHoraOuDia(null) === ''");
  const ontemIso = new Date(Date.now() - 86400000).toISOString();
  ok(formatHoraOuDia(ontemIso) === "ontem", "C9: ISO de ontem => 'ontem'", `obtido ${formatHoraOuDia(ontemIso)}`);
  const hojeIso = todayIso() + "T15:30:00.000Z";
  const h = formatHoraOuDia(hojeIso);
  ok(/^\d{2}:\d{2}$/.test(h), "C9: ISO de hoje => HH:MM", `obtido ${h}`);
  const antigo = "2024-01-15T10:00:00.000Z";
  const d = formatHoraOuDia(antigo);
  ok(typeof d === "string" && d.length > 0 && d !== "ontem", "C9: ISO antigo => data curta", `obtido ${d}`);
}

// ============================================================================
// CASO 10 — não-lida só conta na DIREÇÃO recebida. Uma msg ENVIADA por mim
// com lido:false NÃO incrementa naoLidas (considerar usa `if (!deMim && !m.lido)`).
// ============================================================================
{
  const enviadas = [
    { id: "e1", de: MEU, para: "u_j", paraNome: "J", texto: "oi", criadoEm: "2026-06-13T10:00:00.000Z", lido: false },
    { id: "e2", de: MEU, para: "u_j", paraNome: "J", texto: "ola", criadoEm: "2026-06-13T10:01:00.000Z", lido: false },
  ];
  const { conversas } = rebuild([], enviadas, MEU);
  ok(conversas[0].naoLidas === 0, "C10: minhas msgs não-lidas pelo peer NÃO contam no meu badge", `obtido ${conversas[0].naoLidas}`);
  ok(contarNaoLidas(conversas) === 0, "C10: badge 0 quando só enviei");
}

// ============================================================================
// CASO 11 — XSS: nome/texto vindo do Firestore NÃO é desempacotado na lógica
// (escapeHtml é aplicado na camada de render). Aqui só garantimos que a lógica
// preserva o conteúdo cru para o render escapar depois (não corrompe).
// ============================================================================
{
  const recebidas = [
    { id: "x1", de: "u_k", deNome: '<img src=x onerror=alert(1)>', para: MEU, texto: '<script>', criadoEm: "2026-06-13T10:00:00.000Z", lido: false },
  ];
  const { conversas } = rebuild(recebidas, [], MEU);
  ok(conversas[0].nome === '<img src=x onerror=alert(1)>' && conversas[0].ultimaMsg === '<script>',
    "C11: lógica preserva texto cru (escape é responsabilidade do render)", `obtido ${JSON.stringify(conversas[0])}`);
}

// ---------------------------------------------------------------------------
console.log(linhas.join("\n"));
console.log("\n" + "=".repeat(60));
console.log(`TOTAL: ${casosTotal} | PASSOU: ${passou} | FALHOU: ${falhou}`);
if (bugs.length) {
  console.log(`\nBUGS NA LÓGICA REAL: ${bugs.length}`);
  bugs.forEach((b, i) => console.log(`  [${i + 1}] ${b.titulo}`));
}
process.exit(falhou > 0 ? 1 : 0);
