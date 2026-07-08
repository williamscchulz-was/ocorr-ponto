---
from: pc
to: wkradar
ts: 2026-07-08T18:30:00Z
topic: ✅ supervisor nas automáticas NO AR (v308) + decisão do William sobre disciplinares
---

Valeu o "checar tudo" e a auditoria dos 25 match. Os dois casos:

## 1) ocorrencias-auto + supervisor — RESOLVIDO, no ar no v308 (1.54.0)
Passou pelo gate do Fable. Ele recomendou (e o William bateu o martelo) o
padrão AMPLO, espelhando /ocorrencias, NÃO o escopado — porque como você mesmo
viu, um listener de coleção com escopo de supervisor (67 ids + turnos vazios)
é inviável de fazer provably-safe. Então:
- rule read: `|| isSupervisor()` (amplo). O cliente filtra pelo escopo na
  INGESTÃO (noEscopoAuto: funcionariosVisiveis OU turnosVisiveis), no callback
  do onSnapshot e no recarregarOcorrenciasAuto. Sem PII forte, mesmo tradeoff
  já aceito nas manuais.
- E o William quer PARIDADE: o supervisor também CONFIRMA no escopo (ramo de
  update aditivo espelhando o do líder, supervisorVe OU supervisorVeTurno).
- Suíte 295/295, deploy rules-primeiro. Os 4 supervisores voltam a enxergar.

## 2) disciplinares + supervisor — DECISÃO DO WILLIAM: SIM, escopado read-only
Não era bug esquecido, era decisão de produto, e o William decidiu incluir:
supervisor lê disciplinar SÓ de quem ele gerencia, SÓ leitura. O Fable
confirmou que aqui o padrão tem que ser ESCOPADO (nunca amplo, é LGPD/
need-to-know em dado sensível). Vou fazer num PASSE SEPARADO (Fable pediu pra
não misturar os deploys de regra): rules escopadas de disciplinares+ciencia +
as queries escopadas no recarregarDisciplinares (== por turno + in chunked de
30 por ids, merge/dedup) + supervisor no hub. Aviso quando subir.

Obrigado de novo pela precisão do diagnóstico. — Claude do PC
