---
from: wkradar
to: pc
ts: 2026-07-09T13:40:00Z
topic: 💡 Ideia nova (aprovada pelo William) — boas-vindas pra recém-contratados, espelha o coração
---

William pediu uma interação social pequena, além do coração de aniversário, pra
dar boas-vindas a quem acabou de chegar. Gerei 3 direções (espelhar o coração
exato / um gesto diferente com SVG novo / mínimo esforço reaproveitando 100% o
que já existe) e a mais enxuta venceu — William viu o mockup e aprovou.

## A ideia
Card "Chegaram há pouco" (Visão geral do gestor, hoje só leitura) ganha 1 botão
por pessoa: ícone de mão levantada (não coração — evita confundir com
"parabéns") + toque único, sem confirmação, otimista (liga na hora, desfaz se
a escrita falhar) — **mesmíssimo mecanismo do coração de aniversário**, só
com rótulo/ícone diferentes.

## Por que essa direção (não as outras 2)
- Gesto diferente do coração (mão levantada, não coração) porque "boas-vindas"
  é uma emoção diferente de "parabéns" — mas SEM inventar SVG/animação nova,
  só trocar o ícone.
- **Zero coleção nova pra auditar/testar**: reaproveita o MESMO modelo de
  reação que já existe pro aniversário (mesmo shape de campos, mesma regra de
  segurança anti-spoof já validada em produção) — só muda o `tipo` da reação
  e o card onde o botão aparece. Não é sistema novo, é o sistema existente com
  mais 1 valor de `tipo`.
- Descartei a opção "só decorar visualmente, sem toque nenhum" — não seria
  interação de verdade (o pedido do William foi explícito: interação, não
  decoração).

## Especificação
- **Texto**: vazio → "Dar as boas-vindas"; com reações → "N colega(s)"
  (mesmo padrão de copy do coração — direto, sem "!", sentence case).
- **Schema**: mesmo padrão de campos do coração (`uid`, `tipo`, `autorNome`,
  `em`), mesma regra `autorNome == userDoc().nome` (anti-spoof, copia a regra
  já testada).
- **Detalhe novo que o coração não tinha**: bloquear auto-toque (a própria
  pessoa recém-contratada não pode "dar boas-vindas a si mesma" — no
  aniversário isso já deve estar tratado de algum jeito parecido, mas vale
  conferir).
- **Janela de disponibilidade**: sugiro herdar o mesmo filtro que já decide
  quem aparece no card "Chegaram há pouco" (não precisa inventar campo de
  expiração novo — quando a pessoa sai da lista, o botão some junto).

## Esforço estimado
~90% copiar/renomear o componente e a regra do coração. O trabalho
genuinamente novo é pequeno: 1 ícone (sugestão: mão levantada, mesma família
line-art do coração atual), o texto condicional, e o guard de auto-toque.

Mockup visual já está com o William, mesmo esquema de antes (peçam a ele ou
me chamem que eu mando de novo).

— Claude WKRADAR
