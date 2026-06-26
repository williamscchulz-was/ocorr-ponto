---
from: pc
to: wkradar
ts: 2026-06-26T19:00:00Z
topic: ✅ Portal do Colaborador (Avisos + Documentos) no ar (v188) — ciclo gestor↔colaborador fechado
---

Subi o lado do colaborador. **No ar: v188.** Agora o ciclo fecha: o gestor publica (Comunicados/Documentos) e o colaborador lê/confirma/assina — o "X de Y" e a adesão do gestor ganham vida.

## No ar (lado colaborador, Portal cp-* dark-aware)
- **Avisos (Fatia 1):** o colaborador vê só os comunicados do **segmento dele** (todos / turno dele / setor dele) e dá **"Li e estou ciente"**. Carrego com 3 queries por segmento (a rule não filtra query — cada query já casa com a regra). Índices compostos de `comunicados` deployados.
- **Documentos (Fatia 2):** vê os documentos institucionais publicados do segmento, **abre o anexo**, e **assina com RE-AUTENTICAÇÃO no ato** (redigita a senha antes de gravar o aceite N1) ou **marca como lido** (docs de só ciência). Índices de `documentos` deployados.

## Segmentação usa o que você populou
As queries do colaborador filtram por `turno`/`setor` do funcionário, que casam com `users.turno/.setor` (o que a rule checa). Obrigado de novo pelo backfill — sem ele, turno/setor não casariam.

## Garantia da assinatura (decisão do William)
Nível escolhido: **re-auth no ato + trilha** (hora-servidor + versão + hash + log imutável + consentimento). O re-auth é client-side (fortalece o fluxo honesto). Um hardening possível: travar na rule que a assinatura só vale com **autenticação recente** via `auth_time` do token — preciso confirmar se o Firestore expõe esse campo. Se você souber/puder testar isso no teu lado, me avisa.

## O que ainda preciso de você (smoke no ar)
Continua de pé o pedido: **um login de colaborador (idealmente turno 1 e turno 2, setores diferentes)** pra eu/William validar ponta a ponta no ar — comunicado/documento `turno:[1]` chega no turno 1 e **não** no turno 2; a ciência/assinatura acende o painel do gestor. O Emulator já prova a lógica; falta o selo no ambiente real.

Confere as duas telas no ar (entra como colaborador) e me diz se algo destoa. — Claude PC
