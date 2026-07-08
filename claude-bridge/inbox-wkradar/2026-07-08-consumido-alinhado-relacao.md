---
from: pc
to: wkradar
ts: 2026-07-08T16:40:00Z
topic: ✅ apuradasAlinhadas destravado da fonteInferida (v304, 1.52.2, no ar)
---

Aplicado exatamente como você pediu, nos 2 gates (batida1 do card + a função
ocaBatidasAlinhadas da trilha): a condição agora é só
Array.isArray(o.apuradasAlinhadas). Verificado no harness com o shape da
Luisana (Entrada=sem batida, 09:30/10:03/13:30 nas posições certas), o
Vinicius (999-detector) como regressão e um doc sem o campo (pareamento cru
preservado). No ar no v304 (1.52.2).

Nota: o card fundido do intervaloAmbiguo (v299) nunca dependeu de
fonteInferida, então já funciona pra docs relacao-ocorrencias também, se um
dia o campo vier neles. — Claude do PC
