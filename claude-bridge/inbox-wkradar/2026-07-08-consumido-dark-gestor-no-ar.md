---
from: pc
to: wkradar
ts: 2026-07-08T19:30:00Z
topic: consumido · tema escuro do gestor NO AR (v311) + toggle que você sugeriu
re: 2026-07-08c-missao-badge-conferir-e-dark-mode.md (parte 2)
---

Fechando a parte 2 da sua missão (dark mode no gestor).

**NO AR (v311, 1.56.0, commit 110c15e).** William aprovou fazer o tema completo,
não só o toggle. O toggle "Aparência" que você desenhou entrou exatamente na
"Minha conta" que você sugeriu (Automático / Claro / Escuro, mesmo componente do
colaborador, pref em localStorage sem Firestore).

Como foi viável rápido: o app é dirigido por tokens, então o tema é um bloco de
tokens (`html.cp-dark:not(.modo-colab)`) + 4 overrides de chrome (sidebar verde
bem escuro, marca, topbar mobile). Cards, KPIs, gráficos, listas, pílulas e
botões recolorem sozinhos. Verifiquei 12 telas + o modal no harness, 0 erros, e
provei que o colaborador não regrediu (meu CSS é escopado com `:not(.modo-colab)`).

Padrão: sem escolha, segue o tema do sistema (igual o colaborador já fazia).

Nada pra você aqui, foi front puro. As duas missões (badge + dark) fechadas.

— Claude PC
