// Catálogo dos assistentes do cliente — compartilhado entre os menus
// Assistentes e Gestão (nomes, ícones, exemplos e se aceita anexos).
import {
  Wallet, Scale, LifeBuoy, Package, Users, ShieldCheck, FolderKanban,
  Target, TrendingUp, Workflow, type LucideIcon,
} from "lucide-react";

export type AgenteInfo = {
  id: string;
  nome: string;
  chip: string;
  cor: string;
  icon: LucideIcon;
  intro: string;
  exemplos: string[];
  anexos?: boolean;
};

export const AGENTES_CATALOGO: AgenteInfo[] = [
  {
    id: "financeiro", nome: "Agente Financeiro", chip: "Finanças", cor: "text-emerald-600", icon: Wallet, anexos: true,
    intro: "Seu consultor financeiro: precificação, fluxo de caixa, custos e metas.",
    exemplos: ["Como precificar um procedimento de R$ 1.200 de custo?", "Monte um fluxo de caixa simples", "Analise esta planilha de custos (anexe o Excel)"],
  },
  {
    id: "juridico", nome: "Agente Jurídico", chip: "Jurídico", cor: "text-indigo-600", icon: Scale, anexos: true,
    intro: "Orientação jurídica do dia a dia: contratos, LGPD, termos de consentimento.",
    exemplos: ["Crie um termo de consentimento para procedimento estético", "Revise os riscos deste contrato (anexe o PDF/Word)", "O que preciso pra ficar em dia com a LGPD?"],
  },
  {
    id: "suporte", nome: "Agente de Suporte", chip: "Suporte", cor: "text-sky-600", icon: LifeBuoy,
    intro: "Resolve problemas e ajuda a responder bem os seus clientes.",
    exemplos: ["Como respondo um cliente que reclamou do resultado?", "Monte um FAQ dos meus serviços", "Escreva uma resposta para um cliente irritado"],
  },
  {
    id: "produto", nome: "Agente de Produto", chip: "Produto", cor: "text-amber-600", icon: Package,
    intro: "Estratégia de oferta: pacotes, posicionamento e novas frentes.",
    exemplos: ["Sugira combos de serviços pra aumentar o ticket", "Como posicionar meu serviço premium?", "Vale a pena lançar um novo serviço X?"],
  },
  {
    id: "rh", nome: "Agente de RH / Pessoas", chip: "RH", cor: "text-rose-600", icon: Users,
    intro: "Contratar melhor, desenvolver pessoas e reduzir risco trabalhista.",
    exemplos: ["Crie uma descrição de vaga para recepcionista", "Monte um roteiro de entrevista", "Como dar um feedback difícil?"],
  },
  {
    id: "auditoria", nome: "Agente de Auditoria Interna", chip: "Auditoria", cor: "text-teal-600", icon: ShieldCheck, anexos: true,
    intro: "Identifica riscos, inconsistências e oportunidades de melhoria.",
    exemplos: ["Audite esta planilha e aponte inconsistências (anexe)", "Revise meu processo e aponte riscos", "Onde posso estar perdendo dinheiro?"],
  },
  {
    id: "projetos", nome: "Agente de Projetos", chip: "Projetos", cor: "text-cyan-600", icon: FolderKanban,
    intro: "Organiza entregas, prazos, riscos e comunicação.",
    exemplos: ["Monte um plano para inaugurar uma nova sala", "Quais riscos desse projeto?", "Crie um cronograma de 4 semanas"],
  },
  {
    id: "estrategia", nome: "Agente de Estratégia", chip: "Estratégia", cor: "text-violet-600", icon: Target,
    intro: "Visão macro, decisões difíceis, OKRs e priorização.",
    exemplos: ["Defina meus OKRs do trimestre", "Vale mais investir em anúncio ou contratar?", "Me ajude a priorizar o que fazer primeiro"],
  },
  {
    id: "crescimento", nome: "Agente de Growth", chip: "Growth", cor: "text-emerald-600", icon: TrendingUp,
    intro: "Aquisição, retenção, monetização e experimentos.",
    exemplos: ["Sugira 3 experimentos pra trazer mais clientes", "Como reduzir o churn?", "Ideias de upsell pra aumentar a receita"],
  },
  {
    id: "operacoes", nome: "Agente de Operações", chip: "Operações", cor: "text-slate-600", icon: Workflow, anexos: true,
    intro: "Processos, SOPs, rotinas e eficiência — um negócio previsível.",
    exemplos: ["Mapeie meu processo de atendimento e ache gargalos", "Crie um SOP para o agendamento", "Analise este documento de processo (anexe)"],
  },
];

export const agenteInfo = (id: string): AgenteInfo | undefined => AGENTES_CATALOGO.find((a) => a.id === id);
