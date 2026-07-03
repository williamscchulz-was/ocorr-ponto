// ============================================================
// Build de deploy (auditoria de performance 2026-07-02): copia public/ -> dist/
// e MINIFICA os .js (whitespace + syntax; identificadores preservados de
// propósito: os arquivos são scripts clássicos que compartilham globals entre
// si, renomear top-level quebraria tudo). Os FONTES seguem legíveis em public/;
// dist/ é descartável e regenerado a cada deploy (predeploy no firebase.json).
// ============================================================
import { transform } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ORIGEM = path.join(RAIZ, "public");
const DESTINO = path.join(RAIZ, "dist");

fs.rmSync(DESTINO, { recursive: true, force: true });

let totalAntes = 0, totalDepois = 0, nJs = 0;

async function copiar(dir, rel = "") {
  for (const nome of fs.readdirSync(dir)) {
    const de = path.join(dir, nome);
    const para = path.join(DESTINO, rel, nome);
    const st = fs.statSync(de);
    if (st.isDirectory()) {
      if (nome === "node_modules") continue;
      fs.mkdirSync(para, { recursive: true });
      await copiar(de, path.join(rel, nome));
      continue;
    }
    fs.mkdirSync(path.dirname(para), { recursive: true });
    if (nome.endsWith(".js") && nome !== "firebase.config.js") {
      const codigo = fs.readFileSync(de, "utf8");
      try {
        const out = await transform(codigo, {
          minifyWhitespace: true,
          minifySyntax: true,
          minifyIdentifiers: false, // globals entre arquivos: nomes são API
          charset: "utf8",
          target: "es2020",
        });
        fs.writeFileSync(para, out.code);
        totalAntes += codigo.length; totalDepois += out.code.length; nJs++;
      } catch (e) {
        console.error(`minify FALHOU em ${nome} (copiando cru): ${e.message.split("\n")[0]}`);
        fs.copyFileSync(de, para);
      }
    } else {
      fs.copyFileSync(de, para);
    }
  }
}

await copiar(ORIGEM);
const kb = (n) => Math.round(n / 1024) + "KB";
console.log(`dist pronto: ${nJs} js minificados, ${kb(totalAntes)} -> ${kb(totalDepois)} (${Math.round((1 - totalDepois / totalAntes) * 100)}% menor)`);
