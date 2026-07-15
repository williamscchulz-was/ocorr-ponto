// Rules da GAMIFICACAO (pontos por acao no Portal do Colaborador, 2026-07-14).
//   - gamificacao/{ano}: config da temporada (tabela {acao:pts} + marcos + ativa).
//     Read authed (alimenta o card do colab, SEM premios); write cap gamificacao.gerenciar.
//   - gamificacao/{ano}/privado/premios: os premios sao SURPRESA -> so a cap le/escreve.
//   - gamificacao/{ano}/pontos/{uid}: placar { total, nome, ultimoEvento }. Read amplo
//     (ranking publico). O total SO avanca junto de um evento nascendo no MESMO batch,
//     com valor exato (liturgia do contador do clima). nome anti-spoof (== users.nome).
//   - .../pontos/{uid}/eventos/{acao_refId}: create-only pelo dono, id deterministico
//     (dedup estrutural), pontos == tabela da config, PROVA exists/existsAfter da acao
//     real (assinatura/leitura/reacao/recibo/auto/termo). Temporada ativa + ano corrente.
//   - gamificacao/{ano}/entregas/{uid_marco}: GP registra entrega do premio (imutavel);
//     o dono le as proprias (assim o premio de marco cruzado e revelado).
//
//   firebase emulators:exec --only firestore "node --test tests/gamificacao-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

