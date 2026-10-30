# ¿Qué tomamos? — evaluación de gamificación orientada a descubrir gustos

29 de octubre de 2026. Dirección corregida con la aclaración del usuario.

## Propósito confirmado

Resolver una situación previa a una fiesta: el grupo pregunta «¿qué tomamos?», delega en quien sabe de cócteles y esa persona quiere preparar opciones para todos. No puede entrevistar a cada invitado; muchos tampoco saben describir qué les gustaría.

La experiencia permite que cada persona se divierta explorando y creando su perfil de cóctel. Esas elecciones deben ayudar a quien organiza a elegir una carta viable para el grupo.

No es un juego de mesa ni una colección de actividades para animar la fiesta. Las propuestas previas de rondas, predicciones sobre el grupo, votaciones de nombres y retos sociales quedan retiradas de esta evaluación. El resultado individual y la planificación colectiva son dos partes del mismo problema.

## Qué cambia en la evaluación

La pregunta de diseño es: ¿cómo hacer que alguien descubra lo que le gusta mediante acciones comprensibles y divertidas, aunque no conozca nombres de cócteles?

El ciclo recomendado es explorar → observar el cambio → expresar una preferencia → recibir opciones explicadas. Cada apartado debe aportar una pieza útil al perfil. La recompensa principal es descubrir una bebida que provoca «eso sí me gustaría» y sentir que uno participó en crearla.

Crear puede significar componer una intención de sabor y encontrar una receta compatible. Debe distinguirse de formular una receta libre: seleccionar frutas y bases no demuestra que todas las combinaciones tengan una receta equilibrada. El código actual recomienda recetas del catálogo; no simula cualquier mezcla.

## Lectura de lo que ya existe

La revisión previa del código identificó seis apartados: alcohol, fruta, estilo, fuerza, restricciones y plan. Ya hay vaso reactivo, frutas por toque y arrastre, cartas de estilo, dosificador, recetas e insignias. Conviene conservar esa identidad y dar a cada interacción una consecuencia entendible.

Se mantienen estos hallazgos concretos:

- «Hoy quiero algo suave/atrevido» cambia el arquetipo, pero no cambia la receta. Para esta finalidad, la variación debe producir una recomendación diferente o explicar por qué no existe.
- Algunas síntesis de estilo toman el primer gusto aceptado, aunque se pueden aceptar varios. La interpretación no debe depender silenciosamente de ese orden.
- Las frutas elegidas funcionan como preferencias; la receta recomendada puede incluir solo algunas. El resultado debe explicar cuáles coinciden.
- «Otra» restricción no tiene tratamiento específico en el filtro `choca()`. Hace falta definir cómo capturarla y revisarla.
- Las coincidencias entre personas no resuelven por sí mismas la elección de bebidas para todos.
- En el archivo local revisado, la configuración pública de Supabase está vacía. No se validó un servicio desplegado ni un panel de organización.

## Mecánica propia para cada apartado

| Apartado | Experiencia recomendada | Qué permite descubrir | Información útil para organizar |
|---|---|---|---|
| Base | Explorar botellas con descripciones sencillas y servir una preferencia al vaso; incluir «no sé» y sin alcohol. | Qué carácter le atrae sin exigir conocer destilados. | Bases aceptadas, rechazadas o desconocidas. |
| Frutas y aromas | Incorporar ingredientes, observar el cambio y retirarlos libremente. | Familias que apetecen: cítrico, tropical, fresco, etc. | Afinidades y rechazos, separados de restricciones. |
| Sabor y textura | Conservar cartas y añadir una síntesis visible; permitir indicar un favorito o seguir sin él. | Diferenciar dulce/ácido de cremoso/espumoso/granizado. | Preferencias por dimensiones, no una etiqueta única. |
| Intensidad | Ajustar un medidor y comparar descripciones concretas. | Si busca algo ligero, intermedio o de carácter marcado. | Intensidad deseada; distinguir sabor de fuerza alcohólica. |
| Restricciones | Preparar una comanda clara con exclusiones y revisión. | Expresar lo que no puede tomar sin necesidad de conocimientos de recetas. | Condiciones obligatorias para seleccionar bebidas. |
| Contexto | Previsualizar ambientes o formas de disfrutar el cóctel, con opción indiferente. | Si prefiere algo largo y refrescante, de sobremesa, etc. | Una señal secundaria; no debe dominar el gusto. |

