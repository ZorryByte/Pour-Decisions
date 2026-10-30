# Etapa de alcohol

La etapa está separada en `src/features/juego-trivia/etapas/alcohol/`:

- `alcoholView.js` construye los grupos, botones, iconos de botella y estados
  accesibles originales. Recibe los constructores DOM existentes y las acciones
  de presentación por parámetros. No contiene reglas de selección.
- `alcoholViewModel.js` consulta y modifica `partida.sel.alcohol`, conservando
  límite, selección múltiple y exclusión de «Sin alcohol». No crea un Set propio
  ni accede a DOM, almacenamiento o bibliotecas de animación.

La inicialización crea una sola instancia del ViewModel. El recorrido animado
utiliza `toggle(valor)` y la ruta sencilla utiliza `setSelection(valor, marcado)`.
Se mantiene la diferencia anterior: los botones animados comprueban el límite
antes de aplicar exclusiones; el formulario sencillo aplica primero la exclusión.
La selección de «Sin alcohol» con cinco bases respeta el comportamiento previo
de cada ruta. No se han añadido validaciones ni cambiado esas reglas.

`views/juego.js` conserva la coordinación de escena: ingrediente nuevo, mensaje
«Cinco es el tope.», persistencia, renderizado y recuperación del foco. El motor
de voz, vaso, servido, colores y animaciones sigue en su ubicación actual. Los
estilos originales no se han movido ni modificado. La Vista de alcohol consulta
el ViewModel cada vez que se construye, en los mismos puntos de actualización.

La recuperación puede reemplazar `partida.sel.alcohol` y el reinicio puede
limpiarlo: el ViewModel siempre consulta la referencia actual. Las elecciones de
fruta, estilo y fuerza permanecen independientes. No necesita un Modelo de red
propio porque esta etapa no consulta ni guarda datos por separado.

## Verificación

- `npm test` compara ambas rutas con las funciones del respaldo para las 128
  combinaciones de alcohol, cada opción y su selección/retirada. Comprueba límite,
  exclusiones, referencia compartida y recuperación de selecciones.
- `npm run test:browser` compara 12 acciones mediante los botones reales: selección,
  retirada, límite, «Sin alcohol», clases, estados accesibles, foco y guardado.
  Conserva las 27 capturas idénticas al original y las pruebas de navegación,
  recomendaciones, vaso y perfil.
- `npm run build` comprueba la compilación.

Las pruebas de restauración permiten únicamente las sustituciones registradas en
`tests/fixtures/alcohol-extraccion.json`, además de las extracciones anteriores,
y comparan el resto con el respaldo original. Frutas ya está separada en su
[etapa propia](etapa-frutas.md); la siguiente etapa pendiente es estilos/Tinder.
