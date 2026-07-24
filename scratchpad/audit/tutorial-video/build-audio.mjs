// Sintetiza a narracao de cada cena (DUETO neural pt-BR Francisca/Antonio, fallback SAPI) e
// mede a duracao. Escreve manifest.json com o timing + voz de cada cena (usado pelo assemble).
// Cache por HASH do (voz + texto): se o roteiro mudou, o audio antigo NAO e reaproveitado.
import { execFileSync } from "node:child_process";
import ffprobe from "ffprobe-static";
import { mkdirSync, writeFileSync, readFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { scenes, RESPIRO, RESPIRO_CARD, LEAD } from "./scenes.mjs";
import { synth } from "./tts.mjs";

const DIR = path.resolve("scratchpad/audit/tutorial-video");
const AUD = path.join(DIR, "audio");
mkdirSync(AUD, { recursive: true });

const dur = (f) => Number(execFileSync(ffprobe.path, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", f]).toString().trim());
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

// Registro de hashes (voz+texto) por cena: invalida cache quando o roteiro muda.
const HASHFILE = path.join(AUD, "_hashes.json");
let hashes = {};
try { hashes = JSON.parse(readFileSync(HASHFILE, "utf8")); } catch { hashes = {}; }

const manifest = [];
let neuralN = 0, sapiN = 0, total = 0, fN = 0, mN = 0;
for (const sc of scenes) {
  const voz = sc.voz || "f";
  const h = hash(voz + "|" + sc.narr);
  const out = path.join(AUD, sc.id + ".mp3");
  const wav = out.replace(/\.mp3$/i, ".wav");
  let r;
  const cacheOk = hashes[sc.id] === h;
  if (cacheOk && existsSync(out) && statSync(out).size > 2000) r = { engine: "neural", path: out, voz };
  else if (cacheOk && existsSync(wav) && statSync(wav).size > 2000) r = { engine: "sapi-maria", path: wav, voz };
  else r = await synth(sc.narr, out, voz);
  hashes[sc.id] = h;
  if (r.engine === "neural") neuralN++; else sapiN++;
  if (voz === "m") mN++; else fN++;
  const aDur = dur(r.path);
  const respiro = sc.respiro != null ? sc.respiro : ((sc.kind === "card" || sc.kind === "vignette") ? RESPIRO_CARD : RESPIRO);
  const sceneDur = +(LEAD + aDur + respiro).toFixed(3);
  total += sceneDur;
  manifest.push({
    id: sc.id, kind: sc.kind, voz, pair: !!sc.pair, focus: sc.focus || null, capPos: sc.capPos || "bottom",
    engine: r.engine, audio: path.basename(r.path), audioDur: +aDur.toFixed(3),
    lead: LEAD, respiro, sceneDur,
  });
  console.log(`${sc.id.padEnd(16)} ${voz} ${r.engine.padEnd(11)} fala=${aDur.toFixed(2)}s cena=${sceneDur.toFixed(2)}s`);
}
writeFileSync(HASHFILE, JSON.stringify(hashes));
writeFileSync(path.join(DIR, "manifest.json"), JSON.stringify({ LEAD, total: +total.toFixed(2), scenes: manifest }, null, 2));
const mm = Math.floor(total / 60), ss = Math.round(total % 60);
console.log(`\nRESUMO: ${manifest.length} cenas · neural=${neuralN} sapi=${sapiN} · dueto F=${fN}/M=${mN} · TOTAL ~${total.toFixed(1)}s (${mm}m${String(ss).padStart(2, "0")}s)`);
if (sapiN > 0) console.log("AVISO: " + sapiN + " cena(s) cairam no fallback SAPI (regenere apagando o .wav pra tentar o neural de novo).");
