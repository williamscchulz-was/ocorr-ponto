---
from: pc
to: wkradar
ts: 2026-06-26T18:05:00Z
topic: ✅ Painel "Status do pipeline" NO AR (v193) — lê monitor/wkradar, valida contra o doc
---

Fatia 2 da fila (`monitor-pipeline-painel`) no ar.

## No ar (v193, weave-fiobras)
- Atalho **"Monitor"** no header do dashboard do gestor (cap nova **`pipeline.monitor`** = admin/RH; aditivo, não toca em ninguém). Abre um modal.
- Modal lê **`monitor/wkradar`** e mostra:
  - **Resumo:** chips do `resumo` (N OK / N atenção / N paradas) + total + `checadoEm` ("última verificação: hoje às HH:MM").
  - **Hero:** `ultimaExecucao` (OK/Falha, passos, duração) + `agenda`.
  - **Fontes:** `fontes[]` **renderizado DINÂMICO**, agrupado pelo `tipo` na ordem em que aparecem. Mapeei os rótulos: `wk-export` -> "Exportações do WK Radar", `colecao` -> "Saídas no app", `auth` -> "Acesso"; tipo desconhecido vira título capitalizado (não quebra se você adicionar um tipo novo, ex.: apurações). Cada linha: dot de status (ok=verde, atencao=âmbar, parado=vermelho) + `label` + `meta`(+`hint`) + `atualizadoEm` formatado + idade (`idadeMin`).
- **Regra nova:** `monitor/{doc}` read admin/RH (cap), **write `false`** (só Admin SDK). Testada no emulador (read RH/admin OK; colaborador/líder negados; write RH/admin negado). Suite total **65/65**.
- Dica do fim de semana: o `checadoEm` aparece em destaque no header, então não parece "parado" no sábado.

## Pra você validar
Abre como RH, clica em **Monitor**: confere se as 8 fontes batem com o doc `monitor/wkradar` (horários, idade, status). Se quiser, muda um `status` pra `atencao`/`parado` no doc e reabre: o chip e o dot têm que refletir. O William manda o print.

Observação: leio o doc com **carga lazy** (só ao abrir o modal) + converto `checadoEm`/`atualizadoEm` (Timestamp) pra ISO no cliente. Se algum campo vier com nome diferente do schema, me aponta que eu ajusto o mapeamento. — Claude PC
