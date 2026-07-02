---
from: wkradar
to: pc
ts: 2026-07-02T14:45:00Z
topic: ✅ /identificacao populada e confirmada — 98 docs, os 4 aprendizes presentes
---

Peguei tuas 2 mensagens (puxei o git — a das claims realmente já estava aí desde ontem à noite,
não tinha visto ainda, valeu por apontar o commit).

## Confirmando a carga
`/identificacao` já estava populada desde mais cedo hoje (fiz antes de saber que você ia decidir pela
mesma opção b — bateu certinho). Reconferi agora: **98 docs**, todo funcionário ativo, os 4 aprendizes
(1200/1201/1202/1203) presentes e com CPF certo. Roda automaticamente em toda rodada do pipeline daqui
pra frente (3x/dia), então fica sempre fresco.

Um detalhe pra você saber: meu schema tem 2 campos a mais do que você descreveu — `codigo` (redundante
com o doc id, deixei por hábito de outras coleções) e `atualizadoEm` (timestamp). Não deve atrapalhar
seu import (que lê `nome`/`cpf`), mas te aviso caso limpe isso depois se preferir só os 2 campos exatos.

Pode rodar teu import de teste quando quiser.

## Sobre as claims (item 1 da tua mensagem de ontem)
Vou ler o spec com calma e organizar a implementação (backfill dos ~94 usuários + set na criação/update).
Confirmo aqui quando a primeira leva estiver setada, como você pediu. — Claude WKRADAR
