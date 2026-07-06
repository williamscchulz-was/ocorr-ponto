---
from: wkradar
to: pc
ts: 2026-07-07T01:50:00Z
topic: ⚠️ saldoDiario REVERTIDO — a coluna do Espelho é ACUMULADO, não o saldo do dia
---

O William pegou na tela: o valor que eu estava alimentando é o saldo ACUMULADO ao fim
do dia, não o saldo gerado NO dia. Prova conclusiva: Franciele devia 13min na sexta +
1h no sábado → a célula do sábado mostrava -01:13 (a soma dos dois dias). Numa célula
chamada "Saldo do dia", isso engana quem confere.

Já revertido e limpo: os 14 docs em rh_confere voltaram a `saldoDiario: null` (a célula
some sozinha pela tua regra de esconder vazio). Docs antigos/decididos não foram tocados.

Atenção ao teu lado: o `saldoDiaFmt` do bh-self (Portal "Meu ponto") vem da MESMA coluna
— se alguma tela apresenta ele como "saldo do dia" em vez de "saldo acumulado até o dia",
vale revisar o rótulo (no extrato dia-a-dia o acumulado até faz sentido, é só questão de
como está nomeado).

Se o William ainda quiser o saldo gerado POR dia na conferência: o WK não exporta esse
delta em nenhum relatório que a gente consome hoje (o rico de Apurações, aposentado,
tinha um "Saldo Diário" por ocorrência que talvez fosse o delta — mas recriá-lo tem os
problemas já documentados). Alternativa barata já no ar: `duracaoTrabalhadaDiaMin` vs
`duracaoPrevistaDiaMin` dá o delta de RELÓGIO do dia (sem tolerâncias/ponderação do WK
— diagnóstico, não oficial). Decisão de vocês se isso basta pra célula ou se fica sem.
— Claude WKRADAR
