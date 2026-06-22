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
// Estado do render incremental da conversa aberta (anexa só msgs novas).
let _chatRender = null;
function pararEscutaConversa() {
  if (_chatConvUnsub) { _chatConvUnsub(); _chatConvUnsub = null; }
}
// Exposto pro firebase.js cancelar no logout (limparPresenca).
window.pararEscutaConversa = pararEscutaConversa;

// ---------- Helpers ----------

// Helpers puros (DOM $/$$, debounce, debug, validação, datas/formatação,
// initials/slugify, ícones) vivem em utils.js — carregado antes deste
// arquivo, continuam funções globais.

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

// ============================================
// Micro-interações (sutis). O CSS cuida de hover/press/abas; o JS faz a
// entrada escalonada, o count-up dos números e a proximidade na sidebar.
// Tudo respeita prefers-reduced-motion.
// ============================================
function prefereMenosMovimento() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

// Entrada escalonada: delay incremental nos filhos diretos + marca o container.
// Usar só no 1º paint de uma tela (não em re-render de busca/filtro).
function animarEntrada(container) {
  if (!container || prefereMenosMovimento()) return;
  [...container.children].forEach((k, i) => {
    k.style.animationDelay = Math.min(i * 42, 380) + "ms";
  });
  container.classList.add("stagger-in");
}

// Conta de 0 até o valor final em cada .stat__value que seja inteiro puro.
function animarNumeros(scope) {
  const root = typeof scope === "string" ? document.querySelector(scope) : (scope || document);
  if (!root || prefereMenosMovimento()) return;
  root.querySelectorAll(".stat__value").forEach((el) => {
    const txt = (el.textContent || "").trim();
    if (!/^\d{1,7}$/.test(txt)) return; // só inteiros puros (ignora "hoje", "0h00"...)
    const to = parseInt(txt, 10);
    if (to <= 0) return;
    const dur = 700, t0 = performance.now();
    el.textContent = "0";
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(to * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// Proximidade na sidebar: itens crescem de leve conforme o cursor se aproxima
// (eixo vertical). Atribui onpointermove (não addEventListener) p/ não empilhar.
function ativarProximidadeNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  if (prefereMenosMovimento()) { nav.onpointermove = null; return; }
  nav.onpointermove = (e) => {
    nav.querySelectorAll(".nav__item").forEach((it) => {
      const r = it.getBoundingClientRect();
      const dist = Math.abs(e.clientY - (r.top + r.height / 2));
      const t = Math.max(0, 1 - dist / 72);
      it.style.transform = t > 0
        ? `scale(${(1 + t * 0.05).toFixed(3)}) translateX(${(t * 4).toFixed(1)}px)`
        : "";
    });
  };
  nav.onpointerleave = () => {
    nav.querySelectorAll(".nav__item").forEach((it) => { it.style.transform = ""; });
  };
}

// ---------- Toast ----------

function toast(msg, variant = "success", opts = {}) {
  // opts: { duration (ms), action: { label, onClick } }. A barra amarela mostra
  // o tempo restante e PAUSA no hover (o fim da barra é o gatilho de fechar, então
  // pausar adia o fechamento). O botão de ação (ex.: "Desfazer") fecha ao clicar.
  // Sob prefers-reduced-motion não há barra — cai num timer simples. Retorna a
  // função de fechar pra quem quiser fechar antes (ex.: após commit do undo).
  const { duration = 2600, action = null } = opts;
  const semMov = prefereMenosMovimento();
  const el = document.createElement("div");
  el.className = `toast toast--${variant}`;
  // role=alert pra leitor de tela anunciar erros (a11y).
  if (variant === "danger") el.setAttribute("role", "alert");
  // escapeHtml no msg — toast usa innerHTML e msg às vezes carrega nome de
  // funcionário (vindo do CSV/pipeline), evita XSS armazenado.
  const acaoHtml = action ? `<button class="toast__acao" type="button">${escapeHtml(action.label)}</button>` : "";
  const barHtml = semMov ? "" : `<i class="toast__bar" style="animation-duration:${duration}ms"></i>`;
  el.innerHTML = `${icon(variant === "success" ? "check" : "alert")}<span>${escapeHtml(msg)}</span>${acaoHtml}${barHtml}`;
  $("#toast-root").appendChild(el);
  let fechado = false;
  const fechar = () => {
    if (fechado) return;
    fechado = true;
    el.style.transition = "opacity 200ms, transform 200ms";
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 200);
  };
  const bar = el.querySelector(".toast__bar");
  if (bar) bar.addEventListener("animationend", fechar);
  else setTimeout(fechar, duration);
  if (action) {
    el.querySelector(".toast__acao")?.addEventListener("click", () => {
      try { action.onClick(); } catch (e) {}
      fechar();
    });
  }
  return fechar;
}

// Validação inline: mostra a mensagem ancorada no campo (reusa .field__error),
// foca e destaca o campo, e limpa sozinho quando o usuário corrige. Retorna
// false pra usar como `return campoInvalido("#sel", "msg")` no lugar de
// `return toast(msg, "danger")`. Se o campo não existir, cai no toast.
function campoInvalido(inputSel, msg) {
  const inp = typeof inputSel === "string" ? $(inputSel) : inputSel;
  if (!inp) { toast(msg, "danger"); return false; }
  inp.classList.add("input--erro");
  const host = inp.closest(".field") || inp.parentElement || inp;
  let slot = host.querySelector(".field__error.js-campo-erro");
  if (!slot) {
    slot = document.createElement("div");
    slot.className = "field__error js-campo-erro";
    host.appendChild(slot);
  }
  slot.textContent = msg;
  slot.classList.remove("hidden");
  try { inp.focus(); } catch (e) {}
  inp.addEventListener("input", function limpa() {
    inp.classList.remove("input--erro");
    slot.remove();
    inp.removeEventListener("input", limpa);
  });
  return false;
}

// ---------- Modal ----------

// Seletor dos elementos focáveis dentro do modal (pro focus trap a11y).
const FOCAVEIS_SEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function openModal(html, opts = {}) {
  const root = $("#modal-root");
  // Guarda quem tinha foco antes de abrir pra restaurar no closeModal (a11y).
  window._modalPrevFocus = document.activeElement;
  document.body.classList.add("modal-aberto"); // some os FABs por baixo do modal
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" tabindex="-1">${html}</div>
    </div>
  `;
  const modal = root.querySelector(".modal");
  // aria-labelledby: garante que o 1º <h2> do header tenha id="modal-titulo"
  // pro leitor de tela anunciar o título do diálogo. Os modais variam, então
  // injetamos o id aqui em vez de em cada template.
  const h2 = modal.querySelector(".modal__header h2") || modal.querySelector("h2");
  if (h2) {
    h2.id = "modal-titulo";
  } else {
    // Sem título legível → não referencia um id inexistente.
    modal.removeAttribute("aria-labelledby");
  }
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
  // Focus trap: Tab/Shift+Tab ciclam dentro do modal (não escapam pro fundo).
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focaveis = Array.from(modal.querySelectorAll(FOCAVEIS_SEL))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focaveis.length === 0) { e.preventDefault(); return; }
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  });
  if (opts.onMount) opts.onMount(modal);
  // Move o foco pro 1º elemento focável do modal (se o onMount não focou nada).
  // Os modais que já dão foco manual (ex.: confirmar) continuam funcionando.
  setTimeout(() => {
    if (!modal.contains(document.activeElement)) {
      const alvo = modal.querySelector(FOCAVEIS_SEL) || modal;
      alvo.focus();
    }
  }, 50);
}

function closeModal() {
  const backdrop = $("#modal-backdrop");
  if (!backdrop) return;
  document.body.classList.remove("modal-aberto");
  // Sinaliza fim da edição de PJ (limpa pjEditing no presence + cancela sub)
  if (window.setarPJEditando) window.setarPJEditando(null);
  if (window.pararEscutaPJ) window.pararEscutaPJ();
  // Limpa qualquer toast colab residual
  document.querySelectorAll(".collab-toast").forEach((t) => t.remove());
  const painel = backdrop.querySelector(".modal");
  if (painel && !prefereMenosMovimento()) painel.style.animation = "modalOut 150ms var(--ease) forwards";
  backdrop.style.animation = "fadeIn 160ms reverse";
  setTimeout(() => ($("#modal-root").innerHTML = ""), 140);
  // Restaura o foco pra quem estava focado antes do modal abrir (a11y).
  const prev = window._modalPrevFocus;
  window._modalPrevFocus = null;
  if (prev && typeof prev.focus === "function" && document.contains(prev)) {
    try { prev.focus(); } catch {}
  }
}

// Modal de confirmação estilizado (substitui window.confirm).
// Retorna Promise<boolean>. Uso: if (await confirmar({titulo, msg, perigo:true})) {...}
//
// Overlay PRÓPRIO (não usa #modal-root) — assim empilha POR CIMA de um modal
// já aberto sem destruí-lo. Cancelar volta pro modal pai intacto.
function confirmar({ titulo = "Confirmar", msg = "", okLabel = "Confirmar", cancelLabel = "Cancelar", perigo = false } = {}) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const root = document.createElement("div");
    root.className = "modal-backdrop modal-backdrop--confirm";
    root.innerHTML = `
      <div class="modal modal--sm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-titulo">
        <div class="modal__header">
          <div><h2 id="confirm-titulo">${escapeHtml(titulo)}</h2></div>
          <button class="modal__close" data-cancel aria-label="Fechar">${icon("x")}</button>
        </div>
        <div class="modal__body"><p style="margin:0; line-height:1.5; color:var(--text-body);">${escapeHtml(msg)}</p></div>
        <div class="modal__footer">
          <button class="btn btn--ghost" data-cancel>${escapeHtml(cancelLabel)}</button>
          <button class="btn ${perigo ? "btn--danger" : "btn--primary"}" data-ok>${escapeHtml(okLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    let decidido = false;
    const fechar = (val) => {
      if (decidido) return;
      decidido = true;
      document.removeEventListener("keydown", onKey, true);
      root.remove();
      if (prevFocus && document.contains(prevFocus)) { try { prevFocus.focus(); } catch {} }
      resolve(val);
    };
    // ESC cancela; Enter confirma. Captura no topo pra não vazar pro handler
    // global de ESC (que fecharia o modal pai por baixo).
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); fechar(false); }
      else if (e.key === "Enter") { e.stopPropagation(); e.preventDefault(); fechar(true); }
    };
    document.addEventListener("keydown", onKey, true);
    root.addEventListener("click", (e) => { if (e.target === root) fechar(false); }); // clica fora = cancela
    root.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", () => fechar(false)));
    root.querySelector("[data-ok]").addEventListener("click", () => fechar(true));
    setTimeout(() => root.querySelector("[data-ok]")?.focus(), 30);
  });
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
  if (user.role === "rh") return "GH";
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
    // Foto via background-image é muda pra leitor de tela → rotula como imagem.
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `Foto de ${escapeHtml(user?.nome || "usuário")}`);
  } else {
    el.style.backgroundImage = "";
    el.style.color = "";
    el.textContent = initials(user?.nome || "?");
    // Iniciais já são texto legível → não precisa de role="img".
    el.removeAttribute("role");
    el.removeAttribute("aria-label");
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
      // AbortController: os listeners de drag/zoom em window/document vazariam
      // a cada foto aberta (closeModal não os removia). Aborta tudo ao fechar.
      const ac = new AbortController();
      const sig = ac.signal;
      const fecharCrop = () => { ac.abort(); closeModal(); };
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", fecharCrop));
      // ESC fecha pelo handler global de modal (chama closeModal direto, sem
      // passar por fecharCrop) → garante o abort dos listeners de window aqui.
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") ac.abort(); }, { signal: sig, capture: true });

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
      stage.addEventListener("mousedown", start, { signal: sig });
      window.addEventListener("mousemove", move, { signal: sig });
      window.addEventListener("mouseup", end, { signal: sig });
      stage.addEventListener("touchstart", start, { passive: true, signal: sig });
      window.addEventListener("touchmove", move, { passive: false, signal: sig });
      window.addEventListener("touchend", end, { signal: sig });

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
      zoom.addEventListener("input", () => applyZoom(zoom.value), { signal: sig });

      // Wheel zoom (desktop conveniência)
      stage.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const next = Math.min(4, Math.max(1, Number(zoom.value) + delta));
        zoom.value = next;
        applyZoom(next);
      }, { passive: false, signal: sig });

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
        ac.abort();
        closeModal();
        onConfirm(base64);
      }, { signal: sig });
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

  // Novidades: uma vez por sessão (post-login), abre o popup se houver versão nova.
  if (!_changelogChecado) { _changelogChecado = true; checkChangelog(); }

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

  // Badge de pendentes no título da aba (funciona em demo e em Firebase).
  atualizarTituloDocumento();
}

// ============================================================
// Tempo real — hooks chamados pelo listener de ocorrências (firebase.js).
// Em modo demo (sem Firebase) esses window.* simplesmente não são chamados;
// atualizarTituloDocumento roda pelo renderApp nos dois modos.
// ============================================================

// Badge de pendentes no título da aba: "(3) FioPulse".
function atualizarTituloDocumento() {
  const u = currentUser();
  const base = "FioPulse";
  if (!u) { document.title = base; return; }
  const n = pendingForUser(u).length;
  document.title = n > 0 ? `(${n}) ${base}` : base;
}

// Re-render seguro do dashboard quando as ocorrências mudam em tempo real.
// Guardas: só re-renderiza se a tela de ocorrências está ativa, não há modal
// aberto, e preserva foco/valor da busca se o usuário está digitando.
window.aoAtualizarOcorrencias = function () {
  atualizarTituloDocumento();
  const u = currentUser();
  if (!u) return;
  if (state.view.page !== "dashboard") return;
  if (document.querySelector("#modal-backdrop") || document.querySelector(".modal-backdrop--confirm")) return;
  const buscaFocada = document.activeElement && document.activeElement.id === "search";
  const valorBusca = $("#search") ? $("#search").value : null;
  renderDashboard();
  // restaura busca + foco se estava digitando
  if (valorBusca != null) {
    const novo = $("#search");
    if (novo) { novo.value = valorBusca; if (buscaFocada) { novo.focus(); novo.setSelectionRange(valorBusca.length, valorBusca.length); } }
  }
};

// Notificação quando chega ocorrência nova (pendente, visível) com app aberto.
window.onNovasOcorrencias = function (qtd) {
  if (!qtd || qtd < 1) return;
  const msg = qtd === 1 ? "Nova ocorrência pra conferir" : `${qtd} novas ocorrências pra conferir`;
  toast(msg, "success");
  tocarBeepNotificacao();
};

// Beep curto e discreto via Web Audio (sem arquivo externo).
// Só toca após a 1ª interação do user no navegador (política de autoplay) —
// normal e não quebra: o catch engole qualquer erro.
let _audioCtx = null;
function tocarBeepNotificacao() {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.26);
  } catch (e) { /* sem áudio, sem problema */ }
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
  const nomes = outros.map((p) => (p.nome || "").split(" ")[0]).join(", ");
  banner.innerHTML = `
    <span class="colab-dot" aria-hidden="true"></span>
    <span><strong>${escapeHtml(nomes)}</strong> também ${outros.length > 1 ? "estão" : "está"} editando agora</span>
  `;
}

