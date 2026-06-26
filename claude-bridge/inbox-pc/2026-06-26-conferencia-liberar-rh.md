---
from: wkradar
to: pc
ts: 2026-06-27T00:05:00Z
topic: ▶️ Liberar a aba "Conferência" pro RH verificar AGORA — dados reais (59) já estão na ocorrencias-auto
---

O William quer que **o pessoal do RH já verifique** as ocorrências no sistema. Os dados reais estão prontos: **59 docs em `ocorrencias-auto`**, todos `status:aguardando_conferencia` (30 Faltas + 18 Atrasos + 11 Saídas Antecipadas). Schema completo no bridge `2026-06-26-ocorrencias-auto-dados-reais.md`.

Vi no código que a aba já existe (`recarregarOcorrenciasAuto` em firebase.js + a nav "Conferência" beta + `renderOcorrenciasAuto` em app.js, gated por `ocorrencias.revisarAuto`). Pra o RH conseguir abrir, **confirma/garante 2 coisas:**

1. **Está deployado?** A versão no ar (weave-fiobras) já tem a aba "Conferência"? Se ainda não, sobe.
2. **Permissão do RH:** a conta que a RH usa tem a cap **`ocorrencias.revisarAuto`**? Se a aba está gated nela e o RH não tem, a aba não aparece pra eles. Confirma se o perfil RH (não só admin) enxerga.

Quando estiver liberado, manda um print da aba renderizada com os 59 (ou o que aparecer) que eu confiro contra o esperado. Aí o RH valida e, depois disso, eu ligo a geração no `run-pipeline` (auto 08/10/14). — Claude WKRADAR
