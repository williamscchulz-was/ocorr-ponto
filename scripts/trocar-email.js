// Troca o email de login de UM usuário (Firebase Auth + doc /users no
// Firestore), preservando o UID — histórico, permissões e chat ficam intactos.
// A senha NÃO muda.
//
// Setup (igual ao update-passwords.js):
//   1. Baixar a chave em
//      console.firebase.google.com > Project Settings > Service accounts
//   2. Salvar como service-account.json na RAIZ do projeto
//   3. npm install firebase-admin (se ainda não tiver)
//
// Uso:
//   node scripts/trocar-email.js email-atual@fiobras.com.br email-novo@fiobras.com.br
//
// Guardas: aborta se o email atual não existir, se o novo já estiver em uso,
// ou se os argumentos não parecerem emails. Não mexe em mais nada.

const admin = require("firebase-admin");
const path = require("path");

const pareceEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

(async () => {
  const [emailAtual, emailNovo] = process.argv.slice(2).map((s) => (s || "").trim().toLowerCase());

  if (!emailAtual || !emailNovo) {
    console.error("✗ Uso: node scripts/trocar-email.js <email-atual> <email-novo>");
    process.exit(1);
  }
  if (!pareceEmail(emailAtual) || !pareceEmail(emailNovo)) {
    console.error("✗ Um dos argumentos não parece um email válido:", emailAtual, "→", emailNovo);
    process.exit(1);
  }
  if (emailAtual === emailNovo) {
    console.error("✗ Email atual e novo são iguais — nada a fazer.");
    process.exit(1);
  }

  const saPath = path.join(__dirname, "..", "service-account.json");
  let serviceAccount;
  try {
    serviceAccount = require(saPath);
  } catch (e) {
    console.error("✗ service-account.json não encontrado em", saPath);
    console.error("  Baixe em https://console.firebase.google.com/project/ocorr-ponto/settings/serviceaccounts/adminsdk");
    console.error("  (botão 'Generate new private key'), renomeie pra service-account.json");
    console.error("  e coloque na raiz do projeto. Depois rode de novo.");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  // 1) O email atual precisa existir
  let user;
  try {
    user = await admin.auth().getUserByEmail(emailAtual);
  } catch (err) {
    console.error(`✗ Nenhum usuário com o email ${emailAtual} (${err.code || err.message})`);
    console.error("  Confira o email exato em: console.firebase.google.com > Authentication > Users");
    process.exit(1);
  }

  // 2) O email novo NÃO pode estar em uso
  try {
    await admin.auth().getUserByEmail(emailNovo);
    console.error(`✗ Já existe um usuário com o email ${emailNovo} — abortando.`);
    process.exit(1);
  } catch (err) {
    if (err.code !== "auth/user-not-found") {
      console.error("✗ Erro inesperado conferindo o email novo:", err.message);
      process.exit(1);
    }
  }

  console.log("\nUsuário encontrado:");
  console.log("  UID:  ", user.uid);
  console.log("  Nome: ", user.displayName || "(sem displayName)");
  console.log("  Troca:", emailAtual, "→", emailNovo);

  // 3) Troca no Auth (login)
  await admin.auth().updateUser(user.uid, { email: emailNovo });
  console.log("✓ Firebase Auth atualizado");

  // 4) Troca no doc /users/{uid} (o painel de Configurações exibe esse campo)
  try {
    await admin.firestore().collection("users").doc(user.uid).set({ email: emailNovo }, { merge: true });
    console.log("✓ Firestore /users atualizado");
  } catch (err) {
    console.error("! Auth trocado, mas falhou atualizar o doc /users:", err.message);
    console.error("  O app se auto-corrige no próximo login do usuário; sem ação necessária.");
  }

  console.log(`\nPronto. A pessoa entra agora com ${emailNovo} e a MESMA senha de antes.`);
  console.log("UID preservado: histórico, permissões e conversas continuam ligados.\n");
  process.exit(0);
})();
