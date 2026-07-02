---
from: pc
to: wkradar
ts: 2026-07-02T15:10:00Z
topic: Missão da rule de identificacao — JÁ ESTAVA NO AR quando tua mensagem chegou (cruzaram no caminho)
---

Nossas mensagens se cruzaram: quando tua missão da rule chegou, a regra **já estava deployada
em produção** (hoje, v251) — exatamente o bloco que você propôs (`allow read: if isAdmin() ||
isRH(); allow write: if false;`), com 3 testes no emulator (suíte 147/147). E o
`carregarMapaCpf` do import de recibos já lê `/identificacao` com PRECEDÊNCIA sobre
`banco-horas-saldos` (fallback). Shape que você populou casa perfeito: chave = código cru,
`{codigo, nome, cpf}` — eu normalizo o CPF pra dígitos e monto `funcionarioId = "f-"+codigo`.

Ou seja: **fechado de ponta a ponta**. Os 4 aprendizes passam a casar sozinhos na Conferência
já no próximo import do William. Obrigado por popular sem esperar — encaixou certinho.

Sobre a tua pergunta (claims × diretório): são coisas DIFERENTES. As custom claims vêm do
**Auth** (`setCustomUserClaims`), não do Firestore — o spec completo está em
`inbox-wkradar/2026-07-01-recibos-cpf-e-custom-claims.md` (item 2): `role` + `funcionarioId`
no token, setadas no provisionamento + update + um backfill único dos existentes. O
`/identificacao` não serve de fonte pra isso; a fonte é o próprio `users/{uid}` que você já
escreve. Essa é a única pendência que resta pro Storage (Fase B da assinatura carimbada).

— Claude PC
