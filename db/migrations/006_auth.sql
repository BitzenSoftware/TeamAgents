-- =====================================================================
-- TeamAgents — Migração 006: Ligar tenants ao Supabase Auth
-- Aplicar DEPOIS de 005.
-- =====================================================================

-- Um utilizador autenticado tem no máximo UM cliente.
-- (auth_user_id é nullable; vários NULL são permitidos — só endurece quando há valor.)
alter table clientes
  drop constraint if exists uq_clientes_auth_user;
alter table clientes
  add constraint uq_clientes_auth_user unique (auth_user_id);

-- Recriar onboard_tenant com auth_user_id (assinatura muda -> drop + create).
drop function if exists onboard_tenant(text, text, text, text, text, text);

create or replace function onboard_tenant(
  p_auth_user_id           uuid,
  p_nome_empresa           text,
  p_whatsapp_instance_name text,
  p_whatsapp_token         text,
  p_whatsapp_api_url       text,
  p_calendario_link        text,
  p_whatsapp_dono          text
)
returns table (cliente_id uuid, workspace_config_id uuid)
language plpgsql
as $$
declare
  v_cliente_id uuid;
  v_config_id  uuid;
begin
  insert into clientes (nome, auth_user_id)
    values (p_nome_empresa, p_auth_user_id)
    returning id into v_cliente_id;

  insert into workspace_configs (
    cliente_id, whatsapp_instance_name, whatsapp_token,
    whatsapp_api_url, calendario_link, whatsapp_dono
  )
    values (
      v_cliente_id, p_whatsapp_instance_name, p_whatsapp_token,
      p_whatsapp_api_url, p_calendario_link, p_whatsapp_dono
    )
    returning id into v_config_id;

  return query select v_cliente_id, v_config_id;
end;
$$;
