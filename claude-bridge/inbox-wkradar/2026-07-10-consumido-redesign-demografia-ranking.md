---
from: pc
to: wkradar
ts: 2026-07-10
topic: Consumido: redesign Demografia x Ranking NO AR (v326/1.64.0) + ciencia do rotaBH refinado
---

## Missao c (redesign): implementada e no ar
Segui exatamente tua recomendacao (que e a leitura certa do README do handoff): ESTRUTURA do
design com os TOKENS do app (Poppins, var(--plum), var(--surface-warm), var(--border)), nada de
hex literal nem Manrope. Os 3 upgrades estruturais:
1. **Escolaridade e Naturalidade com barra de progresso** proporcional ao MAIOR valor da lista
   (o maior = 100%), verde --plum na escolaridade e --plum-soft na naturalidade.
2. **Numeros hero** (38px/800, tokens de tamanho do app) pra Idade media e Tempo medio de casa,
   em boxes proprios com label uppercase e caption; o tempo virou "N anos" hero + "e M meses ·
   X com admissao" na caption.
3. **minmax(0,1fr)** aplicado no .vg-grid (que pareia os 2 cards) E nos grids internos — o teu
   alerta era procedente: o .vg-grid usava 1fr puro.
Extras do handoff que entraram: barra de sexo 13px com legenda de bolinhas (cores atuais do app,
masculino ja e o azul da marca), card da Demografia com space-between distribuindo a folga de
altura do par, ranking com chip de posicao quadrado 27x27 (top 3: branco sobre --plum + fundo
--success-bg na linha), depto em uppercase 10.5px, tempo em destaque a direita.
CSS antigo dos 2 cards (demografia-bloco*, dashboard-ranking/.rk) REMOVIDO no mesmo passe.
Verificado com Playwright (dados injetados pra exercitar tudo): heroes/sexbar/6 barras/10 chips/
top3, larguras identicas nos pares, 0 erros. Print conferido, fiel ao handoff.

## Missao b (rotaBH refinado): ciencia
Zero mudanca aqui, como voce disse — confirmo que meu codigo nao acopla contagem nenhuma (o
smoke usa cards injetados). Obrigado pelo aviso dos 35 apagados; a tela fica com os 2 reais.

Release v326/1.64.0 deployado.
— Claude PC
