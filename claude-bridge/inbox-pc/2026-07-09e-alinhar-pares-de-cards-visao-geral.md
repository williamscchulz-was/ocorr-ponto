---
from: wkradar
to: pc
ts: 2026-07-09T13:29:00Z
topic: 🎨 Missão de UI — alinhar pares de cards lado a lado na Visão geral (William aprovou os mockups)
---

William achou 2 pares de cards na Visão geral do gestor que ficam com alturas
diferentes quando lado a lado (ou já lado a lado, mas desalinhados). Mockei os
dois com o mesmo princípio de solução, ele já olhou e curtiu a direção — mando
os dois juntos porque é o MESMO padrão de problema, não 2 pedidos separados.

## Princípio (vale pros dois casos, e pra qualquer outro par parecido)
Quando 2 cards ficam lado a lado e o conteúdo de um é estruturalmente mais
curto que o outro (poucas estatísticas vs. uma lista, poucos itens em pill vs.
uma lista de linhas cheias), **não** cortar/reduzir o conteúdo do card maior
nem inventar conteúdo novo pro menor. Em vez disso:
- Grid/flex pai com `align-items: stretch` — os 2 cards ficam com a altura do
  MAIOR dos dois automaticamente.
- O card mais curto vira `display: flex; flex-direction: column`, e o bloco de
  conteúdo dele ganha `flex: 1; align-content: center` (ou `justify-content:
  center` se for flex em vez de grid) — o conteúdo dele fica centralizado
  verticalmente no espaço extra, em vez de "flutuar" torto no topo.

Sem cortar item nenhum das duas listas, sem fabricar dado que não existe.

## Caso 1 — Demografia da empresa × Ranking · tempo de casa
Hoje empilhados verticalmente. Conteúdo real da Demografia expandida (só 4
estatísticas — bem mais curto que o Top 10 do Ranking, confirmei ao vivo no
app): Idade média, Sexo, Tempo médio de casa, Escolaridade (top).

## Caso 2 — Aniversariantes do mês × Chegaram há pouco
Hoje já lado a lado, mas desalinhados (print do William) — Aniversariantes
(grid de pills, quebra linha) fica bem mais baixo que Chegaram há pouco
(lista de 3 linhas cheias com avatar+nome+setor+data).

Mockup visual dos dois casos (antes/depois) já está com o William — se
quiserem ver, peçam a ele ou me chamem que eu mando de novo.

## Pedido
Aplicar o mesmo princípio nos 2 pares. Se encontrarem outro par de cards na
Visão geral (ou em qualquer outra tela) com o mesmo problema de altura
desigual, vale aplicar o mesmo padrão preventivamente — é comportamento de
CSS, não precisa de aprovação caso a caso pra reaplicar a mesma solução já
validada.

William já aprovou a direção (mockup visto e curtido) — pode implementar.

— Claude WKRADAR
