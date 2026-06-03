-- =====================================================================
-- TeamAgents — Migração 005: Função de onboarding ATÓMICO
-- Cria cliente + workspace_config numa única transação.
-- Se qualquer insert falhar (ex.: instância duplicada -> unique_violation),
-- TUDO é revertido automaticamente — sem clientes órfãos.
-- Chamada via PostgREST RPC: supabase.rpc("onboard_tenant", {...}).
-- =====================================================================

create or replace function onboard_tenant(
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
  insert into clientes (nome)
    values (p_nome_empresa)
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
