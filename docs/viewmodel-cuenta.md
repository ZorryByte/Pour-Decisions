# ViewModel de cuenta

Esta extracción está limitada a `src/features/auth-cuenta/viewmodels/cuentaViewModel.js`.
Conserva la Vista del perfil y sus funciones de presentación, estilos, mensajes,
foco, gestos y animaciones. No modifica el juego.

## Responsabilidades extraídas

- Una sola sesión en memoria, compartida con el Modelo a través de sus adaptadores.
- Recuperación, persistencia, expiración y limpieza de esa sesión.
- Estados `loading`, `loaded` y `error`, además de los datos de cuenta cargados.
- Carga de las cuatro tablas mediante el Modelo y filtrado de recetas conocidas.
- Descarte de respuestas y errores de una carga anterior al cambiar de sesión.
- Traducción de errores a los mismos mensajes que ya mostraba el perfil.
- Solicitud y verificación del código de acceso, correo normalizado y cambio de correo.
- Coordinación de carga, reacciones de visita y guardado pendiente tras entrar.
- Cierre de sesión, limpieza del acceso y aviso de éxito tras respuesta satisfactoria.
- Un único bloqueo `busy` y aviso `notice` compartidos por las acciones de cuenta,
  para impedir operaciones duplicadas o superpuestas.
- Preparación, recuperación, guardado, reintento y descarte de la receta pendiente,
  con la misma clave de almacenamiento y las elecciones e identidad anteriores.
- Elección, cambio y retirada del favorito/avatar, utilizando la identidad
  guardada de la receta y manteniendo los mensajes y avisos anteriores.
- Reacciones de invitado y cuenta, sus motivos, historial, transferencia al
  acceder, retirada y afinidad con otras recetas.
- Lectura y guardado de preferencias, con las sugerencias de «Por descubrir»
  y la misma normalización de selecciones del perfil.
- Retirada de recetas guardadas y limpieza del avatar si era la receta elegida.

El ViewModel recibe el acceso al Modelo y al almacenamiento como funciones.
No importa el DOM, bibliotecas de animación ni APIs de navegador. Las funciones
de normalización y validación del catálogo también se reciben como dependencias.

```text
perfil.js → cuentaViewModel.js → cuentaModel.js → Supabase
    ↑         │
    └─────────┘ avisos en los mismos puntos de actualización anteriores
```

## Actualización de la Vista

La Vista lee una única referencia `cuentaVM.state`. Sus datos no se copian a
variables independientes. La suscripción recibe avisos concretos:

| Aviso | Actualización conservada |
| --- | --- |
| `load-start` | Mostrar carga si el perfil está abierto. |
| `load-end` | Actualizar la entrada de cuenta y el perfil, si está abierto. |
| `session-expired` | Actualizar la entrada de cuenta; el flujo que falló conserva su manejo de errores. |
| `session-changed` | Actualizar la entrada; cargar la nueva cuenta o mostrar acceso. |
| `action-start` | Mostrar la misma espera y deshabilitar los mismos controles. |
| `action-end` | Actualizar la entrada y el perfil en el punto anterior de finalización. |
| `access-reset` | Mostrar nuevamente el formulario de correo. |
| `logout-end` | Mostrar el aviso original «Sesión cerrada.». |
| `access-required` | Abrir el acceso al perfil al intentar guardar sin sesión. |
| `pending-discarded` | Retirar el aviso de receta pendiente, con el mismo render anterior. |

No hay una suscripción general que reconstruya pantallas por cada cambio de
propiedad. Una carga de cuenta en segundo plano no vuelve a dibujar el juego ni
interrumpe sus animaciones.

## Lo que permanece en la Vista

Permanecen allí la presentación del formulario, su validación HTML,
el foco y la navegación de pestañas. Esas acciones
usan los datos y el bloqueo compartidos del ViewModel; no tienen una segunda
colección, sesión o estado de espera.

