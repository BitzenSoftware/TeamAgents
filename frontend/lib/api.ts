// Cliente de API tipado para o backend FastAPI do TeamAgents.
import { supabase } from "@/lib/supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Email do superadmin (vê o menu Planos). O backend valida de verdade.
export const SUPERADMIN_EMAIL = "bitzensoftware@bitzen.app";

export type StatusQualificacao =
  | "FRIO"
  | "EM_ANDAMENTO"
  | "QUALIFICADO"
  | "DESQUALIFICADO";

export type Cliente = {
  id: string;
  nome: string;
  created_at: string;
  // Multi-usuário: papel do usuário logado nesta empresa + escopo (para membros).
  papel?: "owner" | "membro";
  permissoes?: string[] | null;      // hrefs de menu permitidos (membro)
  departamento_ids?: string[] | null;
};

export type Membro = {
  id: string;
  email: string;
  nome: string;
  papel: string;
  permissoes: string[];
  departamento_ids: string[];
  avatar_url: string | null;
  auth_user_id: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  cliente_id: string;
  campanha_id: string;
  nome: string | null;
  whatsapp: string;
  status_qualificacao: StatusQualificacao;
  nicho_operacao: string | null;
  maior_gargalo: string | null;
  tomador_decisao: boolean | null;
  reuniao_agendada: boolean;
  transferido_humano: boolean;
  created_at: string;
};

export type Conversa = {
  autor: "LEAD" | "AGENTE" | "SISTEMA";
  agente: string | null;
  mensagem: string;
  created_at: string;
};

export type Campanha = {
  id: string;
  nome_campanha: string;
  nicho: string;
  anuncio_dor: string;
  anuncio_beneficio: string;
  gatilho_principal: string;
  dor_alvo: string;
  desejo_alvo: string;
  palavra_chave_gatilho: string;
  servico_ids?: string[];
  created_at: string;
};

export type Relatorio = {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  leads_totais: number;
  leads_respondidos: number;
  reunioes_agendadas: number;
  investimento_anuncios: number;
  taxa_conversao_lead_agendamento: number | null;
  custo_por_agendamento: number | null;
  relatorio_whatsapp: string | null;
  created_at: string;
};

export type Consumo = {
  usados: number;
  total: number | null;
  restantes: number | null;
  percent: number;
  creditos_avulsos?: number;
  disponivel_total?: number | null;
  ilimitado?: boolean;
  plano_id?: string | null;
  plano_nome?: string | null;
  sem_plano?: boolean;
  pagamento_em_falha?: boolean;
  tem_assinatura?: boolean;
  assinatura_cancela_em?: string | null;
};

// Base pública da API (usada também pela landing, sem auth).
export const API_BASE = BASE;

export type PlanoAtivo = {
  id: string;
  nome: string;
  creditos_mensais: number;
  preco: number;
  stripe_price_id: string | null;
  ordem: number;
  moeda?: string;
};

export type Empresa = {
  id: string;
  nome: string | null;
  email: string;
  ilimitado?: boolean;
  plano_nome: string | null;
  creditos_mensais: number | null;
  preco: number;
  creditos_avulsos: number;
  tem_assinatura: boolean;
  assinatura_cancela_em: string | null;
  consumo_mes: number;
  created_at: string | null;
};

export type EmpresaConsumo = {
  id: string;
  nome: string | null;
  plano_nome: string | null;
  creditos_mensais: number | null;
  total: number;
  campanhas: number;
  sdr: number;
  bi: number;
  executivo: number;
  outro: number;
};

export type AdminDashboard = {
  consumo_series: { bucket: string; total: number }[];
  faturamento_series: { bucket: string; total: number }[];
  crescimento_series: { bucket: string; total: number }[];
  custo_series: { bucket: string; total: number }[];
  consumo_total: number;
  faturamento_total: number;
  faturamento_por_tipo: Record<string, number>;
  custo_usd_total: number;
  custo_brl_total: number;
  margem_brl: number;
  margem_pct: number;
  total_empresas: number;
  empresas_ativas: number;
  mrr: number;
};

export type Pacote = {
  id: string;
  nome: string;
  creditos: number;
  preco: number;
  stripe_price_id: string | null;
  stripe_product_id?: string | null;
  ativo: boolean;
  ordem: number;
  moeda?: string;
};

export type PacoteAtivo = {
  id: string;
  nome: string;
  creditos: number;
  preco: number;
  stripe_price_id: string | null;
  ordem: number;
  moeda?: string;
};

export type ConsumoDashboard = {
  total: number;
  por_origem: Record<string, number>;
  series: { bucket: string; total: number }[];
};

export type CampanhaInput = {
  nicho: string;
  dor_latente: string;
  nome_cliente: string;
  nome_campanha: string;
  link_calendario?: string;
  habilidade_ids?: string[];
  servico_ids?: string[];
};

export type OnboardingInput = {
  nome_empresa: string;
  whatsapp_instance_name: string;
  whatsapp_token: string;
  whatsapp_api_url?: string;
  calendario_link: string;
  whatsapp_dono: string;
};

