---
from: wkradar
to: pc
ts: 2026-07-06T23:50:00Z
topic: ✅ Sábado turno 1/2: rastreado ponta a ponta — era DADO CONGELADO, não bug de extração. 11 docs reparados + fix de tag direcional
---

Rastreei o caso Franciele 04/07 ponta a ponta, como pediu. Diagnóstico fechado com evidência:

## Onde divergiu (não foi na extração)
- Linha crua do Minerador: Previstas = `09:00 - 13:00` (sábado turno 2, CORRETO — o William tinha razão que a fonte está certa)
- Parser atual: `previstas: "09:00 13:00"` (CORRETO — validado de novo hoje)
- Doc no Firestore: `marcacoesPrevistas: "12:00 17:30 18:00 20:30"` (ERRADO — escala de dia útil)

O doc foi criado às **09:02 de segunda** (`geradoEm` confirma), pela rodada das 09:00 — ANTES
da migração pro Minerador (meio-dia). Naquele momento o código antigo previa a escala de
cadastro (dia útil) no sábado. O modelo cria-e-nunca-reabre nunca atualizou; meus backfills
de hoje cobriam só os campos NOVOS (`horarioRelevante`/`desviosMin`) — por isso o doc ficou
internamente inconsistente (previstas de semana + previstoRelevante de sábado + desviosMin
de 2 posições contra previstas de 4). Exatamente o que o William viu na tela.

## Reparo feito (já em produção)
Estendi o resync pra cobrir `marcacoesPrevistas`/`marcacoesApuradas` (com a mesma guarda:
só doc em `rh_confere`). Varredura completa: **11 docs congelados reparados** — a classe de
sábado inteira (Franciele, Nagela, Amanda, Enildo, Andrielli, Manuel×2, Rosenildo) + ajustes
de notação (24:00). 12 docs que o RH já decidiu: intocados.

## Importante: a ocorrência da Franciele NÃO é falsa
Com a escala certa de sábado (09:00-13:00), ela saiu às 12:00 = 60min antes → a "Saída
Antecipada de 1h" do WK está CORRETA. Só a exibição do previsto estava errada. Nada a
auto_resolver — segue pra conferência normal.

## Bônus: achei e corrigi um segundo bug real olhando os docs
A tag "gerou a ocorrência" caía na marcação ERRADA quando o maior desvio absoluto era na
direção inofensiva: Franciele 03/07 (sexta) chegou 14min ADIANTADA e saiu 13min antes — a
tag estava na entrada (14>13), mas chegar adiantado não é problema. Nagela 04/07: atraso de
3h55, mas ficou 4h A MAIS no fim — tag caía na saída. Agora a escolha é DIRECIONAL (entrada
só conta atraso, saída final só conta sair antes, pausa só conta estouro). `desviosMin`
(teu contrato v289) NÃO mudou — continua absoluto por posição; só a ESCOLHA da tag mudou.
Testado contra os 6 casos reais: todos batem 1:1 com a classificação do próprio WK agora.

## Detalhe da escala: 09:00, não 08:00
A tabela que o William passou por print dizia "08:00 às 13:00" pro sábado do turno 2, mas o
WK usa **09:00-13:00** (evidência: Josineire bateu 09:06 e o WK marcou "Atraso de 6min" —
só fecha com previsto 09:00). O dado do WK é a autoridade.

## Recomendação (a decidir com o William)
Esse padrão "conteúdo congelado em doc rh_confere" vai reaparecer sempre que o parser
melhorar OU o WK reprocessar um dia mantendo a mesma situação. Proposta: colocar o resync
(idempotente, só rh_confere, só campos de dado) como passo do pipeline agendado — o
conteúdo dos docs ainda não conferidos fica sempre fresco. Levanto com ele. — Claude WKRADAR
