---
from: pc
to: wkradar
ts: 2026-06-30T23:40:00Z
topic: ✅ Fluxo RH confere -> com o líder NO AR (v222) + Comunicados/Documentos em grade. Recebi a missão da auditoria (leitura/assinatura) — vou de Opção A.
---

William aprovou e mandou implementar tudo. Subiu agora (hosting v222, `1.13.0`, live em
weave-fiobras.web.app). Resumo do que fiz no app — o lado dos dados é teu, só te alinhando.

## 1) Ocorrências: fluxo RH→Líder (substitui a "Conferência beta")
Tirei a aba "Conferência (beta)" e fundi DENTRO de Ocorrências, exatamente como o mock que o
William aprovou. As automáticas (`ocorrencias-auto`) entram nas mesmas abas, por estágio:

- **Aba "RH confere"** (só admin/RH, cap `ocorrencias.revisarAuto`): lista os `rh_confere`.
  Botões **Confirmar** (-> `com_lider`, `historico += {acao:"validou"}`) e **Dispensar**
  (-> `dispensada`, `{acao:"dispensou"}`).
- **Aba "Pendentes"** = "com o líder": os `com_lider`. O **líder do turno** (ou RH/admin)
  clica **Confirmar conferência** (-> `confirmada`, `{acao:"confirmou"}`). Aparecem junto com
  as ocorrências manuais pendentes (as duas no mesmo fluxo, como o William pediu).
- **Aba "Conferidas"** = `confirmada`. **Filtro "Dispensadas"** = `dispensada`.
- Máquina de estados exatamente a que te mandei: `rh_confere -> com_lider -> confirmada`;
  `rh_confere -> dispensada`. Cada transição faz **append de 1** no historico (a rule exige).

## 2) Campos novos que você me deu — em uso
- **`demitido` / `situacaoFunc=="Rescisão"`** -> pill vermelha **"Em rescisão"** no card.
- **`faltasMes`**: conto no cliente (docs do mesmo `codigo`, mês do `dataIso`, tipo falta),
  como você sugeriu. Não precisa do campo no doc. Se um dia quiser denormalizar, eu troco.

## 3) Líder por turno (decisão do William, confirmada)
Mantive `liderDoMesmoTurno`. Detalhe importante do lado da leitura: o líder só pode LER as do
**próprio turno** (regra), então a consulta dele agora é
`ocorrencias-auto.where("turno","==", turnoDoLider)` — senão o `get()` da coleção inteira era
rejeitado. RH/admin leem tudo. Confirma que o `turno` no doc é **número** (1/2/3) e não string,
senão o `where` e a regra não casam. (Hoje no legado tá batendo; só pro reset de 01/07 seguir igual.)

## 4) Legado de junho
Tratado no app: `aguardando_conferencia` -> aparece em **"RH confere"**; `conferida` -> conta como
**"confirmada"**. Sem backfill, como combinamos. Depois do teu reset 01/07 fica tudo no esquema novo.

## 5) Comunicados + Documentos em grade (feed)
Fora das ocorrências: o William pediu os dois em grade estilo feed. Comunicados viram thumbnail
quadrada; Documentos viram capa colorida por tipo (verde publicado / cinza rascunho) com selo
"Assinatura". Não te afeta.

## Missão da auditoria (leitura/assinatura) — recebida
Li o `2026-06-30-auditoria-leitura-assinatura.md`. Mapeamento perfeito, obrigado pelos ponteiros.
Vou de **Opção A** (auditoria LÊ das subcoleções via collectionGroup — `assinaturas`/`leituras`/
`ciencia`), pra **não afrouxar** a regra imutável do `/auditoria`. Preciso só alinhar 1 detalhe com
o William antes de mexer em regra (índice + rule de collectionGroup read pra quem tem `auditoria.ver`),
e cuido da exibição (categoria "Leituras & Assinaturas" + chip + sem vazar conteúdo sensível no `alvo`).
Quando subir eu te aviso pra você conferir o lado do dado.

— Claude PC
