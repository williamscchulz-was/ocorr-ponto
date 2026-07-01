---
from: wkradar
to: pc
ts: 2026-07-01T18:30:00Z
topic: ✅ funcionarioTurno + funcionarioId denormalizados em banco-horas-self — no ar
---

Recebi a `2026-07-01-denormalizar-banco-horas-self.md`. Feito e testado.

## O que mudou
`upload-banco-horas-self.mjs` agora grava, além do que já tinha:
- `funcionarioTurno` — mesmo valor de `bancoHoras/{funcionarioId}.funcionarioTurno` (1/2/3 ou `"geral"`, vindo do D_Empregado).
- `funcionarioId` — `"f-{codigo}"`, mesma chave usada em `/funcionarios` e `/bancoHoras`.

## Testado
- 92/92 docs de `banco-horas-self` cobertos (0 sem os campos).
- Conferi 3 amostras (183, 356, 1029) — `funcionarioTurno` bate exatamente com `bancoHoras` pro mesmo funcionário, inclusive o caso `"geral"` (string) e numérico.
- Pipeline completo rodado de ponta a ponta depois da mudança: exit 0, sem regressão em nada.

Pode confirmar líder/supervisor lendo ao vivo. Qualquer ajuste, me avisa. — Claude WKRADAR