export type Config = {
  id: string;
  cliente_id: string;
  whatsapp_instance_name: string;
  whatsapp_token: string;
  whatsapp_api_url: string | null;
  whatsapp_numero: string | null;
  calcom_api_key: string | null;
  calcom_event_type_id: number | null;
  calendario_link: string;
  whatsapp_dono: string | null;
  limite_mensal_leads: number;
};

export type SuporteMensagem = {
  id: string;
  cliente_id: string;
  autor: "cliente" | "admin";
  mensagem: string;
  lida: boolean;
  created_at: string;
};

export type SuporteThread = {
  cliente_id: string;
  nome: string | null;
  email: string | null;
  ultima: string;
  ultima_em: string;
  nao_lidas: number;
};

export type BlogPost = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string | null;
  meta_description: string | null;
  conteudo: string;
  capa_url: string | null;
  publicado: boolean;
  created_at: string;
  updated_at: string;
};

export type BlogPostResumo = Pick<BlogPost, "slug" | "titulo" | "resumo" | "capa_url" | "created_at">;

// --- Diretoria Growth (menu privado do superadmin) ---
export type GrowthAgente =
  | "growth-ceo"
  | "growth-marketing"
  | "growth-comercial"
  | "growth-projetos"
  | "growth-ghostwriter";

export type GrowthMensagem = { role: "user" | "assistant"; content: string };

export type GrowthEntregavel = {
  diretor: string;
  diretor_nome: string;
  foco: string;
  conteudo: string;
};

export type GrowthBriefing = {
  leitura_estrategica: string;
  entregaveis: GrowthEntregavel[];
  briefing: string;
};

// Etapas separadas (fluxo de trabalho ao vivo na Sala de Comando).
export type GrowthDiretiva = { diretor: string; diretor_nome: string; foco: string };
export type GrowthPlano = { leitura_estrategica: string; diretivas: GrowthDiretiva[] };

// Planejamento salvo (histórico da Sala de Comando).
export type GrowthBriefingSalvo = {
  id: string;
  objetivo: string;
  leitura_estrategica: string;
  entregaveis: GrowthEntregavel[];
  briefing: string;
  conversa: GrowthMensagem[];
  created_at: string;
};

export type GrowthPostStatus = "rascunho" | "aprovado" | "agendado" | "publicado";

export type GrowthPost = {
  id: string;
  cliente_id: string;
  titulo: string;
  conteudo: string;
  status: GrowthPostStatus;
  agendado_para: string | null;
  origem: string | null;
  created_at: string;
  updated_at: string;
};

export type GrowthConfig = {
  cliente_id: string;
  modo_aprovacao: "manual" | "auto";
  linkedin_conectado: boolean;
  linkedin_perfil: string | null;
};

// --- Gestão (Empresa › Departamentos › Projetos) ---
export type GestaoAgentes = { ativos: string[]; disponiveis: string[] };
export type Departamento = { id: string; nome: string; created_at: string; agente_ids: string[] };
export type Projeto = {
  id: string;
  departamento_id: string;
  nome: string;
  descricao: string;
  briefing: string;
  status: "ativo" | "arquivado";
  agente_ids: string[];
  created_at: string;
  updated_at: string;
};
export type ProjetoDocumento = { id: string; nome: string; conteudo: string; created_at: string };
export type ProjetoRelatorio = { id: string; titulo: string; conteudo: string; agente_id: string | null; created_at: string; updated_at: string };

// --- Fluxos multi-agente (Organograma Vivo) ---
export type PapelAgente = "gerente" | "executor" | "revisor";
export type Playbook = { id: string; nome: string; descricao: string; agente_ids: string[] };
export type FluxoEtapa = {
  id: string;
  ordem: number;
  agente_id: string;
  tarefa: string;
  status: "pendente" | "rodando" | "revisao" | "refazendo" | "concluida" | "erro";
  resultado: string;
  revisao: string;
  updated_at: string;
};
export type FluxoExecucao = {
  id: string;
  projeto_id: string;
  titulo: string;
  comando: string;
  playbook: string | null;
  status: "planejando" | "rodando" | "concluida" | "erro" | "sem_creditos";
  resumo: string;
  erro: string;
  creditos: number;
  custo_usd: number;
  created_at: string;
  updated_at: string;
  etapas?: FluxoEtapa[];
};

// --- Profissionais, Serviços e Agenda ---
export type Servico = {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number | null;
  ativo: boolean;
  created_at: string;
};

export type Escala = {
  id?: string;
  dia_semana: number; // 0=domingo .. 6=sábado
  hora_inicio: string; // "HH:MM"
  hora_fim: string;
  intervalo_min: number;
  almoco_inicio: string | null;
  almoco_fim: string | null;
};

export type Profissional = {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  servico_ids: string[];
  escalas: Escala[];
};

export type Ausencia = {
  id: string;
  tipo: "dia_todo" | "horas";
  data_inicio: string;
  data_fim: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo: string | null;
  created_at: string;
};

export type AgendamentoStatus = "confirmado" | "cancelado" | "realizado" | "no_show";

