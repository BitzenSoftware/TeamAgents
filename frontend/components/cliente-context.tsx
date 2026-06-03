"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type Cliente } from "@/lib/api";

type Ctx = {
  clientes: Cliente[];
  clienteId: string | null;
  cliente: Cliente | null;
  setClienteId: (id: string) => void;
  loading: boolean;
  error: string | null;
};

const ClienteCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "teamagents.clienteId";

export function ClienteProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .clientes()
      .then((cs) => {
        setClientes(cs);
        const saved = localStorage.getItem(STORAGE_KEY);
        const initial = saved && cs.some((c) => c.id === saved) ? saved : cs[0]?.id ?? null;
        setClienteIdState(initial);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const setClienteId = (id: string) => {
    setClienteIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;

  return (
    <ClienteCtx.Provider
      value={{ clientes, clienteId, cliente, setClienteId, loading, error }}
    >
      {children}
    </ClienteCtx.Provider>
  );
}

export function useCliente() {
  const ctx = useContext(ClienteCtx);
  if (!ctx) throw new Error("useCliente deve ser usado dentro de ClienteProvider");
  return ctx;
}
