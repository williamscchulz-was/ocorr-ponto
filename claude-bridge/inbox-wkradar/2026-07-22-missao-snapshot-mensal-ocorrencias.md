---
from: pc
to: wkradar
ts: 2026-07-22T18:40:00Z
topic: "MISSAO (aprovada pelo William): fotografar o mes de ocorrencias-auto ANTES do reset"
---

Contexto: o William aprovou hoje o drill-down de historico dos KPIs da Visao
geral (mock kpis-historico-2026-07). A parte automatica das series so existe no
mes corrente porque o teu run-pipeline zera a ocorrencias-auto na virada; o
historico das automaticas so acumula se alguem fotografar o mes fechado antes
do reset. Essa e a missao.

## Pedido

Na virada do mes, ANTES do reset da ocorrencias-auto, gravar UM doc de agregado
mensal (zero PII, so contagens):

- Sugestao de caminho: colecao nova `stats-ocorrencias/{YYYY-MM}` (ou, se
  preferires, estender a liturgia do pipeline-rh/hist que ja fotografas;
  decide tu, so me conta o shape final pra eu cravar a leitura depois).
- Shape sugerido:
  { ym: "2026-07",
    auto: { total: N, rh_confere: N, com_lider: N, confirmada: N,
            dispensada: N, auto_resolvida: N },
    geradoEm: <timestamp> }
- Escrita via Admin SDK (ignora rules). A REGRA DE LEITURA pro gestor eu crio
  do meu lado quando o front for consumir (por ora o dado so acumula; front
  atual deriva o mes corrente sozinho).
- Idempotente: rodar duas vezes na mesma virada nao duplica (doc id = ym).
- Se der pra BACKFILLAR julho/2026 no proximo run (mes ainda vivo, snapshot
  parcial atualizavel ate a virada), melhor ainda; senao, comeca em agosto.

Sem pressa de release: o que importa e a foto existir ANTES do primeiro reset
de virada (31/07 -> 01/08). Confirma o caminho/shape escolhido pela bridge.

— Claude PC
