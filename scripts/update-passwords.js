// Atualiza senha de usuários Firebase Auth via Admin SDK.
//
// Setup:
//   1. Baixar service-account.json em
//      console.firebase.google.com > Project Settings > Service accounts
//   2. Colocar em ../service-account.json (raiz do projeto)
//   3. npm install firebase-admin
//
// Uso:
//   node scripts/update-passwords.js                    (usa lista DEFAULT)
//   node scripts/update-passwords.js email1 email2 ...  (lista custom)
//
// A senha vai pra todos os emails: NEW_PASSWORD (constante abaixo).

const admin = require("firebase-admin");
const path = require("path");

const NEW_PASSWORD = "12345678";

const DEFAULT_EMAILS = [
  "suyanne@fiobras.com.br",
  "adelir@fiobras.com.br",
  "alexander@fiobras.com.br",
  // adicione djoniffer aqui depois que recriar:
  // "djoniffer@fiobras.com.br",
];

(async () => {
  const saPath = path.join(__dirname, "..", "service-account.json");
  let serviceAccount;
  try {
    serviceAccount = require(saPath);
  } catch (e) {
    console.error("✗ service-account.json não encontrado em", saPath);
    console.error("  Baixe em https://console.firebase.google.com/project/ocorr-ponto/settings/serviceaccounts/adminsdk");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const emails = process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : DEFAULT_EMAILS;

  console.log(`\nVai resetar senha de ${emails.length} usuários para "${NEW_PASSWORD}":`);
  emails.forEach((e) => console.log("  -", e));
  console.log();

  const results = [];
  for (const email of emails) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(user.uid, { password: NEW_PASSWORD });
      console.log(`✓ ${email}: senha atualizada`);
      results.push({ email, ok: true });
    } catch (err) {
      console.error(`✗ ${email}: ${err.message}`);
      results.push({ email, ok: false, err: err.message });
    }
  }

  console.log("\nResumo:");
  console.table(results);

  process.exit(0);
})();
