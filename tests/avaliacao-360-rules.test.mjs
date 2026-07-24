// Rules da AVALIACAO 360 (2026-07-24). Estende o ciclo de desempenho com o
// MOLDE DO ANONIMATO ESTRUTURAL do clima (pareceres orfaos), SEM Cloud Functions:
//   - avaliacaoCiclos/{cid}/designacoes/{avaliadoFid}: a GP (cap desempenho.gerenciar)
//     grava QUEM avalia QUEM. avaliadores = LISTA DE UIDS + grupos = map uid->grupo.
//     Read ESCOPADO: GP le tudo; avaliador le SO onde aparece (where array-contains).
//   - avaliacaoCiclos/{cid}/pareceres/{parecerId}: PARECER ORFAO (sem uid, sem tempo),
//     hasOnly(avaliadoFid,grupo,notas,comentario); notas int 1..5 via values().hasOnly.
//     create exige designacao + marcador do proprio uid; read SO GP e o avaliado com
//     ciclo ENCERRADO; update false; delete SO GP (expurgo LGPD, gate Fable).
//   - avaliacaoCiclos/{cid}/pareceresFeitos/{uid}_{avaliadoFid}: marcador create-only
//     do avaliador designado (prova elegibilidade + dedup); read o proprio + GP.
//
//   firebase emulators:exec --only firestore,storage "node --test tests/avaliacao-360-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where } from "firebase/firestore";

let env;
const TS = serverTimestamp;
const COMP = [{ id: "c1", nome: "Colaboracao", peso: 1 }, { id: "c2", nome: "Comunicacao", peso: 1 }];
const ciclo360 = (o = {}) => ({
  nome: "Ciclo 360 2026", modalidade: "360", escalaMax: 5, competencias: COMP,
  publico: { tipo: "todos", valores: [] }, status: "ativo",
  periodoInicio: new Date("2026-07-01"), periodoFim: new Date("2099-12-31"),
  criadoPor: "uRh", criadoEm: new Date("2026-07-01"), ...o,
});
const desig = (fid, avaliadores, grupos) => ({ avaliadoFid: fid, avaliadores, grupos });
const parecer = (fid, grupo, notas, extra = {}) => ({ avaliadoFid: fid, grupo, notas, ...extra });
const marca = (fid) => ({ avaliadoFid: fid });
// autoavaliacao (subcolecao avaliacoes existente) para provar que 360 destrava o ramo 'auto'
const av = (papel, avaliadorUid, alvoFid, o = {}) => ({
  alvoFid, avaliadorUid, papel, notas: { c1: 4, c2: 5 }, status: "rascunho", atualizadoEm: TS(), ...o,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-360-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: "Suyanne" });          // gpDesemp (fallback isRH)
    await setDoc(doc(db, "users/uLider1"), { role: "lider", nome: "Leo", turno: 1 }); // NAO gpDesemp; designado grupo 'lider'
    await setDoc(doc(db, "users/uColabA"), { role: "colaborador", nome: "Ana", funcionarioId: "f-a", turno: 1, setor: "Producao" });
    await setDoc(doc(db, "users/uColabB"), { role: "colaborador", nome: "Bia", funcionarioId: "f-b", turno: 1, setor: "Producao" }); // O AVALIADO
    await setDoc(doc(db, "users/uColabC"), { role: "colaborador", nome: "Cid", funcionarioId: "f-c", turno: 1, setor: "Producao" });
    await setDoc(doc(db, "users/uColabX"), { role: "colaborador", nome: "Xis", funcionarioId: "f-xx", turno: 2, setor: "Repasse" }); // NAO designado

    // Ciclos 360.
    await setDoc(doc(db, "avaliacaoCiclos/c360Ativo"), ciclo360());                                // ativo, janela aberta
    await setDoc(doc(db, "avaliacaoCiclos/c360Enc"),   ciclo360({ status: "encerrado" }));         // encerrado (reads do avaliado)
    await setDoc(doc(db, "avaliacaoCiclos/c360Venc"),  ciclo360({ periodoFim: new Date("2020-01-31") })); // ativo, janela passada

    // Designacoes sob c360Ativo.
    await setDoc(doc(db, "avaliacaoCiclos/c360Ativo/designacoes/f-b"),
      desig("f-b", ["uColabA", "uColabC", "uLider1"], { uColabA: "par", uColabC: "par", uLider1: "lider" }));
    await setDoc(doc(db, "avaliacaoCiclos/c360Ativo/designacoes/f-c"),
      desig("f-c", ["uColabA"], { uColabA: "par" }));   // M1: marcador novo de uColabA
    await setDoc(doc(db, "avaliacaoCiclos/c360Ativo/designacoes/f-d"),
      desig("f-d", ["uColabA"], { uColabA: "par" }));   // M5: hasOnly no marcador
    await setDoc(doc(db, "avaliacaoCiclos/c360Ativo/designacoes/f-x"),
      desig("f-x", ["uColabC"], { uColabC: "par" }));   // D7 uColabA fora; P7 uColabC sem marcador

    // Designacoes espelhadas sob os outros ciclos (pros NEGA de janela/encerrado).
    await setDoc(doc(db, "avaliacaoCiclos/c360Enc/designacoes/f-b"),
      desig("f-b", ["uColabA", "uColabC", "uLider1"], { uColabA: "par", uColabC: "par", uLider1: "lider" }));
    await setDoc(doc(db, "avaliacaoCiclos/c360Venc/designacoes/f-b"),
      desig("f-b", ["uColabA"], { uColabA: "par" }));

    // Marcadores seed.
    await setDoc(doc(db, "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-b"), marca("f-b")); // M4/M7/M8/M9 + parecer de uColabA
    await setDoc(doc(db, "avaliacaoCiclos/c360Venc/pareceresFeitos/uColabA_f-b"),  marca("f-b")); // P9 (falha so na janela)

    // Pareceres seed (reads/imutabilidade).
    await setDoc(doc(db, "avaliacaoCiclos/c360Enc/pareceres/pEncB1"),   parecer("f-b", "par", { c1: 4, c2: 5 }, { comentario: "bom" }));
    await setDoc(doc(db, "avaliacaoCiclos/c360Enc/pareceres/pEncC1"),   parecer("f-c", "par", { c1: 3 }));
    await setDoc(doc(db, "avaliacaoCiclos/c360Ativo/pareceres/pAtB1"),  parecer("f-b", "par", { c1: 4 }));
  });
});
after(async () => { await env.cleanup(); });

