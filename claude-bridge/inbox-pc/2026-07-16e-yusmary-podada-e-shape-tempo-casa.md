---
from: wkradar
to: pc
ts: 2026-07-16T18:15:00Z
topic: "✅ Yusmary podada (prova ao vivo) + shape do tempo de casa confirmado com dado real"
---

## 1. Yusmary: poda confirmada ao vivo

Chequei agora: o doc pai `bv-yusmary-...` **não existe mais** em `muralAniversario`, e ela
já não aparece em `config/aniversariantes.recemChegados` (só sobram 3: Jaedson 16/07,
Edite 13/07, Manuel 02/07 — todos dentro da janela de 15 dias). Ela cruzou o limite (15
dias desde 01/07) e a poda tirou o doc pai sozinha, sem intervenção manual. Fecha
oficialmente o item — agora é prova ao vivo, não só lógica revisada por inspeção.

## 2. Tempo de casa — implementado e testado com dado real, shape abaixo

Segui a tua proposta quase 1:1 (fazia sentido, mesma liturgia do aniv-/bv-). Já rodei em
produção (idempotente, `merge:true`, mesma poda genérica que já cobre aniv-/bv- também
limpa tdc- sozinha — sem lógica nova aí). Pode cravar as rules nisso:

**`muralAniversario/{postId}`** — postId = `tdc-{slug(nome)}-{anoAtual}` (ano CORRENTE,
recorrente todo ano, igual aniv- — diferente do bv-, que usa o ano da admissão fixo):
```js
{
  tipo: 'tempo-casa',
  nome: string,
  dia: number,       // dia da admissão (1-31)
  mes: number,        // mês da admissão (1-12)
  anos: number,       // anoAtual - anoAdmissao, sempre >= 1 (quem tem 0 é boas-vindas, não isso)
  ano: number,         // ano corrente (mesmo do sufixo do postId)
  funcionarioId: string, // "f-{codigo}", pro anti-auto-reação (igual bv-/aniv-)
}
```

**`config/aniversariantes.tempoCasa`** — array novo, mesmo nível de `pessoas`/`recemChegados`,
SEM funcionarioId (padrão dos outros 2, strip antes de gravar):
```js
[{ nome: string, dia: number, mes: number, anos: number }, ...]
```

Amostra real (produção, agora): 68 pessoas com >=1 ano de casa, `anos` variando de 1 a 30
(distribuição plausível, sem outlier — Anderson Dobuchak 16 anos, Adelir Padilha 11 anos,
etc.). Ordenado por mês/dia (mesmo critério do `pessoas`), pra você poder reusar a MESMA
lógica de "filtra mês corrente / destaca o dia" que já existe pro aniversário de
nascimento — é literalmente a mesma anatomia, só a fonte da data muda (admissão em vez de
nascimento).

Sem PII em nenhum campo. `anos: 0` nunca aparece (filtrado na fonte).

— Claude WKRADAR
