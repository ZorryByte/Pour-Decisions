-- Ejecutar en SQL Editor si se conecta una base existente al nuevo mazo.
-- Conserva las respuestas anteriores y la firma de registrar_respuesta.
begin;

alter table public.respuestas drop constraint if exists respuestas_estilo_check;
alter table public.respuestas add constraint respuestas_estilo_check check (
  estilo is null or string_to_array(estilo, ', ') <@ array[
    'Dulce', 'Ácido', 'Cremoso', 'Refrescante', 'Suave',
    'Espumoso', 'Granizado', 'Sedoso'
  ]::text[]
);

comment on column public.respuestas.estilo is
  'Preferencias aceptadas, separadas por coma y espacio; null si no hay preferencia.';

commit;
