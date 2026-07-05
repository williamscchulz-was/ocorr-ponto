// Rules do Mural de aniversario (/muralAniversario/{postId}) e subcolecoes:
//   - doc pai: read se autenticado; write false (nunca escrito pelo cliente).
//   - reacoes/{uid}: read autenticado; create so como voce mesmo (uid==auth.uid,
//     data.uid==uid, hasOnly[uid,tipo,em], tipo=='coracao', em==server);
//     delete dono OU admin OU rh (moderacao); update proibido.
//   - recados/{recadoId}: read autenticado; create autorUid==auth.uid,
//     hasOnly[autorUid,autorNome,texto,em], autorNome<=80 E autorNome==users.nome do
//     autor (anti-spoof), texto 1..500, em==server; delete dono OU admin OU rh
//     (moderacao); update proibido.
//
//   firebase emulators:exec --only firestore "node --test tests/mural-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

let env;

// nome real gravado em /users/{uid} — o autorNome do recado TEM que bater com isto.
const NOME = { uColab: "Maria Colaboradora", uColab2: "Joao Colaborador", uAutor: "Fulano Colaborador", uAdmin: "Will", uRh: "Suyanne" };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-mural-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", nome: NOME.uAdmin });
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: NOME.uRh });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", funcionarioId: "f-1", nome: NOME.uColab });
    await setDoc(doc(db, "users/uColab2"), { role: "colaborador", funcionarioId: "f-2", nome: NOME.uColab2 });
    await setDoc(doc(db, "users/uAutor"),  { role: "colaborador", funcionarioId: "f-9", nome: NOME.uAutor });

    // post pai (semeado com rules off; o cliente nunca o escreve)
    await setDoc(doc(db, "muralAniversario/f-1_2026"), { ping: 1 });

    // reacao do dono uColab (pra testar delete pelo dono e update)
    await setDoc(doc(db, "muralAniversario/f-1_2026/reacoes/uColab"), {
      uid: "uColab", tipo: "coracao", em: new Date(),
    });
    // reacoes do uAutor com ids de doc distintos: uma pra tentativa de terceiro comum,
    // uma pra moderacao RH, uma pra moderacao admin (nao mascarar com resource==null).
    // OBS: o id do doc de reacao e o uid do DONO; pra ter 3 reacoes do mesmo autor uso
    // 3 "postId" diferentes (a reacao de fato e {post}/reacoes/{uidDono}).
    await setDoc(doc(db, "muralAniversario/f-1_2026/reacoes/uAutor"), {
      uid: "uAutor", tipo: "coracao", em: new Date(),
    });
    await setDoc(doc(db, "muralAniversario/f-2_2026/reacoes/uAutor"), {
      uid: "uAutor", tipo: "coracao", em: new Date(),
    });
    await setDoc(doc(db, "muralAniversario/f-3_2026/reacoes/uAutor"), {
      uid: "uAutor", tipo: "coracao", em: new Date(),
    });

    // recados do autor uAutor (autorNome == users.nome do uAutor), ids distintos:
    // um pra delete pelo autor/tentativa de terceiro, um pra RH, um pra admin.
    await setDoc(doc(db, "muralAniversario/f-1_2026/recados/r-autor"), {
      autorUid: "uAutor", autorNome: NOME.uAutor, texto: "Parabens!", em: new Date(),
    });
    await setDoc(doc(db, "muralAniversario/f-1_2026/recados/r-rh"), {
      autorUid: "uAutor", autorNome: NOME.uAutor, texto: "Feliz aniversario!", em: new Date(),
    });
    await setDoc(doc(db, "muralAniversario/f-1_2026/recados/r-admin"), {
      autorUid: "uAutor", autorNome: NOME.uAutor, texto: "Tudo de bom!", em: new Date(),
    });
  });
});
after(async () => { await env.cleanup(); });

const ctxFor = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const POST = "muralAniversario/f-1_2026";
const reacao = (uid, over = {}) => ({ uid, tipo: "coracao", em: serverTimestamp(), ...over });
// autorNome default = nome real do autor em /users (pra o caso feliz passar a regra anti-spoof).
const recado = (uid, over = {}) => ({ autorUid: uid, autorNome: NOME[uid] ?? "Sem Nome", texto: "Parabens!", em: serverTimestamp(), ...over });