### Evitar que «no sé» detenga la experiencia

No conocer una base es distinto de rechazarla. Ofrecer una pista, una descripción o saltar sin penalización. Tampoco inferir un rechazo porque no seleccionó una opción que no conoce.

Se pueden usar comparaciones familiares como «¿te apetece más un postre cremoso o algo cítrico y fresco?», con «ambos» y «ninguno/no sé». Son pistas sobre preferencias, no equivalencias exactas con una bebida. La imagen y la descripción ayudan a imaginar; una pantalla no permite probar el sabor real.

### Hacer visible la consecuencia

El vaso puede cambiar color, textura, burbujas y adornos, acompañado por frases sencillas: «va tomando un perfil tropical y cremoso». Estas señales deben representar datos del catálogo o etiquetas definidas; no prometer que una mezcla arbitraria está equilibrada.

El gesto distintivo no necesita dificultad motora. Todas las acciones de arrastre deben poder hacerse por toque y teclado. La diversión proviene de explorar y ver una creación propia, sin perder por no saber coctelería.

## Resultado individual

La pantalla debe responder: «¿qué podría gustarme y por qué?».

Mostrar una recomendación principal y pocas alternativas contrastadas. Ejemplo de explicación: «Esta opción combina tu preferencia por piña y coco con una textura cremosa». Señalar si alguna preferencia no se pudo satisfacer.

Dar una respuesta útil para afinar: «me apetece», «prefiero menos dulce», «quiero otra textura» o «no me convence». Una receta que se ve atractiva todavía no es una bebida probada: registrar aceptación prevista y valoración después de probar como señales distintas.

Permitir explorar variantes sin borrar respuestas ni enviar cada ensayo como una decisión final al organizador. Un control explícito puede cerrar el perfil: «Estas opciones sí me apetecen».

Personaje, revelación e insignias son apoyos de personalidad. El cóctel, sus razones y la posibilidad de ajustar deben seguir siendo el centro. No hace falta convertir todo en puntuación ni añadir actividades sociales.

## Resultado para quien organiza

La otra mitad del producto necesita convertir perfiles en decisiones: «Con estas opciones puedo atender al grupo sin preparar un cóctel distinto para cada persona».

Propuesta de una vista de planificación:

- Número de respuestas recibidas y personas pendientes, si se conoce el total esperado.
- Preferencias agregadas y restricciones que requieren revisión.
- Una carta propuesta de pocas recetas, indicando a quién podría encajar cada una y quién sigue sin opción.
- Alternativas sin alcohol con el mismo cuidado de recomendación.
- Posibilidad de fijar una receta, sustituir otra y ver cómo cambia la cobertura.
- Ingredientes compartidos, equipo y dificultad para valorar si la carta es realizable.
- Lista de compra cuando existan cantidades, porciones y recetas suficientemente estructuradas.

Esto es una propuesta; no se confirmó su implementación en el proyecto.

### Definir bien «para todos»

Una receta debe cumplir las restricciones de una persona antes de contar como opción para ella. Después se evalúan afinidades y, mejor aún, las opciones que esa persona indicó que le apetecen.

El objetivo inicial puede ser cubrir al grupo con un conjunto pequeño de recetas, dando preferencia a opciones aceptadas y preparación sencilla. No optimizar únicamente por la bebida más popular: puede dejar fuera a quienes tienen restricciones o gustos diferentes.

