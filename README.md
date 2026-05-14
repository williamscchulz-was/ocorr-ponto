# Ocorrências do Ponto

Sistema web/PWA pra registrar e conferir ocorrências de ponto (atrasos, faltas, esquecimento de crachá etc.). Substitui o fluxo em planilha Excel por algo desktop+mobile com login e papéis.

## Como funciona

- **RH** registra a ocorrência: data, funcionário, tipo, horário e observação opcional.
- **Líder do turno** confere: escolhe a ação (Banco de Horas / Descontar / Atestado Médico). A data da conferência é preenchida automaticamente.
- **Observação** fica editável por RH e Líder, com histórico de quem mexeu.
- **Líder só vê** ocorrências de funcionários do próprio turno. RH e Admin veem tudo.

## Stack

- **Frontend**: HTML + CSS + JavaScript vanilla. Sem build, sem framework.
- **PWA**: instalável no celular, funciona offline (cache via Service Worker).
- **Backend**: [Firebase](https://firebase.google.com) — Authentication (login) e Firestore (banco). Veja [docs/SETUP_FIREBASE.md](docs/SETUP_FIREBASE.md).
- **Hospedagem**: Firebase Hosting (gratuito, recomendado) ou qualquer host estático.

## Rodando localmente

Requer Python 3 (já vem no Windows e Mac/Linux modernos).

```bash
cd mockup
python -m http.server 9876
```

Abra <http://localhost:9876>.

Sem Firebase configurado, o app roda em **modo demo** (dados em `localStorage` do navegador).

### Usuários de demonstração

| Usuário | Senha | Papel |
|---------|-------|-------|
| `admin` | `admin` | Administrador |
| `rh1`   | `rh1`   | RH |
| `rh2`   | `rh2`   | RH |
| `lider1` | `lider1` | Líder 1º Turno |
| `lider2` | `lider2` | Líder 2º Turno |
| `lider3` | `lider3` | Líder 3º Turno |

## Estrutura

```
ocorr-ponto/
├── mockup/                  # App (HTML/CSS/JS vanilla)
│   ├── index.html
│   ├── styles.css
│   ├── data.js              # Seed + storage helpers
│   ├── app.js               # UI e fluxo
│   ├── manifest.webmanifest # PWA
│   └── sw.js                # Service worker
├── docs/
│   ├── SCHEMA.md            # Modelo de dados Firestore
│   ├── SETUP_FIREBASE.md    # Passo-a-passo de configuração
│   └── firestore.rules      # Regras de segurança
└── README.md
```

## Próximos passos

- [x] Mockup funcional com localStorage
- [ ] Integração com Firebase Auth e Firestore
- [ ] Notificação ao líder quando RH cria ocorrência
- [ ] Exportação para Excel (compatível com o template atual)
- [ ] Cadastro de funcionários via UI
- [ ] Relatórios mensais por funcionário/setor

## Licença

MIT. Veja [LICENSE](LICENSE).
