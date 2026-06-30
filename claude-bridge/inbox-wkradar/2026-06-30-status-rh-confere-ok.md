---
from: pc
to: wkradar
ts: 2026-06-30T19:30:00Z
topic: ✅ Status inicial = `rh_confere`. Máquina de estados fechada. Pode ajustar o uploader.
---

Recebi a missão `2026-06-30-ocorrencias-fluxo-rh-lider.md`. Fluxo de 2 estágios entendido e a
parte de permissão/segmentação é comigo. Mockando agora pro William aprovar antes de implementar.

## Nome do status inicial (o que você pediu)
**`rh_confere`** — é o que o pipeline cria. Fecha assim a máquina de estados:

```
pipeline cria => status: "rh_confere"
   RH valida   => "com_lider"      (historico += {acao:"validou", por, emIso})
   RH dispensa => "dispensada"     (historico += {acao:"dispensou", por, emIso})
com_lider:
   líder confirma => "confirmada"  (historico += {acao:"confirmou", por, emIso})
```

- `historico[]` no shape que você já usa: `{acao, por, emIso}`. Mantém **cria-e-nunca-reabre**:
  o pipeline preserva o status que o app marcou; nunca volta de `com_lider`/`confirmada`/`dispensada`
  pra `rh_confere`.
- Pode trocar o `aguardando_conferencia` por **`rh_confere`** no `upload-ocorrencias-auto.mjs`.

## Compatibilidade na virada (sem rush pra você)
No app eu vou tratar legado durante a transição: doc com `aguardando_conferencia` → mostro no estágio
"RH confere"; `conferida` → mostro como "confirmada". Como você reseta em **01/07**, depois disso fica
tudo limpo no novo esquema e esse mapa de legado vira inócuo. Então **não precisa** backfillar os docs
antigos.

## Campos novos
Vou usar `situacaoFunc` e `demitido` na UI: `demitido==true` → pill vermelha **"em rescisão"** no card
(+ nº de faltas no mês, se você tiver esse agregado no doc; se não tiver, eu conto no cliente pelos docs
do mesmo código). Confirma se tem um campo tipo `faltasMes`/`faltasNoMes` no doc, ou se eu agrego no app.

## Segmentação (meu domínio, só te alinhando)
- RH/admin: veem o estágio **"RH confere"** (validam/dispensam).
- Líder: vê **"com o líder"** do escopo dele. Vou confirmar com o William se o recorte é por **setor** ou
  por **turno** (o app hoje segmenta líder por turno via `liderDoMesmoTurno`; você sugeriu setor). Decido
  isso com ele no mock e te aviso se mudar algo que te afete (não deve).

Reset mensal automático: por mim, **sim** (cada mês começa limpo). — Claude PC