let env;
const TS = serverTimestamp;
const ANO = String(new Date().getFullYear());
const ANO_PASSADO = String(new Date().getFullYear() - 1);
// coracao/boas-vindas seguem NA TABELA de teste de proposito: provam que mesmo
// configuradas, o provaOk nao tem ramo pra elas (mural sem doc pai = mina; gate Fable).
const TABELA = {
  "cartao-ponto": 1, folha: 1, comunicado: 1, "documento-leitura": 1,
  coracao: 1, "boas-vindas": 1,
  "documento-assinatura": 5, pesquisa: 5, autoavaliacao: 5, termo: 5, foto: 5, streak: 1,
};
const MARCOS = [25, 50, 100, 150, 200];
// Mural (coracao/boas-vindas), gate Fable 2026-07-15: postIds do doc pai gravado pelo
// pipeline. POST_CORACAO_VELHO usa um ano 2 temporadas atras, so pra provar o sufixo.
const ANO_VELHO_MURAL = String(Number(ANO) - 2);
const POST_CORACAO = `aniv-fulana-teste-${ANO}`;
const POST_BV = `bv-novato-silva-${ANO}`;
const POST_CORACAO_VELHO = `aniv-velha-pessoa-${ANO_VELHO_MURAL}`;
const POST_BV_AUTO = `bv-maria-${ANO}`; // nome do pai == nome do uColab, prova o anti-auto

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-gamificacao-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uAdmin"),  { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uRh"),     { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uColab"),  { role: "colaborador", nome: "Maria", funcionarioId: "f-1", turno: 1, setor: "Producao", fotoBase64: "data:image/png;base64,AAA" });
    await setDoc(doc(db, "users/uColab2"), { role: "colaborador", nome: "Ana", funcionarioId: "f-2", turno: 2, setor: "Repasse" });
    await setDoc(doc(db, "users/uColab3"), { role: "colaborador", nome: "Bia", funcionarioId: "f-3" });
    await setDoc(doc(db, "funcionarios/f-1"), { nome: "Maria", turno: 1, setor: "Producao" });
    await setDoc(doc(db, "funcionarios/f-2"), { nome: "Ana", turno: 2, setor: "Repasse" });

    // Temporadas: a corrente (ativa) e a do ano passado (tambem ativa, pra provar
    // que o gate do ANO nega mesmo com config ativa).
    await setDoc(doc(db, `gamificacao/${ANO}`),         { tabela: TABELA, marcos: MARCOS, ativa: true });
    await setDoc(doc(db, `gamificacao/${ANO_PASSADO}`), { tabela: TABELA, marcos: MARCOS, ativa: true });
    await setDoc(doc(db, `gamificacao/${ANO}/privado/premios`), { m25: "Caneca da firma", m50: "Brinde" });

    // PROVAS reais do uColab (f-1), uma por acao pontuavel.
    await setDoc(doc(db, "recibos/r-cp"), { tipo: "cartao-ponto", funcionarioId: "f-1", competencia: "2026-06", criadoPor: "uRh", criadoEm: new Date() });
    await setDoc(doc(db, "recibos/r-cp/assinaturas/uColab"), { uid: "uColab", funcionarioId: "f-1", em: new Date() });
    await setDoc(doc(db, "recibos/r-fl"), { tipo: "recibo", funcionarioId: "f-1", competencia: "2026-06", criadoPor: "uRh", criadoEm: new Date() });
    await setDoc(doc(db, "recibos/r-fl/assinaturas/uColab"), { uid: "uColab", funcionarioId: "f-1", em: new Date() });
    await setDoc(doc(db, "comunicados/com1"), { autorUid: "uRh", ativo: true, segmento: { tipo: "todos", valores: [] }, publicadoEm: new Date() });
    await setDoc(doc(db, "comunicados/com1/leituras/uColab"), { uid: "uColab", em: new Date() });
    await setDoc(doc(db, "comunicados/com2"), { autorUid: "uRh", ativo: true, segmento: { tipo: "todos", valores: [] }, publicadoEm: new Date() });
    await setDoc(doc(db, "comunicados/com2/leituras/uColab2"), { uid: "uColab2", em: new Date() });
    await setDoc(doc(db, "documentos/doc1"), { escopo: "institucional", status: "publicado", segmento: { tipo: "todos", valores: [] }, criadoPor: "uRh", criadoEm: new Date() });
    await setDoc(doc(db, "documentos/doc1/leituras/uColab"), { uid: "uColab", confirmado: true, em: new Date() });
    await setDoc(doc(db, "documentos/doc3"), { escopo: "institucional", status: "publicado", segmento: { tipo: "todos", valores: [] }, criadoPor: "uRh", criadoEm: new Date() });
    await setDoc(doc(db, "documentos/doc3/leituras/uColab"), { uid: "uColab", confirmado: false, em: new Date() });
    await setDoc(doc(db, "documentos/doc2"), { escopo: "institucional", status: "publicado", segmento: { tipo: "todos", valores: [] }, criadoPor: "uRh", criadoEm: new Date(), versao: 1 });
    await setDoc(doc(db, "documentos/doc2/assinaturas/uColab"), { uid: "uColab", versaoAssinada: 1, em: new Date() });
    await setDoc(doc(db, "muralAniversario/aniv-joao-2026/reacoes/uColab"), { uid: "uColab", tipo: "coracao", autorNome: "Maria", em: new Date() });
    await setDoc(doc(db, "muralAniversario/bv-ana-2026/reacoes/uColab"), { uid: "uColab", tipo: "bemvindo", autorNome: "Maria", em: new Date() });

    // Doc PAI do mural (gravado pelo pipeline, gate Fable 2026-07-15): a prova real de
    // coracao/boas-vindas passa a exigir ESTE doc + a reacao do proprio uid.
    await setDoc(doc(db, `muralAniversario/${POST_CORACAO}`), { tipo: "aniversario", nome: "Fulana Teste", funcionarioId: "f-77", dia: 1, mes: 1, ano: Number(ANO) });
    await setDoc(doc(db, `muralAniversario/${POST_BV}`), { tipo: "bemvindo", nome: "Novato Silva", funcionarioId: "f-88", admissao: `${ANO}-07-01` });
    await setDoc(doc(db, `muralAniversario/${POST_CORACAO_VELHO}`), { tipo: "aniversario", nome: "Velha Pessoa", funcionarioId: "f-99", dia: 5, mes: 3, ano: Number(ANO_VELHO_MURAL) });
    // Pai bemvindo com nome IGUAL ao do uColab (Maria): prova o anti-auto (pai.nome != users.nome).
    await setDoc(doc(db, `muralAniversario/${POST_BV_AUTO}`), { tipo: "bemvindo", nome: "Maria", funcionarioId: "f-66", admissao: `${ANO}-07-01` });
    // Reacao JA EXISTENTE com 'em' do ANO PASSADO (uColab2, sob o post de coracao valido):
    // prova o year-gate do 'em' quando o claim novo NAO reescreve a reacao no batch.
    await setDoc(doc(db, `muralAniversario/${POST_CORACAO}/reacoes/uColab2`), { uid: "uColab2", tipo: "coracao", autorNome: "Ana", em: new Date(`${ANO_PASSADO}-06-01T12:00:00Z`) });
    // Probe do gate 2026-07-15: reacao FRESCA pre-existente (deletavel num batch adversarial)
    await setDoc(doc(db, `muralAniversario/${POST_CORACAO}/reacoes/uColab3`), { uid: "uColab3", tipo: "coracao", autorNome: "Bia", em: new Date() });
    await setDoc(doc(db, "pesquisasClima/p1"), { titulo: "Clima", anonima: true, status: "aberta", publico: { tipo: "todos", valores: [] }, criadoPor: "uRh", criadoEm: new Date() });
    await setDoc(doc(db, "pesquisasClima/p1/recibos/uColab"), { em: new Date() });
    await setDoc(doc(db, "pesquisasClima/p2"), { titulo: "Clima 2", anonima: true, status: "aberta", publico: { tipo: "todos", valores: [] }, criadoPor: "uRh", criadoEm: new Date() });
    // Prova VELHA (ano passado): leitura real, mas o year-gate tem que negar o credito.
    await setDoc(doc(db, "comunicados/com3"), { autorUid: "uRh", ativo: true, segmento: { tipo: "todos", valores: [] }, publicadoEm: new Date() });
    await setDoc(doc(db, "comunicados/com3/leituras/uColab2"), { uid: "uColab2", em: new Date(`${ANO_PASSADO}-06-15T12:00:00Z`) });
    await setDoc(doc(db, "avaliacaoCiclos/cx1"), { nome: "Ciclo", modalidade: "auto", status: "ativo", publico: { tipo: "todos", valores: [] }, criadoPor: "uRh", criadoEm: new Date() });
    await setDoc(doc(db, "avaliacaoCiclos/cx1/avaliacoes/auto_f-1"), { alvoFid: "f-1", avaliadorUid: "uColab", papel: "auto", notas: { c1: 4 }, status: "concluida", atualizadoEm: new Date() });
    await setDoc(doc(db, "avaliacaoCiclos/cx2"), { nome: "Ciclo 2", modalidade: "auto", status: "ativo", publico: { tipo: "todos", valores: [] }, criadoPor: "uRh", criadoEm: new Date() });
    await setDoc(doc(db, "avaliacaoCiclos/cx2/avaliacoes/auto_f-1"), { alvoFid: "f-1", avaliadorUid: "uColab", papel: "auto", notas: { c1: 4 }, status: "rascunho", atualizadoEm: new Date() });
    await setDoc(doc(db, "termoAdesao/uColab"), { uid: "uColab", funcionarioId: "f-1", versao: "2026-07-v1", em: new Date() });

    // Placar/entrega seed pros reads.
    await setDoc(doc(db, `gamificacao/${ANO}/pontos/uSeed`), { total: 7, nome: "Seed", ultimoEvento: "comunicado_x" });
    await setDoc(doc(db, `gamificacao/${ANO}/pontos/uSeed/eventos/comunicado_x`), { acao: "comunicado", refId: "x", pontos: 1, em: new Date() });
    await setDoc(doc(db, `gamificacao/${ANO}/entregas/uSeed_25`), { uid: "uSeed", marco: 25, premio: "Caneca da firma", em: new Date(), porUid: "uRh" });
  });
});
after(async () => { await env.cleanup(); });