// Presence indicator — dados reais do Firestore (coleção `presence`, via
// onSnapshot em firebase.js). Mostra o user atual + colegas online no topbar.
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
  // Foto via background-image é muda pro leitor de tela → role=img + aria-label.
  // Iniciais já são texto legível, então só rotulamos quando há foto.
  const a11y = foto ? ` role="img" aria-label="Foto de ${escapeHtml(usr.nome || "usuário")}"` : "";
  return `
    <div class="presence-avatar ${ausente ? "presence-avatar--idle" : ""}"
         data-uid="${usr.id}"${a11y}
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
  // e o status da conversa aberta (online/offline/digitando…).
  if (!$("#chat-widget")?.hidden) {
    atualizarPontosOnlineChat(); // incremental: não repinta a lista a cada heartbeat
    atualizarStatusThread();
  }
}

// Tooltip helper (compartilhado entre topbar + sidebar)
function montarTooltipPresence(usr) {
  const ROLE_LABELS = { admin: "Admin", rh: "GH", lider: "Líder" };
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

  const ROLE_LABELS = { admin: "Admin", rh: "GH", lider: "Líder" };
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

  // Compacto: avatares mini com tooltip (hover mostra nome+atividade).
  const avs = outros.slice(0, 6).map((usr) => {
    const tooltip = montarTooltipPresence(usr);
    return buildPresenceAvatar(usr, { size: 26, borderColor: "var(--plum)" })
      .replace("class=", `title="${tooltip}" class=`);
  }).join("");
  const extra = outros.length > 6 ? `<span class="sp-extra">+${outros.length - 6}</span>` : "";

  el.innerHTML = `
    <div class="sp-header"><span class="sp-live"></span>Online agora · ${outros.length}</div>
    <div class="sp-avs">${avs}${extra}</div>
  `;
}

function renderNav() {
  const u = currentUser();
  const pending = pendingForUser(u).length;

  const items = [];
  items.push({ id: "dashboard", label: "Ocorrências", icon: "clipboard", badge: pending });
  items.push({ id: "banco-horas", label: "Banco de Horas", icon: "clock" });

  if (can("func.ver")) {
    items.push({ id: "funcionarios", label: "Funcionários", icon: "users" });
  }
  if (can("pj.ver")) items.push({ id: "pj", label: "Controle PJ", icon: "briefcase" });
  if (can("obrigacoes.gerenciar")) items.push({ id: "obrigacoes", label: "Obrigações", icon: "calendar" });
  if (can("auditoria.ver")) items.push({ id: "auditoria", label: "Auditoria", icon: "shield" });
  if (can("sistema.config")) items.push({ id: "config", label: "Configurações", icon: "settings" });

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

  ativarProximidadeNav();
}

function renderBottomNav() {
  const u = currentUser();
  const pending = pendingForUser(u).length;
  const canCreate = can("ocorrencias.criar");

  // Itens à esquerda do FAB
  const left = [
    { id: "dashboard", label: "Ocorrências", icon: "inbox", badge: pending },
    { id: "banco-horas", label: "Banco", icon: "clock" },
  ];
  if (can("func.ver")) {
    left.push({ id: "funcionarios", label: "Equipe", icon: "users" });
  }

  // Itens à direita do FAB
  const right = [];
  if (can("sistema.config")) {
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

// Total de não-lidas — soma POR CONVERSA (mesma fonte da lista de conversas).
// Antes contava state.mensagensRecebidas cru, o que incluía mensagens sem
// remetente válido / pra si mesmo (que não viram conversa abrível) → badge
// "fantasma" aceso sem nenhuma conversa pendente. Agora badge ⇔ conversa pendente.
function contarNaoLidas() {
  return (state.conversas || []).reduce((acc, c) => acc + (c.naoLidas || 0), 0);
}

// Chamado pelo listener global pra atualizar só o badge do FAB de chat.
window.atualizarBadgeChat = function () {
  const n = contarNaoLidas();
  const b = $("#chat-fab-badge");
  const fab = $("#chat-fab");
  if (fab) fab.setAttribute("aria-label", n > 0 ? `Mensagens, ${n} não lida${n > 1 ? "s" : ""}` : "Mensagens");
  if (!b) return;
  b.setAttribute("aria-hidden", "true"); // a contagem vai no aria-label do FAB
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
  if (can("ocorrencias.criar")) {
    fab.classList.add("show");
    fab.onclick = () => openNovaOcorrencia();
  } else {
    fab.classList.remove("show");
  }
}

// ---------- Views ----------

// Teatro calibrado (aprovado no mock skeleton-premium): na 1ª visita da aba
// (por sessão) mostra skeleton por 300ms antes do conteúdo pré-carregado
// entrar em cascata. Visitas seguintes renderizam direto — o app nunca fica
// mais lento que instantâneo no uso repetido. prefers-reduced-motion pula tudo.
const _skelVisto = new Set();
const _SKEL_PAGES = { "banco-horas": "Banco de Horas", "funcionarios": "Funcionários", "pj": "Controle PJ" };

function skeletonViewHtml() {
  const stat = `<div class="stat" aria-hidden="true"><div class="sk-c" style="height:10px;width:60%"></div><div class="sk-c" style="height:26px;width:40%;margin-top:10px"></div></div>`;
  return `
    <header class="page-header" aria-hidden="true">
      <div>
        <div class="sk-c" style="height:24px;width:200px"></div>
        <div class="sk-c" style="height:11px;width:290px;margin-top:10px"></div>
      </div>
    </header>
    <div class="stats">${stat.repeat(4)}</div>
    ${skeletonOccHtml(6)}
  `;
}

function renderView() {
  const u = currentUser();
  const page = state.view.page;
  const view = $("#view");

  if (_SKEL_PAGES[page] && !_skelVisto.has(page) && !prefereMenosMovimento()) {
    _skelVisto.add(page);
    $("#topbar-title").textContent = _SKEL_PAGES[page];
    view.innerHTML = skeletonViewHtml();
    setTimeout(() => { if (state.view.page === page) renderView(); }, 300);
    return;
  }

  if (page === "dashboard") return renderDashboard();
  if (page === "banco-horas") return renderBancoHoras();
  if (page === "funcionarios") return renderFuncionarios();
  if (page === "pj") return renderControlePJ();
  if (page === "obrigacoes") {
    if (!can("obrigacoes.gerenciar")) { state.view.page = "dashboard"; return renderDashboard(); }
    return renderObrigacoes();
  }
  if (page === "auditoria") {
    if (!can("auditoria.ver")) {
      state.view.page = "dashboard";
      return renderDashboard();
    }
    return renderAuditoria();
  }
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
  if (!can("ocorrencias.ver", u)) return false;
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
  if (!can("ocorrencias.conferir", u)) return false;
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
// Ranking enxuto: Top 10 ativos por tempo de casa (par da Demografia, só admin).
// Reusa diasNaEmpresa + tempoDeCasa() (mesma fonte da Demografia). Some quem não
// tem admissão registrada. Card recolhível com o mesmo visual de .dashboard-demografia.
function renderRankingTempoCasaWidget(u) {
  if (u.role !== "admin") return "";
  // Fora do ranking: diretoria — por cargo "diretor" ou pelos nomes da família
  // (Landolino, William Alexander, Jules Rimet Schulz). A disputa de antiguidade
  // é do operacional. (Afastados sairiam aqui também, mas o pipeline de GH não
  // marca afastamento — ver com o dono.)
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const DIRETORIA = [["landolino", "schulz"], ["william", "alexander", "schulz"], ["jules", "rimet", "schulz"]];
  const ehDiretoria = (f) => f.diretor === true || norm(f.cargo).includes("diretor")
    || DIRETORIA.some((toks) => toks.every((t) => norm(f.nome).includes(t)));
  const comDias = (state.funcionarios || [])
    .filter((f) => f.ativo !== false && f.afastado !== true && !ehDiretoria(f) && f.aprendiz !== true && Number.isFinite(Number(f.diasNaEmpresa)) && Number(f.diasNaEmpresa) > 0)
    .sort((a, b) => Number(b.diasNaEmpresa) - Number(a.diasNaEmpresa))
    .slice(0, 10);
  if (comDias.length === 0) return "";
  const linhas = comDias.map((f, i) => {
    const meta = [f.setor, TURNOS[f.turno]?.label].filter(Boolean).join(" · ");
    return `
      <div class="rk rk--${i + 1}">
        <div class="rk__pos">${i + 1}</div>
        <div class="rk__main">
          <div class="rk__nome">${escapeHtml(f.nome || "?")}</div>
          ${meta ? `<div class="rk__meta">${escapeHtml(meta)}</div>` : ""}
        </div>
        <div class="rk__val">${escapeHtml(tempoDeCasa(Number(f.diasNaEmpresa)))}</div>
      </div>`;
  }).join("");
  return `
    <details class="dashboard-demografia">
      <summary>Ranking — Tempo de casa <span class="muted text-xs">(Top ${comDias.length})</span></summary>
      <div class="dashboard-ranking">${linhas}</div>
    </details>`;
}

function renderDemografiaWidget(u) {
  if (u.role !== "admin") return "";
  // Diretoria e menores aprendizes fora da demografia (contam no quadro, mas não nas métricas do operacional).
  const pool = (state.funcionarios || []).filter((f) => f.ativo !== false && f.diretor !== true && f.aprendiz !== true);
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
          can("ocorrencias.criar")
            ? `<button class="btn btn--primary" id="btn-nova">${icon("plus")}<span>Nova ocorrência</span></button>`
            : ""
        }
      </div>
    </header>

    <div class="stats">
      <div class="stat stat--accent stat--kpi">
        <div class="stat__label">Pendentes</div>
        <div class="stat__value">${pending.length}</div>
        <div class="stat__hint">${u.role === "lider" ? "aguardando sua conferência" : u.role === "supervisor" ? "aguardando o líder conferir" : "aguardando líder"}</div>
      </div>
      <div class="stat">
        <div class="stat__label">Resolvidas</div>
        <div class="stat__value">${done.length}</div>
        <div class="stat__hint">conferidas + lançadas</div>
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

    ${renderObrigacoesWidget(u)}
    ${renderAniversariantesWidget(u)}
    ${renderDemografiaWidget(u)}
    ${renderRankingTempoCasaWidget(u)}

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
        <input type="text" id="search" placeholder="Buscar por funcionário ou tipo..." aria-label="Buscar ocorrências por funcionário ou tipo" value="${state.view.search}" />
      </div>
      ${u.role !== "lider" ? `
        <select id="turno-filter" aria-label="Filtrar ocorrências por turno">
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

// Skeleton (shimmer) da lista de ocorrências. Só aparece se o 1º snapshot do
// Firestore ainda não chegou (rede lenta / timeout de boot) — em boot normal os
// dados já vieram antes do render, então não pisca à toa.
function skeletonOccHtml(n = 6) {
  const linha = `
    <div class="sk-occ" aria-hidden="true">
      <div class="sk-c sk-occ__d"></div>
      <div><div class="sk-c sk-occ__n"></div><div class="sk-c sk-occ__s"></div></div>
      <div class="sk-c sk-occ__b"></div>
    </div>`;
  return `<div class="list" role="status" aria-label="Carregando ocorrências">${linha.repeat(n)}</div>`;
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

  // Carga ainda não chegou (rede lenta / timeout de boot) → skeleton.
  if (state.ocorrenciasProntas === false) {
    root.innerHTML = skeletonOccHtml(6);
    return;
  }

  if (list.length === 0) {
    // Se o vazio é por causa de busca/filtro de turno ativo, oferece limpar.
    const temFiltroAtivo = !!search || !!turno;
    const podeCriar = !temFiltroAtivo && tab === "pendentes" && can("ocorrencias.criar");
    root.innerHTML = `
      <div class="empty">
        <div class="empty__icon">${icon("inbox")}</div>
        <h3>${temFiltroAtivo ? "Nada por aqui" : "Tudo em dia"}</h3>
        <p>${temFiltroAtivo
          ? "Nenhum registro com a busca/filtro atual."
          : (tab === "pendentes" ? "Nenhuma ocorrência pendente. Quando o GH lançar algo, aparece aqui." : "Nenhum registro encontrado.")}</p>
        ${temFiltroAtivo ? `<button class="btn btn--ghost" id="btn-limpar-occ">${icon("x")}<span>Limpar filtros</span></button>` : ""}
        ${podeCriar ? `<button class="btn btn--primary" id="btn-empty-nova">${icon("plus")}<span>Nova ocorrência</span></button>` : ""}
      </div>
    `;
    const limpar = $("#btn-limpar-occ");
    if (limpar) limpar.addEventListener("click", () => {
      state.view.search = "";
      state.view.filterTurno = null;
      if ($("#search")) $("#search").value = "";
      if ($("#turno-filter")) $("#turno-filter").value = "";
      renderOccList();
    });
    const nova = $("#btn-empty-nova");
    if (nova) nova.addEventListener("click", openNovaOcorrencia);
    return;
  }

  root.innerHTML = `<div class="list">${list.map(renderOccCard).join("")}</div>`;
  $$("#occ-list .occ").forEach((el) => {
    el.addEventListener("click", () => openOcorrenciaDetail(el.dataset.id));
  });
  $$("#occ-list [data-quick-lancar]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.quickLancar;
      const card = btn.closest(".occ");
      // Confirma deslizando a linha pra fora; o re-render vem logo depois.
      if (card) {
        card.classList.add("occ--saindo");
        setTimeout(() => marcarComoLancada(id), 320);
      } else {
        marcarComoLancada(id);
      }
    });
  });
}

function renderOccCard(o) {
  const u = currentUser();
  const f = getFuncionario(o.funcionarioId);
  const tipo = getTipo(o.tipo);
  const pending = isPending(o);
  const podeLancar = !pending && !isLancada(o) && can("ocorrencias.lancar");

  return `
    <article class="occ ${pending ? "occ--pendente" : ""}" data-id="${o.id}" role="button" tabindex="0">
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
  // Só quem tem a capacidade de criar (default: GH e admin).
  if (!can("ocorrencias.criar")) return;

  const today = todayIso();

  openModal(`
    <div class="modal__header">
      <div>
        <h2>Nova ocorrência</h2>
        <p>Preencha os dados que o GH conhece. O líder cuida da conferência depois.</p>
      </div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="nova-form">
      <div class="field-row">
        <div class="field">
          <label for="f-data">Data <span style="color:var(--danger)">*</span></label>
          <input type="date" id="f-data" required aria-required="true" value="${today}" max="${today}" />
        </div>
        <div class="field">
          <label for="f-horario">Horário <span style="color:var(--danger)">*</span></label>
          <input type="time" id="f-horario" required aria-required="true" />
        </div>
      </div>

      <div class="field">
        <label for="f-func">Funcionário <span style="color:var(--danger)">*</span></label>
        <select id="f-func" required aria-required="true">
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
        <label for="f-tipo">Tipo de ocorrência <span style="color:var(--danger)">*</span></label>
        <select id="f-tipo" required aria-required="true">
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

  if (!data) return campoInvalido("#f-data", "Informe a data.");
  if (!horario) return campoInvalido("#f-horario", "Informe o horário.");
  if (!funcionarioId) return campoInvalido("#f-func", "Selecione o funcionário.");
  if (!tipo) return campoInvalido("#f-tipo", "Selecione o tipo.");

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
          <select id="conf-acao" required aria-required="true">
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
      ${can("ocorrencias.excluir") ? `<button class="btn btn--danger" id="btn-del-occ" style="margin-right:auto;">${icon("trash")}<span>Excluir</span></button>` : ""}
      <button class="btn btn--ghost" data-close>Fechar</button>
      ${can("ocorrencias.editarTudo") ? `<button class="btn btn--soft" id="btn-edit-occ">${icon("edit")}<span>Editar tudo</span></button>` : ""}
      ${canEdit && !pending ? `<button class="btn btn--soft" id="btn-update-obs">${icon("check")}<span>Salvar observação</span></button>` : ""}
      ${pending && canConfer ? `<button class="btn btn--primary" id="btn-confer">${icon("check")}<span>Confirmar conferência</span></button>` : ""}
      ${pending && u.role === "rh" ? `<button class="btn btn--soft" id="btn-update-obs">${icon("check")}<span>Salvar observação</span></button>` : ""}
      ${!pending && !isLancada(o) && can("ocorrencias.lancar") ? `<button class="btn btn--primary" id="btn-lancar">${icon("check")}<span>Marcar como lançada</span></button>` : ""}
      ${isLancada(o) && can("ocorrencias.lancar") ? `<button class="btn btn--soft" id="btn-desfazer-lancar">${icon("clock")}<span>Desfazer lançamento</span></button>` : ""}
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

async function desfazerLancamento(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const u = currentUser();
  if (!can("ocorrencias.lancar")) return;
  if (!isLancada(o)) return;

  if (!(await confirmar({
    titulo: "Desfazer lançamento?",
    msg: "A ocorrência volta pra Conferidas e a marca de lançada some.",
    okLabel: "Desfazer",
    perigo: true,
  }))) return;

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
  if (!can("ocorrencias.lancar")) return;
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
  toast("Marcada como lançada.", "success", { duration: 6000, action: { label: "Desfazer", onClick: () => reverterLancada(id) } });
  renderApp();
}

// Undo rápido (sem confirm) do "Desfazer" no toast de lançamento. Versão demo;
// firebase.js sobrescreve window.reverterLancada com a que grava em /ocorrencias.
function reverterLancada(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o || !isLancada(o)) return;
  const u = currentUser();
  o.lancada = false;
  o.lancadoEm = null;
  o.lancadoPor = null;
  o.historico = [...(o.historico || []), {
    por: u?.id, em: new Date().toISOString(), acao: "Desfez lançamento (undo)",
  }];
  store.save(state);
  toast("Lançamento desfeito.");
  renderApp();
}

function openEditOcorrenciaModal(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const u = currentUser();
  if (!can("ocorrencias.editarTudo")) return;

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
  if (!can("ocorrencias.editarTudo")) return;

  const data = $("#ef-data").value;
  const horario = $("#ef-horario").value;
  const funcionarioId = $("#ef-func").value;
  const tipo = $("#ef-tipo").value;
  const acao = $("#ef-acao").value || null;
  const observacao = $("#ef-obs").value.trim();

  if (!data) return campoInvalido("#ef-data", "Informe a data.");
  if (!horario) return campoInvalido("#ef-horario", "Informe o horário.");
  if (!funcionarioId) return campoInvalido("#ef-func", "Selecione o funcionário.");
  if (!tipo) return campoInvalido("#ef-tipo", "Selecione o tipo.");

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

async function deleteOcorrencia(id) {
  const o = state.ocorrencias.find((x) => x.id === id);
  if (!o) return;
  const f = getFuncionario(o.funcionarioId);
  const tipo = getTipo(o.tipo);
  const label = `${f?.nome || "?"} · ${tipo?.label || "?"} · ${formatDate(o.data)}`;
  if (!(await confirmar({
    titulo: "Excluir ocorrência?",
    msg: `${label}. Isso some do histórico, sem desfazer.`,
    okLabel: "Excluir",
    perigo: true,
  }))) return;

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

  if (!acao) return campoInvalido("#conf-acao", "Selecione a ação antes de confirmar.");

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
      <div class="stat stat--accent stat--kpi">
        <div class="stat__label">Total ativos</div>
        <div class="stat__value">${totalAtivos}</div>
        <div class="stat__hint">${totalInativos > 0 ? `+ ${totalInativos} inativo${totalInativos > 1 ? "s" : ""}` : "todos ativos"}</div>
      </div>
      <div class="stat ${semTurno > 0 ? "stat--accent" : ""}">
        <div class="stat__label">Sem turno definido</div>
        <div class="stat__value">${semTurno}</div>
        <div class="stat__hint">${semTurno > 0 ? "ajustar antes de líderes verem" : "tudo certo"}</div>
      </div>
    </div>
    <p class="lista-rodape">Atualizado ${ultima.value} · ${ultima.hint}</p>`;
    })()}

    <div class="toolbar">
      <div class="toolbar__search">
        ${icon("search")}
        <input type="text" id="func-search" placeholder="Buscar por nome ou código..." aria-label="Buscar funcionário por nome ou código" />
      </div>
      <select id="func-status-filter" aria-label="Filtrar por status">
        <option value="ativo" selected>Apenas ativos</option>
        <option value="operacional">Operacionais</option>
        <option value="afastado">Afastados</option>
        <option value="diretor">Diretores</option>
        <option value="aprendiz">Aprendizes</option>
        <option value="inativo">Apenas inativos</option>
        <option value="todos">Todos</option>
      </select>
      <select id="func-turno-filter" aria-label="Filtrar por turno">
        <option value="">Todos os turnos (${totalAtivos})</option>
        <option value="sem">Sem turno (${semTurno})</option>
        <option value="1">1º Turno (${ativos.filter((f) => f.turno === 1).length})</option>
        <option value="2">2º Turno (${ativos.filter((f) => f.turno === 2).length})</option>
        <option value="3">3º Turno (${ativos.filter((f) => f.turno === 3).length})</option>
        <option value="geral">Geral (${ativos.filter((f) => f.turno === "geral").length})</option>
      </select>
    </div>

    <div id="func-list"></div>
  `;

  $("#func-search").addEventListener("input", debounce(() => renderFuncList(), 150));
  $("#func-status-filter").addEventListener("change", () => renderFuncList());
  $("#func-turno-filter").addEventListener("change", () => renderFuncList());
  renderFuncList(true);
  animarNumeros("#view");
}

function renderFuncList(animar) {
  const u = currentUser();
  const search = ($("#func-search")?.value || "").toLowerCase();
  const statusFilter = $("#func-status-filter")?.value || "ativo";
  const filter = $("#func-turno-filter")?.value || "";

  let list = [...state.funcionarios];

  // Escopo de visibilidade por papel (supervisor vê só a lista dele; líder, só turno)
  list = list.filter((f) => podeVerFuncionario(u, f));

  // Filtro por status (default = só ativos). afastado/diretor são ortogonais a ativo.
  if (statusFilter === "ativo") list = list.filter((f) => f.ativo !== false);
  else if (statusFilter === "operacional") list = list.filter((f) => f.ativo !== false && f.afastado !== true && f.diretor !== true && f.aprendiz !== true);
  else if (statusFilter === "afastado") list = list.filter((f) => f.afastado === true);
  else if (statusFilter === "diretor") list = list.filter((f) => f.diretor === true);
  else if (statusFilter === "aprendiz") list = list.filter((f) => f.aprendiz === true);
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
          ? "Os funcionários virão automaticamente do pipeline de GH na próxima execução."
          : (apenasInativos ? "" : "Tente ajustar a busca ou os filtros (turno/status).")}</p>
        ${semFiltro ? "" : `<button class="btn btn--ghost" id="btn-limpar-func">${icon("x")}<span>Limpar filtros</span></button>`}
      </div>`;
    const limpar = $("#btn-limpar-func");
    if (limpar) limpar.addEventListener("click", () => {
      if ($("#func-search")) $("#func-search").value = "";
      if ($("#func-turno-filter")) $("#func-turno-filter").value = "";
      if ($("#func-status-filter")) $("#func-status-filter").value = "ativo";
      renderFuncList();
    });
    return;
  }

  root.innerHTML = `<div class="func-list">${list.map((f) => {
    const inativo = f.ativo === false;
    const demissaoStr = inativo && f.demissao ? tsToDateStr(f.demissao) : null;
    const semTurno = !f.turno;
    // Alerta âmbar "sem turno" só faz sentido pra quem está ativo (inativo não
    // precisa de ação). Inativo mostra "Inativo"; ativo c/ turno mostra o turno.
    const alertaSemTurno = semTurno && !inativo;

    const subParts = [];
    if (f.codigo) subParts.push(`cód: ${escapeHtml(f.codigo)}`);
    subParts.push(escapeHtml(f.setor || "sem setor"));
    if (demissaoStr) subParts.push(`<span class="func-demit">Demitido em ${escapeHtml(demissaoStr)}</span>`);
    const subHtml = subParts.join(`<span class="dot"></span>`);

    const tag = inativo
      ? `<span class="func-stag">Inativo</span>`
      : (semTurno
          ? `<span class="func-turno func-turno--sem"><span class="func-turno__dot"></span>Sem turno</span>`
          : `<span class="func-turno">${escapeHtml(TURNOS[f.turno].label)}</span>`);
    // Marcadores ortogonais: contam no quadro, mas são categoria à parte.
    const marcadores =
      (f.diretor === true ? `<span class="badge badge--info">Diretor</span>` : "") +
      (f.aprendiz === true ? `<span class="badge badge--neutral">Menor Aprendiz</span>` : "") +
      (f.afastado === true && !inativo ? `<span class="badge badge--warning">Afastado</span>` : "");

    return `
      <article class="func-row ${alertaSemTurno ? "func-row--semturno" : ""} ${inativo ? "func-row--inativo" : ""}" data-func="${f.id}" role="button" tabindex="0">
        <div class="func-info">
          <div class="func-nome">${escapeHtml(f.nome)}</div>
          <div class="func-sub">${subHtml}</div>
        </div>
        ${marcadores}
        ${tag}
        <svg class="icon func-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </article>`;
  }).join("")}</div>`;

  $$("#func-list .func-row").forEach((el) => {
    el.addEventListener("click", () => openFuncionarioModal(el.dataset.func));
  });

  if (animar) animarEntrada(document.querySelector("#func-list .func-list"));
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
// Gráfico de barras do banco de horas: saldo cumulativo por dia do mês.
// lancamentos = [{dataIso, saldoMin, saldoFmt}]. Verde acima do zero,
// vermelho abaixo. Retorna SVG (string) ou "" se não há dados suficientes.
function graficoBarrasBH(lancamentos) {
  const dados = (lancamentos || []).map((l) => Number(l.saldoMin) || 0);
  if (dados.length < 2) return "";
  const W = 420, H = 120, P = 6;
  const min = Math.min(...dados, 0), max = Math.max(...dados, 0);
  const rng = (max - min) || 1;
  const x = (i) => P + i * (W - 2 * P) / (dados.length - 1);
  const y = (v) => P + (1 - (v - min) / rng) * (H - 2 * P);
  const y0 = y(0);
  const bw = (W - 2 * P) / dados.length * 0.62;
  const bars = dados.map((v, i) => {
    const cx = x(i), top = Math.min(y(v), y0), h = Math.max(Math.abs(y(v) - y0), 1.5);
    const cor = v >= 0 ? "var(--success)" : "var(--danger)";
    return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${cor}" opacity=".88"/>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="bh-grafico" preserveAspectRatio="none"><line x1="${P}" y1="${y0.toFixed(1)}" x2="${W - P}" y2="${y0.toFixed(1)}" stroke="var(--border-strong)" stroke-width="1"/>${bars}</svg>`;
}

