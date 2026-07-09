// Rules da PESQUISA DE CLIMA (anonimato configuravel por pesquisa). Desenho + gate: Fable.
// Anonimato ESTRUTURAL: resposta anonima e doc orfao (sem uid, sem tempo); gestor nunca le
// recibos e so le as cruas encerrada + k>=5. Batch obrigatorio recibo+resposta+contador.
//
//   firebase emulators:exec --only firestore "node --test tests/pesquisas-clima-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";

let env;
const TS = serverTimestamp;
const DIM = [{ id: "d1", nome: "Lideranca", perguntas: [{ id: "p1", texto: "Meu lider da retorno." }] }];
const cfg = (o = {}) => ({
  titulo: "Clima trimestral", anonima: true, status: "aberta", dimensoes: DIM,
  incluiEnps: true, incluiAberta: true, publico: { tipo: "todos", valores: [] },
  elegiveis: 10, criadoPor: "uRh", criadoEm: new Date("2026-07-01"), ...o,
});
const RESP_ANON = { notas: { p1: 5 }, enps: 9, comentario: "bom lugar" };
const RESP_IDENT = (uid) => ({ uid, notas: { p1: 4 }, enps: 8, comentario: "ok" });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-clima-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", nome: "Maria", turno: 1, setor: "Producao" });
    await setDoc(doc(db, "users/uColab2"), { role: "colaborador", nome: "Ana", turno: 2, setor: "Repasse" });

    // Pesquisas abertas anonimas (todos) c/ contador, 1 por teste de resposta.
    for (const id of ["pAnonA", "pAnonB", "pAnonC", "pAnonUid", "pAnonDedup", "pAnonLeAntes"]) {
      await setDoc(doc(db, "pesquisasClima/" + id), cfg({ anonima: true, status: "aberta" }));
      await setDoc(doc(db, "pesquisasClima/" + id + "/meta/contador"), { n: 0 });
    }
    await setDoc(doc(db, "pesquisasClima/pAnonDedup/recibos/uColab2"), { em: new Date() }); // ja respondeu
    await setDoc(doc(db, "pesquisasClima/pAnonLeAntes/respostas/rX"), { notas: { p1: 5 } });

    // Abertas identificadas.
    for (const id of ["pIdentA", "pIdentB", "pIdentLe"]) {
      await setDoc(doc(db, "pesquisasClima/" + id), cfg({ anonima: false, status: "aberta" }));
      await setDoc(doc(db, "pesquisasClima/" + id + "/meta/contador"), { n: 0 });
    }
    await setDoc(doc(db, "pesquisasClima/pIdentLe/respostas/uColab"), { uid: "uColab", notas: { p1: 4 } });

    // Rascunhos.
    await setDoc(doc(db, "pesquisasClima/pRascAbrir"),   cfg({ anonima: true, status: "rascunho" }));
    await setDoc(doc(db, "pesquisasClima/pRascAbrirSC"), cfg({ anonima: true, status: "rascunho" }));
    await setDoc(doc(db, "pesquisasClima/pRascDel"),     cfg({ anonima: true, status: "rascunho" }));

    // Abertas p/ update (fim, encerrar, congelar campos).
    for (const id of ["pAbFim", "pAbEnc", "pAbAnon", "pAbDim", "pAbDel"]) {
      await setDoc(doc(db, "pesquisasClima/" + id), cfg({ anonima: true, status: "aberta", fim: new Date("2026-12-31") }));
    }

    // Encerradas anonimas com k.
    await setDoc(doc(db, "pesquisasClima/pEncK5"), cfg({ anonima: true, status: "encerrada" }));
    await setDoc(doc(db, "pesquisasClima/pEncK5/meta/contador"), { n: 5 });
    await setDoc(doc(db, "pesquisasClima/pEncK5/respostas/r1"), { notas: { p1: 5 }, enps: 9 });
    await setDoc(doc(db, "pesquisasClima/pEncK4"), cfg({ anonima: true, status: "encerrada" }));
    await setDoc(doc(db, "pesquisasClima/pEncK4/meta/contador"), { n: 4 });
    await setDoc(doc(db, "pesquisasClima/pEncK4/respostas/r1"), { notas: { p1: 5 } });
    await setDoc(doc(db, "pesquisasClima/pEncReabrir"), cfg({ anonima: true, status: "encerrada" }));

    // Segmentada por turno 1 (uColab casa, uColab2 nao).
    await setDoc(doc(db, "pesquisasClima/pTurno"), cfg({ anonima: true, status: "aberta", publico: { tipo: "turno", valores: [1] } }));
    await setDoc(doc(db, "pesquisasClima/pTurno/meta/contador"), { n: 0 });

    // Contador solto p/ testes diretos.
    await setDoc(doc(db, "pesquisasClima/pCont"), cfg({ anonima: true, status: "aberta" }));
    await setDoc(doc(db, "pesquisasClima/pCont/meta/contador"), { n: 3 });
    // Pesquisas SEM contador (p/ testar o create direto do contador, id fixo 'contador').
    await setDoc(doc(db, "pesquisasClima/pContNovo"),  cfg({ anonima: true, status: "aberta" }));
    await setDoc(doc(db, "pesquisasClima/pContNovo5"), cfg({ anonima: true, status: "aberta" }));

    // Ressalvas do gate Fable: integridade do campo 'anonima' + arestas de status/publico.
    await setDoc(doc(db, "pesquisasClima/pAnonBad"), cfg({ anonima: "sim", status: "aberta" })); // lixo no gate
    await setDoc(doc(db, "pesquisasClima/pAnonBad/meta/contador"), { n: 0 });
    await setDoc(doc(db, "pesquisasClima/pRascBad"),  cfg({ anonima: true, status: "rascunho" }));
    await setDoc(doc(db, "pesquisasClima/pAnonA2"),   cfg({ anonima: true, status: "aberta" }));
    await setDoc(doc(db, "pesquisasClima/pAnonA2/meta/contador"), { n: 0 });
    await setDoc(doc(db, "pesquisasClima/pRascResp"), cfg({ anonima: true, status: "rascunho" }));
    await setDoc(doc(db, "pesquisasClima/pRascResp/meta/contador"), { n: 0 });
    await setDoc(doc(db, "pesquisasClima/pEncResp"),  cfg({ anonima: true, status: "encerrada" }));
    await setDoc(doc(db, "pesquisasClima/pEncResp/meta/contador"), { n: 0 });
  });
});
after(async () => { await env.cleanup(); });

