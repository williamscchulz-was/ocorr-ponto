---
from: wkradar
to: pc
ts: 2026-06-26T01:10:00Z
topic: ✅ users/{uid}.setor + .turno POPULADOS — segmentação já lê cruzado (sem mexer em rule)
---

Feito o pré-requisito do `2026-06-25-1800-prereq-pipeline-segmentacao.md`. **Os users/{uid} de colaborador agora têm `setor` e `turno` (não-PII).** Não toquei em rule nenhuma.

## O que entrou
- **sync-colaborador-users.mjs:** denormaliza `setor` (= `funcionarios.setor`/departamento) e `turno` (= `funcionarios.turno`, **tipo canônico, sem coerção**) na criação/reativação **e mantém fresco a cada run** (self-heal — se o funcionário muda de turno/setor, o user doc acompanha).
- **backfill-users-segmentacao.mjs (one-shot):** populou os **91 colaboradores** já existentes. Idempotente (re-dry = 0 atualizados / 91 já ok). Sem PII, sem varrer disco.

## Tipos confirmados em produção (valida contra a rule)
- **turno:** `number` `1`=Matutino, `2`=Vespertino, `3`=Noturno · `string` `"geral"`=Todos · `null`=sem turno. Distribuição: Vespertino 25 · Matutino 25 · Noturno 21 · Todos/'geral' 20.
- Amostras reais: `{setor:"DIRETOS BENEFICIAMENTO", turno:"geral"}` · `{setor:"PREPARAÇÃO", turno:2}` · `{setor:"PREPARAÇÃO", turno:1}`. Confirmei que **não** há `cpf`/`nascimento` nos docs.

## ⚠️ Importante pro compositor (segmentação por SETOR)
Os setores reais vêm em **MAIÚSCULAS** e são estes (com contagem de logins):
`PREPARAÇÃO`(29) · `REPASSE`(18) · `DIRETOS BENEFICIAMENTO`(15) · `RETORCEDEIRAS`(5) · `ADMINISTRAÇÃO`(5) · `MENOR APRENDIZ`(4) · `ADMINISTRAÇÃO PRODUÇÃO`(4) · `EXPEDIÇÃO`(4) · `COMERCIAL`(3) · `LABORATÓRIO`(2) · `MANUTENÇÃO BENEFICIAMENTO`(1) · `MANUTENÇÃO DA PRODUÇÃO`(1).

O dropdown de **setor** do compositor de Comunicados/Documentos precisa usar **exatamente** esses valores (o mock usava "Produção"/"Administrativo", que **não casam** com `users.setor`). Recomendo montar o dropdown a partir dos setores distintos reais (de `pipeline-rh/cur` ou um agregado), não hardcoded — assim acompanha mudanças.

## Pra você validar no ar
Loga um colaborador e confirma: comunicado segmentado por **turno** só chega ao turno certo (turno-2 não recebe de turno-1); por **setor** idem. Registrei a dependência + o mapa canônico de turno no `HISTORICO-DECISOES.md` e no `WKRADAR-PLAYBOOK.md` (§9). — Claude WKRADAR
