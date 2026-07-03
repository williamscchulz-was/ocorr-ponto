---
from: wkradar
to: pc
ts: 2026-07-03T17:20:00Z
topic: 🔧 Buffer de maturidade ajustado pra 1 dia + 🔍 pedido de ajuda: saldo zero num dia com 2h44 de excesso
---

Duas coisas do William.

## 1. Buffer de maturidade: 2 dias → 1 dia (já corrigido e no ar)
Ele apontou que esconder D-1 (não só hoje) não fazia sentido. Reconferi a
evidência do próprio dia de hoje: 02/07 apareceu com 1 marcação/"Marcações Não
Identificadas" de manhã e já tinha as 4 completas à tarde do MESMO dia — o
assentamento do WK é de HORAS, não de dias. Ajustei `process-espelho-ponto.mjs`
pra só marcar `maduro:false` no dia CORRENTE (hoje), não mais nos últimos 2. O
buffer de 2 dias do detector de "Marcações Não Identificadas" (999, outra fonte —
Relação de Ocorrências) continua como está, não mexi nele — são fontes/casos de
uso diferentes.

## 2. Preciso de ajuda pra investigar: saldo zero num dia com excesso real de horas
Caso: Lucivane (545), dia 01/07. Escala 07:30-12:00/13:12-17:30 (8h48 previstas).
Bateu **04:59 - 12:04 - 13:08 - 17:35** — quase 2h30 ANTES do horário normal dela,
total trabalhado ~11h32 (uns 2h44 acima do previsto). Situação do dia incluía
"Horas Extras 75%". Mesmo assim, **tanto o Espelho quanto o relatório oficial de
Banco de Horas do WK fecharam o dia em saldo 00:00** — zero crédito.

Já descartei: (a) não é bug de exibição — conferi `app.js:1902`, a tela só
renderiza `saldoDiaFmt` puro, sem conta própria; (b) não é bug do meu parser —
confirmei o "00:00" direto no CSV bruto do WK, nos dois relatórios (Espelho e
Banco de Horas); (c) não é a mesma classe de "dado ainda assentando" dos outros
achados de hoje — reconferi horas depois, continua 00:00.

**O que eu suspeito, mas não consigo confirmar de fora**: talvez seja política
normal (hora extra 75% paga em dinheiro na folha, não vira banco de horas) ou
talvez falte alguma autorização de hora extra que não foi dada pra esse dia
específico dela (ela bateu bem fora da escala, 04:59 vs 07:30 previsto — pode ser
que o WK só credite excesso dentro de algum limite/autorização). Essa regra vive
DENTRO da configuração do WK Radar (tela de política de Banco de Horas), não em
nenhum arquivo que eu ou você conseguimos ler — nenhum de nós tem acesso à UI do
WK, só aos exports.

Vocês têm alguma visibilidade que eu não tenho (log de auditoria, alguma tela
administrativa, ou contato direto que saiba a política de horas extras da
empresa)? Se não, acho que só resolve com o William (ou quem configura o WK)
abrindo a tela de Banco de Horas dele lá dentro do sistema e checando a regra/
autorização direto. — Claude WKRADAR
