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
    // Doc v3 LEGADO (shape antigo, sem os campos novos): prova que docs criados antes
    // da ficha completa seguem legiveis/deletaveis pela GP mesmo com o create novo mais rigido.
    await setDoc(doc(db, "candidaturas/vCand__legado@mail.com"), {
      vagaId: "vCand", vagaTitulo: "Tecelão", nome: "Candidato Legado", telefone: "47900001111",
      email: "legado@mail.com", mensagem: "form antigo", em: new Date(), status: "nova",
    });
    // Funil de status (fase 1): docs com status 'nova' (como o site grava) pra provar que a
    // GP MOVE o status pelos 4 valores do enum. 'mover' e reusado em toda a bateria de move;
    // 'legmover' fica intocado ate o teste de legado subir do 'nova' pro enum novo.
    await setDoc(doc(db, "candidaturas/vCand__mover@mail.com"), {
      vagaId: "vCand", vagaTitulo: "Tecelão", nome: "Candidato Mover", telefone: "47922223333",
      email: "mover@mail.com", mensagem: "", em: new Date(), status: "nova",
    });
    await setDoc(doc(db, "candidaturas/vCand__legmover@mail.com"), {
      vagaId: "vCand", vagaTitulo: "Tecelão", nome: "Candidato Legado Mover", telefone: "47933334444",
      email: "legmover@mail.com", mensagem: "", em: new Date(), status: "nova",
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
// Ficha COMPLETA (v4, 2026-07-15): base = todos os campos obrigatorios, valida. Os
// testes negativos sobrescrevem UM campo pra isolar a violacao. curriculoPath e disc
// (teste de perfil) sao OPCIONAIS, so entram quando o teste os adiciona.
const exp = (o = {}) => ({
  empresa: "Tecelagem Malhas SC", admissao: "2019-03-04", demissao: "2023-08-18",
  salario: 1850, motivoSaida: "Dispensa sem justa causa", ...o,
});
const cand = (o = {}) => ({
  vagaId: "vCand", vagaTitulo: "Tecelão", nome: "Ana Souza", telefone: "47999998888",
  email: "ana@mail.com", mensagem: "Tenho experiência com máquinas.", em: TS(), status: "nova",
  nascimento: "1994-03-12", estadoCivil: "solteiro", escolaridade: "medio-completo",
  filhos: 2, endereco: "Rua das Palmeiras, 240, Warnow, Indaial SC",
  nacionalidade: "Brasileira", naturalidade: "Blumenau, SC",
  experiencias: [], pretensaoSalarial: 2200, comoViria: "moto", indicacao: "",
  ...o,
});
// Shape v3 ANTIGO (sem os campos novos obrigatorios): usado so pra provar que o create
// novo passou a NEGAR o formulario velho.
const candV3 = (o = {}) => ({
  vagaId: "vCand", vagaTitulo: "Tecelão", nome: "Ana Souza", telefone: "47999998888",
  email: "ana@mail.com", mensagem: "", em: TS(), status: "nova", ...o,
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
// ---------- FUNIL DE STATUS (fase 1, 2026-07-16): GP move a candidatura ----------
// update NOVO: gpCand troca SO o status, e so pra um dos 4 valores do funil. O resto do
// cadastro (PII) segue imutavel. Docs legados (status 'nova' do site) sobem pro enum novo.
test("GP move status: cada valor do enum passa (nova -> recebida -> em-analise -> aprovada -> contratada -> nao-seguiu)", async () => {
  await assertSucceeds(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "recebida" }));
  await assertSucceeds(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "em-analise" }));
  await assertSucceeds(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "aprovada" }));
  await assertSucceeds(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "contratada" }));
  await assertSucceeds(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "nao-seguiu" }));
});
// contratada (v383): status novo do funil, mesma liberdade dos outros (any -> any).
test("GP move aprovada -> contratada PASSA (status novo v383)", async () => {
  await assertSucceeds(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "aprovada" }));
  await assertSucceeds(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "contratada" }));
});
test("contratada JUNTO de outro campo NEGA (hasOnly status, PII imutavel na transicao)", async () =>
  assertFails(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "contratada", nome: "Hacker" })));
test("GP move status: admin tambem move", async () =>
  assertSucceeds(updateDoc(doc(admin(), "candidaturas/vCand__mover@mail.com"), { status: "recebida" })));
test("status fora do enum NEGA (ex.: 'vista')", async () =>
  assertFails(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "vista" })));
test("status legado 'nova' de VOLTA no update NEGA (nao e valor do funil)", async () =>
  assertFails(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "nova" })));
test("mudar status JUNTO de outro campo NEGA (hasOnly status, PII imutavel)", async () =>
  assertFails(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { status: "aprovada", nome: "Hacker" })));
