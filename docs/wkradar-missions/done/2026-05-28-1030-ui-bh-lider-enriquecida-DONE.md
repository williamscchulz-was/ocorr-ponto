# MISSÃO: Enriquecer tela de Banco de Horas do líder

**Solicitante:** Claude WKRADAR (William aprovou)
**Criado em:** 2026-05-28 10:30 BRT
**Prioridade:** baixa-média
**Contexto:** Item 6 da missão anterior. O líder lê BH de `bancoHoras/{f-codigo}` (filtrado por turno via rule). Eu (pipeline) acabei de denormalizar campos extras nesse doc. Agora o líder pode ver mais que só saldo+nome+turno.

## Campos NOVOS em `bancoHoras/{f-codigo}`

Já populados pelo pipeline (123 docs, rodou 28/05). Schema atualizado:

```js
{
  // já existiam
  funcionarioCodigo: string,
  funcionarioNome: string,
  funcionarioTurno: 1|2|3|"geral"|null,
  minutos: number,                 // saldo BH
  saldoFormatado: string,          // ex "-04:00"
  atualizadoEm: Timestamp,
  atualizadoPor: "pipeline-rh",

  // NOVOS (denormalizados do D_Empregado, sem PII)
  cargo: string|null,              // ex "OPERADOR DE MÁQUINA II"
  setor: string|null,              // ex "REPASSE"
  escala: string|null,             // ex "2º turno - 13:30 ÀS 17:00 / 17:30 ÀS 22:00"
  idade: number|null,              // ex 26
  aniversarioDM: string|null,      // ex "13/11"
  diasNaEmpresa: number|null,      // ex 640
}
```

## Tarefa

Na tela de **Banco de Horas** que o líder vê (`renderBancoHoras` ou equivalente), enriquecer cada card de funcionário com os campos novos. Hoje mostra só nome + saldo + turno.

Sugestão de layout no card de cada funcionário:
```
[avatar] Josineire Ferreira Alves
         Operador de Máquina II · REPASSE
         Escala: 2º turno - 13:30 ÀS 17:00 / 17:30 ÀS 22:00
         26 anos · 🎂 13/11 · 1a 9m de casa
                                    saldo: -04:00 [badge vermelho/verde]
```

Detalhes:
- `diasNaEmpresa` → converter pra "Xa Ym de casa" (tu já tem helper `tempoDeCasa` da missão anterior)
- `aniversarioDM` → mostrar com emoji de bolo OU texto (William removeu emojis da UI — respeita a preferência dele, usa texto tipo "Niver: 13/11")
- Saldo continua sendo o destaque principal (é tela de BH)
- Admin/RH veem todos; líder vê só do turno dele (já garantido pela rule + filtro local existente)

## Critério de sucesso

- [ ] Card de BH do líder mostra cargo, setor, escala, idade, aniversário, tempo de casa
- [ ] Saldo continua em destaque
- [ ] Sem emojis (preferência William)
- [ ] Bumped v= cache buster
- [ ] Deploy
- [ ] Move pra done/ com OUTPUT

## Observações

- Campos podem vir null pra alguns (ex: aprendizes sem escala). Usa o helper `dash()` que tu já tem.
- Pipeline roda diário 08:00 BRT e re-popula tudo. ERP é fonte canônica.
- Sem pressa — prioridade baixa-média. Quando der.

---

## OUTPUT (executado em 2026-05-28 ~14:35 BRT)

**Status:** Concluído pelo Claude PC

### Implementação

`public/app.js` — `renderBHList`: cada card de Banco de Horas agora mostra,
abaixo do nome:
- **Cargo · Setor** (substitui a linha "cód · turno" quando há dados)
- **Escala:** linha própria quando presente
- **Meta:** "26 anos · Niver: 13/11 · 1a 9m de casa" (idade + aniversário
  em texto, sem emoji, + tempo de casa via helper `tempoDeCasa`)
- Saldo continua em destaque à direita (badge verde/vermelho) + última
  atualização

Fonte dos dados: prioriza o objeto `funcionario` (f.*, sempre populado
em /funcionarios pra admin/RH e líder) com fallback no doc de saldo
(bh[f.id].*, que o pipeline denormalizou). Assim funciona pros dois
papéis independente de qual coleção alimenta state.bancoHoras.

`public/styles.css`: `.bh-card__escala` + `.bh-card__meta`.

### Critério de sucesso

- [x] Card mostra cargo, setor, escala, idade, aniversário, tempo de casa
- [x] Saldo continua em destaque
- [x] Sem emojis (aniversário como "Niver: DD/MM")
- [x] Campos null tratados (helper dash local + filtros)
- [x] v= bumped: 90 → 91
- [x] Deploy: firebase deploy --only hosting:weave (release complete)
- [x] Movido pra done/

### Observação pro WKRADAR

Como o app já lia os campos enriquecidos do /funcionarios (missão anterior),
a denormalização em /bancoHoras acabou sendo redundante pra ESTE caso de uso
(uso f.* direto). Mas mantém ela — é a fonte canônica do líder pra saldo e
deixa /bancoHoras self-contained se algum dia o app parar de cruzar com
/funcionarios. Sem ação necessária do teu lado.

— Claude PC
