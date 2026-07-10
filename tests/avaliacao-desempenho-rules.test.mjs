// Rules da AVALIACAO DE DESEMPENHO (feature 2 das Avaliacoes). v1 = modalidades
// 'gestor' e 'auto' (o 360 de pares fica pra quando houver Cloud Functions).
//   - avaliacaoCiclos/{id}: RH/admin cria/gera (cap desempenho.gerenciar, fallback isRH);
//     nasce rascunho; ativa com ativadoEm/Por; ativo congela config (so estende periodoFim
//     ou encerra one-way); colaborador le SO ciclo ativo em que participa (casaSegmento).
//   - avaliacoes/{papel_avaliadorUid_alvoUid}: id deterministico; papel 'auto' so o proprio
//     na modalidade 'auto' (participando do publico); papel 'gestor' so gestor com o alvo
//     NO ESCOPO (lider por turno, supervisor por lista/turnos via users denormalizado) E no
//     publico; escrita so com ciclo ativo; 'concluida' imutavel; delete so gp (correcao).
//
//   firebase emulators:exec --only firestore "node --test tests/avaliacao-desempenho-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

let env;
const TS = serverTimestamp;
const COMP = [{ id: "c1", nome: "Qualidade", peso: 2 }, { id: "c2", nome: "Trabalho em equipe", peso: 1 }];
const ciclo = (o = {}) => ({
  nome: "Ciclo 2026 S2", modalidade: "auto", escalaMax: 5, competencias: COMP,
  publico: { tipo: "todos", valores: [] }, status: "ativo",
  periodoInicio: new Date("2026-07-01"), periodoFim: new Date("2026-12-31"),
  criadoPor: "uRh", criadoEm: new Date("2026-07-01"), ...o,
});
const av = (papel, avaliador, alvo, o = {}) => ({
  alvoUid: alvo, avaliadorUid: avaliador, papel,
  notas: { c1: 4, c2: 5 }, status: "rascunho", atualizadoEm: TS(), ...o,
});
const avId = (papel, avaliador, alvo) => `${papel}_${avaliador}_${alvo}`;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-desempenho-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uLider1"), { role: "lider", nome: "Leo", turno: 1 });
    await setDoc(doc(db, "users/uSup"),    { role: "supervisor", nome: "Sara", funcionariosVisiveis: ["f-9"], turnosVisiveis: [] });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", nome: "Maria", funcionarioId: "f-1", turno: 1, setor: "Producao" });
    await setDoc(doc(db, "users/uColab2"), { role: "colaborador", nome: "Ana", funcionarioId: "f-2", turno: 2, setor: "Repasse" });
    await setDoc(doc(db, "users/uColab3"), { role: "colaborador", nome: "Bia", funcionarioId: "f-9", turno: 3, setor: "Expedicao" });

    // Ciclos por cenario.
    await setDoc(doc(db, "avaliacaoCiclos/cAtivoAuto"),   ciclo());                              // ativo, auto, todos
    await setDoc(doc(db, "avaliacaoCiclos/cAtivoGestor"), ciclo({ modalidade: "gestor" }));      // auto deve negar
    await setDoc(doc(db, "avaliacaoCiclos/cAtivoTurno1"), ciclo({ publico: { tipo: "turno", valores: [1] } }));
    await setDoc(doc(db, "avaliacaoCiclos/cAtivoEd"),     ciclo());                              // editar rascunho -> concluir
    await setDoc(doc(db, "avaliacaoCiclos/cAtivoImut"),   ciclo());                              // concluida imutavel
    await setDoc(doc(db, "avaliacaoCiclos/cAtivoLe"),     ciclo());                              // reads
    await setDoc(doc(db, "avaliacaoCiclos/cAtivoFim"),    ciclo());                              // estender/encerrar/congelar
    await setDoc(doc(db, "avaliacaoCiclos/cAtivoEnc"),    ciclo());                              // encerrar one-way
    await setDoc(doc(db, "avaliacaoCiclos/cAtivoDel"),    ciclo());                              // delete ativo nega
    await setDoc(doc(db, "avaliacaoCiclos/cRasc"),        ciclo({ status: "rascunho" }));        // editar
    await setDoc(doc(db, "avaliacaoCiclos/cRascAtivar"),  ciclo({ status: "rascunho" }));        // ativar
    await setDoc(doc(db, "avaliacaoCiclos/cRascDel"),     ciclo({ status: "rascunho" }));        // delete ok
    await setDoc(doc(db, "avaliacaoCiclos/cEnc"),         ciclo({ status: "encerrado" }));       // imutavel + escrita nega
    await setDoc(doc(db, "avaliacaoCiclos/cVencido"),     ciclo({ periodoFim: new Date("2026-01-31") })); // ativo, janela passada

    // Avaliacoes seed (rules off) pros reads/imutabilidade/delete.
    await setDoc(doc(db, `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("gestor", "uLider1", "uColab")}`),
      { alvoUid: "uColab", avaliadorUid: "uLider1", papel: "gestor", notas: { c1: 4 }, status: "concluida", atualizadoEm: new Date() });
    await setDoc(doc(db, `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("gestor", "uLider1", "uColab2")}`),
      { alvoUid: "uColab2", avaliadorUid: "uLider1", papel: "gestor", notas: { c1: 3 }, status: "rascunho", atualizadoEm: new Date() });
    await setDoc(doc(db, `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("auto", "uColab2", "uColab2")}`),
      { alvoUid: "uColab2", avaliadorUid: "uColab2", papel: "auto", notas: { c1: 5 }, status: "concluida", atualizadoEm: new Date() });
    await setDoc(doc(db, `avaliacaoCiclos/cAtivoImut/avaliacoes/${avId("auto", "uColab", "uColab")}`),
      { alvoUid: "uColab", avaliadorUid: "uColab", papel: "auto", notas: { c1: 5 }, status: "concluida", atualizadoEm: new Date() });
    await setDoc(doc(db, `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("gestor", "uRh", "uColab3")}`),
      { alvoUid: "uColab3", avaliadorUid: "uRh", papel: "gestor", notas: { c1: 4 }, status: "concluida", atualizadoEm: new Date() });
    await setDoc(doc(db, `avaliacaoCiclos/cEnc/avaliacoes/${avId("auto", "uColab", "uColab")}`),
      { alvoUid: "uColab", avaliadorUid: "uColab", papel: "auto", notas: { c1: 4 }, status: "rascunho", atualizadoEm: new Date() });
    // Ciclo ENCERRADO com concluida: o alvo so ve o resultado no fechamento (decisao William).
    await setDoc(doc(db, `avaliacaoCiclos/cEnc/avaliacoes/${avId("gestor", "uLider1", "uColab")}`),
      { alvoUid: "uColab", avaliadorUid: "uLider1", papel: "gestor", notas: { c1: 4 }, status: "concluida", atualizadoEm: new Date() });
  });
});
after(async () => { await env.cleanup(); });

