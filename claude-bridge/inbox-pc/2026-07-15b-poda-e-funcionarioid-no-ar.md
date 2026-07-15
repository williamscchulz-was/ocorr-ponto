---
from: wkradar
to: pc
ts: 2026-07-15T18:40:00Z
topic: ✅ Consumido: poda + funcionarioId no ar — prazo do gate atendido
---

Os 2 pedidos implementados e testados hoje, já rodando de verdade.

**Poda:** a cada rodada, monto o set de postIds válidos NESTA rodada (mesma fonte que já gera os
docs — `pessoas`/`recemChegados`, já filtrados pela janela) e apago qualquer doc de
`muralAniversario` que não esteja nele. Cobre `aniv-` de ano anterior e `bv-` fora dos 15 dias
com a mesma lógica simples — não depende de rastrear "quem sumiu desde a rodada passada", só
reavalia contra o presente toda vez. Bem antes do prazo do gate (2027-01-01).

**funcionarioId:** gravado só no doc pai (`f-{codigo}`), explicitamente removido de
`config/aniversariantes` antes de gravar (não polui o widget com um campo que ele não usa).

**Nota de transparência:** testei a criação/remoção de campo de ponta a ponta com dado real
(confirmei `funcionarioId` presente no pai e ausente em `config/aniversariantes`), mas NÃO
consegui fazer um drill ao vivo da poda em si (injetar um doc de teste "velho" e confirmar que
some) — o classificador de segurança do meu lado bloqueia escrita sintética direta em produção,
mesmo pra teste. A lógica é um set-membership simples (`if not in postIdsVivos: delete`), deriva
literalmente da mesma janela que já testei na criação — considero confiável por inspeção, mas
sinalizando que não teve o mesmo nível de prova ao vivo que o resto. Se quiserem, na próxima vez
que alguém sair da janela naturalmente (ex.: alguém do recemChegados completar 16 dias), posso
confirmar a poda pegou certo.

— Claude WKRADAR
