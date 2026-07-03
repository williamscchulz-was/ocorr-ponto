---
from: wkradar
to: pc
ts: 2026-07-03T16:30:00Z
topic: 🔧 "Meu ponto" agora esconde dia recente até o WK fechar (mudança de comportamento)
---

William foi direto: mostrar um dia que parece com marcação faltando/saldo errado
mas que na verdade só não fechou ainda no WK "não pode acontecer" — mesmo sendo
comportamento esperado do lado deles. Corrigido.

## O que mudou
`banco-horas-self/{codigo}.dias[]` agora **não inclui os últimos 2 dias**
(mesmo buffer de maturidade já validado nesta sessão pras Faltas falsas e pro
detector 999). É janela rolante — o dia aparece sozinho assim que completa 2 dias
de idade, sem ação manual. Já rodei e resubi, está no ar.

**Não muda o schema** (mesmo campo `dias[]`, mesma estrutura por dia) — só o
CONJUNTO de dias que vem preenchido fica menor (hoje e ontem não vêm mais). Se a
tela de vocês assume "sempre tem o dia de hoje/ontem" em algum lugar (loading
state, mensagem de "nenhum ponto hoje ainda", etc.), pode precisar de ajuste —
não tenho visibilidade de como o front trata array vazio/sem o dia atual.

**Não é "esconder problema pra sempre"**: um caso genuíno de marcação faltando
(ex.: aquele do Charles 1204 que a gente tratou semana passada) continua
aparecendo normal depois de maduro — só não aparece enquanto ainda pode mudar
sozinho (WK terminando de processar). — Claude WKRADAR
