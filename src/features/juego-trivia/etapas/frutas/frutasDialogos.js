// Conversaciones completas: las respuestas se eligen juntas, nunca al azar por frase.
export const conversacionesFrutas = {
  sinFruta: [
    [['Vaso','¿Realmente sin fruta? Hmm… esto está raro.'],['Coctelera','Shh, déjalo. Él sabe lo que hace.']]
  ],
  apertura: [
    [['Vaso','Toma, esto pidió este. Yo ya no me meto.'],['Coctelera','Sí, claro. Pásamelo antes de que se te ocurra algo más.'],['Coctelera','Ya está. Ponme aquí tus frutas favoritas y me ayudas.'],['Vaso','Yo me quedo por aquí. Por si necesita supervisión.']],
    [['Vaso','Aquí está el pedido. Te lo encargo.'],['Coctelera','Ven, acércate. Que luego me echas la culpa si se cae.'],['Coctelera','Gracias, precioso. Ahora vamos con las frutas.'],['Vaso','¿Ves? Cuando quiere, hasta me trata bien.']],
    [['Vaso','Toma. Esto pidió. Yo solo soy el recipiente.'],['Coctelera','Qué conveniente. Para opinar sí te alcanza. Pásamelo.'],['Coctelera','Listo. Tú escoge las frutas, que a este ya lo conocemos.'],['Vaso','Aquí sigo, ¿eh? Te estoy escuchando.']]
  ],
  entrada: [
    [['Vaso','Toma, esto pidió este. Yo ya no me meto.'],['Coctelera','Sí, claro. Como si fueras a dejar de opinar.']],
    [['Vaso','Toma. No preguntes, yo solo lo traje.'],['Coctelera','Ven acá. ¿Me trajiste todo?'],['Vaso','Sí.'],['Coctelera','Gracias, precioso.']],
    [['Vaso','Te lo encargo. A mí ya me está contando su vida.'],['Coctelera','Pues escucha, para una vez que alguien te habla.']],
    [['Coctelera','Llegaste. Pensé que te habías perdido.'],['Vaso','Estaba trabajando.'],['Coctelera','Sí, ya vi. Pásame eso.']]
  ],
  bandeja: [
    [['Coctelera','Pon aquí tus frutas favoritas. Si cambias de idea, las sacas.']],
    [['Coctelera','A ver, escoge las frutas que te gustan. Yo te hago espacio.']],
    [['Coctelera','Tú elige tranquilo. Al otro ya lo conocemos.'],['Vaso','Yo no he dicho nada.'],['Coctelera','Todavía.']]
  ],
  preparar: [
    [['Coctelera','Dale, yo te digo cuándo.'],['Vaso','Yo creo que ya.'],['Coctelera','¿Lo estás haciendo tú?']],
    [['Coctelera','Acércame eso, anda.'],['Vaso','Aquí tienes.'],['Coctelera','Gracias. Tú sujeta, que yo te ayudo.']],
    [['Vaso','La última vez salpicó todo.'],['Coctelera','Porque metiste la cara. Quítate un poquito.']]
  ],
  jugo: [
    [['Coctelera','Ahí está. Ya salió el jugo.']],
    [['Coctelera','Ya, ya está. Esa fruta no te hizo nada.']],
    [['Vaso','Oye, huele bien.'],['Coctelera','¿Ves? A veces sí dices cosas bonitas.']]
  ],
  agitar: [
    [['Coctelera','Tápame bien. No quiero acabar encima de este imbécil.'],['Vaso','Yo también te quiero.']],
    [['Coctelera','Ahora sí, sujétame.'],['Vaso','La tapa.'],['Coctelera','La tengo, la tengo. Gracias.']],
    [['Coctelera','Vamos, sígueme el ritmo.'],['Vaso','Luego no te quejes.']]
  ],
  mareo: [
    [['Coctelera','Ya, cabrón, ya…'],['Vaso','¿No que mucho ritmo?'],['Coctelera','Ahorita que se me quite te contesto.']],
    [['Vaso','¿Ya estás?'],['Coctelera','Espera… Sí. Gracias.'],['Vaso','Te movieron bastante.'],['Coctelera','Te vi riéndote.']],
    [['Coctelera','Dame un segundo. Se me está moviendo todo.'],['Vaso','Aquí estoy. Apóyate.'],['Coctelera','No te muevas, por favor.']]
  ],
  servido: [
    [['Vaso','No me vayas a tirar.'],['Coctelera','Entonces no me hagas reír, pendejo.']],
    [['Coctelera','Acércate, que te voy a tirar encima.'],['Vaso','Aquí estoy. Despacio.'],['Coctelera','Ahí está. ¿Todo bien?'],['Vaso','Sí, quedó bien.']],
    [['Coctelera','Aquí tienes. Te limpié el borde también.'],['Vaso','Gracias.'],['Coctelera','Anda, sigue. Luego me cuentas qué salió.']]
  ]
};

export function elegirConversacion(tipo, storage = globalThis.sessionStorage){
  const opciones = conversacionesFrutas[tipo];
  let anterior = -1;
  try { anterior = Number(storage.getItem('frutas-dialogo-' + tipo) ?? -1); } catch {}
  const disponibles = opciones.map((_, i) => i).filter(i => i !== anterior);
  const indice = disponibles.length?disponibles[Math.floor(Math.random() * disponibles.length)]:0;
  try { storage.setItem('frutas-dialogo-' + tipo, String(indice)); } catch {}
  return opciones[indice];
}