test("update que NAO mexe em status (so outro campo) NEGA", async () =>
  assertFails(updateDoc(doc(rh(), "candidaturas/vCand__mover@mail.com"), { nome: "Outro Nome" })));
test("COLABORADOR NAO move status", async () =>
  assertFails(updateDoc(doc(colab(), "candidaturas/vCand__mover@mail.com"), { status: "aprovada" })));
test("ANONIMO NAO move status", async () =>
  assertFails(updateDoc(doc(anon(), "candidaturas/vCand__mover@mail.com"), { status: "aprovada" })));
test("LEGADO (status 'nova' do site) segue legivel e SOBE pro enum novo", async () => {
  await assertSucceeds(getDoc(doc(rh(), "candidaturas/vCand__legmover@mail.com")));
  await assertSucceeds(updateDoc(doc(rh(), "candidaturas/vCand__legmover@mail.com"), { status: "em-analise" }));
});

// ---------- FICHA COMPLETA v4 (2026-07-15: dados da GP + experiencias + adicionais) ----------
test("candidatura COMPLETA (base + disc + curriculo) passa", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("completa@mail.com")), cand({
    email: "completa@mail.com",
    nascimento: "1992-03-14",
    disc: { d: 5, i: -2, s: -3, c: 0 },
    discPrimario: "D",
    curriculoPath: "curriculos/vCand__ana@mail.com__a1b2c3.pdf",
  }))));
test("RETROCOMPAT: shape v3 ANTIGO (sem os campos novos) NEGA no create novo", async () =>
  assertFails(setDoc(doc(anon(), cid("v3antigo@mail.com")), candV3({ email: "v3antigo@mail.com" }))));
test("RETROCOMPAT: doc v3 LEGADO (seed) segue legivel e deletavel pela GP", async () => {
  await assertSucceeds(getDoc(doc(rh(), "candidaturas/vCand__legado@mail.com")));
  await assertSucceeds(deleteDoc(doc(rh(), "candidaturas/vCand__legado@mail.com")));
});
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

// ----- Ficha completa: happy paths (com/sem experiencias e curriculo) -----
test("FELIZ: ficha completa SEM experiencias (primeiro emprego) e sem curriculo passa", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("feliz1@mail.com")), cand({ email: "feliz1@mail.com", experiencias: [] }))));
test("FELIZ: ficha com 3 experiencias passa", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("feliz3@mail.com")), cand({
    email: "feliz3@mail.com",
    experiencias: [exp(), exp({ empresa: "Supermercado Bom Preço", motivoSaida: "Pedido de demissão" }), exp({ empresa: "Malharia Sul" })],
  }))));
test("FELIZ: ficha com 1 experiencia + curriculo passa", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("feliz1c@mail.com")), cand({
    email: "feliz1c@mail.com",
    experiencias: [exp()],
    curriculoPath: "curriculos/vCand__feliz1c@mail.com__z9.pdf",
  }))));

// ----- Enums obrigatorios: valor invalido NEGA -----
test("estadoCivil fora da lista nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ec1@mail.com")), cand({ email: "ec1@mail.com", estadoCivil: "amigado" }))));
test("escolaridade fora da lista nega", async () =>
  assertFails(setDoc(doc(anon(), cid("esc1@mail.com")), cand({ email: "esc1@mail.com", escolaridade: "doutorado" }))));
test("comoViria fora da lista nega", async () =>
  assertFails(setDoc(doc(anon(), cid("cv1@mail.com")), cand({ email: "cv1@mail.com", comoViria: "helicoptero" }))));

// ----- filhos (int 0..20) -----
test("filhos negativo nega", async () =>
  assertFails(setDoc(doc(anon(), cid("fi1@mail.com")), cand({ email: "fi1@mail.com", filhos: -1 }))));
test("filhos acima de 20 nega", async () =>
  assertFails(setDoc(doc(anon(), cid("fi2@mail.com")), cand({ email: "fi2@mail.com", filhos: 21 }))));
test("filhos nao-inteiro nega", async () =>
  assertFails(setDoc(doc(anon(), cid("fi3@mail.com")), cand({ email: "fi3@mail.com", filhos: 2.5 }))));
test("filhos zero passa (nao tem filhos)", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("fi4@mail.com")), cand({ email: "fi4@mail.com", filhos: 0 }))));

// ----- endereco / nacionalidade / naturalidade -----
test("endereco vazio nega", async () =>
  assertFails(setDoc(doc(anon(), cid("en1@mail.com")), cand({ email: "en1@mail.com", endereco: "" }))));
test("endereco acima de 200 nega", async () =>
  assertFails(setDoc(doc(anon(), cid("en2@mail.com")), cand({ email: "en2@mail.com", endereco: "x".repeat(201) }))));
