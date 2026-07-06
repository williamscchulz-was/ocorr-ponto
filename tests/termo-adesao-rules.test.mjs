// Rules do TERMO DE ADESAO (/termoAdesao/{uid}) — registro imutável da ciência do termo,
// um por pessoa, id do doc == uid do colaborador:
//   - read: autenticado E (auth.uid==uid OU admin OU RH via temCap('documentos.gerenciar', isRH())).
//   - create: auth.uid==uid E data.uid==uid E hasOnly[uid,funcionarioId,versao,hashSha256,em,userAgent]
//             E euSouODono(data.funcionarioId) (colaborador COM vinculo real, funcionarioId batendo)
//             E versao == '2026-07-v1' (CRAVADO) E hashSha256 == '931a...e16c805' (CRAVADO)
//             E userAgent is string E em == request.time (serverTimestamp).
//   - update, delete: proibido (append-only, ciencia imutavel).
//
//   firebase emulators:exec --only firestore "node --test tests/termo-adesao-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

let env;

// Valores CRAVADOS na regra (Fable): versao + sha256 do texto canonico congelado.
const VERSAO = "2026-07-v1";
const HASH = "931a476238918cb6e771e30238b307403606b224b1b32745ce21f6197e16c805";

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-termoadesao-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", funcionarioId: "f-admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", funcionarioId: "f-1", nome: "Maria" });
    await setDoc(doc(db, "users/uColab2"), { role: "colaborador", funcionarioId: "f-2", nome: "Ana" });
    await setDoc(doc(db, "users/uOutro"),  { role: "colaborador", funcionarioId: "f-9", nome: "Fulano" });

    // Termo ja semeado do "u-outro" (rules off) pra testar leitura por terceiro/admin/RH e
    // as tentativas de update/delete sobre doc EXISTENTE.
    await setDoc(doc(db, "termoAdesao/uOutro"), {
      uid: "uOutro", funcionarioId: "f-9", versao: VERSAO, hashSha256: HASH, userAgent: "seed", em: new Date(),
    });
  });
});
after(async () => { await env.cleanup(); });

const ctxFor = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

// termo valido do dono uColab: 6 campos, versao + hash cravados, funcionarioId == users/uColab (f-1).
const termo = (over = {}) => ({
  uid: "uColab", funcionarioId: "f-1", versao: VERSAO, hashSha256: HASH,
  userAgent: "test", em: serverTimestamp(), ...over,
});

// ================= create =================
test("Dono colaborador cria termo valido (6 campos, versao+hash cravados)", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uColab"), "termoAdesao/uColab"), termo())));

test("auth.uid != id do doc falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab2"), "termoAdesao/uColab"), termo())));

test("data.uid != id do doc falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoAdesao/uColab"), termo({ uid: "outro" }))));

test("funcionarioId != users.funcionarioId do proprio falha (euSouODono)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoAdesao/uColab"), termo({ funcionarioId: "f-999" }))));

test("NAO-colaborador (admin) criando o proprio termo falha (euSouODono exige isColaborador)", async () =>
  assertFails(setDoc(doc(ctxFor("uAdmin"), "termoAdesao/uAdmin"),
    termo({ uid: "uAdmin", funcionarioId: "f-admin" }))));

test("campo extra alem dos 6 falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoAdesao/uColab"), termo({ extra: 1 }))));

test("versao diferente do cravado falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoAdesao/uColab"), termo({ versao: "2025-01-v0" }))));

test("hashSha256 diferente do cravado falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoAdesao/uColab"), termo({ hashSha256: "deadbeef" }))));

test("SEM o campo hashSha256 (5 campos) falha", async () => {
  const semHash = termo(); delete semHash.hashSha256;
  await assertFails(setDoc(doc(ctxFor("uColab"), "termoAdesao/uColab"), semHash));
});

test("em != request.time (data fixa) falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoAdesao/uColab"), termo({ em: new Date(2020, 0, 1) }))));

test("userAgent nao-string falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoAdesao/uColab"), termo({ userAgent: 123 }))));

test("anonimo cria falha", async () =>
  assertFails(setDoc(doc(anon(), "termoAdesao/anon"), termo({ uid: "anon", funcionarioId: "f-1" }))));

// ================= update / delete proibidos =================
test("update proibido (doc existente)", async () =>
  assertFails(updateDoc(doc(ctxFor("uOutro"), "termoAdesao/uOutro"), { versao: "2" })));

test("delete proibido (dono)", async () =>
  assertFails(deleteDoc(doc(ctxFor("uOutro"), "termoAdesao/uOutro"))));

test("delete proibido (admin)", async () =>
  assertFails(deleteDoc(doc(ctxFor("uAdmin"), "termoAdesao/uOutro"))));

// ================= read =================
test("Dono le o proprio termo", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uOutro"), "termoAdesao/uOutro"))));

test("Outro colaborador NAO le termo alheio", async () =>
  assertFails(getDoc(doc(ctxFor("uColab"), "termoAdesao/uOutro"))));

test("Admin le termo de outro", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uAdmin"), "termoAdesao/uOutro"))));

test("RH le termo de outro", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uRh"), "termoAdesao/uOutro"))));

test("anonimo NAO le", async () =>
  assertFails(getDoc(doc(anon(), "termoAdesao/uOutro"))));
