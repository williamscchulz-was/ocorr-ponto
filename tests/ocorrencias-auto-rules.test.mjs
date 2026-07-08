// Rules da coleção ocorrencias-auto (TESTE/sandbox): leitura + conferência por admin/RH;
// conteúdo só do servidor; update restrito a status(->conferida) + historico(append).
//
//   firebase emulators:exec --only firestore "node --test tests/ocorrencias-auto-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";

let env;

const baseDoc = (over = {}) => ({
  origem: "pipeline-apuracoes",
  status: "aguardando_conferencia",
  codigo: 1059, funcionarioId: "f-1059", nome: "Jair Knoth",
  setor: "PREPARAÇÃO", turno: 3, escala: "6x1", turma: "B",
  dataIso: "2026-06-01", data: "01/06/2026",
  tipo: "Faltas Injustificadas", tipoSituacao: "Falta Injustificada", grupo: "presenca",
  saldoDiario: "-08:00", saldosWK: [], lancamentosWK: "",
  marcacoesPrevistas: "22:00 06:00", marcacoesApuradas: "", horario: "", observacaoWK: "",
  historico: [],
  ...over,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-oca-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uLider"),  { role: "lider", turno: 1, nome: "Lider T1" });
    await setDoc(doc(db, "users/uLider2"), { role: "lider", turno: 2, nome: "Lider T2" });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", funcionarioId: "f-100", nome: "Maria" });
    // supervisor: vê turno 1 (turnosVisiveis) + o avulso f-1059 (funcionariosVisiveis).
    await setDoc(doc(db, "users/uSuperv"), { role: "supervisor", nome: "Superv", turnosVisiveis: [1], funcionariosVisiveis: ["f-1059"] });
    await setDoc(doc(db, "ocorrencias-auto/oca1"), baseDoc());
    await setDoc(doc(db, "ocorrencias-auto/oca2"), baseDoc({ historico: [{ acao: "gerada", por: "pipeline", emIso: "2026-06-26T16:00:00Z" }] }));
    // fluxo novo (turno 1). rh_confere com historico vazio (mutacao -> size 1);
    // com_lider com historico size 1 (mutacao -> size 2). 1 doc por teste (sem estado compartilhado).
    const h1 = [{ acao: "validou", por: "uRh", emIso: "2026-06-30T12:00:00Z" }];
    for (const id of ["ocaRH", "ocaRHv", "ocaRHd", "ocaRHm", "ocaRHlv", "ocaRHld", "ocaRHc",
                      "ocaRHedTD", "ocaRHedT", "ocaRHedD", "ocaRHedStay", "ocaRHedIntr", "ocaRHedDisp",
                      "ocaRHedDel", "ocaRHedNum", "ocaRHedBig", "ocaRHhStr", "ocaRHhMap"]) {
      await setDoc(doc(db, "ocorrencias-auto/" + id), baseDoc({ status: "rh_confere", turno: 1 }));
    }
    // Este PRECISA ter duracaoFmt pra o teste de delete ser uma mudança real (baseDoc não tem).
    await setDoc(doc(db, "ocorrencias-auto/ocaRHedDelD"), baseDoc({ status: "rh_confere", turno: 1, duracaoFmt: "1:00" }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLD"),  baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLD2"), baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLD3"), baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLD4"), baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLDedT"), baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLDedD"), baseDoc({ status: "com_lider", turno: 1, historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaDone"), baseDoc({ status: "confirmada", turno: 1, historico: h1 }));
    // lançamento na folha (ramo novo 2026-07-08): confirmadas prontas pra lançar/desfazer
    for (const id of ["ocaLan1", "ocaLan2", "ocaLan3", "ocaLan5", "ocaLan6", "ocaLan9", "ocaLan10"]) {
      await setDoc(doc(db, "ocorrencias-auto/" + id), baseDoc({ status: "confirmada", turno: 1, historico: h1 }));
    }
    await setDoc(doc(db, "ocorrencias-auto/ocaLan4"), baseDoc({ status: "rh_confere", turno: 1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLan7"), baseDoc({ status: "confirmada", turno: 1, historico: h1, lancada: true, lancadoEm: "2026-07-08", lancadoPor: "uRh" }));
    await setDoc(doc(db, "ocorrencias-auto/ocaLan8"), baseDoc({ status: "confirmada", turno: 1, historico: h1, lancada: true, lancadoEm: "2026-07-08", lancadoPor: "uRh" }));
    // supervisor (2026-07-08): com_lider no escopo por TURNO (turno 1, func fora da lista),
    // por ID (turno 2 fora, mas func f-1059 na lista), FORA (turno 2 + func fora), e rh_confere.
    await setDoc(doc(db, "ocorrencias-auto/ocaSupTurno"), baseDoc({ status: "com_lider", turno: 1, funcionarioId: "f-8888", historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaSupId"),    baseDoc({ status: "com_lider", turno: 2, funcionarioId: "f-1059", historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaSupFora"),  baseDoc({ status: "com_lider", turno: 2, funcionarioId: "f-9999", historico: h1 }));
    await setDoc(doc(db, "ocorrencias-auto/ocaSupRh"),    baseDoc({ status: "rh_confere", turno: 1, funcionarioId: "f-8888" }));
  });
});

after(async () => { await env.cleanup(); });

const rh    = () => env.authenticatedContext("uRh").firestore();
const admin = () => env.authenticatedContext("uAdmin").firestore();
const lider = () => env.authenticatedContext("uLider").firestore();
const lider2 = () => env.authenticatedContext("uLider2").firestore();
const superv = () => env.authenticatedContext("uSuperv").firestore();
const colab = () => env.authenticatedContext("uColab").firestore();

// ---- leitura ----
test("RH lê ocorrencia-auto", async () => assertSucceeds(getDoc(doc(rh(), "ocorrencias-auto/oca1"))));
test("Admin lê ocorrencia-auto", async () => assertSucceeds(getDoc(doc(admin(), "ocorrencias-auto/oca1"))));
test("Colaborador NÃO lê ocorrencia-auto", async () => assertFails(getDoc(doc(colab(), "ocorrencias-auto/oca1"))));
test("Líder NÃO lê ocorrencia-auto (sem cap)", async () => assertFails(getDoc(doc(lider(), "ocorrencias-auto/oca1"))));

// ---- conferência (update) ----
test("RH confere: status->conferida + historico+1", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/oca1"), {
    status: "conferida",
    historico: [{ acao: "conferida", por: "uRh", porNome: "Suyanne", emIso: "2026-06-26T17:00:00Z" }],
  })));