const ctxFor = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

// =================== ENABLEMENT (modalidade 360 + autoavaliacao no 360) ===================
test("E1: RH cria ciclo modalidade '360' (rascunho valido)", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Novo"),
    ciclo360({ status: "rascunho", criadoEm: TS(), criadoPor: "uRh" }))));
test("E2: autoavaliacao PASSA em ciclo 360 (ramo 'auto' liberado p/ 360)", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uColabB"), "avaliacaoCiclos/c360Ativo/avaliacoes/auto_f-b"),
    av("auto", "uColabB", "f-b"))));

// =================== DESIGNACOES ===================
test("D1: GP cria designacao valida", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Ativo/designacoes/f-new"),
    desig("f-new", ["uColabA", "uColabC"], { uColabA: "par", uColabC: "equipe" }))));
test("D2: avaliador (colaborador) NAO cria designacao", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/designacoes/f-n2"),
    desig("f-n2", ["uColabA"], { uColabA: "par" }))));
test("D3: lider (sem cap) NAO cria designacao", async () =>
  assertFails(setDoc(doc(ctxFor("uLider1"), "avaliacaoCiclos/c360Ativo/designacoes/f-n3"),
    desig("f-n3", ["uColabA"], { uColabA: "par" }))));
test("D4: designacao com grupo fora do enum NEGA", async () =>
  assertFails(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Ativo/designacoes/f-n4"),
    desig("f-n4", ["uColabA"], { uColabA: "chefe" }))));
test("D5: designacao com avaliadores nao-list NEGA", async () =>
  assertFails(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Ativo/designacoes/f-n5"),
    { avaliadoFid: "f-n5", avaliadores: "uColabA", grupos: { uColabA: "par" } })));
test("D5b: designacao com avaliadoFid != id NEGA", async () =>
  assertFails(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Ativo/designacoes/f-n6"),
    desig("OUTRO", ["uColabA"], { uColabA: "par" }))));