function renderFuncPerfilSecoes(f) {
  if (!f) return "";
  const nascStr = tsToDateStr(f.nascimento);
  const admStr = tsToDateStr(f.admissao);
  const demStr = tsToDateStr(f.demissao);
  const inativo = f.ativo === false;

  // Banco de horas: gráfico do mês (só admin/RH têm lancamentos via pipeline-rh/cur).
  const bh = (state.bancoHoras || {})[f.id];
  const lanc = (bh && Array.isArray(bh.lancamentos)) ? bh.lancamentos : [];
  const temGraficoBH = lanc.length >= 2;
  let bhPico = 0, bhVale = 0, bhMesLabel = "";
  if (temGraficoBH) {
    const mins = lanc.map((l) => Number(l.saldoMin) || 0);
    bhPico = Math.max(...mins, 0);
    bhVale = Math.min(...mins, 0);
    const ultima = lanc[lanc.length - 1]?.dataIso || bh.ultimaDataIso;
    if (ultima) {
      const NOMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const m = parseInt(String(ultima).slice(5, 7), 10);
      if (m >= 1 && m <= 12) bhMesLabel = " · " + NOMES[m - 1];
    }
  }
  const bhTone = !bh ? "neutral" : (bh.minutos > 0 ? "success" : bh.minutos < 0 ? "danger" : "neutral");

  // Header com avatar grande + nome + cargo/setor/turno
  const turnoLabel = f.turno && TURNOS[f.turno] ? TURNOS[f.turno].label : null;

  const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);

  return `
    <div class="func-perfil-header">
      <div class="avatar avatar--lg" style="width:56px; height:56px; font-size:20px;">${initials(f.nome)}</div>
      <div style="flex:1; min-width:0;">
        <div class="func-perfil-header__nome">${escapeHtml(f.nome)}${f.diretor === true ? ` <span class="func-selo-diretoria">Diretoria</span>` : ""}${f.aprendiz === true ? ` <span class="badge badge--neutral">Menor Aprendiz</span>` : ""}</div>
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
    ` : f.afastado === true ? `
      <div class="func-perfil-afastado">
        <span class="func-perfil-afastado__icon">${icon("alert")}</span>
        <div>
          <strong>Afastado${f.situacao ? ` · ${escapeHtml(f.situacao)}` : ""}</strong>
          <div class="text-xs" style="margin-top:2px;">Conta no quadro; fora de rankings e banco de horas.</div>
        </div>
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

    ${temGraficoBH ? `
    <div class="func-perfil-secao">
      <div class="func-perfil-secao__titulo">Banco de horas${bhMesLabel}</div>
      <div class="bh-perfil">
        <div class="bh-perfil__top">
          <span class="text-xs muted">Saldo atual</span>
          <span class="bh-saldo bh-saldo--${bhTone}">${escapeHtml(bh.saldoFormatado || formatSaldoHoras(bh.minutos))}</span>
        </div>
        ${graficoBarrasBH(lanc)}
        <div class="bh-perfil__meta">
          <span>Pico <strong>${formatSaldoHoras(bhPico)}</strong></span>
          <span>Vale <strong>${formatSaldoHoras(bhVale)}</strong></span>
        </div>
      </div>
    </div>
    ` : ""}

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
  const podeEditarFunc = u && can("func.editar", u);

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
            <input type="text" id="func-nome" required aria-required="true" value="${escapeHtml(f?.nome || "")}" ${!isNew ? "readonly style='background:var(--surface-warm); cursor:not-allowed;'" : ""} />
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
          <div class="toggle-row">
            <div class="toggle-row__info">
              <strong>Funcionário ativo</strong>
              <span>Inativos não aparecem no formulário de nova ocorrência.</span>
            </div>
            <label class="toggle"><input type="checkbox" id="func-ativo" ${f?.ativo !== false ? "checked" : ""} /><span class="toggle__slider"></span></label>
          </div>
          ${ehAdmin ? `
            <div class="toggle-row">
              <div class="toggle-row__info">
                <strong>Isento do banco de horas</strong>
                <span>O pipeline ignora o saldo — pra afastados, diretoria, estagiários.</span>
              </div>
              <label class="toggle"><input type="checkbox" id="func-bhexempt" ${f?.bhExempt ? "checked" : ""} /><span class="toggle__slider"></span></label>
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
      if (!isNew && can("func.dadosSensiveis", u) && typeof window.lerSaldoSensivel === "function" && f?.codigo) {
        const pii = $("#func-perfil-pii");
        if (pii) {
          pii.innerHTML = `
            <div class="func-perfil-secao">
              <div class="func-perfil-secao__titulo">Dados sensíveis (admin/GH)</div>
              <div class="text-xs muted">carregando…</div>
            </div>`;
        }
        window.lerSaldoSensivel(f.codigo).then((dados) => {
          const cont = $("#func-perfil-pii");
          if (!cont) return; // modal fechou
          if (!dados) {
            cont.innerHTML = `
              <div class="func-perfil-secao">
                <div class="func-perfil-secao__titulo">Dados sensíveis (admin/GH)</div>
                <div class="text-xs muted">Sem dados em banco-horas-saldos pra este código.</div>
              </div>`;
            return;
          }
          const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);
          cont.innerHTML = `
            <div class="func-perfil-secao">
              <div class="func-perfil-secao__titulo">Dados sensíveis (admin/GH)</div>
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
  if (!nome || nome.length < 3) return campoInvalido("#func-nome", "Nome muito curto.");

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

async function deleteFuncionario(id) {
  const f = state.funcionarios.find((x) => x.id === id);
  if (!f) return;
  const usado = state.ocorrencias.some((o) => o.funcionarioId === id);
  if (usado) {
    return toast("Este funcionário tem ocorrências. Marque como inativo no lugar.", "danger");
  }
  if (!(await confirmar({
    titulo: "Excluir funcionário?",
    msg: `Remover "${f.nome}" do cadastro.`,
    okLabel: "Excluir",
    perigo: true,
  }))) return;
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
        if (!(await confirmar({
          titulo: "Remover foto?",
          msg: "Sua foto de perfil será removida.",
          okLabel: "Remover",
          perigo: true,
        }))) return;
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

async function doImportFuncionarios() {
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
    if (!(await confirmar({
      titulo: "Marcar inativos?",
      msg: "Os funcionários que não estão no JSON serão marcados como inativos. Eles continuam no cadastro, mas saem do form de Nova Ocorrência. Ocorrências antigas mantêm a referência.",
      okLabel: "Marcar inativos",
      perigo: true,
    }))) return;
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

// ============================================================
// Obrigações do GH — checklist recorrente (mensal / anual / única).
// "Feito" é por período (conclusoes["2026-06"]) → reseta sozinho no período
// seguinte sem perder histórico. Só GH/admin (cap obrigacoes.gerenciar).
// Demo: store.save; Firebase: window.* sobrescreve (grava em /obrigacoes).
// ============================================================
const OBRIG_REC = { mensal: "Todo mês", anual: "Todo ano", unica: "Data única" };
const OBRIG_ST = { ok: "Feita", pend: "Pendente", atras: "Atrasada" };

function obrigacaoPeriodo(o) {
  const d = new Date();
  if (o.recorrencia === "anual") return String(d.getFullYear());
  if (o.recorrencia === "unica") return "unica";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // mensal
}
function obrigacaoVencimento(o) {
  const h = new Date();
  if (o.recorrencia === "mensal") {
    const ult = new Date(h.getFullYear(), h.getMonth() + 1, 0).getDate();
    return new Date(h.getFullYear(), h.getMonth(), Math.min(Number(o.dia) || 1, ult));
  }
  if (o.recorrencia === "anual") return new Date(h.getFullYear(), (Number(o.mes) || 1) - 1, Number(o.dia) || 1);
  if (o.data) return new Date(o.data + "T23:59:59");
  return null;
}
function obrigacaoStatus(o) {
  const per = obrigacaoPeriodo(o);
  const feita = !!(o.conclusoes && o.conclusoes[per]);
  if (feita) return { per, feita, status: "ok" };
  const venc = obrigacaoVencimento(o);
  return { per, feita, status: (venc && new Date() > venc) ? "atras" : "pend" };
}
function obrigVencTxt(o) {
  if (o.recorrencia === "mensal") return `vence dia ${Number(o.dia) || 1}`;
  if (o.recorrencia === "anual") return `${String(Number(o.dia) || 1).padStart(2, "0")}/${String(Number(o.mes) || 1).padStart(2, "0")}`;
  if (o.data) return formatDate(o.data);
  return "";
}
function obrigacoesDoMes() {
  const h = new Date();
  const mes = h.getMonth() + 1;
  const ym = `${h.getFullYear()}-${String(mes).padStart(2, "0")}`;
  return (state.obrigacoes || []).filter((o) => o.ativo !== false && (
    o.recorrencia === "mensal" ||
    (o.recorrencia === "anual" && (Number(o.mes) || 1) === mes) ||
    (o.recorrencia === "unica" && (o.data || "").slice(0, 7) === ym)
  ));
}
function obrigLinhaHtml(o, comEdit) {
  const s = obrigacaoStatus(o);
  return `
    <div class="ob ${s.feita ? "is-feita" : ""}">
      <button class="ob__chk" data-obrig-toggle="${o.id}" role="checkbox" aria-checked="${s.feita}" aria-label="Marcar ${escapeHtml(o.titulo)}"></button>
      <div class="ob__main">
        <div class="ob__nome">${escapeHtml(o.titulo)}${comEdit && o.descricao ? ` <span class="muted text-xs">· ${escapeHtml(o.descricao)}</span>` : ""}</div>
        <div class="ob__meta"><span>${OBRIG_REC[o.recorrencia] || ""}</span><span class="dot"></span><span>${obrigVencTxt(o)}</span></div>
      </div>
      <span class="st st--${s.status}">${OBRIG_ST[s.status]}</span>
      ${comEdit ? `<button class="ob__edit" data-obrig-edit="${o.id}" aria-label="Editar obrigação">${icon("edit")}</button>` : ""}
    </div>`;
}

// Card no dashboard (GH/admin) — obrigações que vencem neste mês.
function renderObrigacoesWidget(u) {
  if (!can("obrigacoes.gerenciar")) return "";
  const itens = obrigacoesDoMes();
  if (itens.length === 0) return "";
  let atras = 0, pend = 0, feitas = 0;
  for (const o of itens) {
    const st = obrigacaoStatus(o).status;
    if (st === "ok") feitas++; else if (st === "atras") atras++; else pend++;
  }
  const mesLabel = new Date().toLocaleDateString("pt-BR", { month: "long" });
  const resumo =
    (atras ? `<span class="ob-pill ob-pill--atras">${atras} atrasada${atras > 1 ? "s" : ""}</span>` : "") +
    (pend ? `<span class="ob-pill ob-pill--pend">${pend} pendente${pend > 1 ? "s" : ""}</span>` : "") +
    `<span class="ob-pill ob-pill--ok">${feitas} feita${feitas !== 1 ? "s" : ""}</span>`;
  return `
    <div class="ob-card">
      <div class="ob-card__head" data-obrig-abrir role="button" tabindex="0" title="Abrir Obrigações">
        ${icon("calendar")}
        <h3>Obrigações de ${mesLabel}</h3>
        <span class="ob-card__resumo">${resumo}</span>
      </div>
      <div class="ob-lista">${itens.map((o) => obrigLinhaHtml(o, false)).join("")}</div>
    </div>`;
}

// Mês (1-12) de uma obrigação datada (anual/única); mensal não tem mês fixo.
function obrigMesDe(o) {
  if (o.recorrencia === "anual") return Number(o.mes) || 1;
  if (o.recorrencia === "unica" && o.data) return Number(o.data.slice(5, 7));
  return null;
}
// Linha "futura" (anual/única de outro mês): só visualiza, não marca adiantado.
function obrigLinhaFutura(o) {
  return `
    <div class="ob ob--futura">
      <span class="ob__chk ob__chk--futuro" aria-hidden="true"></span>
      <div class="ob__main">
        <div class="ob__nome">${escapeHtml(o.titulo)}</div>
        <div class="ob__meta"><span>${OBRIG_REC[o.recorrencia] || ""}</span><span class="dot"></span><span>${obrigVencTxt(o)}</span></div>
      </div>
      <span class="st st--fut">próxima</span>
      <button class="ob__edit" data-obrig-edit="${o.id}" aria-label="Editar obrigação">${icon("edit")}</button>
    </div>`;
}

let _obrigVerMais = false;
const MESES_NOME = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function renderObrigacoes() {
  const u = currentUser();
  if (!can("obrigacoes.gerenciar")) { state.view.page = "dashboard"; return renderApp(); }
  $("#topbar-title").textContent = "Obrigações";
  const todas = (state.obrigacoes || []).filter((o) => o.ativo !== false);
  const cab = `
    <header class="page-header">
      <div>
        <h1>Obrigações</h1>
        <p>As rotinas do GH. O sistema acompanha mês a mês e zera no período seguinte.</p>
      </div>
      <button class="btn btn--primary" data-obrig-nova>${icon("plus")}<span>Nova obrigação</span></button>
    </header>`;

  if (todas.length === 0) {
    $("#view").innerHTML = cab + `
      <div class="empty">
        <div class="empty__icon">${icon("calendar")}</div>
        <h3>Nenhuma obrigação cadastrada</h3>
        <p>Cadastre as rotinas que se repetem (fechar folha, banco de horas, eSocial, pagar PJ...) e acompanhe aqui.</p>
        <button class="btn btn--primary" data-obrig-nova>${icon("plus")}<span>Nova obrigação</span></button>
      </div>`;
    return;
  }

  const mesAtual = new Date().getMonth() + 1;
  // Mês atual: mensais (todo mês) + anuais/únicas que caem no mês.
  const doMes = todas.filter((o) => o.recorrencia === "mensal" || obrigMesDe(o) === mesAtual)
    .sort((a, b) => (Number(a.dia) || Number((a.data || "").slice(8, 10)) || 0) - (Number(b.dia) || Number((b.data || "").slice(8, 10)) || 0));
  // Outros meses: anuais/únicas datadas em mês != atual, agrupadas (volta o ano).
  const outras = todas.filter((o) => o.recorrencia !== "mensal" && obrigMesDe(o) && obrigMesDe(o) !== mesAtual);
  const meses = [...new Set(outras.map(obrigMesDe))]
    .sort((a, b) => ((a - mesAtual + 12) % 12) - ((b - mesAtual + 12) % 12));
  const abertas = doMes.filter((o) => obrigacaoStatus(o).status !== "ok").length;

  $("#view").innerHTML = cab + `
    <div class="mes mes--atual">
      <div class="mes__cab">
        <span class="mes__nome">${MESES_NOME[mesAtual - 1]}</span>
        <span class="mes__hoje">este mês</span>
        <span class="mes__cont">${abertas ? `${abertas} em aberto` : "tudo feito"}</span>
      </div>
      <div class="mes__lista">${doMes.map((o) => obrigLinhaHtml(o, true)).join("")}</div>
    </div>
    ${meses.length ? `
      <button class="vermais" id="ob-vermais">
        <span>Ver os outros meses</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="outros" id="ob-outros">
        ${meses.map((m) => `
          <div class="mes">
            <div class="mes__cab"><span class="mes__nome">${MESES_NOME[m - 1]}</span></div>
            <div class="mes__lista">${outras.filter((o) => obrigMesDe(o) === m).map((o) => obrigLinhaFutura(o)).join("")}</div>
          </div>`).join("")}
      </div>` : ""}
  `;

  const vm = $("#ob-vermais");
  if (vm) {
    if (_obrigVerMais) { $("#ob-outros").classList.add("is-open"); vm.classList.add("is-open"); vm.querySelector("span").textContent = "Ocultar os outros meses"; }
    vm.addEventListener("click", () => {
      _obrigVerMais = !_obrigVerMais;
      $("#ob-outros").classList.toggle("is-open", _obrigVerMais);
      vm.classList.toggle("is-open", _obrigVerMais);
      vm.querySelector("span").textContent = _obrigVerMais ? "Ocultar os outros meses" : "Ver os outros meses";
    });
  }
}

function openObrigacaoModal(id) {
  if (!can("obrigacoes.gerenciar")) return;
  const o = id ? (state.obrigacoes || []).find((x) => x.id === id) : null;
  const rec = o?.recorrencia || "mensal";
  openModal(`
    <div class="modal__header">
      <div><h2>${o ? "Editar obrigação" : "Nova obrigação"}</h2><p>Rotina recorrente do GH.</p></div>
      <button class="modal__close" data-close>${icon("x")}</button>
    </div>
    <form class="modal__body" id="obrig-form" onsubmit="return false">
      <div class="field">
        <label for="ob-titulo">Título</label>
        <input type="text" id="ob-titulo" value="${o ? escapeHtml(o.titulo) : ""}" placeholder="Ex.: Fechar e enviar banco de horas" />
      </div>
      <div class="field">
        <label for="ob-desc">Descrição <span class="muted text-xs">(opcional)</span></label>
        <input type="text" id="ob-desc" value="${o ? escapeHtml(o.descricao || "") : ""}" placeholder="Detalhe, link ou lembrete" />
      </div>
      <div class="field">
        <label for="ob-rec">Recorrência</label>
        <select id="ob-rec">
          <option value="mensal" ${rec === "mensal" ? "selected" : ""}>Todo mês</option>
          <option value="anual" ${rec === "anual" ? "selected" : ""}>Todo ano</option>
          <option value="unica" ${rec === "unica" ? "selected" : ""}>Uma vez (data única)</option>
        </select>
      </div>
      <div class="field" id="ob-f-mensal">
        <label for="ob-dia">Vence no dia (do mês)</label>
        <input type="number" id="ob-dia" min="1" max="31" value="${o?.dia || 5}" />
      </div>
      <div class="field-row" id="ob-f-anual">
        <div class="field">
          <label for="ob-mes">Mês</label>
          <select id="ob-mes">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => `<option value="${m}" ${Number(o?.mes) === m ? "selected" : ""}>${m}</option>`).join("")}</select>
        </div>
        <div class="field">
          <label for="ob-diaa">Dia</label>
          <input type="number" id="ob-diaa" min="1" max="31" value="${o?.dia || 15}" />
        </div>
      </div>
      <div class="field" id="ob-f-unica">
        <label for="ob-data">Data</label>
        <input type="date" id="ob-data" value="${o?.data || ""}" />
      </div>
    </form>
    <div class="modal__footer">
      ${o ? `<button class="btn btn--danger" data-obrig-del="${o.id}">${icon("trash")}<span>Excluir</span></button>` : ""}
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="ob-save">${icon("check")}<span>Salvar</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      const recSel = $("#ob-rec");
      const sync = () => {
        const v = recSel.value;
        $("#ob-f-mensal").style.display = v === "mensal" ? "" : "none";
        $("#ob-f-anual").style.display = v === "anual" ? "" : "none";
        $("#ob-f-unica").style.display = v === "unica" ? "" : "none";
      };
      recSel.addEventListener("change", sync); sync();
      $("#ob-save").addEventListener("click", () => salvarObrigacaoForm(id));
      const del = modal.querySelector("[data-obrig-del]");
      if (del) del.addEventListener("click", () => removerObrigacao(del.dataset.obrigDel));
      setTimeout(() => $("#ob-titulo")?.focus(), 60);
    },
  });
}

