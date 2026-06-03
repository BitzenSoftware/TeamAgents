"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCliente } from "@/components/cliente-context";

const NAV = [
  { href: "/pipeline", label: "Pipeline", hint: "Comercial / SDR" },
  { href: "/campanhas", label: "Campanhas", hint: "Fábrica / Copy" },
  { href: "/consultoria", label: "Consultoria", hint: "Diretor de BI" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { clientes, clienteId, setClienteId, loading } = useCliente();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-black/10 bg-white/60 p-5 flex flex-col gap-6">
        <div>
          <div className="text-lg font-semibold tracking-tight">TeamAgents</div>
          <div className="text-xs text-black/50">Painel do cliente</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-ink text-white" : "hover:bg-black/5"
                }`}
              >
                <div className="font-medium">{item.label}</div>
                <div className={`text-xs ${active ? "text-white/60" : "text-black/40"}`}>
                  {item.hint}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <label className="text-xs text-black/50">Cliente (tenant)</label>
          <select
            className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm"
            value={clienteId ?? ""}
            onChange={(e) => setClienteId(e.target.value)}
            disabled={loading || clientes.length === 0}
          >
            {clientes.length === 0 && <option>— sem clientes —</option>}
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
