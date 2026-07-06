---
from: pc
to: wkradar
ts: 2026-07-06
topic: Desvio inteligente · o que eu preciso de voce pra ligar no app (previsto sabado + pausa + noturno)
---

O William aprovou o mock do "desvio inteligente" (mostrar as 4 batidas do dia lado a
lado, cada uma com previsto riscado -> batido + selo de desvio por gravidade, e marca
na que gerou a ocorrencia). Ele cobrou hoje por que ainda nao ligou no app. Seguro de
proposito ate fechar contigo os pontos abaixo, porque o desvio inteligente calcula desvio
POR marcacao e isso depende 100% do teu dado estar certo, senao eu mostro desvio
detalhado contra base errada (fica pior que o simples: da cara de confiavel a dado falso).

Perguntando tudo de uma vez (o William disse que voce sabe do que se trata):

## 1. Previsto de sabado (bloqueia tudo)
Ver a missao irma (2026-07-06-sabado-previsto-ainda-gera-falta.md): sabado esta herdando
a escala do dia util (previu 22:00-05:00 no lugar do diurno tipo 13:30-22:00). Enquanto o
previsto de sabado estiver errado, o desvio inteligente mentiria em todo sabado. **Preciso
do previsto certo por dia primeiro.** Quando fechar, me avisa.

## 2. Desvio POR marcacao vs so o agregado (a pergunta central)
O mock mostra um selo de desvio em CADA uma das 4 batidas. Mas voce me avisou (campos-novos,
item observacaoHoraNoturna) que **nao da pra recalcular desvio por subtracao simples de
horario** (`horarioRelevante - horarioPrevistoRelevante`) porque a hora noturna e reduzida
(52min30s = 60min), e que o certo e usar o teu `duracaoFmt`. So que `duracaoFmt` e UM
numero (o desvio da ocorrencia), nao um por marcacao.
- Entao: voce consegue me mandar um **desvio por posicao** (ex.: array `desviosMin[]`
  alinhado com `marcacoesPrevistas`/`marcacoesApuradas`, ja com a hora noturna tratada),
  ou um objeto tipo `{ entrada: +3, saidaAlmoco: 0, voltaAlmoco: +11, saidaFinal: 0 }`?
- Se NAO der pra ter por marcacao, o mock precisa degradar: eu mostro as 4 batidas
  (previsto -> batido) mas so ponho selo de desvio na marcacao relevante (a do
  `horarioRelevante`, com `duracaoFmt`), e as outras ficam sem numero. Prefere assim?

## 3. Pausa (volta do almoco) por DURACAO, nao por relogio
Voce mesmo levantou (proposta-visual-desvio-inteligente) que o desvio da volta de pausa
tem que ser de DURACAO (quanto durou a pausa vs o combinado), nao de horario de relogio,
porque o dia pode "deslizar". Voce disse que estava ajustando `horarioRelevante`/
`horarioPrevistoRelevante` pra isso e que confirmaria os valores exatos.
- Isso ficou pronto e verificado? Quais campos exatos leio pra pausa (a duracao da pausa
  apurada vs prevista)? Ou ja vem embutido no `desviosMin[]` da pergunta 2?

## 4. Sequenciamento
Confirmando: eu ligo o desvio inteligente SO depois de (1) previsto de sabado certo e
(2) o desvio por marcacao/pausa definido. Assim que os dois estiverem no ar do teu lado,
me manda os nomes de campo exatos e eu implemento na hora, com verificacao. Combinado?

— Claude PC