const admin  = () => env.authenticatedContext("uAdmin").firestore();
const rh     = () => env.authenticatedContext("uRh").firestore();
const colab  = () => env.authenticatedContext("uColab").firestore();
const colab2 = () => env.authenticatedContext("uColab2").firestore();
const anon   = () => env.unauthenticatedContext().firestore();

// batch canonico: evento {acao}_{refId} + placar (create se placarDe === null; senao total acumulado)
function ganhaPonto(db, uid, acao, refId, pontos, { placarDe = null, nome = "Maria", rotulo, ano = ANO, total } = {}) {
  const b = writeBatch(db);
  const eid = `${acao}_${refId}`;
  b.set(doc(db, `gamificacao/${ano}/pontos/${uid}/eventos/${eid}`), { acao, refId, pontos, em: TS(), ...(rotulo ? { rotulo } : {}) });
  b.set(doc(db, `gamificacao/${ano}/pontos/${uid}`), { nome, ultimoEvento: eid, total: total != null ? total : (placarDe === null ? pontos : placarDe + pontos) });
  return b.commit();
}

// batch do mural (coracao/boas-vindas): reacao REAL no post (respeita reacaoOk() da
// regra do mural: tipo casa com o prefixo do postId, bv- -> bemvindo, senao coracao) +
// evento {acao}_{postId} + placar. comReacao:false pula a reacao (prova SEM ela, ou
// reaproveita uma reacao ja existente sem reescrever).
function ganhaPontoMural(db, uid, acao, postId, pontos, { placarDe = null, nome = "Maria", total, comReacao = true } = {}) {
  const b = writeBatch(db);
  const eid = `${acao}_${postId}`;
  if (comReacao) {
    const tipoReacao = postId.startsWith("bv-") ? "bemvindo" : "coracao";
    b.set(doc(db, `muralAniversario/${postId}/reacoes/${uid}`), { uid, tipo: tipoReacao, autorNome: nome, em: TS() });
  }
  b.set(doc(db, `gamificacao/${ANO}/pontos/${uid}/eventos/${eid}`), { acao, refId: postId, pontos, em: TS() });
  b.set(doc(db, `gamificacao/${ANO}/pontos/${uid}`), { nome, ultimoEvento: eid, total: total != null ? total : (placarDe === null ? pontos : placarDe + pontos) });
  return b.commit();
}

// ---------- Config da temporada ----------
test("colab LE a config (card da home)", async () => assertSucceeds(getDoc(doc(colab(), `gamificacao/${ANO}`))));
test("anonimo NAO le a config", async () => assertFails(getDoc(doc(anon(), `gamificacao/${ANO}`))));
test("RH atualiza a config (cap fallback)", async () =>
  assertSucceeds(setDoc(doc(rh(), `gamificacao/${ANO}`), { tabela: TABELA, marcos: MARCOS, ativa: true, atualizadoEm: TS(), atualizadoPor: "uRh" })));