export type Agendamento = {
  id: string;
  profissional_id: string;
  servico_id: string | null;
  lead_id: string | null;
  inicio: string;
  fim: string;
  status: AgendamentoStatus;
  origem: "manual" | "agente";
  cliente_nome: string | null;
  contato: string | null;
  observacao: string | null;
  created_at: string;
};

export type Slot = {
  inicio_iso: string;
  fim_iso: string;
  rotulo: string;
  profissional_id: string;
  profissional_nome: string;
};

export type AgendamentoConfig = {
  cliente_id: string;
  fluxo_ordem: string[];
  perguntar_profissional: boolean;
  permitir_qualquer: boolean;
  perguntar_nome: boolean;
  profissional_padrao_id: string | null;
  dias_futuros: number;
};

export type Plano = {
  id: string;
  nome: string;
  creditos_mensais: number;
  preco: number;
  stripe_price_id: string | null;
  stripe_product_id?: string | null;
  ativo: boolean;
  ordem: number;
  moeda?: string; // 'brl' | 'usd' — moeda do preço na Stripe
};

export type AgenteSkill =
  | "global" | "copywriting" | "sdr" | "bi" | "assistente"
  | "financeiro" | "juridico" | "suporte" | "produto"
  | "rh" | "auditoria" | "projetos" | "estrategia" | "crescimento" | "operacoes";

export type Habilidade = {
  id: string;
  cliente_id: string;
  titulo: string;
  conteudo: string;
  ativo: boolean;
  agente: AgenteSkill;
  created_at: string;
};

// --- Agente Executivo (Email & Atas) ---
export type AcaoItem = {
  descricao: string;
  responsavel: string | null;
  prazo: string | null;
};

export type ItemProcessado = {
  tipo: "email" | "ata";
  titulo: string;
  resumo: string;
  prioridade: "alta" | "media" | "baixa";
  acoes: AcaoItem[];
  decisoes: string[];
};

export type SinteseExecutiva = {
  resumo_geral: string;
  prioridades: string[];
  acoes_consolidadas: AcaoItem[];
  decisoes_consolidadas: string[];
};

export type Processamento = {
  id: string;
  cliente_id: string;
  tarefa_id: string | null;
  titulo: string;
  entrada: string;
  sintese: SinteseExecutiva;
  itens: ItemProcessado[];
  n_itens: number;
  n_falhas: number;
  created_at: string;
};

// --- Fase 2: contas de email (OAuth) ---
export type EmailAccount = {
  provider: "gmail" | "outlook";
  email: string;
  last_sync: string | null;
  created_at: string;
};

export type EmailSyncResult = {
  processamentos: Processamento[];
  n_emails: number;
  sem_tarefas?: boolean;
};

// --- Tarefas dirigidas do Agente Executivo ---
export type TarefaExecutivo = {
  id: string;
  cliente_id: string;
  nome: string;
  remetente: string | null;
  palavras_chave: string | null;
  janela_dias: number;
  frequencia: Frequencia;
  automatica: boolean;
  dia_semana: number | null;
  dia_mes: number | null;
  hora: number;
  fuso: string;
  ativo: boolean;
  instrucoes: string | null;
  habilidade_ids: string[];
  last_run: string | null;
  created_at: string;
};

export type Frequencia = "diaria" | "semanal" | "quinzenal" | "mensal" | "trimestral" | "semestral";

export type TarefaInput = {
  nome: string;
  remetente?: string;
  palavras_chave?: string;
  janela_dias?: number;
  frequencia?: Frequencia;
  automatica?: boolean;
  dia_semana?: number | null;
  dia_mes?: number | null;
  hora?: number;
  fuso?: string;
  ativo?: boolean;
  instrucoes?: string;
  habilidade_ids?: string[];
};

export type SocialConfig = {
  id: string;
  cliente_id: string;
  discord_webhook_url: string | null;
  facebook_page_id: string | null;
  facebook_page_access_token: string | null;
  instagram_business_account_id: string | null;
};

export type SocialConfigUpdate = Partial<{
  discord_webhook_url: string;
  facebook_page_id: string;
  facebook_page_access_token: string;
  instagram_business_account_id: string;
}>;

export type ConfigUpdate = Partial<{
  whatsapp_instance_name: string;
  whatsapp_token: string;
  whatsapp_api_url: string;
  whatsapp_numero: string;
  calcom_api_key: string;
  calcom_event_type_id: number;
  calendario_link: string;
  whatsapp_dono: string;
  limite_mensal_leads: number;
}>;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Delays entre tentativas (~53s) — cobre o cold-start do plano free do Render.
const RETRY_DELAYS = [3000, 5000, 8000, 10000, 12000, 15000];

