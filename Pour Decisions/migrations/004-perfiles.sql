-- Migración ADITIVA: ejecutar una vez (se puede repetir). No ejecutar supabase.sql
-- sobre una base existente: ese archivo inicial borra las tablas del evento.
begin;

create table if not exists public.perfiles_personales (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  preferencias jsonb not null default '{}'::jsonb check (jsonb_typeof(preferencias) = 'object'),
  actualizado_at timestamptz not null default now()
);
create table if not exists public.cocteles_guardados (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  coctel text not null check (char_length(coctel) between 1 and 160),
  elecciones jsonb not null default '{}'::jsonb check (jsonb_typeof(elecciones) = 'object'),
  creado_at timestamptz not null default now(),
  primary key (usuario_id, coctel)
);
create table if not exists public.reacciones_cocteles (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  coctel text not null check (char_length(coctel) between 1 and 160),
  reaccion text check (reaccion in ('like', 'dislike')),
  motivo text check (motivo in ('dulzor', 'textura', 'intensidad', 'ingredientes', 'otra')),
  probado_gusto boolean not null default false,
  actualizado_at timestamptz not null default now(),
  primary key (usuario_id, coctel),
  check (motivo is null or reaccion = 'dislike')
);

-- Un único favorito da cara al perfil. Se elimina el avatar si se quita esa
-- receta de la colección; no se modifica el resto de recetas ni reacciones.
create table if not exists public.avatares_personales (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  coctel text not null,
  personalidad text not null check (personalidad in (
    'escandaloso','bocon','apuntado','siempre','patron','exigente',
    'inventado','popular','callejero','chismoso','enamorado','fresco'
  )),
  actualizado_at timestamptz not null default now(),
  foreign key (usuario_id, coctel) references public.cocteles_guardados(usuario_id, coctel) on delete cascade
);

alter table public.perfiles_personales enable row level security;
alter table public.cocteles_guardados enable row level security;
alter table public.reacciones_cocteles enable row level security;
alter table public.perfiles_personales force row level security;
alter table public.cocteles_guardados force row level security;
alter table public.reacciones_cocteles force row level security;
alter table public.avatares_personales enable row level security;
alter table public.avatares_personales force row level security;

revoke all on public.perfiles_personales, public.cocteles_guardados, public.reacciones_cocteles from public, anon, authenticated;
grant select, insert, update, delete on public.perfiles_personales, public.cocteles_guardados, public.reacciones_cocteles to authenticated;
revoke all on public.avatares_personales from public, anon, authenticated;
grant select, insert, update, delete on public.avatares_personales to authenticated;

drop policy if exists propietario on public.perfiles_personales;
create policy propietario on public.perfiles_personales for all to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
drop policy if exists propietario on public.cocteles_guardados;
create policy propietario on public.cocteles_guardados for all to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
drop policy if exists propietario on public.reacciones_cocteles;
create policy propietario on public.reacciones_cocteles for all to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
drop policy if exists propietario on public.avatares_personales;
create policy propietario on public.avatares_personales for all to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

commit;
