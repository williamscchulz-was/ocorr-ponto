// ============================================
// Ocorrências do Ponto — Dados e Storage
// ============================================

const STORAGE_KEY = "ocorr-ponto:v1";
const SEED_VERSION = 2;

// --- Constantes do domínio ---

const TIPOS_OCORRENCIA = [
  { id: "atraso", label: "Atraso", tone: "warning" },
  { id: "falta", label: "Falta Injustificada", tone: "danger" },
  { id: "saida-antecipada", label: "Saída Antecipada", tone: "warning" },
  { id: "saida-intermediaria", label: "Saída Intermediária", tone: "info" },
  { id: "esqueceu-cracha", label: "Esqueceu o Crachá", tone: "neutral" },
  { id: "cartao-problema", label: "Cartão Ponto c/ Problema", tone: "info" },
  { id: "nao-entrada", label: "Não Registrou Entrada", tone: "warning" },
  { id: "nao-saida", label: "Não Registrou Saída", tone: "warning" },
  { id: "nao-lanche", label: "Não Registrou Lanche", tone: "neutral" },
  { id: "emergencia", label: "Chamada Emergência", tone: "danger" },
];

const ACOES = [
  { id: "banco-horas", label: "Banco de Horas" },
  { id: "descontar", label: "Descontar" },
  { id: "atestado", label: "Atestado Médico" },
];

const TURNOS = {
  1: { label: "1º Turno", horario: "06:00 – 14:00" },
  2: { label: "2º Turno", horario: "14:00 – 22:00" },
  3: { label: "3º Turno", horario: "22:00 – 06:00" },
};

// --- Seed: usuários do sistema ---
// NOTA: dados de demonstração. Em produção, usuários reais ficam no Firebase Auth.
// Veja docs/SETUP_FIREBASE.md para criar usuários reais.

const SEED_USERS = [
  { id: "admin", nome: "Administrador", role: "admin", senha: "admin" },
  { id: "rh1", nome: "RH Demo 01", role: "rh", senha: "rh1" },
  { id: "rh2", nome: "RH Demo 02", role: "rh", senha: "rh2" },
  { id: "lider1", nome: "Líder 1º Turno", role: "lider", turno: 1, senha: "lider1" },
  { id: "lider2", nome: "Líder 2º Turno", role: "lider", turno: 2, senha: "lider2" },
  { id: "lider3", nome: "Líder 3º Turno", role: "lider", turno: 3, senha: "lider3" },
];

// --- Seed: funcionários ---
// Nomes fictícios para demonstração.

const SEED_FUNCIONARIOS = [
  // 1º Turno
  { id: "f1", nome: "Helena Caroline Vieira", turno: 1, setor: "Produção" },
  { id: "f2", nome: "João Paulo da Silva", turno: 1, setor: "Produção" },
  { id: "f3", nome: "Maria Aparecida Santos", turno: 1, setor: "Qualidade" },
  { id: "f4", nome: "Ricardo Oliveira Cruz", turno: 1, setor: "Logística" },
  { id: "f5", nome: "Ana Beatriz Costa", turno: 1, setor: "Produção" },
  // 2º Turno
  { id: "f6", nome: "Carlos Eduardo Lima", turno: 2, setor: "Produção" },
  { id: "f7", nome: "Patrícia Mendes Rocha", turno: 2, setor: "Qualidade" },
  { id: "f8", nome: "Roberto Almeida Junior", turno: 2, setor: "Manutenção" },
  { id: "f9", nome: "Fernanda Aparecida Rocha", turno: 2, setor: "Produção" },
  { id: "f10", nome: "Lucas Pereira Borges", turno: 2, setor: "Logística" },
  // 3º Turno
  { id: "f11", nome: "Marcos Vinícius Souza", turno: 3, setor: "Produção" },
  { id: "f12", nome: "Juliana Ribeiro Mello", turno: 3, setor: "Qualidade" },
  { id: "f13", nome: "Eduardo Cardoso Lopes", turno: 3, setor: "Manutenção" },
  { id: "f14", nome: "Camila Ferreira Pinto", turno: 3, setor: "Produção" },
  { id: "f15", nome: "Thiago Barbosa Nunes", turno: 3, setor: "Logística" },
];

// --- Seed: ocorrências de exemplo ---

