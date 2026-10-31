import {garnishMarkup} from '../features/juego-trivia/views/guarnicion.js';
import {etapasPartida as STEPS} from '../features/juego-trivia/partida/etapasPartida.js';
import {supabaseHeaders} from '../shared/infrastructure/supabaseHeaders.js';
import {serializarPartida, recuperarPartida} from '../features/juego-trivia/partida/persistenciaPartida.js';
import {createEstadoPartida, clavesPartida as SEL_KEYS} from '../features/juego-trivia/partida/estadoPartida.js';
import {createPartidaViewModel} from '../features/juego-trivia/partida/partidaViewModel.js';
import {createAlcoholViewModel} from '../features/juego-trivia/etapas/alcohol/alcoholViewModel.js';
import {createFrutasViewModel} from '../features/juego-trivia/etapas/frutas/frutasViewModel.js';
import {createRestriccionesViewModel} from '../features/juego-trivia/etapas/restricciones/restriccionesViewModel.js';
import {etiquetaRestriccion, MOTIVOS} from '../features/juego-trivia/etapas/restricciones/restriccionesDatos.js';
import {cocteles as C} from '../features/juego-trivia/data/cocteles.js';
import {chocaConRestricciones} from '../features/juego-trivia/domain/restricciones.js';
import * as recomendacion from '../features/juego-trivia/domain/recomendarCocteles.js';

// Project Settings → API → Project URL
// Arquetipo y coincidencias: ejecutar supabase-juego.sql en el SQL Editor.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
// Project Settings → API → anon public. Nunca la service_role.
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const WKEY = 'cocteles_wizard_v3';
const PKEY = 'cocteles_persona_v1';
const MAX_PICK = 5;

const PLAN = {
  fiesta:{t:'Fiesta hasta tarde', line:'Para una noche que no quiere acabarse.'},
  playa:{t:'Tarde de playa', line:'Para una tarde al sol, sin prisa.'},
  cena:{t:'Cena tranquila', line:'Para una mesa baja y la charla larga.'},
  aventura:{t:'Aventura improvisada', line:'Para salir sin mapa y ver qué pasa.'}
};
const ALERGIA_LABEL = {
  ninguna:'Ninguna',
  lacteos:'Lácteos',
  'frutos secos':'Frutos secos',
  citricos:'Cítricos',
  gluten:'Gluten',
  otra:'Otra'
};

function asItem(o){ return typeof o === 'string' ? {v:o, t:o} : o; }

const partida = createEstadoPartida();
const sel = partida.sel;
let cardView = null;
let saved = false;
let saving = false;
let deleteAsk = false;
let sendNote = '';
let deleteNote = '';
let moveFocus = false;
let reveal = false;
let draftName = '';
let draftContact = '';
let persona = null;
let respuestaId = null;
let matches = null;
let matchesError = false;
let matchesLoading = false;
let saveOpts = null;
const alcoholVM = createAlcoholViewModel({state:partida, maxPick:MAX_PICK});
const frutasVM = createFrutasViewModel({state:partida, maxPick:MAX_PICK});
const restriccionesVM = createRestriccionesViewModel({state:partida});
const partidaVM = createPartidaViewModel({
  state:partida, steps:STEPS, ranked, restriccionesVM,
  backQuestion:() => Boolean(window.Preguntas && Preguntas.back())
});
const app = document.getElementById('app');
let welcomeOpen = true;
let enteringGame = false;
const welcomeScreen = document.getElementById('welcome-screen');
let welcomeSpeech = null;

function stopWelcomeSpeech(){
  if (welcomeSpeech){
    welcomeSpeech.cancel();
    welcomeSpeech = null;
  }
}

function speakWelcome(){
  const heading = document.getElementById('welcome-line');
  const glass = document.querySelector('#welcome-vessel .glass-build');
  const text = heading.textContent.trim();
  stopWelcomeSpeech();
  heading.textContent = text;
  heading.removeAttribute('aria-label');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // La frase ocupa su espacio completo mientras se revela palabra a palabra.
  heading.setAttribute('aria-label', text);
  heading.replaceChildren();
  const frames = [{offset:0,transform:'none'}];
  let elapsed = 220;
  const beats = [];
  text.split(/\s+/).forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'welcome-word';
    span.textContent = word;
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--word-delay', elapsed + 'ms');
    if (index) heading.append(document.createTextNode(' '));
    heading.append(span);
    const length = Math.min(250, 115 + word.length * 11);
    beats.push({at:elapsed,length:length,angle:(index % 2 ? 1 : -1) * (3 + index % 3)});
    elapsed += length + (/[.,!?…:;»]$/.test(word) ? 140 : 25);
  });
  if (!glass || typeof glass.animate !== 'function') return;
  const duration = elapsed + 180;
  beats.forEach(beat => {
    frames.push(
      {offset:beat.at / duration,transform:'none'},
      {offset:(beat.at + beat.length * .4) / duration,transform:`translateY(-5px) rotate(${beat.angle}deg) scale(1.025, .98)`},
      {offset:(beat.at + beat.length) / duration,transform:'none'}
    );
  });
  frames.push({offset:1,transform:'none'});
  frames.forEach(frame => { frame.easing = 'ease-in-out'; });
  glass.style.transformOrigin = '50% 85%';
  try {
    const speech = glass.animate(frames, {duration:duration,easing:'linear'});
    welcomeSpeech = speech;
    function done(){ if (welcomeSpeech === speech) welcomeSpeech = null; }
    speech.finished.then(done, done);
  } catch (e) { /* El saludo se puede leer y el botón sigue disponible. */ }
}

function showWelcome(focus = false){
  stopWelcomeSpeech();
  welcomeOpen = true;
  enteringGame = false;
  app.hidden = true;
  app.replaceChildren();
  welcomeScreen.hidden = false;
  welcomeScreen.classList.remove('is-leaving');
  document.getElementById('welcome-start').disabled = false;
  document.body.classList.remove('flow');
  document.body.classList.add('at-welcome');
  const vessel = document.getElementById('welcome-vessel');
  vessel.replaceChildren();
  if (window.Juego) vessel.append(Juego.heroGlass());
  speakWelcome();
  window.scrollTo(0, 0);
  if (focus) document.getElementById('welcome-line').focus({preventScroll:true});
}

function enterGame(){
  if (!welcomeOpen || enteringGame) return;
  stopWelcomeSpeech();
  enteringGame = true;
  document.getElementById('welcome-start').disabled = true;
  welcomeScreen.classList.add('is-leaving');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function finish(){
    const glass = document.querySelector('#welcome-vessel .glass-build');
    const start = glass && glass.getBoundingClientRect();
    welcomeOpen = false;
    enteringGame = false;
    welcomeScreen.hidden = true;
    app.hidden = false;
    document.body.classList.remove('at-welcome');
    moveFocus = true;
    render();
    window.scrollTo(0, 0);
    const target = app.querySelector('.glass-col > .glass-build');
    if (glass && target && !reducedMotion && typeof glass.animate === 'function'){
      const end = target.getBoundingClientRect();
      if (!end.width || !end.height) return;
      // El mismo vaso viaja desde la bienvenida hasta su lugar en el juego.
      Object.assign(glass.style, {
        position:'fixed', left:'0', top:'0', margin:'0', zIndex:'20',
        width:start.width + 'px', height:start.height + 'px',
        maxWidth:'none', pointerEvents:'none', transformOrigin:'0 0'
      });
      glass.setAttribute('aria-hidden', 'true');
      document.body.append(glass);
      target.style.visibility = 'hidden';
      function cleanup(){ glass.remove(); target.style.removeProperty('visibility'); }
      try {
        const flight = glass.animate([
          {transform:`translate(${start.left}px, ${start.top}px) scale(1)`},
          {transform:`translate(${end.left}px, ${end.top}px) scale(${end.width / start.width}, ${end.height / start.height})`}
        ], {duration:560,easing:'cubic-bezier(0.16, 1, 0.3, 1)',fill:'both'});
        flight.finished.then(cleanup, cleanup);
      } catch (e) { cleanup(); }
    }
  }
  if (reducedMotion) finish();
  else window.setTimeout(finish, 520);
}

