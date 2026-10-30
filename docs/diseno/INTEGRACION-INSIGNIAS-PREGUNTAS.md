# Integración de insignias con las 48 preguntas

Preparado el 29 de octubre de 2026. El banco y su interfaz los integra otro chat. Este cambio prepara el catálogo y su evaluador; no implementa ni modifica el sorteo, los controles, las recetas o el guardado del cuestionario.

## Estado

- 81 insignias: 22 de cobre, 34 de plata y 25 de oro.
- 35 ligadas a las preguntas: 10 de cobre solo por una respuesta concreta, 14 de plata por dos respuestas más combinaciones flexibles de bebida y 11 de oro por tres respuestas más una combinación exacta de base, frutas, sabores/texturas y fuerza. Incluyen las 30 preparadas inicialmente y cinco adicionales: dos de The Neighbourhood, dos de Kanye West y una de Evangelion.
- Plata: se exige al menos una opción de cada grupo indicado. Las alternativas dentro del grupo se unen con «o» y los grupos con «y»; se permiten otras selecciones además. Algunas usan base + sabores + fuerza; otras también frutas. No dependen únicamente de la fruta.
- Oro: deben coincidir todos los conjuntos indicados, sin bases, frutas, estilos ni fuerzas adicionales. El orden de selección no importa. El plan no es un requisito de las 35 nuevas. Ninguna exige una alergia ni cambiar una restricción.
- 14 existentes con vías alternativas. Nombres, frases, rangos y vías anteriores conservados.
- Las 48 preguntas aportan al menos a una insignia. Cada combinación nueva usa como máximo una pregunta de cada formato, para que sea obtenible en una partida normal.
- Las pendientes permanecen ocultas. El evaluador no acumula respuestas entre partidas ni guarda confesiones: solo persiste identificadores de logros y el historial previo de recetas.

## Conexión pendiente para quien integra el cuestionario

El código que monta las insignias ya llama a `Insignias.collect(api)` desde `juego.js`. Añadir al objeto de API del juego un getter llamado `badgeAnswers`, que devuelva únicamente las respuestas vigentes de la partida actual:

```js
// Ejemplo del valor esperado; adaptar el getter al estado real del cuestionario.
get badgeAnswers() {
  return [
    {questionId: 9, optionIndex: 0},
    {questionId: 21, optionIndex: 0},
    {questionId: 27, optionIndex: 0}
  ];
}
```

También se acepta pasar ese mismo array explícitamente como segundo argumento: `Insignias.collect(api, respuestasActuales)`. Para la interfaz existente conviene el getter, porque el resultado se monta y vuelve a renderizar desde varios sitios.

- `questionId`: entero original del banco `preguntas-propuesta.json`, entre 1 y 48.
- `optionIndex`: índice original de la opción, empezando en cero. No usar su posición visual si se barajan opciones. Si la integración añade identificadores estables a las opciones, traducirlos a este índice original antes de llamar al evaluador.
- Mandar solo preguntas respondidas y aún seleccionadas de esta partida. Quitar respuestas al saltar/reemplazar una pregunta y limpiar el getter al empezar otra partida. Una pregunta sin respuesta no es un «No».
- Las tres respuestas han de pertenecer a la misma partida. No enviar el historial, respuestas de otras personas ni un intento anterior.
- El evaluador ignora valores fuera de rango y tipos incorrectos. Si recibe dos opciones distintas para una pregunta, descarta esa pregunta; duplicados idénticos no alteran el resultado.
- Recarga y retroceso: la integración conserva su propio estado del cuestionario y reconstruye el array; este módulo no necesita guardar esas respuestas.
- Las vías de preguntas de Ekko, Jinx y Hula Girl conservan exactamente sus ingredientes, sabor y fuerza y reemplazan el antiguo requisito de plan por una respuesta. Así siguen siendo obtenibles cuando el paso de plan sea sustituido.
- Sin `badgeAnswers`, el catálogo anterior sigue funcionando y las nuevas esperan respuestas: no se desbloquean de forma automática.

No cambiar el ranking de cócteles ni sus restricciones por estas respuestas. No enviar confesiones al registro de la fiesta como parte de este cambio.

## Las 35 insignias de preguntas

