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
    await setDoc(doc(db, "vagas/vEncDel"), vaga({ status: "encerrada", publicadaEm: new Date(), encerradaEm: new Date() }));
    await setDoc(doc(db, "vagas/vPubEncerrar"), vaga({ status: "publicada", publicadaEm: new Date() }));
    await setDoc(doc(db, "config/vagas"), { whatsapp: "+5547999990000" });
    await setDoc(doc(db, "vagas/vCand"), vaga({ status: "publicada", publicadaEm: new Date(), titulo: "Tecelão" }));
    await setDoc(doc(db, "candidaturas/vCand__gp@mail.com"), {
      vagaId: "vCand", vagaTitulo: "Tecelão", nome: "Pessoa Seed", telefone: "47911112222",
      email: "gp@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
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
test("RH exclui vaga ENCERRADA (novo, William 2026-07-14)", async () =>
  assertSucceeds(deleteDoc(doc(rh(), "vagas/vEncDel"))));

// ---------- Candidaturas (PRIMEIRA escrita anonima do projeto: funil estreito) ----------
const cand = (o = {}) => ({
  vagaId: "vCand", vagaTitulo: "Tecelão", nome: "Ana Souza", telefone: "47999998888",
  email: "ana@mail.com", mensagem: "Tenho experiência com máquinas.", em: TS(), status: "nova", ...o,
});
const cid = (email, vagaId = "vCand") => `candidaturas/${vagaId}__${email.toLowerCase()}`;

test("ANONIMO se candidata a vaga publicada (shape completo, id deterministico)", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("ana@mail.com")), cand())));
test("email com maiusculas: id usa lower e o campo mantem o original", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("Bia@Mail.com")), cand({ email: "Bia@Mail.com" }))));
test("candidatura REPETIDA nega (mesmo email+vaga vira update, update e false)", async () => {
  await assertSucceeds(setDoc(doc(anon(), cid("dup@mail.com")), cand({ email: "dup@mail.com" })));
  await assertFails(setDoc(doc(anon(), cid("dup@mail.com")), cand({ email: "dup@mail.com" })));
});
test("campo EXTRA nega (hasOnly)", async () =>
  assertFails(setDoc(doc(anon(), cid("x1@mail.com")), cand({ email: "x1@mail.com", curriculoUrl: "http://mal" }))));
test("vagaTitulo DIVERGENTE da vaga real nega (titulo enganoso)", async () =>
  assertFails(setDoc(doc(anon(), cid("x10@mail.com")), cand({ email: "x10@mail.com", vagaTitulo: "Gerente Geral, salario 50 mil" }))));
test("vagaTitulo igual ao da vaga passa", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("x11@mail.com")), cand({ email: "x11@mail.com", vagaTitulo: "Tecelão" }))));
test("vaga em RASCUNHO nao aceita candidatura", async () =>
  assertFails(setDoc(doc(anon(), "candidaturas/vRasc__x2@mail.com"), cand({ vagaId: "vRasc", email: "x2@mail.com" }))));
test("vaga ENCERRADA nao aceita candidatura", async () =>
  assertFails(setDoc(doc(anon(), "candidaturas/vEnc__x3@mail.com"), cand({ vagaId: "vEnc", email: "x3@mail.com" }))));
test("vaga INEXISTENTE nao aceita candidatura", async () =>
  assertFails(setDoc(doc(anon(), "candidaturas/nada__x4@mail.com"), cand({ vagaId: "nada", email: "x4@mail.com" }))));
test("email invalido nega", async () =>
  assertFails(setDoc(doc(anon(), "candidaturas/vCand__sem-arroba"), cand({ email: "sem-arroba" }))));
test("nome curto nega", async () =>
  assertFails(setDoc(doc(anon(), cid("x5@mail.com")), cand({ email: "x5@mail.com", nome: "ab" }))));
test("mensagem acima de 1000 nega", async () =>
  assertFails(setDoc(doc(anon(), cid("x6@mail.com")), cand({ email: "x6@mail.com", mensagem: "m".repeat(1001) }))));
test("em de cliente (nao server-time) nega", async () =>
  assertFails(setDoc(doc(anon(), cid("x7@mail.com")), cand({ email: "x7@mail.com", em: new Date() }))));
test("status diferente de nova nega", async () =>
  assertFails(setDoc(doc(anon(), cid("x8@mail.com")), cand({ email: "x8@mail.com", status: "vista" }))));
