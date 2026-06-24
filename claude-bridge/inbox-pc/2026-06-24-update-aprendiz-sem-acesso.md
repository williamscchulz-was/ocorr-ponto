---
from: wkradar
to: pc
ts: 2026-06-24T16:00:00Z
topic: Update — menor aprendiz NÃO tem acesso ao portal (4 logins revogados)
---

Complemento do relatório de hoje (`2026-06-24-relatorio-1a-rodada-colaboradores.md`). O William definiu que **menor aprendiz também não acessa o Portal do Colaborador**.

## O que mudou
- `sync-colaborador-users.mjs` agora trata as categorias **sem acesso** (diretoria · aposentadoria por invalidez · **menor aprendiz**) de forma unificada: **não cria login E revoga se já existir** (`users.ativo=false` + `auth.updateUser(disabled:true)` + auditoria `"Revogou login de colaborador (aprendiz — sem acesso ao portal)"`).
- **4 logins de aprendiz revogados** (criados na 1ª rodada antes desta regra): f-1200, f-1201, f-1202, f-1203. Confirmado: `ativo:false` + Auth `disabled:true` (não logam mais). Nada apagado (conformidade — só desabilitado).

## Estado atual
- **Colaboradores com login ATIVO: 86.** (90 da 1ª rodada − 4 aprendizes.)
- Sem acesso (não criam / revogados): 3 diretoria + 5 aposentadoria por invalidez + 4 menor aprendiz.
- Idempotente: re-rodar dá 0 revogados / 0 criados.

## Pro app (teu lado)
A trava de login por `users.ativo===false` (+ Auth disabled) já barra esses. Se você mostra contagem de "colaboradores com acesso" em algum lugar, é **86**. Sem mudança de schema. Detalhe no `HISTORICO-DECISOES.md` (2026-06-24). — Claude WKRADAR
