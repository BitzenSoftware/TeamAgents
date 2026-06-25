"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Mail, UserRound, Check, Camera, Loader2 } from "lucide-react";
import { api, type Departamento, type Membro } from "@/lib/api";
import { useCliente } from "@/components/cliente-context";
import { useAuth } from "@/components/auth-context";
import { supabase } from "@/lib/supabase";

// Menus que podem ser concedidos a um membro (chave = href, igual ao Shell).
const MENUS: { href: string; label: string }[] = [
  { href: "/pipeline", label: "Agente SDR" },
  { href: "/campanhas", label: "Agente de Copywriting" },
  { href: "/executivo", label: "Agente Executivo" },
  { href: "/assistentes", label: "Assistentes" },
  { href: "/gestao", label: "Gestão" },
  { href: "/profissionais", label: "Profissionais" },
  { href: "/servicos", label: "Serviços" },
  { href: "/agenda", label: "Agenda" },
  { href: "/habilidades", label: "Habilidades" },
  { href: "/consumo", label: "Consumo" },
  { href: "/configuracoes", label: "Configurações" },
  { href: "/suporte", label: "Suporte" },
  { href: "/guia", label: "Guia do Usuário" },
];

export default function UtilizadoresPage() {
  const router = useRouter();
  const { cliente, loading: cliLoading } = useCliente();
  const { session } = useAuth();
  const ehMembro = cliente?.papel === "membro";

  const [membros, setMembros] = useState<Membro[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [editar, setEditar] = useState<Membro | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api.membros().then(setMembros).catch((e) => setErro(e instanceof Error ? e.message : String(e)));
    api.departamentos().then(setDepartamentos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cliLoading && ehMembro) { router.replace("/pipeline"); return; }
    if (!cliLoading && !ehMembro) carregar();
  }, [cliLoading, ehMembro, carregar, router]);

  const nomeDepto = useCallback(
    (id: string) => departamentos.find((d) => d.id === id)?.nome ?? null,
    [departamentos],
  );

  async function enviarFoto(m: Membro, file: File) {
    if (enviandoFoto) return;
    setErro(null); setEnviandoFoto(m.id);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${m.id}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`; // fura cache do CDN
      await api.atualizarMembro(m.id, { avatar_url: url });
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviandoFoto(null);
    }
  }

  if (!cliLoading && ehMembro) return null;

  return (
    <div className="p-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Utilizadores</h1>
          <p className="text-sm text-black/50">Convide pessoas, defina permissões e departamentos. Todos compartilham o mesmo saldo de créditos da empresa.</p>
        </div>
        <button onClick={() => setEditar("novo")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={16} /> Criar utilizador
        </button>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {(
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-[11px] font-semibold uppercase tracking-wider text-black/40">
                <th className="px-4 py-3 font-semibold">Utilizador</th>
                <th className="px-4 py-3 font-semibold">E-mail</th>
                <th className="px-4 py-3 font-semibold">Departamentos</th>
                <th className="w-px px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {/* Dono da empresa (admin) — não é um membro convidado; sempre no topo. */}
              <tr className="border-b border-black/[0.06] bg-brand/[0.03]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/15 text-brand"><UserRound size={18} /></span>
                    <div className="min-w-0">
                      <div className="max-w-[18rem] truncate font-semibold text-ink">{cliente?.nome || "Administrador"}</div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">Admin · dono</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-black/60"><div className="truncate">{session?.user.email ?? "—"}</div></td>
                <td className="px-4 py-3 text-black/50">Todos os departamentos</td>
                <td className="px-4 py-3" />
              </tr>
              {membros.map((m) => {
                const nomesDepto = m.departamento_ids.map(nomeDepto).filter(Boolean) as string[];
                return (
                  <tr key={m.id} className="border-b border-black/[0.06] last:border-0 hover:bg-black/[0.015]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <label
                          title="Adicionar/alterar foto"
                          className="group relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-brand/10 text-brand"
                        >
                          {m.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatar_url} alt={m.nome || m.email} className="h-full w-full object-cover" />
                          ) : (
                            <UserRound size={18} />
                          )}
                          {enviandoFoto === m.id ? (
                            <span className="absolute inset-0 grid place-items-center bg-black/45 text-white"><Loader2 size={14} className="animate-spin" /></span>
                          ) : (
                            <span className="absolute inset-0 hidden place-items-center bg-black/45 text-white group-hover:grid"><Camera size={14} /></span>
                          )}
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarFoto(m, f); e.currentTarget.value = ""; }} />
                        </label>
                        <div className="min-w-0">
                          <button onClick={() => setEditar(m)}
                            className="block max-w-[18rem] truncate text-left font-semibold text-ink hover:text-brand hover:underline">
                            {m.nome || "(sem nome)"}
                          </button>
                          <span className={`text-[11px] ${m.auth_user_id ? "text-emerald-600" : "text-amber-600"}`}>
                            {m.auth_user_id ? "ativo" : "convite pendente"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-black/60">
                      <div className="truncate">{m.email}</div>
                      {!m.auth_user_id && (
                        <button onClick={() => api.reenviarConvite(m.id).then(() => alert("Convite reenviado."))}
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"><Mail size={11} /> Reenviar convite</button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {nomesDepto.length === 0 ? (
                        <span className="text-black/30">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {nomesDepto.map((n) => (
                            <span key={n} className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-black/60">{n}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { if (confirm(`Remover ${m.nome || m.email}?`)) api.apagarMembro(m.id).then(carregar); }}
                        aria-label="Remover" className="grid h-8 w-8 place-items-center rounded-lg text-black/35 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
              {membros.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-black/40">
                    Nenhum utilizador convidado ainda. Clique em <strong>Criar utilizador</strong> para convidar alguém por e-mail.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editar && (
        <ModalMembro
          membro={editar === "novo" ? null : editar}
          departamentos={departamentos}
          onClose={() => setEditar(null)}
          onSaved={() => { setEditar(null); carregar(); }}
        />
      )}
    </div>
  );
}

function ModalMembro({ membro, departamentos, onClose, onSaved }: {
  membro: Membro | null; departamentos: Departamento[]; onClose: () => void; onSaved: () => void;
}) {
  const [aba, setAba] = useState<"dados" | "permissoes" | "departamentos">("dados");
  const [nome, setNome] = useState(membro?.nome ?? "");
  const [email, setEmail] = useState(membro?.email ?? "");
  const [perms, setPerms] = useState<string[]>(membro?.permissoes ?? []);
  const [deps, setDeps] = useState<string[]>(membro?.departamento_ids ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function salvar() {
    if (salvando) return;
    if (!membro && !email.trim()) { setErro("Informe o e-mail."); setAba("dados"); return; }
    setSalvando(true); setErro(null);
    try {
      if (membro) await api.atualizarMembro(membro.id, { nome: nome.trim(), permissoes: perms, departamento_ids: deps });
      else await api.criarMembro({ nome: nome.trim(), email: email.trim(), permissoes: perms, departamento_ids: deps });
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e)); setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-semibold">{membro ? `Editar — ${membro.nome || membro.email}` : "Criar utilizador"}</h2>
        </div>
        <div className="flex gap-1 border-b border-black/10 px-3">
          {(["dados", "permissoes", "departamentos"] as const).map((a) => (
            <button key={a} onClick={() => setAba(a)}
              className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${aba === a ? "border-brand text-brand" : "border-transparent text-black/50 hover:text-ink"}`}>
              {a === "dados" ? "Dados" : a === "permissoes" ? "Permissões" : "Departamentos"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {aba === "dados" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-black/55">Nome</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da pessoa"
                  className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black/55">E-mail</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!membro} type="email" placeholder="email@empresa.com"
                  className={`${inputCls} ${membro ? "bg-black/[0.03] text-black/50" : ""}`} />
                {!membro && <p className="mt-1 text-[11px] text-black/40">Enviaremos um convite por e-mail para esta pessoa definir a senha.</p>}
              </div>
            </div>
          )}

          {aba === "permissoes" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-black/50">Marque os menus que este usuário pode ver.</p>
                <div className="flex gap-2 text-[11px]">
                  <button onClick={() => setPerms(MENUS.map((m) => m.href))} className="font-medium text-brand hover:underline">Todos</button>
                  <button onClick={() => setPerms([])} className="text-black/40 hover:underline">Nenhum</button>
                </div>
              </div>
              <div className="space-y-0.5">
                {MENUS.map((mn) => (
                  <label key={mn.href} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-black/[0.03]">
                    <input type="checkbox" checked={perms.includes(mn.href)} onChange={() => toggle(perms, setPerms, mn.href)} />
                    {mn.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {aba === "departamentos" && (
            <div>
              <p className="mb-2 text-xs text-black/50">O usuário só verá os projetos dos departamentos marcados.</p>
              {departamentos.length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">Nenhum departamento criado ainda (menu Gestão).</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {departamentos.map((d) => {
                    const on = deps.includes(d.id);
                    return (
                      <button key={d.id} type="button" onClick={() => toggle(deps, setDeps, d.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-brand bg-brand/10 text-brand" : "border-black/15 text-black/60 hover:bg-black/[0.03]"}`}>
                        {on && <Check size={12} />} {d.nome}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {erro && <p className="mx-5 mb-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{erro}</p>}
        <div className="flex justify-end gap-2 border-t border-black/10 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
            {salvando ? "Salvando…" : membro ? "Salvar" : "Convidar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
