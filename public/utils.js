// ============================================================
// utils.js — helpers PUROS do FioPulse (Fase 1 do refactor do app.js).
// Só entrada → saída: sem `state`, sem Firestore, sem render.
// Carregado ANTES dos demais scripts (escopo global compartilhado,
// sem build step) — tudo aqui é visível pra app.js/firebase.js.
// Regra: nenhuma regra de negócio entra neste arquivo.
// ============================================================

// ---------- DOM ----------
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

// ---------- Feedback de clique + trava de re-clique ----------
// withBusy(chave, el, fn): roda fn UMA vez por chave enquanto ela estiver "em voo".
// A trava é por CHAVE string (não pelo nó, que some no re-render): um 2º clique com a
// mesma chave só re-aplica o spinner e retorna, NUNCA dispara fn de novo. Mata o
// duplo-clique que duplicava registro e dá feedback imediato no botão. O visual
// (.is-busy) é best-effort no nó clicado; sobrevive a re-render porque é CSS puro.
// toast/renderApp resolvem em runtime (definidos no app.js, mesmo escopo global).
const _emVoo = new Set();
async function withBusy(chave, el, fn) {
  if (_emVoo.has(chave)) { _busyOn(el); return; }
  _emVoo.add(chave); _busyOn(el);
  try { return await fn(); }
  catch (e) { toast("Não deu certo: " + (e?.message || e), "danger"); }
  finally { _emVoo.delete(chave); _busyOff(el); }
}
function _busyOn(el)  { if (el && el.isConnected) { el.classList.add("is-busy"); el.setAttribute("aria-busy", "true"); if ("disabled" in el) el.disabled = true; } }
function _busyOff(el) { if (el && el.isConnected) { el.classList.remove("is-busy"); el.removeAttribute("aria-busy"); if ("disabled" in el) el.disabled = false; } }

// ---------- Log ----------
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

// ---------- Constantes compartilhadas ----------
// Versão do Termo de adesão à assinatura eletrônica (1º acesso do colaborador).
// Vive aqui porque utils.js carrega ANTES de app.js e firebase.js: o app compara
// (state.termoAdesaoOk = doc.versao === TERMO_VERSAO) e o firebase grava esse valor.
// Ao republicar o termo (texto novo), bumpar aqui força o gate a reaparecer.
const TERMO_VERSAO = "2026-07-v1";
// SHA-256 do texto canonico congelado (docs/termo-adesao-2026-07-v1.txt, LF). CRAVADO na
// regra Firestore: o aceite so vale se hashSha256 == este valor. Ancora QUAL texto foi aceito.
const TERMO_HASH = "931a476238918cb6e771e30238b307403606b224b1b32745ce21f6197e16c805";

// ---------- Segurança / validação ----------
// Escapa HTML pra evitar XSS quando interpolando dados de usuário em
// innerHTML. Aplicar em: nomes, observações, CNPJs, razão social,
// emails, descrições e qualquer texto vindo de input/Firestore.
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Valida que uma URL é http(s):// — usar antes de salvar/renderizar pra rejeitar
// javascript:/data:text que viraria XSS via href. EXCEÇÃO: data:image/ e
// data:application/pdf são seguras num <img>/<iframe> de PDF (não executam
// script) — usadas nas imagens base64 dos comunicados e nos anexos dos documentos.
const ehUrlSegura = (url) => {
  if (!url || !url.trim()) return true; // vazio é OK (campo opcional)
  if (/^data:(image\/|application\/pdf)/i.test(url.trim())) return true; // imagem/PDF base64 (não executa script)
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch { return false; }
};

// Valida CNPJ via dígitos verificadores. Aceita string com ou sem máscara.
// Retorna true se válido OU se vazio (campo opcional). False se inválido.
const ehCPFValido = (raw) => {
  const cpf = String(raw).replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
};

// Aceita CNPJ (14) OU CPF (11) — prestador PJ ou PF/MEI. Vazio = OK (opcional).
const ehCNPJValido = (raw) => {
  if (!raw || !String(raw).trim()) return true; // vazio = OK (opcional)
  const cnpj = String(raw).replace(/\D/g, "");
  if (cnpj.length === 11) return ehCPFValido(cnpj); // CPF de prestador PF/MEI
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

// ---------- Datas / formatação ----------
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
// Aceita string ISO, Timestamp (.toDate()/{seconds}), Date ou ms. Nunca lança; inválido → null.
function tsParaData(ts) {
  if (!ts) return null;
  let d = null;
  if (typeof ts === "string") {
    // "yyyy-mm-dd" é data civil: monta com componentes locais pra não voltar um dia
    // por fuso (new Date("2021-03-10") vira UTC meia-noite e recua no fuso do Brasil).
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ts.trim());
    d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(ts);
  }
  else if (typeof ts === "number") d = new Date(ts);
  else if (ts.toDate) d = ts.toDate();
  else if (ts.seconds) d = new Date(ts.seconds * 1000);
  else if (ts instanceof Date) d = ts;
  return d && !isNaN(d.getTime()) ? d : null;
}
function tsToDateStr(ts) {
  const d = tsParaData(ts);
  if (!d) return null;
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
    // Sem nenhuma data ainda: quem exibe deve usar `full` (sem o "Atualizado —" solto).
    return { value: "—", hint: "aguardando 1ª sincronização", empty: true, full: "Aguardando a primeira sincronização do ponto." };
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

// Saldo do banco de horas: minutos (com sinal) → "+12h30" / "-4h05" / "0h00".
function formatSaldoHoras(minutos) {
  if (minutos == null) return "—";
  const sinal = minutos < 0 ? "-" : (minutos > 0 ? "+" : "");
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${h}h${m.toString().padStart(2, "0")}`;
}

function formatMoeda(valor) {
  if (valor == null) return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Hora curta (HH:MM) a partir de ISO. "" se inválido (msg otimista sem ts).
function formatHoraCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}


// Valida foto base64 (data:image...) antes de injetar em background-image:url().
// Bloqueia CSS-injection/XSS por foto adulterada vinda do Firestore. "" se inválida.
const fotoSegura = (foto) => (typeof foto === "string"
  && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(foto)) ? foto : "";


// ---------- Texto ----------
const initials = (nome) => {
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
};

function slugify(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------- Ícones ----------
// SVG icons (inline for offline)
const icon = (name) => {
  const icons = {
    pulso: '<path d="M3 12h4l2 5 4-12 2 7h6"/>',
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
    briefcase: '<rect x="2.5" y="7" width="19" height="13.5" rx="2.2"/><path d="M8 7V5.2A2.2 2.2 0 0 1 10.2 3h3.6A2.2 2.2 0 0 1 16 5.2V7"/><path d="M2.5 12.5h19"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2.2"/><path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4"/><path d="M9 10h6M9 14h6M9 18h4"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    megafone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a3.5 3.5 0 0 1 0 6"/><path d="M19 6.5a7 7 0 0 1 0 11"/>',
    pin: '<path d="M9 4h6l-1 6 3.5 2.5V15H6.5v-2.5L10 10z"/><line x1="12" y1="15" x2="12" y2="21"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    conferir: '<rect x="5" y="4" width="14" height="17" rx="2.2"/><path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4"/><path d="M8.5 13l2.2 2.2L15.5 10"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
    feather: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    star: '<path d="M11.48 3.5l2.34 4.74 5.23.76-3.78 3.69.89 5.2-4.68-2.46-4.68 2.46.89-5.2L4.95 9l5.23-.76z"/>',
    trofeu: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21 1.18.54 2.03 2.03 2.03 3.79M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ""}</svg>`;
};
