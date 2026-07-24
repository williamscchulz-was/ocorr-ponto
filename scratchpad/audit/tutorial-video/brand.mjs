// Marca + legenda + cartoes + vinheta, compartilhados pelas cenas.
// Fontes Poppins servidas pelo srv8081 (localhost, permitido pela rota do Playwright).
import fs from "node:fs";
import path from "node:path";

const B = "http://localhost:8081/public/fonts";
export const FONT_CSS = `
@font-face{font-family:"Poppins";font-weight:400;font-display:block;src:url("${B}/poppins-400-latin.woff2") format("woff2")}
@font-face{font-family:"Poppins";font-weight:500;font-display:block;src:url("${B}/poppins-500-latin.woff2") format("woff2")}
@font-face{font-family:"Poppins";font-weight:600;font-display:block;src:url("${B}/poppins-600-latin.woff2") format("woff2")}
@font-face{font-family:"Poppins";font-weight:700;font-display:block;src:url("${B}/poppins-700-latin.woff2") format("woff2")}
@font-face{font-family:"Poppins";font-weight:400;font-display:block;src:url("${B}/poppins-400-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA,U+1E00-1E9F,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"Poppins";font-weight:600;font-display:block;src:url("${B}/poppins-600-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA,U+1E00-1E9F,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"Poppins";font-weight:700;font-display:block;src:url("${B}/poppins-700-latin-ext.woff2") format("woff2");unicode-range:U+0100-02BA,U+1E00-1E9F,U+2C60-2C7F,U+A720-A7FF}`;

// Icone oficial do app (reusa o base64 aprovado no PDF docs/tutorial-instalar-app.html).
let _icon = null;
export function iconDataUrl() {
  if (_icon) return _icon;
  const html = fs.readFileSync(path.resolve("docs/tutorial-instalar-app.html"), "utf8");
  const m = html.match(/url\("(data:image\/png;base64,[^"]+)"\)/);
  _icon = m ? m[1] : "";
  return _icon;
}

// ---- LEGENDA (lower third) queimada na propria pagina ----
// Barra escura translucida, Poppins, alto contraste. UMA palavra-chave em <mark> (marcador
// amarelo Fiobras, estilo "tecer" do site). Posicao top|bottom.
export const CAPTION_CSS = `
#tut-cap{position:fixed;left:0;right:0;z-index:2147483000;display:flex;justify-content:center;pointer-events:none;padding:0 18px}
#tut-cap.pos-bottom{bottom:30px}
#tut-cap.pos-top{top:24px}
#tut-cap .tut-cap__in{
  font-family:"Poppins",system-ui,sans-serif;font-weight:600;font-size:16px;line-height:1.32;
  color:#fff;text-align:center;letter-spacing:.005em;
  background:linear-gradient(180deg,rgba(3,42,22,.95),rgba(2,32,17,.97));
  border:1px solid rgba(255,255,255,.14);
  border-radius:16px;padding:13px 20px;max-width:344px;
  box-shadow:0 12px 34px rgba(3,25,12,.4), inset 0 1px 0 rgba(255,255,255,.08);
}
#tut-cap .tut-cap__in b{color:#8FE3AC;font-weight:700}
#tut-cap .tut-cap__in mark{
  background:linear-gradient(180deg,rgba(255,203,0,.0) 40%,rgba(255,203,0,.9) 40%,rgba(255,203,0,.9) 92%,rgba(255,203,0,0) 92%);
  color:#fff;font-weight:700;padding:0 3px;border-radius:2px;
  box-decoration-break:clone;-webkit-box-decoration-break:clone;
}`;

// HTML da legenda (uso em setContent). Para o app, injeta-se via evaluate (ver capture.mjs).
export function captionHtml(cap, pos = "bottom") {
  if (!cap) return "";
  return `<div id="tut-cap" class="pos-${pos}"><div class="tut-cap__in">${cap}</div></div>`;
}

