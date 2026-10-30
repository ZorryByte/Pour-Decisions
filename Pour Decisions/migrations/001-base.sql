-- Selector de cócteles. Pegar en Supabase → SQL Editor y ejecutar una vez.
-- Volver a ejecutarlo borra eventos, personas y respuestas.
--
-- La anon key no puede leer, editar ni borrar las tablas.
-- Puede insertar, y puede llamar dos funciones:
--   registrar_respuesta  crea o reutiliza a la persona y guarda su fila
--   borrar_mis_datos     borra solo a esa persona si el id y el nombre coinciden
-- Sin esas funciones la página no puede devolver el id ni cumplir «Borrar mis datos»,
-- porque un select o un delete abierto mostrarían o borrarían a los demás.
-- El panel de Supabase sigue pudiendo leer: entra como superusuario.
--
-- El link usa el slug: ?evento=fiesta-nov-2026
-- Si el link no trae evento, se usa la única fila con activo = true.
-- Crea la próxima fiesta en el editor de tablas (slug, nombre, fecha, activo).
-- Solo una puede tener activo = true.

drop view if exists public.perfil_persona;
drop function if exists public.registrar_respuesta(text, uuid, text, text, text[], text[], text, text, text[], text, text);
drop function if exists public.borrar_mis_datos(uuid, text);
drop table if exists public.respuestas;
drop table if exists public.personas;
drop table if exists public.eventos;

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (char_length(btrim(nombre)) > 0),
  fecha date,
  activo boolean not null default false
);

create unique index eventos_solo_uno_activo
  on public.eventos (activo)
  where activo;

create table public.personas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) > 0),
  contacto text check (contacto is null or char_length(btrim(contacto)) > 0),
  created_at timestamptz not null default now()
);

create unique index personas_nombre_contacto
  on public.personas (lower(nombre), lower(contacto))
  where contacto is not null;

create table public.respuestas (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  evento_id uuid not null references public.eventos (id),
  created_at timestamptz not null default now(),
  alcohol text[] not null default '{}',
  frutas text[] not null default '{}',
  estilo text check (estilo is null or estilo in ('Dulce', 'Ácido', 'Cremoso', 'Refrescante', 'Suave')),
  fuerza text check (fuerza is null or fuerza in ('Suave', 'Medio', 'Fuerte')),
  alergias text[] not null default '{}',
  plan_sabado text check (
    plan_sabado is null or plan_sabado in (
      'Fiesta hasta tarde', 'Tarde de playa', 'Cena tranquila', 'Aventura improvisada'
    )
  ),
  coctel_recomendado text not null check (char_length(btrim(coctel_recomendado)) > 0),
  arquetipo text
);

comment on table public.eventos is 'Una fila por fiesta. El slug es el ?evento= del link.';
comment on table public.personas is 'Quien contesta. Se reutiliza si vuelve en el mismo celular o si coinciden nombre y contacto.';
comment on table public.respuestas is 'Una fila por vez que alguien guarda su trago. arquetipo queda vacío a propósito.';
comment on column public.respuestas.estilo is 'Un solo estilo: dulce, ácido, cremoso, refrescante o suave.';
comment on column public.respuestas.arquetipo is 'Reservado. Todavía no se llena.';

create index respuestas_persona on public.respuestas (persona_id, created_at desc);
create index respuestas_evento on public.respuestas (evento_id);

alter table public.eventos enable row level security;
alter table public.personas enable row level security;
alter table public.respuestas enable row level security;
alter table public.eventos force row level security;
alter table public.personas force row level security;
alter table public.respuestas force row level security;

revoke all on table public.eventos from public, anon, authenticated;
revoke all on table public.personas from public, anon, authenticated;
revoke all on table public.respuestas from public, anon, authenticated;

grant insert on table public.personas to anon;
grant insert on table public.respuestas to anon;

create policy "personas_insert_anon"
  on public.personas
  for insert
  to anon
  with check (true);

create policy "respuestas_insert_anon"
  on public.respuestas
  for insert
  to anon
  with check (true);