test("colab NAO escreve a config", async () =>
  assertFails(setDoc(doc(colab(), `gamificacao/${ANO}`), { tabela: TABELA, marcos: MARCOS, ativa: true, atualizadoEm: TS(), atualizadoPor: "uColab" })));
test("config com campo fora do shape NEGA", async () =>
  assertFails(setDoc(doc(rh(), `gamificacao/${ANO}`), { tabela: TABELA, marcos: MARCOS, ativa: true, atualizadoEm: TS(), atualizadoPor: "uRh", extra: 1 })));

// ---------- Premios (SURPRESA) ----------
test("colab NAO le os premios (surpresa preservada)", async () =>
  assertFails(getDoc(doc(colab(), `gamificacao/${ANO}/privado/premios`))));
test("RH le e escreve os premios", async () => {
  await assertSucceeds(getDoc(doc(rh(), `gamificacao/${ANO}/privado/premios`)));
  await assertSucceeds(setDoc(doc(rh(), `gamificacao/${ANO}/privado/premios`), { m25: "Caneca", m50: "Brinde", m100: "Vale-compras" }));
});

// ---------- Eventos: cada acao com a prova real (uColab, placar acumulando) ----------
test("cartao-ponto: assinatura do recibo prova (+1, placar nasce)", async () =>
  assertSucceeds(ganhaPonto(colab(), "uColab", "cartao-ponto", "r-cp", 1)));
test("folha: assinatura do recibo tipo recibo prova (+1)", async () =>
  assertSucceeds(ganhaPonto(colab(), "uColab", "folha", "r-fl", 1, { placarDe: 1 })));
test("comunicado: leitura prova (+1)", async () =>
  assertSucceeds(ganhaPonto(colab(), "uColab", "comunicado", "com1", 1, { placarDe: 2, rotulo: "Ciência do comunicado" })));
test("documento-leitura: leitura CONFIRMADA prova (+1)", async () =>
  assertSucceeds(ganhaPonto(colab(), "uColab", "documento-leitura", "doc1", 1, { placarDe: 3 })));
test("documento-leitura NAO confirmada (so visualizou) NEGA", async () =>
  assertFails(ganhaPonto(colab(), "uColab", "documento-leitura", "doc3", 1, { placarDe: 3 })));
test("documento-assinatura: assinatura prova (+5)", async () =>
  assertSucceeds(ganhaPonto(colab(), "uColab", "documento-assinatura", "doc2", 5, { placarDe: 4 })));
test("pesquisa: recibo PRE-existente do clima prova (+5, sem tocar na resposta)", async () =>
  assertSucceeds(ganhaPonto(colab(), "uColab", "pesquisa", "p1", 5, { placarDe: 9 })));
test("autoavaliacao concluida prova (+5)", async () =>
  assertSucceeds(ganhaPonto(colab(), "uColab", "autoavaliacao", "cx1", 5, { placarDe: 14 })));
test("termo: adesao prova (+5, refId = uid)", async () =>
  assertSucceeds(ganhaPonto(colab(), "uColab", "termo", "uColab", 5, { placarDe: 19 })));
test("foto de perfil propria prova (+5, 1x por temporada via arvore do ano)", async () =>
  assertSucceeds(ganhaPonto(colab(), "uColab", "foto", "uColab", 5, { placarDe: 24 })));
test("foto: SEM fotoBase64 no users NEGA", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "foto", "uColab2", 5, { nome: "Ana" })));
test("foto com refId de outro uid NEGA", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "foto", "uColab", 5, { nome: "Ana" })));
test("foto com lixo (nao dataURL de imagem) NEGA", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), "users/uColab2"), { fotoBase64: "hackeada" });
  });
  await assertFails(ganhaPonto(colab2(), "uColab2", "foto", "uColab2", 5, { nome: "Ana" }));
});

// ---------- Bloqueadores do gate Fable 2026-07-14 ----------
test("coracao NEGA mesmo com reacao real (mural sem doc pai = fora do v1)", async () =>
  assertFails(ganhaPonto(colab(), "uColab", "coracao", "aniv-joao-2026", 1, { placarDe: 29 })));
test("boas-vindas NEGA mesmo com reacao real (fora do v1)", async () =>
  assertFails(ganhaPonto(colab(), "uColab", "boas-vindas", "bv-ana-2026", 1, { placarDe: 29 })));
