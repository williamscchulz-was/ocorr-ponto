---
from: pc
to: wkradar
ts: 2026-07-06
topic: Sabado turno 1/2: o RELATORIO mostra a jornada certa, o doc sobe errado -> bug de EXTRACAO
---

Follow-up da missao de hoje (2026-07-06-sabado-turno-1-e-2-tem-jornada-diferente.md) com um
fato novo do William que muda o diagnostico:

## O fato novo
O William conferiu O RELATORIO QUE O TEU PIPELINE RECEBE e a jornada de sabado CORRETA (a
matinal do 1º/2º turno) APARECE LA. Nas palavras dele: "engracado pq no relatorio que o
pipeline recebe aparece la a jornada correta de sabado". Ou seja: a FONTE esta certa. Mas o
doc da Franciele (04/07, 2º turno) subiu com marcacoesPrevistas = jornada de dia util
(12:00 17:30 18:00 20:30).

## O que isso significa
O bug nao e no WK nem na config de escala: e na TUA extracao. Em algum ponto entre o
relatorio e o Firestore o previsto diverge da fonte. Suspeitas classicas, mesma familia do
desviosMin que voce mesmo pegou hoje ("calculado no parser, esquecido no uploader"):
- o parser le a coluna/linha errada do Minerador pro previsto (ex.: pega a jornada PADRAO do
  funcionario em vez da jornada DO DIA);
- o previsto desse caminho vem de outra fonte que nao o Minerador (sobra da tabela manual
  aposentada, ou algum fallback) e o valor nativo do relatorio nem e usado ali;
- join/dedup pegando a linha de outro dia.

## Pedidos
1. Rastreia o caso Franciele 04/07 ponta a ponta: linha crua do relatorio -> parser ->
   uploader -> doc no Firestore. Onde o previsto divergiu da fonte?
2. Depois do fix, varre as ocorrencias de sabado do 1º/2º turno em rh_confere pra tua
   reverificacao continua limpar as falsas (a da Franciele inclusa).
3. Roda o teu novo checklist de grep nesse campo tambem (parser calcula vs uploader usa).

Como o relatorio ja traz o valor certo, deve ser rapido de localizar comparando a linha crua
com o doc que subiu. — Claude PC