Si faltan datos, hay una restricción sin resolver o alguien no tiene ninguna opción compatible, señalarlo. Una predicción de afinidad no equivale a aceptación ni a garantía de seguridad. No mostrar «todos cubiertos» sin una definición verificable.

Para compras, el número de invitados no basta: hacen falta porciones previstas, rendimientos y unidades. Es una fase posterior a confirmar la carta.

## Cómo aprovechar la investigación realizada

Las referencias siguen sirviendo, pero cambia la transferencia:

- [Potion Craft, descripción oficial](https://steamcommunity.com/app/1210320): manipular ingredientes y descubrir resultados inspira la exploración reversible.
- [Bartender Hustle](https://store.steampowered.com/app/1153210/Bartender_Hustle/): su preparación libre inspira la creación sin presión; el arcade no es una prioridad aquí.
- [VA-11 Hall-A](https://store.steampowered.com/app/447530/VA11_HallA_Cyberpunk_Bartender_Action/): inspira que las decisiones se reflejen en la respuesta del personaje, sin necesitar una novela extensa.
- [The Red Strings Club](https://store.steampowered.com/app/589780/The_Red_Strings_Club/): inspira conectar preparación y reacción; no usarlo para atribuir diagnóstico emocional a las preferencias.

Jackbox y Overcooked dejan de ser direcciones prioritarias para este producto. La investigación de [encuestas gamificadas de Keusch y Zhang](https://journals.sagepub.com/doi/10.1177/0894439315608451) sigue siendo pertinente: disfrute y calidad de respuestas requieren evaluación separada. No premiar elegir más ingredientes, bebidas fuertes o contestar rápido.

## Prioridad recomendada

1. Corregir la interpretación de las elecciones: múltiples estilos, desconocimiento frente a rechazo, restricciones y variantes reales.
2. Prototipar el ciclo individual completo: construir perfil, ver una recomendación explicada, ajustarla y confirmar opciones que apetecen.
3. Enriquecer las seis mecánicas sobre ese ciclo. Conservar cartas y frutas; desarrollar base, medidor y consecuencias visibles.
4. Prototipar una carta para el organizador con cobertura verificable y personas pendientes de resolver.
5. Añadir compras, cantidades y planificación de preparación cuando los datos lo permitan.

La prioridad es que la diversión produzca información útil y que esa información reduzca el trabajo de quien organiza. Más insignias o más animaciones, por sí solas, no completan ese recorrido.

## Validación propuesta

Primero, una prueba cualitativa pequeña con personas que no sepan describir sus gustos y alguien que suela organizar bebidas. No se han realizado entrevistas ni encuestas con usuarios en esta evaluación.

Tareas del invitado: explorar sin saber de destilados, cambiar una elección, expresar una exclusión y seleccionar opciones que le apetecen. Observar si comprende qué cambia y si disfruta construir su perfil.

Preguntas: «¿Qué crees que tendrá este cóctel?», «¿por qué te lo recomendaron?», «¿qué cambiarías?» y «¿hubo algo que elegiste solo para avanzar?».

Tarea del organizador: a partir de varios perfiles de prueba, escoger una carta pequeña y explicar qué persona tiene una opción y quién necesita revisión.

Medir por separado diversión, comprensión, aceptación prevista, restricciones preservadas, perfiles sin opción y esfuerzo de planificación. Si hay degustación posterior, comprobar también cuánto coincidió la recomendación con el gusto real. Tiempo y finalización son datos de apoyo, no la definición del éxito.

## Alcance y límites

Esta revisión corrige la dirección de producto a partir de la aclaración del usuario. Se basa en la lectura de código y fuentes realizada en esta conversación. No se modificó la aplicación ni se comprobó una experiencia en vivo. Las mecánicas y el panel propuestos necesitan prototipo y pruebas; no se atribuyen mejoras medidas ni plazos sin esa evidencia.