function el(tag, attrs = {}, ...kids){
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)){
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  kids.flat().forEach(c => {
    if (c == null || c === false) return;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return e;
}

function progressUI(){
  return el('p', {class:'progress-count'}, (partidaVM.position() + 1) + ' de ' + partidaVM.route().length);
}

function sentence(items){
  const a = items.map(s => s.toLowerCase());
  if (!a.length) return '';
  if (a.length === 1) return a[0];
  return a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
}

function chosenList(){
  return [...sel.alcohol, ...sel.fruta, ...sel.sabor];
}

function hitsOf(c){ return recomendacion.hitsOf(c, sel); }

function choca(c, exclusions = sel.alergia){
  return chocaConRestricciones(c, exclusions);
}

function fuerzaDe(c){ return recomendacion.fuerzaDe(c); }

function ranked(){
  return recomendacion.ranked(C, sel, partida.fruitAny, c => window.Perfil ? Perfil.boost(c) : 0);
}

function matchPercent(c){ return recomendacion.matchPercent(c, sel, partida.fruitAny); }

function pctLabel(c){
  return matchPercent(c) + '% por ingredientes';
}

function drinkRecipeBlocks(c){
  return [
    el('div', {class:'block'},
      el('h2', {}, 'Ingredientes'),
      el('ul', {class:'lines'}, c.i.map(x => el('li', {}, x)))
    ),
    el('div', {class:'block'},
      el('h2', {}, 'Cómo se arma'),
      el('ol', {class:'lines'}, c.p.map(x => el('li', {}, x)))
    )
  ];
}

function openDrinkCard(c){
  cardView = c;
  moveFocus = true;
  render();
}

function chooseDrink(c){
  partida.current = c;
  cardView = null;
  partida.phase = 'result';
  saved = false;
  sendNote = '';
  moveFocus = true;
  render();
}

function matchCopy(c){
  const asked = chosenList();
  const got = hitsOf(c);
  if (!asked.length) return 'No marcaste nada. Este es el primero de la carta.';
  if (!got.length) return 'Marcaste ' + sentence(asked) + '. Este no lleva nada de eso.';
  if (got.length === asked.length) return 'Este lleva todo lo que marcaste: ' + sentence(got) + '.';
  return 'Marcaste ' + sentence(asked) + '. Este lleva ' + sentence(got) + '.';
}

function shortReason(c){
  const got = hitsOf(c);
  if (!got.length) return 'Poco parecido a lo que marcaste';
  return 'Encaja con ' + sentence(got);
}

function togglePick(stepKey, item, input){
  const set = sel[stepKey];
  const meta = STEPS.find(s => s.k === stepKey);
  if (meta && !meta.multi){
    set.clear();
    if (input.checked) set.add(item.v);
    return;
  }
  if (stepKey === 'alergia' && item.v === 'ninguna'){
    if (input.checked){ set.clear(); set.add('ninguna'); }
    else set.delete('ninguna');
    return;
  }
  if (stepKey === 'alergia' && input.checked) set.delete('ninguna');
  if (stepKey === 'fruta'){
    input.checked = frutasVM.setSelection(item.v, input.checked);
    return;
  }
  if (stepKey === 'alcohol'){
    input.checked = alcoholVM.setSelection(item.v, input.checked);
    return;
  }
  if (input.checked){
    if (set.size >= MAX_PICK && !set.has(item.v)){
      input.checked = false;
      return;
    }
    set.add(item.v);
  } else set.delete(item.v);
}

function option(name, item, checked, onChange, single){
  const input = el('input', {class:'clip', type: single ? 'radio' : 'checkbox', name, value:item.v});
  input.checked = checked;
  input.addEventListener('change', () => onChange(input));
  return el('label', {class: single ? 'opt' : 'opt multi'},
    input,
    el('span', {class:'box', 'aria-hidden':'true'}),
    el('span', {}, item.t)
  );
}

function persist(){
  try {
    sessionStorage.setItem(WKEY, JSON.stringify({
      ...serializarPartida(partida), saved, sendNote, draftName, draftContact, respuestaId,
      preguntas:window.Preguntas ? Preguntas.snapshot() : null,
      inspeccion:restriccionesVM.snapshot()
    }));
  } catch (e) { /* la sesión no se pudo guardar; el trago sigue en esta página */ }
}

function loadWizard(){
  try {
    const raw = sessionStorage.getItem(WKEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!recuperarPartida(partida, d, {steps:STEPS, catalog:C})) return;
    if (window.Preguntas) Preguntas.restore(d.preguntas);
    restriccionesVM.restore(d.inspeccion);
    if (partida.current && choca(partida.current)) partida.current = ranked()[0] || null;
    saved = d.saved === true;
    if (typeof d.sendNote === 'string') sendNote = d.sendNote;
    if (typeof d.draftName === 'string') draftName = d.draftName;
    if (typeof d.draftContact === 'string') draftContact = d.draftContact;
    if (typeof d.respuestaId === 'string') respuestaId = d.respuestaId;
    if (partida.phase === 'result' && !partida.current) partida.phase = 'step';
    partidaVM.normalize({recuperada:true});
  } catch (e) { /* sesión dañada: se empieza de cero */ }
}

function placeFocus(node){
  if (!moveFocus || !node) return;
  moveFocus = false;
  node.setAttribute('tabindex', '-1');
  node.focus();
}

function renderStep(){
  if (partida.stage === 'plan' && window.Preguntas){ renderConversation(); return; }
  document.title = 'Selector de cócteles';
  partidaVM.normalize();
  const s = partidaVM.current();
  app.replaceChildren();
  const h = el('h1', {}, s.q);
  const lede = el('p', {class:'lede'}, s.h);
  const cap = el('p', {class:'cap', id:'cap'}, '');
  const form = el('form', {class: s.groups.length < 2 ? 'ask is-single' : 'ask', novalidate:'true'});
  s.groups.forEach(g => {
    const fs = el('fieldset');
    if (g.t) fs.append(el('legend', {}, g.t));
    else fs.setAttribute('aria-label', s.q);
    const box = el('div', {class:'opts'});
    g.o.forEach(raw => {
      const item = asItem(raw);
      const checked = s.k === 'fruta' && item.v === 'cualquiera'
        ? partida.fruitAny
        : sel[s.k].has(item.v);
      box.append(option(s.k, item, checked, input => {
        togglePick(s.k, item, input);
        if (s.multi){
          const exclusive = (key, value) => {
            if (s.k !== key) return;
            if (item.v === value && input.checked){
              form.querySelectorAll('input[name="' + key + '"]').forEach(inp => {
                if (inp.value !== value) inp.checked = false;
              });
            }
            if (item.v !== value && input.checked){
              const other = form.querySelector('input[name="' + key + '"][value="' + value + '"]');
              if (other) other.checked = false;
            }
          };
          exclusive('fruta', 'cualquiera');
          exclusive('alcohol', 'Sin alcohol');
          exclusive('alergia', 'ninguna');
        }
        sync();
        persist();
      }, !s.multi));
    });
    fs.append(box);
    form.append(fs);
  });
  const why = el('p', {class:'why', id:'why'}, s.multi ? 'Marca al menos uno.' : 'Elige uno para seguir.');
  const next = el('button', {class:'btn', type:'submit'}, 'Siguiente');
  const back = el('button', {class:'text', type:'button'}, 'Atrás');
  back.addEventListener('click', () => {
    if (!partidaVM.backSimple()) return;
    moveFocus = true;
    render();
  });
  function pickLabel(key){
    if (!s.multi) return '';
    if (key === 'fruta' && partida.fruitAny) return 'La que sea';
    const n = sel[key].size;
    if (!n) return '0 de ' + MAX_PICK;
    return n + ' de ' + MAX_PICK;
  }
  function blocked(){ return partidaVM.simpleBlocked(); }
  function sync(){
    const off = blocked();
    why.textContent = sel.alergia.has('otra') && s.k === 'alergia'
      ? 'Tu otra restricción necesita revisión con quien prepara las bebidas. Por ahora no podemos recomendarte una receta. Conservamos tus elecciones.'
      : (s.multi ? 'Marca al menos uno.' : 'Elige uno para seguir.');
    const label = pickLabel(s.k);
    cap.hidden = !label;
    cap.textContent = label;
    next.classList.toggle('is-off', off);
    next.setAttribute('aria-disabled', off ? 'true' : 'false');
    if (off) next.setAttribute('aria-describedby', 'why');
    else next.removeAttribute('aria-describedby');
    why.hidden = !off;
  }
  const actions = el('div', {class:'actions'}, Boolean(partidaVM.previous()) ? back : null, next);
  form.append(why, actions);
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const result = partidaVM.nextSimple();
    if (result === 'blocked'){ why.hidden = false; next.focus(); return; }
    moveFocus = true;
    if (result === 'advanced'){ render(); return; }
    if (result === 'empty'){
      why.hidden = false;
      why.textContent = 'No encontramos una receta con estas restricciones y gustos. Conserva tus restricciones y prueba otra base o fruta.';
      return;
    }
    saved = false;
    sendNote = '';
    render();
  });
  sync();
  const stage = el('div', {class:'quiz'});
  stage.append(progressUI(), h, lede, cap, form);
  app.append(stage);
  document.body.classList.add('flow');
  persist();
  placeFocus(h);
  window.scrollTo(0, 0);
}

