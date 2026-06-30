// Rules de /disciplinares (advertencia/suspensao · dado SENSIVEL):
//   - cria: admin/RH. le: admin/RH, lider do TURNO, colaborador DONO. delete: admin.
//   - ciencia/{uid}: self-write do colaborador dono (append-only).
//   firebase emulators:exec --only firestore "node --test tests/disciplinares-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, addDoc, deleteDoc, collection, serverTimestamp } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-disc-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"), { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"), { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uLider1"), { role: "lider", turno: 1, nome: "Lider T1" });
    await setDoc(doc(db, "users/uLider2"), { role: "lider", turno: 2, nome: "Lider T2" });
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", funcionarioId: "f-100", nome: "Maria" });
    await setDoc(doc(db, "users/uColab2"), { role: "colaborador", funcionarioId: "f-200", nome: "Joao" });
    // registro disciplinar do funcionario f-100, turno 1
    await setDoc(doc(db, "disciplinares/d1"), {
      funcionarioId: "f-100", funcionarioNome: "Maria", funcionarioTurno: 1,
      tipo: "escrita", motivo: "Falta injustificada", descricao: "", dias: null,
      anexo: { url: "https://x/a.pdf", nome: "a.pdf" }, aplicadoPor: "uRh", aplicadoPorNome: "Suyanne",
      criadoEm: new Date(),
    });
  });
});
after(async () => { await env.cleanup(); });

const admin = () => env.authenticatedContext("uAdmin").firestore();
const rh = () => env.authenticatedContext("uRh").firestore();
const lider1 = () => env.authenticatedContext("uLider1").firestore();
const lider2 = () => env.authenticatedContext("uLider2").firestore();
const colab = () => env.authenticatedContext("uColab").firestore();
const colab2 = () => env.authenticatedContext("uColab2").firestore();

const novo = (uid, over = {}) => ({
  funcionarioId: "f-100", funcionarioNome: "Maria", funcionarioTurno: 1,
  tipo: "escrita", motivo: "Falta", descricao: "", dias: null, anexo: null,
  aplicadoPor: uid, aplicadoPorNome: "X", criadoEm: serverTimestamp(), ...over,
});

// ---- create ----
test("Admin cria disciplinar", async () => assertSucceeds(addDoc(collection(admin(), "disciplinares"), novo("uAdmin"))));
test("RH cria disciplinar", async () => assertSucceeds(addDoc(collection(rh(), "disciplinares"), novo("uRh"))));
test("Lider NAO cria", async () => assertFails(addDoc(collection(lider1(), "disciplinares"), novo("uLider1"))));
test("Colaborador NAO cria", async () => assertFails(addDoc(collection(colab(), "disciplinares"), novo("uColab"))));
test("RH NAO cria com aplicadoPor de outro", async () => assertFails(addDoc(collection(rh(), "disciplinares"), novo("uAdmin"))));
test("RH NAO cria com tipo invalido", async () => assertFails(addDoc(collection(rh(), "disciplinares"), novo("uRh", { tipo: "demissao" }))));

// ---- read ----
test("Admin le qualquer", async () => assertSucceeds(getDoc(doc(admin(), "disciplinares/d1"))));
test("RH le qualquer", async () => assertSucceeds(getDoc(doc(rh(), "disciplinares/d1"))));
test("Lider do MESMO turno le", async () => assertSucceeds(getDoc(doc(lider1(), "disciplinares/d1"))));
test("Lider de OUTRO turno NAO le", async () => assertFails(getDoc(doc(lider2(), "disciplinares/d1"))));
test("Colaborador DONO le a propria", async () => assertSucceeds(getDoc(doc(colab(), "disciplinares/d1"))));
test("Colaborador NAO dono NAO le", async () => assertFails(getDoc(doc(colab2(), "disciplinares/d1"))));

// ---- delete ----
test("RH NAO exclui (so admin)", async () => assertFails(deleteDoc(doc(rh(), "disciplinares/d1"))));

// ---- ciencia ----
const ciencia = (uid) => ({ uid, funcionarioId: "f-100", em: serverTimestamp(), userAgent: "test" });
test("Colaborador DONO da ciencia", async () => assertSucceeds(setDoc(doc(colab(), "disciplinares/d1/ciencia/uColab"), ciencia("uColab"))));
test("Colaborador NAO dono NAO da ciencia", async () => assertFails(setDoc(doc(colab2(), "disciplinares/d1/ciencia/uColab2"), ciencia("uColab2"))));
test("Ninguem assina ciencia no lugar de outro uid", async () => assertFails(setDoc(doc(colab(), "disciplinares/d1/ciencia/uColab2"), ciencia("uColab2"))));
test("Lider do turno LE a ciencia", async () => assertSucceeds(getDoc(doc(lider1(), "disciplinares/d1/ciencia/uColab"))));
