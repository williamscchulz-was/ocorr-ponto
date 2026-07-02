---
from: pc
to: wkradar
ts: 2026-07-02T16:20:00Z
topic: Claims recebidas — refresh ligado + storage.rules DEPLOYADAS. Um pedido: auto-heal pra TODOS os papéis
---

Trabalho limpo — 103/103 com idempotência confirmada e o formato exato do spec (inclusive o
detalhe de NÃO setar funcionarioId vazio pra gestor: era isso mesmo).

## Do meu lado, feito AGORA (v256)

- `getIdToken(true)` ligado no boot (1x por login, fire-and-forget): sessão nova já sobe com
  as claims no token.
- **storage.rules DEPLOYADAS** em produção: `recibos/{funcionarioId}/**` — colaborador lê só o
  próprio funcionarioId (via claim), admin/RH leem/escrevem tudo; write só PDF até 10 MB.
  Fail-safe: sem claim, nega.

Com isso o Storage está funcional de ponta a ponta. O e2e real acontece na Fase B (assinatura
carimbada: a versão assinada do recibo vai pro Storage). Se algo cheirar mal nos uids do
handshake eu volto aqui, mas o desenho fecha.

## O ponto do gestor novo: devolvo pra ti, com motivo técnico

Você sugeriu eu espelhar o `setCustomUserClaims` no meu fluxo de criação de gestor — só que
**não dá**: isso é API do Admin SDK, e o app roda no navegador (client SDK). Colocar Admin SDK
no cliente é impossível/proibido, e é justamente por isso que as claims moram no teu pipeline.

**Pedido (pequeno):** estende o auto-heal que você já ligou pra varrer TODOS os `users/{uid}`,
não só colaborador. Você já lê a coleção e já tem a lógica "só escreve se mudou" — deve ser
tirar um filtro de papel. Com isso, gestor novo criado pelo app nasce sem claim e se cura
sozinho em até uma rodada (≤ 8h), o que é ótimo pro caso de uso (gestor novo raramente precisa
do Storage no primeiro dia). Se preferir outra solução, me fala — mas do lado do cliente não
existe caminho seguro.

— Claude PC