function salvarObrigacaoForm(id) {
  const titulo = $("#ob-titulo").value.trim();
  if (!titulo || titulo.length < 3) return campoInvalido("#ob-titulo", "Dê um título à obrigação (mín. 3 letras).");
  const rec = $("#ob-rec").value;
  const dados = { titulo, descricao: $("#ob-desc").value.trim(), recorrencia: rec };
  if (rec === "mensal") dados.dia = Math.min(31, Math.max(1, Number($("#ob-dia").value) || 1));
  else if (rec === "anual") { dados.mes = Number($("#ob-mes").value) || 1; dados.dia = Math.min(31, Math.max(1, Number($("#ob-diaa").value) || 1)); }
  else { const d = $("#ob-data").value; if (!d) return campoInvalido("#ob-data", "Escolha a data."); dados.data = d; }
  salvarObrigacao(dados, id);
}

// --- CRUD (versão demo; firebase.js sobrescreve window.* pra gravar no Firestore) ---
function salvarObrigacao(dados, id) {
  if (!state.obrigacoes) state.obrigacoes = [];
  if (id) {
    const o = state.obrigacoes.find((x) => x.id === id);
    if (o) Object.assign(o, dados);
  } else {
    state.obrigacoes.push({ id: "ob-" + Date.now(), ativo: true, conclusoes: {}, ...dados });
  }
  store.save(state);
  closeModal();
  toast("Obrigação salva.");
  renderApp();
}
async function removerObrigacao(id) {
  const o = (state.obrigacoes || []).find((x) => x.id === id);
  if (!o) return;
  if (!(await confirmar({ titulo: "Excluir obrigação?", msg: `Remover "${o.titulo}".`, okLabel: "Excluir", perigo: true }))) return;
  state.obrigacoes = (state.obrigacoes || []).filter((x) => x.id !== id);
  store.save(state);
  closeModal();
  toast("Obrigação excluída.");
  renderApp();
}
function marcarObrigacao(id, periodo, feito) {
  const o = (state.obrigacoes || []).find((x) => x.id === id);
  if (!o) return;
  o.conclusoes = o.conclusoes || {};
  if (feito) o.conclusoes[periodo] = { por: currentUser()?.id || null, em: new Date().toISOString() };
  else delete o.conclusoes[periodo];
  store.save(state);
  renderApp();
}
function toggleObrigacao(id) {
  const o = (state.obrigacoes || []).find((x) => x.id === id);
  if (!o) return;
  const per = obrigacaoPeriodo(o);
  marcarObrigacao(id, per, !(o.conclusoes && o.conclusoes[per]));
}

// Handler delegado único (sobrevive aos re-renders do #view).
if (!window._obrigBound) {
  window._obrigBound = true;
  document.addEventListener("click", (e) => {
    const tg = e.target.closest("[data-obrig-toggle]");
    if (tg) { e.preventDefault(); toggleObrigacao(tg.dataset.obrigToggle); return; }
    const ed = e.target.closest("[data-obrig-edit]");
    if (ed) { e.stopPropagation(); openObrigacaoModal(ed.dataset.obrigEdit); return; }
    const nv = e.target.closest("[data-obrig-nova]");
    if (nv) { openObrigacaoModal(); return; }
    const ab = e.target.closest("[data-obrig-abrir]");
    if (ab) { state.view.page = "obrigacoes"; renderApp(); return; }
  });
}

function renderBancoHoras() {
  const u = currentUser();
  $("#topbar-title").textContent = "Banco de Horas";

  // Escopo de visibilidade: admin/rh = todos, líder = turno, supervisor = lista
  let visibles = (state.funcionarios || []).filter((f) => f.ativo !== false && f.diretor !== true && f.aprendiz !== true && podeVerFuncionario(u, f));

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
        <input type="text" id="bh-search" placeholder="Buscar funcionário..." aria-label="Buscar funcionário no banco de horas" />
      </div>
    </div>

    <div id="bh-list"></div>
  `;

  if ($("#btn-import-bh")) {
    $("#btn-import-bh").addEventListener("click", openImportBancoHorasModal);
  }
  $("#bh-search").addEventListener("input", debounce(() => renderBHList(visibles), 150));
  renderBHList(visibles, true);
  animarNumeros("#view");
}

function renderBHList(funcionarios, animar) {
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

    // Minimalista (variação aprovada): nome + cargo·setor à esquerda,
    // saldo grande colorido à direita. Escala/idade/niver/tempo de casa
    // ficam no perfil do funcionário, não poluem a lista de BH.
    const cargo = f.cargo || saldo?.cargo || "";
    const setor = f.setor || saldo?.setor || "";
    const cargoSetor = [cargo, setor].filter(Boolean).join(" · ");

    return `
      <article class="occ bh-card" style="grid-template-columns: 1fr auto; align-items: center;">
        <div class="occ__main" style="min-width:0;">
          <div class="occ__name">${escapeHtml(f.nome)}</div>
          <div class="occ__sub">${cargoSetor ? escapeHtml(cargoSetor) : (TURNOS[f.turno]?.label || "sem turno")}</div>
        </div>
        <span class="bh-saldo bh-saldo--${tone}" title="Atualizado ${ultima}">${saldoStr}</span>
      </article>
    `;
  }).join("")}</div>`;

  if (animar) animarEntrada(document.querySelector("#bh-list .list"));
}

