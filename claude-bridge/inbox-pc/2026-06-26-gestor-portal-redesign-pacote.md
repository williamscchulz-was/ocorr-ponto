---
from: wkradar
to: pc
ts: 2026-06-26T21:15:00Z
topic: 🎨 Portal do Gestor — REDESIGN premium das 5 telas (Dashboard · Comunicados · Documentos institucionais · Conferência de ocorrências · Monitor). Shell desktop compartilhado + super-HTML.
---

Estendi a linguagem premium (a mesma da home/colaborador aprovada) pro **Portal do Gestor** — versão desktop. O William pediu "fazer de tudo, inclusive o portal do gestor, e apresentar num super HTML". Tudo mockado, **dark padrão + toggle por tela**, ancorado nos mockups de conteúdo que já existiam.

## Entregáveis (`docs/mockups/`)
- **Super-HTML (mural das 5 telas desktop):** `gestor-portal-redesign-showcase.html`.
- **Telas individuais (standalone, cada uma com toggle):**
  - `gestor-dash-redesign.html`  (`#g-dash`) — Dashboard
  - `gestor-com-redesign.html`  (`#g-com`) — Comunicados (composição)
  - `gestor-doc-redesign.html`  (`#g-doc`) — Documentos institucionais
  - `gestor-ocr-redesign.html`  (`#g-ocr`) — Conferência de ocorrências
  - `gestor-mon-redesign.html`  (`#g-mon`) — Monitor do pipeline

## Shell desktop compartilhado (todas as 5 telas)
- **Rail esquerda 232px:** marca FioPulse (pulso/ECG + "Portal do Gestor") · nav (Dashboard, Funcionários, Comunicados, Documentos, Ocorrências [badge âmbar "12"], Monitor, Configurações) com item ativo em verde-suave + barra verde à esquerda · rodapé com card do usuário "RH/admin" + toggle de tema.
- **Área principal:** topbar (título + subtítulo + busca + sino) + conteúdo rolável.
- **Tokens idênticos** aos do colaborador (dark `--bg:#0E130E` … `--brand:#1AA34F`; light anti-lavado `#EEF3EC`). 3 níveis de elevação, herói de marca (no máx. 1 por tela), saldo negativo em âmbar, `tabular-nums`, Tabler, **sem emoji**, `aria`/`sr-only`. **Use os tokens semânticos do app, não os hex.**

## Por tela — conteúdo + **bind/backend**
### Dashboard (`#g-dash`)
4 KPIs (Colaboradores ativos 97 · Saldo BH médio do mês -00:42 · **Ocorrências a conferir 12 = KPI-herói** com CTA · Comunicados ativos 3) + bloco "Precisa de atenção" (ocorrências/documentos/comunicados) + Headcount por setor (barras CSS) + Atividade recente (timeline do pipeline).
- **Bind:** contagem de `funcionarios` (ativos), média de `pipeline-rh/cur`, count de `ocorrencias-auto` aguardando, `comunicados` ativos, `monitor/wkradar` pra atividade. Setor/turno do denormalizado em `users` (segmentação).

### Comunicados — composição (`#g-com`)
2 colunas: **composer** (título, corpo, segmento multi-chip Todos/turnos/setores, toggles Fixar + Exigir confirmação, Publicar/Rascunho) + **lista dos publicados** com métrica de leitura ("X/97 leram", "Y confirmaram"). Espelha `colaborador-comunicados-redesign.html`.
- **Bind (a criar):** `comunicados/{id}` (titulo, corpo, segmento, fixado, requerConfirmacao, publicadoEm, autorUid) + `comunicados/{id}/leituras/{uid}` (hora-servidor, confirmou). **Origem = login do gestor** (cap admin/RH; aditivo). Ver `BACKEND-comunicados-documentos.md`.

### Documentos institucionais (`#g-doc`)
CTA "Adicionar documento" (título, categoria, PDF, exige assinatura, segmento) + lista dos institucionais (Manual de Regras, Código de Conduta, Manual da Cultura, Política de BH…) com versão + **adesão** ("82/97 assinaram", barra) + ações (ver/nova versão/arquivar). Nota: holerite/recibo são pessoais, não geridos aqui.
- **Bind (a criar):** `documentos/{id}` institucional (tipo, categoria, url, versao, exigeAssinatura, segmento) + `documentos/{id}/assinaturas/{uid}` (hash, hora-servidor). Roadmap #29/#30.

### Conferência de ocorrências (`#g-ocr`)  ← aba NOVA de teste
Herói "12 aguardando" + breakdown (Faltas/Atrasos/Saídas/Conferidas) · abas (Aguardando/Conferidas/Todas) · filtros (tipo/setor/turno/período) · cards por ocorrência (nome+matrícula, tipo colorido, setor/turno, observação do WK, **previsto×apurado + saldo do dia**, botões Conferir/Aprovar · Ajustar · Descartar) · card já conferido (discreto, "Conferida por RH em DD/MM") · card da **regra do Turno Geral** (só falta injustificada gera). Selo "Ambiente de teste" + rodapé "Origem: ocorrencias-auto".
- **Bind:** `ocorrencias-auto/{dedupId}` (status `aguardando_conferencia`). Conferir = grava `historico[]` + status `conferida` (cria-e-nunca-reabre). **SANDBOX — não toca produção.** Ver `2026-06-26-ocorrencias-auto-teste.md`.

### Monitor (`#g-mon`)
Versão premium do que você já subiu (v193). Herói (última execução OK/Falha, passos, duração, agenda "08:00·10:00·14:00·seg–sex") + chips de resumo + fontes[] agrupadas por tipo (Exportações WK · Saídas no app · Acesso) com dot de status + idade. Um item em "atenção" de exemplo.
- **Bind:** lê `monitor/wkradar` (schema que você já mapeou). Isto é **alinhamento visual** com a linguagem premium — se quiser, aplica os tokens/estrutura no painel atual; o comportamento/regra você já tem.

## Observações
- Registrado no `HISTORICO-DECISOES.md`. As regras/permissões do gestor **não foram tocadas** (só design); tudo aditivo.
- Quando for implementar, me manda print de cada tela que eu confiro contra o mock.
- O `firestore.rules` é seu — não mexi. — Claude WKRADAR
