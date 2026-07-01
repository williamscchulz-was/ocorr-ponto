// Suíte de testes das Firestore rules — Fundação SELF (Fase 1).
// Roda contra o Firestore Emulator. Requer Java 21+ (firebase-tools 15).
// (Não roda no ambiente de dev atual, que tem Java 8 — rodar numa máquina com JDK 21.)
//
//   npm install --no-save @firebase/rules-unit-testing firebase
//   firebase emulators:exec --only firestore "node --test tests/firestore-rules.test.mjs"
//
// Matriz (plano docs/FASE1-FUNDACAO-SELF.md §6): colaborador-próprio-OK / colaborador-terceiro-NEGADO
// / gestor-sem-regressão / PII-negada / fail-safe sem vínculo.

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-rules-test",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  // Semeia dados ignorando as rules (estado inicial).
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uColab"),        { role: "colaborador", funcionarioId: "f-100", codigo: 100, nome: "Maria" });
    await setDoc(doc(db, "users/uColab2"),       { role: "colaborador", funcionarioId: "f-200", codigo: 200, nome: "Ana" });
    await setDoc(doc(db, "users/uColabSemVinc"), { role: "colaborador", nome: "Sem Vinculo" });
    await setDoc(doc(db, "users/uRh"),           { role: "rh", nome: "GH" });
    await setDoc(doc(db, "funcionarios/f-100"), { nome: "Maria", nascimento: "1990-07-14" });
    await setDoc(doc(db, "funcionarios/f-200"), { nome: "Ana" });
    await setDoc(doc(db, "ocorrencias/o100"), { funcionarioId: "f-100", funcionarioTurno: 1, tipo: "falta", acao: null, dataConferencia: null });
    await setDoc(doc(db, "ocorrencias/o200"), { funcionarioId: "f-200", funcionarioTurno: 2, tipo: "falta", acao: null, dataConferencia: null });
    await setDoc(doc(db, "banco-horas-saldos/f-100"), { cpf: "000.000.000-00", saldoMin: 150 });
    await setDoc(doc(db, "banco-horas-self/100"), { saldoMin: 30, saldoFormatado: "+00:30" });
    await setDoc(doc(db, "banco-horas-self/200"), { saldoMin: -24, saldoFormatado: "-00:24" });

    // ----- Pacote Gestor: colaborador com turno/setor denormalizado (segmentação) -----
    await setDoc(doc(db, "users/uColabT1"), { role: "colaborador", funcionarioId: "f-300", codigo: 300, nome: "Tonho", turno: 1, setor: "PRODUÇÃO" });
    await setDoc(doc(db, "funcionarios/f-300"), { nome: "Tonho" });
    // turno 2 + setor real em MAIÚSCULAS (shapes de produção, bridge WKRADAR 2026-06-26)
    await setDoc(doc(db, "users/uColabT2"), { role: "colaborador", funcionarioId: "f-400", codigo: 400, nome: "Bia", turno: 2, setor: "PREPARAÇÃO" });
    await setDoc(doc(db, "funcionarios/f-400"), { nome: "Bia" });

    // comunicados (segmentos: todos / turno:[1] / setor:[PREPARAÇÃO] / despublicado)
    await setDoc(doc(db, "comunicados/cTodos"),     { titulo: "Geral", corpo: "x", ativo: true,  segmento: { tipo: "todos", valores: [] }, autorUid: "uRh", autorNome: "GH", publicadoEm: new Date(), alcanceEstimado: 80 });
    await setDoc(doc(db, "comunicados/cTurno1"),    { titulo: "T1",    corpo: "x", ativo: true,  segmento: { tipo: "turno", valores: [1] }, autorUid: "uRh", autorNome: "GH", publicadoEm: new Date(), alcanceEstimado: 20 });
    await setDoc(doc(db, "comunicados/cSetorPrep"), { titulo: "Prep",  corpo: "x", ativo: true,  segmento: { tipo: "setor", valores: ["PREPARAÇÃO"] }, autorUid: "uRh", autorNome: "GH", publicadoEm: new Date(), alcanceEstimado: 29 });
    await setDoc(doc(db, "comunicados/cInativo"),   { titulo: "Off",   corpo: "x", ativo: false, segmento: { tipo: "todos", valores: [] }, autorUid: "uRh", autorNome: "GH", publicadoEm: new Date(), alcanceEstimado: 80 });

    // documentos (institucional publicado / rascunho / pessoal meu / pessoal de terceiro)
    const anexo = (n) => ({ url: "https://drive.google.com/file/d/" + n, nome: n + ".pdf", hashSha256: n });
    await setDoc(doc(db, "documentos/dPub"),      { escopo: "institucional", status: "publicado", segmento: { tipo: "todos", valores: [] }, exigeAssinatura: true,  versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: new Date(), anexo: anexo("a"), titulo: "Conduta" });
    await setDoc(doc(db, "documentos/dRascunho"), { escopo: "institucional", status: "rascunho",  segmento: { tipo: "todos", valores: [] }, exigeAssinatura: false, versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: new Date(), anexo: anexo("b"), titulo: "Rascunho" });
    await setDoc(doc(db, "documentos/dPesMeu"),   { escopo: "pessoal", status: "publicado", funcionarioId: "f-100", exigeAssinatura: true, versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: new Date(), anexo: anexo("c"), titulo: "Meu" });
    await setDoc(doc(db, "documentos/dPesOutro"), { escopo: "pessoal", status: "publicado", funcionarioId: "f-200", exigeAssinatura: true, versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: new Date(), anexo: anexo("d"), titulo: "Outro" });

    // ----- Espelho de ponto no gestor: líder por turno, supervisor pela lista de visíveis -----
    await setDoc(doc(db, "users/uLiderT1"), { role: "lider", turno: 1, nome: "Adelir" });
    await setDoc(doc(db, "users/uSuperv"),  { role: "supervisor", funcionariosVisiveis: ["f-300"], nome: "Jacques" });
    // Supervisor por TURNO (automação): cobre o 2º turno inteiro, sem lista de avulsos.
    await setDoc(doc(db, "users/uSupervT2"), { role: "supervisor", turnosVisiveis: [2], funcionariosVisiveis: [], nome: "Aldo" });
    // banco-horas-self COM denormalização (pipeline grava funcionarioTurno + funcionarioId).
    await setDoc(doc(db, "banco-horas-self/300"), { saldoMin: 12, saldoFormatado: "+00:12", funcionarioTurno: 1, funcionarioId: "f-300" });
    await setDoc(doc(db, "banco-horas-self/400"), { saldoMin: -5, saldoFormatado: "-00:05", funcionarioTurno: 2, funcionarioId: "f-400" });
    // (banco-horas-self/100 e /200 acima seguem SEM os campos = doc legado, pré-pipeline)
  });
});

