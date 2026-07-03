// Rules do NÍVEL DE CONFIRMAÇÃO por documento institucional (ADITIVO):
//   - campo `confirmacao` em ['nenhuma','aceite','assinatura']; legado (só exigeAssinatura) segue.
//   - aceites/{uid}: "Li e aceito" simples, create-only pelo colaborador DONO (append-only).
//   - assinaturas/{uid}: aceita LEGADO N1 (sem geo) OU carimbo com geo (espelha recibos).
//   - só quem gerencia documentos escreve confirmacao; colaborador NÃO altera o doc pai.
//
//   firebase emulators:exec --only firestore "node --test tests/docs-confirmacao-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

let env;

const anexo = (n) => ({ url: "https://drive.google.com/file/d/" + n, nome: n + ".pdf", hashSha256: n });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-docsconf-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", funcionarioId: "f-100", codigo: 100, nome: "Maria" });
    await setDoc(doc(db, "users/uColab2"), { role: "colaborador", funcionarioId: "f-200", codigo: 200, nome: "Ana" });

    // Documento institucional 'todos' publicado, nível assinatura (v1). Dono = qualquer colab do segmento.
    await setDoc(doc(db, "documentos/dAssin"), { escopo: "institucional", status: "publicado", segmento: { tipo: "todos", valores: [] }, exigeAssinatura: true, confirmacao: "assinatura", versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: new Date(), anexo: anexo("x"), titulo: "Regulamento Interno" });
    // Documento nível aceite.
    await setDoc(doc(db, "documentos/dAceite"), { escopo: "institucional", status: "publicado", segmento: { tipo: "todos", valores: [] }, exigeAssinatura: false, confirmacao: "aceite", versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: new Date(), anexo: anexo("y"), titulo: "Manual da Cultura" });
    // Documento LEGADO sem o campo confirmacao (só exigeAssinatura) — precisa continuar legível.
    await setDoc(doc(db, "documentos/dLegado"), { escopo: "institucional", status: "publicado", segmento: { tipo: "todos", valores: [] }, exigeAssinatura: true, versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: new Date(), anexo: anexo("z"), titulo: "Politica antiga" });
    // Rascunho pra edição de confirmacao pelo gestor.
    await setDoc(doc(db, "documentos/dRasc"), { escopo: "institucional", status: "rascunho", segmento: { tipo: "todos", valores: [] }, exigeAssinatura: false, confirmacao: "nenhuma", versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: new Date(), anexo: anexo("w"), titulo: "Cardapio" });
  });
});
after(async () => { await env.cleanup(); });

const admin  = () => env.authenticatedContext("uAdmin").firestore();
const rh     = () => env.authenticatedContext("uRh").firestore();
const colab  = () => env.authenticatedContext("uColab").firestore();
const colab2 = () => env.authenticatedContext("uColab2").firestore();

// ======== ACEITE simples (aceites/{uid}) ========
const aceiteOk = (uid = "uColab") => ({ uid, em: serverTimestamp(), userAgent: "test", versao: 1 });

test("Colaborador DONO cria aceite", async () =>
  assertSucceeds(setDoc(doc(colab(), "documentos/dAceite/aceites/uColab"), aceiteOk())));

test("Aceite com hora FALSA (em != request.time) nega", async () =>
  assertFails(setDoc(doc(colab(), "documentos/dAceite/aceites/uColab"), { ...aceiteOk(), em: new Date() })));

test("Aceite no lugar de OUTRO uid nega", async () =>
  assertFails(setDoc(doc(colab(), "documentos/dAceite/aceites/uColab2"), aceiteOk("uColab2"))));

test("Aceite com uid do doc != auth.uid nega", async () =>
  assertFails(setDoc(doc(colab(), "documentos/dAceite/aceites/uColab"), { ...aceiteOk(), uid: "uColab2" })));

test("Aceite com campo INTRUSO nega", async () =>
  assertFails(setDoc(doc(colab(), "documentos/dAceite/aceites/uColab"), { ...aceiteOk(), extra: 1 })));

test("Aceite imutável: update nega", async () =>
  assertFails(updateDoc(doc(colab(), "documentos/dAceite/aceites/uColab"), { userAgent: "outro" })));

test("Aceite imutável: delete nega", async () =>
  assertFails(deleteDoc(doc(colab(), "documentos/dAceite/aceites/uColab"))));

// leitura do aceite
test("RH LÊ aceite", async () =>
  assertSucceeds(getDoc(doc(rh(), "documentos/dAceite/aceites/uColab"))));
