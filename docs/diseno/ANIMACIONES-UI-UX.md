# Animaciones de ¿Qué tomamos?

Investigación y revisión del código — 28 de octubre de 2026.

## Correcciones aplicadas después de la investigación

Preferencias confirmadas: movimiento natural en vaso e ingredientes, expresión en momentos especiales, ritmo equilibrado y espectáculo al final; prioridad a fallos al avanzar, volver y mostrar el resultado en celular y computadora.

- Un único tween para nivel y color en paintLiquid(), evitando su cancelación mutua.
- Ingredientes excluidos del segundo efecto de escala.
- Retorno de cartas de 180 ms, interrumpible, con transformaciones sincronizadas con GSAP y limpieza del veredicto al cancelar el gesto vertical.
- Limpieza de la entrada del contenedor anterior al cambiar de etapa.
- Revelación con destino de opacidad explícito, cancelación de timeline y listeners, restauración del foco y protección de los controles cubiertos mediante inert.
- Cancelación al navegar o cambiar la preferencia a movimiento reducido, conservando inert previo.
- Se conserva la duración del espectáculo final por la preferencia expresada; el acortamiento propuesto abajo pertenece a la investigación inicial.

Verificación: `.taste-skill/animaciones-qa.mjs` comprueba lógica de las seis etapas en ambos sentidos y restricciones, ciclo de vida de la revelación y tween del líquido con dobles de DOM/GSAP; la suite lógica existente de insignias también pasó. La sintaxis JS se verificó, incluidos scripts inline de HTML. El detector de diseño solo señaló una advertencia sobre Fraunces, tipografía existente. Estas pruebas no sustituyen la comprobación visual y de gestos en navegadores reales, pendiente por el bloqueo indicado abajo.

## Conclusión

Sí podemos mejorar el juego con las herramientas que ya tiene: CSS, Web Animations API, GSAP, interact.js y canvas-confetti. Recomiendo corregir conflictos y continuidad antes de añadir otra biblioteca. La dirección es que cada elección se sienta como preparar el mismo cóctel: seleccionar, incorporar, mezclar y descubrir.

Alcance: lectura de index.html, estilos.css y juego.js, contrastada con documentación oficial. No se modificó el juego. La apertura del archivo local fue bloqueada por la política del navegador; no se verificaron visualmente el comportamiento, los FPS ni los dispositivos reales. Los problemas descritos como riesgos necesitan comprobación en ejecución.

## Qué ya está bien

- La bienvenida lleva el vaso a su posición en el juego mediante Web Animations API: existe una idea de continuidad propia del producto.
- Los ingredientes caen al vaso y modifican la mezcla; el movimiento explica una acción.
- Las cartas responden directamente al desplazamiento del puntero, sin una transición que retrase el seguimiento.
- Hay botones y selección por toque: no todo depende de arrastrar.
- GSAP y el confeti comprueban prefers-reduced-motion. Las animaciones CSS principales están dentro de no-preference.
- El confeti es una ráfaga limitada, de 40 partículas, en lugar de un bucle permanente.
- Las dependencias tienen versiones explícitas en index.html y hay alternativas si no cargan.

## Hallazgos y prioridad

### 1. Corregir el conflicto del líquido — alta

En juego.js, paintLiquid() inicia un fromTo sobre fill con overwrite:true e inmediatamente un to sobre y con overwrite:true, ambos sobre liquid. GSAP documenta que true cancela todos los tweens anteriores del mismo objeto. Por tanto, el segundo cancela la transición de color, no solo propiedades en conflicto.

Propuesta: animar fill e y en un solo tween, con el estado inicial de color definido explícitamente. No sustituir ciegamente por auto en todas partes: confirmar cómo se resuelven los atributos SVG y comprobar cambios rápidos de fuerza. Conservar una escritura directa del estado final cuando no hay GSAP o se solicita reducir movimiento.

### 2. Un solo responsable por efecto — alta

motion() anima .bit.is-fresh con escala, caída y giro; después vuelve a animar todos los .is-fresh con otra escala. Ambos selectores incluyen el mismo ingrediente. Separar los controles seleccionados de los ingredientes del vaso o excluir .bit del segundo grupo.