### Cobre

#### Judas en dúo

Te invitaron a hacer equipo y vos ya estabas viendo cómo venderlo. Treinta monedas no, pero por ganar una partida sí te movés.

Condición: Dijiste que sí harías equipo para luego traicionarlo.

- Pregunta 1 · ¿Harías equipo con alguien para luego traicionarlo? → **Sí** (`optionIndex: 0`).

#### El VAR de sobremesa

Ibas perdiendo y apareció tu vocación de abogado. Qué casualidad que el reglamento solo te preocupa cuando no vas ganando.

Condición: Elegiste sacar el manual cuando vas perdiendo.

- Pregunta 2 · Vas perdiendo. ¿Te pones a revisar las reglas? → **Saco el manual** (`optionIndex: 0`).

#### Mal perder, buen ping

Si ganás, es habilidad. Si perdés, fue suerte. Qué estable está tu conexión y qué inestable tu versión de los hechos.

Condición: Después de perder, elegiste decir «Tuviste suerte».

- Pregunta 3 · Acabas de perder. ¿Qué dices? → **Tuviste suerte** (`optionIndex: 1`).

#### Qué SUSpechoso

Todos vieron a tu amigo salir del conducto y vos diciendo que seguro tenía sus razones. El impostor no necesita coartada: te tiene a vos.

Condición: Elegiste defender a tu amigo cuando creés que es el impostor.

- Pregunta 5 · Crees que tu mejor amigo es el impostor. ¿Qué haces? → **Lo defiendo** (`optionIndex: 2`).

#### Una más y desinstalo

Es tardísimo, perdiste y todavía querés revancha. El sueño se negocia; tu ego, por lo visto, no.

Condición: Elegiste pedir una revancha ahora, aunque ya sea tardísimo.

- Pregunta 6 · Ya es tardísimo y perdiste la última. ¿Qué prefieres? → **Una revancha ahora** (`optionIndex: 0`).

#### Fuente: Arial 12

No tenías pruebas, pero tampoco dudas. Lo dijiste tan convencido que alguien ya lo está repitiendo en otra mesa.

Condición: Elegiste inventarte una respuesta y decirla convencido.

- Pregunta 8 · Te toca responder y no tienes ni idea. ¿Qué haces? → **Me invento algo y lo digo convencido** (`optionIndex: 0`).

#### Rápidos y mentirosos

Dijiste «ya voy» desde tu cama. Toretto mueve carros; vos movés la hora de llegada.

Condición: Admitiste haber dicho «ya voy» mientras seguías en casa.

- Pregunta 9 · ¿Has dicho «ya voy» cuando todavía estás en casa? → **Sí** (`optionIndex: 0`).

#### Karaoke, pero de Temu

Pedimos la original y llegó tu versión. La melodía se parece; la letra la estás importando de otro universo.

Condición: Elegiste inventar la letra de una canción que no te sabés.

- Pregunta 11 · Suena una canción que no te sabes. ¿Qué haces? → **Me invento la letra** (`optionIndex: 0`).

#### Mi tío trabaja en Spotify

Antes tu tío trabajaba en Nintendo; ahora conocés al DJ. Cambia la industria, sigue sin aparecer ninguna prueba.

Condición: Admitiste decir que conocías al DJ sin conocerlo.

- Pregunta 15 · ¿Has dicho que conoces al DJ sin conocerlo? → **Sí** (`optionIndex: 0`).

#### Más vale taco que mal acompañado

El taco llegó con salsa, no con asuntos pendientes. Por una vez elegiste bien con hambre.

Condición: Elegiste ir por tacos en lugar de quedarte en la fiesta.

- Pregunta 19 · La fiesta está buena, pero te invitan a ir por tacos. ¿Qué eliges? → **Los tacos** (`optionIndex: 0`).

### Plata

#### Cuenta smurf, cara de santo

Te hacés el principiante y encima defendés al amigo sospechoso. Ese lobby no era casual: era una operación familiar.

Condición: Dijiste que sí fingirías ser principiante y elegiste defender al amigo sospechoso de ser impostor. Además, elegiste al menos una opción de cada grupo: base: Vodka o Ginebra o Tequila; sabores o texturas: Ácido o Refrescante o Espumoso; fuerza: Medio o Fuerte. Podés agregar otras opciones.

