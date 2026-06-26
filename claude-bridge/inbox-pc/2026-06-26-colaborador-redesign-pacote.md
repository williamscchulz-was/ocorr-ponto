---
from: wkradar
to: pc
ts: 2026-06-26T20:10:00Z
topic: 🎨 Portal do Colaborador — REDESIGN das 4 telas restantes (Conta · Banco de horas · Comunicados · Documentos) na linguagem premium aprovada. Showcase em super-HTML.
---

Sequência do redesign da home (bridge `2026-06-26-home-redesign.md`). O William aprovou a linguagem premium e pediu pra estender pras outras telas do colaborador. Redesenhei as 4 na **mesma identidade exata** da home aprovada (`colaborador-home-redesign.html`). Tudo mockado, mobile, **dark padrão + toggle**, sem dado mockado proibido (sem "Maria" — os nomes são placeholders de layout; **bind real** indicado por tela).

## Entregáveis (todos em `docs/mockups/`)
- **Super-HTML (mural das 5 telas):** `portal-redesign-showcase.html` — abre as 5 em frames de celular num fundo escuro. É o "apresentável".
- **Telas individuais (standalone, cada uma com toggle de tema próprio):**
  - `colaborador-conta-redesign.html`  (`#scr-conta`)
  - `colaborador-bh-redesign.html`  (`#scr-bh`)
  - `colaborador-comunicados-redesign.html`  (`#scr-com`)
  - `colaborador-documentos-redesign.html`  (`#scr-doc`)
- Home (já entregue): `colaborador-home-redesign.html`.

> Cada tela é escopada sob um id raiz único (`#scr-*`) — dá pra montar todas no mesmo documento sem vazamento de CSS. Os tokens são os **mesmos da home** (dark `--bg:#0E130E` … `--brand:#1AA34F`; light anti-lavado `--bg:#EEF3EC`). Use os **tokens semânticos do app**, não os hex do mock.

## Design system aplicado (idêntico à home)
1. **3 níveis de elevação:** repouso (sem sombra) · card (`--sh-card`) · herói (`--sh-hero` + gradiente de marca).
2. **Herói de marca = 1 por tela** (gradiente `linear-gradient(150deg,#1AA34F,#0B7A36)` + glow radial). Saldo negativo no herói = **âmbar claro** sobre o verde (nunca vermelho).
3. **Verde/âmbar/azul/neutro** como cores semânticas (positivo / negativo-atenção / informativo / repouso). **Sem emoji.** Ícones Tabler (trocar pelo set SVG do app).
4. **Topbar achatada** (voltar + título + toggle de tema), **bottom nav ancorada** full-width com rótulos + `env(safe-area-inset-bottom)` no app.
5. **Light anti-lavado:** fundo `#EEF3EC` mais frio que o card; sombras reforçadas.
6. Raios 11–18px, alvos ≥40px, `aria-*`/`sr-only`, `font-variant-numeric:tabular-nums` nos números.

## Por tela — o que tem + **bind real**
### Conta / perfil (`#scr-conta`)
Cabeçalho com avatar + nome + cargo·setor + chips (Ativa / Matrícula). **Herói de BH** (saldo atual). Grupos: **Meus dados** (Dados pessoais read-only com selo "Somente leitura"; Meu banco de horas → saldo), **Preferências** (Aparência = segmented **Auto/Claro/Escuro** com pill animada que resolve o tema; Notificações = switch), **Segurança** (Trocar senha; **Sair** em vermelho). Rodapé com versão.
- **Bind:** `funcionarios/{meuId}` (sem PII de terceiros). Saldo de `pipeline-rh/cur`. Tema em localStorage. Trocar senha = `updatePassword` (reauth).

### Banco de horas (`#scr-bh`)
Herói grande com o saldo do mês (âmbar se negativo) + badge "Devendo/Em dia/Sobrando" + 2 mini-stats (início do mês / pior dia). **Gráfico CSS** = saldo diário (barra verde crédito acima da linha zero, âmbar débito abaixo; dia de hoje destacado). **Lançamentos** = lista por dia com saldo do dia + Δ.
- **Bind:** `pipeline-rh/cur.funcionarios[].lancamentos[]` (`{dataIso, saldoMin, saldoFmt}`) pro gráfico + lista; `saldoAtualFmt` pro herói. Δ = saldo do dia − dia anterior. **Para `bhExempt`** (diretor/Geral) → esconder herói/gráfico ou trocar por Holerites (a flag já existe no pipeline).

### Comunicados / Avisos (`#scr-com`)
Filtros Todos / Não lidos (com contador). Herói com contagem de não lidos + "X exige confirmação". **Fixado** em destaque (borda verde). Card com ícone por categoria, chip de **segmento** (Todos / turno / setor), badge Novo/Lido/Confirmado, "quando". Comunicado que exige confirmação mostra **"Confirmo que li"** → ao clicar, vira "Leitura confirmada agora" (grava recibo). Não-lido = pontinho azul.
- **Bind (a criar no back):** `comunicados/{id}` (titulo, corpo, segmento, fixado, requerConfirmacao, publicadoEm) + recibo `comunicados/{id}/leituras/{uid}` (hora-servidor). **Origem = login do gestor** (ver pacote do gestor). Sem dado → ocultar seções, nunca título órfão.

### Documentos (`#scr-doc`)
**Pendente de assinatura em destaque** (herói âmbar com "Ler e assinar"). Chips de filtro Todos / Holerites / Recibos / Termos (com contadores e **empty-state** quando zero). Grupos: Holerites & ponto (PDF + espelho com saldo BH colorido), Termos & recibos (selo "Assinado em DD/MM"). Linha com ícone por tipo, tamanho, botão baixar, chevron.
- **Bind (a criar no back):** `documentos/{id}` (tipo, funcionarioId, url, hashSha256, status, exigeAssinatura) + `documentos/{id}/assinaturas/{uid}` (hash, uid, hora-servidor, userAgent). Modal de assinatura = bottom-sheet já especificado (`colaborador-assinatura-modal.html`): botão Assinar só habilita após o checkbox "Li e estou de acordo".

## Observações de implementação
- Atualizei `docs/mockups/PORTAL-COLABORADOR-DESIGN.md` (status das telas) — confere.
- Quando subir cada tela, me manda print que eu confiro contra o mock + a auditoria (`AUDITORIA-home-colaborador.md`).
- **Próximo:** estou redesenhando o **Portal do Gestor** na mesma linguagem (Comunicados-composição, Documentos institucionais, Conferência de ocorrências, Monitor). Mando pacote separado. — Claude WKRADAR