const ctxFor = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

// =================== ciclo · create ===================
test("CICLO: RH cria rascunho valido", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/novo1"),
    ciclo({ status: "rascunho", criadoEm: TS(), criadoPor: "uRh" }))));
test("CICLO: colaborador NAO cria", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "avaliacaoCiclos/novo2"),
    ciclo({ status: "rascunho", criadoEm: TS(), criadoPor: "uColab" }))));
test("CICLO: lider NAO cria (cap global so RH)", async () =>
  assertFails(setDoc(doc(ctxFor("uLider1"), "avaliacaoCiclos/novo3"),
    ciclo({ status: "rascunho", criadoEm: TS(), criadoPor: "uLider1" }))));
test("CICLO: nascer ja 'ativo' falha", async () =>
  assertFails(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/novo4"),
    ciclo({ status: "ativo", criadoEm: TS(), criadoPor: "uRh" }))));
test("CICLO: modalidade '360' falha (fora do v1)", async () =>
  assertFails(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/novo5"),
    ciclo({ status: "rascunho", modalidade: "360", criadoEm: TS(), criadoPor: "uRh" }))));
test("CICLO: competencias nao-list falha", async () =>
  assertFails(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/novo6"),
    ciclo({ status: "rascunho", competencias: "x", criadoEm: TS(), criadoPor: "uRh" }))));
test("CICLO: periodoFim STRING falha (landmine timestamp)", async () =>
  assertFails(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/novo7"),
    ciclo({ status: "rascunho", periodoFim: "2026-12-31", criadoEm: TS(), criadoPor: "uRh" }))));
