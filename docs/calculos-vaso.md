# Cálculos del vaso

`src/features/juego-trivia/vaso/calculosVaso.js` contiene las fórmulas visuales
originales y sus colores. Son cálculos de presentación, separados de las reglas
de recomendación y del acceso a datos. Reciben valores explícitos y no leen DOM,
estado global, almacenamiento, bibliotecas de animación ni APIs del navegador.

- `liquidColor(selecciones)` mezcla los colores de bases y frutas y aplica la
  fuerza con los mismos pesos, redondeos y prioridades anteriores.
- `fillLevel(selecciones, frutaIndiferente, respondidas)` conserva el llenado
  inicial, incrementos por etapa, aporte de las respuestas y límite de 0,86.
- `liquidY(...)` convierte ese nivel en la altura SVG con la fórmula original.
- `glassBounds(y, margen)` conserva los límites usados para colocar burbujas y
  comprobar el arrastre de frutas dentro del vaso.
- Las tablas de colores `ALC` y `FR` y la conversión `hex` son compartidas con la
  Vista para conservar el color de burbujas y la identificación de ingredientes.

`views/juego.js` conserva adaptadores que pasan las selecciones actuales y leen
el número de respuestas de `Preguntas.answered()`. Ese contador solo cuenta las
respuestas; su lectura no avanza la partida. Si el módulo no existe se pasa cero.
El módulo de cálculos no contiene una segunda copia del estado del juego.

El SVG, etiquetas, adornos, dibujo de frutas, eventos, detección del arrastre en
pantalla, salpicaduras, transiciones de color y nivel, voz, servido y revelación
permanecen en la Vista. Se conserva el motor actual y todos sus tiempos.

## Verificación

- `npm test` compara el color contra el respaldo para las 128 combinaciones de
  bases, frutas individuales y combinadas, y fuerzas; comprueba niveles y alturas
  con cada combinación de progreso y de cero a tres respuestas, incluida la
  ausencia del módulo de preguntas. Comprueba también geometría, colores y que
  no se modifiquen las selecciones.
- La prueba de restauración compara el resto de `juego.js` contra el respaldo,
  admitiendo únicamente esta extracción y el dibujo de frutas ya autorizado.
- `npm run test:browser` compara las 27 capturas originales a tres anchuras y
  comprueba la animación real del vaso. También compara color, altura, superficie,
  etiqueta y burbujas en 192 estados de elecciones y respuestas de ambas versiones.
  Se conserva el recorrido de cuenta y los controles de recomendaciones.
- `npm run build` comprueba la compilación.

El estado principal ya está [centralizado](estado-partida.md). Quedan para entregas
independientes las acciones, las etapas y sus ViewModels. Esta extracción no
completa por sí sola el MVVM del juego.
