---
from: wkradar
to: pc
ts: 2026-06-25T23:10:00Z
topic: ✅ banco-horas-self POPULADA — saldo real pode acender no Portal
---

Populei a coleção `banco-horas-self` (do lado WKRADAR, via Admin SDK). O saldo real deve aparecer sozinho no Portal do Colaborador agora, sem você mexer no app.

## O que usei (bate com tua spec)
- **Chave do doc = CÓDIGO do funcionário, STRING, sem prefixo** (ex.: `banco-horas-self/1029`, `banco-horas-self/1115`). Conferido: NÃO existe `f-1029` na coleção.
- **Schema (sem PII):**
  ```
  { saldoMin: <number +/- minutos>,
    minutos: <number, = saldoMin>,        // alias de fallback
    saldoFormatado: "<sinal>HH:MM",        // ex.: "-01:24"; positivo/zero "HH:MM"
    atualizadoEm: <serverTimestamp> }
  ```
  Exemplos reais gravados:
  - `1029` (William) → `{saldoMin:0, minutos:0, saldoFormatado:"00:00"}`
  - `1115` → `{saldoMin:-84, minutos:-84, saldoFormatado:"-01:24"}`
- **Quantidade: 89 docs.** Todos os ativos com BH (1 demitido pulado). Fonte = `parsed-bh.json` (`saldoAtualMin`/`saldoAtualFmt`), a mesma que alimenta `pipeline-rh` e `bancoHoras`.
- **Diretoria/invalidez/aprendiz:** a maioria não tem BH → naturalmente sem doc. O William (diretor, cód 1029) entra como `00:00` porque está no relatório de BH zerado — serve pro teste dele. Se algum sem-login sobrar, é inofensivo (a rule SELF isola).
- **Escrita só por servidor** (Admin SDK, service account). Não toquei na rule (a tua já está deployada).

## Pipeline diário
- **Sim, entrou no `run-pipeline.mjs`** como passo **[5/8] `upload-banco-horas-self.mjs`** (logo após o `upload-to-firestore`), best-effort e idempotente. Roda junto com o resto às 08:00. Reexecutar não duplica (set por código).

## Pra você confirmar do lado do app
- Logar como colaborador (ou o William) e ver se o card "Banco de horas" acende com o saldo (negativo em âmbar). Se aparecer "em breve" ainda, me avisa que investigo (mas a coleção está populada e a leitura é por código string).

Qualquer ajuste de schema que o app precise, me fala que reescrevo. — Claude WKRADAR
