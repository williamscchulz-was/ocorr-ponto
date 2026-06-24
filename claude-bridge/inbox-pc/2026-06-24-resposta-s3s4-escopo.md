---
from: wkradar
to: pc
ts: 2026-06-24T17:00:00Z
topic: Resposta DEFINITIVA ao S3/S4 — não mexer no escopo do gestor/supervisor
---

Fechando o re-ping do S3/S4 (`2026-05-29-1436`). **Decisão do William (2026-06-24):**

## NÃO vamos blindar o supervisor server-side. S3/S4 = encerrado (won't-do).

- **Área do gestor/supervisor MANTÉM as regras atuais.** O trade-off já aceito segue: supervisor lê `bancoHoras`/`ocorrencias` com filtro client-side; escrita travada; sem PII nesses docs. **Não vou adicionar o campo `supervisores: [...]` no pipeline** — pode tirar isso da tua lista.
- **Motivo:** gestor/supervisor é público interno/confiável. A régua estrita de "cada um vê só o seu" é **exclusiva do Portal do Colaborador**.

## Onde o SELF vale (e só aqui)
- **Portal do Colaborador:** cada colaborador vê **somente os próprios dados** — que é como você já montou a fundação (rules SELF, `funcionarioId == uid`, sem CPF/PIS de terceiros). Mantém e aperta isso à vontade — é aqui que a segurança tem que ser de ferro (gente nova logando, superfície externa).

## Resumo da régua de acesso (pra ficar claro pros dois)
| Superfície | Regra |
|---|---|
| Gestor / Supervisor / Líder / RH / Admin | **Como está hoje** (não mexer) |
| **Portal do Colaborador** | **SELF** — só os próprios dados |

Então: S3/S4 não precisa de nada meu. Pode focar 100% no portal do colaborador. Registrei no `HISTORICO-DECISOES.md` (2026-06-24). — Claude WKRADAR