test("doc ID fora do padrao vagaId__email nega", async () =>
  assertFails(setDoc(doc(anon(), "candidaturas/qualquer-id"), cand({ email: "x9@mail.com" }))));
test("ANONIMO NAO le nem lista candidaturas (PII de candidato)", async () => {
  await assertFails(getDoc(doc(anon(), "candidaturas/vCand__gp@mail.com")));
  await assertFails(getDocs(collection(anon(), "candidaturas")));
});
test("ANONIMO NAO atualiza nem deleta candidatura", async () => {
  await assertFails(updateDoc(doc(anon(), "candidaturas/vCand__gp@mail.com"), { status: "vista" }));
  await assertFails(deleteDoc(doc(anon(), "candidaturas/vCand__gp@mail.com")));
});
test("COLABORADOR NAO le candidaturas (so GP)", async () =>
  assertFails(getDoc(doc(colab(), "candidaturas/vCand__gp@mail.com"))));
test("RH le, lista e exclui candidatura (LGPD)", async () => {
  await assertSucceeds(getDoc(doc(rh(), "candidaturas/vCand__gp@mail.com")));
  await assertSucceeds(getDocs(collection(rh(), "candidaturas")));
  await assertSucceeds(deleteDoc(doc(rh(), "candidaturas/vCand__gp@mail.com")));
});
test("RH NAO atualiza candidatura (update fechado no v1)", async () =>
  assertFails(updateDoc(doc(rh(), "candidaturas/vCand__ana@mail.com"), { status: "vista" })));

// ---------- Candidatura COMPLETA (v3, 2026-07-15: nascimento + teste DISC + curriculo) ----------
test("candidatura COMPLETA com todos os campos novos passa", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("completa@mail.com")), cand({
    email: "completa@mail.com",
    nascimento: "1992-03-14",
    disc: { d: 5, i: -2, s: -3, c: 0 },
    discPrimario: "D",
    curriculoPath: "curriculos/vCand__ana@mail.com__a1b2c3.pdf",
  }))));
test("candidatura SEM os campos novos continua passando (retrocompat)", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("semextras@mail.com")), cand({ email: "semextras@mail.com" }))));
test("nascimento fora do formato ISO nega", async () =>
  assertFails(setDoc(doc(anon(), cid("nasc1@mail.com")), cand({ email: "nasc1@mail.com", nascimento: "14/03/1992" }))));
test("disc com chave extra nega", async () =>
  assertFails(setDoc(doc(anon(), cid("disc1@mail.com")), cand({ email: "disc1@mail.com", disc: { d: 1, i: 1, s: 1, c: 1, x: 1 } }))));
test("disc com valor acima da faixa (d:9) nega", async () =>
  assertFails(setDoc(doc(anon(), cid("disc2@mail.com")), cand({ email: "disc2@mail.com", disc: { d: 9, i: 0, s: 0, c: 0 } }))));
test("disc com valor abaixo da faixa (d:-9) nega", async () =>
  assertFails(setDoc(doc(anon(), cid("disc3@mail.com")), cand({ email: "disc3@mail.com", disc: { d: -9, i: 0, s: 0, c: 0 } }))));
test("disc com valor nao-inteiro nega", async () =>
  assertFails(setDoc(doc(anon(), cid("disc4@mail.com")), cand({ email: "disc4@mail.com", disc: { d: "5", i: 0, s: 0, c: 0 } }))));
test("disc INCOMPLETO (sem a chave d) nega (chave ausente = erro de avaliacao = nega)", async () =>
  assertFails(setDoc(doc(anon(), cid("disc5@mail.com")), cand({ email: "disc5@mail.com", disc: { i: 0, s: 0, c: 0 } }))));
test("discPrimario fora da lista nega", async () =>
  assertFails(setDoc(doc(anon(), cid("discp1@mail.com")), cand({ email: "discp1@mail.com", discPrimario: "X" }))));
test("curriculoPath fora do padrao (path traversal) nega", async () =>
  assertFails(setDoc(doc(anon(), cid("curr1@mail.com")), cand({ email: "curr1@mail.com", curriculoPath: "hack/../x.pdf" }))));
test("curriculoPath com extensao errada nega", async () =>
  assertFails(setDoc(doc(anon(), cid("curr2@mail.com")), cand({ email: "curr2@mail.com", curriculoPath: "curriculos/x.exe" }))));
