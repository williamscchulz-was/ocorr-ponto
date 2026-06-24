---
from: wkradar
to: pc
ts: 2026-06-24
tipo: missão (app FioPulse · roadmap do portal)
status: pending
requer: MOCKUP (é visual, in-app) + aprovação do William
---

# Missão — Roadmap do Portal mais robusto (incluir Alfa / Beta / Live)

Pedido do William: o **Roadmap do Portal** (`public/roadmap.js` + `renderColabRoadmap` / item #41) precisa ficar **bem mais completo** — hoje as fases cobrem só a **construção** (Fase 0 → Fase 1/MVP → Fase 2 → Futuro). Falta o **ciclo de lançamento**: **Alfa teste → Beta teste → Live (produção)**.

Como você é dono do `roadmap.js` + do renderizador (e deploya), a missão é tua. Abaixo vai uma **proposta pronta** (fases + itens sugeridos) pra você refinar/desenhar — não precisa partir do zero.

## 1. Adicionar 3 fases de lançamento (em `ROADMAP.fases`)

Sugestão de ordem: depois da Fase 1 (MVP) e antes/ao lado da Fase 2. Você e o William decidem a posição exata.

```js
{ id: "alfa", nome: "Alfa — teste interno",  subtitulo: "RH + TI validam o portal com contas reais, em ambiente controlado" },
{ id: "beta", nome: "Beta — piloto",         subtitulo: "Rollout para 1–2 setores/turnos; treinamento e feedback" },
{ id: "live", nome: "Live — produção",       subtitulo: "Abertura para todos os colaboradores + suporte e monitoramento" },
```

## 2. Itens sugeridos por fase (mesma forma dos itens atuais)

**Alfa (teste interno):**
- **Smoke test do fluxo crítico** — login por CPF → troca obrigatória de senha → ver só os próprios dados (SELF) → consultas (BH, ocorrências, comunicados, documentos). Critério: nenhum erro no caminho feliz.
- **Checklist de segurança SELF** — confirmar `permission-denied` ao tentar ler dado de terceiro; nenhum CPF/PII vazando; rules SELF batendo no emulator + produção.
- **Validação da provisão de logins** — conferir que o backfill do pipeline (90 colaboradores criados; diretoria/invalidez/aprendiz fora) está coerente com a base. *(Já feito pelo WKRADAR — só validar na tela.)*
- **Coleta de bugs do grupo alfa** — canal e tratativa antes de abrir o beta.

**Beta (piloto):**
- **Selecionar grupo piloto** (ex.: 1 turno ou 1 setor) e comunicar.
- **Material de 1º acesso** — como entrar (CPF + senha = nascimento `DDMMAAAA`) e a troca obrigatória.
- **Treinamento curto + canal de feedback** do piloto.
- **Métricas de adoção** — % que logou, % que concluiu a troca de senha, bugs reportados.
- **Critério de saída p/ Live** — taxa de login OK, zero bug crítico aberto.

**Live (produção):**
- **Comunicação oficial de lançamento** (comunicado no próprio portal + mural/WhatsApp).
- **FAQ / suporte do 1º acesso** (esqueci a senha → reset administrativo do RH).
- **Monitoramento contínuo** — logins ativos, erros, resets, inativações automáticas do pipeline.
- **Política de retenção/inativação** rodando (ex-funcionário perde acesso automático). *(Pipeline já faz.)*

## 3. Outras melhorias de robustez (sugestões)
- **Barra de progresso por fase + global** já existe no item #41 — garantir que as novas fases entrem nela.
- Talvez um selo de **"maturidade"** no item (alfa/beta/live) além da fase, se quiser cruzar as duas dimensões.
- Cada item novo com os mesmos campos (prioridade, complexidade, status, descricao, objetivo, dependencias, criteriosAceite) pra renderizar igual.

## Entrega
1. **Mockup** do roadmap atualizado (com Alfa/Beta/Live) → William aprova.
2. Implementa em `roadmap.js` + renderer, deploya (bump `?v=`/cache + changelog).
3. Sem dependência de pipeline — o backfill/inativação de logins já está pronto do meu lado. Dúvida de dado → bridge.

— Claude WKRADAR (proposta a pedido do William)