test("D6: avaliador le a PROPRIA designacao (uid in avaliadores)", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/designacoes/f-b"))));
test("D7: avaliador NAO le designacao alheia (uid fora de avaliadores)", async () =>
  assertFails(getDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/designacoes/f-x"))));
test("D8: GP lista TODAS as designacoes", async () =>
  assertSucceeds(getDocs(collection(ctxFor("uRh"), "avaliacaoCiclos/c360Ativo/designacoes"))));
test("D9: avaliador lista as PROPRIAS (where array-contains uid)", async () =>
  assertSucceeds(getDocs(query(collection(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/designacoes"),
    where("avaliadores", "array-contains", "uColabA")))));
test("D10: avaliador NAO lista a colecao inteira de designacoes", async () =>
  assertFails(getDocs(collection(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/designacoes"))));
test("D11: anonimo NAO le designacao", async () =>
  assertFails(getDoc(doc(anon(), "avaliacaoCiclos/c360Ativo/designacoes/f-b"))));
test("D12: GP atualiza designacao (adiciona avaliador)", async () =>
  assertSucceeds(updateDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Ativo/designacoes/f-c"),
    { avaliadores: ["uColabA", "uColabC"], grupos: { uColabA: "par", uColabC: "par" } })));

// =================== MARCADOR (pareceresFeitos) ===================
test("M1: avaliador designado cria o PROPRIO marcador", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-c"),
    marca("f-c"))));
test("Mlider: lider designado (grupo lider) cria o proprio marcador", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uLider1"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uLider1_f-b"),
    marca("f-b"))));
test("M2: marcador com id de OUTRO uid NEGA (id nao casa auth)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabC_f-b"),
    marca("f-b"))));
test("M3: marcador de NAO-designado NEGA (uid fora de avaliadores)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabX"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabX_f-b"),
    marca("f-b"))));
test("M4: marcador DUPLICADO NEGA (create-only)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-b"),
    marca("f-b"))));
test("M5: marcador com campo extra NEGA (hasOnly)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-d"),
    { avaliadoFid: "f-d", extra: 1 })));
test("M6: marcador em ciclo ENCERRADO NEGA", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Enc/pareceresFeitos/uColabA_f-b"),
    marca("f-b"))));
test("M7: GP le marcador", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-b"))));
test("M8: o PROPRIO le o proprio marcador", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-b"))));
test("M9: terceiro NAO le marcador alheio", async () =>
  assertFails(getDoc(doc(ctxFor("uColabB"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-b"))));
test("M10: update de marcador NEGA (create-only)", async () =>
  assertFails(updateDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-b"),
    { avaliadoFid: "f-z" })));
test("M11: delete de marcador NEGA (nem o proprio)", async () =>
  assertFails(deleteDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-b"))));

// =================== PARECER ORFAO · create ===================
test("P1: parecer orfao valido (shape exato + designacao + marcador)", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceres/pP1"),
    parecer("f-b", "par", { c1: 4, c2: 5 }, { comentario: "exemplo concreto" }))));
test("Plider: parecer do lider (grupo lider) valido", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uLider1"), "avaliacaoCiclos/c360Ativo/pareceres/pLider"),
    parecer("f-b", "lider", { c1: 5, c2: 4 }))));
test("P2: parecer com 'uid' no payload NEGA (hasOnly, mata a identidade)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceres/pP2"),
    parecer("f-b", "par", { c1: 4 }, { uid: "uColabA" }))));
test("P3: parecer com campo extra NEGA (hasOnly)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceres/pP3"),
    parecer("f-b", "par", { c1: 4 }, { foo: 1 }))));
test("P3b: parecer com timestamp de cliente NEGA (hasOnly, sem tempo atribuivel)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceres/pP3b"),
    parecer("f-b", "par", { c1: 4 }, { em: TS() }))));
test("P4: parecer com nota FORA de 1..5 NEGA (values().hasOnly)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceres/pP4"),
    parecer("f-b", "par", { c1: 6 }))));
test("P5: parecer com nota tipo errado (string) NEGA", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceres/pP5"),
    parecer("f-b", "par", { c1: "4" }))));
test("P6: parecer SEM designacao do avaliadoFid NEGA", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceres/pP6"),
    parecer("f-semdesig", "par", { c1: 4 }))));