function finishConversation(){
  if (!partidaVM.finishConversation()) return;
  saved = false;
  sendNote = '';
  reveal = true;
  moveFocus = true;
  markVisit();
  persist();
  render();
}

// El recorrido sencillo comparte preguntas y estado aunque no cargue la animación.
function renderConversation(){
  document.body.classList.add('flow');
  document.title = 'El vaso quiere conocerte · ¿Qué tomamos?';
  const q = Preguntas.current();
  const h = el('h1', {id:'stage-q'}, q?.pregunta || 'Ya nos vamos conociendo.');
  const speech = el('p', {class:'glass-speech-line', role:'status', 'aria-live':'polite'}, Preguntas.mood().text);
  const col = el('div', {class:'play-col'}, h);
  col.append(Preguntas.view({
    el, canFinish:ranked().length > 0,
    onFinish:finishConversation,
    onBack:() => { partidaVM.backConversation(); moveFocus = true; persist(); render(); },
    onChange:focusId => {
      moveFocus = !focusId;
      persist(); render();
      if (focusId) document.getElementById(focusId)?.focus({preventScroll:true});
    }
  }));
  app.replaceChildren(el('div', {class:'quiz stage step-5'},
    el('div', {class:'glass-col'}, el('div', {class:'glass-speech'}, speech)), col));
  persist();
  placeFocus(h);
}

function glassKind(name){
  const n = name.toLowerCase();
  if (/colada|batido|smoothie|hawaiian|coco y piña|coco y pina/.test(n)) return 'hurricane';
  if (/mule|irish coffee|carajillo|toddy/.test(n)) return 'mug';
  if (/mimosa|french 75/.test(n)) return 'flute';
  if (/old fashioned|negroni|white russian|rusty nail|godfather|manhattan|julep|sour|penicillin/.test(n)) return 'rocks';
  if (/sangr/.test(n)) return 'wine';
  if (/martini|daiquir|cosmopolitan|sidecar|gimlet|clover|kamikaze|lemon drop|pornstar|bramble|margarita/.test(n)) return 'coupe';
  if (/mojito|highball|cuba|paloma|tonic|tónica|collins|fizz|rickey|screwdriver|ranch|sunrise|stormy|punch|agua|limonada|libre|té |te |vodka con|ron con|whisky con|tequila con|gin /.test(n)) return 'highball';
  return 'coupe';
}

const GLASS_MARKUP = {
  coupe: '<ellipse class="olive" cx="80" cy="188" rx="30" ry="7"/><rect class="cream" x="74" y="132" width="12" height="52"/><path class="cream" d="M22 74c0 54 26 58 58 58s58-4 58-58z"/><path class="amber" d="M36 82c0 38 18 42 44 42s44-4 44-42z"/><ellipse class="olive" cx="80" cy="74" rx="58" ry="6"/>',
  highball: '<path class="cream" d="M48 16h64l10 162H38z"/><path class="amber" d="M52 86h58l6 84H46z"/><path class="olive" d="M48 16h64l-3 14H51z"/>',
  rocks: '<rect class="cream" x="26" y="58" width="108" height="116" rx="14"/><rect class="amber" x="36" y="104" width="88" height="60" rx="8"/><rect class="cream" x="46" y="112" width="24" height="20" rx="4"/><rect class="olive" x="78" y="120" width="28" height="16" rx="4"/>',
  mug: '<rect class="cream" x="26" y="34" width="88" height="136" rx="18"/><path class="cream" d="M114 62c30 0 30 74 0 74v-18c14 0 14-38 0-38z"/><rect class="amber" x="38" y="82" width="64" height="74" rx="10"/>',
  flute: '<path class="cream" d="M68 14h24l18 118H50z"/><path class="amber" d="M70 64h20l12 60H58z"/><rect class="cream" x="74" y="132" width="12" height="42"/><ellipse class="olive" cx="80" cy="180" rx="26" ry="7"/>',
  hurricane: '<path class="cream" d="M44 22c0 0-6 48 14 78 12 18 8 40 4 62h36c-4-22-8-44 4-62 20-30 14-78 14-78z"/><path class="amber" d="M58 96c-4 22 0 40 6 58h32c6-18 10-36 6-58-8 8-28 8-44 0z"/><rect class="cream" x="74" y="162" width="12" height="16"/><ellipse class="olive" cx="80" cy="184" rx="26" ry="6"/>',
  wine: '<path class="cream" d="M50 26c0 50 12 72 30 82 18-10 30-32 30-82z"/><path class="amber" d="M58 48c0 34 8 50 22 58 14-8 22-24 22-58z"/><rect class="cream" x="74" y="108" width="12" height="60"/><ellipse class="olive" cx="80" cy="174" rx="26" ry="7"/>'
};