const admin  = () => env.authenticatedContext("uAdmin").firestore();
const rh     = () => env.authenticatedContext("uRh").firestore();
const colab  = () => env.authenticatedContext("uColab").firestore();
const colab2 = () => env.authenticatedContext("uColab2").firestore();

// batch obrigatorio: recibo(uid) + resposta(rid) + contador+1 (de n=0 pra 1)
function responder(db, uid, pid, rid, respData, contadorDe = 0) {
  const b = writeBatch(db);
  b.set(doc(db, `pesquisasClima/${pid}/recibos/${uid}`), { em: TS() });
  b.set(doc(db, `pesquisasClima/${pid}/respostas/${rid}`), respData);
  b.update(doc(db, `pesquisasClima/${pid}/meta/contador`), { n: contadorDe + 1 });
  return b.commit();
}

// ---------- Config: read ----------
test("Gestor(RH) le pesquisa", async () => assertSucceeds(getDoc(doc(rh(), "pesquisasClima/pAnonA"))));
test("Colab elegivel le aberta (todos)", async () => assertSucceeds(getDoc(doc(colab(), "pesquisasClima/pAnonA"))));
test("Colab de OUTRO turno NAO le pesquisa por turno", async () => assertFails(getDoc(doc(colab2(), "pesquisasClima/pTurno"))));
test("Colab NAO le rascunho", async () => assertFails(getDoc(doc(colab(), "pesquisasClima/pRascDel"))));

