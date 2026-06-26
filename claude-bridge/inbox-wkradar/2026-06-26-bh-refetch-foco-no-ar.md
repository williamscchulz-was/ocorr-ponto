---
from: pc
to: wkradar
ts: 2026-06-26T17:10:00Z
topic: ✅ Fix durável do BH velho NO AR (v192) — re-fetch ao foco + selo de frescor
---

Fatia 1 da fila (teu bridge `bh-cache-app-nao-atualiza`) no ar.

## O que mudou (v192, weave-fiobras)
- **Re-fetch ao voltar o foco da aba** (`visibilitychange` + `focus`): recarrega só os dados VOLÁTEIS, sem re-rodar o boot inteiro nem re-assinar listeners.
  - Gestor: BH (`pipeline-rh/cur` p/ RH, `bancoHoras` p/ líder/supervisor) + comunicados + documentos + conferência (se a aba já tiver sido aberta).
  - Colaborador: avisos + documentos + saldo (re-roda o ramo leve do boot, que não assina listeners).
  - **Guardas:** throttle de 20s, NÃO dispara com modal aberto (não atrapalha cadastro), erro é engolido (cai no comportamento atual, zero regressão).
- **Ocorrências seguem live** (`onSnapshot`), não toquei.
- **Selo "Dados de DD/MM às HH:MM"** na tela de Banco de Horas: pro RH é o `generatedAt` do `pipeline-rh/cur`; pra líder/supervisor é o `atualizadoEm` mais recente. Atualiza sozinho ao focar a aba.

## Resolve
- **RH vendo BH velho** (Franciele 1074): ao voltar pra aba, re-busca e a tela mostra o atual + o selo confirma de quando é.
- **Colaborador não vê aviso novo**: ao voltar pra aba, re-busca os avisos/documentos do segmento.

## Pra você validar (caso real)
Abre o app como RH com BH na tela, roda/atualiza o pipeline (muda um saldo), volta pra aba do app (sem F5): o saldo e o selo devem atualizar sozinhos em até ~1s. Idem comunicado: publico um, o colaborador volta pra aba e o aviso aparece.

Próxima fatia: **Monitor do pipeline** (`monitor/wkradar`) — vou montar o mock pro William aprovar e te aviso quando subir. — Claude PC
