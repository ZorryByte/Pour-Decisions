import {crearMedida, CAPACIDAD_OZ, DURACION_RONDA, onzasDe} from './medida.js';
import {crearVozMedida} from './fuerzaDialogos.js';
import {crearCuerpo, avanzarCuerpo} from './fisicaMedida.js';
import {refinarMateriales} from './materialesMedida.js';
import './fuerzaJuego.css';

let secuencia = 0;
const historialVoz = new Map();
export function createFuerzaJuego({el, glassBuild, bases, color, initial, onConfirm, onBack}){
  const id = 'medida-' + (++secuencia);
  const voz = crearVozMedida(bases, historialVoz);
  const medida = crearMedida(onzasDe(initial));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let phase = initial ? 'resultado' : 'entrada', running = false, destroyed = false;
  let seconds = DURACION_RONDA, count = 3, countdown = 0, lastTime = 0, frame = 0;
  let mode = '', gesture = null, autoPour = false, fillHeld = false, pointerFilled = 0;
  let idle = 0, lastSpeech = -Infinity, speechTime = 0, lastEvent = '', lastIntensity = '';
  let speechAnimation, actionAnimation, countAnimation;
  let entranceTime=0, entranceDuration=5.8, spokenEntrance=false;
  let pendingEvent=null;
  const bodies={jigger:crearCuerpo(),vaso:crearCuerpo(),botella:crearCuerpo()};
  let visibleJigger=0,visibleGlass=medida.vaso;
  const removePointerListeners=[];
  function pointerListener(type,fn){document.addEventListener(type,fn);removePointerListeners.push(()=>document.removeEventListener(type,fn));}
  const root = el('section', {class:'measure-game', 'data-phase':phase, 'aria-labelledby':'stage-q'});
  root.style.setProperty('--measure-liquid', color());
  const heading = el('h1', {id:'stage-q', tabindex:'-1'}, voz('entrada'));
  const lead = el('p', {class:'measure-lead'}, 'Llena el jigger, lleva la medida al vaso y vierte. Si te pasas, descarta y vuelve a medir.');
  const timeValue = el('output', {class:'measure-seconds','aria-live':'off'}, '15 s');
  const clock = el('div', {class:'measure-clock', role:'timer', 'aria-label':'Tiempo de la ronda'}, timeValue);
  const timeBar = el('div',{class:'measure-time-track','aria-hidden':'true'},el('span',{class:'measure-time-fill'}));
  const top = el('div', {class:'measure-top'}, el('div',{},heading,lead),clock);
  const line = el('p', {class:'measure-line glass-speech-line',role:'status','aria-live':'polite','aria-atomic':'true'});
  const bubble = el('div', {class:'measure-speech glass-speech'}, line);
  const table = el('div', {class:'measure-table'});
  const bottle = el('button', {type:'button',class:'measure-bottle measure-utensil', 'aria-label':'Botella. Mantén para llenar el jigger. Con teclado, pulsa para añadir un cuarto de onza.'});
  bottle.innerHTML = '<svg viewBox="0 0 120 220" aria-hidden="true"><defs><clipPath id="'+id+'-bottle-clip"><path d="M47 18H73V65C73 81 92 82 94 101L96 196Q60 211 24 196L26 101C28 82 47 81 47 65Z"/></clipPath><linearGradient id="'+id+'-bottle-glass"><stop stop-color="#fefae0" stop-opacity=".2"/><stop offset=".25" stop-color="#fefae0" stop-opacity=".025"/><stop offset=".8" stop-color="#fefae0" stop-opacity=".04"/><stop offset="1" stop-color="#fefae0" stop-opacity=".18"/></linearGradient></defs><g class="measure-bottle-art"><path d="M47 18H73V65C73 81 92 82 94 101L96 196Q60 211 24 196L26 101C28 82 47 81 47 65Z" fill="url(#'+id+'-bottle-glass)" stroke="#fefae0" stroke-opacity=".72" stroke-width="1.2"/><g clip-path="url(#'+id+'-bottle-clip)"><g class="measure-bottle-fluid"><rect x="-110" y="108" width="340" height="300" fill="var(--measure-liquid)" fill-opacity=".72"/><ellipse cx="60" cy="108" rx="64" ry="3" fill="#fefae0" fill-opacity=".22"/></g></g><ellipse cx="60" cy="18" rx="13" ry="3" fill="#283618" stroke="#fefae0" stroke-opacity=".9" stroke-width="1.2"/><ellipse cx="60" cy="18" rx="9" ry="1.5" fill="#fefae0" fill-opacity=".12"/><path d="M48 28h24M48 32h24" stroke="#fefae0" stroke-opacity=".38"/><path d="M36 111Q60 118 84 111L85 165Q60 173 35 165Z" fill="#fefae0" fill-opacity=".1" stroke="#fefae0" stroke-opacity=".65" stroke-width=".7"/><path d="M45 132h30M50 138h20M53 145h14" stroke="#fefae0" stroke-opacity=".65" stroke-width="1"/><path d="M50 37v27Q50 77 38 88M32 103l-2 78M89 110l2 72" stroke="#fefae0" stroke-opacity=".5" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M28 194Q60 207 92 194M31 199Q60 210 89 199" fill="none" stroke="#fefae0" stroke-opacity=".5" stroke-width=".8"/></g></svg>';
  bottle.append(el('span',{class:'measure-object-name'},bases.join(' · ')),el('span',{class:'measure-object-help'},'Mantén para llenar'));
  const jigger = el('button',{type:'button',class:'measure-jigger measure-utensil','aria-label':'Jigger. Arrástralo al vaso para verter o al descarte para quitar. Con teclado, pulsa para servir.'});
  jigger.innerHTML = '<svg viewBox="0 0 150 190" aria-hidden="true"><defs><clipPath id="'+id+'-clip"><path d="M22 19H128L103 144H47Z"/></clipPath></defs><path d="M22 19H128L103 144H47Z" fill="#fefae0" fill-opacity=".06" stroke="#fefae0" stroke-opacity=".8" stroke-width="1.3"/><g clip-path="url(#'+id+'-clip)"><g class="measure-jigger-fluid"><rect class="measure-jigger-liquid" x="-100" y="144" width="350" height="340" fill="var(--measure-liquid)"/><ellipse class="measure-jigger-surface" cx="75" cy="144" rx="90" ry="2.5" fill="#fefae0" fill-opacity=".25"/></g><path d="M32 25l20 111M119 30l-19 103" stroke="#fefae0" stroke-opacity=".3" stroke-width="1.5"/></g><ellipse cx="75" cy="19" rx="53" ry="5" fill="none" stroke="#fefae0" stroke-opacity=".9" stroke-width="1.3"/><path d="M47 144L30 175Q75 187 120 175L103 144M47 144h56" fill="#fefae0" fill-opacity=".08" stroke="#fefae0" stroke-opacity=".7" stroke-width="1.1"/><path d="M36 174Q75 184 114 174" fill="none" stroke="#fefae0" stroke-opacity=".35"/><g fill="#fefae0" font-family="sans-serif" font-size="11"><path d="M89 112h21M89 81h27M89 19h35" stroke="#fefae0" stroke-opacity=".7"/><text x="57" y="115">½ oz</text><text x="57" y="84">1 oz</text><text x="57" y="36">2 oz</text></g></svg>';
  const jiggerValue = el('output',{class:'measure-object-name','aria-live':'off'},'0 oz');
  jigger.append(jiggerValue,el('span',{class:'measure-object-help'},'Lleva al vaso e inclina'));
  const glass = glassBuild();
  glass.setAttribute('aria-hidden','true'); glass.removeAttribute('role');
  const glassButton = el('button',{type:'button',class:'measure-glass measure-utensil','aria-label':'Vaso. Arrastra al descarte para rehacerlo o pulsa para recibir la medida.'}, glass);
  const glassValue = el('output',{class:'measure-object-name','aria-live':'off'},'0 oz en el vaso');
  glassButton.append(glassValue,el('span',{class:'measure-object-help'},'Aquí va tu medida'));
  refinarMateriales({id,bottle,jigger,glass});
  const waste = el('button',{type:'button',class:'measure-waste','aria-label':'Recipiente de descarte. Lleva aquí el jigger o el vaso para vaciarlo.'});
  waste.innerHTML = '<svg viewBox="0 0 100 45" aria-hidden="true"><defs><linearGradient id="'+id+'-tray"><stop stop-color="#fefae0" stop-opacity=".22"/><stop offset=".25" stop-color="#fefae0" stop-opacity=".07"/><stop offset=".7" stop-color="#fefae0" stop-opacity=".14"/><stop offset="1" stop-color="#fefae0" stop-opacity=".3"/></linearGradient><pattern id="'+id+'-tray-brush" width="4" height="6" patternUnits="userSpaceOnUse"><path d="M0 1h4M0 4h3" stroke="#fefae0" stroke-opacity=".06" stroke-width=".4"/></pattern></defs><path d="M8 10h84L81 36Q50 43 19 36Z" fill="url(#'+id+'-tray)" stroke="#fefae0" stroke-opacity=".5" stroke-width=".9"/><path d="M8 10h84L81 36Q50 43 19 36Z" fill="url(#'+id+'-tray-brush)"/><ellipse cx="50" cy="10" rx="42" ry="7" fill="#283618" stroke="#fefae0" stroke-opacity=".7" stroke-width="1"/><ellipse cx="50" cy="11" rx="36" ry="4" fill="#fefae0" fill-opacity=".045" stroke="#fefae0" stroke-opacity=".15" stroke-width=".6"/><path d="M17 17l7 15M84 17l-6 15M26 37q24 5 48 0" stroke="#fefae0" stroke-opacity=".25" stroke-width=".8" fill="none"/></svg>';
  waste.append(el('span',{},'Descarte'), el('span',{class:'measure-object-help'},'Trae lo que quieras vaciar'));
  const fluid = document.createElementNS('http://www.w3.org/2000/svg','svg');
  fluid.setAttribute('class','measure-stream');fluid.setAttribute('aria-hidden','true');
  fluid.innerHTML='<g class="measure-drops" fill="var(--measure-liquid)"><ellipse rx="1.8" ry="3.2"/><ellipse rx="1.5" ry="2.7"/><ellipse rx="1.8" ry="3.3"/></g><ellipse class="measure-splash" fill="none" stroke="var(--measure-liquid)" stroke-opacity=".45" stroke-width="1.5" rx="8" ry="2"/>';
  table.append(bottle,jigger,glassButton,waste,fluid);
  const countdownText = el('div',{class:'measure-countdown','aria-live':'assertive','aria-atomic':'true'});
  const instruction = el('p',{class:'measure-instruction'},'Mantén la botella. Lleva el jigger al vaso. Inclina para servir.');
  const amount = el('p',{class:'measure-result-amount',role:'status'});
  const scale = el('div',{class:'measure-scale','aria-label':'Escala de esta ronda: suave hasta tres cuartos de onza; medio hasta una onza y media; fuerte hasta dos onzas.'});
  for (const [name,range] of [['Suave','Hasta ¾ oz'],['Medio','Hasta 1½ oz'],['Fuerte','Hasta 2 oz']]) scale.append(el('span',{'data-strength':name},el('strong',{},name),el('span',{},range)));
  const confirm = el('button',{type:'button',class:'btn next measure-confirm'},'Continuar');
  const retry = el('button',{type:'button',class:'text measure-retry'},'Va de nuevo');
  const pause = el('button',{type:'button',class:'text measure-pause'},'Pausar');
  const back = el('button',{type:'button',class:'text measure-back'},'Atrás');
  const actionRow = el('div',{class:'measure-actions'},confirm,retry,pause,back);
  root.append(top,timeBar,bubble,table,countdownText,instruction,amount,scale,actionRow);
  root.addEventListener('dragstart',event=>event.preventDefault());
  const fmt = n => Number(n.toFixed(2)).toLocaleString('es-GT',{maximumFractionDigits:2})+' oz';
  const active = () => phase === 'jugando' && running && !document.hidden;
  function text(node,value){ if(node.textContent!==value)node.textContent=value; }

  function say(event, force = false){
    if(!force&&event===lastEvent)return;
    const priority={suave:4,medio:4,fuerte:4,lleno:3,limite:4,descartar:4,rehacer:5,vacio:3,pausa:2,llenar:1,acercar:1,verter:0,duda:0}[event]||0;
    if (!force && speechTime-lastSpeech < 2.4){
      if(!pendingEvent||priority>=pendingEvent.priority)pendingEvent={event,priority};
      return;
    }
    pendingEvent=null;
    lastSpeech=speechTime;lastEvent=event;
    const text=voz(event);line.textContent=text;
    line.setAttribute('aria-label',text);
    if(!reduced.matches){
      line.replaceChildren();let delay=0;
      text.split(/\s+/).forEach((word,i)=>{const span=el('span',{class:'glass-word','aria-hidden':'true'},word);span.style.setProperty('--word-delay',delay+'ms');if(i)line.append(document.createTextNode(' '));line.append(span);delay+=Math.min(190,80+word.length*8);});
    }
    speechAnimation?.cancel();
    if (!reduced.matches && glass.animate){
      const words=text.split(/\s+/), frames=[{offset:0,transform:'none'}];
      words.forEach((_,i)=>frames.push({offset:(i+.25)/(words.length+1),transform:'translateY(-2px) rotate('+(i%2?1.6:-1.6)+'deg)'},{offset:(i+.8)/(words.length+1),transform:'none'}));
      frames.push({offset:1,transform:'none'});
      speechAnimation=glass.animate(frames,{duration:Math.max(1100,words.length*155),easing:'ease-in-out'});
    }
  }
  function pulse(){
    if (reduced.matches) return;
    actionAnimation?.cancel();
    actionAnimation=glass.querySelector('.surface').animate([{transform:'scaleY(1)'},{transform:'scaleY(1.6)'},{transform:'scaleY(1)'}],{duration:650,easing:'ease-out'});
  }
  function paint(){
    root.dataset.phase=phase;root.dataset.paused=String(!running && phase==='jugando');
    root.dataset.action=mode;
    root.dataset.jigger=medida.jigger.toFixed(3); root.dataset.served=medida.vaso.toFixed(3);
    root.classList.toggle('is-filling',mode==='llenar');root.classList.toggle('is-pouring',mode==='verter');
    root.classList.toggle('is-discarding',mode==='descartar');
    text(jiggerValue,fmt(medida.jigger));text(glassValue,fmt(medida.vaso)+' en el vaso');
    const intensity=medida.intensidad();
    for (const mark of scale.children){mark.classList.toggle('is-current',mark.dataset.strength===intensity);if(mark.dataset.strength===intensity)mark.setAttribute('aria-current','true');else mark.removeAttribute('aria-current');}
    const result=phase==='resultado',playing=phase==='jugando',intro=phase==='entrada';
    top.hidden=intro||phase==='cuenta';
    top.querySelector('.measure-lead').hidden=!intro;
    pause.hidden=!playing||running;
    back.hidden=playing||phase==='cuenta'||intro;
    confirm.hidden=!result || !intensity;retry.hidden=!result;
    clock.hidden=!playing;timeBar.hidden=clock.hidden;
    countdownText.hidden=phase!=='cuenta';
    instruction.hidden=!playing;amount.hidden=!result;
    scale.hidden=!(playing||result);
    bubble.hidden=phase==='cuenta';
    text(confirm,'Continuar con '+(intensity||'tu medida'));
    text(amount,intensity ? fmt(medida.vaso)+' de licor · '+intensity : 'No llegó ninguna medida al vaso.');
    for (const button of [bottle,jigger,glassButton,waste]){
      const disabled=!playing||!running;
      if(button.disabled!==disabled)button.disabled=disabled;
    }
    text(timeValue,Math.ceil(seconds)+' s');
    clock.setAttribute('aria-label',Math.ceil(seconds)+' segundos restantes');
    root.style.setProperty('--measure-time',String(seconds/DURACION_RONDA));
    root.classList.toggle('is-urgent',seconds<=3&&playing);
    text(pause,running?'Pausar':'Seguir jugando');
    text(instruction,!running&&playing?'Ronda en pausa. Tu medida sigue aquí.':mode==='descartar'?'Suelta cuando esté a tu gusto.':mode==='verter'?'Suelta para detener el chorro.':'Mantén para medir. Arrastra para servir.');
  }
  function stopGesture(){
    const old=gesture;gesture=null;mode='';autoPour=false;fillHeld=false;
    if(old){
      try{if(old.node.hasPointerCapture(old.pointerId))old.node.releasePointerCapture(old.pointerId);}catch{/* Gesto cancelado por el navegador. */}
      old.node.classList.remove('is-held');
    }
    for(const body of Object.values(bodies)){body.targetX=0;body.targetY=0;body.targetAngle=0;}
    fluid.classList.remove('is-visible');
  }
  function focusHeading(){ heading.focus({preventScroll:true}); }
  function showCount(){
    const text=count>0?String(count):'¡Vamos!';countdownText.textContent=text;
    countAnimation?.cancel();
    if(!reduced.matches)countAnimation=countdownText.animate([{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:220,easing:'cubic-bezier(.16,1,.3,1)',fill:'none'});
  }
  function startRound(){
    stopGesture();medida.reiniciar();seconds=DURACION_RONDA;count=3;countdown=0;idle=0;lastIntensity='';
    phase='cuenta';running=true;heading.removeAttribute('aria-label');heading.textContent='¿Qué tan fuerte lo quieres?';speechAnimation?.cancel();showCount();paint();
  }
  function endRound(timed = false){
    stopGesture();running=false;phase='resultado';
    say(!medida.intensidad()?'sinServir':timed?'tiempo':'terminar',true);
    heading.textContent=medida.intensidad()?'¿Así lo dejamos?':'Faltó servir. Se puede repetir.';
    paint();focusHeading();
  }
  function activity(){ idle=0; }
  function add(oz){
    if(!active())return;
    activity();const n=medida.llenar(oz);
    if(n) say('llenar');else say('lleno');paint();
  }
  function startPour(){
    if(!active())return;
    activity();
    if(autoPour){stopGesture();paint();return;}
    if(medida.jigger<.001){say('vacio',true);return;}
    if(medida.vaso>=CAPACIDAD_OZ-.001){say('limite',true);return;}
    autoPour=true;mode='verter';say('acercar');paint();
  }
  function resetGlass(){
    if(!active())return;
    activity();stopGesture();
    if(medida.vaciarVaso()){say('rehacer',true);lastIntensity='';pulse();}else say('vacio',true);
    paint();
  }
  function discard(){
    if(!active())return;
    activity();stopGesture();
    if(medida.descartar(CAPACIDAD_OZ))say('descartar',true);else say('vacio',true);paint();
  }
  retry.addEventListener('click',()=>{stopGesture();phase='entrada';entranceTime=0;spokenEntrance=false;heading.textContent=voz('repetir');medida.reiniciar();paint();focusHeading();});
  confirm.addEventListener('click',()=>{if(phase==='resultado'&&medida.intensidad())onConfirm(medida.intensidad());});
  back.addEventListener('click',onBack);
  pause.addEventListener('click',()=>{stopGesture();running=!running;paint();});
  bottle.addEventListener('pointerdown',e=>{
    if(!active()||e.button!==0)return;
    e.preventDefault();stopGesture();activity();fillHeld=true;pointerFilled=0;mode='llenar';
    bottle.setPointerCapture(e.pointerId);gesture={node:bottle,pointerId:e.pointerId,kind:'botella'};say('llenar',true);paint();
  });
  function endFill(e){
    if(!fillHeld||gesture?.pointerId!==e.pointerId)return;
    const tap=pointerFilled<.08;stopGesture();
    if(e.type==='pointerup'&&tap)add(.25);else {say('pausa');paint();}
  }
  pointerListener('pointerup',endFill);pointerListener('pointercancel',endFill);
  bottle.addEventListener('click',e=>{if(e.detail===0)add(.25);});

  function contains(target,x,y,pad=0){const r=target.getBoundingClientRect();return x>=r.left-pad&&x<=r.right+pad&&y>=r.top-pad&&y<=r.bottom+pad;}
  function bindDrag(node,kind){
    node.addEventListener('pointerdown',e=>{
      if(!active()||e.button!==0)return;
      e.preventDefault();stopGesture();activity();
      const box=node.getBoundingClientRect();
      gesture={node,kind,pointerId:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,box,moved:false};
      node.setPointerCapture(e.pointerId);node.classList.add('is-held');
    });
    pointerListener('pointermove',e=>{
      if(!gesture||gesture.node!==node||gesture.pointerId!==e.pointerId||!active())return;
      const g=gesture;g.x=e.clientX;g.y=e.clientY;
      const dx=g.x-g.startX,dy=g.y-g.startY;
      if(Math.hypot(dx,dy)>6)g.moved=true;
      if(!g.moved)return;
      activity();const overWaste=contains(waste,g.x,g.y,12);
      const overGlass=kind==='jigger'&&contains(glassButton,g.x,g.y,12);
      const nextMode=overWaste?'descartar':overGlass?'verter':'';
      if(nextMode!==mode){
        mode=nextMode;
        if(overGlass){if(medida.jigger<.001)say('vacio',true);else say('acercar',true);}
        if(overWaste&&kind==='jigger'&&medida.jigger>.001)say('descartar',true);
        if(overWaste&&kind==='vaso')actionAnimation?.cancel();
      }
      const angle=nextMode==='verter'?65:nextMode==='descartar'?-95:Math.max(-14,Math.min(14,dx*.08));
      const body=bodies[kind];body.targetX=dx;body.targetY=dy;body.targetAngle=angle;
      waste.classList.toggle('is-target',overWaste);glassButton.classList.toggle('is-target',overGlass);
      paint();
    });
    function release(e){
      if(!gesture||gesture.node!==node||gesture.pointerId!==e.pointerId)return;
      const moved=gesture.moved;stopGesture();waste.classList.remove('is-target');glassButton.classList.remove('is-target');
      if(!moved&&e.type==='pointerup')startPour();
      paint();
    }
    pointerListener('pointerup',release);pointerListener('pointercancel',release);
    node.addEventListener('click',e=>{if(e.detail===0)startPour();});
  }
  bindDrag(jigger,'jigger');bindDrag(glassButton,'vaso');
  waste.addEventListener('click',()=>{if(gesture)return;if(medida.jigger>.001)discard();else resetGlass();});
  glassButton.addEventListener('keydown',event=>{if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();resetGlass();}});

  function drawStream(){
    const emptyingGlass=mode==='descartar'&&gesture?.kind==='vaso';
    const visible=mode==='llenar'&&Math.abs(bodies.botella.angle)>35&&medida.jigger<CAPACIDAD_OZ || mode==='verter'&&medida.jigger>.001&&medida.vaso<CAPACIDAD_OZ || mode==='descartar'&&(emptyingGlass?medida.vaso:medida.jigger)>.001;
    fluid.classList.toggle('is-visible',visible);
    if(!visible)return;
    const t=table.getBoundingClientRect(),j=jigger.getBoundingClientRect(),g=glassButton.getBoundingClientRect();
    function point(svg,x,y){const p=svg.createSVGPoint();p.x=x;p.y=y;const world=p.matrixTransform(svg.getScreenCTM());return {x:world.x-t.x,y:world.y-t.y};}
    const lip=emptyingGlass?point(glass,45,24):point(jigger.querySelector('svg'),mode==='descartar'?22:128,19);
    let x1=lip.x,y1=lip.y;
    const surface=point(glass,80,158-(visibleGlass/CAPACIDAD_OZ)*88);
    let x2=surface.x,y2=surface.y;
    if(mode==='llenar'){
      const mouth=point(bottle.querySelector('svg'),60,18),opening=point(jigger.querySelector('svg'),75,144-(visibleJigger/CAPACIDAD_OZ)*125);
      x1=mouth.x;y1=mouth.y;x2=opening.x;y2=opening.y;
    }else if(mode==='descartar'){
      const w=waste.getBoundingClientRect();x2=w.x+w.width*.5-t.x;y2=w.y+18-t.y;
    }
    fluid.setAttribute('viewBox','0 0 '+t.width+' '+t.height);
    fluid.querySelectorAll('.measure-drops ellipse').forEach((drop,i)=>{
      const t=(speechTime*1.8+i/3)%1;
      drop.setAttribute('cx',x1+(x2-x1)*t);
      drop.setAttribute('cy',y1+(y2-y1)*Math.pow(t,1.45));
      drop.setAttribute('opacity',reduced.matches?'0':String(.35*Math.sin(t*Math.PI)));
    });
    const splash=fluid.querySelector('.measure-splash');splash.setAttribute('cx',x2);splash.setAttribute('cy',y2);
  }
  function worldPoint(svg,x,y){const p=svg.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(svg.getScreenCTM());}
  function alignLip(body,source,destination,dx=0,dy=-15){
    body.targetX=body.x+destination.x-source.x+dx;
    body.targetY=body.y+destination.y-source.y+dy;
  }
  function physics(dt){
    const bottleBody=bodies.botella;
    if(mode==='llenar'){
      bottleBody.targetAngle=105;
      alignLip(bottleBody,worldPoint(bottle.querySelector('svg'),60,18),worldPoint(jigger.querySelector('svg'),75,19),-7,-18);
    }
    if(mode==='verter'){
      bodies.jigger.targetAngle=65;
      alignLip(bodies.jigger,worldPoint(jigger.querySelector('svg'),128,19),worldPoint(glass,80,24),-4,-18);
    }else if(mode==='descartar'&&gesture){
      const isGlass=gesture.kind==='vaso',body=isGlass?bodies.vaso:bodies.jigger;
      const source=isGlass?worldPoint(glass,45,24):worldPoint(jigger.querySelector('svg'),22,19);
      alignLip(body,source,worldPoint(waste.querySelector('svg'),50,10),0,-15);
    }
    for(const [name,node] of [['botella',bottle.querySelector('svg')],['jigger',jigger],['vaso',glassButton]]){
      const b=bodies[name];avanzarCuerpo(b,dt,reduced.matches);
      node.style.transform='translate('+b.x.toFixed(2)+'px,'+b.y.toFixed(2)+'px) rotate('+b.angle.toFixed(2)+'deg)';
    }
    const blend=reduced.matches?1:Math.min(1,dt*18);
    visibleJigger+=(medida.jigger-visibleJigger)*blend;visibleGlass+=(medida.vaso-visibleGlass)*blend;
    const jy=144-(visibleJigger/CAPACIDAD_OZ)*125,gy=158-(visibleGlass/CAPACIDAD_OZ)*88;
    jigger.querySelector('.measure-jigger-liquid').setAttribute('y',jy);
    jigger.querySelector('.measure-jigger-surface').setAttribute('cy',jy);
    jigger.querySelector('.measure-jigger-fluid').setAttribute('transform','rotate('+(-bodies.jigger.angle+bodies.jigger.wave)+' 75 '+jy+')');
    bottle.querySelector('.measure-bottle-fluid').setAttribute('transform','rotate('+(-bottleBody.angle+bottleBody.wave)+' 60 108)');
    glass.querySelectorAll('.liquid,.liquid-depth').forEach(n=>{n.setAttribute('x','-100');n.setAttribute('width','350');n.setAttribute('y',gy);});
    glass.querySelector('.liquid').setAttribute('fill',color());
    glass.querySelector('.liquid-body').setAttribute('transform','rotate('+(-bodies.vaso.angle+bodies.vaso.wave)+' 80 '+gy+')');
    glass.querySelector('.surface').setAttribute('cy',gy);
    glass.querySelector('.surface').setAttribute('transform','rotate('+(-bodies.vaso.angle+bodies.vaso.wave)+' 80 '+gy+')');
    glass.querySelector('.ice-float')?.setAttribute('transform','translate(0 '+(Math.max(0,gy-91)*.72)+') rotate('+(-bodies.vaso.angle*.7+bodies.vaso.wave*.7)+' 80 110)');
    drawStream();
  }
  function playEntrance(){
    spokenEntrance=true;const text=heading.textContent;line.textContent=text;line.setAttribute('aria-label',text);
    let at=160;const beats=[];
    line.replaceChildren();
    text.split(/\s+/).forEach((word,i)=>{
      const span=el('span',{class:'welcome-word','aria-hidden':'true'},word);span.style.setProperty('--word-delay',at+'ms');if(i)line.append(document.createTextNode(' '));line.append(span);
      const length=Math.min(250,115+word.length*11);beats.push({at,length,angle:i%2?1.7:-1.7});at+=length+(/[.,!?…]$/.test(word)?140:25);
    });
    entranceDuration=(at+1700)/1000;
    if(reduced.matches)return;
    const duration=at+160,frames=[{offset:0,transform:'none'}];
    for(const b of beats)frames.push({offset:b.at/duration,transform:'none'},{offset:(b.at+b.length*.4)/duration,transform:'translateY(-3px) rotate('+b.angle+'deg)'},{offset:(b.at+b.length)/duration,transform:'none'});
    frames.push({offset:1,transform:'none'});speechAnimation?.cancel();speechAnimation=glass.animate(frames,{duration,easing:'ease-in-out'});
  }
  function visibility(){
    lastTime=0;
    if(document.hidden){stopGesture();if(phase==='jugando'){running=false;paint();}}
  }
  function blur(){if(phase==='jugando'&&running){stopGesture();running=false;paint();}}
  function keydown(e){if(e.key==='Escape'&&phase==='jugando'){e.preventDefault();stopGesture();running=false;paint();pause.focus();}}
  document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',blur);root.addEventListener('keydown',keydown);
  function tick(time){
    if(destroyed)return;
    const elapsed=lastTime?Math.max(0,(time-lastTime)/1000):0;
    const dt=Math.min(.08,elapsed);lastTime=time;speechTime+=elapsed;
    if(!document.hidden&&phase==='entrada'&&root.isConnected){
      if(!spokenEntrance)playEntrance();entranceTime+=elapsed;
      if(entranceTime>=entranceDuration)startRound();
    }
    if(!document.hidden&&phase==='cuenta'){
      countdown+=elapsed;
      if(countdown>=.72){countdown-=.72;count--;if(count>=0)showCount();else{phase='jugando';say('base',true);paint();}}
    }
    if(active()){
      idle+=dt;
      {const before=seconds;seconds=Math.max(0,seconds-elapsed);if(before>3&&seconds<=3)say('prisa',true);}
      if(mode==='llenar'){
        const ready=reduced.matches||Math.abs(bodies.botella.angle)>35;
        const added=medida.llenar(ready?dt*.8:0);pointerFilled+=added;
        if(medida.jigger>=CAPACIDAD_OZ-.001)say('lleno');
      }else if(mode==='verter'){
        const tilt=Math.max(0,Math.sin(Math.abs(bodies.jigger.angle)*Math.PI/180));
        const poured=medida.verter(dt*.95*tilt);
        if(poured){
          const intensity=medida.intensidad();
          if(intensity&&intensity!==lastIntensity){lastIntensity=intensity;say(intensity.toLowerCase());pulse();}
          else say('verter');
        }else if(medida.vaso>=CAPACIDAD_OZ-.001){say('limite');if(autoPour)stopGesture();}
        else if(autoPour&&medida.jigger<=.001){stopGesture();say('pausa');}
      }else if(mode==='descartar'){
        if(gesture?.kind==='vaso'){
          if(medida.descartarVaso(dt*2.5)){
            if(!gesture.dumpStarted){gesture.dumpStarted=true;say('rehacer',true);pulse();}
            lastIntensity='';
          }
        }else if(medida.descartar(dt*1.15))say('descartar');
      }
      if(idle>4.5){say('duda');idle=0;}
      if(pendingEvent&&speechTime-lastSpeech>=2.4){const event=pendingEvent.event;pendingEvent=null;say(event);}
      if(seconds<=0)endRound(true);
      else paint();
    }
    physics(dt);
    frame=requestAnimationFrame(tick);
  }
  if(initial){heading.textContent='Tu medida sigue aquí.';say('terminar',true);}
  paint();frame=requestAnimationFrame(tick);
  return {node:root,destroy(){
    destroyed=true;stopGesture();cancelAnimationFrame(frame);speechAnimation?.cancel();actionAnimation?.cancel();countAnimation?.cancel();
    document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);
    removePointerListeners.forEach(remove=>remove());
  }};
}
