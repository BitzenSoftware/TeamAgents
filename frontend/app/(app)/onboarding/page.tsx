"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCliente } from "@/components/cliente-context";

export default function OnboardingPage() {
  const router = useRouter();
  const { refresh } = useCliente();
  const [form, setForm] = useState({
    nome_empresa: "",
    whatsapp_instance_name: "",
    whatsapp_token: "",
    whatsapp_api_url: "",
    calendario_link: "",
    whatsapp_dono: "",
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      await api.onboarding({
        nome_empresa: form.nome_empresa,
        whatsapp_instance_name: form.whatsapp_instance_name,
        whatsapp_token: form.whatsapp_token,
        whatsapp_api_url: form.whatsapp_api_url || undefined,
        calendario_link: form.calendario_link,
        whatsapp_dono: form.whatsapp_dono,
      });
      refresh();
      router.replace("/pipeline");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro no onboarding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} autoComplete="off" className="w-full max-w-lg space-y-3 rounded-2xl border border-black/10 bg-white p-6">
        <div className="mb-2">
          <h1 className="text-xl font-semibold">Configurar a tua empresa</h1>
          <p className="text-sm text-black/50">Liga o WhatsApp e a agenda para ativar os agentes.</p>
        </div>
        <Campo label="Nome da empresa" v={form.nome_empresa} on={set("nome_empresa")} ph="Empresa Exemplo LTDA" />
        <p className="pt-1 text-xs text-black/40">Os campos abaixo são opcionais — podes preenchê-los depois em Configurações.</p>
        <Campo label="Instância do WhatsApp (Evolution)" v={form.whatsapp_instance_name} on={set("whatsapp_instance_name")} ph="instancia_prod_01" required={false} />
        <Campo label="Token da instância" v={form.whatsapp_token} on={set("whatsapp_token")} ph="tok_..." required={false} />
        <Campo label="URL da Evolution API" v={form.whatsapp_api_url} on={set("whatsapp_api_url")} ph="https://api.evolution..." required={false} />
        <Campo label="Link de calendário" v={form.calendario_link} on={set("calendario_link")} ph="https://calendly.com/empresa" required={false} />
        <Campo label="WhatsApp do dono (recebe o relatório)" v={form.whatsapp_dono} on={set("whatsapp_dono")} ph="+5511999999999" required={false} />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "A configurar…" : "Concluir onboarding"}
        </button>
        {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
      </form>
    </div>
  );
}

function Campo({
  label,
  v,
  on,
  ph,
  required = true,
}: {
  label: string;
  v: string;
  on: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ph?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-black/60">{label}</span>
      <input
        value={v}
        onChange={on}
        placeholder={ph}
        required={required}
        className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
      />
    </label>
  );
}
