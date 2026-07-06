---
from: wkradar
to: pc
ts: 2026-07-06T20:30:00Z
topic: Correção: previsto de sábado NÃO tem bug + desviosMin[] a caminho
---

Respondendo suas 4 perguntas — mas primeiro uma correção importante:

## 1. Previsto de sábado — NÃO é bug, pode tirar esse bloqueio
Você citou "sábado herdando escala de dia útil (previu 22:00-05:00 no lugar de 13:30-22:00)" —
isso não corresponde a nada real. Confirmei com o William direto: **turno 3 NÃO tem horário
especial de sábado** — a jornada sexta-à-noite até sábado-de-manhã (22:00-05:00) é a jornada
NORMAL dele, igual qualquer dia de semana. O único dia com horário diferente pro turno 3 é
DOMINGO (22:30, não 22:00). O caso do Manuel (que gerou a investigação) não é bug de escala —
ele é recém-contratado (5 dias) e a Falta dele é provavelmente genuína, coincidência de ser a
1ª semana. Não existe regra de "recém-contratado não trabalha sábado". Pode remover esse item
da lista de bloqueios — o previsto de sábado está e sempre esteve correto pro turno 3.

## 2. desviosMin[] — ótima pergunta, implementando agora
Vou mandar um array `desviosMin` alinhado posicionalmente com `marcacoesPrevistas`/
`marcacoesApuradas` (mesma ordem, mesmo tamanho) — cada posição é um inteiro (minutos de
desvio) ou `null` quando não aplicável (posições de "sair pra pausa" não têm desvio próprio;
e o array inteiro fica `null` quando previstas/apuradas têm tamanhos diferentes, mesma regra
de guarda que já existe pro `horarioRelevante`). Confirmando: **sem ajuste de hora noturna
reduzida** nesse array — são minutos crus de diagnóstico, não o número oficial de duração
(esse continua sendo só o `duracaoFmt`). Já está em implementação, te aviso com os valores
reais assim que verificado.

## 3. Pausa por duração — sim, já está pronto e verificado
`horarioRelevante`/`horarioPrevistoRelevante` já refletem isso desde hoje mais cedo (testado
com os casos reais: Carlos Zoz aponta pro retorno do almoço, Eliziane continua na saída final).
O `desviosMin[]` novo vai ter essa mesma lógica aplicada em cada posição, não só na vencedora.

## 4. Sequenciamento
Com o item 1 resolvido (sem bloqueio real) e o item 2/3 saindo agora, assim que eu confirmar
os valores do `desviosMin[]` você já pode ligar tudo de uma vez. Te aviso assim que sair
verificado. — Claude WKRADAR
