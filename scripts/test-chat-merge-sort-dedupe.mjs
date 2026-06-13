// ============================================================================
// Testes da lógica de Mescla / Ordenação / Dedupe das DUAS queries do chat.
//
// ALVO REAL: public/firebase.js -> window.escutarConversa (linhas ~1412-1432).
//   - mapDoc:  { id, ...data, criadoEm: tsToIso(data.criadoEm) }      (1417)
//   - emit():  espera prontoA && prontoB; depois faz                  (1418-1422)
//        const todas = [...enviadas, ...recebidas]
//          .sort((a, b) => (a.criadoEm || "9999").localeCompare(b.criadoEm || "9999"));
//        cb(todas, null);
//
//   Query A = enviadas  (de==meu  & para==peer)
//   Query B = recebidas (de==peer & para==meu)
//
// IMPORTANTE: o código real NÃO deduplica por id. A mescla é só
// [...enviadas, ...recebidas] seguida de sort. Espelhamos isso FIELMENTE aqui
// (não "consertamos" no espelho) pra que os testes revelem o comportamento
// verdadeiro. tsToIso(null) -> null, então msg otimista (serverTimestamp não
// resolvido) entra com criadoEm=null -> tratada como "9999" no sort -> vai pro fim.
//
// Sem framework: asserts simples. Cada caso imprime OK/FALHA.
// Rodar: node C:/projetos/ocorr-ponto/scripts/test-chat-merge-sort-dedupe.mjs
// ============================================================================

let passou = 0;
let falhou = 0;
const falhas = [];

function ok(cond, nome, detalhe) {
  if (cond) {
    passou++;
    console.log("OK   - " + nome);
  } else {
    falhou++;
    falhas.push(nome + (detalhe ? " :: " + detalhe : ""));
    console.log("FALHA- " + nome + (detalhe ? "  >> " + detalhe : ""));
  }
}

