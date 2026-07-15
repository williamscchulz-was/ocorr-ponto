// Rules do PROTOCOLO DE ACOMPANHAMENTO da denuncia (2026-07-16, William).
// Espelho content-free /denunciaStatus/{codigo}: carrega SO o andamento (status
// + carimbos de tempo), ZERO relato e ZERO PII. O denunciante guarda o codigo
// (bearer token aleatorio forte, gerado no cliente) e consulta o proprio status.
// Desenho de sigilo: GET por id aberto (quem tem o codigo le), LIST negado
// EXPLICITO (anti-varredura), CREATE pelo mesmo autor anonimo do envio com shape
// fechado hasOnly(status,em), UPDATE/DELETE so admin. O espelho NUNCA ganha
// desfecho/nota/relato (o publico o le por id).
//
//   firebase emulators:exec --only firestore "node --test tests/denuncia-status-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, collection } from "firebase/firestore";

let env;
const TS = serverTimestamp;
// Codigo com tamanho sano (12..40). O ID {codigo} vem do cliente; a regra so
// checa o comprimento (barra ids triviais tipo "1"), nao o formato.
const COD = "AC-7f3a9b2e5c1d8046"; // 19 chars
const novo = (o = {}) => ({ status: "nova", em: TS(), ...o });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-denuncia-status-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"), { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"), { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", nome: "Maria", funcionarioId: "f-1" });
    // Espelhos semeados (andamento puro, sem conteudo).
    await setDoc(doc(db, "denunciaStatus/statusSeedGet"), { status: "nova", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedUpd"), { status: "nova", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedUpd2"), { status: "em_analise", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedEnum"), { status: "nova", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedCarimbo"), { status: "nova", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedConteudo"), { status: "nova", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedNegaEdicao"), { status: "nova", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedDel"), { status: "concluida", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedDel2"), { status: "concluida", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedList1"), { status: "nova", em: new Date() });
    await setDoc(doc(db, "denunciaStatus/statusSeedList2"), { status: "em_analise", em: new Date() });
  });
});
after(async () => { await env.cleanup(); });

const admin = () => env.authenticatedContext("uAdmin").firestore();
const rh    = () => env.authenticatedContext("uRh").firestore();
const colab = () => env.authenticatedContext("uColab").firestore();
const anon  = () => env.unauthenticatedContext().firestore();

// ---------- Create (mesmo autor anonimo do envio, shape fechado) ----------
test("COLABORADOR cria espelho valido (status=nova, em=server-time) junto do envio", async () =>
  assertSucceeds(setDoc(doc(colab(), `denunciaStatus/${COD}`), novo())));
test("RH e ADMIN tambem criam espelho (qualquer autenticado do quadro)", async () => {
  await assertSucceeds(setDoc(doc(rh(), "denunciaStatus/statusRhCriaXXXXXX"), novo()));
  await assertSucceeds(setDoc(doc(admin(), "denunciaStatus/statusAdminCriaXX"), novo()));
});
test("ANONIMO (sem login) NAO cria espelho", async () =>
  assertFails(setDoc(doc(anon(), "denunciaStatus/statusAnonCriaXXXXX"), novo())));
test("Id curto (< 12) nega (barra codigo trivial tipo 'abc')", async () =>
  assertFails(setDoc(doc(colab(), "denunciaStatus/abc"), novo())));
test("Id de tamanho minimo (12) PASSA (boundary)", async () =>
  assertSucceeds(setDoc(doc(colab(), "denunciaStatus/abcdef123456"), novo())));
test("Id acima de 40 nega (boundary superior)", async () =>
  assertFails(setDoc(doc(colab(), `denunciaStatus/${"z".repeat(41)}`), novo())));
test("status != nova no create nega (nasce sempre nova)", async () =>
  assertFails(setDoc(doc(colab(), "denunciaStatus/statusNasceAnalise"), novo({ status: "em_analise" }))));
test("em de cliente (new Date, nao server-time) nega", async () =>
  assertFails(setDoc(doc(colab(), "denunciaStatus/statusEmCliente1"), novo({ em: new Date() }))));
test("Campo extra no create nega (hasOnly fecha o shape, ZERO conteudo/PII)", async () => {
  await assertFails(setDoc(doc(colab(), "denunciaStatus/statusExtraRelato"), novo({ texto: "vazamento de relato" })));
  await assertFails(setDoc(doc(colab(), "denunciaStatus/statusExtraDesfec"), novo({ desfecho: "procedente" })));
  await assertFails(setDoc(doc(colab(), "denunciaStatus/statusExtraUid111"), novo({ uid: "u1" })));
});

