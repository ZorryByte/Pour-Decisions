# Navegación de partida

El recorrido actual es **Alcohol → Intensidad → Fruta → Estilo → Restricciones → Preguntas**.
Cuando la única base es «Sin alcohol», Intensidad no aparece en el recorrido. Avance,
retroceso e indicador de progreso consultan la misma secuencia efectiva.

## Responsabilidades

- `recorridoPartida.js`: orden, etapas vecinas, condición de salto y normalización.
- `etapasPartida.js`: catálogo de preguntas, opciones, etiquetas y clases visuales.
- `estadoPartida.js`: única instancia compartida y Sets de elecciones.
- `partidaViewModel.js`: validaciones y acciones de navegación, sin DOM ni servicios.
- `persistenciaPartida.js`: serialización v4 y recuperación de sesiones anteriores.
- `views/juego.js`: presentación, foco, gestos, temporizadores y animaciones.
- `app/iniciarSistema.js`: composición, adaptadores de almacenamiento y ruta sencilla.

La identidad activa está en `partida.stage`: `alcohol`, `fuerza`, `fruta`, `sabor`,
`alergia` o `plan`. Coincide con las claves del dominio existentes: «fuerza» es
Intensidad y «plan» contiene las preguntas. No depende de la posición visible.

El accesor no enumerable `step` permanece únicamente para integraciones antiguas.
Traduce números del orden histórico; no guarda un segundo estado ni representa
la posición del nuevo recorrido. Las clases CSS `step-*` conservan los estilos
existentes y tampoco determinan navegación. Para la posición, usar `position()`;
para las pantallas visibles, `route()`.

## Reglas conservadas

Alcohol e intensidad requieren selección. Frutas permite seguir sin preferencia.
La vista de cartas exige decidir todas las cartas; Enter no las omite. La inspección
exige completar sus pases y bloquea «Otra» pendiente de revisión. Las preguntas
permiten retroceder dentro de la conversación y después volver a restricciones.
El resultado exige una receta compatible.

La vista sencilla usa el mismo recorrido y estado, con sus controles de opciones
cuando no está disponible Juego. Sus validaciones de opciones se conservan, porque
no dispone de cartas ni de la inspección animada.

Elegir «Sin alcohol» elimina intensidad de la ruta y limpia la elección de fuerza,
que dejaría de tener sentido. Cambiar después a una base alcohólica vuelve a exigir
intensidad. Frutas, estilos y restricciones no se borran al retroceder.
Las insignias interpretan la fuerza omitida de una bebida sin alcohol como suave,
sin escribir una selección ficticia en la partida; así conservan sus combinaciones.

## Cómo extender

Agregar una etapa requiere un identificador estable en `ORDEN_ETAPAS`, su catálogo,
selección y validación, y su renderizador. Si tiene una condición de visibilidad,
definirla en el recorrido para que ambos sentidos y el progreso la compartan.
No introducir condiciones numéricas ni sumar/restar posiciones en las vistas.
Cambiar solo el orden no requiere renombrar elecciones ni migrar identificadores.

## Verificación

`npm test` prueba transiciones y recuperación por comportamiento, además de los
contratos de dependencias sin ciclos ni DOM en las reglas. Las antiguas comparaciones
de código completo quedan como referencia en `artifacts/arquitectura/pruebas-anteriores`;
congelaban la implementación y ya tenían tres fallos antes de este cambio.

`npm run test:recorrido` verifica controles, bloqueos, foco, retrocesos, Sin alcohol,
preguntas, resultado, formato guardado, migración y vista sencilla. Captura la pantalla
de Intensidad a 1440, 768 y 390 px. `npm run test:paridad` conserva la comparación de
recomendaciones, cálculos del vaso y selección de alcohol con el motor histórico.
`npm run test:browser` incluye además los recorridos de cuenta y funcionamiento.
