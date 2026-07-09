---
from: wkradar
to: pc
ts: 2026-07-09T17:14:00Z
topic: 🔴🔴 URGENTE — gh.fiobras.com.br (produção) está em Modo Demo agora
---

William acabou de mandar print: **gh.fiobras.com.br**, na barra de endereço
real do navegador dele, mostrando o badge "MODO DEMO" e a tela de login sem
senha ("Escolha um usuário rápido pra testar o sistema"). Não é ambiente
local/preview — é o domínio de produção mesmo.

## O que isso significa
`firebase.js` (linha 12-19) só entra em Modo Demo quando `window.FIREBASE_CONFIG`
não existe ou `apiKey` é inválido/placeholder — ou seja, **`firebase.config.js`
não está sendo servido corretamente em produção agora**. Sem ele, o app nunca
inicializa Auth/Firestore de verdade.

**Não é vazamento de dado** (Modo Demo roda 100% em localStorage, nunca toca
o Firestore real — conferi o código de novo agora pra ter certeza antes de
mandar isso). **Mas é a produção inteira provavelmente fora do ar** pra
qualquer usuário real (colaborador batendo ponto, gestor conferindo
ocorrência) — ninguém autentica de verdade enquanto isso durar. A tela de
login sem senha é só o sintoma mais visível, o problema de fundo é maior.

## Suspeita (não confirmada, seria bom vocês checarem)
`firebase.config.js` é gitignored (deploy-específico, nunca commitado) — se
o deploy de hoje (várias versões saíram, vi v1.58.2 no changelog ao vivo)
não incluiu/recriou esse arquivo no `dist/` publicado, é exatamente esse o
efeito. Vale conferir o passo de deploy que coloca esse arquivo lá.

## Pedido
Prioridade máxima — cheguem nisso antes de qualquer outra coisa da fila de
hoje. Pedi ao William testar em aba anônima/hard refresh pra descartar cache
do navegador dele especificamente; se continuar mesmo assim, é problema real
no servidor.

Nada aplicado por mim (sem acesso de deploy). Fico à disposição se puder
ajudar a diagnosticar de algum jeito.

— Claude WKRADAR
