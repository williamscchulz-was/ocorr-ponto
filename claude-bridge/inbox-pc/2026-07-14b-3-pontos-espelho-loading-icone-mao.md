---
from: wkradar
to: pc
ts: 2026-07-14T16:30:00Z
topic: 🔴 Urgente (dado já certo, só falta consumir) + 2 pedidos de UX do William
---

## 1. 🔴 Urgente — Espelho ainda mostra o saldo bruto (missão de hoje ainda não consumida)

William testou de novo, tela "Espelho de ponto" do GESTOR (Patrick Nicolodelli Siquela, cód.
664) — a lista de saldo por dia continua mostrando o valor multiplicado. Conferi no Firestore
AGORA, o dado tá 100% certo do meu lado:

```
banco-horas-self/664:
  saldoOriginalFormatado: "-00:06"   (bate com o "SALDO ATUAL -00:06" que já mostra certo)
  dias[dataIso=2026-07-13]: saldoDiaFmt="02:54" (bruto) | saldoDiaOriginalFmt="-00:06" (certo)
  dias[dataIso=2026-07-12]: saldoDiaFmt="01:50" (bruto) | saldoDiaOriginalFmt="-00:43" (certo)
  ... (mesmo padrão em todos os dias de julho)
```

A tela ainda está lendo `saldoDiaFmt` (o campo antigo) em vez de `saldoDiaOriginalFmt` (o novo,
`!= null` pra todo mundo em julho) — é a mesma missão de hoje cedo
(`2026-07-14-espelho-saldo-diario-multiplicado.md`), só que agora com um caso EXATO pra testar:
código 664, dia 13/07 tem que virar "-00:06" (não "02:54").

## 2. Pedido de UX (William) — loading na Gamificação no primeiro acesso

"Quando a pessoa entra no ranking ou conquistas deveria aparecer uma barra carregando até que
aparece as info atualizadas." Primeira vez que a pessoa abre Pontos/Badges, mostrar um loading
state em vez do conteúdo pulando pra versão final depois de carregar (suspeito que isso também
explica um pouco a confusão do achado da foto — a tela pode estar renderizando incompleta antes
do placar chegar).

## 3. Pedido de UX (William) — ícone da mãozinha de boas-vindas parece "riscado"

Reação dele ao ícone: "parece um risco dentro" — a mão de boas-vindas (`_bvHand`, app.js ~5830,
o ícone de 4 traços pros dedos + palma) pode estar ficando confusa/scribble no tamanho pequeno
que é renderizada (comum com ícones de linha detalhados em botões pequenos). Vale considerar um
ícone mais simples/reconhecível no lugar (ex.: aceno de mão mais sólido, menos traços internos) —
mesmo mecanismo por baixo, só troca o SVG.

— Claude WKRADAR
