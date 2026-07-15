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
    await setDoc(doc(db, "denuncias/dSeedDelNegado"), { categoria: "violencia", ...seedTexto("Relato semeado para negar exclusao de RH e colaborador."), em: new Date(), status: "nova" });
    // ----- v2 governanca (desfecho obrigatorio, retencao 5 anos, guarda permanente) -----
    await setDoc(doc(db, "denuncias/dSeedConcluir"), { categoria: "seguranca", ...seedTexto("Relato semeado para concluir com desfecho valido."), em: new Date(), status: "em_analise" });
    await setDoc(doc(db, "denuncias/dSeedConcluirSemDesf"), { categoria: "seguranca", ...seedTexto("Relato semeado para negar conclusao sem desfecho."), em: new Date(), status: "em_analise" });
    await setDoc(doc(db, "denuncias/dSeedDesfEnum"), { categoria: "outro", ...seedTexto("Relato semeado para negar desfecho fora do enum."), em: new Date(), status: "em_analise" });
    await setDoc(doc(db, "denuncias/dSeedDesfImut"), { categoria: "fraude", ...seedTexto("Relato semeado para negar troca de relato junto do desfecho."), em: new Date(), status: "em_analise" });
    await setDoc(doc(db, "denuncias/dSeedPerm"), { categoria: "assedio-moral", ...seedTexto("Relato semeado para ligar a guarda permanente."), em: new Date(), status: "em_analise" });
    await setDoc(doc(db, "denuncias/dSeedDelNova"), { categoria: "violencia", ...seedTexto("Relato semeado nova, exclusao deve negar (governanca)."), em: new Date(), status: "nova" });
    await setDoc(doc(db, "denuncias/dSeedDelAnalise"), { categoria: "violencia", ...seedTexto("Relato semeado em analise, exclusao deve negar."), em: new Date(), status: "em_analise" });
    await setDoc(doc(db, "denuncias/dSeedDelRecente"), { categoria: "violencia", ...seedTexto("Relato semeado concluido agora, exclusao deve negar (5 anos)."), em: new Date(), status: "concluida", desfecho: "improcedente", concluidaEm: new Date() });
    const seisAnos = new Date(); seisAnos.setFullYear(seisAnos.getFullYear() - 6);
    await setDoc(doc(db, "denuncias/dSeedDelAntiga"), { categoria: "violencia", ...seedTexto("Relato semeado concluido ha seis anos, exclusao deve passar."), em: new Date(), status: "concluida", desfecho: "procedente", concluidaEm: seisAnos });
    await setDoc(doc(db, "denuncias/dSeedDelAntigaPerm"), { categoria: "violencia", ...seedTexto("Relato concluido ha seis anos MAS com guarda permanente."), em: new Date(), status: "concluida", desfecho: "procedente", concluidaEm: seisAnos, guardaPermanente: true });
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
test("Campos de governanca (desfecho/concluidaEm/guardaPermanente) no create negam (so na triagem do admin)", async () => {
  await assertFails(setDoc(doc(colab(), "denuncias/dGov1"), den({ desfecho: "procedente" })));
  await assertFails(setDoc(doc(colab(), "denuncias/dGov2"), den({ guardaPermanente: true })));
  await assertFails(setDoc(doc(colab(), "denuncias/dGov3"), den({ concluidaEm: TS() })));
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
test("Texto ACENTUADO/UTF-8 real com hash sha256 utf8 do cliente PASSA (hashing.sha256 confere UTF-8)", async () => {
  const texto = "Sofri assédio e coação na fiação, situação já aconteceu três vezes.";
  await assertSucceeds(setDoc(doc(colab(), "denuncias/dUtf8"), den({ texto, hash: sha256(texto) })));
});
test("Hash em hex MAIUSCULO tambem PASSA (regra usa .lower() dos dois lados)", async () => {
  const texto = TEXTO_PADRAO;
  await assertSucceeds(setDoc(doc(colab(), "denuncias/dHashMaiusculo"), den({ texto, hash: sha256(texto).toUpperCase() })));
});
test("Texto com exatamente 10 chars (hash correto) PASSA (boundary)", async () => {
  const texto = "a".repeat(10);
  await assertSucceeds(setDoc(doc(colab(), "denuncias/dTextoMin"), den({ texto, hash: sha256(texto) })));
});
test("Texto com exatamente 5000 chars (hash correto) PASSA (boundary)", async () => {
  const texto = "a".repeat(5000);
  await assertSucceeds(setDoc(doc(colab(), "denuncias/dTextoMax"), den({ texto, hash: sha256(texto) })));
});

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
test("ADMIN muda status para em_analise e depois para concluida (com desfecho + carimbo)", async () => {
  await assertSucceeds(updateDoc(doc(admin(), "denuncias/dSeedStatus"), { status: "em_analise" }));
  await assertSucceeds(updateDoc(doc(admin(), "denuncias/dSeedStatus2"), { status: "concluida", desfecho: "improcedente", concluidaEm: TS() }));
});
// ----- v2: desfecho obrigatorio ao concluir + enum fechado + carimbo do servidor -----
test("Concluir SEM desfecho nega (governanca: nao ha encerramento sem registro)", async () =>
  assertFails(updateDoc(doc(admin(), "denuncias/dSeedConcluirSemDesf"), { status: "concluida", concluidaEm: TS() })));
test("Desfecho fora do enum nega", async () =>
  assertFails(updateDoc(doc(admin(), "denuncias/dSeedDesfEnum"), { status: "concluida", desfecho: "arquivado", concluidaEm: TS() })));
test("Concluir com desfecho valido + concluidaEm == request.time PASSA", async () =>
  assertSucceeds(updateDoc(doc(admin(), "denuncias/dSeedConcluir"), { status: "concluida", desfecho: "procedente", concluidaEm: TS() })));
test("concluidaEm com data arbitraria do cliente (nao server-time) nega", async () =>
  assertFails(updateDoc(doc(admin(), "denuncias/dSeedConcluir"), { status: "concluida", desfecho: "procedente", concluidaEm: new Date() })));
test("Mudar o RELATO/HASH junto do desfecho nega (imutaveis, hasOnly fecha)", async () => {
  await assertFails(updateDoc(doc(admin(), "denuncias/dSeedDesfImut"), { status: "concluida", desfecho: "procedente", concluidaEm: TS(), texto: "Relato reescrito na conclusao." }));
  await assertFails(updateDoc(doc(admin(), "denuncias/dSeedDesfImut"), { status: "concluida", desfecho: "procedente", concluidaEm: TS(), hash: "c".repeat(64) }));
});
test("ADMIN liga guardaPermanente (caso gravissimo)", async () =>
  assertSucceeds(updateDoc(doc(admin(), "denuncias/dSeedPerm"), { guardaPermanente: true })));
test("guardaPermanente nao-boolean nega", async () =>
  assertFails(updateDoc(doc(admin(), "denuncias/dSeedPerm"), { guardaPermanente: "sim" })));
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

// ---------- Delete (GOVERNANCA + LGPD: so concluida, apos 5 anos, nunca se permanente) ----------
test("ADMIN NAO exclui denuncia nova nem em analise (so trata, nao apaga)", async () => {
  await assertFails(deleteDoc(doc(admin(), "denuncias/dSeedDelNova")));
  await assertFails(deleteDoc(doc(admin(), "denuncias/dSeedDelAnalise")));
});
test("ADMIN NAO exclui concluida recente (dentro do piso de 5 anos)", async () =>
  assertFails(deleteDoc(doc(admin(), "denuncias/dSeedDelRecente"))));
test("ADMIN exclui concluida com mais de 5 anos (piso de retencao cumprido)", async () =>
  assertSucceeds(deleteDoc(doc(admin(), "denuncias/dSeedDelAntiga"))));
test("ADMIN NAO exclui concluida antiga marcada como guarda permanente (nunca expira)", async () =>
  assertFails(deleteDoc(doc(admin(), "denuncias/dSeedDelAntigaPerm"))));
test("Desligar guardaPermanente e ENTAO excluir a concluida antiga PASSA", async () => {
  await assertSucceeds(updateDoc(doc(admin(), "denuncias/dSeedDelAntigaPerm"), { guardaPermanente: false }));
  await assertSucceeds(deleteDoc(doc(admin(), "denuncias/dSeedDelAntigaPerm")));
});
test("RH e COLABORADOR nao excluem denuncia", async () => {
  await assertFails(deleteDoc(doc(rh(), "denuncias/dSeedDelNegado")));
  await assertFails(deleteDoc(doc(colab(), "denuncias/dSeedDelNegado")));
});