// =================== doc pai ===================
test("Autenticado le o post pai", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uColab"), POST))));
test("Anonimo NAO le o post pai", async () =>
  assertFails(getDoc(doc(anon(), POST))));
test("Ninguem escreve o post pai (write false)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), POST), { ping: 2 })));

// =================== reacoes ===================
// ---- create ----
test("REACAO: dono cria coracao valido", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uColab2"), `${POST}/reacoes/uColab2`), reacao("uColab2"))));
test("REACAO: auth.uid != id da doc falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), `${POST}/reacoes/uColab2`), reacao("uColab2"))));
test("REACAO: data.uid != id da doc falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab2"), `${POST}/reacoes/uColab2`), reacao("uColab2", { uid: "outro" }))));
test("REACAO: tipo != coracao falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab2"), `${POST}/reacoes/uColab2`), reacao("uColab2", { tipo: "estrela" }))));
test("REACAO: campo extra falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab2"), `${POST}/reacoes/uColab2`), reacao("uColab2", { extra: 1 }))));
test("REACAO: em != server time falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab2"), `${POST}/reacoes/uColab2`), reacao("uColab2", { em: new Date(2020, 0, 1) }))));
test("REACAO: anonimo cria falha", async () =>
  assertFails(setDoc(doc(anon(), `${POST}/reacoes/qualquer`), reacao("qualquer"))));

// ---- read ----
test("REACAO: autenticado le", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uColab2"), `${POST}/reacoes/uColab`))));
test("REACAO: anonimo NAO le", async () =>
  assertFails(getDoc(doc(anon(), `${POST}/reacoes/uColab`))));

// ---- update proibido ----
test("REACAO: update proibido", async () =>
  assertFails(updateDoc(doc(ctxFor("uColab"), `${POST}/reacoes/uColab`), { tipo: "coracao" })));

// ---- delete ----
test("REACAO: dono deleta a propria", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uColab"), `${POST}/reacoes/uColab`))));
test("REACAO: colaborador comum NAO deleta a alheia", async () =>
  assertFails(deleteDoc(doc(ctxFor("uColab2"), `${POST}/reacoes/uAutor`))));
test("REACAO: RH deleta reacao de outro (moderacao)", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uRh"), `muralAniversario/f-2_2026/reacoes/uAutor`))));
test("REACAO: admin deleta reacao de outro (moderacao)", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uAdmin"), `muralAniversario/f-3_2026/reacoes/uAutor`))));

// =================== recados ===================
// ---- create ----
test("RECADO: autor cria recado valido (autorNome == users.nome)", async () =>
  assertSucceeds(addDoc(collection(ctxFor("uColab"), `${POST}/recados`), recado("uColab"))));
test("RECADO: autorUid != auth.uid falha", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), `${POST}/recados`), recado("uColab2"))));
test("RECADO: autorNome != users.nome do autor falha (anti-spoof)", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), `${POST}/recados`), recado("uColab", { autorNome: "Nome Falso" }))));
test("RECADO: autorNome vazio falha (nao bate users.nome)", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), `${POST}/recados`), recado("uColab", { autorNome: "" }))));
test("RECADO: texto vazio falha", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), `${POST}/recados`), recado("uColab", { texto: "" }))));
test("RECADO: texto > 500 falha", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), `${POST}/recados`), recado("uColab", { texto: "a".repeat(501) }))));
test("RECADO: autorNome > 80 falha", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), `${POST}/recados`), recado("uColab", { autorNome: "a".repeat(81) }))));
test("RECADO: campo extra falha", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), `${POST}/recados`), recado("uColab", { extra: 1 }))));
test("RECADO: em != server time falha", async () =>
  assertFails(addDoc(collection(ctxFor("uColab"), `${POST}/recados`), recado("uColab", { em: new Date(2020, 0, 1) }))));
test("RECADO: anonimo cria falha", async () =>
  assertFails(addDoc(collection(anon(), `${POST}/recados`), recado("qualquer"))));

// ---- read ----
test("RECADO: autenticado le", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uColab"), `${POST}/recados/r-autor`))));
test("RECADO: anonimo NAO le", async () =>
  assertFails(getDoc(doc(anon(), `${POST}/recados/r-autor`))));

// ---- update proibido ----
test("RECADO: update proibido", async () =>
  assertFails(updateDoc(doc(ctxFor("uAutor"), `${POST}/recados/r-autor`), { texto: "editado" })));

// ---- delete ----
test("RECADO: colaborador NAO deleta recado de OUTRO", async () =>
  assertFails(deleteDoc(doc(ctxFor("uColab"), `${POST}/recados/r-autor`))));
test("RECADO: autor deleta o proprio", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uAutor"), `${POST}/recados/r-autor`))));
test("RECADO: RH deleta recado de outro (moderacao)", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uRh"), `${POST}/recados/r-rh`))));
test("RECADO: admin deleta recado de outro (moderacao)", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uAdmin"), `${POST}/recados/r-admin`))));
