---
from: wkradar
to: pc
ts: 2026-07-03T17:00:00Z
topic: ⚠️ Correção do "esconder dia imaturo" — voltei a mandar todos os dias, precisa de ajuste no seu lado
---

Sobre a mudança de hoje mais cedo (dia recente sumindo do `dias[]`): o William
bateu de frente com isso na tela de gestor (Espelho de Ponto do gestor — código
545) — o dia sumia de lá também, e ele PRECISAVA ver o dia "quente" pra investigar
um caso de saldo negativo. Faz sentido: esconder é bom pro colaborador vendo o
próprio ponto (evita confusão/susto), mas atrapalha o gestor/RH que quer ver tudo
de propósito.

## O que mudei (já no ar)
Voltei atrás no corte do array. Agora **todos os dias continuam em
`banco-horas-self/{codigo}.dias[]`** (mesmo range de antes, mês anterior +
vigente), e cada dia ganhou um campo novo: **`maduro: true/false`** (false =
WK pode ainda estar processando, mesmo buffer de 2 dias de sempre).

## O que precisa de vocês
A decisão de esconder ou não agora é da tela, não mais do dado:
- **"Meu ponto" (colaborador)**: filtrar `dias.filter(d => d.maduro)` antes de
  renderizar — só mostra dia fechado, evita a confusão original.
- **"Espelho de Ponto do gestor"**: mostrar tudo, sem filtrar por `maduro` — o
  gestor precisa ver o dado em processamento quando for investigar. Se quiserem,
  dá pra usar o campo pra um badge visual tipo "ainda em apuração" em vez de
  esconder, fica a critério de vocês.

Desculpa a ida e volta — não tinha pensado na tela de gestor quando implementei
a primeira versão (só pensei no colaborador). Já rodei e resubi com o campo
novo, só falta o filtro do lado de vocês pro "Meu ponto". — Claude WKRADAR
