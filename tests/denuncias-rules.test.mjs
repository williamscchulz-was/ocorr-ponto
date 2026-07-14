// Rules do CANAL DE DENUNCIA (2026-07-15, William: "apenas admin ve").
// Anonimato ESTRUTURAL: hasOnly nem permite campo de uid/nome/aparelho, entao
// nem erro de cliente vaza a autoria de uma denuncia anonima. Identificar-se
// e ESCOLHA do denunciante via campo contato (texto livre). Leitura, triagem
// e exclusao SO ADMIN, de proposito fora da matriz de cap (nem RH, a denuncia
// pode ser sobre a propria GP). Categorias alinhadas a Lei 14.457/2022. HASH
// DE AUTENTICIDADE: cliente manda sha256(texto), a regra recalcula e confere;
// texto/hash imutaveis pos-create (integridade da apuracao).
//
//   firebase emulators:exec --only firestore "node --test tests/denuncias-rules.test.mjs"

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, collection } from "firebase/firestore";

let env;
const TS = serverTimestamp;
const sha256 = (texto) => createHash("sha256").update(texto, "utf8").digest("hex");
const TEXTO_PADRAO = "Relato com pelo menos dez caracteres de conteudo real.";

const den = (o = {}) => {
  const texto = o.texto ?? TEXTO_PADRAO;
  return {
    categoria: "assedio-moral",
    texto,
    hash: sha256(texto),
    em: TS(),
    status: "nova",
    ...o,
  };
};

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-denuncias-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const seedTexto = (t) => ({ texto: t, hash: sha256(t) });
    await setDoc(doc(db, "users/uAdmin"), { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"), { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", nome: "Maria", funcionarioId: "f-1" });
    await setDoc(doc(db, "denuncias/dSeedRead"), { categoria: "assedio-moral", ...seedTexto("Relato semeado para testar leitura e listagem."), em: new Date(), status: "nova" });
    await setDoc(doc(db, "denuncias/dSeedStatus"), { categoria: "assedio-moral", ...seedTexto("Relato semeado para testar transicao de status."), em: new Date(), status: "nova" });
    await setDoc(doc(db, "denuncias/dSeedStatus2"), { categoria: "seguranca", ...seedTexto("Relato semeado ja em analise, prestes a concluir."), em: new Date(), status: "em_analise" });
    await setDoc(doc(db, "denuncias/dSeedNota"), { categoria: "discriminacao", ...seedTexto("Relato semeado para testar anotacao interna da triagem."), em: new Date(), status: "nova" });
    await setDoc(doc(db, "denuncias/dSeedNotaGigante"), { categoria: "discriminacao", ...seedTexto("Relato semeado para testar limite de tamanho da nota."), em: new Date(), status: "nova" });
    await setDoc(doc(db, "denuncias/dSeedImutavel"), { categoria: "fraude", ...seedTexto("Relato original que jamais pode ser reescrito pela triagem."), em: new Date(), status: "nova" });
    await setDoc(doc(db, "denuncias/dSeedStatusInvalido"), { categoria: "outro", ...seedTexto("Relato semeado para testar status fora da lista fechada."), em: new Date(), status: "nova" });
    await setDoc(doc(db, "denuncias/dSeedNegaEdicao"), { categoria: "assedio-sexual", ...seedTexto("Relato semeado para negar edicao de RH e colaborador."), em: new Date(), status: "nova" });
    await setDoc(doc(db, "denuncias/dSeedDel"), { categoria: "violencia", ...seedTexto("Relato semeado para exclusao definitiva (LGPD)."), em: new Date(), status: "nova" });
    await setDoc(doc(db, "denuncias/dSeedDelNegado"), { categoria: "violencia", ...seedTexto("Relato semeado para negar exclusao de RH e colaborador."), em: new Date(), status: "nova" });
  });
});
after(async () => { await env.cleanup(); });

const admin = () => env.authenticatedContext("uAdmin").firestore();
const rh    = () => env.authenticatedContext("uRh").firestore();
const colab = () => env.authenticatedContext("uColab").firestore();
const anon  = () => env.unauthenticatedContext().firestore();

// ---------- Create (anonimato estrutural, qualquer autenticado do quadro) ----------
test("COLABORADOR cria denuncia anonima valida (sem contato, hash correto)", async () =>
  assertSucceeds(setDoc(doc(colab(), "denuncias/dAnon1"), den())));
test("COLABORADOR cria denuncia IDENTIFICADA (com contato, escolha do denunciante)", async () =>
  assertSucceeds(setDoc(doc(colab(), "denuncias/dIdent1"), den({ contato: "Maria, 47 99999-0000" }))));
test("RH e ADMIN tambem criam denuncia (qualquer autenticado do quadro)", async () => {
  await assertSucceeds(setDoc(doc(rh(), "denuncias/dRh1"), den()));
  await assertSucceeds(setDoc(doc(admin(), "denuncias/dAdmin1"), den()));
});
test("ANONIMO (sem login) NAO cria denuncia", async () =>
  assertFails(setDoc(doc(anon(), "denuncias/dAnon2"), den())));