after(async () => { await env.cleanup(); });

const colab    = () => env.authenticatedContext("uColab").firestore();
const colabSV  = () => env.authenticatedContext("uColabSemVinc").firestore();
const colabT1  = () => env.authenticatedContext("uColabT1").firestore();
const colabT2  = () => env.authenticatedContext("uColabT2").firestore();
const rh       = () => env.authenticatedContext("uRh").firestore();
const liderT1  = () => env.authenticatedContext("uLiderT1").firestore();
const superv   = () => env.authenticatedContext("uSuperv").firestore();
const supervT2 = () => env.authenticatedContext("uSupervT2").firestore();

// ---- funcionarios ----
test("colaborador LÊ o próprio funcionário", async () =>
  assertSucceeds(getDoc(doc(colab(), "funcionarios/f-100"))));
test("colaborador NÃO lê funcionário de terceiro", async () =>
  assertFails(getDoc(doc(colab(), "funcionarios/f-200"))));
test("RH lê qualquer funcionário (sem regressão)", async () =>
  assertSucceeds(getDoc(doc(rh(), "funcionarios/f-200"))));
test("colaborador SEM vínculo não lê nenhum funcionário (fail-safe)", async () =>
  assertFails(getDoc(doc(colabSV(), "funcionarios/f-100"))));

// ---- users ----
test("colaborador LÊ o próprio user", async () =>
  assertSucceeds(getDoc(doc(colab(), "users/uColab"))));