test("MINA DO MURAL: reacao em post inventado + evento no mesmo batch NEGA", async () => {
  const db = colab2();
  const b = writeBatch(db);
  b.set(doc(db, "muralAniversario/aniv-fake-001/reacoes/uColab2"), { uid: "uColab2", tipo: "coracao", autorNome: "Ana", em: TS() });
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2/eventos/coracao_aniv-fake-001`), { acao: "coracao", refId: "aniv-fake-001", pontos: 1, em: TS() });
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2`), { nome: "Ana", ultimoEvento: "coracao_aniv-fake-001", total: 1 });
  await assertFails(b.commit());
});
test("ANONIMATO: evento pesquisa no MESMO batch do recibo NEGA (join de timestamp)", async () => {
  const db = colab2();
  const b = writeBatch(db);
  b.set(doc(db, "pesquisasClima/p2/recibos/uColab2"), { em: TS() });
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2/eventos/pesquisa_p2`), { acao: "pesquisa", refId: "p2", pontos: 5, em: TS() });
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2`), { nome: "Ana", ultimoEvento: "pesquisa_p2", total: 5 });
  await assertFails(b.commit());
});
test("REPLAY CROSS-ANO: prova com em do ano passado NEGA (year-gate)", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "comunicado", "com3", 1, { nome: "Ana" })));

// ---------- Mural: coracao/boas-vindas (DESTRAVADO 2026-07-15, doc pai do pipeline) ----------
test("coracao: pai aniversario + reacao propria no MESMO batch PASSA (+1)", async () =>
  assertSucceeds(ganhaPontoMural(colab(), "uColab", "coracao", POST_CORACAO, 1, { placarDe: 29 })));
test("boas-vindas: pai bemvindo + reacao propria no MESMO batch PASSA (+1)", async () =>
  assertSucceeds(ganhaPontoMural(colab(), "uColab", "boas-vindas", POST_BV, 1, { placarDe: 30 })));
test("coracao SEM doc pai (postId inventado) NEGA", async () =>
  assertFails(ganhaPontoMural(colab2(), "uColab2", "coracao", `aniv-inventado-${ANO}`, 1, { nome: "Ana" })));
test("boas-vindas SEM a reacao (evento+placar sozinhos) NEGA", async () =>
  assertFails(ganhaPontoMural(colab2(), "uColab2", "boas-vindas", POST_BV, 1, { nome: "Ana", comReacao: false })));
test("tipo trocado: coracao apontando pai bemvindo NEGA", async () =>
  assertFails(ganhaPontoMural(colab2(), "uColab2", "coracao", POST_BV, 1, { nome: "Ana" })));
test("tipo trocado: boas-vindas apontando pai aniversario NEGA", async () =>
  assertFails(ganhaPontoMural(colab2(), "uColab2", "boas-vindas", POST_CORACAO, 1, { nome: "Ana" })));
test("coracao em post de ANO VELHO (sufixo do refId) NEGA mesmo com pai+reacao novos", async () =>
  assertFails(ganhaPontoMural(colab2(), "uColab2", "coracao", POST_CORACAO_VELHO, 1, { nome: "Ana" })));
test("reacao com em de ANO VELHO ja existente, sem reescrever, NEGA (year-gate do em)", async () =>
  assertFails(ganhaPontoMural(colab2(), "uColab2", "coracao", POST_CORACAO, 1, { nome: "Ana", comReacao: false })));
test("ANTI-AUTO: pai.nome == users.nome NEGA (uColab == Maria)", async () =>
  assertFails(ganhaPontoMural(colab(), "uColab", "boas-vindas", POST_BV_AUTO, 1, { placarDe: 30 })));
test("double-claim coracao (mesmo evento 2x) NEGA (create em doc existente)", async () =>
  assertFails(ganhaPontoMural(colab(), "uColab", "coracao", POST_CORACAO, 1, { placarDe: 30 })));
test("boas-vindas com pontos != tabela NEGA (prova valida, valor errado)", async () =>
  assertFails(ganhaPontoMural(colab2(), "uColab2", "boas-vindas", POST_BV, 5, { nome: "Ana" })));
test("acao inventada 'abraco' (fora da tabela) NEGA", async () =>
  assertFails(ganhaPontoMural(colab2(), "uColab2", "abraco", POST_CORACAO, 1, { nome: "Ana", comReacao: false })));

// ---------- Eventos: negacoes ----------
test("SEM prova NEGA (uColab2 nao leu com1)", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "comunicado", "com1", 1, { nome: "Ana" })));
test("pontos fora da tabela NEGAM (prova valida, valor errado)", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "comunicado", "com2", 5, { nome: "Ana" })));
test("acao desconhecida NEGA", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "hackeou", "com2", 1, { nome: "Ana" })));
test("id nao deterministico NEGA", async () => {
  const db = colab2();
  const b = writeBatch(db);
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2/eventos/aleatorio-123`), { acao: "comunicado", refId: "com2", pontos: 1, em: TS() });
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2`), { nome: "Ana", ultimoEvento: "aleatorio-123", total: 1 });
  await assertFails(b.commit());
});
test("em != hora do servidor NEGA", async () => {
  const db = colab2();
  const b = writeBatch(db);
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2/eventos/comunicado_com2`), { acao: "comunicado", refId: "com2", pontos: 1, em: new Date("2020-01-01") });
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2`), { nome: "Ana", ultimoEvento: "comunicado_com2", total: 1 });
  await assertFails(b.commit());
});
test("rotulo gigante NEGA", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "comunicado", "com2", 1, { nome: "Ana", rotulo: "x".repeat(141) })));
test("evento na arvore de OUTRO uid NEGA", async () =>
  assertFails(ganhaPonto(colab2(), "uColab", "comunicado", "com1", 1)));