test("CICLO: escalaMax fora da faixa falha", async () =>
  assertFails(setDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/novo8"),
    ciclo({ status: "rascunho", escalaMax: 2, criadoEm: TS(), criadoPor: "uRh" }))));

// =================== ciclo · read ===================
test("CICLO: colaborador le ativo publico 'todos'", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uColab"), "avaliacaoCiclos/cAtivoAuto"))));
test("CICLO: colaborador NAO le rascunho", async () =>
  assertFails(getDoc(doc(ctxFor("uColab"), "avaliacaoCiclos/cRasc"))));
test("CICLO: colaborador fora do publico NAO le (turno 2 x ciclo turno 1)", async () =>
  assertFails(getDoc(doc(ctxFor("uColab2"), "avaliacaoCiclos/cAtivoTurno1"))));
test("CICLO: colaborador do publico le (turno 1)", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uColab"), "avaliacaoCiclos/cAtivoTurno1"))));
test("CICLO: lider le (papel de gestao)", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uLider1"), "avaliacaoCiclos/cRasc"))));
test("CICLO: anonimo NAO le", async () =>
  assertFails(getDoc(doc(anon(), "avaliacaoCiclos/cAtivoAuto"))));

// =================== ciclo · update / delete ===================
test("CICLO: RH edita rascunho", async () =>
  assertSucceeds(updateDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/cRasc"), { nome: "Ciclo revisado" })));
test("CICLO: RH ativa rascunho (ativadoEm/Por)", async () =>
  assertSucceeds(updateDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/cRascAtivar"),
    { status: "ativo", ativadoEm: TS(), ativadoPor: "uRh" })));
test("CICLO: mudar competencias em ATIVO falha (congelado)", async () =>
  assertFails(updateDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/cAtivoFim"),
    { competencias: [{ id: "c9", nome: "Outra", peso: 1 }] })));
test("CICLO: estender periodoFim em ativo", async () =>
  assertSucceeds(updateDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/cAtivoFim"),
    { periodoFim: new Date("2027-01-31") })));
test("CICLO: encerrar ativo (one-way)", async () =>
  assertSucceeds(updateDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/cAtivoEnc"),
    { status: "encerrado", encerradoEm: TS(), encerradoPor: "uRh" })));
test("CICLO: reabrir encerrado falha", async () =>
  assertFails(updateDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/cEnc"),
    { status: "ativo", ativadoEm: TS(), ativadoPor: "uRh" })));
test("CICLO: colaborador NAO encerra", async () =>
  assertFails(updateDoc(doc(ctxFor("uColab"), "avaliacaoCiclos/cAtivoFim"),
    { status: "encerrado", encerradoEm: TS(), encerradoPor: "uColab" })));
test("CICLO: RH deleta rascunho", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/cRascDel"))));
test("CICLO: RH NAO deleta ativo (so admin)", async () =>
  assertFails(deleteDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/cAtivoDel"))));

// =================== avaliacoes · escrita ===================
test("AV: AUTO valida (dono, modalidade auto, ciclo ativo)", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoAuto/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab"))));
test("AV: AUTO na modalidade 'gestor' falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoGestor/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab"))));
test("AV: AUTO sobre OUTRO falha (alvo != auth)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoAuto/avaliacoes/${avId("auto", "uColab", "uColab2")}`),
    av("auto", "uColab", "uColab2"))));
test("AV: AUTO fora do publico falha (turno 2 x ciclo turno 1)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab2"), `avaliacaoCiclos/cAtivoTurno1/avaliacoes/${avId("auto", "uColab2", "uColab2")}`),
    av("auto", "uColab2", "uColab2"))));
test("AV: id NAO deterministico falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), "avaliacaoCiclos/cAtivoAuto/avaliacoes/qualquer-id"),
    av("auto", "uColab", "uColab"))));
test("AV: GESTOR lider avalia liderado do turno", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uLider1"), `avaliacaoCiclos/cAtivoAuto/avaliacoes/${avId("gestor", "uLider1", "uColab")}`),
    av("gestor", "uLider1", "uColab"))));
test("AV: GESTOR lider fora do turno falha (turno 1 x alvo turno 2)", async () =>
  assertFails(setDoc(doc(ctxFor("uLider1"), `avaliacaoCiclos/cAtivoAuto/avaliacoes/${avId("gestor", "uLider1", "uColab2")}`),
    av("gestor", "uLider1", "uColab2"))));