test("colaborador NÃO lê user de terceiro", async () =>
  assertFails(getDoc(doc(colab(), "users/uColab2"))));
test("RH lê qualquer user (chat/diretório intacto)", async () =>
  assertSucceeds(getDoc(doc(rh(), "users/uColab"))));
test("colaborador zera precisaTrocarSenha no próprio doc (self-update)", async () =>
  assertSucceeds(updateDoc(doc(colab(), "users/uColab"), { precisaTrocarSenha: false })));
test("colaborador NÃO consegue escalar o próprio role", async () =>
  assertFails(updateDoc(doc(colab(), "users/uColab"), { role: "admin" })));
test("colaborador NÃO altera o próprio funcionarioId", async () =>
  assertFails(updateDoc(doc(colab(), "users/uColab"), { funcionarioId: "f-200" })));

// ---- ocorrencias ----
test("colaborador LÊ a própria ocorrência", async () =>
  assertSucceeds(getDoc(doc(colab(), "ocorrencias/o100"))));
test("colaborador NÃO lê ocorrência de terceiro", async () =>
  assertFails(getDoc(doc(colab(), "ocorrencias/o200"))));
test("RH lê ocorrência (sem regressão)", async () =>
  assertSucceeds(getDoc(doc(rh(), "ocorrencias/o100"))));

// ---- PII (banco-horas-saldos: CPF/PIS) ----
test("colaborador NÃO lê banco-horas-saldos (PII, nem o próprio)", async () =>
  assertFails(getDoc(doc(colab(), "banco-horas-saldos/f-100"))));
test("RH lê banco-horas-saldos (sem regressão)", async () =>
  assertSucceeds(getDoc(doc(rh(), "banco-horas-saldos/f-100"))));

// ---- banco-horas-self (saldo SELF, SEM PII · doc por código) ----
test("colaborador LÊ o próprio banco-horas-self (codigo coagido)", async () =>
  assertSucceeds(getDoc(doc(colab(), "banco-horas-self/100"))));
test("colaborador NÃO lê banco-horas-self de terceiro", async () =>
  assertFails(getDoc(doc(colab(), "banco-horas-self/200"))));
test("colaborador SEM código não lê banco-horas-self (fail-safe)", async () =>
  assertFails(getDoc(doc(colabSV(), "banco-horas-self/100"))));
test("RH lê banco-horas-self (sem regressão)", async () =>
  assertSucceeds(getDoc(doc(rh(), "banco-horas-self/100"))));
test("colaborador NÃO escreve banco-horas-self", async () =>
  assertFails(setDoc(doc(colab(), "banco-horas-self/100"), { saldoMin: 999 })));

// ---- banco-horas-self: Espelho de ponto do gestor (líder por turno · supervisor por lista) ----
test("líder LÊ banco-horas-self de liderado do MESMO turno (denormalizado)", async () =>
  assertSucceeds(getDoc(doc(liderT1(), "banco-horas-self/300"))));
test("líder NÃO lê banco-horas-self de OUTRO turno", async () =>
  assertFails(getDoc(doc(liderT1(), "banco-horas-self/400"))));
test("líder NÃO lê banco-horas-self LEGADO (sem funcionarioTurno)", async () =>
  assertFails(getDoc(doc(liderT1(), "banco-horas-self/100"))));
test("supervisor LÊ banco-horas-self de funcionário ATRIBUÍDO", async () =>
  assertSucceeds(getDoc(doc(superv(), "banco-horas-self/300"))));
test("supervisor NÃO lê banco-horas-self de NÃO atribuído", async () =>
  assertFails(getDoc(doc(superv(), "banco-horas-self/400"))));
test("supervisor NÃO lê banco-horas-self LEGADO (sem funcionarioId)", async () =>
  assertFails(getDoc(doc(superv(), "banco-horas-self/100"))));
// supervisor por TURNO (automação: Aldo cobre o 2º turno inteiro)
test("supervisor por TURNO lê banco-horas-self do turno coberto", async () =>
  assertSucceeds(getDoc(doc(supervT2(), "banco-horas-self/400"))));