function openImportBancoHorasModal() {
  if (!can("bancoHoras.importar")) return toast("Sem permissão para importar banco de horas.", "danger");
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
          <span style="color: var(--muted);">${matchInativos.length} código(s) de funcionário(s) <strong>inativo(s)</strong> — saldo será gravado mas não aparece na listagem do Banco de Horas.</span><br/>
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
  // Diff de segurança (auditoria 2): aponta quem tem saldo HOJE e não está na
  // planilha — esses ficariam zerados pela substituição. Sem isso, o replace
  // apaga saldos em silêncio (o dano silencioso mais grave do app).
  const idsNovos = new Set(valid.map((e) => e.funcionarioId));
  const atuais = state.bancoHoras || {};
  const vaoZerar = Object.keys(atuais).filter((id) => !idsNovos.has(id) && (atuais[id]?.minutos || 0) !== 0);
  const nomesZerar = vaoZerar.map((id) => getFuncionario(id)?.nome || id).slice(0, 6);
  let msgImport = `O saldo de ${valid.length} funcionário(s) será substituído pelo da planilha.`;
  if (vaoZerar.length) {
    msgImport += ` Atenção: ${vaoZerar.length} com saldo hoje não estão na planilha e ficarão zerados (${nomesZerar.join(", ")}${vaoZerar.length > nomesZerar.length ? `, +${vaoZerar.length - nomesZerar.length}` : ""}).`;
  }
  if (!(await confirmar({
    titulo: "Substituir saldos?",
    msg: msgImport,
    okLabel: "Substituir",
    perigo: true,
  }))) return;

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
  if (!can("pj.ver")) {
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
        <input type="text" id="pj-search" placeholder="Buscar por nome, CNPJ ou tipo..." aria-label="Buscar PJ por nome, CNPJ ou tipo" />
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
  $("#pj-search").addEventListener("input", debounce(() => renderPJList(), 150));
  $("#pj-status-filter").addEventListener("change", () => renderPJList());
  renderPJList(true);
}

function renderPJList(animar) {
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
        ${semFiltro
          ? `<button class="btn btn--primary" id="btn-novo-pj-2">${icon("plus")}<span>Novo PJ</span></button>`
          : `<button class="btn btn--ghost" id="btn-limpar-pj">${icon("x")}<span>Limpar filtros</span></button>`}
      </div>`;
    const b = $("#btn-novo-pj-2");
    if (b) b.addEventListener("click", () => openPJModal(null));
    const limpar = $("#btn-limpar-pj");
    if (limpar) limpar.addEventListener("click", () => {
      if ($("#pj-search")) $("#pj-search").value = "";
      if ($("#pj-status-filter")) $("#pj-status-filter").value = "";
      renderPJList();
    });
    return;
  }

  root.innerHTML = `<div class="pj-list">${list.map((p) => {
    const periodObj = PERIODICIDADES_PJ.find((x) => x.id === p.periodicidade);
    const valor = p.valorAtual
      ? formatMoeda(p.valorAtual) + (periodObj?.sufixo || "")
      : "—";
    const periodicidade = periodObj?.label || p.periodicidade || "";

    const precisaReajuste = pjPrecisaReajuste(p);
    const userPodeReajustar = u && can("pj.reajuste", u);
    // "Reajustar" aparece só nas linhas que realmente precisam (a exceção, não a
    // regra). Reajuste fora de ciclo vive no detalhe (botão no modal do PJ).
    const mostrarReajustar = userPodeReajustar && p.status === "ativo" && precisaReajuste;

    const subParts = [];
    if (p.tipoServico) subParts.push(`<span class="pj-ttag">${escapeHtml(p.tipoServico)}</span>`);
    if (p.cnpj) subParts.push(`<span>${escapeHtml(p.cnpj)}</span>`);
    if (p.status && p.status !== "ativo") {
      subParts.push(`<span class="pj-stag">${p.status === "suspenso" ? "Suspenso" : "Encerrado"}</span>`);
    }
    const subHtml = subParts.join(`<span class="dot"></span>`);

    return `
      <article class="pj-row ${precisaReajuste ? "pj-row--pend" : ""}" data-pj="${p.id}" role="button" tabindex="0">
        <div class="pj-info">
          <div class="pj-nome">
            ${escapeHtml(p.nome || "(sem nome)")}
            ${precisaReajuste ? `<span class="pj-pend"><span class="pj-pend__dot"></span>reajuste pendente</span>` : ""}
          </div>
          ${subHtml ? `<div class="pj-sub">${subHtml}</div>` : ""}
        </div>
        <div class="pj-val">
          <b>${valor}</b>
          <span>${escapeHtml(periodicidade)}</span>
        </div>
        ${mostrarReajustar
          ? `<button class="pj-reaj" data-stop="1" data-reajustar="${p.id}" title="Aplicar reajuste IPCA do ciclo atual">${icon("check")}<span>Reajustar</span></button>`
          : ""}
        <svg class="icon pj-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </article>
    `;
  }).join("")}</div>`;

  $$("#pj-list .pj-row").forEach((el) => {
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

  if (animar) animarEntrada(document.querySelector("#pj-list .pj-list"));
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
      <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Contrato${!isNew ? " &amp; aditivos" : ""}</div>

      ${pj?.contratoUrl ? `
        <div class="pj-ct-chip">
          <span class="pj-ct-ic">${icon("file")}</span>
          <div class="pj-ct-main"><b>Contrato principal</b><span>PDF no Google Drive</span></div>
          ${ehUrlSegura(pj.contratoUrl) ? `<a href="${escapeHtml(pj.contratoUrl)}" target="_blank" rel="noopener" class="pj-ct-abrir">${icon("file")}<span>Abrir</span></a>` : ""}
          <button type="button" class="pj-ct-troca" id="btn-troca-contrato" title="Trocar contrato ou colar link">${icon("edit")}</button>
        </div>
      ` : `
        <button type="button" class="pj-ct-drop" id="btn-ct-drop">
          <span class="pj-ct-up">${icon("upload")}</span>
          <b>Anexar contrato (PDF)</b>
          <small>O sistema lê CNPJ, valor, nome e início automaticamente.</small>
        </button>
        <button type="button" class="pj-ct-linktoggle" id="btn-ct-linktoggle">ou colar link do Drive</button>
      `}

      <div id="pj-contrato-edit" style="display:none; margin-top:10px;">
        <div class="field">
          <label for="pj-contrato-url">Link do contrato (Google Drive)</label>
          <input type="url" id="pj-contrato-url" value="${pj?.contratoUrl || ""}" placeholder="https://drive.google.com/file/d/..." />
        </div>
        <input type="file" id="pj-contrato-file" accept=".pdf,.docx,.doc" style="display:none;" />
        <button type="button" class="btn btn--soft btn--block" id="btn-upload-drive">
          ${icon("upload")}<span>Upload PDF (preenche automático)</span>
        </button>
      </div>
      <input type="hidden" id="pj-drive-folder-id" value="${escapeHtml(pj?.driveFolderId || "")}" />

      ${(() => {
        const sub = pj?.driveFolderId;
        const root = window.GOOGLE_DRIVE_CONFIG && window.GOOGLE_DRIVE_CONFIG.folderId;
        const fid = sub || root;
        if (!window.driveUploadDisponivel || !fid) return "";
        const label = sub ? "Abrir pasta deste PJ no Drive" : "Abrir pasta de contratos no Drive";
        return `
          <a href="https://drive.google.com/drive/folders/${escapeHtml(fid)}" target="_blank" rel="noopener" class="pj-ct-pasta">
            ${icon("file")}<span>${label}</span>
          </a>`;
      })()}

      ${!isNew ? `
        <div class="pj-adv-head">
          <div class="pj-adv-t">Aditivos <span id="pj-aditivos-count" class="pj-adv-count"></span></div>
          <button type="button" class="pj-adv-add" id="btn-add-aditivo">${icon("plus")}<span>Adicionar</span></button>
        </div>
        <div id="pj-aditivos-list"></div>

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
      ` : `
        <div class="pj-adv-head"><div class="pj-adv-t">Aditivos</div></div>
        <div class="pj-adv-empty">Disponível depois de salvar o PJ.</div>
      `}

      <div class="divider"></div>

      <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Identificação</div>
      <div class="field">
        <label for="pj-nome">Nome / Razão social <span style="color:var(--danger)">*</span></label>
        <input type="text" id="pj-nome" required aria-required="true" maxlength="120" value="${pj?.nome || ""}" placeholder="Ex: Aceres Branding" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="pj-cnpj">CNPJ / CPF</label>
          <input type="text" id="pj-cnpj" maxlength="20" value="${pj?.cnpj || ""}" placeholder="CNPJ ou CPF do prestador" />
        </div>
        <div class="field">
          <label for="pj-tipo">Tipo de serviço</label>
          <select id="pj-tipo">
            <option value="">— selecione —</option>
            ${(() => {
              const atual = pj?.tipoServico || "";
              // Preserva um tipo legado que não esteja na lista padrão.
              const lista = (!atual || TIPOS_PJ.includes(atual)) ? TIPOS_PJ : [atual, ...TIPOS_PJ];
              return lista.map((t) => `<option value="${escapeHtml(t)}" ${t === atual ? "selected" : ""}>${escapeHtml(t)}</option>`).join("");
            })()}
          </select>
        </div>
      </div>

      <div class="divider"></div>

      <div class="text-xs muted" style="margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Financeiro</div>
      <div class="field-row">
        <div class="field">
          <label for="pj-valor">Valor (R$) <span id="pj-valor-sufixo" class="muted text-xs"></span></label>
          <input type="number" inputmode="decimal" id="pj-valor" step="0.01" min="0" value="${pj?.valorAtual ?? ""}" placeholder="3500.00" />
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
          ${pj.historicoValores.slice().reverse().map((h, i) => {
            const origIdx = pj.historicoValores.length - 1 - i;
            const cu = currentUser();
            const podeApagar = cu && can("pj.editar", cu);
            return `
            <div class="timeline__item ${i === 0 ? "" : "done"}">
              <div class="timeline__item-title"><span>${formatMoeda(h.valor)}</span>${podeApagar ? `<button type="button" class="hv-del" data-del-valor="${origIdx}" title="Excluir este lançamento (erro de OCR, etc.)">${icon("trash")}</button>` : ""}</div>
              <div class="timeline__item-meta">${formatDateFull(h.data)} · ${escapeHtml(getUser(h.por)?.nome || h.por || "—")}${h.motivo ? " · " + escapeHtml(h.motivo) : ""}</div>
            </div>`;
          }).join("")}
        </div>
      ` : ""}

    </form>

    <div class="modal__footer">
      ${!isNew && can("pj.excluir") ? `<button class="btn btn--danger" id="btn-del-pj" style="margin-right:auto;">${icon("trash")}<span>Excluir</span></button>` : ""}
      ${(!isNew && pj && can("pj.reajuste") && pj.status === "ativo")
        ? `<button class="btn btn--soft" id="btn-reajustar-pj">${icon("plus")}<span>Reajustar</span></button>` : ""}
      <button class="btn btn--ghost" data-close>Cancelar</button>
      <button class="btn btn--primary" id="btn-save-pj">${icon("check")}<span>${isNew ? "Cadastrar" : "Salvar"}</span></button>
    </div>
  `, {
    onMount: (modal) => {
      modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
      $("#btn-save-pj").addEventListener("click", () => savePJ(id));
      if (!isNew) $("#btn-del-pj").addEventListener("click", () => deletePJ(id));

      // Reajustar a partir do detalhe (caso fora de ciclo). openModal substitui
      // o #modal-root, então o cleanup do closeModal não roda sozinho — encerro
      // a edição colaborativa na mão antes de abrir o modal de reajuste.
      const btnReaj = document.getElementById("btn-reajustar-pj");
      if (btnReaj) btnReaj.addEventListener("click", () => {
        if (window.setarPJEditando) window.setarPJEditando(null);
        if (window.pararEscutaPJ) window.pararEscutaPJ();
        openReajusteModal(id);
      });

      // Contrato compacto: a área de edição (URL + botão de upload) fica
      // escondida; o lápis "trocar", o "colar link" e o tile de anexar a revelam.
      const revelarContratoEdit = () => {
        const ed = document.getElementById("pj-contrato-edit");
        if (ed) { ed.style.display = "block"; document.getElementById("pj-contrato-url")?.focus(); }
      };
      document.getElementById("btn-troca-contrato")?.addEventListener("click", revelarContratoEdit);
      document.getElementById("btn-ct-linktoggle")?.addEventListener("click", revelarContratoEdit);
      document.getElementById("btn-ct-drop")?.addEventListener("click", () => {
        // Drive disponível → dispara o upload direto (mostra a área p/ ver o link
        // preenchido). Sem Drive → revela o campo de link manual.
        if (window.driveUploadDisponivel) {
          revelarContratoEdit();
          document.getElementById("btn-upload-drive")?.click();
        } else {
          revelarContratoEdit();
        }
      });

      // Excluir um lançamento do histórico de valores (ex.: erro de OCR).
      $$("#pj-form [data-del-valor]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          const idx = Number(btn.dataset.delValor);
          if (!(await confirmar({
            titulo: "Excluir do histórico?",
            msg: "Remove este lançamento de valor. O valor atual passa a ser o lançamento mais recente que sobrar.",
            okLabel: "Excluir",
            perigo: true,
          }))) return;
          if (!window.removerValorHistorico) return toast("Modo demo: requer Firebase pra persistir.", "danger");
          try {
            await window.removerValorHistorico(id, idx);
            toast("Lançamento removido do histórico.");
            if (window.pararEscutaPJ) window.pararEscutaPJ();
            openPJModal(id);
          } catch (err) {
            toast("Erro: " + (err?.message || err), "danger");
          }
        });
      });

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
          let dadosFinais = null;
          let mostrouResultado = false;
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
                dadosFinais = aplicarExtracaoTextoNoForm(textoDoPDF).dados;
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
                if (parentFolderId && $("#pj-drive-folder-id")) $("#pj-drive-folder-id").value = parentFolderId;
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
                  dadosFinais = { ...(dadosFinais || {}), ...resOCR.dados };
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
                  if (novaPasta && $("#pj-drive-folder-id")) $("#pj-drive-folder-id").value = novaPasta;
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

            // 4) Concluído — mostra o cartão de revisão do que foi extraído
            const lastStep = ehPDF ? 3 : 1;
            updateFormBlocker("Pronto!", lastStep);
            const temDados = dadosFinais
              && Object.values(dadosFinais).some((v) => v != null && v !== "");
            if (temDados) {
              await new Promise((r) => setTimeout(r, 350));
              mostrarResultadoOCR(dadosFinais);
              mostrouResultado = true;
            } else if (uploadResult) {
              toast("Arquivo enviado! Confira os campos e clique Salvar pra gravar.");
              await new Promise((r) => setTimeout(r, 400));
            }
          } finally {
            // Se mostrou o cartão de revisão, deixa aberto até o usuário fechar
            if (!mostrouResultado) hideFormBlocker();
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
  if (!nome || nome.length < 2) return campoInvalido("#pj-nome", "Informe o nome do PJ.");

  const contratoUrl = $("#pj-contrato-url").value.trim();
  if (!ehUrlSegura(contratoUrl)) {
    return campoInvalido("#pj-contrato-url", "Link do contrato precisa ser https:// — recuse 'javascript:' ou outros.");
  }

  const cnpjRaw = $("#pj-cnpj").value.trim();
  if (!ehCNPJValido(cnpjRaw)) {
    return campoInvalido("#pj-cnpj", "CNPJ/CPF inválido — confira os dígitos.");
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
    <div class="fb-scan" aria-hidden="true">
      <div class="fb-doc">
        <span class="fb-ln" style="width:58%"></span><span class="fb-ln" style="width:86%"></span>
        <span class="fb-ln" style="width:72%"></span><span class="fb-ln" style="width:90%"></span>
        <span class="fb-ln" style="width:64%"></span><span class="fb-ln" style="width:48%"></span>
        <span class="fb-beam"></span>
      </div>
    </div>
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

// Cartão de revisão do que a leitura/OCR encontrou. Renderiza DENTRO do
// form-blocker (substitui a cena de scan). Os campos já foram preenchidos
// por aplicarExtracaoTextoNoForm — aqui o usuário só confere e fecha.
function mostrarResultadoOCR(dados) {
  const blocker = document.getElementById("form-blocker");
  if (!blocker || !dados) return;

  const PERIOD_LABEL = {
    hora: "Por hora", trimestral: "Trimestral",
    semestral: "Semestral", anual: "Anual", mensal: "Mensal",
  };
  const PATHS = {
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    user: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[k]}</svg>`;
  const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  const valorTxt = dados.valor
    ? formatMoeda(dados.valor) + (dados.periodicidade === "hora" ? " /h" : "")
    : null;

  const campos = [
    { ic: "doc", lbl: "CNPJ / CPF", val: dados.cnpj || null },
    { ic: "user", lbl: "Nome / razão social", val: dados.nome || null },
    { ic: "cash", lbl: "Valor", val: valorTxt },
    { ic: "clock", lbl: "Periodicidade", val: dados.periodicidade ? PERIOD_LABEL[dados.periodicidade] : null },
    { ic: "cal", lbl: "Início do contrato", val: dados.dataInicio ? formatDate(dados.dataInicio) : null },
  ];
  const achou = campos.filter((c) => c.val).length;

  blocker.innerHTML = `
    <div class="fb-res">
      <div class="fb-res__top">
        <span class="fb-res__chk">${checkSvg}</span>
        <div>
          <b>Li o contrato</b>
          <span>${achou
            ? `Achei ${achou} ${achou === 1 ? "campo" : "campos"} — confere e ajusta o que faltar.`
            : "Não reconheci os campos sozinho — preenche na mão."}</span>
        </div>
      </div>
      <div class="fb-res__fields">
        ${campos.map((c) => `
          <div class="fb-field">
            <span class="fb-field__ic">${svg(c.ic)}</span>
            <span class="fb-field__main">
              <span class="fb-field__lbl">${c.lbl}</span>
              <span class="fb-field__val${c.val ? "" : " vazio"}">${c.val ? escapeHtml(c.val) : "não encontrado"}</span>
            </span>
            <span class="fb-field__st">${c.val
              ? `<span class="fb-dot-ok">${checkSvg}</span>`
              : `<span class="fb-field__pend">preencher</span>`}</span>
          </div>`).join("")}
      </div>
      <button type="button" class="btn btn--primary btn--block" id="fb-res-ok">Conferir campos</button>
    </div>
  `;
  blocker.querySelector("#fb-res-ok")?.addEventListener("click", hideFormBlocker);
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

  // CPF (prestador PF / MEI) — só se nenhum CNPJ válido foi escolhido.
  // Vai pro mesmo campo (rotulado "CNPJ / CPF"). Prefere um próximo a
  // CONTRATADO/PRESTADOR; senão o primeiro CPF formatado do documento.
  if (!r.cnpj) {
    const cpfs = [...texto.matchAll(/\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/g)];
    let cpf = null;
    for (const mc of matchesContratado) {
      const achado = cpfs.find((c) => c.index >= mc.index && c.index <= mc.index + 400);
      if (achado) { cpf = achado[1]; break; }
    }
    if (!cpf && cpfs.length) cpf = cpfs[0][1];
    if (cpf) r.cnpj = cpf;
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
      // "R$ X (por extenso) por hora / /h / hora trabalhada" — tolera o valor
      // escrito entre parênteses entre o número e a palavra "hora".
      /R\$\s*([\d.]*\d+(?:,\d{2})?)\s*(?:\([^)]*\))?\s*(?:\/\s*h(?:ora|r)?\b|por\s+hora|hora\s+(?:\w+\s+){0,2}trabalhada)/i,
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
    // Mensal/outros: 1º tenta o valor PERTO de "mensal/honorários/remuneração/
    // valor do contrato" (mais confiável); só então cai no maior valor solto.
    const perto = [
      // 1) "R$ X (por extenso) mensais/por mês" — tolera o valor entre parênteses
      //    entre o número e a palavra "mensal". Pega o valor da periodicidade.
      /R\$\s*([\d.]+,\d{2}|\d+,\d{2}|[\d.]+)\s*(?:\([^)]*\))?\s*(?:mensa(?:l|is)|por\s+m[êe]s|ao\s+m[êe]s|\/\s*m[êe]s)/i,
      // 2) perto de palavra-chave de remuneração ("a título de remuneração,
      //    o valor mensal de R$ X").
      /(?:valor\s+mensal|mensalidade|remunera[çc][ãa]o|honor[áa]rios?|valor\s+(?:do\s+)?contrato|import[âa]ncia)[\s\S]{0,70}?R\$\s*([\d.]+,\d{2}|\d+,\d{2}|[\d.]+)/i,
      // 3) âncora no verbo de pagamento ("a CONTRATANTE pagará ... R$ X"),
      //    evitando capturar adiantamento/multa que usem outros verbos.
      /pagar[áa][\s\S]{0,90}?R\$\s*([\d.]+,\d{2}|\d+,\d{2}|[\d.]+)/i,
    ];
    for (const re of perto) {
      const m = texto.match(re);
      if (m) {
        const v = Number(m[1].replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(v) && v >= 100 && v <= 1_000_000) { r.valor = v; break; }
      }
    }
    // Fallback: maior valor monetário entre R$ 100 e R$ 1.000.000.
    if (!r.valor) {
      const valores = [...texto.matchAll(/R\$\s*([\d.]+,\d{2}|\d+,\d{2}|[\d.]+)/g)]
        .map((m) => Number(m[1].replace(/\./g, "").replace(",", ".")))
        .filter((v) => Number.isFinite(v) && v >= 100 && v <= 1_000_000);
      if (valores.length > 0) r.valor = Math.max(...valores);
    }
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
  if (!can("pj.reajuste")) return;

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
          <input type="number" inputmode="decimal" id="reaj-percentual" step="0.01" placeholder="ex: 4.50" style="flex: 1;" />
          <button type="button" class="btn btn--soft" id="btn-buscar-ipca" title="Trazer da API do Banco Central conforme o período acima">${icon("download")}<span>Buscar IPCA</span></button>
        </div>
        <span class="field__hint" id="reaj-fonte"><strong>Digite o % diretamente</strong> (negociado com o PJ) ou clique <strong>"Buscar IPCA"</strong> pra trazer do Banco Central.</span>
      </div>

      <div class="field">
        <label for="reaj-novo-valor">Novo valor (R$)</label>
        <input type="number" inputmode="decimal" id="reaj-novo-valor" step="0.01" placeholder="${formatMoeda(valorAtual)}" />
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

  if (!Number.isFinite(novoValor) || novoValor <= 0) return campoInvalido("#reaj-novo-valor", "Informe o novo valor.");
  if (novoValor === pj.valorAtual) return campoInvalido("#reaj-novo-valor", "Valor novo é igual ao atual — sem reajuste a aplicar.");

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
      list.innerHTML = `<div class="pj-adv-empty">Nenhum aditivo registrado.</div>`;
      return;
    }
    const ordenados = [...aditivos].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    list.innerHTML = `<div class="pj-adv-list">${ordenados.map((a) => {
      const meta = [
        a.dataVigencia && a.dataVigencia !== a.data ? `vigência ${formatDateFull(a.dataVigencia)}` : "",
        a.criadoPor ? (getUser(a.criadoPor)?.nome || "") : "",
      ].filter(Boolean).join(" · ");
      const tip = (a.descricao || "—") + (meta ? " — " + meta : "");
      return `
      <div class="pj-adv-row">
        <span class="pj-adv-date">${a.data ? formatDate(a.data) : "—"}</span>
        <span class="pj-adv-desc" title="${escapeHtml(tip)}">${escapeHtml(a.descricao || "—")}</span>
        ${a.contratoUrl && ehUrlSegura(a.contratoUrl)
          ? `<a href="${escapeHtml(a.contratoUrl)}" target="_blank" rel="noopener" class="pj-adv-open" data-stop="1" title="Abrir aditivo">${icon("file")}</a>`
          : ""}
        <button type="button" class="pj-adv-open pj-adv-del" data-del-aditivo="${escapeHtml(a.id)}" title="Excluir aditivo">${icon("trash")}</button>
      </div>`;
    }).join("")}</div>`;

    list.querySelectorAll("[data-del-aditivo]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const aid = btn.dataset.delAditivo;
        if (!(await confirmar({
          titulo: "Excluir aditivo?",
          msg: "O PDF no Drive não será apagado.",
          okLabel: "Excluir",
          perigo: true,
        }))) return;
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

    if (!data) return campoInvalido("#aditivo-data", "Informe a data do aditivo.");
    if (!desc || desc.length < 3) return campoInvalido("#aditivo-desc", "Descreva o aditivo (mínimo 3 caracteres).");
    if (url && !ehUrlSegura(url)) return campoInvalido("#aditivo-url", "URL inválida — use https://");

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
  if (!dias || dias <= 0) return campoInvalido("#ferias-dias", "Informe a quantidade de dias.");

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

async function deletePJFerias(pjId, feriasId) {
  const pj = (state.pjs || []).find((p) => p.id === pjId);
  if (!pj?.ferias) return;
  const baixa = pj.ferias.find((f) => f.id === feriasId);
  if (!baixa) return;
  const desc = `${baixa.dias} dia${baixa.dias !== 1 ? "s" : ""} ${baixa.tipo === "vendidas" ? "vendidas" : "gozadas"} (${formatDate(baixa.data)})`;
  if (!(await confirmar({
    titulo: "Excluir baixa?",
    msg: `Remover a baixa de ${desc}. O saldo aumenta de volta.`,
    okLabel: "Excluir",
    perigo: true,
  }))) return;

  pj.ferias = pj.ferias.filter((f) => f.id !== feriasId);
  store.save(state);
  toast("Baixa removida.");
  renderPJFeriasList(pjId);
  renderApp();
}

async function deletePJ(id) {
  const pj = (state.pjs || []).find((p) => p.id === id);
  if (!pj) return;
  if (!(await confirmar({
    titulo: "Excluir PJ?",
    msg: `Excluir "${pj.nome}". O histórico inteiro será perdido.`,
    okLabel: "Excluir",
    perigo: true,
  }))) return;

  state.pjs = state.pjs.filter((p) => p.id !== id);
  store.save(state);
  closeModal();
  toast("PJ excluído.");
  renderApp();
}

// ============================================
// AUDITORIA (Admin/RH) — linha do tempo global
// Agrega o historico[] que cada ocorrência já grava
// (quem · ação · quando) numa única timeline.
// Sem coleção nova, sem escrita extra, vale retroativo.
// ============================================

const AUD_FILTROS = [
  { id: "tudo", label: "Tudo" },
  { id: "conferencias", label: "Conferências" },
  { id: "lancamentos", label: "Lançamentos" },
  { id: "edicoes", label: "Edições" },
  { id: "criacoes", label: "Criações" },
];

// Classifica uma ação textual do histórico em categoria + visual (cor + ícone).
function classificarAcaoAuditoria(acao) {
  const a = (acao || "").toLowerCase();
  if (a.includes("conferiu")) return { cat: "conferencias", dot: "ok", ic: "check" };
  if (a.includes("desfez")) return { cat: "lancamentos", dot: "warn", ic: "undo" };
  if (a.includes("lançada") || a.includes("lancada") || a.includes("lançou") || a.includes("lancou"))
    return { cat: "lancamentos", dot: "info", ic: "send" };
  if (a.includes("criou") || a.includes("adicionou")) return { cat: "criacoes", dot: "neu", ic: "plus" };
  if (a.includes("removeu") || a.includes("excluiu")) return { cat: "edicoes", dot: "dang", ic: "trash" };
  if (a.includes("reajust") || a.includes("alterou")) return { cat: "edicoes", dot: "warn", ic: "edit" };
  if (a.includes("editou") || a.includes("editada")) return { cat: "edicoes", dot: "warn", ic: "edit" };
  if (a.includes("observa")) return { cat: "edicoes", dot: "neu", ic: "message" };
  return { cat: "outros", dot: "neu", ic: "clock" };
}

// Junta todos os historico[] das ocorrências num array plano, ordenado do mais recente.
function coletarAuditoria() {
  const itens = [];
  for (const o of state.ocorrencias) {
    for (const h of (Array.isArray(o.historico) ? o.historico : [])) {
      if (!h || !h.em) continue;
      itens.push({ tipo: "occ", em: h.em, por: h.por, acao: h.acao || "—", o });
    }
  }
  // Ações de PJ (criar/editar/reajustar/remover valor) — cada PJ grava seu
  // próprio historico[]; agregamos aqui junto das ocorrências.
  for (const p of (state.pjs || [])) {
    for (const h of (Array.isArray(p.historico) ? p.historico : [])) {
      if (!h || !h.em) continue;
      itens.push({ tipo: "pj", em: h.em, por: h.por, acao: h.acao || "—", pj: p });
    }
  }
  // Log global imutável — eventos que somem do registro normal (exclusões).
  for (const ev of (state.auditoriaGlobal || [])) {
    if (!ev || !ev.em) continue;
    itens.push({ tipo: "log", em: ev.em, por: ev.por, acao: ev.acao || "—", alvoTexto: ev.alvo || "" });
  }
  itens.sort((a, b) => String(b.em).localeCompare(String(a.em)));
  return itens;
}

function renderAuditoria() {
  $("#topbar-title").textContent = "Auditoria";
  if (!state.view.audCat) state.view.audCat = "tudo";
  if (state.view.audBusca == null) state.view.audBusca = "";

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>Auditoria</h1>
        <p>Quem fez o quê e quando — ocorrências e PJ. Apenas Admin e GH.</p>
      </div>
    </header>
    <div class="aud">
      <div class="aud__filtros">
        <div class="aud__busca">
          ${icon("search")}
          <input id="aud-busca" type="search" placeholder="Buscar por funcionário ou usuário…" value="${escapeHtml(state.view.audBusca)}" />
        </div>
        <div class="aud__seg" id="aud-seg">
          ${AUD_FILTROS.map((f) => `<button data-cat="${f.id}" class="${state.view.audCat === f.id ? "on" : ""}">${f.label}</button>`).join("")}
        </div>
      </div>
      <div id="aud-feed"></div>
    </div>
  `;

  pintarFeedAuditoria(true);

  // Lazy: carrega o log global (exclusões) só na 1ª vez que a Auditoria abre —
  // não pesa no boot. Depois fica em cache na sessão (atualizações vêm do push
  // otimista do registrarAuditoria).
  if (window.carregarAuditoriaGlobal && !state._audGlobalCarregado) {
    window.carregarAuditoriaGlobal().then(() => {
      state._audGlobalCarregado = true;
      if (state.view.page === "auditoria") pintarFeedAuditoria();
    });
  }

  const busca = $("#aud-busca");
  if (busca) {
    busca.addEventListener("input", (e) => {
      state.view.audBusca = e.target.value;
      pintarFeedAuditoria();
    });
  }
  $$("#aud-seg button").forEach((b) => {
    b.addEventListener("click", () => {
      state.view.audCat = b.dataset.cat;
      $$("#aud-seg button").forEach((x) => x.classList.toggle("on", x.dataset.cat === state.view.audCat));
      pintarFeedAuditoria();
    });
  });
}

// Repinta só o feed (preserva foco da busca).
function pintarFeedAuditoria(animar) {
  const feed = $("#aud-feed");
  if (!feed) return;

  const cat = state.view.audCat || "tudo";
  const termo = (state.view.audBusca || "").trim().toLowerCase();

  const itens = coletarAuditoria().filter((it) => {
    if (cat !== "tudo" && classificarAcaoAuditoria(it.acao).cat !== cat) return false;
    if (termo) {
      const quem = (getUser(it.por)?.nome || it.por || "").toLowerCase();
      const alvo = (it.tipo === "pj"
        ? (it.pj?.nome || "")
        : it.tipo === "log"
          ? (it.alvoTexto || "")
          : (it.o?.funcionarioNome || getFuncionario(it.o?.funcionarioId)?.nome || "")).toLowerCase();
      if (!quem.includes(termo) && !alvo.includes(termo)) return false;
    }
    return true;
  });

  if (!itens.length) {
    feed.innerHTML = `<div class="aud__vazio">Nenhuma atividade encontrada.</div>`;
    return;
  }

  // Agrupa por dia (chave AAAA-MM-DD a partir do timestamp ISO).
  const hoje = todayIso();
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const grupos = [];
  let atual = null;
  for (const it of itens) {
    const dia = String(it.em).slice(0, 10);
    if (!atual || atual.dia !== dia) { atual = { dia, itens: [] }; grupos.push(atual); }
    atual.itens.push(it);
  }

  const labelDia = (dia) =>
    dia === hoje ? `Hoje · ${formatDate(dia)}`
      : dia === ontem ? `Ontem · ${formatDate(dia)}`
        : formatDate(dia);
  const hora = (em) => {
    try { return new Date(em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  };

  feed.innerHTML = grupos.map((g) => `
    <div class="aud__dia">
      <div class="aud__dia-h">${labelDia(g.dia)}</div>
      <div class="aud__feed">
        ${g.itens.map((it) => {
          const cl = classificarAcaoAuditoria(it.acao);
          const quem = getUser(it.por)?.nome || it.por || "—";
          let alvo, attr;
          if (it.tipo === "pj") {
            alvo = "PJ · " + (it.pj?.nome || "—");
            attr = `data-pj="${escapeHtml(it.pj?.id || "")}"`;
          } else if (it.tipo === "log") {
            // Registro já não existe (foi excluído) — sem clique.
            alvo = it.alvoTexto || "—";
            attr = "";
          } else {
            const func = it.o.funcionarioNome || getFuncionario(it.o.funcionarioId)?.nome || "—";
            const tp = getTipo(it.o.tipo)?.label || "—";
            alvo = `${func} · ${tp} · ${formatDate(it.o.data)}`;
            attr = `data-occ="${escapeHtml(it.o.id)}"`;
          }
          const acaoHtml = escapeHtml(it.acao).replace(/\(([^)]+)\)/, "(<b>$1</b>)");
          return `
            <button class="aud__row${attr ? "" : " aud__row--static"}" ${attr}>
              <span class="aud__dot aud__dot--${cl.dot}">${icon(cl.ic)}</span>
              <span class="aud__rc">
                <span class="aud__acao">${acaoHtml}</span>
                <span class="aud__alvo">${escapeHtml(alvo)}</span>
              </span>
              <span class="aud__meta">
                <span class="aud__quem">${escapeHtml(quem)}</span>
                <span class="aud__hora">${hora(it.em)}</span>
              </span>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `).join("");

  $$("#aud-feed .aud__row").forEach((row) => {
    row.addEventListener("click", () => {
      if (row.dataset.pj) openPJModal(row.dataset.pj);
      else if (row.dataset.occ) openOcorrenciaDetail(row.dataset.occ);
    });
  });

  if (animar) animarEntrada(feed);
}

// ---------- Configurações (Admin/RH) ----------

function renderConfig() {
  const u = currentUser();
  if (!can("sistema.config")) {
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
  if (can("sistema.usuarios")) tabs.push({ id: "usuarios", label: "Permissões", icon: "shield" });

  $("#view").innerHTML = `
    <header class="page-header">
      <div>
        <h1>Configurações</h1>
        <p>Ajustes do sistema. Apenas administradores e GH.</p>
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
  if (state.view.configTab === "usuarios" && can("sistema.usuarios")) {
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
  if (!can("sistema.config")) return;

  // Padrão = ids originais do código; Custom = ids criados via UI (custom-*).
  const padraoIds = new Set(ACOES.map((a) => a.id));
  const all = getAllAcoes();
  const padrao = all.filter((a) => padraoIds.has(a.id));
  const custom = all.filter((a) => !padraoIds.has(a.id));

  const acaoRow = (a, isCustom) => `
    <article class="cfg-row cfg-row--click" data-acao="${a.id}" role="button" tabindex="0">
      <div class="cfg-main">
        <div class="cfg-name">${escapeHtml(a.label)}</div>
        ${isCustom ? `<div class="cfg-sub">criado por ${escapeHtml(getUser(a.criadoPor)?.nome || a.criadoPor || "—")}</div>` : ""}
      </div>
      <button class="cfg-iconbtn" data-edit-acao="${a.id}" title="Editar" aria-label="Editar ${escapeHtml(a.label)}">${icon("edit")}</button>
      ${isCustom ? `<button class="cfg-iconbtn cfg-iconbtn--dang" data-delete-acao="${a.id}" title="Excluir" aria-label="Excluir ${escapeHtml(a.label)}">${icon("trash")}</button>` : ""}
    </article>
  `;

  $(selector).innerHTML = `
    <div class="cfg-actbar">
      <p>Como o líder pode encaminhar uma ocorrência. Use pra refletir as práticas internas da empresa.</p>
      <button class="btn btn--primary" id="btn-nova-acao">${icon("plus")}<span>Nova ação</span></button>
    </div>
    <div class="cfg-list">
      ${padrao.map((a) => acaoRow(a, false)).join("")}
      ${custom.map((a) => acaoRow(a, true)).join("")}
    </div>
  `;

  $("#btn-nova-acao").addEventListener("click", openNovaAcaoModal);
  const btn2 = $("#btn-nova-acao-2");
  if (btn2) btn2.addEventListener("click", openNovaAcaoModal);

  // Linha inteira abre a edição; os botões internos têm handler próprio.
  $$(`${selector} .cfg-row[data-acao]`).forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      openEditAcaoModal(el.dataset.acao);
    });
  });
  $$(`${selector} [data-edit-acao]`).forEach((b) => {
    b.addEventListener("click", (e) => { e.stopPropagation(); openEditAcaoModal(b.dataset.editAcao); });
  });
  $$(`${selector} [data-delete-acao]`).forEach((b) => {
    b.addEventListener("click", (e) => { e.stopPropagation(); deleteAcao(b.dataset.deleteAcao); });
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
  if (!label || label.length < 3) return campoInvalido("#edit-acao-label", "Nome muito curto.");

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
  if (!label) return campoInvalido("#acao-label", "Informe o nome da ação.");
  if (label.length < 3) return campoInvalido("#acao-label", "Nome muito curto.");

  const id = "custom-" + slugify(label);
  if (getAcao(id)) return campoInvalido("#acao-label", "Já existe uma ação com nome parecido.");

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

async function deleteAcao(id) {
  const a = (state.acoesCustom || []).find((x) => x.id === id);
  if (!a) return;
  const usada = state.ocorrencias.some((o) => o.acao === id);
  if (usada) {
    if (!(await confirmar({
      titulo: `Excluir "${a.label}"?`,
      msg: "Está em uso por ocorrências antigas. Excluir deixa elas com a ação como \"—\" e some do dropdown.",
      okLabel: "Excluir",
      perigo: true,
    }))) return;
  } else {
    if (!(await confirmar({
      titulo: "Excluir ação?",
      msg: `Remover a ação "${a.label}".`,
      okLabel: "Excluir",
      perigo: true,
    }))) return;
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
  if (!can("sistema.config")) return;

  // Padrão = ids originais do código (mesmo se foram editados/overrided).
  // Custom = ids criados via UI (custom-*).
  const padraoIds = new Set(TIPOS_OCORRENCIA.map((t) => t.id));
  const all = getAllTipos();
  const padrao = all.filter((t) => padraoIds.has(t.id));
  const custom = all.filter((t) => !padraoIds.has(t.id));

  const toneLabel = (tone) => TONES.find((to) => to.id === tone)?.label || tone;
  const tipoRow = (t, isCustom) => `
    <article class="cfg-row cfg-row--click" data-tipo="${t.id}" role="button" tabindex="0">
      <span class="cfg-dot cfg-dot--${t.tone}"></span>
      <div class="cfg-main">
        <div class="cfg-name">${escapeHtml(t.label)}</div>
        ${isCustom ? `<div class="cfg-sub">criado por ${escapeHtml(getUser(t.criadoPor)?.nome || t.criadoPor || "—")}</div>` : ""}
      </div>
      <span class="cfg-tone">${escapeHtml(toneLabel(t.tone))}</span>
      <button class="cfg-iconbtn" data-edit-tipo="${t.id}" title="Editar" aria-label="Editar ${escapeHtml(t.label)}">${icon("edit")}</button>
      ${isCustom ? `<button class="cfg-iconbtn cfg-iconbtn--dang" data-delete="${t.id}" title="Excluir" aria-label="Excluir ${escapeHtml(t.label)}">${icon("trash")}</button>` : ""}
    </article>
  `;

  $(selector).innerHTML = `
    <div class="cfg-actbar">
      <p>Motivos disponíveis no formulário de nova ocorrência.</p>
      <button class="btn btn--primary" id="btn-novo-tipo">${icon("plus")}<span>Novo tipo</span></button>
    </div>
    <div class="cfg-list">
      ${padrao.map((t) => tipoRow(t, false)).join("")}
      ${custom.map((t) => tipoRow(t, true)).join("")}
    </div>
  `;

  $("#btn-novo-tipo").addEventListener("click", openNovoTipoModal);
  const btn2 = $("#btn-novo-tipo-2");
  if (btn2) btn2.addEventListener("click", openNovoTipoModal);

  // Linha inteira abre a edição; os botões internos têm handler próprio.
  $$(`${selector} .cfg-row[data-tipo]`).forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      openEditTipoModal(el.dataset.tipo);
    });
  });
  $$(`${selector} [data-edit-tipo]`).forEach((b) => {
    b.addEventListener("click", (e) => { e.stopPropagation(); openEditTipoModal(b.dataset.editTipo); });
  });
  $$(`${selector} [data-delete]`).forEach((b) => {
    b.addEventListener("click", (e) => { e.stopPropagation(); deleteTipo(b.dataset.delete); });
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
  if (!label || label.length < 3) return campoInvalido("#edit-tipo-label", "Nome muito curto.");

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

function saveTipo() {
  const label = $("#tipo-label").value.trim();
  const tone = $("#tipo-tone").value;
  if (!label) return campoInvalido("#tipo-label", "Informe o nome do tipo.");

  const id = "custom-" + slugify(label);
  if (getTipo(id)) return campoInvalido("#tipo-label", "Já existe um tipo com nome parecido.");
  if (label.length < 3) return campoInvalido("#tipo-label", "Nome muito curto.");

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

async function deleteTipo(id) {
  const t = (state.tiposCustom || []).find((x) => x.id === id);
  if (!t) return;
  const usado = state.ocorrencias.some((o) => o.tipo === id);
  if (usado) {
    if (!(await confirmar({
      titulo: `Excluir "${t.label}"?`,
      msg: "Está em uso por ocorrências antigas. Excluir mantém os registros mas o tipo some do formulário.",
      okLabel: "Excluir",
      perigo: true,
    }))) return;
  } else {
    if (!(await confirmar({
      titulo: "Excluir tipo?",
      msg: `Remover o tipo "${t.label}".`,
      okLabel: "Excluir",
      perigo: true,
    }))) return;
  }
  state.tiposCustom = state.tiposCustom.filter((x) => x.id !== id);
  store.save(state);
  toast("Tipo excluído.");
  renderApp();
}

// ---------- Permissões data-driven ----------
// Capabilities canônicas (chave estável + rótulo). scoped=true → para líder/
// supervisor o valor pode ser "turno"/"atrib" (escopo), não só ligado/desligado.
const PERM_CAPS = [
  { area: "Ocorrências", caps: [
    { k: "ocorrencias.ver", n: "Ver lançamentos", scoped: true },
    { k: "ocorrencias.criar", n: "Criar / lançar nova" },
    { k: "ocorrencias.conferir", n: "Conferir (validar)", scoped: true },
    { k: "ocorrencias.lancar", n: "Marcar como lançada" },
    { k: "ocorrencias.editarTudo", n: "Editar o lançamento inteiro" },
    { k: "ocorrencias.excluir", n: "Excluir" },
  ]},
  { area: "Banco de Horas", caps: [
    { k: "bancoHoras.ver", n: "Ver saldos", scoped: true },
    { k: "bancoHoras.importar", n: "Importar planilha" },
  ]},
  { area: "Controle PJ", caps: [
    { k: "pj.ver", n: "Ver contratos" },
    { k: "pj.editar", n: "Criar / editar contrato" },
    { k: "pj.reajuste", n: "Aplicar reajuste (IPCA)" },
    { k: "pj.excluir", n: "Excluir" },
  ]},
  { area: "Funcionários", caps: [
    { k: "func.ver", n: "Ver ficha", scoped: true },
    { k: "func.editar", n: "Editar turno / setor" },
    { k: "func.dadosSensiveis", n: "Ver dados sensíveis (saldo)" },
  ]},
  { area: "Auditoria", caps: [
    { k: "auditoria.ver", n: "Ver histórico de alterações" },
  ]},
  { area: "Obrigações", caps: [
    { k: "obrigacoes.gerenciar", n: "Ver e gerenciar a agenda de obrigações" },
  ]},
  { area: "Sistema", caps: [
    { k: "sistema.config", n: "Configurações (tipos, ações)" },
    { k: "sistema.usuarios", n: "Gerenciar usuários e permissões" },
  ]},
];

// Default = espelho EXATO das regras de hoje. Admin não entra (sempre total).
// Valores: true | false | "turno" (escopo líder) | "atrib" (funcionários do supervisor).
const PERM_DEFAULT = {
  rh: {
    "ocorrencias.ver": true, "ocorrencias.criar": true, "ocorrencias.conferir": true,
    "ocorrencias.lancar": true, "ocorrencias.editarTudo": false, "ocorrencias.excluir": true,
    "bancoHoras.ver": true, "bancoHoras.importar": true,
    "pj.ver": true, "pj.editar": true, "pj.reajuste": true, "pj.excluir": true,
    "func.ver": true, "func.editar": true, "func.dadosSensiveis": true, "obrigacoes.gerenciar": true,
    "auditoria.ver": true, "sistema.config": true, "sistema.usuarios": false,
  },
  lider: {
    "ocorrencias.ver": "turno", "ocorrencias.criar": false, "ocorrencias.conferir": "turno",
    "ocorrencias.lancar": false, "ocorrencias.editarTudo": false, "ocorrencias.excluir": false,
    "bancoHoras.ver": "turno", "bancoHoras.importar": false,
    "pj.ver": false, "pj.editar": false, "pj.reajuste": false, "pj.excluir": false,
    "func.ver": false, "func.editar": false, "func.dadosSensiveis": false, "obrigacoes.gerenciar": false,
    "auditoria.ver": false, "sistema.config": false, "sistema.usuarios": false,
  },
  supervisor: {
    "ocorrencias.ver": "atrib", "ocorrencias.criar": false, "ocorrencias.conferir": "atrib",
    "ocorrencias.lancar": false, "ocorrencias.editarTudo": false, "ocorrencias.excluir": false,
    "bancoHoras.ver": "atrib", "bancoHoras.importar": false,
    "pj.ver": false, "pj.editar": false, "pj.reajuste": false, "pj.excluir": false,
    "func.ver": "atrib", "func.editar": false, "func.dadosSensiveis": false, "obrigacoes.gerenciar": false,
    "auditoria.ver": false, "sistema.config": false, "sistema.usuarios": false,
  },
};

// Mapa efetivo de um papel = default + overrides salvos (state.permissoes).
function permEfetivo(role) {
  const base = PERM_DEFAULT[role] || {};
  const over = (state.permissoes && state.permissoes[role]) || null;
  return over ? { ...base, ...over } : { ...base };
}

// can(cap) — o papel TEM a capacidade? (admin sempre). O escopo em si
// (turno/funcionários) continua aplicado pelas funções existentes; aqui só
// dizemos se há acesso. "turno"/"atrib" contam como ter acesso.
function can(cap, user) {
  user = user || currentUser();
  if (!user || !user.role) return false;
  if (user.role === "admin") return true;
  const v = permEfetivo(user.role)[cap];
  return v === true || v === "turno" || v === "atrib";
}

// Persiste o mapa de permissões (debounced) em /config/permissoes. Em modo
// demo (sem firebase) fica só em memória. Admin only — garantido na regra.
let _permSaveTimer = null;
function salvarPermissoesDebounced() {
  clearTimeout(_permSaveTimer);
  _permSaveTimer = setTimeout(async () => {
    if (typeof window.salvarPermissoes !== "function") return;
    const res = await window.salvarPermissoes(state.permissoes);
    if (res && res.ok) toast("Permissões salvas.");
    else toast("Erro ao salvar permissões: " + (res?.err || "?"), "danger");
  }, 600);
}

const ACCESS_PREVIEW = {
  admin: ["Vê e edita tudo, em todos os turnos", "Gerencia usuários e permissões", "Exclui e edita lançamentos por completo"],
  rh: ["Cria, lança e exclui ocorrências (todos os turnos)", "Controle PJ, reajustes e auditoria", "Não gerencia usuários"],
  lider: ["Confere ocorrências do seu turno", "Vê banco de horas do turno", "Não cria nem exclui"],
  supervisor: ["Confere só os funcionários atribuídos", "Vê fichas e banco de horas desses funcionários", "Não cria, não exclui, não vê PJ"],
};

function escopoUsuario(u) {
  if (u.role === "admin") return "Acesso total";
  if (u.role === "rh") return "Todos os turnos";
  if (u.role === "lider") return u.turno === "geral" ? "Horário geral" : (u.turno ? `Turno ${u.turno}` : "Turno —");
  if (u.role === "supervisor") {
    const n = (u.funcionariosVisiveis || []).length;
    return `${n} ${n === 1 ? "funcionário" : "funcionários"}`;
  }
  return "";
}

// Valor "ligado" de uma capacidade para um papel (respeita o escopo natural:
// líder → "turno", supervisor → "atrib" nas capacidades escopadas).
function permOnValue(role, cap) {
  if (role === "lider" || role === "supervisor") {
    const def = PERM_CAPS.flatMap((g) => g.caps).find((c) => c.k === cap);
    if (def && def.scoped) return role === "lider" ? "turno" : "atrib";
  }
  return true;
}
function permCellInner(val) {
  if (val === "turno") return `<span class="perm-pill perm-pill--turno">turno</span>`;
  if (val === "atrib") return `<span class="perm-pill perm-pill--atrib">atribuídos</span>`;
  if (val === true) return icon("check");
  return `<span class="perm-cell--no">–</span>`;
}
function pintarPermCell(cell, val) {
  cell.classList.toggle("perm-cell--off", !val);
  cell.innerHTML = permCellInner(val);
}
function permCell(role, cap, val, locked) {
  if (locked) return `<span class="perm-cell perm-cell--lock">${icon("check")}</span>`;
  return `<span class="perm-cell perm-cell--edit ${val ? "" : "perm-cell--off"}" role="button" tabindex="0" data-prole="${role}" data-pcap="${cap}" title="Clique pra ligar/desligar">${permCellInner(val)}</span>`;
}

function permissoesMatrizHtml() {
  const users = state.users || [];
  const n = (r) => users.filter((u) => u.role === r).length;
  const ef = { rh: permEfetivo("rh"), lider: permEfetivo("lider"), supervisor: permEfetivo("supervisor") };
  const rows = PERM_CAPS.map((g) => `
    <tr class="perm-grp"><td colspan="5">${g.area}</td></tr>
    ${g.caps.map((c) => `
      <tr class="perm-row">
        <td class="perm-name">${c.n}</td>
        <td class="perm-c">${permCell("admin", c.k, true, true)}</td>
        <td class="perm-c">${permCell("rh", c.k, ef.rh[c.k])}</td>
        <td class="perm-c">${permCell("lider", c.k, ef.lider[c.k])}</td>
        <td class="perm-c">${permCell("supervisor", c.k, ef.supervisor[c.k])}</td>
      </tr>`).join("")}
  `).join("");

  return `
    <details class="perm-matrix">
      <summary>
        <span class="perm-matrix__t">Papéis &amp; acessos</span>
        <span class="perm-matrix__h">toque pra abrir — clique numa célula pra ligar/desligar</span>
      </summary>
      <div class="perm-table-wrap">
        <table class="perm-table">
          <thead>
            <tr>
              <th class="perm-corner">O que pode fazer</th>
              <th class="perm-rcol perm-rcol--admin"><span>Admin</span><small>${n("admin")} ${n("admin") === 1 ? "pessoa" : "pessoas"}</small></th>
              <th class="perm-rcol perm-rcol--gh"><span>GH</span><small>${n("rh")} ${n("rh") === 1 ? "pessoa" : "pessoas"}</small></th>
              <th class="perm-rcol perm-rcol--lider"><span>Líder</span><small>${n("lider")} ${n("lider") === 1 ? "pessoa" : "pessoas"}</small></th>
              <th class="perm-rcol perm-rcol--super"><span>Supervisor</span><small>${n("supervisor")} ${n("supervisor") === 1 ? "pessoa" : "pessoas"}</small></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="perm-legend">
        <span><span class="perm-lg-chk">${icon("check")}</span> liberado</span>
        <span><span class="perm-pill perm-pill--turno">turno</span> restrito ao turno</span>
        <span><span class="perm-pill perm-pill--atrib">atribuídos</span> só do supervisor</span>
        <span><span class="perm-cell--no">–</span> sem acesso</span>
      </div>
    </details>`;
}

// ---------- Usuários (Admin) ----------

function renderUsuarios() { renderUsuariosInto("#view"); }
function renderUsuariosInto(selector) {
  const isFirebaseMode = typeof window.inviteUser === "function";

  $(selector).innerHTML = `
    ${permissoesMatrizHtml()}
    <div class="cfg-actbar">
      <p>Quem acessa, com qual papel e qual escopo.${isFirebaseMode ? " Clique numa linha pra editar." : ""}</p>
      <button class="btn btn--primary" id="btn-novo-user" ${!isFirebaseMode ? `disabled title="Disponível apenas em modo Firebase"` : ""}>${icon("plus")}<span>Novo usuário</span></button>
    </div>

    <div class="cfg-list">
      ${state.users.map((u) => `
        <article class="cfg-row ${isFirebaseMode ? "cfg-row--click" : ""}" data-edit-user="${u.id}" ${isFirebaseMode ? 'role="button" tabindex="0"' : ""}
                 style="opacity:${u.ativo === false ? "0.55" : "1"};"
                 title="${isFirebaseMode ? "Clique para editar" : ""}">
          <div class="avatar" data-uid="${u.id}">${initials(u.nome || u.email || "?")}</div>
          <div class="cfg-main">
            <div class="cfg-name">${escapeHtml(u.nome || "(sem nome)")}${u.ativo === false ? ` <span class="cfg-tone">inativo</span>` : ""}</div>
            <div class="cfg-sub">${escapeHtml(u.email || "@" + u.id)} · ${escopoUsuario(u)}</div>
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

  // Matriz de permissões: clicar numa célula liga/desliga (admin). Persiste o
  // mapa completo; o default cobre o que faltar. Admin é sempre total (locked).
  const ehAdminPerm = currentUser()?.role === "admin";
  $$(`${selector} .perm-cell--edit`).forEach((cell) => {
    const toggle = () => {
      if (!ehAdminPerm) return;
      const role = cell.dataset.prole, cap = cell.dataset.pcap;
      const atual = permEfetivo(role)[cap];
      const ligado = atual === true || atual === "turno" || atual === "atrib";
      const novoVal = ligado ? false : permOnValue(role, cap);
      const mapa = { rh: permEfetivo("rh"), lider: permEfetivo("lider"), supervisor: permEfetivo("supervisor") };
      mapa[role][cap] = novoVal;
      state.permissoes = mapa;
      pintarPermCell(cell, novoVal);
      salvarPermissoesDebounced();
    };
    cell.addEventListener("click", toggle);
    cell.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  });

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
    reset.addEventListener("click", async () => {
      if (await confirmar({
        titulo: "Resetar dados?",
        msg: "Apaga todos os registros locais e volta ao seed inicial.",
        okLabel: "Resetar",
        perigo: true,
      })) {
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
        <input type="text" id="user-nome" required aria-required="true" placeholder="Ex: Adelir Padilha" />
      </div>
      <div class="field">
        <label for="user-email">Email corporativo <span style="color:var(--danger)">*</span></label>
        <input type="email" id="user-email" required aria-required="true" placeholder="adelir@fiobras.com.br" />
        <span class="field__hint">Será o login dele(a). Email pra redefinição vai pra este endereço.</span>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="novo-user-role">Papel <span style="color:var(--danger)">*</span></label>
          <select id="novo-user-role" required aria-required="true">
            <option value="rh">GH (cria e edita ocorrências)</option>
            <option value="lider">Líder (confere ocorrências do turno)</option>
            <option value="supervisor">Supervisor (confere funcionários específicos)</option>
            <option value="admin">Administrador (acesso total)</option>
          </select>
        </div>
        <div class="field" id="user-turno-field" style="display:none;">
          <label for="user-turno">Turno <span style="color:var(--danger)">*</span></label>
          <select id="user-turno" aria-required="true">
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
        <input type="text" id="edit-nome" required aria-required="true" value="${escapeHtml(u.nome || "")}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="edit-role">Papel <span style="color:var(--danger)">*</span></label>
          <select id="edit-role" required aria-required="true" ${ehVoceMesmo ? "disabled" : ""}>
            <option value="rh" ${u.role === "rh" ? "selected" : ""}>GH</option>
            <option value="lider" ${u.role === "lider" ? "selected" : ""}>Líder</option>
            <option value="supervisor" ${u.role === "supervisor" ? "selected" : ""}>Supervisor</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Administrador</option>
          </select>
          ${ehVoceMesmo ? `<span class="field__hint">Você não pode mudar seu próprio papel.</span>` : ""}
        </div>
        <div class="field" id="edit-turno-field" style="display:${u.role === "lider" ? "block" : "none"};">
          <label for="edit-turno">Turno <span style="color:var(--danger)">*</span></label>
          <select id="edit-turno" aria-required="true">
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

      <div class="perm-preview" id="edit-access-preview"></div>

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
        const pv = $("#edit-access-preview");
        if (pv) pv.innerHTML = `<div class="perm-preview__t">Acesso resultante</div><ul>${(ACCESS_PREVIEW[r] || []).map((t) => `<li>${icon("check")}<span>${escapeHtml(t)}</span></li>`).join("")}</ul>`;
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

// uid do usuário atual. Em modo Firebase currentUser().id === auth.currentUser.uid.
function meuUid() {
  const u = currentUser();
  return u ? u.id : null;
}

// Está online agora? (presença ativa). Usado pro ponto verde.
function peerOnline(uid) {
  return (state.presence || []).some((p) => p.uid === uid && p.status === "ativo");
}

// Aviso de mensagem nova (toast + bip) — só quando NÃO estou vendo aquela
// conversa. Chamado pelo listener global (firebase.js) com as msgs novas.
window.onNovaMensagemChat = function (novas) {
  if (!Array.isArray(novas) || !novas.length) return;
  const widget = $("#chat-widget");
  const vendo = widget && !widget.hidden && state.view.chatPeer;
  const relevantes = novas.filter((m) => !(vendo && state.view.chatPeer.uid === m.de));
  if (!relevantes.length) return;
  const ult = relevantes[relevantes.length - 1];
  const nome = (ult.deNome || "Alguém").split(" ")[0];
  toast(relevantes.length === 1 ? `Mensagem de ${nome}` : `${relevantes.length} novas mensagens`, "success");
  try { tocarBeepNotificacao(); } catch (e) {}
};

// Atualiza o status no header da conversa aberta: digitando… / online / offline.
function atualizarStatusThread() {
  if (!_chatRender) return;
  const st = $("#chat-thread .chat__thread-status");
  if (!st) return;
  const meu = meuUid();
  const p = (state.presence || []).find((x) => x.uid === _chatRender.peerUid);
  if (p && p.status === "ativo" && p.digitandoPara === meu) {
    st.textContent = "digitando…";
    st.classList.add("is-typing");
    return;
  }
  st.classList.remove("is-typing");
  st.textContent = peerOnline(_chatRender.peerUid) ? "online" : "offline";
}

// "Digitando…": escreve na minha presença ao digitar; limpa após 2,5s parado
// (ou no envio/voltar/fechar). Throttle: 1 escrita por rajada de digitação.
let _digitTimer = null, _digitOn = false, _digitPeer = null;
function sinalizarDigitando(peerUid) {
  if (!window.setDigitando || !peerUid) return;
  // Se mudou de peer, força nova sinalização pro peer certo (não pula por _digitOn).
  if (!_digitOn || _digitPeer !== peerUid) { _digitOn = true; _digitPeer = peerUid; window.setDigitando(peerUid); }
  clearTimeout(_digitTimer);
  _digitTimer = setTimeout(() => { _digitOn = false; _digitPeer = null; window.setDigitando(null); }, 2500);
}
function pararDigitando() {
  if (_digitTimer) { clearTimeout(_digitTimer); _digitTimer = null; }
  if (_digitOn && window.setDigitando) { _digitOn = false; _digitPeer = null; window.setDigitando(null); }
}

// ---------- Chat: widget flutuante (FAB estilo WhatsApp) ----------
// O chat vive num painel sobreposto (não mais numa página/aba). Os IDs
// internos #chat-contatos e #chat-thread são os MESMOS que as funções de
// lista/thread targetam, então a lógica de mensagens é reaproveitada inteira.

function abrirChatWidget() {
  const w = $("#chat-widget"); if (!w) return;
  window._chatPrevFocus = document.activeElement;
  w.hidden = false;
  $("#chat-fab")?.setAttribute("aria-expanded", "true");
  document.body.classList.add("chat-widget-aberto");
  // ESC fecha (ou volta pra lista se há thread aberta). Liga uma vez só.
  if (!window._chatEscHandler) {
    window._chatEscHandler = (e) => {
      if (e.key !== "Escape") return;
      const ww = $("#chat-widget");
      if (!ww || ww.hidden || $("#modal-backdrop")) return; // modal trata primeiro
      e.preventDefault();
      const voltar = $("#chat-voltar");
      if (ww.classList.contains("tem-thread") && voltar) voltar.click();
      else fecharChatWidget();
    };
    document.addEventListener("keydown", window._chatEscHandler);
  }
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
  $("#chat-fab")?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("chat-widget-aberto");
  pararDigitando();
  pararEscutaConversa();
  _chatRender = null;
  // Devolve o foco pro FAB (a11y).
  const fab = $("#chat-fab");
  if (fab && typeof fab.focus === "function") { try { fab.focus(); } catch (e) {} }
}

function toggleChatWidget() {
  const w = $("#chat-widget");
  if (w && w.hidden) abrirChatWidget(); else fecharChatWidget();
}

// Renderiza a coluna esquerda: cria a busca UMA vez (preserva foco em
// re-renders por presença) e repinta só as linhas via pintarChatRows.
function renderChatLista() {
  const cont = $("#chat-contatos");
  if (!cont) return;
  if (!$("#chat-rows")) {
    cont.innerHTML = `
      <div class="chat__busca">
        ${icon("search")}
        <input id="chat-busca-input" type="search" placeholder="Buscar pessoa…" value="${escapeHtml(state.view.chatBusca || "")}" />
      </div>
      <button id="chat-mark-all" class="chat__markall" hidden>${icon("check")}<span>Marcar todas como lidas</span></button>
      <div class="chat__rows" id="chat-rows"></div>`;
    const inp = $("#chat-busca-input");
    if (inp) inp.addEventListener("input", (e) => { state.view.chatBusca = e.target.value; pintarChatRows(); });
    const mb = $("#chat-mark-all");
    if (mb) mb.addEventListener("click", async () => {
      if (typeof window.marcarTodasLidas !== "function") return;
      mb.disabled = true;
      const r = await window.marcarTodasLidas();
      if (r && r.ok) toast(r.n ? "Tudo marcado como lido." : "Nada pendente.");
      else toast("Não consegui marcar agora. Tenta de novo.", "danger");
      mb.disabled = false;
      // O listener do Firestore atualiza badge + lista ao confirmar.
    });
    // Delegação única: um listener no container, em vez de rebind por linha a
    // cada pintura (perf + preserva foco/scroll).
    const rowsEl = $("#chat-rows");
    if (rowsEl) rowsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".chat__contato");
      if (!btn) return;
      const uid = btn.dataset.uid, nome = btn.dataset.nome;
      state.view.chatPeer = { uid, nome };
      pintarChatRows();
      abrirConversa(uid, nome);
    });
  }
  pintarChatRows();
}

// Repinta as linhas: "Conversas" (já trocou msg, de state.conversas) e
// "Pessoas" (todos os outros users). Filtra pela busca.
function pintarChatRows() {
  const rows = $("#chat-rows");
  if (!rows) return;
  const mb = $("#chat-mark-all");
  if (mb) mb.hidden = contarNaoLidas() <= 0;
  const meu = meuUid();
  const peer = state.view.chatPeer || null;
  const termo = (state.view.chatBusca || "").trim().toLowerCase();
  const bate = (nome) => !termo || (nome || "").toLowerCase().includes(termo);

  const conversas = (state.conversas || [])
    .map((c) => ({ ...c, online: peerOnline(c.uid) }))
    .filter((c) => bate(c.nome));

  const jaConversa = new Set((state.conversas || []).map((c) => c.uid));
  const pessoas = (state.users || [])
    .filter((u) => u.id && u.id !== meu && !jaConversa.has(u.id))
    .map((u) => ({ uid: u.id, nome: u.nome || "?", online: peerOnline(u.id) }))
    .filter((p) => bate(p.nome))
    .sort((a, b) => (a.online !== b.online ? (a.online ? -1 : 1) : (a.nome || "").localeCompare(b.nome || "")));

  if (!conversas.length && !pessoas.length) {
    rows.innerHTML = `<div class="chat__contatos-vazio">${termo ? "Ninguém encontrado." : "Ninguém pra conversar ainda."}</div>`;
    return;
  }

  const userById = new Map((state.users || []).map((u) => [u.id, u]));
  const avatarHtml = (c) => {
    const foto = fotoSegura(userById.get(c.uid)?.fotoBase64);
    const style = foto
      ? `background-image:url('${foto}');background-size:cover;background-position:center;`
      : `background:${presenceColor(c.uid)};`;
    return `<span class="chat__avatar" style="${style}">${foto ? "" : escapeHtml(initials(c.nome || "?"))}${c.online ? `<span class="chat__online-dot"></span>` : ""}</span>`;
  };
  const linhaConversa = (c) => {
    const ativo = peer && peer.uid === c.uid;
    let prev = c.ultimaMsg ? (c.deMim ? "Você: " : "") + c.ultimaMsg : (c.online ? "online" : "");
    if (prev.length > 38) prev = prev.slice(0, 38) + "…";
    return `
      <button class="chat__contato ${c.online ? "chat__contato--online" : ""} ${ativo ? "is-active" : ""}" data-uid="${escapeHtml(c.uid)}" data-nome="${escapeHtml(c.nome)}">
        ${avatarHtml(c)}
        <span class="chat__contato-info">
          <span class="chat__contato-top">
            <span class="chat__contato-nome">${escapeHtml(c.nome || "?")}</span>
            <span class="chat__contato-hora">${c.ultimaEm ? escapeHtml(formatHoraOuDia(c.ultimaEm)) : ""}</span>
          </span>
          <span class="chat__contato-preview ${c.naoLidas ? "is-unread" : ""}">${escapeHtml(prev)}</span>
        </span>
        ${c.naoLidas > 0 ? `<span class="chat__contato-badge">${c.naoLidas > 9 ? "9+" : c.naoLidas}</span>` : ""}
      </button>`;
  };
  const linhaPessoa = (c) => {
    const ativo = peer && peer.uid === c.uid;
    return `
      <button class="chat__contato ${c.online ? "chat__contato--online" : ""} ${ativo ? "is-active" : ""}" data-uid="${escapeHtml(c.uid)}" data-nome="${escapeHtml(c.nome)}">
        ${avatarHtml(c)}
        <span class="chat__contato-info">
          <span class="chat__contato-nome">${escapeHtml(c.nome || "?")}</span>
          <span class="chat__contato-preview">${c.online ? "online" : "toque pra conversar"}</span>
        </span>
      </button>`;
  };

  let html = "";
  if (conversas.length) html += `<div class="chat__sec">Conversas</div>` + conversas.map(linhaConversa).join("");
  if (pessoas.length) html += `<div class="chat__sec">Pessoas</div>` + pessoas.map(linhaPessoa).join("");
  rows.innerHTML = html;

}

// Atualiza só os pontos verde/online das linhas já renderizadas (sem repintar
// a lista) — chamado a cada heartbeat de presença. Preserva foco/scroll/hover.
function atualizarPontosOnlineChat() {
  const rows = $("#chat-rows");
  if (!rows) return;
  rows.querySelectorAll(".chat__contato[data-uid]").forEach((btn) => {
    const on = peerOnline(btn.dataset.uid);
    btn.classList.toggle("chat__contato--online", on);
    let dot = btn.querySelector(".chat__online-dot");
    const av = btn.querySelector(".chat__avatar");
    if (on && !dot && av) { dot = document.createElement("span"); dot.className = "chat__online-dot"; av.appendChild(dot); }
    else if (!on && dot) dot.remove();
  });
}

// Abre/assina a conversa com um peer. Monta o esqueleto UMA vez; os snapshots
// só anexam mensagens novas (render incremental → fluido, sem flicker).
function abrirConversa(peerUid, peerNome) {
  pararEscutaConversa();
  pararDigitando(); // não vaza "digitando…" pro peer anterior ao trocar de conversa
  const meu = meuUid();
  if (!meu || !chatDisponivel()) return;
  if (peerUid === meu) return; // sem auto-conversa (duplicaria as bolhas)

  // No widget flutuante, a thread cobre a lista de contatos.
  $("#chat-widget")?.classList.add("tem-thread");

  const thread = $("#chat-thread");
  if (thread) {
    thread.innerHTML = chatThreadShell(peerNome, peerUid, `<div class="sk-chat" role="status" aria-label="Carregando mensagens"><div class="sk-bubble sk-bubble--in"></div><div class="sk-bubble sk-bubble--out"></div><div class="sk-bubble sk-bubble--in" style="width:42%"></div><div class="sk-bubble sk-bubble--out" style="width:54%"></div></div>`);
    wireChatThread(peerUid, peerNome);
  }
  // Estado do render incremental desta conversa.
  _chatRender = { peerUid, ids: new Set(), lastDia: null, lastDe: null, primeiro: true };
  atualizarStatusThread();
  // Zera otimisticamente o badge desta conversa (o snapshot confirma depois).
  const _conv = (state.conversas || []).find((c) => c.uid === peerUid);
  if (_conv && _conv.naoLidas) { _conv.naoLidas = 0; try { window.atualizarBadgeChat?.(); } catch (e) {} }

  _chatConvUnsub = window.escutarConversa(peerUid, (msgs, err) => {
    if (err) {
      const area = $("#chat-msgs");
      if (area) area.innerHTML = `<div class="chat__msgs-vazio">Não foi possível carregar agora. Feche e abra a conversa de novo.</div>`;
      return;
    }
    if (!_chatRender || _chatRender.peerUid !== peerUid) return; // trocou de conversa
    pintarMensagens(msgs);
    // Marca como lidas as recebidas desta conversa (best-effort)
    window.marcarConversaLida(peerUid).catch((e) => console.warn("[chat] marcarLida:", e?.message || e));
  });
}

// HTML do "esqueleto" da thread (header + área de msgs + composer).
function chatThreadShell(peerNome, peerUid, msgsHtml) {
  const online = peerOnline(peerUid);
  const foto = fotoSegura((state.users || []).find((x) => x.id === peerUid)?.fotoBase64);
  const avStyle = foto
    ? `background-image:url('${foto}'); background-size:cover; background-position:center;`
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
        <span class="chat__thread-status" role="status" aria-live="polite">${online ? "online" : "offline"}</span>
      </span>
    </div>
    <div class="chat__msgs" id="chat-msgs" role="log" aria-live="polite" aria-relevant="additions">${msgsHtml}</div>
    <form class="chat__composer" id="chat-composer">
      <textarea id="chat-input" rows="1" maxlength="2000" placeholder="Escreva uma mensagem"></textarea>
      <button type="submit" class="chat__enviar" aria-label="Enviar">${icon("send")}</button>
    </form>
    <button type="button" class="chat__descer" id="chat-descer" aria-label="Descer para a última mensagem">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
    </button>`;
}

// Check de envio (1) e de leitura (2 riscos) — só nas minhas mensagens.
const CHAT_CHK_SENT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const CHAT_CHK_READ = `<svg viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 7 16 3.5 12.5"/><polyline points="24 6 14.5 17 12 14.5"/></svg>`;

// Meta do balao: hora + (nas minhas) check de envio / duplo de leitura.
function chatMetaHtml(m, minha) {
  const hora = formatHoraCurta(m.criadoEm);
  const horaSpan = hora ? `<span class="chat__bolha-hora">${hora}</span>` : "";
  const check = minha ? `<span class="chat__check ${m.lido ? "is-lido" : ""}">${m.lido ? CHAT_CHK_READ : CHAT_CHK_SENT}</span>` : "";
  return horaSpan + check;
}

// Reações do chat (conteúdo emoji — exceção combinada à regra "sem emoji").
const EMOJIS_REACAO = ["👍", "👎", "❤️", "😂", "😮", "😢"];

// Chip de reações na borda do balão. Escapa os valores (vêm do Firestore).
function chatReacoesHtml(reacoes) {
  const vals = Object.values(reacoes || {});
  if (!vals.length) return "";
  const uniq = [...new Set(vals)].map(escapeHtml).join("");
  return uniq + (vals.length > 1 ? `<span class="chat__reacoes-cnt">${vals.length}</span>` : "");
}

// Barra de emojis (igual em todo balão; revelada ao clicar no gatilho).
const REACAO_LABEL = { "👍": "Curtir", "👎": "Não curtir", "❤️": "Amei", "😂": "Risos", "😮": "Uau", "😢": "Triste" };
function chatReactBarHtml() {
  return `<div class="chat__react-bar">${EMOJIS_REACAO.map((e) => `<button type="button" class="chat__react-emoji" data-react-emoji="${e}" aria-label="${REACAO_LABEL[e] || "Reagir"}">${e}</button>`).join("")}</div>`;
}

// Aplica/alterna a MINHA reação (toggle: a mesma reação remove).
function aplicarReacao(mid, emoji) {
  if (!mid || !window.reagirMensagem) return;
  const meu = meuUid();
  const m = _chatRender && _chatRender.byId ? _chatRender.byId.get(mid) : null;
  const atual = (m && m.reacoes && m.reacoes[meu]) || null;
  const novo = (!emoji || emoji === atual) ? null : emoji;
  // Atualiza o estado local JÁ (antes do round-trip) pra cliques rápidos
  // alternarem certo em vez de lerem a reação do snapshot anterior.
  if (m) {
    m.reacoes = m.reacoes || {};
    if (novo) m.reacoes[meu] = novo; else delete m.reacoes[meu];
    const chipEl = document.querySelector(`#chat-msgs [data-mid="${mid}"] .chat__reacoes`);
    if (chipEl) chipEl.innerHTML = chatReacoesHtml(m.reacoes);
  }
  window.reagirMensagem(mid, novo).catch((e) => console.warn("[reacao]", e?.message || e));
}

// Render INCREMENTAL: anexa só as mensagens ainda não renderizadas em
// #chat-msgs (com separador de dia + agrupamento), e nas já renderizadas só
// atualiza a meta (hora que resolveu / leitura). Não toca header/composer
// (foco preservado) e usa scroll inteligente.
function pintarMensagens(msgs) {
  const cont = $("#chat-msgs");
  if (!cont || !_chatRender) return;
  // remove ecos otimistas pendentes — esta emissão traz a versão real do servidor
  cont.querySelectorAll(".chat__bolha[data-temp]").forEach((e) => e.remove());
  const meu = meuUid();
  _chatRender.byId = new Map((msgs || []).map((m) => [m.id, m])); // pro toggle de reação

  if (_chatRender.primeiro) {
    cont.innerHTML = "";
    _chatRender.primeiro = false;
    if (!msgs || !msgs.length) {
      cont.innerHTML = `<div class="chat__msgs-vazio">Nenhuma mensagem ainda. Diga oi!</div>`;
      return;
    }
  }
  if (msgs && msgs.length && cont.querySelector(".chat__msgs-vazio")) cont.innerHTML = "";

  const perto = (cont.scrollHeight - cont.scrollTop - cont.clientHeight) < 110;
  let anexou = false, ultimaMinha = false;

  for (const m of (msgs || [])) {
    if (!m.id) continue;
    const minha = m.de === meu;

    // Já renderizada: atualiza meta (hora/leitura) e o chip de reações.
    if (_chatRender.ids.has(m.id)) {
      const bolhaEl = cont.querySelector(`[data-mid="${m.id}"]`);
      if (bolhaEl) {
        const metaEl = bolhaEl.querySelector(".chat__bolha-meta");
        if (metaEl) metaEl.innerHTML = chatMetaHtml(m, minha);
        const chipEl = bolhaEl.querySelector(".chat__reacoes");
        if (chipEl) chipEl.innerHTML = chatReacoesHtml(m.reacoes);
      }
      continue;
    }
    _chatRender.ids.add(m.id);

    const dia = diaLocalISO(m.criadoEm);
    if (dia && dia !== _chatRender.lastDia) {
      const sep = document.createElement("div");
      sep.className = "chat__daysep";
      sep.textContent = labelDiaChat(dia);
      cont.appendChild(sep);
      _chatRender.lastDia = dia;
      _chatRender.lastDe = null; // novo dia quebra o agrupamento
    }

    const grp = _chatRender.lastDe === m.de;
    const b = document.createElement("div");
    b.className = `chat__bolha ${minha ? "chat__bolha--minha" : ""} ${grp ? "chat__bolha--grp" : ""}`;
    b.dataset.mid = m.id;
    b.innerHTML =
      `<span class="chat__bolha-texto">${escapeHtml(m.texto || "")}</span>` +
      `<span class="chat__bolha-meta">${chatMetaHtml(m, minha)}</span>` +
      `<button type="button" class="chat__reagir" data-react-trig aria-label="Reagir">${icon("smile")}</button>` +
      chatReactBarHtml() +
      `<span class="chat__reacoes" data-react-chip>${chatReacoesHtml(m.reacoes)}</span>`;
    cont.appendChild(b);

    _chatRender.lastDe = m.de;
    anexou = true;
    ultimaMinha = minha;
  }

  if (anexou && (perto || ultimaMinha)) cont.scrollTop = cont.scrollHeight;
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
      pararDigitando();
      pararEscutaConversa();
      _chatRender = null;
      state.view.chatPeer = null;
      // A thread desliza pra fora (CSS); a lista já está atrás. Só atualiza o highlight.
      $("#chat-widget")?.classList.remove("tem-thread");
      pintarChatRows();
    });
  }

  const form = $("#chat-composer");
  const input = $("#chat-input");
  if (input) {
    input.addEventListener("input", () => { autoGrowTextarea(input); sinalizarDigitando(peerUid); });
    // Enter envia; Shift+Enter quebra linha
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarDoComposer(peerUid, peerNome);
      }
    });
    if (window.matchMedia && window.matchMedia("(pointer:fine)").matches) setTimeout(() => input.focus(), 30);
  }
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      enviarDoComposer(peerUid, peerNome);
    });
  }

  // Botão "descer": aparece ao rolar pra cima, leva pro fim da conversa.
  const msgsEl = $("#chat-msgs");
  const descerBtn = $("#chat-descer");
  if (msgsEl && descerBtn) {
    const pertoFim = () => (msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight) < 120;
    msgsEl.addEventListener("scroll", () => descerBtn.classList.toggle("is-visible", !pertoFim()));
    descerBtn.addEventListener("click", () => { msgsEl.scrollTop = msgsEl.scrollHeight; descerBtn.classList.remove("is-visible"); });
  }

  // Reações (delegado em #chat-msgs — elemento recriado a cada conversa, sem stack).
  if (msgsEl) {
    msgsEl.addEventListener("click", (e) => {
      const trig = e.target.closest("[data-react-trig]");
      if (trig) {
        e.stopPropagation();
        const bolha = trig.closest(".chat__bolha");
        const abrir = bolha && !bolha.classList.contains("is-reacting");
        msgsEl.querySelectorAll(".chat__bolha.is-reacting").forEach((b) => b.classList.remove("is-reacting"));
        if (abrir) bolha.classList.add("is-reacting");
        return;
      }
      const emo = e.target.closest("[data-react-emoji]");
      if (emo) {
        e.stopPropagation();
        const bolha = emo.closest(".chat__bolha");
        if (bolha) { bolha.classList.remove("is-reacting"); aplicarReacao(bolha.dataset.mid, emo.dataset.reactEmoji); }
        return;
      }
      const chip = e.target.closest("[data-react-chip]");
      if (chip && chip.textContent.trim()) {
        const bolha = chip.closest(".chat__bolha");
        if (bolha) aplicarReacao(bolha.dataset.mid, null);
      }
    });

    // Toque-e-segure (long-press) abre a barra de reações no celular.
    let _lpTimer = null;
    msgsEl.addEventListener("touchstart", (e) => {
      const bolha = e.target.closest(".chat__bolha");
      if (!bolha || e.target.closest("[data-react-trig],.chat__react-bar,[data-react-chip]")) return;
      _lpTimer = setTimeout(() => {
        msgsEl.querySelectorAll(".chat__bolha.is-reacting").forEach((b) => b.classList.remove("is-reacting"));
        bolha.classList.add("is-reacting");
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
      }, 450);
    }, { passive: true });
    const cancelLP = () => { if (_lpTimer) { clearTimeout(_lpTimer); _lpTimer = null; } };
    ["touchmove", "touchend", "touchcancel"].forEach((ev) => msgsEl.addEventListener(ev, cancelLP, { passive: true }));
  }
  // Fecha qualquer barra de reação ao clicar fora (uma vez só, no document).
  if (!window._chatReactDocBound) {
    window._chatReactDocBound = true;
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-react-trig]") || e.target.closest(".chat__react-bar")) return;
      $$("#chat-msgs .chat__bolha.is-reacting").forEach((b) => b.classList.remove("is-reacting"));
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
  if (navigator.onLine === false) { toast("Sem conexão — sua mensagem não foi enviada.", "danger"); return; }

  // Limpa já (otimista na UX do input); se falhar, restaura
  input.value = "";
  autoGrowTextarea(input);
  input.focus();
  pararDigitando();

  // Eco otimista: mostra a bolha JÁ (pendente); o snapshot real a substitui
  // (pintarMensagens remove [data-temp] na próxima emissão).
  const msgsEl = $("#chat-msgs");
  if (msgsEl) {
    const tmp = document.createElement("div");
    tmp.className = "chat__bolha chat__bolha--minha chat__bolha--pendente";
    tmp.setAttribute("data-temp", "1");
    tmp.innerHTML = `<span class="chat__bolha-texto">${escapeHtml(texto)}</span>` +
      `<span class="chat__bolha-meta"><span class="chat__bolha-hora">enviando…</span></span>`;
    msgsEl.querySelector(".chat__msgs-vazio")?.remove();
    msgsEl.appendChild(tmp);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  try {
    await window.enviarMensagem(peerUid, peerNome, texto);
  } catch (err) {
    console.error(err);
    toast(err.message || "Erro ao enviar mensagem.", "danger");
    input.value = texto;
    autoGrowTextarea(input);
    $$("#chat-msgs [data-temp]").forEach((e) => e.remove());
  }
}

