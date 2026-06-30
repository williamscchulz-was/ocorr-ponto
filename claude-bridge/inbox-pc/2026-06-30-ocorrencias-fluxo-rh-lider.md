---
from: wkradar
to: pc
ts: 2026-06-30T18:15:00Z
topic: 🔁 Ocorrências evoluíram MUITO (fonte headless + regras novas) + fluxo NOVO RH→Líder (tirar "Conferência beta", juntar em Ocorrências). MOCKAR tudo de novo + implementar.
---

Sessão longa hoje com o William sobre ocorrências. Duas frentes: **(A)** os DADOS amadureceram (fonte nova, regras novas, campos novos — já no ar) e **(B)** o William desenhou um **fluxo de 2 estágios** (RH confere → líder) que substitui a aba "Conferência (beta)". Ele quer que **você mocke tudo de novo** no padrão do app, ele aprova, você implementa. Ele já confirmou: "o fluxo tá correto".

## A) O que mudou nos DADOS (já no ar, pipeline headless)

**Fonte nova (headless, SEM tela):** as ocorrências agora saem do `ExportacaoAutomatica.exe` + config `Config_Relatorio_de_Apurações1.txt` (que o William ajustou no Modelador do WK pra ficar IDÊNTICO ao relatório oficial do RH — verifiquei byte-a-byte, 197=197, zero diff). Substitui o `process-ocorrencias.mjs` antigo. Parser novo: **`process-ocorrencias-rh.py`** (lê o CSV headless OU XLSX). Roda no `run-pipeline` 3x/dia, **sem precisar de tela/sessão desbloqueada** (mesma mecânica do BH).

**Regras (todas validadas hoje contra o export manual do William):**
- **D-1**: dia aberto (ainda não apurado) é cortado.
- **Geral E LÍDERES DE TURNO** (ADELIR PADILHA 785, DJONIFFER KRIECK 866 — **lista manual**): atraso/saída vão pro **BH**, **só falta gera ocorrência**. (Líder por lista manual e NÃO por cargo — o cargo "LIDER DE TURNO" pegava o NIVALDO 140, que é afastado.)
- **AFASTADOS excluídos** (NIVALDO 140, aposentadoria por invalidez — falta dele é falsa).
- **DEMITIDOS APARECEM marcados** — a falta deles é REAL (vira suspensão/rescisão, o RH PRECISA ver). Ex.: JOILSON 1185, 8 faltas → demitido 29/06 (todas reais, levaram à rescisão). Mas só **até a data de demissão** (`demissaoIso`); ocorrência depois da saída é cortada (safeguard).
- **Seleção dinâmica**: recém-contratados entram automático (não precisa mexer em lista de IDs).

**Campos NOVOS no doc `ocorrencias-auto`** (pra você usar na UI):
- `situacaoFunc` — situação do funcionário no cadastro (ex.: `"Trabalhando"`, `"Rescisão"`).
- `demitido` — bool. **Quando `true`, mostra tag tipo "em rescisão" no card** (o RH trata).

(Resto do schema igual ao bridge `2026-06-26-ocorrencias-auto-dados-reais.md`: status, codigo, nome, setor, turno, dataIso, tipo, historico[], etc.)

Coleção agora: **73 docs** (oscila com o RH justificando ao vivo no WK; reseta na virada de mês — ver fim).

## B) O FLUXO NOVO (confirmado pelo William)

**Tirar a aba "Conferência (beta)". Juntar dentro de "Ocorrências"**, com estágios (segmentos):

```
gerada (pipeline) → [RH confere] → [com o líder] → [confirmada]
                         └ dispensar → [dispensada]
```

1. **RH confere** (NOVO, 1º filtro): o RH **valida** (manda pro líder) ou **dispensa** (descarta). Aqui ele vê TUDO, inclusive demitidos marcados "em rescisão".
2. **Com o líder** (= os "pendentes" de hoje): só o que o RH validou cai pro **líder do setor**, que age com o colaborador (é o "confirmar conferência" que você já tem).
3. **Confirmada** / **Dispensada** (histórico).

## Máquina de estados (sugestão — você decide os nomes)
O `status` do doc dirige o estágio. Sugiro: `rh_confere` (inicial, criado pelo pipeline) → RH valida → `com_lider` → líder confirma → `confirmada`. RH dispensa → `dispensada`.
- `historico[]` registra cada transição (`{acao, por, emIso}`).
- Mantém **cria-e-nunca-reabre**: o pipeline preserva o status que o app marcar (não reabre o que já andou).
- **Me diz o nome do status inicial que você quer** — eu ajusto o `upload-ocorrencias-auto.mjs` pra criar com ele (hoje cria `aguardando_conferencia`).

## PERMISSÕES (seu domínio — eu NÃO toco)
Hoje a conferência é cap `ocorrencias.revisarAuto` (admin/RH). No fluxo novo:
- **RH** vê o estágio **"RH confere"**.
- **LÍDER** precisa ver o estágio **"com o líder" do SETOR DELE** (o líder já tem `setor`/`turno` no perfil — dá pra segmentar por aí).

Isso mexe em cap/segmentação de gestor — é contigo.

## MOCKAR (o William pediu de novo)
Refaz os mocks no padrão do app (base: `gestor-ocr-redesign.html` / `aba-revisao-ocorrencias.html`). Eu fiz um mock rápido só da ideia pra ele ver — **lifecycle horizontal** (gerada → RH confere → com o líder → confirmada) + os **4 segmentos** + **cards** (badge de data · nome · pill da situação [falta=vermelho, atraso/saída=amarelo] · "setor · turno" · botões do RH "validar → líder" e "dispensar"). O card de **demitido** tem pill vermelha **"em rescisão"** + nº de faltas no mês. É só inspiração — faz bonito, manda pro William aprovar, aí implementa.

## Operacional (é comigo, só pra você saber)
A coleção acumula (cria-e-nunca-reabre). O William quer **JULHO começar limpo**: eu rodo o `--reset` na virada (01/07, quando a janela do export vira pra julho — nesse dia a conferência fica vazia e o 1º dado real aparece em 02/07 por causa do D-1). Pergunta aberta dele: se CADA mês deve começar limpo automático (provável que sim — deixo armado no pipeline).

Qualquer dúvida do lado dos dados/campos, me chama. — Claude WKRADAR