// ---------- Read (GET por id aberto; LIST negado explicito) ----------
test("ANONIMO le o andamento por ID (quem tem o codigo consulta, e o desenho)", async () =>
  assertSucceeds(getDoc(doc(anon(), "denunciaStatus/statusSeedGet"))));
test("COLABORADOR e ADMIN tambem leem por ID", async () => {
  await assertSucceeds(getDoc(doc(colab(), "denunciaStatus/statusSeedGet")));
  await assertSucceeds(getDoc(doc(admin(), "denunciaStatus/statusSeedGet")));
});
test("ANONIMO NAO lista a colecao (anti-varredura, list negado explicito)", async () =>
  assertFails(getDocs(collection(anon(), "denunciaStatus"))));
test("ADMIN tambem NAO lista (ninguem enumera, nem quem opera a triagem)", async () =>
  assertFails(getDocs(collection(admin(), "denunciaStatus"))));
test("COLABORADOR NAO lista a colecao", async () =>
  assertFails(getDocs(collection(colab(), "denunciaStatus"))));

// ---------- Update (SO admin, so andamento + carimbo) ----------
test("ADMIN avanca o status com atualizadoEm carimbado (nova->em_analise->concluida)", async () => {
  await assertSucceeds(updateDoc(doc(admin(), "denunciaStatus/statusSeedUpd"), { status: "em_analise", atualizadoEm: TS() }));
  await assertSucceeds(updateDoc(doc(admin(), "denunciaStatus/statusSeedUpd2"), { status: "concluida", atualizadoEm: TS() }));
});
test("status fora do enum nega", async () =>
  assertFails(updateDoc(doc(admin(), "denunciaStatus/statusSeedEnum"), { status: "arquivada", atualizadoEm: TS() })));
test("atualizadoEm com data arbitraria do cliente (nao server-time) nega", async () =>
  assertFails(updateDoc(doc(admin(), "denunciaStatus/statusSeedCarimbo"), { status: "em_analise", atualizadoEm: new Date() })));
test("atualizadoEm AUSENTE no update nega (todo andamento e carimbado)", async () =>
  assertFails(updateDoc(doc(admin(), "denunciaStatus/statusSeedCarimbo"), { status: "em_analise" })));
test("ADMIN NAO escreve desfecho/nota/relato no espelho (o publico o le por id)", async () => {
  await assertFails(updateDoc(doc(admin(), "denunciaStatus/statusSeedConteudo"), { status: "concluida", atualizadoEm: TS(), desfecho: "procedente" }));
  await assertFails(updateDoc(doc(admin(), "denunciaStatus/statusSeedConteudo"), { status: "concluida", atualizadoEm: TS(), nota: "interna" }));
  await assertFails(updateDoc(doc(admin(), "denunciaStatus/statusSeedConteudo"), { status: "em_analise", atualizadoEm: TS(), texto: "relato" }));
});
test("RH e COLABORADOR nao atualizam o espelho (so admin move o andamento)", async () => {
  await assertFails(updateDoc(doc(rh(), "denunciaStatus/statusSeedNegaEdicao"), { status: "em_analise", atualizadoEm: TS() }));
  await assertFails(updateDoc(doc(colab(), "denunciaStatus/statusSeedNegaEdicao"), { status: "em_analise", atualizadoEm: TS() }));
});
test("ANONIMO nao atualiza o espelho (le, mas nao move o andamento)", async () =>
  assertFails(updateDoc(doc(anon(), "denunciaStatus/statusSeedNegaEdicao"), { status: "em_analise", atualizadoEm: TS() })));

// ---------- Delete (SO admin; expurgo da denuncia varre o espelho junto) ----------
test("ADMIN exclui o espelho (o expurgo LGPD da denuncia leva o espelho junto)", async () =>
  assertSucceeds(deleteDoc(doc(admin(), "denunciaStatus/statusSeedDel"))));
test("RH, COLABORADOR e ANONIMO nao excluem o espelho", async () => {
  await assertFails(deleteDoc(doc(rh(), "denunciaStatus/statusSeedDel2")));
  await assertFails(deleteDoc(doc(colab(), "denunciaStatus/statusSeedDel2")));
  await assertFails(deleteDoc(doc(anon(), "denunciaStatus/statusSeedDel2")));
});
