const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');

const PHONE_NUMBER_ID = '1230898980101128';
// Graph API v25 (a Meta ja opera nela); templates com parameter_name sao estaveis v23->v25.
const GRAPH_URL = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
const TIMEOUT_MS = 10000;

const TEMPLATES = [
  'candidatura_recebida',
  'candidatura_em_analise',
  'candidatura_aprovada',
  'candidatura_nao_seguiu',
];

// Valida o shape do doc de forma defensiva (o Admin SDK ignora as rules, entao
// a porta de conteudo vive aqui). Retorna motivo curto ou null se OK.
function motivoInvalido(d) {
  if (!d || typeof d !== 'object') return 'doc vazio';
  if (typeof d.template !== 'string' || !TEMPLATES.includes(d.template)) return 'template invalido';
  if (typeof d.para !== 'string') return 'para ausente';
  const dig = d.para.replace(/\D/g, '');
  if (dig.length < 8 || dig.length > 20) return 'telefone invalido';
  if (!d.params || typeof d.params !== 'object') return 'params ausente';
  if (typeof d.params.nome !== 'string' || d.params.nome.length < 1) return 'nome invalido';
  if (typeof d.params.vaga !== 'string' || d.params.vaga.length < 1) return 'vaga invalido';
  return null;
}

exports.enviarWaMsg = onDocumentCreated(
  {
    document: 'waMsg/{id}',
    region: 'us-central1',
    secrets: [WHATSAPP_TOKEN],
    retry: false,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const ref = snap.ref;
    const docId = event.params.id;

    // Idempotencia: evento e at-least-once. Claim transacional -- so prossegue
    // quem gravar delivery.state=PROCESSING num doc que ainda nao tem delivery.
    // Espelha o padrao da extensao de email; quem perde a corrida sai quieto.
    let data;
    try {
      data = await db.runTransaction(async (tx) => {
        const cur = await tx.get(ref);
        if (!cur.exists) return null;
        const d = cur.data();
        if (d.delivery) return null;
        tx.update(ref, { delivery: { state: 'PROCESSING', em: FieldValue.serverTimestamp() } });
        return d;
      });
    } catch (e) {
      logger.error('waMsg claim falhou', { docId });
      return;
    }
    if (!data) return;

    const motivo = motivoInvalido(data);
    if (motivo) {
      await ref.update({ delivery: { state: 'ERROR', em: FieldValue.serverTimestamp(), erro: motivo } });
      logger.warn('waMsg descartado', { docId, state: 'ERROR' });
      return;
    }

    // to: so digitos + DDI. Candidato do EXTERIOR (William 24/07): '+' ou '00'
    // no inicio = o candidato ESCOLHEU o DDI, respeitar como esta (E.164), nunca
    // prefixar 55. Sem esse sinal, heuristica BR de sempre: sem DDI o numero tem
    // 10-11 digitos, com DDI 55 tem 12-13; discriminar por comprimento, senao
    // DDD 55 (Santa Maria RS) seria confundido com DDI e ficaria sem prefixo.
    const raw = String(data.para).trim();
    const dig = raw.replace(/\D/g, '');
    const to = raw.startsWith('+') ? dig
      : dig.startsWith('00') ? dig.slice(2)
      : (dig.length >= 12 && dig.startsWith('55')) ? dig : '55' + dig;

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: data.template,
        language: { code: 'pt_BR' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', parameter_name: 'nome', text: data.params.nome },
              { type: 'text', parameter_name: 'vaga', text: data.params.vaga },
            ],
          },
        ],
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let resp;
    let json;
    try {
      resp = await fetch(GRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WHATSAPP_TOKEN.value()}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      json = await resp.json().catch(() => ({}));
    } catch (e) {
      const erro = (e && e.name === 'AbortError') ? 'timeout 10s' : ('rede: ' + ((e && e.message) || 'erro')).slice(0, 200);
      await ref.update({ delivery: { state: 'ERROR', em: FieldValue.serverTimestamp(), erro, tentativas: 1 } });
      logger.error('waMsg envio falhou', { docId, state: 'ERROR' });
      return;
    } finally {
      clearTimeout(timer);
    }

    if (!resp.ok) {
      const metaMsg = (json && json.error && json.error.message) ? json.error.message : 'sem detalhe';
      const erro = (`http ${resp.status}: ${metaMsg}`).slice(0, 200);
      await ref.update({ delivery: { state: 'ERROR', em: FieldValue.serverTimestamp(), erro, tentativas: 1 } });
      logger.error('waMsg envio rejeitado', { docId, state: 'ERROR', status: resp.status });
      return;
    }

    const wamid = (json && json.messages && json.messages[0] && json.messages[0].id) || null;
    await ref.update({ delivery: { state: 'SENT', em: FieldValue.serverTimestamp(), wamid } });
    logger.info('waMsg enviado', { docId, state: 'SENT' });
  }
);

