-- A global admin selects one brokerage at a time. Existing tenant RLS and
-- dashboard RPCs continue to use app.current_org_id().
create table if not exists app.global_admins (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  default_org_id uuid not null references public.orgs(id),
  created_at timestamptz not null default now()
);

alter table app.global_admins enable row level security;
revoke all on app.global_admins from public, anon, authenticated;

-- One owner agent per brokerage lets existing dashboard writes keep their
-- agent attribution. Admin agents are unavailable for automatic lead assignment.
alter table public.agents drop constraint agents_auth_user_id_key;
alter table public.agents add constraint agents_org_id_auth_user_id_key
  unique (org_id, auth_user_id);

create or replace function app.add_global_admin_agents()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.agents
    (org_id, auth_user_id, name, email, role, is_available, max_active_leads)
  select o.id, new.auth_user_id, new.name, u.email, 'owner'::agent_role, false, 0
  from public.orgs o
  join auth.users u on u.id = new.auth_user_id
  on conflict (org_id, auth_user_id) do nothing;
  return new;
end;
$$;

create trigger global_admin_agents_added
after insert on app.global_admins
for each row execute function app.add_global_admin_agents();

create or replace function app.add_org_global_admin_agents()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.agents
    (org_id, auth_user_id, name, email, role, is_available, max_active_leads)
  select new.id, g.auth_user_id, g.name, u.email, 'owner'::agent_role, false, 0
  from app.global_admins g
  join auth.users u on u.id = g.auth_user_id
  on conflict (org_id, auth_user_id) do nothing;
  return new;
end;
$$;

create trigger org_global_admin_agents_added
after insert on public.orgs
for each row execute function app.add_org_global_admin_agents();

-- The header is only honored for identities in the private global-admin table.
-- Everyone else keeps their JWT-bound brokerage, unchanged.
create or replace function app.current_org_id()
returns uuid
language plpgsql
stable security definer
set search_path = public, pg_temp
as $$
declare
  v_default_org uuid;
  v_selected text;
begin
  select default_org_id into v_default_org
  from app.global_admins
  where auth_user_id = auth.uid();

  if found then
    v_selected := coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb
        ->> 'x-crewmind-org-id',
      ''
    );
    if v_selected ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return v_selected::uuid;
    end if;
    return v_default_org;
  end if;

  return nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid;
end;
$$;

-- Only a global admin can discover all brokerage IDs for the selector.
create or replace function public.dashboard_admin_orgs()
returns jsonb
language sql
stable security definer
set search_path = public, pg_temp
as $$
  select case when exists (
    select 1 from app.global_admins where auth_user_id = auth.uid()
  ) then coalesce((
    select jsonb_agg(
      jsonb_build_object('id', id, 'name', name, 'slug', slug, 'is_demo', is_demo)
      order by name
    ) from public.orgs
  ), '[]'::jsonb)
  else '[]'::jsonb end;
$$;

revoke all on function public.dashboard_admin_orgs() from public, anon;
grant execute on function public.dashboard_admin_orgs() to authenticated;
