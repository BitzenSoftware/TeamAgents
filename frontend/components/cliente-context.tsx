"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, api, type Cliente } from "@/lib/api";
import { useAuth } from "@/components/auth-context";

type Ctx = {
  cliente: Cliente | null;
  needsOnboarding: boolean;
  loading: boolean;
  refresh: () => void;
};

const ClienteCtx = createContext<Ctx | null>(null);

export function ClienteProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!session) {
      setCliente(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .me()
      .then((c) => {
        setCliente(c);
        setNeedsOnboarding(false);
      })
      .catch((e) => {
        // 404 = sem cliente -> precisa de onboarding
        if (e instanceof ApiError && e.status === 404) setNeedsOnboarding(true);
        setCliente(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.access_token]);

  return (
    <ClienteCtx.Provider value={{ cliente, needsOnboarding, loading, refresh: load }}>
      {children}
    </ClienteCtx.Provider>
  );
}

export function useCliente() {
  const ctx = useContext(ClienteCtx);
  if (!ctx) throw new Error("useCliente deve ser usado dentro de ClienteProvider");
  return ctx;
}