// ===== EXPURGO LGPD de candidaturas (agendado) =====
// Espelho SERVER-SIDE da varredura window.expurgarCandidaturasVencidas (public/firebase.js
// ~2145), que hoje so roda quando a GP abre a tela Vagas. Esta versao diaria cumpre a
// promessa de consentimento do site ("guardamos por ate 6 meses e depois apagamos
// automaticamente") sem depender de ninguem lembrar de abrir o app. A varredura do FRONT
// CONTINUA existindo; as duas sao idempotentes e convergem no mesmo estado.
//
// Semantica identica ao canonico window.excluirCandidatura (firebase.js ~2041): condicao
// = vaga ENCERRADA cujo encerradaEm ja passou de 6 meses; ordem = OBJETO do curriculo no
// cofre ANTES do doc da candidatura; arquivo ja ausente NAO bloqueia (o Firestore e a fonte
// de verdade do "existe"). LEVA JUNTO os irmaos do funil (/mail e /waMsg) pelo id conhecido:
// a paridade "nao toca irmaos" DEIXOU de valer (decisao William 23/07, "arrumar e deixar
// perfeito"); o cliente (excluirCandidatura) ganha o mesmo num release futuro.
//
// ZERO PII nos logs: o id da candidatura ({vagaId}__{email}) e o curriculoPath CARREGAM o
// email do candidato; so logamos id de vaga (id aleatorio do Firestore) e contagens.
const EXPURGO_CAND_MESES = 6; // espelha EXPURGO_CAND_MESES do front; janela de guarda LGPD
// Mesmo bucket do web SDK (public/firebase.config.js). Pinado de proposito: o default do
// Admin SDK em Functions resolveria pra <projeto>.appspot.com, e os curriculos vivem no
// bucket .firebasestorage.app, entao o delete tem que apontar pra ca.
const CURRICULOS_BUCKET = 'ocorr-ponto.firebasestorage.app';

// Irmaos do funil que uma candidatura dispara: os avisos enfileirados em /mail e /waMsg pelo
// id da candidatura (mesma raiz + sufixo de status). A 'recebida' e o proprio id (sem sufixo);
// os 3 status com mensagem viram sufixo. Tokens do MAIL sao HIFENIZADOS (em-analise/aprovada/
// nao-seguiu); os do waMsg em UNDERSCORE (em_analise/aprovada/nao_seguiu) — espelham o wiring do
// funil em public/firebase.js (atualizarStatusCandidatura). Deletes idempotentes: doc ausente =
// no-op (Firestore), entao apagar um funil incompleto (nem todo status disparou) e seguro.
async function apagarIrmaosFunil(candId) {
  const mailIds = [candId, `${candId}-em-analise`, `${candId}-aprovada`, `${candId}-nao-seguiu`];
  const waIds = [candId, `${candId}-em_analise`, `${candId}-aprovada`, `${candId}-nao_seguiu`];
  await Promise.all([
    ...mailIds.map((id) => db.collection('mail').doc(id).delete()),
    ...waIds.map((id) => db.collection('waMsg').doc(id).delete()),
  ]);
}

