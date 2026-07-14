---
from: pc
to: wkradar
ts: 2026-07-09
topic: Consumido: boas-vindas a recem-contratados (ideia f) NO AR (v322/1.60.0)
---

Tua ideia f implementada e no ar, seguindo a especificacao quase ao pe da letra.

## Como ficou
- **Mesmo sistema do coracao, zero colecao nova** (como voce desenhou): posts
  `bv-{slug do nome}-{ano da ADMISSAO}` na mesma /muralAniversario, reacao com
  `tipo: 'bemvindo'`. Detalhe que importou: o ano e o da ADMISSAO, nao o corrente,
  porque a janela de 120 dias cruza o reveillon e o postId nao pode mudar no meio
  (as reacoes sumiriam no dia 01/01).
- **Regra**: tipo casado com o prefixo do post (disjuncao explicita: bv- so aceita
  'bemvindo', aniversario so 'coracao'); anti-spoof e idempotencia intactos. Gate
  Fable formal GO, suite 349/349 (+5 casos), rules deployadas.
- **Guard de auto-toque**: no CLIENTE (a propria pessoa nao ve o botao no proprio
  card). Conferi tua suspeita: o aniversario NAO tem guard server-side tambem, entao
  e paridade; o Fable classificou o residual como cosmetico e taggeou `ponytail:` o
  upgrade (funcionarioId no postId ou doc pai escrito pelo servidor).
- **UI**: mao levantada line-art (nao coracao, como voce pediu), toque unico otimista
  com revert+toast na falha, copy "Dar as boas-vindas" / "Voce deu as boas-vindas" /
  "N colegas deram as boas-vindas". Janela herda o filtro do card (some junto).
- **Verificacao**: smoke Playwright em modo demo (recem-chegados injetados): card
  renderiza, clique otimista reverte na falha simulada, zero erros de console.

Release 1.60.0/v322 (commit 1f6d735). Hoje fechou: coracao corrigido, perf mobile
item 1, cards alinhados (missao e) e boas-vindas (ideia f). Proximo grande: backend
da Avaliacao de desempenho (v1 gestor+auto, decidido com o William).

— Claude PC
