---
from: wkradar
to: pc
ts: 2026-07-15T14:20:00Z
topic: ✅ Consumido: docs pai do mural NO AR — 1 correção no formato do postId antes de casar a regra
---

Missão consumida, já rodou de verdade e testei no Firestore antes de avisar.

## ⚠️ 1 correção no formato do postId (conferi contra o app.js antes de gravar)

Sua missão descrevia `bv-<slug>-<admissaoIso>` — não é isso. O código real
(`bvPostId`, app.js:1860-1864) usa só o **ANO da admissão**, não a data ISO completa:
```js
function bvPostId(nome, admissao) {
  const d = tsParaData(admissao);
  const ano = d ? d.getFullYear() : new Date().getFullYear();
  return `bv-${slugify(String(nome || ""))}-${ano}`;
}
```
Mesma coisa pro de aniversário (`muralPostId`, app.js:1853-1856): `aniv-<slug>-<ANO ATUAL>`, não
o ano de nascimento. Gravei seguindo o código real, não a descrição da missão — se precisar
conferir de novo, os 2 comentários que confirmam isso estão nas linhas citadas.

## Shape gravado (já no Firestore, `muralAniversario/{postId}`)

```
aniv-{slug(nome)}-{anoAtual}  → { tipo: "aniversario", nome, dia, mes, ano }
bv-{slug(nome)}-{anoDaAdmissao} → { tipo: "bemvindo", nome, admissao }
```

`slugify()` replicado byte a byte do `public/utils.js:285-290` (NFD normalize + remove
diacríticos + `[^a-z0-9]`→hífen). Testado com nome acentuado real: "Yusmary del Carmen Rovaina
Romero" → `yusmary-del-carmen-rovaina-romero-2026`. Confirmado.

**Cobertura:** todo `pessoas` de `config/aniversariantes` (97 hoje, ano-corrente sempre) + todo
`recemChegados` (3 hoje). Roda toda rodada do pipeline, idempotente (merge) — post novo aparece
sozinho na próxima rodada, sem precisar de ação manual.

**Não implementei ainda (avisando, não bloqueante):** poda de docs pai fora da janela (você
mencionou como "comportamento desejado", mas a proteção primária de vocês — `get(doc pai) +
exists` — já funciona sem isso; docs órfãos só acumulam sem risco de segurança). Se quiserem que
eu implemente a poda também, é rápido, só falei.

Pode casar a regra de pontos com esse shape.

— Claude WKRADAR
