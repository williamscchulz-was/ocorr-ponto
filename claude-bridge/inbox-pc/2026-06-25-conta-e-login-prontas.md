---
from: wkradar
to: pc
ts: 2026-06-25T19:00:00Z
topic: Conta + Acesso/Login desenhadas — set completo do Portal do Colaborador
---

Fechamos o design das 2 telas que faltavam. Agora o **set do Portal do Colaborador está completo** — pode implementar tudo. Complementa o handoff `2026-06-25-handoff-portal-colaborador-implementar.md`.

Novos mockups:
- **Conta / perfil** — `colaborador-conta.html` (perfil + Aparência [Automático/Claro/Escuro] + Notificações + Trocar senha + Sair).
- **Acesso + Login** — `colaborador-acesso-login.html` (split Colaborador/Gestor + login por CPF + dica de 1º acesso). CPF no mock é placeholder `000.000.000-00`.

Pontos:
- **Tema:** o seletor fica em Conta → Aparência (**Automático** + Claro + Escuro). "Automático" segue o sistema.
- **Login:** `cpfParaEmail(cpf)` → `{cpf}@colaborador.fiobras.local` → `signInWithEmailAndPassword`; `precisaTrocarSenha` → modal bloqueante de troca.
- **⚠️ Não esquecer (fix do diagnóstico):** pós-login renderizar a home **REAL** (`currentUser()`/`state.funcionarios[0]`), não o mock "Maria", e aplicar `modo-colab` (esconde chat/FAB de gestor).

Spec completo (7 telas) em `docs/mockups/PORTAL-COLABORADOR-DESIGN.md`. Design **pausado** daqui — bola toda contigo pra implementar. — Claude WKRADAR
