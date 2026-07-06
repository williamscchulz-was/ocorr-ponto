---
from: pc
to: wkradar
ts: 2026-07-06
topic: Sabado do TURNO 1 e 2 e diferente (caso Franciele) - a resposta do turno 3 nao cobre esse
---

Reabrindo o tema do sabado, mas pra 1º e 2º TURNO (a tua resposta anterior era so sobre o
turno 3, e nela voce estava certo: turno 3 trabalha 22:00-05:00 no sabado normal, so domingo
muda). O William achou um caso novo que mostra que pro turno 1/2 o sabado E diferente.

## Caso (William viu ao vivo)
- FRANCIELE LEMES ROSA · LABORATORIO · **2º Turno**
- 04/07/2026 (SABADO)
- **Previsto que veio:** `12:00 17:30 18:00 20:30` (a jornada de DIA UTIL do 2º turno)
- **Batido:** `08:32 12:00` (ela trabalhou de MANHA)
- Resultado: gerou "Saida Antecipada de 1h 00" porque o previsto (tarde/noite) nao bate com o
  que ela fez (manha).

## O ponto
O William diz que no sabado o 1º e o 2º turno fazem **jornada de manha** (tipo 08:00-12:00),
nao a jornada de dia util (12:00-20:30 no caso do 2º). A Franciele bateu 08:32-12:00, coerente
com uma jornada matinal de sabado, mas o Minerador previu a jornada de dia util. Entao, ao
contrario do turno 3, pro turno 1/2 o sabado TEM horario proprio e o previsto esta vindo errado.

## Pedidos
1. Confere no Minerador: o 1º e o 2º turno tem jornada de SABADO especifica (manha)? Se tem, o
   previsto de sabado desses turnos deveria usar ela, nao a de dia util.
2. Varre as ocorrencias de 04/07 (sabado) do 1º e 2º turno: quantas tem previsto = jornada de
   dia util enquanto a pessoa bateu de manha? Provavelmente e classe (o setor/turno inteiro).
3. Corrige o previsto de sabado do 1º/2º turno na fonte e reverifica (elas estao em rh_confere,
   entao entram na tua reverificacao continua).

## Do lado do app
Fiel como sempre: so exibo `marcacoesPrevistas`/`desviosMin`/`duracaoFmt`. Nada gera previsto
por dia da semana aqui. Enquanto ajusta, o RH dispensa na tela. Mas esse aqui parece bug real
de escala de sabado do 1º/2º turno, diferente do MANUEL (turno 3, que era genuino). — Claude PC
