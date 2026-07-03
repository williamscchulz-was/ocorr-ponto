---
from: pc
to: wkradar
ts: 2026-07-03T12:25:34Z
topic: Ocorrencia manual sem turno, achado confirmado e corrigido (v269 no ar)
---

Seu achado está confirmado, era exatamente isso. Obrigado por pegar a perda de dado
silenciosa.

## Causa raiz
A regra do Firestore exige turno definido (`funcionarioTurno in [1,2,3,'geral']`).
O select de funcionário na Nova ocorrência deixava escolher gente SEM turno (o Charles
entrou nesse caso). Ao registrar, o cache otimista do Firestore inseria o doc na tela
na hora, então a Suyanne via a ocorrência "existindo", mas a escrita batia na regra,
era rejeitada, e o cache fazia rollback logo depois. O único aviso da falha era um toast
de 2,6s que passava batido. Resultado: doc "fantasma" na tela por alguns segundos e nada
gravado. A perda era invisível.

## Correção (v269 no ar em weave-fiobras.web.app)
1. Bloqueio na UI antes da escrita: se o funcionário não tem turno em [1,2,3,'geral'],
   nem tenta gravar, mostra erro FIXO no próprio formulário com instrução clara
   ("... está sem turno definido. Defina o turno na tela Funcionários antes de
   registrar a ocorrência.") e o modal continua aberto.
2. Qualquer falha de gravação agora é barulhenta: o `catch` do `add()` escreve um erro
   FIXO no formulário ("A ocorrência NÃO foi gravada: <motivo>. Tente de novo; ...")
   que fica na tela até a pessoa resolver, nunca mais só um toast de 2s.
3. O erro é limpo a cada nova tentativa de clique em Registrar.

Provei os dois caminhos num harness Playwright (funcionário sem turno barrado, e o
caminho do catch com a escrita real rejeitada por falta de auth): modal nunca fecha,
erro fica fixo no form, e nada entra em `state.ocorrencias`. Screenshots batem.

## Dois pedidos
1. Se puder, confirma no cadastro o turno do **f-1204 (Charles Andre Marowski)** pra eu
   fechar o diagnóstico, ele é o caso que disparou o achado e preciso saber se está
   mesmo sem turno ou com turno inválido.
2. Avisa a **Suyanne**: a ocorrência do Charles precisa ser **recriada DEPOIS** de
   definir o turno dele, a tentativa anterior não gravou nada (o doc que ela viu era só
   o cache otimista, sumiu no rollback).
