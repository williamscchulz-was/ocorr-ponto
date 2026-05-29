// ============================================
// Ocorrências do Ponto — App Logic
// ============================================

const state = {
  ...store.init(),
  view: { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" },
};

// Subscription da conversa de chat aberta no momento (cancelada ao trocar de
// peer ou sair da página chat) — evita vazar listeners do Firestore.
let _chatConvUnsub = null;
function pararEscutaConversa() {
  if (_chatConvUnsub) { _chatConvUnsub(); _chatConvUnsub = null; }
}
// Exposto pro firebase.js cancelar no logout (limparPresenca).
window.pararEscutaConversa = pararEscutaConversa;

// ---------- Helpers ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Debounce: usado nos search inputs pra não re-renderizar a lista
// inteira (130+ funcionários) a cada keystroke.
const debounce = (fn, ms = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };
};

// Logger gateado: console.log que carrega PII (emails, nomes, CNPJs)
// deve usar debug() em vez de console.log direto. Só imprime em localhost
// ou se window.DEBUG = true for setado manualmente (DevTools).
const _ehDev = (() => {
  try {
    return location.hostname === "localhost" ||
           location.hostname === "127.0.0.1" ||
           location.hostname.endsWith(".local");
  } catch { return false; }
})();
const debug = (...args) => {
  if (_ehDev || window.DEBUG === true) console.log(...args);
};

// Escapa HTML pra evitar XSS quando interpolando dados de usuário em
// innerHTML. Aplicar em: nomes, observações, CNPJs, razão social,
// emails, descrições e qualquer texto vindo de input/Firestore.
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Valida que uma URL é https:// — usar antes de salvar contratoUrl pra
// rejeitar javascript: / data: que viraria XSS via href.
const ehUrlSegura = (url) => {
  if (!url || !url.trim()) return true; // vazio é OK (campo opcional)
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch { return false; }
};

