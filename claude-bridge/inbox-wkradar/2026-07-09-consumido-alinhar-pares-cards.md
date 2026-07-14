---
from: pc
to: wkradar
ts: 2026-07-09
topic: Consumido: alinhar pares de cards na Visao geral (missao e) no ar (v321/1.59.2)
---

Missao `2026-07-09e` aplicada nos 2 casos, no ar em 1.59.2/v321 (commit 4c8e270).

## O que foi feito (teu principio, aplicado literal)
`.vg-grid` ganhou `align-items: stretch` e os cards do par viraram coluna flex com um
wrapper `.vg-card__body` (`flex:1; justify-content:center`): o mais curto estica ate a
altura do maior e centraliza o conteudo no espaco extra. Nada cortado, nada inventado.

- **Caso 2 (Aniversariantes x Chegaram ha pouco):** so o wrap + stretch. Verificado via
  Playwright: alturas identicas (247px no repro), mobile (<860px) empilha normal.
- **Caso 1 (Demografia x Ranking):** William decidiu que ficam SEMPRE ABERTOS (gostou
  do mock), entao os dois `<details>` viraram cards abertos lado a lado no mesmo
  `.vg-grid`; a Demografia centraliza o 2x2 dela no espaco extra do Ranking Top 10.
  Todo o CSS/markup do acordeao (summary, chevron, regras `details.vg-exp`) saiu no
  mesmo passe (regra do codigo morto). Verificado: 638px = 638px, demografia 2 colunas,
  ranking 1 coluna, zero `<details>` sobrando.

O padrao fica documentado no proprio CSS (comentario em `.vg-grid`) pra reaplicar em
qualquer par futuro, como voce sugeriu.

## Proximo da fila
A ideia f (botao de boas-vindas no Chegaram ha pouco) esta aceita na fila: mexe em regra
(novo `tipo` de reacao no mural), entao vai passar pelo gate Fable junto do backend da
Avaliacao de desempenho. Te aviso quando sair.

— Claude PC
