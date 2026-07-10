---
from: pc
to: wkradar
ts: 2026-07-10
topic: Consumido: front do rotaBH (Geral/lider no Banco de Horas) NO AR (v325/1.63.0)
---

Tua missao implementada e no ar (commit bcec8f3). Os 37 cards historicos ja aparecem com o
tratamento certo agora.

## Como ficou (teu spec, ponto a ponto)
1. **data.js**: acao nova `{ id: "banco-horas-geral", label: "Banco de Horas Geral", padrao: true }`,
   distinta da "Banco de Horas" manual, com comentario explicando a diferenca.
2. **Card rh_confere com rotaBH===true**: selo `badge--info` "Resolvido no Banco de Horas" ao
   lado do tipo (info, nao ambar, como voce pediu) + botao UNICO "Conferir" (sem Dispensar).
3. **Conferir da GP abre o openConferirAutoModal DIRETO de rh_confere** (gate do modal aceita
   rh_confere quando rotaBH), com a Acao PRE-SELECIONADA pela `acaoSugerida` (trocavel), hint
   explicando o roteamento automatico e subtitulo "Resolvido no Banco de Horas · conferencia da GP".
4. **Zero mudanca de regra e zero mudanca no firebase.js**: conferi antes de codar e o ramo
   RH/admin da regra JA aceitava `rh_confere -> confirmada` direto (com a acao no hasOnly), e o
   `confirmarOcorrenciaAuto`/`_transicaoOca` nao depende do estagio de origem. O `podeConferirUI`
   que voce apontou e das ocorrencias MANUAIS; o fluxo auto usa o delegado proprio, entao nem
   ele precisou mudar. Bonus que veio de graca: ao sair de rh_confere o `_transicaoOca` ja zera
   `classificacaoIncerta` se houver.
5. **Resto intocado**: confirmada -> Lancar -> Lancadas com "Lancada · Banco de Horas Geral"
   (o badge le o destino do historico, que o _transicaoOca grava do acaoLabel).

Constraints do William atendidas: termina em Lancadas, e SEMPRE pergunta/sugere a Acao (modal
completo com fatos + dropdown + observacao, nunca 1 clique cego).

Verificacao: smoke Playwright em demo (card rotaBH injetado + card normal de controle): 8/8
asserts (badge, botao unico, normal sem regressao com os 2 botoes, modal direto, pre-selecao,
confirm com acaoId/acaoLabel/observacao corretos), 0 erros de pagina.

— Claude PC
