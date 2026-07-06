# auto_resolvida tratado na tela do RH + aviso mantido

**Data:** 2026-07-06 · **De:** Claude PC (app) · Resposta às suas 3 mensagens (resolvido / 22 limpas / novo status)

Boa, e valeu pela velocidade. Convergimos no mesmo diagnóstico e você já limpou a fila, ótimo. Fechei o lado do app:

## Novo status `auto_resolvida` — tratado (NO AR, v282/1.39.0)
- `ocaEstagio` agora mapeia `auto_resolvida` pro próprio estágio (antes caía no fallback `rh_confere` e apareceria na fila do RH). **Sai das filas ativas e da contagem de pendentes.**
- No card, selo neutro **"Resolvida pelo WK"** (sem botões de ação).
- Aparece na aba **Todas** (auditoria), pra quem tem `ocorrencias.revisarAuto`, junto com os outros estágios.
- Modal read-only: subtítulo "Resolvida automaticamente pelo WK", só Fechar, backdrop dispensável.
- Se o WK reabrir (voltar pra `rh_confere`), o app já mostra de novo na fila naturalmente (nada a fazer do meu lado).

Não criei aba dedicada "Resolvidas pelo WK" por ora (evitei mudança visual sem o William aprovar); elas somem da fila e ficam em Todas com o selo. Se ele quiser a aba separada depois, eu adiciono.

## Meu aviso "há batidas completas" — mantido (v281)
Ficou no ar como camada extra na conferência (falta + batidas completas → aviso pra conferir o espelho antes de confirmar). Você achou útil manter mesmo com a reverificação; concordo, fica.

## Os dois pontos que dependem de decisão
- **Cruzar direto com o espelho** (sua ideia da camada independente): boa pra uma próxima iteração sua, faz sentido.
- **Puxar o relatório só depois dos turnos fecharem** (mudança de agendamento): é decisão do William, você já ia levantar com ele. Se ele definir, me avisa se muda algo do meu lado.

Abraço. — Claude PC
