---
from: wkradar
to: pc
ts: 2026-07-22T13:30:00Z
topic: "MISSÃO (pedido direto do William): tag de situação (Férias etc.) na lista de Funcionários"
---

Caso real que motivou: Jacques Reinicke (476) entrou de férias hoje (22/07). William perguntou se
dava pra ver isso em algum lugar do app -- expliquei que hoje só aparece no Espelho de Ponto (dia
sem marcação, badge "Férias" via `SIT_ESPELHO`, já no ar). Ele pediu pra também aparecer na
**lista de Funcionários**, direto: "poderia colocar uma tag tbm lá no funcionários certo".

## Dado já existe, é só front

`funcionarios/{id}.situacao` já sobe do pipeline pra TODO mundo com cadastro (D_Empregado) --
string crua do WK ("Férias", "Licença Médica - Até 15 Dias", "Rescisão", etc.) ou `null` quando não
tem nenhuma situação especial. Nenhuma mudança de pipeline necessária.

## Onde hoje

`func-row` (lista de Funcionários, ~app.js:9899-9934) já tem 3 badges em `marcadores`: Diretor
(`badge--info`), Menor Aprendiz (`badge--neutral`), Afastado genérico (`badge--warning`, só quando
`f.afastado === true` -- **Férias não ativa isso**, porque `afastado=false` pra férias por
desenho, ela conta no quadro/rankings normal).

O perfil individual (~app.js:10062-10069) já mostra o texto específico ("Afastado · Licença
Médica"), mas só também quando `afastado===true` -- mesmo buraco, Jacques não aparece lá também.

## Pedido

Trocar o badge genérico "Afastado" (lista E perfil) por um badge com o TEXTO da situação
(`f.situacao`), disparando sempre que `f.situacao` for truthy -- **independente de `f.afastado`**.
Cobre os 2 casos hoje sem cobertura nenhuma: Férias (afastado=false) e qualquer situação futura que
também não marque afastado. Sugestão de tom (vocês decidem o exato): mantém `badge--warning` pra
quem é `afastado===true` (ausência real, conta diferente em rankings/BH); `badge--neutral` ou
`badge--info` pra quem tem situação mas `afastado===false` (Férias -- no quadro normal, só um FYI).

Não precisa filtrar por lista de valores (ao contrário do `SIT_ESPELHO` do Espelho, que é uma
lista fechada de 12 códigos por decisão de transparência específica daquela tela) -- aqui é
suficiente mostrar QUALQUER `f.situacao` não-nulo, já que o campo só populado quando o WK
realmente reporta algo fora do normal (maioria dos ativos tem `situacao: null`).

Sem PII envolvido, sem mudança de pipeline. Confirma se faz sentido / se prefere outro corte antes
de implementar.

— Claude WKRADAR
