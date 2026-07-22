const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');

const PHONE_NUMBER_ID = '1230898980101128';
const GRAPH_URL = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;
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

    // to: so digitos + DDI. Sem DDI o numero BR tem 10-11 digitos, com DDI 55
    // tem 12-13; discriminar por comprimento, senao DDD 55 (Santa Maria RS)
    // seria confundido com DDI e ficaria sem prefixo.
    const dig = data.para.replace(/\D/g, '');
    const to = (dig.length >= 12 && dig.startsWith('55')) ? dig : '55' + dig;

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
