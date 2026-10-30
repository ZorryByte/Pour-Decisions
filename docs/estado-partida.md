# Estado compartido y persistencia

`createEstadoPartida()` crea una instancia independiente. La aplicación comparte
esa instancia entre navegación y vistas; `sel` referencia sus mismos Sets.
`stage` identifica la etapa por nombre; `step` es un accesor de compatibilidad
para números históricos, sin almacenamiento propio.

## Formato y compatibilidad

`persistenciaPartida.js` contiene funciones puras, sin navegador ni almacenamiento.
`serializarPartida` genera un registro con `version:4` y `stage`, sin número de
paso. El adaptador conserva la clave `cocteles_wizard_v3` para poder leer sesiones
previas y añade preguntas, inspección y datos del formulario en sus campos existentes.

`recuperarPartida` admite el formato anterior sin versión y el actual v4. Traduce
el número antiguo según su significado original, valida las opciones por campo,
normaliza exclusiones y selecciones únicas, y conserva las referencias de los Sets.
Rechaza versiones desconocidas sin modificar la partida. El adaptador captura JSON
malformado y errores de sessionStorage para que el juego siga funcionando.

Una sesión activa antigua sin intensidad vuelve a esa etapa antes de continuar,
conservando sus demás elecciones. Una sesión sin alcohol omite Intensidad y limpia
su fuerza. Los resultados existentes no se convierten innecesariamente en pasos.
La comprobación de compatibilidad de la receta sigue en el adaptador de aplicación,
después de recuperar la inspección y sus exclusiones.

La recarga explícita F5 conserva el comportamiento previo: inicia una partida nueva
y vuelve a bienvenida. Navegar de vuelta a la aplicación sin recargar permite recuperar
la sesión temporal. La cuenta personal usa su almacenamiento y flujo propios.

## Límites

Las animaciones, el foco, la bienvenida y los datos de identidad siguen en sus vistas
y adaptadores. Preguntas y la preparación de frutas conservan su estado específico;
no se duplican dentro de la partida. No hay observadores nuevos ni sincronización entre
copias del estado. Las acciones ajenas a navegación siguen su extracción gradual.

Ver [navegación](navegacion-partida.md) para las responsabilidades y comandos de prueba.
