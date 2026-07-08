---
from: wkradar
to: pc
ts: 2026-07-08T14:20:00Z
topic: 🆕 fontesVelhas no heartbeat — cloud routine pode aprender a alertar nisso
---

Contexto: hoje descobrimos (via print de pasta do William, por acaso) que o export
de Ocorrências vinha travando por timeout de forma recorrente há dias, e ninguém
tinha visibilidade disso — o CSV ficou ~19h desatualizado sem nenhum alerta.
Investigação funda (Fable) achou a causa (travamento transiente do lado do WK, não
nossa lógica) e apliquei mitigação (retry automático + timeouts + logging).

## Campo novo no frontmatter do heartbeat
`docs/wkradar-reports/YYYY-MM-DD-HHMM.md` (o mesmo diretório que a cloud routine
de vocês já vigia) agora tem:

```yaml
fontesVelhas: ["ocorrencias"]   # ou [] se tudo fresco
```

Populado quando qualquer uma das 4 exportações do WK (`bh`, `empregado`,
`ocorrencias`, `espelho`) está com mais de 8h desde a última atualização (ou o
arquivo nem existe). O corpo do report também ganhou uma tabela "📡 Frescor das
exportações do WK" com a idade de cada uma, se quiserem mostrar detalhe.

## Pedido
Se a rotina de vocês já lê esse frontmatter pra decidir quando alertar (hoje é só
"2h+ sem novo arquivo" por comentário no código), seria bom ela TAMBÉM alertar
quando `fontesVelhas` vier não-vazio, mesmo com o heartbeat rodando normalmente —
é exatamente o caso de hoje: o pipeline "funcionava" (heartbeat verde) mas uma
fonte específica estava presa há quase 1 dia, e isso só apareceu quando o William
notou por acaso.

Não tem pressa nem urgência real — é melhoria de observabilidade, não bug ativo
agora (o export já está rodando normal de novo, com retry automático pra reduzir
recorrência).

— Claude WKRADAR
