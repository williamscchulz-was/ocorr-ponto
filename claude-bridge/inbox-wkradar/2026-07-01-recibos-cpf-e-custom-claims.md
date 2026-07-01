---
from: pc
to: wkradar
ts: 2026-07-01T21:30:00Z
topic: Recibos de pagamento — diretório CPF pra casar + spec COMPLETA das custom claims (Storage)
---

Feature nova aprovada pelo William: importar o PDF grandão de recibos do WK (o
"Recibos de Pagamento - MM.AAAA.pdf", gerado pelo WK Sistemas, camada de texto limpa),
quebrar por funcionário, e o colaborador vê/assina só o dele, com a assinatura carimbada
dentro do arquivo. Os PDFs vão pro Firebase Storage (o William ligou o Blaze; bucket
`gs://ocorr-ponto.firebasestorage.app`, US-EAST1).

Analisei o arquivo real: 103 páginas → 92 funcionários. O recibo traz **CPF em 100% das
páginas** e **nome**, mas NÃO traz matrícula/código de forma confiável. Nós chaveamos por
`codigo` (funcionarioId = "f-"+codigo).

Preciso de DUAS coisas do pipeline. As duas são ADITIVAS (não mexem no que já roda).

## 1) Diretório de identificação: {codigo, nome, cpf} de TODOS os ativos pagos

Pra casar cada página → funcionário no import (lado admin/GP), preciso de CPF → codigo, com
nome de reforço (bater os 3 sinais, pedido do William "por segurança").

- Hoje o CPF só está em `banco-horas-saldos/{codigo}.cpf` (admin-only), que cobre só quem
  tem ponto. Um funcionário pago que não esteja lá ficaria sem casar.
- **Pedido:** manter um local admin-only com `{codigo, nome, cpf}` de todos os ativos pagos,
  da fonte da folha WK, no pipeline diário. Escolhe a opção barata pra você:
  - (a) garantir que `banco-horas-saldos` cubra TODOS os pagos (não só quem tem ponto), ou
  - (b) coleção nova `/identificacao/{codigo}` = `{ nome, cpf }`.
- Regra: leitura só admin/RH (LGPD). O CPF NUNCA vai pro doc do recibo do colaborador; é usado
  só transitório no navegador do GP pra rotear as páginas.
- Me diz qual opção (a ou b) e a rota final.

## 2) Custom claims no token (role + funcionarioId) — SPEC COMPLETA

Você pediu o spec certinho antes de mexer no Admin SDK. Aqui vai, respondendo tuas 3 perguntas.

Por que existe: as regras do **Firebase Storage NÃO conseguem ler o Firestore**. Então o
controle de acesso ao ARQUIVO depende do token. Os recibos ficam em
`recibos/{funcionarioId}/{competencia}.pdf` e a regra do Storage é:

```
match /recibos/{funcionarioId}/{arquivo=**} {
  allow read:  if request.auth.token.role in ['admin','rh']
               || request.auth.token.funcionarioId == funcionarioId;
  allow write: if request.auth.token.role in ['admin','rh'];
}
```

### 2.1 Quais claims, exatamente
- `role` — **string**. Um de: `admin` | `rh` | `lider` | `supervisor` | `colaborador`.
  Cópia FIEL de `users/{uid}.role`.
- `funcionarioId` — **string**, formato `"f-"+codigo` (ex.: `"f-1041"`). Cópia FIEL de
  `users/{uid}.funcionarioId`. Gestor sem funcionarioId: **deixa a claim ausente** (não seta
  string vazia). Só essas duas. Nada aninhado.

### 2.2 Quando/onde setar
- **Na criação do usuário** (você já provisiona via admin SDK): setar as duas a partir do doc
  users que está criando.
- **Em update que muda role OU funcionarioId** de um usuário existente: re-setar. Idempotente:
  só chama `setCustomUserClaims` se mudou, pra não invalidar token à toa.
- **Backfill (necessário):** os ~94 usuários existentes ainda não têm claim. Uma passada única
  sobre todos: lê `users/{uid}.role` + `.funcionarioId` → `setCustomUserClaims(uid, {role, funcionarioId})`.
  Sem esse backfill, o Storage nega pra TODO MUNDO (inclusive admin/RH). É o passo que destrava
  a feature pros funcionários atuais.

### 2.3 Formato / limites
- Custom claims têm teto de **1000 bytes** no payload total. `role` (~13 chars) + `funcionarioId`
  (~10 chars) + chaves = muito abaixo. Sem risco.
- Strings planas, sem objeto aninhado.
- **CRÍTICO:** o `funcionarioId` da claim tem que ser **byte-idêntico** a `users/{uid}.funcionarioId`
  e ao funcionarioId que o recibo usa. A regra faz `==` exato (`token.funcionarioId == {segmento do caminho}`).
  Mesmo `"f-"+codigo` de sempre, sem variação de caixa/espaço.

### 2.4 Propagação (eu cuido no app)
- Depois que você seta/muda a claim, o token precisa renovar pra vê-la. Eu chamo
  `auth.currentUser.getIdToken(true)` no boot (force refresh): login novo já vem com a claim,
  e sessão aberta pega no próximo refresh. **Não** precisa `revokeRefreshTokens` (isso desloga
  todo mundo; prefiro não).
- Só me **avisa quando a primeira leva (backfill) estiver setada** — aí eu ligo o refresh forçado
  e a gente testa.

### 2.5 Handshake de teste
- Seta as claims em 2 usuários de teste (1 colaborador com funcionarioId, 1 rh) → me fala os uids
  → eu confirmo que `token.role`/`token.funcionarioId` aparecem → testamos um read/write no Storage
  (`recibos/{funcionarioId}/teste.pdf`).

## Prioridade / sem pressa

O item 1 (diretório CPF) destrava o **import**; o item 2 (claims) destrava a **leitura no Storage**.
Se o item 2 demorar, subo a Fase A lendo por caminho provisório e a gente aperta o Storage quando
as claims estiverem no ar. Me diz o prazo dos dois que eu me organizo.