// Vasos del personaje: misma geometría de la receta, líquido visible y cara integrada.
const CHARACTER_GLASS_MARKUP = {
  coupe:'<ellipse class="olive" cx="80" cy="188" rx="28" ry="5"/><path class="crystal" d="M77 132h6v51h-6z"/><path class="crystal" d="M22 74q0 58 58 58t58-58z"/><path class="amber" d="M30 82q4 43 50 43t50-43q-50 7-100 0z"/><ellipse cx="80" cy="74" rx="58" ry="5" fill="#fffdf0" stroke="#606c38" stroke-width="1.3"/>',
  highball:'<path class="crystal" d="M45 18h70l7 158q-42 12-84 0z"/><path class="amber" d="M51 60q29 6 58 0l6 108q-35 10-70 0z"/><ellipse cx="80" cy="18" rx="35" ry="4" fill="#fffdf0" stroke="#606c38" stroke-width="1.3"/><path d="M49 37l-4 112" class="glass-shine"/>',
  rocks:'<rect class="crystal" x="26" y="58" width="108" height="116" rx="18"/><path class="amber" d="M33 96q47 6 94 0v58q0 13-13 13H46q-13 0-13-13z"/><rect x="42" y="103" width="22" height="18" rx="5" fill="#fffdf0" opacity=".5" transform="rotate(-12 53 112)"/><path d="M34 71v73" class="glass-shine"/>',
  mug:'<path class="crystal" d="M112 63c33-9 35 77 0 70v-12c19 3 19-48 0-45z"/><rect class="crystal" x="26" y="34" width="88" height="136" rx="20"/><path class="amber" d="M33 70q37 8 74 0v78q0 15-15 15H48q-15 0-15-15z"/><path d="M35 49v84" class="glass-shine"/>',
  flute:'<path class="crystal" d="M58 18h44l6 81q3 30-25 35v39h19v8H58v-8h19v-39q-28-5-25-35z"/><path class="amber" d="M60 55q20 4 40 0l2 43q1 26-22 29-23-3-22-29z"/><ellipse cx="80" cy="18" rx="22" ry="4" fill="#fffdf0" stroke="#606c38" stroke-width="1.3"/>',
  hurricane:'<ellipse class="olive" cx="80" cy="185" rx="27" ry="5"/><path class="crystal" d="M77 160h6v21h-6z"/><path class="crystal" d="M44 22q-5 42 15 76 12 20 4 62h34q-8-42 4-62 20-34 15-76z"/><path class="amber" d="M51 52q29 7 58 0-2 23-15 46-10 20-3 54H69q7-34-3-54Q53 75 51 52z"/><ellipse cx="80" cy="22" rx="36" ry="4" fill="#fffdf0" stroke="#606c38" stroke-width="1.3"/><path d="M49 34q-1 29 11 49" class="glass-shine"/>',
  wine:'<ellipse class="olive" cx="80" cy="179" rx="26" ry="5"/><path class="crystal" d="M77 113h6v62h-6z"/><path class="crystal" d="M49 26q-10 70 31 87 41-17 31-87z"/><path class="amber" d="M54 53q26 5 52 0 0 42-26 53-26-11-26-53z"/><ellipse cx="80" cy="26" rx="31" ry="4" fill="#fffdf0" stroke="#606c38" stroke-width="1.3"/>'
};

function drinkExpression(c, personality){
  const expressions = {
    escandaloso:'happy', bocon:'cheeky', apuntado:'surprised',
    siempre:'relaxed', patron:'wink', exigente:'shy',
    inventado:'surprised', popular:'happy', callejero:'wink',
    chismoso:'cheeky', enamorado:'love', fresco:'relaxed'
  };
  const base = expressions[personality] || (c.s.includes('Cremoso') ? 'dreamy' : c.s.includes('Ácido') ? 'cheeky' : c.s.includes('Dulce') ? 'love' : 'happy');
  if (c.s.includes('Ácido') && ['love','shy'].includes(base)) return 'cheeky';
  if (c.s.includes('Cremoso') && ['happy','relaxed'].includes(base)) return 'dreamy';
  if (c.s.includes('Espumoso') && base === 'shy') return 'surprised';
  return base;
}
function faceMarkup(kind, expression){
  const spot = {
    coupe:[80,99,.94], highball:[80,112,.9], rocks:[80,132,1.04],
    mug:[70,114,.82], flute:[80,91,.5], hurricane:[80,79,.85], wine:[80,72,.5]
  }[kind] || [80,110,.85];
  const dot = x => '<circle cx="' + x + '" cy="0" r="6.8"/>';
  const arc = x => '<path d="M' + (x-6) + ' 1q6-8 12 0" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>';
  const sleepy = x => '<path d="M' + (x-6) + ' 0q6 5 12 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
  let eyes = dot(-15) + dot(15);
  let mouth = '<path d="M-2 8q8-3 5 3l-3 2q8 0 4 6q-2 3-6 0" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>';
  let brows = '';
  if (expression === 'wink' || expression === 'cheeky') eyes = dot(-15) + arc(15);
  if (expression === 'happy') eyes = arc(-15) + arc(15);
  if (expression === 'dreamy' || expression === 'relaxed') eyes = sleepy(-15) + sleepy(15);
  if (expression === 'surprised'){
    brows = '<path d="M-21-12q5-4 10-1M10-14q5-3 10 0" stroke="currentColor" fill="none" stroke-width="2.3" stroke-linecap="round"/>';
    mouth = '<ellipse cx="0" cy="13" rx="4" ry="5"/>';
  }
  if (expression === 'wink') mouth = '<path d="M-6 11q8 7 16-2" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';
  if (expression === 'cheeky') brows = '<path d="M-21-11q6-4 11 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  if (expression === 'relaxed') mouth = '<path d="M-4 11q4 6 8 0" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>';
  if (expression === 'shy') mouth = '<path d="M-4 11q4 4 8 0" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>';
  const shines = ['love','shy','surprised'].includes(expression) ? '<circle cx="-17" cy="-2" r="1.6" fill="#fffdf0"/><circle cx="13" cy="-2" r="1.6" fill="#fffdf0"/>' : '';
  return '<g class="chibi-face" data-expression="' + expression + '" aria-hidden="true" transform="translate(' + spot[0] + ' ' + spot[1] + ') scale(' + spot[2] + ')" fill="currentColor" color="#202516">' +
    '<g fill="#dd8d83" opacity=".7"><ellipse cx="-24" cy="10" rx="6" ry="3.3"/><ellipse cx="24" cy="10" rx="6" ry="3.3"/></g>' + brows + '<g class="chibi-eyes">' + eyes + shines + '</g>' + mouth + '</g>';
}
function drinkColor(c){
  const fruit = {Fresa:'#df8d89',Sandía:'#df8d89',Limón:'#d9bf69',Naranja:'#e4a05b',Piña:'#e4bd64',Mango:'#e5aa61',Maracuyá:'#e2b85f',Coco:'#e6d4ae',Durazno:'#e8ad89',Menta:'#b4c48b'};
  if (c.s.includes('Cremoso')) return c.f.includes('Fresa') ? '#e6b5af' : '#e6d4ae';
  return fruit[c.f[0]] || '#dda15e';
}
function drinkSay(c){
  return window.VOCES && VOCES[c.n] ? VOCES[c.n] : 'Yo ya estaba en la barra.';
}
function glassSvg(c, withFace, personalityId){
  const kind = glassKind(c.n);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const frame = {coupe:'0 48 160 152',rocks:'0 35 160 155',mug:'0 12 160 170',wine:'0 12 160 175'};
  svg.setAttribute('viewBox', withFace ? (frame[kind] || '0 0 160 194') : '0 0 160 200');
  svg.setAttribute('class', 'glass');
  svg.setAttribute('role', 'img');
  const personality = withFace && window.Juego ? (personalityId || Juego.archetype().id) : '';
  const expression = drinkExpression(c, personality);
  svg.setAttribute('aria-label', 'Copa de ' + c.n + (withFace ? ', con carita chibi' : ''));
  svg.style.setProperty('--drink-color', drinkColor(c));
  if (withFace) svg.setAttribute('data-personality', personality);
  const glassArt = withFace ? CHARACTER_GLASS_MARKUP : GLASS_MARKUP;
  svg.innerHTML = (glassArt[kind] || glassArt.coupe) +
    garnishMarkup(c.f && c.f[0], kind) +
    (withFace ? faceMarkup(kind, expression) : '');
  return svg;
}
function drinkAvatar(c, personalityId){
  const svg = glassSvg(c, true, personalityId);
  const frames = {coupe:'23 47 114 108',highball:'25 59 110 110',rocks:'20 80 120 105',mug:'18 64 108 108',flute:'43 55 74 74',hurricane:'28 26 104 104',wine:'42 34 76 76'};
  svg.setAttribute('viewBox', frames[glassKind(c.n)] || '25 55 110 110');
  svg.classList.add('profile-avatar-art');
  svg.setAttribute('aria-label', 'Avatar de ' + c.n + ', ' + Juego.personalityFor({}, personalityId).nombre);
  return svg;
}
function drinkPortrait(c, hideSay){
  const svg = glassSvg(c, true);
  svg.classList.add('glass-build');
  const say = el('p', {class: hideSay ? 'speech reveal-payoff' : 'speech'}, drinkSay(c));
  const wrap = el('div', {class:'drink-hero'});
  wrap.append(svg, say);
  return wrap;
}

