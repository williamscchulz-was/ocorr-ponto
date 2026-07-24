// Monta o MP4 final (v2) a partir dos stills + vinheta + narracao (manifest.json).
//  - vinheta: clipe animado a partir de vig/vig_NNN.png (framerate ajustado a sceneDur)
//  - cada cena de still vira um clipe H.264 810x1752 30fps com Ken Burns suave
//  - cenas com "focus" fazem um push-in aproximando o gesto (coracao, barra, tema, mao)
//  - cenas "pair" fazem crossfade entre o quadro A e o B (interacao)
//  - a trilha de narracao (dueto) usa o MESMO timing (LEAD + fala + respiro por cena)
//  - mux final H.264 High + AAC + faststart (compat WhatsApp), saida em docs/tutorial-assets/
import { execFileSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve("scratchpad/audit/tutorial-video");
const STILLS = path.join(DIR, "stills");
const VIG = path.join(DIR, "vig");
const AUD = path.join(DIR, "audio");
const WORK = path.join(DIR, "work");
const OUT_MP4 = path.resolve("docs/tutorial-assets/tutorial-fiopulse.mp4");
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

const W = 810, H = 1752, FPS = 30, XFADE = 0.5, ZD = 0.02;
const man = JSON.parse(readFileSync(path.join(DIR, "manifest.json"), "utf8"));
const vigInfo = JSON.parse(readFileSync(path.join(STILLS, "_vigframes.json"), "utf8"));
const ff = (args) => execFileSync(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });

const PRESCALE = "scale=1620:-2:flags=lanczos"; // 2x headroom -> zoom continua nitido
function zpan(nframes, focus) {
  if (focus) {
    const Z = focus.z, step = ((Z - 1) / Math.max(1, nframes)).toFixed(6), cx = focus.cx, cy = focus.cy;
    const x = `max(0\\,min(iw-iw/zoom\\,${cx}*iw-iw/zoom/2))`;
    const y = `max(0\\,min(ih-ih/zoom\\,${cy}*ih-ih/zoom/2))`;
    return `zoompan=z='min(zoom+${step}\\,${Z})':x='${x}':y='${y}':d=1:s=${W}x${H}:fps=${FPS}`;
  }
  const step = (ZD / nframes).toFixed(6);
  return `zoompan=z='min(zoom+${step}\\,${1 + ZD})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS}`;
}

// ---- clipes de video, um por cena ----
const clipList = [];
for (let i = 0; i < man.scenes.length; i++) {
  const sc = man.scenes[i];
  const D = sc.sceneDur;
  const clip = path.join(WORK, String(i).padStart(2, "0") + "_" + sc.id + ".mp4");

  if (sc.kind === "vignette") {
    const nfIn = vigInfo.frames;
    const fpsIn = +(nfIn / D).toFixed(4);
    ff(["-y", "-framerate", String(fpsIn), "-start_number", "0", "-i", path.join(VIG, "vig_%03d.png"),
        "-vf", `scale=${W}:${H}:flags=lanczos,format=yuv420p,setsar=1,fps=${FPS}`,
        "-t", String(D), "-r", String(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", clip]);
    clipList.push(clip); process.stdout.write("V"); continue;
  }

  // Legenda como camada (so em cenas focus): sobreposta DEPOIS do zoom, nunca cortada.
  const capPath = path.join(STILLS, "cap_" + sc.id + ".png");
  const hasCap = !!sc.focus && existsSync(capPath);
  const overlay = (base, capIdx) => hasCap
    ? `;[${capIdx}:v]scale=${W}:${H}:flags=lanczos[cap];[${base}][cap]overlay=0:0:format=auto,format=yuv420p[v]`
    : `;[${base}]format=yuv420p[v]`;

  if (sc.pair) {
    const a = path.join(STILLS, sc.id + "__a.png");
    const b = path.join(STILLS, sc.id + "__b.png");
    const half = +((D + XFADE) / 2).toFixed(3);
    const nf = Math.round(half * FPS);
    const off = +(half - XFADE).toFixed(3);
    const fc =
      `[0:v]${PRESCALE},${zpan(nf, sc.focus)},format=yuv420p,setsar=1[va];` +
      `[1:v]${PRESCALE},${zpan(nf, sc.focus)},format=yuv420p,setsar=1[vb];` +
      `[va][vb]xfade=transition=fade:duration=${XFADE}:offset=${off}[vx]` +
      overlay("vx", 2);
    const args = ["-y", "-loop", "1", "-framerate", String(FPS), "-t", String(half), "-i", a,
      "-loop", "1", "-framerate", String(FPS), "-t", String(half), "-i", b];
    if (hasCap) args.push("-loop", "1", "-framerate", String(FPS), "-t", String(D), "-i", capPath);
    args.push("-filter_complex", fc, "-map", "[v]", "-t", String(D), "-r", String(FPS),
      "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", clip);
    ff(args);
  } else {
    const img = path.join(STILLS, sc.id + ".png");
    const nf = Math.round(D * FPS);
    const fc = `[0:v]${PRESCALE},${zpan(nf, sc.focus)},format=yuv420p,setsar=1[vx]` + overlay("vx", 1);
    const args = ["-y", "-loop", "1", "-framerate", String(FPS), "-t", String(D), "-i", img];
    if (hasCap) args.push("-loop", "1", "-framerate", String(FPS), "-t", String(D), "-i", capPath);
    args.push("-filter_complex", fc, "-map", "[v]", "-t", String(D), "-r", String(FPS),
      "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", clip);
    ff(args);
  }
  clipList.push(clip);
  process.stdout.write(".");
}
console.log(" clipes ok (" + clipList.length + ")");

// ---- concat dos clipes ----
const listTxt = path.join(WORK, "clips.txt");
writeFileSync(listTxt, clipList.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n"));
const videoMudo = path.join(WORK, "video-mudo.mp4");
ff(["-y", "-f", "concat", "-safe", "0", "-i", listTxt, "-c", "copy", videoMudo]);
console.log("video concatenado");

// ---- trilha de narracao (mesma grade de tempo) ----
const padList = [];
for (let i = 0; i < man.scenes.length; i++) {
  const sc = man.scenes[i];
  const src = existsSync(path.join(AUD, sc.audio)) ? path.join(AUD, sc.audio) : path.join(AUD, sc.id + ".mp3");
  const pad = path.join(WORK, "a" + String(i).padStart(2, "0") + ".wav");
  const leadMs = Math.round(man.LEAD * 1000);
  ff(["-y", "-i", src, "-af", `adelay=${leadMs}|${leadMs},apad`, "-t", String(sc.sceneDur),
      "-ar", "48000", "-ac", "2", pad]);
  padList.push(pad);
}
const aListTxt = path.join(WORK, "audios.txt");
writeFileSync(aListTxt, padList.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n"));
const narr = path.join(WORK, "narracao.wav");
ff(["-y", "-f", "concat", "-safe", "0", "-i", aListTxt, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "2", narr]);
console.log("narracao montada");

// ---- mux final ----
mkdirSync(path.dirname(OUT_MP4), { recursive: true });
ff(["-y", "-i", videoMudo, "-i", narr,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-level", "4.0",
    "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart", "-shortest", OUT_MP4]);
console.log("FINAL:", OUT_MP4);