// ---- CARTOES ----
// tipos: indice | secao (com anel stories quando idx) | nota | fechamento | abertura
export function cardHtml({ tipo, kicker, titulo, sub, idx, total }) {
  const icon = iconDataUrl();
  const marca = `<div class="cd-marca"><span class="cd-ic" style="background-image:url('${icon}')"></span><span class="cd-wm">FioPulse</span></div>`;

  if (tipo === "indice") {
    const areas = ["Instalar", "Primeiro acesso", "Tela inicial", "Hoje na Fiobras", "Notificações", "Meu ponto", "Pagamento", "Documentos", "Avisos", "Pesquisas", "Vagas internas", "Conquistas", "Sua conta"];
    return `<div class="card card--indice">
      <div class="cd-kick">${kicker}</div>
      <h1 class="cd-h1">${titulo}</h1>
      <div class="cd-rule"></div>
      <div class="cd-chips">${areas.map((a) => `<span class="cd-chip">${a}</span>`).join("")}</div>
      ${marca}
    </div>`;
  }

  if (tipo === "nota") {
    return `<div class="card card--nota">
      <div class="cd-note">
        <div class="cd-note__ic"><svg viewBox="0 0 24 24" fill="none" stroke="#0a7a3a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M2.8 12h18.4"/><path d="M12 2.8c2.6 2.5 4 5.8 4 9.2s-1.4 6.7-4 9.2c-2.6-2.5-4-5.8-4-9.2s1.4-6.7 4-9.2z"/></svg></div>
        <div class="cd-kick">${kicker}</div>
        <h1 class="cd-h1 cd-h1--nota">${titulo}</h1>
        <div class="cd-sub">${sub}</div>
      </div>
      ${marca}
    </div>`;
  }

  if (tipo === "fechamento") {
    return `<div class="card card--fim">
      ${marca}
      <h1 class="cd-h1">${titulo}</h1>
      <div class="cd-rule"></div>
      <div class="cd-sub cd-sub--forte">${sub}</div>
      <div class="cd-kick cd-kick--pe">${kicker}</div>
    </div>`;
  }

  // secao (capitulo) com anel stories
  const ring = idx ? ringHtml(idx, total || 14) : "";
  return `<div class="card card--sec">
    <div class="cd-kick">${kicker}</div>
    ${ring}
    <h1 class="cd-h1">${titulo}</h1>
    <div class="cd-rule"></div>
    <div class="cd-sub">${sub}</div>
    ${marca}
  </div>`;
}

// Anel de progresso estilo "stories" da faixa Hoje na Fiobras: numero do capitulo no centro,
// arco amarelo proporcional a idx/total. r=44 -> C = 2π·44 = 276.46.
function ringHtml(idx, total) {
  const C = 276.46;
  const off = +(C * (1 - idx / total)).toFixed(2);
  return `<div class="cd-ring">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="cd-ring__track" cx="50" cy="50" r="44"/>
      <circle class="cd-ring__arc" cx="50" cy="50" r="44" stroke-dasharray="${C}" stroke-dashoffset="${off}"/>
    </svg>
    <div class="cd-ring__n">${idx}<span class="cd-ring__d">de ${total}</span></div>
  </div>`;
}