// Atalho usado pelo dropdown de presença: abre o WIDGET de chat já no peer escolhido.
function abrirChatCom(uid, nome) {
  if (uid === meuUid()) return; // sem auto-conversa
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

// ============================================
// Novidades / Histórico de versões
// Pill na topbar abre o modal; popup automático quando o usuário entra numa
// versão que ainda não viu. Conteúdo (CHANGELOG) carregado sob demanda.
// DISCIPLINA: a cada mudança visível, bumpe CURRENT_VERSION + entry no changelog.js.
// ============================================
window.CURRENT_VERSION = "1.10.0";

// Splash de boot: esconde a tela de abertura respeitando um tempo mínimo (pra
// a animação da logo completar) e NUNCA prende o app. Idempotente. Chamada
// pelo firebase.js (auth resolveu) e pelo modo demo; há ainda um fallback duro
// inline no <head> (8s) caso este script nem carregue.
window.hideSplash = function hideSplash() {
  var sp = document.getElementById("splash");
  if (!sp || sp.dataset.splashHiding) return;
  sp.dataset.splashHiding = "1";
  var MIN = 2900;
  var t0 = window.__splashT0 || Date.now();
  var wait = Math.max(0, MIN - (Date.now() - t0));
  setTimeout(function () {
    sp.classList.add("splash--out");
    try { document.documentElement.classList.remove("sessao-restaurando"); } catch (e) {}
    setTimeout(function () { if (sp && sp.parentNode) sp.style.display = "none"; }, 650);
  }, wait);
};
let _changelogCarregado = false;
let _changelogChecado = false;

function carregarChangelog(cb) {
  if (window.CHANGELOG || _changelogCarregado) { cb && cb(); return; }
  _changelogCarregado = true;
  const s = document.createElement("script");
  s.src = "changelog.js?v=" + (window.CURRENT_VERSION || "1");
  s.onload = () => cb && cb();
  s.onerror = () => { _changelogCarregado = false; cb && cb(); };
  document.head.appendChild(s);
}

function renderChangelog() {
  const body = document.getElementById("changelog-body");
  if (!body) return;
  const lista = window.CHANGELOG || [];
  if (!lista.length) {
    body.innerHTML = `<div class="cl-vazio">Sem novidades por enquanto.</div>`;
    return;
  }
  body.innerHTML = lista.map((ver) => `
    <div class="cl-versao">
      <div class="cl-versao__head">
        <span class="cl-versao__v">v${escapeHtml(ver.v || "")}</span>
        <span class="cl-versao__d">${escapeHtml(ver.d || "")}</span>
        ${ver.current ? `<span class="cl-badge">Atual</span>` : ""}
      </div>
      <div class="cl-itens">
        ${(ver.items || []).map((it) => `
          <div class="cl-item">
            <span class="cl-dot cl-dot--${escapeHtml(it.type || "note")}"></span>
            <span class="cl-item__title">${escapeHtml(it.title || "")}</span>
          </div>`).join("")}
      </div>
    </div>`).join("");
}

function openChangelog() {
  const ov = document.getElementById("changelog-overlay");
  if (!ov) return;
  ov.classList.add("open");
  carregarChangelog(renderChangelog);
}

function closeChangelog() {
  const ov = document.getElementById("changelog-overlay");
  if (ov) ov.classList.remove("open");
  try { localStorage.setItem("last-seen-version", window.CURRENT_VERSION); } catch (e) {}
}

// Abre sozinho ~0,6s depois quando a versão atual ainda não foi vista.
function checkChangelog() {
  let seen = null;
  try { seen = localStorage.getItem("last-seen-version"); } catch (e) {}
  if (seen !== window.CURRENT_VERSION) setTimeout(openChangelog, 600);
}

// ---------- Boot ----------

document.addEventListener("DOMContentLoaded", () => {
  renderLoginQuick();

  // Novidades: pill na topbar + modal (abre, fecha, Esc, clique fora).
  // Pills de versão (topbar no mobile + sidebar no desktop) → abrem Novidades.
  // Build = ?v= do app.js que o navegador REALMENTE carregou. Reflete a versão
  // de verdade (mata a dúvida de "tô no novo ou no cache velho?"). Derivado em
  // runtime do src do script — sem bump manual extra.
  const buildVer = (() => {
    try {
      const s = [...document.scripts].find((x) => /app\.js\?v=/.test(x.src || ""));
      const m = s && s.src.match(/[?&]v=(\d+)/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  })();
  $$(".version-pill").forEach((p) => {
    p.textContent = "v" + window.CURRENT_VERSION + (buildVer ? " · " + buildVer : "");
    p.title = "Novidades · build " + (buildVer || "?");
    p.addEventListener("click", openChangelog);
  });
  const clClose = document.getElementById("changelog-close");
  if (clClose) clClose.addEventListener("click", closeChangelog);
  const clOv = document.getElementById("changelog-overlay");
  if (clOv) clOv.addEventListener("click", (e) => { if (e.target === clOv) closeChangelog(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && clOv && clOv.classList.contains("open")) closeChangelog();
  });

  // Salvaguarda do splash "Entrando…": em modo demo (sem Firebase) não há
  // sessão pra restaurar — firebase.js não roda pra esconder. Limpa aqui.
  // (scripts deferred rodam em ordem antes do DOMContentLoaded, então a
  // classe firebase-mode já foi setada por firebase.js se a config existir.)
  if (!document.documentElement.classList.contains("firebase-mode")) {
    window.hideSplash();
  }

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
      if (navigator.onLine === false) throw new Error("offline");
      ok = await Promise.resolve(login(user, pass));
    } catch (err) {
      debug?.(err);
      const erro = $("#login-error");
      const msg = err?.message === "offline"
        ? "Sem conexão. Verifique a internet e tente de novo."
        : "Não foi possível entrar agora. Tente de novo.";
      if (erro) { erro.textContent = msg; erro.classList.remove("hidden"); }
      toast(msg, "danger");
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

  // Sidebar retrátil (desktop): recolhe/expande + persiste o estado.
  const appElRail = $("#app");
  try { if (localStorage.getItem("fiopulse:sidebarRail") === "1") appElRail?.classList.add("app--rail"); } catch {}
  $("#sidebar-toggle")?.addEventListener("click", () => {
    if (!appElRail) return;
    const recolhida = appElRail.classList.toggle("app--rail");
    try { localStorage.setItem("fiopulse:sidebarRail", recolhida ? "1" : "0"); } catch {}
  });

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

// PWA: registra o service worker + AUTO-UPDATE.
// Quando um deploy troca o sw.js, o novo SW assume (skipWaiting + clients.claim
// no sw.js) e dispara "controllerchange" → recarregamos UMA vez pra pegar o
// HTML/JS novos. Assim o usuário nunca fica preso numa versão velha.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  let recarregando = false;
  // Só auto-recarrega em ATUALIZAÇÃO. No 1º acesso o controller é null e a
  // posse inicial NÃO deve recarregar (senão vira loop no primeiro load).
  let tinhaController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!tinhaController) { tinhaController = true; return; }
    if (recarregando) return;
    recarregando = true;
    try { toast("Atualizando para a versão nova…"); } catch (e) {}
    setTimeout(() => location.reload(), 600);
  });

  navigator.serviceWorker.register("sw.js").then((reg) => {
    // Procura deploy novo ao focar a aba e a cada 30 min (pega atualização
    // feita com o app já aberto). update() busca o sw.js (no-cache); se mudou,
    // instala o novo → controllerchange acima → reload.
    const checar = () => { try { reg.update(); } catch (e) {} };
    document.addEventListener("visibilitychange", () => { if (!document.hidden) checar(); });
    setInterval(checar, 30 * 60 * 1000);
  }).catch(() => {});
}

// Banner de conexão: avisa quando a internet cai (o Firestore segue servindo
// do cache). Aparece no topo e some sozinho quando volta. Autocontido.
(function initBannerRede() {
  let banner = null;
  const atualizar = () => {
    const offline = navigator.onLine === false;
    if (offline && !banner) {
      banner = document.createElement("div");
      banner.className = "net-banner";
      banner.setAttribute("role", "status");
      banner.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/></svg><span>Sem conexão — mostrando dados em cache.</span>`;
      document.body.appendChild(banner);
      requestAnimationFrame(() => banner.classList.add("show"));
    } else if (!offline && banner) {
      banner.classList.remove("show");
      const b = banner; banner = null;
      setTimeout(() => b.remove(), 320);
    }
  };
  window.addEventListener("online", atualizar);
  window.addEventListener("offline", atualizar);
  atualizar();
})();

// Acessibilidade: linhas de lista (role="button" tabindex="0") abrem com
// Enter/Espaço, não só clique de mouse. Delegação global — vale pra qualquer
// linha renderizada depois.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const alvo = e.target;
  if (alvo && alvo.matches && alvo.matches(".occ, .func-row, .pj-row, .cfg-row--click")) {
    e.preventDefault();
    alvo.click();
  }
});