- Pregunta 4 · ¿Te harías pasar por principiante para sorprender a todos? → **Sí** (`optionIndex: 0`).
- Pregunta 5 · Crees que tu mejor amigo es el impostor. ¿Qué haces? → **Lo defiendo** (`optionIndex: 2`).

#### Mucho show, poca HBO

Te ofrecés para la mímica y si no sabés algo lo tapás con un chiste. Todavía no salió el piloto y ya querés renovar temporada.

Condición: Dijiste que sí a la mímica y elegiste soltar un chiste cuando no sabés responder. Además, elegiste al menos una opción de cada grupo: frutas: Fresa o Coco o Menta; sabores o texturas: Dulce o Cremoso o Refrescante; fuerza: Suave o Medio. Podés agregar otras opciones.

- Pregunta 7 · ¿Te animas a hacer mímica frente a todos? → **Sí** (`optionIndex: 0`).
- Pregunta 8 · Te toca responder y no tienes ni idea. ¿Qué haces? → **Suelto un chiste** (`optionIndex: 3`).

#### NPC desbloqueado

Saludás a gente que no ubicás y esperás a que el crush te hable primero. Mucho diálogo secundario, cero avance en la misión principal.

Condición: Admitiste saludar sin recordar a quién y elegiste esperar a que te salude quien te pone nervioso. Además, elegiste al menos una opción de cada grupo: base: Ron o Vodka o Sin alcohol; sabores o texturas: Dulce o Suave o Sedoso; fuerza: Suave o Medio. Podés agregar otras opciones.

- Pregunta 12 · ¿Has saludado a alguien sin acordarte de quién era? → **Sí** (`optionIndex: 0`).
- Pregunta 16 · Vas a saludar a alguien que te pone nervioso. ¿Qué haces? → **Espero a que me salude** (`optionIndex: 2`).

#### Speedrun del adiós

Llamada falsa y salida sin despedirte. Te faltó tirar una bomba de humo y desbloqueabas viaje rápido.

Condición: Elegiste fingir una llamada para irte y dijiste que sí te irías sin despedirte. Además, elegiste al menos una opción de cada grupo: base: Ginebra o Vodka o Sin alcohol; frutas: Limón o Naranja o Menta; sabores o texturas: Ácido o Refrescante o Espumoso. Podés agregar otras opciones.

- Pregunta 10 · Ya te quieres ir de la fiesta. ¿Cómo sales de ahí? → **Finjo que me están llamando** (`optionIndex: 0`).
- Pregunta 39 · ¿Te irías sin despedirte para ahorrarte otra hora de adioses? → **Sí** (`optionIndex: 0`).

#### Multiverso del despiste

Llegaste el día equivocado y querés armar algo igual. Doctor Strange abrió portales por menos; vos ni abriste la invitación.

Condición: Elegiste armar otro plan al llegar el día equivocado y dijiste que sí irías a una fiesta sin conocer a nadie. Además, elegiste al menos una opción de cada grupo: base: Ron o Tequila o Sin alcohol; frutas: Piña o Mango o Maracuyá; sabores o texturas: Dulce o Ácido o Granizado. Podés agregar otras opciones.

- Pregunta 13 · Llegaste a la fiesta, pero era otro día. ¿Ahora qué? → **Propongo hacer algo de una vez** (`optionIndex: 2`).
- Pregunta 17 · ¿Irías a una fiesta donde no conoces a nadie? → **Sí** (`optionIndex: 0`).

#### Capturame si podés

Borraste la captura y confiaste en el silencio del grupo. Qué fe tan bonita en gente que hace capturas de las capturas.

Condición: Elegiste borrar la captura del chat equivocado y admitiste usar la peda para decir lo que pensabas. Además, elegiste al menos una opción de cada grupo: base: Vodka o Tequila o Brandy; sabores o texturas: Ácido o Dulce o Sedoso; fuerza: Medio o Fuerte. Podés agregar otras opciones.

- Pregunta 14 · Mandaste una captura al chat equivocado. ¿Qué haces? → **La borro y espero que nadie la haya visto** (`optionIndex: 0`).
- Pregunta 41 · ¿Has usado la peda de excusa para decir lo que de verdad pensabas? → **Sí** (`optionIndex: 0`).

