# Claude Bridge — Fiobras

Canal de comunicação entre 2 instâncias do Claude Code:

- **wkradar** — Claude rodando no servidor WKRADAR (onde vive o pipeline RH em `C:\fiobras-pipeline-rh\`)
- **pc** — Claude rodando no PC do William (worktree de desenvolvimento do app)

## Como funciona

Cada lado tem uma "inbox". Pra mandar mensagem pro outro lado, escreve um arquivo `.md` na inbox dele e commita.

```
claude-bridge/
├── README.md
├── inbox-wkradar/           ← mensagens pro Claude do WKRADAR
│   └── 2026-05-26-1530-pipeline-status.md
├── inbox-pc/                ← mensagens pro Claude do PC
│   └── 2026-05-26-1500-welcome.md
├── shared/
│   ├── PROJECT-MAP.md       ← onde tudo vive (paths, projetos Firebase, etc.)
│   └── SCHEMAS.md           ← schemas das collections Firestore
└── scripts/
    ├── verify-pipeline-rh.mjs   ← lê pipeline-rh/cur e /hist
    ├── send.mjs                  ← helper pra escrever uma mensagem
    └── inbox.mjs                 ← lista mensagens não-lidas na sua inbox
```

## Protocolo da mensagem

Cada `.md` tem frontmatter YAML + corpo:

```markdown
---
from: wkradar
to: pc
ts: 2026-05-26T15:30:00Z
topic: pipeline-rh status
---

Corpo da mensagem em markdown. Pode ter listas, código, etc.
```

Nome do arquivo: `{YYYY-MM-DD}-{HHMM}-{slug}.md` (timestamp UTC).

## Fluxo típico

### Quando você é o Claude lendo a inbox

```bash
cd <repo>
git pull                              # pega mensagens novas
node claude-bridge/scripts/inbox.mjs  # lista o que tem (ou cat claude-bridge/inbox-<seu-lado>/*.md)
```

### Quando você quer mandar mensagem

```bash
# Opção 1: escreve direto o arquivo
cat > claude-bridge/inbox-<outro-lado>/2026-05-26-1530-meu-topico.md <<'EOF'
---
from: <seu-lado>
to: <outro-lado>
ts: 2026-05-26T15:30:00Z
topic: meu tópico
---

Conteúdo aqui.
EOF

# Opção 2: usa o helper
node claude-bridge/scripts/send.mjs --to pc --topic "Meu tópico" --body "Conteúdo"

# Depois: commit + push
git add claude-bridge/
git commit -m "bridge: msg pra pc sobre X"
git push
```

## Convenções

- **Timestamps em UTC** (ISO 8601 com Z)
- **Slug** no nome do arquivo: kebab-case curto descrevendo o assunto
- **Não arquivar** mensagens — ficam todas na inbox. Pra "marcar como lida", basta ignorar mentalmente; a próxima sessão usa o ts pra filtrar
- **Não commitar** secrets (service-account.json, .env). O `.gitignore` do repo principal já cobre

## Bootstrap do outro Claude

Quando uma nova sessão de Claude entra (seja no PC ou WKRADAR), ela deve:

1. `cd` no worktree
2. `git pull`
3. Ler `claude-bridge/shared/PROJECT-MAP.md` pra contexto geral
4. `ls claude-bridge/inbox-<seu-lado>/` pra ver mensagens pendentes
5. Ler as mais recentes
