-- Integration credentials storage for provider OAuth tokens.
-- Access is restricted to admins via RLS.

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  realm_id text,
  access_token text not null,
  refresh_token text not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integration_credentials_provider on public.integration_credentials(provider);

drop trigger if exists set_updated_at_integration_credentials on public.integration_credentials;
create trigger set_updated_at_integration_credentials
before update on public.integration_credentials
for each row execute procedure public.set_updated_at();

alter table public.integration_credentials enable row level security;

create policy "Integration credentials readable by admin"
on public.integration_credentials
for select
using (public.current_app_role() = 'admin');

create policy "Integration credentials writable by admin"
on public.integration_credentials
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');