#### Los Sims: sin autonomía

Tus amigos eligen dónde vas y cómo te vestís. Te falta quedarte parado frente a un plato sucio para completar el personaje.

Condición: Elegiste ir sin preguntar el destino y dijiste que sí dejarías que tus amigos te vistieran. Además, elegiste al menos una opción de cada grupo: base: Ron o Ginebra o Sin alcohol; frutas: Coco o Menta o Durazno; sabores o texturas: Cremoso o Refrescante o Suave. Podés agregar otras opciones.

- Pregunta 18 · Te invitan a salir, pero no te dicen a dónde. ¿Qué preguntas primero? → **Nada, yo voy** (`optionIndex: 0`).
- Pregunta 20 · ¿Dejarías que tus amigos eligieran qué te pones para salir? → **Sí** (`optionIndex: 0`).

#### La Voz: edición con hambre

Nadie giró la silla, pero ya te pagaron la cena. Hasta compartís el último taco: este artista todavía se debe a su público.

Condición: Aceptaste cantar por la cena y dijiste que sí compartirías el último taco. Además, elegiste al menos una opción de cada grupo: frutas: Fresa o Naranja o Piña; sabores o texturas: Dulce o Refrescante o Espumoso; fuerza: Suave o Medio. Podés agregar otras opciones.

- Pregunta 21 · Te pagan la cena si cantas karaoke. ¿Aceptas? → **Sí, yo canto** (`optionIndex: 0`).
- Pregunta 23 · ¿Compartirías el último taco? → **Sí** (`optionIndex: 0`).

#### MasterChef del autoengaño

La comida está mala, vos la defendés y encima pagás de más. Gordon Ramsay ya estaría gritándote y todavía intentarías recomendarle el lugar.

Condición: Elegiste defender el restaurante malo y pagar la cuenta por igual aunque pediste menos. Además, elegiste al menos una opción de cada grupo: base: Brandy o Whisky o Sin alcohol; sabores o texturas: Cremoso o Dulce o Sedoso; fuerza: Suave o Medio. Podés agregar otras opciones.

- Pregunta 22 · Tú recomendaste el lugar y la comida está mala. ¿Qué haces? → **Intento defender el lugar** (`optionIndex: 1`).
- Pregunta 37 · Quieren dividir la cuenta por igual, pero tú pediste mucho menos. → **Pago igual para no darle vueltas** (`optionIndex: 0`).

#### Equipaje emocional de mano

Te vas de viaje mañana sin preguntar mucho y repetís una cita incómoda. Eso de viajar ligero nunca incluyó tus decisiones.

Condición: Aceptaste el viaje con una mochila sin más preguntas y dijiste que sí a otra oportunidad para una cita incómoda. Además, elegiste al menos una opción de cada grupo: base: Ron o Vodka o Sin alcohol; frutas: Mango o Maracuyá o Durazno; sabores o texturas: Dulce o Refrescante o Granizado. Podés agregar otras opciones.

- Pregunta 24 · Te invitan a un viaje mañana. Solo puedes llevar una mochila. → **Voy, ya veré qué llevo** (`optionIndex: 0`).
- Pregunta 31 · ¿Le darías otra oportunidad a una cita que fue incómoda? → **Sí** (`optionIndex: 0`).

#### CSI: Instagram

Veinte historias, tres teorías y un «jajaja» que según vos significa algo. El FBI ya cerró el caso; vos seguís ampliando la foto.

Condición: Admitiste confundir amabilidad con coqueteo y elegiste buscar una historia para responderle. Además, elegiste al menos una opción de cada grupo: base: Vodka o Ginebra o Sin alcohol; sabores o texturas: Dulce o Ácido o Espumoso; fuerza: Suave o Medio. Podés agregar otras opciones.

- Pregunta 28 · ¿Has pensado que te estaban coqueteando y solo eran amables? → **Sí** (`optionIndex: 0`).
- Pregunta 29 · La persona que te gusta subió veinte historias. ¿Qué haces? → **Busco una para responderle** (`optionIndex: 3`).

