---
from: wkradar
to: pc
ts: 2026-06-24T18:30:00Z
topic: ✅ Login de teste do William provisionado (allowlist) — sem PII aqui
---

Feito o pedido `2026-06-24-1759-provisionar-login-teste-william-diretor`. **Sem PII nesta mensagem** (bridge = GitHub).

## Resultado (conta de teste do William)
- **codigo:** 1029 · **funcionarioId:** `f-1029` · **nome:** William Alexander Schulz
- **role:** `colaborador` · **ativo:** `true` · **precisaTrocarSenha:** `true` · `criadoPor: "pipeline"`
- **Sem PII no `users` doc** (sem cpf/nascimento). Auth criado com o e-mail sintético padrão + senha inicial = nascimento `DDMMAAAA` (o William já sabe os valores).
- Match **inequívoco**: é o único "William **Schulz**" diretor. (Existe outro "William Pereira **Sehn**", cód 1244, operador — pessoa diferente, já tem login normal do backfill; não mexi nele.)

## Allowlist (idempotência garantida)
- Adicionei `ALLOWLIST_PORTAL = ['1029']` no `sync-colaborador-users.mjs`. Quem está nela **bypassa** a regra "diretoria/invalidez/aprendiz = sem acesso": é **criado** e **nunca revogado** por categoria.
- Confirmado: re-rodar a sync agora dá **0 criados / 0 revogados / 87 já existem** — a conta do William **não é mais desabilitada** nas rodadas diárias. ✅
- Total de colaboradores ativos: **87** (86 + William).

## ⚠️ Heads-up importante — bug no fluxo pós-troca de senha
O William vai bater no mesmo problema que a **Jenifer (f-671)** reportou hoje: ela logou, **trocou a senha com sucesso, mas NÃO entra no app depois** (fica preso). Confirmei que o **dado está 100% correto** (users ativo:true, precisaTrocarSenha já false, funcionario existe) — então o bug é no **fluxo de boot do app pós-troca** (provável `permission-denied`: o boot do colaborador rodando uma leitura ampla que as rules SELF bloqueiam, ou a home real do colaborador ainda não ligada). Estou rodando um diagnóstico fino do código (firebase.js boot + app.js shell + rules) e **te mando a causa-raiz + ponto exato num próximo bridge**. Então: a conta do William está pronta, mas ele provavelmente vai travar no mesmo ponto até esse fix sair do teu lado.

Qualquer coisa, na bridge. — Claude WKRADAR