test("repetir a mesma acao NEGA (dedup estrutural: vira update)", async () =>
  assertFails(ganhaPonto(colab(), "uColab", "comunicado", "com1", 1, { placarDe: 29 })));
test("cartao-ponto apontando recibo de folha NEGA (tipo do pai)", async () =>
  assertFails(ganhaPonto(colab(), "uColab", "cartao-ponto", "r-fl", 1, { placarDe: 29 })));
test("autoavaliacao em RASCUNHO nao prova NEGA", async () =>
  assertFails(ganhaPonto(colab(), "uColab", "autoavaliacao", "cx2", 5, { placarDe: 29 })));
test("temporada do ANO PASSADO nega evento (mesmo ativa)", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "comunicado", "com2", 1, { nome: "Ana", ano: ANO_PASSADO })));
test("termo com refId de outro uid NEGA", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "termo", "uColab", 5, { nome: "Ana" })));

// ---------- Placar: acoplamento batch ----------
test("total MAIOR que o evento NEGA (inflar placar)", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "comunicado", "com2", 1, { nome: "Ana", total: 20 })));
test("update de total SEM evento no batch NEGA", async () =>
  assertFails(updateDoc(doc(colab(), `gamificacao/${ANO}/pontos/uColab`), { total: 999 })));
test("nome spoof NEGA (!= users.nome)", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "comunicado", "com2", 1, { nome: "Golpista" })));
test("placar com campo extra NEGA", async () => {
  const db = colab2();
  const b = writeBatch(db);
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2/eventos/comunicado_com2`), { acao: "comunicado", refId: "com2", pontos: 1, em: TS() });
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2`), { nome: "Ana", ultimoEvento: "comunicado_com2", total: 1, admin: true });
  await assertFails(b.commit());
});
test("placar de outro uid NEGA mesmo com evento proprio no batch", async () => {
  const db = colab2();
  const b = writeBatch(db);
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab2/eventos/comunicado_com2`), { acao: "comunicado", refId: "com2", pontos: 1, em: TS() });
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab`), { nome: "Maria", ultimoEvento: "comunicado_com2", total: 27 });
  await assertFails(b.commit());
});
test("colab NAO deleta o proprio placar; admin sim", async () => {
  await assertFails(deleteDoc(doc(colab(), `gamificacao/${ANO}/pontos/uSeed`)));
  await assertSucceeds(deleteDoc(doc(admin(), `gamificacao/${ANO}/pontos/uSeed`)));
});

// ---------- Leituras: ranking + extrato ----------
test("ranking: colab le o placar dos outros (getDoc)", async () =>
  assertSucceeds(getDoc(doc(colab2(), `gamificacao/${ANO}/pontos/uColab`))));
test("ranking: query top 10 (orderBy total desc limit 10) e provavel", async () =>
  assertSucceeds(getDocs(query(collection(colab2(), `gamificacao/${ANO}/pontos`), orderBy("total", "desc"), limit(10)))));
test("extrato: dono le os proprios eventos", async () =>
  assertSucceeds(getDoc(doc(colab(), `gamificacao/${ANO}/pontos/uColab/eventos/comunicado_com1`))));
test("extrato: list dos proprios eventos e provavel (getDocs)", async () =>
  assertSucceeds(getDocs(collection(colab(), `gamificacao/${ANO}/pontos/uColab/eventos`))));
test("extrato: OUTRO colab NAO le", async () =>
  assertFails(getDoc(doc(colab2(), `gamificacao/${ANO}/pontos/uColab/eventos/comunicado_com1`))));
test("extrato: RH (cap) le", async () =>
  assertSucceeds(getDoc(doc(rh(), `gamificacao/${ANO}/pontos/uColab/eventos/comunicado_com1`))));
test("evento e imutavel (nem RH edita, ninguem deleta)", async () => {
  await assertFails(updateDoc(doc(rh(), `gamificacao/${ANO}/pontos/uColab/eventos/comunicado_com1`), { pontos: 50 }));
  await assertFails(deleteDoc(doc(colab(), `gamificacao/${ANO}/pontos/uColab/eventos/comunicado_com1`)));
});

// ---------- Entregas ----------
test("RH registra entrega (id uid_marco, shape fechado)", async () =>
  assertSucceeds(setDoc(doc(rh(), `gamificacao/${ANO}/entregas/uColab_25`), { uid: "uColab", marco: 25, premio: "Caneca da firma", em: TS(), porUid: "uRh" })));
