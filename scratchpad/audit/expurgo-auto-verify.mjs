// EXPURGO AUTOMÁTICO de candidaturas (LGPD, William 2026-07-16). Prova a varredura
// window.expurgarCandidaturasVencidas de public/firebase.js SEM browser: extrai a função
// REAL (e a real window.excluirCandidatura que ela reusa) do fonte e roda com primitivos
// fake + relógio stubado (FakeDate). Cenários:
//   (a) vaga encerrada há 7 meses, 2 candidaturas (1 com currículo) = varrida; ordem
//       arquivo-antes-do-doc provada; auditoria-resumo registrada;
//   (b) encerrada há 5 meses = INTOCADA;
//   (c) publicada antiga = INTOCADA;
//   (d) usuário SEM a cap vagas.gerenciar = varredura nem tenta;
//   (e) erro no delete de 1 candidatura não derruba o resto.
import { readFileSync } from "node:fs";

const src = readFileSync("public/firebase.js", "utf8");

// extrai "window.NOME = async function ... { ...balanceado... };"
function extraiFn(nome) {
  const marca = `window.${nome} = async function`;
  const ini = src.indexOf(marca);
  if (ini < 0) throw new Error("não achei " + nome + " no fonte");
  const abre = src.indexOf("{", ini);
  let prof = 0, fim = -1;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === "{") prof++;
    else if (src[i] === "}") { prof--; if (prof === 0) { fim = i; break; } }
  }
  return src.slice(ini, fim + 1) + ";";
}
// o bloco da varredura começa na const da janela e vai até o fim da função (inclui _expurgoEmCurso)
function extraiSweep() {
  const idxConst = src.indexOf("const EXPURGO_CAND_MESES");
  if (idxConst < 0) throw new Error("não achei const EXPURGO_CAND_MESES");
  const marca = "window.expurgarCandidaturasVencidas = async function";
  const ini = src.indexOf(marca);
  const abre = src.indexOf("{", ini);
  let prof = 0, fim = -1;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === "{") prof++;
    else if (src[i] === "}") { prof--; if (prof === 0) { fim = i; break; } }
  }
  return src.slice(idxConst, fim + 1) + ";";
}

const corpoExcluir = extraiFn("excluirCandidatura");
const blocoSweep = extraiSweep();

const FALHAS = [];
const ok = (nome, cond) => { if (cond) console.log("  ok:", nome); else { console.log("  FALHA:", nome); FALHAS.push(nome); } };

// Relógio fixo: 15/07/2026. corte = 6 meses antes = 15/01/2026.
const NOW_MS = Date.parse("2026-07-15T12:00:00Z");
class FakeDate extends Date {
  constructor(...a) { if (a.length === 0) super(NOW_MS); else super(...a); }
}
const ts = (iso) => ({ toDate: () => new Date(Date.parse(iso)) }); // Timestamp cru fake

function montarCenario() {
  return {
    vagas: [
      { id: "VA", status: "encerrada", titulo: "Operador A", encerradaEm: ts("2025-12-10") }, // 7 meses: varre
      { id: "VB", status: "encerrada", titulo: "Operador B", encerradaEm: ts("2026-02-20") }, // 5 meses: intocada
      { id: "VC", status: "publicada", titulo: "Operador C", encerradaEm: ts("2024-01-01") }, // publicada antiga: intocada
      { id: "VE", status: "encerrada", titulo: "Operador E", encerradaEm: ts("2025-12-10") }, // 7 meses: varre, 1 erra
    ],
    candidaturas: [
      { id: "A1", vagaId: "VA", curriculoPath: "curriculos/v1/A1.pdf" },
      { id: "A2", vagaId: "VA" },
      { id: "B1", vagaId: "VB", curriculoPath: "curriculos/v1/B1.pdf" },
      { id: "C1", vagaId: "VC" },
      { id: "E1", vagaId: "VE", curriculoPath: "curriculos/v1/E1.pdf" },
      { id: "E2", vagaId: "VE" }, // db.delete vai lançar pra este
      { id: "E3", vagaId: "VE", curriculoPath: "curriculos/v1/E3.pdf" },
    ],
  };
}

