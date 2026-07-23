// Rules da FILA DE WHATSAPP (caminho solo Meta Cloud API, 2026-07-22). Uma Cloud
// Function (proxima etapa) processa /waMsg via Admin SDK (ignora estas rules) e
// resolve o template Meta PINADO; as rules governam SO os clientes. Espelho
// ESTRUTURAL da /mail. Anti-spam estrutural:
//   (a) RECEBIDA (anonimo, 'candidatura_recebida'): no MESMO batch da
//       candidatura, waId == id dela (getAfter ve o irmao), para == telefone dela.
//   (b) STATUS (GP, cap vagas.gerenciar): candidatura JA existe,
//       waId == '<candidaturaId>-<status>' (em_analise/aprovada/nao_seguiu,
//       tokens Meta em underscore), para == telefone dela, template
//       'candidatura_<status>'. Id trava 1 por status.
//   READ/UPDATE/DELETE de cliente: false (PII do candidato + envio da function).
//
//   firebase emulators:exec --only firestore "node --test tests/wamsg-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";

let env;
const TS = serverTimestamp;

// Candidatura COMPLETA e valida (ficha v4): a criacao no batch tem que passar na
// regra de /candidaturas, senao o batch inteiro falha antes de chegar no waMsg.
const cand = (o = {}) => ({
  vagaId: "vWa", vagaTitulo: "Tecelão", nome: "Ana Souza", telefone: "47999998888",
  email: "ana@mail.com", mensagem: "", em: TS(), status: "nova",
  nascimento: "1994-03-12", estadoCivil: "solteiro", escolaridade: "medio-completo",
  filhos: 0, endereco: "Rua das Palmeiras, 240, Indaial SC",
  nacionalidade: "Brasileira", naturalidade: "Blumenau, SC",
  experiencias: [], pretensaoSalarial: 2200, comoViria: "moto", indicacao: "",
  ...o,
});
// waMsg base (template 'candidatura_recebida'). O objeto inteiro e sobrescrito
// quando o teste precisa de outro shape.
const wamsg = (o = {}) => ({
  para: "47999998888",
  template: "candidatura_recebida",
  params: { nome: "Ana", vaga: "Tecelão" },
  em: TS(),
  candidaturaId: "vWa__ana@mail.com",
  ...o,
});
const cid = (email, vagaId = "vWa") => `${vagaId}__${email.toLowerCase()}`;

