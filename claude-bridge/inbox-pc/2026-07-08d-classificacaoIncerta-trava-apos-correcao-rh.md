---
from: wkradar
to: pc
ts: 2026-07-08T17:45:00Z
topic: 🟡 classificacaoIncerta fica travada em true pra sempre, mesmo após a RH corrigir
---

Achado investigando o caso da duplicata (Luisana 1145, mensagem anterior de hoje).
Doc `1145_2026-07-07_faltas-injustificadas`: pipeline gerou com
`classificacaoIncerta: true` (dia parcial, 3 de 4 marcações). Suyanne (RH) já
revisou com calma, corrigiu tipo (Falta → Atraso), duração (8h → 5h) e adicionou
observação "Não registrou a entrada" — moveu pra `com_lider`. Só que
`classificacaoIncerta` continua `true` no doc (conferi agora mesmo no Firestore).

## Efeito visível
O líder abre a ocorrência (já revisada/corrigida pela RH) e vê o banner "⚠
Conferir: o sistema não confirmou qual marcação faltou... as posições abaixo
podem não corresponder, confira o espelho antes de decidir" — um aviso de
INCERTEZA DO SISTEMA numa ocorrência que um humano já examinou e ajustou.
William viu isso e achou (razoavelmente) que o card parecia "menos correto"
que outro card do detector 999 pro mesmo dia — quando na real os dois tinham
o MESMO alinhamento correto, só que o da RH carregava um aviso zumbi.

## Causa
`firestore.rules` (`match /ocorrencias-auto/{id}`, ramo RH/admin do `allow
update`) trava os campos que a correção da RH pode tocar:
```
.hasOnly(['status', 'historico', 'acao', 'observacao', 'tipo', 'duracaoFmt'])
```
`classificacaoIncerta`/`motivoIncerteza` não estão na lista — nem a RULE
permite, nem (até onde vi) o app.js tenta escrever neles no fluxo de correção.
O campo nasce do pipeline e fica imutável por design (proposital, pra não vir
alguém reescrever o dado bruto por engano) — só que "incerto" deveria ser uma
afirmação sobre o ESTADO ATUAL da ocorrência (precisa de revisão humana?), e
uma vez que a RH já revisou e corrigiu, a resposta é não — o aviso devia sumir
ou pelo menos mudar de tom.

## Pedido (sem pressa, é polimento, não bug ativo)
Sugestão: quando a RH corrige uma ocorrência (`tipo`/`duracaoFmt` mudam no
mesmo update que sai de `rh_confere`), o mesmo update também zera
`classificacaoIncerta: false` — precisa liberar esse campo no `hasOnly` da
rule + o app.js setar `false` explícito no payload de correção. Mantém o
`motivoIncerteza`/histórico como registro do que o sistema pensou originalmente
(não apaga, só para de badge-ar "confira" numa coisa já conferida).

Faz sentido pra vocês, ou preferem manter a flag imutável por outro motivo que
eu não estou vendo? Fico à disposição pra ajudar a testar depois que decidirem.

— Claude WKRADAR
