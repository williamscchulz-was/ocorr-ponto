// Suíte de testes das Firestore rules — Fundação SELF (Fase 1).
// Roda contra o Firestore Emulator. Requer Java 21+ (firebase-tools 15).
// (Não roda no ambiente de dev atual, que tem Java 8 — rodar numa máquina com JDK 21.)
//
//   npm install --no-save @firebase/rules-unit-testing firebase
//   firebase emulators:exec --only firestore "node --test tests/firestore-rules.test.mjs"
//
// Matriz (plano docs/FASE1-FUNDACAO-SELF.md §6): colaborador-próprio-OK / colaborador-terceiro-NEGADO
// / gestor-sem-regressão / PII-negada / fail-safe sem vínculo.

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-rules-test",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
  // Semeia dados ignorando as rules (estado inicial).
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uColab"),        { role: "colaborador", funcionarioId: "f-100", nome: "Maria" });
    await setDoc(doc(db, "users/uColab2"),       { role: "colaborador", funcionarioId: "f-200", nome: "Ana" });
    await setDoc(doc(db, "users/uColabSemVinc"), { role: "colaborador", nome: "Sem Vinculo" });
    await setDoc(doc(db, "users/uRh"),           { role: "rh", nome: "GH" });
    await setDoc(doc(db, "funcionarios/f-100"), { nome: "Maria", nascimento: "1990-07-14" });
    await setDoc(doc(db, "funcionarios/f-200"), { nome: "Ana" });
    await setDoc(doc(db, "ocorrencias/o100"), { funcionarioId: "f-100", funcionarioTurno: 1, tipo: "falta" });
    await setDoc(doc(db, "ocorrencias/o200"), { funcionarioId: "f-200", funcionarioTurno: 2, tipo: "falta" });
    await setDoc(doc(db, "banco-horas-saldos/f-100"), { cpf: "000.000.000-00", saldoMin: 150 });
  });
});

after(async () => { await env.cleanup(); });

const colab    = () => env.authenticatedContext("uColab").firestore();
const colabSV  = () => env.authenticatedContext("uColabSemVinc").firestore();
const rh       = () => env.authenticatedContext("uRh").firestore();

// ---- funcionarios ----
test("colaborador LÊ o próprio funcionário", async () =>
  assertSucceeds(getDoc(doc(colab(), "funcionarios/f-100"))));
test("colaborador NÃO lê funcionário de terceiro", async () =>
  assertFails(getDoc(doc(colab(), "funcionarios/f-200"))));
test("RH lê qualquer funcionário (sem regressão)", async () =>
  assertSucceeds(getDoc(doc(rh(), "funcionarios/f-200"))));
test("colaborador SEM vínculo não lê nenhum funcionário (fail-safe)", async () =>
  assertFails(getDoc(doc(colabSV(), "funcionarios/f-100"))));

// ---- users ----
test("colaborador LÊ o próprio user", async () =>
  assertSucceeds(getDoc(doc(colab(), "users/uColab"))));
test("colaborador NÃO lê user de terceiro", async () =>
  assertFails(getDoc(doc(colab(), "users/uColab2"))));
test("RH lê qualquer user (chat/diretório intacto)", async () =>
  assertSucceeds(getDoc(doc(rh(), "users/uColab"))));
test("colaborador zera precisaTrocarSenha no próprio doc (self-update)", async () =>
  assertSucceeds(updateDoc(doc(colab(), "users/uColab"), { precisaTrocarSenha: false })));
test("colaborador NÃO consegue escalar o próprio role", async () =>
  assertFails(updateDoc(doc(colab(), "users/uColab"), { role: "admin" })));
test("colaborador NÃO altera o próprio funcionarioId", async () =>
  assertFails(updateDoc(doc(colab(), "users/uColab"), { funcionarioId: "f-200" })));

// ---- ocorrencias ----
test("colaborador LÊ a própria ocorrência", async () =>
  assertSucceeds(getDoc(doc(colab(), "ocorrencias/o100"))));
test("colaborador NÃO lê ocorrência de terceiro", async () =>
  assertFails(getDoc(doc(colab(), "ocorrencias/o200"))));
test("RH lê ocorrência (sem regressão)", async () =>
  assertSucceeds(getDoc(doc(rh(), "ocorrencias/o100"))));

// ---- PII (banco-horas-saldos: CPF/PIS) ----
test("colaborador NÃO lê banco-horas-saldos (PII, nem o próprio)", async () =>
  assertFails(getDoc(doc(colab(), "banco-horas-saldos/f-100"))));
test("RH lê banco-horas-saldos (sem regressão)", async () =>
  assertSucceeds(getDoc(doc(rh(), "banco-horas-saldos/f-100"))));
