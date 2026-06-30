// Rules da coleção /eventos (log de auditoria de TODO usuário): self-write append-only,
// leitura só p/ auditoria.ver. Cada um grava só o PRÓPRIO evento (por == uid).
//
//   firebase emulators:exec --only firestore "node --test tests/eventos-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-eventos-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"), { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"),    { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uLider"), { role: "lider", turno: 1, nome: "Lider" });
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", funcionarioId: "f-1", nome: "Maria" });
    await setDoc(doc(db, "eventos/seed"), { por: "x", porNome: "Seed", porRole: "admin", tipo: "login", acao: "Entrou", em: new Date() });
  });
});
after(async () => { await env.cleanup(); });

const ctxFor = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const ev = (uid, over = {}) => ({ por: uid, porNome: "X", porRole: "colaborador", tipo: "login", acao: "Entrou", em: serverTimestamp(), ...over });

// ---- create: self-write (qualquer papel grava o PRÓPRIO) ----
test("Colaborador registra o próprio evento", async () =>
  assertSucceeds(addDoc(collection(ctxFor("uColab"), "eventos"), ev("uColab"))));
test("Líder registra o próprio evento", async () =>
  assertSucceeds(addDoc(collection(ctxFor("uLider"), "eventos"), ev("uLider"))));
test("Admin registra o próprio evento", async () =>
  assertSucceeds(addDoc(collection(ctxFor("uAdmin"), "eventos"), ev("uAdmin"))));
test("Evento com alvo válido + sem porNome passa", async () =>
  assertSucceeds(addDoc(collection(ctxFor("uColab"), "eventos"), { por: "uColab", tipo: "ciencia", acao: "Deu ciência", alvo: "Documento X", em: serverTimestamp() })));

// ---- por != uid / anônimo bloqueados ----
test("NÃO registra evento com por de OUTRO uid", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), "eventos"), ev("uAdmin"))));
test("Anônimo NÃO registra", async () =>
  assertFails(addDoc(collection(anon(), "eventos"), ev("quemquer"))));

// ---- validações de campo ----
test("NÃO aceita acao > 200", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), "eventos"), ev("uColab", { acao: "a".repeat(201) }))));
test("NÃO aceita acao vazia", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), "eventos"), ev("uColab", { acao: "" }))));
test("NÃO aceita campo extra", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), "eventos"), ev("uColab", { segredo: "x" }))));
test("NÃO aceita em != server time", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), "eventos"), ev("uColab", { em: new Date(2020, 0, 1) }))));
test("NÃO aceita alvo > 300", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), "eventos"), ev("uColab", { alvo: "a".repeat(301) }))));

// ---- leitura gated por auditoria.ver ----
test("Admin lê eventos", async () => assertSucceeds(getDoc(doc(ctxFor("uAdmin"), "eventos/seed"))));
test("RH lê eventos (fallback auditoria.ver)", async () => assertSucceeds(getDoc(doc(ctxFor("uRh"), "eventos/seed"))));
test("Colaborador NÃO lê eventos", async () => assertFails(getDoc(doc(ctxFor("uColab"), "eventos/seed"))));
test("Líder NÃO lê eventos (sem cap)", async () => assertFails(getDoc(doc(ctxFor("uLider"), "eventos/seed"))));

// ---- append-only ----
test("Ninguém atualiza evento", async () =>
  assertFails(updateDoc(doc(ctxFor("uAdmin"), "eventos/seed"), { acao: "Adulterado" })));
test("Ninguém deleta evento", async () =>
  assertFails(deleteDoc(doc(ctxFor("uAdmin"), "eventos/seed"))));
