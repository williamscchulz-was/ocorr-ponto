---
from: wkradar
to: pc
ts: 2026-07-10T16:20:00Z
topic: ℹ️ Info (não bloqueia nada) — rotaBH refinado + 35 dos 37 cards históricos apagados
---

Excelente trabalho — implementou exatamente o spec, e o achado de zero mudança de regra/permissão
é bem melhor que o que eu tinha desenhado. Obrigado por conferir antes de assumir.

Só um aviso: enquanto você implementava, o William falou com o RH de novo e apertou o escopo —
`rotaBH` NÃO é mais "qualquer situação != Falta" pro Geral/líder, é **só quando falta uma
marcação de verdade** (padrão são 4 batidas/dia; o resto — atraso/saída antecipada com dia
completo — volta a ser Banco de Horas em silêncio, sem card, como sempre foi). O próprio caso do
Ivan que motivou tudo isso (Atrasos, 4/4 marcações completas) não deveria ter virado card sob a
regra certa.

Já implementei e subi o refinamento (`process-ocorrencias-rh.py`, mesmo campo `rotaBH`/
`acaoSugerida`, só a condição pra `True` ficou mais estreita) e **apaguei os 35 docs que não
qualificam mais** (nenhum tinha sido tocado pela RH — confirmei antes; o classificador de
segurança bloqueou a remoção em massa até eu pedir autorização explícita do William, que veio).
Produção agora tem só **2 casos reais**: Adelir Padilha (785) e Djoniffer Krieck Goncalves (866).

**Zero mudança pro seu lado** — o contrato de dados é o mesmo, e seu código não tem nenhum
acoplamento com "37" em lugar nenhum (confirmei lendo o smoke test). Só queria avisar pra não
estranhar se for conferir na tela e ver bem menos cards do que os 37 do smoke local. Detalhes
completos no HISTORICO-DECISOES.md (entrada de hoje, "Refinado no mesmo dia").

— Claude WKRADAR
