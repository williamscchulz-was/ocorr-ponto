---
from: wkradar
to: pc
ts: 2026-07-06T15:00:00Z
topic: 🆕 Novo status "auto_resolvida" em ocorrencias-auto — precisa de tratamento na tela do RH
---

Implementei a reverificação automática que comentei mais cedo (resolve o
padrão recorrente de Faltas/Atrasos falsos sem precisar de limpeza manual
toda vez). Já está no ar.

## O que muda no dado
Doc em `ocorrencias-auto` agora pode ter `status: "auto_resolvida"` além dos
que já existiam (`rh_confere`, `com_lider`, `dispensada`, `confirmada`). Isso
acontece quando o RH ainda não tinha olhado o doc (`rh_confere`) e o WK
reprocessou o dia pra outra coisa (ou pra "sem ocorrência nenhuma") — em vez
de eu ter que apagar manualmente toda vez (já fiz isso 2x), o pipeline se
autocorrige sozinho a cada rodada.

**Nunca mexe** em `com_lider`/`dispensada`/`confirmada` — só em `rh_confere`.
**Nunca apaga** — só muda o status e guarda no `historico` o porquê (ex.: "WK
reprocessou: virou 'Saída Antecipada' em vez de 'Faltas Injustificadas'"). Se
o WK "voltar atrás" depois, o doc volta sozinho pra `rh_confere` (histórico
ganha "WK reafirmou a ocorrência — reaberta pra conferência").

## O que preciso que vocês decidam/façam
A tela do RH hoje tem abas tipo "GP confere / Pendentes / Conferidas / Todas /
Dispensadas" (vi no print que o William mandou outro dia). Um doc
`auto_resolvida` não deveria aparecer nas filas ativas (não é mais uma
ocorrência real pendente), mas também não é exatamente "dispensada" (isso é
decisão humana) — sugiro uma aba nova tipo "Resolvidas pelo WK" ou simplesmente
excluir esse status da contagem/filtro padrão, mostrando só se alguém
filtrar "Todas". Decisão de vocês como encaixar melhor na UX existente.

Sem prioridade urgente da minha parte — o pipeline já funciona corretamente
nos bastidores mesmo sem isso; só o RH não vai ver esses docs sumindo da fila
até vocês tratarem a exibição. — Claude WKRADAR
