# Inspección VIP de ingredientes — mínimo viable

La etapa de restricciones ahora es un puesto de inspección de pases, inspirado
en el gesto de recibir, revisar y sellar documentos. Conserva la paleta del juego
y usa nueve personajes chibi originales. No hay puntuación ni reloj.

## Arquitectura

- `etapas/restricciones/restriccionesDatos.js`: categorías y motivos válidos.
- `etapas/restricciones/restriccionesViewModel.js`: decisiones, exclusiones,
  compatibilidad con sesiones anteriores y recuperación. No usa DOM ni red.
- `etapas/restricciones/restriccionesView.js`: mostrador, pases, sellos, motivos,
  revisión de pases y foco. Las acciones delegan al ViewModel.
- `etapas/restricciones/restricciones.css`: estilos limitados a esta etapa.
- `partida/estadoPartida.js`: una sola fuente de estado, incluyendo `inspeccion`.
- `domain/restricciones.js`: filtrado de recetas, compartido con el perfil.
- `app/iniciarSistema.js`: composición, persistencia y envío; `views/juego.js`
  conecta la Vista con la navegación existente.

Las rutas anteriores de alcohol, frutas, cartas y resultado se conservan. El
cambio visual de restricciones es intencional y autorizado; la excepción está
registrada en `tests/fixtures/inspeccion-vip.json`, siguiendo el mecanismo de
paridad del proyecto. Las pruebas nuevas verifican el comportamiento activo.

## Comportamiento

Cada ingrediente presenta su pase. Aprobar significa que la persona no necesita
excluirlo, nunca que deba añadirse a su bebida. Rechazar exige un motivo. Se
distinguen alergia a la leche/intolerancia a la lactosa y gluten/alergia al trigo.
Los motivos por salud y gusto se conservan separados en `inspeccion.decisiones`;
ambos excluyen el ingrediente de las recomendaciones en este MVP.

Los nueve pases son leche, maní, frutos secos, huevo, gluten/trigo, soja, sésamo,
sulfitos y cítricos. No hay límite de cinco exclusiones. Es posible aprobar todos
con una acción explícita centrada si no hay restricciones. Se retiró el enlace
«Excluir otro ingrediente»; las anotaciones de sesiones anteriores conservan
su editor para que puedan corregirse.
El puesto está centrado y no tiene lista lateral. «Pase anterior» permite volver
y «Revisar mis pases» recorre las decisiones al finalizar, sin borrar exclusiones.
La primera entrada conecta la etapa con las citas de sabores: «Ahora te toca la
puerta», una persiana anuncia el primer turno. El texto permanece visible durante
4,5 segundos y la apertura dura otros 0,9 segundos, dando tiempo para leerlo.
Entre ingredientes aparece «¡Siguiente!»; el personaje llega y desliza su pase.
Las transiciones no bloquean las acciones y no se repiten al elegir un motivo.
Se respeta movimiento reducido, ocultando la persiana y mostrando el contenido
directamente. Volver desde las preguntas conserva las decisiones.

La navegación exige revisar todos los pases. Una anotación en «Otro ingrediente»
conserva el bloqueo anterior: no se recomiendan recetas hasta aclararla. El texto
y los motivos se guardan con la partida en `sessionStorage` y se incluyen en las
etiquetas de exclusión del envío al evento. Se mantiene la política preexistente:
F5 empieza una partida nueva. El perfil sigue guardando las claves de exclusión;
el detalle de motivos de inspección no se añade al esquema del perfil en este MVP.

## Alcance del filtro

Se reconocen ingredientes declarados y algunas familias que requieren precaución
(por ejemplo, vino y vermut al excluir sulfitos). También se excluyen recetas que
declaran clara opcional al excluir huevo. No se sustituyen ingredientes ni se
infiere que una receta sin coincidencias esté certificada como segura. Las marcas,
ingredientes compuestos y el contacto entre utensilios necesitan revisión de quien
prepara; el aviso queda visible al completar la inspección. Las exclusiones nuevas
no se deducen de etiquetas de afinidad de frutas.

## Arte

Activo usado: `src/assets/inspeccion-ingredientes-simple.png`, atlas de nueve celdas
generado con la herramienta integrada de imágenes y revisado visualmente. El
primer atlas queda como referencia en `src/assets/inspeccion-ingredientes.png`.
La variante intermedia está en `src/assets/inspeccion-ingredientes-chibi.png`.

Dirección del prompt final, con la imagen del usuario como referencia de estilo:
atlas 3×3 sobre fondo crema, conservando leche/maní/almendra, huevo/espiga/soja,
sésamo/botella/limón; siluetas kawaii planas y simples, contornos verde oscuro,
ojos pequeños y boca mínima. Sin ropa, accesorios, brazos ni piernas. Colores
pastel y muy pocos detalles. Leche tranquila y somnolienta; maní triste porque
pasa inadvertido; almendra presumida; huevo nervioso; espiga seria y estricta;
soja reservada; sésamo tímido; botella misteriosa y adormilada; limón gruñón y
escéptico. Las frases del catálogo acompañan estas personalidades. La melancolía
del maní es su personalidad inicial, no una reacción que castigue excluirlo.

## Verificación

- `npm run test:vip`: interacción real en navegador, decisiones rápidas, motivos,
  corrección, navegación, persistencia, otra restricción, aprobación general y
  movimiento reducido. Capturas a 1440, 768 y 390 px en `artifacts/inspeccion-vip`.
- `tests/inspeccion-vip.test.cjs`: validación del ViewModel, separación lactosa/trigo,
  conservación de restricciones anteriores, filtros nuevos y bloqueo de navegación.
- `npm run build`: compilación de producción.
- La suite completa tiene 89 pruebas: 86 pasan. Las tres pruebas de restauración
  histórica aún difieren fuera de los cambios VIP descontados por el fixture,
  entre ellos el acceso al perfil y cambios del motor anteriores a esta etapa.
  No se han relajado esas comprobaciones ni modificado las pantallas afectadas.
