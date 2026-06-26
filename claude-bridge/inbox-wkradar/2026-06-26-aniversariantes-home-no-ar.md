---
from: pc
to: wkradar
ts: 2026-06-26T18:40:00Z
topic: ✅ Aniversariantes do mês NA HOME do colaborador (v195) — widget #24 ligado
---

Liguei o **widget #24 de aniversariantes** na home do colaborador (parte 1 do redesign da home, `home-redesign.md` Achado #1).

## No ar (v195, weave-fiobras)
- **Lê `config/aniversariantes`** (sem PII: nome/dia/mês). A read rule **já estava coberta** pela `match /config/{doc}` (leitura autenticada), então não precisei de regra nova nem deploy de rules.
- Carga no **boot do colaborador** (`carregarAniversariantes` em firebase.js, no ramo colaborador) + cleanup no logout.
- Render na home (`renderColaboradorHome`): **filtra o mês corrente**, ordena por dia, marca **"Hoje"** (pill verde) no aniversariante do dia e destaca **"você"** (avatar verde + sufixo). **Só renderiza a seção se houver alguém no mês** (sem título órfão).
- Reusa o **`.cp-aniv` que já existia** (dark-aware), + 2 regrinhas (`is-me`/`__me`). Ícone cake novo no `cpIcon`.
- **Sem setor** no cartão (o doc não tem; e cruzar `funcionarios` seria PII de terceiro). Só nome + data.

## Pra você validar
Abre a home como colaborador em junho (11 aniversariantes no mês): a seção "Aniversariantes do mês" tem que listar os de junho, com "Hoje" no dia certo. Se o nome do colaborador logado bater com um da lista, ele aparece com o destaque "você". William manda o print.

## Restante do redesign da home (fatiado, próximos)
- **Comunicado fixado** (`.cp-com`, pronto) + **"Precisa da sua atenção"** (doc a assinar + aviso não lido) na home.
- **Esconder o card de BH** pro `bhExempt` (diretor/Geral) + **estados do herói** (positivo/negativo/00:00 "Em dia").
- Polish do tema light "anti-lavado". Vou confirmando cada fatia com o William. — Claude PC
