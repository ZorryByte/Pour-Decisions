# Etapa de frutas

## Barra interactiva

La vista principal del juego usa ahora `frutasBarra.js` y `frutasBarra.css`.
`frutasView.js` se conserva como referencia de la vista anterior; el formulario
sencillo y el ViewModel siguen compartiendo la misma selección de la partida.

- Al avanzar desde Alcohol, el vaso y la coctelera conversan por turnos en sus
  propios globos. El vaso conserva su SVG y la coctelera no tiene cara.
- El traspaso muestra un chorro calculado desde la boca del recipiente hasta su
  destino. El vaso se vacía gradualmente, su líquido mantiene la orientación
  horizontal y después se sirve de vuelta al completar la preparación.
- Las frutas se arrastran desde la mesa al recipiente. Tienen gravedad, rebote,
  fricción y colisiones simples. Devolver una a la mesa la retira de las favoritas.
- El machacador se agarra y se mueve hacia abajo. El recipiente se arrastra a la
  coctelera para verter y la coctelera se mueve de lado a lado para agitar. Cuando
  se marea, acercarla al vaso permite servir. Todo ocurre en la misma escena.
- La preparación no cambia los gustos ni sus pesos. Seleccionar conserva el
  límite de cinco, el guardado y las reglas del recomendador.
- La preparación es acumulativa: añadir fruta no reinicia el jugo ni lo que ya
  contiene la coctelera. Los colores se mezclan en un único líquido; las piezas
  desaparecen al terminar de machacarlas. Se puede verter en varias tandas.
- Movimiento reducido conserva los diálogos y omite el vuelo de los recipientes.
- Cada personaje tiene una zona de conversación separada del área de vertido.
  El chorro termina antes de que el recipiente regrese a su posición de reposo.
- Al acercar el recipiente a la boca de la coctelera o la coctelera al vaso,
  la animación toma el control del gesto sin exigir soltar sobre un punto exacto.
- Si hay frutas elegidas, Siguiente permanece bloqueado hasta servir la mezcla.
  Sin fruta se permite seguir después de un intercambio específico entre ambos.
- `frutasConversacion.js` calcula la lectura por palabras, puntuación y una pausa
  inicial, con un mínimo de 2,6 segundos por frase también en movimiento reducido.
  Los cambios de acción sustituyen turnos pendientes; la frase visible conserva
  su tiempo de lectura. Un único reloj evita respuestas atrasadas y solapamientos.
- El texto aparece palabra a palabra con los mismos pulsos que mueven al vaso
  o la coctelera. El tiempo de lectura incluye la revelación completa y una pausa
  final; con movimiento reducido se muestra directamente la frase completa.
- Las frutas tienen un agarre mayor, inclinación según el impulso y rebote al
  caer. Un lanzamiento puede entrar en el recipiente; si no, regresa a la mesa
  sin añadir una preferencia. El acceso al perfil queda fuera de la zona de juego.
- `coctelera.js` dibuja el cuerpo metálico y secuencia con GSAP la tapa y el
  tapón: levantar, apartar, alinear y encajar. Se abre antes del vertido, se cierra
  antes de agitar y abre el tapón para servir. Las sombras permanecen sobre la
  barra, separadas de los objetos que se levantan. La secuencia se cancela al salir.
- `frutasDialogos.js` almacena intercambios completos, con bromas y amistad;
  evita repetir la última variante de cada situación en la misma sesión.
- Al salir se cancelan temporizadores, animaciones y simulación; se retiran el
  chorro y cualquier fruta arrastrada que pudiera quedar fuera de la escena.

`npm run test:frutas` verifica con eventos reales del mouse selección, retirada,
machacado, vertido, agitado, servido y navegación en 1440, 768 y 390 px. También
comprueba el orden de conversación y el vaciado con un chorro visible sin
movimiento reducido. Las capturas quedan en `artifacts/frutas-barra/`.

## Extracción histórica

La etapa está separada en `src/features/juego-trivia/etapas/frutas/`:

- `frutasView.js` conserva la bandeja, botones, etiquetas accesibles y «Sorpréndeme:
  la que sea». Recibe el dibujante actual de frutas sin cambiar sus SVG.
- `frutasViewModel.js` lee y modifica `partida.sel.fruta` y `partida.fruitAny`.
  Conserva selección múltiple, retirada, límite de cinco y fruta indiferente.
- `frutasGestos.js` conserva el enlace a Interact.js, desplazamiento de tokens,
  umbral de diez píxeles, bloqueo de clic de 350 ms y retorno del token si el
  arrastre no se acepta. El gesto sigue deshabilitado con puntero grueso o sin
  Interact.js. Recibe adaptadores para la detección del vaso y las acciones.

Los botones utilizan `toggle(valor)`; el formulario sencillo usa
`setSelection(valor, marcado)`; el arrastre usa `add(valor)`. Se conservan las
diferencias originales: arrastrar no retira una fruta ya elegida ni añade frutas
mientras está activa la opción indiferente. Esta opción puede seleccionarse con
cinco frutas y limpia sus selecciones. El ViewModel no accede al DOM ni crea una
segunda copia de la partida.

`views/juego.js` mantiene adaptadores para indicar el ingrediente nuevo, mostrar
el mensaje del límite, persistir, renderizar y recuperar el foco. La geometría
del vaso, retorno animado del token, salpicadura, servido y transiciones de líquido
conservan sus implementaciones. `arteFrutas.js` y los CSS permanecen intactos.

## Verificación

- `npm test` compara las funciones del respaldo con las nuevas para las 1024
  combinaciones de frutas, fruta indiferente, selección y retirada. Comprueba
  también las diferencias de botones y arrastre, recuperación de referencias y
  selección de alcohol independiente.
- Las pruebas de gestos ejecutan los manejadores originales y extraídos con
  eventos simulados: movimiento, umbral, destino, fruta ya elegida, bloqueo de clic,
  puntero grueso y ausencia de Interact.js. No equivalen a un arrastre físico.
- `npm run test:browser` compara 14 acciones con botones reales, sus clases,
  accesibilidad, foco y guardado, además de las 27 capturas y los flujos anteriores.
- `npm run build` comprueba la compilación.

Las pruebas de restauración permiten solo las sustituciones exactas registradas
en `tests/fixtures/frutas-extraccion.json` y las extracciones anteriores; el resto
se compara contra el respaldo. La siguiente etapa pendiente es estilos/Tinder.
