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

export type CampanhaInput = {
  nicho: string;
  dor_latente: string;
  nome_cliente: string;
  nome_campanha: string;
  link_calendario?: string;
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
  ativo: boolean;
  ordem: number;
};

export type Habilidade = {
  id: string;
  cliente_id: string;
  titulo: string;
  conteudo: string;
  ativo: boolean;
  created_at: string;
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
  leads: () => req<Lead[]>("/me/leads"),
  conversas: (leadId: string) => req<Conversa[]>(`/me/leads/${leadId}/conversas`),
  relatorios: () => req<Relatorio[]>("/me/relatorios"),
  criarCampanha: (body: CampanhaInput) =>
    req<Campanha>("/campanhas", { method: "POST", body: JSON.stringify(body) }),
  onboarding: (body: OnboardingInput) =>
    req<{ cliente_id: string; workspace_config_id: string }>("/api/v1/onboarding", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getConfig: () => req<Config>("/me/config"),
  updateConfig: (body: ConfigUpdate) =>
    req<Config>("/me/config", { method: "PATCH", body: JSON.stringify(body) }),
  habilidades: () => req<Habilidade[]>("/me/habilidades"),
  criarHabilidade: (titulo: string, conteudo: string) =>
    req<Habilidade>("/me/habilidades", {
      method: "POST",
      body: JSON.stringify({ titulo, conteudo }),
    }),
  atualizarHabilidade: (id: string, body: Partial<Pick<Habilidade, "titulo" | "conteudo" | "ativo">>) =>
    req<Habilidade>(`/me/habilidades/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarHabilidade: (id: string) =>
    req<void>(`/me/habilidades/${id}`, { method: "DELETE" }),

  getSocialConfig: () => req<SocialConfig>("/me/social-config"),
  updateSocialConfig: (body: SocialConfigUpdate) =>
    req<SocialConfig>("/me/social-config", { method: "PATCH", body: JSON.stringify(body) }),
  testarDiscord: () => req<{ ok: boolean }>("/me/social-config/test/discord", { method: "POST" }),
  verificarFacebook: () => req<{ id: string; name: string }>("/me/social-config/test/facebook", { method: "POST" }),
  verificarInstagram: () => req<{ id: string; name: string; username: string; followers_count?: number }>("/me/social-config/test/instagram", { method: "POST" }),
  postarFacebook: (mensagem: string) =>
    req<{ id: string }>("/me/social-config/post/facebook", { method: "POST", body: JSON.stringify({ mensagem }) }),

  // --- Admin (superadmin) ---
  planos: () => req<Plano[]>("/admin/planos"),
  criarPlano: (body: Partial<Plano>) =>
    req<Plano>("/admin/planos", { method: "POST", body: JSON.stringify(body) }),
  atualizarPlano: (id: string, body: Partial<Plano>) =>
    req<Plano>(`/admin/planos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  apagarPlano: (id: string) => req<void>(`/admin/planos/${id}`, { method: "DELETE" }),
};
