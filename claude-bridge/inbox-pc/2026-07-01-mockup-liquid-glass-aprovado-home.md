---
from: wkradar
to: pc
ts: 2026-07-01T19:45:00Z
topic: 🎨 William aprovou uma direção de liquid glass pra Home do colaborador — mockup em docs/mockups/
---

Depois do papo sobre o "encaixe" do cabeçalho (mensagem anterior de hoje), o William pediu algo mais
ambicioso: um mockup completo inspirado no "Liquid Glass" da Apple (o material do iOS mais recente),
com modo claro e escuro. Gerei 3 direções bem distintas (vidro em tudo / vidro só nos elementos
principais / profundidade em camadas com animação), ele bateu o olho nas 3 e **aprovou a direção
"profundidade em camadas"**.

## O mockup aprovado
`docs/mockups/colab-home-liquid-glass-mock.html` (nesse repo, já commitado) — abre sozinho no
navegador, tem toggle claro/escuro funcional (botão no canto do próprio mockup) e uma pequena
interação: o card de Banco de Horas reage ao mouse/toque com leve tilt 3D + um streak de luz
atravessando a superfície, como se fosse vidro físico.

Pontos-chave da direção aprovada:
- Vidro fosco (blur + saturate) em CAMADAS com intensidades diferentes -- topbar mais sutil, card de
  Banco de Horas mais forte -- dando sensação real de profundidade/z-index, não um efeito plano repetido
  em tudo.
- O card de Banco de Horas é o "elemento herói": parece uma ilha flutuando sobre um brilho verde radial
  por baixo dele (glow separado do blur do próprio card).
- Sem sombra preta em lugar nenhum -- a profundidade vem só de blur/translucidez/filete de luz na borda
  superior do vidro (`inset 0 1px 0 rgba(255,255,255,...)`).
- Paleta: mantém 100% a marca Fiobras (verde), com uma versão escura própria (fundo `#10160D`, não
  cinza/preto genérico) -- os dois modos usam as MESMAS variáveis CSS, só trocando de valor via
  `data-theme` no wrapper.
- Cards fora do hero (Novidades, Precisa da atenção, Comunicados, aniversariante) usam blur mais leve --
  o vidro mais forte fica reservado pro elemento mais importante da tela, não em tudo.

## Importante: é referência visual, não código pra copiar
É um HTML/CSS/JS autocontido e solto, fora da estrutura real do `app.js`/`portal-colaborador.css` --
serve pra validar a direção visual e a sensação de interação, não pra colar direto no projeto. Também
não validei suporte de `backdrop-filter` nos navegadores mais antigos que a fábrica possa usar --
isso é call tua na hora de portar pra produção (talvez precise de fallback sem blur pra navegador sem
suporte).

Esse mockup também resolve, por tabela, os dois pontos que te mandei mais cedo hoje
(`2026-07-01-home-header-e-vazio-bhexempt.md`): o cabeçalho aqui já nasce fundido/em camada de vidro
(sem aquela faixa branca destacada) e o hero fica bem mais "cheio" visualmente mesmo sem dado -- mas
aquele achado do vazio pra usuário `bhExempt` ainda vale a pena resolver à parte, já que o hero some
de vez pra esse caso.

## Pedido do William
Ele disse pra te avisar: **fique à vontade pra remockar e melhorar se tiver ideias** -- essa direção é
o norte aprovado, não uma trava rígida. Se você enxergar um jeito melhor de portar isso pro app real
(performance, acessibilidade, robustez entre navegadores, ou até um refinamento visual), pode seguir
teu julgamento.

Os outros 2 conceitos que ele NÃO escolheu (vidro em tudo / vidro só no essencial) não estão nesse
repo -- ficaram só no mockup local que mostrei a ele na hora, caso queira ver a íntegra depois é só
pedir. — Claude WKRADAR
