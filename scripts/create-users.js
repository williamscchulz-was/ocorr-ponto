// Cria usuários Firebase Auth + Firestore doc /users/{uid} via Admin SDK.
//
// Idempotente: se o user já existe (mesmo email), apenas atualiza
// senha e o doc Firestore. Útil pra rodar quando faltam usuários
// ou pra "consertar" docs que ficaram bugados.
//
// Setup:
//   service-account.json na raiz (gitignored)
//   npm install firebase-admin
//
// Uso:
//   node scripts/create-users.js

const admin = require("firebase-admin");
const path = require("path");

const DEFAULT_PASSWORD = "12345678";

const USERS = [
  {
    email: "djoniffer@fiobras.com.br",
    nome: "Djoniffer Krieck Gonçalves",
    role: "lider",
    turno: 3,
  },
];

(async () => {
  const saPath = path.join(__dirname, "..", "service-account.json");
  let serviceAccount;
  try {
    serviceAccount = require(saPath);
  } catch (e) {
    console.error("✗ service-account.json não encontrado em", saPath);
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const auth = admin.auth();
  const db = admin.firestore();

  console.log(`\nVai processar ${USERS.length} usuário(s):\n`);

  const results = [];
  for (const u of USERS) {
    try {
      // Tenta encontrar; se não existir, cria.
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(u.email);
        console.log(`• ${u.email} já existia (uid: ${userRecord.uid.slice(0, 8)}...) — atualizando senha`);
        await auth.updateUser(userRecord.uid, { password: DEFAULT_PASSWORD });
      } catch (e) {
        if (e.code === "auth/user-not-found") {
          userRecord = await auth.createUser({
            email: u.email,
            password: DEFAULT_PASSWORD,
            displayName: u.nome,
            emailVerified: false,
          });
          console.log(`✓ ${u.email} criado (uid: ${userRecord.uid.slice(0, 8)}...)`);
        } else {
          throw e;
        }
      }

      // Cria/atualiza doc no Firestore
      const docData = {
        email: u.email,
        nome: u.nome,
        role: u.role,
        ativo: true,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (u.role === "lider") {
        docData.turno = u.turno === "geral" ? "geral" : Number(u.turno);
      }

      // Se não tem criadoEm ainda, adiciona
      const ref = db.collection("users").doc(userRecord.uid);
      const snap = await ref.get();
      if (!snap.exists) {
        docData.criadoEm = admin.firestore.FieldValue.serverTimestamp();
        docData.criadoPor = "script";
      }
      await ref.set(docData, { merge: true });
      console.log(`  → doc Firestore /users/${userRecord.uid.slice(0, 8)}... ${snap.exists ? "atualizado" : "criado"}`);

      results.push({ email: u.email, ok: true, uid: userRecord.uid });
    } catch (err) {
      console.error(`✗ ${u.email}: ${err.message}`);
      results.push({ email: u.email, ok: false, err: err.message });
    }
  }

  console.log("\nResumo:");
  console.table(results.map(r => ({ email: r.email, ok: r.ok, uid: r.uid ? r.uid.slice(0, 16) + "..." : "—" })));
  console.log(`\nSenha padrão de todos: "${DEFAULT_PASSWORD}"\n`);

  process.exit(0);
})();
