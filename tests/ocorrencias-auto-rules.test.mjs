// Rules da coleção ocorrencias-auto (TESTE/sandbox): leitura + conferência por admin/RH;
// conteúdo só do servidor; update restrito a status(->conferida) + historico(append).
//
//   firebase emulators:exec --only firestore "node --test tests/ocorrencias-auto-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

let env;

const baseDoc = (over = {}) => ({
  origem: "pipeline-apuracoes",
  status: "aguardando_conferencia",
  codigo: 1059, funcionarioId: "f-1059", nome: "Jair Knoth",
  setor: "PREPARAÇÃO", turno: 3, escala: "6x1", turma: "B",
  dataIso: "2026-06-01", data: "01/06/2026",
  tipo: "Faltas Injustificadas", tipoSituacao: "Falta Injustificada", grupo: "presenca",
  saldoDiario: "-08:00", saldosWK: [], lancamentosWK: "",
  marcacoesPrevistas: "22:00 06:00", marcacoesApuradas: "", horario: "", observacaoWK: "",
  historico: [],
  ...over,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-oca-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uLider"),  { role: "lider", turno: 1, nome: "Lider T1" });
    await setDoc(doc(db, "users/uLider2"), { role: "lider", turno: 2, nome: "Lider T2" });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", funcionarioId: "f-100", nome: "Maria" });
    await setDoc(doc(db, "ocorrencias-auto/oca1"), baseDoc());
    await setDoc(doc(db, "ocorrencias-auto/oca2"), baseDoc({ historico: [{ acao: "gerada", por: "pipeline", emIso: "2026-06-26T16:00:00Z" }] }));
    // fluxo novo (turno 1). rh_confere com historico vazio (mutacao -> size 1);
    // com_lider com historico size 1 (mutacao -> size 2). 1 doc por teste (sem estado compartilhado).
    const h1 = [{ acao: "validou", por: "uRh", emIso: "2026-06-30T12:00:00Z" }];
    for (const id of ["ocaRH", "ocaRHv", "ocaRHd", "ocaRHlv", "ocaRHld", "ocaRHc"]) {
      await setDoc(doc(db, "ocorrencias-auto/" + id), baseDoc({ status: "rh_confere", turno: 1 }));
    }
    await setDoc(doc(db, "ocorrencias-auto/ocaLD"),  baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLD2"), baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLD3"), baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLD4"), baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaDone"), baseDoc({ status: "confirmada", turno: 1, historico: h1 }));
  });
});

after(async () => { await env.cleanup(); });

const rh    = () => env.authenticatedContext("uRh").firestore();
const admin = () => env.authenticatedContext("uAdmin").firestore();
const lider = () => env.authenticatedContext("uLider").firestore();
const lider2 = () => env.authenticatedContext("uLider2").firestore();
const colab = () => env.authenticatedContext("uColab").firestore();

// ---- leitura ----
test("RH lê ocorrencia-auto", async () => assertSucceeds(getDoc(doc(rh(), "ocorrencias-auto/oca1"))));
test("Admin lê ocorrencia-auto", async () => assertSucceeds(getDoc(doc(admin(), "ocorrencias-auto/oca1"))));
test("Colaborador NÃO lê ocorrencia-auto", async () => assertFails(getDoc(doc(colab(), "ocorrencias-auto/oca1"))));
test("Líder NÃO lê ocorrencia-auto (sem cap)", async () => assertFails(getDoc(doc(lider(), "ocorrencias-auto/oca1"))));

// ---- conferência (update) ----
test("RH confere: status->conferida + historico+1", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/oca1"), {
    status: "conferida",
    historico: [{ acao: "conferida", por: "uRh", porNome: "Suyanne", emIso: "2026-06-26T17:00:00Z" }],
  })));

test("Admin confere oca2 (historico cresce de 1 para 2)", async () =>
  assertSucceeds(updateDoc(doc(admin(), "ocorrencias-auto/oca2"), {
    status: "conferida",
    historico: [
      { acao: "gerada", por: "pipeline", emIso: "2026-06-26T16:00:00Z" },
      { acao: "conferida", por: "uAdmin", porNome: "Will", emIso: "2026-06-26T17:05:00Z" },
    ],
  })));

// ---- bloqueios ----
test("RH NÃO altera outro campo (hasOnly status/historico)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/oca1"), { nome: "Adulterado" })));

