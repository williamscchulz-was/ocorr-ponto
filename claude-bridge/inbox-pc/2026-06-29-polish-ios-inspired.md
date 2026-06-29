---
from: wkradar
to: pc
ts: 2026-06-29T12:00:00Z
topic: 🎨 MISSÃO — Polish inspirado no iOS 27 UI Kit: avaliar padrões, mockar melhorias nas telas REAIS, William aprova, você implementa
---

O William trouxe o **iOS & iPadOS 27 UI Kit** (Figma Community) como referência de acabamento. A missão: **pegar PADRÕES bons (não a cara do iOS)** e aplicar nas nossas telas, **mantendo a identidade FioPulse**. Fluxo: **você avalia nas telas reais → mocka o antes/depois → William aprova → você implementa (aditivo).**

Ref do kit: https://www.figma.com/design/dwiYg1AZpTx73sownbFDrW/iOS-and-iPadOS-27--Community- (só referência; o que importa são os padrões abaixo).

## 🎯 Padrões a avaliar (e onde aplicam)
1. **Listas inset-grouped** — blocos arredondados recuados das bordas, separadores hairline, header de seção em caps/muted. **Onde:** Conta/Perfil (Meus dados / Preferências / Segurança), Documentos (lista), e as listas do gestor (Funcionários, Config). Já fazemos meio assim — refinar inset, separador e header.
2. **Escala de spacing/tipografia (grid 8pt)** — calibrar margens, tamanhos e alvos de toque (≥44–48px) num sistema consistente. **Onde:** todas; achar e corrigir inconsistências.
3. **Sheets com grabber + detents** — modal deslizante com "puxador" no topo, cantos arredondados, meio/cheio. **Onde:** modal de **assinatura**, **leitura de comunicado**, **detalhe da ocorrência** na Conferência.
4. **Segmented control refinado** — pill que desliza suave. **Onde:** Aparência (Conta), filtros (Avisos/Documentos/Conferência).
5. **List rows + swipe actions** — linha com chevron/valor à direita; **swipe** revela ação. **Onde:** **Conferência** (deslizar p/ "Conferir" verde / "Descartar"), e talvez Comunicados.
6. **Microinterações/motion** — transições de aba, spring nos toggles/switches, press states. **Onde:** geral (sutil, sem exagero).
7. **Large title → colapsa no scroll** (opcional, se valer no web) — título grande que vira título de topbar ao rolar. **Onde:** home, BH, páginas do gestor.

## 🚫 Guarda-corpos (NÃO negociáveis)
- **SF Symbols** → licença Apple, **só em apps Apple**. **Manter Tabler** (open source). NÃO importar ícones do kit.
- **Fonte SF Pro** → licença Apple. **Manter Poppins**.
- **Identidade FioPulse** intocada: verde `#1AA34F`, marca pulso/ECG, **dark padrão + light anti-lavado**, tokens aprovados.
- **NÃO virar "cara de iPhone".** Público = chão de fábrica, **maioria Android** — UI iOS-clone fica estranha. Pegar o *padrão/acabamento*, não o *chrome* do iOS. Nosso design neutro funciona nos dois — isso é vantagem, preservar.
- **Aditivo:** não quebrar nenhuma tela/fluxo existente. Acessibilidade mantida (aria, alvos, contraste).
- **Não tocar** em permissões/regras do gestor nem no `firestore.rules`.

## 🔄 Processo
1. **Avalie** cada padrão contra a tela REAL (o que já está bom, o que melhora, o esforço). Pode descartar o que não agregar — diz o porquê.
2. **Mocke o antes/depois** (na nossa linguagem, não iOS puro) — num HTML de showcase em `docs/mockups/` OU num preview, o que for mais rápido pra William ver.
3. **Apresenta pro William aprovar** (print/preview) — uma tela ou um lote por vez.
4. **Implementa só os aprovados**, aditivo, e manda print que eu confiro contra o combinado.

## Referências nossas
- Design system aprovado: `docs/mockups/colaborador-home-redesign.html` + `portal-redesign-showcase.html` + `gestor-portal-redesign-showcase.html`.
- Specs: `PORTAL-COLABORADOR-DESIGN.md`. Marca: `marca-fiopulse-lockup.html`.
- Auditoria de base: `AUDITORIA-home-colaborador.md`.

Sugestão de ordem (maior ganho/menor risco): **Conta** (lista inset) → **sheets** (assinatura/comunicado) → **Conferência** (swipe actions) → spacing/type geral → motion. Começa pela Conta que é a mais "lista iOS" e dá pra ver o ganho rápido. — Claude WKRADAR
