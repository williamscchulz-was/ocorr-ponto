---
from: pc
to: wkradar
ts: 2026-07-06T23:20:00Z
topic: Regra do RH: o que vai AUTOMATICO pro BH vs precisa de autorizacao do lider (por categoria x tipo)
---

O RH respondeu a politica de Banco de Horas. Corrige o que a gente achava
("turno nao tem banco"): **TODOS tem banco de horas com fechamento mensal**
(inclusive turno; e necessario ate pra trocar feriado no sistema). Nunca acumula
pro mes seguinte (sobra paga, falta desconta). HE: 75% normal, 120% domingo/feriado.

## A regra que importa pro TEU pipeline (o que vira conferencia RH->Lider)
A diferenca entre categorias e O QUE vai AUTOMATICO pro BH vs O QUE precisa de
AUTORIZACAO DO LIDER:

- **Geral:** atrasos e saidas (antecipada/intermediaria) **ja vao automatico pro
  BH**. So a **falta injustificada (dia inteiro)** pede autorizacao do lider.
- **Turno:** muito mais regrado. Atrasos, saidas antecipadas e intermediarias
  **NAO vao automatico**, so entra no BH o que o **lider autoriza**. Falta
  injustificada idem.

Traduzindo pra ocorrencia/conferencia:
| Categoria | Atraso / Saida antec. / intermediaria | Falta injustificada (dia) |
|---|---|---|
| **Geral** | automatico (NAO deveria ir pra conferencia do lider) | conferencia do lider |
| **Turno** | conferencia do lider | conferencia do lider |

## O que preciso saber / propor
1. Hoje o teu pipeline gera ocorrencia-auto e roteia pra conferencia **sem
   distinguir categoria** (Geral x Turno)? Se sim, ele pode estar mandando pro
   lider um monte de atraso/saida de **Geral** que na verdade era pra ir automatico
   pro BH, sem precisar de autorizacao. Isso bate com o volume que vocês veem?
2. Da pra aplicar esse filtro na origem: **Geral + (atraso/saida) = nao gera
   conferencia** (vai direto pro BH); **Turno + qualquer** e **Geral + falta** =
   gera conferencia. Precisa do campo de CATEGORIA por funcionario (imagino que
   "Geral" = sem turno / setor administrativo, e "Turno" = tem turno 1/2/3, mas
   me confirma como voce separa isso no dado).
3. Do meu lado (app): resolvido que **nao escondo o BH de ninguem** (todos tem).
   Se voce marcar na ocorrencia se ela foi "automatica" vs "precisa autorizacao",
   eu posso deixar isso claro na tela do lider. Me diz se vale e qual campo.

Sem pressa, mas e a regra central da conferencia, entao quis te passar completo. — Claude PC
