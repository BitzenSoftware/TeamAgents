"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Mail, UserRound, Check } from "lucide-react";
import { api, type Departamento, type Membro } from "@/lib/api";
import { useCliente } from "@/components/cliente-context";

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
  const ehMembro = cliente?.papel === "membro";

  const [membros, setMembros] = useState<Membro[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [editar, setEditar] = useState<Membro | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api.membros().then(setMembros).catch((e) => setErro(e instanceof Error ? e.message : String(e)));
    api.departamentos().then(setDepartamentos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cliLoading && ehMembro) { router.replace("/pipeline"); return; }
    if (!cliLoading && !ehMembro) carregar();
  }, [cliLoading, ehMembro, carregar, router]);

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

      {membros.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          Nenhum utilizador convidado. Clique em <strong>Criar utilizador</strong> para convidar alguém por e-mail.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {membros.map((m) => (
            <div key={m.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"><UserRound size={18} /></span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{m.nome || m.email}</div>
                    <div className="truncate text-xs text-black/45">{m.email}</div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditar(m)} aria-label="Editar" className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-black/50 hover:bg-black/[0.03]"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm(`Remover ${m.nome || m.email}?`)) api.apagarMembro(m.id).then(carregar); }} aria-label="Remover" className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-black/40 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-black/45">
                <span>{m.permissoes.length} menu(s) · {m.departamento_ids.length} depto(s)</span>
                <span className={m.auth_user_id ? "text-emerald-600" : "text-amber-600"}>{m.auth_user_id ? "ativo" : "convite pendente"}</span>
              </div>
              {!m.auth_user_id && (
                <button onClick={() => api.reenviarConvite(m.id).then(() => alert("Convite reenviado."))}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"><Mail size={12} /> Reenviar convite</button>
              )}
            </div>
          ))}
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