test("Admin confere oca2 (historico cresce de 1 para 2)", async () =>
  assertSucceeds(updateDoc(doc(admin(), "ocorrencias-auto/oca2"), {
    status: "conferida",
    historico: [
      { acao: "gerada", por: "pipeline", emIso: "2026-06-26T16:00:00Z" },
      { acao: "conferida", por: "uAdmin", porNome: "Will", emIso: "2026-06-26T17:05:00Z" },
    ],
  })));

// ---- bloqueios ----
test("RH NÃO altera outro campo (hasOnly status/historico)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/oca1"), { nome: "Adulterado" })));

test("RH NÃO leva status para valor != conferida", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/oca1"), {
    status: "cancelada",
    historico: [{ acao: "x", por: "uRh", emIso: "2026-06-26T17:00:00Z" }],
  })));

test("RH NÃO confere sem registrar trilha (historico não cresce)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/oca1"), { status: "conferida" })));

test("Colaborador NÃO confere", async () =>
  assertFails(updateDoc(doc(colab(), "ocorrencias-auto/oca1"), {
    status: "conferida",
    historico: [{ acao: "conferida", por: "uColab", emIso: "2026-06-26T17:00:00Z" }],
  })));

// ---- conteúdo é só do servidor ----
test("RH NÃO cria ocorrencia-auto (só Admin SDK)", async () =>
  assertFails(setDoc(doc(rh(), "ocorrencias-auto/novo"), baseDoc())));
test("RH NÃO deleta ocorrencia-auto", async () =>
  assertFails(deleteDoc(doc(rh(), "ocorrencias-auto/oca1"))));
test("Admin NÃO deleta ocorrencia-auto (só Admin SDK)", async () =>
  assertFails(deleteDoc(doc(admin(), "ocorrencias-auto/oca1"))));

// ===== Fluxo novo RH -> Lider =====
const histN = (n) => Array.from({ length: n }, (_, i) => ({ acao: "a" + i, por: "x", emIso: `2026-06-30T1${i}:00:00Z` }));

// leitura por turno (lider)
test("Líder do MESMO turno lê (turno 1)", async () => assertSucceeds(getDoc(doc(lider(), "ocorrencias-auto/ocaRH"))));
test("Líder de OUTRO turno NÃO lê", async () => assertFails(getDoc(doc(lider2(), "ocorrencias-auto/ocaRH"))));

