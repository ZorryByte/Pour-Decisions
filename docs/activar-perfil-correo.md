# Activar perfiles con correo real

El formulario usa Supabase Auth: solicita un código, verifica el correo y carga
la colección privada del usuario. No hay acceso local ni códigos ficticios.

## Conexión

En el [panel de Supabase](https://supabase.com/dashboard), abrir el proyecto y
su diálogo **Connect** para copiar la **Project URL**. La clave pública se
encuentra también en **Settings → API Keys → Publishable key**.
Se admite la clave `anon` de los proyectos anteriores.

Crear o editar `.env` en la raíz del proyecto:

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

No usar `service_role`, `sb_secret_` ni la contraseña de PostgreSQL.
Reiniciar Vite después de cambiar el archivo; con Docker, recrear `app`.
En un despliegue estático, configurar las variables antes de compilar.

## Base de datos y correo

Para activar las estadísticas personales, ejecutar también `Pour Decisions/migrations/005-estadisticas-personales.sql`
en el SQL Editor de la base existente. Es aditiva y repetible; no requiere reiniciar los perfiles.
El acceso **Ver mis estadísticas** del perfil abre `#perfil/estadisticas` con resultados,
frecuencias por opción y los últimos 20 resultados. Cada usuario consulta solo sus propios datos mediante RLS.
Se registran los resultados nuevos al descubrir un cóctel con sesión iniciada; si se descubre antes de entrar,
se conserva el último resultado de esa visita para asociarlo al confirmar el correo.
Los perfiles anteriores empiezan sin historial: las recetas guardadas no se convierten en partidas inventadas.
Los registros que fallen quedan pendientes en el navegador, separados por cuenta, y se reintentan al actualizar estadísticas.

1. Ejecutar `database/migrations/004-perfiles.sql` en SQL Editor del proyecto.
   Es una migración aditiva y repetible. No ejecutar `001-base.sql` sobre datos existentes.
2. Activar el proveedor Email y permitir nuevos registros en Authentication.
3. En las plantillas de correo de Authentication, configurar **Magic Link**
   para mostrar `{{ .Token }}`. Este formulario verifica códigos, no enlaces.
4. Configurar SMTP para el envío a usuarios reales y comprobar los límites
   de envío del proyecto. El proveedor de correo predeterminado tiene restricciones.

Plantilla mínima para el cuerpo del correo:

```html
<h2>Tu código para ¿Qué tomamos?</h2>
<p>Introduce este código para entrar o crear tu perfil:</p>
<p><strong>{{ .Token }}</strong></p>
<p>Si no lo solicitaste, puedes ignorar este correo.</p>
```

## Comprobación real

Solicitar un código con un correo propio, verificarlo y comprobar que aparece
Mis cócteles. Si hay una receta pendiente, debe quedar guardada; si se eligió
como favorita, su personaje debe ser el avatar. Las reacciones de esa visita
también deben conservarse. Cerrar sesión y entrar otra vez debe recuperar
la misma colección. Una cuenta diferente debe ver únicamente sus propios datos.

Las pruebas automatizadas usan una API aislada y no envían correos reales.

Referencias oficiales: [claves públicas](https://supabase.com/docs/guides/getting-started/api-keys),
[acceso por código](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