function eventSlug(){
  const q = new URLSearchParams(location.search).get('evento');
  const s = (q || '').trim();
  return s || null;
}

function planActual(){
  const code = [...sel.plan][0];
  return code && PLAN[code] ? PLAN[code] : null;
}

function shownName(opts){
  if (opts.name != null) return opts.name;
  if (draftName) return draftName;
  return persona ? persona.nombre : '';
}

function shownContact(opts){
  if (opts.contact != null) return opts.contact;
  if (draftContact) return draftContact;
  return persona && persona.contacto ? persona.contacto : '';
}

function reuseId(name){
  if (!persona || typeof persona.id !== 'string') return null;
  if (persona.nombre.trim().toLowerCase() !== name.trim().toLowerCase()) return null;
  return persona.id;
}

function loadPersona(){
  try {
    const raw = localStorage.getItem(PKEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d.id !== 'string' || typeof d.nombre !== 'string' || !d.nombre.trim()) return;
    persona = {
      id:d.id,
      nombre:d.nombre,
      contacto:typeof d.contacto === 'string' ? d.contacto : ''
    };
  } catch (e) { persona = null; }
}

function savePersona(p){
  persona = {id:p.id, nombre:p.nombre, contacto:p.contacto || ''};
  try { localStorage.setItem(PKEY, JSON.stringify(persona)); } catch (e) { /* el id queda en esta visita */ }
}

function clearPersona(){
  persona = null;
  try { localStorage.removeItem(PKEY); } catch (e) { /* se olvida en esta visita */ }
}

function identityForm(opts, label){
  const name = el('input', {type:'text', id:'f-name', name:'nombre', autocomplete:'given-name', maxlength:'80'});
  name.value = shownName(opts);
  name.addEventListener('input', () => { draftName = name.value; persist(); });
  const contact = el('input', {type:'text', id:'f-contact', name:'contacto', autocomplete:'on', maxlength:'120'});
  contact.value = shownContact(opts);
  contact.addEventListener('input', () => { draftContact = contact.value; persist(); });
  if (opts.error){
    name.setAttribute('aria-invalid', 'true');
    name.setAttribute('aria-describedby', 'save-err');
  }
  const form = el('form', {class:'save-form', novalidate:'true'});
  form.append(
    el('div', {class:'field'}, el('label', {for:'f-name'}, 'Tu nombre'), name),
    el('div', {class:'field'}, el('label', {for:'f-contact'}, 'Contacto (opcional)'), contact),
    el('p', {class:'privacy'}, 'Estos datos apuntan tu elección para la fiesta. Tu colección personal se guarda por separado en Mi perfil.'),
    el('div', {class:'actions'}, el('button', {class:'btn save', type:'submit'}, label))
  );
  if (opts.error) form.append(el('p', {class:'err', id:'save-err', role:'alert'}, opts.error));
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    onSave(name.value, contact.value);
  });
  return form;
}

function deleteControl(){
  if (!persona) return null;
  const wrap = el('div', {class:'forget'});
  if (deleteAsk){
    wrap.append(el('p', {}, 'Esto borra tu nombre y tus respuestas.'));
    if (deleteNote) wrap.append(el('p', {class:'err', role:'alert'}, deleteNote));
    const yes = el('button', {class:'text', type:'button'}, 'Sí, borrar mis datos');
    const no = el('button', {class:'text', type:'button'}, 'Mejor no');
    yes.addEventListener('click', onDelete);
    no.addEventListener('click', () => { deleteAsk = false; deleteNote = ''; moveFocus = true; render(); });
    wrap.append(el('div', {class:'actions'}, yes, no));
    return wrap;
  }
  const btn = el('button', {class:'text', type:'button'}, 'Borrar mis datos');
  btn.addEventListener('click', () => { deleteAsk = true; deleteNote = ''; moveFocus = true; render(); });
  wrap.append(el('div', {class:'actions'}, btn));
  return wrap;
}

function renderName(opts = {}){
  document.title = 'Tu nombre · Selector de cócteles';
  document.body.classList.add('flow');
  app.replaceChildren();
  const known = persona && persona.nombre;
  const h = el('h1', {}, known ? 'Hola, ' + persona.nombre : '¿Cómo te llamas?');
  const lede = el('p', {class:'lede'}, known
    ? 'Seguimos con este nombre en este celular. Cámbialo si es otra persona.'
    : 'Tu primer nombre o un alias.');
  const form = identityForm(opts, 'Ver mi trago');
  const back = el('button', {class:'text', type:'button'}, 'Atrás');
  back.addEventListener('click', () => {
    partida.phase = 'step';
    partida.stage = 'plan';
    moveFocus = true;
    render();
  });
  const actions = form.querySelector('.actions');
  if (actions) actions.append(back);
  const quiz = el('div', {class:'quiz'});
  quiz.append(h, lede, form);
  if (opts.canSkip && ranked().length){
    const see = el('button', {class:'text', type:'button'}, 'Ver el trago de todas formas');
    see.addEventListener('click', () => {
      markVisit();
      partida.current = ranked()[0];
      partida.phase = 'result';
      reveal = true;
      cardView = null;
      moveFocus = true;
      render();
    });
    quiz.append(el('div', {class:'actions'}, see));
  }
  const del = deleteControl();
  if (del) quiz.append(del);
  app.append(quiz);
  persist();
  if (opts.error) document.getElementById('f-name')?.focus();
  else placeFocus(h);
  window.scrollTo(0, 0);
}