// Converte o `detail` do erro (string | array de validação FastAPI | objeto) em texto legível.
function msgDoDetalhe(d: unknown): string | undefined {
  if (d == null) return undefined;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    const partes = d.map((e) => {
      if (e && typeof e === "object" && "msg" in e) {
        const loc = Array.isArray((e as { loc?: unknown[] }).loc) ? ` (${((e as { loc: unknown[] }).loc).join(".")})` : "";
        return `${(e as { msg: string }).msg}${loc}`;
      }
      return typeof e === "string" ? e : JSON.stringify(e);
    });
    return partes.join("; ");
  }
  if (typeof d === "object") {
    const o = d as { msg?: string; detail?: string };
    return o.msg ?? o.detail ?? JSON.stringify(d);
  }
  return String(d);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const opts: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    ...init,
  };

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, opts);
    } catch (e) {
      // Erro de rede (inclui o servidor a acordar) — tenta de novo.
      if (attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      throw new ApiError(0, "Não foi possível ligar ao servidor. Tente novamente em instantes.");
    }

    // 502/503/504 acontecem enquanto o backend free arranca — tenta de novo.
    if ([502, 503, 504].includes(res.status) && attempt < RETRY_DELAYS.length) {
      await sleep(RETRY_DELAYS[attempt]);
      continue;
    }

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = msgDoDetalhe(body.detail) ?? detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, detail);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