#### Tinder en cooperativo

Querés conocer a alguien, pero que venga tu grupo por si hay que hacer extracción. El romance empieza cuando todos ponen «yo sí voy».

Condición: Dijiste que no irías a una fiesta de desconocidos y preferiste conocer una cita en una salida en grupo. Además, elegiste al menos una opción de cada grupo: frutas: Fresa o Coco o Menta; sabores o texturas: Dulce o Cremoso o Refrescante; fuerza: Suave o Medio. Podés agregar otras opciones.

- Pregunta 17 · ¿Irías a una fiesta donde no conoces a nadie? → **No** (`optionIndex: 1`).
- Pregunta 32 · Tus amigos quieren presentarte a alguien para una cita. → **Prefiero que nos conozcamos en una salida en grupo** (`optionIndex: 2`).

#### Vecinos con derechos

Te prestaron atención y ya querés compartir código postal. The Neighbourhood en los audífonos; vos, mudándote a una relación que nadie confirmó.

Condición: Elegiste ensayar el saludo y admitiste confundir amabilidad con coqueteo. Además, elegiste al menos una opción de cada grupo: base: Ginebra o Brandy o Sin alcohol; frutas: Fresa o Durazno o Naranja; sabores o texturas: Dulce o Cremoso o Sedoso. Podés agregar otras opciones.

- Pregunta 16 · Vas a saludar a alguien que te pone nervioso. ¿Qué haces? → **Ensayo lo que voy a decir** (`optionIndex: 0`).
- Pregunta 28 · ¿Has pensado que te estaban coqueteando y solo eran amables? → **Sí** (`optionIndex: 0`).

#### 808s & Funadas

Tenías cero pruebas y demasiada confianza. Lo de echarle la culpa a la peda llegó después. Tu próximo lanzamiento debería ser un comunicado.

Condición: Elegiste inventarte una respuesta con convicción y admitiste usar la peda de excusa para decir lo que pensabas. Además, elegiste al menos una opción de cada grupo: base: Whisky o Tequila o Vodka; sabores o texturas: Ácido o Refrescante o Espumoso; fuerza: Medio o Fuerte. Podés agregar otras opciones.

- Pregunta 8 · Te toca responder y no tienes ni idea. ¿Qué haces? → **Me invento algo y lo digo convencido** (`optionIndex: 0`).
- Pregunta 41 · ¿Has usado la peda de excusa para decir lo que de verdad pensabas? → **Sí** (`optionIndex: 0`).

### Oro

#### Triángulo sin geometría

No le escribís al ex, te acercás a quien te gusta y se lo contás al amigo que también anda detrás. Un drama romántico con gente que sí habla: cancelado por falta de conflicto.

Condición: Dijiste que no escribirías al ex, elegiste acercarte a saludar al crush y contarle a tu amigo que te gusta la misma persona. Además, elegiste exactamente base: Ginebra; frutas: Limón + Naranja; sabores o texturas: Ácido + Refrescante; fuerza: Suave, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 25 · ¿Le escribirías a tu ex después de salir de fiesta? → **No** (`optionIndex: 1`).
- Pregunta 26 · Te gusta alguien de la fiesta. ¿Qué haces? → **Me acerco a saludar** (`optionIndex: 0`).
- Pregunta 30 · A tu amigo también le gusta la misma persona que a ti. → **Le cuento que a mí también me gusta** (`optionIndex: 0`).

#### Find My dignidad

El vaso puede perderse, el celular jamás. Entregaste hasta el micrófono antes de soltar el teléfono. Se nota qué objeto tiene seguro.

Condición: Admitiste perder tu vaso, elegiste salvar el celular al derramar la bebida y pasar el micrófono al quedarte sin voz. Además, elegiste exactamente base: Vodka; frutas: Sandía + Limón; sabores o texturas: Refrescante; fuerza: Medio, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 33 · ¿Has perdido tu vaso y encontrado tres iguales? → **Sí** (`optionIndex: 0`).
- Pregunta 34 · Se te cae la bebida mientras cuentas algo. ¿Qué haces primero? → **Salvo el celular** (`optionIndex: 1`).
- Pregunta 35 · Ya casi no tienes voz de tanto karaoke. ¿Qué prefieres? → **Pasarle el micrófono a otro** (`optionIndex: 0`).

