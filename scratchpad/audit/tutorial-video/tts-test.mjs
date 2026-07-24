// Testa a voz neural pt-BR do Edge (msedge-tts). Sintetiza uma frase curta.
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { execFileSync } from "node:child_process";
import ffprobe from "ffprobe-static";
import path from "node:path";

const OUT = path.resolve("scratchpad/audit/tutorial-video/audio");
try {
  const tts = new MsEdgeTTS();
  await tts.setMetadata("pt-BR-FranciscaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioFilePath } = await tts.toFile(path.join(OUT, "_teste"), "Ola. Este e um teste da voz neural em portugues do Brasil para o tutorial do FioPulse.");
  console.log("OK arquivo:", audioFilePath);
  const dur = execFileSync(ffprobe.path, ["-v","error","-show_entries","format=duration","-of","default=nk=1:nw=1", audioFilePath]).toString().trim();
  console.log("duracao(s):", dur);
} catch (e) {
  console.error("FALHA msedge-tts:", String(e).slice(0, 300));
  process.exit(1);
}