export const api = {
  me: () => req<Cliente>("/me"),
  campanhas: () => req<Campanha[]>("/me/campanhas"),
  consumo: () => req<Consumo>("/me/consumo"),
  consumoDashboard: (de: string, ate: string, gran: "dia" | "semana" | "mes" | "ano") =>
    req<ConsumoDashboard>(`/me/consumo/dashboard?de=${de}&ate=${ate}&gran=${gran}`),
  leads: () => req<Lead[]>("/me/leads"),
  conversas: (leadId: string) => req<Conversa[]>(`/me/leads/${leadId}/conversas`),
  reativarIaLead: (leadId: string) =>
    req<{ ok: boolean }>(`/me/leads/${leadId}/reativar-ia`, { method: "POST" }),
  verificarCalcom: () =>
    req<{ ok: boolean; erro?: string }>("/me/calcom/verificar", { method: "POST" }),

  // --- Suporte (chat cliente <-> admin) ---
  suporte: () => req<SuporteMensagem[]>("/me/suporte"),
  enviarSuporte: (mensagem: string) =>
    req<SuporteMensagem>("/me/suporte", { method: "POST", body: JSON.stringify({ mensagem }) }),
  suporteNaoLidas: () => req<{ n: number }>("/me/suporte/nao-lidas"),
  adminSuporteThreads: () => req<SuporteThread[]>("/admin/suporte"),
  adminSuporteMensagens: (clienteId: string) => req<SuporteMensagem[]>(`/admin/suporte/${clienteId}`),
  adminResponderSuporte: (clienteId: string, mensagem: string) =>
    req<SuporteMensagem>(`/admin/suporte/${clienteId}`, { method: "POST", body: JSON.stringify({ mensagem }) }),

  // --- Blog (CMS do superadmin) ---
  adminBlogListar: () => req<BlogPost[]>("/admin/blog"),
  adminBlogCriar: (body: Partial<BlogPost>) =>
    req<BlogPost>("/admin/blog", { method: "POST", body: JSON.stringify(body) }),
  adminBlogAtualizar: (id: string, body: Partial<BlogPost>) =>
    req<BlogPost>(`/admin/blog/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminBlogApagar: (id: string) =>
    req<void>(`/admin/blog/${id}`, { method: "DELETE" }),

  // --- Diretoria Growth (menu privado do superadmin) ---
  growthConfig: () => req<GrowthConfig>("/growth/config"),
  growthSetConfig: (body: Partial<Pick<GrowthConfig, "modo_aprovacao">>) =>
    req<GrowthConfig>("/growth/config", { method: "PATCH", body: JSON.stringify(body) }),
  growthComando: (objetivo: string) =>
    req<GrowthBriefing>("/growth/comando", { method: "POST", body: JSON.stringify({ objetivo }) }),
  // Etapas separadas — encadeadas pela UI para mostrar o fluxo ao vivo.
  growthPlano: (objetivo: string) =>
    req<GrowthPlano>("/growth/plano", { method: "POST", body: JSON.stringify({ objetivo }) }),
  growthDiretor: (diretor: string, foco: string, objetivo: string) =>
    req<{ conteudo: string }>("/growth/diretor", { method: "POST", body: JSON.stringify({ diretor, foco, objetivo }) }),
  growthSintese: (objetivo: string, entregaveis: { diretor_nome: string; conteudo: string }[]) =>
    req<{ briefing: string }>("/growth/sintese", { method: "POST", body: JSON.stringify({ objetivo, entregaveis }) }),
  // Planejamentos salvos (histórico)
  growthBriefings: () => req<GrowthBriefingSalvo[]>("/growth/briefings"),
  growthSalvarBriefing: (body: Omit<GrowthBriefingSalvo, "id" | "created_at" | "conversa">) =>
    req<GrowthBriefingSalvo>("/growth/briefings", { method: "POST", body: JSON.stringify(body) }),
  growthApagarBriefing: (id: string) =>
    req<void>(`/growth/briefings/${id}`, { method: "DELETE" }),
  growthRefinarBriefing: (id: string, mensagem: string) =>
    req<GrowthBriefingSalvo>(`/growth/briefings/${id}/refinar`, { method: "POST", body: JSON.stringify({ mensagem }) }),

  // --- Utilizadores (membros da empresa) — só o dono ---
  membros: () => req<Membro[]>("/me/membros"),
  criarMembro: (body: { nome: string; email: string; permissoes: string[]; departamento_ids: string[] }) =>
    req<Membro>("/me/membros", { method: "POST", body: JSON.stringify(body) }),
  atualizarMembro: (id: string, body: { nome?: string; permissoes?: string[]; departamento_ids?: string[]; avatar_url?: string | null }) =>
    req<Membro>(`/me/membros/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarMembro: (id: string) => req<void>(`/me/membros/${id}`, { method: "DELETE" }),
  reenviarConvite: (id: string) => req<{ ok: boolean }>(`/me/membros/${id}/reenviar-convite`, { method: "POST" }),

  // --- Assistentes do cliente (chat, multipart com anexos opcionais) ---
  assistenteChat: async (agente: string, mensagens: GrowthMensagem[], habilidadeIds?: string[], arquivos?: File[]) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const fd = new FormData();
    fd.append("agente", agente);
    fd.append("mensagens", JSON.stringify(mensagens));
    if (habilidadeIds) fd.append("habilidade_ids", JSON.stringify(habilidadeIds));
    for (const f of arquivos ?? []) fd.append("arquivos", f);
    const res = await fetch(`${BASE}/me/assistentes/chat`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
      cache: "no-store",
    });
    if (!res.ok) {
      let detail = res.statusText;
      try { const b = await res.json(); detail = msgDoDetalhe(b.detail) ?? detail; } catch { /* ignore */ }
      throw new ApiError(res.status, detail);
    }
    return res.json() as Promise<{ resposta: string }>;
  },

  // --- Gestão ---
  gestaoAgentes: () => req<GestaoAgentes>("/me/gestao/agentes"),
  gestaoSetAgentes: (agente_ids: string[]) =>
    req<{ ativos: string[] }>("/me/gestao/agentes", { method: "PUT", body: JSON.stringify({ agente_ids }) }),
  departamentos: () => req<Departamento[]>("/me/gestao/departamentos"),
  criarDepartamento: (nome: string, agente_ids: string[]) =>
    req<Departamento>("/me/gestao/departamentos", { method: "POST", body: JSON.stringify({ nome, agente_ids }) }),
  atualizarDepartamento: (id: string, body: { nome?: string; agente_ids?: string[] }) =>
    req<Departamento>(`/me/gestao/departamentos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarDepartamento: (id: string) => req<void>(`/me/gestao/departamentos/${id}`, { method: "DELETE" }),
  projetos: (depId: string) => req<Projeto[]>(`/me/gestao/departamentos/${depId}/projetos`),
  projeto: (id: string) => req<Projeto>(`/me/gestao/projetos/${id}`),
  criarProjeto: (body: { departamento_id: string; nome: string; descricao?: string; briefing?: string; agente_ids?: string[] }) =>
    req<Projeto>("/me/gestao/projetos", { method: "POST", body: JSON.stringify(body) }),
  atualizarProjeto: (id: string, body: { nome?: string; descricao?: string; briefing?: string; status?: string; agente_ids?: string[] }) =>
    req<Projeto>(`/me/gestao/projetos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarProjeto: (id: string) => req<void>(`/me/gestao/projetos/${id}`, { method: "DELETE" }),
  // Documentos do projeto (contexto compartilhado)
  projetoDocumentos: (projId: string) => req<ProjetoDocumento[]>(`/me/gestao/projetos/${projId}/documentos`),
  projetoApagarDocumento: (projId: string, docId: string) =>
    req<void>(`/me/gestao/projetos/${projId}/documentos/${docId}`, { method: "DELETE" }),
  projetoUploadDocumentos: async (projId: string, arquivos: File[]) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const fd = new FormData();
    for (const f of arquivos) fd.append("arquivos", f);
    const res = await fetch(`${BASE}/me/gestao/projetos/${projId}/documentos`, {
      method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd, cache: "no-store",
    });
    if (!res.ok) {
      let detail = res.statusText;
      try { const b = await res.json(); detail = msgDoDetalhe(b.detail) ?? detail; } catch { /* ignore */ }
      throw new ApiError(res.status, detail);
    }
    return res.json() as Promise<ProjetoDocumento[]>;
  },
  // Chat persistido por agente dentro do projeto
  projetoMensagens: (projId: string, agente: string) =>
    req<GrowthMensagem[]>(`/me/gestao/projetos/${projId}/mensagens?agente=${encodeURIComponent(agente)}`),
  projetoChat: (projId: string, agente: string, mensagem: string) =>
    req<{ resposta: string }>(`/me/gestao/projetos/${projId}/chat`, { method: "POST", body: JSON.stringify({ agente, mensagem }) }),
  // Relatórios / planos de ação do projeto
  projetoRelatorios: (projId: string) => req<ProjetoRelatorio[]>(`/me/gestao/projetos/${projId}/relatorios`),
  projetoRelatorioAdd: (projId: string, body: { titulo: string; conteudo: string; agente_id?: string }) =>
    req<ProjetoRelatorio>(`/me/gestao/projetos/${projId}/relatorios`, { method: "POST", body: JSON.stringify(body) }),
  projetoRelatorioAtualizar: (projId: string, relId: string, body: { titulo?: string; conteudo?: string }) =>
    req<ProjetoRelatorio>(`/me/gestao/projetos/${projId}/relatorios/${relId}`, { method: "PATCH", body: JSON.stringify(body) }),
  projetoApagarRelatorio: (projId: string, relId: string) =>
    req<void>(`/me/gestao/projetos/${projId}/relatorios/${relId}`, { method: "DELETE" }),
  // Fluxos multi-agente (Organograma Vivo)
  playbooks: () => req<Playbook[]>("/me/gestao/playbooks"),
  projetoPapeis: (projId: string) =>
    req<{ papeis: Record<string, PapelAgente>; revisao_ativa: boolean }>(`/me/gestao/projetos/${projId}/papeis`),
  projetoSetPapeis: (projId: string, papeis: Record<string, PapelAgente>, revisao_ativa?: boolean) =>
    req<{ papeis: Record<string, PapelAgente>; revisao_ativa: boolean }>(
      `/me/gestao/projetos/${projId}/papeis`, { method: "PUT", body: JSON.stringify({ papeis, revisao_ativa }) }),
  fluxoIniciar: (projId: string, body: { playbook?: string; comando?: string }) =>
    req<FluxoExecucao>(`/me/gestao/projetos/${projId}/fluxos`, { method: "POST", body: JSON.stringify(body) }),
  fluxos: (projId: string) => req<FluxoExecucao[]>(`/me/gestao/projetos/${projId}/fluxos`),
  fluxo: (execId: string) => req<FluxoExecucao>(`/me/gestao/fluxos/${execId}`),
  fluxoContinuar: (execId: string) => req<FluxoExecucao>(`/me/gestao/fluxos/${execId}/continuar`, { method: "POST" }),

  // --- Serviços ---
  servicos: () => req<Servico[]>("/me/servicos"),
  criarServico: (body: Partial<Servico>) =>
    req<Servico>("/me/servicos", { method: "POST", body: JSON.stringify(body) }),
  atualizarServico: (id: string, body: Partial<Servico>) =>
    req<Servico>(`/me/servicos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarServico: (id: string) => req<void>(`/me/servicos/${id}`, { method: "DELETE" }),

  // --- Profissionais ---
  profissionais: () => req<Profissional[]>("/me/profissionais"),
  criarProfissional: (body: { nome: string; ativo?: boolean; servico_ids?: string[]; escalas?: Escala[] }) =>
    req<Profissional>("/me/profissionais", { method: "POST", body: JSON.stringify(body) }),
  atualizarProfissional: (id: string, body: { nome?: string; ativo?: boolean; servico_ids?: string[]; escalas?: Escala[] }) =>
    req<Profissional>(`/me/profissionais/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarProfissional: (id: string) => req<void>(`/me/profissionais/${id}`, { method: "DELETE" }),

  // --- Ausências ---
  ausencias: (profId: string) => req<Ausencia[]>(`/me/profissionais/${profId}/ausencias`),
  criarAusencia: (profId: string, body: Partial<Ausencia>) =>
    req<Ausencia>(`/me/profissionais/${profId}/ausencias`, { method: "POST", body: JSON.stringify(body) }),
  apagarAusencia: (profId: string, ausenciaId: string) =>
    req<void>(`/me/profissionais/${profId}/ausencias/${ausenciaId}`, { method: "DELETE" }),

  // --- Disponibilidade + Agendamentos ---
  disponibilidade: (servicoId?: string, profId?: string) => {
    const p = new URLSearchParams();
    if (servicoId) p.set("servico_id", servicoId);
    if (profId) p.set("profissional_id", profId);
    return req<Slot[]>(`/me/disponibilidade?${p.toString()}`);
  },
  agendamentos: (de?: string, ate?: string, profId?: string) => {
    const p = new URLSearchParams();
    if (de) p.set("de", de);
    if (ate) p.set("ate", ate);
    if (profId) p.set("profissional_id", profId);
    return req<Agendamento[]>(`/me/agendamentos?${p.toString()}`);
  },
  criarAgendamento: (body: {
    profissional_id: string; servico_id?: string; inicio: string; fim?: string;
    cliente_nome?: string; contato?: string; observacao?: string;
  }) => req<Agendamento>("/me/agendamentos", { method: "POST", body: JSON.stringify(body) }),
  atualizarAgendamento: (id: string, body: Partial<Pick<Agendamento, "status" | "inicio" | "fim" | "observacao">>) =>
    req<Agendamento>(`/me/agendamentos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarAgendamento: (id: string) => req<void>(`/me/agendamentos/${id}`, { method: "DELETE" }),

  // --- Customizar Agendamento (config global) ---
  agendamentoConfig: () => req<AgendamentoConfig>("/me/agendamento-config"),
  setAgendamentoConfig: (body: Partial<Omit<AgendamentoConfig, "cliente_id">>) =>
    req<AgendamentoConfig>("/me/agendamento-config", { method: "PATCH", body: JSON.stringify(body) }),
  growthChat: (agente: string, mensagens: GrowthMensagem[]) =>
    req<{ resposta: string }>("/growth/chat", { method: "POST", body: JSON.stringify({ agente, mensagens }) }),
  growthPosts: () => req<GrowthPost[]>("/growth/posts"),
  growthGerarPosts: (tema: string, quantidade: number, tom?: string) =>
    req<GrowthPost[]>("/growth/posts/gerar", { method: "POST", body: JSON.stringify({ tema, quantidade, tom }) }),
  growthAtualizarPost: (id: string, body: Partial<Pick<GrowthPost, "titulo" | "conteudo" | "status">>) =>
    req<GrowthPost>(`/growth/posts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  growthApagarPost: (id: string) =>
    req<void>(`/growth/posts/${id}`, { method: "DELETE" }),
  relatorios: () => req<Relatorio[]>("/me/relatorios"),
  criarCampanha: (body: CampanhaInput) =>
    req<Campanha>("/campanhas", { method: "POST", body: JSON.stringify(body) }),
  atualizarCampanha: (
    id: string,
    body: Partial<Pick<Campanha, "nome_campanha" | "anuncio_dor" | "anuncio_beneficio" | "palavra_chave_gatilho" | "servico_ids">>,
  ) => req<Campanha>(`/me/campanhas/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarCampanha: (id: string) =>
    req<void>(`/me/campanhas/${id}`, { method: "DELETE" }),
  onboarding: (body: OnboardingInput) =>
    req<{ cliente_id: string; workspace_config_id: string }>("/api/v1/onboarding", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getConfig: () => req<Config>("/me/config"),
  updateConfig: (body: ConfigUpdate) =>
    req<Config>("/me/config", { method: "PATCH", body: JSON.stringify(body) }),
  habilidades: () => req<Habilidade[]>("/me/habilidades"),
  criarHabilidade: (titulo: string, conteudo: string, agente: AgenteSkill = "global") =>
    req<Habilidade>("/me/habilidades", {
      method: "POST",
      body: JSON.stringify({ titulo, conteudo, agente }),
    }),
  atualizarHabilidade: (
    id: string,
    body: Partial<Pick<Habilidade, "titulo" | "conteudo" | "ativo" | "agente">>,
  ) => req<Habilidade>(`/me/habilidades/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarHabilidade: (id: string) =>
    req<void>(`/me/habilidades/${id}`, { method: "DELETE" }),

  // --- Agente Executivo ---
  processamentos: () => req<Processamento[]>("/me/executivo"),
  processarExecutivo: (entrada: string, titulo?: string) =>
    req<Processamento>("/me/executivo", {
      method: "POST",
      body: JSON.stringify({ entrada, titulo }),
    }),
  apagarProcessamento: (id: string) =>
    req<void>(`/me/executivo/${id}`, { method: "DELETE" }),
  apagarTodosProcessamentos: () =>
    req<{ apagados: number }>("/me/executivo", { method: "DELETE" }),

  // --- Tarefas dirigidas do Agente Executivo ---
  tarefasExecutivo: () => req<TarefaExecutivo[]>("/me/executivo/tarefas"),
  criarTarefaExecutivo: (body: TarefaInput) =>
    req<TarefaExecutivo>("/me/executivo/tarefas", { method: "POST", body: JSON.stringify(body) }),
  atualizarTarefaExecutivo: (id: string, body: Partial<TarefaInput>) =>
    req<TarefaExecutivo>(`/me/executivo/tarefas/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarTarefaExecutivo: (id: string) =>
    req<void>(`/me/executivo/tarefas/${id}`, { method: "DELETE" }),

  // --- WhatsApp gerido (QR Code, 1 clique) ---
  whatsappEstado: () =>
    req<{ gerido: boolean; instance: string | null; estado: string | null; ligado: boolean; numero: string | null }>("/me/whatsapp/estado"),
  whatsappConectar: () =>
    req<{ qr: string | null; instance: string }>("/me/whatsapp/conectar", { method: "POST" }),
  whatsappQr: () =>
    req<{ qr: string | null; estado: string | null; ligado: boolean }>("/me/whatsapp/qr"),
  whatsappDesligar: () => req<{ ok: boolean }>("/me/whatsapp/desligar", { method: "POST" }),

  // --- Fase 2: integração de email (OAuth Gmail) ---
  emailAccounts: () => req<EmailAccount[]>("/me/email-accounts"),
  oauthGoogle: (code: string, redirect_uri: string) =>
    req<EmailAccount>("/oauth/google/exchange", {
      method: "POST",
      body: JSON.stringify({ code, redirect_uri }),
    }),
  sincronizarEmail: (provider = "gmail", tarefa_ids?: string[]) =>
    req<EmailSyncResult>("/me/email/sync", {
      method: "POST",
      body: JSON.stringify({ provider, tarefa_ids }),
    }),
  desligarEmail: (provider: string) =>
    req<void>(`/me/email-accounts/${provider}`, { method: "DELETE" }),

  trocarTokenFacebook: (user_access_token: string) =>
    req<{ access_token: string; name: string }>("/me/social-config/exchange-token", {
      method: "POST",
      body: JSON.stringify({ user_access_token }),
    }),
  oauthFacebook: (code: string, redirect_uri: string) =>
    req<{ facebook_page_id: string; facebook_page_name: string; facebook_page_access_token: string; instagram_business_account_id: string | null }>("/oauth/facebook/exchange", {
      method: "POST",
      body: JSON.stringify({ code, redirect_uri }),
    }),
  getSocialConfig: () => req<SocialConfig>("/me/social-config"),
  updateSocialConfig: (body: SocialConfigUpdate) =>
    req<SocialConfig>("/me/social-config", { method: "PATCH", body: JSON.stringify(body) }),
  testarDiscord: () => req<{ ok: boolean }>("/me/social-config/test/discord", { method: "POST" }),
  verificarFacebook: () => req<{ id: string; name: string }>("/me/social-config/test/facebook", { method: "POST" }),
  verificarInstagram: () => req<{ id: string; name: string; username: string; followers_count?: number }>("/me/social-config/test/instagram", { method: "POST" }),
  postarFacebook: (mensagem: string, image_url?: string, video_url?: string) =>
    req<{ id: string }>("/me/social-config/post/facebook", { method: "POST", body: JSON.stringify({ mensagem, image_url, video_url }) }),
  postarInstagram: (mensagem: string, image_url?: string, video_url?: string) =>
    req<{ id: string }>("/me/social-config/post/instagram", { method: "POST", body: JSON.stringify({ mensagem, image_url, video_url }) }),
  postarDiscord: (mensagem: string) =>
    req<{ ok: boolean }>("/me/social-config/post/discord", { method: "POST", body: JSON.stringify({ mensagem }) }),

  // --- Admin (superadmin) ---
  planos: () => req<Plano[]>("/admin/planos"),
  criarPlano: (body: Partial<Plano>) =>
    req<Plano>("/admin/planos", { method: "POST", body: JSON.stringify(body) }),
  atualizarPlano: (id: string, body: Partial<Plano>) =>
    req<Plano>(`/admin/planos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarPlano: (id: string) => req<void>(`/admin/planos/${id}`, { method: "DELETE" }),
  registarPlanoStripe: (id: string) =>
    req<Plano>(`/admin/planos/${id}/stripe`, { method: "POST" }),

  // --- Stripe: assinaturas do cliente ---
  planosAtivos: (moeda?: string) => req<PlanoAtivo[]>(`/me/planos${moeda ? `?moeda=${moeda}` : ""}`),
  checkout: (planoId: string) =>
    req<{ url: string }>("/me/checkout", { method: "POST", body: JSON.stringify({ plano_id: planoId }) }),
  mudarPlano: (planoId: string) =>
    req<{ plano_id: string }>("/me/mudar-plano", { method: "POST", body: JSON.stringify({ plano_id: planoId }) }),
  portal: () => req<{ url: string }>("/me/portal", { method: "POST" }),
  cancelarAssinatura: () => req<{ cancela_em: string | null }>("/me/cancelar-assinatura", { method: "POST" }),
  reativarAssinatura: () => req<{ cancela_em: string | null }>("/me/reativar-assinatura", { method: "POST" }),

  // --- Pacotes de créditos avulsos ---
  pacotes: () => req<Pacote[]>("/admin/pacotes"),
  criarPacote: (body: Partial<Pacote>) =>
    req<Pacote>("/admin/pacotes", { method: "POST", body: JSON.stringify(body) }),
  atualizarPacote: (id: string, body: Partial<Pacote>) =>
    req<Pacote>(`/admin/pacotes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarPacote: (id: string) => req<void>(`/admin/pacotes/${id}`, { method: "DELETE" }),
  registarPacoteStripe: (id: string) =>
    req<Pacote>(`/admin/pacotes/${id}/stripe`, { method: "POST" }),

  // --- Painel do superadmin: Empresas ---
  empresas: () => req<Empresa[]>("/admin/empresas"),
  adminConcederCreditos: (clienteId: string, creditos: number) =>
    req<{ ok: boolean; creditos_avulsos: number }>(`/admin/empresas/${clienteId}/creditos`, {
      method: "POST",
      body: JSON.stringify({ creditos }),
    }),
  empresasConsumo: (de: string, ate: string) =>
    req<EmpresaConsumo[]>(`/admin/empresas/consumo?de=${de}&ate=${ate}`),
  adminDashboards: (de: string, ate: string, gran: "semana" | "mes" | "trimestre" | "ano") =>
    req<AdminDashboard>(`/admin/dashboards?de=${de}&ate=${ate}&gran=${gran}`),
  pacotesAtivos: (moeda?: string) => req<PacoteAtivo[]>(`/me/pacotes${moeda ? `?moeda=${moeda}` : ""}`),
  comprarCreditos: (pacoteId: string) =>
    req<{ url: string }>("/me/comprar-creditos", { method: "POST", body: JSON.stringify({ pacote_id: pacoteId }) }),
};