#### Soporte técnico de la fiesta

Encontrás los celulares, reponés lo que rompés y ayudás a recoger. Viniste de invitado y terminaste siendo el adulto de guardia.

Condición: Admitiste buscar los celulares de todos, elegiste reponer lo que rompiste y empezar a ayudar al recoger. Además, elegiste exactamente base: Sin alcohol; frutas: Piña + Menta + Limón; sabores o texturas: Refrescante; fuerza: Suave, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 36 · ¿Te ha tocado buscar los celulares de todos en una fiesta? → **Sí** (`optionIndex: 0`).
- Pregunta 38 · Rompiste algo en casa de quien hizo la fiesta y nadie te vio. → **Lo cuento y ofrezco reponerlo** (`optionIndex: 0`).
- Pregunta 40 · La fiesta terminó y están recogiendo. ¿Qué haces? → **Empiezo a ayudar** (`optionIndex: 0`).

#### El señor de los límites

Decís lo que pensás, te hacés cargo y te alejás cuando ya te hartaron. Gandalf cuidaba un puente; vos, por fin, tu paz mental.

Condición: Admitiste usar la peda para decir verdades, elegiste hablar lo que dijiste a espaldas de alguien y alejarte al poner un límite. Además, elegiste exactamente base: Whisky; frutas: Naranja + Limón; sabores o texturas: Ácido; fuerza: Medio, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 41 · ¿Has usado la peda de excusa para decir lo que de verdad pensabas? → **Sí** (`optionIndex: 0`).
- Pregunta 42 · Estabas hablando mierda de alguien y resulta que estaba detrás. ¿Qué haces? → **Admito lo que dije y trato de hablarlo** (`optionIndex: 1`).
- Pregunta 43 · Alguien lleva toda la fiesta molestándote y ya te hartó. → **Le digo que me deje en paz y me alejo** (`optionIndex: 1`).

#### Esto no era la WWE

Buscás los celulares de todos, pedís disculpas cuando te descubren y te apartás de una pelea para pedir ayuda. Demasiada gestión de crisis para una entrada que ni te cobraron.

Condición: Admitiste buscar celulares, elegiste disculparte al ser descubierto hablando de alguien y apartarte a pedir ayuda tras intentar separar una pelea. Además, elegiste exactamente base: Sin alcohol; frutas: Naranja + Mango; sabores o texturas: Refrescante; fuerza: Suave, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 36 · ¿Te ha tocado buscar los celulares de todos en una fiesta? → **Sí** (`optionIndex: 0`).
- Pregunta 42 · Estabas hablando mierda de alguien y resulta que estaba detrás. ¿Qué haces? → **Le pido disculpas** (`optionIndex: 0`).
- Pregunta 44 · Te metiste a separar una pelea y te cayó un golpe. ¿Qué haces? → **Me aparto y pido ayuda** (`optionIndex: 0`).

#### Lealtad con recibo

No traicionás al equipo, hablás la cuenta y contás la infidelidad a solas. Sos de los pocos que todavía entregan la amistad con términos claros.

Condición: Dijiste que no traicionarías al equipo, elegiste hablar cómo dividir la cuenta y contarle a solas a tu amigo que le son infiel. Además, elegiste exactamente base: Ron; frutas: Limón + Menta; sabores o texturas: Dulce + Refrescante; fuerza: Medio, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 1 · ¿Harías equipo con alguien para luego traicionarlo? → **No** (`optionIndex: 1`).
- Pregunta 37 · Quieren dividir la cuenta por igual, pero tú pediste mucho menos. → **Lo hablo para ver qué acordamos** (`optionIndex: 3`).
- Pregunta 45 · Sabes que a tu amigo le están poniendo el cuerno. ¿Qué haces? → **Se lo cuento a solas** (`optionIndex: 0`).

#### Netflix canceló al ex

No escribís, silenciás y te vas si te ponen el cuerno. Esta vez no hay segunda temporada por mucho que la pida el protagonista.

