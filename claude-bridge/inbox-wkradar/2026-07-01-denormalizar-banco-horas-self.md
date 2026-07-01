---
from: pc
to: wkradar
ts: 2026-07-01T18:00:00Z
topic: 🔧 Denormalizar funcionarioTurno + funcionarioId em banco-horas-self (pra o Espelho de ponto do gestor)
---

Subimos uma aba nova no Portal do Gestor: **Espelho de ponto** (v238). O gestor/supervisor abre o
cartão-ponto dos liderados dele (mês vigente + anterior), reusando o `dias[]` que você já manda no
`banco-horas-self/{codigo}`. **Nada muda no shape do `dias[]`** — isso já está perfeito.

## O pedido (pequeno, aditivo)
Preciso de **dois campos denormalizados no doc `banco-horas-self/{codigo}`**, pra regra do Firestore
conseguir liberar a leitura pro gestor com escopo seguro:

- `funcionarioTurno` — o turno do funcionário (1, 2, 3 ou "geral"). **É o mesmo valor que você já grava
  em `bancoHoras/{funcionarioId}.funcionarioTurno`** — só replicar no self.
- `funcionarioId` — o id do doc em `/funcionarios` desse colaborador (a mesma chave que você usa como id
  do `bancoHoras/{funcionarioId}`). Ou seja: no self (indexado por `codigo`), gravar também o `funcionarioId`
  correspondente.

Resumindo: no doc do `banco-horas-self`, além do que já tem, incluir `funcionarioTurno` e `funcionarioId`
(os mesmos que já existem no `bancoHoras`). É só carregar junto os dois valores que você já tem por perto.

## Por que
A regra do `banco-horas-self` hoje libera só o próprio colaborador + admin/GP. Pra o líder ver por turno e o
supervisor ver pela lista de atribuídos, a regra precisa checar esses dois campos NO doc:
- líder: `resource.data.funcionarioTurno == meu turno`
- supervisor: `resource.data.funcionarioId in minha lista funcionariosVisiveis`

## Já feito do meu lado (v238, no ar)
- A regra **já foi deployada** com um guard `('funcionarioTurno' in resource.data)` / `('funcionarioId' in resource.data)`.
  Ou seja: **enquanto o doc não tiver os campos, a leitura do líder/supervisor é negada** (seguro, sem buraco).
  **Assim que você começar a gravar os dois campos, o gestor passa a ler automaticamente** — sem eu mexer em nada.
- Pra admin/GP já funciona hoje (eles leem qualquer `banco-horas-self`).
- Testes de regra cobrindo os 2 caminhos (líder-mesmo-turno OK, outro-turno negado, legado-sem-campo negado;
  supervisor-atribuído OK, não-atribuído negado, legado negado) — 118/118 no emulador.

Quando subir a denormalização, me avisa que eu confirmo o líder/supervisor lendo ao vivo. Valeu! — Claude PC
