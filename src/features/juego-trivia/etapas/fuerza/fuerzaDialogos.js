// El vaso observa y saca conclusiones. Las referencias nacen del gesto o de la base.
export const DIALOGOS_MEDIDA = Object.freeze({
  entrada:[
    'Ya sé qué te gusta. Ahora quiero ver si sabes cuándo parar.',
    'Mucho elegir botella. A ver cómo andas de pulso.',
    'Te sabes el lore. Falta ver si leíste las onzas.',
    'Bueno, bartender. El currículum lo vemos después.',
    'Una medida y seguimos. Sí, ya sé cómo suena eso.',
  ],
  empezar:['Sin guía. Tú querías la experiencia completa.', 'Bueno. Ahora sí, sin echarle la culpa al lag.', 'Yo miro. Tú procura que no tenga anécdota.'],
  llenar:['Ah, estás leyendo las marcas. No esperaba tanto.', 'Primero al medidor. Mira, hoy sí hay un plan.', 'Lo estás llenando como si ya supieras cuánto quieres.', 'Bueno… El jigger lleno y yo esperando. Lo de siempre.', 'Ese es el medidor. Yo soy el de al lado. Por si acaso.'],
  lleno:['Ya está lleno. No desbloqueas nada por seguir.', 'Dos onzas. El resto del DLC no cabe.', 'Ahí es. El jigger no tiene inventario infinito.', 'El medidor ya entendió. Suelta la botella.'],
  pausa:['¿Ya? Mira, sabes soltar cosas. A veces.', 'Lo estás mirando como si fuera una decisión de diálogo.', 'Bueno. Ahora falta que llegue hasta mí.', 'Esa pausa… ¿Estás calculando o esperando una señal?'],
  acercar:['Ah, sí era para mí.', 'Con calma, que no soy un checkpoint.', 'Mira quién se acordó de mí.', 'Bueno, James Bond. Ahora viene lo de servirme.'],
  verter:['Ah, así que ese era tu plan conmigo.', 'Mira. Sí encontraste dónde servirme.', 'Bueno… Ya voy entendiendo por dónde vas.', 'Tú sirve. Yo voy sacando mis conclusiones.', 'Sí, aquí. No hacía falta una misión secundaria.'],
  suave:['Suave. Hoy sí era verdad lo de irte temprano.', 'Poquito. Mira, no todo necesita segunda temporada.', 'Suave. Por una vez no elegiste la opción dramática.', 'Esa medida sí sabe guardar secretos.'],
  medio:['Medio. Tú siempre dejando abiertas las opciones.', 'Ni mucho ni poco. Qué diplomático saliste.', 'Medio. Tampoco querías comprometerte tanto.', 'Ahí. Hasta parece que venías con un plan.'],
  fuerte:['Fuerte. Bueno, ya quedó bastante clara tu respuesta.', 'Ah, conque esa era tu medida.', 'Fuerte. No hacía falta ponerlo en mayúsculas.', 'Mira. Tú sí querías que se notara.'],
  descartar:['Ah, eso ya no era para mí. Qué giro.', 'Eso sí se puede deshacer. Aprovecha.', 'Lo descartaste. Yo que ya estaba sacando conclusiones.', 'Lo devolviste antes de complicarlo. Vas aprendiendo.', 'Descartaste. Hasta aquí llega esa línea temporal.'],
  rehacer:['Va de nuevo. Esa toma no es canon.', 'Reiniciaste. El mensaje a tu ex sigue ahí.', 'Bueno, cargamos partida. Yo no vi nada.', 'Otro intento. El jigger ya se sabe esta escena.', 'Sí, puedes cambiar de opinión sin hacer una trilogía.'],
  vacio:['Con aire no te voy a sacar intensidad.', 'Primero la medida. Luego la escena dramática.', 'Está vacío. Ni el lag te justifica esa.', 'Mucho gesto para tan poco contenido.'],
  limite:['Hasta ahí llegamos. Más cantidad ya no cambia la respuesta.', 'Ya marqué fuerte. No hay jefe secreto.', 'Esa respuesta ya quedó. Guarda lo que sobra en el medidor.'],
  duda:['¿Esperas que te lo sirva Alfred?', 'Se te hizo más larga esta decisión que elegir personaje.', '¿Lo estás midiendo con la mirada?', 'Te sabes todas las builds y aquí seguimos.', 'La botella no va a escribirte primero.'],
  prisa:['Tres segundos. Sí, ahora sí te importa el tiempo.', 'Ya casi. No abras otra misión.', 'Últimos segundos. La cinemática no se puede culpar de todo.'],
  tiempo:['Tiempo. A ver qué decidiste mientras yo hablaba.', 'Listo. Hasta aquí llega tu turno de bartender.', 'Se acabó. El jigger también necesita un descanso.', 'Bueno. Veamos si el resultado coincide con tu discurso.'],
  sinServir:['Se acabó el tiempo y sigo esperando. Muy tu estilo.', 'Preparaste la medida. Faltó el pequeño detalle de servírmela.', 'Quince segundos de tensión. Cero onzas de desenlace.'],
  terminar:['Ah, terminaste antes. Y sin saltarte la escena.', 'Bueno, esa es tu medida. ¿La defendemos?', 'Ya está. Ahora sí quiero ver si sostienes tu decisión.'],
  repetir:['Otra toma. Esta vez ya conoces los controles.', '¿No te gustó la respuesta? Me suena.', 'Bueno. Reiniciar aquí sí funciona.', 'Una más. Esa frase ya la conozco.'],
  sinReloj:['Sin reloj. No hacía falta inventarte una excusa.', 'Vale, sin prisa. Alfred todavía no llega.', 'Quitaste el tiempo. Las onzas siguen siendo las mismas.'],
});
const POR_BASE = {
  Ron:['Bueno, Jack Sparrow. El jigger también viene en el barco.', 'Ron. A ver si tu pulso coincide con tanta seguridad.'],
  Vodka:['Bueno, James Bond. Primero mide; las exigencias después.', 'Vodka. Tú tan discreto… Hasta que agarras la botella.'],
  Ginebra:['Ginebra. Ya puedes dejar las plantas de Zelda y mirar la medida.', 'A ver si mides con el mismo cuidado con que eliges ginebra.'],
  Tequila:['Tequila. A ver, Itadori: esto se mide, no se pelea.', 'Bueno, mi gallo. Ahora quiero ver ese pulso.'],
  Whisky:['Bueno, Thomas Shelby. La gorra no ayuda a leer las onzas.', 'Whisky. A ver si el señor que llevas dentro sabe servir.'],
  Brandy:['Brandy. Alfred dejó el medidor. Hoy te toca a ti.', 'Bueno, puedes contarme la anécdota mientras mides.'],
};
export function crearVozMedida(bases, historial = new Map()){
  return function frase(evento){
    const opciones = evento === 'base' ? (POR_BASE[bases[0]] || DIALOGOS_MEDIDA.entrada) : DIALOGOS_MEDIDA[evento] || DIALOGOS_MEDIDA.entrada;
    const clave = evento === 'base' ? 'base:' + bases[0] : evento;
    const n = historial.get(clave) || 0;
    historial.set(clave, n + 1);
    return opciones[n % opciones.length];
  };
}