Condición: Dijiste que no escribirías al ex, elegiste silenciar las historias del crush y terminar la relación ante una infidelidad. Además, elegiste exactamente base: Tequila; frutas: Maracuyá + Limón; sabores o texturas: Ácido; fuerza: Fuerte, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 25 · ¿Le escribirías a tu ex después de salir de fiesta? → **No** (`optionIndex: 1`).
- Pregunta 29 · La persona que te gusta subió veinte historias. ¿Qué haces? → **Le silencio las historias** (`optionIndex: 2`).
- Pregunta 47 · Tu pareja te fue infiel y nadie más lo sabe. ¿Qué harías? → **Terminaría la relación** (`optionIndex: 1`).

#### Google Fotos no olvida

Vos querés pasar página; el grupo te manda «un día como hoy». Ni la nube tiene tanto espacio como tus amigos para guardar tus cagadas.

Condición: Admitiste saludar sin recordar a quién, elegiste contar en el grupo que llegaste el día equivocado y temer que te recuerden el desastre de la fiesta. Además, elegiste exactamente base: Brandy; frutas: Durazno + Naranja; sabores o texturas: Dulce; fuerza: Medio, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 12 · ¿Has saludado a alguien sin acordarte de quién era? → **Sí** (`optionIndex: 0`).
- Pregunta 13 · Llegaste a la fiesta, pero era otro día. ¿Ahora qué? → **Me río y lo cuento en el grupo** (`optionIndex: 0`).
- Pregunta 48 · Vomitaste donde no debías. ¿Qué te daría más pena? → **Que mis amigos me lo recuerden cada vez que nos veamos** (`optionIndex: 1`).

#### Daddy Issues

Le escribirías al ex, te mirás todas sus historias y no contás a quién te gusta. La playlist está en privado; tus decisiones ya las escuchó todo el grupo.

Condición: Dijiste que sí escribirías al ex, elegiste ver todas las historias del crush y guardarte que te gusta la misma persona que a tu amigo. Además, elegiste exactamente base: Vodka; frutas: Fresa + Coco; sabores o texturas: Dulce + Cremoso; fuerza: Medio, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 25 · ¿Le escribirías a tu ex después de salir de fiesta? → **Sí** (`optionIndex: 0`).
- Pregunta 29 · La persona que te gusta subió veinte historias. ¿Qué haces? → **Las veo todas** (`optionIndex: 0`).
- Pregunta 30 · A tu amigo también le gusta la misma persona que a ti. → **Por ahora me lo guardo** (`optionIndex: 1`).

#### Ye pasaste

Usaste la peda de excusa, te descubrieron hablando mierda y todavía te alcanzó para mandar a alguien a la mierda. Te dieron un vaso y lo convertiste en una rueda de prensa sin abogado.

Condición: Admitiste usar la peda para decir lo que pensabas, elegiste cambiar de tema al ser descubierto hablando de alguien y mandar a la mierda a quien no deja de molestarte. Además, elegiste exactamente base: Whisky; frutas: Naranja + Maracuyá; sabores o texturas: Ácido; fuerza: Fuerte, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 41 · ¿Has usado la peda de excusa para decir lo que de verdad pensabas? → **Sí** (`optionIndex: 0`).
- Pregunta 42 · Estabas hablando mierda de alguien y resulta que estaba detrás. ¿Qué haces? → **Cambio de tema como puedo** (`optionIndex: 2`).
- Pregunta 43 · Alguien lleva toda la fiesta molestándote y ya te hartó. → **Lo mando a la mierda** (`optionIndex: 0`).

#### Subite al karaoke, Shinji

No hacés mímica, solo cantás si alguien te acompaña y después te escondés en los coros. Misato ya cambió tres veces de estrategia para que agarrés el micrófono.

Condición: Dijiste que no a la mímica, elegiste cantar solo acompañado y quedarte haciendo coros al perder la voz. Además, elegiste exactamente base: Sin alcohol; frutas: Coco + Piña; sabores o texturas: Cremoso; fuerza: Suave, sin bases, frutas, estilos ni fuerzas adicionales.

- Pregunta 7 · ¿Te animas a hacer mímica frente a todos? → **No** (`optionIndex: 1`).
- Pregunta 21 · Te pagan la cena si cantas karaoke. ¿Aceptas? → **Solo si alguien canta conmigo** (`optionIndex: 1`).
- Pregunta 35 · Ya casi no tienes voz de tanto karaoke. ¿Qué prefieres? → **Quedarme haciendo coros bajito** (`optionIndex: 1`).

