# Configurando o Firebase

Passo a passo pra ligar o sistema a um projeto Firebase de verdade.

## 1. Criar o projeto

1. Vá em <https://console.firebase.google.com> e faça login com a conta Google da empresa.
2. **Add project** → nome sugerido `ocorr-ponto` → desabilite Google Analytics (não precisa) → **Create**.
3. Aguarde criar e clique **Continue**.

## 2. Ativar Authentication

1. No menu lateral: **Build → Authentication → Get started**.
2. Aba **Sign-in method** → selecione **Email/Password** → habilite o primeiro toggle (não precisa do passwordless) → **Save**.
3. Aba **Users** → **Add user** → crie um usuário admin com email/senha que você vai lembrar. Ex.: `admin@empresa.local` / `<senha forte>`.
4. Anote o **UID** desse usuário (clique no ícone de copy depois de criado).

## 3. Criar o Firestore

1. Menu: **Build → Firestore Database → Create database**.
2. Selecione **Production mode** (mais seguro). **Next**.
3. Região: `southamerica-east1` (São Paulo) ou a mais próxima. **Enable**.

## 4. Aplicar as regras de segurança

1. Em Firestore, aba **Rules**.
2. Cole o conteúdo de [`firestore.rules`](firestore.rules).
3. **Publish**.

## 5. Criar o documento do admin no Firestore

Pra que o sistema reconheça o admin (e não só o Auth):

1. Em Firestore, aba **Data** → **Start collection**.
2. Collection ID: `users` → **Next**.
3. **Document ID:** cole o UID que você anotou no passo 2.4.
4. Campos:
   - `email` (string) — mesmo email do admin
   - `nome` (string) — ex: "Administrador"
   - `role` (string) — `admin`
   - `ativo` (boolean) — `true`
   - `criadoEm` (timestamp) — agora
5. **Save**.

> **Por que isso?** O Firebase Auth só sabe email/senha. O papel (`admin`/`rh`/`lider`) vive no Firestore. As [security rules](firestore.rules) leem `users/{uid}` para decidir quem pode o quê.

## 6. Pegar a config Web

1. Menu: **Project settings** (engrenagem no topo) → aba **General**.
2. Role até **Your apps** → ícone `</>` (Web).
3. Nickname: `Ocorrências Web` → não marque Hosting agora → **Register app**.
4. Copie o objeto `firebaseConfig`. Algo como:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "ocorr-ponto.firebaseapp.com",
     projectId: "ocorr-ponto",
     storageBucket: "ocorr-ponto.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```

## 7. Plugar a config no app

1. Na pasta `mockup/`, crie o arquivo `firebase.config.js` (esse arquivo está no `.gitignore`, não vai pro repo):

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "...",       // cole aqui
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

2. Recarregue a página. Se o app detectar a config, vai sair do modo demo (localStorage) e usar Firebase de verdade.

## 8. Cadastrar os outros usuários

Pra cada pessoa da equipe (RH, líderes), repita os passos 2.3 e 5:

- Crie no Auth (email + senha)
- Crie o doc em `users/{uid}` com `role` e `turno` (este último só pra líderes):

  | Email                    | role    | turno |
  |--------------------------|---------|-------|
  | admin@empresa.local      | admin   | —     |
  | rh1@empresa.local        | rh      | —     |
  | rh2@empresa.local        | rh      | —     |
  | lider.t1@empresa.local   | lider   | 1     |
  | lider.t2@empresa.local   | lider   | 2     |
  | lider.t3@empresa.local   | lider   | 3     |

## 9. Cadastrar funcionários

Pelo console Firebase ou (em breve) pela tela de Funcionários do próprio app, com schema de [SCHEMA.md](SCHEMA.md).

## 10. Hospedar (opcional, gratuito)

Quando quiser publicar pra acessar de qualquer lugar:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # Public dir: mockup
firebase deploy
```

A URL fica algo como `https://ocorr-ponto.web.app`.

---

## Resolução de problemas

- **"Missing or insufficient permissions"** ao listar ocorrências: garanta que o usuário tem doc em `users/{uid}` com `role` setado.
- **Líder não vê nada:** confira se os documentos de `ocorrencias` têm `funcionarioTurno` preenchido (não só `funcionarioId`).
- **Login falha:** verifique se o método Email/Password está habilitado no Auth.