exports.expurgarCandidaturasVencidas = onSchedule(
  {
    schedule: 'every day 03:15',
    timeZone: 'America/Sao_Paulo',
    region: 'us-central1',
  },
  async () => {
    const corte = new Date();
    corte.setMonth(corte.getMonth() - EXPURGO_CAND_MESES); // 6 meses atras (mesma fronteira do front)
    const corteMs = corte.getTime();

    // encerradaEm chega como Timestamp; defensivo pra string/numero tambem (igual ao front).
    // Sem data valida = nao expurga (nao sabe quando encerrou).
    const encMs = (data) => {
      const e = data && data.encerradaEm;
      if (!e) return null;
      const d = (typeof e.toDate === 'function') ? e.toDate() : new Date(e);
      return isNaN(d.getTime()) ? null : d.getTime();
    };

    let vagasVarridas = 0;
    let candidaturasApagadas = 0;

    let vagasSnap;
    try {
      vagasSnap = await db.collection('vagas').where('status', '==', 'encerrada').get();
    } catch (e) {
      logger.error('expurgo: leitura de vagas falhou', { erro: (e && e.code) || 'erro' });
      return;
    }

    const bucket = admin.storage().bucket(CURRICULOS_BUCKET);

    for (const vagaDoc of vagasSnap.docs) {
      const ms = encMs(vagaDoc.data());
      if (ms == null || ms >= corteMs) continue; // sem data ou dentro da janela: intocada

      let candSnap;
      try {
        candSnap = await db.collection('candidaturas').where('vagaId', '==', vagaDoc.id).get();
      } catch (e) {
        logger.error('expurgo: leitura de candidaturas falhou', { vaga: vagaDoc.id, erro: (e && e.code) || 'erro' });
        continue;
      }
      if (candSnap.empty) continue;

      let ok = 0;
      for (const candDoc of candSnap.docs) {
        // try/catch por candidatura: uma falha nao derruba a varredura (as outras seguem).
        try {
          const path = candDoc.get('curriculoPath');
          if (typeof path === 'string' && path) {
            // Cofre ANTES do doc (ordem do canonico). QUALQUER erro do cofre e engolido aqui,
            // igual ao front: o doc sai mesmo assim (Firestore = fonte de verdade). ignoreNotFound
            // deixa o 404 (arquivo ja sumiu) silencioso = idempotente.
            try { await bucket.file(path).delete({ ignoreNotFound: true }); }
            catch (e) { logger.warn('expurgo: cofre nao apagou (segue mesmo assim)', { vaga: vagaDoc.id, erro: (e && e.code) || 'erro' }); }
          }
          await candDoc.ref.delete(); // Firestore delete e idempotente (doc ja ausente = ok)
          ok++;
          // Irmaos do funil (mail/waMsg) junto: a paridade "nao toca irmaos" caiu (William 23/07).
          // Best-effort e idempotente: uma falha aqui NAO desfaz o expurgo da candidatura. Honestidade:
          // como a candidatura ja saiu, a proxima rodada NAO reencontra estes irmaos; falha transitoria
          // nos 8 deletes deixa orfao raro (residual aceito no gate). ZERO PII no log: o id do
          // irmao carrega o email, entao so logo a vaga (id aleatorio) + codigo do erro.
          try { await apagarIrmaosFunil(candDoc.id); }
          catch (e) { logger.warn('expurgo: irmao do funil nao apagou (segue mesmo assim)', { vaga: vagaDoc.id, erro: (e && e.code) || 'erro' }); }
        } catch (e) {
          logger.warn('expurgo: pulou 1 candidatura', { vaga: vagaDoc.id, erro: (e && e.code) || 'erro' });
        }
      }
      candidaturasApagadas += ok;
      if (ok) { vagasVarridas++; logger.info('expurgo: vaga varrida', { vaga: vagaDoc.id, apagadas: ok }); }
    }

    logger.info('expurgo concluido', { vagasVarridas, candidaturasApagadas });
  }
);

