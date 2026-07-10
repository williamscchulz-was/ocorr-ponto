# Handoff: Dashboard RH — Demografia & Ranking de Tempo de Casa

## Overview
Painel de RH com dois cards lado a lado:
1. **Demografia da Empresa** — resumo de idade média, tempo médio de casa, distribuição por sexo, escolaridade e naturalidade.
2. **Ranking · Tempo de Casa** — Top 10 de colaboradores por tempo de casa.

O objetivo do redesign foi: layout mais limpo em estilo claro, e **os dois cards com exatamente a mesma largura e altura**, sem espaço em branco excessivo.

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que mostram a aparência e o comportamento pretendidos, **não** código de produção para copiar diretamente. A tarefa é **recriar este design no ambiente/codebase existente** (React, Vue, Angular, etc.), usando os componentes, tokens e padrões já estabelecidos no projeto. Se ainda não houver ambiente, escolha o framework mais adequado e implemente ali.

O arquivo `Dashboard RH.dc.html` usa um runtime interno de templates (`{{ }}`, `<sc-for>`); trate isso apenas como forma de expressar dados repetidos — no codebase real, use `.map()`/`v-for`/etc.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos e raios de borda são finais. Recrie a UI fielmente usando as bibliotecas/design system do codebase.

## Screens / Views

### Tela: Dashboard (uma view, dois cards)
- **Layout externo:** container centralizado, `max-width: 1440px`, `padding: 40px`, fundo `#f4f6f5`.
- **Grid dos cards:** `display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 28px; align-items: stretch;`
  - ⚠️ **Ponto crítico:** use `minmax(0,1fr)` e **não** `1fr`. Com `1fr` puro, o texto longo do ranking expande a coluna direita e deixa os cards com larguras diferentes. `minmax(0,1fr)` força colunas iguais.
  - `align-items: stretch` garante que ambos os cards tenham a mesma altura.
- **Card (ambos):** fundo `#ffffff`, borda `1px solid #e7ece9`, `border-radius: 22px`, `padding: 32px`, sombra `0 1px 2px rgba(20,50,35,0.04), 0 12px 34px -18px rgba(20,50,35,0.14)`.

#### Card esquerdo — Demografia da Empresa
`display: flex; flex-direction: column; justify-content: space-between; gap: 22px;` (o `space-between` distribui a folga residual de altura em espaços uniformes, evitando um vazio único).

- **Header:** linha flex `space-between`.
  - Esquerda: ícone (24×24, `stroke #16794a`, ícone "users") dentro de um quadrado 34×34 `border-radius: 10px` fundo `#e8f4ee`, + título "DEMOGRAFIA DA EMPRESA" (13px / 800 / uppercase / letter-spacing 0.09em / cor `#31413a`).
  - Direita: badge "90 ativos" — 12px/700, cor `#16794a`, fundo `#e8f4ee`, `padding: 6px 13px`, `border-radius: 999px`.
- **Métricas hero:** grid 2 colunas (`minmax(0,1fr) minmax(0,1fr)`, gap 16px). Cada box: fundo `#f7faf8`, borda `1px solid #eaf0ec`, `border-radius: 16px`, `padding: 20px 22px`.
  - Label uppercase (11px/700/letter-spacing 0.08em/cor `#8a9791`).
  - Valor: número grande 42px/800/`#16794a` + unidade 16px/600/`#5c6b64` (alinhados por `align-items: baseline`).
  - Caption 12px cor `#94a19b`.
  - Box 1 → "Idade média" · **38** anos · "90 de 90 com data de nascimento".
  - Box 2 → "Tempo médio de casa" · **6** anos · "e 8 meses · 90 com admissão".
- **Distribuição por sexo:** box (mesmo estilo `#f7faf8`).
  - Header: "DISTRIBUIÇÃO POR SEXO" (uppercase) + "41 F · 48 M" (12px/600/`#94a19b`).
  - Barra empilhada: altura 14px, `border-radius: 999px`, trilho `#eef2f0`. Segmentos: Feminino 46% cor `#c0398f`; Masculino 54% cor `#1f74c4`.
  - Legenda abaixo (13px/700): "Feminino 46%" com bolinha `#c0398f`; "Masculino 54%" com bolinha `#1f74c4`.
