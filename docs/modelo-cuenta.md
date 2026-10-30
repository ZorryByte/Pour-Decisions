# Primera extracción: Modelo de cuenta

El transporte de Supabase del perfil está en
`src/features/auth-cuenta/models/cuentaModel.js`. La Vista existente lo importa
y delega allí las peticiones, conservando su HTML, CSS, mensajes, eventos y
animaciones. No se sustituyó ninguna pantalla.

## Responsabilidades extraídas

- Solicitar y verificar el código de acceso por correo.
- Validar la respuesta de sesión y calcular su caducidad.
- Renovar el token, compartiendo una sola petición entre operaciones simultáneas.
- Consultar preferencias, guardados, reacciones y avatar.
- Guardar o retirar recetas, preferencias, reacciones y favorito/avatar.
- Solicitar el cierre de sesión local a Supabase.
- Construir cabeceras, rutas, payloads y errores de la API.

Los endpoints, nombres de tablas, campos y códigos de error se conservan. Los
guardados usan el usuario de la sesión y las políticas RLS siguen aplicándose
en Supabase. El Modelo solo recibe URL y clave pública; no contiene claves
secretas ni credenciales de PostgreSQL.

## Integración temporal

```text
perfil.js → cuentaModel.js → Supabase Auth / REST
```

El Modelo recibe `getSession`, `saveSession` y `onSessionExpired`: adaptadores
pequeños que ahora proceden del [ViewModel de cuenta](viewmodel-cuenta.md).
No crea una segunda copia del estado ni accede al DOM o a almacenamiento del
navegador por sí mismo. El ViewModel coordina sesión y carga; las demás acciones
y la presentación del perfil se extraerán en cambios independientes.

`loadAccount()` conserva los cuatro resultados de `Promise.allSettled` y su
orden; la validación de recetas conocidas y la presentación de errores siguen
en el consumidor, con el comportamiento anterior.

## Verificación

```powershell
npm test
npm run test:paridad
npm run test:perfil
npm run build
```

Las pruebas del Modelo usan un transporte simulado para comprobar payloads,
propietario, errores, sesiones y renovaciones simultáneas. Las pruebas de navegador
comparan las 27 capturas con el original y recorren acceso, reintentos, guardados,
avatar, preferencias, renovación y cierre de sesión con una API local simulada.
No envían correos ni modifican un proyecto Supabase real.

El Modelo de cuenta está completado. La primera parte del ViewModel también está
extraída; las demás acciones de cuenta y la arquitectura del juego siguen siendo
pasos separados.