// ===== RESET DE SENHA de colaborador pela GP (callable) =====
// Decisao de produto (William): colaboradores logam com CPF+senha; quando esquecem, a GP
// redefine pra uma senha TEMPORARIA e informa a pessoa (sem e-mail de reset, muitos nao tem).
//
// GATE server-side, NUNCA confia no cliente:
//  - caller autenticado E com papel que TEM func.editar (admin sempre; demais so se
//    can("func.editar") — MESMA semantica do can() do cliente, lida dos MESMOS docs:
//    users/{caller}.role + config/permissoes). func.editar ja gateia a edicao do cadastro do
//    funcionario (admin/RH por padrao), entao a superficie e a GP.
//  - alvo tem que existir E ser role 'colaborador' (users/{uid}); NUNCA redefine senha de
//    admin/gestao por este caminho (evita escalonamento). Alvo nao-colaborador = permission-denied.
//  - senha e TEMPORARIA: forca a troca no proximo acesso (precisaTrocarSenha=true, reusa o gate
//    mostrarTrocaSenha do portal do colaborador).
//  - trilha em /eventos (shape do window.logEvento; SEM a senha) e rate limit best-effort.
// ZERO PII nos logs: so papeis e contagens.

// Espelho do PERM_DEFAULT do cliente (public/app.js) SO pra cap que esta funcao usa. admin
// nunca entra (e sempre total). Bate com o default de hoje: so rh tem func.editar.
const FUNC_EDITAR_DEFAULT = { rh: true, lider: false, supervisor: false, colaborador: false };

// can() server-side = permEfetivo(role)['func.editar'], com o override de config/permissoes por
// cima do default (mesma composicao do cliente). "turno"/"atrib" contam como ter acesso (paridade).
function canFuncEditar(role, permOverrides) {
  if (!role) return false;
  if (role === 'admin') return true;
  const over = (permOverrides && permOverrides[role]) || {};
  const v = (over['func.editar'] !== undefined) ? over['func.editar'] : FUNC_EDITAR_DEFAULT[role];
  return v === true || v === 'turno' || v === 'atrib';
}

// Senha temporaria forte e legivel: Fio-XXXX-99 (4 letras + 2 digitos), sem caracteres ambiguos
// (0/O, 1/I/L). crypto.randomInt = fonte forte (nao Math.random). ~17,9M combinacoes; dura so ate
// a troca obrigatoria no proximo acesso.
const _SENHA_LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // sem I, L, O
const _SENHA_DIGITOS = '23456789';               // sem 0, 1
function gerarSenhaTemporaria() {
  let letras = '';
  for (let i = 0; i < 4; i++) letras += _SENHA_LETRAS[crypto.randomInt(_SENHA_LETRAS.length)];
  let num = '';
  for (let i = 0; i < 2; i++) num += _SENHA_DIGITOS[crypto.randomInt(_SENHA_DIGITOS.length)];
  return `Fio-${letras}-${num}`;
}

const RESET_LIMITE_DIA = 20; // max por caller por dia (anti-abuso, best-effort)

