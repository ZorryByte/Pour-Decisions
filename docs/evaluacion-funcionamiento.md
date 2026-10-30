# Evaluación funcional — 29 de octubre de 2026

La aplicación compila y supera sus pruebas existentes, pero tiene fallos de
integración y cobertura que impiden afirmar que todo funciona correctamente.
Esta entrega es una evaluación: se añadió una auditoría reproducible y su evidencia;
no se modificaron las reglas del juego ni los requisitos de las insignias.

## Verificaciones ejecutadas

- `npm test`: 79 pruebas aprobadas.
- `npm run build`: compilación aprobada.
- `npm run test:browser`: aprobado en Chromium fuera del entorno restringido.
  La primera ejecución restringida agotó el tiempo de espera en `Page.enable`.
  La repetición completó paridad visual y funcional, navegación, selecciones,
  animación y cuenta con 37 solicitudes a una API simulada, sin errores de consola.
  Incluye tamaños de 1440, 768 y 390 píxeles.
- `node scripts/evaluar-funcionamiento.mjs`: 6.191 escenarios dirigidos sobre
  las 157 recetas. Valida inclusión con etiquetas propias, nombres únicos,
  porcentajes enteros entre 0 y 100 y 100% al elegir las etiquetas propias.
  También ejecuta el objeto real de integración de `Juego.init` en un entorno
  aislado para inspeccionar lo que recibe el motor de insignias.
- Revisión de las fórmulas SQL de coincidencias entre personas. No se ejecutó
  una base remota real; la API simulada no verifica la ejecución de esas funciones.

Las pruebas de paridad conservan el comportamiento de una copia anterior.
Que pasen no demuestra que las reglas de producto estén completas o libres de bugs.
La auditoría devuelve evidencia de problemas conocidos; su salida satisfactoria
indica que se completaron las comprobaciones, no que el producto no tenga fallos.

## Hallazgos

### P1 — Las respuestas no llegan a las insignias

`src/app/iniciarSistema.js`, objeto pasado a `Juego.init`, no expone
`badgeAnswers`. `badgeBlock` llama `Insignias.collect(api)` y el motor únicamente
lee `api.badgeAnswers` si no recibe respuestas como segundo argumento.

Resultado: las 35 insignias específicas de preguntas no se pueden conseguir
por la interfaz actual. Las 14 rutas alternativas añadidas a insignias anteriores
tampoco reciben las respuestas necesarias.

Reproducción: responder «Sí» a la pregunta 1 debería permitir «Judas en dúo».
El objeto real de integración no contiene respuestas; no concede la insignia.
El mismo motor con `[{questionId:1, optionIndex:0}]` explícito sí la concede.
Las pruebas existentes le proporcionan ese dato manualmente y no detectan el hueco.

Corrección propuesta: un adaptador que derive las respuestas válidas de
`Preguntas.snapshot()` en el momento de consultar las insignias, sin sumar
respuestas de otras partidas; probar el recorrido completo por la interfaz.

### P1 — Insignias que requieren un paso eliminado

El inicio de la aplicación y `Juego.init` vacían `sel.plan` cuando existe
`Preguntas`. Las preguntas sustituyen la elección de plan y no lo vuelven a asignar.

Hay 14 insignias que aún necesitan ese plan y carecen de ruta alternativa:

| Insignia | Plan necesario |
| --- | --- |
| Yo solo venía a saludar | Fiesta |
| Producción sin presupuesto | Fiesta |
| Se hizo lo que se pudo | Aventura |
| Doctor Strange del minibar | Aventura |
| Rápidos y curiosos | Aventura |
| Tom Nook pone la cuenta | Playa |
| Canela ya lo anotó | Playa |
| Refugio 33: barra libre | Aventura |
| Sweater Weather | Cena |
| Poción de dudosa procedencia | Aventura |
| Un Moe de confianza | Cena |
| La build prohibida | Aventura |
| Esto no sale en el crafteo | Fiesta |
| Cinco estrellas, cero deudas | Playa |

Estos logros siguen bloqueados incluso después de conectar las respuestas.
Debe decidirse si vuelven los planes o se adaptan los requisitos al recorrido
actual. Los textos de cómo conseguirlos también deben reflejar la decisión.

### P1 — Once recetas siempre quedan fuera de la selección inicial

