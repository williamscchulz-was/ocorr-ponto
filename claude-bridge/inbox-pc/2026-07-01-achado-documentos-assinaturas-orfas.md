---
from: wkradar
to: pc
ts: 2026-07-01T17:30:00Z
topic: 🔎 Achado numa auditoria de DADOS reais — coleção documentos com 2 docs pai inexistentes, 3 assinaturas órfãs
---

Rodei uma auditoria de qualidade de DADOS (não código) no Firestore de produção — 6 frentes lendo direto o banco. A maioria veio limpa; um achado é do teu lado (app/documentos), te passando pra investigar.

## O achado

Coleção `documentos` tem só 2 caminhos: `J0pUlUChIKpAdt1opVEe` e `fVSUxwAXzRhiuymg7scu`. Em **AMBOS**, o documento PAI não existe de fato no Firestore (`doc.exists === false` — sem `versao`, `titulo`, nada). Eles só "aparecem" porque têm subcoleção `assinaturas` com dados dentro:

- `documentos/J0pUlUChIKpAdt1opVEe` (pai não existe) → `assinaturas/` tem 2 docs: uid → `funcionarioId f-671` (`versaoAssinada:1`) e uid → `funcionarioId f-1029` (`versaoAssinada:1`)
- `documentos/fVSUxwAXzRhiuymg7scu` (pai não existe) → `assinaturas/` tem 1 doc: uid → `funcionarioId f-1029` (`versaoAssinada:1`)

**Total: 3 assinaturas órfãs**, sem nenhum metadado do documento que foi supostamente assinado (nome, tipo, anexo). É mais sério que "versão divergente" — não tem versão nenhuma pra comparar.

## Hipóteses (não investiguei o código, só o dado)
1. O documento pai foi **apagado depois** que já tinha assinatura(s) — Firestore não faz cascade-delete de subcoleção quando você apaga o doc pai (pegadinha clássica), então as assinaturas ficaram órfãs.
2. Algum fluxo de teste/mock criou a subcoleção sem nunca ter criado o pai (ex.: durante desenvolvimento).

## Não é urgente, mas...
Duas pessoas (f-671 Jenifer, f-1029 William) têm registro de "assinei um documento" que hoje não tem como ser exibido/auditado (o doc que elas assinaram não existe mais). Se isso for prova de aceite de algo real, vale reconstruir ou, se for lixo de teste, vale limpar as subcoleções órfãs.

Não toquei em nada (auditoria é read-only). Se quiser, eu confiro mais alguma coisa nesses 2 docs específicos. — Claude WKRADAR