// Valida CNPJ via dígitos verificadores. Aceita string com ou sem máscara.
// Retorna true se válido OU se vazio (campo opcional). False se inválido.
const ehCNPJValido = (raw) => {
  if (!raw || !String(raw).trim()) return true; // vazio = OK (opcional)
  const cnpj = String(raw).replace(/\D/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false; // 00000000000000, etc

  // Calcula dígitos verificadores
  const calc = (size) => {
    const pesos = size === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < size; i++) soma += parseInt(cnpj[i], 10) * pesos[i];
    const mod = soma % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return parseInt(cnpj[12], 10) === calc(12)
      && parseInt(cnpj[13], 10) === calc(13);
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const formatDateFull = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

// Helpers pros campos do pipeline RH (funcionários enriquecidos).
// Firestore Timestamp tem .toDate(); ISO string já é string; null → null.
// Use em: f.nascimento, f.admissao, f.demissao (vêm como Timestamp do Firestore).
function tsToDateStr(ts) {
  if (!ts) return null;
  let d = null;
  if (typeof ts === "string") d = new Date(ts);
  else if (ts.toDate) d = ts.toDate();
  else if (ts.seconds) d = new Date(ts.seconds * 1000);
  else if (ts instanceof Date) d = ts;
  if (!d || isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Formata tempo de casa em "X anos e Y meses" a partir do número de dias.
// Pipeline já calcula diasNaEmpresa; aqui só formata pro humano.
function tempoDeCasa(dias) {
  if (!dias || dias < 1) return "—";
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  if (anos === 0 && meses === 0) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  if (anos === 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  if (meses === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

// Recebe lista de timestamps (Firestore Timestamp, ISO string, Date, ou ms)
// Retorna { value, hint } pro card de "Última atualização".
// value = tempo relativo ("há 5m", "há 2h", "agora")
// hint  = data + hora detalhada ("14/05 às 15:30")
function formatUltimaAtualizacao(dates) {
  const ms = (dates || [])
    .filter(Boolean)
    .map((d) => {
      if (typeof d === "number") return d;
      if (typeof d === "string") return new Date(d).getTime();
      if (d?.toMillis) return d.toMillis();
      if (d?.seconds) return d.seconds * 1000;
      return new Date(d).getTime();
    })
    .filter((n) => !Number.isNaN(n) && n > 0);

  if (ms.length === 0) {
    return { value: "—", hint: "aguardando 1ª sincronização" };
  }

  const max = Math.max(...ms);
  const agora = Date.now();
  const diffMin = Math.floor((agora - max) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  let value;
  if (diffMin < 1) value = "agora";
  else if (diffMin < 60) value = `há ${diffMin}m`;
  else if (diffH < 24) value = `há ${diffH}h`;
  else if (diffD < 7) value = `há ${diffD}d`;
  else value = new Date(max).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const dt = new Date(max);
  const hint = dt.toLocaleString("pt-BR", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
  return { value, hint };
}

const formatDay = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return String(d.getDate()).padStart(2, "0");
};
const formatMonth = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const getFuncionario = (id) => state.funcionarios.find((f) => f.id === id);
// Combina tipos padrão + custom. Se um custom tem mesmo id de um
// padrão, o custom sobrescreve (permite renomear/recolorir padrões
// sem perder o id que ocorrências antigas referenciam).
const getAllTipos = () => {
  const custom = state.tiposCustom || [];
  const overrideIds = new Set(custom.map((t) => t.id));
  return [
    ...TIPOS_OCORRENCIA.filter((t) => !overrideIds.has(t.id)),
    ...custom,
  ];
};
const parseTurno = (v) => {
  if (!v) return null;
  if (v === "geral") return "geral";
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const getTipo = (id) => getAllTipos().find((t) => t.id === id);
const getAllAcoes = () => {
  const custom = state.acoesCustom || [];
  const overrideIds = new Set(custom.map((a) => a.id));
  return [
    ...ACOES.filter((a) => !overrideIds.has(a.id)),
    ...custom,
  ];
};
const getAcao = (id) => getAllAcoes().find((a) => a.id === id);
const getUser = (id) => state.users.find((u) => u.id === id);

const currentUser = () => state.currentUserId ? getUser(state.currentUserId) : null;

const isPending = (occ) => !occ.acao || !occ.dataConferencia;
const isConferida = (occ) => !isPending(occ) && !occ.lancada;
const isLancada = (occ) => !!occ.lancada;

const initials = (nome) => {
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
};

// SVG icons (inline for offline)
const icon = (name) => {
  const icons = {
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    chevron: '<polyline points="9 18 15 12 9 6"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    message: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ""}</svg>`;
};

// ---------- Toast ----------

function toast(msg, variant = "success") {
  const el = document.createElement("div");
  el.className = `toast toast--${variant}`;
  el.innerHTML = `${icon(variant === "success" ? "check" : "alert")}<span>${msg}</span>`;
  $("#toast-root").appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 200ms";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, 2400);
}

// ---------- Modal ----------

function openModal(html, opts = {}) {
  const root = $("#modal-root");
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true">${html}</div>
    </div>
  `;
  // Clique no backdrop NÃO fecha mais — evita perder form com clique acidental.
  // Fechar só via: ESC, botão X, Cancelar, Salvar, ou Excluir.
  // Para modais de exibição (não-form) podem passar opts.dismissOnBackdrop = true.
  if (opts.dismissOnBackdrop) {
    const backdrop = $("#modal-backdrop");
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
  // Handler de ESC — fecha qualquer modal aberto. Auto-remove no closeModal.
  if (!window._modalEscHandler) {
    window._modalEscHandler = (e) => {
      if (e.key === "Escape" && $("#modal-backdrop")) closeModal();
    };
    document.addEventListener("keydown", window._modalEscHandler);
  }
  if (opts.onMount) opts.onMount(root.querySelector(".modal"));
}

function closeModal() {
  const backdrop = $("#modal-backdrop");
  if (!backdrop) return;
  // Sinaliza fim da edição de PJ (limpa pjEditing no presence + cancela sub)
  if (window.setarPJEditando) window.setarPJEditando(null);
  if (window.pararEscutaPJ) window.pararEscutaPJ();
  // Limpa qualquer toast colab residual
  document.querySelectorAll(".collab-toast").forEach((t) => t.remove());
  backdrop.style.animation = "fadeIn 160ms reverse";
  setTimeout(() => ($("#modal-root").innerHTML = ""), 140);
}

// ---------- Login ----------

function renderLoginQuick() {
  const root = $("#login-quick");
  root.innerHTML = state.users.map((u) => `
    <button type="button" data-user="${u.id}">
      <strong>${escapeHtml(u.nome)}</strong>
      <span>${roleLabel(u)}</span>
    </button>
  `).join("");

  $$("#login-quick button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.user;
      const u = getUser(id);
      $("#login-user").value = u.id;
      $("#login-pass").value = u.senha;
      login(u.id, u.senha);
    });
  });
}

function roleLabel(user) {
  if (user.role === "admin") return "Administrador";
  if (user.role === "rh") return "RH";
  if (user.role === "lider") return `Líder ${user.turno}º Turno`;
  if (user.role === "supervisor") return "Supervisor";
  return user.role;
}

// Aplica foto (base64) ou iniciais num elemento .avatar existente.
// Usa background-image porque mantém o tamanho fixo do elemento.
function aplicarAvatar(el, user) {
  if (!el) return;
  const foto = user?.fotoBase64;
  if (foto) {
    el.style.backgroundImage = `url(${foto})`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.style.color = "transparent";
    el.textContent = "";
  } else {
    el.style.backgroundImage = "";
    el.style.color = "";
    el.textContent = initials(user?.nome || "?");
  }
}

// Carrega uma imagem (File) em Image element. Promise.
function carregarImagem(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Arquivo não é imagem."));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível decodificar a imagem."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

// Modal de crop pra foto de perfil. Quadrado (1:1) porque o avatar é circular.
// Arrasta pra reposicionar, slider/wheel pra zoom. No confirm retorna base64
// JPEG 256×256 via callback onConfirm.
async function openCropFotoModal(file, onConfirm) {
  let img;
  try {
    img = await carregarImagem(file);
  } catch (e) {
    return toast(e.message, "danger");
  }

  const VIEW = 280;   // tamanho do preview (px)
  const OUTPUT = 256; // tamanho final do crop (px)
  const minScale = VIEW / Math.min(img.width, img.height); // fit shortest side
  let scale = minScale;
  let tx = (VIEW - img.width * scale) / 2;
  let ty = (VIEW - img.height * scale) / 2;
  let drag = null;

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Ajustar foto</h2>
        <p>Arraste pra posicionar e use o zoom pra enquadrar.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <div class="modal__body">
      <div style="display:flex; flex-direction:column; align-items:center; gap:14px;">
        <div id="crop-stage" style="width:${VIEW}px; height:${VIEW}px; position:relative; background:#000; border-radius:8px; overflow:hidden; cursor:grab; touch-action:none; user-select:none;">
          <canvas id="crop-canvas" width="${VIEW}" height="${VIEW}" style="display:block;"></canvas>
          <div style="position:absolute; inset:0; pointer-events:none;
                      box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
                      border-radius:50%;
                      margin: 0;"></div>
          <div style="position:absolute; inset:0; pointer-events:none;
                      border-radius:50%; border: 2px dashed rgba(255,255,255,0.8);
                      box-sizing:border-box;"></div>
        </div>
        <div style="width:${VIEW}px; display:flex; align-items:center; gap:10px;">
          <span class="text-xs muted">Zoom</span>
          <input type="range" id="crop-zoom" min="1" max="4" step="0.01" value="1" style="flex:1;" />
        </div>
      </div>
    </div>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-confirm-crop">${icon("check")}<span>Aplicar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));

      const canvas = $("#crop-canvas");
      const ctx = canvas.getContext("2d");
      const stage = $("#crop-stage");
      const zoom = $("#crop-zoom");

      const clamp = () => {
        const vw = img.width * scale;
        const vh = img.height * scale;
        // Garante que a imagem sempre cobre o stage (sem espaços vazios)
        tx = Math.min(0, Math.max(VIEW - vw, tx));
        ty = Math.min(0, Math.max(VIEW - vh, ty));
      };

      const render = () => {
        clamp();
        ctx.clearRect(0, 0, VIEW, VIEW);
        ctx.drawImage(img, tx, ty, img.width * scale, img.height * scale);
      };

      render();

      // Drag
      const start = (e) => {
        const p = e.touches ? e.touches[0] : e;
        drag = { startX: p.clientX, startY: p.clientY, origTx: tx, origTy: ty };
        stage.style.cursor = "grabbing";
      };
      const move = (e) => {
        if (!drag) return;
        e.preventDefault();
        const p = e.touches ? e.touches[0] : e;
        tx = drag.origTx + (p.clientX - drag.startX);
        ty = drag.origTy + (p.clientY - drag.startY);
        render();
      };
      const end = () => {
        drag = null;
        stage.style.cursor = "grab";
      };
      stage.addEventListener("mousedown", start);
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", end);
      stage.addEventListener("touchstart", start, { passive: true });
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", end);

      // Zoom (slider: 1.0 = scale base; 4.0 = scale * 4)
      const applyZoom = (z) => {
        // Mantém centro do stage como pivot
        const oldScale = scale;
        scale = minScale * Number(z);
        const cx = VIEW / 2;
        const cy = VIEW / 2;
        tx = cx - ((cx - tx) / oldScale) * scale;
        ty = cy - ((cy - ty) / oldScale) * scale;
        render();
      };
      zoom.addEventListener("input", () => applyZoom(zoom.value));

      // Wheel zoom (desktop conveniência)
      stage.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const next = Math.min(4, Math.max(1, Number(zoom.value) + delta));
        zoom.value = next;
        applyZoom(next);
      }, { passive: false });

      // Confirma: extrai o crop em 256×256
      $("#btn-confirm-crop").addEventListener("click", () => {
        const out = document.createElement("canvas");
        out.width = OUTPUT;
        out.height = OUTPUT;
        const octx = out.getContext("2d");
        // Mapeia a view (VIEW×VIEW) pra OUTPUT×OUTPUT, mantendo a mesma transform
        const ratio = OUTPUT / VIEW;
        octx.drawImage(
          img,
          tx * ratio,
          ty * ratio,
          img.width * scale * ratio,
          img.height * scale * ratio
        );
        const base64 = out.toDataURL("image/jpeg", 0.85);
        closeModal();
        onConfirm(base64);
      });
    },
  });
}

function login(userId, senha) {
  const u = state.users.find((x) => x.id === userId && x.senha === senha);
  const err = $("#login-error");
  if (!u) {
    err.textContent = "Usuário ou senha inválidos.";
    err.classList.remove("hidden");
    return false;
  }
  err.classList.add("hidden");
  state.currentUserId = u.id;
  store.save({ ...state, view: undefined });
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  state.view = { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" };
  renderApp();
  return true;
}

function logout() {
  state.currentUserId = null;
  // Permite que o toast de aniversário reapareça no próximo login da sessão.
  window.__niverToastShown = false;
  store.save({ ...state, view: undefined });
  $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden");
  $("#login-user").value = "";
  $("#login-pass").value = "";
}

// ---------- App Shell ----------

function renderApp() {
  const u = currentUser();
  if (!u) { logout(); return; }

  // Sidebar user (avatar com foto se houver, senão iniciais)
  aplicarAvatar($("#user-avatar"), u);
  $("#user-name").textContent = u.nome;
  $("#user-role").textContent = roleLabel(u);

  renderNav();
  renderBottomNav();
  renderPresence();
  renderView();
  updateFab();
  window.atualizarBadgeChat();

  // Toast de aniversariantes do dia — uma vez por sessão (post-login).
  // Líder vê só do próprio turno; admin/RH veem todos.
  // window.__niverToastShown é resetada no logout pra reaparecer no próximo login.
  if (!window.__niverToastShown && Array.isArray(state.funcionarios) && state.funcionarios.length > 0) {
    window.__niverToastShown = true;
    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth() + 1;
    const pool = funcionariosVisiveisPara(u);
    const niver = pool.filter((f) => Number(f.aniversarioDia) === dia && Number(f.aniversarioMes) === mes);
    if (niver.length > 0) {
      const nomes = niver.map((f) => (f.nome || "").split(" ")[0]).join(", ");
      setTimeout(() => toast(`Aniversário hoje: ${nomes}`), 800);
    }
  }
}

// ============================================================
// Notificação colaborativa (usado pelo callback de iniciarEscutaPJ)
// Mostra um toast quando outro user salva alterações no mesmo PJ.
// ============================================================
function notificarEdicaoColab(autor, mensagem) {
  const t = document.createElement("div");
  t.className = "collab-toast";
  const cor = presenceColor(autor.id);
  const primeiroNome = (autor.nome || "").split(" ")[0];
  t.style.setProperty("--collab-color", cor);
  t.innerHTML = `
    <div class="collab-toast__avatar" style="background:${cor};">${escapeHtml(initials(autor.nome))}</div>
    <div class="collab-toast__body">
      <strong>${escapeHtml(primeiroNome)}</strong>
      <small>${escapeHtml(mensagem)}</small>
    </div>
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

// Atualiza o banner de "outros editando este PJ" dentro do modal aberto.
// Re-chamado toda vez que state.presence muda (via renderPresence).
function atualizarBannerColabModal(pjId) {
  const banner = document.getElementById("modal-colab-banner");
  if (!banner || !pjId) return;
  const u = currentUser();
  const outros = (state.presence || []).filter(
    (p) => p.pjEditing === pjId && p.uid !== u?.id && p.status === "ativo"
  );
  if (outros.length === 0) {
    banner.style.display = "none";
    banner.innerHTML = "";
    return;
  }
  banner.style.display = "flex";
  const avatares = outros
    .slice(0, 4)
    .map(
      (p) => `
      <div class="presence__avatar"
           style="background:${presenceColor(p.uid)}; border-color:#fff;"
           title="${escapeHtml(p.nome)}">
        ${initials(p.nome || "?")}
      </div>`
    )
    .join("");
  const nomes = outros.map((p) => (p.nome || "").split(" ")[0]).join(", ");
  banner.innerHTML = `
    <div class="presence__avatars" style="margin-right:10px">${avatares}</div>
    <div>
      <strong>${escapeHtml(nomes)}</strong> também ${outros.length > 1 ? "estão" : "está"} editando este PJ agora.
      <span class="text-xs muted" style="display:block;">Cuidado pra não sobrescrever — combina pelo Slack se mexer no mesmo campo.</span>
    </div>
  `;
}

// Presence indicator (MOCK — não tem realtime backend ainda).
// Mostra o user atual + alguns colegas como "online" no topbar.
// Cor do avatar é estável (derivada do id) pra ficar reconhecível.
function presenceColor(id) {
  const palette = ["#008835", "#0076BE", "#FFCB00", "#E63946", "#7B4F9C", "#F28C28"];
  let h = 0;
  for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// Constrói o HTML de UM avatar de presença (foto se houver, senão iniciais
// coloridas). Borda no entorno deixa eles "pinados" sobre o fundo escuro
// quando empilhados.
function buildPresenceAvatar(usr, opts = {}) {
  const { size = 32, borderColor = "var(--plum)" } = opts;
  const userDoc = (state.users || []).find((x) => x.id === usr.id);
  const foto = userDoc?.fotoBase64;
  const ausente = usr.status === "ausente";
  const bg = foto ? "transparent" : presenceColor(usr.id);
  const photoStyle = foto
    ? `background-image:url(${foto}); background-size:cover; background-position:center;`
    : "";
  return `
    <div class="presence-avatar ${ausente ? "presence-avatar--idle" : ""}"
         data-uid="${usr.id}"
         style="width:${size}px; height:${size}px; background:${bg}; border-color:${borderColor}; font-size:${Math.round(size * 0.36)}px; ${photoStyle}">
      ${foto ? "" : escapeHtml(initials(usr.nome || "?"))}
    </div>`;
}

function renderPresence() {
  const el = $("#presence");
  if (!el) return;
  const u = currentUser();
  if (!u) { el.innerHTML = ""; return; }

  // Só usa dados reais do Firestore — sem fallback mock pra evitar flash
  if (!Array.isArray(state.presence) || state.presence.length === 0) {
    el.innerHTML = "";
    renderSidebarPresence([]);
    fecharPresenceDropdown();
    return;
  }

  const online = state.presence
    .map((p) => ({
      id: p.uid,
      nome: p.nome,
      role: p.role,
      turno: p.turno || null,
      status: p.status,
      page: p.page || "",
      pjEditing: p.pjEditing || null,
    }))
    .sort((a, b) => {
      if (a.id === u.id) return -1;
      if (b.id === u.id) return 1;
      if (a.status !== b.status) return a.status === "ativo" ? -1 : 1;
      return (a.nome || "").localeCompare(b.nome || "");
    });

  // Topbar: só mostra outros usuários (não você mesmo)
  const outros = online.filter((x) => x.id !== u.id);
  if (outros.length === 0) {
    el.innerHTML = "";
  } else {
    const maxShown = 4;
    const visiveis = outros.slice(0, maxShown);
    const extra = outros.length - visiveis.length;
    const avatars = visiveis.map((usr) => {
      const tooltip = montarTooltipPresence(usr);
      return buildPresenceAvatar(usr, { size: 32 }).replace("class=", `title="${tooltip}" class=`);
    }).join("");
    const extraAvatar = extra > 0
      ? `<div class="presence-avatar presence-avatar--extra" style="width:32px; height:32px; font-size:11px; border-color:var(--plum);">+${extra}</div>`
      : "";
    el.innerHTML = `<button type="button" class="presence-stack" id="presence-stack" aria-label="Ver pessoas conectadas">${avatars}${extraAvatar}</button>`;
    $("#presence-stack").addEventListener("click", (e) => {
      e.stopPropagation();
      togglePresenceDropdown(online);
    });
  }

  // Se há um modal de PJ aberto, sincroniza o banner de outros editando.
  const banner = document.getElementById("modal-colab-banner");
  if (banner && banner.dataset.pjid) {
    atualizarBannerColabModal(banner.dataset.pjid);
  }

  renderSidebarPresence(online);

  // Se o dropdown já estiver aberto, refresca o conteúdo
  if (document.querySelector(".presence-dropdown")) {
    abrirPresenceDropdown(online);
  }

  // Se o widget de chat está aberto, atualiza a lista (pontos verdes online/offline)
  if (!$("#chat-widget")?.hidden && $("#chat-contatos")) {
    renderChatLista();
  }
}

// Tooltip helper (compartilhado entre topbar + sidebar)
function montarTooltipPresence(usr) {
  const ROLE_LABELS = { admin: "Admin", rh: "RH", lider: "Líder" };
  const PAGE_LABELS = {
    dashboard: "Ocorrências", "banco-horas": "Banco de Horas",
    funcionarios: "Funcionários", pj: "Controle PJ", config: "Configurações",
  };
  const role = ROLE_LABELS[usr.role] || "";
  const turno = usr.turno ? ` T${usr.turno}` : "";
  let tooltip = (usr.nome || "?").replace(/"/g, "&quot;");
  if (role) tooltip += ` · ${role}${turno}`;
  if (usr.pjEditing) {
    const pj = (state.pjs || []).find((p) => p.id === usr.pjEditing);
    tooltip += ` · editando ${pj ? pj.nome.replace(/"/g, "&quot;") : "PJ"}`;
  } else if (PAGE_LABELS[usr.page]) {
    tooltip += ` · ${PAGE_LABELS[usr.page]}`;
  }
  if (usr.status === "ausente") tooltip += " · ausente";
  return tooltip;
}

// Dropdown estilo Google Sheets: lista completa de quem está online
function togglePresenceDropdown(online) {
  const existing = document.querySelector(".presence-dropdown");
  if (existing) {
    existing.remove();
    return;
  }
  abrirPresenceDropdown(online);
}

function fecharPresenceDropdown() {
  document.querySelector(".presence-dropdown")?.remove();
}

function abrirPresenceDropdown(online) {
  const u = currentUser();
  fecharPresenceDropdown();

  const ROLE_LABELS = { admin: "Admin", rh: "RH", lider: "Líder" };
  const PAGE_LABELS = {
    dashboard: "Ocorrências", "banco-horas": "Banco de Horas",
    funcionarios: "Funcionários", pj: "Controle PJ", config: "Configurações",
  };

  const items = (online || []).map((usr) => {
    const ehVoce = usr.id === u?.id;
    const ausente = usr.status === "ausente";
    const role = ROLE_LABELS[usr.role] || "";
    const turno = usr.turno ? ` · T${usr.turno}` : "";
    let atividade = "";
    if (ehVoce) {
      atividade = "neste navegador";
    } else if (usr.pjEditing) {
      const pj = (state.pjs || []).find((p) => p.id === usr.pjEditing);
      atividade = `editando <strong>${pj ? escapeHtml(pj.nome) : "PJ"}</strong>`;
    } else if (PAGE_LABELS[usr.page]) {
      atividade = "em " + PAGE_LABELS[usr.page];
    } else if (ausente) {
      atividade = "ausente";
    }
    const avatarHTML = buildPresenceAvatar(usr, { size: 32, borderColor: "var(--surface)" });
    // Botão "Mensagem" pra abrir o chat 1:1 (só pra outros, e só em modo Firebase)
    const podeChat = !ehVoce && typeof window.enviarMensagem === "function";
    const btnChat = podeChat
      ? `<button type="button" class="presence-dropdown__chat" data-chat-uid="${escapeHtml(usr.id)}" data-chat-nome="${escapeHtml(usr.nome || "?")}" title="Enviar mensagem">${icon("message")}</button>`
      : "";
    return `
      <div class="presence-dropdown__item ${ausente ? "is-idle" : ""}">
        ${avatarHTML}
        <div class="presence-dropdown__info">
          <div class="presence-dropdown__name">
            ${escapeHtml(usr.nome || "?")}
            ${ehVoce ? `<span style="opacity:.5; font-weight:500; font-size:11px;"> (você)</span>` : ""}
          </div>
          <div class="presence-dropdown__meta">
            ${role ? `<span class="presence-dropdown__role">${escapeHtml(role + turno)}</span>` : ""}
            ${atividade ? `<span class="presence-dropdown__activity">${atividade}</span>` : ""}
          </div>
        </div>
        ${btnChat}
      </div>`;
  }).join("");

  const total = online.length;
  const dropdown = document.createElement("div");
  dropdown.className = "presence-dropdown";
  dropdown.innerHTML = `
    <div class="presence-dropdown__header">
      <span class="live-dot"></span>
      <strong>Pessoas conectadas</strong>
      <span class="text-xs muted" style="margin-left:auto;">${total}</span>
    </div>
    <div class="presence-dropdown__list">${items || `<div class="muted text-sm" style="padding:16px; text-align:center;">Ninguém mais aqui agora.</div>`}</div>
  `;
  document.body.appendChild(dropdown);

  // Wire dos botões "Mensagem" → abre o chat já no peer escolhido
  dropdown.querySelectorAll(".presence-dropdown__chat").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirChatCom(btn.dataset.chatUid, btn.dataset.chatNome);
    });
  });

  // Posiciona abaixo do stack na topbar
  const stack = document.getElementById("presence-stack");
  if (stack) {
    const r = stack.getBoundingClientRect();
    dropdown.style.top = (r.bottom + 8) + "px";
    dropdown.style.right = (window.innerWidth - r.right) + "px";
  }

  // Fecha ao clicar fora
  setTimeout(() => {
    const onDocClick = (e) => {
      if (!dropdown.contains(e.target) && e.target.id !== "presence-stack") {
        fecharPresenceDropdown();
        document.removeEventListener("click", onDocClick);
      }
    };
    document.addEventListener("click", onDocClick);
  }, 50);
}

// Presença na sidebar: lista vertical com avatar + nome + atividade.
// Aparece apenas quando há outros usuários online além do próprio.
function renderSidebarPresence(online) {
  const el = document.getElementById("sidebar-presence");
  if (!el) return;
  const u = currentUser();

  const outros = (online || []).filter((x) => x.id !== u?.id);

  if (outros.length === 0) {
    el.innerHTML = "";
    return;
  }

  const ROLE_LABELS = { admin: "Admin", rh: "RH", lider: "Líder" };
  const PAGE_LABELS = {
    dashboard: "Ocorrências", "banco-horas": "Banco de Horas",
    funcionarios: "Funcionários", pj: "Controle PJ", config: "Configurações",
  };

  const items = outros.map((usr) => {
    const ausente = usr.status === "ausente";
    const role = ROLE_LABELS[usr.role] || "";
    const turno = usr.turno ? ` T${usr.turno}` : "";
    // Atividade: PJ editando > página atual > ausente
    let atividade = "";
    if (usr.pjEditing) {
      const pj = (state.pjs || []).find((p) => p.id === usr.pjEditing);
      atividade = `editando ${pj ? escapeHtml(pj.nome) : "PJ"}`;
    } else if (PAGE_LABELS[usr.page]) {
      atividade = PAGE_LABELS[usr.page];
    } else if (ausente) {
      atividade = "ausente";
    } else {
      atividade = role ? role + turno : "online";
    }
    const avatar = buildPresenceAvatar(usr, { size: 26, borderColor: "transparent" });
    return `
      <div class="sp-item${ausente ? " is-idle" : ""}">
        ${avatar}
        <div class="sp-item__info">
          <span class="sp-item__nome">${escapeHtml(usr.nome || "?")}</span>
          <span class="sp-item__atividade">${atividade}</span>
        </div>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="sp-header"><span class="sp-live"></span>Online agora · ${outros.length}</div>
    <div class="sp-list">${items}</div>
  `;
}

function renderNav() {
  const u = currentUser();
  const pending = pendingForUser(u).length;

  const items = [];
  items.push({ id: "dashboard", label: "Ocorrências", icon: "inbox", badge: pending });
  items.push({ id: "banco-horas", label: "Banco de Horas", icon: "clock" });

  if (u.role === "rh" || u.role === "admin" || u.role === "supervisor") {
    items.push({ id: "funcionarios", label: "Funcionários", icon: "users" });
  }
  if (u.role === "rh" || u.role === "admin") {
    items.push({ id: "pj", label: "Controle PJ", icon: "file" });
    items.push({ id: "config", label: "Configurações", icon: "settings" });
  }

  $("#nav").innerHTML = items.map((it) => `
    <button class="nav__item ${state.view.page === it.id ? "active" : ""}" data-page="${it.id}">
      ${icon(it.icon)}
      <span>${it.label}</span>
      ${it.badge ? `<span class="nav__badge">${it.badge}</span>` : ""}
    </button>
  `).join("");

  $$("#nav .nav__item").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.view.page = btn.dataset.page;
      renderApp();
      closeSidebar();
    });
  });
}

function renderBottomNav() {
  const u = currentUser();
  const pending = pendingForUser(u).length;
  const canCreate = u.role === "rh" || u.role === "admin";

  // Itens à esquerda do FAB
  const left = [
    { id: "dashboard", label: "Ocorrências", icon: "inbox", badge: pending },
    { id: "banco-horas", label: "Banco", icon: "clock" },
  ];
  if (u.role === "rh" || u.role === "admin" || u.role === "supervisor") {
    left.push({ id: "funcionarios", label: "Equipe", icon: "users" });
  }

  // Itens à direita do FAB
  const right = [];
  if (u.role === "rh" || u.role === "admin") {
    right.push({ id: "config", label: "Ajustes", icon: "settings" });
  }
  // Conta/logout sempre presente
  right.push({ id: "__menu", label: "Conta", icon: "user" });

  const renderItem = (it) => `
    <button class="bottom-nav__item ${state.view.page === it.id ? "active" : ""}" data-page="${it.id}" aria-label="${it.label}">
      ${icon(it.icon)}
      <span>${it.label}</span>
      ${it.badge ? `<span class="bottom-nav__badge">${it.badge > 9 ? "9+" : it.badge}</span>` : ""}
    </button>`;

  const fabHtml = canCreate ? `
    <button class="bottom-nav__item bottom-nav__item--fab" data-action="nova" aria-label="Nova ocorrência">
      <span class="bottom-nav__fab">${icon("plus")}</span>
    </button>` : "";

  $("#bottom-nav").innerHTML =
    left.map(renderItem).join("") +
    fabHtml +
    right.map(renderItem).join("");

  $$("#bottom-nav .bottom-nav__item").forEach((btn) => {
    const page = btn.dataset.page;
    const action = btn.dataset.action;
    btn.addEventListener("click", () => {
      if (action === "nova") return openNovaOcorrencia();
      if (page === "__menu") return openSidebar();
      state.view.page = page;
      renderApp();
    });
  });
}

function pendingForUser(u) {
  return state.ocorrencias.filter((o) => isPending(o) && podeVerOcorrenciaUI(u, o));
}

// ---------- Chat: contadores / badge ----------

// Total de mensagens recebidas não-lidas (todas as conversas).
function contarNaoLidas() {
  return (state.mensagensRecebidas || []).filter((m) => !m.lido).length;
}

// Chamado pelo listener global pra atualizar só o badge do FAB de chat.
window.atualizarBadgeChat = function () {
  const n = contarNaoLidas();
  const b = $("#chat-fab-badge");
  if (!b) return;
  if (n > 0) { b.textContent = n > 99 ? "99+" : String(n); b.hidden = false; }
  else { b.hidden = true; }
  // Se o widget está aberto, refresca a lista pra refletir novas msgs
  if (!$("#chat-widget")?.hidden) renderChatLista();
};

function visibleOcorrencias() {
  const u = currentUser();
  return state.ocorrencias.filter((o) => podeVerOcorrenciaUI(u, o));
}

function updateFab() {
  const u = currentUser();
  const fab = $("#fab");
  if (u.role === "rh" || u.role === "admin") {
    fab.classList.add("show");
    fab.onclick = () => openNovaOcorrencia();
  } else {
    fab.classList.remove("show");
  }
}

// ---------- Views ----------

function renderView() {
  const u = currentUser();
  const page = state.view.page;
  const view = $("#view");

  if (page === "dashboard") return renderDashboard();
  if (page === "banco-horas") return renderBancoHoras();
  if (page === "funcionarios") return renderFuncionarios();
  if (page === "pj") return renderControlePJ();
  if (page === "config") return renderConfig();
  // legacy: redirects pra config se alguém entrar via URL antigo
  if (page === "tipos" || page === "usuarios") {
    state.view.configTab = page;
    state.view.page = "config";
    return renderConfig();
  }
}

// Decide se o user pode VER um funcionário (escopo de visibilidade por papel).
function podeVerFuncionario(u, f) {
  if (!u || !f) return false;
  if (u.role === "admin" || u.role === "rh") return true;
  if (u.role === "lider") return f.turno === u.turno;
  if (u.role === "supervisor") return (u.funcionariosVisiveis || []).includes(f.id);
  return false;
}
// Decide se o user pode VER uma ocorrência (via funcionário dela).
function podeVerOcorrenciaUI(u, o) {
  if (!u || !o) return false;
  if (u.role === "admin" || u.role === "rh") return true;
  if (u.role === "lider") {
    const f = getFuncionario(o.funcionarioId);
    return !!f && f.turno === u.turno;
  }
  if (u.role === "supervisor") return (u.funcionariosVisiveis || []).includes(o.funcionarioId);
  return false;
}
// Decide se o user pode CONFERIR (dar baixa) numa ocorrência.
// admin sempre; lider/supervisor só do escopo deles; rh não confere (cria).
function podeConferirUI(u, o) {
  if (!u || !o) return false;
  if (u.role === "admin") return true;
  if (u.role === "lider" || u.role === "supervisor") return podeVerOcorrenciaUI(u, o);
  return false;
}

// Filtra funcionários ATIVOS visíveis pro user atual.
// Líder vê só do próprio turno; supervisor vê só a lista dele; admin/RH veem todos.
// Tolerante a state.funcionarios undefined (cold start).
function funcionariosVisiveisPara(u) {
  let pool = (state.funcionarios || []).filter((f) => f.ativo !== false);
  if (u.role === "lider") pool = pool.filter((f) => f.turno === u.turno);
  else if (u.role === "supervisor") pool = pool.filter((f) => (u.funcionariosVisiveis || []).includes(f.id));
  return pool;
}

const NOMES_MES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// Widget de aniversariantes no dashboard.
// Mostra TODOS os funcionários ativos (aniversário é social, não tem escopo
// por papel — admin/RH/líder/supervisor veem todos os aniversariantes do mês).
// Só renderiza se houver pelo menos 1 aniversariante no mês corrente.
// Campos vêm do pipeline RH (aniversarioDia/aniversarioMes em funcionarios/{id}).
function renderAniversariantesWidget(u) {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1;
  const pool = (state.funcionarios || []).filter((f) => f.ativo !== false);

  const niverMes = pool
    .filter((f) => Number(f.aniversarioMes) === mes && Number(f.aniversarioDia) > 0)
    .sort((a, b) => (a.aniversarioDia || 99) - (b.aniversarioDia || 99));

  if (niverMes.length === 0) return "";

  const MESES_FULL = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];

  const itens = niverMes.map((f) => {
    const ehHoje = Number(f.aniversarioDia) === dia;
    const primeiro = escapeHtml((f.nome || "?").split(" ")[0]);
    const d = String(f.aniversarioDia).padStart(2, "0");
    return `<span class="niver-mini__item${ehHoje ? " is-today" : ""}" title="${escapeHtml(f.nome)}">${primeiro}<span class="niver-mini__dia">${d}</span></span>`;
  }).join("");

  return `
    <div class="niver-mini">
      <span class="niver-mini__label">Aniversariantes de ${MESES_FULL[mes - 1]}</span>
      <span class="niver-mini__nomes">${itens}</span>
    </div>`;
}

// Widget de demografia agregada — admin only, collapsed por default.
// Idade média, distribuição por sexo, escolaridade resumida e tempo médio de casa.
// Tolerante a campos faltando: só conta quem tem o campo.
function renderDemografiaWidget(u) {
  if (u.role !== "admin") return "";
  const pool = (state.funcionarios || []).filter((f) => f.ativo !== false);
  if (pool.length === 0) return "";

  // Idade média
  const comIdade = pool.filter((f) => Number.isFinite(Number(f.idade)) && Number(f.idade) > 0);
  const idadeMedia = comIdade.length
    ? Math.round(comIdade.reduce((s, f) => s + Number(f.idade), 0) / comIdade.length)
    : null;

  // Sexo
  const sexF = pool.filter((f) => f.sexo === "Feminino").length;
  const sexM = pool.filter((f) => f.sexo === "Masculino").length;
  const sexTotal = sexF + sexM;
  const pctF = sexTotal ? Math.round((sexF / sexTotal) * 100) : 0;
  const pctM = sexTotal ? 100 - pctF : 0;

  // Escolaridade — agrupa exato + bucket "outros"
  const escolaridade = {};
  for (const f of pool) {
    const g = (f.grauInstrucao || "").trim();
    if (!g) continue;
    escolaridade[g] = (escolaridade[g] || 0) + 1;
  }
  const escolaridadeTop = Object.entries(escolaridade)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Tempo de casa médio
  const comDias = pool.filter((f) => Number.isFinite(Number(f.diasNaEmpresa)) && Number(f.diasNaEmpresa) > 0);
  const diasMedia = comDias.length
    ? Math.round(comDias.reduce((s, f) => s + Number(f.diasNaEmpresa), 0) / comDias.length)
    : null;

  // Naturalidade — top 3 cidades
  const naturalidades = {};
  for (const f of pool) {
    const n = (f.naturalidade || "").trim();
    if (!n) continue;
    naturalidades[n] = (naturalidades[n] || 0) + 1;
  }
  const naturalidadeTop = Object.entries(naturalidades)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return `
    <details class="dashboard-demografia">
      <summary>Demografia da empresa <span class="muted text-xs">(${pool.length} ativos)</span></summary>
      <div class="dashboard-demografia__grid">
        <div class="demografia-bloco">
          <div class="demografia-bloco__label">Idade média</div>
          <div class="demografia-bloco__big">${idadeMedia ?? "—"}${idadeMedia ? " <small style='font-size:13px; font-weight:500;'>anos</small>" : ""}</div>
          <div class="text-xs muted">${comIdade.length} de ${pool.length} com data de nascimento</div>
        </div>
        <div class="demografia-bloco">
          <div class="demografia-bloco__label">Sexo</div>
          ${sexTotal > 0 ? `
            <div class="demografia-bloco__big" style="font-size:14px;">
              <span style="color:#d946ef;">Fem ${pctF}%</span>
              &nbsp;·&nbsp;
              <span style="color:#0076BE;">Masc ${pctM}%</span>
            </div>
            <div class="demografia-bloco__bar">
              <span style="width:${pctF}%; background:#d946ef;"></span>
              <span style="width:${pctM}%; background:#0076BE;"></span>
            </div>
            <div class="text-xs muted" style="margin-top:4px;">${sexF} F · ${sexM} M</div>
          ` : `<div class="demografia-bloco__big" style="font-size:14px;">—</div>`}
        </div>
        <div class="demografia-bloco">
          <div class="demografia-bloco__label">Tempo médio de casa</div>
          <div class="demografia-bloco__big" style="font-size:16px;">${tempoDeCasa(diasMedia)}</div>
          <div class="text-xs muted">${comDias.length} com admissão registrada</div>
        </div>
        <div class="demografia-bloco">
          <div class="demografia-bloco__label">Escolaridade (top)</div>
          ${escolaridadeTop.length > 0 ? escolaridadeTop.map(([g, n]) => `
            <div class="text-xs" style="display:flex; justify-content:space-between; gap:8px; padding:2px 0;">
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(g)}</span>
              <strong>${n}</strong>
            </div>
          `).join("") : `<div class="demografia-bloco__big" style="font-size:14px;">—</div>`}
        </div>
        ${naturalidadeTop.length > 0 ? `
          <div class="demografia-bloco">
            <div class="demografia-bloco__label">Naturalidade (top)</div>
            ${naturalidadeTop.map(([n, c]) => `
              <div class="text-xs" style="display:flex; justify-content:space-between; gap:8px; padding:2px 0;">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(n)}</span>
                <strong>${c}</strong>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </div>
    </details>`;
}

function renderDashboard() {
  const u = currentUser();
  $("#topbar-title").textContent = "Ocorrências";

  const visible = visibleOcorrencias();
  const pending = visible.filter(isPending);
  const conferidas = visible.filter(isConferida);
  const lancadas = visible.filter(isLancada);
  const done = visible.filter((o) => !isPending(o)); // conferidas + lançadas

  const greeting = greetingText(u);
  const subtitle =
    u.role === "lider"
      ? `Você visualiza apenas ocorrências do ${u.turno}º turno.`
      : u.role === "supervisor"
      ? "Você visualiza apenas os funcionários sob sua supervisão."
      : u.role === "rh"
      ? "Registre e acompanhe ocorrências de todos os turnos."
      : "Você tem acesso completo ao sistema.";

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>${greeting}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="row">
        ${
          u.role === "rh" || u.role === "admin"
            ? `<button class="btn btn--primary" id="btn-nova">${icon("plus")}<span>Nova ocorrência</span></button>`
            : ""
        }
      </div>
    </header>

    <div class="stats">
      <div class="stat stat--accent">
        <div class="stat__label">Pendentes</div>
        <div class="stat__value">${pending.length}</div>
        <div class="stat__hint">${u.role === "lider" || u.role === "supervisor" ? "aguardando sua conferência" : "aguardando líder"}</div>
      </div>
      <div class="stat">
        <div class="stat__label">Conferidas</div>
        <div class="stat__value">${done.length}</div>
        <div class="stat__hint">no período visível</div>
      </div>
      <div class="stat">
        <div class="stat__label">Total mês</div>
        <div class="stat__value">${visible.length}</div>
        <div class="stat__hint">${currentMonthLabel()}</div>
      </div>
      <div class="stat">
        <div class="stat__label">Funcionários ativos</div>
        <div class="stat__value">${countActiveFuncs(u)}</div>
        <div class="stat__hint">${u.role === "lider" ? `turno ${u.turno}` : u.role === "supervisor" ? "sob sua supervisão" : "todos os turnos"}</div>
      </div>
    </div>

    ${renderAniversariantesWidget(u)}
    ${renderDemografiaWidget(u)}

    <div class="tabs" id="tabs">
      <button class="tab ${state.view.filterTab === "pendentes" ? "active" : ""}" data-tab="pendentes">
        Pendentes <span class="tab__count">${pending.length}</span>
      </button>
      <button class="tab ${state.view.filterTab === "conferidas" ? "active" : ""}" data-tab="conferidas">
        Conferidas <span class="tab__count">${conferidas.length}</span>
      </button>
      <button class="tab ${state.view.filterTab === "lancadas" ? "active" : ""}" data-tab="lancadas">
        Lançadas <span class="tab__count">${lancadas.length}</span>
      </button>
      <button class="tab ${state.view.filterTab === "todas" ? "active" : ""}" data-tab="todas">
        Todas <span class="tab__count">${visible.length}</span>
      </button>
    </div>

    <div class="toolbar">
      <div class="toolbar__search">
        ${icon("search")}
        <input type="text" id="search" placeholder="Buscar por funcionário ou tipo..." value="${state.view.search}" />
      </div>
      ${u.role !== "lider" ? `
        <select id="turno-filter">
          <option value="">Todos os turnos</option>
          <option value="1" ${state.view.filterTurno === "1" ? "selected" : ""}>1º Turno</option>
          <option value="2" ${state.view.filterTurno === "2" ? "selected" : ""}>2º Turno</option>
          <option value="3" ${state.view.filterTurno === "3" ? "selected" : ""}>3º Turno</option>
          <option value="geral" ${state.view.filterTurno === "geral" ? "selected" : ""}>Geral</option>
        </select>
      ` : ""}
    </div>

    <div id="occ-list"></div>
  `;

  // Wire up
  if ($("#btn-nova")) $("#btn-nova").addEventListener("click", openNovaOcorrencia);

  $$("#tabs .tab").forEach((t) => {
    t.addEventListener("click", () => {
      state.view.filterTab = t.dataset.tab;
      renderDashboard();
    });
  });

  $("#search").addEventListener("input", debounce((e) => {
    state.view.search = e.target.value;
    renderOccList();
  }, 150));
  $("#search").addEventListener("focus", (e) => {
    const len = e.target.value.length;
    e.target.setSelectionRange(len, len);
  });

  if ($("#turno-filter")) {
    $("#turno-filter").addEventListener("change", (e) => {
      state.view.filterTurno = e.target.value || null;
      renderOccList();
    });
  }

  renderOccList();
}

function renderOccList() {
  const u = currentUser();
  const tab = state.view.filterTab;
  const search = state.view.search.toLowerCase();
  const turno = state.view.filterTurno;

  let list = visibleOcorrencias();

  if (tab === "pendentes") list = list.filter(isPending);
  else if (tab === "conferidas") list = list.filter(isConferida);
  else if (tab === "lancadas") list = list.filter(isLancada);

  if (turno) {
    list = list.filter((o) => {
      const f = getFuncionario(o.funcionarioId);
      return f && String(f.turno) === turno;
    });
  }

  if (search) {
    list = list.filter((o) => {
      const f = getFuncionario(o.funcionarioId);
      const tipo = getTipo(o.tipo);
      return (f && f.nome.toLowerCase().includes(search)) ||
             (tipo && tipo.label.toLowerCase().includes(search));
    });
  }

  // Sort: pending first, newest first
  list.sort((a, b) => {
    const pa = isPending(a), pb = isPending(b);
    if (pa !== pb) return pa ? -1 : 1;
    return b.data.localeCompare(a.data);
  });

  const root = $("#occ-list");
  if (list.length === 0) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty__icon">${icon("inbox")}</div>
        <h3>Nada por aqui</h3>
        <p>${tab === "pendentes" ? "Nenhuma ocorrência pendente neste filtro." : "Nenhum registro encontrado."}</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `<div class="list">${list.map(renderOccCard).join("")}</div>`;
  $$("#occ-list .occ").forEach((el) => {
    el.addEventListener("click", () => openOcorrenciaDetail(el.dataset.id));
  });
  $$("#occ-list [data-quick-lancar]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      marcarComoLancada(btn.dataset.quickLancar);
    });
  });
}

function renderOccCard(o) {
  const u = currentUser();
  const f = getFuncionario(o.funcionarioId);
  const tipo = getTipo(o.tipo);
  const pending = isPending(o);
  const podeLancar = !pending && !isLancada(o) && (u.role === "rh" || u.role === "admin");

  return `
    <article class="occ" data-id="${o.id}">
      <div class="occ__date">
        <strong>${formatDay(o.data)}</strong>
        <span>${formatMonth(o.data)}</span>
      </div>
      <div class="occ__main">
        <div class="occ__name">${f ? f.nome : "—"}</div>
        <div class="occ__sub">
          <span class="badge badge--${tipo?.tone || "neutral"}">${tipo?.label || "—"}</span>
          <span class="dot"></span>
          <span>${f?.setor || "—"} · ${TURNOS[f?.turno]?.label || "—"}</span>
        </div>
      </div>
      <div class="occ__time">${o.horario || "—"}</div>
      <div>
        ${pending
          ? `<span class="badge badge--warning"><span class="dot"></span>Pendente</span>`
          : isLancada(o)
            ? `<span class="badge badge--info"><span class="dot"></span>Lançada · ${getAcao(o.acao)?.label || "—"}</span>`
            : `<span class="badge badge--success"><span class="dot"></span>${getAcao(o.acao)?.label || "Conferida"}</span>`
        }
      </div>
      ${podeLancar
        ? `<button class="btn btn--primary btn--sm" data-quick-lancar="${o.id}" title="Marcar como lançada">${icon("check")}<span>Lançar</span></button>`
        : `<svg class="icon occ__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`
      }
    </article>
  `;
}

// ---------- Nova Ocorrência ----------

function openNovaOcorrencia() {
  const u = currentUser();
  // Só RH e admin criam ocorrências. Líder e supervisor apenas conferem.
  if (u.role !== "rh" && u.role !== "admin") return;

  const today = todayIso();

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Nova ocorrência</h2>
        <p>Preencha os dados que o RH conhece. O líder cuida da conferência depois.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="nova-form">
      <div class="field-row">
        <div class="field">
          <label for="f-data">Data</label>
          <input type="date" id="f-data" required value="${today}" max="${today}" />
        </div>
        <div class="field">
          <label for="f-horario">Horário</label>
          <input type="time" id="f-horario" required />
        </div>
      </div>

      <div class="field">
        <label for="f-func">Funcionário</label>
        <select id="f-func" required>
          <option value="">Selecione...</option>
          ${state.funcionarios
            .filter((f) => f.ativo !== false)
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((f) => `
              <option value="${f.id}">${escapeHtml(f.nome)}${f.turno ? " — " + (TURNOS[f.turno]?.label || "?") : " — sem turno"}</option>
            `).join("")}
        </select>
        ${state.funcionarios.length === 0
          ? `<span class="field__error">${icon("alert")} Nenhum funcionário cadastrado. <a href="#" id="link-import" style="color:var(--plum);">Ir para Funcionários</a> e importar.</span>`
          : ""}
      </div>

      <div class="field">
        <label for="f-tipo">Tipo de ocorrência</label>
        <select id="f-tipo" required>
          <option value="">Selecione...</option>
          ${getAllTipos().map((t) => `<option value="${t.id}">${t.label}</option>`).join("")}
        </select>
      </div>

      <div class="field">
        <label for="f-obs">Observação <span class="muted text-xs">(opcional)</span></label>
        <textarea id="f-obs" placeholder="Contexto, justificativa, anexos referenciados..."></textarea>
        <span class="field__hint">O líder poderá adicionar mais informações na conferência.</span>
      </div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save">${icon("check")}<span>Registrar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save").addEventListener("click", saveNovaOcorrencia);
      const linkImport = $("#link-import");
      if (linkImport) {
        linkImport.addEventListener("click", (e) => {
          e.preventDefault();
          closeModal();
          state.view.page = "funcionarios";
          renderApp();
        });
      }
    },
  });
}

function saveNovaOcorrencia() {
  const data = $("#f-data").value;
  const horario = $("#f-horario").value;
  const funcionarioId = $("#f-func").value;
  const tipo = $("#f-tipo").value;
  const observacao = $("#f-obs").value.trim();

  if (!data || !horario || !funcionarioId || !tipo) {
    toast("Preencha todos os campos obrigatórios.", "danger");
    return;
  }

  const u = currentUser();
  const novo = {
    id: "o" + Date.now(),
    data,
    funcionarioId,
    tipo,
    horario,
    acao: null,
    dataConferencia: null,
    observacao,
    historico: [{ por: u.id, em: new Date().toISOString(), acao: "Criou ocorrência" }],
    criadoPor: u.id,
    criadoEm: new Date().toISOString(),
  };

  state.ocorrencias.unshift(novo);
  store.save(state);
  closeModal();
  toast("Ocorrência registrada com sucesso!");
  renderApp();
}

// ---------- Detail / Conferência ----------

function openOcorrenciaDetail(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;

  const u = currentUser();
  const f = getFuncionario(o.funcionarioId);
  const tipo = getTipo(o.tipo);
  const pending = isPending(o);
  const canConfer = podeConferirUI(u, o);
  const canEdit = canConfer || u.role === "rh";

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Ocorrência · ${formatDateFull(o.data)}</h2>
        <p>${pending ? "Aguardando conferência do líder" : "Conferida em " + formatDateFull(o.dataConferencia)}</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>

    <div class="modal__body">
      <div class="row" style="margin-bottom:16px; gap:12px;">
        <div class="avatar avatar--lg">${initials(f?.nome || "?")}</div>
        <div>
          <div style="font-weight:600; color:var(--plum); font-size:16px;">${f?.nome || "—"}</div>
          <div class="muted text-sm">${f?.setor || "—"} · ${TURNOS[f?.turno]?.label || "—"}</div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-cell">
          <label>Tipo</label>
          <strong>${tipo?.label || "—"}</strong>
        </div>
        <div class="detail-cell">
          <label>Horário</label>
          <strong>${o.horario || "—"}</strong>
        </div>
      </div>

      ${pending && canConfer ? `
        <div class="field">
          <label for="conf-acao">Ação <span style="color:var(--danger)">*</span></label>
          <select id="conf-acao">
            <option value="">Escolha como tratar a ocorrência...</option>
            ${getAllAcoes().map((a) => `<option value="${a.id}">${a.label}</option>`).join("")}
          </select>
          <span class="field__hint">A data da conferência será marcada automaticamente.</span>
        </div>
      ` : !pending ? `
        <div class="detail-grid">
          <div class="detail-cell">
            <label>Ação aplicada</label>
            <strong>${getAcao(o.acao)?.label || "—"}</strong>
          </div>
          <div class="detail-cell">
            <label>Data conferência</label>
            <strong>${formatDateFull(o.dataConferencia)}</strong>
          </div>
        </div>
        ${isLancada(o) ? `
          <div class="detail-grid">
            <div class="detail-cell" style="background: var(--info-bg); border: 1px solid var(--info);">
              <label style="color: var(--info);">Lançada na folha</label>
              <strong>${formatDateFull(o.lancadoEm)}</strong>
            </div>
            <div class="detail-cell" style="background: var(--info-bg); border: 1px solid var(--info);">
              <label style="color: var(--info);">Por</label>
              <strong>${getUser(o.lancadoPor)?.nome || "—"}</strong>
            </div>
          </div>
        ` : ""}
      ` : ""}

      <div class="field">
        <label for="conf-obs">Observação</label>
        <textarea id="conf-obs" ${!canEdit ? "disabled" : ""} placeholder="Adicione contexto, justificativas ou notas...">${escapeHtml(o.observacao || "")}</textarea>
      </div>

      <div style="margin-top:20px;">
        <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Histórico</div>
        <div class="timeline">
          ${o.historico.map((h, i, arr) => `
            <div class="timeline__item ${i < arr.length - 1 || !pending ? "done" : ""}">
              <div class="timeline__item-title">${h.acao}</div>
              <div class="timeline__item-meta">${getUser(h.por)?.nome || h.por} · ${formatDateTime(h.em)}</div>
            </div>
          `).join("")}
          ${pending ? `
            <div class="timeline__item">
              <div class="timeline__item-title muted">Aguardando conferência do líder</div>
              <div class="timeline__item-meta">próxima etapa</div>
            </div>
          ` : ""}
        </div>
      </div>
    </div>

    <div class="modal__footer">
      ${(u.role === "admin" || u.role === "rh") ? `<button class="btn btn--danger" id="btn-del-occ" style="margin-right:auto;">${icon("trash")}<span>Excluir</span></button>` : ""}
      <button class="btn btn--ghost" data-close>Fechar</button>
      ${u.role === "admin" ? `<button class="btn btn--soft" id="btn-edit-occ">${icon("edit")}<span>Editar tudo</span></button>` : ""}
      ${canEdit && !pending ? `<button class="btn btn--soft" id="btn-update-obs">${icon("check")}<span>Salvar observação</span></button>` : ""}
      ${pending && canConfer ? `<button class="btn btn--primary" id="btn-confer">${icon("check")}<span>Confirmar conferência</span></button>` : ""}
      ${pending && u.role === "rh" ? `<button class="btn btn--soft" id="btn-update-obs">${icon("check")}<span>Salvar observação</span></button>` : ""}
      ${!pending && !isLancada(o) && (u.role === "rh" || u.role === "admin") ? `<button class="btn btn--primary" id="btn-lancar">${icon("check")}<span>Marcar como lançada</span></button>` : ""}
      ${isLancada(o) && (u.role === "rh" || u.role === "admin") ? `<button class="btn btn--soft" id="btn-desfazer-lancar">${icon("clock")}<span>Desfazer lançamento</span></button>` : ""}
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      if ($("#btn-confer")) $("#btn-confer").addEventListener("click", () => confirmConferencia(o.id));
      if ($("#btn-update-obs")) $("#btn-update-obs").addEventListener("click", () => updateObservacao(o.id));
      if ($("#btn-del-occ")) $("#btn-del-occ").addEventListener("click", () => deleteOcorrencia(o.id));
      if ($("#btn-edit-occ")) $("#btn-edit-occ").addEventListener("click", () => openEditOcorrenciaModal(o.id));
      if ($("#btn-lancar")) $("#btn-lancar").addEventListener("click", () => marcarComoLancada(o.id));
      if ($("#btn-desfazer-lancar")) $("#btn-desfazer-lancar").addEventListener("click", () => desfazerLancamento(o.id));
    },
  });
}

function desfazerLancamento(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const u = currentUser();
  if (u.role !== "rh" && u.role !== "admin") return;
  if (!isLancada(o)) return;

  if (!confirm("Desfazer o lançamento? A ocorrência volta pra Conferidas e a marca de lançada some.")) return;

  o.lancada = false;
  o.lancadoEm = null;
  o.lancadoPor = null;
  o.historico = [...(o.historico || []), {
    por: u.id,
    em: new Date().toISOString(),
    acao: "Desfez lançamento",
  }];

  store.save(state);
  closeModal();
  toast("Lançamento desfeito. Voltou pra Conferidas.");
  renderApp();
}

function marcarComoLancada(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const u = currentUser();
  if (u.role !== "rh" && u.role !== "admin") return;
  if (isPending(o)) return toast("Confira a ocorrência antes de marcar como lançada.", "danger");

  o.lancada = true;
  o.lancadoEm = todayIso();
  o.lancadoPor = u.id;
  o.historico = [...(o.historico || []), {
    por: u.id,
    em: new Date().toISOString(),
    acao: "Marcou como lançada",
  }];

  store.save(state);
  closeModal();
  toast("Marcada como lançada!");
  renderApp();
}

function openEditOcorrenciaModal(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const u = currentUser();
  if (u.role !== "admin") return;

  const today = todayIso();
  openModal(`
    <div class="modal__header">
      <div>
        <h2>Editar ocorrência</h2>
        <p>Admin pode ajustar qualquer campo. Mudanças sobrescrevem o registro original.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="edit-form" onsubmit="return false">
      <div class="field-row">
        <div class="field">
          <label for="ef-data">Data</label>
          <input type="date" id="ef-data" required value="${o.data}" max="${today}" />
        </div>
        <div class="field">
          <label for="ef-horario">Horário</label>
          <input type="time" id="ef-horario" required value="${o.horario || ""}" />
        </div>
      </div>

      <div class="field">
        <label for="ef-func">Funcionário</label>
        <select id="ef-func" required>
          ${state.funcionarios
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((f) => `
              <option value="${f.id}" ${f.id === o.funcionarioId ? "selected" : ""}>${escapeHtml(f.nome)}${f.turno ? " — " + (TURNOS[f.turno]?.label || "?") : " — sem turno"}</option>
            `).join("")}
        </select>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="ef-tipo">Tipo de ocorrência</label>
          <select id="ef-tipo" required>
            ${getAllTipos().map((t) => `<option value="${t.id}" ${t.id === o.tipo ? "selected" : ""}>${t.label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="ef-acao">Ação <span class="muted text-xs">(opcional — vazio = pendente)</span></label>
          <select id="ef-acao">
            <option value="">— Pendente —</option>
            ${getAllAcoes().map((a) => `<option value="${a.id}" ${a.id === o.acao ? "selected" : ""}>${a.label}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="field">
        <label for="ef-obs">Observação</label>
        <textarea id="ef-obs" placeholder="Contexto, justificativa...">${escapeHtml(o.observacao || "")}</textarea>
      </div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-edit-occ">${icon("check")}<span>Salvar alterações</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save-edit-occ").addEventListener("click", () => saveEditOcorrencia(id));
    },
  });
}

function saveEditOcorrencia(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const u = currentUser();
  if (u.role !== "admin") return;

  const data = $("#ef-data").value;
  const horario = $("#ef-horario").value;
  const funcionarioId = $("#ef-func").value;
  const tipo = $("#ef-tipo").value;
  const acao = $("#ef-acao").value || null;
  const observacao = $("#ef-obs").value.trim();

  if (!data || !horario || !funcionarioId || !tipo) {
    return toast("Preencha data, funcionário, tipo e horário.", "danger");
  }

  const func = getFuncionario(funcionarioId);
  const dataConferencia = acao ? (o.dataConferencia || todayIso()) : null;
  const conferidoPor = acao ? (o.conferidoPor || u.id) : null;

  Object.assign(o, {
    data,
    funcionarioId,
    funcionarioNome: func?.nome || o.funcionarioNome,
    funcionarioTurno: func?.turno ?? o.funcionarioTurno,
    tipo,
    horario,
    acao,
    dataConferencia,
    observacao,
    conferidoPor,
  });
  o.historico = [...(o.historico || []), {
    por: u.id,
    em: new Date().toISOString(),
    acao: "Admin editou a ocorrência",
  }];

  store.save(state);
  closeModal();
  toast("Ocorrência atualizada.");
  renderApp();
}

function deleteOcorrencia(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const f = getFuncionario(o.funcionarioId);
  const tipo = getTipo(o.tipo);
  const label = `${f?.nome || "?"} · ${tipo?.label || "?"} · ${formatDate(o.data)}`;
  if (!confirm(`Excluir DEFINITIVAMENTE esta ocorrência?\n\n${label}\n\nIsso some do histórico, sem desfazer.`)) return;

  state.ocorrencias = state.ocorrencias.filter((x) => x.id !== id);
  store.save(state);
  closeModal();
  toast("Ocorrência excluída.");
  renderApp();
}

function confirmConferencia(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const acao = $("#conf-acao").value;
  const obs = $("#conf-obs").value.trim();

  if (!acao) {
    toast("Selecione a ação antes de confirmar.", "danger");
    return;
  }

  const u = currentUser();
  o.acao = acao;
  o.dataConferencia = todayIso();
  o.observacao = obs;
  o.historico.push({
    por: u.id,
    em: new Date().toISOString(),
    acao: `Conferiu (${getAcao(acao).label})`,
  });

  store.save(state);
  closeModal();
  toast("Conferência confirmada!");
  renderApp();
}

function updateObservacao(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const obs = $("#conf-obs").value.trim();
  if (obs === o.observacao) {
    closeModal();
    return;
  }

  const u = currentUser();
  o.observacao = obs;
  o.historico.push({
    por: u.id,
    em: new Date().toISOString(),
    acao: "Atualizou observação",
  });

  store.save(state);
  closeModal();
  toast("Observação atualizada.");
  renderApp();
}

// ---------- Funcionários (Admin/RH) ----------

function renderFuncionarios() {
  const u = currentUser();
  $("#topbar-title").textContent = "Funcionários";

  // Base dos stats respeita o escopo do papel (supervisor vê só os dele).
  const escopo = state.funcionarios.filter((f) => podeVerFuncionario(u, f));
  // Stats consideram só funcionários ATIVOS — inativos não poluem
  const ativos = escopo.filter((f) => f.ativo !== false);
  const semTurno = ativos.filter((f) => !f.turno).length;
  const totalAtivos = ativos.length;
  const totalInativos = escopo.length - totalAtivos;

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>Funcionários</h1>
        <p>${u.role === "supervisor" ? "Funcionários sob sua supervisão." : "Clique num funcionário pra definir turno e setor."}</p>
      </div>
    </header>

    ${(() => {
      const ultima = formatUltimaAtualizacao(
        state.funcionarios.map((f) => f.atualizadoEm || f.criadoEm)
      );
      return `
    <div class="stats">
      <div class="stat stat--accent">
        <div class="stat__label">Total ativos</div>
        <div class="stat__value">${totalAtivos}</div>
        <div class="stat__hint">${totalInativos > 0 ? `+ ${totalInativos} inativo${totalInativos > 1 ? "s" : ""}` : "todos ativos"}</div>
      </div>
      <div class="stat ${semTurno > 0 ? "stat--accent" : ""}">
        <div class="stat__label">Sem turno definido</div>
        <div class="stat__value">${semTurno}</div>
        <div class="stat__hint">${semTurno > 0 ? "ajustar antes de líderes verem" : "tudo certo"}</div>
      </div>
      ${[1, 2, 3, "geral"].map((t) => `
        <div class="stat">
          <div class="stat__label">${TURNOS[t].label}</div>
          <div class="stat__value">${ativos.filter((f) => f.turno === t).length}</div>
          <div class="stat__hint">${TURNOS[t].horario}</div>
        </div>
      `).join("")}
      <div class="stat">
        <div class="stat__label">Última atualização</div>
        <div class="stat__value" style="font-size: 16px;">${ultima.value}</div>
        <div class="stat__hint">${ultima.hint}</div>
      </div>
    </div>`;
    })()}

    <div class="toolbar">
      <div class="toolbar__search">
        ${icon("search")}
        <input type="text" id="func-search" placeholder="Buscar por nome ou código..." />
      </div>
      <select id="func-status-filter">
        <option value="ativo" selected>Apenas ativos</option>
        <option value="inativo">Apenas inativos</option>
        <option value="todos">Todos (ativos + inativos)</option>
      </select>
      <select id="func-turno-filter">
        <option value="">Todos os turnos</option>
        <option value="sem">Sem turno</option>
        <option value="1">1º Turno</option>
        <option value="2">2º Turno</option>
        <option value="3">3º Turno</option>
        <option value="geral">Geral</option>
      </select>
    </div>

    <div id="func-list"></div>
  `;

  $("#func-search").addEventListener("input", debounce(renderFuncList, 150));
  $("#func-status-filter").addEventListener("change", renderFuncList);
  $("#func-turno-filter").addEventListener("change", renderFuncList);
  renderFuncList();
}

function renderFuncList() {
  const u = currentUser();
  const search = ($("#func-search")?.value || "").toLowerCase();
  const statusFilter = $("#func-status-filter")?.value || "ativo";
  const filter = $("#func-turno-filter")?.value || "";

  let list = [...state.funcionarios];

  // Escopo de visibilidade por papel (supervisor vê só a lista dele; líder, só turno)
  list = list.filter((f) => podeVerFuncionario(u, f));

  // Filtro por status (default = só ativos)
  if (statusFilter === "ativo") list = list.filter((f) => f.ativo !== false);
  else if (statusFilter === "inativo") list = list.filter((f) => f.ativo === false);
  // "todos" não filtra

  if (search) {
    list = list.filter((f) =>
      f.nome.toLowerCase().includes(search) ||
      (f.codigo || "").toLowerCase().includes(search)
    );
  }
  if (filter === "sem") list = list.filter((f) => !f.turno);
  else if (filter) list = list.filter((f) => String(f.turno) === filter);

  list.sort((a, b) => {
    if (!a.turno && b.turno) return -1;
    if (a.turno && !b.turno) return 1;
    return a.nome.localeCompare(b.nome);
  });

  const root = $("#func-list");
  if (list.length === 0) {
    const semFiltro = !search && !filter && statusFilter === "ativo";
    const apenasInativos = statusFilter === "inativo" && state.funcionarios.some((f) => f.ativo === false);
    root.innerHTML = `
      <div class="empty">
        <div class="empty__icon">${icon("users")}</div>
        <h3>${semFiltro ? "Aguardando primeira sincronização" : "Nenhum resultado"}</h3>
        <p>${semFiltro
          ? "Os funcionários virão automaticamente do pipeline de RH na próxima execução."
          : (apenasInativos ? "" : "Tente ajustar a busca ou os filtros (turno/status).")}</p>
      </div>`;
    return;
  }

  root.innerHTML = `<div class="list">${list.map((f) => {
    const demissaoStr = f.ativo === false && f.demissao ? tsToDateStr(f.demissao) : null;
    return `
    <article class="occ" style="grid-template-columns: 44px 1fr auto auto auto;" data-func="${f.id}">
      <div class="avatar">${initials(f.nome)}</div>
      <div class="occ__main">
        <div class="occ__name">${escapeHtml(f.nome)}</div>
        <div class="occ__sub">${f.codigo ? "cód: " + escapeHtml(f.codigo) + " · " : ""}${escapeHtml(f.setor || "sem setor")}</div>
        ${demissaoStr ? `
          <div class="text-xs" style="margin-top:2px; color:#b91c1c; font-weight:500;">
            Demitido em ${demissaoStr}
          </div>
        ` : ""}
      </div>
      ${f.turno
        ? `<span class="badge badge--neutral">${TURNOS[f.turno].label}</span>`
        : `<span class="badge badge--warning"><span class="dot"></span>Sem turno</span>`}
      <span class="badge badge--${f.ativo === false ? "neutral" : "success"}">${f.ativo === false ? "Inativo" : "Ativo"}</span>
      <svg class="icon occ__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </article>`;
  }).join("")}</div>`;

  $$("#func-list .occ").forEach((el) => {
    el.addEventListener("click", () => openFuncionarioModal(el.dataset.func));
  });
}

// Setores: derivados dinamicamente dos funcionarios atuais (CSV do ERP WK Radar
// via pipeline RH é a fonte canônica). Lista FALLBACK só usada se nenhum
// funcionário estiver carregado em state.funcionarios (modo demo / cold start).
const SETORES_FALLBACK = [
  "ADMINISTRAÇÃO", "ADMINISTRAÇÃO PRODUÇÃO", "COMERCIAL",
  "DIRETOS BENEFICIAMENTO", "EXPEDIÇÃO", "LABORATÓRIO",
  "MANUTENÇÃO BENEFICIAMENTO", "MANUTENÇÃO DA PRODUÇÃO",
  "PREPARAÇÃO", "REPASSE", "RETORCEDEIRAS",
];
function getSetores() {
  const fromFuncs = new Set();
  for (const f of (state.funcionarios || [])) {
    if (f.setor) fromFuncs.add(f.setor);
  }
  return fromFuncs.size > 0 ? [...fromFuncs].sort() : SETORES_FALLBACK;
}
// Compat: SETORES legado aponta pro fallback. Código novo usa getSetores().
const SETORES = SETORES_FALLBACK;

// Bloco de visualização: dados pessoais + trabalho + (opcional) PII / demissão.
// Renderizado ANTES do form de edição quando o funcionário já existe.
// Os campos vêm do pipeline RH; UI defensiva pra funcionários antigos
// (cadastrados antes do enriquecimento) que podem não ter todos os campos.
function renderFuncPerfilSecoes(f) {
  if (!f) return "";
  const nascStr = tsToDateStr(f.nascimento);
  const admStr = tsToDateStr(f.admissao);
  const demStr = tsToDateStr(f.demissao);
  const inativo = f.ativo === false;

  // Header com avatar grande + nome + cargo/setor/turno
  const turnoLabel = f.turno && TURNOS[f.turno] ? TURNOS[f.turno].label : null;

  const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);

  return `
    <div class="func-perfil-header">
      <div class="avatar avatar--lg" style="width:56px; height:56px; font-size:20px;">${initials(f.nome)}</div>
      <div style="flex:1; min-width:0;">
        <div class="func-perfil-header__nome">${escapeHtml(f.nome)}</div>
        <div class="func-perfil-header__sub">
          ${escapeHtml(f.cargo || "sem cargo")} · ${escapeHtml(f.setor || "sem setor")}${turnoLabel ? " · " + escapeHtml(turnoLabel) : ""}
        </div>
        ${f.codigo ? `<div class="text-xs muted" style="margin-top:2px;">cód: ${escapeHtml(f.codigo)}</div>` : ""}
      </div>
    </div>

    ${inativo && demStr ? `
      <div class="func-perfil-demitido">
        <span class="func-perfil-demitido__icon">${icon("alert")}</span>
        <div>
          <strong>Funcionário INATIVO</strong>
          <div class="text-xs" style="margin-top:2px;">Demitido em ${demStr}</div>
        </div>
      </div>
    ` : inativo ? `
      <div class="func-perfil-demitido">
        <span class="func-perfil-demitido__icon">${icon("alert")}</span>
        <strong>Funcionário INATIVO</strong>
      </div>
    ` : ""}

    <div class="func-perfil-secao">
      <div class="func-perfil-secao__titulo">Dados pessoais</div>
      <div class="func-perfil-grid">
        <div class="func-perfil-grid__item">
          <label>Idade</label>
          <span>${dash(f.idade ? `${f.idade} anos` : null)}</span>
        </div>
        <div class="func-perfil-grid__item">
          <label>Nascimento</label>
          <span>${dash(nascStr)}</span>
        </div>
        <div class="func-perfil-grid__item">
          <label>Sexo</label>
          <span>${dash(f.sexo)}</span>
        </div>
        <div class="func-perfil-grid__item">
          <label>Estado civil</label>
          <span>${dash(f.estadoCivil)}</span>
        </div>
        <div class="func-perfil-grid__item">
          <label>Grau de instrução</label>
          <span>${escapeHtml(dash(f.grauInstrucao))}</span>
        </div>
        <div class="func-perfil-grid__item">
          <label>Naturalidade</label>
          <span>${escapeHtml(dash(f.naturalidade))}</span>
        </div>
      </div>
    </div>

    <div class="func-perfil-secao">
      <div class="func-perfil-secao__titulo">Trabalho</div>
      <div class="func-perfil-grid">
        <div class="func-perfil-grid__item">
          <label>Cargo</label>
          <span>${escapeHtml(dash(f.cargo))}</span>
        </div>
        <div class="func-perfil-grid__item">
          <label>Admissão</label>
          <span>${dash(admStr)}</span>
        </div>
        <div class="func-perfil-grid__item">
          <label>Tempo de casa</label>
          <span>${tempoDeCasa(f.diasNaEmpresa)}</span>
        </div>
        <div class="func-perfil-grid__item" style="grid-column: span 2;">
          <label>Escala</label>
          <span>${escapeHtml(dash(f.escala))}</span>
        </div>
        <div class="func-perfil-grid__item">
          <label>Carga horária / semana</label>
          <span>${dash(f.cargaHorariaSemana ? `${f.cargaHorariaSemana}h` : null)}</span>
        </div>
        <div class="func-perfil-grid__item">
          <label>Carga horária / mês</label>
          <span>${dash(f.cargaHorariaMes ? `${f.cargaHorariaMes}h` : null)}</span>
        </div>
      </div>
    </div>

    <!-- Container vazio: preenchido async se user é admin/RH (PII vem de banco-horas-saldos) -->
    <div id="func-perfil-pii"></div>
  `;
}

function openFuncionarioModal(id) {
  const f = id ? state.funcionarios.find((x) => x.id === id) : null;
  const isNew = !f;
  const u = currentUser();
  const ehAdmin = u && u.role === "admin";
  // Só admin/RH editam o cadastro. Supervisor abre em modo leitura (vê o perfil).
  const podeEditarFunc = u && (u.role === "admin" || u.role === "rh");

  openModal(`
    <div class="modal__header">
      <div>
        <h2>${isNew ? "Novo funcionário" : "Perfil do funcionário"}</h2>
        <p>${isNew ? "Será incluído no cadastro." : podeEditarFunc ? "Dados vêm do ERP · campos editáveis abaixo." : "Dados vêm do ERP."}</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <div class="modal__body">
      ${isNew ? "" : renderFuncPerfilSecoes(f)}

      ${podeEditarFunc ? `
      <div class="func-perfil-secao" ${isNew ? "" : `style="border-top:1px solid var(--border); padding-top:14px; margin-top:4px;"`}>
        ${isNew ? "" : `<div class="func-perfil-secao__titulo">Editar (turno / setor / status)</div>`}
        <form id="func-form" onsubmit="return false">
          <div class="field">
            <label for="func-nome">Nome completo <span style="color:var(--danger)">*</span></label>
            <input type="text" id="func-nome" required value="${escapeHtml(f?.nome || "")}" ${!isNew ? "readonly style='background:var(--surface-warm); cursor:not-allowed;'" : ""} />
            ${!isNew ? `<span class="field__hint">Nome vem do ERP. Para alterar, ajuste lá.</span>` : ""}
          </div>
          <div class="field-row">
            <div class="field">
              <label for="func-codigo">Código/Matrícula</label>
              <input type="text" id="func-codigo" value="${escapeHtml(f?.codigo || "")}" placeholder="ex: 1234" ${!isNew ? "readonly style='background:var(--surface-warm); cursor:not-allowed;'" : ""} />
            </div>
            <div class="field">
              <label for="func-turno">Turno</label>
              <select id="func-turno">
                <option value="">— Sem turno —</option>
                ${[1, 2, 3, "geral"].map((t) => `<option value="${t}" ${f?.turno === t ? "selected" : ""}>${TURNOS[t].label} (${TURNOS[t].horario})</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field">
            <label for="func-setor">Setor</label>
            <select id="func-setor">
              <option value="">— Não definido —</option>
              ${getSetores().map((s) => `<option value="${s}" ${f?.setor === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
              ${f?.setor && !getSetores().includes(f.setor) ? `<option value="${escapeHtml(f.setor)}" selected>${escapeHtml(f.setor)} (legado)</option>` : ""}
            </select>
          </div>
          <div class="field">
            <label class="row" style="gap:8px; cursor:pointer;">
              <input type="checkbox" id="func-ativo" ${f?.ativo !== false ? "checked" : ""} />
              <span>Funcionário ativo</span>
            </label>
            <span class="field__hint">Inativos não aparecem no formulário de nova ocorrência.</span>
          </div>
          ${ehAdmin ? `
            <div class="field">
              <label class="row" style="gap:8px; cursor:pointer;">
                <input type="checkbox" id="func-bhexempt" ${f?.bhExempt ? "checked" : ""} />
                <span>Isento do banco de horas (pipeline ignora)</span>
              </label>
              <span class="field__hint">Marque pra funcionários que não devem ter saldo calculado (ex.: trainees, estagiários especiais).</span>
            </div>
          ` : ""}
        </form>
      </div>
      ` : ""}
    </div>
    <div class="modal__footer">
      ${podeEditarFunc && !isNew ? `<button class="btn btn--danger" id="btn-del-func">${icon("trash")}<span>Excluir</span></button>` : ""}
      <button class="btn btn--ghost" data-close>${podeEditarFunc ? "Cancelar" : "Fechar"}</button>
      ${podeEditarFunc ? `<button class="btn btn--primary" id="btn-save-func">${icon("check")}<span>${isNew ? "Criar" : "Salvar"}</span></button>` : ""}
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      if ($("#btn-save-func")) $("#btn-save-func").addEventListener("click", () => saveFuncionario(id));
      if (podeEditarFunc && !isNew && $("#btn-del-func")) $("#btn-del-func").addEventListener("click", () => deleteFuncionario(id));

      // Carrega PII async (admin/RH só) — UI mostra placeholder enquanto carrega.
      if (!isNew && (u.role === "admin" || u.role === "rh") && typeof window.lerSaldoSensivel === "function" && f?.codigo) {
        const pii = $("#func-perfil-pii");
        if (pii) {
          pii.innerHTML = `
            <div class="func-perfil-secao">
              <div class="func-perfil-secao__titulo">Dados sensíveis (admin/RH)</div>
              <div class="text-xs muted">carregando…</div>
            </div>`;
        }
        window.lerSaldoSensivel(f.codigo).then((dados) => {
          const cont = $("#func-perfil-pii");
          if (!cont) return; // modal fechou
          if (!dados) {
            cont.innerHTML = `
              <div class="func-perfil-secao">
                <div class="func-perfil-secao__titulo">Dados sensíveis (admin/RH)</div>
                <div class="text-xs muted">Sem dados em banco-horas-saldos pra este código.</div>
              </div>`;
            return;
          }
          const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);
          cont.innerHTML = `
            <div class="func-perfil-secao">
              <div class="func-perfil-secao__titulo">Dados sensíveis (admin/RH)</div>
              <div class="func-perfil-grid">
                <div class="func-perfil-grid__item">
                  <label>CPF</label>
                  <span>${escapeHtml(dash(dados.cpf))}</span>
                </div>
                <div class="func-perfil-grid__item">
                  <label>PIS</label>
                  <span>${escapeHtml(dash(dados.pis))}</span>
                </div>
                <div class="func-perfil-grid__item" style="grid-column: span 2;">
                  <label>Nome da mãe</label>
                  <span>${escapeHtml(dash(dados.nomeMae))}</span>
                </div>
              </div>
            </div>`;
        }).catch((e) => {
          console.warn("[func-modal] lerSaldoSensivel falhou:", e?.message || e);
          const cont = $("#func-perfil-pii");
          if (cont) cont.innerHTML = "";
        });
      }
    },
  });
}

function saveFuncionario(id) {
  const nome = $("#func-nome").value.trim();
  if (!nome || nome.length < 3) return toast("Nome muito curto.", "danger");

  const turnoStr = $("#func-turno").value;
  const dados = {
    nome,
    codigo: $("#func-codigo").value.trim() || null,
    turno: parseTurno(turnoStr),
    setor: $("#func-setor").value || null,
    ativo: $("#func-ativo").checked,
  };
  // bhExempt só aparece pra admin — se o checkbox existir, lê o valor
  const bhEl = $("#func-bhexempt");
  if (bhEl) dados.bhExempt = bhEl.checked;

  if (id) {
    const f = state.funcionarios.find((x) => x.id === id);
    Object.assign(f, dados);
  } else {
    const novoId = "f" + Date.now();
    state.funcionarios.push({ id: novoId, ...dados });
  }
  store.save(state);
  closeModal();
  toast(id ? "Funcionário atualizado." : "Funcionário criado.");
  renderApp();
}

function deleteFuncionario(id) {
  const f = state.funcionarios.find((x) => x.id === id);
  if (!f) return;
  const usado = state.ocorrencias.some((o) => o.funcionarioId === id);
  if (usado) {
    return toast("Este funcionário tem ocorrências. Marque como inativo no lugar.", "danger");
  }
  if (!confirm(`Excluir "${f.nome}" do cadastro?`)) return;
  state.funcionarios = state.funcionarios.filter((x) => x.id !== id);
  store.save(state);
  closeModal();
  toast("Funcionário excluído.");
  renderApp();
}

function openProfileModal() {
  const u = currentUser();
  if (!u) return;
  const isFirebaseMode = typeof window.alterarMinhaSenha === "function";
  const podeAlterarFoto = typeof window.atualizarMinhaFoto === "function";

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Minha conta</h2>
        <p>Configurações de perfil e sessão.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <div class="modal__body">
      <div class="row" style="gap:14px; padding: 12px 0 16px; align-items:center;">
        <div style="position:relative;">
          <div class="avatar avatar--lg" id="profile-avatar"></div>
          ${podeAlterarFoto ? `
            <button type="button" id="btn-alterar-foto"
                    title="Alterar foto"
                    style="position:absolute; bottom:-2px; right:-2px; width:28px; height:28px; border-radius:50%; background:var(--plum); color:#fff; border:2px solid var(--surface); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">
              ${icon("edit")}
            </button>
            <input type="file" id="input-foto" accept="image/*" style="display:none;" />
          ` : ""}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; color:var(--plum); font-size:16px;">${escapeHtml(u.nome)}</div>
          <div class="muted text-sm">${escapeHtml(u.email || "")}</div>
          <div class="text-xs muted" style="margin-top:2px;">${roleLabel(u)}</div>
          ${podeAlterarFoto && u.fotoBase64 ? `
            <button type="button" id="btn-remover-foto" class="text-xs"
                    style="background:none; border:none; color:var(--danger); cursor:pointer; padding:4px 0 0; font-weight:600;">
              Remover foto
            </button>
          ` : ""}
        </div>
      </div>
      <div id="foto-status" class="text-xs muted hidden" style="margin-bottom:8px;"></div>

      <div class="divider"></div>

      <div class="text-xs muted" style="margin: 12px 0 8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Segurança</div>
      <button class="btn btn--soft btn--block" id="btn-trocar-senha" ${!isFirebaseMode ? "disabled" : ""}>
        ${icon("settings")}<span>Alterar minha senha</span>
      </button>
      ${!isFirebaseMode ? `<span class="field__hint">Disponível só em modo Firebase.</span>` : ""}
    </div>
    <div class="modal__footer">
      <button class="btn btn--danger" id="btn-do-logout" style="margin-right:auto;">${icon("alert")}<span>Sair</span></button>
      <button class="btn btn--ghost" data-close>Fechar</button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      aplicarAvatar($("#profile-avatar"), u);
      $("#btn-do-logout").addEventListener("click", () => { closeModal(); logout(); });
      const trocar = $("#btn-trocar-senha");
      if (trocar && isFirebaseMode) trocar.addEventListener("click", openTrocarSenhaModal);

      if (!podeAlterarFoto) return;
      const status = $("#foto-status");
      const setStatus = (txt, danger = false) => {
        if (!status) return;
        status.textContent = txt || "";
        status.classList.toggle("hidden", !txt);
        status.style.color = danger ? "var(--danger)" : "";
      };

      $("#btn-alterar-foto").addEventListener("click", () => $("#input-foto").click());
      $("#input-foto").addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          return setStatus("Arquivo maior que 5MB. Escolha uma imagem menor.", true);
        }
        // Abre o cropper. Profile modal se fecha enquanto edita.
        openCropFotoModal(file, async (base64) => {
          try {
            await window.atualizarMinhaFoto(base64);
            aplicarAvatar($("#user-avatar"), currentUser());
            toast("Foto atualizada");
            openProfileModal();
          } catch (err) {
            toast("Erro ao salvar foto: " + (err?.message || err), "danger");
            openProfileModal();
          }
        });
      });

      const btnRm = $("#btn-remover-foto");
      if (btnRm) btnRm.addEventListener("click", async () => {
        if (!confirm("Remover sua foto de perfil?")) return;
        try {
          await window.atualizarMinhaFoto(null);
          closeModal();
          openProfileModal();
          aplicarAvatar($("#user-avatar"), currentUser());
        } catch (err) {
          setStatus("Erro: " + (err?.message || err), true);
        }
      });
    },
  });
}