`submitAccess(email, code)` conserva el orden previo: verificar, cargar datos,
transferir reacciones de visita y procesar la receta pendiente. Ambas operaciones
ya pertenecen al ViewModel; no llaman a acciones de la Vista.
Si la carga falla no se ejecutan; si falla un guardado se conserva su mecanismo
de reintento existente. El código OTP no se almacena en el estado ni persiste.

`logout()` solicita primero el cierre al Modelo. Solo después del éxito limpia
sesión, correo y reacciones de visita. La Vista sigue controlando el foco del
campo de código después de una solicitud satisfactoria.

## Guardados pendientes

`saveRecipe(nombre, {favorite, fromProfile})` conserva las elecciones del juego
o del perfil según el origen, y la identidad de la receta guardada cuando ya
existía. Sin sesión, persiste el pendiente y avisa a la Vista para abrir el acceso.
`restorePending()` valida y recupera ese mismo registro después de navegar o
recargar. No crea una segunda copia del pendiente en la Vista.

El guardado conserva su orden: cargar la cuenta si hace falta, guardar la receta
si no existe, establecer las preferencias iniciales si estaban vacías y procesar
el favorito cuando se solicitó. Esta última operación ya se resuelve dentro del
ViewModel, sin llamar a una acción de la Vista.

El pendiente solo se elimina después de completar la secuencia. Ante un fallo,
`retryPending()` reutiliza las operaciones ya completadas sin duplicar la receta.
`discardPending()` elimina únicamente el pendiente, sin borrar recetas guardadas.
Ambas acciones respetan el bloqueo compartido.

## Favorito y avatar

`toggleFavorite(nombre)` permite elegir una receta ya guardada de la cuenta,
cambiar la elegida o retirar el favorito actual. Usa el mismo bloqueo que las
demás acciones y solicita la escritura o retirada al Modelo. Solo actualiza
`data.avatar` después de recibir una respuesta satisfactoria. Si falla, conserva
el avatar anterior y permite reintentar con el mismo control.

`savedIdentity(entry)` conserva la normalización de las elecciones guardadas y
su personalidad; `avatarIdentity()` proporciona los datos de identidad del avatar
actual. La Vista sigue dibujando el SVG con sus geometrías, clases y expresiones
anteriores. Cambiar las selecciones del juego no sustituye la identidad guardada.

Retirar el favorito no borra recetas, reacciones ni preferencias.

## Retirada de recetas

`removeSavedRecipe(nombre)` solicita la retirada al Modelo usando el bloqueo
compartido. Solo después de una respuesta satisfactoria retira la receta del
estado y limpia el avatar si corresponde a esa receta. Conserva las preferencias,
reacciones, otras recetas y el mensaje «Receta retirada de tu colección.».
Un fallo mantiene la colección y el avatar y permite reintentar con el mismo botón.
No envía solicitudes sin sesión, para recetas no guardadas ni durante otra acción.

La Vista conserva el botón, sus clases, su ubicación y sus puntos de actualización;
únicamente delega la acción al ViewModel. El Modelo y la eliminación asociada
del avatar en la base de datos mantienen su contrato anterior. No se añade ningún
diálogo ni paso al flujo existente.

## Reacciones e historial

`react(nombre, campos)` conserva la reacción, motivo y marca independiente de
«Lo probé y me gustó». Al dejar de indicar «No me convence» se limpia el motivo,
como antes. Con sesión, el estado se actualiza después de la respuesta del Modelo;
si falla, conserva la reacción anterior y permite reintentar. Sin sesión, utiliza
`state.guest` y el almacenamiento de la visita, sin emitir avisos de render global.
El control de feedback conserva su actualización y foco locales.