## Las 14 existentes adaptadas

Se mantienen también las condiciones anteriores. Las siguientes son vías alternativas, no requisitos adicionales para logros ya obtenidos.

### No era sed, era apego

También podés obtenerla con sabor dulce y eligiendo ver todas las historias del crush.

- Pregunta 29 → **Las veo todas** (`optionIndex: 0`).

### El hielo también se fue

También: refrescante y suave, admitiendo que te irías sin despedirte.

- Pregunta 39 → **Sí** (`optionIndex: 0`).

### Ese mensaje era para Notas

También: escribirle al ex, ver todas las historias del crush y borrar la captura del chat equivocado.

- Pregunta 25 → **Sí** (`optionIndex: 0`).
- Pregunta 29 → **Las veo todas** (`optionIndex: 0`).
- Pregunta 14 → **La borro y espero que nadie la haya visto** (`optionIndex: 0`).

### Dictadura del Bluetooth

También: sabor refrescante y admitir que dijiste conocer al DJ sin conocerlo.

- Pregunta 15 → **Sí** (`optionIndex: 0`).

### El lore de la noche

También: aceptar la mímica, responder con un chiste y decirle al amigo que deje el show de la pelea.

- Pregunta 7 → **Sí** (`optionIndex: 0`).
- Pregunta 8 → **Suelto un chiste** (`optionIndex: 3`).
- Pregunta 46 → **Le digo que ya deje el show** (`optionIndex: 0`).

### Fuente: me lo inventé

También: cualquier fruta e inventarte una respuesta con convicción.

- Pregunta 8 → **Me invento algo y lo digo convencido** (`optionIndex: 0`).

### Esto es cine

También: elegir naranja y aceptar hacer mímica frente a todos.

- Pregunta 7 → **Sí** (`optionIndex: 0`).

### Esa no, que estoy sanando

También: sabor ácido y decir que sí le escribirías al ex después de la fiesta.

- Pregunta 25 → **Sí** (`optionIndex: 0`).

### Cero contacto, cien canciones

También: sin alcohol y decir que no le escribirías al ex.

- Pregunta 25 → **No** (`optionIndex: 1`).

### Se activó el videoclip

También: al menos dos frutas tropicales y proponer bailar a alguien que acabás de conocer.

- Pregunta 27 → **Le propongo bailar** (`optionIndex: 0`).

### La culpa es del supp

También: al menos dos bases y decir «Tuviste suerte» después de perder.

- Pregunta 3 → **Tuviste suerte** (`optionIndex: 1`).

### El niño salvador

También: la misma base, frutas, sabor y fuerza, eligiendo salir de la pelea con tu amigo; no requiere un plan concreto.

- Pregunta 44 → **Busco salir de ahí con mi amigo** (`optionIndex: 1`).

### La Heroína de Zaun

También: la misma base, frutas, sabor y fuerza, eligiendo mandar a la mierda a quien no deja de molestarte; no requiere un plan concreto.

- Pregunta 43 → **Lo mando a la mierda** (`optionIndex: 0`).

### Hula Girl

También: la misma base, frutas, sabor y fuerza, eligiendo proponer un baile; no requiere un plan concreto.

- Pregunta 27 → **Le propongo bailar** (`optionIndex: 0`).

## Validación

- `node tests/insignias-preguntas.test.cjs`: catálogo de 81, preservación exacta de todos los nombres/frases/rangos, cobre independiente de bebida, cada alternativa flexible de las 14 platas, exactitud de los 11 oros (faltantes, extras y orden), 35 insignias de preguntas alcanzables, 14 vías alternativas, cobertura de 48 preguntas, compatibilidad de formatos, cambios, saltos, tipos inválidos, aislamiento y ausencia de confesiones en persistencia.
- `node .taste-skill/insignias-qa.mjs --logic-only`: compatibilidad de las 46 vías previas sin cuestionario, incluidas combinaciones exactas de oro.
- Los cambios de orden o significado de opciones en el banco requieren revisar los mapeos de este contrato.
