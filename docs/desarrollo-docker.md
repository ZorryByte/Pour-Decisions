# Paso 1: entorno de desarrollo

## Elección técnica

Node.js 24 Alpine y Vite 8 sirven la interfaz original recuperada con recarga automática.
Vite es el servidor de desarrollo y empaquetador del frontend; no sustituye un
backend de negocio. Supabase ofrece actualmente la API y autenticación.
La interfaz original está organizada bajo `/src`; la extracción completa MVVM
está pendiente. Consulta `arquitectura-modular.md` y `restauracion-interfaz.md`.

## Qué incluye Compose

- `app`: interfaz actual con Vite, en http://localhost:5173.
- `db` (opcional, perfil `sql-local`): PostgreSQL 16 en `localhost:54322`, con volumen persistente.

Por defecto solo arranca `app`, conectada al Supabase indicado en `.env`.
Para publicar en Vercel seguir `despliegue-vercel-supabase.md`; Docker no se ejecuta allí.

**Son dos destinos distintos:** la interfaz consume la URL HTTP de Supabase
indicada en `.env`; PostgreSQL local sirve para importar y probar los SQL.
El navegador no puede conectarse directamente a PostgreSQL. Este Compose no
implementa las API REST, Auth ni Realtime de Supabase. Dentro de Docker, un futuro
backend usaría el host `db` y puerto `5432`; nunca esas credenciales en la UI.

Los SQL existentes dependen de `anon`, `authenticated`, `auth.users` y
`auth.uid()`. `database/local/00-supabase-compat.sql` crea únicamente lo necesario
para ejecutarlos en PostgreSQL vacío. La tabla local `auth.users` solo tiene `id`;
no permite registro, inicio de sesión ni validación de JWT. Tampoco demuestra
paridad de seguridad con Supabase. No aplicar este archivo a Supabase real.

## Primer inicio (PowerShell)

Requisitos: Docker Desktop iniciado, con contenedores Linux y Compose v2.
Node y npm en el equipo no son necesarios para ejecutar los contenedores.

```powershell
Copy-Item .env.example .env
```

Editar `.env`: cambiar `POSTGRES_PASSWORD` y completar URL y clave pública
(`anon` o publishable) de un proyecto Supabase de desarrollo si se desea usar
persistencia y cuenta. Dejar las variables públicas vacías permite revisar la UI
sin conexión. No apuntar a producción para hacer pruebas.

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail=80 app
```

Abrir http://localhost:5173. El montaje conserva la edición de archivos desde el
equipo. El polling ayuda a detectar cambios en Docker Desktop sobre Windows.
Si cambia `.env`, recrear `app` con `docker compose up -d --force-recreate app`.

Los módulos reciben las dos variables públicas mediante `import.meta.env`.
La configuración de Vite expone únicamente URL y clave pública; nunca las
credenciales PostgreSQL. Abrir `index.html` directamente no procesa los módulos: usar
la URL de Vite. También se admite `npm ci` y `npm run dev` fuera de Docker.

## Inicialización y revisión SQL

Para activar PostgreSQL local ejecutar `docker compose --profile sql-local up -d db`.

En un volumen nuevo se ejecutan, en orden: compatibilidad local, `database/migrations/001-base.sql`,
`database/migrations/002-estilos.sql`, `database/migrations/003-juego.sql` y `database/migrations/004-perfiles.sql`.
Las rutas de Compose ya apuntan a `/database/migrations`.

```powershell
docker compose exec db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt public.*"'
docker compose exec db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt auth.*"'
```

Los scripts de inicio solo corren con el volumen vacío; editar SQL o reiniciar
contenedores no los vuelve a ejecutar. `database/migrations/001-base.sql` borra tablas: no ejecutarlo
sobre datos que deban conservarse. Ante un fallo de inicialización, revisar logs
y corregirlo antes de reutilizar esa base parcialmente inicializada.

```powershell
docker compose stop
docker compose down
```

Ambos conservan los datos. No agregar `--volumes` salvo que se quiera borrar
explícitamente la base local. Cambiar usuario, contraseña o nombre en `.env` no
modifica una base ya inicializada. Si se actualizan dependencias, ejecutar
`docker compose run --rm --no-deps app npm ci` y reconstruir la imagen.

## Supabase completo en local

Para probar cuentas y API sin depender de la nube, usar el stack oficial con
Supabase CLI: `npx supabase init`, `npx supabase start`, `npx supabase status`.
Este stack agrega varios contenedores, no solo PostgreSQL. Su puerto SQL por
defecto es `54322`: detener primero `db` con `docker compose stop db` y cambiar
`POSTGRES_PORT=54323` en `.env` antes de volver a levantar Compose para evitar
conflictos. Son bases y volúmenes diferentes.

Importar allí los cuatro SQL originales, en el orden anterior, en una base local
nueva usando un cliente SQL y los datos de `supabase status`. No importar el
archivo de compatibilidad. Configurar en `.env` la API URL y clave pública
mostradas por el CLI, y recrear `app`. Las peticiones actuales salen del navegador:
usar la URL local del equipo, no el hostname Docker `db`.

## Variables y seguridad

Las variables `VITE_*` se entregan al navegador: jamás incluir contraseñas,
`service_role`, secret keys o una URL PostgreSQL con credenciales en ellas.
RLS y permisos de Supabase controlan el acceso; ocultar una clave pública no
sustituye esas políticas. Compose pasa a `app` solo variables públicas; `.env`
queda fuera del control de versiones y del contexto de construcción.

Esta es una configuración de desarrollo, publicada solo en loopback, no una
imagen de producción. `npm run build` compila el frontend completo en `dist/`. El Dockerfile actual
levanta el servidor de desarrollo; para despliegue estático se sirve `dist/` con
un servidor de producción y las variables públicas se establecen al compilar.

Referencias: [Vite y variables de entorno](https://vite.dev/guide/env-and-mode),
[Supabase local](https://supabase.com/docs/guides/local-development).
