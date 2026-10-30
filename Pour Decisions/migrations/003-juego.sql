-- Selector de cócteles, juego.
-- Pegar en Supabase → SQL Editor y ejecutar una vez, cuando el esquema base ya existe.
-- No borra eventos, personas ni respuestas.
-- No vuelvas a ejecutar supabase.sql: ese archivo sí las borra.
--
-- Si la página no ve las funciones nuevas: Project Settings → API → Reload schema.

begin;

alter table public.respuestas drop constraint if exists respuestas_arquetipo_check;
alter table public.respuestas add constraint respuestas_arquetipo_check
  check (
    arquetipo is null or arquetipo in (
      'El Atrevido',
      'El Improvisado',
      'La Dulce Peligrosa',
      'El Tropical Sin Remedio',
      'El Ácido de Confianza',
      'La Cremosa de Después',
      'La Brisa que se Queda',
      'El de Mesa Baja',
      'El Escandaloso', 'El Bocón', 'El Que Se Apunta a Todo',
      'El de Siempre', 'El Patrón', 'El Exigente',
      'El Inventado', 'El Popular', 'El Callejero',
      'El Chismoso', 'El Enamorado', 'El Fresco'
    )
  );

comment on column public.respuestas.arquetipo is
  'Personaje de esa partida: doce perfiles de Fuego, Tierra, Aire y Agua. Se conservan los ocho nombres anteriores para respuestas históricas.';

drop function if exists public.registrar_respuesta(text, uuid, text, text, text[], text[], text, text, text[], text, text);
drop function if exists public.registrar_respuesta(text, uuid, text, text, text[], text[], text, text, text[], text, text, text);

-- Igual que antes, y además guarda el arquetipo.
-- Devuelve el id de la persona y el id de la respuesta recién creada.
create function public.registrar_respuesta(
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
  p_coctel text,
  p_arquetipo text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento uuid;
  v_persona uuid;
  v_respuesta uuid;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_contacto text := nullif(btrim(coalesce(p_contacto, '')), '');
  v_slug text := nullif(btrim(coalesce(p_slug, '')), '');
  v_arquetipo text := nullif(btrim(coalesce(p_arquetipo, '')), '');
begin
  if v_nombre = '' then
    raise exception 'nombre_vacio';
  end if;
  if btrim(coalesce(p_coctel, '')) = '' then
    raise exception 'sin_coctel';
  end if;
  if v_arquetipo is not null and v_arquetipo not in (
    'El Atrevido',
    'El Improvisado',
    'La Dulce Peligrosa',
    'El Tropical Sin Remedio',
    'El Ácido de Confianza',
    'La Cremosa de Después',
    'La Brisa que se Queda',
    'El de Mesa Baja',
    'El Escandaloso', 'El Bocón', 'El Que Se Apunta a Todo',
    'El de Siempre', 'El Patrón', 'El Exigente',
    'El Inventado', 'El Popular', 'El Callejero',
    'El Chismoso', 'El Enamorado', 'El Fresco'
  ) then
    v_arquetipo := null;
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
    v_arquetipo
  )
  returning id into v_respuesta;

  return jsonb_build_object('persona_id', v_persona, 'respuesta_id', v_respuesta);
end;
$$;

drop function if exists public.coincidencias(uuid);

-- Tres personas de la misma fiesta. Solo nombre de pila y porcentaje.
-- anon no puede leer las tablas; entra por esta función.
create function public.coincidencias(p_respuesta_id uuid)
returns table (nombre text, porcentaje integer)
language sql
stable
security definer
set search_path = public
as $$
  with yo as (
    select *
    from respuestas
    where id = p_respuesta_id
  ),
  otras as (
    select distinct on (r.persona_id)
      r.alcohol,
      r.frutas,
      r.estilo,
      r.fuerza,
      split_part(btrim(p.nombre), ' ', 1) as pila
    from respuestas r
    join personas p on p.id = r.persona_id
    join yo on yo.evento_id = r.evento_id
    where r.persona_id <> yo.persona_id
    order by r.persona_id, r.created_at desc
  ),
  puntos as (
    select
      o.pila,
      (
        case
          when cardinality(yo.alcohol) = 0 and cardinality(o.alcohol) = 0 then 40::numeric
          when cardinality(yo.alcohol) = 0 or cardinality(o.alcohol) = 0 then 0::numeric
          else 40::numeric * (
            select count(*)::numeric from (
              select unnest(yo.alcohol)
              intersect
              select unnest(o.alcohol)
            ) a_hit
          ) / nullif((
            select count(*)::numeric from (
              select unnest(yo.alcohol)
              union
              select unnest(o.alcohol)
            ) a_all
          ), 0)
        end
        +
        case
          when cardinality(yo.frutas) = 0 and cardinality(o.frutas) = 0 then 30::numeric
          when cardinality(yo.frutas) = 0 or cardinality(o.frutas) = 0 then 15::numeric
          else 30::numeric * (
            select count(*)::numeric from (
              select unnest(yo.frutas)
              intersect
              select unnest(o.frutas)
            ) f_hit
          ) / nullif((
            select count(*)::numeric from (
              select unnest(yo.frutas)
              union
              select unnest(o.frutas)
            ) f_all
          ), 0)
        end
        + case when yo.estilo is not null and yo.estilo = o.estilo then 15 else 0 end
        + case when yo.fuerza is not null and yo.fuerza = o.fuerza then 15 else 0 end
      ) as pts
    from otras o
    cross join yo
  )
  select
    s.pila,
    least(100, greatest(0, round(s.pts)::int))
  from puntos s
  where s.pila <> ''
  order by 2 desc, 1
  limit 3;
$$;

revoke all on function public.registrar_respuesta(text, uuid, text, text, text[], text[], text, text, text[], text, text, text) from public;
revoke all on function public.coincidencias(uuid) from public;
grant execute on function public.registrar_respuesta(text, uuid, text, text, text[], text[], text, text, text[], text, text, text) to anon;
grant execute on function public.coincidencias(uuid) to anon;

comment on function public.coincidencias(uuid) is
  'Tres personas de la misma fiesta. Solo nombre de pila y porcentaje.';

commit;
