---
from: wkradar
to: pc
ts: 2026-07-10T15:40:00Z
topic: 🆕 Missão nova (aprovada pelo William) — visibilidade RH pros casos Geral/líder no Banco de Horas
---

William, falando com o RH sobre 2 casos reais (Ivan Carlos Machado atraso 09/07; pane no
cartão ponto 08/07, 11 pessoas sem bater entrada), trouxe o requisito: mesmo que o roteamento
pro Banco de Horas continue igual pra Turno Geral/líder, **RH precisa ver esses casos no app** —
a dinâmica é diferente da conferência normal (ela conferiria/dispensaria, mas precisa saber que
aconteceu porque precisa ir corrigir a marcação bruta no WK Radar). Aprovado, backend já no ar
do meu lado — falta a parte de vocês (data.js + app.js + regra de permissão).

3 rodadas de mockup com o William até convergir (mesmo link, atualizado a cada rodada):
**https://claude.ai/code/artifact/84aeb9cc-c1de-4cd6-bbd0-ac8bb982951f**

## O que já está no ar (meu lado, pipeline)

`process-ocorrencias-rh.py`: os 2 pontos que antes descartavam em silêncio (Geral/líder em
situação != "Faltas Injustificadas" — loop principal E detector 999) agora geram a ocorrência
NORMAL (mesmo card `rh_confere` de sempre, mesma coleção `ocorrencias-auto`), só com 2 campos
aditivos:

```
rotaBH: true            // este card já foi resolvido automaticamente no saldo do Banco de
                         // Horas (regra Geral/líder); não é uma "Faltas Injustificadas" comum
acaoSugerida: "banco-horas-geral"   // valor sugerido pro dropdown de Ação (ver abaixo)
```

`false`/`null` em todo o resto da coleção (não muda nenhum doc existente). Já testado com dado
real (Ivan, 1184, Atrasos 09/07 — confirmado no Firestore) e verificado contra o invariante de
incidente único (`check-pipeline-health.mjs`, ok, zero colisão com a reconciliação — Geral/líder
em situação != Falta nunca gerava doc nenhum antes, é território novo, não compete com nada
existente).

**⚠ Efeito colateral que já aconteceu:** ao subir, **37 casos históricos** (não só os 2 recentes)
apareceram de uma vez — são TODOS os eventos Geral/líder desde o go-live (01/07) que estavam
sendo descartados até agora. Eles JÁ ESTÃO na aba "GP confere" hoje, só que sem nenhum tratamento
visual ainda (aparecem como card normal, com Confirmar/Dispensar — não é o fluxo certo, é só o
estado intermediário até vocês implementarem a parte abaixo). Prioridade alta pra não deixar a
RH confusa por muito tempo.

## O que falta (vocês)

**1. `data.js` — 1 linha nova na lista `ACOES`:**
```js
{ id: "banco-horas-geral", label: "Banco de Horas Geral", padrao: true },
```
Distinta da `"Banco de Horas"` que já existe (essa a RH escolhe na mão pros casos normais; a nova
é especificamente pra quando o SISTEMA já roteou automaticamente pela regra Geral/líder).

**2. Card em `ocaDashCardHtml` (app.js ~10424), quando `o.rotaBH === true`:**
- Badge extra ao lado do badge de tipo: **"Resolvido no Banco de Horas"** (cor neutra/info —
  `badge--info` já existe, `var(--info)`/`var(--info-bg)` — NÃO laranja, não é o mesmo conceito
  de "Conferir"/classificação incerta).
- `.rhacts`: só 1 botão, **"Conferir"** (reusa o verbo que já existe no card do líder — William
  puxou pra esse vocabulário, "GP confere" já é o nome da aba). Sem "Dispensar" ao lado — não
  faz sentido dispensar algo que já aconteceu e já foi resolvido no saldo.

**3. O clique de "Conferir" nesses cards abre o MESMO modal que `openConferirAutoModal` (app.js
~10512) já usa pro líder — fatos + dropdown Ação + Observação — só com 2 diferenças:**
- Ação vem **pré-selecionada** com `acaoSugerida` (hoje sempre `"banco-horas-geral"`) — GP pode
  trocar se quiser, não é travado.
- **Abre DIRETO no clique da GP**, sem passar por `com_lider` primeiro. Achado no caminho:
  `podeConferirUI` (app.js ~5000) hoje só libera admin/líder/supervisor — "`rh não confere
  (cria)`" é comentário explícito no código. Turno Geral não tem líder de turno designado (é
  categoria administrativa, não turno 1/2/3), então rotear esses cards pro fluxo `com_lider`
  normal deixaria eles sem ninguém que possa abrir o modal. Pra esses cards especificamente
  (`rotaBH === true`), a ação de "Conferir" na GP precisa ir direto pro modal de Ação (pula o
  hop `com_lider` — mesmo modal, só sem o intermediário). Único ponto que precisa de ajuste de
  permissão: `podeConferirUI` (ou um caminho equivalente) liberando esse card específico pro
  papel `rh`.

**4. Resto do fluxo é 100% o que já existe, zero mudança:** confirma a Ação → `status:
"confirmada"` (igual sempre) → aparece "Lançar" → clica → `lancada: true` → aba **Lançadas**,
com o badge mostrando a Ação escolhida ("Lançada · Banco de Horas Geral"). Nada novo aqui.

## Por que peço pra ir direto no modal (não passar por com_lider)

Conferi a permissão (`podeConferirUI`) antes de fechar o desenho com o William — não é suposição,
é o comportamento real do código hoje. Se preferirem resolver diferente (ex.: liberar
`com_lider` pra RH só nesses cards específicos, em vez de pular a etapa), tudo bem — o que
importa pro William é o resultado (GP consegue fechar o loop sem precisar de um líder de turno
que não existe pra esse grupo). Only constraint real: **tem que terminar em Lançadas** (pedido
explícito dele) e **tem que perguntar/sugerir a Ação** (não pode ser 1 clique sem contexto — ele
foi específico sobre isso depois de eu ter proposto errado da 1ª vez).

Qualquer dúvida de schema/campo me chamem — os 37 docs já estão no Firestore esperando o
tratamento visual.

— Claude WKRADAR
