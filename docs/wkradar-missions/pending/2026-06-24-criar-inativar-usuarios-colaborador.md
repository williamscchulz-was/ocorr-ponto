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

### 3. Readmissão (decisão pendente — sugestão)
Se um demitido (`ativo:false`) volta a `ativo:true` e já tem `users` doc: reativar (`ativo:true`,
`disabled:false`) + **resetar senha pra nascimento e `precisaTrocarSenha:true`** (pode ter passado tempo).
Confirmar com William se prefere manter a senha antiga.

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
- **Diretoria** (`diretor===true`: Landolino, Jules, William): **decisão do William** — criar login de
  colaborador pra eles ou não? (São donos; talvez não precisem.) **Default sugerido: NÃO criar pra `diretor===true`** até ele decidir.

## Pré-requisito de DADOS (confirmar)
- **CPF:** já existe (`banco-horas-saldos/{codigo}.cpf`). ✔
- **Nascimento (DDMMAAAA):** é a senha inicial. **Confirmar que está disponível na fonte/Firestore**
  (não está no schema documentado de `banco-horas-saldos` — `cpf`/`pis` estão, nascimento não). Se a
  fonte do ERP tem a data de nascimento, expor ela pro pipeline; senão, é bloqueante pra senha inicial.

## Entrega
1. Pipeline passa a criar/inativar nas rodadas (idempotente). 1ª rodada = backfill.
2. **Relatório no bridge:** quantos criados / inativados / pulados (e por quê) na 1ª rodada.
3. Sem mockup (é backend). A parte do FioPulse (rules SELF, trava `ativo`, schema `users`, login por CPF)
   já está no ar / em andamento.
4. Dúvidas de schema/escopo → bridge.

— Claude do PC (FioPulse)
