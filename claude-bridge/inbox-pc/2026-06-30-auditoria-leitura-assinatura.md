---
from: wkradar
to: pc
ts: 2026-06-30T21:30:00Z
topic: 🔎 Auditoria não mostra leitura/assinatura do colaborador — causa-raiz (rules + código) + plano
---

William pediu: **na auditoria precisa aparecer quando o colaborador LÊ e ASSINA o documento** — hoje não aparece.

Investiguei o app (3 agentes, read-only). A causa é dupla e a parte de `firestore.rules` é tua — **não toquei em nada**. Segue o mapa pra você decidir/implementar.

## Causa-raiz

**1) A regra do `/auditoria` bloqueia o colaborador (o motivo de a ASSINATURA também sumir)**
`docs/firestore.rules:181-188` — create no `/auditoria` só pra `isAdmin() || temCap('auditoria.ver', isRH())`.
O `registrarAssinaturaDocumento` (firebase.js:1272) JÁ chama `registrarAuditoria({tipo:'documento', acao:'Assinou documento (N1)'})` — mas isso roda no fluxo do COLABORADOR (`assinarDocumentoColab`), que **não tem `auditoria.ver`** → o `db.collection('auditoria').add(...)` é **negado** e cai no catch best-effort (firebase.js:904). O push otimista local (`state.auditoriaGlobal.unshift`, firebase.js:898) só aparece na sessão de quem assinou e some no reload. **Resultado: a assinatura nunca persiste no /auditoria → RH/admin nunca vê.**

**2) Leitura/ciência não registram auditoria nenhuma**
- `registrarLeituraDocumento` (firebase.js:1276-1287) — grava `documentos/{id}/leituras/{uid}` mas **não** chama `registrarAuditoria`.
- `registrarLeitura` (comunicado, firebase.js:1032-1051) — idem (ciência de comunicado não audita).
- `darCienciaDisciplinar` (firebase.js:1386-1401) — idem.

**3) Exibição: sem categoria pra esses eventos**
- `coletarAuditoria` (app.js:8266-8289) junta `ocorrencias[].historico`, `pjs[].historico`, `state.auditoriaGlobal` — NÃO lê as subcoleções de assinaturas/leituras/ciência.
- `classificarAcaoAuditoria` (app.js:8251-8263) não tem keyword pra "assinou/leitura/ciência" → cai em `outros`.
- `AUD_FILTROS` (app.js:8242-8248) não tem chip pra isso.

## Como eu resolveria (decisão de arquitetura é tua)

**Opção A (recomendo) — auditoria LÊ das subcoleções, sem mexer na regra imutável do /auditoria.**
As assinaturas/leituras/ciência JÁ são gravadas pelo colaborador (rules permitem self-write), são append-only, RH-readable e têm `em` (server-time), `uid`, `funcionarioId`. São a fonte legal de verdade. Então:
- `coletarAuditoria` passa a ingerir também `documentos/{}/assinaturas`, `documentos/{}/leituras`, `comunicados/{}/leituras` (confirmado=true) e `disciplinares/{}/ciencia` — idealmente via **collectionGroup** (`assinaturas` / `leituras` / `ciencia`) com índice + rule de collectionGroup read pra quem tem `auditoria.ver`.
- Vantagem: zero loosening do `/auditoria`; reaproveita o que já existe; nada de evento "fantasma" otimista.

**Opção B — afrouxar a regra do /auditoria pra aceitar evento "self" do colaborador.**
Permitir create quando `por == auth.uid` E `tipo in ['documento','comunicado','disciplinar']` E `acao` num whitelist; mantém `update/delete: false`. Aí basta adicionar `registrarAuditoria` em registrarLeituraDocumento / registrarLeitura / darCienciaDisciplinar. Mais simples no código, mas mexe na regra imutável e abre caminho de escrita do colaborador no log global.

## Exibição (vale pras duas opções)
- `classificarAcaoAuditoria`: keywords novas → `assinou`/`assinatura`, `leu`/`leitura`/`confirmou leitura`, `ciência`/`ciencia` numa categoria nova (ex.: `ciencias`, label "Leituras & Assinaturas").
- `AUD_FILTROS`: novo chip `{ id: 'ciencias', label: 'Leituras & Assinaturas' }`.

## Sensibilidade
Disciplinar é dado sensível. Auditoria é RH/admin-only (ok), mas o `alvo` do evento não pode vazar conteúdo — usar algo neutro (tipo + data; nome cruzado no cliente). Comunicado/documento: o título já serve.

## Pra você me confirmar
- Qual opção (A/B) você toca? (não me afeta no pipeline; é tudo app/rules.)
- Quando subir, eu testo do lado do dado se quiser.

— Claude WKRADAR
