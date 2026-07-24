import { synth } from "./tts.mjs";
import fs from "node:fs";
import path from "node:path";
const OUT = path.resolve("scratchpad/audit/tutorial-video/audio");
const frases = [
  "Bem-vindo ao FioPulse, o aplicativo da Fiobras para o seu dia a dia com a empresa.",
  "Vamos comecar instalando o app no seu celular. Leva menos de um minuto.",
  "Na tela inicial voce ve o seu ponto, os recibos e os avisos, tudo em um lugar so.",
  "Toque em Meu ponto para ver o banco de horas e as marcacoes.",
];
let i = 0, neuralN = 0, sapiN = 0;
for (const f of frases) {
  const r = await synth(f, path.join(OUT, `_t${i}.mp3`));
  if (r.engine === "neural") neuralN++; else sapiN++;
  const sz = fs.statSync(r.path).size;
  console.log(`frase ${i}: ${r.engine} (${sz} bytes) -> ${path.basename(r.path)}`);
  i++;
}
console.log(`\nRESUMO: neural=${neuralN} sapi=${sapiN} de ${frases.length}`);