async function rodar({ podeCap }) {
  const order = [];
  const audit = [];
  const state = montarCenario();
  const win = {};
  win.registrarAuditoria = (evt) => { audit.push(evt); };
  const firebase = { storage: () => ({ ref: (p) => ({ delete: async () => { order.push("storage:" + p); } }) }) };
  const db = { collection: (c) => ({ doc: (id) => ({ delete: async () => {
    if (id === "E2") throw Object.assign(new Error("permission-denied"), { code: "permission-denied" });
    order.push("doc:" + id);
  } }) }) };
  const debug = () => {};
  const can = () => podeCap;
  const factory = new Function(
    "window", "state", "firebase", "db", "debug", "can", "Date",
    corpoExcluir + "\n" + blocoSweep + "\nreturn window.expurgarCandidaturasVencidas;",
  );
  const fn = factory(win, state, firebase, db, debug, can, FakeDate);
  await fn();
  return { order, audit, state };
}

// ===== (a)(b)(c)(e): sessão COM a cap =====
const r = await rodar({ podeCap: true });
console.log("ordem:", JSON.stringify(r.order));
console.log("auditoria:", JSON.stringify(r.audit));

// (a) VA varrida: A1 (com currículo) e A2 apagados
ok("(a) A1 apagada", r.order.includes("storage:curriculos/v1/A1.pdf") && r.order.includes("doc:A1"));
ok("(a) A2 apagada (sem currículo, só doc)", r.order.includes("doc:A2"));
// (a) ordem arquivo-antes-do-doc pra A1
ok("(a) ARQUIVO antes do DOC (A1)", r.order.indexOf("storage:curriculos/v1/A1.pdf") < r.order.indexOf("doc:A1") && r.order.indexOf("storage:curriculos/v1/A1.pdf") >= 0);
// (a) auditoria-resumo da vaga VA com contagem 2
ok("(a) auditoria-resumo VA (2)", r.audit.some((e) => e.tipo === "vagas" && /Expurgo automático: 2 /.test(e.acao) && /Operador A/.test(e.alvo)));
// (a) auditoria-resumo NÃO carrega PII do candidato (só título da vaga + contagem)
ok("(a) resumo sem PII do candidato", r.audit.filter((e) => /Expurgo automático/.test(e.acao)).every((e) => /^Vaga · /.test(e.alvo)));

// (b) VB (5 meses) intocada
ok("(b) B1 INTOCADA", !r.order.includes("doc:B1") && !r.order.includes("storage:curriculos/v1/B1.pdf"));
ok("(b) sem resumo pra VB", !r.audit.some((e) => /Expurgo automático/.test(e.acao) && /Operador B/.test(e.alvo)));

// (c) VC publicada antiga intocada
ok("(c) C1 INTOCADA (vaga publicada)", !r.order.includes("doc:C1"));

// (e) VE: E1 e E3 apagados, E2 erra mas não derruba, resumo conta 2
ok("(e) E1 e E3 apagados apesar do erro em E2", r.order.includes("doc:E1") && r.order.includes("doc:E3"));
ok("(e) E2 NÃO apagado (erro isolado)", !r.order.includes("doc:E2"));
ok("(e) auditoria-resumo VE conta os 2 que saíram", r.audit.some((e) => /Expurgo automático: 2 /.test(e.acao) && /Operador E/.test(e.alvo)));
// reuso gera as entradas "Excluiu candidatura" por candidatura apagada
ok("(e) reuso registra 'Excluiu candidatura' por item", r.audit.filter((e) => e.acao === "Excluiu candidatura").length === 4);

// state fica honesto: purgadas somem, intocadas/erro ficam
const ids = r.state.candidaturas.map((c) => c.id).sort();
ok("state limpo (sobram B1,C1,E2)", JSON.stringify(ids) === JSON.stringify(["B1", "C1", "E2"]));

// ===== (d): sessão SEM a cap =====
const r2 = await rodar({ podeCap: false });
console.log("ordem (sem cap):", JSON.stringify(r2.order));
ok("(d) sem cap: NADA apagado", r2.order.length === 0);
ok("(d) sem cap: NENHUMA auditoria", r2.audit.length === 0);
ok("(d) sem cap: state intacto (7 candidaturas)", r2.state.candidaturas.length === 7);

console.log(FALHAS.length ? `RESULTADO: ${FALHAS.length} FALHA(S)` : "RESULTADO: TUDO OK");
process.exit(FALHAS.length ? 1 : 0);
