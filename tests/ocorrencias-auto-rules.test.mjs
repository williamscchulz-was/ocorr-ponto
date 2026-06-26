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
    await setDoc(doc(db, "users/uLider"),  { role: "lider", turno: 1, nome: "Lider" });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", funcionarioId: "f-100", nome: "Maria" });
    await setDoc(doc(db, "ocorrencias-auto/oca1"), baseDoc());
    await setDoc(doc(db, "ocorrencias-auto/oca2"), baseDoc({ historico: [{ acao: "gerada", por: "pipeline", emIso: "2026-06-26T16:00:00Z" }] }));
  });
});

after(async () => { await env.cleanup(); });

const rh    = () => env.authenticatedContext("uRh").firestore();
const admin = () => env.authenticatedContext("uAdmin").firestore();
const lider = () => env.authenticatedContext("uLider").firestore();
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