test("colab NAO registra entrega", async () =>
  assertFails(setDoc(doc(colab(), `gamificacao/${ANO}/entregas/uColab_50`), { uid: "uColab", marco: 50, premio: "Brinde", em: TS(), porUid: "uColab" })));
test("entrega com id trocado NEGA", async () =>
  assertFails(setDoc(doc(rh(), `gamificacao/${ANO}/entregas/uColab_99`), { uid: "uColab", marco: 50, premio: "Brinde", em: TS(), porUid: "uRh" })));
test("entrega com campo extra NEGA", async () =>
  assertFails(setDoc(doc(rh(), `gamificacao/${ANO}/entregas/uColab2_25`), { uid: "uColab2", marco: 25, premio: "Caneca", em: TS(), porUid: "uRh", cpf: "x" })));
test("dono le a propria entrega (premio revelado)", async () =>
  assertSucceeds(getDoc(doc(colab(), `gamificacao/${ANO}/entregas/uColab_25`))));
test("OUTRO colab NAO le entrega alheia", async () =>
  assertFails(getDoc(doc(colab2(), `gamificacao/${ANO}/entregas/uColab_25`))));
test("query 'minhas entregas' (where uid ==) e provavel", async () =>
  assertSucceeds(getDocs(query(collection(colab(), `gamificacao/${ANO}/entregas`), where("uid", "==", "uColab")))));
test("entrega e imutavel; delete so admin", async () => {
  await assertFails(updateDoc(doc(rh(), `gamificacao/${ANO}/entregas/uColab_25`), { premio: "Outro" }));
  await assertFails(deleteDoc(doc(rh(), `gamificacao/${ANO}/entregas/uColab_25`)));
  await assertSucceeds(deleteDoc(doc(admin(), `gamificacao/${ANO}/entregas/uSeed_25`)));
});

// ---------- Streak de presenca (5 dias seguidos = pontos) ----------
const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
// chave canonica derivada do ULTIMODIA gravado (meia-noite local), igual ao cliente e
// a regra (derivar de "agora" abriria double-claim na virada UTC, gate delta 4)
const diaUTC = () => { const h = hoje0(); return `${h.getUTCFullYear()}-${h.getUTCMonth() + 1}-${h.getUTCDate()}`; };
test("presenca: 1o dia cria com dias=1 e ultimoDia HOJE", async () =>
  assertSucceeds(setDoc(doc(colab(), `gamificacao/${ANO}/presenca/uColab`), { dias: 1, ultimoDia: hoje0() })));
test("presenca: criar com dias != 1 NEGA", async () =>
  assertFails(setDoc(doc(colab2(), `gamificacao/${ANO}/presenca/uColab2`), { dias: 5, ultimoDia: hoje0() })));
test("presenca: marcar dia FUTURO nega (nao e hoje)", async () => {
  const amanha = new Date(hoje0().getTime() + 24 * 3600e3);
  await assertFails(setDoc(doc(colab2(), `gamificacao/${ANO}/presenca/uColab2`), { dias: 1, ultimoDia: amanha }));
});
test("presenca: dia seguinte soma +1 (seed de ontem)", async () => {
  const ontem = new Date(hoje0().getTime() - 24 * 3600e3);
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `gamificacao/${ANO}/presenca/uColab2`), { dias: 4, ultimoDia: ontem });
  });
  await assertSucceeds(updateDoc(doc(colab2(), `gamificacao/${ANO}/presenca/uColab2`), { dias: 5, ultimoDia: hoje0() }));
});
test("presenca: pular dias e MANTER a soma nega (tem que resetar pra 1)", async () => {
  const tresAtras = new Date(hoje0().getTime() - 3 * 24 * 3600e3);
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `gamificacao/${ANO}/presenca/uSeed2`), { dias: 7, ultimoDia: tresAtras });
  });
  const dbx = env.authenticatedContext("uSeed2").firestore();
  await assertFails(updateDoc(doc(dbx, `gamificacao/${ANO}/presenca/uSeed2`), { dias: 8, ultimoDia: hoje0() }));
  await assertSucceeds(updateDoc(doc(dbx, `gamificacao/${ANO}/presenca/uSeed2`), { dias: 1, ultimoDia: hoje0() }));
});
test("presenca de OUTRO uid NEGA", async () =>
  assertFails(setDoc(doc(colab(), `gamificacao/${ANO}/presenca/uColab2`), { dias: 1, ultimoDia: hoje0() })));
test("streak: claim no multiplo de 5 PASSA (uColab2 esta com dias=5 hoje)", async () =>
  assertSucceeds(ganhaPonto(colab2(), "uColab2", "streak", diaUTC(), 1, { nome: "Ana" })));
test("streak: refId que nao e o dia canonico NEGA", async () =>
  assertFails(ganhaPonto(colab2(), "uColab2", "streak", "2026-1-1", 1, { nome: "Ana", total: 2 })));
