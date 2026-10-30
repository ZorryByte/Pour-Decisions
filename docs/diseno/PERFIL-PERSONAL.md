# Perfil personal — implementación y activación

Se incorporan Mis cócteles, Mis gustos y Por descubrir, con recetas completas, favoritos, eliminación de favoritos, reacciones y valoración posterior a probar. Guardar, Me apetece y Lo probé y me gustó son estados independientes. La colección no registra un pedido para un evento.

## Activación

1. Configurar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en index.html con la URL y clave pública del proyecto. Nunca usar service_role en el navegador.
2. Ejecutar **supabase-perfiles.sql** en el SQL Editor. Es una migración aditiva, repetible y separada del esquema de eventos. **No ejecutar de nuevo supabase.sql en una base existente: ese archivo elimina datos.**
3. Activar acceso por correo en Supabase Auth. En las plantillas **Magic Link** y **Confirm signup**, incluir el código `{{ .Token }}`. Ejemplo: `<p>Tu código para ¿Qué tomamos?: <strong>{{ .Token }}</strong></p>`. Configurar SMTP para destinatarios reales y revisar límites de envío y de intentos. El cliente acepta códigos de 6 a 10 dígitos.
4. Servir la aplicación por HTTPS en producción. Abrir Mi perfil, solicitar un código y entrar. No se precisa contraseña ni callback con tokens en la URL.
5. Probar con dos cuentas reales que no puedan leer, modificar o borrar datos de la otra; confirmar envío, vencimiento de código y renovación de sesión en el proyecto configurado.

Referencias de integración: [acceso por código](https://supabase.com/docs/guides/auth/auth-email-passwordless), [API de Auth](https://supabase.github.io/auth/), [políticas de acceso por usuario](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Datos y consentimiento

- `perfiles_personales`: preferencias explícitas por usuario autenticado.
- `cocteles_guardados`: una receta por nombre y usuario; conserva las elecciones de ese guardado. No se duplica al reintentar.
- `reacciones_cocteles`: afinidad prevista, motivo opcional y valoración «lo probé y me gustó» independiente.
- `avatares_personales`: un único cóctel favorito por cuenta, ligado a una receta guardada y a su personalidad. Volver a ejecutar la migración actualizada añade esta tabla a instalaciones del perfil anterior.
- Todas las tablas tienen RLS para `authenticated` mediante `auth.uid()`, sin permisos de acceso anónimo. No se vinculan automáticamente las identidades antiguas por nombre con las cuentas nuevas.
- Antes del acceso, las reacciones y la receta pendiente viven en sessionStorage. Al entrar se conservan las reacciones de esa visita y se guarda únicamente la receta solicitada. El formulario informa de ello.
- La sesión de Auth se conserva en localStorage para volver a entrar desde el mismo dispositivo. Cerrar sesión elimina esa sesión local y solicita su revocación a Supabase. Cada dispositivo debe autenticar su correo.
- No se almacenan en el navegador copias de la colección de una cuenta después de cerrar sesión. Las cuentas y las tablas antiguas de la fiesta son independientes.

## Recomendación inicial

Me apetece da prioridad moderada a esa receta y una afinidad pequeña a otras con frutas y estilos compartidos; Lo probé y me gustó tiene más peso. No me convence desplaza esa receta al explorar alternativas. Por descubrir excluye las recetas rechazadas y ya guardadas, valora coincidencias con los gustos editables y muestra las razones. No deduce que todos los ingredientes de una receta rechazada desagraden a la persona.

Las restricciones se aplican antes de puntuar, usando el filtro del catálogo existente; sin alcohol como única base excluye recetas alcohólicas y fuerza elegida filtra por la clasificación actual. Otra restricción detiene las propuestas de Por descubrir hasta revisarla. No se declara una garantía de ausencia de alérgenos: el catálogo usa texto y no representa marcas ni contaminación cruzada.

Los motivos de dislike se conservan como información; no se traducen automáticamente a nuevas cantidades ni fórmulas de receta. Mis gustos es la vía explícita para cambiar el perfil. Elegir una sugerencia no altera las respuestas del evento ni sobreescribe los gustos manuales.

## Verificación

`node --test tests/*.test.cjs` ejecuta las pruebas de regresión existentes.

`node tests/perfil-browser.mjs` utiliza un navegador real y un servidor local con una API simulada aislada. Comprueba el resultado sin registro, reacciones separadas de favoritos, código de acceso, receta pendiente, reintentos, preferencias, restricciones, persistencia, cierre de sesión y tamaños de pantalla. Los correos, sesiones y datos de prueba no contactan Supabase. Las capturas se guardan en artifacts/perfil.

La API simulada no sustituye la prueba de SMTP, las políticas reales de PostgreSQL ni una sesión contra un Supabase configurado. Esas comprobaciones necesitan la configuración del proyecto.

## Avatar del cóctel favorito

Guardar una receta no la convierte automáticamente en el favorito principal. Se elige con «Elegir como mi favorito» desde el resultado o «Usar como mi favorito» desde la colección. Esa acción guarda la receta si hace falta y fija su personaje como avatar.

La cara, el vaso y la expresión se renderizan con los SVG originales del resultado. El recorte circular se centra en la cara y el fondo usa el elemento de esa personalidad. La identidad se conserva en `elecciones._personalidad` y en el avatar de la cuenta; las nuevas mezclas y la edición de gustos no la recalculan silenciosamente. Las recetas anteriores sin ese identificador usan sus elecciones guardadas como alternativa determinista.

Se puede cambiar el favorito o quitar esa elección manteniendo la receta en la colección. Al quitar de la colección la receta que era favorita, la clave foránea elimina también el avatar. Si falla el cambio de avatar, no se muestra éxito ni se sustituye el anterior: queda pendiente para reintentar. El acceso por código también conserva esa intención.

El avatar no requiere una API de imágenes, subir fotos ni una API de IA. La evaluación de integraciones está en INVESTIGACION-APIS.md.

Verificado el 29 de octubre de 2026: las dos pruebas de regresión existentes pasaron; el recorrido de navegador pasó con 34 solicitudes a la API simulada, código incorrecto, fallo de guardado y reintento, recarga real del perfil y renovación de sesión. También se comprobó que el avatar conserve la cara original, que cambiar las elecciones del juego no la altere, que un fallo al cambiar avatar conserve el anterior y que solo haya un favorito por cuenta. Se inspeccionaron capturas a 1440, 768 y 390 px, sin desbordamiento horizontal ni errores de ejecución de JavaScript. El detector solo señaló Fraunces, tipografía existente que se conserva. El entorno de prueba bloquea CDN y fuentes externas: no valida su disponibilidad de red.
