// Rules da colecao /ferias (dado novo do pipeline WKRADAR, 2026-07-23). Doc por codigo
// (sem prefixo f-), escrito SO pelo pipeline via Admin SDK (ignora estas rules): periodos[]
// + resumo{temVencida,...} + funcionarioId, SEM PII forte. LEITURA v1 espelha a fronteira de
// /funcionarios pro LADO GESTOR (admin/RH/lider/supervisor, papel-gestor global; e onde o badge
// "X dias vencidos" vai morar, a lista de Funcionarios). O doc NAO traz funcionarioTurno, entao
// nao da pra escopar lider por turno como o /bancoHoras; seguimos /funcionarios (global) de
// proposito. Colaborador NAO le, nem o proprio codigo (v2 futura). Escrita de cliente: false.
//
//   firebase emulators:exec --only firestore "node --test tests/ferias-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

let env;

// Shape do pipeline (WKRADAR): doc por codigo, funcionarioId com prefixo f-, resumo derivado.
const feriasDoc = () => ({
  funcionarioId: "f-476",
  periodos: [{
    aquisitivoInicio: "2025-08-14", aquisitivoFim: "2026-08-13",
    concessivoInicio: "2026-08-14", concessivoFim: "2027-08-13",
    direito: 27.5, situacao: "Em Aquisição", avos: 11, saldo: 27.5, gozos: [],
  }],
  resumo: { temVencida: false, qtdPeriodosVencidos: 0, diasVencidos: 0, proporcionalAtual: 27.5, deFeriasAgora: true },
  atualizadoEm: new Date(),
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-ferias-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"), { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"), { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uLider"), { role: "lider", turno: 1, nome: "Adelir" });
    await setDoc(doc(db, "users/uSuperv"), { role: "supervisor", funcionariosVisiveis: ["f-476"], turnosVisiveis: [1], nome: "Jacques" });
    // Colaborador DONO do doc /ferias/476 (codigo == 476, funcionarioId == f-476): prova que
    // nem o proprio le nesta v1.
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", codigo: 476, funcionarioId: "f-476", nome: "Jacques R" });
    // Doc de ferias ja gravado pelo "pipeline".
    await setDoc(doc(db, "ferias/476"), feriasDoc());
  });
});
after(async () => { await env.cleanup(); });

const admin  = () => env.authenticatedContext("uAdmin").firestore();
const rh     = () => env.authenticatedContext("uRh").firestore();
const lider  = () => env.authenticatedContext("uLider").firestore();
const superv = () => env.authenticatedContext("uSuperv").firestore();
const colab  = () => env.authenticatedContext("uColab").firestore();
const anon   = () => env.unauthenticatedContext().firestore();

// ---------- LEITURA: cada papel gestor da guarda LE ----------
test("ADMIN le ferias", async () => assertSucceeds(getDoc(doc(admin(), "ferias/476"))));
test("RH le ferias", async () => assertSucceeds(getDoc(doc(rh(), "ferias/476"))));
test("LIDER le ferias (guarda global, espelha /funcionarios)", async () =>
  assertSucceeds(getDoc(doc(lider(), "ferias/476"))));
test("SUPERVISOR le ferias (guarda global, espelha /funcionarios)", async () =>
  assertSucceeds(getDoc(doc(superv(), "ferias/476"))));

// ---------- LEITURA negada: colaborador (inclusive o proprio) + anonimo ----------
test("COLABORADOR DONO (codigo == doc) NAO le ferias (v1 so gestor)", async () =>
  assertFails(getDoc(doc(colab(), "ferias/476"))));
test("ANONIMO NAO le ferias", async () =>
  assertFails(getDoc(doc(anon(), "ferias/476"))));

// ---------- ESCRITA de cliente: false (ate admin; o pipeline escreve por Admin SDK) ----------
test("ADMIN NAO cria ferias (escrita so pelo pipeline)", async () =>
  assertFails(setDoc(doc(admin(), "ferias/999"), feriasDoc())));
test("RH NAO cria ferias", async () =>
  assertFails(setDoc(doc(rh(), "ferias/998"), feriasDoc())));
test("ADMIN NAO atualiza ferias", async () =>
  assertFails(updateDoc(doc(admin(), "ferias/476"), { "resumo.diasVencidos": 30 })));
test("RH NAO atualiza ferias", async () =>
  assertFails(updateDoc(doc(rh(), "ferias/476"), { "resumo.diasVencidos": 30 })));
test("ADMIN NAO deleta ferias", async () =>
  assertFails(deleteDoc(doc(admin(), "ferias/476"))));
test("COLABORADOR NAO escreve ferias", async () =>
  assertFails(setDoc(doc(colab(), "ferias/476"), feriasDoc())));
test("ANONIMO NAO escreve ferias", async () =>
  assertFails(setDoc(doc(anon(), "ferias/476"), feriasDoc())));