export const CARD_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:390px;height:844px;overflow:hidden}
body{font-family:"Poppins",system-ui,sans-serif;background:
  radial-gradient(120% 80% at 30% 12%, rgba(46,168,92,.45) 0%, transparent 60%),
  linear-gradient(158deg,#0a7a3a 0%,#046a30 46%,#024e23 100%);
  color:#fff;display:flex;align-items:center;justify-content:center}
.card{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:48px 40px;text-align:center;position:relative}
.card--sec{justify-content:center;gap:14px}
.cd-kick{font-size:13px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:rgba(220,246,228,.84)}
.cd-kick--pe{position:absolute;bottom:40px;left:0;right:0;letter-spacing:.16em;color:rgba(220,246,228,.7);font-size:12px}
.cd-marca{display:flex;align-items:center;gap:12px;margin:6px 0}
.cd-ic{width:52px;height:52px;border-radius:24%;background-size:cover;background-position:center;box-shadow:0 6px 18px rgba(0,0,0,.28)}
.cd-wm{font-size:30px;font-weight:700;letter-spacing:-.01em;color:#fff}
.cd-h1{font-size:34px;font-weight:700;line-height:1.08;letter-spacing:-.015em;color:#fff;max-width:300px}
.card--sec .cd-h1{font-size:36px}
.cd-rule{width:52px;height:4px;border-radius:2px;background:#FFCB00}
.cd-sub{font-size:16px;font-weight:500;color:rgba(233,248,238,.9);line-height:1.4;max-width:280px}
.cd-sub--forte{font-size:20px;font-weight:600;color:#fff}

/* anel stories dos capitulos */
.cd-ring{position:relative;width:104px;height:104px;margin:2px 0 4px}
.cd-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.cd-ring__track{fill:none;stroke:rgba(255,255,255,.15);stroke-width:5}
.cd-ring__arc{fill:none;stroke:#FFCB00;stroke-width:5;stroke-linecap:round;filter:drop-shadow(0 1px 4px rgba(255,203,0,.4))}
.cd-ring__n{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:40px;font-weight:700;color:#fff;line-height:.9}
.cd-ring__d{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(220,246,228,.7);margin-top:4px}

/* cartao-indice */
.card--indice{gap:16px}
.cd-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:320px}
.cd-chip{font-size:12.5px;font-weight:600;color:#eafaef;background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:6px 12px}

/* cartao nota (usar pelo navegador) */
.card--nota{gap:20px}
.cd-note{background:rgba(255,255,255,.96);border-radius:26px;padding:34px 30px 30px;max-width:308px;display:flex;flex-direction:column;align-items:center;gap:12px;box-shadow:0 18px 46px rgba(2,30,14,.4)}
.cd-note .cd-kick{color:#0a7a3a}
.cd-note__ic{width:60px;height:60px;border-radius:20px;background:#e8f4ec;display:flex;align-items:center;justify-content:center}
.cd-h1--nota{color:#08351b;font-size:27px;max-width:260px}
.cd-note .cd-sub{color:#3a5a45}
`;

// Palco de instalacao: fundo verde suave + telefone (imagem, ios OU android) + legenda.
export const INSTALL_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:390px;height:844px;overflow:hidden}
body{font-family:"Poppins",system-ui,sans-serif;background:
  radial-gradient(130% 70% at 50% 8%, #eaf4ec 0%, #dcecdf 55%, #cfe6d4 100%);
  display:flex;align-items:flex-start;justify-content:center}
.ins-wrap{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px 150px}
.ins-fone{width:auto;height:640px;filter:drop-shadow(0 22px 40px rgba(12,40,22,.28));border-radius:34px}
.ins-plat{position:absolute;top:30px;left:0;right:0;text-align:center;font-weight:700;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#0a7a3a}
`;

// ================= VINHETA DE ABERTURA (pulso da marca + wordmark) =================
// Pagina animada, deterministica: window.__setVig(p), p em 0..1 (o capture pisa quadros).
// ECG desenha (dashoffset), o pulso passa, o wordmark FioPulse surge, um brilho pulsa no beat.
export function vignetteHtml() {
  const icon = iconDataUrl();
  return `<!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=390, initial-scale=1, viewport-fit=cover">
  <style>${FONT_CSS}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:390px;height:844px;overflow:hidden}
  body{font-family:"Poppins",system-ui,sans-serif;background:
    radial-gradient(120% 70% at 50% 26%, rgba(46,168,92,.5) 0%, transparent 62%),
    linear-gradient(160deg,#0a7a3a 0%,#046a30 46%,#023f1c 100%);
    color:#fff;display:flex;align-items:center;justify-content:center}
  .vig{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;position:relative}
  .vig__glow{position:absolute;left:50%;top:44%;width:420px;height:420px;transform:translate(-50%,-50%) scale(.6);
    background:radial-gradient(circle,rgba(143,227,172,.5) 0%,transparent 60%);opacity:0;filter:blur(6px)}
  .vig__ic{width:96px;height:96px;border-radius:24%;background-size:cover;background-position:center;
    box-shadow:0 14px 40px rgba(0,0,0,.4);opacity:0;transform:scale(.7)}
  .vig__ecg{width:250px;height:70px;overflow:visible}
  .vig__ecg path{fill:none;stroke:#8FE3AC;stroke-width:4.2;stroke-linecap:round;stroke-linejoin:round;
    filter:drop-shadow(0 0 6px rgba(143,227,172,.6))}
  .vig__wm{font-size:44px;font-weight:700;letter-spacing:-.015em;color:#fff;opacity:0;transform:translateY(14px)}
  .vig__tag{font-size:14px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(220,246,228,.82);opacity:0}
  </style></head><body>
  <div class="vig">
    <div class="vig__glow" id="vg-glow"></div>
    <div class="vig__ic" id="vg-ic" style="background-image:url('${icon}')"></div>
    <svg class="vig__ecg" id="vg-ecg" viewBox="0 0 210 56" preserveAspectRatio="xMidYMid meet">
      <path id="vg-path" pathLength="100" d="M2 28h44l10 22 18-44 12 34 8 -12 10 22h84"/>
    </svg>
    <div class="vig__wm" id="vg-wm">FioPulse</div>
    <div class="vig__tag" id="vg-tag">Fiobras · Gestão de Pessoas</div>
  </div>
  <script>
  (function(){
    var path=document.getElementById('vg-path');
    var ic=document.getElementById('vg-ic'), wm=document.getElementById('vg-wm'),
        tag=document.getElementById('vg-tag'), glow=document.getElementById('vg-glow');
    path.style.strokeDasharray='100'; path.style.strokeDashoffset='100';
    var clamp=function(x){return x<0?0:x>1?1:x;};
    var ease=function(x){return 1-Math.pow(1-x,3);};
    window.__setVig=function(p){
      p=clamp(p);
      // icone: 0 -> 0.22
      var pi=ease(clamp(p/0.22));
      ic.style.opacity=pi; ic.style.transform='scale('+(0.7+0.3*pi)+')';
      // ecg desenha: 0.12 -> 0.62
      var pe=ease(clamp((p-0.12)/0.5));
      path.style.strokeDashoffset=String(100*(1-pe));
      // beat/glow: pico em ~0.6
      var gb=Math.max(0, 1-Math.abs(p-0.6)/0.22);
      glow.style.opacity=(0.65*gb).toFixed(3);
      glow.style.transform='translate(-50%,-50%) scale('+(0.6+0.5*gb)+')';
      var beat=1+0.06*gb;
      ic.style.transform='scale('+((0.7+0.3*pi)*beat)+')';
      // wordmark surge: 0.55 -> 0.9
      var pw=ease(clamp((p-0.55)/0.35));
      wm.style.opacity=pw; wm.style.transform='translateY('+(14*(1-pw))+'px)';
      // tag: 0.75 -> 1
      tag.style.opacity=ease(clamp((p-0.75)/0.25));
    };
    window.__setVig(0);
  })();
  </script></body></html>`;
}
