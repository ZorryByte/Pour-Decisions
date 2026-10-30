# Estado de la migración MVVM

La implementación Vue de la migración anterior se retiró porque cambió el diseño,
las animaciones y comportamientos existentes. Está archivada en
`artifacts/migracion-vue-descartada/` y no se ejecuta.

La interfaz activa recupera los originales dentro de `/src` y conserva el archivo
actual de frutas. La separación MVVM completa está pendiente; no se considera
completada con el mero traslado de archivos.

Está completado el [Modelo de cuenta](modelo-cuenta.md): las peticiones Auth y
REST se extrajeron del perfil existente, con la sesión conectada por adaptadores.
Las pantallas, los mensajes y las animaciones se conservan. También se completó
la extracción del [ViewModel de cuenta](viewmodel-cuenta.md): sesión,
carga de datos, errores, acceso/cierre de sesión y recetas pendientes con guardado,
reintento y descarte, además de elección, cambio y retirada del favorito/avatar,
y reacciones con motivos, historial y transferencia desde invitado.
También se extrajeron la normalización y edición de preferencias y las sugerencias.
La retirada de recetas y la limpieza del avatar correspondiente también están
en el ViewModel, conservando mensajes, bloqueo, reintento y presentación.
Permanecen los adaptadores de integración de la Vista y los módulos del juego,
pendientes de extracciones independientes.

La primera extracción del juego separa la comprobación de incompatibilidades en
su [dominio de restricciones](restricciones-juego.md). El adaptador `choca` sigue
usando las selecciones actuales. Las [reglas de recomendación](recomendaciones-juego.md)
también están extraídas: coincidencias, puntuaciones, fuerza, porcentajes y orden
conservan sus resultados originales. Los [cálculos visuales del vaso](calculos-vaso.md)
también están separados: color, nivel, altura y límites geométricos, conservando
SVG, gestos y animaciones en la Vista. Los [datos principales de partida](estado-partida.md)
están centralizados en una sola instancia, conservando el registro de sesión y los
adaptadores actuales. La [navegación principal](navegacion-partida.md) ya usa su
ViewModel, incluidas validaciones, avance, retroceso y finalización de preguntas.
Las demás acciones y las etapas siguen pendientes de extracciones independientes.

La [etapa de alcohol](etapa-alcohol.md) ya separa Vista y ViewModel, con las
selecciones de la partida compartida, los controles originales y ambas rutas
de selección conservadas. La [etapa de frutas](etapa-frutas.md) también separa Vista,
ViewModel y enlace de gestos, conservando dibujos, selecciones y reglas de arrastre.
Estilos/Tinder y las demás etapas siguen pendientes.

Consulta [restauracion-interfaz.md](restauracion-interfaz.md) para conocer los
cambios activos, las excepciones autorizadas y la comparación contra el respaldo.
