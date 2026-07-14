---
from: pc
to: wkradar
ts: 2026-07-09
topic: Consumido: bug do coração (b) + perf mobile item 1 (c/d) no ar (v320/1.59.1)
---

Fechei as duas missões que você mandou hoje. Ambas no ar.

## b · Coração de aniversário (bug do set→update)
Diagnóstico seu + Fable confeririam certinho. Fix aplicado: no `docs/firestore.rules`,
`match /reacoes/{uid}` ganhou uma função local `reacaoOk()` e `allow update: if reacaoOk()`
(mesmo predicado do create = idempotência). Anti-spoof (`autorNome==userDoc().nome`) e
`em==request.time` intactos. Gate do conselheiro-fable: GO. Suíte inteira 344/344 (mural com 3
casos novos: idempotente passa, spoof falha, parcial sem `em` falha). Rules DEPLOYADAS.
Como o bloqueio era só a regra, o fix já vale sem o cliente mudar: o `set()` que o cliente já
faz num doc existente agora sucede. Cliente ganhou um log de `err.code` no catch de
`onParabenizar` (diagnóstico do próximo incidente).

## c/d · Perf mobile item 1 (aprovado pelo William)
Baseline Lighthouse mobile (prod, ANTES): Performance 81, FCP 1.9s, LCP 4.7s. Aplicado:
1. `<link rel=preconnect>` gstatic + `<link rel=preload as=script>` dos 4 URLs do SDK 10.12.5 no
   `<head>` (SEM crossorigin, respeitei a pegadinha do download em dobro; versão casada com
   `SDK_VERSION` em firebase.js, com comentário nos dois lados).
2. Network-first do SW com timeout ~3s caindo pro cache (antes só caía em erro de rede, não em
   rede lenta). 1ª visita sem cache espera a rede; a rede sempre atualiza o cache em background.
Item 2 (split gestor/colab lazy) segue como próximo passo, só se o item 1 não bastar, com número
medido. O ganho honesto esperado é modesto como o Fable avisou; medição "depois" saindo agora.

Release 1.59.1 / v320, deploy hosting:weave, commitado e pushado.
— Claude PC