test("supervisor por TURNO NÃO lê banco-horas-self de turno não coberto", async () =>
  assertFails(getDoc(doc(supervT2(), "banco-horas-self/300"))));
test("supervisor por TURNO NÃO lê banco-horas-self LEGADO (sem funcionarioTurno)", async () =>
  assertFails(getDoc(doc(supervT2(), "banco-horas-self/200"))));
// supervisor por TURNO CONFERE ocorrência (WRITE) do turno coberto, não de outro
test("supervisor por TURNO confere ocorrência do turno coberto", async () =>
  assertSucceeds(updateDoc(doc(supervT2(), "ocorrencias/o200"), { acao: "advertencia", dataConferencia: serverTimestamp(), conferidoPor: "uSupervT2" })));
test("supervisor por TURNO NÃO confere ocorrência de turno não coberto", async () =>
  assertFails(updateDoc(doc(supervT2(), "ocorrencias/o100"), { acao: "advertencia", dataConferencia: serverTimestamp(), conferidoPor: "uSupervT2" })));

// ---- comunicados (Pacote Gestor · leitura segmentada + write gated) ----
test("colaborador LÊ comunicado 'todos' ativo", async () =>
  assertSucceeds(getDoc(doc(colab(), "comunicados/cTodos"))));
test("colaborador NÃO lê comunicado despublicado (ativo=false)", async () =>
  assertFails(getDoc(doc(colab(), "comunicados/cInativo"))));
test("colaborador do turno 1 LÊ comunicado turno:[1]", async () =>
  assertSucceeds(getDoc(doc(colabT1(), "comunicados/cTurno1"))));
test("colaborador SEM turno NÃO lê comunicado turno:[1] (fail-safe)", async () =>
  assertFails(getDoc(doc(colab(), "comunicados/cTurno1"))));
test("colaborador do turno 2 NÃO lê comunicado turno:[1] (turno-2 != turno-1, shapes reais)", async () =>
  assertFails(getDoc(doc(colabT2(), "comunicados/cTurno1"))));
test("colaborador do setor PREPARAÇÃO LÊ comunicado setor:[PREPARAÇÃO] (maiúsculas reais)", async () =>
  assertSucceeds(getDoc(doc(colabT2(), "comunicados/cSetorPrep"))));
test("colaborador de outro setor NÃO lê comunicado setor:[PREPARAÇÃO]", async () =>
  assertFails(getDoc(doc(colabT1(), "comunicados/cSetorPrep"))));
test("RH lê qualquer comunicado, inclusive despublicado (gestor)", async () =>
  assertSucceeds(getDoc(doc(rh(), "comunicados/cInativo"))));
test("colaborador NÃO cria comunicado (sem cap)", async () =>
  assertFails(setDoc(doc(colab(), "comunicados/cX"), { titulo: "x", corpo: "y", ativo: true, segmento: { tipo: "todos", valores: [] }, autorUid: "uColab", publicadoEm: serverTimestamp() })));
test("RH cria comunicado com publicadoEm = server-time", async () =>
  assertSucceeds(setDoc(doc(rh(), "comunicados/cNovo"), { titulo: "x", corpo: "y", ativo: true, segmento: { tipo: "todos", valores: [] }, autorUid: "uRh", autorNome: "GH", publicadoEm: serverTimestamp() })));
test("RH NÃO cria comunicado com publicadoEm forjado (não server-time)", async () =>
  assertFails(setDoc(doc(rh(), "comunicados/cForja"), { titulo: "x", corpo: "y", ativo: true, segmento: { tipo: "todos", valores: [] }, autorUid: "uRh", autorNome: "GH", publicadoEm: new Date(2020, 0, 1) })));
test("colaborador registra leitura no comunicado do seu segmento", async () =>
  assertSucceeds(setDoc(doc(colab(), "comunicados/cTodos/leituras/uColab"), { uid: "uColab", funcionarioId: "f-100", confirmado: true, em: serverTimestamp(), userAgent: "t" })));