function openTrocarSenhaModal() {
  openModal(`
    <div class="modal__header">
      <div>
        <h2>Alterar senha</h2>
        <p>Informe sua senha atual e a nova. Mínimo 6 caracteres.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="form-trocar-senha" onsubmit="return false">
      <div class="field">
        <label for="pw-current">Senha atual <span style="color:var(--danger)">*</span></label>
        <input type="password" id="pw-current" required autocomplete="current-password" />
      </div>
      <div class="field">
        <label for="pw-new">Nova senha <span style="color:var(--danger)">*</span></label>
        <input type="password" id="pw-new" required minlength="6" autocomplete="new-password" />
        <span class="field__hint">Use 6 caracteres ou mais. Misture letras e números pra mais segurança.</span>
      </div>
      <div class="field">
        <label for="pw-confirm">Confirmar nova senha <span style="color:var(--danger)">*</span></label>
        <input type="password" id="pw-confirm" required autocomplete="new-password" />
      </div>
      <div id="pw-error" class="field__error hidden"></div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-senha">${icon("check")}<span>Salvar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save-senha").addEventListener("click", trocarSenha);
      setTimeout(() => $("#pw-current").focus(), 100);
    },
  });
}

async function trocarSenha() {
  const atual = $("#pw-current").value;
  const nova = $("#pw-new").value;
  const confirm = $("#pw-confirm").value;
  const err = $("#pw-error");
  err.classList.add("hidden");

  if (!atual || !nova || !confirm) {
    err.textContent = "Preencha todos os campos.";
    err.classList.remove("hidden");
    return;
  }
  if (nova !== confirm) {
    err.textContent = "Nova senha e confirmação não batem.";
    err.classList.remove("hidden");
    return;
  }
  if (nova.length < 6) {
    err.textContent = "Senha precisa ter no mínimo 6 caracteres.";
    err.classList.remove("hidden");
    return;
  }

  const btn = $("#btn-save-senha");
  btn.disabled = true;
  const origHTML = btn.innerHTML;
  btn.innerHTML = icon("clock") + "<span>Alterando...</span>";

  const res = await window.alterarMinhaSenha(atual, nova);
  btn.disabled = false;
  btn.innerHTML = origHTML;

  if (!res.ok) {
    err.textContent = res.err || "Erro ao alterar.";
    err.classList.remove("hidden");
    return;
  }

  closeModal();
  toast("Senha alterada com sucesso!");
}

function openImportFuncModal() {
  openModal(`
    <div class="modal__header">
      <div>
        <h2>Importar funcionários</h2>
        <p>Selecione um arquivo <code>.json</code> com a lista. Estrutura esperada: <code>[{ codigo, nome, turno, liderNome, setor, ativo }, ...]</code></p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <div class="modal__body">
      <div class="field">
        <label for="import-file">Arquivo JSON <span style="color:var(--danger)">*</span></label>
        <input type="file" id="import-file" accept=".json,application/json" />
        <span class="field__hint">Em desenvolvimento local, se houver <code>mockup/funcionarios.json</code>, ele é carregado automaticamente.</span>
      </div>

      <div id="import-preview" style="margin-top:8px;"></div>

      <div class="field" style="margin-top:16px;">
        <label class="row" style="gap:8px; cursor:pointer;">
          <input type="checkbox" id="import-replace" />
          <span>Marcar ausentes como inativos (sincronização completa)</span>
        </label>
        <span class="field__hint">Desmarcado: só adiciona/atualiza. Marcado: também marca como <strong>inativo</strong> quem está cadastrado mas não veio no JSON (preserva histórico — ocorrências antigas continuam visíveis).</span>
      </div>
    </div>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-do-import" disabled>${icon("download")}<span>Importar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-do-import").addEventListener("click", doImportFuncionarios);

      $("#import-file").addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => parseAndPreview(ev.target.result, file.name);
        reader.onerror = () => {
          $("#import-preview").innerHTML = `
            <div class="field__error">
              ${icon("alert")} Erro ao ler o arquivo: ${reader.error?.message || "desconhecido"}
            </div>`;
        };
        reader.readAsText(file);
      });

      // Auto-fetch quando rodando local (file existe no servidor estático)
      fetch("funcionarios.json")
        .then((r) => r.ok ? r.text() : Promise.reject(new Error("404")))
        .then((text) => parseAndPreview(text, "funcionarios.json (carregado do servidor local)"))
        .catch(() => {
          if (!window._importData) {
            $("#import-preview").innerHTML = `
              <div class="text-sm muted" style="padding: 12px; background: var(--surface-warm); border-radius: var(--radius);">
                ${icon("alert")} Sem arquivo selecionado. Escolha o <code>funcionarios.json</code> do seu computador acima.
              </div>`;
          }
        });
    },
  });
}

