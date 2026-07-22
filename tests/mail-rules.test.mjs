// Rules da FILA DE EMAILS (extensao Trigger Email, 2026-07-16). A extensao
// processa /mail via Admin SDK (ignora estas rules) e le os moldes de
// /emailTemplates; as rules governam SO os clientes. Anti-spam ESTRUTURAL:
//   (a) EMAIL 1 (anonimo, 'candidatura-recebida'): no MESMO batch da
//       candidatura, mailId == id dela (getAfter ve o irmao), to == email dela.
//   (b) EMAILS DE STATUS (GP, cap vagas.gerenciar): candidatura JA existe,
//       mailId == '<candidaturaId>-<status>' (em-analise/aprovada/nao-seguiu),
//       to == email dela, molde 'candidatura-<status>'. Id trava 1 por status.
//   READ/UPDATE/DELETE de cliente: false (PII do candidato + entrega da extensao).
// emailTemplates: read authed, write so admin com shape sano.
//
//   firebase emulators:exec --only firestore "node --test tests/mail-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";

let env;
const TS = serverTimestamp;

// Candidatura COMPLETA e valida (ficha v4): a criacao no batch tem que passar na
// regra de /candidaturas, senao o batch inteiro falha antes de chegar no mail.
const cand = (o = {}) => ({
  vagaId: "vMail", vagaTitulo: "Tecelão", nome: "Ana Souza", telefone: "47999998888",
  email: "ana@mail.com", mensagem: "", em: TS(), status: "nova",
  nascimento: "1994-03-12", estadoCivil: "solteiro", escolaridade: "medio-completo",
  filhos: 0, endereco: "Rua das Palmeiras, 240, Indaial SC",
  nacionalidade: "Brasileira", naturalidade: "Blumenau, SC",
  experiencias: [], pretensaoSalarial: 2200, comoViria: "moto", indicacao: "",
  ...o,
});
// Mail base (molde 'candidatura-recebida'). template inteiro e sobrescrito quando
// o teste precisa de outro molde/shape.
const mail = (o = {}) => ({
  to: "ana@mail.com",
  template: { name: "candidatura-recebida", data: { nome: "Ana", vaga: "Tecelão" } },
  ...o,
});
const cid = (email, vagaId = "vMail") => `${vagaId}__${email.toLowerCase()}`;