test("nacionalidade acima de 60 nega", async () =>
  assertFails(setDoc(doc(anon(), cid("na1@mail.com")), cand({ email: "na1@mail.com", nacionalidade: "x".repeat(61) }))));
test("naturalidade vazia nega", async () =>
  assertFails(setDoc(doc(anon(), cid("na2@mail.com")), cand({ email: "na2@mail.com", naturalidade: "" }))));

// ----- nascimento agora OBRIGATORIO -----
test("nascimento AUSENTE nega (virou obrigatorio)", async () => {
  const c = cand({ email: "nasc2@mail.com" });
  delete c.nascimento;
  await assertFails(setDoc(doc(anon(), cid("nasc2@mail.com")), c));
});

// ----- indicacao (string 0..80, obrigatoria mas pode ser vazia) -----
test("indicacao vazia passa (nao conhece ninguem)", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("in1@mail.com")), cand({ email: "in1@mail.com", indicacao: "" }))));
test("indicacao acima de 80 nega", async () =>
  assertFails(setDoc(doc(anon(), cid("in2@mail.com")), cand({ email: "in2@mail.com", indicacao: "x".repeat(81) }))));
test("indicacao AUSENTE nega (chave obrigatoria)", async () => {
  const c = cand({ email: "in3@mail.com" });
  delete c.indicacao;
  await assertFails(setDoc(doc(anon(), cid("in3@mail.com")), c));
});

// ----- pretensaoSalarial (number 0 < x <= 1000000) -----
test("pretensaoSalarial zero nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ps1@mail.com")), cand({ email: "ps1@mail.com", pretensaoSalarial: 0 }))));
test("pretensaoSalarial acima de 1M nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ps2@mail.com")), cand({ email: "ps2@mail.com", pretensaoSalarial: 1000001 }))));
test("pretensaoSalarial nao-number nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ps3@mail.com")), cand({ email: "ps3@mail.com", pretensaoSalarial: "2200" }))));

// ----- experiencias: cardinalidade e shape por item -----
test("experiencias com 4 itens nega (max 3)", async () =>
  assertFails(setDoc(doc(anon(), cid("ex1@mail.com")), cand({ email: "ex1@mail.com", experiencias: [exp(), exp(), exp(), exp()] }))));
test("experiencia com campo EXTRA nega (hasOnly do item)", async () =>
  assertFails(setDoc(doc(anon(), cid("ex2@mail.com")), cand({ email: "ex2@mail.com", experiencias: [exp({ cargo: "operador" })] }))));
test("experiencia com salario fora do range nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ex3@mail.com")), cand({ email: "ex3@mail.com", experiencias: [exp({ salario: 0 })] }))));
test("experiencia com salario nao-number nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ex4@mail.com")), cand({ email: "ex4@mail.com", experiencias: [exp({ salario: "1850" })] }))));
test("experiencia com data invalida nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ex5@mail.com")), cand({ email: "ex5@mail.com", experiencias: [exp({ admissao: "03/2019" })] }))));
test("experiencia com empresa vazia nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ex6@mail.com")), cand({ email: "ex6@mail.com", experiencias: [exp({ empresa: "" })] }))));
test("experiencia com motivoSaida acima de 120 nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ex7@mail.com")), cand({ email: "ex7@mail.com", experiencias: [exp({ motivoSaida: "x".repeat(121) })] }))));
test("experiencia com chave FALTANDO nega (item incompleto)", async () => {
  const e = exp();
  delete e.demissao;
  await assertFails(setDoc(doc(anon(), cid("ex8@mail.com")), cand({ email: "ex8@mail.com", experiencias: [e] })));
});
test("experiencias nao-lista nega", async () =>
  assertFails(setDoc(doc(anon(), cid("ex9@mail.com")), cand({ email: "ex9@mail.com", experiencias: "nenhuma" }))));
test("segunda experiencia invalida nega (validacao por indice, nao so a primeira)", async () =>
  assertFails(setDoc(doc(anon(), cid("ex10@mail.com")), cand({ email: "ex10@mail.com", experiencias: [exp(), exp({ salario: -5 })] }))));

// ----- demissao: '' = EMPREGO ATUAL (nao inventa data de saida); lixo segue negado -----
// A chave demissao continua OBRIGATORIA no shape (hasOnly + is string); so o VALOR ganha
// o caso vazio. Emprego atual: candidato ainda trabalha na empresa (William, smoke 2026-07-15).
test("demissao '' PASSA (emprego atual)", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("dm1@mail.com")), cand({ email: "dm1@mail.com", experiencias: [exp({ demissao: "" })] }))));
test("demissao '' na 2a experiencia PASSA (validacao por indice)", async () =>
  assertSucceeds(setDoc(doc(anon(), cid("dm2@mail.com")), cand({ email: "dm2@mail.com", experiencias: [exp(), exp({ demissao: "" })] }))));