-- La página no selecciona filas. Esta función devuelve solo el id de quien acaba de guardar.
create or replace function public.registrar_respuesta(
  p_slug text,
  p_persona_id uuid,
  p_nombre text,
  p_contacto text,
  p_alcohol text[],
  p_frutas text[],
  p_estilo text,
  p_fuerza text,
  p_alergias text[],
  p_plan text,
  p_coctel text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento uuid;
  v_persona uuid;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_contacto text := nullif(btrim(coalesce(p_contacto, '')), '');
  v_slug text := nullif(btrim(coalesce(p_slug, '')), '');
begin
  if v_nombre = '' then
    raise exception 'nombre_vacio';
  end if;
  if btrim(coalesce(p_coctel, '')) = '' then
    raise exception 'sin_coctel';
  end if;

  if v_slug is not null then
    select id into v_evento from eventos where lower(slug) = lower(v_slug);
    if v_evento is null then
      raise exception 'sin_evento';
    end if;
  else
    select id into v_evento from eventos where activo limit 1;
    if v_evento is null then
      raise exception 'sin_evento';
    end if;
  end if;

  if p_persona_id is not null then
    select id into v_persona from personas where id = p_persona_id;
  end if;

  if v_persona is null and v_contacto is not null then
    select id into v_persona
    from personas
    where lower(btrim(nombre)) = lower(v_nombre)
      and lower(btrim(contacto)) = lower(v_contacto)
    order by created_at
    limit 1;
  end if;

  if v_persona is null then
    insert into personas (nombre, contacto)
    values (v_nombre, v_contacto)
    returning id into v_persona;
  else
    update personas
    set contacto = coalesce(v_contacto, contacto)
    where id = v_persona;
  end if;

  insert into respuestas (
    persona_id, evento_id, alcohol, frutas, estilo, fuerza,
    alergias, plan_sabado, coctel_recomendado, arquetipo
  ) values (
    v_persona,
    v_evento,
    coalesce(p_alcohol, '{}'),
    coalesce(p_frutas, '{}'),
    nullif(btrim(coalesce(p_estilo, '')), ''),
    nullif(btrim(coalesce(p_fuerza, '')), ''),
    coalesce(p_alergias, '{}'),
    nullif(btrim(coalesce(p_plan, '')), ''),
    btrim(p_coctel),
    null
  );

  return v_persona;
end;
$$;

-- Borra a una persona y, por cascade, sus respuestas. Exige id y nombre.
create or replace function public.borrar_mis_datos(
  p_persona_id uuid,
  p_nombre text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if p_persona_id is null or btrim(coalesce(p_nombre, '')) = '' then
    raise exception 'no_coincide';
  end if;
  delete from personas
  where id = p_persona_id
    and lower(btrim(nombre)) = lower(btrim(p_nombre));
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'no_coincide';
  end if;
end;
$$;

revoke all on function public.registrar_respuesta(text, uuid, text, text, text[], text[], text, text, text[], text, text) from public;
revoke all on function public.borrar_mis_datos(uuid, text) from public;
grant execute on function public.registrar_respuesta(text, uuid, text, text, text[], text[], text, text, text[], text, text) to anon;
grant execute on function public.borrar_mis_datos(uuid, text) to anon;

-- Perfil para el organizador, en el SQL Editor. La web no puede leer esta vista.
create view public.perfil_persona
with (security_invoker = true) as
select
  p.id as persona_id,
  p.nombre,
  p.contacto,
  (
    select coalesce(array_agg(s.eleccion order by s.eleccion), '{}')
    from (
      select u.eleccion, count(*) as n
      from respuestas r
      cross join unnest(r.alcohol) as u(eleccion)
      where r.persona_id = p.id
      group by u.eleccion
    ) s
    where s.n = (
      select max(m.n)
      from (
        select count(*) as n
        from respuestas r
        cross join unnest(r.alcohol) as u(eleccion)
        where r.persona_id = p.id
        group by u.eleccion
      ) m
    )
  ) as alcoholes_frecuentes,
  (
    select coalesce(array_agg(s.eleccion order by s.eleccion), '{}')
    from (
      select u.eleccion, count(*) as n
      from respuestas r
      cross join unnest(r.frutas) as u(eleccion)
      where r.persona_id = p.id
      group by u.eleccion
    ) s
    where s.n = (
      select max(m.n)
      from (
        select count(*) as n
        from respuestas r
        cross join unnest(r.frutas) as u(eleccion)
        where r.persona_id = p.id
        group by u.eleccion
      ) m
    )
  ) as frutas_frecuentes,
  (
    select r.estilo
    from respuestas r
    where r.persona_id = p.id and r.estilo is not null
    group by r.estilo
    order by count(*) desc, r.estilo
    limit 1
  ) as estilo_habitual,
  (
    select coalesce(array_agg(distinct g.alergia order by g.alergia), '{}')
    from respuestas r
    cross join unnest(r.alergias) as g(alergia)
    where r.persona_id = p.id
      and g.alergia <> 'Ninguna'
  ) as alergias
from personas p;

revoke all on table public.perfil_persona from public, anon, authenticated;

insert into public.eventos (slug, nombre, fecha, activo)
values ('fiesta-nov-2026', 'Fiesta de noviembre', '2026-11-15', true);

-- Consultas de compra. Ejecútalas aparte, cuando ya haya respuestas.
-- Usan la respuesta más reciente de cada persona en la fiesta activa.
--
-- (a) Personas por alcohol
-- with ultima as (
--   select distinct on (r.persona_id) r.*
--   from public.respuestas r
--   join public.eventos e on e.id = r.evento_id
--   where e.activo
--   order by r.persona_id, r.created_at desc
-- )
-- select a.eleccion, count(*) as personas
-- from ultima u
-- cross join unnest(u.alcohol) as a(eleccion)
-- group by a.eleccion
-- order by personas desc, a.eleccion;
--
-- (b) Personas por fruta
-- with ultima as (
--   select distinct on (r.persona_id) r.*
--   from public.respuestas r
--   join public.eventos e on e.id = r.evento_id
--   where e.activo
--   order by r.persona_id, r.created_at desc
-- )
-- select f.eleccion, count(*) as personas
-- from ultima u
-- cross join unnest(u.frutas) as f(eleccion)
-- group by f.eleccion
-- order by personas desc, f.eleccion;
--
-- (c) Personas por cóctel recomendado
-- with ultima as (
--   select distinct on (r.persona_id) r.*
--   from public.respuestas r
--   join public.eventos e on e.id = r.evento_id
--   where e.activo
--   order by r.persona_id, r.created_at desc
-- )
-- select coctel_recomendado, count(*) as personas
-- from ultima
-- group by coctel_recomendado
-- order by personas desc, coctel_recomendado;