test("RH NÃO leva status para valor != conferida", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/oca1"), {
    status: "cancelada",
    historico: [{ acao: "x", por: "uRh", emIso: "2026-06-26T17:00:00Z" }],
  })));

test("RH NÃO confere sem registrar trilha (historico não cresce)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/oca1"), { status: "conferida" })));

test("Colaborador NÃO confere", async () =>
  assertFails(updateDoc(doc(colab(), "ocorrencias-auto/oca1"), {
    status: "conferida",
    historico: [{ acao: "conferida", por: "uColab", emIso: "2026-06-26T17:00:00Z" }],
  })));

// ---- conteúdo é só do servidor ----
test("RH NÃO cria ocorrencia-auto (só Admin SDK)", async () =>
  assertFails(setDoc(doc(rh(), "ocorrencias-auto/novo"), baseDoc())));
test("RH NÃO deleta ocorrencia-auto", async () =>
  assertFails(deleteDoc(doc(rh(), "ocorrencias-auto/oca1"))));
test("Admin NÃO deleta ocorrencia-auto (só Admin SDK)", async () =>
  assertFails(deleteDoc(doc(admin(), "ocorrencias-auto/oca1"))));

// ===== Fluxo novo RH -> Lider =====
const histN = (n) => Array.from({ length: n }, (_, i) => ({ acao: "a" + i, por: "x", emIso: `2026-06-30T1${i}:00:00Z` }));

// leitura por turno (lider)
test("Líder do MESMO turno lê (turno 1)", async () => assertSucceeds(getDoc(doc(lider(), "ocorrencias-auto/ocaRH"))));
test("Líder de OUTRO turno NÃO lê", async () => assertFails(getDoc(doc(lider2(), "ocorrencias-auto/ocaRH"))));

// RH valida / dispensa (rh_confere historico size 0 -> mutacao size 1)
test("RH valida: rh_confere -> com_lider", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHv"), { status: "com_lider", historico: histN(1) })));
test("RH dispensa: rh_confere -> dispensada", async () =>
  assertSucceeds(updateDoc(doc(admin(), "ocorrencias-auto/ocaRHd"), { status: "dispensada", historico: histN(1) })));

// Lider confirma (turno dele) (com_lider historico size 1 -> mutacao size 2)
test("Líder do turno confirma: com_lider -> confirmada", async () =>
  assertSucceeds(updateDoc(doc(lider(), "ocorrencias-auto/ocaLD"), { status: "confirmada", historico: histN(2) })));
// Destinação da conferência (liturgia da manual): acao + observacao entram no update
test("Líder confirma COM ação e observação (destinação)", async () =>
  assertSucceeds(updateDoc(doc(lider(), "ocorrencias-auto/ocaLD3"), { status: "confirmada", historico: histN(2), acao: "advertencia-verbal", observacao: "Conversado com o colaborador." })));
test("Líder NÃO grava campo INTRUSO junto da conferência", async () =>
  assertFails(updateDoc(doc(lider(), "ocorrencias-auto/ocaLD4"), { status: "confirmada", historico: histN(2), acao: "abono", nome: "Hackeado" })));
test("Líder de OUTRO turno NÃO confirma", async () =>
  assertFails(updateDoc(doc(lider2(), "ocorrencias-auto/ocaLD2"), { status: "confirmada", historico: histN(2) })));

// Lider NÃO valida nem dispensa (só confirma)
test("Líder NÃO valida (rh_confere -> com_lider)", async () =>
  assertFails(updateDoc(doc(lider(), "ocorrencias-auto/ocaRHlv"), { status: "com_lider", historico: histN(1) })));
test("Líder NÃO dispensa", async () =>
  assertFails(updateDoc(doc(lider(), "ocorrencias-auto/ocaRHld"), { status: "dispensada", historico: histN(1) })));

// nunca reabre
test("Ninguém reabre confirmada -> rh_confere", async () =>
  assertFails(updateDoc(doc(admin(), "ocorrencias-auto/ocaDone"), { status: "rh_confere", historico: histN(2) })));
test("Colaborador NÃO age no fluxo novo", async () =>
  assertFails(updateDoc(doc(colab(), "ocorrencias-auto/ocaRHc"), { status: "com_lider", historico: histN(1) })));
