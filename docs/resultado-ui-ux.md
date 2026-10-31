# Refinamiento del resultado

La prioridad acordada es entender el resultado y consultar la receta. Se conserva la identidad ilustrada, los colores por elemento, las tipografías y los datos del producto.

- El nombre del cóctel es el título principal; el arquetipo y el elemento explican su personalidad.
- La receta aparece antes de acciones personales, coincidencias, insignias y alternativas. Un botón lleva a ella y coloca el foco en su título.
- Espaciado principal de 8, 16, 24, 32, 48 y 64 px; bordes compartidos y columnas con `minmax(0,1fr)`.
- Las explicaciones opcionales y las historias de insignias usan `details/summary` nativos. Ingredientes y preparación permanecen visibles.
- Guardar y compartir tienen su propio bloque. Las opciones para cambiar elecciones o empezar de cero están junto a «Otra vuelta». El reinicio es directo, por petición del usuario.
- Cambiar entre suave y atrevido conserva foco y posición de lectura.
- Cada copa lleva una sola guarnición, tomada de su primera fruta, con un anclaje propio para cada geometría de vaso. Los cítricos, piña, mango, coco, fresa, sandía, durazno y maracuyá se muestran cortados; la menta es una sola hoja. La función se comparte entre resultado, perfil e imagen para enviar.

## Criterio de UX y fuentes

La agrupación por proximidad y la diferencia de tamaño organizan el recorrido; los fondos separan bloques sin añadir contenedores innecesarios. La escala de 8 px es una convención de consistencia, no una ley psicológica.

- [Nielsen Norman Group: acordeones en escritorio](https://www.nngroup.com/articles/accordions-on-desktop/): valorar el coste de ocultar información y de pedir clics adicionales. Aquí se reserva la divulgación progresiva para contenido opcional.
- [W3C: patrón de acordeón](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/): nombres y estados accesibles, interacción por teclado. Se aprovecha el comportamiento nativo de `details/summary`.
- [Comisión Europea: uso de acordeones](https://ec.europa.eu/component-library/eu/components/accordion/usage/): mantener visible la información importante.
- [Discusión en r/UXDesign sobre indicadores de acordeón](https://www.reddit.com/r/UXDesign/comments/1eg9fzs): experiencia de profesionales sobre hacer clicable toda la cabecera y evitar esconder respuestas breves. Se toma como evidencia anecdótica, no como estudio de usuarios.

## Validación y límites

`npm test`, `npm run build`, `node tests/compartir-browser.mjs` y `node tests/resultado-browser.mjs --inspect` cubren lógica, producción, compartir, cuatro anchos (320/390/768/1440), foco, teclado, navegación a receta e insignias, conservación del scroll y reinicio directo.

El inspector de diseño mide 1440/768/390. Se documenta una excepción `no-title`: su comprobación de app toma el primer `h1` del DOM, que pertenece a la bienvenida oculta. La prueba de navegador comprueba por separado que existe exactamente un `h1` visible en el resultado.

Se conservan tres advertencias justificadas: crema del texto de marca, contornos de controles y dibujos que el detector interpreta como paneles, y contenido complementario debajo del primer viewport. El lint global también detecta un símbolo de selección y una sombra en la etapa de frutas, fuera del resultado refinado.

Dirección de referencia: Accent ladder, semilla 1956785086, conservando paleta y tipografía. La ilustración existente y sus tintes por elemento dan identidad al objeto principal; no se añadieron fotografías externas, testimonios, cifras ni recetas de ejemplo.
