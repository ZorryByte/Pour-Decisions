-- Aditiva e idempotente. Cada cuenta solo puede consultar sus propias elecciones.
begin;
create table if not exists public.elecciones_personales (
  id uuid primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  coctel text not null check (char_length(coctel) between 1 and 160),
  elecciones jsonb not null check (jsonb_typeof(elecciones) = 'object'),
  creado_at timestamptz not null default now()
);
create index if not exists elecciones_personales_usuario_fecha
  on public.elecciones_personales (usuario_id, creado_at desc, id desc);
alter table public.elecciones_personales enable row level security;
alter table public.elecciones_personales force row level security;
revoke all on public.elecciones_personales from public, anon, authenticated;
grant select, insert, update on public.elecciones_personales to authenticated;
drop policy if exists propietario on public.elecciones_personales;
create policy propietario on public.elecciones_personales for all to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
commit;