No hay evidencia de doble entrada global CSS/GSAP en las etapas: .quiz.stage tiene animation:none. La entrada GSAP depende de entered, que solo cambia al cambiar de etapa/fase.

### 3. Conservar continuidad al seleccionar — media/alta

renderStage() reemplaza el árbol entero con replaceChildren() incluso al seleccionar ingredientes. También cancela los tweens de los descendientes antiguos. Una segunda selección puede cortar una caída en curso y reconstruir el vaso; es un riesgo de discontinuidad, no una medición visual confirmada.

Propuesta gradual: mantener el vaso montado y actualizar selecciones, nivel, color y piezas concretas. Conservar estado lógico inmediato y animar su representación. Cancelar o completar efectos anteriores antes de crear los nuevos. No bloquear el botón Siguiente solo para terminar decoración.

### 4. Revelación más rápida y foco predecible — alta

playReveal() empieza la entrada del resultado en el segundo 2.05 y mantiene una cubierta hasta terminar la secuencia. Propongo 600–900 ms de secuencia total y acceso inmediato a Saltar. Es una decisión de diseño para este juego, no un requisito normativo.

La cubierta recibe el foco en renderResult(); finish() la elimina sin trasladar explícitamente el foco al resultado. Además, una cubierta visual no impide por sí sola tabular a los controles inferiores. Al terminar o saltar, enfocar el encabezado del resultado; durante la cubierta, impedir acceso accidental al contenido cubierto y restaurarlo al cerrarla. Revisar también que ninguna animación siga actuando sobre nodos retirados.

### 5. Cartas que regresan con continuidad — media

En bindSwipe(), un gesto que no alcanza el umbral ejecuta reset(), que borra transform de inmediato. Propuesta: retorno de 160–220 ms desde la posición actual, cancelable al iniciar otro arrastre. La salida de 260 ms actual es razonable; calcular la distancia con el tamaño/posición de la carta en vez de asumir siempre 300 px. Mantener izquierda/derecha, botones, deshacer y scroll vertical.

### 6. Preferencias de movimiento durante la sesión — media

gsapOn() consulta la preferencia al iniciar efectos; no cancela automáticamente los ya activos si cambia la preferencia. Centralizarla con gsap.matchMedia() o un listener y finalizar secuencias activas en un estado legible. La manipulación directa puede seguir el dedo, pero quitar giros y recorridos decorativos en movimiento reducido.

### 7. Rendimiento: medir antes de sustituir — media

El indicador de progreso anima left. Preferir un marcador dentro de una pista estable y desplazarlo mediante transform. El líquido anima atributos SVG y color: pueden requerir repintado; al tratarse de un SVG pequeño no justifican por sí solos una reescritura. Medir con DevTools en móvil y con CPU limitada. No asumir que cualquier uso de transform garantiza 60 FPS.

## Reglas de movimiento para este juego

Estos tiempos son un presupuesto inicial propuesto, ajustable al probar:

| Acción | Tiempo | Regla |
| --- | --- | --- |
| Pulsación/selección | 100–150 ms | Confirmar de inmediato; conservar el estado seleccionado |
| Cambio de pregunta | 180–280 ms | Mover la pregunta, mantener estable el vaso |
| Volver de un swipe incompleto | 160–220 ms | Salir de la posición actual sin salto |
| Salida de carta | 220–280 ms | Seguir el sentido del gesto |
| Caída y mezcla | 350–550 ms | Una secuencia: caída, impacto, asentamiento |
| Resultado | 600–900 ms | Una celebración breve, siempre saltable |

- Causa y efecto: primero se reconoce la elección; después se presenta su consecuencia en el vaso.
- Jerarquía: el ingrediente es protagonista durante la elección; el resultado lo es al terminar. Evitar que mascota, insignias y controles compitan a la vez.
- Física coherente: aceleración para la caída, desaceleración para el asentamiento. Reservar deformación breve para líquido/ingredientes; quitar rebotes rutinarios de los controles.
- Continuidad: Atrás debe conservar mezcla y elecciones. Interrumpir una animación nunca debe deshacer una decisión.
- Rendimiento: preferir transform/opacity; limitar repintados SVG a la región necesaria. will-change solo si una medición justifica su uso.
- Accesibilidad: reducir desplazamientos y giros, conservar texto y estados visibles, permitir teclado y alternativas al arrastre. El criterio WCAG 2.3.3 citado es de nivel AAA; no confundir esta recomendación con una auditoría completa de conformidad.

