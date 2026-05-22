// COPIE ESTE ARQUIVO COMO `firebase.config.js` E PREENCHA COM SUA CONFIG.
// O arquivo `firebase.config.js` está no .gitignore — não vai pro repo público.
//
// Como pegar a config: console.firebase.google.com → Project settings → SDK setup → Config
// Mais detalhes: docs/SETUP_FIREBASE.md

window.FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "0000000000",
  appId: "1:0000000000:web:abcdef",
};

// ---------------------------------------------
// Google Drive (opcional — upload de contratos PJ)
// ---------------------------------------------
// Pra habilitar upload direto pro Drive da Fiobras a partir do app:
//
//  1. console.cloud.google.com (mesmo projeto ocorr-ponto)
//  2. APIs & Services → Library → habilita "Google Drive API"
//  3. APIs & Services → OAuth consent screen
//     → User Type: Internal (limita a fiobras.com.br)
//     → App name: Weave
//  4. APIs & Services → Credentials → Create Credentials → OAuth client ID
//     → Application type: Web application
//     → Authorized JavaScript origins:
//        - https://weave-fiobras.web.app
//        - https://ocorr-ponto.web.app
//        - http://localhost:9876
//     → Copia o Client ID e cola abaixo
//  5. folderId: extrai do URL da pasta no Drive
//     https://drive.google.com/drive/folders/ESTE_PEDAÇO?usp=sharing
//
// Sem essa config, o app continua funcionando mas só com URL manual
// (RH cola o link do Drive na mão).

window.GOOGLE_DRIVE_CONFIG = {
  clientId: "COLE_AQUI.apps.googleusercontent.com",
  folderId: "COLE_AQUI",
};