El motor acepta las 157 recetas. El resultado muestra una receta principal y
solo ocho alternativas mediante `.slice(0, 8)` en `renderResult`.

Para un visitante sin afinidad de cuenta y con el flujo actual sin plan, estas
once recetas tienen al menos nueve competidoras que siempre ganan su posición:

- Margarita clásica sin alcohol.
- Ranch water sin alcohol.
- Moscow mule sin alcohol.
- Vodka limón sin alcohol.
- Kamikaze sin alcohol.
- Gin tonic sin alcohol.
- Tom Collins sin alcohol.
- Gin rickey sin alcohol.
- Whisky sour sin alcohol.
- Roy Rogers.
- Té helado de limón.

No es solo un resultado de muestreo: la auditoría identifica competidoras con
la misma base y fuerza, frutas y estilos que contienen todos los de la receta
oculta, nombre anterior en el desempate y restricciones que nunca las excluyen
si la receta objetivo sigue permitida. Esas competidoras puntúan igual o mejor
y siempre ganan los desempates. La evidencia guarda sus nombres por receta.

Ejemplo: «Vodka limón sin alcohol» tiene 33 competidoras así; incluso con sus
etiquetas exactas y 100% aparece en el puesto 34 en el mejor caso de la búsqueda
dirigida. La afinidad personal puede modificar el orden; esta conclusión se
refiere al resultado inicial sin ese ajuste, no a todas las vías del perfil.

Corrección propuesta: permitir ver todas las alternativas compatibles con
paginación o «Ver más», conservando los filtros. La prueba de cobertura debe
comprobar acceso a cada receta, además de su presencia en `ranked()`.

### P1 — «Otra» restricción se ignora en el juego

`chocaConRestricciones` no trata `otra`. El asistente acepta esa selección y
continúa recomendando recetas: la auditoría reproduce 14 resultados con ron.
El perfil, en cambio, bloquea «Por descubrir» cuando contiene `otra`.

Corrección propuesta: usar la misma política en ambos recorridos y solicitar
aclaración de esa restricción antes de presentar una receta como compatible.
Las pruebas actuales conservan expresamente la excepción anterior y por eso pasan.

### P1 — Recetas sin alcohol con ingredientes ambiguos

Mimosa, Bellini y French 75 sin alcohol están etiquetados `Sin alcohol`, pero
ofrecen «Espumoso o soda» sin especificar espumoso sin alcohol. Bellini y French
75 sin alcohol además terminan con «Completa con espumoso».

Corrección propuesta: hacer explícito el ingrediente sin alcohol y mantenerlo
en los pasos. No basta con que la categoría diga que la bebida no contiene alcohol.

### P2 — Las insignias antiguas solo consideran el primer estilo

La interfaz actual permite aceptar varios estilos. Sin embargo, `sweet`, `sour`,
`creamy`, `fresh` y el historial de descubrimientos usan `first('sabor')`.
`commitEstilo` coloca los estilos en un orden fijo, comenzando por Dulce y Ácido.

Aceptar Dulce y Refrescante deja `fresh === false`, por lo que no se considera
el gusto refrescante en muchas insignias antiguas y sus rutas alternativas.
Aceptar Dulce y Ácido tampoco registra ese descubrimiento como ácido.
Las insignias nuevas con grupos de bebida sí leen todos los estilos.

Corrección propuesta: definir qué logros significan «incluye el estilo» y cuáles
exigen una elección exacta. Usar pertenencia al conjunto para los primeros y
registrar los estilos completos en el historial, con migración de datos anteriores.

## Cómo funcionan las mezclas y los porcentajes

Las mezclas se eligen de un catálogo fijo de 157 recetas; el juego no crea una
receta nueva al combinar selecciones. Las preguntas de personalidad no modifican
los ingredientes ni la puntuación de las recetas.

1. Se descartan recetas que chocan con las restricciones reconocidas.
2. Si hay recetas con al menos una coincidencia en cada grupo seleccionado
   —base, fruta y estilo— solo se incluyen esas coincidencias estrictas.
3. Si no hay ninguna, se ofrecen alternativas parciales que conservan una base
   elegida. Pueden no contener la fruta o el estilo solicitado.
4. La fuerza y la afinidad de cuenta cambian el orden. El plan desempata cuando
   existe, pero el flujo de preguntas actual lo deja vacío.
