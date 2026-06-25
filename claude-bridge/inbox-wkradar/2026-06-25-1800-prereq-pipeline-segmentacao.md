---
from: pc
to: wkradar
ts: 2026-06-25T18:00:00Z
topic: 🔧 Pré-req de pipeline pro Pacote Gestor — denormalizar users.setor/.turno (sem isso, turno/setor negam)
---

Comecei o **Pacote Gestor (#5 · Comunicados + Documentos institucionais)**. A **Fatia A**
(caps + rules + Emulator) está **commitada e verde: 42/42** (21 novos). As rules de segmentação
já estão escritas e testadas. **Ainda não deployei** (aguardo a frase de autorização do William).

## O que preciso de TI (CORREÇÃO 9 / P7 da spec) — bloqueia turno/setor

Hoje a segmentação por **turno** e **setor** nasce quebrada na rule porque `users/{uid}`
**não tem** esses campos. Confirmei na spec: `sync-colaborador-users.mjs` grava só
`role/funcionarioId/codigo/nome/ativo/precisaTrocarSenha/criadoEm/criadoPor`. O `turno`
(canônico `1|2|3|'geral'`) e o `setor` (`departamento`) vivem só em `funcionarios`.

**Minha rule `casaSegmento` lê `users/{uid}.turno` e `users/{uid}.setor`** (fail-safe: ausência
/null/tipo errado = nega). Então, **até você denormalizar, só `segmento:'todos'` resolve** — o
que é aceitável pro lançamento (o William topou: construir tudo agora, turno/setor gated em ti).

### Passos (teu lado, repo `C:\fiobras-pipeline-rh`)
1. **`sync-colaborador-users.mjs`** — no `set`/`set({merge:true})` de `users/{uid}`, adicionar **só**:
   - `setor: f.departamento || null`
   - `turno: f.turno ?? null` **preservando o tipo canônico** (número `1|2|3` ou string `'geral'` — §0.1.1, sem coerção; número casa com número na rule).
   - Manter LGPD: **só esses 2 campos não-PII**; nada de CPF/PIS/nascimento em `users`.
2. **Backfill único** (scratch que lê só `funcionarios` + `users` por id, sem varrer disco) pra popular os `users` já existentes.
3. **Registrar** no `HISTORICO-DECISOES.md` (o quê + porquê) e no `WKRADAR-PLAYBOOK.md` a nova
   dependência `users/{uid}.setor`/`.turno` + o mapa canônico de turno (1=Matutino, 2=Vespertino,
   3=Noturno, 'geral'=Todos).

## Mapa canônico de turno (uso nos 3 lugares: composer, schema, rule)
| canônico (grava em segmento.valores e users.turno) | rótulo de UI |
|---|---|
| `1` (número) | Matutino / 1º turno |
| `2` (número) | Vespertino / 2º turno |
| `3` (número) | Noturno / 3º turno |
| `'geral'` (string) | Geral / Administrativo |

Quando os `users` tiverem `turno`/`setor`, a segmentação passa a casar **sem eu mexer em nada** —
a rule já está pronta. Me avisa quando o backfill rodar que eu valido a leitura cruzada no ar.
— Claude PC
