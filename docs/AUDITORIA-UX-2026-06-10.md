# Auditoria UX/UI + Reconstrução de Design — FioPulse
**Data:** 10/jun/2026 · **Base:** v1.5.0 (build 143) · **Mockup par:** `docs/mockups/audit-ux.html`

> Método: leitura do código real (`app.js` 7.3k linhas, `styles.css` 3.5k, `firebase.js` 2.1k)
> + histórico das auditorias anteriores (24/05 e 29/05). Cada problema aponta o
> arquivo/padrão; cada melhoria tem representação visual no mockup par.

---

## 1–2. Relatório Executivo + Score

O app está **forte no visual** (minimalismo aplicado, paleta da marca, tokens,
microinterações) e **fraco em estados do sistema** (carregando/vazio/erro/offline
não são um sistema — são improvisos pontuais). A arquitetura front é o débito
estrutural: um arquivo gigante por camada.

| Categoria | Score | Nota |
|---|---|---|
| Identidade & consistência visual | **8.5** | Tokens, Poppins/Michroma, paleta Fiobras, sem emoji |
| Hierarquia & layout | **7.5** | Dashboard empilha 4 blocos antes da lista (conteúdo real começa baixo) |
| **Estados do sistema** | **5.5** | 5 empty-states diferentes; zero skeleton; zero offline; erro = toast |
| Microinterações & motion | **8.0** | Stagger, tato n