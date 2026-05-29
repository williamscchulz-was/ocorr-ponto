# Histórico de Decisões — Pipeline RH + App FioPulse

> **Propósito:** log cronológico de TODA mudança relevante (o que foi feito + por quê), pra nunca perder o histórico nem a direção do projeto.
>
> **Regra:** append no fim (ordem cronológica). Não reescrever entradas antigas. Toda mudança em pipeline / config WK / app / Firestore / agendamento entra aqui.
>
> Ver também: [`WKRADAR-PLAYBOOK.md`](./WKRADAR-PLAYBOOK.md) (como mexer no WK Radar).

---

## 2026-05-21/22 · Fundação do pipeline RH

- **Decisão: Firestore, não Firebase Storage.** William não quis habilitar Storage no projeto `ocorr-ponto`. Pipeline RH escreve direto no Firestore. (Diferente do pipeline Comercial, que usa Storage no projeto `fiobras-hub`.)
- **Decisão: CPF/PIS completos**, mas isolados em `banco-horas-saldos` (admin+RH only). Não vão pra `funcionarios` (legível por líder).
- **Decisão: 1x/dia às 08:00 BRT** (BH não muda em minutos). Export do CSV 07:45, pipeline 08:00.
- Pipeline criado em `C:\fiobras-pipeline-rh\`: `process-bh.mjs` (parser CSV Latin-1 agrupado), `upload-to-firestore.mjs`, `run-pipeline.mjs`. Service account gerado manualmente pelo William.
- **Regra de negócio:** saldos -04:00 uniformes = folgas concedidas a pagar (não bug).

## 2026-05-22 · Coleções e regras

- **5 coleções no Firestore:** `funcionarios`, `banco-horas-saldos` (PII), `banco-horas` (histórico mensal), `bancoHoras` (app legado camelCase), `pipeline-rh/{cur,hist}` (espelho cur/hist do Comercial, sem PII).
- **Sync de `funcionarios`:** upsert preservando `turno` (admin define manual). Title Case nos nomes. `ativo=false` quando CSV traz Demissão.
- **Flag `bhExempt`:** funcionário com isso = pulado pela inativação do pipeline (recém-cadastrados fora do BH). Caso real: 6 funcs (1230-1236) reativados.
- **Regra "preserva ativo=false manual":** se admin marca inativo e CSV não traz demissão, pipeline respeita (caso Denis f-778, que o ERP não trouxe rescisão).
- Firestore rules publicadas (admin/RH/líder por turno).

## 2026-05-26 · Integração app + coordenação entre Claudes

- **App rebrand Weave → FioPulse** (feito pelo Claude PC).
- **Consumer no app:** admin/RH leem `pipeline-rh/cur` direto; **líder lê `/bancoHoras`** filtrado por turno (rule). Por isso `bancoHoras` NÃO é órfã — é a fonte do líder. (Removi por engano e re-habilitei no mesmo dia.)
- **Bridge + Missions:** canal de comunicação via Git entre Claude WKRADAR e Claude PC (`claude-bridge/` + `docs/wkradar-missions/`).
- **Heartbeat:** pipeline grava report em `docs/wkradar-reports/` a cada run (cloud routine do PC monitora).

## 2026-05-27 · Cadastro enriquecido (D_Empregado)

- **Novo relatório D_Empregado** no WK Radar → CSV com 24 campos (turno, escala, idade, aniversário, sexo, estado civil, nome da mãe, etc.). Parser `process-empregado.mjs`.
- **Pipeline cruza BH × D_Empregado** (sanity check nome/cargo/admissão) e enriquece `funcionarios` (sem PII) + `banco-horas-saldos` (PII: nomeMae).
- **Turno agora vem do ERP** (não mais manual), mas preserva override do admin.
- **App: SETORES dinâmico** — derivado dos funcionários reais (ERP canônico), não mais lista hardcoded de 7 setores.

## 2026-05-28 · UI rica + rede de segurança + auto-incremental

- **UI FioPulse:** widget aniversariantes, perfil rico do funcionário, demografia, "demitido em DD/MM", card de BH do líder enriquecido (cargo/escala/idade). (Claude PC.)
- **Rede de segurança no heartbeat:** conta "ativos sem BH" (exclui aprendizes/demitidos). Hoje = 6 (recém-contratados não inscritos no módulo BH).
- **⭐ AUTO-INCREMENTAL RESOLVIDO:** dev do WK Radar confirmou que deixar `IdsFuncionarios=""` / `EmpregadosSelecionados=""` (vazio) = seleção dinâmica. Aplicado nos 2 configs. Prova: D_Empregado 135→136 (pegou 1 que a lista fixa excluía). **Lição:** editar config só com PowerShell (windows-1252 + CRLF); sed quebra (CRLF→LF).

## 2026-05-29 · Documentação permanente

- **Criados `WKRADAR-PLAYBOOK.md` + `HISTORICO-DECISOES.md`** (este arquivo) no repo. Diretriz na memória local do Claude WKRADAR: sempre consultar o playbook + registrar toda mudança aqui.

---

### ⏳ Pendências abertas

- **RH inscrever os 6 recém-contratados** (1230, 1231, 1233, 1234, 1235, 1236) no módulo Banco de Horas do WK Radar. Quando feito, o "ativos sem BH" no heartbeat cai. (Aprendizes 1137/1200/1201/1203 ficam fora de propósito — regime sem BH.)

---

*Append novas entradas abaixo desta linha, com data e o "o quê + porquê".*