`restoreGuest()` valida las reacciones recuperadas con las reglas anteriores.
La transferencia se realiza únicamente tras acceso explícito o mediante
`keepGuestReactions()`. Una transferencia parcial fallida mantiene los datos de
invitado; el reintento actualiza las filas por receta y evita duplicarlas en el
historial. El cierre satisfactorio de sesión limpia las reacciones de visita.

`reactionHistory()` conserva el filtro de filas visibles. `forgetReaction(nombre)`
retira únicamente la reacción confirmada por el Modelo, sin borrar la receta ni
modificar el avatar. Los mensajes y controles siguen siendo los originales.

La afinidad de recetas se extrajo, sin cambiar sus pesos ni prioridades, a
`auth-cuenta/domain/reacciones.js`, junto al catálogo compartido de motivos.
`boost()` aplica esa función a las reacciones de cuenta o de invitado. Rechazar
una receta no rechaza todos sus ingredientes; «Lo probé y me gustó» continúa
siendo un dato independiente de la reacción actual.

## Preferencias y sugerencias

`getPreferences()` proporciona las preferencias normalizadas que lee el
formulario, con listas independientes del estado guardado. La Vista mantiene
los mismos campos, opciones, eventos de selección, validación HTML y foco.
Recoge los valores marcados y llama a `savePreferences(valores)`.

El ViewModel normaliza los valores y solicita el guardado al Modelo utilizando
el bloqueo común. Solo actualiza los gustos después de una respuesta satisfactoria,
con el mensaje original. Si falla, conserva los gustos y sugerencias anteriores
y permite reintentar mediante el mismo formulario.

La normalización original está en `auth-cuenta/domain/preferencias.js`, junto a
las claves compartidas por el formulario. Conserva valores admitidos, eliminación
de duplicados, elección única de fuerza y plan, y exclusión de «ninguna» cuando
hay otra restricción. No añade el límite ni las exclusiones propias de la etapa
de alcohol del juego al formulario de perfil.

`suggestions()` conserva el filtrado por recetas guardadas, rechazos y restricciones,
las afinidades, el orden, los textos explicativos y el límite de seis recetas.
Recibe el catálogo y la comprobación de compatibilidad existentes como funciones;
no modifica las reglas de seguridad ni la carta del juego.

Las acciones de cuenta descritas ya están extraídas al ViewModel. Quedan los
adaptadores de integración en la Vista y la separación del juego; no está completa
la migración MVVM del sistema. No se han creado carpetas vacías para otras etapas.

## Verificación

```powershell
npm test
npm run test:browser
npm run build
```

Los tests específicos cubren recuperación de sesión, carga, errores, reintento,
expiración, cambio de cuenta durante una petición, cancelación de suscripciones,
acceso duplicado, OTP inválido, orden de las operaciones y cierre fallido/exitoso.
También cubren recuperación del pendiente, validación, identidad, conservación
de preferencias existentes, fallos parciales de guardado y reintento sin duplicados.
También comprueban cambios y retiradas fallidos de favorito, bloqueo de solicitudes
simultáneas, conservación de su identidad y ausencia de cambios en la colección.
Las pruebas de reacciones cubren invitados, motivos, recuperación, fallos de
escritura, transferencias parciales, reintento, retirada, bloqueo y afinidad.
Las de preferencias cubren normalización, independencia de los datos del
formulario, fallo y reintento del guardado, restricciones, orden de sugerencias y
bloqueo de peticiones simultáneas. El navegador prueba también un fallo simulado
de guardado antes de volver a guardar los gustos y revisar las restricciones.
Las pruebas de retirada comprueban la espera de respuesta, conservación del
avatar de otra receta, fallo y reintento, bloqueo y ausencia de cambios en gustos
y reacciones. El navegador también simula un fallo de retirada de la receta elegida
y verifica que la receta y su avatar permanezcan visibles antes del reintento.
Las verificaciones de navegador conservan las 27 comparaciones visuales contra
el original y el recorrido del perfil con una API local simulada. No envían
correos ni escriben en Supabase real.