5. Se presenta la primera receta y hasta ocho alternativas.

| Componente del porcentaje estricto | Peso |
| --- | --- |
| Bases elegidas presentes | 45 |
| Frutas elegidas presentes | 35 |
| Estilos elegidos presentes | 25 |
| Fruta indiferente | 12, en lugar del bloque de frutas |

Se divide la puntuación por los pesos activos; elegir varias bases penaliza
también las bases solicitadas que faltan, hasta 20 puntos. Los ingredientes
adicionales de la receta no bajan el porcentaje. Las alternativas parciales
tienen un límite de 54%; no hay bandas visuales de compatibilidad definidas.
Una coincidencia estricta con muchas preferencias puede tener menos de 55%:
no debe deducirse el tipo de coincidencia solo por el número.

Los porcentajes comprobados no salen de 0–100. Pero el 100% no significa que
se cumpla la fuerza: Ron + Piña + Dulce + Fuerte devuelve, por ejemplo,
Blue Hawaiian de fuerza media con 100%. Es una limitación del significado del
porcentaje, no un desbordamiento. Debe aclararse el texto o incluir la fuerza
si la intención es medir compatibilidad total.

## Cómo se consiguen y guardan las insignias

Hay 81 insignias: 22 de cobre, 34 de plata y 25 de oro. El rango es una
clasificación fija de cada logro; no se asciende automáticamente de cobre a oro.

- Las diez nuevas de cobre dependen de una respuesta concreta.
- Las catorce nuevas de plata requieren dos respuestas y al menos una elección
  de cada grupo de bebida especificado; permiten elecciones adicionales.
- Las once nuevas de oro requieren tres respuestas y una combinación exacta
  de base, frutas, estilos y fuerza, sin extras.
- Las 46 anteriores combinan gustos, recetas descubiertas, historial y, en
  varios casos, los planes que ya no se seleccionan.

Las condiciones se evalúan al mostrar el resultado. Descubrir y seleccionar
una receta cuenta; no hace falta prepararla, consumirla ni guardarla en la cuenta.
Ver una ficha alternativa sin elegirla no cambia la receta descubierta.
Los logros obtenidos permanecen aunque se cambien las respuestas después.

Se guardan en `localStorage`, separados por evento y nombre normalizado o
identidad de persona; los invitados sin nombre usan una identidad de sesión.
Esto no es sincronización de insignias con la cuenta remota. Dos personas con
el mismo nombre en el mismo evento y navegador pueden compartir el historial
si todavía no tienen identidades distintas. Las respuestas personales no se
persisten en los registros de insignias: se guardan logros y descubrimientos.

## Compatibilidad entre personas

Es una fórmula distinta del porcentaje de receta. La función SQL
`coincidencias` suma hasta 40 por bases, 30 por frutas, 15 por estilo y 15 por
fuerza. Bases y frutas usan intersección dividida por unión; ambos grupos de
fruta vacíos dan 30, uno vacío da 15. El resultado se redondea y limita a 0–100.

Devuelve hasta tres personas del mismo evento, tomando la última respuesta de
cada una. No incluye a la persona solicitante.

Limitaciones observadas por lectura del código:

- El estilo se guarda como un texto unido por comas y se compara por igualdad
  completa. Dulce y «Dulce, Refrescante» reciben cero de esos 15 puntos pese a
  compartir un gusto. Es una regla que conviene revisar con el formato multiselección.
- `phrase()` atribuye una coincidencia de estilo cuando el porcentaje es al
  menos 40, sin comprobar el estilo de la otra persona. La RPC solo devuelve
  nombre y porcentaje, por lo que la frase puede afirmar una coincidencia inexistente.
- Las pruebas de navegador usan servicios simulados; queda pendiente comprobar
  funciones, permisos y migraciones en una base de pruebas PostgreSQL/Supabase real.

## Evidencia y prioridades propuestas

La evidencia completa está en `artifacts/evaluacion/funcionamiento.json` y se
regenera con `node scripts/evaluar-funcionamiento.mjs`.

Orden sugerido: conectar respuestas; resolver logros de planes retirados;
dar acceso al catálogo completo; unificar restricciones y corregir recetas
sin alcohol; adaptar logros multiselección; aclarar porcentajes y frases sociales.
