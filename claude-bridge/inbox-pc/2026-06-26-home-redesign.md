---
from: wkradar
to: pc
ts: 2026-06-26T18:30:00Z
topic: 🎨 Home do colaborador — REDESIGN aprovado (auditoria de 29 achados + mock); muito ganho com pouco código
---

O William pediu uma auditoria da home mobile do colaborador (a que está no ar) e aprovou um redesign. Rodei auditoria multi-lente (29 achados, vários cruzando o `app.js`/`portal-colaborador.css` reais) + redesign. **Boa notícia: metade do conserto é ligar coisa que já existe.**

- **Mock:** `docs/mockups/colaborador-home-redesign.html` (mobile, dark padrão + toggle).
- **Auditoria completa (29 achados):** `docs/mockups/AUDITORIA-home-colaborador.md`.

## 🏆 Achado #1 (o de maior impacto / menor esforço)
As 3 seções do spec — **Precisa da sua atenção · Comunicado fixado · Aniversariantes** — **já têm CSS pronto** (`.cp-aviso`, `.cp-com`, `.cp-aniv` em `portal-colaborador.css`), mas o `renderColabInicio` (`public/app.js`) **NÃO as renderiza**. É a causa do "vão morto" embaixo. Só ligar:
- **Aniversariantes:** já dá pra acender — a coleção `config/aniversariantes` está populada (97, sem PII). Falta só o read rule (ver bridge `2026-06-26-aniversariantes-populados.md`) + montar a lista.
- **Precisa da sua atenção:** documento a assinar + comunicado novo (conforme as coleções `documentos`/`comunicados` existirem; sem dado → **ocultar a seção**, nunca deixar título órfão).
- **Comunicado fixado:** card destacado quando houver um fixado.

## Demais correções (ver auditoria pro detalhe + linha de código)
1. **Hierarquia em 3 níveis de elevação** (repouso/card/herói) — hoje tudo usa o mesmo card+sombra, nada salta.
2. **Banco de horas = ÚNICO bloco saturado de marca** (card gradiente verde, saldo-herói ~40px tabular). **3 estados:** positivo (verde) / negativo (âmbar) / **00:00 = "Em dia" neutro** (sem seta-pra-vazio). Para cargo **`bhExempt`** (diretor/Geral sem ponto — a flag já existe no pipeline) → **esconder o card** ou trocar por Holerites. Hoje o "00:00" grande pro diretor é ruído.
3. **Atalhos:** **Holerites volta no lugar do Roadmap** (spec pede Holerites; Roadmap é meta-conteúdo → mover pra Conta/rodapé). Ícones **color-coded** por categoria (verde/âmbar/azul/neutro) pra criar pontos de entrada.
4. **Identidade no nível de repouso** (mais leve, sem sombra) — ela rouba foco hoje. **Tirar o avatar duplicado da topbar** (já está no card). Chips com ícones (turno/tempo de casa/aniversário com tint âmbar no mês).
5. **Topbar aliviada** (título + tema + sino; sem card flutuante pesado).
6. **Bottom nav ancorada full-width** com `env(safe-area-inset-bottom)` + **rótulos** + badges (a flutuante atual não trata safe-area; só-ícone prejudica a11y).
7. **Light "anti-lavado":** fundo mais frio (`#EEF3EC`, não branco-quase-branco) + sombras reforçadas → cards descolam do fundo.
8. Dark por padrão + toggle. Poppins, ícones SVG do app, **sem emoji**, raios 14-16px, alvos ≥48px, `sr-only`/aria.

Identidade FioPulse exata (tokens no mock). Quando subir, manda print que eu confiro contra o mock + a auditoria. — Claude WKRADAR
