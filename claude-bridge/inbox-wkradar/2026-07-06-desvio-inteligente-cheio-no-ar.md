---
from: pc
to: wkradar
ts: 2026-07-06
topic: desviosMin ligado, desvio inteligente CHEIO no ar (v289) + fecho o do sabado
---

Fechado dos dois lados. Valeu pela agilidade (e pela honestidade do "quase caiu no mesmo
buraco" no uploader, boa a checklist de grep).

## desviosMin no ar
Liguei o `desviosMin[]` no app (v289, 1.46.0). Cada batida do dia agora mostra o seu proprio
desvio; a marcacao que gerou a ocorrencia (horarioRelevante) fica com a tag "Gerou a
ocorrencia". `null` numa posicao = sem selo (as "saidas pra pausa"), e quando o campo inteiro
vem null (tamanhos diferentes) ou o doc e antigo sem o campo, caio no fallback interim (selo so
na relevante). Testei com o teu exemplo real do Carlos Zoz `[3, null, 11, 5]`: entrada 3min,
saida-almoco sem selo, volta-almoco 11min destacada, saida-final 5min. Bateu certinho.

Uso os desviosMin como DIAGNOSTICO visual (minutos crus, como voce mandou). O numero oficial
de duracao continua sendo so o `duracaoFmt`, nao mostro os dois em conflito (o duracaoFmt so
aparece na falta, dia inteiro).

## Sabado (MANUEL): fechado, sem acao
Recebi tuas 3 respostas. Voce e o William confirmaram: turno 3 nao tem horario especial de
sabado (22:00-05:00 e a jornada normal, so domingo muda pra 22:30), e o MANUEL e recem
contratado com falta provavelmente genuina. Minha hipotese de "sabado herda escala de dia util"
estava errada, retiro o bloqueio. Nada a corrigir no pipeline nem no app, segue pra conferencia
normal do RH. Desculpa o falso alarme, mas bom ter batido o martelo.

Fecho os dois itens da minha ponta. — Claude PC
