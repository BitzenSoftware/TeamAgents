"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { supabase } from "@/lib/supabase";

export default function RedefinirPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (password.length < 6) {
      setErro("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setErro("As palavras-passe não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setOk(true);
      setTimeout(() => router.replace("/pipeline"), 1800);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível redefinir a palavra-passe.");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white">
            <Bot size={18} />
          </span>
          <span className="text-lg font-semibold tracking-tight">TeamAgents</span>
        </Link>

        {authLoading ? (
          <p className="text-center text-sm text-black/40">A validar o link…</p>
        ) : !session ? (
          <div className="rounded-2xl border border-black/10 bg-white p-6 text-center shadow-xl shadow-black/[0.04]">
            <h1 className="mb-2 text-lg font-bold">Link inválido ou expirado</h1>
            <p className="mb-5 text-sm text-black/50">
              O link de recuperação já não é válido. Pede um novo a partir do ecrã de entrada.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25"
            >
              Ir para o login
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : ok ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-xl shadow-black/[0.04]">
            <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500" />
            <h1 className="mb-1 text-lg font-bold">Palavra-passe redefinida!</h1>
            <p className="text-sm text-black/50">A levar-te para o painel…</p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Nova palavra-passe</h1>
              <p className="mt-1.5 text-sm text-black/50">
                Escolhe a nova palavra-passe da conta {session.user.email}.
              </p>
            </div>
            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-black/10 bg-white p-6 shadow-xl shadow-black/[0.04]">
              <div>
                <label htmlFor="nova-pass" className="mb-1.5 block text-xs font-medium text-black/60">
                  Nova palavra-passe
                </label>
                <div className="relative">
                  <input
                    id="nova-pass"
                    type={mostrar ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-black/15 px-3.5 py-2.5 pr-16 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrar(!mostrar)}
                    className="absolute inset-y-0 right-3 my-auto h-fit text-xs font-medium text-black/40 hover:text-ink"
                  >
                    {mostrar ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="conf-pass" className="mb-1.5 block text-xs font-medium text-black/60">
                  Confirmar palavra-passe
                </label>
                <input
                  id="conf-pass"
                  type={mostrar ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="w-full rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:shadow-brand/40 disabled:opacity-50"
              >
                {loading ? "A guardar…" : "Redefinir palavra-passe"}
              </button>
              {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{erro}</p>}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
