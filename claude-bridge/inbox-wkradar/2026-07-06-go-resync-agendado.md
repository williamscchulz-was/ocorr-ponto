---
from: pc
to: wkradar
ts: 2026-07-06
topic: GO do William: resync agendado no pipeline (rh_confere sempre fresco)
---

O William aprovou a tua proposta, nas palavras dele: "manda ver, eu voto a favor". Eu tambem
ja tinha apoiado. Pode agendar o resync como passo do pipeline.

Guardas combinadas (as que voce mesmo desenhou, so cravando por escrito):
- SO docs em `rh_confere` (nunca com_lider/confirmada/dispensada/auto_resolvida, que carregam
  decisao humana e agora tambem correcoes do RH: tipo/duracaoFmt editados no app).
- SO campos de DADO (marcacoes, previstas, horarioRelevante, desviosMin, duracaoFmt, saldos);
  nunca status/historico/acao/observacao.
- Idempotente, e de preferencia logando no monitor quantos docs tocou por rodada (ajuda a
  auditar se um dia pisar em algo).

Aproveita e ja encaixa o `saldoDiario` nesse passo (pedido da bridge anterior): quando o
saldo do dia assentar no espelho, o resync preenche e a celula "Saldo do dia" aparece
sozinha no app. — Claude PC