// RH valida / dispensa (rh_confere historico size 0 -> mutacao size 1)
test("RH valida: rh_confere -> com_lider", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHv"), { status: "com_lider", historico: histN(1) })));
test("RH dispensa: rh_confere -> dispensada", async () =>
  assertSucceeds(updateDoc(doc(admin(), "ocorrencias-auto/ocaRHd"), { status: "dispensada", historico: histN(1) })));
// Motivo da dispensa (obrigatório na UI): vai em observacao + historico, e a regra aceita
test("RH dispensa COM motivo (observacao)", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHm"), { status: "dispensada", historico: histN(1), observacao: "Falta abonada por atestado entregue depois." })));

// Lider confirma (turno dele) (com_lider historico size 1 -> mutacao size 2)
test("Líder do turno confirma: com_lider -> confirmada", async () =>
  assertSucceeds(updateDoc(doc(lider(), "ocorrencias-auto/ocaLD"), { status: "confirmada", historico: histN(2) })));
// Destinação da conferência (liturgia da manual): acao + observacao entram no update
test("Líder confirma COM ação e observação (destinação)", async () =>
  assertSucceeds(updateDoc(doc(lider(), "ocorrencias-auto/ocaLD3"), { status: "confirmada", historico: histN(2), acao: "advertencia-verbal", observacao: "Conversado com o colaborador." })));
test("Líder NÃO grava campo INTRUSO junto da conferência", async () =>
  assertFails(updateDoc(doc(lider(), "ocorrencias-auto/ocaLD4"), { status: "confirmada", historico: histN(2), acao: "abono", nome: "Hackeado" })));
test("Líder de OUTRO turno NÃO confirma", async () =>
  assertFails(updateDoc(doc(lider2(), "ocorrencias-auto/ocaLD2"), { status: "confirmada", historico: histN(2) })));

// Lider NÃO valida nem dispensa (só confirma)
test("Líder NÃO valida (rh_confere -> com_lider)", async () =>
  assertFails(updateDoc(doc(lider(), "ocorrencias-auto/ocaRHlv"), { status: "com_lider", historico: histN(1) })));
test("Líder NÃO dispensa", async () =>
  assertFails(updateDoc(doc(lider(), "ocorrencias-auto/ocaRHld"), { status: "dispensada", historico: histN(1) })));

// nunca reabre
test("Ninguém reabre confirmada -> rh_confere", async () =>
  assertFails(updateDoc(doc(admin(), "ocorrencias-auto/ocaDone"), { status: "rh_confere", historico: histN(2) })));
test("Colaborador NÃO age no fluxo novo", async () =>
  assertFails(updateDoc(doc(colab(), "ocorrencias-auto/ocaRHc"), { status: "com_lider", historico: histN(1) })));

// ===== Correção do RH (reclassificar tipo/duracao) JUNTO da transicao pra fora de rh_confere =====
// A edicao tem que sair de rh_confere no mesmo update, senao o pipeline (WK) reprocessaria e
// reverteria. Regra: o ramo RH/admin aceita tipo+duracaoFmt no hasOnly; o do lider NAO.
test("RH corrige tipo + duracao e envia ao líder (rh_confere -> com_lider)", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHedTD"), {
    status: "com_lider", historico: histN(1), tipo: "Atrasos", duracaoFmt: "0:45",
  })));
test("RH corrige só o tipo junto da transição", async () =>
  assertSucceeds(updateDoc(doc(admin(), "ocorrencias-auto/ocaRHedT"), {
    status: "com_lider", historico: histN(1), tipo: "Atrasos",
  })));
test("RH corrige só a duração junto da transição", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHedD"), {
    status: "com_lider", historico: histN(1), duracaoFmt: "1:15",
  })));
test("RH corrige o tipo e dispensa (também sai de rh_confere)", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHedDisp"), {
    status: "dispensada", historico: histN(1), tipo: "Atrasos", observacao: "Reclassificado antes de dispensar.",
  })));

// ---- bloqueios da correção ----
test("RH NÃO corrige tipo mantendo em rh_confere (edicao fica exposta ao WK)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHedStay"), {
    status: "rh_confere", historico: histN(1), tipo: "Atrasos",
  })));
test("RH NÃO grava campo intruso junto da correção", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHedIntr"), {
    status: "com_lider", historico: histN(1), tipo: "Atrasos", marcacoesApuradas: "22:33 06:30",
  })));
test("Líder NÃO reclassifica o tipo ao confirmar", async () =>
  assertFails(updateDoc(doc(lider(), "ocorrencias-auto/ocaLDedT"), {
    status: "confirmada", historico: histN(2), tipo: "Atrasos",
  })));
test("Líder NÃO altera a duração ao confirmar", async () =>
  assertFails(updateDoc(doc(lider(), "ocorrencias-auto/ocaLDedD"), {
    status: "confirmada", historico: histN(2), duracaoFmt: "0:30",
  })));