test("Campos de autoria (uid/nome/aparelho) negam, hasOnly fecha o shape", async () => {
  await assertFails(setDoc(doc(colab(), "denuncias/dAutoria1"), den({ uid: "u1" })));
  await assertFails(setDoc(doc(colab(), "denuncias/dAutoria2"), den({ nome: "Maria" })));
  await assertFails(setDoc(doc(colab(), "denuncias/dAutoria3"), den({ aparelho: "iPhone 13" })));
});
test("Categoria fora da lista nega (taxonomia antiga nao migra sozinha)", async () =>
  assertFails(setDoc(doc(colab(), "denuncias/dCat1"), den({ categoria: "conduta" }))));
test("Texto curto (< 10) nega", async () => {
  const texto = "curto";
  await assertFails(setDoc(doc(colab(), "denuncias/dTexto1"), den({ texto, hash: sha256(texto) })));
});
test("Texto acima de 5000 nega", async () => {
  const texto = "a".repeat(5001);
  await assertFails(setDoc(doc(colab(), "denuncias/dTexto2"), den({ texto, hash: sha256(texto) })));
});
test("Contato acima de 200 nega", async () =>
  assertFails(setDoc(doc(colab(), "denuncias/dContato1"), den({ contato: "x".repeat(201) }))));
test("em de cliente (new Date, nao server-time) nega", async () =>
  assertFails(setDoc(doc(colab(), "denuncias/dEm1"), den({ em: new Date() }))));
test("status diferente de nova nega", async () =>
  assertFails(setDoc(doc(colab(), "denuncias/dStatus1"), den({ status: "em_analise" }))));
test("hash ERRADO (nao bate com sha256 do texto) nega", async () =>
  assertFails(setDoc(doc(colab(), "denuncias/dHashErrado"), den({ hash: "a".repeat(64) }))));
test("hash AUSENTE nega (campo obrigatorio)", async () =>
  assertFails(setDoc(doc(colab(), "denuncias/dSemHash"), {
    categoria: "assedio-moral", texto: TEXTO_PADRAO, em: TS(), status: "nova",
  })));

// ---------- Read (SO admin, nem RH, sigilo de proposito) ----------
test("ADMIN le e lista denuncias", async () => {
  await assertSucceeds(getDoc(doc(admin(), "denuncias/dSeedRead")));
  await assertSucceeds(getDocs(collection(admin(), "denuncias")));
});
test("RH NAO le nem lista denuncias (pode ser sobre a propria GP)", async () => {
  await assertFails(getDoc(doc(rh(), "denuncias/dSeedRead")));
  await assertFails(getDocs(collection(rh(), "denuncias")));
});
test("COLABORADOR nao le denuncia, doc solto nem lista", async () => {
  await assertFails(getDoc(doc(colab(), "denuncias/dSeedRead")));
  await assertFails(getDocs(collection(colab(), "denuncias")));
});
test("ANONIMO nao le denuncia", async () =>
  assertFails(getDoc(doc(anon(), "denuncias/dSeedRead"))));

// ---------- Update (triagem: so status/nota, texto/hash/categoria imutaveis) ----------
test("ADMIN muda status para em_analise e depois para concluida", async () => {
  await assertSucceeds(updateDoc(doc(admin(), "denuncias/dSeedStatus"), { status: "em_analise" }));
  await assertSucceeds(updateDoc(doc(admin(), "denuncias/dSeedStatus2"), { status: "concluida" }));
});
test("ADMIN escreve nota interna (<= 2000)", async () =>
  assertSucceeds(updateDoc(doc(admin(), "denuncias/dSeedNota"), { nota: "Verificado com a lideranca, aguardando retorno." })));
test("Status fora da lista fechada nega", async () =>
  assertFails(updateDoc(doc(admin(), "denuncias/dSeedStatusInvalido"), { status: "arquivada" })));
test("ADMIN NAO altera o texto, o hash nem a categoria original (imutaveis)", async () => {
  await assertFails(updateDoc(doc(admin(), "denuncias/dSeedImutavel"), { texto: "Relato reescrito pela triagem." }));
  await assertFails(updateDoc(doc(admin(), "denuncias/dSeedImutavel"), { hash: "b".repeat(64) }));
  await assertFails(updateDoc(doc(admin(), "denuncias/dSeedImutavel"), { categoria: "outro" }));
});
test("RH e COLABORADOR nao atualizam denuncia", async () => {
  await assertFails(updateDoc(doc(rh(), "denuncias/dSeedNegaEdicao"), { status: "em_analise" }));
  await assertFails(updateDoc(doc(colab(), "denuncias/dSeedNegaEdicao"), { status: "em_analise" }));
});
test("Nota acima de 2000 nega", async () =>
  assertFails(updateDoc(doc(admin(), "denuncias/dSeedNotaGigante"), { nota: "x".repeat(2001) })));

// ---------- Delete (LGPD, exclusao definitiva SO admin) ----------
test("ADMIN exclui denuncia (LGPD)", async () =>
  assertSucceeds(deleteDoc(doc(admin(), "denuncias/dSeedDel"))));
test("RH e COLABORADOR nao excluem denuncia", async () => {
  await assertFails(deleteDoc(doc(rh(), "denuncias/dSeedDelNegado")));
  await assertFails(deleteDoc(doc(colab(), "denuncias/dSeedDelNegado")));
});