test("colaborador NÃO registra leitura em comunicado fora do segmento (CORREÇÃO 6)", async () =>
  assertFails(setDoc(doc(colab(), "comunicados/cTurno1/leituras/uColab"), { uid: "uColab", funcionarioId: "f-100", confirmado: true, em: serverTimestamp(), userAgent: "t" })));
test("colaborador NÃO grava leitura com campo extra alem do schema (hasOnly barra PII)", async () =>
  assertFails(setDoc(doc(colabT2(), "comunicados/cTodos/leituras/uColabT2"), { uid: "uColabT2", funcionarioId: "f-400", confirmado: true, em: serverTimestamp(), userAgent: "t", cpf: "000.000.000-00" })));

// ---- documentos institucionais (Pacote Gestor · institucional/pessoal + assinatura/versão) ----
test("colaborador LÊ documento institucional publicado 'todos'", async () =>
  assertSucceeds(getDoc(doc(colab(), "documentos/dPub"))));
test("colaborador NÃO lê documento em rascunho", async () =>
  assertFails(getDoc(doc(colab(), "documentos/dRascunho"))));
test("colaborador LÊ documento pessoal próprio (escopo pessoal)", async () =>
  assertSucceeds(getDoc(doc(colab(), "documentos/dPesMeu"))));
test("colaborador NÃO lê documento pessoal de terceiro", async () =>
  assertFails(getDoc(doc(colab(), "documentos/dPesOutro"))));
test("RH lê qualquer documento, inclusive rascunho (gestor)", async () =>
  assertSucceeds(getDoc(doc(rh(), "documentos/dRascunho"))));
test("colaborador NÃO cria documento (sem cap)", async () =>
  assertFails(setDoc(doc(colab(), "documentos/dX"), { escopo: "institucional", status: "rascunho", segmento: { tipo: "todos", valores: [] }, versao: 1, criadoPor: "uColab", criadoEm: serverTimestamp() })));
test("RH cria documento institucional (sem funcionarioId, criadoEm server-time)", async () =>
  assertSucceeds(setDoc(doc(rh(), "documentos/dNovo"), { escopo: "institucional", status: "rascunho", segmento: { tipo: "todos", valores: [] }, exigeAssinatura: false, versao: 1, criadoPor: "uRh", autorNome: "GH", criadoEm: serverTimestamp(), anexo: { url: "https://drive.google.com/n", nome: "n.pdf", hashSha256: "n" }, titulo: "Novo" })));
test("RH NÃO cria documento institucional COM funcionarioId (escopo inválido)", async () =>
  assertFails(setDoc(doc(rh(), "documentos/dBad"), { escopo: "institucional", status: "rascunho", segmento: { tipo: "todos", valores: [] }, funcionarioId: "f-100", versao: 1, criadoPor: "uRh", criadoEm: serverTimestamp() })));
test("colaborador assina documento com versaoAssinada == versão atual", async () =>
  assertSucceeds(setDoc(doc(colab(), "documentos/dPub/assinaturas/uColab"), { uid: "uColab", funcionarioId: "f-100", versaoAssinada: 1, hashSha256: "a", aceiteTexto: "Li e estou de acordo", em: serverTimestamp(), userAgent: "t" })));
test("colaborador NÃO assina com versaoAssinada != versão atual (CORREÇÃO 7)", async () =>
  assertFails(setDoc(doc(colabT1(), "documentos/dPub/assinaturas/uColabT1"), { uid: "uColabT1", funcionarioId: "f-300", versaoAssinada: 2, hashSha256: "a", aceiteTexto: "x", em: serverTimestamp(), userAgent: "t" })));
test("RH NÃO troca segmento de doc publicado+assinatura por update direto (CORREÇÃO 4)", async () =>
  assertFails(updateDoc(doc(rh(), "documentos/dPub"), { segmento: { tipo: "turno", valores: [1] } })));
test("RH faz novaVersao (versao 1→2 + troca anexo) em doc publicado+assinatura", async () =>
  assertSucceeds(updateDoc(doc(rh(), "documentos/dPub"), { versao: 2, anexo: { url: "https://drive.google.com/v2", nome: "a2.pdf", hashSha256: "xyz" }, versaoEm: serverTimestamp(), versaoPor: "uRh" })));