function renderDrinkCard(c){
  document.title = c.n + ' · Selector de cócteles';
  document.body.classList.remove('flow');
  app.replaceChildren();
  const isPick = partida.current && partida.current.n === c.n;
  const title = el('h1', {class:'is-drink'}, c.n);
  const lede = el('div', {class:'lede'},
    el('p', {class:'pct'}, pctLabel(c), el('span', {class:'pct-note'}, ' · según lo que marcaste')),
    el('p', {}, matchCopy(c)),
    el('p', {class:'after'}, c.d)
  );
  const follow = el('div', {class:'follow'});
  drinkRecipeBlocks(c).forEach(b => follow.append(b));
  const actions = el('div', {class:'card-actions actions'});
  const pick = el('button', {class:'btn', type:'button'}, isPick ? 'Ya es tu trago' : 'Me quedo con este');
  if (isPick){
    pick.classList.add('is-off');
    pick.disabled = true;
  } else pick.addEventListener('click', () => chooseDrink(c));
  const back = el('button', {class:'text', type:'button'}, 'Volver');
  back.addEventListener('click', () => { cardView = null; moveFocus = true; render(); });
  actions.append(pick, back);
  follow.append(actions);
  if (window.Perfil) follow.append(Perfil.feedback(c));
  const portrait = el('div', {class:'portrait'});
  portrait.append(glassSvg(c));
  const quiz = el('div', {class:'quiz result'});
  quiz.append(portrait, title, lede, follow);
  app.append(quiz);
  placeFocus(title);
  window.scrollTo(0, 0);
}

function renderResult(opts = {}){
  if (window.Perfil) Perfil.recordResult(partida.current.n);
  if (window.Juego) Juego.cancelReveal();
  const arq = window.Juego ? Juego.archetype() : null;
  document.title = (arq ? arq.nombre + ' · ' : '') + partida.current.n + ' · ¿Qué tomamos?';
  document.body.classList.remove('flow');
  app.replaceChildren();
  const c = partida.current;
  const plan = planActual();
  const title = el('h1', {id:'result-heading'}, c.n);
  const lede = el('div', {class:'lede'});
  if (arq){
    lede.append(el('p', {class:'is-drinkline'}, 'Eres ' + arq.nombre));
    lede.append(el('p', {class:'result-element'}, 'Tu elemento: ' + arq.elementoNombre));
    lede.append(el('p', {}, arq.linea));
    lede.append(el('p', {class:'after'}, c.d));
  } else {
    lede.append(el('p', {}, plan ? plan.line : c.d));
    if (plan) lede.append(el('p', {class:'after'}, c.d));
  }
  const follow = el('div', {class:'follow'});
  const recipe = el('section', {class:'result-recipe', 'aria-labelledby':'recipe-heading'}, el('h2', {id:'recipe-heading'}, 'Tu receta, sin misterio.'));
  const closing = window.Preguntas ? Preguntas.closing() : '';
  if (closing){
    const story = el('details', {class:'result-story'});
    story.append(el('summary', {}, 'Lo que contaron tus respuestas'), el('p', {class:'question-closing'}, closing));
    lede.append(story);
  }
  const recipeColumns = el('div', {class:'recipe-columns'});
  drinkRecipeBlocks(c).forEach(block => {
    const heading = block.querySelector('h2');
    heading.replaceWith(el('h3', {}, heading.textContent));
    recipeColumns.append(block);
  });
  recipe.append(recipeColumns);
  follow.append(recipe);
  const others = ranked().filter(r => r.n !== c.n);
  const more = el('section', {class:'block result-more'});
  more.append(el('h2', {}, 'Otros parecidos'));
  more.append(el('p', {class:'after'}, 'El porcentaje compara bases, frutas y estilos. La fuerza orientativa ajusta el orden: no forma parte del porcentaje.'));
  if (!others.length){
    more.append(el('p', {class:'after'}, 'No hay otro que encaje con lo que marcaste.'));
  } else {
    const list = el('div', {class:'others', id:'other-results'});
    const count = el('p', {class:'after', role:'status', 'aria-live':'polite'});
    const showMore = el('button', {class:'text', type:'button', 'aria-controls':'other-results'}, 'Ver más recetas');
    let shown = 0;
    function appendBatch(focus = false){
      const batch = others.slice(shown, shown + 8);
      let first;
      batch.forEach(r => {
      const btn = el('button', {class:'other', type:'button'},
        el('span', {},
          r.n,
          el('small', {}, shortReason(r))
        ),
        el('span', {class:'other-percent'}, pctLabel(r))
      );
      btn.addEventListener('click', () => openDrinkCard(r));
      list.append(btn);
      first ||= btn;
      });
      shown += batch.length;
      count.textContent = 'Mostrando ' + shown + ' de ' + others.length + ' recetas alternativas.';
      showMore.hidden = shown >= others.length;
      if (focus && first) first.focus({preventScroll:true});
    }
    showMore.addEventListener('click', () => appendBatch(true));
    appendBatch();
    more.append(list, count, showMore);
  }
  follow.append(more);

  const restart = el('div', {class:'result-restart'});
  const backQ = el('button', {class:'btn quiet', type:'button'}, 'Cambiar lo que marqué');
  backQ.addEventListener('click', () => {
    partida.phase = 'step';
    partida.stage = 'plan';
    saved = false;
    sendNote = '';
    moveFocus = true;
    render();
  });
  const again = el('button', {class:'text result-reset', type:'button'}, 'Empezar de cero');
  again.addEventListener('click', resetWizard);
  restart.append(backQ, again);
  follow.append(restart);
  const del = deleteControl();
  if (del) follow.append(del);
  if (window.Juego) Juego.mountResult(follow);
  const adjust = follow.querySelector('.result-humor');
  if (adjust) adjust.append(restart);

  const play = reveal;
  reveal = false;
  if (play && window.Juego){
    title.classList.add('reveal-payoff');
    lede.classList.add('reveal-payoff');
    follow.classList.add('reveal-payoff');
  }
  const portrait = el('div', {class:'portrait result-character'});
  portrait.append(drinkPortrait(c, play && window.Juego));
  const intro = el('div', {class:'result-intro'}, title, lede);
  const readRecipe = el('button', {class:'btn result-recipe-link', type:'button', 'aria-controls':'recipe-heading'}, 'Ver mi receta');
  readRecipe.addEventListener('click', () => {
    const heading = recipe.querySelector('h2');
    heading.setAttribute('tabindex','-1');
    heading.focus({preventScroll:true});
    recipe.scrollIntoView({block:'start', behavior:'instant'});
  });
  intro.append(readRecipe);
  const badgeNames = Array.from(follow.querySelectorAll('.badge-name'));
  if (badgeNames.length){
    const newBadges = Array.from(follow.querySelectorAll('.badge.is-new .badge-name'));
    const shown = newBadges.length ? newBadges : badgeNames;
    const preview = el('section', {class:'result-badge-preview', 'aria-labelledby':'result-badge-heading'});
    preview.append(el('h2', {id:'result-badge-heading'}, newBadges.length
      ? 'Ganaste ' + newBadges.length + (newBadges.length === 1 ? ' insignia' : ' insignias')
      : 'Tenés ' + badgeNames.length + (badgeNames.length === 1 ? ' insignia' : ' insignias')));
    const names = shown.slice(0,3).map(node=>node.textContent).join(' · ');
    preview.append(el('p', {}, names + (shown.length>3 ? ' · y '+(shown.length-3)+' más' : '')));
    const see = el('button', {class:'text result-badge-link', type:'button', 'aria-controls':'badge-collection'}, 'Ver mis insignias');
    see.addEventListener('click',()=>{
      const target = document.getElementById('badge-collection'), heading = document.getElementById('badge-heading');
      if (heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
      target?.scrollIntoView({block:'start',behavior:'instant'});
    });
    preview.append(see);intro.append(preview);
  }
  const personal = el('section', {class:'result-personal', 'aria-labelledby':'personal-heading'}, el('h2', {id:'personal-heading'}, 'Tu cóctel, a tu manera'));
  if (window.Perfil) personal.append(Perfil.feedback(c));
  const share = follow.querySelector('.result-share');
  if (share){
    share.setAttribute('aria-label','Compartir tu cóctel');
    personal.append(share);
  }
  recipe.after(personal);
  const hero = el('section', {class:'result-hero', 'aria-labelledby':'result-heading'}, intro, portrait);
  const quiz = el('div', {class:'quiz result result-showcase'});
  if (arq) quiz.dataset.element = arq.elemento;
  quiz.append(hero, follow);
  app.append(quiz);
  if (play && window.Juego) Juego.playReveal(quiz);
  persist();
  const cover = quiz.querySelector('.reveal-cover');
  placeFocus(cover || (saved ? app.querySelector('.ok') : title));
  window.scrollTo(0, 0);
}

async function errorCode(res){
  try {
    const data = await res.json();
    return data && data.message ? String(data.message) : '';
  } catch (e) {
    return '';
  }
}

function markVisit(){
  try {
    if (sessionStorage.getItem('cocteles_run_marked') === '1') return;
    sessionStorage.setItem('cocteles_run_marked', '1');
    const n = Number(localStorage.getItem('cocteles_visitas_v1') || '0') + 1;
    localStorage.setItem('cocteles_visitas_v1', String(n));
  } catch (e) { /* el conteo es local */ }
}

async function loadMatches(){
  matchesError = false;
  const base = SUPABASE_URL.trim().replace(/\/$/, '');
  const key = SUPABASE_ANON_KEY.trim();
  if (!respuestaId || !base || !key){
    matches = [];
    return;
  }
  try {
    const res = await fetch(base + '/rest/v1/rpc/coincidencias', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        ...supabaseHeaders(key)
      },
      body:JSON.stringify({p_respuesta_id:respuestaId})
    });
    if (!res.ok){
      matchesError = true;
      matches = [];
      return;
    }
    const rows = await res.json();
    matches = Array.isArray(rows) ? rows.filter(r => r && typeof r.nombre === 'string').map(r => ({
      nombre:r.nombre,
      porcentaje:Math.max(0, Math.min(100, Math.round(Number(r.porcentaje) || 0)))
    })) : [];
  } catch (e) {
    matchesError = true;
    matches = [];
  }
}

