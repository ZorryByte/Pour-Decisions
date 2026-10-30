# Publicar en Vercel con Supabase

## Arquitectura

Git → Vercel (Vite compila `dist/`) → navegador → Supabase (Auth y PostgreSQL).
Docker se usa para desarrollo local. Vercel no ejecuta el Dockerfile ni necesita
el contenedor PostgreSQL de este proyecto. El enlace gratuito de Vercel basta;
no es necesario comprar dominio.

## 1. Supabase

Crear o seleccionar el proyecto Free. En Connect o Settings → API Keys obtener:

- Project URL: `https://<referencia>.supabase.co`.
- Clave pública publishable (`sb_publishable_...`) o legacy `anon` (JWT).

Aunque la variable se llama `VITE_SUPABASE_ANON_KEY`, admite ambos tipos públicos.
Las claves secretas, `service_role` y la contraseña de PostgreSQL nunca van en Vercel
para esta aplicación ni en variables `VITE_*`.

### Tablas y funciones

En un **proyecto nuevo, sin datos que conservar**, ejecutar en SQL Editor y en orden:

1. `database/migrations/001-base.sql`.
2. `database/migrations/002-estilos.sql`.
3. `database/migrations/003-juego.sql`.
4. `database/migrations/004-perfiles.sql`.

**No ejecutar de nuevo 001 sobre una base existente:** contiene DROP TABLE y borra
los datos del evento. Si ya hay tablas, revisar qué migraciones faltan antes de
aplicar cambios. No ejecutar `database/local/00-supabase-compat.sql` en Supabase.

Ejecutar `database/verificar-supabase.sql`, que es de solo lectura. Revisar tablas,
RLS, políticas, funciones y un evento activo. 001 incluye un evento de ejemplo:
cambiar nombre, slug y fecha desde Table Editor; conservar uno activo para usar
el juego sin `?evento=slug`.

### Acceso por correo

El código actual solicita y verifica un **código OTP**, no procesa enlaces mágicos.

- Activar el proveedor Email y permitir registros si se crearán cuentas nuevas.
- En las plantillas de Confirm signup y Magic Link incluir `{{ .Token }}` para
  recibir el código. El formulario admite de 6 a 10 dígitos.
- En Authentication → URL Configuration poner la URL estable de Vercel en Site URL.
  Añadir esa URL y `http://localhost:5173` a Redirect URLs. El acceso actual por
  código no usa redirecciones; estas URLs dejan correctos los enlaces de Auth.
- Para previews privadas usar una cuenta/proyecto de prueba cuando sea posible.

El SMTP predeterminado de Supabase solo envía a correos autorizados del equipo del
proyecto y tiene un límite de 2 correos por hora. Para probar personalmente usar
el correo autorizado. Para permitir acceso a otras personas hace falta configurar
SMTP propio y revisar sus cuotas. No hay un proveedor de correo externo conectado
por estos archivos.

## 2. Vercel

Importar o abrir el proyecto conectado a Git. La Root Directory debe contener
`package.json` y `vercel.json` (si el juego está en una subcarpeta, seleccionar esa).

| Ajuste | Valor |
|---|---|
| Framework | Vite |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build:vercel` |
| Output Directory | `dist` |

`vercel.json` ya define framework, instalación y compilación. Quitar overrides
antiguos del panel si contradicen estos valores. No hace falta configurar rutas
de servidor: la navegación actual usa hashes y parámetros en la URL.

En Settings → Environment Variables agregar:

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL HTTPS del proyecto |
| `VITE_SUPABASE_ANON_KEY` | Clave pública publishable o legacy anon |

Seleccionar Production y, si se desea probar versiones previas, Preview.
Estas variables se integran durante la compilación: cualquier cambio requiere
un nuevo despliegue. El comando de Vercel rechaza variables vacías, URLs inválidas
y tipos de claves incorrectos sin imprimir claves. Esa comprobación valida formato;
no sustituye comprobar la conexión real, SQL, permisos ni entrega de correo.

No definir `POSTGRES_PASSWORD` ni subir `.env` a Git o Vercel. `.gitignore` y
`.vercelignore` excluyen configuración local y archivos auxiliares.

## 3. Docker para trabajar con Supabase en la nube

Docker Desktop debe estar iniciado y usar contenedores Linux.
Si no existe `.env`, copiar `.env.example`; conservar el existente si ya está creado.
Completar las dos variables públicas de Supabase en `.env`. Se recomienda proyecto
de prueba; los cambios realizados desde la UI escriben en el proyecto configurado.

```powershell
docker compose config --quiet
docker compose up --build -d app
docker compose ps
docker compose logs --tail=60 app
```

Abrir `http://localhost:5173`. `app` ya no depende de PostgreSQL local.
Si cambia `.env`: `docker compose up -d --force-recreate app`.

Para probar SQL en PostgreSQL local, activar explícitamente el perfil adicional:

```powershell
docker compose --profile sql-local up --build -d
```

Ese PostgreSQL no implementa Auth ni la API de Supabase. La UI seguirá consultando
la URL de `.env`. Más detalles en `docs/desarrollo-docker.md`.

Sin Docker, con Node 24 instalado:

```powershell
npm ci
npm test
npm run check:deploy
npm run build:vercel
npm run preview -- --host 127.0.0.1
```

`npm run build` permite compilar una demostración sin Supabase; Vercel usa el
comando estricto `build:vercel` para evitar publicar cuentas sin configurar.

## 4. Verificación antes de compartir

1. Abrir el enlace de producción y completar el recorrido del juego.
2. Solicitar código y entrar con el correo autorizado; probar entrega real.
3. Guardar receta y preferencias, recargar y comprobar persistencia.
4. Cerrar sesión, volver a entrar y confirmar recuperación de los datos.
5. Si se prueban dos cuentas, confirmar que cada una ve solo sus guardados.
6. Probar el enlace desde un teléfono y un evento válido.

Supabase Free puede pausarse después de una semana sin actividad. Comprobar el
proyecto antes de utilizarlo. GitHub, Vercel y Supabase se conectan desde sus
respectivos paneles; crear estos archivos no acredita acceso a ninguna cuenta.

## Referencias

- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Variables en Vercel](https://vercel.com/docs/environment-variables)
- [Claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys)
- [Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [SMTP y restricciones](https://supabase.com/docs/guides/auth/auth-smtp)
