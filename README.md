# FioPulse · Fiobras

> O batimento do GH Fiobras. Controle de ponto, banco de horas e PJs em tempo real.

PWA interno da Fiobras pra substituir a planilha Excel de controle de ponto. GH (Gestão de Pessoas) registra ocorrências, líderes conferem, todo mundo vê o que importa — sem retrabalho, com colaboração em tempo real.

🔗 **Produção:** [gh.fiobras.com.br](https://gh.fiobras.com.br) · [weave-fiobras.web.app](https://weave-fiobras.web.app)

## Funcionalidades

- **Ocorrências de ponto** — atrasos, faltas, esquecimento de crachá, com fluxo de conferência por líder de turno
- **Banco de horas** — saldo por funcionário, importado automaticamente do pipeline RH (WKRADAR)
- **Funcionários** — base sincronizada do pipeline, filtros por turno/status, edição de setor
- **Controle de PJs** — prestadores de serviço com IPCA proporcional/anual, férias, contratos no Drive, OCR via Google Drive
- **Tempo real** — presença minimalista (quem está online) + edição colaborativa em modais via Firestore
- **Auth** — Firebase Authentication com sessão por aba + idle timeout, redefinição de senha em PT-BR

## Stack

- **Frontend:** HTML + CSS + JS vanilla. Sem build, sem framework.
- **PWA:** instalável no celular, Service Worker com network-first pra HTML.
- **Backend:** [Firebase](https://firebase.google.com) — Auth + Firestore + Storage + Hosting.
- **Pipeline RH:** WKRADAR (ETL Git-async) gera JSONs no Storage, app consome automaticamente.
- **Integrações:** Google Drive API pra contratos (upload + OCR via Google Doc conversion).

## Estrutura do repo

```
ocorr-ponto/
├── public/                       # App deployado em Firebase Hosting
│   ├── index.html
│   ├── app.js                    # UI, fluxo, lógica de negócio
│   ├── data.js                   # Seed, constantes (tipos, ações, periodicidades)
│   ├── firebase.js               # Wrapper Firebase (auth, firestore, presence)
│   ├── google-drive.js           # OAuth + upload + OCR de contratos
│   ├── styles.css
│   ├── sw.js                     # Service Worker (network-first pra HTML)
│   ├── manifest.webmanifest
│   ├── firebase.config.example.js
│   └── (icons, logos)
├── docs/
│   ├── SCHEMA.md                 # Modelo Firestore
│   ├── SETUP_FIREBASE.md         # Setup passo-a-passo
│   ├── AUDITORIA-2026-05-24.md   # Auditoria completa (P0/P1/P2)
│   ├── firestore.rules           # Regras de segurança
│   ├── firestore.indexes.json    # Índices compostos
│   ├── wkradar-missions/         # Pipeline assíncrono (ETL)
│   │   ├── README.md             # Protocolo de comunicação
│   │   ├── pending/              # Missões aguardando execução
│   │   └── done/                 # Missões concluídas
│   └── wkradar-reports/          # Monitor reports do /loop
├── redirect-stub/                # Site secundário (redireciona)
├── scripts/                      # Utilitários locais (não deploy)
├── firebase.json
├── .firebaserc
└── README.md
```

## Rodando localmente

Requer Python 3.

```bash
cd public
python -m http.server 9876
```

Abra <http://localhost:9876>.

Sem `firebase.config.js` configurado, o app roda em **modo demo** (dados em `localStorage`, sem persistência real).

### Setup completo do Firebase

Veja [docs/SETUP_FIREBASE.md](docs/SETUP_FIREBASE.md).

## Deploy

```bash
firebase deploy --only hosting:weave
```

O hosting target `weave` está configurado no `.firebaserc` apontando pro site `weave-fiobras`.

## Papéis e permissões

| Papel | Acesso |
|-------|--------|
| **Admin** | Tudo — incluindo aba Dados (zerar base), gerência de usuários, todas as configurações |
| **GH** | Registra ocorrências, gerencia PJs, edita funcionários, configura tipos/ações |
| **Líder de Turno** | Vê apenas ocorrências e banco de horas do próprio turno; confere ocorrências |
| **Supervisor** | Vê e confere apenas os funcionários atribuídos a ele |

## Status

- [x] Mockup funcional + Firebase Auth + Firestore
- [x] Banco de horas via import XLSX (legado)
- [x] Controle PJ com IPCA, férias, contratos no Drive, OCR
- [x] Presença + edição colaborativa em tempo real
- [x] Rebrand Weave → FioPulse
- [x] Auditoria + fixes P0 (XSS, defer, PII) e P1 (dead code, polish UX, CNPJ)
- [x] Chat interno — conversas, reações, confirmação de leitura, marcar todas como lidas
- [x] Painel de permissões editável (matriz papéis × acessos, na UI e nas regras do Firestore)
- [x] OCR de contrato repaginado (cena de scan + cartão de revisão) + extração mais robusta
- [x] Splash com logo "se desenhando" + auto-update (o PWA se atualiza sozinho)
- [x] Custom domain `gh.fiobras.com.br` no ar
- [ ] Pipeline WKRADAR consumindo JSONs do Storage (em curso)
- [ ] Modal de confirmação destrutiva (substituir `confirm()` nativo)
- [ ] CSP header no `firebase.json`

## Licença

MIT. Veja [LICENSE](LICENSE).
