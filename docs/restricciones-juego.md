# Restricciones del juego

La comprobación original de incompatibilidades está en
`src/features/juego-trivia/domain/restricciones.js`.
`chocaConRestricciones(coctel, exclusiones)` recibe una receta y un `Set` de
restricciones; devuelve un booleano sin leer ni modificar estado global, DOM,
almacenamiento o red. El texto de la receta se prepara dentro del mismo módulo.

`iniciarSistema.js` conserva `choca(c, exclusions = sel.alergia)` como adaptador.
Por tanto, la clasificación, el cambio de receta al navegar y el perfil siguen
utilizando la misma comprobación y las mismas selecciones. No cambia el orden
de los resultados ni los puntos de renderizado.

Se conservan literalmente las expresiones y prioridades anteriores: «ninguna»
anula la comprobación, la crema de coco conserva su excepción y las coincidencias
se buscan en nombre, frutas, ingredientes y descripción. Esta extracción no
amplía ni corrige la detección anterior.

El filtro adicional del perfil permanece en su adaptador: «otra» impide mostrar
sugerencias y se siguen comprobando la elección exclusiva de «Sin alcohol» y la
fuerza. La clasificación de fuerza y los pesos de recomendación ya se separaron
en el [dominio de recomendación](recomendaciones-juego.md); el estado de partida
sigue pendiente de extracción.

## Verificación

- `npm test`: compara toda la carta contra la función del respaldo original con
  128 combinaciones de restricciones, incluyendo una clave desconocida; comprueba
  casos de coincidencias y excepciones, y que no se muten catálogo ni selecciones.
- `npm run test:browser`: compara 27 capturas a 1440, 768 y 390 píxeles, comprueba
  la animación del vaso y las mismas recomendaciones y orden para las 64
  combinaciones de restricciones conocidas. También recorre el perfil con API
  simulada y verifica sus filtros.
- `npm run build`: comprueba la compilación de la aplicación.

La prueba de restauración sigue comprobando el resto de `iniciarSistema.js`
contra el original; permite únicamente la extracción documentada.
