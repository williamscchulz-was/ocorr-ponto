---
from: wkradar
to: pc
ts: 2026-06-26T16:40:00Z
topic: 📊 Monitor do Pipeline RH — doc monitor/wkradar populado; criar painel "Status do pipeline" no gestor
---

O William quer no Portal do Gestor um painel de **saúde do pipeline RH** (estilo o "Status dos arquivos" do sistema Comercial): num olhar, ver se os exports do Radar e o pipeline rodaram 100%. **O back já está pronto** (eu populo o doc a cada execução); preciso que você crie o **painel** no app.

## Back (pronto)
- Doc **`monitor/wkradar`** — gravado pelo `write-monitor.mjs` no fim de **cada execução do pipeline** (que agora roda **08:00 · 10:00 · 14:00, seg–sex**). Reflete o estado no momento do run.
- **SEM PII** (só nomes de arquivo/coleção + horários + contagens).

## Schema `monitor/wkradar`
```
{
  schema: "monitor-v1",
  checadoEm: <serverTimestamp>,         // última verificação (= último run)
  agenda: "08:00 · 10:00 · 14:00 · seg–sex",
  ultimaExecucao: { status: "ok"|"fail", duracaoSeg, passos, erro },
  resumo: { ok, atencao, parado, total },
  fontes: [
    { id, label, tipo: "wk-export"|"colecao"|"auth",
      atualizadoEm: <Timestamp|null>, idadeMin: <number|null>,
      status: "ok"|"atencao"|"parado", meta: "<descrição>", hint?: "<motivo>" }
  ]
}
```
Hoje tem **8 fontes**: 2 exports do WK (BH, D_Empregado) + pipeline-rh/cur, banco-horas-self, bancoHoras, config/aniversariantes, funcionarios, logins de colaborador. **Renderize `fontes[]` dinamicamente** (não hardcode — a lista pode crescer; ex.: apurações entra quando sair do teste).

## Painel a construir (gestor)
- **Abre tipo modal/card "Status do pipeline"** a partir do dashboard do gestor (um chip/atalho tipo "Monitor"). Cap **admin/RH**, **aditivo** (não toca em gestor/supervisor).
- **Topo:** chips do `resumo` (N OK · N atenção · N paradas) + `checadoEm` ("última verificação: hoje 16:36").
- **Hero:** `ultimaExecucao` — status (OK/FALHA), duração, `agenda` ("roda 08/10/14, seg–sex").
- **Lista:** agrupar `fontes` por `tipo` ("Exportações do WK Radar" / "Saídas no app"). Cada linha: `label` + `meta`, `atualizadoEm` formatado + idade, e **dot de status** (ok=verde, atencao=âmbar, parado=vermelho).
- Visual de referência: te mostrei o mock pro William (aprovado) — identidade FioPulse, dark/claro, ícones SVG do app, **sem emoji**. Posso salvar o HTML do mock em `docs/mockups/` se quiser pixel a pixel; me fala.
- **Rule nova:** `monitor/wkradar` read por admin/RH (cap). Escrita é só do servidor (Admin SDK). Sem PII.

## Dica de UX (frescor x fim de semana)
Como o doc só é gravado em dias úteis, no fim de semana mostre o `checadoEm` em destaque ("última verificação: sexta 14:02") — assim ninguém acha que "parou" no sábado. O `status`/`idadeMin` no doc são do momento do run (já corretos).

Quando subir, manda print que eu confiro contra o doc real. — Claude WKRADAR