async function refreshMatches(){
  if (matchesLoading) return;
  matchesLoading = true;
  moveFocus = false;
  reveal = false;
  render();
  await loadMatches();
  matchesLoading = false;
  moveFocus = false;
  reveal = false;
  render();
}

function failSave(name, contact, error, canSkip){
  moveFocus = false;
  saveOpts = {name, contact, error, canSkip: canSkip === true};
  if (partida.phase === 'result' && partida.current) renderResult(saveOpts);
  else if (window.Juego) Juego.renderStage();
  else renderName(saveOpts);
  document.getElementById('f-name')?.focus();
}

async function onSave(nombre, contacto){
  if (saving) return;
  const name = nombre.trim();
  const contact = (contacto || '').trim();
  draftName = nombre;
  draftContact = contacto || '';
  if (!name){
    failSave(nombre, contacto, 'Escribe tu nombre para apuntarte.');
    return;
  }
  if (!partida.current) partida.current = ranked()[0] || null;
  if (!partida.current){
    failSave(name, contact, 'Con esas alergias no queda un trago en la carta.');
    return;
  }
  saving = true;
  const btn = document.querySelector('.btn.save');
  if (btn){
    btn.disabled = true;
    btn.textContent = 'Guardando';
  }
  const base = SUPABASE_URL.trim().replace(/\/$/, '');
  const key = SUPABASE_ANON_KEY.trim();
  try {
    if (!base || !key){
      failSave(name, contact, 'Aún no está conectado. Avísale a quien organiza la fiesta.', true);
      return;
    }
    const res = await fetch(base + '/rest/v1/rpc/registrar_respuesta', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        ...supabaseHeaders(key)
      },
      body:JSON.stringify({
        p_slug:eventSlug(),
        p_persona_id:reuseId(name),
        p_nombre:name,
        p_contacto:contact || null,
        p_alcohol:[...sel.alcohol],
        p_frutas:partida.fruitAny ? [] : [...sel.fruta],
        p_estilo:[...sel.sabor].join(', ') || null,
        p_fuerza:[...sel.fuerza][0] || null,
        p_alergias:[...sel.alergia].map(v => {
          if (v === 'otra') return 'Otra: ' + restriccionesVM.snapshot().otra;
          const id = v === 'lactosa' ? 'lacteos' : v === 'trigo' ? 'gluten' : v;
          const motivo = MOTIVOS[restriccionesVM.snapshot().decisiones[id]];
          return (v === 'lactosa' ? 'Lactosa' : v === 'trigo' ? 'Trigo' : etiquetaRestriccion(v)) + (motivo ? ' — ' + motivo : '');
        }),
        p_plan:planActual() ? planActual().t : null,
        p_coctel:partida.current.n,
        p_arquetipo: window.Juego ? Juego.archetype().nombre : null
      })
    });
    if (!res.ok){
      const code = await errorCode(res);
      const error = code.includes('sin_evento')
        ? 'No hay una fiesta activa. Avísale a quien organiza.'
        : 'No se guardó. Revisa tu conexión e inténtalo de nuevo.';
      failSave(name, contact, error, true);
      return;
    }
    const data = await res.json();
    let personaId = null;
    respuestaId = null;
    if (typeof data === 'string') personaId = data;
    else if (data && typeof data.persona_id === 'string'){
      personaId = data.persona_id;
      respuestaId = typeof data.respuesta_id === 'string' ? data.respuesta_id : null;
    }
    if (!personaId) throw new Error('supabase');
    savePersona({id:personaId, nombre:name, contacto:contact});
    saved = true;
    sendNote = '';
    deleteAsk = false;
    saveOpts = null;
    partida.phase = 'result';
    cardView = null;
    matches = null;
    matchesError = false;
    markVisit();
    if (respuestaId) await loadMatches();
    reveal = true;
    moveFocus = true;
    render();
  } catch (e) {
    failSave(name, contact, 'No se guardó. Revisa tu conexión e inténtalo de nuevo.', true);
  } finally {
    saving = false;
  }
}

async function onDelete(){
  if (saving || !persona) return;
  saving = true;
  const base = SUPABASE_URL.trim().replace(/\/$/, '');
  const key = SUPABASE_ANON_KEY.trim();
  try {
    if (!base || !key){
      deleteAsk = true;
      deleteNote = 'Aún no está conectado. Avísale a quien organiza la fiesta.';
      moveFocus = true;
      render();
      return;
    }
    const res = await fetch(base + '/rest/v1/rpc/borrar_mis_datos', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        ...supabaseHeaders(key)
      },
      body:JSON.stringify({p_persona_id:persona.id, p_nombre:persona.nombre})
    });
    if (!res.ok){
      const code = await errorCode(res);
      deleteAsk = true;
      deleteNote = code.includes('no_coincide')
        ? 'No encontramos tus datos con ese nombre.'
        : 'No se borró. Revisa tu conexión e inténtalo de nuevo.';
      moveFocus = true;
      render();
      return;
    }
    clearPersona();
    draftName = '';
    draftContact = '';
    saved = false;
    deleteAsk = false;
    deleteNote = '';
    partida.phase = 'name';
    moveFocus = true;
    render();
  } catch (e) {
    deleteAsk = true;
    deleteNote = 'No se borró. Revisa tu conexión e inténtalo de nuevo.';
    moveFocus = true;
    render();
  } finally {
    saving = false;
  }
}