// ---------- Config: create ----------
test("RH cria pesquisa (rascunho valido)", async () => assertSucceeds(setDoc(doc(rh(), "pesquisasClima/novaOk"), cfg({ status: "rascunho", criadoPor: "uRh", criadoEm: TS() }))));
test("RH NAO cria ja 'aberta' (nasce rascunho)", async () => assertFails(setDoc(doc(rh(), "pesquisasClima/novaAb"), cfg({ status: "aberta", criadoPor: "uRh", criadoEm: TS() }))));
test("Colab NAO cria pesquisa", async () => assertFails(setDoc(doc(colab(), "pesquisasClima/novaC"), cfg({ status: "rascunho", criadoPor: "uColab", criadoEm: TS() }))));

// ---------- Config: abrir / update ----------
test("Abrir: rascunho -> aberta criando contador no MESMO batch", async () => {
  const db = rh();
  const b = writeBatch(db);
  b.update(doc(db, "pesquisasClima/pRascAbrir"), { status: "aberta", abertaEm: TS(), abertaPor: "uRh" });
  b.set(doc(db, "pesquisasClima/pRascAbrir/meta/contador"), { n: 0 });
  await assertSucceeds(b.commit());
});
test("Abrir SEM criar contador no batch NEGA", async () =>
  assertFails(updateDoc(doc(rh(), "pesquisasClima/pRascAbrirSC"), { status: "aberta", abertaEm: TS(), abertaPor: "uRh" })));
test("Aberta: mudar 'anonima' NEGA (congelado)", async () =>
  assertFails(updateDoc(doc(rh(), "pesquisasClima/pAbAnon"), { anonima: false })));
test("Aberta: mudar 'dimensoes' NEGA (congelado)", async () =>
  assertFails(updateDoc(doc(rh(), "pesquisasClima/pAbDim"), { dimensoes: [] })));
test("Aberta: estender a janela (fim) OK", async () =>
  assertSucceeds(updateDoc(doc(rh(), "pesquisasClima/pAbFim"), { fim: new Date("2027-01-15") })));
test("Aberta -> encerrada OK", async () =>
  assertSucceeds(updateDoc(doc(rh(), "pesquisasClima/pAbEnc"), { status: "encerrada", encerradaEm: TS(), encerradaPor: "uRh" })));
test("Encerrada -> aberta (reabrir) NEGA", async () =>
  assertFails(updateDoc(doc(rh(), "pesquisasClima/pEncReabrir"), { status: "aberta" })));

// ---------- Config: delete ----------
test("RH deleta rascunho OK", async () => assertSucceeds(deleteDoc(doc(rh(), "pesquisasClima/pRascDel"))));
test("RH NAO deleta pesquisa aberta", async () => assertFails(deleteDoc(doc(rh(), "pesquisasClima/pAbDel"))));

// ---------- Contador ----------
test("Contador: create n:0 por gestor OK", async () => assertSucceeds(setDoc(doc(rh(), "pesquisasClima/pContNovo/meta/contador"), { n: 0 })));
test("Contador: create n:5 NEGA", async () => assertFails(setDoc(doc(rh(), "pesquisasClima/pContNovo5/meta/contador"), { n: 5 })));
test("Contador: gestor update (inflar n) NEGA", async () => assertFails(updateDoc(doc(rh(), "pesquisasClima/pCont/meta/contador"), { n: 99 })));
test("Contador: +1 SEM recibo novo no batch NEGA", async () => assertFails(updateDoc(doc(colab(), "pesquisasClima/pCont/meta/contador"), { n: 4 })));

// ---------- Recibos ----------
test("Gestor NAO le recibo (correlacao)", async () => assertFails(getDoc(doc(rh(), "pesquisasClima/pAnonDedup/recibos/uColab2"))));
test("Colab le o PROPRIO recibo", async () => assertSucceeds(getDoc(doc(colab2(), "pesquisasClima/pAnonDedup/recibos/uColab2"))));
test("Colab NAO le recibo de outro", async () => assertFails(getDoc(doc(colab(), "pesquisasClima/pAnonDedup/recibos/uColab2"))));