function parseAndPreview(text, label) {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Esperado array JSON");
    window._importData = data;

    const turnos = { 1: 0, 2: 0, 3: 0, null: 0 };
    data.forEach((f) => {
      const t = f.turno ?? "null";
      turnos[t] = (turnos[t] || 0) + 1;
    });

    $("#import-preview").innerHTML = `
      <div class="detail-grid" style="margin-top:8px;">
        <div class="detail-cell">
          <label>Encontrados</label>
          <strong>${data.length} funcionários</strong>
        </div>
        <div class="detail-cell">
          <label>Origem</label>
          <strong style="font-size:12px;">${label}</strong>
        </div>
      </div>
      <div class="text-sm muted" style="margin-top:8px; line-height: 1.6;">
        Por turno: 1º (${turnos[1] || 0}) · 2º (${turnos[2] || 0}) · 3º (${turnos[3] || 0}) · Sem turno (${turnos["null"] || 0})<br/>
        Primeiros nomes: ${data.slice(0, 5).map((f) => f.nome).join(", ")}${data.length > 5 ? "..." : ""}
      </div>`;
    $("#btn-do-import").disabled = false;
  } catch (e) {
    $("#import-preview").innerHTML = `
      <div class="field__error">
        ${icon("alert")} JSON inválido: ${e.message}
      </div>`;
    $("#btn-do-import").disabled = true;
  }
}

function doImportFuncionarios() {
  const data = window._importData;
  if (!Array.isArray(data) || data.length === 0) return;

  const markAusentes = $("#import-replace").checked;

  // Conjunto dos códigos/ids que vieram no JSON, pra detectar ausentes
  const incomingIds = new Set();

  let novos = 0, atualizados = 0;
  for (const item of data) {
    const id = "f-" + (item.codigo || slugify(item.nome));
    incomingIds.add(id);
    const existing = state.funcionarios.find((x) => x.id === id || x.codigo === item.codigo);
    const dados = {
      nome: item.nome,
      codigo: item.codigo || null,
      turno: item.turno ?? null,
      liderNome: item.liderNome || null,
      setor: item.setor || null,
      ativo: item.ativo !== false,
    };
    if (existing) {
      incomingIds.add(existing.id);
      Object.assign(existing, dados);
      atualizados++;
    } else {
      state.funcionarios.push({ id, ...dados });
      novos++;
    }
  }

  let inativados = 0;
  if (markAusentes) {
    if (!confirm(`Marcar como inativos os funcionários que não estão no JSON? Eles continuam no cadastro, mas saem do form de Nova Ocorrência. Ocorrências antigas mantêm a referência.`)) return;
    for (const f of state.funcionarios) {
      if (!incomingIds.has(f.id) && f.ativo !== false) {
        f.ativo = false;
        inativados++;
      }
    }
  }

  store.save(state);
  closeModal();
  toast(`Import: ${novos} novos · ${atualizados} atualizados${markAusentes ? ` · ${inativados} inativados` : ""}.`);
  renderApp();
}

// ---------- Banco de Horas (todos) ----------

function renderBancoHoras() {
  const u = currentUser();
  $("#topbar-title").textContent = "Banco de Horas";

  // Escopo de visibilidade: admin/rh = todos, líder = turno, supervisor = lista
  let visibles = (state.funcionarios || []).filter((f) => f.ativo !== false && podeVerFuncionario(u, f));

  const totalFunc = visibles.length;
  // Por enquanto saldo vem do state (placeholder). Depois vem do Firestore /bancoHoras
  const bh = state.bancoHoras || {};
  const comSaldo = visibles.filter((f) => bh[f.id]).length;

  const subtitle = u.role === "lider"
    ? `Saldo de horas dos funcionários do ${u.turno}º turno.`
    : u.role === "supervisor"
    ? "Saldo de horas dos funcionários sob sua supervisão."
    : "Saldo de horas de todos os funcionários ativos.";

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>Banco de Horas</h1>
        <p>${subtitle}</p>
      </div>
    </header>

    <div class="stats">
      <div class="stat">
        <div class="stat__label">Funcionários ativos</div>
        <div class="stat__value">${totalFunc}</div>
        <div class="stat__hint">${u.role === "lider" ? `turno ${u.turno}` : u.role === "supervisor" ? "sob sua supervisão" : "inativos não aparecem aqui"}</div>
      </div>
      <div class="stat">
        <div class="stat__label">Com saldo registrado</div>
        <div class="stat__value">${comSaldo}</div>
        <div class="stat__hint">vindos de import</div>
      </div>
      ${(() => {
        const ultima = formatUltimaAtualizacao(
          Object.values(bh).map((b) => b.atualizadoEm)
        );
        return `
      <div class="stat">
        <div class="stat__label">Última atualização</div>
        <div class="stat__value" style="font-size: 16px;">${ultima.value}</div>
        <div class="stat__hint">${ultima.hint}</div>
      </div>`;
      })()}
    </div>

    <div class="toolbar">
      <div class="toolbar__search">
        ${icon("search")}
        <input type="text" id="bh-search" placeholder="Buscar funcionário..." />
      </div>
    </div>

    <div id="bh-list"></div>
  `;

  if ($("#btn-import-bh")) {
    $("#btn-import-bh").addEventListener("click", openImportBancoHorasModal);
  }
  $("#bh-search").addEventListener("input", debounce(() => renderBHList(visibles), 150));
  renderBHList(visibles);
}

function renderBHList(funcionarios) {
  const search = ($("#bh-search")?.value || "").toLowerCase();
  let list = [...funcionarios];
  if (search) {
    list = list.filter((f) =>
      f.nome.toLowerCase().includes(search) ||
      (f.codigo || "").toLowerCase().includes(search)
    );
  }
  list.sort((a, b) => a.nome.localeCompare(b.nome));

  const bh = state.bancoHoras || {};
  const root = $("#bh-list");

  if (list.length === 0) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty__icon">${icon("clock")}</div>
        <h3>Nenhum funcionário</h3>
        <p>Ajuste a busca ou cadastre funcionários primeiro.</p>
      </div>`;
    return;
  }

  // "—" pra valor vazio/null. Dados enriquecidos vêm do funcionário (f.*),
  // sempre populado; fallback no doc de saldo (bh[f.id]) pro caso de líder
  // cuja /bancoHoras o pipeline denormalizou.
  const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);

  root.innerHTML = `<div class="list">${list.map((f) => {
    const saldo = bh[f.id];
    const saldoStr = saldo
      ? formatSaldoHoras(saldo.minutos)
      : "—";
    const ultima = saldo?.atualizadoEm
      ? formatDate((typeof saldo.atualizadoEm === "string" ? saldo.atualizadoEm : "").slice(0, 10) || null)
      : "sem dado";
    const tone = saldo
      ? (saldo.minutos > 0 ? "success" : saldo.minutos < 0 ? "danger" : "neutral")
      : "neutral";

    // Campos enriquecidos (ERP via pipeline). f.* prioritário, saldo.* fallback.
    const cargo = f.cargo || saldo?.cargo || "";
    const setor = f.setor || saldo?.setor || "";
    const escala = f.escala || saldo?.escala || "";
    const idade = f.idade ?? saldo?.idade ?? null;
    const niver = f.aniversarioDM || saldo?.aniversarioDM || "";
    const dias = f.diasNaEmpresa ?? saldo?.diasNaEmpresa ?? null;

    // Linha cargo · setor
    const cargoSetor = [cargo, setor].filter(Boolean).join(" · ");
    // Linha idade · niver · tempo de casa
    const metaPartes = [];
    if (idade != null) metaPartes.push(`${idade} anos`);
    if (niver) metaPartes.push(`Niver: ${escapeHtml(niver)}`);
    if (dias != null) metaPartes.push(`${tempoDeCasa(dias)} de casa`);
    const metaLinha = metaPartes.join(" · ");

    return `
      <article class="occ bh-card" style="grid-template-columns: 44px 1fr auto;">
        <div class="avatar">${initials(f.nome)}</div>
        <div class="occ__main" style="min-width:0;">
          <div class="occ__name">${escapeHtml(f.nome)}</div>
          <div class="occ__sub">${cargoSetor ? escapeHtml(cargoSetor) : (TURNOS[f.turno]?.label || "sem turno")}</div>
          ${escala ? `<div class="bh-card__escala">Escala: ${escapeHtml(escala)}</div>` : ""}
          ${metaLinha ? `<div class="bh-card__meta">${metaLinha}</div>` : ""}
        </div>
        <div style="text-align: right; align-self: start;">
          <span class="badge badge--${tone}" style="font-family: var(--font-display); font-size: 13px; font-weight: 700;">${saldoStr}</span>
          <div class="text-xs muted" style="margin-top: 2px;">${ultima}</div>
        </div>
      </article>
    `;
  }).join("")}</div>`;
}

function formatSaldoHoras(minutos) {
  if (minutos == null) return "—";
  const sinal = minutos < 0 ? "-" : (minutos > 0 ? "+" : "");
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${h}h${m.toString().padStart(2, "0")}`;
}

function openImportBancoHorasModal() {
  openModal(`
    <div class="modal__header">
      <div>
        <h2>Importar Banco de Horas</h2>
        <p>Lê o XLSX exportado pelo sistema de ponto e substitui o saldo de todos os funcionários encontrados. Match por código.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <div class="modal__body">
      <div class="field">
        <label for="bh-file">Arquivo Excel <span style="color:var(--danger)">*</span></label>
        <input type="file" id="bh-file" accept=".xlsx,.xls" />
        <span class="field__hint">Formato esperado: colunas <code>Cód. Emp.</code>, <code>Nome</code>, <code>Saldo Atual</code> (HH:MM:SS). Cabeçalho na linha 5.</span>
      </div>

      <div id="bh-import-preview" style="margin-top:8px;"></div>
    </div>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-do-bh-import" disabled>${icon("download")}<span>Substituir saldos</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#bh-file").addEventListener("change", (e) => handleBancoHorasFile(e.target.files?.[0]));
      $("#btn-do-bh-import").addEventListener("click", doImportBancoHoras);
    },
  });
}

// Converte "HH:MM:SS" ou "-HH:MM:SS" pra minutos (inteiro, arredonda segundos)
function parseSaldoToMinutos(saldoStr) {
  if (saldoStr == null) return 0;
  const s = String(saldoStr).trim();
  if (!s) return 0;
  const negative = s.startsWith("-");
  const parts = s.replace(/^-/, "").split(":").map((x) => Number(x) || 0);
  const [h = 0, m = 0, sec = 0] = parts;
  const totalMin = h * 60 + m + Math.round(sec / 60);
  return negative ? -totalMin : totalMin;
}

async function handleBancoHorasFile(file) {
  const preview = $("#bh-import-preview");
  if (!file) {
    preview.innerHTML = "";
    $("#btn-do-bh-import").disabled = true;
    return;
  }

  preview.innerHTML = `<div class="row" style="gap:8px; padding:12px;">${icon("clock")}<span>Lendo arquivo...</span></div>`;

  try {
    await loadXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

    // Acha linha de cabeçalho (procura "Cód" + "Nome" + "Saldo")
    let headerRow = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const r = rows[i] || [];
      const joined = r.join("|").toLowerCase();
      if (joined.includes("cód") && joined.includes("nome") && joined.includes("saldo")) {
        headerRow = i;
        break;
      }
    }
    if (headerRow === -1) throw new Error('Cabeçalho não encontrado. Procurando "Cód. Emp.", "Nome", "Saldo Atual".');

    // Detecta colunas
    const headers = rows[headerRow];
    const idxCodigo = headers.findIndex((h) => String(h || "").toLowerCase().includes("cód"));
    const idxNome = headers.findIndex((h) => String(h || "").toLowerCase() === "nome");
    const idxSaldo = headers.findIndex((h) => String(h || "").toLowerCase().includes("saldo"));

    // Linhas de dados
    const entries = [];
    for (let i = headerRow + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const codigo = r[idxCodigo] != null ? String(r[idxCodigo]).trim() : "";
      const nome = r[idxNome] != null ? String(r[idxNome]).trim() : "";
      const saldoStr = r[idxSaldo] != null ? String(r[idxSaldo]).trim() : "";
      if (!codigo || !nome) continue;
      entries.push({
        codigo,
        nome,
        saldoStr,
        minutos: parseSaldoToMinutos(saldoStr),
      });
    }

    // Match com funcionarios cadastrados, separando ativos/inativos
    const semMatch = [];
    const matchInativos = [];
    let positivos = 0, negativos = 0, zerados = 0;
    entries.forEach((e) => {
      const f = state.funcionarios.find((x) => x.codigo === e.codigo);
      e.funcionarioId = f?.id || null;
      e.inativo = f?.ativo === false;
      if (!f) semMatch.push(e);
      else if (f.ativo === false) matchInativos.push(e);
      if (e.minutos > 0) positivos++;
      else if (e.minutos < 0) negativos++;
      else zerados++;
    });

    const matchAtivos = entries.length - semMatch.length - matchInativos.length;
    window._bhImportEntries = entries;

    preview.innerHTML = `
      <div class="detail-grid" style="margin-top:8px;">
        <div class="detail-cell">
          <label>Linhas lidas</label>
          <strong>${entries.length}</strong>
        </div>
        <div class="detail-cell">
          <label>Funcionários ativos</label>
          <strong>${matchAtivos}</strong>
        </div>
      </div>
      <div class="text-sm muted" style="margin-top:8px; line-height:1.6;">
        Saldos: positivo (${positivos}) · negativo (${negativos}) · zerado (${zerados})<br/>
        ${matchInativos.length > 0 ? `
          <span style="color: var(--muted);">ℹ ${matchInativos.length} código(s) de funcionário(s) <strong>inativo(s)</strong> — saldo será gravado mas não aparece na listagem do Banco de Horas.</span><br/>
        ` : ""}
        ${semMatch.length > 0 ? `
          <span style="color: var(--warning);">${semMatch.length} código(s) não cadastrado(s) — serão ignorados: ${semMatch.slice(0, 5).map(e => e.codigo).join(", ")}${semMatch.length > 5 ? "..." : ""}</span>
        ` : (matchInativos.length === 0 ? `<span style="color: var(--success);">Todos os funcionários têm correspondência no cadastro.</span>` : "")}
      </div>
    `;

    $("#btn-do-bh-import").disabled = false;
  } catch (err) {
    preview.innerHTML = `<div class="field__error">${icon("alert")} ${err.message}</div>`;
    $("#btn-do-bh-import").disabled = true;
  }
}

async function doImportBancoHoras() {
  const entries = window._bhImportEntries;
  if (!Array.isArray(entries) || entries.length === 0) return;
  const u = currentUser();
  const valid = entries.filter((e) => e.funcionarioId);
  if (valid.length === 0) return toast("Nenhum funcionário com match.", "danger");
  if (!confirm(`Substituir o saldo de ${valid.length} funcionários? Os saldos anteriores serão sobrescritos.`)) return;

  // Em demo (sem Firebase), guarda em state.bancoHoras (mapa)
  if (typeof window.doImportBancoHorasFirebase === "function") {
    await window.doImportBancoHorasFirebase(valid);
    return;
  }

  state.bancoHoras = {};
  for (const e of valid) {
    state.bancoHoras[e.funcionarioId] = {
      minutos: e.minutos,
      saldoFormatado: e.saldoStr,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: u.id,
    };
  }
  store.save(state);
  closeModal();
  toast(`${valid.length} saldos atualizados.`);
  renderApp();
}

// Carrega SheetJS sob demanda (cache 7 dias via header do firebase.json)
let _xlsxLoading = null;
function loadXLSX() {
  if (typeof XLSX !== "undefined") return Promise.resolve();
  if (_xlsxLoading) return _xlsxLoading;
  _xlsxLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar SheetJS — sem internet?"));
    document.head.appendChild(s);
  });
  return _xlsxLoading;
}

// ---------- Controle PJ (Admin/RH) ----------

