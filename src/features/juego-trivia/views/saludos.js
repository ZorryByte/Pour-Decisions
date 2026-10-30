/* Saludos aprobados: cada botón conserva su remate. Sans aparece una sola vez. */
window.Saludos = (function(){
  'use strict';
  const PAREJAS = [
    ['Bienvenido, maldito alcohólico.', 'A ver qué cóctel soy'],
    ['¿Tú no duermes o qué?', 'Ya que estoy aquí…'],
    ['¿No que ya te ibas?', 'Una última partida'],
    ['Mañana madrugas. Tú sabrás.', 'Conocer mi futura resaca'],
    ['Venías a hacer algo importante, ¿verdad?', 'Sí, descubrir mi cóctel'],
    ['Otro test. Este seguro sí te cambia la vida.', 'A ver quién carajos soy'],
    ['No le escribas. Mejor haz esto.', 'Descubrir mi cóctel'],
    ['¿Una partida más? Así empezó todo.', 'Darle otra vez'],
    ['Aquí puedes echarle la culpa al lag.', 'Ver qué me toca'],
    ['En lo que encuentra partida, te da tiempo.', 'Hacer el test'],
    ['Deja de intentar matar a Sans. Mejor deshuésate.', 'Cambiar de ruta'],
    ['Puedes reiniciar el test. El mensaje que mandaste, no.', 'Volver a empezar'],
    ['Guardaste la partida, ¿verdad?', 'Sí, vamos al test'],
    ['No hace falta una guía para esto. Creo.', 'Probar sin tutorial'],
    ['Si sale mal, decimos que no es canon.', 'Ver mi resultado'],
    ['A este paso sale GTA VII y tú sigues aquí.', 'Bueno, ya empiezo'],
    ['Te sabes todo el lore, pero no qué pedir.', 'Resolver lo segundo'],
    ['Viniste por curiosidad. Ahora te importa demasiado.', 'Saber qué cóctel soy'],
    ['No es una señal del universo. Es un test.', 'Igual quiero saber'],
    ['Tu «una y me voy» ya tiene segunda temporada.', 'Ver cómo termina'],
    ['¿Otra vez buscando tu personalidad en internet?', 'Esta vez sí la encuentro'],
    ['Se suponía que hoy te acostabas temprano.', 'Hacer esto y ya'],
    ['Tu ex no cuenta como contacto de emergencia.', 'Mejor buscar mi cóctel'],
    ['Si el resultado te ofende, lo repetimos.', 'A ver qué sale'],
    ['Hola, qué bueno que viniste.', 'A ver qué cóctel soy'],
    ['¿Un descanso de todo un rato?', 'Sí, vamos a jugar'],
    ['Pasa, esto está fácil.', 'Encontrar mi cóctel'],
    ['¿No sabes qué pedir? Vamos viendo.', 'Ayúdame a elegir'],
    ['Mira quién anda por aquí.', 'A ver qué me toca'],
    ['Hoy no hay que decidir tanto.', 'Que el test me ayude'],
    ['Quédate un rato, a ver qué sale.', 'Probar el test'],
    ['No necesitas saber de cócteles. Para eso estamos.', 'Encontrar el mío'],
    ['¿Vienes con curiosidad? Con eso basta.', 'Quiero saber'],
    ['Bueno, vamos a conocerte un poquito.', 'Descubrir mi cóctel'],
    ['Vamos a ver qué cóctel va contigo.', 'Empezar'],
    ['Responde y descubre tu resultado.', 'Hacer el test'],
    ['¿Listo para probar?', 'Comenzar'],
    ['Cada respuesta cuenta.', 'Descubrir mi cóctel'],
    ['Ah, volviste. ¿No te gustó la respuesta?', 'Pedir una segunda opinión'],
    ['Contesta lo que haces, no lo que queda bonito.', 'Bueno, voy en serio'],
    ['Sí, sí, eres muy diferente. Vamos a ver.', 'Demostrarlo'],
    ['Puedes repetirlo hasta que salga lo que quieres.', 'Eso pensaba hacer'],
    ['No hay respuestas malas. Pero algunas explican bastante.', 'Contestar de todos modos'],
    ['El test no te juzga. Yo no prometí nada.', 'A ver, sorpréndeme'],
    ['Qué gusto que estés aquí. ¿Jugamos un ratito?', 'Sí, vamos'],
    ['Si hoy estuvo pesado, ojalá esto te saque una sonrisa.', 'Vamos a probar'],
    ['¿Vos no dormís o qué?', 'Un test y me voy'],
    ['¿No que hoy no salías?', 'Cambiaron los planes'],
    ['Volviste. No te gustó la verdad, ¿va?', 'Otra oportunidad'],
    ['Hoy sí contesta con honestidad.', 'No prometo nada'],
    ['Mucho «ya lo superé» para tanto screenshot.', 'Mejor ver mi cóctel'],
    ['¿Buscas respuestas o excusas?', 'Primero mi cóctel'],
    ['Aquí no puedes responder «lo que tú quieras».', 'Me toca elegir'],
    ['Te conocemos de hace tres clics y ya hay dudas.', 'Seguir hablando'],
    ['Qué gusto verte. Pasa, hay test.', 'A ver qué me toca'],
    ['No hay prisa. Tu ex tampoco contesta.', 'Entonces sí tengo tiempo'],
    ['Hoy no venimos a arreglarte la vida.', 'Con elegir cóctel basta'],
    ['¿Otra vez tú? Ya casi te ponemos mesa.', 'Lo de siempre'],
    ['Mucho K/DA para tan poco KDA.', 'Hoy no juego ranked'],
    ['Debiste tirar más fotos. No más indirectas.', 'Cambiar de tema'],
    ['Otra era, el mismo ex.', 'Cambiar de repertorio'],
    ['Eso no es avanzar. Es hacer moonwalk.', 'Ahora sí, para adelante'],
    ['¿Sweater Weather? Con este calor, no jodas.', 'Algo con hielo'],
    ['Ni Shrek deja entrar a cualquiera. Aprende.', 'Cuidar mi pantano'],
    ['Qué bueno que volviste. ¿Otra ronda de preguntas?', 'Vamos otra vez'],
    ['No te estaba esperando, idiota. El test estaba abierto.', 'Sí, claro. Vamos'],
    ['Otra vez tú. ¿Juntaste las siete?', 'Pedir otro resultado'],
    ['¿También dejaste la moto mal parqueada?', '¡KANEDAAA!'],
    ['Buen álbum. Mejor no abras Twitter.', 'Separar obra y artista'],
    ['¿Hasta aquí viniste en jet?', 'Aterrizar'],
    ['¿Así que tú eres el malo?', 'Duh.'],
    ['¿Trajiste audífonos?', 'Poner a Kate Bush'],
    ['¿Ya te diste cuenta de que no eres nazi?', 'Disculparme con una bebida']
  ];
  const STORAGE_KEY = 'cocteles_saludos_v1';
  let state = {remaining:[], last:-1};
  let heading;
  let button;

  function readState(){
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.remaining)) return;
      state.last = Number.isInteger(saved.last) && saved.last >= 0 && saved.last < PAREJAS.length ? saved.last : -1;
      state.remaining = [...new Set(saved.remaining)].filter(function(i){
        return Number.isInteger(i) && i >= 0 && i < PAREJAS.length && i !== state.last;
      });
    } catch (e) { /* Sin almacenamiento, la rotación continúa en memoria. */ }
  }

  function next(){
    if (!state.remaining.length){
      state.remaining = PAREJAS.map(function(_, i){ return i; });
      for (let i = state.remaining.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [state.remaining[i], state.remaining[j]] = [state.remaining[j], state.remaining[i]];
      }
      if (state.remaining[state.remaining.length - 1] === state.last){
        [state.remaining[0], state.remaining[state.remaining.length - 1]] = [state.remaining[state.remaining.length - 1], state.remaining[0]];
      }
    }
    state.last = state.remaining.pop();
    const current = PAREJAS[state.last];
    if (heading) heading.textContent = current[0];
    if (button) button.textContent = current[1];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* El test funciona sin localStorage. */ }
  }

  function init(onStart){
    heading = document.getElementById('welcome-line');
    button = document.getElementById('welcome-start');
    if (!heading || !button) return;
    readState();
    next();
    button.addEventListener('click', onStart);
  }

  return {init:init, next:next};
})();
