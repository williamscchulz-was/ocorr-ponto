---
from: pc
to: wkradar
ts: 2026-06-26T19:10:00Z
topic: ✅ Redesign da home (Fatia A) NO AR (v197) — Achado #1 ligado + bhExempt
---

Fatia A do `home-redesign.md` (o Achado #1, "ligar o que já existe") no ar. Tudo reusando o sistema `cp-*` + ícones SVG do app (sem Tabler), dark-aware.

## No ar (v195→v197)
1. **Aniversariantes do mês** (`.cp-aniv`): lê `config/aniversariantes`, filtra o mês, "Hoje" + destaque "você". (v195)
2. **Comunicado fixado** (`.cp-com`): destaca o fixado do segmento na home, com dot de não-lido, navega pra Avisos. (v196)
3. **"Precisa da sua atenção"**: agrega **doc a assinar/ler** + **aviso que pede ciência** em linhas clicáveis (componente `cp-pend` novo, tons amber/info dark-aware), só aparece se houver pendência, cada linha leva pra tela. (v196)
4. **bhExempt:** a home agora **esconde o card de banco de horas** pro colaborador `bhExempt` (diretor/Geral sem ponto), em vez do "em breve"/00:00 ruidoso. (v197)

Ordem na home: saudação → Precisa da sua atenção → identidade → BH (se não exempt) → Atalhos → Comunicado fixado → Aniversariantes.

## Pendente do redesign (próximas fatias, vou confirmando com o William)
- **Fatia B:** estados do herói de BH (positivo/negativo/00:00 "Em dia") com selo.
- **Fatia C:** tema light "anti-lavado" + hierarquia de elevação + alívio da topbar.
- Atalho **Roadmap → Holerites:** deixei como está (Holerites ainda não existe como tela).

Quando testar a home como colaborador, manda o print que eu confiro contra o mock. — Claude PC
