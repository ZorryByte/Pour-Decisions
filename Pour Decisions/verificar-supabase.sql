-- Solo lectura. Ejecutar en el SQL Editor de Supabase después de las migraciones.
-- Deben aparecer siete tablas presentes con RLS habilitado y forzado.
with esperadas(nombre) as (
  values ('eventos'), ('personas'), ('respuestas'), ('perfiles_personales'),
         ('cocteles_guardados'), ('reacciones_cocteles'), ('avatares_personales')
)
select e.nombre, c.oid is not null as presente,
       coalesce(c.relrowsecurity, false) as rls_habilitado,
       coalesce(c.relforcerowsecurity, false) as rls_forzado
from esperadas e
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = e.nombre and c.relkind = 'r'
order by e.nombre;

-- Las tres deben existir con el permiso anónimo que consume el juego.
with esperadas(firma) as (
  values
    ('public.registrar_respuesta(text,uuid,text,text,text[],text[],text,text,text[],text,text,text)'),
    ('public.coincidencias(uuid)'),
    ('public.borrar_mis_datos(uuid,text)')
)
select firma, to_regprocedure(firma) is not null as presente,
       has_function_privilege('anon', to_regprocedure(firma), 'EXECUTE') as ejecutable_anon
from esperadas;

-- Revisar políticas de propietario; no devuelve datos de usuarios.
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Debe haber un evento activo si se usará el juego sin ?evento=slug.
select count(*) as eventos_activos from public.eventos where activo;