function renderControlePJ() {
  const u = currentUser();
  if (u.role !== "admin" && u.role !== "rh") {
    state.view.page = "dashboard";
    return renderApp();
  }
  $("#topbar-title").textContent = "Controle PJ";

  const pjs = state.pjs || [];

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>Controle PJ</h1>
        <p>Prestadores de serviço da Fiobras. Contratos, valores e arquivos.</p>
      </div>
      <button class="btn btn--primary" id="btn-novo-pj">${icon("plus")}<span>Novo PJ</span></button>
    </header>

    <div class="toolbar">
      <div class="toolbar__search">
        ${icon("search")}
        <input type="text" id="pj-search" placeholder="Buscar por nome, CNPJ ou tipo..." />
      </div>
      <select id="pj-status-filter">
        <option value="">Todos os status</option>
        <option value="ativo">Ativos</option>
        <option value="suspenso">Suspensos</option>
        <option value="encerrado">Encerrados</option>
      </select>
    </div>

    <div id="pj-list"></div>
  `;

  $("#btn-novo-pj").addEventListener("click", () => openPJModal(null));
  $("#pj-search").addEventListener("input", debounce(renderPJList, 150));
  $("#pj-status-filter").addEventListener("change", renderPJList);
  renderPJList();
}

function renderPJList() {
  const u = currentUser();
  const search = ($("#pj-search")?.value || "").toLowerCase();
  const filter = $("#pj-status-filter")?.value || "";

  let list = [...(state.pjs || [])];
  if (search) {
    list = list.filter((p) =>
      (p.nome || "").toLowerCase().includes(search) ||
      (p.razaoSocial || "").toLowerCase().includes(search) ||
      (p.cnpj || "").includes(search) ||
      (p.tipoServico || "").toLowerCase().includes(search)
    );
  }
  if (filter) list = list.filter((p) => p.status === filter);

  list.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

  const root = $("#pj-list");
  if (list.length === 0) {
    const semFiltro = !search && !filter;
    root.innerHTML = `
      <div class="empty">
        <div class="empty__icon">${icon("file")}</div>
        <h3>${semFiltro ? "Nenhum PJ cadastrado" : "Sem resultados"}</h3>
        <p>${semFiltro
          ? "Cadastre o primeiro prestador de serviço com contratos, valores e contato."
          : "Ajuste a busca ou o filtro."}</p>
        ${semFiltro ? `<button class="btn btn--primary" id="btn-novo-pj-2">${icon("plus")}<span>Novo PJ</span></button>` : ""}
      </div>`;
    const b = $("#btn-novo-pj-2");
    if (b) b.addEventListener("click", () => openPJModal(null));
    return;
  }

  root.innerHTML = `<div class="list">${list.map((p) => {
    const statusBadge = p.status === "ativo" ? "success" : p.status === "suspenso" ? "warning" : "neutral";
    const periodObj = PERIODICIDADES_PJ.find((x) => x.id === p.periodicidade);
    const valor = p.valorAtual
      ? formatMoeda(p.valorAtual) + (periodObj?.sufixo || "")
      : "—";
    const periodicidade = periodObj?.label || p.periodicidade || "";

    const precisaReajuste = pjPrecisaReajuste(p);
    const userPodeReajustar = u && (u.role === "admin" || u.role === "rh");
    const podeMostrarBotaoReajuste = userPodeReajustar && p.status === "ativo";
    return `
      <article class="occ" style="grid-template-columns: 44px 1fr auto auto auto auto;" data-pj="${p.id}">
        <div class="avatar">${initials(p.nome || "?")}</div>
        <div class="occ__main">
          <div class="occ__name">
            ${escapeHtml(p.nome || "(sem nome)")}
            ${precisaReajuste ? `<span class="badge badge--warning" style="margin-left:8px; font-size:10px;"><span class="dot"></span>REAJUSTE PENDENTE</span>` : ""}
          </div>
          <div class="occ__sub">
            ${p.tipoServico ? `<span class="badge badge--neutral">${escapeHtml(p.tipoServico)}</span>` : ""}
            ${p.cnpj ? `<span class="dot"></span><span>${escapeHtml(p.cnpj)}</span>` : ""}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: var(--font-display); font-weight: 700; color: var(--plum); font-size: 15px;">${valor}</div>
          <div class="text-xs muted">${periodicidade}</div>
        </div>
        ${p.contratoUrl
          ? `<a href="${p.contratoUrl}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm" data-stop="1" title="Abrir contrato no Drive">${icon("file")}<span>Contrato</span></a>`
          : `<span class="text-xs muted" style="text-align:center;">sem contrato</span>`}
        ${podeMostrarBotaoReajuste
          ? (precisaReajuste
              ? `<button class="btn btn--primary btn--sm" data-stop="1" data-reajustar="${p.id}" title="Aplicar reajuste IPCA do ciclo atual">${icon("check")}<span>Reajustar</span></button>`
              : `<button class="btn btn--ghost btn--sm" data-stop="1" data-reajustar="${p.id}" title="Aplicar reajuste extra (fora do ciclo anual)">${icon("plus")}<span>Reajuste</span></button>`)
          : `<span class="badge badge--${statusBadge}" style="text-transform: uppercase;">${p.status || "—"}</span>`}
        <svg class="icon occ__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </article>
    `;
  }).join("")}</div>`;

  $$("#pj-list .occ").forEach((el) => {
    el.addEventListener("click", (e) => {
      // Não abre o modal se clicou no link do contrato ou botão "Reajustar"
      if (e.target.closest("[data-stop]")) return;
      openPJModal(el.dataset.pj);
    });
  });
  $$("[data-reajustar]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openReajusteModal(btn.dataset.reajustar);
    });
  });
}

function formatMoeda(valor) {
  if (valor == null) return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------- Reajuste anual ----------
// Data fixa: 15 de janeiro. Todos os PJs ativos passam por reajuste IPCA.
const REAJUSTE_MES = 0;  // 0 = janeiro
const REAJUSTE_DIA = 15;

function dataReajusteDoAno(ano) {
  return new Date(ano, REAJUSTE_MES, REAJUSTE_DIA);
}

// Retorna o ano de reajuste mais recente que JÁ passou (ou tá vigente).
// Se hoje é 10/01/2027, retorna 2026 (ainda não chegou 15/01/2027).
// Se hoje é 20/01/2027, retorna 2027.
function ultimoAnoReajusteVigente() {
  const hoje = new Date();
  const dataDoAno = dataReajusteDoAno(hoje.getFullYear());
  return hoje >= dataDoAno ? hoje.getFullYear() : hoje.getFullYear() - 1;
}

// Próximo reajuste (sempre futuro)
function proximoReajuste() {
  const hoje = new Date();
  const dataDoAno = dataReajusteDoAno(hoje.getFullYear());
  return hoje < dataDoAno ? dataDoAno : dataReajusteDoAno(hoje.getFullYear() + 1);
}

// Próximo reajuste em formato ISO ("YYYY-01-15") pra input type="date"
function proximoReajusteISO() {
  const d = proximoReajuste();
  const y = d.getFullYear();
  return `${y}-01-15`;
}

// Já passou pelo reajuste do ano vigente?
function pjJaReajustadoNoAno(pj, ano) {
  if (!pj.historicoValores?.length) return false;
  // Procura entrada no histórico com data >= 15/01 do ano e motivo de reajuste
  const limite = dataReajusteDoAno(ano).toISOString().slice(0, 10);
  return pj.historicoValores.some(
    (h) => h.data >= limite && (h.motivo || "").toLowerCase().includes("reajuste")
  );
}

// Janela de alerta de reajuste: 15 dias antes do 15/01 e 30 dias depois.
// Fora dessa janela, o sistema não chama atenção (mesmo se esquecido).
function janelaReajuste() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const dataAtual = dataReajusteDoAno(ano);
  const inicio = new Date(dataAtual); inicio.setDate(inicio.getDate() - 15);
  const fim = new Date(dataAtual); fim.setDate(fim.getDate() + 30);
  return { dentro: hoje >= inicio && hoje <= fim, inicio, fim, ano };
}

// PJ ativo + dentro da janela de alerta + ainda não reajustado no ano corrente
function pjPrecisaReajuste(pj) {
  if (pj.status !== "ativo") return false;
  const j = janelaReajuste();
  if (!j.dentro) return false;
  return !pjJaReajustadoNoAno(pj, j.ano);
}

function diasParaReajuste() {
  const ms = proximoReajuste() - new Date();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ---------- Férias dos PJs ----------
// Modelo simplificado: sistema acumula automaticamente conforme tempo
// de contrato. RH só registra baixas (uso ou venda) com data + dias.

// Meses completos entre 2 datas (estilo calendário, não 30 dias fixos)
function mesesCompletos(d1, d2) {
  if (!(d1 instanceof Date)) d1 = new Date(d1 + "T00:00:00");
  if (!(d2 instanceof Date)) d2 = new Date(d2 + "T00:00:00");
  if (d2 < d1) return 0;
  let meses = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (d2.getDate() < d1.getDate()) meses--;
  return Math.max(0, meses);
}

// Dias de férias acumulados desde o início do contrato até hoje
// Regra: diasPorAno * (meses_completos / 12), proporcional mês a mês.
function feriasAcumuladas(pj) {
  if (!pj.temFerias) return 0;
  const inicio = pj.dataInicio || pj.inicioDireitoFerias; // legado: respeita campo antigo
  if (!inicio) return 0;
  const diasPorAno = Number(pj.diasFeriasAno) || 30;
  const meses = mesesCompletos(inicio, new Date());
  return Math.floor((meses / 12) * diasPorAno);
}

function feriasUsadas(pj) {
  if (!pj.ferias?.length) return { gozadas: 0, vendidas: 0 };
  let gozadas = 0, vendidas = 0;
  for (const f of pj.ferias) {
    const dias = Number(f.dias) || 0;
    if (f.tipo === "vendidas") vendidas += dias;
    else gozadas += dias;
  }
  return { gozadas, vendidas };
}

function resumoFerias(pj) {
  const acumulado = feriasAcumuladas(pj);
  const { gozadas, vendidas } = feriasUsadas(pj);
  const usados = gozadas + vendidas;
  const saldo = acumulado - usados;
  return { acumulado, gozadas, vendidas, usados, saldo };
}

function openPJModal(id) {
  const pj = id ? (state.pjs || []).find((p) => p.id === id) : null;
  const isNew = !pj;

  openModal(`
    <div class="modal__header">
      <div>
        <h2>${isNew ? "Novo PJ" : pj.nome}</h2>
        <p>${isNew ? "Cadastre um novo prestador de serviço." : "Detalhes, contratos e histórico."}</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <div id="modal-colab-banner" class="modal-colab-banner" style="display:none;"></div>
    <form class="modal__body" id="pj-form" onsubmit="return false">
      ${isNew ? `
        <div style="background: var(--surface-warm); border-left: 3px solid var(--primary); padding: 10px 12px; border-radius: var(--radius); margin-bottom: 12px;">
          <div style="font-weight: 600; font-size: 13px;">Comece pelo contrato</div>
          <div class="text-xs muted" style="margin-top: 2px;">Suba o PDF que o sistema detecta CNPJ, valor, nome e início automaticamente.</div>
        </div>
      ` : ""}

      <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Contrato</div>
      <div class="field">
        <label for="pj-contrato-url">Link do contrato (Google Drive)</label>
        <input type="url" id="pj-contrato-url" value="${pj?.contratoUrl || ""}" placeholder="https://drive.google.com/file/d/..." />
        <span class="field__hint">Cole o link manualmente OU use o botão abaixo pra subir o PDF direto pro Drive da Fiobras (o sistema lê e preenche os campos automaticamente).</span>
      </div>

      <input type="file" id="pj-contrato-file" accept=".pdf,.docx,.doc" style="display:none;" />
      <button type="button" class="btn ${isNew ? "btn--primary" : "btn--soft"} btn--block" id="btn-upload-drive">
        ${icon("upload")}<span>Upload contrato</span>
      </button>

      ${pj?.contratoUrl ? `
        <div style="background: var(--surface-warm); border-radius: var(--radius); padding: 12px; margin-top: 8px;">
          <a href="${pj.contratoUrl}" target="_blank" rel="noopener" class="btn btn--soft btn--block">
            ${icon("file")}<span>Abrir contrato atual</span>
          </a>
        </div>
      ` : ""}

      <div class="divider"></div>

      <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Identificação</div>
      <div class="field">
        <label for="pj-nome">Nome / Razão social <span style="color:var(--danger)">*</span></label>
        <input type="text" id="pj-nome" required maxlength="120" value="${pj?.nome || ""}" placeholder="Ex: Aceres Branding" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="pj-cnpj">CNPJ</label>
          <input type="text" id="pj-cnpj" maxlength="20" value="${pj?.cnpj || ""}" placeholder="00.000.000/0001-00" />
        </div>
        <div class="field">
          <label for="pj-tipo">Tipo de serviço</label>
          <input type="text" id="pj-tipo" list="pj-tipos-list" value="${pj?.tipoServico || ""}" placeholder="Marketing, Contábil..." />
          <datalist id="pj-tipos-list">
            ${TIPOS_PJ.map((t) => `<option value="${t}">`).join("")}
          </datalist>
        </div>
      </div>

      <div class="divider"></div>

      <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Financeiro</div>
      <div class="field-row">
        <div class="field">
          <label for="pj-valor">Valor (R$) <span id="pj-valor-sufixo" class="muted text-xs"></span></label>
          <input type="number" id="pj-valor" step="0.01" min="0" value="${pj?.valorAtual ?? ""}" placeholder="3500.00" />
        </div>
        <div class="field">
          <label for="pj-periodicidade">Periodicidade</label>
          <select id="pj-periodicidade">
            ${PERIODICIDADES_PJ.map((p) => `<option value="${p.id}" ${pj?.periodicidade === p.id ? "selected" : ""}>${p.label}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="pj-data-inicio">Início do contrato</label>
          <input type="date" id="pj-data-inicio" value="${pj?.dataInicio || ""}" />
        </div>
        <div class="field">
          <label for="pj-data-revisao">Próxima revisão</label>
          <input type="date" id="pj-data-revisao" value="${pj?.dataProximaRevisao || proximoReajusteISO()}" />
          <span class="field__hint">Padrão: 15/01 — data anual de reajuste IPCA. O sistema avança sozinho a cada reajuste aplicado.</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Operacional</div>
      <div class="field">
        <label for="pj-status">Status</label>
        <select id="pj-status">
          <option value="ativo" ${(!pj || pj.status === "ativo") ? "selected" : ""}>Ativo</option>
          <option value="suspenso" ${pj?.status === "suspenso" ? "selected" : ""}>Suspenso</option>
          <option value="encerrado" ${pj?.status === "encerrado" ? "selected" : ""}>Encerrado</option>
        </select>
      </div>

      <div class="divider"></div>

      <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Direito a férias</div>
      <label class="toggle__row">
        <label class="toggle">
          <input type="checkbox" id="pj-tem-ferias" ${pj?.temFerias ? "checked" : ""} />
          <span class="toggle__slider"></span>
        </label>
        <div>
          <div style="font-weight: 600;">Tem direito a férias remuneradas</div>
          <div class="text-xs muted">Ativar pra controlar dias acumulados, gozados e vendidos.</div>
        </div>
      </label>

      <div id="pj-ferias-fields" style="display: ${pj?.temFerias ? "block" : "none"}; margin-top: 8px;">
        <div class="field">
          <label for="pj-dias-ano">Dias por ano</label>
          <input type="number" id="pj-dias-ano" min="1" max="365" value="${pj?.diasFeriasAno ?? 30}" />
          <span class="field__hint">CLT padrão: 30 dias. O sistema acumula proporcionalmente a partir do <strong>início do contrato</strong> (acima).</span>
        </div>
      </div>

      ${!isNew && pj?.temFerias ? `
        <div class="divider"></div>
        <div class="row row--between" style="margin-bottom: 8px;">
          <div class="text-xs muted" style="font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Férias — controle de dias</div>
          <button type="button" class="btn btn--ghost btn--sm" id="btn-add-ferias">${icon("plus")}<span>Dar baixa</span></button>
        </div>
        <div id="pj-ferias-list" style="margin-bottom: 8px;"></div>
      ` : ""}

      ${!isNew && pj.historicoValores?.length ? `
        <div class="divider"></div>
        <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Histórico de valores</div>
        <div class="timeline">
          ${pj.historicoValores.slice().reverse().map((h, i) => `
            <div class="timeline__item ${i === 0 ? "" : "done"}">
              <div class="timeline__item-title">${formatMoeda(h.valor)}</div>
              <div class="timeline__item-meta">${formatDateFull(h.data)} · ${escapeHtml(getUser(h.por)?.nome || h.por || "—")}${h.motivo ? " · " + escapeHtml(h.motivo) : ""}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}

      ${!isNew ? `
        <div class="divider"></div>
        <div class="row row--between" style="margin-bottom: 8px;">
          <div class="text-xs muted" style="font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">
            Aditivos contratuais <span id="pj-aditivos-count" style="opacity:.7;"></span>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" id="btn-add-aditivo">${icon("plus")}<span>Adicionar</span></button>
        </div>
        <div id="pj-aditivos-list" style="margin-bottom: 8px;"></div>

        <div id="pj-aditivo-form" style="display:none; background: var(--surface-warm); border-radius: var(--radius); padding: 12px; margin-top: 8px;">
          <div class="field-row">
            <div class="field">
              <label for="aditivo-data">Data do aditivo <span style="color:var(--danger)">*</span></label>
              <input type="date" id="aditivo-data" required />
            </div>
            <div class="field">
              <label for="aditivo-vigencia">Vigência (opcional)</label>
              <input type="date" id="aditivo-vigencia" />
              <span class="field__hint">Quando passa a valer. Vazio = mesma data acima.</span>
            </div>
          </div>
          <div class="field">
            <label for="aditivo-desc">Descrição / motivo <span style="color:var(--danger)">*</span></label>
            <input type="text" id="aditivo-desc" maxlength="200" placeholder="Reajuste IPCA 5.5%, inclusão de escopo, prorrogação..." />
          </div>
          <div class="field">
            <label for="aditivo-url">Link do aditivo (Google Drive)</label>
            <input type="url" id="aditivo-url" placeholder="https://drive.google.com/file/d/..." />
          </div>
          <input type="file" id="aditivo-file" accept=".pdf,.docx,.doc" style="display:none;" />
          <button type="button" class="btn btn--soft btn--block" id="btn-upload-aditivo">
            ${icon("upload")}<span>Upload PDF do aditivo</span>
          </button>
          <div style="display:flex; gap:8px; margin-top:10px; justify-content:flex-end;">
            <button type="button" class="btn btn--ghost btn--sm" id="btn-cancel-aditivo">Cancelar</button>
            <button type="button" class="btn btn--primary btn--sm" id="btn-save-aditivo">${icon("check")}<span>Salvar aditivo</span></button>
          </div>
        </div>
      ` : ""}
    </form>

    <div class="modal__footer">
      ${!isNew ? `<button class="btn btn--danger" id="btn-del-pj" style="margin-right:auto;">${icon("trash")}<span>Excluir</span></button>` : ""}
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-pj">${icon("check")}<span>${isNew ? "Cadastrar" : "Salvar"}</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save-pj").addEventListener("click", () => savePJ(id));
      if (!isNew) $("#btn-del-pj").addEventListener("click", () => deletePJ(id));

      // EDIÇÃO COLABORATIVA REAL (Firestore-backed)
      // 1) Sinaliza pra outros users que estou editando este PJ
      // 2) Escuta mudanças do doc /pj/{id} pra notificar
      if (!isNew && id) {
        const bannerEl = document.getElementById("modal-colab-banner");
        if (bannerEl) bannerEl.dataset.pjid = id;
      }
      if (!isNew && id && window.setarPJEditando && window.iniciarEscutaPJ) {
        window.setarPJEditando(id);
        window.iniciarEscutaPJ(id, (dadosAtualizados) => {
          // Outro user salvou alterações
          const autorId = dadosAtualizados.atualizadoPor;
          const autor =
            (state.users || []).find((x) => x.id === autorId) ||
            (state.presence || []).find((p) => p.uid === autorId) ||
            { uid: autorId, nome: "Outro usuário" };
          const autorObj = { id: autor.id || autor.uid, nome: autor.nome };

          // Detecta o que mudou comparando com state local
          const local = (state.pjs || []).find((p) => p.id === id) || {};
          const mudancas = [];
          if (local.valorAtual !== dadosAtualizados.valorAtual)
            mudancas.push(`valor → ${formatMoeda(dadosAtualizados.valorAtual)}`);
          if (local.status !== dadosAtualizados.status)
            mudancas.push(`status → ${dadosAtualizados.status}`);
          if (local.dataProximaRevisao !== dadosAtualizados.dataProximaRevisao)
            mudancas.push(`próxima revisão`);
          if (local.contratoUrl !== dadosAtualizados.contratoUrl)
            mudancas.push(`contrato`);

          const msg = mudancas.length
            ? `atualizou: ${mudancas.join(", ")}`
            : "salvou alterações neste PJ";
          if (typeof notificarEdicaoColab === "function") {
            notificarEdicaoColab(autorObj, msg + " — feche e reabra pra ver");
          }

          // Atualiza state local com os novos dados
          if (local) Object.assign(local, dadosAtualizados);
        });
      }

      // Atualiza banner de "outros editando" quando state.presence muda
      // (renderPresence é chamado automaticamente pelo onSnapshot)
      atualizarBannerColabModal(id);

      // Atualiza sufixo do label de valor conforme periodicidade
      const updateValorLabel = () => {
        const period = PERIODICIDADES_PJ.find(p => p.id === $("#pj-periodicidade").value);
        const sufixo = period?.sufixo || (period?.id === "mensal" ? "/mês" : "");
        $("#pj-valor-sufixo").textContent = sufixo ? `· valor ${sufixo}` : "";
      };
      $("#pj-periodicidade").addEventListener("change", updateValorLabel);
      updateValorLabel();

      // Toggle "tem férias" mostra/esconde os campos extras
      const togFerias = $("#pj-tem-ferias");
      if (togFerias) {
        togFerias.addEventListener("change", () => {
          $("#pj-ferias-fields").style.display = togFerias.checked ? "block" : "none";
        });
      }

      // Lista de férias + botão de adicionar (só pra PJ existente e com toggle ON)
      if (!isNew && pj?.temFerias) {
        renderPJFeriasList(id);
        const addFeriasBtn = $("#btn-add-ferias");
        if (addFeriasBtn) addFeriasBtn.addEventListener("click", () => openAddFeriasModal(id));
      }

      // Aditivos contratuais — só em PJ existente
      if (!isNew) {
        bindAditivosPJ(id);
      }

      // Botão de upload pro Drive
      const uploadBtn = $("#btn-upload-drive");
      const fileInput = $("#pj-contrato-file");
      const urlInput = $("#pj-contrato-url");
      if (!window.driveUploadDisponivel) {
        uploadBtn.disabled = true;
        uploadBtn.title = "Configure GOOGLE_DRIVE_CONFIG.clientId em firebase.config.js (instruções em firebase.config.example.js)";
      } else {
        const origHTML = uploadBtn.innerHTML;
        uploadBtn.addEventListener("click", async () => {
          // Se ainda não há token em cache, autoriza ANTES de abrir o file
          // dialog. Garantir que o popup do Google abra em contexto de
          // clique direto do user — assim o browser não bloqueia.
          if (window.driveTokenEmCache && !window.driveTokenEmCache()) {
            const origText = uploadBtn.innerHTML;
            uploadBtn.innerHTML = `${icon("clock")}<span>Conectando ao Drive...</span>`;
            uploadBtn.disabled = true;
            try {
              await window.preAquecerTokenDrive();
              toast("Drive conectado! Próximos uploads serão diretos.", "success");
            } catch (err) {
              const msg = (err.message || "").toLowerCase();
              if (msg.includes("popup") || msg.includes("bloque")) {
                toast(
                  "Browser bloqueou o popup. Clica no ícone de bloqueio na barra de endereço, escolhe 'Permitir popups deste site' e tenta de novo.",
                  "danger"
                );
              } else {
                toast("Não conectou ao Drive: " + err.message, "danger");
              }
              uploadBtn.disabled = false;
              uploadBtn.innerHTML = origText;
              return;
            }
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = origText;
          }
          fileInput.click();
        });
        fileInput.addEventListener("change", async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          uploadBtn.disabled = true;

          let textoDoPDF = "";
          let resultadoExtracao = null;
          const ehPDF = file.type === "application/pdf";

          // Steps visíveis ao usuário (ordem fixa, atualiza conforme avança)
          const steps = ehPDF
            ? ["Lendo PDF", "Enviando pro Drive", "OCR (se necessário)", "Concluído"]
            : ["Enviando pro Drive", "Concluído"];
          showFormBlocker(ehPDF ? "Lendo PDF..." : `Enviando "${file.name}"...`, steps);

          try {
            // 1) Primeira tentativa: pdf.js puro (rápido, funciona em PDF
            //    com camada de texto — contratos digitais).
            if (ehPDF) {
              updateFormBlocker("Lendo PDF...", 0);
              try {
                textoDoPDF = await extrairTextoDoPDF(file);
                resultadoExtracao = aplicarExtracaoTextoNoForm(textoDoPDF);
                if (resultadoExtracao.preenchidos.length) {
                  toast(`Detectei do contrato: ${resultadoExtracao.preenchidos.join(", ")}. Confira antes de salvar.`);
                }
              } catch (err) {
                console.warn("[pdf.js] falhou:", err);
              }
            }

            // 2) Upload pro Drive — em pasta do prestador, nome padronizado
            updateFormBlocker("Organizando pasta no Drive...", ehPDF ? 1 : 0);
            const pjNome = ($("#pj-nome").value || "").trim();
            const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
            const nomeArquivo = pjNome
              ? `Contrato - ${pjNome}.${ext}`
              : file.name;

            // Tenta criar/achar a pasta do prestador. Se falhar, sobe na raiz.
            let parentFolderId = null;
            if (pjNome && window.findOrCreateFolderForPJ) {
              try {
                parentFolderId = await window.findOrCreateFolderForPJ(pjNome);
              } catch (err) {
                console.warn("[Drive] subpasta falhou, segue na raiz:", err);
              }
            }

            updateFormBlocker(`Enviando "${nomeArquivo}"...`, ehPDF ? 1 : 0);
            let uploadResult = null;
            try {
              uploadResult = await window.uploadContratoToDrive(file, {
                name: nomeArquivo,
                parents: parentFolderId ? [parentFolderId] : undefined,
              });
              debug("[Drive] resposta:", uploadResult);
              const link = uploadResult.webViewLink
                || (uploadResult.id ? `https://drive.google.com/file/d/${uploadResult.id}/view` : null);
              if (!link) throw new Error("Drive não retornou link nem id. Resposta: " + JSON.stringify(uploadResult));
              urlInput.value = link;
              urlInput.dispatchEvent(new Event("input", { bubbles: true }));
            } catch (err) {
              console.error("[Drive] erro:", err);
              toast("Erro no upload: " + (err.message || err), "danger");
            }

            // 3) Se PDF tinha pouco texto (provável scaneado) E o upload deu
            //    certo, tenta OCR via Drive como fallback.
            const ehPdfEscaneado = ehPDF && (!textoDoPDF || textoDoPDF.trim().length < 200);
            const drivePodeOCR = window.extrairTextoViaDriveOCR && uploadResult?.id;
            if (ehPdfEscaneado && drivePodeOCR) {
              updateFormBlocker("Rodando OCR no Google Drive...", 2);
              try {
                const textoOCR = await window.extrairTextoViaDriveOCR(uploadResult.id);
                if (textoOCR && textoOCR.trim().length > 100) {
                  const resOCR = aplicarExtracaoTextoNoForm(textoOCR);
                  if (resOCR.preenchidos.length) {
                    toast(`OCR detectou: ${resOCR.preenchidos.join(", ")}. Confira antes de salvar.`);
                  } else {
                    toast("OCR rodou mas não achou padrões reconhecíveis. Preenche manual.", "danger");
                  }
                }
              } catch (err) {
                console.warn("[Drive OCR] falhou:", err);
                toast("OCR via Drive falhou: " + (err.message || err), "danger");
              }
            }

            // 3.5) Pós-OCR: se OCR detectou o nome E o arquivo subiu na
            // raiz (sem pasta), move pra subpasta + renomeia.
            if (uploadResult?.id && !parentFolderId && window.atualizarArquivoNoDrive) {
              const pjNomeFinal = ($("#pj-nome").value || "").trim();
              if (pjNomeFinal && pjNomeFinal !== pjNome) {
                try {
                  const novaPasta = await window.findOrCreateFolderForPJ(pjNomeFinal);
                  const novoNome = `Contrato - ${pjNomeFinal}.${ext}`;
                  const atualizado = await window.atualizarArquivoNoDrive(uploadResult.id, {
                    newParentId: novaPasta,
                    newName: novoNome,
                  });
                  // Atualiza URL no form caso webViewLink tenha mudado
                  if (atualizado.webViewLink) {
                    urlInput.value = atualizado.webViewLink;
                    urlInput.dispatchEvent(new Event("input", { bubbles: true }));
                  }
                  debug("[Drive] pós-OCR: movido + renomeado", atualizado);
                } catch (err) {
                  console.warn("[Drive] mover/renomear pós-OCR falhou:", err);
                }
              }
            }

            // 4) Concluído
            const lastStep = ehPDF ? 3 : 1;
            updateFormBlocker("Pronto!", lastStep);
            if (uploadResult) {
              toast("Arquivo enviado! Confira os campos e clique Salvar pra gravar.");
            }
            // Pequena pausa pra usuário ver "Pronto!" antes de fechar
            await new Promise((r) => setTimeout(r, 400));
          } finally {
            hideFormBlocker();
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = origHTML;
            fileInput.value = "";
          }
        });
      }
    },
  });
}

function savePJ(id) {
  const u = currentUser();
  const nome = $("#pj-nome").value.trim();
  if (!nome || nome.length < 2) return toast("Informe o nome do PJ.", "danger");

  const contratoUrl = $("#pj-contrato-url").value.trim();
  if (!ehUrlSegura(contratoUrl)) {
    return toast("Link do contrato precisa ser https:// — recuse 'javascript:' ou outros.", "danger");
  }

  const cnpjRaw = $("#pj-cnpj").value.trim();
  if (!ehCNPJValido(cnpjRaw)) {
    return toast("CNPJ inválido — confere os 14 dígitos.", "danger");
  }

  const valorRaw = $("#pj-valor").value;
  const valor = Math.max(0, Number(valorRaw) || 0); // clamp não-negativo

  const dados = {
    nome,
    cnpj: $("#pj-cnpj").value.trim() || null,
    tipoServico: $("#pj-tipo").value.trim() || null,
    valorAtual: valor,
    periodicidade: $("#pj-periodicidade").value,
    dataInicio: $("#pj-data-inicio").value || null,
    dataProximaRevisao: $("#pj-data-revisao").value || null,
    status: $("#pj-status").value,
    temFerias: !!$("#pj-tem-ferias").checked,
    diasFeriasAno: $("#pj-tem-ferias").checked
      ? (Number($("#pj-dias-ano").value) || 30)
      : null,
    // inicioDireitoFerias removido: o cálculo usa sempre dataInicio do contrato
    inicioDireitoFerias: null,
    contratoUrl: $("#pj-contrato-url").value.trim() || null,
    atualizadoPor: u.id,
    atualizadoEm: new Date().toISOString(),
  };

  if (!state.pjs) state.pjs = [];

  if (id) {
    const existing = state.pjs.find((p) => p.id === id);
    if (!existing) return toast("PJ não encontrado.", "danger");
    // Registra histórico se valor mudou
    if (existing.valorAtual !== dados.valorAtual) {
      existing.historicoValores = [...(existing.historicoValores || []), {
        valor: dados.valorAtual,
        data: new Date().toISOString().slice(0, 10),
        por: u.id,
      }];
    }
    Object.assign(existing, dados);
  } else {
    const novoId = "pj-" + Date.now();
    state.pjs.push({
      id: novoId,
      ...dados,
      criadoPor: u.id,
      criadoEm: new Date().toISOString(),
      historicoValores: valor > 0 ? [{
        valor,
        data: new Date().toISOString().slice(0, 10),
        por: u.id,
      }] : [],
    });
  }

  store.save(state);
  closeModal();
  toast(id ? "PJ atualizado." : "PJ cadastrado.");
  renderApp();
}

// Busca IPCA mensal acumulado em N meses na API do Banco Central
// Série 433 = IPCA mensal (variação % mês a mês)
// Acumula via produtório: ((1 + r1/100) × (1 + r2/100) × ... - 1) × 100
async function fetchIPCAAcumulado(meses = 12) {
  const n = Math.min(24, Math.max(1, Number(meses) || 12));
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/${n}?formato=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API BCB retornou " + res.status);
  const arr = await res.json();
  if (!arr.length) throw new Error("BCB sem dados");

  // Acumula
  let fator = 1;
  const valoresMensais = [];
  for (const item of arr) {
    const r = Number(String(item.valor).replace(",", "."));
    if (Number.isFinite(r)) {
      fator *= 1 + r / 100;
      valoresMensais.push({ data: item.data, valor: r });
    }
  }
  const pct = (fator - 1) * 100;

  return {
    percentual: pct,
    meses: valoresMensais.length,
    dataInicial: valoresMensais[0]?.data,
    dataReferencia: valoresMensais[valoresMensais.length - 1]?.data,
    valoresMensais,
  };
}

// Calcula quantos meses de IPCA fazem sentido pra esse PJ em determinado ano de reajuste.
// Regra: se é o PRIMEIRO reajuste (nunca foi reajustado antes), usa proporcional desde
// dataInicio até dezembro do ano anterior ao reajuste. Senão, sempre 12 meses.
// Ex: contrato iniciou 15/10/2025, reajuste 2026 → 3 meses (out, nov, dez 2025).
function calcularMesesProporcionaisIPCA(pj, anoReajuste) {
  const limiteReajusteAtual = `${anoReajuste}-01-15`;
  const teveReajusteAntes = (pj.historicoValores || []).some(
    (h) => (h.data || "") < limiteReajusteAtual && (h.motivo || "").toLowerCase().includes("reajuste")
  );
  if (teveReajusteAntes) return 12;

  const inicio = pj.dataInicio;
  if (!inicio) return 12;

  const [y, m] = inicio.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return 12;

  // Meses do início do contrato até dezembro do ano anterior ao reajuste, inclusive
  const totalMeses = (anoReajuste - 1 - y) * 12 + (12 - m + 1);
  return Math.min(12, Math.max(1, totalMeses));
}

