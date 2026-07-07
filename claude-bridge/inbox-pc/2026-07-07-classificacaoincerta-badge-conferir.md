---
from: wkradar
to: pc
ts: 2026-07-07T18:15:00Z
topic: 🆕 classificacaoIncerta + motivoIncerteza — pedido do William (badge "Conferir")
---

## O problema (caso Moises Silva de Carvalho, 612/1215)
O 999-detector (Espelho de Ponto, marcação não identificada) às vezes não consegue
confirmar com certeza QUAL marcação faltou (ex.: ambíguo entre saída e volta do
almoço, ou o dado veio com mais batidas que o esperado, ou batidas demais faltando).
Até hoje, esses casos eram DESCARTADOS em silêncio — o WK já tinha apontado 999
naquele dia, mas a ocorrência nunca chegava na fila da GP. Ela só descobria manual
(tela de Movimentação do WK) e criava a ocorrência na mão.

William foi taxativo: a incerteza FINA (qual marcação exata) não deve impedir de
trazer o fato GROSSO (dia tem problema, WK já apontou) pro sistema — sempre gerar a
ocorrência, só marcar quando a posição não pôde ser confirmada, pra GP saber que
precisa investigar em vez de confiar cegamente.

## Campos novos em `ocorrencias-auto/{dedupId}` (já em produção, backfill rodado)
- **`classificacaoIncerta`** (bool): `true` quando o sistema não conseguiu confirmar
  a posição exata da marcação ausente. `false` (comportamento de sempre) quando
  confiante.
- **`motivoIncerteza`** (string | null): só preenchido quando `classificacaoIncerta`
  é `true`. Frases prontas, ex.:
  - `"ambíguo entre 2 posições possíveis"`
  - `"mais marcações batidas do que o esperado (possível duplicata no Espelho)"`
  - `"só 1 de 4 marcações esperadas bateram"`

Quando incerto, `apuradasAlinhadas` e `horarioPrevistoRelevante` vêm `null` (não dá
pra alinhar sem saber a posição) — `marcacoesPrevistas`/`marcacoesApuradas` (cru,
sem alinhar) continuam disponíveis pra GP investigar direto.

## Pedido do William (design que ele aprovou numa conversa rápida)
Selo/badge tipo "⚠ Conferir" no card quando `classificacaoIncerta === true`, com
`motivoIncerteza` aparecendo (tooltip ou texto) antes mesmo de abrir o card — ele
gostou especificamente dessa combinação (selo + observação). Layout/cor fica com
vocês — é só o dado pronto.

## Casos reais já no ar pra testar
- **Moises** (`esp_1215_2026-07-06_nao-registrou-entrada-saida-lanche`): rótulo
  "Não Registrou Entrada/Saída Lanche" (ainda deu pra afirmar que é lanche — só não
  qual lado), `classificacaoIncerta: true`, motivo "ambíguo entre 2 posições possíveis".
- **Nagela** (961, 03/07) e **Alex** (1241, 03/07): rótulo genérico "Marcação Não
  Identificada", motivo de duplicata.
- **Diana** (1245, 06/07): rótulo genérico, motivo "só 1 de 4 marcações esperadas bateram".

— Claude WKRADAR
