import * as calculosVaso from '../vaso/calculosVaso.js';
import {createAlcoholView} from '../etapas/alcohol/alcoholView.js';
import {createFrutasView} from '../etapas/frutas/frutasView.js';
import {createFrutasBarra} from '../etapas/frutas/frutasBarra.js';
import {createRestriccionesView} from '../etapas/restricciones/restriccionesView.js';
import {createFuerzaJuego} from '../etapas/fuerza/fuerzaJuego.js';
import {bindFrutasGestures} from '../etapas/frutas/frutasGestos.js';
import {fruitGlyphMarkup as dibujarFrutaActual} from './arteFrutas.js';
/* Camino de la barra. Si GSAP, interact o confetti no cargan, el toque sigue valiendo. */
window.Juego = (function(){
  let api = null;
  let used = {};
  let spoken = {key:'', text:''};
  let freshKey = '';
  let lastStamp = '';
  let lastPin = -1;
  let lastY = null;
  let lastLiquidColor = null;
  let dragLock = 0;
  let noteCache = null;
  let revealLine = '';
  const QUIP_KEY = 'cocteles_quips_v1';
  const TROPICAL = ['Piña', 'Mango', 'Maracuyá', 'Coco'];
  // Add a local photo URL here when the final photographs are supplied.
  const STYLE_CARDS = [
    {name:'Dulce', invite:'Dulce quiere una bella cita contigo.', line:'Mi plan ideal: postre, miradas y una excusa para quedarnos.', color:'#d98c83', photo:null},
    {name:'Ácido', invite:'Ácido quiere darle chispa a tu noche.', line:'Tengo carácter. Busco a alguien que disfrute un poco de picante en la conversación.', color:'#c5c970', photo:null},
    {name:'Cremoso', invite:'Cremoso quiere una noche empalagosa contigo.', line:'Soy de quedarme cerca, alargar la sobremesa y pedir otro postre.', color:'#dbc7a5', photo:null},
    {name:'Refrescante', invite:'Refrescante te invita a romper el hielo.', line:'Una terraza, buena conversación y cero prisa por volver.', color:'#9abdac', photo:null},
    {name:'Suave', invite:'Suave quiere conocerte sin prisas.', line:'No necesito hacer ruido para dejarte pensando en mí.', color:'#e4b974', photo:null},
    {name:'Espumoso', invite:'Espumoso quiere brindar por esa química.', line:'La primera cita empieza con burbujas. El resto lo improvisamos.', color:'#c9d7b4', photo:null},
    {name:'Granizado', invite:'Granizado quiere una cita que derrita el hielo.', line:'Pareceré frío al principio. Dame un momento contigo.', color:'#afc9cf', photo:null},
    {name:'Sedoso', invite:'Sedoso quiere acercarse un poquito más.', line:'Tengo debilidad por las luces bajas y las conversaciones que fluyen.', color:'#d7b3a7', photo:null}
  ];
  const STYLE_ORDER_KEY = 'cocteles_style_order_v1';
  const MATCH_PERSONAS = {
    'Dulce':{hello:'Ya estoy pensando en nuestra cita, amor. ¿Hay algo que te guste? Quiero acordarme.', goodbye:'Adiós, mi hermosura. Escríbeme cuando llegues, ¿sí?'},
    'Ácido':{hello:'Mira, sí me gustaste. No pongas esa cara, tampoco voy diciéndoselo a cualquiera.', goodbye:'Bueno, vete. Antes de que te diga algo demasiado bonito.'},
    'Cremoso':{hello:'Ven, ponte cómodo conmigo. Había hecho otros planes, pero prefiero que te quedes.', goodbye:'Te dejaría ir… pero estaba bastante bien así, contigo cerca.'},
    'Refrescante':{hello:'Conozco un sitio que seguramente no has visto. Podemos ir sin planear demasiado.', goodbye:'Nos vemos. La próxima vez eliges tú dónde perdernos.'},
    'Suave':{hello:'No sabía si también ibas a elegirme… Me gustaría verte, si a ti te apetece.', goodbye:'Me gustó coincidir contigo. Aunque no se me haya notado mucho.'},
    'Espumoso':{hello:'Ya pensé dónde podríamos ir. Bueno, pensé tres sitios… ¿Te molesta que me emocione tanto?', goodbye:'¿Ya te vas? Está bien. Te escribo luego… voy a intentar que sea solo una vez.'},
    'Granizado':{hello:'No suelo entusiasmarme con estas cosas. Pero contigo sí me quedaría un rato.', goodbye:'Cuídate. Y… bueno, espero volver a verte.'},
    'Sedoso':{hello:'Tienes buen gusto, eso ya lo comprobamos. Ahora quiero ver si puedes mantener mi atención.', goodbye:'Intenta no extrañarme demasiado. Aunque lo entendería.'}
  };
  let styleOrder = [];
  let styleHistory = [];
  let swipeBusy = false;
  let revealCleanup = null;
  let matchCleanup = null;
  let glassSequence = 0;
  let stageSpeech = [];
  let fruitBarScene = null;
  let strengthScene = null;
  let lastStageLine = '';
  const ELEMENTOS = {fuego:'Fuego', tierra:'Tierra', aire:'Aire', agua:'Agua'};
  const LADDER = ['fresco','enamorado','chismoso','siempre','exigente','patron','popular','inventado','callejero','apuntado','bocon','escandaloso'];
  const ARCH = {
    escandaloso:{id:'escandaloso', elemento:'fuego', nombre:'El Escandaloso', linea:'No hace falta preguntar si ya llegaste. Se escucha.'},
    bocon:{id:'bocon', elemento:'fuego', nombre:'El Bocón', linea:'Tú dices lo que todos piensan. A veces antes de pensarlo.'},
    apuntado:{id:'apuntado', elemento:'fuego', nombre:'El Que Se Apunta a Todo', linea:'Todavía no terminan de contar el plan y tú ya dijiste que sí.'},
    siempre:{id:'siempre', elemento:'tierra', nombre:'El de Siempre', linea:'Mismo trago, mismo lugar. Para qué cambiar lo que ya te gusta.'},
    patron:{id:'patron', elemento:'tierra', nombre:'El Patrón', linea:'Tú armas el plan y te aseguras de que nadie se quede fuera.'},
    exigente:{id:'exigente', elemento:'tierra', nombre:'El Exigente', linea:'No es por complicar. Es que tú sí notas la diferencia.'},
    inventado:{id:'inventado', elemento:'aire', nombre:'El Inventado', linea:'Lo tuyo no sale en la carta. Pero tienes toda una explicación.'},
    popular:{id:'popular', elemento:'aire', nombre:'El Popular', linea:'Conoces a todos. Al que acaba de llegar, también.'},
    callejero:{id:'callejero', elemento:'aire', nombre:'El Callejero', linea:'Siempre sabes de otro lugar. Y de otro después de ese.'},
    chismoso:{id:'chismoso', elemento:'agua', nombre:'El Chismoso', linea:'Tú no interrogas. La gente solita te cuenta.'},
    enamorado:{id:'enamorado', elemento:'agua', nombre:'El Enamorado', linea:'Ya tienes a quién dedicarle la siguiente canción.'},
    fresco:{id:'fresco', elemento:'agua', nombre:'El Fresco', linea:'Cambió el plan tres veces. Tú sigues pasándola bien.'}
  };
  const FALLBACK = [
    'Mmm, ya te conozco.',
    'Obvio eliges eso.',
    'Eso dice bastante.',
    'Sigo tomándote el pulso.'
  ];
  const QUIPS = {
    alcohol:Object.assign({
      idle:['A ver con qué llegas.', 'La barra está mirando.', 'Elige lo que pedirías sin pensarlo.', 'Todavía no te delatas.'],
      varios:['Varios a la vez. La barra te queda chica.', 'Más de uno. Así no te decides, te sirves.', 'Obvio que no te quedas con uno.', 'Varios. Ya te conozco, y no es poco.']
    }, window.VasoAlcohol || {}),
    fruta:{
      idle:['La fruta es opcional. Tú no.', 'Si te da igual, también es una respuesta.', 'El vaso espera adorno.', 'Fruta, o la que caiga.'],
      cualquiera:['La que sea. Te da igual el adorno, no la noche.', 'Cualquiera. Confías en la barra.', 'La que sea. Menos vueltas.', 'Cualquiera. Ya, sin drama.'],
      citrico:['Cítrico. Te gusta cuando el trago contesta.', 'Limón o naranja. Directo.', 'Ácido de fruta. Obvio.', 'Cítrico. El vaso se despierta.'],
      tropical:['Tropical. Si lleva hielo, ya vas.', 'Piña, mango o lo que suene a calor.', 'Tropical sin remedio. Ya se veía.', 'Fruta de sol. Mmm, ya te conozco.'],
      fresca:['Fresa, sandía o durazno. Dulce con disfraz.', 'Fruta fresca. La excusa bonita.', 'Eso es postre con coartada.', 'Fresca. Obvio que ibas por ahí.'],
      menta:['Menta. Te gusta que se note el golpe.', 'Menta. Fresca y con intención.', 'Hojas en el vaso. Ya te vi.', 'Menta. No es adorno, es la idea.']
    },
    estilo:{
      idle:['Ocho cartas. Quédate con lo que va contigo.', 'Izquierda o derecha. Sin ensayo.', 'Elige de un lado. El otro también vale.', 'Una carta, un gesto.'],
      dulce:['Dulce. La trampa más vieja, y te funciona.', 'Dulce. Obvio. Te gusta la entrada fácil.', 'Mmm, dulce. Ya te conozco.', 'Dulce. Después vemos lo demás.'],
      acido:['Ácido. Te gusta cuando el trago contesta.', 'Ácido. Nada de que se duerma.', 'Obvio lo ácido. Tienes opinión.', 'Ácido. El vaso no viene a agradar.'],
      cremoso:['Cremoso. El postre pidió vaso.', 'Cremoso. Te quedas en la textura.', 'Mmm, cremoso. Sobremesa con ganas.', 'Cremoso. Suave de boca, no de noche.'],
      refrescante:['Refrescante. Largo, frío y con cara de calma.', 'Refrescante. No tienes prisa, dices.', 'Obvio lo frío. La noche es larga.', 'Refrescante. Hielo y conversación.']
    },
    fuerza:{
      idle:['Elige cuánto carácter lleva tu mezcla.', 'El color del vaso te sigue.', 'Dónde lo quieres.', 'Suave, medio o que se note.'],
      suave:['Suave. Llegas temprano y te haces el interesante.', 'Suave. La noche larga, el vaso quieto.', 'Suave. No hace falta gritar.', 'Suave. Mmm, más mesa que pista.'],
      medio:['Medio. Ni te escondes ni te tiras.', 'Medio. El punto donde cabe todo.', 'Medio. Equilibrado, con truco.', 'Medio. Obvio el que no se moja.'],
      fuerte:['Fuerte. Con razón no vienes a las fiestas temprano.', 'Fuerte. El vaso va en serio.', 'Fuerte. Ya, sin rodeos.', 'Fuerte. La barra toma nota.']
    },
    alergia:{
      idle:['Si no hay, marca ninguna.', 'Esto no es un chiste. Es la carta.', 'La barra necesita saberlo.', 'Nada de adivinanzas aquí.'],
      ninguna:['Ninguna. Mesa libre.', 'Ninguna. Menos vueltas.', 'Ninguna. Anotado, seguimos.', 'Ninguna. La carta se abre entera.'],
      alguna:['Anotado. La barra se adapta.', 'Eso no se negocia, y está bien.', 'Queda fuera. El resto entra.', 'Listo. El vaso te respeta eso.']
    },
    plan:{
      idle:['El sábado desempatará el trago.', 'Cómo se te va el día.', 'El plan, y luego tu nombre.', 'Última antes del vaso.'],
      fiesta:['Fiesta hasta tarde. Obvio. Ya te vi al final.', 'Fiesta. Con razón no llegas a la primera.', 'Fiesta. La noche no tiene hora de cierre.', 'Fiesta. Mmm, ya te conozco.'],
      playa:['Playa. Arena y cero prisa.', 'Playa. El vaso con hielo de sobra.', 'Playa. Sol y un plan flojo.', 'Playa. Obvio lo largo.'],
      cena:['Cena tranquila. Luz baja y la copa que no grita.', 'Cena. Charla larga, vaso corto.', 'Cena. Llegas para quedarte sentado.', 'Cena. Más mesa que pista.'],
      aventura:['Sin mapa. Con razón tu sábado no cabe en un plan.', 'Aventura. Improvisas y te queda bien.', 'Aventura. Obvio que no reservas.', 'Aventura. Ya, a ver qué pasa.']
    }
  };
  const NOTES = [
    {id:'f1', kind:'dato', text:'En 1806, el periódico The Balance and Columbian Repository definió un cocktail como destilado, azúcar, agua y bitters.'},
    {id:'f2', kind:'dato', text:'El Daiquiri de la lista IBA lleva ron, jugo de lima y azúcar.'},
    {id:'f3', kind:'dato', text:'El Negroni de la lista IBA se arma en partes iguales de ginebra, vermut rojo y bitter.'},
    {id:'f4', kind:'dato', text:'El mojito clásico lleva ron, lima, azúcar, hojas de menta y soda.'},
    {id:'f5', kind:'dato', text:'En 1978 Puerto Rico declaró la piña colada su bebida oficial.'},
    {id:'f6', kind:'dato', text:'El Old Fashioned es whisky, azúcar, bitter y cáscara de cítrico: el trago pedido a la antigua.'},
    {id:'f7', kind:'dato', text:'Un sour equilibra destilado, cítrico y azúcar. El whisky sour es el modelo de esa familia.'},
    {id:'f8', kind:'dato', text:'La Margarita de la lista IBA lleva tequila, triple sec y jugo de lima.'},
    {id:'r1', kind:'reto', text:'Nunca he: di algo que nunca hayas hecho. Quien sí, da un sorbo.'},
    {id:'r2', kind:'reto', text:'Dos verdades y una mentira. El resto adivina cuál es la mentira.'},
    {id:'r3', kind:'reto', text:'Categorías: ciudades, canciones o frutas. Sin repetir. Quien se traba, cede el turno.'},
    {id:'r4', kind:'reto', text:'La mirada: el primero que parpadea brinda.'},
    {id:'r5', kind:'reto', text:'Brindis de una frase. Cada quien dedica el vaso en una oración, sin repetir la idea anterior.'},
    {id:'r6', kind:'reto', text:'La letra: di un trago o una fruta que empiece con la última letra de lo anterior.'},
    {id:'r7', kind:'reto', text:'Pregunta a tu izquierda. Una pregunta, una frase de respuesta, y se rota.'}
  ];

  function gsapOn(){
    return typeof window.gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function interactOn(){
    return typeof window.interact === 'function';
  }
  function cls(){
    return Array.prototype.filter.call(arguments, Boolean).join(' ');
  }
  function liquidColor(){ return calculosVaso.liquidColor(api.sel); }
  function liquidY(){
    const answered = window.Preguntas ? Preguntas.answered() : 0;
    return calculosVaso.liquidY(api.sel, api.fruitAny, answered);
  }
  function hash(s){
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function esc(s){
    return String(s).replace(/[&<>"]/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];
    });
  }
  function svgEl(viewBox, className, html, label){
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('class', className);
    if (label){
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', label);
    } else svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = html;
    return svg;
  }
  function glassLabel(){
    const bits = [...api.sel.alcohol, ...api.sel.fruta].map(function(s){ return s.toLowerCase(); });
    if (!bits.length) return 'Vaso con hielos';
    return 'Vaso con hielos, ' + bits.join(', ');
  }
  function fruitGlyphMarkup(name, x, y, scale, className, withTitle){
    return dibujarFrutaActual(name, x, y, scale, className, withTitle);
  }
  function fruitIconNode(name){ return svgEl('0 0 32 32', 'fruit-icon', fruitGlyphMarkup(name, 16, 17, 0.95, '', false), ''); }
  function glassBounds(y, pad){ return calculosVaso.glassBounds(y, pad); }
  function iceOffset(y){ return Math.max(-28, Math.min(42, y - 102)); }
  function iceMarkup(id, y){
    return '<g class="ice-float" transform="translate(0 ' + iceOffset(y) + ')">' +
      [[57,88,-13],[83,102,17],[61,126,-7]].map(function(cube){
        return '<g class="ice-cube" transform="translate(' + cube[0] + ' ' + cube[1] + ') rotate(' + cube[2] + ' 12 12)">' +
          '<rect width="25" height="26" rx="5" fill="url(#' + id + '-ice)" stroke="#fefae0" stroke-opacity=".58" stroke-width=".8"/>' +
          '<path d="M4 20V7Q4 4 8 4H19M7 23H20Q22 23 22 19" fill="none" stroke="#fefae0" stroke-opacity=".55" stroke-width="1" stroke-linecap="round"/>' +
          '<path d="M7 9L16 7L19 17L10 20Z" fill="#fefae0" opacity=".1"/>' +
          '<path d="M10 7L13 13L10 17M13 13L19 15" fill="none" stroke="#fefae0" stroke-opacity=".25" stroke-width=".6"/></g>';
      }).join('') + '</g>';
  }
  function garnishMarkup(){
    const plan = [...api.sel.plan][0];
    if (!plan) return '';
    if (plan === 'playa') return fruitGlyphMarkup('Menta', 91, 50, 0.92, 'garnish fruit-glyph', false);
    if (plan === 'cena') return fruitGlyphMarkup('Naranja', 91, 50, 0.92, 'garnish fruit-glyph', false);
    return '';
  }
  function glassBuild(){
    const y = liquidY();
    const clipId = 'copa-corte-' + (++glassSequence);
    const html = '<defs><clipPath id="' + clipId + '"><path d="M48 27Q80 34 112 27L119 163Q80 176 41 163Z"/></clipPath>' +
      '<linearGradient id="' + clipId + '-crystal"><stop stop-color="#fefae0" stop-opacity=".16"/><stop offset=".22" stop-color="#fefae0" stop-opacity=".025"/><stop offset=".76" stop-color="#fefae0" stop-opacity=".015"/><stop offset="1" stop-color="#fefae0" stop-opacity=".13"/></linearGradient>' +
      '<linearGradient id="' + clipId + '-depth" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fefae0" stop-opacity=".06"/><stop offset="1" stop-color="#283618" stop-opacity=".32"/></linearGradient>' +
      '<linearGradient id="' + clipId + '-ice" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fefae0" stop-opacity=".58"/><stop offset=".48" stop-color="#fefae0" stop-opacity=".12"/><stop offset="1" stop-color="#fefae0" stop-opacity=".32"/></linearGradient></defs>' +
      '<ellipse cx="80" cy="181" rx="39" ry="3" fill="#000" opacity=".12"/>' +
      '<path d="M45 24L37 165Q37 170 42 173Q80 187 118 173Q123 170 123 165L115 24" fill="url(#' + clipId + '-crystal)" stroke="#fefae0" stroke-opacity=".72" stroke-width="1.1" stroke-linejoin="round"/>' +
      '<g clip-path="url(#' + clipId + ')">' +
      '<g class="liquid-body"><rect class="liquid" x="28" y="' + y + '" width="104" height="175" fill="' + liquidColor() + '"/>' +
      '<rect class="liquid-depth" x="28" y="' + y + '" width="104" height="175" fill="url(#' + clipId + '-depth)"/></g>' +
      '<ellipse class="surface" cx="80" cy="' + y + '" rx="40" ry="3.2" fill="#fefae0" opacity=".25"/>' +
      iceMarkup(clipId, y) + garnishMarkup() + '</g>' +
      '<ellipse cx="80" cy="24" rx="35" ry="6" fill="#fefae0" fill-opacity=".035" stroke="#fefae0" stroke-opacity=".88" stroke-width="1.3"/>' +
      '<ellipse cx="80" cy="24" rx="31.5" ry="3.5" fill="none" stroke="#fefae0" stroke-opacity=".32" stroke-width=".6"/>' +
      '<path d="M50 39L44 149" stroke="#fefae0" stroke-opacity=".65" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M54 43L50 110M110 40L116 151" stroke="#fefae0" stroke-opacity=".22" stroke-width=".7" stroke-linecap="round"/>' +
      '<path d="M41 164Q80 179 119 164L119 169Q80 184 41 169Z" fill="#fefae0" fill-opacity=".13" stroke="#fefae0" stroke-opacity=".45" stroke-width=".65"/>' +
      '<path d="M48 172Q80 182 112 172" fill="none" stroke="#fefae0" stroke-opacity=".7" stroke-width="1" stroke-linecap="round"/>';
    return svgEl('0 0 160 210', 'glass glass-build', html, glassLabel());
  }
  function paintLiquid(root, fromY, fromColor){
    const svg = root.querySelector('.glass-build');
    if (!svg) return;
    const liquid = svg.querySelector('.liquid');
    const surface = svg.querySelector('.surface');
    if (!liquid) return;
    const y = liquidY();
    const color = liquidColor();
    const previous = fromColor || liquid.getAttribute('fill') || color;
    const startY = fromY ?? Number(liquid.getAttribute('y'));
    const depth = svg.querySelector('.liquid-depth');
    const ice = svg.querySelector('.ice-float');
    lastY = y;
    if (gsapOn()){
      const timing = {duration:0.7, ease:'power3.out', overwrite:true};
      window.gsap.fromTo(liquid, {attr:{fill:previous, y:startY}}, {...timing, attr:{fill:color, y:y}});
      if (depth) window.gsap.fromTo(depth, {attr:{y:startY}}, {...timing, attr:{y:y}});
      if (surface){
        window.gsap.fromTo(surface, {attr:{cy:startY}}, {...timing, attr:{cy:y}});
        if (Math.abs(startY - y) > 1) window.gsap.fromTo(surface, {attr:{ry:4.8}}, {attr:{ry:3.2},duration:0.85,ease:'sine.out',overwrite:'auto'});
      }
      if (ice) window.gsap.fromTo(ice, {attr:{transform:'translate(0 ' + iceOffset(startY) + ')'}}, {...timing, attr:{transform:'translate(0 ' + iceOffset(y) + ')'}});
    } else {
      liquid.setAttribute('fill', color);
      liquid.setAttribute('y', String(y));
      if (depth) depth.setAttribute('y', String(y));
      if (surface) surface.setAttribute('cy', String(y));
      if (ice) ice.setAttribute('transform', 'translate(0 ' + iceOffset(y) + ')');
    }
    lastLiquidColor = color;
  }
  function mascotNode(face){
    const html = '<rect x="18" y="20" width="28" height="30" rx="8" fill="#606c38"/>' +
      '<rect x="22" y="10" width="20" height="12" rx="4" fill="#dda15e"/>' +
      '<path class="brow brow-l" d="M22 28h8" stroke="#fefae0" stroke-width="2" stroke-linecap="round"/>' +
      '<path class="brow brow-r" d="M34 28h8" stroke="#fefae0" stroke-width="2" stroke-linecap="round"/>' +
      '<ellipse class="eye eye-l" cx="26" cy="34" rx="2.4" ry="2.6" fill="#fefae0"/>' +
      '<ellipse class="eye eye-r" cx="38" cy="34" rx="2.4" ry="2.6" fill="#fefae0"/>' +
      '<path class="mouth mouth-smile" d="M26 44c3 3 9 3 12 0" fill="none" stroke="#fefae0" stroke-width="2" stroke-linecap="round"/>' +
      '<ellipse class="mouth mouth-open" cx="32" cy="45" rx="4" ry="3" fill="#fefae0"/>' +
      '<path class="mouth mouth-laugh" d="M24 42c3 7 13 7 16 0" fill="none" stroke="#fefae0" stroke-width="2" stroke-linecap="round"/>';
    return svgEl('0 0 64 64', 'mascot face-' + (face || 'rest'), html, '');
  }
  function setFace(svg, face){
    if (svg) svg.setAttribute('class', 'mascot face-' + face);
  }
  function faceFor(key){
    if (key === 'sin' || key === 'alguna') return 'surprise';
    if (key === 'varios' || key.indexOf('|') >= 0 || key === 'fuerte' || key === 'fiesta' || key === 'tequila') return 'laugh';
    if (key === 'dulce' || key === 'cremoso' || key === 'ron') return 'wink';
    if (key === 'idle') return 'rest';
    return 'brow';
  }
  function stepName(){
    return api.stage === 'sabor' ? 'estilo' : api.stage;
  }
  function moodKey(){
    if (api.stage === 'alcohol'){
      if (api.sel.alcohol.has('Sin alcohol')) return 'sin';
      if (api.sel.alcohol.size >= 2){
        return [...api.sel.alcohol].map(function(nombre){ return nombre.toLowerCase(); }).sort().join('|');
      }
      const one = [...api.sel.alcohol][0];
      return one ? one.toLowerCase() : 'idle';
    }
    if (api.stage === 'fruta'){
      if (api.fruitAny) return 'cualquiera';
      if (!api.sel.fruta.size) return 'idle';
      const f = [...api.sel.fruta];
      if (f.length === 1 && f[0] === 'Menta') return 'menta';
      if (f.every(function(x){ return x === 'Limón' || x === 'Naranja'; })) return 'citrico';
      if (f.some(function(x){ return TROPICAL.indexOf(x) >= 0; })) return 'tropical';
      return 'fresca';
    }
    if (api.stage === 'sabor'){
      if (api.styleTexture === 'Cremoso') return 'cremoso';
      if (api.styleTexture === 'Refrescante') return 'refrescante';
      if (api.styleTaste === 'Dulce') return 'dulce';
      if (api.styleTaste === 'Ácido') return 'acido';
      return 'idle';
    }
    if (api.stage === 'fuerza'){
      const f = [...api.sel.fuerza][0];
      return f ? f.toLowerCase() : 'idle';
    }
    if (api.stage === 'alergia'){
      if (!api.sel.alergia.size) return 'idle';
      if (api.sel.alergia.has('ninguna')) return 'ninguna';
      return 'alguna';
    }
    return [...api.sel.plan][0] || 'idle';
  }
  function speak(key, variants){
    if (spoken.key === key) return spoken.text;
    const i = used[key] || 0;
    const text = variants[i % variants.length];
    used[key] = i + 1;
    spoken = {key:key, text:text};
    try { sessionStorage.setItem(QUIP_KEY, JSON.stringify(used)); } catch (e) { /* la frase sigue en esta visita */ }
    return text;
  }
  function mood(){
    if (api.stage === 'plan' && window.Preguntas) return Preguntas.mood();
    const key = moodKey();
    const bank = (QUIPS[stepName()] || {})[key] || FALLBACK;
    return {key:key, face:faceFor(key), text:speak(stepName() + '-' + key, bank)};
  }
  function suspense(){
    if (!revealLine){
      revealLine = speak('reveal', [
        'Espera. Esto dice más de ti de lo que crees.',
        'No mires el vaso. Bueno, míralo.',
        'Ya. Te tengo.',
        'Un segundo. La barra ya decidió.'
      ]);
    }
    return revealLine;
  }
  function prepareStyleDeck(reset){
    const names = STYLE_CARDS.map(c => c.name);
    let saved = null;
    if (!reset){
      try { saved = JSON.parse(sessionStorage.getItem(STYLE_ORDER_KEY) || 'null'); } catch (e) { /* nueva baraja */ }
    }
    if (Array.isArray(saved) && saved.length === names.length && new Set(saved).size === names.length && saved.every(name => names.includes(name))){
      styleOrder = saved;
    } else {
      styleOrder = names.slice();
      for (let i = styleOrder.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [styleOrder[i], styleOrder[j]] = [styleOrder[j], styleOrder[i]];
      }
      try { sessionStorage.setItem(STYLE_ORDER_KEY, JSON.stringify(styleOrder)); } catch (e) { /* se conserva en memoria */ }
    }
  }
  function styleDeck(){
    return styleOrder.map(name => STYLE_CARDS.find(card => card.name === name));
  }
  function commitEstilo(){
    api.sel.sabor.clear();
    STYLE_CARDS.forEach(function(c){ if (api.styleDecisions[c.name] === true) api.sel.sabor.add(c.name); });
    api.styleTaste = ['Dulce','Ácido'].find(function(n){ return api.sel.sabor.has(n); }) || '';
    api.styleTexture = ['Cremoso','Refrescante','Suave','Espumoso','Granizado','Sedoso'].find(function(n){ return api.sel.sabor.has(n); }) || '';
  }
  function question(){
    if (api.stage === 'plan' && window.Preguntas) return Preguntas.current()?.pregunta || 'Ya nos vamos conociendo.';
    if (api.stage === 'sabor'){
      const current = styleDeck().find(c => typeof api.styleDecisions[c.name] !== 'boolean');
      return current ? current.invite : 'Estas son tus conexiones.';
    }
    return api.partidaVM.current().q;
  }
  function tropicalCount(){
    return TROPICAL.filter(function(f){ return api.sel.fruta.has(f); }).length;
  }
  function baseArchetype(choices){
    const sabores = choices ? new Set(choices.sabor || []) : api.sel.sabor;
    const plan = choices ? (choices.plan || [])[0] : [...api.sel.plan][0];
    // Afinidades lúdicas con las respuestas actuales, no una evaluación psicológica.
    // El plan marca la familia; los gustos matizan el personaje. La graduación
    // y elegir con o sin alcohol no determinan la personalidad.
    if (plan === 'fiesta'){
      if (sabores.has('Espumoso')) return ARCH.escandaloso;
      if (sabores.has('Ácido')) return ARCH.bocon;
      return ARCH.apuntado;
    }
    if (plan === 'cena'){
      if (sabores.has('Sedoso') || sabores.size >= 3) return ARCH.exigente;
      if (sabores.has('Cremoso') || sabores.has('Dulce')) return ARCH.patron;
      return ARCH.siempre;
    }
    if (plan === 'aventura'){
      if (sabores.size >= 3 || sabores.has('Granizado')) return ARCH.inventado;
      if ((choices ? TROPICAL.some(f => (choices.fruta || []).includes(f)) : tropicalCount() > 0) || sabores.has('Ácido')) return ARCH.callejero;
      return ARCH.popular;
    }
    if (sabores.has('Cremoso') || sabores.has('Sedoso')) return ARCH.enamorado;
    if (sabores.has('Dulce')) return ARCH.chismoso;
    return ARCH.fresco;
  }
  function archetype(){
    const base = baseArchetype();
    const humor = api.humor || 0;
    if (!humor) return {...base, elementoNombre:ELEMENTOS[base.elemento], shifted:false, stuck:false};
    const i = LADDER.indexOf(base.id);
    const next = Math.max(0, Math.min(LADDER.length - 1, i + humor));
    const picked = ARCH[LADDER[next]];
    return {
      ...picked,
      elementoNombre:ELEMENTOS[picked.elemento],
      shifted:picked.id !== base.id,
      stuck:picked.id === base.id
    };
  }
  function personalityFor(choices, id){
    const picked = Object.prototype.hasOwnProperty.call(ARCH, id) ? ARCH[id] : baseArchetype(choices);
    return {...picked, elementoNombre:ELEMENTOS[picked.elemento]};
  }
  function pinPct(i){
    return ((i + 0.5) / api.partidaVM.route().length * 100) + '%';
  }
  function focusPick(value){
    const nodes = api.app.querySelectorAll('[data-pick]');
    for (const n of nodes){
      if (n.getAttribute('data-pick') === value){
        n.focus();
        return;
      }
    }
  }
  function clearGestures(){
    if (!interactOn()) return;
    document.querySelectorAll('.fruit, .swipe-card').forEach(function(node){
      try { window.interact(node).unset(); } catch (e) { /* el gesto ya no está */ }
    });
  }
  function hit(a, b){
    const A = a.getBoundingClientRect();
    const B = b.getBoundingClientRect();
    const x = ((A.left + A.width / 2) - B.left) / B.width * 160;
    const y = ((A.top + A.height / 2) - B.top) / B.height * 210;
    if (y < 28 || y > 168) return false;
    const bounds = glassBounds(y, 4);
    return x >= bounds.left && x <= bounds.right;
  }
  function resetFruitToken(node){
    node.dataset.x = '0';
    node.dataset.y = '0';
    node.dataset.moved = '0';
    if (gsapOn()){
      window.gsap.to(node, {x:0, y:0, duration:0.22, ease:'power2.out', clearProps:'transform'});
    } else node.style.transform = '';
  }
  function blocked(){ return api.partidaVM.blocked(); }
  function whyText(){
    if (api.stage === 'alergia' && api.sel.alergia.has('otra')){
      return 'Tu otra restricción necesita revisión con quien prepara las bebidas. Por ahora no podemos recomendarte una receta. Conservamos tus elecciones.';
    }
    if (api.stage === 'plan' && api.sel.plan.size && !api.ranked().length){
      return 'No encontramos un trago compatible. Conserva tus restricciones y prueba otras frutas o una base diferente.';
    }
    if (api.stage === 'sabor') return 'Decide sobre cada carta. Puedes aceptar varias o seguir sin preferencia.';
    if (api.stage === 'alcohol' || api.stage === 'alergia') return 'Elige al menos una para seguir.';
    return 'Elige una para seguir.';
  }
  function capLabel(){
    const key = ['alcohol','fruta','alergia'].includes(api.stage) ? api.stage : '';
    if (!key) return '';
    if (key === 'fruta' && api.fruitAny) return 'La que sea';
    const n = api.sel[key].size;
    if (!n) return '';
    return n + ' de ' + api.MAX_PICK;
  }
  function toggleAlcohol(value){
    const result = api.alcoholVM.toggle(value);
    if (result.status === 'limit'){
      const why = document.getElementById('why');
      if (why){
        why.hidden = false;
        why.textContent = 'Cinco es el tope.';
      }
      return;
    }
    if (result.added) freshKey = 'a:' + value;
    api.moveFocus = false;
    api.persist();
    renderStage();
    focusPick(value);
  }
  function toggleFruit(value){
    const result = api.frutasVM.toggle(value);
    if (result.status === 'limit'){
      const why = document.getElementById('why');
      if (why){
        why.hidden = false;
        why.textContent = 'Cinco es el tope.';
      }
      return;
    }
    if (result.added) freshKey = 'f:' + value;
    api.moveFocus = false;
    api.persist();
    renderStage();
    focusPick(value);
  }
  function setSingle(key, value){
    api.togglePick(key, {v:value, t:value}, {checked:true});
    api.moveFocus = false;
    api.persist();
    renderStage();
    focusPick(value);
  }
  function addFruit(value){
    if (!api.frutasVM.add(value)) return;
    freshKey = 'f:' + value;
    api.moveFocus = false;
    api.persist();
    renderStage();
    focusPick(value);
  }
  function goBack(){
    const result = api.partidaVM.back();
    if (result === 'ignored') return;
    if (result === 'step') api.saveOpts = null;
    api.moveFocus = true;
    api.persist();
    renderStage();
  }
  function goNext(ev){
    if (ev) ev.preventDefault();
    const result = api.partidaVM.next(Boolean(ev));
    if (result === 'blocked'){
      const why = document.getElementById('why');
      if (why){
        why.hidden = false;
        why.textContent = whyText();
      }
      const btn = api.app.querySelector('.btn.next');
      if (btn) btn.focus();
      return;
    }
    if (result !== 'advanced') return;
    api.moveFocus = true;
    api.persist();
    renderStage();
  }
  function chooseSide(side){
    const current = styleDeck().find(function(c){ return typeof api.styleDecisions[c.name] !== 'boolean'; });
    if (!current){ swipeBusy = false; return; }
    api.styleDecisions[current.name] = side === 'right';
    styleHistory.push(current.name);
    commitEstilo();
    swipeBusy = false;
    api.moveFocus = false;
    api.persist();
    renderStage();
    const card = api.app.querySelector('.swipe-card');
    if (card) card.focus();
    else {
      const heading = api.app.querySelector('.match-heading');
      if (heading){ heading.setAttribute('tabindex', '-1'); heading.focus({preventScroll:true}); window.scrollTo(0, 0); }
    }
  }
  function fly(side){
    if (swipeBusy) return;
    swipeBusy = true;
    const card = document.querySelector('.swipe-card');
    if (card) { card.classList.add(side === 'left' ? 'is-reject' : 'is-accept'); card.style.setProperty('--verdict-opacity', '1'); }
    if (card && gsapOn()){
      window.gsap.to(card, {
        x: side === 'left' ? -300 : 300,
        rotation: side === 'left' ? -12 : 12,
        opacity: 0,
        duration: 0.26,
        ease: 'power2.in',
        onComplete: function(){ chooseSide(side); }
      });
      return;
    }
    chooseSide(side);
  }
  function alcoholNode(){
    return createAlcoholView({
      el:api.el, svgEl, groups:api.STEPS.find(stage => stage.k === 'alcohol').groups, asItem:api.asItem,
      viewModel:api.alcoholVM, isFresh:value => freshKey === 'a:' + value,
      onToggle:toggleAlcohol, question
    });
  }
  function fruitNode(){
    return createFrutasView({
      el:api.el, groups:api.STEPS.find(stage => stage.k === 'fruta').groups, asItem:api.asItem,
      viewModel:api.frutasVM, isFresh:value => freshKey === 'f:' + value,
      fruitIconNode, dragLocked:() => Date.now() < dragLock, onToggle:toggleFruit
    });
  }
  function styleCardContent(card, style, portraitOnly){
    card.style.setProperty('--card-color', style.color);
    if (style.photo) card.append(api.el('img', {class:'style-photo', src:style.photo, alt:style.name, draggable:'false'}));
    else {
      const art = api.el('div', {'aria-hidden':'true',class:'style-art style-art-' + style.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')});
      const glass = glassBuild();
      glass.querySelector('.liquid').setAttribute('fill', style.color);
      const drop = glass.querySelector('.ingredient-drop'); if (drop) drop.remove();
      art.append(glass);
      card.append(art);
    }
    if (!portraitOnly) card.append(api.el('div', {class:'card-caption'}, api.el('h2', {}, style.name), api.el('p', {}, style.line)));
    return card;
  }
  function returnToStyleCards(){
    if (matchCleanup) matchCleanup();
    const name = styleHistory.pop() || [...styleDeck()].reverse().find(c => typeof api.styleDecisions[c.name] === 'boolean')?.name;
    if (name) delete api.styleDecisions[name];
    commitEstilo();
    api.moveFocus = false;
    renderStage();
    const card = api.app.querySelector('.swipe-card');
    if (card) card.focus();
  }
  function playStyleMatches(quiz){
    const finish = quiz.querySelector('.match-reveal');
    if (!finish) return;
    const ordered = [...new Set([...styleHistory, ...styleDeck().map(c => c.name)])];
    const accepted = ordered.filter(name => api.styleDecisions[name] === true).map(name => STYLE_CARDS.find(c => c.name === name));
    const scene = finish.querySelector('.match-scene');
    const heading = finish.querySelector('.match-heading');
    const heart = finish.querySelector('.match-heart');
    const countdown = finish.querySelector('.match-countdown');
    const counter = finish.querySelector('.match-seconds');
    const back = finish.querySelector('.match-return');
    let cancelled = false;
    let timer = null;
    let release = null;
    const animations = new Set();
    const alive = function(){ return !cancelled && finish.isConnected && api.stage === 'sabor'; };
    const wait = function(ms){
      return new Promise(function(resolve){
        release = resolve;
        function done(){
          if (alive() && document.hidden){ timer = setTimeout(done, 250); return; }
          release = null; resolve();
        }
        timer = setTimeout(done, ms);
      });
    };
    async function animate(node, frames, duration){
      if (!alive() || !node.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      let animation;
      try {
        animation = node.animate(frames, {duration:duration, easing:'cubic-bezier(.16,1,.3,1)', fill:'forwards'});
        animations.add(animation);
        await animation.finished;
      } catch (e) { /* Leemos la escena aunque el navegador no pueda animarla. */ }
      finally {
        if (animation){ animations.delete(animation); animation.cancel(); }
      }
    }
    matchCleanup = function(){
      cancelled = true;
      clearTimeout(timer);
      if (release) release();
      animations.forEach(function(animation){ animation.cancel(); });
      animations.clear();
      matchCleanup = null;
    };
    back.addEventListener('click', returnToStyleCards);
    async function run(){
      for (const [index, style] of accepted.entries()){
        if (!alive()) return;
        const persona = MATCH_PERSONAS[style.name];
        finish.dataset.matchPhase = 'announcement';
        finish.dataset.matchStyle = style.name;
        heading.textContent = index === 0 ? 'Match encontrado' : 'Otro match encontrado';
        scene.replaceChildren();
        await Promise.all([
          animate(heading, [{opacity:0,transform:'translateX(-42px) rotate(-6deg) scale(.8)'},{opacity:1,transform:'translateX(5px) rotate(-3deg) scale(1.06)',offset:.7},{opacity:1,transform:'none'}], 450),
          animate(heart, [{opacity:0,transform:'scale(.35)'},{opacity:.24,transform:'scale(1.15)',offset:.5},{opacity:.12,transform:'scale(1)'}], 500)
        ]);
        if (!alive()) return;
        finish.dataset.matchPhase = 'greeting';
        const portrait = styleCardContent(api.el('div', {class:'match-portrait'}), style, true);
        const quote = api.el('p', {class:'match-quote'}, '“' + persona.hello + '”');
        const words = api.el('div', {class:'match-words', 'aria-live':'polite'}, api.el('h3', {}, style.name), quote);
        scene.replaceChildren(portrait, words);
        await animate(scene, [{opacity:0, transform:'translateY(24px) scale(.82)'}, {opacity:1, transform:'none'}], 400);
        if (!alive()) return;
        await wait(Math.max(1600, persona.hello.length * 30) + 100);
        if (!alive()) return;
        finish.dataset.matchPhase = 'farewell';
        quote.textContent = '“' + persona.goodbye + '”';
        portrait.classList.add('is-saying-goodbye');
        await animate(quote, [{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}], 350);
        if (!alive()) return;
        await wait(Math.max(1400, persona.goodbye.length * 30) + 100);
        if (!alive()) return;
        finish.dataset.matchPhase = 'leaving';
        await Promise.all([
          animate(portrait, [{opacity:1,transform:'scale(.88)'},{opacity:0,transform:'scale(.15) translateY(36px) rotate(8deg)'}], 450),
          animate(words, [{opacity:1},{opacity:0}], 350)
        ]);
        if (!alive()) return;
        scene.replaceChildren();
      }
      if (!alive()) return;
      finish.dataset.matchPhase = 'countdown';
      delete finish.dataset.matchStyle;
      heading.textContent = accepted.length ? 'Nos vemos en la cita.' : 'A tu manera.';
      heart.setAttribute('hidden', '');
      scene.hidden = accepted.length > 0;
      countdown.hidden = false;
      back.hidden = false;
      back.focus({preventScroll:true});
      // Tres segundos completos después de la última despedida.
      for (let seconds = 3; seconds > 0; seconds--){
        counter.textContent = String(seconds);
        await wait(1000);
        if (!alive()) return;
      }
      counter.textContent = '0';
      if (!alive()) return;
      await animate(quiz, [{opacity:1,transform:'none'}, {opacity:0,transform:'translateY(-16px)'}], 350);
      if (!alive()) return;
      goNext();
    }
    run().catch(function(){
      // Una animación fallida nunca deja al visitante sin salida.
      if (!alive()) return;
      heading.textContent = 'Volvamos a tus elecciones.';
      back.hidden = false;
    });
  }
  function styleNode(){
    const wrap = api.el('div', {class:'play style-deck'});
    const count = STYLE_CARDS.filter(c => typeof api.styleDecisions[c.name] === 'boolean').length;
    const current = styleDeck().find(c => typeof api.styleDecisions[c.name] !== 'boolean');
    if (current){
      const card = api.el('div', {class:'swipe-card', tabindex:'0', role:'group', 'aria-label':current.name + '. Desliza o toca el lado izquierdo para pasar, o el derecho para invitar. También puedes usar las flechas del teclado.'});
      styleCardContent(card, current);
      card.append(api.el('span', {class:'verdict verdict-no','aria-hidden':'true'}, '× No me gusta'), api.el('span', {class:'verdict verdict-yes','aria-hidden':'true'}, '✓ Me gusta'));
      card.addEventListener('keydown', function(ev){
        if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight'){ ev.preventDefault(); fly(ev.key === 'ArrowLeft' ? 'left' : 'right'); }
      });
      wrap.append(card, api.el('p', {class:'gesture-hint'}, 'Desliza o toca un lado. Izquierda: pasa. Derecha: invita.'));
    } else {
      const accepted = styleDeck().filter(c => api.styleDecisions[c.name] === true);
      const finish = api.el('div', {class:'deck-finish match-reveal'});
      const heading = api.el('h2', {class:'match-heading', tabindex:'-1', 'aria-live':'polite'}, accepted.length ? 'Match encontrado' : 'A tu manera.');
      const heart = svgEl('0 0 100 92', 'match-heart', '<path d="M50 85 12 48C-8 27 5 5 24 5c12 0 20 7 26 16C56 12 64 5 76 5c19 0 32 22 12 43Z" fill="currentColor"/>', '');
      const announcement = api.el('div', {class:'match-announcement'}, heart, heading);
      const scene = api.el('div', {class:'match-scene'});
      const counter = api.el('strong', {class:'match-seconds'}, '3');
      const countdown = api.el('p', {class:'match-countdown', role:'status'}, 'Seguimos con tu mezcla en ', counter, ' segundos.');
      const back = api.el('button', {class:'text match-return', type:'button'}, 'Quisiera regresar');
      countdown.hidden = true; back.hidden = true;
      finish.append(announcement, scene, countdown, back);
      if (!accepted.length) scene.append(api.el('p', {}, 'Buscaremos tu trago con las demás elecciones.'));
      wrap.append(finish);
    }
    if (count && current){
      const undo = api.el('button', {type:'button',class:'text undo-style'}, 'Deshacer última elección');
      undo.addEventListener('click', function(){
        if (swipeBusy) return;
        returnToStyleCards();
      }); wrap.append(undo);
    }
    return wrap;
  }
  function chipNode(key){
    const wrap = api.el('div', {class:'play'});
    const step = api.STEPS.find(function(s){ return s.k === key; });
    step.groups.forEach(function(g){
      const fs = api.el('fieldset');
      fs.setAttribute('aria-label', question());
      const box = api.el('div', {class:'choice-row chips'});
      g.o.forEach(function(raw){
        const item = api.asItem(raw);
        const on = api.sel[key].has(item.v);
        const b = api.el('button', {
          type:'button',
          class: cls('choice', on && 'is-on'),
          'data-pick': item.v,
          'aria-pressed': on ? 'true' : 'false'
        }, item.t);
        b.addEventListener('click', function(){ flip(key, item.v); });
        box.append(b);
      });
      fs.append(box);
      wrap.append(fs);
    });
    return wrap;
  }
  function planChoices(){
    const wrap = api.el('div', {class:'play'});
    const step = api.STEPS.find(stage => stage.k === 'plan');
    step.groups.forEach(function(g){
      g.o.forEach(function(raw){
        const item = api.asItem(raw);
        const on = api.sel.plan.has(item.v);
        const b = api.el('button', {
          type:'button',
          class: cls('plan-pick', on && 'is-on'),
          'data-pick': item.v,
          'aria-pressed': on ? 'true' : 'false'
        }, item.t);
        b.addEventListener('click', function(){ setSingle('plan', item.v); });
        wrap.append(b);
      });
    });
    return wrap;
  }
  function playBody(){
    if (api.stage === 'alcohol') return alcoholNode();
    if (api.stage === 'fruta') return fruitNode();
    if (api.stage === 'sabor') return styleNode();
    if (api.stage === 'alergia') return chipNode('alergia');
    return planChoices();
  }
  function actions(){
    const next = api.el('button', {
      class: cls('btn', 'next', blocked() && 'is-off'),
      type:'submit'
    }, 'Siguiente');
    if (blocked()){
      next.setAttribute('aria-disabled', 'true');
      next.setAttribute('aria-describedby', 'why');
    }
    const back = Boolean(api.partidaVM.previous()) ? api.el('button', {class:'text', type:'button'}, 'Atrás') : null;
    if (back) back.addEventListener('click', goBack);
    return api.el('div', {class:'actions'}, api.stage === 'sabor' ? null : next, back);
  }
  function skipControl(){
    const see = api.el('button', {class:'text', type:'button'}, 'Ver el trago de todas formas');
    see.addEventListener('click', function(){
      const list = api.ranked();
      if (!list.length) return;
      api.current = list[0];
      api.phase = 'result';
      api.reveal = true;
      api.moveFocus = true;
      if (api.markVisit) api.markVisit();
      api.render();
    });
    return api.el('div', {class:'actions'}, see);
  }
  function bindFruit(root){
    bindFrutasGestures({
      root, interactOn, hit, resetFruitToken, hasFruit:value => api.sel.fruta.has(value),
      addFruit, onToggle:toggleFruit, setDragLock:value => { dragLock = value; }
    });
  }
  function bindSwipe(root){
    const card = root.querySelector('.swipe-card');
    if (!card) return;
    let startX = 0, startY = 0, active = false, offset = 0;
    card.addEventListener('pointerdown', function(ev){
      if (swipeBusy || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
      if (window.gsap) window.gsap.killTweensOf(card);
      offset = window.gsap ? Number(window.gsap.getProperty(card, 'x')) || 0 : 0;
      startX = ev.clientX - offset; startY = ev.clientY; active = true;
      card.setPointerCapture(ev.pointerId);
    });
    card.addEventListener('pointermove', function(ev){
      if (!active || swipeBusy) return;
      offset = ev.clientX - startX;
      if (Math.abs(ev.clientY - startY) > Math.abs(offset) + 12){ active = false; reset(); return; }
      if (window.gsap) window.gsap.set(card, {x:offset, rotation:offset / 20});
      else card.style.transform = 'translateX(' + offset + 'px) rotate(' + offset / 20 + 'deg)';
      card.classList.toggle('is-reject',offset < -10); card.classList.toggle('is-accept',offset > 10);
      card.style.setProperty('--verdict-opacity',String(Math.min(1,Math.abs(offset)/90)));
    });
    function reset(){
      card.classList.remove('is-reject','is-accept');
      card.style.setProperty('--verdict-opacity','0');
      if (gsapOn()) window.gsap.to(card, {x:0, rotation:0, duration:0.18, ease:'power2.out', overwrite:true, clearProps:'transform'});
      else card.style.transform = '';
      offset = 0;
    }
    card.addEventListener('pointerup',function(ev){
      if (!active) { reset(); return; } active = false;
      if (Math.abs(offset) < 8 && Math.abs(ev.clientY - startY) < 8){
        const bounds = card.getBoundingClientRect();
        fly(ev.clientX < bounds.left + bounds.width / 2 ? 'left' : 'right');
      } else if (Math.abs(offset) >= Math.min(90,card.clientWidth * .25)) fly(offset > 0 ? 'right' : 'left');
      else reset();
    });
    card.addEventListener('pointercancel',function(){ active = false; reset(); });
  }
  function motion(quiz, pin, entered){
    if (!gsapOn()) return;
    try {
      if (entered){
        if (lastPin >= 0 && lastPin !== api.partidaVM.position()){
          window.gsap.fromTo(pin, {left: pinPct(lastPin)}, {left: pinPct(api.partidaVM.position()), duration:0.28, ease:'power2.out'});
        }
      }
      paintLiquid(quiz, lastY, lastLiquidColor);
      quiz.querySelectorAll('.is-fresh:not(.bit)').forEach(function(node){
        window.gsap.from(node, {scale:0.9, duration:0.22, ease:'back.out(2)'});
      });
      const face = quiz.querySelector('.mascot');
      if (face && !face.classList.contains('face-rest')){
        window.gsap.from(face, {y:-8, duration:0.28, ease:'back.out(2)'});
      }
    } catch (e) { /* la página sigue sin la animación */ }
  }
  function stopStageSpeech(){
    stageSpeech.forEach(function(animation){ animation.cancel(); });
    stageSpeech = [];
  }
  function speakStage(line, glass, identity){
    if (!line || !glass) return;
    const text = line.textContent;
    const changed = lastStageLine !== identity;
    lastStageLine = identity;
    if (!changed || window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof glass.animate !== 'function') return;
    // The complete phrase reserves its space and is announced only once.
    line.setAttribute('aria-label', text);
    line.replaceChildren();
    let elapsed = 160;
    const beats = [];
    text.split(/\s+/).forEach(function(word, index){
      const span = api.el('span', {class:'glass-word', 'aria-hidden':'true'}, word);
      span.style.setProperty('--word-delay', elapsed + 'ms');
      if (index) line.append(document.createTextNode(' '));
      line.append(span);
      const length = Math.min(250, 115 + word.length * 11);
      beats.push({at:elapsed, length:length, angle:(index % 2 ? 1 : -1) * (1.3 + index % 3 * .35)});
      elapsed += length + (/[.,!?…:;»]$/.test(word) ? 140 : 25);
    });
    const duration = elapsed + 160;
    const frames = [{offset:0, transform:'none'}];
    beats.forEach(function(beat){
      frames.push(
        {offset:beat.at / duration, transform:'none'},
        {offset:(beat.at + beat.length * .4) / duration, transform:'translateY(-3px) rotate(' + beat.angle + 'deg)'},
        {offset:(beat.at + beat.length) / duration, transform:'none'}
      );
    });
    frames.push({offset:1, transform:'none'});
    frames.forEach(function(frame){ frame.easing = 'ease-in-out'; });
    try {
      stageSpeech.push(glass.animate(frames, {duration:duration, easing:'linear'}));
      const surface = glass.querySelector('.surface');
      if (surface) stageSpeech.push(surface.animate([
        {transform:'scaleY(1)'}, {transform:'scaleY(.75)'}, {transform:'scaleY(1)'}
      ], {duration:480, iterations:Math.ceil(duration / 480), easing:'ease-in-out'}));
    } catch (e) {
      stopStageSpeech();
      line.removeAttribute('aria-label');
      line.textContent = text;
    }
  }
  function renderStage(){
    if (!api) return;
    if (strengthScene){ strengthScene.destroy(); strengthScene = null; }
    if (fruitBarScene){ fruitBarScene.destroy(); fruitBarScene = null; }
    cancelReveal();
    swipeBusy = false;
    if (api.phase === 'name') api.stage = 'plan';
    else if (api.phase !== 'step') api.phase = 'step';
    api.partidaVM.normalize();
    clearGestures();
    const old = api.app.querySelector('.quiz');
    // Preserve the visible level when a new choice interrupts an in-flight fill.
    const visibleLiquid = old?.querySelector('.glass-col .liquid');
    if (visibleLiquid){
      lastY = Number(visibleLiquid.getAttribute('y'));
      lastLiquidColor = visibleLiquid.getAttribute('fill');
    }
    if (old && window.gsap){
      try { window.gsap.killTweensOf([old, ...old.querySelectorAll('*')]); } catch (e) { /* sin tweens */ }
    }
    const now = mood();
    const stamp = api.stage + ':' + api.phase;
    const entered = stamp !== lastStamp;
    lastStamp = stamp;
    document.title = '¿Qué tomamos?';
    document.body.classList.add('flow');
    const h = api.el('h1', {id:'stage-q'}, question());
    const quip = api.el('p', {class:'glass-speech-line', role:'status', 'aria-live':'polite', 'aria-atomic':'true'}, now.text);
    const nav = api.el('nav', {class:'camino', 'aria-label':'Camino hasta la barra'});
    const ol = api.el('ol', {class:'trail'});
    api.partidaVM.route().forEach(function(stage, i){
      const attrs = {};
      if (stage.k === api.stage) attrs['aria-current'] = 'step';
      ol.append(api.el('li', attrs,
        api.el('span', {class: cls('paso', i < api.partidaVM.position() && 'is-done', stage.k === api.stage && 'is-here')}),
        api.el('span', {class:'clip'}, stage.label)
      ));
    });
    const pin = api.el('div', {class:'pin', 'aria-hidden':'true'});
    pin.style.left = pinPct(api.partidaVM.position());
    pin.append(mascotNode(now.face));
    nav.append(ol, pin);
    if (api.stage === 'fuerza'){
      strengthScene = createFuerzaJuego({
        el:api.el, glassBuild, bases:[...api.sel.alcohol], color:liquidColor,
        initial:[...api.sel.fuerza][0], onBack:goBack,
        onConfirm(value){
          api.sel.fuerza.clear(); api.sel.fuerza.add(value);
          api.persist(); goNext();
        }
      });
      const quiz = api.el('div', {class:'quiz stage step-3 measure-stage'}, nav, strengthScene.node);
      api.app.replaceChildren(quiz);
      stopStageSpeech(); lastPin = api.partidaVM.position(); freshKey = ''; api.persist();
      api.placeFocus(quiz.querySelector('h1'));
      if (entered) window.scrollTo(0,0);
      return;
    }
    if (api.stage === 'fruta'){
      fruitBarScene = createFrutasBarra({
        el:api.el, groups:api.STEPS.find(stage => stage.k === 'fruta').groups, asItem:api.asItem,
        viewModel:api.frutasVM, selected:() => api.sel.fruta,
        bases:[...api.sel.alcohol], any:() => api.fruitAny, maxPick:api.MAX_PICK,
        fruitIconNode, glassBuild, color:liquidColor,
        onChange:() => api.persist(), onNext:() => goNext(), onBack:goBack
      });
      const quiz = api.el('div', {class:'quiz stage step-1'}, nav, fruitBarScene.node);
      api.app.replaceChildren(quiz);
      stopStageSpeech();
      lastPin = api.partidaVM.position(); freshKey = ''; api.persist();
      api.placeFocus(quiz.querySelector('h1'));
      if (entered) window.scrollTo(0,0);
      return;
    }
    if (api.stage === 'alergia'){
      const inspection = createRestriccionesView({
        el:api.el, viewModel:api.restriccionesVM, entrance:entered,
        onChange:() => api.persist(), onNext:() => goNext(), onBack:goBack,
      });
      const quiz = api.el('div', {class:'quiz stage step-4'},nav,inspection);
      api.app.replaceChildren(quiz);
      lastPin = api.partidaVM.position();
      api.persist();
      api.placeFocus(quiz.querySelector('h1'));
      if (entered) window.scrollTo(0,0);
      return;
    }
    const glassCol = api.el('div', {class:'glass-col'});
    const speech = api.el('div', {class:'glass-speech'}, quip);
    const speakingGlass = glassBuild();
    glassCol.append(speech, speakingGlass);
    if (freshKey.indexOf('dose:') === 0) glassCol.classList.add('is-pouring');
    const col = api.el('div', {class:'play-col'});
    col.append(h);
    const showForm = api.stage === 'plan' && api.sel.plan.size > 0 && api.ranked().length > 0;
    if (api.stage === 'plan' && window.Preguntas){
      col.append(Preguntas.view({
        el:api.el,
        canFinish:api.ranked().length > 0,
        onBack:goBack,
        onFinish:api.finishConversation,
        onChange:function(focusId){
          api.moveFocus = !focusId;
          api.persist();
          renderStage();
          if (focusId) document.getElementById(focusId)?.focus({preventScroll:true});
        }
      }));
    } else if (showForm){
      api.current = api.ranked()[0];
      col.append(planChoices());
      const opts = api.saveOpts || {};
      // Descubrir el resultado no exige nombre, guardado del evento ni cuenta personal.
      const form = api.el('div', {class:'save-form'});
      const see = api.el('button', {class:'btn', type:'button'}, 'Descubrir mi cóctel');
      see.addEventListener('click', function(){
        api.current = api.ranked()[0];
        api.phase = 'result'; api.reveal = true; api.moveFocus = true;
        if (api.markVisit) api.markVisit();
        api.persist(); api.render();
      });
      form.append(api.el('div', {class:'actions'}, see));
      const back = api.el('button', {class:'text', type:'button'}, 'Atrás');
      back.addEventListener('click', goBack);
      const bar = form.querySelector('.actions');
      if (bar) bar.append(back);
      col.append(form);
      const del = api.deleteControl();
      if (del) col.append(del);
      if (opts.canSkip) col.append(skipControl());
    } else {
      const why = api.el('p', {class:'why', id:'why'}, whyText());
      why.hidden = !blocked() || api.stage === 'sabor';
      const capText = capLabel();
      const cap = api.el('p', {class:'cap'}, capText);
      cap.hidden = !capText;
      const form = api.el('form', {novalidate:'true'});
      form.addEventListener('submit', goNext);
      form.append(playBody(), cap, why, actions());
      col.append(form);
    }
    const quiz = api.el('div', {class:'quiz stage ' + api.partidaVM.current().className});
    quiz.append(nav);
    if (api.stage !== 'sabor') quiz.append(glassCol);
    quiz.append(col);
    api.app.replaceChildren(quiz);
    const matchHeading = quiz.querySelector('.match-heading');
    if (matchHeading) h.hidden = true;
    bindFruit(quiz);
    bindSwipe(quiz);
    motion(quiz, pin, entered);
    if (api.stage !== 'sabor') speakStage(quip, speakingGlass, api.stage + ':' + now.key + ':' + now.text);
    lastPin = api.partidaVM.position();
    freshKey = '';
    api.persist();
    api.placeFocus(matchHeading || h);
    if (entered) window.scrollTo(0, 0);
    playStyleMatches(quiz);
  }

  function loadSet(key){
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(Array.isArray(raw) ? raw : []);
    } catch (e) { return new Set(); }
  }
  function saveSet(key, set){
    try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) { /* el conteo es de esta visita */ }
  }
  function phrase(nombre, pct){
    if (pct < 40) return 'Tú y ' + nombre + ' se cruzan en la barra.';
    return 'Tú y ' + nombre + ' tienen gustos en común.';
  }
  function matchesBlock(){
    const wrap = api.el('section', {class:'block result-matches'});
    wrap.append(api.el('h2', {}, '¿Con quién coincides?'));
    const retry = api.el('button', {class:'text', type:'button'}, 'Mirar otra vez');
    retry.addEventListener('click', function(){ if (api.refreshMatches) api.refreshMatches(); });
    if (!api.saved){
      wrap.append(api.el('p', {}, 'Cuando guardes tu trago, vemos quién va por tu lado.'));
      return wrap;
    }
    if (!api.respuestaId){
      wrap.append(api.el('p', {}, 'Todavía no podemos ver la barra. Quien organiza tiene que activar las coincidencias.'));
      return wrap;
    }
    if (api.matchesLoading || api.matches == null){
      wrap.append(api.el('p', {}, 'Mirando la barra…'));
      return wrap;
    }
    if (api.matchesError){
      wrap.append(api.el('p', {}, 'No se pudo mirar la barra. Revisa tu conexión e inténtalo de nuevo.'));
      wrap.append(api.el('div', {class:'actions'}, retry));
      return wrap;
    }
    if (!api.matches.length){
      wrap.append(api.el('p', {}, 'Todavía no hay nadie más en esta fiesta. Cuando lleguen, vuelve a mirar.'));
      wrap.append(api.el('div', {class:'actions'}, retry));
      return wrap;
    }
    api.matches.forEach(function(r){
      wrap.append(api.el('p', {class:'match'},
        'Coincides con ' + r.nombre + ' al ' + r.porcentaje + '%. ',
        phrase(r.nombre, r.porcentaje)
      ));
    });
    return wrap;
  }
  function shareBlock(){
    const wrap = api.el('section', {class:'block result-share'});
    const btn = api.el('button', {class:'btn', type:'button'}, 'Compartir mi cóctel');
    const status = api.el('p', {class:'share-note', id:'share-status', role:'status'});
    btn.addEventListener('click', async function(){
      const perfil = archetype();
      const text = 'Yo soy ' + perfil.nombre + ', de ' + perfil.elementoNombre + '. ¿Con quién coincides tú?';
      const url = location.origin + location.pathname + location.search;
      try {
        if (navigator.share){
          await navigator.share({text:text, url:url});
          return;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
      const full = text + ' ' + url;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText){
          await navigator.clipboard.writeText(full);
          status.textContent = 'Listo, copiado.';
          return;
        }
      } catch (e) { /* sigue el campo */ }
      status.textContent = '';
      const box = api.el('input', {type:'text', readonly:'true', value:full, 'aria-label':'Texto para compartir'});
      status.append(box);
      box.focus();
      box.select();
    });
    wrap.append(btn, status);
    return wrap;
  }
  function humorBlock(){
    const wrap = api.el('section', {class:'block result-humor'});
    const found = new Set([...loadSet('cocteles_perfiles_v2')].filter(id => Object.hasOwn(ARCH, id)));
    found.add(archetype().id);
    saveSet('cocteles_perfiles_v2', found);
    wrap.append(api.el('h2', {}, 'Otra vuelta'));
    wrap.append(api.el('p', {}, 'Has descubierto ' + found.size + ' de ' + Object.keys(ARCH).length + ' perfiles.'));
    const suave = api.el('button', {
      class: cls('btn', 'quiet', api.humor === -1 && 'is-on'),
      type:'button'
    }, 'Hoy quiero algo suave');
    const atrevido = api.el('button', {
      class: cls('btn', api.humor === 1 && 'is-on'),
      type:'button'
    }, 'Hoy quiero algo atrevido');
    function setHumor(dir){
      api.humor = api.humor === dir ? 0 : dir;
      api.reveal = false;
      api.moveFocus = false;
      api.persist();
      api.render();
    }
    suave.setAttribute('aria-pressed', String(api.humor === -1));
    atrevido.setAttribute('aria-pressed', String(api.humor === 1));
    suave.addEventListener('click', function(){ setHumor(-1); });
    atrevido.addEventListener('click', function(){ setHumor(1); });
    wrap.append(api.el('div', {class:'actions'}, suave, atrevido));
    const arq = archetype();
    if (arq.stuck && api.humor === 1) wrap.append(api.el('p', {class:'after'}, 'Ya estás en lo más atrevido de la barra.'));
    if (arq.stuck && api.humor === -1) wrap.append(api.el('p', {class:'after'}, 'Ya estás en lo más suave de la barra.'));
    return wrap;
  }
  function badgeSvg(rank, category){
    const level = window.Insignias.ranks[rank].level;
    const gaming = /League|Crossing|Minecraft|Souls/.test(category);
    const music = category === 'Música' || category === 'The Neighbourhood';
    const center = gaming
      ? '<path d="M24 28h16l4 12-4 4-6-5h-4l-6 5-4-4zM25 33v6m-3-3h6m8-2h.1m3 4h.1"/>'
      : music
        ? '<path d="M29 40V27l12-3v13M29 30l12-3"/><ellipse cx="25" cy="41" rx="4" ry="3"/><ellipse cx="37" cy="38" rx="4" ry="3"/>'
        : '<path d="M21 26h22L32 38zm11 12v9m-6 0h12M37 23l4-6"/>';
    const ticks = Array.from({length:level}, (_, i) => '<path d="M' + (28 + i * 4 - (level - 1) * 2) + ' 55v3"/>').join('');
    return svgEl('0 0 64 76', 'badge-mark',
      '<path class="badge-ribbon" d="m17 49-4 22 12-6 7 8 7-8 12 6-4-22"/>' +
      '<path class="badge-face" d="M32 3 55 16v29L32 59 9 45V16z"/>' +
      '<path d="m32 9 17 10v23L32 52 15 42V19z" fill="none" stroke="currentColor" stroke-width="1"/>' +
      '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + center + ticks + '</g>', '');
  }
  function badgeBlock(){
    const earned = window.Insignias.collect(api);
    const wrap = api.el('section', {class:'block badge-collection', id:'badge-collection', 'aria-labelledby':'badge-heading'});
    wrap.append(api.el('h2', {id:'badge-heading'}, 'Tus insignias'));
    wrap.append(api.el('p', {class:'badge-intro'}, earned.length === 1
      ? 'Una historia que ya tiene tu nombre.' : earned.length + ' historias que ya tienen tu nombre.'));
    const summary = api.el('p', {class:'badge-summary', 'aria-label':'Insignias obtenidas por rango'});
    Object.entries(window.Insignias.ranks).forEach(function(entry){
      const rank = entry[0], meta = entry[1];
      const count = earned.filter(b => b.rank === rank).length;
      if (!count) return;
      summary.append(api.el('span', {class:'badge-total rank-' + rank}, count + ' ' + meta.name.toLowerCase()));
    });
    wrap.append(summary);
    // Las pendientes nunca se montan: tampoco se filtran en etiquetas o tooltips.
    const categories = [...new Set(earned.map(b => b.category))];
    categories.forEach(function(category){
      const group = api.el('div', {class:'badge-group'});
      group.append(api.el('h3', {class:'badge-category'}, category));
      const ul = api.el('ul', {class:'badges'});
      earned.filter(b => b.category === category).forEach(function(b){
        const meta = window.Insignias.ranks[b.rank];
        const li = api.el('li', {class:cls('badge', 'rank-' + b.rank, b.isNew && 'is-new')});
        const details = api.el('details', {class:'badge-details'});
        const toggle = api.el('summary', {class:'badge-toggle'});
        const copy = api.el('span', {class:'badge-copy'});
        const rankLine = api.el('span', {class:'badge-rank'}, meta.name + ' · ' + meta.difficulty);
        if (b.isNew) rankLine.append(api.el('span', {class:'badge-new'}, 'Nueva'));
        copy.append(rankLine, api.el('span', {class:'badge-name'}, b.name), api.el('span', {class:'badge-hint'}, 'Ver historia y logro'));
        toggle.append(badgeSvg(b.rank, category), copy, api.el('span', {class:'badge-chevron', 'aria-hidden':'true'}, '+'));
        details.append(toggle, api.el('div', {class:'badge-story'}, api.el('p', {}, b.text), api.el('p', {class:'badge-reason'}, 'La ganaste: ' + b.reason)));
        li.append(details);
        ul.append(li);
      });
      group.append(ul);
      wrap.append(group);
    });
    if (!earned.length) wrap.append(api.el('p', {}, 'Tu colección empieza al descubrir tu primer cóctel.'));
    wrap.append(api.el('p', {class:'badge-storage'}, 'Tu colección se guarda en este navegador.'));
    return wrap;
  }
  function takeNote(){
    if (noteCache) return noteCache;
    let bag = [];
    try { bag = JSON.parse(localStorage.getItem('cocteles_notas_v1') || '[]'); } catch (e) { bag = []; }
    if (!Array.isArray(bag) || !bag.length){
      bag = NOTES.map(function(n){ return n.id; });
      for (let i = bag.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        const t = bag[i];
        bag[i] = bag[j];
        bag[j] = t;
      }
    }
    const id = bag.shift();
    try { localStorage.setItem('cocteles_notas_v1', JSON.stringify(bag)); } catch (e) { /* se repite en la próxima */ }
    noteCache = NOTES.find(function(n){ return n.id === id; }) || NOTES[0];
    return noteCache;
  }
  function noteBlock(){
    const note = takeNote();
    const wrap = api.el('section', {class:'block result-note'});
    wrap.append(
      api.el('h2', {}, note.kind === 'reto' ? 'Un reto para la mesa' : 'Un dato de la barra'),
      api.el('p', {class:'note-line'}, note.text)
    );
    return wrap;
  }
  function mountResult(follow){
    const extra = api.el('div', {class:'result-extra'});
    extra.append(matchesBlock(), shareBlock(), humorBlock(), badgeBlock(), noteBlock());
    follow.prepend(extra);
    if (gsapOn()){
      try {
        window.gsap.from(extra.querySelectorAll('.badge.is-new'), {
          scale:0.8, duration:0.28, ease:'back.out(2)', stagger:0.05
        });
      } catch (e) { /* la insignia queda quieta */ }
    }
  }
  function burst(){
    if (typeof window.confetti !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      window.confetti({
        particleCount: 40,
        spread: 60,
        startVelocity: 28,
        ticks: 90,
        scalar: 0.8,
        colors: ['#dda15e', '#bc6c25', '#fefae0'],
        origin: {y: 0.62},
        disableForReducedMotion: true
      });
    } catch (e) { /* sin confeti */ }
  }
  function playReveal(quiz){
    cancelReveal();
    if (!gsapOn() || !quiz) return;
    const cover = api.el('button', {class:'reveal-cover', type:'button'});
    const payoff = quiz.querySelectorAll('.reveal-payoff');
    const glass = quiz.querySelector('.glass-build');
    const home = glass ? glass.parentNode : null;
    const spot = glass ? glass.nextSibling : null;
    const slot = api.el('span', {class:'reveal-glass'});
    if (glass) slot.append(glass);
    cover.append(
      slot,
      mascotNode('surprise'),
      api.el('span', {class:'reveal-line', 'aria-live':'polite'}, suspense()),
      api.el('span', {class:'reveal-skip'}, 'Saltar')
    );
    quiz.append(cover);
    const covered = Array.from(quiz.children).filter(function(node){ return node !== cover; });
    const inertBefore = covered.map(function(node){ return node.inert; });
    covered.forEach(function(node){ node.inert = true; });
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let tl = null;
    let skipped = false;
    let closed = false;
    function finish(withBurst){
      if (closed) return;
      closed = true;
      const restoreFocus = document.activeElement === cover;
      if (tl) tl.kill();
      document.removeEventListener('keydown', onKey);
      preference.removeEventListener('change', onPreference);
      revealCleanup = null;
      if (home && glass){
        if (spot && spot.parentNode === home) home.insertBefore(glass, spot);
        else home.append(glass);
      }
      if (window.gsap){
        window.gsap.set(payoff, {opacity:1, y:0, clearProps:'opacity,transform'});
        if (glass) window.gsap.set(glass, {clearProps:'transform'});
      }
      if (cover.parentNode) cover.remove();
      covered.forEach(function(node, i){ node.inert = inertBefore[i]; });
      if (restoreFocus && quiz.isConnected){
        const heading = quiz.querySelector('h1');
        if (heading){ heading.setAttribute('tabindex', '-1'); heading.focus({preventScroll:true}); }
      }
      if (withBurst) burst();
    }
    function onKey(ev){
      if (ev.key === 'Escape' || ev.key === 'Enter') skip(ev);
      else if (ev.key === 'Tab'){ ev.preventDefault(); cover.focus({preventScroll:true}); }
    }
    function onPreference(ev){ if (ev.matches) finish(false); }
    function skip(ev){
      if (ev) ev.preventDefault();
      skipped = true;
      finish(false);
    }
    document.addEventListener('keydown', onKey);
    cover.addEventListener('click', skip);
    preference.addEventListener('change', onPreference);
    revealCleanup = function(){ finish(false); };
    try {
      window.gsap.set(payoff, {opacity:0});
      tl = window.gsap.timeline({onComplete: function(){ finish(!skipped); }});
      if (glass) tl.to(glass, {rotation:3, duration:0.12, yoyo:true, repeat:7, transformOrigin:'50% 80%'}, 0.15);
      tl.fromTo(payoff, {opacity:0, y:12}, {opacity:1, y:0, duration:0.35, stagger:0.06}, 2.05);
    } catch (e) {
      finish(false);
    }
  }
  function cancelReveal(){
    if (strengthScene){ strengthScene.destroy(); strengthScene = null; }
    stopStageSpeech();
    if (matchCleanup) matchCleanup();
    if (revealCleanup) revealCleanup();
  }
  function init(next){
    api = next;
    if (window.Preguntas) api.sel.plan.clear();
    prepareStyleDeck(false);
    styleHistory = Object.keys(api.styleDecisions).filter(name => STYLE_CARDS.some(card => card.name === name));
    if (!Object.keys(api.styleDecisions).length){
      [api.styleTaste,api.styleTexture,...api.sel.sabor].filter(Boolean).forEach(function(name){ api.styleDecisions[name] = true; });
    }
    commitEstilo();
    try {
      const raw = JSON.parse(sessionStorage.getItem(QUIP_KEY) || '{}');
      used = raw && typeof raw === 'object' ? raw : {};
    } catch (e) { used = {}; }
  }
  function onReset(){
    if (window.Preguntas) Preguntas.reset();
    cancelReveal();
    lastStageLine = '';
    revealLine = '';
    spoken = {key:'', text:''};
    noteCache = null;
    styleHistory = [];
    prepareStyleDeck(true);
    swipeBusy = false;
    freshKey = '';
    lastPin = -1;
    lastY = null;
    lastLiquidColor = null;
    lastStamp = '';
    try { sessionStorage.removeItem('cocteles_run_marked'); } catch (e) { /* el conteo sigue */ }
  }

  return {
    init: init,
    renderStage: renderStage,
    archetype: archetype,
    personalityFor: personalityFor,
    heroGlass: glassBuild,
    mountResult: mountResult,
    playReveal: playReveal,
    cancelReveal: cancelReveal,
    onReset: onReset
  };
})();
