// REPRO: o colaborador usa LIST QUERIES (where().get()) para ler comunicados/documentos.
// Os testes existentes só cobrem getDoc (1 doc). Este arquivo roda as QUERIES exatas do
// cliente (firebase.js carregarDadosCompletos ramo colaborador) contra as rules reais.
//
//   firebase emulators:exec --only firestore "node --test tests/colab-query-repro.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import assert from "node:assert";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-query-repro",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // colaborador "basico": sem turno/setor (como muitos users no boot)
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", funcionarioId: "f-100", codigo: 100, nome: "Maria" });
    // colaborador com turno/setor denormalizado
    await setDoc(doc(db, "users/uColabT1"), { role: "colaborador", funcionarioId: "f-300", codigo: 300, nome: "Tonho", turno: 1, setor: "PRODUÇÃO" });

    await setDoc(doc(db, "comunicados/cTodos"),  { titulo: "Geral", corpo: "x", ativo: true, segmento: { tipo: "todos", valores: [] }, autorUid: "uRh", autorNome: "GH", publicadoEm: new Date(), alcanceEstimado: 80 });
    await setDoc(doc(db, "comunicados/cTurno1"), { titulo: "T1", corpo: "x", ativo: true, segmento: { tipo: "turno", valores: [1] }, autorUid: "uRh", autorNome: "GH", publicadoEm: new Date(), alcanceEstimado: 20 });

    await setDoc(doc(db, "documentos/dPub"), { escopo: "institucional", status: "publicado", segmento: { tipo: "todos", valores: [] }, exigeAssinatura: true, versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: new Date(), titulo: "Conduta" });
  });
});

after(async () => { await env.cleanup(); });

const colab   = () => env.authenticatedContext("uColab").firestore();
const colabT1 = () => env.authenticatedContext("uColabT1").firestore();

// ===== As QUERIES EXATAS do cliente (firebase.js:2390-2392 e 2418-2421) =====

test("QUERY comunicados TODOS (colaborador basico) — deve PASSAR e retornar cTodos", async () => {
  const db = colab();
  const q = query(collection(db, "comunicados"), where("ativo", "==", true), where("segmento.tipo", "==", "todos"));
  const snap = await assertSucceeds(getDocs(q));
  assert.equal(snap.size, 1, "esperava 1 comunicado 'todos'");
});

test("QUERY comunicados TURNO (colabT1, turno 1) — deve PASSAR e retornar cTurno1", async () => {
  const db = colabT1();
  const q = query(collection(db, "comunicados"), where("ativo", "==", true), where("segmento.tipo", "==", "turno"), where("segmento.valores", "array-contains", 1));
  const snap = await assertSucceeds(getDocs(q));
  assert.equal(snap.size, 1, "esperava 1 comunicado do turno 1");
});

test("QUERY documentos institucional publicado TODOS (colaborador basico) — deve PASSAR e retornar dPub", async () => {
  const db = colab();
  const q = query(collection(db, "documentos"), where("status", "==", "publicado"), where("escopo", "==", "institucional"), where("segmento.tipo", "==", "todos"));
  const snap = await assertSucceeds(getDocs(q));
  assert.equal(snap.size, 1, "esperava 1 documento institucional publicado 'todos'");
});