test("AV: GESTOR supervisor com alvo na lista", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uSup"), `avaliacaoCiclos/cAtivoAuto/avaliacoes/${avId("gestor", "uSup", "uColab3")}`),
    av("gestor", "uSup", "uColab3"))));
test("AV: GESTOR supervisor com alvo FORA da lista falha", async () =>
  assertFails(setDoc(doc(ctxFor("uSup"), `avaliacaoCiclos/cAtivoAuto/avaliacoes/${avId("gestor", "uSup", "uColab")}`),
    av("gestor", "uSup", "uColab"))));
test("AV: colaborador NAO assume papel gestor", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoAuto/avaliacoes/${avId("gestor", "uColab", "uColab2")}`),
    av("gestor", "uColab", "uColab2"))));
test("AV: RH avalia como gestor (cap global)", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uRh"), `avaliacaoCiclos/cAtivoAuto/avaliacoes/${avId("gestor", "uRh", "uColab2")}`),
    av("gestor", "uRh", "uColab2"))));
test("AV: escrita em ciclo ENCERRADO falha (mesmo rascunho existente)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cEnc/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab"))));
// periodoFim gateia a escrita (achado do gate Fable): ativo com janela passada nega;
// estender o periodoFim reabre.
test("AV: escrita apos periodoFim falha (ativo mas janela passada)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cVencido/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab"))));
test("AV: estender periodoFim reabre a escrita", async () => {
  await assertSucceeds(updateDoc(doc(ctxFor("uRh"), "avaliacaoCiclos/cVencido"), { periodoFim: new Date("2099-12-31") }));
  await assertSucceeds(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cVencido/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab")));
});
test("AV: avaliadorUid spoof falha (avaliador != auth)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab2"), `avaliacaoCiclos/cAtivoAuto/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab"))));
test("AV: campo extra falha (hasOnly)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoEd/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab", { extra: 1 }))));
test("AV: sem atualizadoEm==server falha", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoEd/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab", { atualizadoEm: new Date("2026-01-01") }))));
test("AV: editar o proprio rascunho (re-set valido)", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoEd/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab", { notas: { c1: 3, c2: 4 } }))));
test("AV: concluir o rascunho", async () =>
  assertSucceeds(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoEd/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab", { status: "concluida" }))));
test("AV: editar CONCLUIDA falha (imutavel)", async () =>
  assertFails(setDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoImut/avaliacoes/${avId("auto", "uColab", "uColab")}`),
    av("auto", "uColab", "uColab", { notas: { c1: 1 } }))));

// =================== avaliacoes · read / delete ===================
test("AV: alvo le a CONCLUIDA sobre si com ciclo ENCERRADO", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cEnc/avaliacoes/${avId("gestor", "uLider1", "uColab")}`))));
test("AV: alvo NAO le a concluida com ciclo ainda ATIVO (resultado so no fechamento)", async () =>
  assertFails(getDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("gestor", "uLider1", "uColab")}`))));
test("AV: alvo NAO le o RASCUNHO sobre si", async () =>
  assertFails(getDoc(doc(ctxFor("uColab2"), `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("gestor", "uLider1", "uColab2")}`))));
test("AV: terceiro NAO le avaliacao alheia", async () =>
  assertFails(getDoc(doc(ctxFor("uColab"), `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("auto", "uColab2", "uColab2")}`))));
test("AV: avaliador le o proprio rascunho", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uLider1"), `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("gestor", "uLider1", "uColab2")}`))));
test("AV: lider le concluida do escopo (auto do liderado? turno 2 = fora) NEGA", async () =>
  assertFails(getDoc(doc(ctxFor("uLider1"), `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("auto", "uColab2", "uColab2")}`))));
test("AV: supervisor le concluida do alvo da lista", async () =>
  assertSucceeds(getDoc(doc(ctxFor("uSup"), `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("gestor", "uRh", "uColab3")}`))));
test("AV: colaborador NAO deleta", async () =>
  assertFails(deleteDoc(doc(ctxFor("uColab2"), `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("auto", "uColab2", "uColab2")}`))));
test("AV: RH deleta (correcao administrativa)", async () =>
  assertSucceeds(deleteDoc(doc(ctxFor("uRh"), `avaliacaoCiclos/cAtivoLe/avaliacoes/${avId("gestor", "uLider1", "uColab2")}`))));
