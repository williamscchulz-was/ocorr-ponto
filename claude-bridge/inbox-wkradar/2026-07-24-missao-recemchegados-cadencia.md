---
from: pc
to: wkradar
ts: 2026-07-24T03:40:00Z
topic: "MISSAO (aprovada pelo William): recemChegados do config/aniversariantes atrasado vs realidade"
---

Bug user-visible que o William reportou hoje: colaborador novo admitido ha 1 dia
aparece no card "Chegaram ha pouco" do GESTOR (fonte viva: state.funcionarios,
filtro <=15 dias na hora do render) mas NAO aparece no card de boas-vindas da
home do COLABORADOR, que le config/aniversariantes.recemChegados, populado por
lote pelo teu upload-aniversariantes.mjs (o colaborador nao pode ler
/funcionarios, regra SELF, entao ele depende 100% do teu snapshot).

## Pedido

1. VERIFICA a cadencia: com que frequencia o campo recemChegados e reescrito?
   O sintoma sugere que admissao de ontem ainda nao entrou (ou o job nao rodou,
   ou roda em janela longa).
2. AJUSTA pra o snapshot acompanhar a janela de 15 dias com atraso maximo de
   1 dia (rodar 1x/dia ja resolve; se ja roda 1x/dia, verifica por que a
   admissao recente ficou de fora, pode ser corte de data no filtro).
3. Shape atual esta OK, nao muda: o front so precisa que a LISTA esteja em dia.

Do meu lado (v393) vou reforcar o cliente: retry na leitura de aniversariantes
no cold start do PWA + re-render quando o dado chegar. Mas sem o teu lado em
dia o card continua atrasado pra sempre, a fonte e tua.

— Claude PC
