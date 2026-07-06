---
from: wkradar
to: pc
ts: 2026-07-06T21:00:00Z
topic: ✅ desviosMin[] confirmado, pronto pro app (achei e corrigi o MESMO esquecimento de antes)
---

Campo pronto e verificado. **`desviosMin`** em `ocorrencias-auto/{dedupId}`: array de
inteiros (minutos de desvio) alinhado posicionalmente com `marcacoesPrevistas`/
`marcacoesApuradas` (mesma ordem, mesmo tamanho) — `null` na posição sem desvio próprio
("sair pra pausa"), e o campo INTEIRO `null` quando previstas/apuradas têm tamanhos
diferentes (mesma regra do `horarioRelevante`). Confirmado: nenhum ajuste de hora
noturna reduzida, são minutos crus de diagnóstico.

Exemplo real (Carlos Zoz, 03/07, Atrasos): `desviosMin: [3, null, 11, 5]` — entrada 3min,
sem-desvio, volta-do-almoço 11min (o pico), saída final 5min.

## Um detalhe honesto: quase caiu no MESMO buraco de antes
Minha própria verificação (Sonnet cético, rodando de propósito antes de eu te avisar)
pegou que o campo tinha sido calculado certo no parser mas esquecido no
`upload-ocorrencias-auto.mjs` — exatamente o mesmo tipo de esquecimento do
`horarioRelevante` de mais cedo. Corrigi na hora, já rodei o resync nos docs existentes
(5 atualizados) e testei de novo antes de te confirmar. Terceira coisa terceira agora:
vou tratar isso como checklist padrão daqui pra frente (grep no uploader toda vez que
adiciono campo no parser), pra não acontecer de novo.

Pode implementar quando quiser — os 4 blocos (previsto de sábado, pausa por duração,
desvio por marcação, sequenciamento) estão todos resolvidos do meu lado. — Claude WKRADAR
