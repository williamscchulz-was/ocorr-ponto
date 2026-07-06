# Falta Injustificada de 8h = falta PROVISÓRIA do dia corrente (não é falta real)

**Data:** 2026-07-06 · **De:** Claude PC (app) · **Prioridade:** ALTA (dado sensível, pode virar advertência/desconto indevido)
**Atualizado:** o William puxou a Relação de Ocorrências crua do WK e ela explica a causa. Reescrevi a missão.

## A causa (com a evidência do relatório cru)

O William tirou a **Relação de Ocorrências do WK às 08:28 de 06/07**. Nela tem um **bloco grande de "Faltas Injustificadas · Diurna 08:00" datadas de 06/07 (HOJE)**, de gente do **2º/3º turno que às 08:28 ainda NÃO tinha batido o ponto** (o turno deles começa 13:30). Exemplos do próprio relatório (cód · nome · data · situação · diurna):

- 673 · MARCIONEI LAMIN · 06/07 · Faltas Injustificadas · 08:00
- 991 · EDICLEIA DOS SANTOS · 06/07 · Faltas Injustificadas · 08:00
- 992 · JOSE ANDERSON SANTOS · 06/07 · Faltas Injustificadas · 08:00
- 999 · TEREZINHA DE FATIMA · 06/07 · Faltas Injustificadas · 08:00
- 1074 · FRANCIELE LEMES ROSA · 06/07 · Faltas Injustificadas · 08:00
- 1180 · ISABELE DE ABREU · 06/07 · Faltas Injustificadas · 08:00
- 1205 · VINICIUS DA SILVA NASC · 06/07 · Faltas Injustificadas · 08:00
- ...e dezenas de outros, todos 06/07 · 08:00.

Ou seja: **essa "falta de 8h" é o WK dizendo "essa pessoa ainda não cumpriu as 8h de HOJE"** — porque o turno dela nem começou quando o relatório foi puxado. É PROVISÓRIA. Quando a pessoa bate o ponto às 13:30, o WK derruba essa falta. Não é ausência.

## Por que virou ocorrência falsa no app

A ocorrência que o William abriu (Marcionei e Vinicius) aparece no app como **03/07 com batidas COMPLETAS** (Marcionei: 13:27/17:30/18:02/22:00; Vinicius: 13:29/17:35/18:07/22:00) e mesmo assim tipo **Falta Injustificada 08:00**. Isso é uma **falta provisória capturada de manhã que nunca foi revalidada depois que a pessoa bateu o ponto**. O pipeline ingeriu a falta provisória e criou a ocorrência; a pessoa trabalhou; o WK derrubou a falta; mas a ocorrência ficou (stale), agora contradizendo o próprio espelho.

O app está fiel (só exibe `o.tipo`/`o.duracaoFmt` da Relação + `marcacoesApuradas` do espelho); foi a tela de conferência que expôs a contradição.

## O que eu preciso que vocês façam (pipeline)

1. **NÃO transformar em ocorrência a falta de um dia IMATURO.** Aplicar a MESMA maturidade que já usamos no espelho (`maduro`): só criar/manter ocorrência de FALTA de um dia cujo turno da pessoa **já fechou**. Falta do dia corrente (ou de dia cujo turno ainda não acabou) é provisória, não entra.
2. **Cruzar com o espelho antes de criar/manter uma falta.** Se a pessoa tem batidas completas cobrindo a jornada naquele dia, **dropar** a ocorrência (ou nem gerar). Batida completa > relatório de falta.
3. **Revalidar e limpar a fila atual.** A conferência hoje deve estar entupida dessas faltas provisórias/stale. Passar o espelho por cima e **remover as falsas** (as que têm batidas completas no dia).
4. **Datas:** o app mostra a ocorrência do Marcionei como **03/07**, mas no relatório de agora a falta dele é **06/07**. Confere se o pipeline está datando/pareando a falta com o dia certo, e se sobrou falta provisória velha (03/07, 04/07) que o espelho já contradiz.
5. **Talvez puxar a Relação de Ocorrências só DEPOIS dos turnos fecharem** (ou filtrar por dia maduro), pra ela não trazer o dia corrente cru cheio de "falta de quem ainda não entrou".

## Rede de segurança do meu lado (app), se o William topar

Posso pôr um aviso no modal de conferência: quando o tipo for falta mas as batidas do dia estiverem completas, mostrar **"Atenção: há batidas completas neste dia, confira antes de confirmar"**. Protege a GP de confirmar falta falsa mesmo antes do fix na fonte. Mas o conserto de raiz é aí.

Me devolvem por `inbox-pc/`. Valeu.
