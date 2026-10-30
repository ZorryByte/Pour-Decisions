# Último paso: el vaso te conoce

Plan vigente · 29 de octubre de 2026. Implementado y verificado en el navegador.

## Alcance

Convertir «¿Tu plan ideal de sábado?» en una conversación breve con el vaso. Mantener alcohol, frutas, estilo, fuerza y restricciones, junto con la estética crema, verde y naranja, las tipografías y el tono del primer apartado.

Retirar del recorrido de descubrimiento nombre, contacto, su aviso y cualquier registro obligatorio. Resolver usuarios después. No borrar datos existentes ni tablas ni colecciones personales.

En la revisión local anterior, juego.js ya mostraba «Descubrir mi cóctel» sin formulario personal en el recorrido principal; index.html conservaba identityForm() y rutas de guardado. Volver a revisar ambas rutas al implementar.

## Contenido vigente

Usar [BANCO-PREGUNTAS-VARIADAS.md](BANCO-PREGUNTAS-VARIADAS.md) y su fuente estructurada [preguntas-propuesta.json](preguntas-propuesta.json).

- 48 preguntas: los 40 temas originales y ocho nuevas de sinceridad, pleitos, infidelidad y caos.
- 16 de sí/no, 16 de cuatro opciones y 16 dilemas de dos elecciones concretas.
- 128 reacciones, una por respuesta posible.
- Retiradas las preguntas sexuales de la revisión anterior. Se conserva coqueteo ligero.

## Flujo

Inicio → alcohol → frutas → estilo → fuerza → restricciones → tres preguntas sorpresa → descubrir mi cóctel → resultado → volver a jugar.

1. Sortear una pregunta de cada formato y barajar el orden de los formatos. Favorecer categorías temáticas distintas.
2. Mantener los seis apartados generales y añadir progreso interno «Pregunta 1 de 3».
3. Adaptar las opciones al formato. Cada pregunta admite una sola respuesta activa.
4. Elegir marca en naranja y activa la reacción específica y la expresión del vaso. El comentario permanece hasta continuar.
5. «Siguiente pregunta» avanza. «Atrás» conserva pregunta, respuesta y reacción; desde la primera vuelve a restricciones.
6. «Otra pregunta» reemplaza la actual sin penalización. Aplicar las reglas de agotamiento del banco.
7. «Descubrir mi cóctel» abre el resultado sin datos personales. Si se agota el banco por saltos, permitir continuar con menos respuestas.
8. «Volver a jugar» sortea otra partida; «Ajustar mis gustos» conserva la actual.

## Sorteo y persistencia

Usar tres bolsas barajadas de 16 preguntas, una por formato. Sin saltos se muestra todo el banco en 16 partidas sin repetir. Los saltos marcan una pregunta como vista y pueden agotar una bolsa antes; entonces ofrecer otro formato pendiente o continuar al resultado. No reciclar silenciosamente mientras queden inéditas. Renovar al agotarse las tres bolsas, evitando duplicados dentro de la partida.

Recarga, retroceso y cambio de respuesta no modifican el sorteo. Guardar estado local versionado y usar memoria si el almacenamiento no está disponible. Migrar sesiones antiguas con sel.plan sin bloquear el resultado.

## Diseño y respuesta del vaso

Mantener el estilo del primer apartado. En escritorio, vaso a la izquierda y pregunta a la derecha. En móvil, vaso compacto y reacción cerca de las opciones. Entrada: «Ya sé qué te gusta. Ahora cuéntame cómo va la noche.»

Asignar una expresión existente a cada reacción al integrar. No convertir todas las preguntas en botones sí/no. Usar teclado, foco visible, controles semánticos, aria-live="polite" y movimiento reducido. No añadir cronómetros ni castigos por saltar.

## Resultado

La receta depende de preferencias explícitas y restricciones verificadas del catálogo. Los dilemas aportan guiños al cierre; no predicen sabor, fuerza alcohólica ni personalidad psicológica ni desempatan recetas por conducta social.

Explicar primero las coincidencias reales de la receta. Después puede añadirse «Y ya sé que pedirías revancha aunque fuera tarde», si esa fue su elección. Mantener sin alcohol y restricciones como condiciones obligatorias. Si no hay una receta compatible, permitir ajustar gustos sin perder la partida.

## Implementación realizada

1. Revisar identityForm() y sus entradas en index.html; garantizar resultado desde el recorrido principal y alternativo sin registro ni conexión.
2. Integrar el banco en un módulo del juego. La propuesta JSON usa pares [texto, reacción]; al integrar, añadir identificadores estables por opción y expresiones del vaso.
3. Añadir estado versionado para bolsas, preguntas elegidas, índice y respuestas. Separarlo del historial de frases de alcohol.
4. Sustituir planChoices() y revisar blocked(), goNext(), goBack(), showForm, rótulos y dependencias de api.step === 5 y sel.plan en juego.js.
5. Conectar el recorrido alternativo de index.html al mismo banco y estado, aunque fallen las animaciones.
6. Revisar planActual() y los consumidores de p_plan. No enviar las nuevas confesiones a registrar_respuesta; el contrato del futuro sistema de usuarios queda pendiente.
7. Añadir los guiños del cierre sin alterar la compatibilidad de recetas.

## Verificación realizada

- 48 identificadores únicos, 16 preguntas por formato, 128 reacciones completas.
- Tres formatos por partida normal, preguntas distintas y opciones adecuadas a cada formato.
- Cambio de respuesta, retroceso y recarga conservan el sorteo y actualizan solo la selección y reacción pertinentes.
- Saltos, agotamiento desigual y renovación del banco no producen bucles.
- Resultado accesible sin datos personales ni conexión; preferencias y restricciones respetadas en recomendación y alternativas.
- Revisar escritorio, móvil, teclado y movimiento reducido; conservar las interacciones anteriores de alcohol, frutas, estilo y fuerza.

## Entrega verificada

- Banco publicado en preguntas-datos.js y motor de partida en preguntas.js; presentación en preguntas.css.
- Último paso integrado en juego.js y recorrido alternativo de index.html, con resultado directo y sin formulario personal.
- Partida guardada en la sesión, historial de bolsas en almacenamiento local, sin envío de las respuestas al servidor.
- Recarga real del navegador conserva la pregunta y las selecciones. El reinicio explícito sigue disponible desde el resultado.
- Pruebas: tests/preguntas.test.cjs y tests/preguntas-browser.mjs. El navegador recorre las 48 preguntas y 128 reacciones; verifica los tres formatos a 1440, 768, 390 y 320 píxeles, resultado sin identidad, recarga real, retroceso, ranking independiente de confesiones y recorrido sin animaciones.
- Capturas en artifacts/preguntas/. Se conserva el tipo de letra existente; el detector de diseño solo señala su aviso previo sobre Fraunces.