- **Escolaridade + Naturalidade:** grid 2 colunas (`minmax(0,1fr) minmax(0,1fr)`, gap 20px). Cada coluna é uma lista de barras de progresso:
  - Título de seção uppercase (11px/700/`#8a9791`).
  - Cada item: linha label (13px/600/`#3a4842`, com ellipsis) + valor (13px/800/`#16794a`); barra 7px `border-radius: 999px` trilho `#eef2f0`, preenchimento largura proporcional ao **maior** valor da lista (o maior = 100%).
  - Preenchimento Escolaridade: `#3fae74`. Preenchimento Naturalidade: `#7cc79c`.

#### Card direito — Ranking · Tempo de Casa
`display: flex; flex-direction: column;` — as linhas fluem naturalmente (não usar `space-between`, senão o card cresce demais).

- **Header:** igual ao esquerdo. Ícone "clock". Título "RANKING · TEMPO DE CASA". Badge "Top 10" (12px/700, cor `#5c6b64`, fundo `#f0f3f1`, pill).
- **Lista:** `display: flex; flex-direction: column; gap: 3px;`. Cada linha:
  - `display: flex; align-items: center; gap: 14px; padding: 9px 12px; border-radius: 12px;`
  - **Top 3** têm fundo de linha `#f4faf6`; demais `transparent`.
  - Chip de posição: 27×27, `border-radius: 8px`, 13px/800. Top 3 → texto `#ffffff` sobre `#16794a`; demais → texto `#5c6b64` sobre `#f0f3f1`.
  - Nome: 14px/700/`#1a2420` (nowrap + ellipsis). Departamento: 10.5px/600/uppercase/`#94a19b` (nowrap + ellipsis).
  - Tempo (direita): 14px/800/`#16794a` (nowrap).

## Interactions & Behavior
Este é um painel de leitura (read-only). Sem interações no protótipo além de estados de link. Se o codebase precisar:
- Barras de escolaridade/naturalidade podem animar de 0 → largura final na montagem (opcional, ~400ms ease-out).
- Linhas do ranking podem ter hover sutil (ex.: fundo `#f7faf8`) se a lista for clicável para o perfil do colaborador.

## State Management
Sem estado interativo. Os dados são derivados:
- `escolaridade`/`naturalidade`: `pct = round(value / max(values) * 100) + '%'`.
- `ranking`: cada item recebe `bg`, `rankBg`, `rankColor` conforme `rank <= 3` (top 3).
- Fontes de dados esperadas via API: contagem de ativos, idade média, tempo médio, contagem por sexo, top de escolaridade, top de naturalidade, top 10 por tempo de casa.

## Design Tokens
**Cores**
- Fundo página: `#f4f6f5`
- Card / superfície: `#ffffff`; borda `#e7ece9`
- Superfície interna (boxes): `#f7faf8`; borda `#eaf0ec`; trilho de barra `#eef2f0`
- Pill neutra: `#f0f3f1`
- Verde primário (números/valores): `#16794a`; hover link `#0f5433`; accent verde-claro `#e8f4ee`
- Verde barras: `#3fae74` (escolaridade), `#7cc79c` (naturalidade)
- Sexo: feminino `#c0398f`, masculino `#1f74c4`
- Texto: forte `#1a2420`; título card `#31413a`; corpo `#3a4842`; secundário `#5c6b64`; label/mudo `#8a9791` / `#94a19b`

**Tipografia:** Manrope (400/500/600/700/800). Tamanhos usados: 42 (hero), 16, 14, 13, 12, 11, 10.5px. Labels uppercase com letter-spacing 0.08–0.09em.

**Raios:** cards 22px; boxes internos 16px; chips 8px; linhas ranking 12px; ícone-container 10px; pills/bolinhas 999px.

**Espaçamento:** padding card 32px; gap entre cards 28px; gaps internos 16–22px; padding boxes 20px 22px.

**Sombra card:** `0 1px 2px rgba(20,50,35,0.04), 0 12px 34px -18px rgba(20,50,35,0.14)`.

## Assets
- **Ícones:** dois ícones estilo Feather/Lucide (`users` e `clock`), inline como SVG stroke. Substituir pela biblioteca de ícones do codebase (Lucide, Heroicons, etc.).
- **Fonte:** Manrope via Google Fonts. Usar a fonte equivalente do design system se houver.
- Sem imagens rasterizadas.

## Files
- `Dashboard RH.dc.html` — protótipo completo (markup inline-styled + lógica de dados no `<script>` ao final). É a fonte da verdade visual.
