// Sintese de narracao pt-BR · DUETO. Estrategia:
//  1) Voz NEURAL do Edge (msedge-tts) via toStream, com retry (endpoint as vezes cai; ETIMEDOUT
//     transiente e comum, por isso 5 tentativas com backoff).
//  2) Fallback: SAPI5 "Microsoft Maria Desktop" (pt-BR) via PowerShell (qualidade menor).
// Vozes: "f" = pt-BR-FranciscaNeural (feminina), "m" = pt-BR-AntonioNeural (masculina).
// Exporta synth(text, outMp3Path, voz) -> { engine, path }.
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const VOZES = {
  f: "pt-BR-FranciscaNeural",
  m: "pt-BR-AntonioNeural",
};
export function vozNeural(voz) { return VOZES[voz] || VOZES.f; }

async function neural(text, outMp3, vozId, tentativas = 5) {
  const VOZ = vozNeural(vozId);
  for (let t = 1; t <= tentativas; t++) {
    try {
      const bytes = await new Promise(async (resolve, reject) => {
        const to = setTimeout(() => reject(new Error("timeout 25s")), 25000);
        try {
          const tts = new MsEdgeTTS();
          await tts.setMetadata(VOZ, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
          const { audioStream } = await tts.toStream(text);
          const chunks = [];
          audioStream.on("data", (c) => chunks.push(c));
          audioStream.on("end", () => { clearTimeout(to); resolve(Buffer.concat(chunks)); });
          audioStream.on("error", (e) => { clearTimeout(to); reject(e); });
        } catch (e) { clearTimeout(to); reject(e); }
      });
      if (bytes && bytes.length > 500) { fs.writeFileSync(outMp3, bytes); return true; }
      throw new Error("stream vazio (" + (bytes ? bytes.length : 0) + " bytes)");
    } catch (e) {
      if (t === tentativas) { console.error("  neural falhou apos", tentativas, ":", String(e).slice(0, 120)); return false; }
      await new Promise((r) => setTimeout(r, 900 * t));
    }
  }
  return false;
}

export async function synth(text, outMp3, vozId = "f") {
  const ok = await neural(text, outMp3, vozId);
  if (ok) return { engine: "neural", path: outMp3, voz: vozId };
  // Fallback SAPI5 Maria -> wav (so a voz feminina do sistema; melhor um fallback que travar).
  const outWav = outMp3.replace(/\.mp3$/i, ".wav");
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft Maria Desktop'); $s.Rate = -1; $s.SetOutputToWaveFile('${outWav.replace(/\\/g, "\\\\")}'); $s.Speak([System.IO.File]::ReadAllText('${(outMp3 + ".txt").replace(/\\/g, "\\\\")}')); $s.Dispose();`;
  fs.writeFileSync(outMp3 + ".txt", text, "utf8");
  execFileSync("powershell.exe", ["-NoProfile", "-Command", ps]);
  return { engine: "sapi-maria", path: outWav, voz: vozId };
}

// Modo teste direto: node tts.mjs "frase"
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  const OUT = path.resolve("scratchpad/audit/tutorial-video/audio");
  for (const [voz, frase] of [["f", "Bem-vindo ao FioPulse, o aplicativo da Fiobras."], ["m", "No Android, o caminho é pelo Chrome."]]) {
    const r = await synth(frase, path.join(OUT, `_t_${voz}.mp3`), voz);
    console.log(voz, r.engine, fs.statSync(r.path).size, "bytes");
  }
}
