# Recomendación de cócteles

Las reglas existentes están en
`src/features/juego-trivia/domain/recomendarCocteles.js`. Reciben catálogo,
selecciones y la opción de fruta indiferente como argumentos. No leen DOM,
almacenamiento, sesión ni estado global; no modifican el catálogo ni las elecciones.

Se han extraído coincidencias, elegibilidad, puntuación estricta, alternativas
parciales, clasificación y ajuste de fuerza, desempate por plan, orden final y
porcentajes. Se conservan los pesos, penalizaciones, prioridades, tolerancia del
desempate numérico, comparación de nombres en español y límite de porcentajes
parciales del código original. Si hay coincidencias estrictas no se agregan las
alternativas parciales, como antes.

`ranked(catálogo, selecciones, frutaIndiferente, afinidad)` reutiliza el módulo de
restricciones. La afinidad opcional se recibe como una función; por defecto vale
cero. Su implementación sigue perteneciendo a cuenta y no se duplica en el juego.
La afinidad y el ajuste de fuerza afectan al orden, no al porcentaje mostrado.

`iniciarSistema.js` conserva adaptadores para `hitsOf`, `fuerzaDe`, `ranked` y
`matchPercent`, que pasan las elecciones actuales en cada llamada. El acceso a
`Perfil.boost` permanece en ese límite de integración. No se crea un segundo
estado de partida ni una copia persistente de las elecciones.

Las Vistas, los textos como «% parecido», los eventos, la navegación, el renderizado
y las animaciones conservan su código anterior. La comprobación del perfil utiliza
la misma clasificación de fuerza mediante el adaptador existente.

## Verificación

- `npm test` ejecuta las reglas del respaldo original como referencia independiente
  y compara resultados completos, orden, coincidencias, elegibilidad, puntuaciones,
  fuerza y porcentajes. Cubre las 128 combinaciones de alcohol con y sin fruta
  indiferente, cada receta con las tres fuerzas y cuatro planes, restricciones,
  afinidad, alternativas parciales, catálogo vacío y desempates. También verifica
  que no se modifiquen los datos recibidos.
- `npm run test:browser` compara las 27 capturas originales, el orden con las 64
  combinaciones de restricciones y los resultados, porcentajes y coincidencias
  tras 48 cambios de elecciones en ambos sistemas. Conserva la comprobación de
  animación del vaso y el recorrido de cuenta con API simulada.
- `npm run build` comprueba la compilación.

La prueba de restauración permite únicamente los adaptadores documentados y
continúa comparando el resto de la inicialización con el respaldo. Los cálculos
del vaso se extrajeron después en su [módulo propio](calculos-vaso.md). Quedan para
otros pasos el estado compartido y la separación de etapas.
