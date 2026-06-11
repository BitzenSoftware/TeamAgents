"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useCliente } from "@/components/cliente-context";
import { Shell } from "@/components/Shell";

const PUBLIC = ["/", "/login"];

const MENSAGENS_ESPERA = [
  "Conectando ao servidor…",
  "O servidor está acordando, aguarde…",
  "Pode demorar até 1 minuto na primeira vez…",
  "Quase lá…",
];

export function Guard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading: authLoading } = useAuth();
  const { needsOnboarding, loading: cliLoading } = useCliente();
  const [msgIdx, setMsgIdx] = useState(0);

  const isPublic = PUBLIC.includes(pathname);
  const isOnboarding = pathname === "/onboarding";
  // Página de redefinição de senha: o link do email entra com uma
  // sessão de recuperação — renderiza "nua" e nunca é desviada p/ onboarding.
  const isRedefinir = pathname === "/redefinir";
  const isLoading = authLoading || (session && cliLoading);

  useEffect(() => {
    if (!isLoading) return;
    const id = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, MENSAGENS_ESPERA.length - 1));
    }, 5000);
    return () => clearInterval(id);
  }, [isLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      if (!isPublic) router.replace("/login");
      return;
    }
    // autenticado
    if (isRedefinir) return; // deixa o usuário redefinir a senha em paz
    if (isPublic) {
      router.replace("/pipeline");
      return;
    }
    if (cliLoading) return;
    if (needsOnboarding && !isOnboarding) router.replace("/onboarding");
    if (!needsOnboarding && isOnboarding) router.replace("/pipeline");
  }, [authLoading, cliLoading, session, needsOnboarding, isPublic, isOnboarding, isRedefinir, pathname, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-black/20 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-black/40 transition-all">{MENSAGENS_ESPERA[msgIdx]}</p>
        </div>
      </div>
    );
  }

  // Login, onboarding e redefinição renderizam "nus" (sem sidebar).
  if (isPublic || isOnboarding || isRedefinir) return <>{children}</>;

  // Páginas da app só com sessão + cliente.
  if (!session || needsOnboarding) {
    return <div className="grid min-h-screen place-items-center text-sm text-black/40">Redirecionando…</div>;
  }
  return <Shell>{children}</Shell>;
}