function eqArr(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------
// ESPELHO 1:1 da lógica de mapDoc + emit() de escutarConversa (firebase.js).
// `enviadas`/`recebidas` já vêm "mapeadas" (id + criadoEm ISO|null), como saem
// de s.docs.map(mapDoc). Reproduzimos APENAS a mescla+sort do emit().
// ---------------------------------------------------------------------------
function emitMerge(enviadas, recebidas) {
  // espelha: [...enviadas, ...recebidas].sort((a,b)=>(a.criadoEm||"9999").localeCompare(b.criadoEm||"9999"))
  return [...enviadas, ...recebidas]
    .sort((a, b) => (a.criadoEm || "9999").localeCompare(b.criadoEm || "9999"));
}

// Espelho de tsToIso (firebase.js:2157) só pra reproduzir a entrada do mapDoc:
// serverTimestamp pendente chega como null -> tsToIso(null) -> null.
function tsToIso(ts) {
  if (!ts) return null;
  if (typeof ts === "string") return ts;
  return (ts.toDate ? ts.toDate() : new Date(ts)).toISOString();
}

// Atalho pra construir uma msg como ela existe pós-mapDoc.
function msg(id, de, para, criadoEm, extra = {}) {
  return { id, de, para, texto: "t" + id, criadoEm: tsToIso(criadoEm), ...extra };
}

const MEU = "uidMeu";
const PEER = "uidPeer";

console.log("== Testes: mescla / ordenacao / dedupe das duas queries do chat ==\n");

// ---------------------------------------------------------------------------
// CASO 1: lista vazia (ambas as queries vazias)
// ---------------------------------------------------------------------------
{
  const r = emitMerge([], []);
  ok(eqArr(r, []), "C1 lista vazia -> []", JSON.stringify(r));
}

// ---------------------------------------------------------------------------
// CASO 2: 1 mensagem só (enviada)
// ---------------------------------------------------------------------------
{
  const a = msg("m1", MEU, PEER, "2026-06-13T10:00:00.000Z");
  const r = emitMerge([a], []);
  ok(r.length === 1 && r[0].id === "m1", "C2 uma msg enviada", JSON.stringify(r.map(x => x.id)));
}

// ---------------------------------------------------------------------------
// CASO 3: 1 mensagem só (recebida)
// ---------------------------------------------------------------------------
{
  const b = msg("m1", PEER, MEU, "2026-06-13T10:00:00.000Z");
  const r = emitMerge([], [b]);
  ok(r.length === 1 && r[0].id === "m1", "C3 uma msg recebida", JSON.stringify(r.map(x => x.id)));
}

// ---------------------------------------------------------------------------
// CASO 4: ambas direções, FORA DE ORDEM entre arrays -> deve ordenar asc por criadoEm
//   enviadas: 10:00 (e1), 10:04 (e2)
//   recebidas: 10:02 (r1), 10:06 (r2)
//   ordem esperada: e1(10:00), r1(10:02), e2(10:04), r2(10:06)
// ---------------------------------------------------------------------------
{
  const e1 = msg("e1", MEU, PEER, "2026-06-13T10:00:00.000Z");
  const e2 = msg("e2", MEU, PEER, "2026-06-13T10:04:00.000Z");
  const r1 = msg("r1", PEER, MEU, "2026-06-13T10:02:00.000Z");
  const r2 = msg("r2", PEER, MEU, "2026-06-13T10:06:00.000Z");
  const r = emitMerge([e2, e1], [r2, r1]); // já entram fora de ordem dentro de cada array
  const ids = r.map(x => x.id);
  ok(eqArr(ids, ["e1", "r1", "e2", "r2"]), "C4 ambas direcoes intercaladas, ordenadas asc", JSON.stringify(ids));
}

// ---------------------------------------------------------------------------
// CASO 5: mensagens fora de ordem dentro de uma única query
// ---------------------------------------------------------------------------
{
  const a3 = msg("a3", MEU, PEER, "2026-06-13T09:30:00.000Z");
  const a1 = msg("a1", MEU, PEER, "2026-06-13T08:00:00.000Z");
  const a2 = msg("a2", MEU, PEER, "2026-06-13T09:00:00.000Z");
  const r = emitMerge([a3, a1, a2], []);
  ok(eqArr(r.map(x => x.id), ["a1", "a2", "a3"]), "C5 fora de ordem numa query -> reordena", JSON.stringify(r.map(x => x.id)));
}

// ---------------------------------------------------------------------------
// CASO 6: msg OTIMISTA sem timestamp (serverTimestamp pendente -> criadoEm null)
//   Deve ir pro FIM (null -> "9999"), mesmo que logicamente seja a mais recente.
// ---------------------------------------------------------------------------
{
  const a1 = msg("a1", MEU, PEER, "2026-06-13T10:00:00.000Z");
  const aOtim = msg("aOtim", MEU, PEER, null); // criadoEm null (otimista)
  const r1c = msg("r1", PEER, MEU, "2026-06-13T10:05:00.000Z");
  const r = emitMerge([a1, aOtim], [r1c]);
  const ids = r.map(x => x.id);
  ok(ids[ids.length - 1] === "aOtim", "C6 msg otimista (ts null) vai pro fim", JSON.stringify(ids));
  ok(eqArr(ids, ["a1", "r1", "aOtim"]), "C6b ordem completa com otimista no fim", JSON.stringify(ids));
}

// ---------------------------------------------------------------------------
// CASO 6c: VÁRIAS otimistas (todas null) — não viram NaN nem quebram o sort.
// ---------------------------------------------------------------------------
{
  const o1 = msg("o1", MEU, PEER, null);
  const o2 = msg("o2", MEU, PEER, null);
  const real = msg("real", PEER, MEU, "2026-06-13T07:00:00.000Z");
  const r = emitMerge([o1, o2], [real]);
  const ids = r.map(x => x.id);
  // real primeiro; otimistas no fim (ordem relativa entre elas = estável)
  ok(ids[0] === "real", "C6c real antes das otimistas", JSON.stringify(ids));
  ok(ids.indexOf("o1") < ids.indexOf("o2"), "C6d otimistas mantêm ordem estável entre si", JSON.stringify(ids));
}

// ---------------------------------------------------------------------------
// CASO 7: ESTABILIDADE — empate de timestamp (mesmo criadoEm) preserva a ordem
//   de inserção. enviadas vêm ANTES de recebidas no spread; dentro de cada
//   array a ordem original é mantida (Array.sort do V8 é estável).
// ---------------------------------------------------------------------------
{
  const T = "2026-06-13T12:00:00.000Z";
  const e1 = msg("e1", MEU, PEER, T);
  const e2 = msg("e2", MEU, PEER, T);
  const r1 = msg("r1", PEER, MEU, T);
  const r2 = msg("r2", PEER, MEU, T);
  const r = emitMerge([e1, e2], [r1, r2]);
  // Tudo empatado -> ordem = ordem do spread [enviadas..., recebidas...]
  ok(eqArr(r.map(x => x.id), ["e1", "e2", "r1", "r2"]), "C7 empate de ts -> ordem estável (enviadas antes)", JSON.stringify(r.map(x => x.id)));
}

// ---------------------------------------------------------------------------
// CASO 8: DEDUPE por id — mesma id aparecendo nas DUAS queries.
//   No mundo real, um doc tem um único (de,para), então A e B são disjuntas e
//   isso "não acontece". MAS a tarefa pede testar dedupe. O código REAL não
//   deduplica: [...enviadas,...recebidas] mantém AMBAS. Verificamos o
//   comportamento verdadeiro (espelho fiel) e registramos como achado.
// ---------------------------------------------------------------------------
let dupResultIds = null;
{
  const dup = msg("dupX", MEU, PEER, "2026-06-13T11:00:00.000Z");
  // simulando o (impossível-na-prática) overlap: mesma id nas duas listas
  const dupB = { ...dup };
  const r = emitMerge([dup], [dupB]);
  dupResultIds = r.map(x => x.id);
  const distintos = new Set(dupResultIds).size;
  // ESPELHO FIEL: esperamos 2 ocorrências (sem dedupe). Asserção documenta o real.
  ok(r.length === 2 && distintos === 1, "C8 espelho do real: id duplicada NÃO é deduplicada (mantém 2)", JSON.stringify(dupResultIds));
}

// ---------------------------------------------------------------------------
// CASO 9: ECO/ENVIO — antes do 2º snapshot (prontoA && prontoB) não emite.
//   Espelhamos o gate de emit(): só chama cb quando os DOIS snapshots chegaram.
// ---------------------------------------------------------------------------
{
  let prontoA = false, prontoB = false;
  let enviadas = [], recebidas = [];
  let emissoes = 0;
  let ultima = null;
  const emit = () => {
    if (!prontoA || !prontoB) return;
    ultima = emitMerge(enviadas, recebidas);
    emissoes++;
  };
  // Chega só o snapshot A (enviadas)
  enviadas = [msg("e1", MEU, PEER, "2026-06-13T10:00:00.000Z")];
  prontoA = true; emit();
  ok(emissoes === 0, "C9 não emite só com snapshot A (evita piscar)", "emissoes=" + emissoes);
  // Chega o snapshot B (recebidas) — agora emite
  recebidas = [msg("r1", PEER, MEU, "2026-06-13T10:01:00.000Z")];
  prontoB = true; emit();
  ok(emissoes === 1, "C9b emite após os 2 snapshots", "emissoes=" + emissoes);
  ok(ultima && eqArr(ultima.map(x => x.id), ["e1", "r1"]), "C9c conteúdo correto na 1ª emissão", JSON.stringify(ultima && ultima.map(x => x.id)));
}

// ---------------------------------------------------------------------------
// CASO 10: pureza — emitMerge não muta os arrays de entrada.
// ---------------------------------------------------------------------------
{
  const ent = [msg("z2", MEU, PEER, "2026-06-13T10:02:00.000Z"), msg("z1", MEU, PEER, "2026-06-13T10:00:00.000Z")];
  const rec = [msg("z3", PEER, MEU, "2026-06-13T10:03:00.000Z")];
  const snapEnt = ent.map(x => x.id);
  const snapRec = rec.map(x => x.id);
  emitMerge(ent, rec);
  ok(eqArr(ent.map(x => x.id), snapEnt) && eqArr(rec.map(x => x.id), snapRec),
     "C10 não muta arrays de entrada (spread copia antes do sort)", JSON.stringify(ent.map(x => x.id)));
}

// ---------------------------------------------------------------------------
// CASO 11: ordenação lexicográfica de ISO == cronológica (válido em ISO 8601 UTC)
//   Inclui virada de dia/mês pra garantir que string compare não erra.
// ---------------------------------------------------------------------------
{
  const a = msg("dezembro", MEU, PEER, "2025-12-31T23:59:59.000Z");
  const b = msg("janeiro", PEER, MEU, "2026-01-01T00:00:01.000Z");
  const r = emitMerge([a], [b]);
  ok(eqArr(r.map(x => x.id), ["dezembro", "janeiro"]), "C11 ISO lexicográfico == cronológico (virada de ano)", JSON.stringify(r.map(x => x.id)));
}

// ---------------------------------------------------------------------------
// CASO 12: msg otimista VS msg real com timestamp futuro próximo de "9999".
//   Garante que o fallback "9999" não colide com timestamps ISO reais
//   (ISO sempre começa com ano de 4 dígitos < 9999, então "2026..." < "9999").
// ---------------------------------------------------------------------------
{
  const real = msg("real", MEU, PEER, "2026-06-13T23:59:59.999Z");
  const otim = msg("otim", PEER, MEU, null);
  const r = emitMerge([real], [otim]);
  ok(eqArr(r.map(x => x.id), ["real", "otim"]), "C12 fallback '9999' fica após qualquer ISO real", JSON.stringify(r.map(x => x.id)));
}

// ---------------------------------------------------------------------------
console.log("\n== Resumo ==");
console.log("Total: " + (passou + falhou) + " | Passou: " + passou + " | Falhou: " + falhou);
if (falhas.length) {
  console.log("Falhas:");
  falhas.forEach(f => console.log("  - " + f));
}
// Sinaliza o comportamento do dedupe pro relatório.
console.log("\n[NOTA dedupe] C8 ids retornadas: " + JSON.stringify(dupResultIds) +
  " (real não deduplica; A/B são disjuntas na prática, então sem impacto)");

process.exit(falhou ? 1 : 0);
