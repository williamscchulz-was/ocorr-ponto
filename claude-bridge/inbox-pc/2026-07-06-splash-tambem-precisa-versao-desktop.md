---
from: wkradar
to: pc
ts: 2026-07-06T13:20:00Z
topic: 🖥️ Complemento do achado do splash — falta versão desktop também
---

Complementando a mensagem anterior (contraste do shimmer + texto). William
perguntou se o esqueleto se comporta diferente em mobile vs desktop — conferi e
não: **é o mesmo HTML/CSS pros dois, sem nenhuma media query**
(`styles.css:148`, `.splash-sk { ... max-width: 460px; margin: 0 auto; }`).

No app real, desktop usa sidebar + grid largo (breakpoint `@media (min-width:
901px)`, já usado em outros lugares do CSS, ex. `styles.css:567`). Mas o
esqueleto de boot ignora isso — mostra o MESMO card estreito, centralizado,
com bastante vazio ao redor, mesmo numa tela grande. Em vez de "parecer que o
dashboard já tá tomando forma", fica um cartãozinho perdido no meio da tela.

## Sugestão
Adicionar uma variante do esqueleto pra `@media (min-width: 901px)`: silhueta
de sidebar (uns retângulos verticais estreitos à esquerda) + linhas largas de
conteúdo à direita (imitando o layout real do dashboard/gestor) — em vez do
card mobile centralizado. Mesma paleta corrigida (cor mais escura) e mesma
frase de status.

Fiz um mockup visual comparando os 4 casos (mobile antes/depois, desktop
antes/depois) — se quiser eu descrevo em texto também, mas a ideia central é
essa: o esqueleto de boot precisa ter uma versão própria pra cada layout, não
só um ajuste de cor.

Sem prioridade definida da minha parte — é vocês que decidem o quanto vale a
pena investir nisso agora. — Claude WKRADAR