// Batch candidatura + waMsg (o fluxo real do site). Por padrao candId == waId e o
// para casa o telefone da candidatura.
function enviar(db, { email, telefone = "47999998888", waId, waData, candData } = {}) {
  const cIdd = cid(email);
  const b = writeBatch(db);
  b.set(doc(db, `candidaturas/${cIdd}`), candData || cand({ email, telefone }));
  b.set(doc(db, `waMsg/${waId || cIdd}`), waData || wamsg({ para: telefone, candidaturaId: waId || cIdd }));
  return b.commit();
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-wamsg-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"), { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"), { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", nome: "Maria", funcionarioId: "f-1" });
    // Vaga publicada com titulo casado (a criacao da candidatura no batch le por get()).
    await setDoc(doc(db, "vagas/vWa"), {
      titulo: "Tecelão", descricao: "Operação de teares.", status: "publicada",
      criadoPor: "uRh", criadoEm: new Date(), publicadaEm: new Date(),
    });
    // Candidaturas JA existentes (os waMsg de status pressupoem a candidatura gravada).
    await setDoc(doc(db, "candidaturas/vWa__joao@mail.com"), {
      vagaId: "vWa", vagaTitulo: "Tecelão", nome: "João P", telefone: "47900001111",
      email: "joao@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    await setDoc(doc(db, "candidaturas/vWa__wrong@mail.com"), {
      vagaId: "vWa", vagaTitulo: "Tecelão", nome: "Carla W", telefone: "47900002222",
      email: "wrong@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    await setDoc(doc(db, "candidaturas/vWa__enum@mail.com"), {
      vagaId: "vWa", vagaTitulo: "Tecelão", nome: "Enum E", telefone: "47900003333",
      email: "enum@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    await setDoc(doc(db, "candidaturas/vWa__deny@mail.com"), {
      vagaId: "vWa", vagaTitulo: "Tecelão", nome: "Deny D", telefone: "47900004444",
      email: "deny@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    // Candidatura cujo email LOCAL contem o texto de um status: prova o strip+concat
    // ancorado (o replace so tira o sufixo, nao o "-aprovada" do meio do email).
    await setDoc(doc(db, "candidaturas/vWa__ana-aprovada@mail.com"), {
      vagaId: "vWa", vagaTitulo: "Tecelão", nome: "Ana A", telefone: "47900005555",
      email: "ana-aprovada@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    // waMsg ja gravado (pela "function"): prova que cliente nenhum le/edita, e que
    // colab/anon nao deletam.
    await setDoc(doc(db, "waMsg/seedWa"), {
      para: "47900001111", template: "candidatura_recebida",
      params: { nome: "João", vaga: "Tecelão" }, em: new Date(),
      candidaturaId: "vWa__joao@mail.com", delivery: { state: "SENT" },
    });
    // Docs dedicados pro delete que PASSA (GP e admin expurgam o irmao no expurgo LGPD).
    await setDoc(doc(db, "waMsg/delGp"), {
      para: "47900001111", template: "candidatura_recebida",
      params: { nome: "João", vaga: "Tecelão" }, em: new Date(),
      candidaturaId: "vWa__joao@mail.com", delivery: { state: "SENT" },
    });
    await setDoc(doc(db, "waMsg/delAdmin"), {
      para: "47900001111", template: "candidatura_recebida",
      params: { nome: "João", vaga: "Tecelão" }, em: new Date(),
      candidaturaId: "vWa__joao@mail.com", delivery: { state: "SENT" },
    });
  });
});
after(async () => { await env.cleanup(); });

const admin = () => env.authenticatedContext("uAdmin").firestore();
const rh    = () => env.authenticatedContext("uRh").firestore();
const colab = () => env.authenticatedContext("uColab").firestore();
const anon  = () => env.unauthenticatedContext().firestore();

// ---------- (a) RECEBIDA anonima ('candidatura_recebida') no MESMO batch ----------
test("ANONIMO cria waMsg de recebida em BATCH com a candidatura (fluxo do site) PASSA", async () =>
  assertSucceeds(enviar(anon(), { email: "ana@mail.com" })));

test("waMsg com email LOCAL contendo '-aprovada' PASSA no batch (recebida, sem strip)", async () =>
  assertSucceeds(enviar(anon(), { email: "batch-aprovada@mail.com" })));

test("para DIFERENTE do telefone da candidatura NEGA", async () =>
  assertFails(enviar(anon(), {
    email: "toerr@mail.com",
    waData: wamsg({ para: "47911112222", candidaturaId: cid("toerr@mail.com") }),
  })));

test("template ERRADO NEGA (anonimo so manda 'candidatura_recebida')", async () =>
  assertFails(enviar(anon(), {
    email: "tmplerr@mail.com",
    waData: wamsg({ template: "candidatura_aprovada", candidaturaId: cid("tmplerr@mail.com") }),
  })));

test("params com campo EXTRA NEGA (hasOnly)", async () =>
  assertFails(enviar(anon(), {
    email: "extrap@mail.com",
    waData: wamsg({ params: { nome: "N", vaga: "Tecelão", link: "http://x" }, candidaturaId: cid("extrap@mail.com") }),
  })));

test("params SEM vaga NEGA (chave obrigatoria)", async () =>
  assertFails(enviar(anon(), {
    email: "semvaga@mail.com",
    waData: wamsg({ params: { nome: "N" }, candidaturaId: cid("semvaga@mail.com") }),
  })));

test("waMsg com campo EXTRA no topo NEGA (hasOnly)", async () =>
  assertFails(enviar(anon(), {
    email: "extratopo@mail.com",
    waData: wamsg({ delivery: { state: "PENDING" }, candidaturaId: cid("extratopo@mail.com") }),
  })));

test("params.nome acima de 80 NEGA (shape)", async () =>
  assertFails(enviar(anon(), {
    email: "nomebig@mail.com",
    waData: wamsg({ params: { nome: "x".repeat(81), vaga: "Tecelão" }, candidaturaId: cid("nomebig@mail.com") }),
  })));

test("params.vaga acima de 120 NEGA (shape)", async () =>
  assertFails(enviar(anon(), {
    email: "vagabig@mail.com",
    waData: wamsg({ params: { nome: "N", vaga: "x".repeat(121) }, candidaturaId: cid("vagabig@mail.com") }),
  })));

test("em != request.time NEGA (shape; carimbo forjado)", async () =>
  assertFails(enviar(anon(), {
    email: "emerr@mail.com",
    waData: wamsg({ em: new Date(0), candidaturaId: cid("emerr@mail.com") }),
  })));

test("candidaturaId DIVERGENTE do waId NEGA (ponteiro forjado)", async () =>
  assertFails(enviar(anon(), {
    email: "candid@mail.com",
    waData: wamsg({ candidaturaId: "vWa__outro@mail.com" }),
  })));

test("waMsg SEM batch (candidatura nao existe) NEGA", async () =>
  assertFails(setDoc(doc(anon(), "waMsg/vWa__fantasma@mail.com"),
    wamsg({ candidaturaId: "vWa__fantasma@mail.com" }))));

test("waId != id da candidatura do batch NEGA", async () =>
  assertFails(enviar(anon(), {
    email: "descasado@mail.com",
    waId: "vWa__outro@mail.com", // candidatura criada e vWa__descasado; waMsg aponta outro id
    waData: wamsg({ candidaturaId: "vWa__outro@mail.com" }),
  })));

test("re-create do MESMO id NEGA (create-only; 2o set vira update)", async () => {
  await assertSucceeds(enviar(anon(), { email: "recria@mail.com" }));
  await assertFails(setDoc(doc(anon(), `waMsg/${cid("recria@mail.com")}`),
    wamsg({ candidaturaId: cid("recria@mail.com") })));
});

// ---------- (b) STATUS pela GP ----------
const statusWa = (email, status, telefone, o = {}) => ({
  para: telefone,
  template: `candidatura_${status}`,
  params: { nome: "João", vaga: "Tecelão" },
  em: TS(),
  candidaturaId: cid(email),
  ...o,
});
const statusId = (email, status) => `waMsg/${cid(email)}-${status}`;

test("GP cria waMsg de status pra candidatura existente PASSA (os 3 status)", async () => {
  await assertSucceeds(setDoc(doc(rh(), statusId("joao@mail.com", "em_analise")), statusWa("joao@mail.com", "em_analise", "47900001111")));
  await assertSucceeds(setDoc(doc(rh(), statusId("joao@mail.com", "aprovada")), statusWa("joao@mail.com", "aprovada", "47900001111")));
  await assertSucceeds(setDoc(doc(rh(), statusId("joao@mail.com", "nao_seguiu")), statusWa("joao@mail.com", "nao_seguiu", "47900001111")));
});

test("ADMIN tambem cria waMsg de status", async () =>
  assertSucceeds(setDoc(doc(admin(), statusId("enum@mail.com", "aprovada")), statusWa("enum@mail.com", "aprovada", "47900003333"))));

test("GP: email da candidatura com '-aprovada' no LOCAL resolve o candId certo (strip ancorado) PASSA", async () =>
  assertSucceeds(setDoc(
    doc(rh(), statusId("ana-aprovada@mail.com", "aprovada")),
    statusWa("ana-aprovada@mail.com", "aprovada", "47900005555"),
  )));

test("GP com para ERRADO NEGA (para tem que ser o telefone da candidatura)", async () =>
  assertFails(setDoc(doc(rh(), statusId("wrong@mail.com", "aprovada")),
    statusWa("wrong@mail.com", "aprovada", "47911112222"))));

test("GP com status FORA do enum no id NEGA (ex.: 'vista')", async () =>
  assertFails(setDoc(doc(rh(), statusId("enum@mail.com", "vista")), {
    para: "47900003333",
    template: "candidatura_vista",
    params: { nome: "E", vaga: "Tecelão" },
    em: TS(),
    candidaturaId: cid("enum@mail.com"),
  })));

// contratada (v383): status do funil SEM template Meta -> waMsg de contratada NEGA (o front
// nao tenta criar; a rule tranca por nao estar entre os 3 status com mensagem).
test("GP: status 'contratada' (sem template Meta) NEGA — contratada nao manda WhatsApp", async () =>
  assertFails(setDoc(doc(rh(), statusId("enum@mail.com", "contratada")), {
    para: "47900003333",
    template: "candidatura_contratada",
    params: { nome: "E", vaga: "Tecelão" },
    em: TS(),
    candidaturaId: cid("enum@mail.com"),
  })));

test("GP: id termina em -aprovada mas template e em_analise NEGA (id x template descasados)", async () =>
  assertFails(setDoc(doc(rh(), statusId("enum@mail.com", "aprovada")),
    statusWa("enum@mail.com", "em_analise", "47900003333"))));

test("GP: status pra candidatura INEXISTENTE NEGA", async () =>
  assertFails(setDoc(doc(rh(), statusId("naoexiste@mail.com", "aprovada")),
    statusWa("naoexiste@mail.com", "aprovada", "47900009999"))));

test("COLABORADOR (sem cap) NAO cria waMsg de status", async () =>
  assertFails(setDoc(doc(colab(), statusId("deny@mail.com", "aprovada")),
    statusWa("deny@mail.com", "aprovada", "47900004444"))));

test("ANONIMO tentando o FORMATO de status NEGA (nao tem cap; recebida nao casa o template)", async () =>
  assertFails(setDoc(doc(anon(), statusId("deny@mail.com", "em_analise")),
    statusWa("deny@mail.com", "em_analise", "47900004444"))));

// ---------- READ / UPDATE / DELETE de cliente: false ----------
test("NINGUEM (anon/colab/GP/admin) LE waMsg (PII do candidato + envio)", async () => {
  await assertFails(getDoc(doc(anon(), "waMsg/seedWa")));
  await assertFails(getDoc(doc(colab(), "waMsg/seedWa")));
  await assertFails(getDoc(doc(rh(), "waMsg/seedWa")));
  await assertFails(getDoc(doc(admin(), "waMsg/seedWa")));
});
test("NINGUEM atualiza waMsg (nem admin)", async () => {
  await assertFails(updateDoc(doc(anon(), "waMsg/seedWa"), { para: "47900000000" }));
  await assertFails(updateDoc(doc(rh(), "waMsg/seedWa"), { para: "47900000000" }));
  await assertFails(updateDoc(doc(admin(), "waMsg/seedWa"), { para: "47900000000" }));
});
// delete: a GP/admin expurgam o irmao junto da candidatura (LGPD, William 23/07);
// colab/anon seguem negados (update continua negado pra todos, regressao acima).
test("GP deleta waMsg PASSA (expurgo LGPD, paridade com a candidatura)", async () =>
  assertSucceeds(deleteDoc(doc(rh(), "waMsg/delGp"))));
test("ADMIN deleta waMsg PASSA", async () =>
  assertSucceeds(deleteDoc(doc(admin(), "waMsg/delAdmin"))));
test("COLABORADOR NAO deleta waMsg", async () =>
  assertFails(deleteDoc(doc(colab(), "waMsg/seedWa"))));
test("ANONIMO NAO deleta waMsg", async () =>
  assertFails(deleteDoc(doc(anon(), "waMsg/seedWa"))));
