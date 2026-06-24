---
from: pc
to: wkradar
ts: 2026-06-24
tipo: missão (pipeline / Admin SDK)
status: pending
requer: Admin SDK (criação/edição de usuários no Firebase Auth)
---

# Missão — Pipeline cria/inativa usuários COLABORADOR (login por CPF)

Estamos construindo o **Portal do Colaborador** no FioPulse. A **fundação de auth já está no ar**
(papel `colaborador` no motor de permissões, vínculo `uid↔funcionarioId`, e rules endurecidas que dão
escopo SELF — colaborador só lê os próprios dados; CPF/PIS seguem só admin/RH). **Falta criar as contas
de Auth dos colaboradores.**

Ideia (do William): em vez de um cadastro manual, **o pipeline cria e inativa automaticamente**,
porque ele já roda no servidor com Admin SDK e já sabe quem entrou e quem saiu do quadro. Esta missão é
**100% pipeline/Admin SDK** (teu domínio) — **não tem UI, não precisa de mockup**. A parte do app
(rules, schema `users`, trava de login por `ativo`) já está pronta e deployada.

## Identidade de login (decidido)
- **E-mail sintético:** `{cpfSóDígitos}@colaborador.fiobras.local` (domínio interno fake; nunca recebe
  e-mail). Login no app é por CPF → o app monta esse e-mail e faz `signInWithEmailAndPassword`.
- **Senha inicial:** a **data de nascimento** no formato `DDMMAAAA` (8 dígitos). Ex.: 14/07/1990 → `14071990`.
- **Troca obrigatória:** marcar `precisaTrocarSenha: true` na criação — o app força criar senha nova no
  1º acesso (a senha = nascimento é previsível; a troca mitiga).

## O que o pipeline deve fazer (a cada rodada, idempotente)

Para cada funcionário da fonte:

### 1. Criar (novo admitido OU backfill da base)
Se `ativo === true`, tem **CPF** e **nascimento**, e **ainda não existe** Auth user com esse e-mail:
1. `admin.auth().createUser({ email, password: DDMMAAAA, emailVerified: false })` → obtém `uid`.
2. Grava `users/{uid}`:
   ```json
   {
     "role": "colaborador",
     "funcionarioId": "f-" + codigo,
     "codigo": codigo,
     "nome": nome,
     "ativo": true,
     "precisaTrocarSenha": true,
     "criadoEm": <serverTimestamp>,
     "criadoPor": "pipeline"
   }
   ```
   **NÃO** gravar CPF/PIS/nascimento em `users` (minimização LGPD — PII fica só em `banco-horas-saldos`).
3. Registrar em `auditoria`: `{ por: "<uid-serviço-ou-'pipeline'>", tipo: "usuario", acao: "Criou login de colaborador", alvo: "f-"+codigo, em: <serverTimestamp> }`.

> **Backfill da base atual = a 1ª rodada.** Como ninguém existe ainda, a primeira execução cria todos
> os ativos com CPF+nascimento. Das próximas rodadas em diante, só cria os novos. **Não precisa de
> script separado** — a idempotência resolve legado + dia a dia.

### 2. Inativar (demissão)
Se o funcionário virou `ativo === false` e existe o `users/{uid}` colaborador dele:
1. `users/{uid}.ativo = false` (o app **já barra** login com `ativo===false` — feito na fundação).
2. **Recomendado:** `admin.auth().updateUser(uid, { disabled: true })` (revoga a credencial de verdade;
   a trava do app é a 1ª linha, isto é defesa em profundidade).
3. Auditoria: `acao: "Inativou login de colaborador"`. **Nunca apagar** o usuário nem histórico (conformidade).

### 3. Readmissão (DECISÃO do William, 24/06)
Tratar como **acesso novo / começo do zero**: **resetar a senha** pra nascimento (`DDMMAAAA`) +
`precisaTrocarSenha:true`, e **não herdar o histórico de uso anterior** do portal (estado do colaborador
zerado). Restrição técnica: o e-mail sintético é o CPF (único no Auth) → reaproveita-se o **mesmo uid
"resetado"** (não dá pra ter 2 Auth users com o mesmo CPF). **A trilha de auditoria do vínculo anterior
é preservada por lei** (compliance), separada do login — o login fica "novo", mas o registro histórico
de auditoria NÃO é apagado. (Se quiser zerar `users/{uid}` mantendo só os campos do vínculo + flags,
ok; o histórico imutável vive em `/auditoria`.)

## Regras de ouro
- **Idempotência:** matching por e-mail sintético (CPF) **e/ou** por `users` doc com
  `funcionarioId == "f-"+codigo && role=="colaborador"`. Nunca duplica, nunca recria. Roda todo dia sem efeito colateral.
- **NÃO tocar gestores:** o pipeline gerencia **só** usuários `role:"colaborador"` que ele criou. Contas
  admin/rh/lider/supervisor (criadas à mão) são **intocáveis**.
- **Afastado** (`afastado===true`): **cria/mantém** (afastado acessa o portal; suspensão de cobrança é app-side).

## Casos a tratar e RELATAR (pula, loga warning — não cria)
- **Sem CPF ou sem nascimento** → não dá pra criar login → pular + listar no relatório.
- **CPF duplicado** entre funcionários → pular ambos + reportar (problema de dado a corrigir).
- **`bhExempt===true`** → decisão: ganham login? (provável que sim — são funcionários). Confirmar.
- **Diretoria** (`diretor===true`: Landolino, Jules, William): **NÃO criar login** (DECISÃO do William,
  24/06). Pular sempre `diretor===true` — não cria conta nem grava `users` pra eles.

## Pré-requisito de DADOS (confirmar)
- **CPF:** já existe (`banco-horas-saldos/{codigo}.cpf`). ✔
- **Nascimento (DDMMAAAA):** é a senha inicial. ✔ **Confirmado pelo William (24/06): já está disponível
  no pipeline.** Usar como senha inicial (formato `DDMMAAAA`, 8 dígitos).

## Entrega
1. Pipeline passa a criar/inativar nas rodadas (idempotente). 1ª rodada = backfill.
2. **Relatório no bridge:** quantos criados / inativados / pulados (e por quê) na 1ª rodada.
3. Sem mockup (é backend). A parte do FioPulse (rules SELF, trava `ativo`, schema `users`, login por CPF)
   já está no ar / em andamento.
4. Dúvidas de schema/escopo → bridge.

— Claude do PC (FioPulse)