// ---- correção não pode virar perda de dado (delete) nem valor não-string (guarda Fable) ----
test("RH NÃO DELETA o tipo na correção (WK não repõe fora de rh_confere)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHedDel"), {
    status: "com_lider", historico: histN(1), tipo: deleteField(),
  })));
test("RH NÃO grava tipo não-string (numérico)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHedNum"), {
    status: "com_lider", historico: histN(1), tipo: 42,
  })));
test("RH NÃO DELETA a duração na correção", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHedDelD"), {
    status: "com_lider", historico: histN(1), duracaoFmt: deleteField(),
  })));
test("RH NÃO grava duracaoFmt absurdamente longa (> 20 chars)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHedBig"), {
    status: "com_lider", historico: histN(1), duracaoFmt: "0".repeat(30),
  })));

// ---- trilha não pode virar não-lista (guarda Fable: string/map tem size() e passaria no +1) ----
test("RH NÃO transforma historico em STRING (perda de dado da trilha)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHhStr"), {
    status: "com_lider", historico: "x",
  })));
test("RH NÃO transforma historico em MAP (perda de dado da trilha)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaRHhMap"), {
    status: "com_lider", historico: { a: 1 },
  })));


// ---- lançamento na folha (ramo novo 2026-07-08, espelho do fluxo manual) ----
const lancPatch = (por) => ({ lancada: true, lancadoEm: "2026-07-08", lancadoPor: por, historico: histN(2) });
test("RH (cap ocorrencias.lancar default) LANÇA uma confirmada", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/ocaLan1"), lancPatch("uRh"))));
test("Admin LANÇA uma confirmada", async () =>
  assertSucceeds(updateDoc(doc(admin(), "ocorrencias-auto/ocaLan2"), lancPatch("uAdmin"))));
test("Líder NÃO lança (sem cap)", async () =>
  assertFails(updateDoc(doc(lider(), "ocorrencias-auto/ocaLan3"), lancPatch("uLider"))));
test("Colaborador NÃO lança", async () =>
  assertFails(updateDoc(doc(colab(), "ocorrencias-auto/ocaLan10"), lancPatch("uColab"))));
test("NÃO lança em rh_confere (estágio errado)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaLan4"), { ...lancPatch("uRh"), historico: histN(1) })));
test("NÃO lança tocando o STATUS junto (fora do hasOnly)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaLan5"), { ...lancPatch("uRh"), status: "dispensada" })));
test("NÃO lança com lancadoPor de OUTRO usuário", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaLan9"), lancPatch("uAdmin"))));
test("NÃO lança sem o trio coerente (lancada true com lancadoEm null)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaLan6"), { lancada: true, lancadoEm: null, lancadoPor: "uRh", historico: histN(2) })));
test("RH DESFAZ o lançamento (trio zerado)", async () =>
  assertSucceeds(updateDoc(doc(rh(), "ocorrencias-auto/ocaLan7"), { lancada: false, lancadoEm: null, lancadoPor: null, historico: histN(2) })));
test("NÃO desfaz deixando lancadoEm pra trás (trio incoerente)", async () =>
  assertFails(updateDoc(doc(rh(), "ocorrencias-auto/ocaLan8"), { lancada: false, lancadoEm: "2026-07-08", lancadoPor: null, historico: histN(2) })));

// ---- supervisor (2026-07-08): read amplo + confirmar no escopo (paridade com a manual) ----
const confPatchSup = () => ({ status: "confirmada", historico: histN(2) });
test("SUPERVISOR: le ocorrencia-auto (read amplo, igual a manual)", async () =>
  assertSucceeds(getDoc(doc(superv(), "ocorrencias-auto/ocaLD"))));
test("SUPERVISOR: confirma com_lider no escopo por TURNO", async () =>
  assertSucceeds(updateDoc(doc(superv(), "ocorrencias-auto/ocaSupTurno"), confPatchSup())));
test("SUPERVISOR: confirma com_lider no escopo por ID (avulso)", async () =>
  assertSucceeds(updateDoc(doc(superv(), "ocorrencias-auto/ocaSupId"), confPatchSup())));
test("SUPERVISOR: NAO confirma com_lider FORA do escopo", async () =>
  assertFails(updateDoc(doc(superv(), "ocorrencias-auto/ocaSupFora"), confPatchSup())));
test("SUPERVISOR: NAO confirma a partir de rh_confere (estagio errado)", async () =>
  assertFails(updateDoc(doc(superv(), "ocorrencias-auto/ocaSupRh"), { status: "confirmada", historico: histN(1) })));
test("SUPERVISOR: NAO reclassifica tipo (so lider/RH corrigem)", async () =>
  assertFails(updateDoc(doc(superv(), "ocorrencias-auto/ocaSupTurno"), { status: "confirmada", historico: histN(2), tipo: "Outro" })));
