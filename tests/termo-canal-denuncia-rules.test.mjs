// Rules do TERMO DO CANAL DE DENUNCIAS (/termoCanalDenuncia/{uid}) — ESPELHO do termoAdesao:
// registro imutável da ciência do termo do canal de denúncias, um por pessoa, id == uid:
//   - read: autenticado E (auth.uid==uid OU admin OU RH via temCap('documentos.gerenciar', isRH())).
//   - create: auth.uid==uid E data.uid==uid E hasOnly[uid,funcionarioId,versao,hashSha256,em,userAgent]
//             E euSouODono(data.funcionarioId) (colaborador COM vinculo real, funcionarioId batendo)
//             E versao == '2026-07-v1' (CRAVADO) E hashSha256 == 'f7bf...830a' (CRAVADO)
//             E userAgent is string E em == request.time (serverTimestamp).
//   - update, delete: proibido (append-only, ciencia imutavel).
//
//   firebase emulators:exec --only firestore "node --test tests/termo-canal-denuncia-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

let env;

// Valores CRAVADOS na regra (Fable): versao + sha256 do texto canonico congelado
// (docs/termo-canal-denuncia-2026-07-v1.txt, LF).
const VERSAO = "2026-07-v1";
const HASH = "f7bf0960ff6e24f20800b414ed3d354e0e0291417996842a552984b87dbc830a";

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-termocanal-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", funcionarioId: "f-admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", funcionarioId: "f-1", nome: "Maria" });
    await setDoc(doc(db, "users/uColab2"), { role: "colaborador", funcionarioId: "f-2", nome: "Ana" });
    await setDoc(doc(db, "users/uOutro"),  { role: "colaborador", funcionarioId: "f-9", nome: "Fulano" });

    // Termo ja semeado do "uOutro" (rules off) pra testar leitura por terceiro/admin/RH e
    // as tentativas de update/delete sobre doc EXISTENTE.
    await setDoc(doc(db, "termoCanalDenuncia/uOutro"), {
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
  assertSucceeds(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"), termo())));

test("auth.uid != id do doc falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab2"), "termoCanalDenuncia/uColab"), termo())));

test("data.uid != id do doc falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"), termo({ uid: "outro" }))));

test("funcionarioId != users.funcionarioId do proprio falha (euSouODono)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"), termo({ funcionarioId: "f-999" }))));

test("NAO-colaborador (admin) criando o proprio termo falha (euSouODono exige isColaborador)", async () =>
  assertFails(setDoc(doc(ctxFor("uAdmin"), "termoCanalDenuncia/uAdmin"),
    termo({ uid: "uAdmin", funcionarioId: "f-admin" }))));

test("campo extra alem dos 6 falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"), termo({ extra: 1 }))));

test("versao diferente do cravado falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"), termo({ versao: "2025-01-v0" }))));

test("hashSha256 diferente do cravado falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"), termo({ hashSha256: "deadbeef" }))));

test("hashSha256 do OUTRO termo (adesao) falha (nao aceita hash trocado)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"),
    termo({ hashSha256: "931a476238918cb6e771e30238b307403606b224b1b32745ce21f6197e16c805" }))));

test("SEM o campo hashSha256 (5 campos) falha", async () => {
  const semHash = termo(); delete semHash.hashSha256;
  await assertFails(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"), semHash));
});

test("em != request.time (data fixa) falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"), termo({ em: new Date(2020, 0, 1) }))));

test("userAgent nao-string falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uColab"), termo({ userAgent: 123 }))));

test("anonimo cria falha", async () =>
  assertFails(setDoc(doc(anon(), "termoCanalDenuncia/anon"), termo({ uid: "anon", funcionarioId: "f-1" }))));

// ================= update / delete proibidos =================
test("update proibido (doc existente)", async () =>
  assertFails(updateDoc(doc(ctxFor("uOutro"), "termoCanalDenuncia/uOutro"), { versao: "2" })));

test("delete proibido (dono)", async () =>
  assertFails(deleteDoc(doc(ctxFor("uOutro"), "termoCanalDenuncia/uOutro"))));

test("delete proibido (admin)", async () =>
  assertFails(deleteDoc(doc(ctxFor("uAdmin"), "termoCanalDenuncia/uOutro"))));

// ================= read =================
test("Dono le o proprio termo", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uOutro"), "termoCanalDenuncia/uOutro"))));

test("Outro colaborador NAO le termo alheio", async () =>
  assertFails(getDoc(doc(ctxFor("uColab"), "termoCanalDenuncia/uOutro"))));

test("Admin le termo de outro", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uAdmin"), "termoCanalDenuncia/uOutro"))));

test("RH le termo de outro", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uRh"), "termoCanalDenuncia/uOutro"))));

test("anonimo NAO le", async () =>
  assertFails(getDoc(doc(anon(), "termoCanalDenuncia/uOutro"))));
