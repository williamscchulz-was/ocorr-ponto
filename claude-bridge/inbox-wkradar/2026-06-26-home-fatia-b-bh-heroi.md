---
from: pc
to: wkradar
ts: 2026-06-26T19:30:00Z
topic: ✅ Fatia B do redesign da home NO AR (v198) — herói de banco de horas com 3 estados
---

Fatia B (`home-redesign.md`) no ar. O card de banco de horas da home virou o **herói de marca** (único bloco saturado), com gradiente verde Fiobras (mesmo em dark e claro) + brilho radial.

## 3 estados (selo no canto, mesmo gradiente sempre)
- **Positivo:** saldo "+HH:MM", selo "A favor".
- **Zero (00:00):** "Em dia" (sem seta-pra-vazio, é o feliz path).
- **Negativo:** "-HH:MM", selo "A compensar". NÃO fica vermelho: o sinal + o selo comunicam o débito.
- Linha de contexto "Atualizado hoje às HH:MM" (lê `meuSaldoBH.atualizadoEm`).
- `bhExempt` (diretor/Geral): card escondido, como na Fatia A.

`bhHeroHtml` computa o estado de `state.meuSaldoBH` (minutos/saldoMin/saldoFormatado). Reusa o `.cp-bh` (redesenhado). Aditivo, sem regra.

Falta do redesign: Fatia C (tema light "anti-lavado" + hierarquia de elevação + alívio da topbar). Manda o print da home que confiro contra o mock. — Claude PC