// Batch candidatura + mail (o fluxo real do site). Por padrao candId == mailId.
function enviar(db, { email, mailId, mailData, candData } = {}) {
  const cIdd = cid(email);
  const b = writeBatch(db);
  b.set(doc(db, `candidaturas/${cIdd}`), candData || cand({ email }));
  b.set(doc(db, `mail/${mailId || cIdd}`), mailData || mail({ to: email }));
  return b.commit();
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-mail-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"), { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"), { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", nome: "Maria", funcionarioId: "f-1" });
    // Vaga publicada com titulo casado (a criacao da candidatura no batch le por get()).
    await setDoc(doc(db, "vagas/vMail"), {
      titulo: "Tecelão", descricao: "Operação de teares.", status: "publicada",
      criadoPor: "uRh", criadoEm: new Date(), publicadaEm: new Date(),
    });
    // Candidaturas JA existentes (os emails de status pressupoem a candidatura gravada).
    await setDoc(doc(db, "candidaturas/vMail__joao@mail.com"), {
      vagaId: "vMail", vagaTitulo: "Tecelão", nome: "João P", telefone: "47900001111",
      email: "joao@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    await setDoc(doc(db, "candidaturas/vMail__wrong@mail.com"), {
      vagaId: "vMail", vagaTitulo: "Tecelão", nome: "Carla W", telefone: "47900002222",
      email: "wrong@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    await setDoc(doc(db, "candidaturas/vMail__enum@mail.com"), {
      vagaId: "vMail", vagaTitulo: "Tecelão", nome: "Enum E", telefone: "47900003333",
      email: "enum@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    await setDoc(doc(db, "candidaturas/vMail__deny@mail.com"), {
      vagaId: "vMail", vagaTitulo: "Tecelão", nome: "Deny D", telefone: "47900004444",
      email: "deny@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    // Candidatura cujo email LOCAL contem o texto de um status: prova o strip+concat
    // ancorado (o replace so tira o sufixo, nao o "-aprovada" do meio do email).
    await setDoc(doc(db, "candidaturas/vMail__ana-aprovada@mail.com"), {
      vagaId: "vMail", vagaTitulo: "Tecelão", nome: "Ana A", telefone: "47900005555",
      email: "ana-aprovada@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    // Mail ja gravado (pela "extensao"): prova que cliente nenhum le/edita/apaga.
    await setDoc(doc(db, "mail/seedMail"), {
      to: "joao@mail.com", template: { name: "candidatura-recebida", data: { nome: "João", vaga: "Tecelão" } },
      delivery: { state: "SUCCESS" },
    });
    // Molde semeado (pra provar a leitura autenticada).
    await setDoc(doc(db, "emailTemplates/candidatura-recebida"), {
      subject: "Recebemos a sua candidatura", text: "Olá...", html: "<p>Olá...</p>",
    });
  });
});
after(async () => { await env.cleanup(); });

const admin = () => env.authenticatedContext("uAdmin").firestore();
const rh    = () => env.authenticatedContext("uRh").firestore();
const colab = () => env.authenticatedContext("uColab").firestore();
const anon  = () => env.unauthenticatedContext().firestore();

// ---------- (a) EMAIL 1 anonimo (candidatura-recebida) no MESMO batch ----------
test("ANONIMO cria mail de recebida em BATCH com a candidatura (fluxo do site) PASSA", async () =>
  assertSucceeds(enviar(anon(), { email: "ana@mail.com" })));

test("mail com email LOCAL contendo '-aprovada' PASSA no batch (strip nao corta o meio)", async () =>
  assertSucceeds(enviar(anon(), { email: "batch-aprovada@mail.com" })));

test("to DIFERENTE do email da candidatura NEGA", async () =>
  assertFails(enviar(anon(), {
    email: "toerr@mail.com",
    mailData: mail({ to: "atacante@evil.com" }),
  })));

test("template.name ERRADO NEGA (anonimo so manda 'candidatura-recebida')", async () =>
  assertFails(enviar(anon(), {
    email: "nameerr@mail.com",
    mailData: mail({ to: "nameerr@mail.com", template: { name: "candidatura-aprovada", data: { nome: "N", vaga: "Tecelão" } } }),
  })));

test("template.data com campo EXTRA NEGA (hasOnly)", async () =>
  assertFails(enviar(anon(), {
    email: "extra@mail.com",
    mailData: mail({ to: "extra@mail.com", template: { name: "candidatura-recebida", data: { nome: "N", vaga: "Tecelão", link: "http://x" } } }),
  })));

test("mail com campo EXTRA no topo NEGA (hasOnly to/template)", async () =>
  assertFails(enviar(anon(), {
    email: "extra2@mail.com",
    mailData: mail({ to: "extra2@mail.com", cc: "x@y.com" }),
  })));

test("template.data.nome acima de 80 NEGA (shape)", async () =>
  assertFails(enviar(anon(), {
    email: "nomebig@mail.com",
    mailData: mail({ to: "nomebig@mail.com", template: { name: "candidatura-recebida", data: { nome: "x".repeat(81), vaga: "Tecelão" } } }),
  })));

test("template.data.vaga acima de 120 NEGA (shape)", async () =>
  assertFails(enviar(anon(), {
    email: "vagabig@mail.com",
    mailData: mail({ to: "vagabig@mail.com", template: { name: "candidatura-recebida", data: { nome: "N", vaga: "x".repeat(121) } } }),
  })));

test("mail SEM batch (candidatura nao existe) NEGA", async () =>
  assertFails(setDoc(doc(anon(), "mail/vMail__fantasma@mail.com"), mail({ to: "fantasma@mail.com" }))));

test("mailId != id da candidatura do batch NEGA", async () =>
  assertFails(enviar(anon(), {
    email: "descasado@mail.com",
    mailId: "vMail__outro@mail.com", // candidatura criada e vMail__descasado, mail aponta outro id
    mailData: mail({ to: "descasado@mail.com" }),
  })));

test("re-create do MESMO id NEGA (create-only; 2o set vira update)", async () => {
  await assertSucceeds(enviar(anon(), { email: "recria@mail.com" }));
  await assertFails(setDoc(doc(anon(), `mail/${cid("recria@mail.com")}`), mail({ to: "recria@mail.com" })));
});

// ---------- (b) EMAILS DE STATUS pela GP ----------
const statusMail = (email, status) => ({
  to: email,
  template: { name: `candidatura-${status}`, data: { nome: "João", vaga: "Tecelão" } },
});
const statusId = (email, status) => `mail/${cid(email)}-${status}`;

test("GP cria mail de status pra candidatura existente PASSA (os 3 status)", async () => {
  await assertSucceeds(setDoc(doc(rh(), statusId("joao@mail.com", "em-analise")), statusMail("joao@mail.com", "em-analise")));
  await assertSucceeds(setDoc(doc(rh(), statusId("joao@mail.com", "aprovada")), statusMail("joao@mail.com", "aprovada")));
  await assertSucceeds(setDoc(doc(rh(), statusId("joao@mail.com", "nao-seguiu")), statusMail("joao@mail.com", "nao-seguiu")));
});

test("ADMIN tambem cria mail de status", async () =>
  assertSucceeds(setDoc(doc(admin(), statusId("enum@mail.com", "aprovada")), statusMail("enum@mail.com", "aprovada"))));

test("GP: email da candidatura com '-aprovada' no LOCAL resolve o candId certo (strip ancorado) PASSA", async () =>
  assertSucceeds(setDoc(
    doc(rh(), statusId("ana-aprovada@mail.com", "aprovada")),
    statusMail("ana-aprovada@mail.com", "aprovada"),
  )));

test("GP com to ERRADO NEGA (to tem que ser o email da candidatura)", async () =>
  assertFails(setDoc(doc(rh(), statusId("wrong@mail.com", "aprovada")), {
    to: "atacante@evil.com",
    template: { name: "candidatura-aprovada", data: { nome: "C", vaga: "Tecelão" } },
  })));

test("GP com status FORA do enum no id NEGA (ex.: 'vista')", async () =>
  assertFails(setDoc(doc(rh(), statusId("enum@mail.com", "vista")), {
    to: "enum@mail.com",
    template: { name: "candidatura-vista", data: { nome: "E", vaga: "Tecelão" } },
  })));

// contratada (v383): status do funil SEM molde de email -> mail de contratada NEGA (o front
// nao tenta criar; a rule tranca por nao estar entre os 3 status com mensagem).
test("GP: status 'contratada' (sem molde) NEGA — contratada nao manda email", async () =>
  assertFails(setDoc(doc(rh(), statusId("enum@mail.com", "contratada")), {
    to: "enum@mail.com",
    template: { name: "candidatura-contratada", data: { nome: "E", vaga: "Tecelão" } },
  })));

test("GP: id termina em -aprovada mas molde e em-analise NEGA (id x molde descasados)", async () =>
  assertFails(setDoc(doc(rh(), statusId("enum@mail.com", "aprovada")), statusMail("enum@mail.com", "em-analise"))));

test("GP: status pra candidatura INEXISTENTE NEGA", async () =>
  assertFails(setDoc(doc(rh(), statusId("naoexiste@mail.com", "aprovada")), statusMail("naoexiste@mail.com", "aprovada"))));

test("COLABORADOR (sem cap) NAO cria mail de status", async () =>
  assertFails(setDoc(doc(colab(), statusId("deny@mail.com", "aprovada")), statusMail("deny@mail.com", "aprovada"))));

test("ANONIMO tentando o FORMATO de status NEGA (nao tem cap; recebida nao casa o nome)", async () =>
  assertFails(setDoc(doc(anon(), statusId("deny@mail.com", "em-analise")), statusMail("deny@mail.com", "em-analise"))));

// ---------- READ / UPDATE / DELETE de cliente: false ----------
test("NINGUEM (anon/colab/GP/admin) LE mail (PII do candidato + entrega)", async () => {
  await assertFails(getDoc(doc(anon(), "mail/seedMail")));
  await assertFails(getDoc(doc(colab(), "mail/seedMail")));
  await assertFails(getDoc(doc(rh(), "mail/seedMail")));
  await assertFails(getDoc(doc(admin(), "mail/seedMail")));
});
test("NINGUEM atualiza mail (nem admin)", async () => {
  await assertFails(updateDoc(doc(anon(), "mail/seedMail"), { to: "x@y.com" }));
  await assertFails(updateDoc(doc(rh(), "mail/seedMail"), { to: "x@y.com" }));
  await assertFails(updateDoc(doc(admin(), "mail/seedMail"), { to: "x@y.com" }));
});
test("NINGUEM deleta mail (nem admin)", async () => {
  await assertFails(deleteDoc(doc(colab(), "mail/seedMail")));
  await assertFails(deleteDoc(doc(rh(), "mail/seedMail")));
  await assertFails(deleteDoc(doc(admin(), "mail/seedMail")));
});

// ---------- emailTemplates (read authed, write so admin com shape) ----------
test("ADMIN escreve molde (create) OK", async () =>
  assertSucceeds(setDoc(doc(admin(), "emailTemplates/candidatura-aprovada"), {
    subject: "Boas notícias", text: "Olá {{nome}}", html: "<p>Olá {{nome}}</p>",
  })));
test("ADMIN atualiza molde (update idempotente) OK", async () =>
  assertSucceeds(setDoc(doc(admin(), "emailTemplates/candidatura-recebida"), {
    subject: "Recebemos a sua candidatura, {{nome}}", text: "corpo", html: "<p>corpo</p>",
  })));
test("molde com campo EXTRA NEGA (shape)", async () =>
  assertFails(setDoc(doc(admin(), "emailTemplates/xExtra"), {
    subject: "s", text: "t", html: "h", from: "vagas@fiobras.com.br",
  })));
test("molde com subject acima de 200 NEGA", async () =>
  assertFails(setDoc(doc(admin(), "emailTemplates/xSubj"), { subject: "x".repeat(201), text: "t", html: "h" })));
test("molde com html acima de 10000 NEGA", async () =>
  assertFails(setDoc(doc(admin(), "emailTemplates/xHtml"), { subject: "s", text: "t", html: "x".repeat(10001) })));
test("molde com campo faltando NEGA (subject ausente)", async () =>
  assertFails(setDoc(doc(admin(), "emailTemplates/xMiss"), { text: "t", html: "h" })));
test("COLABORADOR NAO escreve molde", async () =>
  assertFails(setDoc(doc(colab(), "emailTemplates/xColab"), { subject: "s", text: "t", html: "h" })));
test("RH (sem ser admin) NAO escreve molde", async () =>
  assertFails(setDoc(doc(rh(), "emailTemplates/xRh"), { subject: "s", text: "t", html: "h" })));
test("ANONIMO NAO escreve molde", async () =>
  assertFails(setDoc(doc(anon(), "emailTemplates/xAnon"), { subject: "s", text: "t", html: "h" })));
test("AUTENTICADO le molde (sem segredo)", async () => {
  await assertSucceeds(getDoc(doc(colab(), "emailTemplates/candidatura-recebida")));
  await assertSucceeds(getDoc(doc(rh(), "emailTemplates/candidatura-recebida")));
});
test("ANONIMO NAO le molde (read exige login)", async () =>
  assertFails(getDoc(doc(anon(), "emailTemplates/candidatura-recebida"))));