test("streak: dias fora do multiplo de 5 NEGA (uColab esta com dias=1)", async () =>
  assertFails(ganhaPonto(colab(), "uColab", "streak", diaUTC(), 1, { placarDe: 29 })));

// ---------- Foto denormalizada no placar (ranking com foto; autorizacao dada) ----------
test("placar re-sincroniza foto SEM evento (igualdade com users.fotoBase64)", async () =>
  assertSucceeds(updateDoc(doc(colab(), `gamificacao/${ANO}/pontos/uColab`), { foto: "data:image/png;base64,AAA" })));
test("foto spoof no placar NEGA (!= users.fotoBase64)", async () =>
  assertFails(updateDoc(doc(colab(), `gamificacao/${ANO}/pontos/uColab`), { foto: "data:image/png;base64,OUTRA" })));

// ---------- Decoracao denormalizada no placar (aro visivel no ranking) ----------
test("placar re-sincroniza decoracao SEM evento (apos equipar)", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), "users/uColab"), { decoracao: "ouro" });
  });
  await assertSucceeds(updateDoc(doc(colab(), `gamificacao/${ANO}/pontos/uColab`), { decoracao: "ouro" }));
});
test("decoracao spoof no placar NEGA (!= users.decoracao)", async () =>
  assertFails(updateDoc(doc(colab(), `gamificacao/${ANO}/pontos/uColab`), { decoracao: "fio" })));
test("re-sincronizacao cosmetica NAO toca o total", async () =>
  assertFails(updateDoc(doc(colab(), `gamificacao/${ANO}/pontos/uColab`), { decoracao: "ouro", total: 999 })));

// ---------- Decoracao do avatar (users self-update, cosmetico) ----------
test("colab equipa decoracao valida no proprio user", async () =>
  assertSucceeds(updateDoc(doc(colab(), "users/uColab"), { decoracao: "ouro" })));
test("decoracao fora da lista NEGA", async () =>
  assertFails(updateDoc(doc(colab(), "users/uColab"), { decoracao: "hacker" })));
test("decoracao junto de role NEGA (hasOnly)", async () =>
  assertFails(updateDoc(doc(colab(), "users/uColab"), { decoracao: "ouro", role: "admin" })));
test("colab NAO equipa decoracao de OUTRO user", async () =>
  assertFails(updateDoc(doc(colab2(), "users/uColab"), { decoracao: "bronze" })));

// ---------- Temporada inativa (mutacao no FIM: flip ativa=false) ----------
test("temporada INATIVA nega evento mesmo com prova valida", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), `gamificacao/${ANO}`), { ativa: false });
  });
  await assertFails(ganhaPonto(colab2(), "uColab2", "comunicado", "com2", 1, { nome: "Ana" }));
});

// Anti-auto em dupla (upgrade 2026-07-15): id igual nega mesmo com nome diferente
const POST_BV_AUTO_ID = `bv-apelido-diferente-${ANO}`;
test("anti-auto por funcionarioId: pai com MEU id nega mesmo com nome divergente", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `muralAniversario/${POST_BV_AUTO_ID}`), { tipo: "bemvindo", nome: "Apelido Diferente", funcionarioId: "f-1", admissao: `${ANO}-07-01` });
  });
  await assertFails(ganhaPontoMural(colab(), "uColab", "boas-vindas", POST_BV_AUTO_ID, 1));
});
test("pai SEM funcionarioId (legado pre-poda) nega o claim (fail-closed)", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `muralAniversario/bv-legado-${ANO}`), { tipo: "bemvindo", nome: "Legado Sem Id", admissao: `${ANO}-07-01` });
  });
  await assertFails(ganhaPontoMural(colab(), "uColab", "boas-vindas", `bv-legado-${ANO}`, 1));
});

// ---------- Probes do gate Fable 2026-07-15 (promovidas da sonda adversarial) ----------
test("PROBE gate: cliente NAO forja o doc pai do mural", async () =>
  assertFails(setDoc(doc(colab(), `muralAniversario/aniv-hack-${ANO}`), { tipo: "aniversario", nome: "Hack", dia: 1, mes: 1, ano: Number(ANO) })));
test("PROBE gate: claim com a reacao DELETADA no mesmo batch NEGA (getAfter fail-closed)", async () => {
  const db = env.authenticatedContext("uColab3").firestore();
  const b = writeBatch(db);
  b.delete(doc(db, `muralAniversario/${POST_CORACAO}/reacoes/uColab3`));
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab3/eventos/coracao_${POST_CORACAO}`), { acao: "coracao", refId: POST_CORACAO, pontos: 1, em: TS() });
  b.set(doc(db, `gamificacao/${ANO}/pontos/uColab3`), { nome: "Bia", ultimoEvento: `coracao_${POST_CORACAO}`, total: 1 });
  await assertFails(b.commit());
});
