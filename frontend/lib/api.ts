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
  tem_assinatura?: boolean;
  assinatura_cancela_em?: string | null;
};

export type PlanoAtivo = {
  id: string;
  nome: string;
  creditos_mensais: number;
  preco: number;
  stripe_price_id: string | null;
  ordem: number;
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
  consumo_total: number;
  faturamento_total: number;
  faturamento_por_tipo: Record<string, number>;
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
};

export type PacoteAtivo = {
  id: string;
  nome: string;
  creditos: number;
  preco: number;
  stripe_price_id: string | null;
  ordem: number;
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
  calendario_link: string;
  whatsapp_dono: string | null;
  limite_mensal_leads: number;
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
};

export type AgenteSkill = "global" | "copywriting" | "sdr" | "bi" | "assistente";

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
        detail = body.detail ?? detail;
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
  relatorios: () => req<Relatorio[]>("/me/relatorios"),
  criarCampanha: (body: CampanhaInput) =>
    req<Campanha>("/campanhas", { method: "POST", body: JSON.stringify(body) }),
  atualizarCampanha: (
    id: string,
    body: Partial<Pick<Campanha, "nome_campanha" | "anuncio_dor" | "anuncio_beneficio" | "palavra_chave_gatilho">>,
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

  // --- Tarefas dirigidas do Agente Executivo ---
  tarefasExecutivo: () => req<TarefaExecutivo[]>("/me/executivo/tarefas"),
  criarTarefaExecutivo: (body: TarefaInput) =>
    req<TarefaExecutivo>("/me/executivo/tarefas", { method: "POST", body: JSON.stringify(body) }),
  atualizarTarefaExecutivo: (id: string, body: Partial<TarefaInput>) =>
    req<TarefaExecutivo>(`/me/executivo/tarefas/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarTarefaExecutivo: (id: string) =>
    req<void>(`/me/executivo/tarefas/${id}`, { method: "DELETE" }),

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
  postarFacebook: (mensagem: string) =>
    req<{ id: string }>("/me/social-config/post/facebook", { method: "POST", body: JSON.stringify({ mensagem }) }),
  postarInstagram: (mensagem: string, image_url?: string) =>
    req<{ id: string }>("/me/social-config/post/instagram", { method: "POST", body: JSON.stringify({ mensagem, image_url }) }),
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
  planosAtivos: () => req<PlanoAtivo[]>("/me/planos"),
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
  empresasConsumo: (de: string, ate: string) =>
    req<EmpresaConsumo[]>(`/admin/empresas/consumo?de=${de}&ate=${ate}`),
  adminDashboards: (de: string, ate: string, gran: "semana" | "mes" | "trimestre" | "ano") =>
    req<AdminDashboard>(`/admin/dashboards?de=${de}&ate=${ate}&gran=${gran}`),
  pacotesAtivos: () => req<PacoteAtivo[]>("/me/pacotes"),
  comprarCreditos: (pacoteId: string) =>
    req<{ url: string }>("/me/comprar-creditos", { method: "POST", body: JSON.stringify({ pacote_id: pacoteId }) }),
};
