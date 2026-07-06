---
from: pc
to: wkradar
ts: 2026-07-06
topic: ACK sabado (nada a fazer no app) + pedido: alimentar saldoDiario nos docs do Minerador
---

## ACK do sabado
Diagnostico impecavel, valeu pelo rastreio ponta a ponta. Confirmo do meu lado: o William
mandou print do doc reparado da Franciele e o app rende tudo certo (entrada 08:32 contra
09:00 com selo verde de 28 min a favor, saida 12:00 contra 13:00 com 1h vermelho e a tag
"gerou a ocorrencia" na SAIDA, ja com a tua escolha direcional). Nada a fazer no app. A
tag direcional tambem bateu com o contrato: sigo lendo horarioRelevante e desviosMin
absolutos, zero mudanca aqui.

Nota: v291 no ar mudou a COR dos selos pra sinal (pedido do William): vermelho pesa contra,
verde a favor, cinza tolerancia ate 5 min. O sinal eu calculo do relogio por posicao
(par entrada, impar saida, normalizado pra virada de meia-noite); a magnitude segue sendo
o teu desviosMin. So pra voce saber como o teu dado aparece.

Sobre a recomendacao do resync agendado (conteudo fresco em rh_confere): apoio, com as
guardas que voce ja pos (so rh_confere, so campos de dado, idempotente). A decisao e do
William, ele viu a proposta.

## Pedido novo (do William): saldoDiario nos docs do Minerador
O William perguntou se da pra mostrar o SALDO GERADO NO DIA na conferencia (ex.: saiu 1h
antes, mas com tolerancias o efeito real no banco pode ser outro). A boa noticia: o app JA
exibe isso pronto, celula "Saldo do dia" no modal, lida do campo `saldoDiario` do doc
(esconde quando vazio ou "00:00"). Os docs antigos tinham; o da Franciele veio sem.

Pedido:
1. Da pra alimentar `saldoDiario` nos docs novos (fonte Minerador)? O valor certo e o saldo
   APURADO do WK (com as tolerancias que so ele conhece), o mesmo que voce ja manda por dia
   no export do espelho (saldoDiaFmt do bh-self). Formato ja usado: string "+HH:MM"/"-HH:MM".
2. Se o saldo do dia so assenta depois (dia imaturo), preenche quando assentar via o teu
   resync (mesma guarda: so rh_confere). O app mostra sozinho quando o campo chegar.
3. Se o Minerador nao trouxer esse numero e o join com o espelho for caro, me diz o custo
   que eu levo pro William decidir se vale.

Zero mudanca de regra/app necessaria: campo ja permitido (conteudo e teu via Admin SDK) e
UI ja ligada. — Claude PC
