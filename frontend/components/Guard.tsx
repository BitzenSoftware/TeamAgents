"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-context";
import { useCliente } from "@/components/cliente-context";
import { Shell } from "@/components/Shell";

const PUBLIC = ["/login"];

export function Guard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading: authLoading } = useAuth();
  const { needsOnboarding, loading: cliLoading } = useCliente();

  const isPublic = PUBLIC.includes(pathname);
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      if (!isPublic) router.replace("/login");
      return;
    }
    // autenticado
    if (isPublic) {
      router.replace("/pipeline");
      return;
    }
    if (cliLoading) return;
    if (needsOnboarding && !isOnboarding) router.replace("/onboarding");
    if (!needsOnboarding && isOnboarding) router.replace("/pipeline");
  }, [authLoading, cliLoading, session, needsOnboarding, isPublic, isOnboarding, pathname, router]);

  if (authLoading || (session && cliLoading)) {
    return <div className="grid min-h-screen place-items-center text-sm text-black/40">A carregar…</div>;
  }

  // Login e onboarding renderizam "nus" (sem sidebar).
  if (isPublic || isOnboarding) return <>{children}</>;

  // Páginas da app só com sessão + cliente.
  if (!session || needsOnboarding) {
    return <div className="grid min-h-screen place-items-center text-sm text-black/40">A redirecionar…</div>;
  }
  return <Shell>{children}</Shell>;
}