## Bibliotecas y cómo se usan

| Herramienta | Uso y API básica | Decisión para este proyecto |
| --- | --- | --- |
| CSS | transition para estados; @keyframes para secuencias simples | Mantener para controles y feedback breve |
| Web Animations API | elemento.animate(frames, opciones); finished y cancel() gestionan el ciclo | Mantener para el vuelo del vaso; limpiar en éxito y cancelación |
| GSAP | gsap.to/fromTo; gsap.timeline() coordina secuencias; context().revert() limpia; matchMedia() adapta preferencias | Motor principal existente: coordinar caída, mezcla, cartas y resultado |
| interact.js | interact(elemento).draggable({listeners:{move,end}}); el código aplica transform y decide el destino | Mantener para fruta en escritorio; el swipe actual usa Pointer Events propios |
| canvas-confetti | confetti({particleCount, colors, disableForReducedMotion:true}) | Mantener para una celebración limitada |
| Motion | animate(elemento, valores, opciones), o animate(secuencia); devuelve controles | Alternativa válida para JS sin React; no añadir mientras GSAP cubra el trabajo |
| Anime.js | createTimeline().add(elemento, parametros, posicion) | Alternativa para secuencias; migrar ahora duplicaría esfuerzo sin un beneficio demostrado |

### Patrón GSAP ilustrativo

Ejemplo conceptual, no aplicado al juego; los nodos y la limpieza se deben integrar en su renderizado:

```js
const media = gsap.matchMedia();
media.add('(prefers-reduced-motion: no-preference)', () => {
  const timeline = gsap.timeline();
  timeline
    .fromTo(ingrediente, { y: -70 }, {
      y: 0, duration: 0.28, ease: 'power2.in'
    })
    .fromTo(superficie, { scaleX: 0.9 }, {
      scaleX: 1, duration: 0.18, ease: 'power2.out'
    });
});
// Al desmontar la escena: media.revert().
// La lógica del juego y su estado final no deben depender de esta secuencia.
```

## Orden de implementación y comprobación

1. Corregir overwrite y selectores solapados; probar selección rápida y cambios de fuerza.
2. Acortar revelación y restaurar foco; comprobar Saltar, Enter, Escape y Tab.
3. Animar retorno de carta; probar scroll vertical, pointercancel, deshacer y gesto repetido.
4. Mantener el vaso estable entre selecciones; comprobar que Atrás y Siguiente conservan datos.
5. Centralizar preferencias y limpieza; probar preferencia reducida antes y durante la partida, y dependencias ausentes.
6. Revisar escritorio y móvil, grabar las interacciones y medir frames/repintados. Comparar duración y legibilidad con el estado inicial.

## Fuentes oficiales

- GSAP, overwrite y Tween: https://gsap.com/docs/v3/GSAP/Tween/
- GSAP, secuencias: https://gsap.com/docs/v3/GSAP/Timeline/
- GSAP, ciclo de vida: https://gsap.com/docs/v3/GSAP/gsap.context()/
- GSAP, preferencias: https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/
- web.dev, rendimiento: https://web.dev/articles/animations-and-performance
- web.dev, transiciones: https://web.dev/learn/css/transitions
- W3C, animaciones por interacción: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- MDN, Web Animations API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
- interact.js, arrastre: https://interactjs.io/docs/draggable/
- canvas-confetti: https://github.com/catdad/canvas-confetti
- Motion, animate: https://motion.dev/docs/animate
- Anime.js, timeline: https://animejs.com/documentation/timeline/

Las reglas de prioridad, los tiempos propuestos y la elección de conservar GSAP son recomendaciones específicas de esta revisión; las fuentes documentan los mecanismos y principios que las sustentan.
