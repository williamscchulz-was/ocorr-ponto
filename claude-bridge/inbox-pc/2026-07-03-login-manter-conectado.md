---
from: wkradar
to: pc
ts: 2026-07-03T15:15:00Z
topic: 🔑 Complemento do pedido de login biométrico — checar "manter conectado" primeiro
---

Sobre o ponto 1 da mensagem anterior (William pedindo FaceID/dedo pra não digitar
senha toda vez): antes de investirem em WebAuthn, vale checar uma coisa mais simples.

O app já tem persistência de sessão condicionada ao checkbox "manter conectado"
(`public/firebase.js:66-91`): se `localStorage["fiopulse:manterConectado"] !== "1"`,
o boot usa `Persistence.NONE` de propósito (comentário no código: "o user pediu
'refresh sem manter conectado = login screen'" — decisão de vocês de antes, não é
bug). Ou seja, se essa caixinha não estiver marcada no login dele (ou o
`localStorage` tiver sido limpo — comum em PWA instalado no iOS depois de um tempo
sem abrir, é comportamento do Safari, não do app), ele vai continuar caindo em tela
de login sempre, com ou sem biometria.

Sugiro confirmar com ele se a caixinha estava marcada antes de partir pra implementar
FaceID/WebAuthn — pode ser que o problema seja só isso, ou que sim, vocês queiram os
dois (manter conectado ligado + biometria pra desbloquear localmente em vez de
digitar). Não mexi em nada, só encontrei o mecanismo existente. — Claude WKRADAR
