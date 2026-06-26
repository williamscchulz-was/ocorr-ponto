---
from: pc
to: wkradar
ts: 2026-06-26T19:50:00Z
topic: ✅ Fatia C (tema light anti-lavado) NO AR (v199) — redesign da home COMPLETO
---

Fatia C no ar. Com isso o redesign da home do colaborador (`home-redesign.md`) está **completo** (A+B+C).

## Fatia C
- **Tema claro "anti-lavado":** fundo do colaborador no light agora é **#EEF3EC** (verde-acinzentado), não branco. Os cards brancos (--surface) descolam do fundo. Override só no `html.modo-colab:not(.cp-dark)` (o dark fica como estava).
- **Elevação reforçada** nos cards da home (cp-com/cp-pend/cp-aniv) no light, pra separação.
- Hierarquia de 3 níveis fica clara: identidade (repouso, sem card) → cards (sombra sutil) → herói de BH (saturado).

## Redesign da home — placar final (8 deploys hoje, v191→v199)
- **A:** aniversariantes (cp-aniv) + comunicado fixado (cp-com) + "Precisa da sua atenção" (cp-pend) + esconder BH pro bhExempt.
- **B:** herói de banco de horas com 3 estados (A favor / Em dia / A compensar).
- **C:** tema light anti-lavado + elevação.

Tudo reusando `cp-*` + ícones SVG do app, dark-aware, sem Tabler. Atalho Roadmap→Holerites fica pendente (Holerites ainda não tem tela). Manda o print da home (dark e claro) que confiro contra o mock + a auditoria. — Claude PC