test("P7: parecer de designado SEM marcador NEGA (uColabC sem marcador de f-x)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabC"), "avaliacaoCiclos/c360Ativo/pareceres/pP7"),
    parecer("f-x", "par", { c1: 4 }))));
test("P7b: parecer de NAO-designado NEGA (uColabX sem marcador de f-b)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabX"), "avaliacaoCiclos/c360Ativo/pareceres/pP7b"),
    parecer("f-b", "par", { c1: 4 }))));
test("P8: parecer em ciclo ENCERRADO NEGA", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Enc/pareceres/pP8"),
    parecer("f-b", "par", { c1: 4 }))));
test("P9: parecer com janela passada NEGA (ativo mas periodoFim vencido)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Venc/pareceres/pP9"),
    parecer("f-b", "par", { c1: 4 }))));
test("P10: parecer com grupo fora do enum NEGA", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceres/pP10"),
    parecer("f-b", "chefe", { c1: 4 }))));
test("P11: parecer com notas vazias NEGA (size 0)", async () =>
  assertFails(setDoc(doc(ctxFor("uColabA"), "avaliacaoCiclos/c360Ativo/pareceres/pP11"),
    parecer("f-b", "par", {}))));
test("P12: update de parecer NEGA (imutavel)", async () =>
  assertFails(updateDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Enc/pareceres/pEncB1"),
    { comentario: "editado" })));
test("P13: delete de parecer pelo AVALIADO NEGA (delete e so da GP)", async () =>
  assertFails(deleteDoc(doc(ctxFor("uColabB"), "avaliacaoCiclos/c360Enc/pareceres/pEncB1"))));

// =================== PARECER ORFAO · read ===================
test("R1: avaliado le parecer do PROPRIO fid com ciclo ENCERRADO", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uColabB"), "avaliacaoCiclos/c360Enc/pareceres/pEncB1"))));
test("R2: avaliado NAO le parecer do proprio fid com ciclo ATIVO (piso: so no fechamento)", async () =>
  assertFails(getDoc(doc(ctxFor("uColabB"), "avaliacaoCiclos/c360Ativo/pareceres/pAtB1"))));
test("R3: avaliado NAO le parecer de OUTRO fid (encerrado)", async () =>
  assertFails(getDoc(doc(ctxFor("uColabB"), "avaliacaoCiclos/c360Enc/pareceres/pEncC1"))));
test("R4: GP le parecer AO VIVO (agregacao durante o ciclo)", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Ativo/pareceres/pAtB1"))));
test("R5: terceiro colaborador NAO le parecer alheio", async () =>
  assertFails(getDoc(doc(ctxFor("uColabC"), "avaliacaoCiclos/c360Ativo/pareceres/pAtB1"))));
test("R6: anonimo NAO le parecer", async () =>
  assertFails(getDoc(doc(anon(), "avaliacaoCiclos/c360Ativo/pareceres/pAtB1"))));
test("R7: avaliado lista pareceres do proprio fid em ciclo ENCERRADO", async () =>
  assertSucceeds(getDocs(query(collection(ctxFor("uColabB"), "avaliacaoCiclos/c360Enc/pareceres"),
    where("avaliadoFid", "==", "f-b")))));
test("R8: avaliado NAO lista pareceres do proprio fid em ciclo ATIVO", async () =>
  assertFails(getDocs(query(collection(ctxFor("uColabB"), "avaliacaoCiclos/c360Ativo/pareceres"),
    where("avaliadoFid", "==", "f-b")))));

// =================== EXPURGO LGPD (gate Fable 24/07) ===================
// Nota e comentario livre sao dado pessoal do avaliado: a GP precisa de um caminho
// de eliminacao (paridade waMsg/candidaturas). Ficam por ULTIMO: os deletes abaixo
// consomem docs que os testes anteriores ja usaram.
test("X1: anonimo NAO deleta parecer", async () =>
  assertFails(deleteDoc(doc(anon(), "avaliacaoCiclos/c360Ativo/pareceres/pAtB1"))));
test("X2: GP deleta parecer PASSA (expurgo)", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Enc/pareceres/pEncB1"))));
test("X3: GP deleta marcador PASSA (expurgo)", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/c360Ativo/pareceresFeitos/uColabA_f-b"))));
