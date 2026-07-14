// ============================================================
// Build do site publico de vagas (vagas.fiobras.com.br): copia
// public-vagas/ -> dist-vagas/ e injeta o firebase.config.js do app
// (gitignored; a apiKey web e publica por design, a protecao sao as rules).
// MESMA GUARDA do build-dist (incidente 2026-07-09): sem config valido,
// FALHA em vez de shippar uma pagina quebrada.
// ============================================================
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ORIGEM = path.join(RAIZ, "public-vagas");
const DESTINO = path.join(RAIZ, "dist-vagas");
const CONFIG = path.join(RAIZ, "public", "firebase.config.js");

if (!fs.existsSync(CONFIG)) {
  console.error("ERRO build-vagas: public/firebase.config.js AUSENTE. A pagina de vagas nao le o Firestore sem ele (NAO deployar de um worktree sem esse arquivo).");
  process.exit(1);
}
const cfgTxt = fs.readFileSync(CONFIG, "utf8");
if (cfgTxt.includes("COLE_AQUI") || !/apiKey\s*:\s*["'][A-Za-z0-9_-]{10,}/.test(cfgTxt)) {
  console.error("ERRO build-vagas: public/firebase.config.js sem apiKey valida (placeholder?). Corrija antes de deployar.");
  process.exit(1);
}

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });
for (const nome of fs.readdirSync(ORIGEM)) {
  fs.copyFileSync(path.join(ORIGEM, nome), path.join(DESTINO, nome));
}
fs.copyFileSync(CONFIG, path.join(DESTINO, "firebase.config.js"));
console.log("dist-vagas pronto:", fs.readdirSync(DESTINO).join(", "));
