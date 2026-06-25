-- =====================================================================
-- TeamAgents — Migração 042: Foto (avatar) dos utilizadores
-- Adiciona a coluna avatar_url em membros e cria o bucket público de
-- Storage "avatars" com políticas para upload pelo dono autenticado.
-- =====================================================================

alter table membros add column if not exists avatar_url text;

-- Bucket público para as fotos dos utilizadores.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Leitura pública das imagens (bucket público).
do $$ begin
  create policy "avatars_public_read" on storage.objects
    for select using (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;

-- Usuários autenticados podem enviar/atualizar/remover no bucket avatars.
do $$ begin
  create policy "avatars_auth_insert" on storage.objects
    for insert to authenticated with check (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "avatars_auth_update" on storage.objects
    for update to authenticated using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "avatars_auth_delete" on storage.objects
    for delete to authenticated using (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;
