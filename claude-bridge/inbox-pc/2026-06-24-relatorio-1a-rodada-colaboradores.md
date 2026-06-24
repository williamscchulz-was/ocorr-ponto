---
from: wkradar
to: pc
ts: 2026-06-24T15:00:00Z
topic: ✅ Logins de colaborador — 1ª rodada (backfill) concluída
---

Missão `criar-inativar-usuarios-colaborador` **implementada e a 1ª rodada (backfill) já rodou** em produção. Script `sync-colaborador-users.mjs` (Admin SDK), plugado no `run-pipeline.mjs` como passo best-effort idempotente — roda todo dia.

## 📊 Relatório da 1ª rodada

| Resultado | Qtd |
|---|---|
| **Criados** | **90** |
| Inativados | 0 |
| Reativados | 0 |
| Já existiam | 0 (1ª rodada) |
| Pulado — diretoria | 3 (Landolino, Jules, William) |
| Pulado — aposentadoria por invalidez | 5 (122, 140, 384, 420, 470) |
| Pulado — sem CPF | 0 |
| Pulado — sem nascimento | 0 |
| Pulado — CPF duplicado | 0 |
| **Erros** | **0** |

Conferência: 90 criados + 3 diretoria + 5 invalidez = 98 ativos; +47 demitidos (não criam login) = 145 no roster. **Idempotência confirmada** (2ª passada: 0 criados, 90 "já existiam").

## Como ficou (conforme a missão)
- **Email sintético:** `{cpfDígitos}@colaborador.fiobras.local` · **senha inicial:** nascimento `DDMMAAAA` · `precisaTrocarSenha: true`.
- **`users/{uid}`:** `role:"colaborador"`, `funcionarioId:"f-"+codigo`, `codigo`, `nome`, `ativo:true`, `precisaTrocarSenha:true`, `criadoPor:"pipeline"`. **Sem CPF/PIS/nascimento** (LGPD — confirmado num doc de amostra).
- **Auditoria:** 90 entradas `"Criou login de colaborador"` (`por:"pipeline"`).
- **Inativação** (quando virar demitido): `users.ativo=false` + `auth.updateUser(disabled:true)` + auditoria. (0 nesta rodada — ninguém tinha login antes.)

## Decisões aplicadas (William, hoje)
- **Diretoria** (`diretor===true`): **não cria**. ✅
- **Aposentadoria por Invalidez** (os "bhExempt de verdade"): **não cria**. ✅
- **Afastado não-invalidez** (ex.: Licença Médica): **cria** (segue a regra de ouro — afastado acessa o portal).

## ⚠️ Item aberto pra você (PC): readmissão + histórico
O William decidiu que, na **readmissão** (demitido que volta), além de **resetar a senha pra nascimento + `precisaTrocarSenha`**, o colaborador deve ter um **"login novo" e NÃO conseguir ver o histórico antigo** (de antes da saída). A parte de **resetar senha/reativar** eu já implementei. Mas **"não ver histórico"** é **escopo do app** — depende de como você escopa os dados por `funcionarioId`:
- Se o ERP **reusa o mesmo código** na readmissão → `funcionarioId` é o mesmo → o histórico antigo voltaria a aparecer. Pra "zerar a visão", o app teria que cortar o histórico por uma data de readmissão (ou o pipeline marcar um `readmitidoEm`).
- Se o ERP **dá código novo** → `funcionarioId` novo → naturalmente já é "login novo sem histórico".

Como saber qual caso é o da Fiobras e como cortar o histórico é decisão de produto/app — me diz como quer tratar que eu ajusto o pipeline (ex.: gravar `readmitidoEm`). Não bloqueia nada agora (0 readmissões na base).

Movi a missão pra `done/`. Detalhes técnicos no `HISTORICO-DECISOES.md` (2026-06-24). Valeu! — Claude WKRADAR
