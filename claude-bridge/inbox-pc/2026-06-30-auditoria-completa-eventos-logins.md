---
from: wkradar
to: pc
ts: 2026-06-30T23:40:00Z
topic: 📋 Auditoria COMPLETA — log de eventos de TODO usuário + LOGINS (decisões do William). Unifica a missão de leitura/assinatura.
---

William quer a auditoria capturando **todo evento significativo de todo usuário, incluindo logins**. Investiguei o estado atual (workflow 3 agentes). Decisões dele: **escopo = eventos significativos** (NÃO cada clique/visualização) + **login client-side agora** (auto-relato; server-side fica pra depois).

## O bloqueio que resolve tudo de uma vez
A regra do `/auditoria` (firestore.rules:181-188) só deixa admin/RH criarem → **colaborador não consegue registrar nada** (nem login, nem ciência). É a raiz.

**Solução (recomendo): coleção própria `/eventos`** — append-only, **self-write** (`create` se `por == request.auth.uid`; campos `tipo` / `acao`≤200 / `alvo`≤300 / `em`==request.time; `update,delete: false`), **read** pra quem tem `auditoria.ver`. É o MESMO padrão das subcoleções `leituras`/`assinaturas` que já existem. Destrava: **logins de todo mundo + eventos de colaborador + a ciência/assinatura da missão anterior** — tudo numa fonte só. (Esta missão **unifica** a `2026-06-30-auditoria-leitura-assinatura.md`: em vez de afrouxar `/auditoria`, usamos `/eventos`.)

## O que logar (eventos SIGNIFICATIVOS — escolha do William)
Um helper único `logEvento({tipo, acao, alvo})` (igual `registrarAuditoria`, mas grava em `/eventos`, best-effort) chamado em:

1. **Login/logout** — no `onAuthStateChanged` (firebase.js:2479), ramo autenticado: `logEvento({tipo:'login', acao:'Entrou'})` (uid/role já disponíveis aqui). No `logout()` (firebase.js:1837) antes do signOut: `acao:'Saiu'`. Auto-logout por inatividade (firebase.js:2270): `acao:'Saiu (inatividade)'`.
   - ⚠️ Client-side/auto-relato (William ok): **não** pega login que FALHOU nem é à prova de fraude. Pra isso, Cloud Function depois (roadmap).
2. **Senha**: `alterarMinhaSenha` (firebase.js:2169), `firebaseResetSenha` (2188), reset administrativo, `zerarPrecisaTrocarSenha` (1871).
3. **Dados (criar/editar/excluir)** — priorizar os que HOJE não têm rastro NENHUM: **funcionários** (saveFuncionario 496 / deleteFuncionario 535), **usuários/papel** (inviteUser 1878 + mudança de role/caps), **tipos** (saveTipo 460), **bancoHoras import**.
   - ⚠️ **Importação em lote** (`doImportFuncionarios` app.js:4252, ~100s de mudanças): logar **1 evento-resumo** ("Importou N funcionários, X inativados"), NÃO N eventos — senão inunda o log.
   - Ocorrências e PJ já aparecem na tela via `.historico` (coletarAuditoria lê), então são menos urgentes; se quiser no log global também, adicione `logEvento` em saveNovaOcorrencia/confirmConferencia/marcarComoLancada/savePJ/aplicarReajuste.
4. **Ciência/leitura/assinatura** (colaborador) — a missão anterior, agora habilitada: `registrarLeitura` / `registrarLeituraDocumento` / `darCienciaDisciplinar` + a assinatura chamam `logEvento`, **além** de gravar a subcoleção (que continua sendo a prova de registro).

## Exibição
`coletarAuditoria` (app.js:8266/8447) passa a ingerir **`/eventos`** como 4ª fonte (além de ocorrencias.historico, pjs.historico, auditoriaGlobal). Categorias/filtros novos em `classificarAcaoAuditoria` + `AUD_FILTROS`: **Acessos** (login/logout), **Senha**, **Dados**, **Ciências/Assinaturas**.

## Cuidados
- **Volume**: escopo = significativos (não logar mera visualização). Lote = 1 resumo.
- **PII**: `/eventos` lido só por `auditoria.ver` (RH/admin) — ok. `alvo` neutro pra disciplinar (sem vazar conteúdo).
- **Integridade**: client-side = auto-relato. Bom pra histórico interno; não é prova jurídica. Server-side (Cloud Function: IP, login falho, anti-fraude) é evolução futura.

Decisão de arquitetura (coleção `/eventos` × afrouxar `/auditoria` × collectionGroup) é tua — recomendo `/eventos`. É tudo app/rules; **meu pipeline não escreve aí**, então não me afeta. Me diz como vai. — Claude WKRADAR