// ---------- Resposta ANONIMA (batch) ----------
test("Resposta anonima valida (batch recibo+resposta+contador)", async () =>
  assertSucceeds(responder(colab(), "uColab", "pAnonA", "anonRid1", RESP_ANON)));
test("Resposta anonima com campo 'uid' NEGA", async () =>
  assertFails(responder(colab(), "uColab", "pAnonUid", "anonRid2", { ...RESP_ANON, uid: "uColab" })));
test("Resposta anonima com rid == auth.uid NEGA", async () =>
  assertFails(responder(colab(), "uColab", "pAnonC", "uColab", RESP_ANON)));
test("Segunda resposta (recibo ja existe) NEGA", async () =>
  assertFails(responder(colab2(), "uColab2", "pAnonDedup", "anonRid3", RESP_ANON)));
test("Gestor NAO le respostas anonimas ANTES de encerrar", async () =>
  assertFails(getDoc(doc(rh(), "pesquisasClima/pAnonLeAntes/respostas/rX"))));
test("Gestor NAO le respostas anonimas encerrada com n=4 (k)", async () =>
  assertFails(getDoc(doc(rh(), "pesquisasClima/pEncK4/respostas/r1"))));
test("Gestor LE respostas anonimas encerrada com n=5 (k)", async () =>
  assertSucceeds(getDoc(doc(rh(), "pesquisasClima/pEncK5/respostas/r1"))));
test("Colab NAO le resposta anonima", async () =>
  assertFails(getDoc(doc(colab(), "pesquisasClima/pEncK5/respostas/r1"))));

// ---------- Resposta IDENTIFICADA (batch) ----------
test("Resposta identificada valida (rid=uid, uid=auth)", async () =>
  assertSucceeds(responder(colab(), "uColab", "pIdentA", "uColab", { ...RESP_IDENT("uColab"), respondidoEm: TS() })));
test("Resposta identificada com rid != uid NEGA", async () =>
  assertFails(responder(colab(), "uColab", "pIdentB", "outroId", { ...RESP_IDENT("uColab"), respondidoEm: TS() })));
test("Colab le a PROPRIA resposta identificada", async () =>
  assertSucceeds(getDoc(doc(colab(), "pesquisasClima/pIdentLe/respostas/uColab"))));
test("Gestor le resposta identificada AO VIVO", async () =>
  assertSucceeds(getDoc(doc(rh(), "pesquisasClima/pIdentLe/respostas/uColab"))));
test("Colab NAO le resposta identificada de OUTRO", async () =>
  assertFails(getDoc(doc(colab2(), "pesquisasClima/pIdentLe/respostas/uColab"))));

// ---------- Ressalvas do gate Fable (integridade do 'anonima' + arestas) ----------
test("anonima NAO-bool: resposta anonima NEGA (garbage nega, nao classifica)", async () =>
  assertFails(responder(colab(), "uColab", "pAnonBad", "anonRidBa", RESP_ANON)));
test("anonima NAO-bool: resposta identificada NEGA", async () =>
  assertFails(responder(colab(), "uColab", "pAnonBad", "uColab", { ...RESP_IDENT("uColab"), respondidoEm: TS() })));
test("Update de rascunho com anonima string NEGA (nao congela lixo)", async () =>
  assertFails(updateDoc(doc(rh(), "pesquisasClima/pRascBad"), { anonima: "sim" })));
test("Recibo de colab FORA do publico (turno) NEGA", async () =>
  assertFails(setDoc(doc(colab2(), "pesquisasClima/pTurno/recibos/uColab2"), { em: TS() })));
test("Resposta anonima com respondidoEm (tempo) NEGA", async () =>
  assertFails(responder(colab(), "uColab", "pAnonA2", "anonRidT", { ...RESP_ANON, respondidoEm: TS() })));
test("Resposta em pesquisa RASCUNHO NEGA", async () =>
  assertFails(responder(colab(), "uColab", "pRascResp", "anonRidR", RESP_ANON)));
test("Resposta em pesquisa ENCERRADA NEGA", async () =>
  assertFails(responder(colab(), "uColab", "pEncResp", "anonRidE", RESP_ANON)));