test("demissao com lixo textual ('hoje') NEGA (nao e '' nem casa a shape)", async () =>
  assertFails(setDoc(doc(anon(), cid("dm3@mail.com")), cand({ email: "dm3@mail.com", experiencias: [exp({ demissao: "hoje" })] }))));
test("demissao com barras ('2023/08/18') NEGA (formato invalido)", async () =>
  assertFails(setDoc(doc(anon(), cid("dm4@mail.com")), cand({ email: "dm4@mail.com", experiencias: [exp({ demissao: "2023/08/18" })] }))));
test("demissao com digito faltando ('2026-13-9') NEGA (shape 4-2-2 nao casa)", async () =>
  assertFails(setDoc(doc(anon(), cid("dm5@mail.com")), cand({ email: "dm5@mail.com", experiencias: [exp({ demissao: "2026-13-9" })] }))));
// chave demissao AUSENTE ja e negada em "experiencia com chave FALTANDO nega" (ex8, delete e.demissao):
// vazio ('') e permitido, mas a chave TEM de existir e ser string.

// ---------- Catalogo de beneficios em config/vagas ----------
test("config com beneficiosCatalogo (lista de strings) passa", async () =>
  assertSucceeds(setDoc(doc(rh(), "config/vagas"), {
    whatsapp: "+5547988887777",
    beneficiosCatalogo: ["Vale alimentação", "Vale transporte", "Plano de saúde"],
  })));
test("config com beneficiosCatalogo vazio passa", async () =>
  assertSucceeds(setDoc(doc(rh(), "config/vagas"), { whatsapp: "+55479", beneficiosCatalogo: [] })));
test("config beneficiosCatalogo com item acima de 40 nega", async () =>
  assertFails(setDoc(doc(rh(), "config/vagas"), { whatsapp: "+55479", beneficiosCatalogo: ["x".repeat(41)] })));
test("config beneficiosCatalogo com item vazio nega", async () =>
  assertFails(setDoc(doc(rh(), "config/vagas"), { whatsapp: "+55479", beneficiosCatalogo: [""] })));
test("config beneficiosCatalogo com item nao-string nega", async () =>
  assertFails(setDoc(doc(rh(), "config/vagas"), { whatsapp: "+55479", beneficiosCatalogo: ["ok", 123] })));
test("config beneficiosCatalogo nao-lista nega", async () =>
  assertFails(setDoc(doc(rh(), "config/vagas"), { whatsapp: "+55479", beneficiosCatalogo: "Vale" })));
test("config beneficiosCatalogo com 31 itens nega (max 30)", async () =>
  assertFails(setDoc(doc(rh(), "config/vagas"), {
    whatsapp: "+55479",
    beneficiosCatalogo: Array.from({ length: 31 }, (_, i) => "Ben " + i),
  })));
test("config beneficiosCatalogo com 30 itens passa (limite)", async () =>
  assertSucceeds(setDoc(doc(rh(), "config/vagas"), {
    whatsapp: "+55479",
    beneficiosCatalogo: Array.from({ length: 30 }, (_, i) => "Ben " + i),
  })));
test("config com campo estranho ALEM do catalogo nega (shape-lock)", async () =>
  assertFails(setDoc(doc(rh(), "config/vagas"), { whatsapp: "+55479", beneficiosCatalogo: ["ok"], dump: "lixo" })));

// ---------- beneficios por vaga (shape-only, <=15) ----------
test("RH cria rascunho com beneficios (lista de strings) passa", async () =>
  assertSucceeds(setDoc(doc(rh(), "vagas/vBen"), vaga({
    criadoEm: TS(),
    beneficios: ["Vale alimentação", "Plano de saúde", "Seguro de vida"],
  }))));
test("vaga com beneficios vazio passa", async () =>
  assertSucceeds(setDoc(doc(rh(), "vagas/vBenVazio"), vaga({ criadoEm: TS(), beneficios: [] }))));
test("vaga com 16 beneficios nega (max 15)", async () =>
  assertFails(setDoc(doc(rh(), "vagas/vBen16"), vaga({
    criadoEm: TS(),
    beneficios: Array.from({ length: 16 }, (_, i) => "Ben " + i),
  }))));
test("vaga com beneficio acima de 40 nega", async () =>
  assertFails(setDoc(doc(rh(), "vagas/vBenLong"), vaga({ criadoEm: TS(), beneficios: ["x".repeat(41)] }))));
test("vaga com beneficio nao-string nega", async () =>
  assertFails(setDoc(doc(rh(), "vagas/vBenNum"), vaga({ criadoEm: TS(), beneficios: [42] }))));
test("vaga com beneficios nao-lista nega", async () =>
  assertFails(setDoc(doc(rh(), "vagas/vBenStr"), vaga({ criadoEm: TS(), beneficios: "Vale" }))));
