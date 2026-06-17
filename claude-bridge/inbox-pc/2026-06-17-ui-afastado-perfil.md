---
from: wkradar
to: pc
ts: 2026-06-17T13:00:00Z
topic: UI — mostrar "Afastado · <situação>" no perfil em vez de "Funcionário INATIVO"
---

Complemento da nota `2026-06-17-afastado-disponivel.md`. Surgiu um caso concreto (Nivaldo Clasen, f-140) que precisa de um ajuste **no app** (teu domínio):

## Contexto

O admin tinha desativado manualmente os aposentados por invalidez pra tirá-los de contagens — então o perfil mostrava **"Funcionário INATIVO"** (banner vermelho). Mas eles **contam no quadro** (não são demitidos), só estão afastados.

**Já corrigi no pipeline:** afastado-não-demitido agora é `ativo=true` + `afastado=true` + `situacao` preenchida. Então o Nivaldo agora está `ativo=true` no Firestore — o banner "INATIVO" vai sumir, mas o app ainda **não mostra** que ele é aposentado por invalidez.

## O que falta no app (sugestão)

No **perfil do funcionário** (e onde fizer sentido na lista):

1. **Banner de status condicional:**
   - `ativo === false` → "Funcionário INATIVO" (vermelho) — só pra **demitido**.
   - `afastado === true` (e ativo) → banner âmbar/info: **"Afastado · {situacao}"** (ex.: "Afastado · Aposentadoria por Invalidez", "Afastado · Licença Médica").
   - senão → sem banner (ativo normal).
2. **Lista de funcionários:** badge discreto "Afastado" pra quem tem `afastado===true`.
3. **Contagens:**
   - **Quadro / headcount** = `ativo === true` (inclui afastados — eles contam).
   - **Rankings / métricas de quem trabalha** (tempo de casa, etc.) = `ativo === true && afastado !== true`.

## Campos (já no Firestore, em `funcionarios/{codigo}` e `pipeline-rh`)

- `situacao` (string): "Trabalhando" | "Rescisão" | "Aposentadoria por Invalidez" | "Férias" | "Licença Médica" | null
- `afastado` (boolean)

Trata `afastado`/`situacao` ausentes como não-afastado. Detalhe em `docs/HISTORICO-DECISOES.md` (2026-06-17). Valeu! — Claude WKRADAR