// ---------- Form blocker (overlay bloqueante durante OCR/upload) ----------
// Mostra um overlay em cima do modal que impede edição enquanto o
// processo de upload + OCR está rodando.
function showFormBlocker(initialMsg = "Processando...", steps = []) {
  hideFormBlocker(); // garante que não tem outro
  const modal = document.querySelector("#modal-root .modal");
  if (!modal) return;
  const blocker = document.createElement("div");
  blocker.className = "form-blocker";
  blocker.id = "form-blocker";
  blocker.setAttribute("role", "alert");
  blocker.setAttribute("aria-live", "assertive");
  blocker.innerHTML = `
    <div class="form-blocker__spinner"></div>
    <div class="form-blocker__msg" id="form-blocker-msg">${initialMsg}</div>
    <div class="form-blocker__hint">Não feche essa janela</div>
    ${steps.length ? `
      <div class="form-blocker__steps" id="form-blocker-steps">
        ${steps.map((s, i) => `<div class="form-blocker__step" data-step="${i}">${s}</div>`).join("")}
      </div>
    ` : ""}
  `;
  modal.appendChild(blocker);
}
function updateFormBlocker(msg, activeStepIdx = null) {
  const m = document.getElementById("form-blocker-msg");
  if (m) m.textContent = msg;
  if (activeStepIdx !== null) {
    const all = document.querySelectorAll("#form-blocker-steps .form-blocker__step");
    all.forEach((el, i) => {
      el.classList.remove("is-active", "is-done");
      if (i < activeStepIdx) el.classList.add("is-done");
      else if (i === activeStepIdx) el.classList.add("is-active");
    });
  }
}
function hideFormBlocker() {
  document.getElementById("form-blocker")?.remove();
}

// ---------- Extração automática de dados do contrato (PDF) ----------
// Lê o PDF via pdf.js no browser e tenta achar CNPJ, valor, nome do
// prestador, data de início. PDFs escaneados (imagem) não funcionam.
let _pdfJsPromise = null;
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  if (_pdfJsPromise) return _pdfJsPromise;
  const ver = "3.11.174";
  _pdfJsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${ver}/pdf.min.js`;
    s.onload = () => {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${ver}/pdf.worker.min.js`;
        resolve(window.pdfjsLib);
      } catch (e) { reject(e); }
    };
    s.onerror = () => reject(new Error("Falha ao carregar pdf.js"));
    document.head.appendChild(s);
  });
  return _pdfJsPromise;
}

async function extrairTextoDoPDF(file) {
  // Timeout de 20s: se pdf.js travar (worker não carrega, PDF gigante,
  // CDN lenta), aborta sem segurar a UI eternamente. O caller cai no
  // catch e o fluxo continua direto pro upload no Drive sem auto-fill.
  return Promise.race([
    _extrairTextoDoPDFReal(file),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout: pdf.js não respondeu em 20s. Pulando auto-extração.")), 20000)
    ),
  ]);
}

async function _extrairTextoDoPDFReal(file) {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  // Limita a 15 páginas pra não travar em contratos enormes
  const maxPag = Math.min(pdf.numPages, 15);
  let texto = "";
  for (let i = 1; i <= maxPag; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texto += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return texto;
}

function analisarTextoContrato(texto) {
  const r = {};
  if (!texto || texto.length < 20) return r;

  // ---------- CNPJ ----------
  // Contratos sempre têm pelo menos 2 CNPJs (contratante + contratado).
  // O primeiro do texto costuma ser o da Fiobras (contratante), então:
  // 1) Coleta todos os CNPJs com posição no texto
  // 2) Tenta achar um próximo às palavras CONTRATADO/PRESTADOR
  // 3) Senão, ignora CNPJs conhecidos (Fiobras) e pega o primeiro restante
  // 4) Fallback final: primeiro CNPJ (mesmo se conhecido)
  const CNPJS_IGNORAR = new Set([
    "01475188000197", // Fiobras Ltda
  ]);

  const cnpjsEncontrados = [...texto.matchAll(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g)]
    .map((m) => {
      const raw = m[0].replace(/\D/g, "");
      if (raw.length !== 14) return null;
      return {
        raw,
        pos: m.index,
        formatado: `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`,
      };
    })
    .filter(Boolean);

  // Deduplicar (mesmo CNPJ pode aparecer várias vezes)
  const cnpjsUnicos = [];
  const vistos = new Set();
  for (const c of cnpjsEncontrados) {
    if (!vistos.has(c.raw)) { vistos.add(c.raw); cnpjsUnicos.push(c); }
  }

  let cnpjEscolhido = null;

  // 1ª prioridade: CNPJ próximo a CONTRATADO / PRESTADOR (até 400 chars
  // após a palavra), e que NÃO esteja na lista de ignorados.
  const matchesContratado = [...texto.matchAll(/(?:CONTRATAD[OA]|PRESTADOR)/gi)];
  for (const mc of matchesContratado) {
    const inicio = mc.index;
    const fim = inicio + 400;
    const candidato = cnpjsEncontrados.find(
      (c) => c.pos >= inicio && c.pos <= fim && !CNPJS_IGNORAR.has(c.raw)
    );
    if (candidato) { cnpjEscolhido = candidato; break; }
  }

  // 2ª prioridade: primeiro CNPJ que NÃO esteja na lista de ignorados
  if (!cnpjEscolhido) {
    cnpjEscolhido = cnpjsUnicos.find((c) => !CNPJS_IGNORAR.has(c.raw));
  }

  // SEM fallback pra CNPJ da Fiobras — melhor deixar vazio do que
  // preencher o CNPJ do contratante. Provável que o prestador seja
  // pessoa física / MEI sem CNPJ aparecendo no contrato.
  if (cnpjEscolhido) {
    r.cnpj = cnpjEscolhido.formatado;
  }

  debug("[Contrato] CNPJs encontrados:", cnpjsUnicos.map((c) => c.formatado));
  debug("[Contrato] CNPJ escolhido:", r.cnpj || "(nenhum válido — só CNPJ ignorado ou nenhum CNPJ)");

  // ---------- Periodicidade ----------
  // Detecta "por hora" / "/h" / "horista" antes de decidir o valor.
  const ehPorHora = /(?:\bpor\s+hora\b|\bvalor[\s\-\/]+(?:da\s+)?hora\b|\bhora\s+trabalhada\b|\bhorista\b|\bR\$\s*[\d.,]+\s*\/\s*h(?:ora)?\b|\bR\$\s*[\d.,]+\s*\/\s*hr\b)/i.test(texto);
  const ehAnual = /\b(?:anual(?:mente)?|por\s+ano|ao\s+ano)\b/i.test(texto) && !ehPorHora;
  const ehTrimestral = /\btrimestral(?:mente)?\b/i.test(texto) && !ehPorHora;
  const ehSemestral = /\bsemestral(?:mente)?\b/i.test(texto) && !ehPorHora;
  if (ehPorHora) r.periodicidade = "hora";
  else if (ehTrimestral) r.periodicidade = "trimestral";
  else if (ehSemestral) r.periodicidade = "semestral";
  else if (ehAnual) r.periodicidade = "anual";

  // ---------- Valor R$ ----------
  if (ehPorHora) {
    // Procura valor PRÓXIMO a indicadores de "hora". Não é o maior.
    const padroesHora = [
      /R\$\s*([\d.]*\d+(?:,\d{2})?)\s*\/\s*h(?:ora|r)?\b/i,
      /R\$\s*([\d.]*\d+(?:,\d{2})?)\s+por\s+hora/i,
      /R\$\s*([\d.]*\d+(?:,\d{2})?)[\s\S]{0,30}?(?:por\s+)?hora\s+trabalhada/i,
      /valor[\s\-\/]+(?:da\s+)?hora[\s\S]{0,60}?R\$\s*([\d.]*\d+(?:,\d{2})?)/i,
      /hora\s+trabalhada[\s\S]{0,60}?R\$\s*([\d.]*\d+(?:,\d{2})?)/i,
      /(\d+(?:,\d{2})?)\s+reais\s+(?:por\s+)?hora/i,
    ];
    for (const re of padroesHora) {
      const m = texto.match(re);
      if (m) {
        const raw = m[1].replace(/\./g, "").replace(",", ".");
        const v = Number(raw);
        if (Number.isFinite(v) && v > 0 && v <= 10000) { r.valor = v; break; }
      }
    }
    // Fallback: menor valor razoável (R$ 5 a R$ 500) — valor/h costuma ser baixo
    if (!r.valor) {
      const valoresHora = [...texto.matchAll(/R\$\s*([\d.]+,\d{2}|\d+,\d{2}|[\d.]+)/g)]
        .map((m) => Number(m[1].replace(/\./g, "").replace(",", ".")))
        .filter((v) => Number.isFinite(v) && v >= 5 && v <= 500);
      if (valoresHora.length) r.valor = Math.min(...valoresHora);
    }
  } else {
    // Mensal / outros: pega o MAIOR valor monetário entre R$ 100 e R$ 1.000.000
    const valores = [...texto.matchAll(/R\$\s*([\d.]+,\d{2}|\d+,\d{2}|[\d.]+)/g)]
      .map((m) => Number(m[1].replace(/\./g, "").replace(",", ".")))
      .filter((v) => Number.isFinite(v) && v >= 100 && v <= 1_000_000);
    if (valores.length > 0) r.valor = Math.max(...valores);
  }

  // ---------- Nome / razão social do prestador ----------
  const mNome = texto.match(
    /(?:CONTRATAD[OA]|PRESTADOR(?:\s+DE\s+SERVI[ÇC]OS?)?|RAZ[ÃA]O\s+SOCIAL)\s*[:\-]?\s*([A-ZÀ-Ú][A-ZÀ-Ú0-9 .,&\-]{4,80})/i
  );
  if (mNome) {
    let nome = mNome[1].trim();
    nome = nome.split(/,|\s+CNPJ|\s+inscrita|\s+CPF|\s{3,}/i)[0].trim();
    if (nome.length >= 3) r.nome = nome;
  }

  // ---------- Data de início ----------
  // Mapas de meses (pt-br) — usado pra parsing extenso
  const MESES_PT = {
    janeiro: 1, fevereiro: 2, marco: 3, "março": 3, abril: 4, maio: 5,
    junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10,
    novembro: 11, dezembro: 12,
  };
  const palavrasChaveData = "(?:in[ií]cio|vig[êe]ncia|vigora(?:r[áa])?|come[çc]a|a\\s+partir\\s+de|data\\s+(?:de\\s+)?in[ií]cio|presta[çc][ãa]o\\s+(?:dos\\s+)?servi[çc]os|firmad[oa])";

  // Padrão 1: palavra-chave + DD/MM/AAAA (ou DD-MM-AAAA ou DD.MM.AAAA)
  const reDataNum = new RegExp(`${palavrasChaveData}[\\s\\S]{0,50}?(\\d{1,2})[\\/.\\-](\\d{1,2})[\\/.\\-](\\d{4})`, "i");
  const mDataNum = texto.match(reDataNum);
  if (mDataNum) {
    const d = +mDataNum[1], m = +mDataNum[2], y = +mDataNum[3];
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
      r.dataInicio = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Padrão 2: palavra-chave + "DD de mês de AAAA" (extenso)
  if (!r.dataInicio) {
    const reDataExt = new RegExp(`${palavrasChaveData}[\\s\\S]{0,60}?(\\d{1,2})\\s+de\\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\\s+de\\s+(\\d{4})`, "i");
    const mDataExt = texto.match(reDataExt);
    if (mDataExt) {
      const d = +mDataExt[1];
      const mesKey = mDataExt[2].toLowerCase();
      const m = MESES_PT[mesKey] || MESES_PT[mesKey.replace("ç", "c")];
      const y = +mDataExt[3];
      if (m && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
        r.dataInicio = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  }

  // Padrão 3 (fallback): primeira data DD/MM/AAAA do documento, se nada
  // foi achado com palavra-chave. Costuma ser a data de assinatura/início.
  if (!r.dataInicio) {
    const mAny = texto.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/);
    if (mAny) {
      const d = +mAny[1], m = +mAny[2], y = +mAny[3];
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
        r.dataInicio = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  }

  return r;
}

// Aplica regex/heurísticas no texto e preenche campos vazios do form.
// Reusado tanto pelo pdf.js puro quanto pelo OCR via Drive.
// Retorna { dados, preenchidos: [labels] }
function aplicarExtracaoTextoNoForm(texto) {
  const dados = analisarTextoContrato(texto || "");
  const preenchidos = [];

  const setSe = (selector, valor, label) => {
    const el = $(selector);
    if (el && valor && !el.value.trim()) {
      el.value = valor;
      preenchidos.push(label);
    }
  };
  setSe("#pj-cnpj", dados.cnpj, "CNPJ");
  setSe("#pj-nome", dados.nome, "nome");
  setSe("#pj-valor", dados.valor ? dados.valor.toFixed(2) : null, "valor");
  setSe("#pj-data-inicio", dados.dataInicio, "início");

  // Periodicidade: select. Considera "vazio" quando ainda está no default
  // do form pra novo PJ (mensal). Se já foi mexido pelo user, respeita.
  if (dados.periodicidade) {
    const sel = $("#pj-periodicidade");
    if (sel && (sel.value === "mensal" || !sel.value)) {
      // Confere se a opção existe no select antes de aplicar
      const opt = [...sel.options].find((o) => o.value === dados.periodicidade);
      if (opt) {
        sel.value = dados.periodicidade;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        preenchidos.push("periodicidade");
      }
    }
  }

  return { dados, preenchidos };
}

function openReajusteModal(id) {
  const pj = (state.pjs || []).find((p) => p.id === id);
  if (!pj) return;
  const u = currentUser();
  if (u.role !== "admin" && u.role !== "rh") return;

  const valorAtual = Number(pj.valorAtual) || 0;
  const anoVigente = ultimoAnoReajusteVigente();
  const mesesSugeridos = calcularMesesProporcionaisIPCA(pj, anoVigente);
  const ehPrimeiroReajuste = mesesSugeridos < 12;
  const janela = janelaReajuste();
  const foraDaJanela = !janela.dentro;
  const jaReajustadoNoAno = pjJaReajustadoNoAno(pj, janela.ano);
  const reajusteExtra = foraDaJanela || jaReajustadoNoAno;

  const hintAuto = ehPrimeiroReajuste
    ? `Primeiro reajuste — proporcional ao tempo de contrato (início ${pj.dataInicio ? formatDate(pj.dataInicio) : "?"} → dez/${anoVigente - 1} = <strong>${mesesSugeridos} ${mesesSugeridos === 1 ? "mês" : "meses"}</strong>).`
    : `Contrato com 12+ meses fechados — pega IPCA acumulado dos <strong>últimos 12 meses</strong>.`;

  openModal(`
    <div class="modal__header">
      <div>
        <h2>${reajusteExtra ? "Reajuste extra" : "Aplicar reajuste"} · ${escapeHtml(pj.nome)}</h2>
        <p>${reajusteExtra
            ? "Reajuste fora do ciclo anual (15/01). Use pra casos especiais — não substitui o reajuste oficial."
            : `Reajuste anual de 15/01/${anoVigente}. Busca o IPCA via Banco Central conforme o período escolhido.`}</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="reajuste-form" onsubmit="return false">
      ${reajusteExtra ? `
        <div style="background: rgba(255, 203, 0, 0.12); border-left: 3px solid var(--warning); padding: 10px 12px; border-radius: var(--radius); margin-bottom: 12px;">
          <div style="font-weight: 600; font-size: 13px;">Você está fora da janela anual de reajuste</div>
          <div class="text-xs muted" style="margin-top: 2px;">
            ${jaReajustadoNoAno
              ? `Esse PJ já foi reajustado em ${janela.ano}. Continue só se for ajuste pontual (negociado, erro de valor, etc).`
              : `A janela anual é de 31/12 a 14/02. Continue apenas pra ajustes pontuais negociados com o PJ.`}
            Pode digitar o % manual sem usar o botão de buscar IPCA.
          </div>
        </div>
      ` : ""}
      <div class="detail-grid">
        <div class="detail-cell">
          <label>Valor atual</label>
          <strong>${formatMoeda(valorAtual)}</strong>
        </div>
        <div class="detail-cell">
          <label>Início do contrato</label>
          <strong>${pj.dataInicio ? formatDate(pj.dataInicio) : "—"}</strong>
        </div>
      </div>

      <div class="field" style="margin-top: 16px;">
        <label for="reaj-meses">Período do IPCA</label>
        <select id="reaj-meses">
          <option value="auto" selected>Auto — ${mesesSugeridos} ${mesesSugeridos === 1 ? "mês" : "meses"} (${ehPrimeiroReajuste ? "proporcional" : "12 meses cheios"})</option>
          <option disabled>──────────</option>
          ${Array.from({ length: 12 }, (_, i) => i + 1).map(
            (n) => `<option value="${n}">${n} ${n === 1 ? "mês" : "meses"}</option>`
          ).join("")}
        </select>
        <span class="field__hint" id="reaj-meses-hint">${hintAuto}</span>
      </div>

      <div class="field">
        <label for="reaj-percentual">Percentual de reajuste (%)</label>
        <div class="row" style="gap: 8px; align-items: stretch;">
          <input type="number" id="reaj-percentual" step="0.01" placeholder="ex: 4.50" style="flex: 1;" />
          <button type="button" class="btn btn--soft" id="btn-buscar-ipca" title="Trazer da API do Banco Central conforme o período acima">${icon("download")}<span>Buscar IPCA</span></button>
        </div>
        <span class="field__hint" id="reaj-fonte"><strong>Digite o % diretamente</strong> (negociado com o PJ) ou clique <strong>"Buscar IPCA"</strong> pra trazer do Banco Central.</span>
      </div>

      <div class="field">
        <label for="reaj-novo-valor">Novo valor (R$)</label>
        <input type="number" id="reaj-novo-valor" step="0.01" placeholder="${formatMoeda(valorAtual)}" />
        <span class="field__hint">Calculado automaticamente quando você preenche o %. Pode ajustar manualmente também.</span>
      </div>

      <div class="field">
        <label for="reaj-motivo">Motivo / observação</label>
        <input type="text" id="reaj-motivo" placeholder="Reajuste IPCA jan/${anoVigente}" />
      </div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-aplicar-reajuste">${icon("check")}<span>Aplicar reajuste</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));

      const inpPct = $("#reaj-percentual");
      const inpVal = $("#reaj-novo-valor");
      const fonte = $("#reaj-fonte");
      const selMeses = $("#reaj-meses");
      const hintMeses = $("#reaj-meses-hint");

      const getMesesEscolhidos = () => {
        const v = selMeses.value;
        return v === "auto" ? mesesSugeridos : Math.min(12, Math.max(1, Number(v) || 12));
      };

      selMeses.addEventListener("change", () => {
        const m = getMesesEscolhidos();
        if (selMeses.value === "auto") {
          hintMeses.innerHTML = hintAuto;
        } else {
          hintMeses.textContent = `IPCA acumulado dos últimos ${m} ${m === 1 ? "mês" : "meses"} fechados na série BCB.`;
        }
      });

      const recalcular = () => {
        const pct = Number(inpPct.value);
        if (!Number.isFinite(pct) || pct <= 0) return;
        const novo = valorAtual * (1 + pct / 100);
        inpVal.value = novo.toFixed(2);
      };
      inpPct.addEventListener("input", recalcular);

      $("#btn-buscar-ipca").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const meses = getMesesEscolhidos();
        btn.disabled = true;
        btn.innerHTML = `${icon("clock")}<span>Buscando...</span>`;
        try {
          const ipca = await fetchIPCAAcumulado(meses);
          inpPct.value = ipca.percentual.toFixed(2);
          const labelPeriodo = ipca.dataInicial && ipca.dataReferencia && ipca.dataInicial !== ipca.dataReferencia
            ? `${ipca.dataInicial} a ${ipca.dataReferencia}`
            : ipca.dataReferencia;
          fonte.innerHTML = `IPCA acumulado <strong>${ipca.meses} ${ipca.meses === 1 ? "mês" : "meses"}</strong> (BCB série 433, ${labelPeriodo}): <strong>${ipca.percentual.toFixed(2)}%</strong>`;
          fonte.style.color = "var(--success)";
          recalcular();
          if (!$("#reaj-motivo").value) {
            $("#reaj-motivo").value = `Reajuste IPCA jan/${anoVigente} (${ipca.meses}m, ${ipca.percentual.toFixed(2)}%)`;
          }
        } catch (err) {
          toast("Erro ao buscar IPCA: " + err.message, "danger");
        }
        btn.disabled = false;
        btn.innerHTML = `${icon("download")}<span>Buscar IPCA</span>`;
      });

      $("#btn-aplicar-reajuste").addEventListener("click", () => aplicarReajuste(id));
      setTimeout(() => $("#reaj-percentual").focus(), 100);
    },
  });
}

function aplicarReajuste(id) {
  const pj = (state.pjs || []).find((p) => p.id === id);
  if (!pj) return;
  const u = currentUser();
  const novoValor = Number($("#reaj-novo-valor").value);
  const pct = Number($("#reaj-percentual").value);
  const motivo = $("#reaj-motivo").value.trim() || `Reajuste IPCA jan/${ultimoAnoReajusteVigente()}`;

  if (!Number.isFinite(novoValor) || novoValor <= 0) return toast("Informe o novo valor.", "danger");
  if (novoValor === pj.valorAtual) return toast("Valor novo é igual ao atual — sem reajuste a aplicar.", "danger");

  const valorAntigo = pj.valorAtual;
  pj.valorAtual = novoValor;
  pj.historicoValores = [...(pj.historicoValores || []), {
    valor: novoValor,
    data: new Date().toISOString().slice(0, 10),
    por: u.id,
    motivo,
    percentual: Number.isFinite(pct) ? pct : null,
    valorAnterior: valorAntigo,
  }];
  // Avança a próxima revisão pro 15/01 do ano seguinte ao reajuste
  pj.dataProximaRevisao = `${new Date().getFullYear() + 1}-01-15`;

  store.save(state);
  closeModal();
  toast(`Reajuste aplicado: ${formatMoeda(valorAntigo)} → ${formatMoeda(novoValor)}`);
  renderApp();
}

// ============================================================
// Aditivos contratuais — registros de mudanças no contrato PJ
// Persiste em /pj/{id}.aditivos[] (arrayUnion/arrayRemove via firebase.js)
// ============================================================
function bindAditivosPJ(pjId) {
  const pj = (state.pjs || []).find((p) => p.id === pjId);
  if (!pj) return;

  const list = $("#pj-aditivos-list");
  const form = $("#pj-aditivo-form");
  const countEl = $("#pj-aditivos-count");
  if (!list || !form) return;

  const fechar = () => {
    form.style.display = "none";
    $("#aditivo-data").value = "";
    $("#aditivo-vigencia").value = "";
    $("#aditivo-desc").value = "";
    $("#aditivo-url").value = "";
    if ($("#aditivo-file")) $("#aditivo-file").value = "";
  };

  const renderLista = () => {
    const aditivos = ((state.pjs || []).find((p) => p.id === pjId)?.aditivos) || [];
    countEl.textContent = aditivos.length ? `(${aditivos.length})` : "";
    if (aditivos.length === 0) {
      list.innerHTML = `<div class="text-xs muted" style="padding:8px 4px;">Nenhum aditivo registrado.</div>`;
      return;
    }
    const ordenados = [...aditivos].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    list.innerHTML = ordenados.map((a) => `
      <article class="occ" style="grid-template-columns: 1fr auto auto; cursor:default; padding:10px 12px; margin-bottom:6px;">
        <div class="occ__main" style="min-width:0;">
          <div class="occ__name" style="font-size:13px; font-weight:600; white-space:normal;">${escapeHtml(a.descricao || "—")}</div>
          <div class="occ__sub" style="font-size:11px;">
            ${a.data ? formatDateFull(a.data) : "—"}
            ${a.dataVigencia && a.dataVigencia !== a.data ? ` · vigência ${formatDateFull(a.dataVigencia)}` : ""}
            ${a.criadoPor ? ` · ${escapeHtml(getUser(a.criadoPor)?.nome || "")}` : ""}
          </div>
        </div>
        ${a.contratoUrl && ehUrlSegura(a.contratoUrl)
          ? `<a href="${escapeHtml(a.contratoUrl)}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm" data-stop="1" title="Abrir aditivo">${icon("file")}</a>`
          : `<span></span>`}
        <button type="button" class="btn btn--ghost btn--sm" data-del-aditivo="${escapeHtml(a.id)}" title="Excluir aditivo">${icon("trash")}</button>
      </article>
    `).join("");

    list.querySelectorAll("[data-del-aditivo]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const aid = btn.dataset.delAditivo;
        if (!confirm("Excluir este aditivo? O PDF no Drive não será apagado.")) return;
        if (!window.removerAditivoPJ) {
          return toast("Modo demo: requer Firebase pra persistir.", "danger");
        }
        try {
          await window.removerAditivoPJ(pjId, aid);
          toast("Aditivo excluído.");
          renderLista();
        } catch (err) {
          toast("Erro: " + (err?.message || err), "danger");
        }
      });
    });
  };

  renderLista();

  $("#btn-add-aditivo")?.addEventListener("click", () => {
    form.style.display = "block";
    $("#aditivo-data").value = new Date().toISOString().slice(0, 10);
    $("#aditivo-desc").focus();
  });
  $("#btn-cancel-aditivo")?.addEventListener("click", fechar);

  // Upload PDF do aditivo no Drive, na mesma subpasta do PJ
  const uploadBtn = $("#btn-upload-aditivo");
  const fileInput = $("#aditivo-file");
  if (uploadBtn && fileInput) {
    if (!window.driveUploadDisponivel) {
      uploadBtn.disabled = true;
      uploadBtn.title = "Configure GOOGLE_DRIVE_CONFIG em firebase.config.js";
    } else {
      uploadBtn.addEventListener("click", async () => {
        if (window.driveTokenEmCache && !window.driveTokenEmCache()) {
          try { await window.preAquecerTokenDrive(); } catch (e) {
            return toast("Autorize o Google Drive: " + e.message, "danger");
          }
        }
        fileInput.click();
      });
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const origHTML = uploadBtn.innerHTML;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = icon("clock") + "<span>Enviando...</span>";
        try {
          // Nome padronizado: "Aditivo YYYY-MM-DD - PJName.pdf"
          const dataInput = $("#aditivo-data").value || new Date().toISOString().slice(0, 10);
          const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
          const nomeArquivo = `Aditivo ${dataInput} - ${pj.nome}.${ext}`.replace(/[/\\:*?"<>|]/g, "-");
          let parentFolderId = null;
          if (window.findOrCreateFolderForPJ && pj.nome) {
            try { parentFolderId = await window.findOrCreateFolderForPJ(pj.nome); } catch (e) {
              debug?.("[Aditivo] subpasta falhou:", e.message);
            }
          }
          const res = await window.uploadContratoToDrive(file, {
            name: nomeArquivo,
            parents: parentFolderId ? [parentFolderId] : undefined,
          });
          $("#aditivo-url").value = res.webViewLink || "";
          uploadBtn.innerHTML = icon("check") + "<span>PDF enviado</span>";
          toast("Aditivo subido pro Drive.");
        } catch (err) {
          uploadBtn.innerHTML = origHTML;
          toast("Erro ao subir: " + (err?.message || err), "danger");
        } finally {
          uploadBtn.disabled = false;
          fileInput.value = "";
          setTimeout(() => { uploadBtn.innerHTML = origHTML; }, 2000);
        }
      });
    }
  }

  $("#btn-save-aditivo")?.addEventListener("click", async () => {
    const data = $("#aditivo-data").value;
    const vigencia = $("#aditivo-vigencia").value;
    const desc = $("#aditivo-desc").value.trim();
    const url = $("#aditivo-url").value.trim();

    if (!data) return toast("Informe a data do aditivo.", "danger");
    if (!desc || desc.length < 3) return toast("Descreva o aditivo (mínimo 3 caracteres).", "danger");
    if (url && !ehUrlSegura(url)) return toast("URL inválida — use https://", "danger");

    if (!window.adicionarAditivoPJ) {
      return toast("Modo demo: requer Firebase pra persistir.", "danger");
    }

    const btn = $("#btn-save-aditivo");
    btn.disabled = true;
    btn.innerHTML = icon("clock") + "<span>Salvando...</span>";
    try {
      await window.adicionarAditivoPJ(pjId, {
        data,
        dataVigencia: vigencia || data,
        descricao: desc,
        contratoUrl: url || null,
      });
      toast("Aditivo adicionado.");
      fechar();
      renderLista();
    } catch (err) {
      toast("Erro: " + (err?.message || err), "danger");
    } finally {
      btn.disabled = false;
      btn.innerHTML = icon("check") + "<span>Salvar aditivo</span>";
    }
  });
}

function renderPJFeriasList(pjId) {
  const root = $("#pj-ferias-list");
  if (!root) return;
  const pj = (state.pjs || []).find((p) => p.id === pjId);
  if (!pj?.temFerias) return;

  const baixas = (pj.ferias || []).slice().sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  const r = resumoFerias(pj);
  const saldoTone = r.saldo > 0 ? "success" : r.saldo === 0 ? "neutral" : "danger";

  const resumoHtml = `
    <div class="detail-grid" style="margin-bottom: 10px;">
      <div class="detail-cell">
        <label>Acumulado até hoje</label>
        <strong>${r.acumulado} dia${r.acumulado !== 1 ? "s" : ""}</strong>
      </div>
      <div class="detail-cell">
        <label>Gozadas</label>
        <strong>${r.gozadas} dia${r.gozadas !== 1 ? "s" : ""}</strong>
      </div>
      <div class="detail-cell">
        <label>Vendidas</label>
        <strong>${r.vendidas} dia${r.vendidas !== 1 ? "s" : ""}</strong>
      </div>
      <div class="detail-cell" style="background: var(--${saldoTone}-bg);">
        <label>Saldo disponível</label>
        <strong style="color: var(--${saldoTone});">${r.saldo} dia${Math.abs(r.saldo) !== 1 ? "s" : ""}</strong>
      </div>
    </div>
    <div class="text-xs muted" style="margin-bottom: 8px;">
      ${pj.dataInicio
        ? `Sistema acumula ${(Number(pj.diasFeriasAno) || 30) / 12 % 1 === 0 ? (Number(pj.diasFeriasAno) || 30) / 12 : ((Number(pj.diasFeriasAno) || 30) / 12).toFixed(2)} dia/mês desde <strong>${formatDate(pj.dataInicio)}</strong> (início do contrato · ${pj.diasFeriasAno || 30} dias/ano).`
        : `<span style="color: var(--danger);">Preencha "Início do contrato" no PJ pra o sistema calcular as férias.</span>`}
    </div>
  `;

  if (baixas.length === 0) {
    root.innerHTML = resumoHtml + `<div class="text-sm muted" style="padding: 8px 0;">Nenhuma baixa registrada. Quando o PJ usar ou vender férias, clica em "Dar baixa".</div>`;
    return;
  }

  root.innerHTML = resumoHtml + `
    <div class="text-xs muted" style="margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Histórico de baixas</div>
    <div style="display: flex; flex-direction: column; gap: 6px;">
      ${baixas.map((f) => {
        const isVendidas = f.tipo === "vendidas";
        const tipoBadge = isVendidas
          ? `<span class="badge badge--warning" style="font-size: 10px;">VENDIDAS</span>`
          : `<span class="badge badge--info" style="font-size: 10px;">GOZADAS</span>`;
        return `
          <div style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--surface-warm); border-radius: var(--radius);">
            <div style="flex: 1;">
              <div style="font-weight: 600;">
                ${tipoBadge}
                <span style="margin-left: 8px;">${f.dias} dia${f.dias !== 1 ? "s" : ""}</span>
                <span class="muted text-xs">· baixa em ${formatDate(f.data)}</span>
              </div>
              ${f.observacao ? `<div class="text-xs muted" style="margin-top: 4px;">${escapeHtml(f.observacao)}</div>` : ""}
            </div>
            <button type="button" class="btn btn--ghost btn--sm" data-del-ferias="${f.id}" title="Excluir baixa">${icon("trash")}</button>
          </div>
        `;
      }).join("")}
    </div>
  `;

  $$("[data-del-ferias]").forEach((b) => {
    b.addEventListener("click", () => deletePJFerias(pjId, b.dataset.delFerias));
  });
}

function openAddFeriasModal(pjId) {
  const pj = (state.pjs || []).find((p) => p.id === pjId);
  if (!pj) return;
  const r = resumoFerias(pj);
  const hoje = new Date().toISOString().slice(0, 10);

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Dar baixa em férias · ${escapeHtml(pj.nome)}</h2>
        <p>Saldo disponível: <strong style="color: var(--plum);">${r.saldo} dia${Math.abs(r.saldo) !== 1 ? "s" : ""}</strong></p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="ferias-form" onsubmit="return false">
      <div class="field">
        <label>Tipo de baixa <span style="color:var(--danger)">*</span></label>
        <div class="row" style="gap: 8px;">
          <label class="row" style="gap: 6px; cursor: pointer; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius); flex: 1;">
            <input type="radio" name="ferias-tipo" value="gozadas" checked />
            <div>
              <div style="font-weight: 600;">Gozadas</div>
              <div class="text-xs muted">PJ tirou folga</div>
            </div>
          </label>
          <label class="row" style="gap: 6px; cursor: pointer; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius); flex: 1;">
            <input type="radio" name="ferias-tipo" value="vendidas" />
            <div>
              <div style="font-weight: 600;">Vendidas</div>
              <div class="text-xs muted">Pagas em $</div>
            </div>
          </label>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="ferias-dias">Quantidade de dias <span style="color:var(--danger)">*</span></label>
          <input type="number" id="ferias-dias" required min="1" max="365" placeholder="ex: 15" />
        </div>
        <div class="field">
          <label for="ferias-data">Data da baixa</label>
          <input type="date" id="ferias-data" value="${hoje}" />
          <span class="field__hint">Quando a baixa foi feita.</span>
        </div>
      </div>
      <div class="field">
        <label for="ferias-obs">Observação</label>
        <input type="text" id="ferias-obs" placeholder="Ex: férias de janeiro, abono pecuniário..." />
      </div>
      <div id="ferias-info" class="text-xs muted" style="margin-top: 4px;"></div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-ferias">${icon("check")}<span>Dar baixa</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      const updateInfo = () => {
        const dias = Number($("#ferias-dias").value);
        const info = $("#ferias-info");
        if (!dias || dias <= 0) {
          info.textContent = "";
          return;
        }
        const novoSaldo = r.saldo - dias;
        if (novoSaldo < 0) {
          info.innerHTML = `Saldo após baixa: <strong style="color: var(--danger);">${novoSaldo} dia${Math.abs(novoSaldo) !== 1 ? "s" : ""}</strong> — vai ficar negativo.`;
        } else {
          info.innerHTML = `Saldo após baixa: <strong style="color: var(--success);">${novoSaldo} dia${Math.abs(novoSaldo) !== 1 ? "s" : ""}</strong>.`;
        }
      };
      $("#ferias-dias").addEventListener("input", updateInfo);
      $("#btn-save-ferias").addEventListener("click", () => saveFeriasPJ(pjId));
      setTimeout(() => $("#ferias-dias").focus(), 100);
    },
  });
}

function saveFeriasPJ(pjId) {
  const pj = (state.pjs || []).find((p) => p.id === pjId);
  if (!pj) return;
  const u = currentUser();
  const tipo = document.querySelector('input[name="ferias-tipo"]:checked')?.value || "gozadas";
  const dias = Number($("#ferias-dias").value);
  const data = $("#ferias-data").value || new Date().toISOString().slice(0, 10);
  const observacao = $("#ferias-obs").value.trim();
  if (!dias || dias <= 0) return toast("Informe a quantidade de dias.", "danger");

  const novo = {
    id: "fer-" + Date.now(),
    tipo,
    dias,
    data,
    observacao: observacao || null,
    criadoPor: u.id,
    criadoEm: new Date().toISOString(),
  };
  if (!pj.ferias) pj.ferias = [];
  pj.ferias.push(novo);

  store.save(state);
  closeModal();
  toast(`Baixa de ${dias} dia${dias !== 1 ? "s" : ""} registrada.`);
  setTimeout(() => {
    if ($("#pj-ferias-list")) renderPJFeriasList(pjId);
    renderApp();
  }, 50);
}

function deletePJFerias(pjId, feriasId) {
  const pj = (state.pjs || []).find((p) => p.id === pjId);
  if (!pj?.ferias) return;
  const baixa = pj.ferias.find((f) => f.id === feriasId);
  if (!baixa) return;
  const desc = `${baixa.dias} dia${baixa.dias !== 1 ? "s" : ""} ${baixa.tipo === "vendidas" ? "vendidas" : "gozadas"} (${formatDate(baixa.data)})`;
  if (!confirm(`Excluir a baixa de ${desc}? O saldo aumenta de volta.`)) return;

  pj.ferias = pj.ferias.filter((f) => f.id !== feriasId);
  store.save(state);
  toast("Baixa removida.");
  renderPJFeriasList(pjId);
  renderApp();
}

function deletePJ(id) {
  const pj = (state.pjs || []).find((p) => p.id === id);
  if (!pj) return;
  if (!confirm(`Excluir o PJ "${pj.nome}"? O histórico inteiro será perdido.`)) return;

  state.pjs = state.pjs.filter((p) => p.id !== id);
  store.save(state);
  closeModal();
  toast("PJ excluído.");
  renderApp();
}

// ---------- Configurações (Admin/RH) ----------

function renderConfig() {
  const u = currentUser();
  if (u.role !== "admin" && u.role !== "rh") {
    state.view.page = "dashboard";
    return renderApp();
  }
  $("#topbar-title").textContent = "Configurações";

  // Default tab = "tipos" pra RH, ou se não tem permissão pra users
  if (!state.view.configTab) state.view.configTab = "tipos";

  const tabs = [
    { id: "tipos", label: "Tipos de Ocorrência", icon: "tag" },
    { id: "acoes", label: "Ações", icon: "check" },
  ];
  if (u.role === "admin") tabs.push({ id: "usuarios", label: "Usuários", icon: "users" });

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>Configurações</h1>
        <p>Ajustes do sistema. Apenas administradores e RH.</p>
      </div>
    </header>

    <div class="tabs" id="config-tabs">
      ${tabs.map((t) => `
        <button class="tab ${state.view.configTab === t.id ? "active" : ""}" data-tab="${t.id}">
          ${t.label}
        </button>
      `).join("")}
    </div>

    <div id="config-content"></div>
  `;

  $$("#config-tabs .tab").forEach((b) => {
    b.addEventListener("click", () => {
      state.view.configTab = b.dataset.tab;
      renderConfig();
    });
  });

  // Render do conteúdo da tab
  if (state.view.configTab === "usuarios" && u.role === "admin") {
    renderUsuariosInto("#config-content");
  } else if (state.view.configTab === "acoes") {
    renderAcoesInto("#config-content");
  } else {
    renderTiposInto("#config-content");
  }
}

// ---------- Ações (CRUD via Configurações) ----------

function renderAcoesInto(selector) {
  const u = currentUser();
  if (u.role !== "admin" && u.role !== "rh") return;

  // Padrão = ids originais do código; Custom = ids criados via UI (custom-*).
  const padraoIds = new Set(ACOES.map((a) => a.id));
  const all = getAllAcoes();
  const padrao = all.filter((a) => padraoIds.has(a.id));
  const custom = all.filter((a) => !padraoIds.has(a.id));

  $(selector).innerHTML = `
    <div class="row row--between" style="margin: 16px 0 12px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-family: var(--font-display); font-size: 20px; margin: 0; color: var(--plum); font-weight: 700;">Ações</h2>
        <p style="margin: 4px 0 0; color: var(--text-muted); font-size: 13px;">Como o líder pode encaminhar uma ocorrência. Use pra refletir as práticas internas da empresa.</p>
      </div>
      <button class="btn btn--primary" id="btn-nova-acao">${icon("plus")}<span>Nova ação</span></button>
    </div>

    <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Padrão do sistema</div>
    <div class="list" style="margin-bottom:24px;">
      ${padrao.map((a) => `
        <article class="occ" style="grid-template-columns: 1fr auto; cursor:default;">
          <div class="occ__main">
            <div class="occ__name">${a.label}</div>
            <div class="occ__sub">id: ${a.id}${!a.padrao ? " · editado" : ""}</div>
          </div>
          <button class="btn btn--ghost btn--sm" data-edit-acao="${a.id}" title="Editar">${icon("edit")}</button>
        </article>
      `).join("")}
    </div>

    <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Personalizadas</div>
    ${custom.length === 0 ? `
      <div class="empty">
        <div class="empty__icon">${icon("check")}</div>
        <h3>Sem ações personalizadas</h3>
        <p>Crie ações extras se as 4 padrão não cobrirem alguma prática interna.</p>
        <button class="btn btn--soft" id="btn-nova-acao-2">${icon("plus")}<span>Criar primeira</span></button>
      </div>
    ` : `
      <div class="list">
        ${custom.map((a) => `
          <article class="occ" style="grid-template-columns: 1fr auto auto; cursor:default;" data-acao="${a.id}">
            <div class="occ__main">
              <div class="occ__name">${a.label}</div>
              <div class="occ__sub">id: ${a.id} · criado por ${getUser(a.criadoPor)?.nome || a.criadoPor || "—"}</div>
            </div>
            <button class="btn btn--ghost btn--sm" data-edit-acao="${a.id}" title="Editar">${icon("edit")}</button>
            <button class="btn btn--ghost btn--sm" data-delete-acao="${a.id}" title="Excluir">${icon("trash")}</button>
          </article>
        `).join("")}
      </div>
    `}
  `;

  $("#btn-nova-acao").addEventListener("click", openNovaAcaoModal);
  const btn2 = $("#btn-nova-acao-2");
  if (btn2) btn2.addEventListener("click", openNovaAcaoModal);

  $$("[data-delete-acao]").forEach((b) => {
    b.addEventListener("click", () => deleteAcao(b.dataset.deleteAcao));
  });
  $$("[data-edit-acao]").forEach((b) => {
    b.addEventListener("click", () => openEditAcaoModal(b.dataset.editAcao));
  });
}

function openEditAcaoModal(id) {
  const a = getAcao(id);
  if (!a) return toast("Ação não encontrada.", "danger");
  const isPadrao = ACOES.some((x) => x.id === id);

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Editar ação</h2>
        <p>${isPadrao
          ? "Ação padrão do sistema. Você pode renomear, mas o id <code>" + id + "</code> fica fixo (preserva ocorrências antigas)."
          : "Renomear. O id <code>" + id + "</code> não muda."}</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="form-edit-acao" onsubmit="return false">
      <div class="field">
        <label for="edit-acao-label">Nome da ação <span style="color:var(--danger)">*</span></label>
        <input type="text" id="edit-acao-label" required maxlength="40" value="${a.label}" />
      </div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-update-acao">${icon("check")}<span>Salvar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-update-acao").addEventListener("click", () => updateAcao(id));
      setTimeout(() => $("#edit-acao-label").focus(), 100);
    },
  });
}

function updateAcao(id) {
  const label = $("#edit-acao-label").value.trim();
  if (!label || label.length < 3) return toast("Nome muito curto.", "danger");

  if (!state.acoesCustom) state.acoesCustom = [];
  const existing = state.acoesCustom.find((x) => x.id === id);
  const u = currentUser();
  const dados = { id, label, padrao: false, atualizadoPor: u.id, atualizadoEm: new Date().toISOString() };
  if (existing) Object.assign(existing, dados);
  else state.acoesCustom.push(dados);

  store.save(state);
  closeModal();
  toast("Ação atualizada.");
  renderApp();
}

function openNovaAcaoModal() {
  openModal(`
    <div class="modal__header">
      <div>
        <h2>Nova ação</h2>
        <p>Aparece no dropdown que o líder usa pra encaminhar a ocorrência.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="form-acao" onsubmit="return false">
      <div class="field">
        <label for="acao-label">Nome da ação <span style="color:var(--danger)">*</span></label>
        <input type="text" id="acao-label" required maxlength="40" placeholder="Ex: Aviso por escrito" />
        <span class="field__hint">Curto e direto. Aparece igual em todos os turnos.</span>
      </div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-acao">${icon("check")}<span>Criar ação</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save-acao").addEventListener("click", saveAcao);
      setTimeout(() => $("#acao-label").focus(), 100);
    },
  });
}

function saveAcao() {
  const label = $("#acao-label").value.trim();
  if (!label) return toast("Informe o nome da ação.", "danger");
  if (label.length < 3) return toast("Nome muito curto.", "danger");

  const id = "custom-" + slugify(label);
  if (getAcao(id)) return toast("Já existe uma ação com nome parecido.", "danger");

  const u = currentUser();
  const nova = {
    id,
    label,
    padrao: false,
    criadoPor: u.id,
    criadoEm: new Date().toISOString(),
  };

  if (!state.acoesCustom) state.acoesCustom = [];
  state.acoesCustom.push(nova);
  store.save(state);
  closeModal();
  toast("Ação criada!");
  renderApp();
}

function deleteAcao(id) {
  const a = (state.acoesCustom || []).find((x) => x.id === id);
  if (!a) return;
  const usada = state.ocorrencias.some((o) => o.acao === id);
  if (usada) {
    if (!confirm(`"${a.label}" está em uso por ocorrências antigas. Excluir deixa elas com a ação como "—" e some do dropdown. Continuar?`)) return;
  } else {
    if (!confirm(`Excluir a ação "${a.label}"?`)) return;
  }
  state.acoesCustom = state.acoesCustom.filter((x) => x.id !== id);
  store.save(state);
  toast("Ação excluída.");
  renderApp();
}

// ---------- Tipos de Ocorrência (Admin/RH) ----------

const TONES = [
  { id: "neutral", label: "Neutro" },
  { id: "info", label: "Informativo" },
  { id: "warning", label: "Atenção" },
  { id: "danger", label: "Crítico" },
  { id: "success", label: "Positivo" },
];

function renderTipos() { renderTiposInto("#view"); }
function renderTiposInto(selector) {
  const u = currentUser();
  if (u.role !== "admin" && u.role !== "rh") return;

  // Padrão = ids originais do código (mesmo se foram editados/overrided).
  // Custom = ids criados via UI (custom-*).
  const padraoIds = new Set(TIPOS_OCORRENCIA.map((t) => t.id));
  const all = getAllTipos();
  const padrao = all.filter((t) => padraoIds.has(t.id));
  const custom = all.filter((t) => !padraoIds.has(t.id));

  $(selector).innerHTML = `
    <div class="row row--between" style="margin: 16px 0 12px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-family: var(--font-display); font-size: 20px; margin: 0; color: var(--plum); font-weight: 700;">Tipos de Ocorrência</h2>
        <p style="margin: 4px 0 0; color: var(--text-muted); font-size: 13px;">Motivos disponíveis no formulário de nova ocorrência.</p>
      </div>
      <button class="btn btn--primary" id="btn-novo-tipo">${icon("plus")}<span>Novo tipo</span></button>
    </div>

    <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Padrão do sistema</div>
    <div class="list" style="margin-bottom:24px;">
      ${padrao.map((t) => `
        <article class="occ" style="grid-template-columns: 1fr auto auto; cursor:default;">
          <div class="occ__main">
            <div class="occ__name">${t.label}</div>
            <div class="occ__sub">id: ${t.id}${!t.padrao ? " · editado" : ""}</div>
          </div>
          <span class="badge badge--${t.tone}">${TONES.find((to) => to.id === t.tone)?.label || t.tone}</span>
          <button class="btn btn--ghost btn--sm" data-edit-tipo="${t.id}" title="Editar">${icon("edit")}</button>
        </article>
      `).join("")}
    </div>

    <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Personalizados</div>
    ${custom.length === 0 ? `
      <div class="empty">
        <div class="empty__icon">${icon("tag")}</div>
        <h3>Sem tipos personalizados</h3>
        <p>Crie tipos extras se os padrão não cobrirem alguma situação específica do seu time.</p>
        <button class="btn btn--soft" id="btn-novo-tipo-2">${icon("plus")}<span>Criar primeiro tipo</span></button>
      </div>
    ` : `
      <div class="list">
        ${custom.map((t) => `
          <article class="occ" style="grid-template-columns: 1fr auto auto auto; cursor:default;" data-tipo="${t.id}">
            <div class="occ__main">
              <div class="occ__name">${t.label}</div>
              <div class="occ__sub">id: ${t.id} · criado por ${getUser(t.criadoPor)?.nome || t.criadoPor || "—"}</div>
            </div>
            <span class="badge badge--${t.tone}">${TONES.find((to) => to.id === t.tone)?.label || t.tone}</span>
            <button class="btn btn--ghost btn--sm" data-edit-tipo="${t.id}" title="Editar">${icon("edit")}</button>
            <button class="btn btn--ghost btn--sm" data-delete="${t.id}" title="Excluir">${icon("trash")}</button>
          </article>
        `).join("")}
      </div>
    `}
  `;

  $("#btn-novo-tipo").addEventListener("click", openNovoTipoModal);
  const btn2 = $("#btn-novo-tipo-2");
  if (btn2) btn2.addEventListener("click", openNovoTipoModal);

  $$("[data-delete]").forEach((b) => {
    b.addEventListener("click", () => deleteTipo(b.dataset.delete));
  });
  $$("[data-edit-tipo]").forEach((b) => {
    b.addEventListener("click", () => openEditTipoModal(b.dataset.editTipo));
  });
}

function openEditTipoModal(id) {
  const t = getTipo(id);
  if (!t) return toast("Tipo não encontrado.", "danger");
  const isPadrao = TIPOS_OCORRENCIA.some((x) => x.id === id);

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Editar tipo</h2>
        <p>${isPadrao
          ? "Tipo padrão do sistema. Você pode renomear e mudar a cor, mas o id <code>" + id + "</code> fica fixo (preserva ocorrências antigas)."
          : "Renomear e/ou trocar a cor."}</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="form-edit-tipo" onsubmit="return false">
      <div class="field">
        <label for="edit-tipo-label">Nome do tipo <span style="color:var(--danger)">*</span></label>
        <input type="text" id="edit-tipo-label" required maxlength="60" value="${t.label}" />
      </div>
      <div class="field">
        <label for="edit-tipo-tone">Cor/severidade</label>
        <select id="edit-tipo-tone">
          ${TONES.map((to) => `<option value="${to.id}" ${to.id === t.tone ? "selected" : ""}>${to.label}</option>`).join("")}
        </select>
      </div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-update-tipo">${icon("check")}<span>Salvar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-update-tipo").addEventListener("click", () => updateTipo(id));
      setTimeout(() => $("#edit-tipo-label").focus(), 100);
    },
  });
}

function updateTipo(id) {
  const label = $("#edit-tipo-label").value.trim();
  const tone = $("#edit-tipo-tone").value;
  if (!label || label.length < 3) return toast("Nome muito curto.", "danger");

  // Override no state.tiposCustom (Firestore /tipos no modo Firebase)
  if (!state.tiposCustom) state.tiposCustom = [];
  const existing = state.tiposCustom.find((x) => x.id === id);
  const u = currentUser();
  const dados = { id, label, tone, padrao: false, atualizadoPor: u.id, atualizadoEm: new Date().toISOString() };
  if (existing) Object.assign(existing, dados);
  else state.tiposCustom.push(dados);

  store.save(state);
  closeModal();
  toast("Tipo atualizado.");
  renderApp();
}

function openNovoTipoModal() {
  openModal(`
    <div class="modal__header">
      <div>
        <h2>Novo tipo de ocorrência</h2>
        <p>Será adicionado ao formulário e a quem registrar daqui pra frente.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="form-tipo" onsubmit="return false">
      <div class="field">
        <label for="tipo-label">Nome do tipo <span style="color:var(--danger)">*</span></label>
        <input type="text" id="tipo-label" required maxlength="60" placeholder="Ex: Saída para Treinamento" />
        <span class="field__hint">Aparece no dropdown de "Tipo de ocorrência" no momento de registrar.</span>
      </div>
      <div class="field">
        <label for="tipo-tone">Cor/severidade</label>
        <select id="tipo-tone">
          ${TONES.map((t) => `<option value="${t.id}" ${t.id === "neutral" ? "selected" : ""}>${t.label}</option>`).join("")}
        </select>
        <span class="field__hint">Define o tom do badge na listagem (não muda o fluxo).</span>
      </div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-tipo">${icon("check")}<span>Criar tipo</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save-tipo").addEventListener("click", saveTipo);
      setTimeout(() => $("#tipo-label").focus(), 100);
    },
  });
}

