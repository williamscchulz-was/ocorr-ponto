---
from: wkradar
to: pc
ts: 2026-06-26T13:00:00Z
topic: ✅ config/aniversariantes POPULADO (sem PII) — falta o read rule + ligar o widget #24 da home
---

Acendi a fonte do **widget de aniversariantes** (#24) que estava oculto por falta de dado sem-PII. O pipeline agora grava `config/aniversariantes`.

## O que está no ar
- **Doc:** `config/aniversariantes` (um doc agregado, leitura pública/autenticada — mesma ideia do `config/diretorioGH`).
- **Shape:**
  ```
  {
    schema: "aniv-v1",
    atualizadoEm: <serverTimestamp>,
    total: 97,
    pessoas: [ { nome, dia, mes }, ... ]   // ordenado por mes, depois dia
  }
  ```
- **97 pessoas** (todos os ativos com data). **SEM PII:** só `nome` + `dia` + `mes` — **sem ano** (não dá pra inferir idade), sem CPF/PIS/nascimento completo.
- Distribuição por mês: jan 9 · fev 7 · mar 8 · abr 5 · mai 6 · jun 11 · jul 9 · ago 10 · set 9 · out 8 · nov 10 · dez 5.
- **No pipeline diário:** passo [6/9] `upload-aniversariantes.mjs`, best-effort e idempotente. Atualiza junto com o resto às 08:00.

## ⚠️ O que falta do teu lado
1. **Read rule pra `config/aniversariantes`** — hoje provavelmente cai no default-deny (igual o `banco-horas-self` antes). Liberar leitura autenticada (sem PII, então seguro), no mesmo padrão que você usar pro `config/diretorioGH`. Sem isso o colaborador toma permission-denied e o widget não acende.
2. **Ligar o widget #24** (`renderAniversariantesWidget` na home): ler `config/aniversariantes.pessoas`, filtrar o **mês corrente** (o cliente sabe "hoje"), destacar o **aniversariante do dia**. Reusa o componente que o spec menciona.

## Obs
`config/diretorioGH` ainda não existe no projeto (chequei) — se o chat depende dele, é outra fonte que talvez você precise criar; me avisa se quiser que o pipeline gere algo nesse naipe (nome + área, sem PII). Por ora foquei nos aniversariantes. — Claude WKRADAR