test("Colaborador DONO lê o próprio aceite", async () =>
  assertSucceeds(getDoc(doc(colab(), "documentos/dAceite/aceites/uColab"))));
test("Outro colaborador NÃO lê aceite alheio", async () =>
  assertFails(getDoc(doc(colab2(), "documentos/dAceite/aceites/uColab"))));

// ======== ASSINATURA carimbada (assinaturas/{uid}, com geo) ========
const assinGeoOk = (uid = "uColab") => ({
  uid, funcionarioId: "f-100", versaoAssinada: 1, hashSha256: "abc",
  aceiteTexto: "Li e estou de acordo", em: serverTimestamp(), userAgent: "test",
  geo: { lat: -26.89, lng: -49.22 }, arquivoPath: "documentos/dAssin/assinado/uColab.pdf",
});

test("Colaborador DONO assina com geo válida", async () =>
  assertSucceeds(setDoc(doc(colab(), "documentos/dAssin/assinaturas/uColab"), assinGeoOk())));

test("Assinatura com geo mas SEM lat number nega", async () => {
  const semLat = assinGeoOk("uColab"); semLat.geo = { lat: "x", lng: -49.22 };
  await assertFails(setDoc(doc(colab2(), "documentos/dAssin/assinaturas/uColab2"), { ...semLat, uid: "uColab2", funcionarioId: "f-200" }));
});

test("Assinatura carimbada sem arquivoPath (geo presente) nega", async () => {
  const semPath = assinGeoOk("uColab2"); delete semPath.arquivoPath; semPath.funcionarioId = "f-200";
  await assertFails(setDoc(doc(colab2(), "documentos/dAssin/assinaturas/uColab2"), semPath));
});

test("Assinatura com versaoAssinada != versao do pai nega", async () =>
  assertFails(setDoc(doc(colab2(), "documentos/dAssin/assinaturas/uColab2"), { ...assinGeoOk("uColab2"), uid: "uColab2", funcionarioId: "f-200", versaoAssinada: 9 })));

test("Assinatura imutável: update nega", async () =>
  assertFails(updateDoc(doc(colab(), "documentos/dAssin/assinaturas/uColab"), { hashSha256: "outro" })));
test("Assinatura imutável: delete nega", async () =>
  assertFails(deleteDoc(doc(colab(), "documentos/dAssin/assinaturas/uColab"))));

// forma LEGADA N1 (sem geo) continua aceita — retrocompat
test("Assinatura LEGADA N1 (sem geo) ainda passa", async () =>
  assertSucceeds(setDoc(doc(colab2(), "documentos/dAssin/assinaturas/uColab2"), { uid: "uColab2", funcionarioId: "f-200", versaoAssinada: 1, hashSha256: "a", aceiteTexto: "Li e estou de acordo", em: serverTimestamp(), userAgent: "t" })));

// ======== campo confirmacao no doc pai ========
test("Gestor define confirmacao='assinatura' (update)", async () =>
  assertSucceeds(updateDoc(doc(rh(), "documentos/dRasc"), { confirmacao: "assinatura" })));

test("Gestor cria documento com confirmacao='aceite'", async () =>
  assertSucceeds(setDoc(doc(rh(), "documentos/dNovoConf"), { escopo: "institucional", status: "rascunho", segmento: { tipo: "todos", valores: [] }, exigeAssinatura: false, confirmacao: "aceite", versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: serverTimestamp(), anexo: anexo("k"), titulo: "Novo" })));

test("Valor de confirmacao FORA da lista nega (create)", async () =>
  assertFails(setDoc(doc(rh(), "documentos/dNovoBad"), { escopo: "institucional", status: "rascunho", segmento: { tipo: "todos", valores: [] }, exigeAssinatura: false, confirmacao: "obrigatoria", versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: serverTimestamp(), anexo: anexo("k"), titulo: "Bad" })));

test("Valor de confirmacao FORA da lista nega (update)", async () =>
  assertFails(updateDoc(doc(rh(), "documentos/dRasc"), { confirmacao: "sim" })));

test("Colaborador NÃO altera confirmacao do doc pai", async () =>
  assertFails(updateDoc(doc(colab(), "documentos/dAceite"), { confirmacao: "nenhuma" })));

// ======== doc LEGADO (sem confirmacao) continua legível ========
test("Doc legado sem confirmacao segue legível pelo colaborador", async () =>
  assertSucceeds(getDoc(doc(colab(), "documentos/dLegado"))));
test("Doc legado sem confirmacao segue legível pelo RH", async () =>
  assertSucceeds(getDoc(doc(rh(), "documentos/dLegado"))));
