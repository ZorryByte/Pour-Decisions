/* Paso 1: 49 frases individuales y 56 para selecciones múltiples.
   Las selecciones expresan preferencias; no son recetas. */
window.VasoAlcohol = (function(){
  'use strict';
  const frases = {
  "ron": [
    "Ah, ron… Bueno, pensé que hoy tomarías tranquilo, pero bueno…",
    "Ron… Sí, no sé por qué pensé que hoy ibas a cambiar.",
    "Ah, tú eres de ron. Bueno, ya nos vamos conociendo.",
    "¿Ron? Y yo aquí buscándote algo distinto…",
    "Mira, ron. Ese lo tenías decidido desde antes de entrar, ¿verdad?",
    "Ah, ron… Jack Sparrow ya te habría hecho un espacio en el barco.",
    "Una piña colada no vendría mal, eh… Ya se me antojó."
  ],
  "vodka": [
    "Ah, vodka… Tú no cuentas mucho al principio, ¿verdad?",
    "¿Vodka? Bueno, algo me dice que no lo pides solo.",
    "Vodka… Ajá. Tú sigue, que yo voy sacando mis conclusiones.",
    "Ah, conque vodka. Eso no me lo esperaba de ti… Todavía.",
    "Vodka. Bueno, de momento pareces una persona bastante discreta.",
    "Mira, James Bond… ¿También te vas a poner exigente con cómo lo preparo?",
    "Sabes… un Moscow mule bien frío sí se antoja."
  ],
  "ginebra": [
    "Uy, ginebra… Perdona, no sabía que eras tan fino.",
    "¿Ginebra? Bueno, ahora me vas a decir cómo poner el hielo.",
    "Ah, ginebra. Tú sí miras qué marca te sirven, ¿verdad?",
    "Ginebra… Ya veo. Contigo no puedo sacar cualquier vaso.",
    "Mira, ginebra. ¿Siempre la pides o hoy quieres impresionarme?",
    "Ginebra… ¿Tú también recoges todas las plantas cuando juegas Zelda?",
    "Un gin tonic con bastante hielo… Sí, ahí te entiendo."
  ],
  "tequila": [
    "¿Tequila? Bueno… ¿No que hoy te ibas temprano?",
    "Ah, tequila. Yo te estaba creyendo lo de portarte bien.",
    "Uy, tequila… Tú tienes algo que celebrar. O algo que contar.",
    "Tequila… Bueno, luego no me digas que no te conozco.",
    "Ah, conque tequila. ¿Ya sabe tu grupo que vas a salir?",
    "¿Tequila? ¿Qué pasó, mi gallo? ¿Te crees Itadori o por qué quieres agarrarte a vergazos con la botella?",
    "Sabes… a mí también se me antoja un buen shot."
  ],
  "whisky": [
    "Ah, whisky… ¿Te hablo de usted o todavía no?",
    "¿Whisky? Bueno, ponte cómodo, que ya te vi con ganas de hablar.",
    "Whisky… Tú tienes una opinión sobre todo, ¿verdad?",
    "Mira, whisky. Ya me parecía que ibas a pedir algo muy en serio.",
    "Ah, whisky. ¿Lo elegiste tú o el señor que llevas dentro?",
    "Ah, whisky… Bueno, Thomas Shelby, puedes quitarte la gorra aquí.",
    "Un whisky sour bien hecho… Mira, ese sí me lo tomaría contigo."
  ],
  "brandy": [
    "¿Brandy? Bueno, siéntate. Ya sé que tienes algo que contar.",
    "Ah, brandy… Pensé que venías de fiesta, pero cuéntame.",
    "Brandy. ¿Ya comiste o te estás adelantando a la sobremesa?",
    "Mira, brandy… Tú no tienes ninguna prisa por volver a casa.",
    "Ah, conque brandy. ¿Pongo música o te dejo contar la anécdota?",
    "Brandy… ¿Te lo sirvo yo o esperamos a que venga Alfred?",
    "Con un poquito de naranja queda rico… Por si se te antoja probar."
  ],
  "sin": [
    "Ah, sin alcohol. Bueno, mis comentarios te los llevas igual.",
    "Sin alcohol… Perfecto. Mañana te pregunto a ti qué pasó.",
    "¿Sin alcohol? Bueno, alguien tenía que venir con las ideas claras.",
    "Ah, hoy sin alcohol. Está bien, no tienes que explicarme nada.",
    "Sin alcohol. Tú has venido a mirar… Y luego nos cuentas.",
    "Sin alcohol… Tú quieres acordarte de todo el lore mañana, ¿verdad?",
    "Un mojito sin alcohol, bien frío… Sí, también me apunto."
  ],
  "ron|vodka": [
    "Ah, también vodka… Bueno, lo del ron tampoco era tan definitivo."
  ],
  "ginebra|ron": [
    "Ron y ginebra… ¿Te cambia el gusto según con quién salgas?"
  ],
  "ron|tequila": [
    "¿¿También tequila?? Bueno, ya decía yo que lo de portarte bien te iba a durar poco."
  ],
  "ron|whisky": [
    "Ah, ron y whisky. ¿Uno cuando sales y otro cuando te da por pensar?"
  ],
  "brandy|ron": [
    "Ron y brandy… Tú puedes empezar la fiesta y quedarte contando cómo fue."
  ],
  "ginebra|vodka": [
    "Ah, los dos… Bueno, James Bond, tampoco te pedí tanto detalle."
  ],
  "tequila|vodka": [
    "Vodka y tequila… ¿Tú avisas antes de salir o ya cuando estás ahí?"
  ],
  "vodka|whisky": [
    "Ah, vodka y whisky. Tú todavía estás viendo qué cara ponerme."
  ],
  "brandy|vodka": [
    "¿Vodka y brandy? Mira, esa sí no te la vi venir."
  ],
  "ginebra|tequila": [
    "¿También tequila? Uy, yo que ya te estaba tratando con tanta educación…"
  ],
  "ginebra|whisky": [
    "Ginebra y whisky… Bueno, dime tú qué vaso saco, que seguro tienes uno pensado."
  ],
  "brandy|ginebra": [
    "Ah, ginebra y brandy. Contigo voy a tener que quedarme conversando, ¿verdad?"
  ],
  "tequila|whisky": [
    "Tequila y whisky… ¿Te gusta cantar o sentarte a criticar al que canta?"
  ],
  "brandy|tequila": [
    "¿Tequila y brandy? Bueno, tú te llevas bien con toda la familia."
  ],
  "brandy|whisky": [
    "Whisky y brandy… ¿Te pongo una silla? Esto parece que va para largo."
  ],
  "ginebra|ron|vodka": [
    "Ah, también ginebra… Bueno, empiezo a pensar que depende de quién invite."
  ],
  "ron|tequila|vodka": [
    "¿Los tres? Tú cuando dices “lo que haya” lo dices en serio."
  ],
  "ron|vodka|whisky": [
    "Ron, vodka y whisky… ¿Y me vas a decir que tienes un favorito?"
  ],
  "brandy|ron|vodka": [
    "¿También brandy? Ah, bueno… Tú sí te quedas hasta que recogen."
  ],
  "ginebra|ron|tequila": [
    "Mira, también tequila. Yo te estaba imaginando muy tranquilo con tu ginebra…"
  ],
  "ginebra|ron|whisky": [
    "Ah, esos tres. ¿Te pregunto cuál prefieres o vamos a estar aquí un rato?"
  ],
  "brandy|ginebra|ron": [
    "¿Brandy también? Bueno, ya veo que lo tuyo cambia según la hora."
  ],
  "ron|tequila|whisky": [
    "Ah, también whisky… Tú debes tardar bastante cuando te pasan la carta."
  ],
  "brandy|ron|tequila": [
    "¿Y brandy? Bueno, tú ya estás pensando en qué hacer cuando se vayan los demás."
  ],
  "brandy|ron|whisky": [
    "Esos tres… ¿Siempre terminas hablando con el papá de alguien en las fiestas?"
  ],
  "ginebra|tequila|vodka": [
    "Ah, tequila también. Se te estaba viendo muy serio y ya me extrañaba."
  ],
  "ginebra|vodka|whisky": [
    "Los tres… ¿Tú pides así de complicado o conmigo estás haciendo un esfuerzo?"
  ],
  "brandy|ginebra|vodka": [
    "Mira, también brandy. Todavía no sé cuántos años ponerte."
  ],
  "tequila|vodka|whisky": [
    "Ah, esos tres. Tú dices “vemos qué sale” y dejas a todos preocupados."
  ],
  "brandy|tequila|vodka": [
    "¿Brandy también? Bueno, en tu mesa sí debe haber de qué hablar."
  ],
  "brandy|vodka|whisky": [
    "Esos tres… Tú vienes con una historia larga. Y seguro empieza con “mira…”."
  ],
  "ginebra|tequila|whisky": [
    "Ah, también tequila. ¿Ves? No hacía falta que te hicieras tanto el fino conmigo."
  ],
  "brandy|ginebra|tequila": [
    "¿Los tres? Bueno, puedes ir a una boda sin preguntar de quién es."
  ],
  "brandy|ginebra|whisky": [
    "Ah, esos tres… Tú eres de los que dicen “siéntate, te voy a contar algo”."
  ],
  "brandy|tequila|whisky": [
    "Mira, esos tres. Tú empiezas con una canción y terminas hablando de la vida."
  ],
  "ginebra|ron|tequila|vodka": [
    "¿Cuatro? Bueno… ¿Alguno te gusta más o no quieres hacerlos sentir mal?"
  ],
  "ginebra|ron|vodka|whisky": [
    "Ah, también whisky. Tú sigue, que ya casi termino de cambiar de opinión sobre ti."
  ],
  "brandy|ginebra|ron|vodka": [
    "¿Y brandy? Mira, pensé que ese lo ibas a dejar para otra visita."
  ],
  "ron|tequila|vodka|whisky": [
    "Esos cuatro… Tú cuando dices “el de siempre” debes confundir bastante al mesero."
  ],
  "brandy|ron|tequila|vodka": [
    "Ah, también brandy. ¿Tienes algún plan para después o ni tú sabes?"
  ],
  "brandy|ron|vodka|whisky": [
    "Cuatro… Bueno, contigo no voy a adivinar qué pedir. Eso ya lo entendí."
  ],
  "ginebra|ron|tequila|whisky": [
    "Mira, también whisky. ¿Tú eliges por gusto o te da pena dejar cosas sin marcar?"
  ],
  "brandy|ginebra|ron|tequila": [
    "¿Cuatro? Ah, bueno… Tú lo de tener un tipo no lo llevas mucho."
  ],
  "brandy|ginebra|ron|whisky": [
    "Esos cuatro… ¿También te tardas así eligiendo qué película poner?"
  ],
  "brandy|ron|tequila|whisky": [
    "Ah, los cuatro. En tu casa no deben preguntarte qué quieres. Deben enseñarte qué queda."
  ],
  "ginebra|tequila|vodka|whisky": [
    "¿También whisky? Bueno, tú dejas las opciones abiertas. Bastante abiertas."
  ],
  "brandy|ginebra|tequila|vodka": [
    "Ah, y brandy… ¿Seguro que no estás eligiendo por toda la mesa?"
  ],
  "brandy|ginebra|vodka|whisky": [
    "Esos cuatro… A ti te dicen “sorpréndeme” y todavía preguntas de qué humor."
  ],
  "brandy|tequila|vodka|whisky": [
    "Cuatro ya… Bueno, lo de preguntarte por uno fue bastante optimista de mi parte."
  ],
  "brandy|ginebra|tequila|whisky": [
    "Ah, también brandy. Tú tienes con quién hablar en cualquier fiesta, ¿no?"
  ],
  "ginebra|ron|tequila|vodka|whisky": [
    "¿Ya? ¿Y el brandy qué te hizo? Pregunto, porque a los demás sí los invitaste."
  ],
  "brandy|ginebra|ron|tequila|vodka": [
    "Ah, dejaste el whisky… ¿Pasó algo entre ustedes o todavía no se conocen?"
  ],
  "brandy|ginebra|ron|vodka|whisky": [
    "Todos menos tequila… Tú sabes algo que yo no sé. Se te nota."
  ],
  "brandy|ron|tequila|vodka|whisky": [
    "¿Y la ginebra no? Bueno… No le voy a decir que fuiste tú."
  ],
  "brandy|ginebra|ron|tequila|whisky": [
    "Mira, solo dejaste el vodka. ¿No te gusta o te conoce demasiado?"
  ],
  "brandy|ginebra|tequila|vodka|whisky": [
    "¿Todos menos ron? Ah, bueno… Ahí hay una historia y no me la estás contando."
  ]
};
  Object.keys(frases).forEach(function(clave){ Object.freeze(frases[clave]); });
  return Object.freeze(frases);
})();