function slugify(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function saveTipo() {
  const label = $("#tipo-label").value.trim();
  const tone = $("#tipo-tone").value;
  if (!label) return toast("Informe o nome do tipo.", "danger");

  const id = "custom-" + slugify(label);
  if (getTipo(id)) return toast("Já existe um tipo com nome parecido.", "danger");
  if (label.length < 3) return toast("Nome muito curto.", "danger");

  const u = currentUser();
  const novo = {
    id,
    label,
    tone,
    padrao: false,
    criadoPor: u.id,
    criadoEm: new Date().toISOString(),
  };

  if (!state.tiposCustom) state.tiposCustom = [];
  state.tiposCustom.push(novo);
  store.save(state);
  closeModal();
  toast("Tipo criado!");
  renderApp();
}

function deleteTipo(id) {
  const t = (state.tiposCustom || []).find((x) => x.id === id);
  if (!t) return;
  const usado = state.ocorrencias.some((o) => o.tipo === id);
  if (usado) {
    if (!confirm(`"${t.label}" está em uso por ocorrências antigas. Excluir manterá os registros mas o tipo some do formulário. Continuar?`)) return;
  } else {
    if (!confirm(`Excluir o tipo "${t.label}"?`)) return;
  }
  state.tiposCustom = state.tiposCustom.filter((x) => x.id !== id);
  store.save(state);
  toast("Tipo excluído.");
  renderApp();
}

// ---------- Usuários (Admin) ----------

function renderUsuarios() { renderUsuariosInto("#view"); }
function renderUsuariosInto(selector) {
  const isFirebaseMode = typeof window.inviteUser === "function";

  $(selector).innerHTML = `
    <div class="row row--between" style="margin: 16px 0 12px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-family: var(--font-display); font-size: 20px; margin: 0; color: var(--plum); font-weight: 700;">Usuários do sistema</h2>
        <p style="margin: 4px 0 0; color: var(--text-muted); font-size: 13px;">Quem acessa, com qual papel e qual turno.</p>
      </div>
      <button class="btn btn--primary" id="btn-novo-user" ${!isFirebaseMode ? `disabled title="Disponível apenas em modo Firebase"` : ""}>${icon("plus")}<span>Novo usuário</span></button>
    </div>

    <div class="list">
      ${state.users.map((u) => `
        <article class="occ" data-edit-user="${u.id}"
                 style="grid-template-columns: 44px 1fr auto; cursor:${isFirebaseMode ? "pointer" : "default"}; opacity:${u.ativo === false ? "0.55" : "1"};"
                 title="${isFirebaseMode ? "Clique para editar" : ""}">
          <div class="avatar" data-uid="${u.id}">${initials(u.nome || u.email || "?")}</div>
          <div class="occ__main">
            <div class="occ__name">
              ${escapeHtml(u.nome || "(sem nome)")}
              ${u.ativo === false ? `<span class="badge badge--neutral" style="margin-left:6px; font-size:10px;">INATIVO</span>` : ""}
            </div>
            <div class="occ__sub">${escapeHtml(u.email || "@" + u.id)}</div>
          </div>
          <span class="badge badge--${u.role === "admin" ? "danger" : u.role === "rh" ? "info" : "neutral"}">${roleLabel(u)}</span>
        </article>
      `).join("")}
    </div>

    ${!isFirebaseMode ? `
      <div style="margin-top:24px;">
        <button class="btn btn--ghost" id="reset-btn">${icon("alert")}<span>Resetar dados locais</span></button>
        <span class="text-xs muted" style="display:block; margin-top:6px;">Útil apenas em modo demo. No Firebase, dados ficam no Firestore.</span>
      </div>
    ` : ""}
  `;

  const novo = $("#btn-novo-user");
  if (novo && isFirebaseMode) novo.addEventListener("click", openNovoUsuarioModal);

  // Cards clicáveis para edição (admin only, em modo Firebase)
  if (isFirebaseMode) {
    $$(`${selector} article[data-edit-user]`).forEach((card) => {
      card.addEventListener("click", () => {
        const uid = card.dataset.editUser;
        openEditarUsuarioModal(uid);
      });
    });
    // Aplica fotos nos avatars
    $$(`${selector} .avatar[data-uid]`).forEach((el) => {
      const usr = state.users.find((x) => x.id === el.dataset.uid);
      if (usr) aplicarAvatar(el, usr);
    });
  }

  const reset = $("#reset-btn");
  if (reset) {
    reset.addEventListener("click", () => {
      if (confirm("Apagar todos os registros locais e voltar ao seed inicial?")) {
        const fresh = store.reset();
        Object.assign(state, fresh);
        state.view = { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" };
        toast("Dados resetados.");
        renderApp();
      }
    });
  }
}

function openNovoUsuarioModal() {
  openModal(`
    <div class="modal__header">
      <div>
        <h2>Novo usuário</h2>
        <p>Cria a conta no Firebase Auth e o perfil em Firestore. O usuário recebe email pra definir a própria senha.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="user-form" onsubmit="return false">
      <div class="field">
        <label for="user-nome">Nome completo <span style="color:var(--danger)">*</span></label>
        <input type="text" id="user-nome" required placeholder="Ex: Adelir Padilha" />
      </div>
      <div class="field">
        <label for="user-email">Email corporativo <span style="color:var(--danger)">*</span></label>
        <input type="email" id="user-email" required placeholder="adelir@fiobras.com.br" />
        <span class="field__hint">Será o login dele(a). Email pra redefinição vai pra este endereço.</span>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="novo-user-role">Papel <span style="color:var(--danger)">*</span></label>
          <select id="novo-user-role" required>
            <option value="rh">RH (cria e edita ocorrências)</option>
            <option value="lider">Líder (confere ocorrências do turno)</option>
            <option value="supervisor">Supervisor (confere funcionários específicos)</option>
            <option value="admin">Administrador (acesso total)</option>
          </select>
        </div>
        <div class="field" id="user-turno-field" style="display:none;">
          <label for="user-turno">Turno <span style="color:var(--danger)">*</span></label>
          <select id="user-turno">
            <option value="1">1º Turno (06:00–14:00)</option>
            <option value="2">2º Turno (14:00–22:00)</option>
            <option value="3">3º Turno (22:00–06:00)</option>
            <option value="geral">Geral (horário comercial)</option>
          </select>
        </div>
      </div>
      <div class="field" id="user-superv-hint" style="display:none;">
        <span class="field__hint">Defina os funcionários visíveis após criar, na edição do usuário.</span>
      </div>
    </form>
    <div id="user-result" style="display:none;"></div>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-user">${icon("plus")}<span>Criar conta</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));

      const roleSel = $("#novo-user-role");
      const turnoField = $("#user-turno-field");
      const supervHint = $("#user-superv-hint");
      const toggleTurno = () => {
        turnoField.style.display = roleSel.value === "lider" ? "block" : "none";
        if (supervHint) supervHint.style.display = roleSel.value === "supervisor" ? "block" : "none";
      };
      roleSel.addEventListener("change", toggleTurno);
      toggleTurno();

      $("#btn-save-user").addEventListener("click", criarUsuario);
      setTimeout(() => $("#user-nome").focus(), 100);
    },
  });
}

async function criarUsuario() {
  const btn = $("#btn-save-user");
  btn.disabled = true;
  btn.innerHTML = icon("clock") + "<span>Criando...</span>";

  const dados = {
    nome: $("#user-nome").value.trim(),
    email: $("#user-email").value.trim().toLowerCase(),
    role: $("#novo-user-role").value,
    turno: $("#novo-user-role").value === "lider" ? $("#user-turno").value : null,
  };

  const res = await window.inviteUser(dados);

  if (!res.ok) {
    toast(res.err || "Erro ao criar usuário.", "danger");
    btn.disabled = false;
    btn.innerHTML = icon("plus") + "<span>Criar conta</span>";
    return;
  }

  // Sucesso — mostra credenciais
  $("#user-result").style.display = "block";
  $("#user-result").innerHTML = `
    <div style="background: var(--success-bg); border: 1px solid var(--success); border-radius: var(--radius); padding: 16px; margin: 16px 28px;">
      <div style="font-weight: 700; color: var(--success); margin-bottom: 8px;">
        ${icon("check")} Conta criada com sucesso
      </div>
      <div class="text-sm" style="line-height: 1.7;">
        <strong>Email:</strong> ${escapeHtml(res.email)}<br/>
        <strong>Senha temporária:</strong> <code style="background: white; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${res.tempPassword}</code><br/>
        ${res.resetEnviado
          ? `<span class="muted">${icon("check")} Email de redefinição enviado — o usuário pode usar tanto a senha temporária quanto o link do email.</span>`
          : `<span class="muted">Email de redefinição falhou. Compartilhe a senha temporária manualmente.</span>`}
      </div>
    </div>
  `;
  $("#btn-save-user").style.display = "none";

  toast("Usuário criado!");
  renderApp(); // atualiza lista no fundo
}

function openEditarUsuarioModal(uid) {
  const u = state.users.find((x) => x.id === uid);
  if (!u) return toast("Usuário não encontrado.", "danger");

  const me = currentUser();
  const ehVoceMesmo = uid === me?.id;

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Editar usuário</h2>
        <p>${escapeHtml(u.email || "(sem email)")} ${ehVoceMesmo ? `<span class="badge badge--neutral" style="margin-left:6px;">VOCÊ</span>` : ""}</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="edit-user-form" onsubmit="return false">
      <div class="field">
        <label for="edit-nome">Nome completo <span style="color:var(--danger)">*</span></label>
        <input type="text" id="edit-nome" required value="${escapeHtml(u.nome || "")}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="edit-role">Papel <span style="color:var(--danger)">*</span></label>
          <select id="edit-role" required ${ehVoceMesmo ? "disabled" : ""}>
            <option value="rh" ${u.role === "rh" ? "selected" : ""}>RH</option>
            <option value="lider" ${u.role === "lider" ? "selected" : ""}>Líder</option>
            <option value="supervisor" ${u.role === "supervisor" ? "selected" : ""}>Supervisor</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Administrador</option>
          </select>
          ${ehVoceMesmo ? `<span class="field__hint">Você não pode mudar seu próprio papel.</span>` : ""}
        </div>
        <div class="field" id="edit-turno-field" style="display:${u.role === "lider" ? "block" : "none"};">
          <label for="edit-turno">Turno <span style="color:var(--danger)">*</span></label>
          <select id="edit-turno">
            <option value="1" ${u.turno == 1 ? "selected" : ""}>1º Turno (06:00–14:00)</option>
            <option value="2" ${u.turno == 2 ? "selected" : ""}>2º Turno (14:00–22:00)</option>
            <option value="3" ${u.turno == 3 ? "selected" : ""}>3º Turno (22:00–06:00)</option>
            <option value="geral" ${u.turno === "geral" ? "selected" : ""}>Geral (horário comercial)</option>
          </select>
        </div>
      </div>

      <div class="field" id="edit-superv-field" style="display:${u.role === "supervisor" ? "block" : "none"};">
        <label>Funcionários visíveis <span style="color:var(--danger)">*</span></label>
        <input type="text" id="superv-search" placeholder="Buscar funcionário..." style="margin-bottom:8px;" />
        <div id="superv-list" class="superv-picker"></div>
        <span class="field__hint"><span id="superv-count">0</span> selecionados</span>
      </div>

      <div class="divider"></div>

      <label class="row" style="gap:10px; align-items:center; cursor:pointer; padding:8px 0;">
        <input type="checkbox" id="edit-ativo" ${u.ativo !== false ? "checked" : ""} ${ehVoceMesmo ? "disabled" : ""} style="width:18px; height:18px;" />
        <div>
          <div style="font-weight:600;">Usuário ativo</div>
          <div class="text-xs muted">Desmarcar impede o login. ${ehVoceMesmo ? "Você não pode se desativar." : ""}</div>
        </div>
      </label>

      <div id="edit-user-error" class="field__error hidden" style="margin-top:8px;"></div>
    </form>
    <div class="modal__footer">
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-edit-user">${icon("check")}<span>Salvar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      const roleSel = $("#edit-role");
      const turnoField = $("#edit-turno-field");
      const supervField = $("#edit-superv-field");

      // Estado do picker de supervisor: Set de funcionarioIds selecionados.
      // Sobrevive à re-filtragem da busca (a lista re-renderiza, mas o Set
      // mantém quem está marcado, inclusive itens fora do filtro atual).
      const selecionados = new Set(Array.isArray(u.funcionariosVisiveis) ? u.funcionariosVisiveis : []);

      const atualizarContador = () => {
        const c = $("#superv-count");
        if (c) c.textContent = String(selecionados.size);
      };

      // Popula #superv-list com checkboxes dos funcionários ATIVOS que casam
      // com o filtro. Cada checkbox marca/desmarca no Set local.
      const renderSupervPicker = (filtro) => {
        const root = $("#superv-list");
        if (!root) return;
        const termo = (filtro || "").toLowerCase();
        const ativos = (state.funcionarios || [])
          .filter((f) => f.ativo !== false)
          .filter((f) =>
            !termo ||
            (f.nome || "").toLowerCase().includes(termo) ||
            (f.codigo || "").toLowerCase().includes(termo)
          )
          .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

        if (ativos.length === 0) {
          root.innerHTML = `<div class="superv-picker__empty">Nenhum funcionário encontrado.</div>`;
          return;
        }

        root.innerHTML = ativos.map((f) => {
          const checked = selecionados.has(f.id) ? "checked" : "";
          const meta = [f.codigo ? "cód " + escapeHtml(f.codigo) : "", f.turno ? (TURNOS[f.turno]?.label || "") : ""].filter(Boolean).join(" · ");
          return `
            <label class="superv-picker__item">
              <input type="checkbox" value="${escapeHtml(f.id)}" ${checked} />
              <span class="superv-picker__nome">${escapeHtml(f.nome || "?")}</span>
              ${meta ? `<span class="superv-picker__meta">${meta}</span>` : ""}
            </label>`;
        }).join("");

        root.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          cb.addEventListener("change", () => {
            if (cb.checked) selecionados.add(cb.value);
            else selecionados.delete(cb.value);
            atualizarContador();
          });
        });
      };

      const aplicarVisibilidadePapel = () => {
        const r = roleSel.value;
        turnoField.style.display = r === "lider" ? "block" : "none";
        supervField.style.display = r === "supervisor" ? "block" : "none";
        if (r === "supervisor") renderSupervPicker($("#superv-search")?.value || "");
      };

      roleSel.addEventListener("change", aplicarVisibilidadePapel);
      if ($("#superv-search")) {
        $("#superv-search").addEventListener("input", debounce(() => renderSupervPicker($("#superv-search").value), 120));
      }
      aplicarVisibilidadePapel();
      atualizarContador();

      $("#btn-save-edit-user").addEventListener("click", async () => {
        const nome = $("#edit-nome").value.trim();
        if (nome.length < 2) {
          const err = $("#edit-user-error");
          err.textContent = "Nome muito curto.";
          err.classList.remove("hidden");
          return;
        }
        const role = ehVoceMesmo ? u.role : roleSel.value;
        const turno = role === "lider" ? $("#edit-turno").value : null;
        const ativo = ehVoceMesmo ? true : $("#edit-ativo").checked;

        // Coleta a lista do picker quando supervisor; pros demais, zera.
        const funcionariosVisiveis = role === "supervisor" ? [...selecionados] : [];
        if (role === "supervisor" && funcionariosVisiveis.length === 0) {
          const err = $("#edit-user-error");
          err.textContent = "Selecione ao menos um funcionário visível.";
          err.classList.remove("hidden");
          return;
        }

        const btn = $("#btn-save-edit-user");
        btn.disabled = true;
        btn.innerHTML = icon("clock") + "<span>Salvando...</span>";

        const res = await window.atualizarUsuario(uid, { nome, role, turno, ativo, funcionariosVisiveis });
        if (!res.ok) {
          const err = $("#edit-user-error");
          err.textContent = res.err || "Erro ao salvar.";
          err.classList.remove("hidden");
          btn.disabled = false;
          btn.innerHTML = icon("check") + "<span>Salvar</span>";
          return;
        }

        toast("Usuário atualizado.");
        closeModal();
        renderApp();
      });

      setTimeout(() => $("#edit-nome").focus(), 100);
    },
  });
}

// ============================================================
// ---------- Chat interno 1:1 ----------
// Mensagens de texto entre usuários online. Conversa some em 3 dias (TTL
// via expiraEm no Firestore). Lista esquerda = conversas existentes (de
// state.mensagensRecebidas) + quem está online agora (state.presence).
// Subscription da conversa aberta vive em _chatConvUnsub (módulo, topo).
// ============================================================

// Firebase disponível? (modo demo não tem as funções window.* do chat)
function chatDisponivel() {
  return typeof window.enviarMensagem === "function"
    && typeof window.escutarConversa === "function";
}

// Hora curta (HH:MM) a partir de ISO. "" se inválido (msg otimista sem ts).
function formatHoraCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// uid do usuário atual. Em modo Firebase currentUser().id === auth.currentUser.uid.
function meuUid() {
  const u = currentUser();
  return u ? u.id : null;
}

// Está online agora? (presença ativa). Usado pro ponto verde.
function peerOnline(uid) {
  return (state.presence || []).some((p) => p.uid === uid && p.status === "ativo");
}

// Monta a lista de "contatos/conversas" pra coluna esquerda.
// Une: (a) pessoas de quem recebi msg, (b) usuários online agora (exceto eu).
// Cada item: { uid, nome, online, naoLidas, ultimaMsg, ultimaEm }.
function montarListaContatosChat() {
  const meu = meuUid();
  const mapa = new Map();

  // (a) de mensagens recebidas — agrupa por remetente (de/deNome)
  for (const m of (state.mensagensRecebidas || [])) {
    if (!m.de || m.de === meu) continue;
    const ex = mapa.get(m.de) || { uid: m.de, nome: m.deNome || "?", online: false, naoLidas: 0, ultimaMsg: "", ultimaEm: null };
    if (!m.lido) ex.naoLidas += 1;
    // mensagensRecebidas vem ordenado desc; a primeira que vemos por uid é a mais recente
    if (!ex.ultimaEm) { ex.ultimaMsg = m.texto || ""; ex.ultimaEm = m.criadoEm || null; }
    mapa.set(m.de, ex);
  }

  // (b) TODOS os usuários do sistema (exceto eu) — pra poder mandar msg
  // pra qualquer um, online ou offline.
  for (const usr of (state.users || [])) {
    if (!usr.id || usr.id === meu) continue;
    const ex = mapa.get(usr.id) || { uid: usr.id, nome: usr.nome || "?", online: false, naoLidas: 0, ultimaMsg: "", ultimaEm: null };
    if (!ex.nome || ex.nome === "?") ex.nome = usr.nome || "?";
    mapa.set(usr.id, ex);
  }

  // (c) presença — marca quem está online agora (ponto verde)
  for (const p of (state.presence || [])) {
    if (!p.uid || p.uid === meu) continue;
    const ex = mapa.get(p.uid) || { uid: p.uid, nome: p.nome || "?", online: false, naoLidas: 0, ultimaMsg: "", ultimaEm: null };
    ex.online = p.status === "ativo";
    if (!ex.nome || ex.nome === "?") ex.nome = p.nome || "?";
    mapa.set(p.uid, ex);
  }

  const lista = Array.from(mapa.values());
  // Ordena: não-lidas primeiro, depois online, depois alfabético
  lista.sort((a, b) => {
    if ((b.naoLidas > 0) !== (a.naoLidas > 0)) return (b.naoLidas > 0) ? 1 : -1;
    if (a.online !== b.online) return a.online ? -1 : 1;
    return (a.nome || "").localeCompare(b.nome || "");
  });
  return lista;
}

// ---------- Chat: widget flutuante (FAB estilo WhatsApp) ----------
// O chat vive num painel sobreposto (não mais numa página/aba). Os IDs
// internos #chat-contatos e #chat-thread são os MESMOS que as funções de
// lista/thread targetam, então a lógica de mensagens é reaproveitada inteira.

function abrirChatWidget() {
  const w = $("#chat-widget"); if (!w) return;
  w.hidden = false;
  document.body.classList.add("chat-widget-aberto");
  if (!chatDisponivel()) {
    w.classList.remove("tem-thread");
    $("#chat-contatos").innerHTML = `<div class="chat-empty-state">${icon("message")}<p>Chat disponível só no modo Firebase.</p></div>`;
    $("#chat-thread").innerHTML = "";
    return;
  }
  renderChatLista();
  const peer = state.view.chatPeer;
  if (peer && peer.uid) {
    abrirConversa(peer.uid, peer.nome);
  } else {
    w.classList.remove("tem-thread");
    $("#chat-thread").innerHTML = `<div class="chat__sem-peer">${icon("message")}<p>Escolha uma conversa.</p></div>`;
  }
}

function fecharChatWidget() {
  const w = $("#chat-widget"); if (!w) return;
  w.hidden = true;
  document.body.classList.remove("chat-widget-aberto");
  pararEscutaConversa();
}

function toggleChatWidget() {
  const w = $("#chat-widget");
  if (w && w.hidden) abrirChatWidget(); else fecharChatWidget();
}

// Renderiza só a coluna esquerda (lista de contatos/conversas).
// Chamável pelo listener global quando chegam novas msgs.
function renderChatLista() {
  const cont = $("#chat-contatos");
  if (!cont) return;
  const peer = state.view.chatPeer || null;
  const lista = montarListaContatosChat();

  if (lista.length === 0) {
    cont.innerHTML = `<div class="chat__contatos-vazio">Ninguém online pra conversar agora.</div>`;
    return;
  }

  cont.innerHTML = lista.map((c) => {
    const ativo = peer && peer.uid === c.uid;
    const preview = c.ultimaMsg
      ? escapeHtml(c.ultimaMsg.length > 40 ? c.ultimaMsg.slice(0, 40) + "…" : c.ultimaMsg)
      : (c.online ? "online" : "");
    const foto = (state.users || []).find((x) => x.id === c.uid)?.fotoBase64;
    const avStyle = foto
      ? `background-image:url(${foto}); background-size:cover; background-position:center;`
      : `background:${presenceColor(c.uid)};`;
    return `
      <button class="chat__contato ${c.online ? "chat__contato--online" : ""} ${ativo ? "is-active" : ""}"
              data-uid="${escapeHtml(c.uid)}" data-nome="${escapeHtml(c.nome)}">
        <span class="chat__avatar" style="${avStyle}">
          ${foto ? "" : escapeHtml(initials(c.nome || "?"))}
          ${c.online ? `<span class="chat__online-dot"></span>` : ""}
        </span>
        <span class="chat__contato-info">
          <span class="chat__contato-nome">${escapeHtml(c.nome || "?")}</span>
          <span class="chat__contato-preview">${preview}</span>
        </span>
        ${c.naoLidas > 0 ? `<span class="chat__contato-badge">${c.naoLidas > 9 ? "9+" : c.naoLidas}</span>` : ""}
      </button>`;
  }).join("");

  $$("#chat-contatos .chat__contato").forEach((btn) => {
    btn.addEventListener("click", () => {
      const uid = btn.dataset.uid;
      const nome = btn.dataset.nome;
      state.view.chatPeer = { uid, nome };
      renderChatLista(); // atualiza highlight ativo
      abrirConversa(uid, nome);
    });
  });
}

// Abre/assina a conversa com um peer. Cancela a subscription anterior.
function abrirConversa(peerUid, peerNome) {
  pararEscutaConversa();
  const meu = meuUid();
  if (!meu || !chatDisponivel()) return;

  const parKey = window.parKeyChat(meu, peerUid);

  // No widget flutuante, a thread cobre a lista de contatos.
  $("#chat-widget")?.classList.add("tem-thread");

  // Render inicial do "carregando" enquanto o 1º snapshot não chega
  const thread = $("#chat-thread");
  if (thread) {
    thread.innerHTML = chatThreadShell(peerNome, peerUid, `<div class="chat__msgs-carregando">Carregando…</div>`);
    wireChatThread(peerUid, peerNome);
  }

  _chatConvUnsub = window.escutarConversa(peerUid, (msgs, err) => {
    if (err) {
      const area = $("#chat-msgs");
      if (area) area.innerHTML = `<div class="chat__msgs-vazio">Não foi possível carregar agora. Feche e abra a conversa de novo.</div>`;
      return;
    }
    renderChatThread(peerUid, peerNome, msgs);
    // Marca como lidas as recebidas desta conversa (best-effort)
    window.marcarConversaLida(parKey).catch((e) => console.warn("[chat] marcarLida:", e?.message || e));
  });
}

// HTML do "esqueleto" da thread (header + área de msgs + composer).
function chatThreadShell(peerNome, peerUid, msgsHtml) {
  const online = peerOnline(peerUid);
  const foto = (state.users || []).find((x) => x.id === peerUid)?.fotoBase64;
  const avStyle = foto
    ? `background-image:url(${foto}); background-size:cover; background-position:center;`
    : `background:${presenceColor(peerUid)};`;
  return `
    <div class="chat__thread-head">
      <button class="chat__voltar" id="chat-voltar" aria-label="Voltar">${icon("arrowLeft")}</button>
      <span class="chat__avatar chat__avatar--sm" style="${avStyle}">
        ${foto ? "" : escapeHtml(initials(peerNome || "?"))}
        ${online ? `<span class="chat__online-dot"></span>` : ""}
      </span>
      <span class="chat__thread-head-info">
        <span class="chat__thread-nome">${escapeHtml(peerNome || "?")}</span>
        <span class="chat__thread-status">${online ? "online" : "offline"}</span>
      </span>
    </div>
    <div class="chat__msgs" id="chat-msgs">${msgsHtml}</div>
    <form class="chat__composer" id="chat-composer">
      <textarea id="chat-input" rows="1" maxlength="2000" placeholder="Escreva uma mensagem"></textarea>
      <button type="submit" class="chat__enviar" aria-label="Enviar">${icon("send")}</button>
    </form>`;
}

// Renderiza a thread completa (balões + composer) e re-wira eventos.
function renderChatThread(peerUid, peerNome, msgs) {
  const thread = $("#chat-thread");
  if (!thread) return;
  const meu = meuUid();

  let bolhas;
  if (!msgs || msgs.length === 0) {
    bolhas = `<div class="chat__msgs-vazio">Nenhuma mensagem ainda. Diga oi!</div>`;
  } else {
    bolhas = msgs.map((m) => {
      const minha = m.de === meu;
      const hora = formatHoraCurta(m.criadoEm);
      return `
        <div class="chat__bolha ${minha ? "chat__bolha--minha" : ""}">
          <span class="chat__bolha-texto">${escapeHtml(m.texto || "")}</span>
          ${hora ? `<span class="chat__bolha-hora">${hora}</span>` : ""}
        </div>`;
    }).join("");
  }

  // Preserva o que o usuário já digitou ao re-renderizar
  const inputAtual = $("#chat-input");
  const rascunho = inputAtual ? inputAtual.value : "";

  thread.innerHTML = chatThreadShell(peerNome, peerUid, bolhas);
  wireChatThread(peerUid, peerNome);

  const input = $("#chat-input");
  if (input && rascunho) { input.value = rascunho; autoGrowTextarea(input); }

  // Auto-scroll pro fim
  const cont = $("#chat-msgs");
  if (cont) cont.scrollTop = cont.scrollHeight;
}

// Auto-cresce o textarea conforme o conteúdo (até um teto via CSS max-height).
function autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

// Wire dos eventos da thread (voltar, enviar, Enter/Shift+Enter, auto-grow).
function wireChatThread(peerUid, peerNome) {
  const voltar = $("#chat-voltar");
  if (voltar) {
    voltar.addEventListener("click", () => {
      pararEscutaConversa();
      state.view.chatPeer = null;
      // Volta pra lista de contatos: a thread deixa de cobrir a lista.
      $("#chat-widget")?.classList.remove("tem-thread");
      const thread = $("#chat-thread");
      if (thread) thread.innerHTML = `<div class="chat__sem-peer">${icon("message")}<p>Escolha uma conversa.</p></div>`;
      renderChatLista();
    });
  }

  const form = $("#chat-composer");
  const input = $("#chat-input");
  if (input) {
    input.addEventListener("input", () => autoGrowTextarea(input));
    // Enter envia; Shift+Enter quebra linha
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarDoComposer(peerUid, peerNome);
      }
    });
    setTimeout(() => input.focus(), 30);
  }
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      enviarDoComposer(peerUid, peerNome);
    });
  }
}

// Lê o composer, envia a msg e limpa o input. O onSnapshot traz a msg de volta.
async function enviarDoComposer(peerUid, peerNome) {
  const input = $("#chat-input");
  if (!input) return;
  const texto = input.value.trim();
  if (!texto) return;
  if (!chatDisponivel()) { toast("Chat disponível só no modo Firebase.", "danger"); return; }

  // Limpa já (otimista na UX do input); se falhar, restaura
  input.value = "";
  autoGrowTextarea(input);
  input.focus();

  try {
    await window.enviarMensagem(peerUid, peerNome, texto);
  } catch (err) {
    console.error(err);
    toast(err.message || "Erro ao enviar mensagem.", "danger");
    input.value = texto;
    autoGrowTextarea(input);
  }
}

// Atalho usado pelo dropdown de presença: abre o WIDGET de chat já no peer escolhido.
function abrirChatCom(uid, nome) {
  state.view.chatPeer = { uid, nome };
  fecharPresenceDropdown();
  abrirChatWidget();
}

// ---------- Helpers de copy ----------

function greetingText(u) {
  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const primeiro = u.nome.split(" ")[0];
  return `${saudacao}, ${primeiro}`;
}

function currentMonthLabel() {
  const d = new Date();
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function countActiveFuncs(u) {
  if (u.role === "lider") return state.funcionarios.filter((f) => f.turno === u.turno).length;
  if (u.role === "supervisor") return state.funcionarios.filter((f) => podeVerFuncionario(u, f)).length;
  return state.funcionarios.length;
}

// ---------- Sidebar mobile ----------

function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#sidebar-backdrop").classList.add("show");
}
function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sidebar-backdrop").classList.remove("show");
}

// ---------- Boot ----------

document.addEventListener("DOMContentLoaded", () => {
  renderLoginQuick();

  // Em modo Firebase: ajusta labels/placeholders pra login real (email + senha)
  if (document.documentElement.classList.contains("firebase-mode")) {
    const lblUser = document.querySelector('label[for="login-user"]');
    if (lblUser) lblUser.textContent = "E-mail";
    const inpUser = $("#login-user");
    if (inpUser) {
      inpUser.placeholder = "seu@fiobras.com.br";
      inpUser.type = "email";
      inpUser.autocomplete = "email";
    }
    const inpPass = $("#login-pass");
    if (inpPass) {
      inpPass.placeholder = "sua senha";
      inpPass.autocomplete = "current-password";
    }
  }

  // Auto-restore session if user was logged in
  if (state.currentUserId && getUser(state.currentUserId)) {
    $("#login").classList.add("hidden");
    $("#app").classList.remove("hidden");
    state.view = { page: "dashboard", filterTab: "pendentes", filterTurno: null, search: "" };
    renderApp();
  }

  // Login form com loading state no botão
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn.disabled) return;

    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="icon spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Entrando...</span>`;
    $("#login-user").disabled = true;
    $("#login-pass").disabled = true;

    const user = $("#login-user").value.trim().toLowerCase();
    const pass = $("#login-pass").value;

    let ok = false;
    try {
      ok = await Promise.resolve(login(user, pass));
    } catch (err) {
      console.error(err);
    }

    if (!ok) {
      // Erro — restaura botão + inputs
      btn.disabled = false;
      btn.innerHTML = origHTML;
      $("#login-user").disabled = false;
      $("#login-pass").disabled = false;
    }
    // Se ok: deixa o botão em "Entrando..." enquanto Firebase carrega
    // dados; quando renderApp() rodar, o user já não vê a tela de login.
  });

  // Logout
  $("#user-area").addEventListener("click", openProfileModal);

  // Reset de senha (só ativo em modo Firebase via window.firebaseResetSenha)
  const forgot = $("#btn-forgot");
  if (forgot) {
    forgot.addEventListener("click", () => {
      if (typeof window.firebaseResetSenha === "function") {
        window.firebaseResetSenha();
      } else {
        toast("Recuperação de senha só funciona em modo Firebase.", "danger");
      }
    });
  }

  // Olhinho: mostra/oculta a senha no login
  $("#toggle-senha")?.addEventListener("click", () => {
    const inp = $("#login-pass");
    const btn = $("#toggle-senha");
    if (!inp || !btn) return;
    const mostrar = inp.type === "password";
    inp.type = mostrar ? "text" : "password";
    btn.querySelector(".icon-olho")?.classList.toggle("hidden", mostrar);
    btn.querySelector(".icon-olho-off")?.classList.toggle("hidden", !mostrar);
    btn.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
    btn.setAttribute("title", mostrar ? "Ocultar senha" : "Mostrar senha");
    inp.focus();
  });

  // Sidebar
  $("#menu-btn").addEventListener("click", openSidebar);
  $("#sidebar-backdrop").addEventListener("click", closeSidebar);

  // Chat flutuante: FAB abre/fecha o painel; X fecha. Elementos estáticos no
  // index.html (não recriados no re-render), então registra uma única vez.
  $("#chat-fab")?.addEventListener("click", toggleChatWidget);
  $("#chat-widget-close")?.addEventListener("click", fecharChatWidget);

  // ESC fecha modais e drawer da sidebar mobile
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    // Prioridade: modal > sidebar
    if (document.querySelector("#modal-backdrop")) {
      e.preventDefault();
      closeModal();
      return;
    }
    if ($("#sidebar")?.classList.contains("open")) {
      e.preventDefault();
      closeSidebar();
    }
  });
});

// PWA: register service worker if available (silent fail in file://)
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