// Contador diario por caller em /rateLimits/{redefinirSenha__uid__YYYY-MM-DD}. Transacional
// (evita corrida). Best-effort: falha de INFRA do contador NAO bloqueia (so o estouro do limite
// propaga como resource-exhausted). Sobre o limite NAO incrementa mais (nao vaza contagem).
async function checarRateLimitReset(callerUid) {
  const dia = new Date().toISOString().slice(0, 10);
  const ref = db.collection('rateLimits').doc(`redefinirSenha__${callerUid}__${dia}`);
  try {
    const r = await db.runTransaction(async (tx) => {
      const cur = await tx.get(ref);
      const atual = (cur.exists && typeof cur.data().n === 'number') ? cur.data().n : 0;
      if (atual >= RESET_LIMITE_DIA) return { permitido: false };
      tx.set(ref, { n: atual + 1, dia, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
      return { permitido: true };
    });
    if (!r.permitido) throw new HttpsError('resource-exhausted', `Limite diario de ${RESET_LIMITE_DIA} redefinicoes atingido. Tente novamente amanha.`);
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.warn('reset senha: rate limit indisponivel (segue)', { erro: (e && e.code) || 'erro' });
  }
}

exports.redefinirSenhaColaborador = onCall(
  { region: 'us-central1' },
  async (request) => {
    const caller = request.auth;
    if (!caller || !caller.uid) throw new HttpsError('unauthenticated', 'Faca login novamente.');
    const alvoUid = request.data && request.data.uid;
    if (typeof alvoUid !== 'string' || !alvoUid) throw new HttpsError('invalid-argument', 'uid do colaborador ausente.');

    // ---- Autorizacao SERVER-SIDE (users/{caller} + config/permissoes) ----
    let callerData;
    try {
      const callerSnap = await db.collection('users').doc(caller.uid).get();
      if (!callerSnap.exists) throw new HttpsError('permission-denied', 'Sem permissao.');
      callerData = callerSnap.data() || {};
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error('reset senha: leitura do caller falhou', { erro: (e && e.code) || 'erro' });
      throw new HttpsError('internal', 'Nao foi possivel validar a permissao.');
    }
    let permOverrides = null;
    try {
      const permSnap = await db.collection('config').doc('permissoes').get();
      permOverrides = permSnap.exists ? (permSnap.data() || null) : null;
    } catch (e) { permOverrides = null; } // sem overrides = usa o default (mesma degradacao do cliente)
    if (!canFuncEditar(callerData.role, permOverrides)) {
      throw new HttpsError('permission-denied', 'Voce nao tem permissao para redefinir senhas.');
    }

    // ---- Alvo tem que existir E ser colaborador ----
    let alvoData;
    try {
      const alvoSnap = await db.collection('users').doc(alvoUid).get();
      if (!alvoSnap.exists) throw new HttpsError('not-found', 'Colaborador nao encontrado.');
      alvoData = alvoSnap.data() || {};
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error('reset senha: leitura do alvo falhou', { erro: (e && e.code) || 'erro' });
      throw new HttpsError('internal', 'Nao foi possivel localizar o colaborador.');
    }
    if (alvoData.role !== 'colaborador') {
      // NUNCA redefine senha de admin/gestao por este caminho (superficie de escalonamento).
      throw new HttpsError('permission-denied', 'So e possivel redefinir a senha de um colaborador.');
    }

    // ---- Rate limit (best-effort) ----
    await checarRateLimitReset(caller.uid);

    // ---- Gera + aplica ----
    const senha = gerarSenhaTemporaria();
    try {
      await admin.auth().updateUser(alvoUid, { password: senha });
    } catch (e) {
      logger.error('reset senha: updateUser falhou', { erro: (e && e.code) || 'erro' });
      // auth/user-not-found = doc existe mas a conta Auth nao (vinculo quebrado)
      if (e && e.code === 'auth/user-not-found') throw new HttpsError('not-found', 'Este colaborador ainda nao tem conta de acesso.');
      throw new HttpsError('internal', 'Nao foi possivel redefinir a senha.');
    }
    // Senha e TEMPORARIA: forca a troca no proximo acesso (reusa o gate do portal). Best-effort:
    // a redefinicao ja valeu; se este update falhar, a senha temporaria ainda funciona.
    try { await db.collection('users').doc(alvoUid).update({ precisaTrocarSenha: true }); }
    catch (e) { logger.warn('reset senha: precisaTrocarSenha nao gravou (segue)', { erro: (e && e.code) || 'erro' }); }

    // ---- Trilha em /eventos (shape do window.logEvento; SEM a senha) ----
    try {
      await db.collection('eventos').add({
        por: caller.uid,
        porNome: String(callerData.nome || '').slice(0, 120),
        porRole: String(callerData.role || '').slice(0, 40),
        tipo: 'auth',
        acao: 'Senha redefinida pela GP',
        alvo: alvoUid,
        em: FieldValue.serverTimestamp(),
      });
    } catch (e) { logger.warn('reset senha: trilha /eventos nao gravou (segue)', { erro: (e && e.code) || 'erro' }); }

    logger.info('reset senha concluido', { porRole: callerData.role });
    return { senha };
  }
);
