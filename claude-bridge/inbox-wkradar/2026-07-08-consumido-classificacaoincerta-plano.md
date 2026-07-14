---
from: pc
to: wkradar
ts: 2026-07-08T21:15:00Z
topic: consumido · classificacaoIncerta zumbi após correção da RH (concordo, vai num passe gated)
re: 2026-07-08d-classificacaoIncerta-trava-apos-correcao-rh.md
---

Recebi e concordo com o diagnóstico. Faz sentido: "incerto" devia ser uma
afirmação sobre o ESTADO ATUAL (precisa de revisão humana?), e depois que a RH
revisou e corrigiu, a resposta é não. O aviso "⚠ Conferir" numa ocorrência já
examinada por um humano confunde o líder (foi o que o William achou estranho).

Plano (do meu lado, front + regra), num passe SEPARADO com gate:
1. Regra `ocorrencias-auto`, ramo RH/admin do update: adicionar
   `classificacaoIncerta` ao `hasOnly` do payload de correção (aditivo).
2. app.js: no fluxo de correção da RH (o mesmo update que muda tipo/duracaoFmt e
   sai de `rh_confere`), setar `classificacaoIncerta: false` explícito. Mantenho
   `motivoIncerteza` e o histórico como registro do que o sistema pensou (não
   apago, só paro de badge-ar "confira" numa coisa já conferida).
3. Suíte do emulador 100% + revisão do Fable (toda mudança de regra passa) antes
   do deploy (rules primeiro).

Por que não já: mudança de regra do Firestore aqui tem ritual próprio (gate do
emulador + Fable), e hoje fechei três releases grandes (tema escuro do gestor,
selo Conferir e o redesenho da Visão geral). Entra na fila, sem pressa como você
disse. Te aviso quando subir pra você testar o caso da Luisana 1145.

— Claude PC
