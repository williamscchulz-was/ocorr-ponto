// Vincula funcionários a supervisores em massa.
//
// Para cada supervisor (por email), resolve uma lista de NOMES de
// funcionários para os doc-ids correspondentes e grava em
// /users/{uid}.funcionariosVisiveis. Assim o supervisor passa a ver
// só esses funcionários no FioPulse.
//
// A lista de nomes vive em scripts/supervisores-map.json (GITIGNORED,
// contém nomes reais — não vai pro repo). Formato:
//   {
//     "aldo@fiobras.com.br": ["Fulano da Silva", "Beltrano Souza"],
//     "joacir@fiobras.com.br": ["..."]
//   }
//
// Setup:
//   service-account.json na raiz do repo (gitignored) — projeto ocorr-ponto
//   npm install firebase-admin   (já instalado)
//
// Uso:
//   node scripts/vincular-supervisores.js          # DRY-RUN (só mostra)
//   node scripts/vincular-supervisores.js --apply  # grava no Firestore
//
// O dry-run mostra, por supervisor: quem casou, quem NÃO casou (nome
// digitado errado / funcionário inexistente) e ambiguidades (2+ pessoas
// com o mesmo nome). Confira o dry-run antes de --apply.

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const APLICAR = process.argv.includes("--apply");

// Normaliza nome pra casar: minúsculo, sem acento, espaços colapsados.
function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

(async () => {
  const saPath = path.join(__dirname, "..", "service-account.json");
  let serviceAccount;
  try {
    serviceAccount = require(saPath);
  } catch (e) {
    console.error("✗ service-account.json não encontrado em", saPath);
    console.error("  Copie o SA do projeto ocorr-ponto pra raiz do repo.");
    process.exit(1);
  }

  const mapPath = path.join(__dirname, "supervisores-map.json");
  let mapa;
  try {
    mapa = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  } catch (e) {
    console.error("✗ supervisores-map.json não encontrado/inválido em", mapPath);
    console.error("  Crie o arquivo com { \"email-supervisor\": [\"Nome 1\", \"Nome 2\"] }");
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  // 1) Carrega funcionários → índice nome normalizado -> [{id, nome, codigo, ativo}]
  const funcSnap = await db.collection("funcionarios").get();
  const porNome = new Map();
  funcSnap.docs.forEach((d) => {
    const data = d.data();
    const k = norm(data.nome);
    if (!k) return;
    if (!porNome.has(k)) porNome.set(k, []);
    porNome.get(k).push({ id: d.id, nome: data.nome, codigo: data.codigo, ativo: data.ativo });
  });
  console.log(`Funcionários carregados: ${funcSnap.size}\n`);

  // 2) Carrega users → email -> {id, role}
  const usersSnap = await db.collection("users").get();
  const porEmail = new Map();
  usersSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.email) porEmail.set(String(data.email).toLowerCase(), { id: d.id, role: data.role, nome: data.nome });
  });

  const modo = APLICAR ? "APLICAR (grava no Firestore)" : "DRY-RUN (só mostra, não grava)";
  console.log(`=== Modo: ${modo} ===\n`);

  let totalErros = 0;
  const writes = []; // {uid, email, ids}

  for (const [emailRaw, nomes] of Object.entries(mapa)) {
    const email = emailRaw.toLowerCase();
    console.log(`\n━━━ ${emailRaw} (${nomes.length} nomes) ━━━`);

    const user = porEmail.get(email);
    if (!user) {
      console.log(`  ✗ USUÁRIO NÃO ENCONTRADO em /users. Crie a conta primeiro.`);
      totalErros++;
      continue;
    }
    if (user.role !== "supervisor") {
      console.log(`  ⚠ Papel atual é "${user.role}", não "supervisor". Vou vincular mesmo assim, mas confira.`);
    }

    const ids = [];
    for (const nome of nomes) {
      const k = norm(nome);
      const matches = porNome.get(k);
      if (!matches || matches.length === 0) {
        console.log(`  ✗ NÃO ACHOU: "${nome}"  (nome digitado diferente do cadastro?)`);
        totalErros++;
        continue;
      }
      if (matches.length > 1) {
        const codes = matches.map((m) => m.codigo).join(", ");
        console.log(`  ⚠ AMBÍGUO: "${nome}" casa com ${matches.length} funcionários (códigos: ${codes}). Resolva manualmente na UI.`);
        totalErros++;
        continue;
      }
      const m = matches[0];
      const flagInativo = m.ativo === false ? " [INATIVO]" : "";
      console.log(`  ✓ ${nome}  →  ${m.id} (cód ${m.codigo})${flagInativo}`);
      ids.push(m.id);
    }

    console.log(`  Resolvidos: ${ids.length}/${nomes.length}`);
    writes.push({ uid: user.id, email: emailRaw, ids });
  }

  // 3) Aplica (ou não)
  if (APLICAR) {
    console.log(`\n=== Gravando ${writes.length} supervisores... ===`);
    for (const w of writes) {
      await db.collection("users").doc(w.uid).update({
        funcionariosVisiveis: w.ids,
      });
      console.log(`  ✓ ${w.email}: funcionariosVisiveis = [${w.ids.length} ids]`);
    }
    console.log("\nConcluído. Os supervisores já veem os funcionários no próximo login/refresh.");
  } else {
    console.log(`\n=== DRY-RUN — nada gravado. ===`);
    console.log(`Rode de novo com --apply pra gravar.`);
  }

  if (totalErros > 0) {
    console.log(`\n⚠ ${totalErros} nome(s) não resolvido(s)/ambíguo(s) acima. Corrija os nomes no supervisores-map.json (igual ao cadastro) e rode de novo.`);
  }

  process.exit(0);
})().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