function seedOcorrencias() {
  const today = new Date();
  const d = (offset) => {
    const x = new Date(today);
    x.setDate(x.getDate() - offset);
    return x.toISOString().slice(0, 10);
  };

  return [
    {
      id: "o1",
      data: d(0),
      funcionarioId: "f1",
      tipo: "atraso",
      horario: "07:45",
      acao: null,
      dataConferencia: null,
      observacao: "Trânsito intenso na BR-101.",
      historico: [
        { por: "rh1", em: nowIso(), acao: "Criou ocorrência" },
      ],
      criadoPor: "rh1",
      criadoEm: nowIso(),
    },
    {
      id: "o2",
      data: d(1),
      funcionarioId: "f3",
      tipo: "esqueceu-cracha",
      horario: "06:02",
      acao: null,
      dataConferencia: null,
      observacao: "",
      historico: [{ por: "rh1", em: nowIso(-1), acao: "Criou ocorrência" }],
      criadoPor: "rh1",
      criadoEm: nowIso(-1),
    },
    {
      id: "o3",
      data: d(2),
      funcionarioId: "f7",
      tipo: "saida-antecipada",
      horario: "21:30",
      acao: "banco-horas",
      dataConferencia: d(1),
      observacao: "Consulta médica agendada — confirmado pelo líder.",
      historico: [
        { por: "rh2", em: nowIso(-2), acao: "Criou ocorrência" },
        { por: "lider2", em: nowIso(-1), acao: "Conferiu (Banco de Horas)" },
      ],
      criadoPor: "rh2",
      criadoEm: nowIso(-2),
    },
    {
      id: "o4",
      data: d(1),
      funcionarioId: "f11",
      tipo: "nao-entrada",
      horario: "22:00",
      acao: null,
      dataConferencia: null,
      observacao: "",
      historico: [{ por: "rh2", em: nowIso(-1), acao: "Criou ocorrência" }],
      criadoPor: "rh2",
      criadoEm: nowIso(-1),
    },
    {
      id: "o5",
      data: d(3),
      funcionarioId: "f6",
      tipo: "falta",
      horario: "14:00",
      acao: "descontar",
      dataConferencia: d(2),
      observacao: "Sem aviso prévio.",
      historico: [
        { por: "rh1", em: nowIso(-3), acao: "Criou ocorrência" },
        { por: "lider2", em: nowIso(-2), acao: "Conferiu (Descontar)" },
      ],
      criadoPor: "rh1",
      criadoEm: nowIso(-3),
    },
    {
      id: "o6",
      data: d(0),
      funcionarioId: "f12",
      tipo: "cartao-problema",
      horario: "22:15",
      acao: null,
      dataConferencia: null,
      observacao: "Leitor biométrico fora do ar.",
      historico: [{ por: "rh1", em: nowIso(), acao: "Criou ocorrência" }],
      criadoPor: "rh1",
      criadoEm: nowIso(),
    },
    {
      id: "o7",
      data: d(4),
      funcionarioId: "f4",
      tipo: "saida-intermediaria",
      horario: "10:30",
      acao: "atestado",
      dataConferencia: d(3),
      observacao: "Atestado de 4 horas anexado.",
      historico: [
        { por: "rh2", em: nowIso(-4), acao: "Criou ocorrência" },
        { por: "lider1", em: nowIso(-3), acao: "Conferiu (Atestado Médico)" },
      ],
      criadoPor: "rh2",
      criadoEm: nowIso(-4),
    },
    {
      id: "o8",
      data: d(1),
      funcionarioId: "f9",
      tipo: "nao-lanche",
      horario: "18:00",
      acao: null,
      dataConferencia: null,
      observacao: "",
      historico: [{ por: "rh1", em: nowIso(-1), acao: "Criou ocorrência" }],
      criadoPor: "rh1",
      criadoEm: nowIso(-1),
    },
  ];
}

function nowIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

// --- Storage helpers ---

const store = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  reset() {
    const seed = {
      seedVersion: SEED_VERSION,
      users: SEED_USERS,
      funcionarios: SEED_FUNCIONARIOS,
      ocorrencias: seedOcorrencias(),
      currentUserId: null,
    };
    this.save(seed);
    return seed;
  },

  init() {
    const existing = this.load();
    if (existing && existing.seedVersion === SEED_VERSION) {
      return existing;
    }
    return this.reset();
  },
};
