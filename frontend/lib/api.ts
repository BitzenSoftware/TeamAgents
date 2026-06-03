// Cliente de API tipado para o backend FastAPI do TeamAgents.
import { supabase } from "@/lib/supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  anuncio_dor: string;
  anuncio_beneficio: string;
  gatilho_principal: string;
  dor_alvo: string;
  desejo_alvo: string;
  palavra_chave_gatilho: string;
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

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    ...init,
  });
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
  return res.json() as Promise<T>;
}

export const api = {
  me: () => req<Cliente>("/me"),
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
};
