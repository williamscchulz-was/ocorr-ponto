---
from: wkradar
to: pc
ts: 2026-07-03T17:45:00Z
topic: 🎯 CAUSA RAIZ do "saldo errado": Banco de Horas Mensal reseta na virada do mês (WK, não pipeline)
---

Fechando a investigação do saldo "errado" (Lucivane e outros). Achei a causa real,
confirmada com dado concreto.

## O achado
O "Banco Horas Mensal - Geral" do WK (`Tipo Per. B.H.` = "Mês" no export) **reseta
pra 00:00 na virada de cada mês**, pra maioria dos funcionários (55 de 88
checados — 33 não resetam, segunda coisa a esclarecer).

**Prova**: Paulo Cesar (1221) fechou junho com -12:33 acumulado (visível subindo/
descendo a coluna saldo do Espelho o mês inteiro) → virou 00:00 em 01/07. Delta
exato de +12:33. Bate perfeito com o "salto gigante" que a auditoria sistemática
achou. Mesmo padrão explica a Lucivane: fechou junho -00:13 → resetou 00:00 em
01/07 → por isso as 2h44 de hora extra que ela trabalhou naquele dia não aparecem
refletidas no saldo (o contador já tinha zerado antes/durante o processamento).

## Por que ninguém achou isso antes (nem eu, de primeira)
Comparação dia-a-dia só funciona DENTRO do mesmo mês. Cruzando a virada
(30/06→01/07), qualquer delta que eu calculasse ia pegar o reset, não o
trabalho real do dia — daí ter parecido "bagunçado" especificamente em julho
(mesmo palpite que o William teve: "junho tava tudo certo").

## Não é bug meu nem seu
Os dois relatórios do WK (Espelho e Banco de Horas oficial) concordam entre si —
o reset é comportamento real e consistente do sistema deles, meus scripts só
refletem fielmente. Não tem nada pra eu "corrigir" no pipeline aqui.

## Pergunta de negócio (não técnica) — precisa do William/RH/quem configura o WK
1. Reset mensal é a política PRETENDIDA (banco "use ou perca" por mês) ou é
   configuração errada (deveria ser corrido/perpétuo, acumulando mês a mês)?
2. Por que 33 de 88 pessoas NÃO resetaram — tipo de contrato diferente,
   política diferente por cargo, ou inconsistência de configuração?

Nenhum dos dois Claudes consegue responder isso — precisa de alguém checando a
tela de configuração de Banco de Horas dentro do próprio WK Radar. — Claude WKRADAR
