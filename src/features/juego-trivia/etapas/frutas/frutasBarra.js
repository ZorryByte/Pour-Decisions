import './frutasBarra.css';
import {elegirConversacion} from './frutasDialogos.js';
import {createMezclaFrutas} from './frutasMezcla.js';
import {cocteleraMarkup,createCocteleraMotion} from './coctelera.js';
import {createConversacion,ritmoPalabras} from './frutasConversacion.js';

// El estado de preparación es efímero. Solo el ViewModel modifica las preferencias.
export function createFrutasBarra({el, groups, asItem, viewModel, selected, bases, any, maxPick, fruitIconNode, glassBuild, color, onChange, onNext, onBack}){
  let fase = 'entrada', sacudidas = 0, giro = 0, destruido = false;
  let arrastre = null, frame = 0, lastFrame = 0, fluidFrame = 0;
  let speakingAnimation = null;
  const animations = new Set();
  const flyingFruits = new Set();
  const bodies = new Map();
  const mezcla=createMezclaFrutas();
  const timers = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = el('section', {class:'fruit-bar', 'aria-labelledby':'stage-q'});
  const actors = el('div', {class:'fruit-actors'});
  const glassLine=el('p',{class:'fruit-speech-line'});
  const shakerLine=el('p',{class:'fruit-speech-line'});
  const glassBubble=el('div',{class:'fruit-character-bubble glass-bubble',role:'status','aria-live':'polite','aria-label':'Vaso'},glassLine);
  const shakerBubble=el('div',{class:'fruit-character-bubble shaker-bubble',role:'status','aria-live':'polite','aria-label':'Coctelera'},shakerLine);
  const stage = el('div', {class:'fruit-theatre'});
  const glassWrap = el('div', {class:'fruit-glass'});
  const glass = glassBuild();
  glassWrap.append(glass);
  // El vaso conserva su dibujo original: su movimiento y su voz le dan vida.
  const shaker = el('button', {type:'button', class:'fruit-shaker', 'aria-label':'Coctelera. Agárrala y muévela de lado a lado para agitar; acércala al vaso para servir.', disabled:true});
  shaker.innerHTML = cocteleraMarkup();
  const lidMotion = createCocteleraMotion(shaker,{reduced});
  glass.querySelector(':scope > ellipse[cy="181"]')?.setAttribute('opacity','0');
  const speechDeck=el('div',{class:'fruit-speech-deck'},glassBubble,shakerBubble);
  const glassActor=el('div',{class:'fruit-character glass-character'},el('div',{class:'fruit-ground-shadow','aria-hidden':'true'}),glassWrap);
  const shakerActor=el('div',{class:'fruit-character shaker-character'},el('div',{class:'fruit-ground-shadow','aria-hidden':'true'}),shaker);
  stage.append(glassActor,shakerActor);
  actors.append(speechDeck,stage,el('p',{class:'fruit-base-note'},'Tu base: ' + bases.join(' · ')));
  const work = el('div', {class:'fruit-work'});
  const heading = el('h1',{id:'stage-q',tabindex:'-1'},'Pon tus frutas favoritas en la bandeja.');
  const hint = el('p',{class:'fruit-hint'},'Arrastra tus favoritas al recipiente. Para quitar una, devuélvela a la mesa. Hasta ' + maxPick + '.');
  const shelf = el('div',{class:'fruit-shelf',role:'group','aria-label':'Frutas disponibles'});
  const count = el('p',{class:'fruit-count',role:'status'});
  const error = el('p',{class:'fruit-error',role:'alert'});
  const bowl = el('div',{class:'fruit-bowl','aria-label':'Recipiente de preparación'});
  const pulp = el('div',{class:'fruit-pulp','aria-hidden':'true'});
  const pieces = el('div',{class:'fruit-pieces','aria-hidden':'true'});
  const muddler = el('button',{type:'button',class:'fruit-muddler','aria-label':'Machacador. Agárralo y presiona sobre la fruta.'});
  muddler.innerHTML='<svg viewBox="0 0 52 180" aria-hidden="true"><defs><linearGradient id="muddler-metal"><stop stop-color="#71816a"/><stop offset=".4" stop-color="#e1e6cd"/><stop offset=".65" stop-color="#b0bca4"/><stop offset="1" stop-color="#6a7b63"/></linearGradient></defs><path d="M19 71h14l4 75H15Z" fill="url(#muddler-metal)" stroke="#a4b196" stroke-width="1.5"/><rect x="15" y="7" width="22" height="73" rx="11" fill="#bc6c25"/><path d="M21 17v48" stroke="#dda15e" stroke-width="3" stroke-linecap="round"/><path d="M15 140h22l7 16v13H8v-13Z" fill="#394b30" stroke="#c8d0b0" stroke-width="1.5"/><path d="M11 169h30l-3 5h-4l-3-5-3 5h-4l-3-5-3 5h-4Z" fill="#c8d0b0"/></svg>';
  const bowlGrip = el('span',{class:'fruit-bowl-grip','aria-hidden':'true'},'Agarra el borde para verter');
  bowl.append(pulp,pieces,bowlGrip);
  const prepHint = el('p',{class:'fruit-prep-hint'});
  const primary = el('button',{type:'button',class:'btn fruit-primary'});
  const secondary = el('button',{type:'button',class:'text fruit-edit'},'Volver a preparar');
  const back = el('button',{type:'button',class:'text'},'Atrás');
  const prepArea=el('div',{class:'fruit-prep-area'},bowl,muddler);
  const controls = el('div',{class:'fruit-controls'},primary,secondary,back);
  work.append(heading,hint,shelf,count,error,prepArea,prepHint,controls);
  root.append(actors,work);
  // Evita que el arrastre nativo de SVG/texto le quite la captura al gesto físico.
  root.addEventListener('dragstart',event=>event.preventDefault());
  const fluid=document.createElementNS('http://www.w3.org/2000/svg','svg');
  fluid.setAttribute('class','fruit-fluid-overlay');fluid.setAttribute('aria-hidden','true');
  fluid.innerHTML='<path class="fluid-ribbon" fill="none" stroke-linecap="round"/><path class="fluid-light" fill="none" stroke="#fefae0" stroke-opacity=".45" stroke-width="2"/><ellipse class="fluid-splash" rx="9" ry="3"/>';
  const ribbon=fluid.querySelector('.fluid-ribbon'),light=fluid.querySelector('.fluid-light'),splash=fluid.querySelector('.fluid-splash');
  const conversation=createConversacion({show:say});
  function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);if(!destruido)fn();},ms);timers.add(id);}
  function say(speaker,text){
    speakingAnimation?.cancel();
    const isGlass=speaker==='Vaso',line=isGlass?glassLine:shakerLine,node=isGlass?glass:shaker.querySelector('svg');
    glassBubble.hidden=!isGlass;shakerBubble.hidden=isGlass;
    line.removeAttribute('aria-label');line.textContent=text;root.dataset.speaker=isGlass?'vaso':'coctelera';
    if(reduced)return;
    // Las palabras y el cuerpo siguen el mismo pulso que el vaso del inicio.
    const {beats,duration}=ritmoPalabras(text),frames=[{transform:'none',offset:0}];
    line.setAttribute('aria-label',text);line.replaceChildren();
    beats.forEach((beat,i)=>{
      const word=el('span',{class:'fruit-word','aria-hidden':'true'},beat.word);word.style.setProperty('--word-delay',beat.at+'ms');
      if(i)line.append(document.createTextNode(' '));line.append(word);
      frames.push({offset:beat.at/duration,transform:'none'},{offset:(beat.at+beat.length*.4)/duration,transform:'translateY(-4px) rotate('+beat.angle+'deg) scale(1.015,.99)'},{offset:(beat.at+beat.length)/duration,transform:'none'});
    });
    frames.push({transform:'none',offset:1});
    frames.forEach(f=>f.easing='ease-in-out');
    speakingAnimation=node.animate(frames,{duration,easing:'linear'});
  }
  function talk(tipo){
    conversation.play(elegirConversacion(tipo));
  }
  function pulse(node,keyframes,duration=500){if(!reduced && node.animate)node.animate(keyframes,{duration,easing:'cubic-bezier(.16,1,.3,1)'});}
  function updateLiquid(){glass.querySelectorAll('.liquid').forEach(n=>n.setAttribute('fill',color()));root.style.setProperty('--mix-color',color());}
  function pick(value){
    const result=viewModel.toggle(value);
    if(result.status==='limit'){error.textContent='Cinco es el tope. Quita una de la bandeja para poner otra.';return;}
    error.textContent='';root.classList.remove('is-dizzy');
    if(selected().has(value))mezcla.agregar(value);else mezcla.quitar(value);
    onChange();refreshSelection();updateLiquid();
    setPhase(mezcla.cantidad()>0?'jugo':!bodies.size&&mezcla.coctelera.size?'agitar':'elegir');
  }
  const items=groups.slice(1).flatMap(g=>g.o.map(asItem));
  for(const item of items){
    const b=el('button',{type:'button',class:'fruit-bar-pick','data-pick':item.v,'aria-pressed':'false',draggable:'false'});
    b.append(fruitIconNode(item.v),el('span',{},item.t));
    b.addEventListener('click',e=>{if(e.detail===0)pick(item.v);});shelf.append(b);
  }
  function refreshSelection(){
    for(const b of shelf.children){const on=viewModel.isSelected(b.dataset.pick);b.setAttribute('aria-pressed',String(on));b.classList.toggle('is-on',on);}
    count.textContent=any()?'La barra elige la fruta por ti.':selected().size ? selected().size+' de '+maxPick+' favoritas':'La bandeja está vacía. La fruta es opcional.';
    for(const name of [...mezcla.progreso.keys()])if(!selected().has(name))mezcla.quitar(name);
    for(const [name,body] of bodies){if(!selected().has(name)){body.node.remove();bodies.delete(name);}}
    for(const name of selected()){
      mezcla.agregar(name);
      if(!bodies.has(name)&&mezcla.progreso.get(name)<1){
        const node=el('button',{type:'button',class:'fruit-body','data-fruit-name':name,'aria-label':'Quitar '+name},fruitIconNode(name));
        node.addEventListener('click',e=>{if(e.detail===0)pick(name);});pieces.append(node);
        bodies.set(name,{node,x:45+Math.random()*Math.max(20,pieces.clientWidth-100),y:8,vx:(Math.random()-.5)*3,vy:0,angle:0});
      }
    }
    renderJuice();bowl.classList.toggle('is-empty',!bodies.size&&!mezcla.cantidad());startPhysics();
  }
  function renderJuice(){
    const amount=mezcla.cantidad();
    pulp.style.background=mezcla.colorRecipiente();pulp.style.height=(amount?16+Math.min(50,amount*20):0)+'px';pulp.style.opacity=amount?'1':'0';
    bowl.dataset.juiceColor=mezcla.colorRecipiente();bowl.dataset.juiceAmount=String(amount);
    root.dataset.prepared=String([...mezcla.progreso.values()].filter(p=>p>=1).length);
    root.dataset.poured=String(mezcla.coctelera.size);
  }
  function setPhase(value){
    const previous=fase;
    fase=value;root.dataset.phase=value;shaker.disabled=!['agitar','mareo'].includes(value);
    const intro=['entrada','traspaso','recibido','despedida'].includes(value);
    work.hidden=intro||root.classList.contains('is-intro');
    shelf.hidden=false;hint.hidden=false;count.hidden=false;bowl.hidden=false;
    secondary.hidden=!['servido','agitar','mareo'].includes(value);
    primary.hidden=intro;primary.textContent='Siguiente';
    const busy=['traspaso','incorporando','cerrando','sirviendo','sin-fruta'].includes(value);
    primary.disabled=busy||(selected().size>0&&value!=='servido');
    primary.setAttribute('aria-describedby','fruit-preparation-progress');
    for(const button of shelf.children)button.disabled=busy;
    muddler.disabled=!bodies.size||!['elegir','preparar','jugo'].includes(value);
    const names=[...selected()];
    const crushed=names.filter(n=>!['Limón','Naranja','Coco','Maracuyá','Menta'].includes(n));
    const instructions=[];
    if(crushed.length)instructions.push('Machaca los trozos para liberar su jugo.');
    if(names.some(n=>['Limón','Naranja'].includes(n)))instructions.push('Los cítricos van exprimidos.');
    if(names.includes('Coco'))instructions.push('El coco entra como crema.');
    if(names.includes('Maracuyá'))instructions.push('El maracuyá entra como pulpa.');
    if(names.includes('Menta'))instructions.push('La menta se presiona suavemente para liberar su aroma.');
    prepHint.textContent=value==='preparar'?instructions.join(' '):value==='jugo'?'Puedes seguir machacando, añadir otra fruta o llevar el recipiente a la coctelera.':value==='agitar'?'Agita la coctelera o añade otra fruta. Tu mezcla se conserva.':value==='mareo'?'Acerca la coctelera al vaso para servir. Dale un segundo, que se mareó.':value==='servido'?'Ya está. Sigue para descubrir qué cóctel va contigo.':value==='elegir'?(names.length?'Agarra el machacador y presiona hacia abajo sobre la fruta.':'Tus favoritas van en el recipiente. La fruta es opcional.'):'';
    prepHint.id='fruit-preparation-progress';
    if(previous!==value){if(value==='preparar')talk('preparar');if(value==='agitar')talk('agitar');if(value==='servido')talk('servido');}
  }
  function svgPoint(svg,x,y){return new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());}
  function bowlSpout(){
    const r=bowl.getBoundingClientRect(),w=bowl.offsetWidth,h=bowl.offsetHeight;
    const matrix=new DOMMatrix(getComputedStyle(bowl).transform==='none'?undefined:getComputedStyle(bowl).transform);
    const corners=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
    const p=new DOMPoint(w*.09,45).matrixTransform(matrix);
    return {x:r.left+p.x-Math.min(...corners.map(c=>c.x)),y:r.top+p.y-Math.min(...corners.map(c=>c.y))};
  }
  const originalY=Number(glass.querySelector('.liquid').getAttribute('y'));
  function glassLevel(amount){
    const y=168-(168-originalY)*Math.max(0,Math.min(1,amount));
    for(const selector of ['.liquid','.liquid-depth'])glass.querySelector(selector)?.setAttribute('y',String(y));
    glass.querySelector('.surface')?.setAttribute('cy',String(y));
    glass.querySelector('.ice-float')?.setAttribute('transform','translate(0 '+Math.max(-28,Math.min(42,y-102))+')');
  }
  function liquidFlight(source,sourcePoint,targetPoint,angle,liquid,onProgress,done){
    speakingAnimation?.cancel();conversation.cutAfterCurrent();
    if(reduced){source.style.transform='';onProgress(1);done();return;}
    source.classList.add('is-airborne');
    const startTransform=source.style.transform||'none';
    source.getAnimations().forEach(a=>a.cancel());source.style.transform='';
    const r=source.getBoundingClientRect(),p=sourcePoint(),target=targetPoint();
    const ox=r.left+r.width/2,oy=r.top+r.height*.7,rad=angle*Math.PI/180;
    const rotated={x:ox+(p.x-ox)*Math.cos(rad)-(p.y-oy)*Math.sin(rad),y:oy+(p.x-ox)*Math.sin(rad)+(p.y-oy)*Math.cos(rad)};
    const dx=target.x-rotated.x,dy=target.y-55-rotated.y;
    source.style.transformOrigin='50% 70%';
    const tilt='translate('+dx+'px,'+dy+'px) rotate('+angle+'deg)';
    const animation=source.animate([{transform:startTransform,offset:0,easing:'cubic-bezier(.16,1,.3,1)'},{transform:tilt,offset:.28,easing:'linear'},{transform:tilt,offset:.76,easing:'linear'},{transform:tilt,offset:.82,easing:'cubic-bezier(.4,0,.2,1)'},{transform:'none',offset:1}],{duration:1900,easing:'linear',fill:'none'});
    animations.add(animation);document.body.append(fluid);
    ribbon.setAttribute('stroke',liquid);ribbon.setAttribute('stroke-width',source===bowl?'9':'6');splash.setAttribute('fill',liquid);
    const started=performance.now();
    function draw(now){
      if(destruido)return;
      const t=Math.min(1,(now-started)/1900),amount=Math.max(0,Math.min(1,(t-.3)/.44));
      onProgress(amount);
      if(source===glassWrap){
        const matrix=new DOMMatrix(getComputedStyle(source).transform==='none'?undefined:getComputedStyle(source).transform);
        const tiltAngle=Math.atan2(matrix.b,matrix.a)*180/Math.PI,y=Number(glass.querySelector('.liquid').getAttribute('y'));
        glass.querySelector('.liquid-body').setAttribute('transform','rotate('+(-tiltAngle)+' 80 '+y+')');
        glass.querySelector('.surface').setAttribute('transform','rotate('+(-tiltAngle)+' 80 '+y+')');
        for(const n of glass.querySelectorAll('.liquid,.liquid-depth')){n.setAttribute('x','-100');n.setAttribute('width','360');}
      }
      // El chorro se corta y cae la última gota antes de retirar el recipiente.
      const from=sourcePoint(),to=targetPoint(),active=t>.3&&t<.74;
      fluid.style.opacity=active?'1':'0';
      const wobble=Math.sin(now*.035)*1.5;
      const d='M'+from.x+','+from.y+' Q'+(to.x+wobble)+','+(from.y+22)+' '+to.x+','+to.y;
      ribbon.setAttribute('d',d);light.setAttribute('d',d);splash.setAttribute('cx',to.x);splash.setAttribute('cy',to.y);splash.setAttribute('rx',String(7+Math.sin(now*.03)*3));
      if(t<1)fluidFrame=requestAnimationFrame(draw);
      else{
        fluidFrame=0;fluid.remove();animations.delete(animation);source.style.transform='';source.classList.remove('is-airborne');
        glass.querySelector('.liquid-body').removeAttribute('transform');glass.querySelector('.surface').removeAttribute('transform');
        for(const n of glass.querySelectorAll('.liquid,.liquid-depth')){n.setAttribute('x','28');n.setAttribute('width','104');}
        done();
      }
    }
    fluidFrame=requestAnimationFrame(draw);
  }
  function mash(){
    if(!bodies.size||!['elegir','preparar','jugo'].includes(fase))return;
    if(fase==='elegir')setPhase('preparar');
    if(!arrastre)pulse(muddler,[{transform:'translateY(-18px) rotate(-14deg)'},{transform:'translateY(24px) rotate(10deg)',offset:.5},{transform:'none'}],380);
    for(const [name,body]of bodies){
      const progress=mezcla.machacar(name);body.vy=-3;body.vx+=(Math.random()-.5)*5;
      body.node.style.setProperty('--squash',String(progress*.7));
      if(progress>=1){body.node.remove();bodies.delete(name);}
    }
    renderJuice();startPhysics();
    if(!bodies.size){talk('jugo');setPhase('jugo');}else setPhase('preparar');
  }
  function shake(amount=1){
    if(fase!=='agitar')return;
    sacudidas+=amount;
    if(arrastre?.type!=='shaker')pulse(shaker,[{transform:'translateX(-16px) rotate(-14deg)'},{transform:'translateX(16px) rotate(14deg)'},{transform:'none'}],420);
    if(sacudidas>=3){setPhase('mareo');talk('mareo');root.classList.add('is-dizzy');later(()=>root.classList.remove('is-dizzy'),4200);}
  }
  function pour(){
    if(!mezcla.cantidad()||!['elegir','preparar','jugo'].includes(fase))return;setPhase('incorporando');
    const juiceColor=mezcla.colorRecipiente();
    conversation.cutAfterCurrent();
    lidMotion.open(()=>liquidFlight(bowl,bowlSpout,()=>svgPoint(shaker.querySelector('svg'),110,84),-30,juiceColor,v=>{pulp.style.opacity=String(1-v);},()=>{
      mezcla.verter();renderJuice();sacudidas=0;
      if(bodies.size)setPhase('preparar');
      else{setPhase('cerrando');lidMotion.close(()=>setPhase('agitar'));}
    }));
  }
  function serve(){
    if(fase!=='mareo')return;setPhase('sirviendo');root.classList.remove('is-dizzy');
    const actualColor=mezcla.coctelera.size?mezcla.colorCoctelera():color();
    glass.querySelector('.liquid').setAttribute('fill',actualColor);
    conversation.cutAfterCurrent();
    lidMotion.openCap(()=>liquidFlight(shaker,()=>svgPoint(shaker.querySelector('svg'),110,45),()=>svgPoint(glass,80,24),-65,actualColor,glassLevel,()=>lidMotion.closeCap(()=>setPhase('servido'))));
  }
  primary.addEventListener('click',()=>{
    if(primary.disabled)return;
    if(selected().size){if(fase==='servido')onNext();return;}
    setPhase('sin-fruta');
    conversation.play(elegirConversacion('sinFruta'),()=>{if(!destruido&&!selected().size)onNext();});
  });
  secondary.textContent='Añadir otra fruta';
  secondary.addEventListener('click',()=>{shelf.querySelector('button')?.focus();});
  muddler.addEventListener('click',e=>{if(e.detail===0)mash();});
  shaker.addEventListener('click',e=>{if(e.detail===0){if(fase==='agitar')shake();else if(fase==='mareo')serve();}});
  back.addEventListener('click',onBack);
  function inside(rect,x,y,pad=0){return x>=rect.left-pad&&x<=rect.right+pad&&y>=rect.top-pad&&y<=rect.bottom+pad;}
  function near(point,x,y){return Math.hypot(point.x-x,point.y-y)<64;}
  function takeOverGesture(action){
    const held=arrastre;if(!held)return;
    arrastre=null;held.node.classList.remove('is-held');held.ghost?.remove();
    root.classList.remove('is-dragging');root.querySelectorAll('.is-drop-target').forEach(n=>n.classList.remove('is-drop-target'));
    if(root.hasPointerCapture(held.id))root.releasePointerCapture(held.id);
    action();
  }
  function tossFruit(held,x,y){
    if(!held.ghost||reduced)return;
    const ghost=held.ghost;held.ghost=null;ghost.getAnimations().forEach(a=>a.cancel());
    const home=held.node.getBoundingClientRect();
    const flight={ghost,id:0,x,y,vx:Math.max(-14,Math.min(14,held.vx)),vy:Math.max(-12,Math.min(8,held.vy)),angle:0,last:performance.now(),start:performance.now()};
    flyingFruits.add(flight);
    function remove(){cancelAnimationFrame(flight.id);ghost.remove();flyingFruits.delete(flight);}
    function step(now){
      if(destruido){remove();return;}
      const dt=Math.min(2,(now-flight.last)/16.67);flight.last=now;
      flight.vy+=.62*dt;flight.x+=flight.vx*dt;flight.y+=flight.vy*dt;flight.angle+=flight.vx*.8*dt;
      const floor=Math.min(innerHeight-50,bowl.getBoundingClientRect().bottom-18);
      if(flight.x<38||flight.x>innerWidth-38){flight.x=Math.max(38,Math.min(innerWidth-38,flight.x));flight.vx*=-.5;}
      if(flight.y>floor){flight.y=floor;flight.vy=-Math.abs(flight.vy)*.43;flight.vx*=.75;}
      ghost.style.left=flight.x+'px';ghost.style.top=flight.y+'px';ghost.style.transform='translate(-50%,-50%) rotate('+flight.angle+'deg)';
      if(flight.vy>0&&['elegir','preparar','jugo','agitar','servido'].includes(fase)&&inside(bowl.getBoundingClientRect(),flight.x,flight.y)){
        if(!selected().has(held.name))pick(held.name);
        const body=bodies.get(held.name),r=pieces.getBoundingClientRect();
        if(body){body.x=Math.max(28,Math.min(r.width-28,flight.x-r.left));body.y=Math.max(0,flight.y-r.top);body.vx=flight.vx;body.vy=flight.vy;startPhysics();}
        remove();return;
      }
      if(now-flight.start>650){
        const dx=home.left+home.width/2-flight.x,dy=home.top+home.height/2-flight.y;
        const animation=ghost.animate([{transform:ghost.style.transform,opacity:1},{transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) rotate(0deg) scale(.8)',opacity:0}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
        animations.add(animation);animation.finished.then(()=>{animations.delete(animation);remove();},remove);return;
      }
      flight.id=requestAnimationFrame(step);
    }
    flight.id=requestAnimationFrame(step);
  }
  function startPhysics(){if(!frame&&!destruido)frame=requestAnimationFrame(physics);}
  function physics(time){
    frame=0;if(destruido)return;
    const dt=Math.min(2,(time-lastFrame)/16.67||1);lastFrame=time;
    const w=pieces.clientWidth,h=pieces.clientHeight;if(w<1||h<1)return;
    let active=false;const list=[...bodies.values()];
    for(const b of list){
      if(b.held)continue;
      b.vy+=.34*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.vx*.6*dt;
      const floor=h-28; if(b.y>floor){b.y=floor;b.vy=Math.abs(b.vy)>.7?-b.vy*.44:0;b.vx*=.84;}
      if(b.x<28){b.x=28;b.vx=Math.abs(b.vx)*.55;}if(b.x>w-28){b.x=w-28;b.vx=-Math.abs(b.vx)*.55;}
      for(const other of list){if(other===b||other.held)continue;const dx=b.x-other.x,dy=b.y-other.y,d=Math.hypot(dx,dy);if(d>0&&d<50){const overlap=(50-d)*.5;b.x+=dx/d*overlap;b.y+=dy/d*overlap;b.vx+=dx/d*.08;}}
      b.node.style.transform='translate('+b.x+'px,'+b.y+'px) rotate('+b.angle+'deg)';
      active=active||Math.abs(b.vx)>.07||Math.abs(b.vy)>.3;
    }
    if(active&&!reduced)frame=requestAnimationFrame(physics);
  }
  root.addEventListener('pointerdown',e=>{
    if(arrastre||root.classList.contains('is-intro')||['incorporando','cerrando','sirviendo','sin-fruta'].includes(fase)||(e.pointerType==='mouse'&&e.button!==0))return;
    const fruit=e.target.closest('.fruit-bar-pick,.fruit-body');
    let type,node,name;
    if(fruit){type='fruit';node=fruit;name=fruit.dataset.pick||fruit.dataset.fruitName;}
    else if(e.target.closest('.fruit-muddler')&&!muddler.disabled){type='muddler';node=muddler;}
    else if(e.target.closest('.fruit-shaker')&&['agitar','mareo'].includes(fase)){type='shaker';node=shaker;}
    else if(e.target.closest('.fruit-bowl')){type='bowl';node=bowl;}
    if(!type)return;e.preventDefault();root.setPointerCapture(e.pointerId);
    arrastre={id:e.pointerId,type,node,name,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,vx:0,vy:0,direction:0,moved:false,pressAt:0};giro=0;
    if(type==='fruit'&&bodies.has(name))bodies.get(name).held=true;
    node.classList.add('is-held');root.classList.add('is-dragging');
    if(type==='fruit'){
      const ghost=el('div',{class:'fruit-drag-ghost','aria-hidden':'true'},fruitIconNode(name));document.body.append(ghost);arrastre.ghost=ghost;
      ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
      pulse(ghost,[{transform:'translate(-50%,-50%) scale(.8)'},{transform:'translate(-50%,-50%) scale(1.08)'},{transform:'translate(-50%,-50%) scale(1)'}],260);
    }
  });
  root.addEventListener('pointermove',e=>{
    const a=arrastre;if(!a||a.id!==e.pointerId)return;e.preventDefault();
    const dx=e.clientX-a.x,dy=e.clientY-a.y;a.vx=e.clientX-a.lastX;a.vy=e.clientY-a.lastY;
    a.moved=a.moved||Math.hypot(dx,dy)>7;
    if(a.type==='fruit'){
      a.ghost.style.left=e.clientX+'px';a.ghost.style.top=e.clientY+'px';
      a.ghost.style.transform='translate(-50%,-50%) rotate('+Math.max(-24,Math.min(24,a.vx*1.2))+'deg) scale('+(1+Math.min(.12,Math.abs(a.vx)*.004))+','+(1-Math.min(.08,Math.abs(a.vx)*.003))+')';
      bowl.classList.toggle('is-drop-target',inside(bowl.getBoundingClientRect(),e.clientX,e.clientY));
    }else if(a.type==='muddler'){
      muddler.style.transform='translate('+dx+'px,'+dy+'px) rotate(-8deg)';
      const r=muddler.getBoundingClientRect(),br=bowl.getBoundingClientRect();
      if(a.vy>3&&inside(br,r.left+r.width/2,r.bottom-12,10)&&performance.now()-a.pressAt>250){a.pressAt=performance.now();mash();}
    }else if(a.type==='bowl'){
      bowl.style.transform='translate('+dx+'px,'+dy+'px) rotate('+Math.max(-20,Math.min(20,dx*.08))+'deg)';
      shaker.classList.toggle('is-drop-target',mezcla.cantidad()>0&&inside(shaker.getBoundingClientRect(),e.clientX,e.clientY,25));
      if(mezcla.cantidad()>0&&['elegir','preparar','jugo'].includes(fase)&&near(svgPoint(shaker.querySelector('svg'),110,84),e.clientX,e.clientY))takeOverGesture(pour);
    }else if(a.type==='shaker'){
      shaker.style.transform='translate('+dx+'px,'+dy+'px) rotate('+Math.max(-18,Math.min(18,a.vx))+'deg)';
      if(fase==='agitar'&&Math.abs(a.vx)>10){const direction=Math.sign(a.vx);if(a.direction&&direction!==a.direction)giro++;a.direction=direction;if(giro>=5)shake(3);}
      glassWrap.classList.toggle('is-drop-target',fase==='mareo'&&inside(glassWrap.getBoundingClientRect(),e.clientX,e.clientY,25));
      if(fase==='mareo'&&inside(glassWrap.getBoundingClientRect(),e.clientX,e.clientY,40))takeOverGesture(serve);
    }
    a.lastX=e.clientX;a.lastY=e.clientY;
  });
  function release(e,cancel=false){
    const a=arrastre;if(!a||e.pointerId!==a.id)return;
    const sr=shaker.getBoundingClientRect();
    // También cuenta el desplazamiento al soltar: el navegador puede agrupar
    // pointermove durante un gesto rápido y entregar solo su posición final.
    if(!cancel&&(a.moved||Math.hypot(e.clientX-a.x,e.clientY-a.y)>7)){
      if(a.type==='fruit'){
        if(inside(bowl.getBoundingClientRect(),e.clientX,e.clientY,8)){
          if(!selected().has(a.name))pick(a.name);
          const b=bodies.get(a.name),r=pieces.getBoundingClientRect();
          if(b){b.x=Math.max(28,Math.min(r.width-28,e.clientX-r.left));b.y=Math.max(0,e.clientY-r.top);b.vx=Math.max(-9,Math.min(9,a.vx));b.vy=Math.min(8,a.vy);startPhysics();}
        }else if(inside(shelf.getBoundingClientRect(),e.clientX,e.clientY,12)&&selected().has(a.name))pick(a.name);
        else tossFruit(a,e.clientX,e.clientY);
      }else if(a.type==='bowl'&&mezcla.cantidad()>0&&inside(sr,e.clientX,e.clientY,35))pour();
      else if(a.type==='shaker'&&fase==='mareo'&&inside(glassWrap.getBoundingClientRect(),e.clientX,e.clientY,35))serve();
    }
    a.node.classList.remove('is-held');a.ghost?.remove();
    if(a.type==='fruit'&&bodies.has(a.name)){bodies.get(a.name).held=false;startPhysics();}
    if(a.type!=='fruit'&&!['incorporando','cerrando','sirviendo'].includes(fase)){
      const from=a.node.style.transform;
      a.node.style.transform='';
      if(!reduced&&from){
        const base=a.type==='muddler'?'rotate(12deg)':'none';
        const animation=a.node.animate([{transform:from},{transform:'translate('+(-a.vx*.55)+'px,'+(-a.vy*.4)+'px) rotate('+(-a.vx*.12)+'deg)',offset:.64},{transform:base}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});
        animations.add(animation);animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
      }
    }
    root.querySelectorAll('.is-drop-target').forEach(n=>n.classList.remove('is-drop-target'));root.classList.remove('is-dragging');arrastre=null;
  }
  root.addEventListener('pointerup',e=>release(e));root.addEventListener('pointercancel',e=>release(e,true));root.addEventListener('lostpointercapture',e=>release(e,true));
  refreshSelection();updateLiquid();setPhase('entrada');
  const entrada=elegirConversacion('apertura');
  root.classList.add('is-intro');
  glassBubble.hidden=true;shakerBubble.hidden=true;
  later(()=>{
    conversation.play(entrada.slice(0,2),()=>{
        setPhase('traspaso');
        lidMotion.open(()=>liquidFlight(glassWrap,()=>svgPoint(glass,113,24),()=>svgPoint(shaker.querySelector('svg'),110,84),60,color(),v=>glassLevel(1-v),()=>{
          setPhase('recibido');conversation.play([entrada[2]],()=>{
            setPhase('despedida');conversation.play([entrada[3]],()=>{
              root.classList.remove('is-intro');setPhase('elegir');talk('bandeja');startPhysics();
            });
          });
        }));
    });
  },80);
  return {node:root,destroy(){destruido=true;conversation.dispose();lidMotion.destroy();timers.forEach(clearTimeout);timers.clear();cancelAnimationFrame(frame);cancelAnimationFrame(fluidFrame);speakingAnimation?.cancel();animations.forEach(a=>a.cancel());for(const f of flyingFruits){cancelAnimationFrame(f.id);f.ghost.remove();}flyingFruits.clear();fluid.remove();arrastre?.ghost?.remove();root.getAnimations({subtree:true}).forEach(a=>a.cancel());}};
}

