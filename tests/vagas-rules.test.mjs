// Rules das VAGAS (portal publico vagas.fiobras.com.br, 2026-07-14).
// PRIMEIRA leitura publica do projeto: anonimo le SO vaga 'publicada' e o
// config/vagas (WhatsApp de candidaturas, publico por proposito). Nenhuma
// escrita anonima. Gestao: cap vagas.gerenciar (fallback isRH). Transicoes:
// rascunho -> publicada (publicadaEm server-time); publicada aceita correcao
// de conteudo; publicada -> encerrada one-way (nunca reabre).
//
//   firebase emulators:exec --only firestore "node --test tests/vagas-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

let env;
const TS = serverTimestamp;
const vaga = (o = {}) => ({
  titulo: "Operador de Máquina I", setor: "Producao", turno: "1º turno", cidade: "Guaramirim, SC",
  tipo: "CLT", descricao: "Operação de máquinas da linha de fios.", requisitos: "Ensino fundamental.",
  status: "rascunho", criadoPor: "uRh", criadoEm: new Date(), ...o,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-vagas-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"), { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"), { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", nome: "Maria", funcionarioId: "f-1" });
    await setDoc(doc(db, "vagas/vPub"), vaga({ status: "publicada", publicadaEm: new Date() }));
    await setDoc(doc(db, "vagas/vPub2"), vaga({ status: "publicada", publicadaEm: new Date(), titulo: "Analista Comercial" }));
    await setDoc(doc(db, "vagas/vRasc"), vaga());
    await setDoc(doc(db, "vagas/vRascPublicar"), vaga());
    await setDoc(doc(db, "vagas/vRascDel"), vaga());
    await setDoc(doc(db, "vagas/vEnc"), vaga({ status: "encerrada", publicadaEm: new Date(), encerradaEm: new Date() }));
    await setDoc(doc(db, "vagas/vPubEncerrar"), vaga({ status: "publicada", publicadaEm: new Date() }));
    await setDoc(doc(db, "config/vagas"), { whatsapp: "+5547999990000" });
  });
});
after(async () => { await env.cleanup(); });

const admin = () => env.authenticatedContext("uAdmin").firestore();
const rh    = () => env.authenticatedContext("uRh").firestore();
const colab = () => env.authenticatedContext("uColab").firestore();
const anon  = () => env.unauthenticatedContext().firestore();

// ---------- Leitura publica (a fronteira nova) ----------
test("ANONIMO le vaga publicada", async () => assertSucceeds(getDoc(doc(anon(), "vagas/vPub"))));
test("ANONIMO NAO le rascunho", async () => assertFails(getDoc(doc(anon(), "vagas/vRasc"))));
test("ANONIMO NAO le encerrada", async () => assertFails(getDoc(doc(anon(), "vagas/vEnc"))));
test("ANONIMO: query where status == publicada e provada", async () =>
  assertSucceeds(getDocs(query(collection(anon(), "vagas"), where("status", "==", "publicada")))));
test("ANONIMO: query SEM filtro NEGA (nao vaza rascunho)", async () =>
  assertFails(getDocs(collection(anon(), "vagas"))));
test("ANONIMO le config/vagas (WhatsApp, publico por proposito)", async () =>
  assertSucceeds(getDoc(doc(anon(), "config/vagas"))));
test("ANONIMO NAO escreve vaga", async () =>
  assertFails(setDoc(doc(anon(), "vagas/hack"), vaga({ criadoPor: null, criadoEm: TS() }))));
test("ANONIMO NAO escreve config/vagas", async () =>
  assertFails(setDoc(doc(anon(), "config/vagas"), { whatsapp: "+000" })));
test("ANONIMO NAO le outros docs de config (matriz de permissoes segue fechada)", async () =>
  assertFails(getDoc(doc(anon(), "config/permissoes"))));

// ---------- Gestao ----------
test("RH cria rascunho", async () =>
  assertSucceeds(setDoc(doc(rh(), "vagas/vNova"), vaga({ criadoEm: TS() }))));
test("RH NAO cria ja publicada (nasce rascunho)", async () =>
  assertFails(setDoc(doc(rh(), "vagas/vNova2"), vaga({ status: "publicada", criadoEm: TS(), publicadaEm: TS() }))));
test("colaborador NAO gerencia vagas", async () =>
  assertFails(setDoc(doc(colab(), "vagas/vColab"), vaga({ criadoPor: "uColab", criadoEm: TS() }))));
test("RH edita rascunho", async () =>
  assertSucceeds(updateDoc(doc(rh(), "vagas/vRasc"), { titulo: "Operador de Máquina II" })));
test("RH publica rascunho (publicadaEm server-time)", async () =>
  assertSucceeds(updateDoc(doc(rh(), "vagas/vRascPublicar"), { status: "publicada", publicadaEm: TS() })));
test("RH corrige conteudo de publicada SEM tocar status", async () =>
  assertSucceeds(updateDoc(doc(rh(), "vagas/vPub2"), { descricao: "Atendimento à carteira e orçamentos." })));
test("publicada NAO volta pra rascunho", async () =>
  assertFails(updateDoc(doc(rh(), "vagas/vPub2"), { status: "rascunho" })));
test("RH encerra publicada (one-way)", async () =>
  assertSucceeds(updateDoc(doc(rh(), "vagas/vPubEncerrar"), { status: "encerrada", encerradaEm: TS() })));
test("encerrada NAO reabre (nem admin pelo app)", async () => {
  await assertFails(updateDoc(doc(rh(), "vagas/vEnc"), { status: "publicada" }));
  await assertFails(updateDoc(doc(admin(), "vagas/vEnc"), { status: "publicada" }));
});
test("titulo gigante NEGA (shape)", async () =>
  assertFails(setDoc(doc(rh(), "vagas/vShape"), vaga({ titulo: "x".repeat(121), criadoEm: TS() }))));
test("RH deleta rascunho; publicada so admin", async () => {
  await assertSucceeds(deleteDoc(doc(rh(), "vagas/vRascDel")));
  await assertFails(deleteDoc(doc(rh(), "vagas/vPub")));
  await assertSucceeds(deleteDoc(doc(admin(), "vagas/vPub")));
});
test("RH atualiza o WhatsApp de candidaturas", async () =>
  assertSucceeds(setDoc(doc(rh(), "config/vagas"), { whatsapp: "+5547988887777" })));
test("config/vagas com campo extra NEGA (shape-lock do doc publico)", async () =>
  assertFails(setDoc(doc(rh(), "config/vagas"), { whatsapp: "+55479", dump: "lixo" })));