function resetWizard(){
  if (window.Perfil) Perfil.resetStatisticsRound();
  partida.phase = 'step';
  partida.stage = 'alcohol';
  partida.fruitAny = false;
  partida.current = null;
  cardView = null;
  saved = false;
  saving = false;
  deleteAsk = false;
  deleteNote = '';
  sendNote = '';
  draftName = '';
  draftContact = '';
  respuestaId = null;
  matches = null;
  matchesError = false;
  matchesLoading = false;
  partida.humor = 0;
  partida.styleTaste = '';
  partida.styleTexture = '';
  partida.styleDecisions = {};
  restriccionesVM.reset();
  saveOpts = null;
  SEL_KEYS.forEach(k => sel[k].clear());
  if (window.Preguntas) Preguntas.reset();
  if (window.Juego) Juego.onReset();
  try { sessionStorage.removeItem(WKEY); } catch (e) { /* el reinicio sigue en esta página */ }
  moveFocus = true;
  window.scrollTo(0, 0);
  if (location.hash && location.hash !== '#elegir') location.hash = '#elegir';
  else render();
}

function render(){
  if (window.Perfil && Perfil.isOpen()){ Perfil.render(); return; }
  document.body.classList.remove('at-profile');
  if (welcomeOpen) return;
  if (partida.phase === 'name'){ partida.phase = 'step'; partida.stage = 'plan'; }
  if (window.Juego) Juego.cancelReveal();
  if (location.hash === '#fiesta') history.replaceState(null, '', '#elegir');
  if (cardView) renderDrinkCard(cardView);
  else if (partida.phase === 'result' && partida.current) renderResult(saveOpts || {});
  else if (window.Juego) Juego.renderStage();
  else {
    partida.phase = 'step';
    renderStep();
  }
}

const navigation = performance.getEntriesByType('navigation')[0];
const reloaded = navigation ? navigation.type === 'reload' : performance.navigation?.type === 1;
const requestedProfile = !reloaded && ['#perfil', '#perfil/estadisticas'].includes(location.hash);
if (reloaded){
  // F5 empieza una partida nueva; la cuenta y sus datos guardados se conservan.
  try { sessionStorage.removeItem(WKEY); } catch (e) { /* se ignora la partida anterior */ }
  history.replaceState(null, '', location.pathname + location.search);
  history.scrollRestoration = 'manual';
}
loadPersona();
if (!reloaded) loadWizard();
if (window.Preguntas) sel.plan.clear();
if (!draftName && persona){
  draftName = persona.nombre;
  draftContact = persona.contacto || '';
}
if (window.Juego){
  Juego.init({
    el, app, STEPS, MAX_PICK, sel, partidaVM, alcoholVM, frutasVM, restriccionesVM,
    get stage(){ return partida.stage; },
    set stage(v){ partida.stage = v; },
    get phase(){ return partida.phase; },
    set phase(v){ partida.phase = v; },
    get fruitAny(){ return partida.fruitAny; },
    set fruitAny(v){ partida.fruitAny = v; },
    get current(){ return partida.current; },
    set current(v){ partida.current = v; },
    get badgeAnswers(){
      const round = window.Preguntas ? Preguntas.snapshot() : null;
      return round ? round.ids.filter(id => Number.isInteger(round.answers[id])).map(id => ({questionId:id, optionIndex:round.answers[id]})) : [];
    },
    get badgeAccountId(){ return window.Perfil ? Perfil.accountId() : null; },
    get reveal(){ return reveal; },
    set reveal(v){ reveal = v; },
    get saved(){ return saved; },
    get persona(){ return persona; },
    get draftName(){ return draftName; },
    set draftName(v){ draftName = v; },
    get draftContact(){ return draftContact; },
    set draftContact(v){ draftContact = v; },
    get respuestaId(){ return respuestaId; },
    get matches(){ return matches; },
    get matchesError(){ return matchesError; },
    get matchesLoading(){ return matchesLoading; },
    get humor(){ return partida.humor; },
    set humor(v){ partida.humor = v; },
    get styleTaste(){ return partida.styleTaste; },
    set styleTaste(v){ partida.styleTaste = v; },
    get styleTexture(){ return partida.styleTexture; },
    set styleTexture(v){ partida.styleTexture = v; },
    get styleDecisions(){ return partida.styleDecisions; },
    set styleDecisions(v){ partida.styleDecisions = v; },
    get saveOpts(){ return saveOpts; },
    set saveOpts(v){ saveOpts = v; },
    get moveFocus(){ return moveFocus; },
    set moveFocus(v){ moveFocus = v; },
    togglePick, asItem, ranked, persist, render, placeFocus, finishConversation, glass:glassSvg,
    identityForm, deleteControl, refreshMatches, markVisit
  });
}
window.addEventListener('hashchange', () => { moveFocus = true; render(); });
if (window.Saludos) Saludos.init(enterGame);
else document.getElementById('welcome-start').addEventListener('click', enterGame);
if (window.Perfil) Perfil.init({
  badgeContext:() => ({persona,draftName,badgeAccountId:window.Perfil ? Perfil.accountId() : null}),
  el, app, catalog:C, steps:STEPS, url:SUPABASE_URL, key:SUPABASE_ANON_KEY,
  snapshot:() => Object.fromEntries(SEL_KEYS.map(k => [k, [...sel[k]]])),
  ranked, choose:chooseDrink, glass:glassSvg, portrait:drinkPortrait,
  avatar:drinkAvatar, identity:(choices,id) => Juego.personalityFor(choices,id),
  currentIdentity:() => Juego.archetype(),
  heroGlass:() => Juego.heroGlass(),
  isWelcome:() => welcomeOpen,
  enter:() => {
    stopWelcomeSpeech();
    if (window.Juego) Juego.cancelReveal();
    welcomeOpen = false; welcomeScreen.hidden = true; app.hidden = false;
    document.body.classList.remove('at-welcome');
  },
  resume:welcome => {
    document.body.classList.remove('at-profile');
    if (welcome) showWelcome(true);
    else { reveal = false; render(); app.querySelector('h1')?.focus(); }
  },
  allowed:(c, p) => {
    if (p.alergia.includes('otra') || choca(c, new Set(p.alergia))) return false;
    if (p.alcohol.length === 1 && p.alcohol[0] === 'Sin alcohol' && !c.a.includes('Sin alcohol')) return false;
    if (p.fuerza.length && fuerzaDe(c) !== p.fuerza[0].toLowerCase()) return false;
    return true;
  }
});
showWelcome();
render();
if (requestedProfile && window.Perfil) Perfil.open(location.hash === '#perfil/estadisticas' ? 'estadisticas' : 'guardados');
if (partida.phase === 'result' && respuestaId){
  loadMatches().then(() => {
    if (partida.phase !== 'result') return;
    moveFocus = false;
    reveal = false;
    render();
  });
}
