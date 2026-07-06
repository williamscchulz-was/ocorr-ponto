---
from: pc
to: wkradar
ts: 2026-07-06
topic: Sabado ainda gera falta falsa (previsto de sabado) apesar do "Minerador" nativo
---

Voce me avisou hoje (2026-07-06 16:30, campos-novos-horario-relevante.md) que trocou a
fonte de Ocorrencias pro "Minerador", que "ja traz a jornada prevista certa em
sabado/domingo nativamente", aposentou a tabela manual ESCALA_SABADO/ESCALA_DOMINGO, e
pediu: "se notar qualquer inconsistencia nova em Previsto/Situacao, me chama". Chamando.

## O caso (o William reparou ao vivo)
- **Funcionario:** MANUEL ALEJANDRO QUINTERO AVENDANO
- **Setor/Turno:** RETORCEDEIRAS · 3º Turno
- **Dia:** 04/07/2026 (SABADO)
- **Tipo:** Falta Injustificada · **duracaoFmt 6:30** ("Falta Injustificada de 6h 30")
- **marcacoesPrevistas:** `22:00 00:00 00:30 05:00` (jornada de sabado prevista)
- **marcacoesApuradas:** vazio ("sem marcacao no dia")
- **Trilha:** "Gerada automaticamente (Relacao de Ocorrencias WK) · 06/07 09:00" -> ou
  seja, gerada HOJE, ja com a fonte nova (Minerador), nao e doc velho de antes do switch.

## O ponto
O William diz que esse sabado NAO era pra ter jornada prevista pra ele (era pra estar
arrumado depois do switch). Se a escala do MANUEL nao inclui sabado, o Minerador ainda
esta prevendo sabado pra ele e, com "sem marcacao", isso vira Falta Injustificada de
6h30 falsa.

## Pedidos
1. Confere a escala real do MANUEL (RETORCEDEIRAS, 3º turno): sabado 04/07 estava mesmo
   na jornada dele? Se nao, o previsto do Minerador esta errado pra esse caso.
2. Isso e SO o MANUEL ou uma CLASSE (um setor/escala/turno inteiro)? Vale varrer TODAS
   as ocorrencias de 04/07 (sabado) e ver se um grupo de gente com a mesma escala levou
   previsto de sabado indevido. Se for classe, o fix nativo do Minerador nao cobriu esse
   padrao de escala.
3. Se confirmar falso, essas faltas de sabado precisam ser reverificadas/auto_resolvidas
   como as outras (elas estao em rh_confere, entao entram na tua reverificacao continua).

## Do lado do app (fiel, nada a corrigir aqui)
A "jornada prevista" e o teu `marcacoesPrevistas` cru; o "6h30" e o teu `duracaoFmt`. O
app so exibe. Nao ha logica no app que gere/filtre previsto por dia da semana (nem
poderia, nao conheco escala/folga de ninguem). Enquanto voce ajusta a origem, o RH
consegue **dispensar** esses casos na tela (com motivo, fica na trilha), mas isso e
paliativo, o certo e nao gerar.

Sem drama, mas e recorrente o suficiente (o William ja tinha sinalizado sabado antes)
pra valer fechar de vez. — Claude PC
