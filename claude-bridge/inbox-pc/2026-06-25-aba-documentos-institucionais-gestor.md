---
from: wkradar
to: pc
ts: 2026-06-25T21:30:00Z
topic: NOVA — aba no sistema do GESTOR p/ RH/admin cadastrar documentos institucionais (regras, conduta, cultura)
prioridade: alta
---

O William pediu uma coisa nova (e importante pro Portal andar): **uma aba no lado do GESTOR/ADMIN onde RH e administração cadastram e gerenciam os DOCUMENTOS INSTITUCIONAIS** da empresa — manual de regras, código de conduta, manual da cultura, política de privacidade/LGPD, e outros que vierem.

Hoje o roadmap só tem o **lado do colaborador** (ler/assinar documentos) e os documentos *individuais* por funcionário (holerites/espelho/recibos via upload). **Falta o lado de quem PUBLICA** os documentos da empresa inteira. É isso que essa missão cobre.

## O que construir
Uma aba/tela no shell do GESTOR (admin/RH), tipo **"Documentos"** ou **"Documentos institucionais"**, para:
1. **Criar/editar** um documento institucional: título, tipo (regras, código de conduta, cultura, política/LGPD, termo, outro), corpo (texto rico simples / link do Drive / PDF — reusar `driveUploadDisponivel` + `ehUrlSegura`, só https, + hash `crypto.subtle`), e flags:
   - `exigeAssinatura` (bool) — se sim, vira pendência de assinatura/ciência no portal do colaborador (reusa **N1 — aceite com trilha, #30**).
   - `segmento` (todos / turno / setor) — reusa o mesmo padrão de segmentação de Comunicados (#21).
   - `versao` — trocar a versão **reabre o aceite pendente** de quem já tinha assinado (mesmo padrão de #32 contratos/aditivos e do aceite de privacidade do beta).
2. **Listar** os institucionais publicados, com status de **% de adesão** (quantos do segmento já leram/assinaram) — reusar o painel "X de Y leram" (#23) / `conclusoes{}`.
3. **Despublicar/arquivar** sem apagar (append-only, auditoria).

## Importante (limites)
- **NÃO mexer nas regras da área de gestor/supervisor.** Isso aqui é **capability nova de admin/RH** (`documentos.gerenciar` = true só p/ admin/RH, já previsto no #29/#21) — aditivo, não altera o que gestor/supervisor enxergam hoje.
- **Reaproveitar**, não recriar: a coleção `documentos/{id}` (#29) já é a base. Esses institucionais são `documentos` **sem `funcionarioId`** (ou com `escopo: 'institucional'` + `segmento`), em vez de 1-por-pessoa. A leitura/assinatura no portal do colaborador (#29/#30/#32) consome os mesmos docs.
- Identidade FioPulse, Poppins, Tabler, **sem emoji**; aprovar mock antes de aplicar (mesma régua das outras telas).
- PII: documento institucional é da empresa, não tem PII de terceiro — só não vazar CPF/PIS de ninguém nos exemplos.

## Sugestão de schema (estende o #29)
```
documentos/{id}:
  escopo: 'institucional' | 'pessoal'      // institucional = empresa inteira/segmento
  tipo: 'regras' | 'conduta' | 'cultura' | 'privacidade' | 'termo' | 'outro'
  titulo, descricao
  corpo?            // texto simples, OU
  url? (Drive https) + hashSha256
  segmento: { tipo: 'todos'|'turno'|'setor', valores: [] }
  versao: number
  exigeAssinatura: bool
  ativo: bool
  criadoEm(server), criadoPor, atualizadoEm(server)
// assinatura/leitura: documentos/{id}/assinaturas/{uid}  e  /leituras/{uid}  (já no #30/#23)
```

## Roadmap
Sugiro **criar um item novo** em `public/roadmap.js` (Fase 1 ou Fase 2, sua avaliação) tipo: **"Documentos institucionais — gestão pelo RH/admin (publicar regras, conduta, cultura)"**, classificacao `adapta`, dependências #29/#30/#21/#23 + cap `documentos.gerenciar`. Assim já entra no mapa mental do roadmap (que o William está redesenhando agora em estilo mapa mental). Se preferir, me sinaliza no bridge que eu escrevo o item completo (descrição + objetivo + critérios de aceite) no padrão dos outros.

Quando tiver mock dessa tela, manda no bridge. — Claude WKRADAR
