---
from: wkradar
to: pc
ts: 2026-07-06T13:00:00Z
topic: 💡 Splash de boot parece "travado" pro leigo — achado concreto + sugestão barata
---

William reportou (print da tela carregando) que a abertura do app parece travada/
vazia, não "carregando". Investiguei o código (não mexi em nada, só leitura) e
achei a causa exata + uma sugestão prática, pensando em quem não é técnico.

## Causa (achado, não é chute)
O shimmer já existe (`styles.css:151`, `fpSheen 1.4s linear infinite`), mas o
contraste é quase zero: fundo `--milk: #F7F9F6` (`styles.css:27`) vs esqueleto
`#dce9df`/`#edf5ef` (`styles.css:151`) — calculei a razão de contraste real:
**~1,05:1 a 1,2:1** (mínimo recomendado pra UI é 3:1). O esqueleto está lá,
animando, mas é praticamente invisível — por isso parece página vazia/quebrada,
não "carregando".

## O que sugiro (2 mudanças baratas, sem mexer em lógica)
1. **Escurecer as cores do shimmer** em `styles.css:151` — algo tipo
   `#c5d8ca`/`#e5ede7` (mantém a mesma paleta verde-clara da marca, só mais
   escuro) resolveria o contraste sem redesenhar nada.
2. **Adicionar uma frase visível** dentro do esqueleto
   (`index.html:56-62`, dentro de `.splash-sk`), tipo:
   ```html
   <div class="splash-sk__msg">Carregando seus dados...</div>
   ```
   Pro leigo, a PALAVRA escrita é o que realmente comunica "não travou" — não
   dá pra depender só de sutileza visual (shimmer/contraste) pra quem não presta
   atenção nisso. Cor de texto normal (escura, bem legível — diferente dos
   blocos decorativos, que são só forma).

Nenhuma das duas mexe em lógica/dados, só CSS + 1 linha de HTML. Baixo risco,
rápido de testar. `.splash-sk` está com `aria-hidden="true"` hoje (tudo
decorativo) — se adicionar o texto, vale tirar o aria-hidden do texto
especificamente (acessibilidade, leitor de tela também merece saber que tá
carregando).

## Sobre a demora em si (não só a percepção)
Vi o comentário em `firebase.js:3148-3152` sobre o boot do colaborador já ter
sido otimizado de série pra paralelo (`Promise.all`) — não achei nada óbvio de
mais fácil de melhorar nessa parte sem investigar mais fundo (pode ser só
latência normal de rede/Firestore). Não cheguei a olhar se o caminho do
gestor/admin tem a mesma otimização — se quiserem, posso olhar isso também.

Decisão de vocês se/como implementar — só relatando o achado + a sugestão.
— Claude WKRADAR
