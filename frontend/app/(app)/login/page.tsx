"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Mail,
  Megaphone,
  MessageCircle,
  Shield,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const AGENTES = [
  {
    icon: <MessageCircle size={15} className="text-emerald-300" />,
    nome: "Agente SDR",
    acao: "qualifica e agenda reuniões no WhatsApp",
  },
  {
    icon: <Megaphone size={15} className="text-violet-300" />,
    nome: "Agente de Copywriting",
    acao: "anúncios de alta conversão em segundos",
  },
  {
    icon: <Mail size={15} className="text-sky-300" />,
    nome: "Agente Executivo",
    acao: "resume seu email e extrai as ações",
  },
  {
    icon: <BarChart3 size={15} className="text-amber-300" />,
    nome: "Agente Diretor de BI",
    acao: "relatórios estratégicos no seu WhatsApp",
  },
];

export default function LoginPage() {
  const [modo, setModo] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setInfo(null);
    if (modo === "recuperar") {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir`,
        });
        if (error) throw error;
        setInfo("Enviamos um link de recuperação para o seu email. Abra-o para redefinir a senha.");
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível enviar o email.");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (modo === "criar") {
      if (password.length < 6) {
        setErro("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (password !== confirmar) {
        setErro("As senhas não coincidem.");
        return;
      }
    }
    setLoading(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // o Guard trata o redirecionamento
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setInfo("Conta criada. Confirme o email para entrar (ou desative a confirmação no Supabase).");
        }
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro de autenticação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ───────── Painel da marca (escuro) ───────── */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#0a0a1f] p-10 text-white lg:flex xl:p-14">
        {/* fundo: blobs + grelha */}
        <div className="pointer-events-none absolute inset-0">
          <div className="lg-anim lg-blob absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand/30 blur-[110px]" />
          <div className="lg-anim lg-blob2 absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:52px_52px]" />
        </div>

        {/* topo: logo */}
        <Link href="/" className="relative flex w-fit items-center gap-2.5 transition hover:opacity-80">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark shadow-lg shadow-brand/30">
            <Bot size={18} />
          </span>
          <span className="text-lg font-semibold tracking-tight">TeamAgents</span>
        </Link>

        {/* meio: proposta + agentes */}
        <div className="relative">
          <div className="lg-anim lg-up mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/70">
            <Sparkles size={12} className="text-amber-300" />
            Agentes de IA com modelos Claude, da Anthropic
          </div>
          <h1 className="lg-anim lg-up mb-3 text-3xl font-bold leading-[1.15] tracking-tight [animation-delay:.08s] xl:text-4xl">
            Sua equipe de IA
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              está esperando por você.
            </span>
          </h1>
          <p className="lg-anim lg-up mb-8 max-w-sm text-sm leading-relaxed text-white/50 [animation-delay:.16s]">
            Entre para acompanhar seus leads, campanhas, emails e relatórios — os agentes
            nunca pararam de trabalhar.
          </p>

          <div className="space-y-2.5">
            {AGENTES.map((a, i) => (
              <div
                key={a.nome}
                className="lg-anim lg-up flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
                style={{ animationDelay: `${0.24 + i * 0.1}s` }}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/8">{a.icon}</span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-white/90">{a.nome}</div>
                  <div className="truncate text-[11px] text-white/40">{a.acao}</div>
                </div>
                <span className="relative ml-auto flex h-1.5 w-1.5 shrink-0">
                  <span className="lg-anim lg-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* base: confiança */}
        <div className="relative flex items-center gap-5 text-[11px] text-white/35">
          <span className="flex items-center gap-1.5">
            <Shield size={12} />
            Dados isolados por empresa
          </span>
          <span>·</span>
          <span>Trabalhando 24/7 pelo seu negócio</span>
        </div>
      </aside>

      {/* ───────── Formulário ───────── */}
      <main className="flex flex-1 items-center justify-center bg-paper p-6">
        <div className="w-full max-w-sm">
          {/* logo no mobile (painel escondido) */}
          <Link href="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white">
              <Bot size={18} />
            </span>
            <span className="text-lg font-semibold tracking-tight">TeamAgents</span>
          </Link>

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight">
              {modo === "entrar" ? "Bem-vindo de volta" : modo === "criar" ? "Crie sua conta" : "Recuperar acesso"}
            </h2>
            <p className="mt-1.5 text-sm text-black/50">
              {modo === "entrar"
                ? "Entre no painel para ver seus agentes trabalhando."
                : modo === "criar"
                  ? "Em minutos você tem uma equipe de IA trabalhando por você."
                  : "Informe seu email e enviamos um link para redefinir a senha."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-black/10 bg-white p-6 shadow-xl shadow-black/[0.04]">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-black/60">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="o-teu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {modo !== "recuperar" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-medium text-black/60">
                  Senha
                </label>
                {modo === "entrar" && (
                  <button
                    type="button"
                    onClick={() => { setModo("recuperar"); setErro(null); setInfo(null); }}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={mostrar ? "text" : "password"}
                  required
                  autoComplete={modo === "entrar" ? "current-password" : "new-password"}
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
            )}

            {modo === "criar" && (
              <div>
                <label htmlFor="login-confirmar" className="mb-1.5 block text-xs font-medium text-black/60">
                  Confirmar senha
                </label>
                <input
                  id="login-confirmar"
                  type={mostrar ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="w-full rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:shadow-brand/40 disabled:opacity-50"
            >
              {loading
                ? "Um momento…"
                : modo === "entrar"
                  ? "Entrar no painel"
                  : modo === "criar"
                    ? "Criar conta grátis"
                    : "Enviar link de redefinição"}
              {!loading && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
            </button>

            {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{erro}</p>}
            {info && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{info}</p>}
          </form>

          <div className="mt-5 text-center text-sm text-black/50">
            {modo === "entrar" ? (
              <>
                Ainda não tem conta?{" "}
                <button type="button" onClick={() => setModo("criar")} className="font-semibold text-brand hover:underline">
                  Criar conta
                </button>
              </>
            ) : (
              <>
                {modo === "recuperar" ? "Lembrou a senha?" : "Já tem conta?"}{" "}
                <button type="button" onClick={() => { setModo("entrar"); setErro(null); setInfo(null); }} className="font-semibold text-brand hover:underline">
                  Entrar
                </button>
              </>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-black/35 transition hover:text-black/60">
              ← Voltar ao site
            </Link>
          </div>
        </div>
      </main>

      {/* animações */}
      <style>{`
        @keyframes lg-up{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
        .lg-up{opacity:0;animation:lg-up .65s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes lg-blob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(5%,4%) scale(1.08)}}
        .lg-blob{animation:lg-blob 9s ease-in-out infinite}
        @keyframes lg-blob2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-5%,-5%) scale(1.1)}}
        .lg-blob2{animation:lg-blob2 11s ease-in-out infinite}
        @keyframes lg-ping{75%,100%{transform:scale(2.4);opacity:0}}
        .lg-ping{animation:lg-ping 1.8s cubic-bezier(0,0,.2,1) infinite}
        @media (prefers-reduced-motion:reduce){.lg-anim{animation:none!important;opacity:1!important}}
      `}</style>
    </div>
  );
}
