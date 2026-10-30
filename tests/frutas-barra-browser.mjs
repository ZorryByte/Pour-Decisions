import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'vite';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import {frutasHarnessHtml} from './frutas-barra-harness.mjs';
const aislado=process.argv.includes('--aislado');
const expose=`window.__barra={partida,render,abrir(){welcomeOpen=false;welcomeScreen.hidden=true;app.hidden=false;document.body.classList.remove('at-welcome');partida.phase='step';partida.step=1;partida.sel.alcohol=new Set(['Ron']);render();}};`;
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:19371,strictPort:false,hmr:false,watch:{ignored:['**/artifacts/**','**/tests/**','**/.taste-skill/**']}},define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'},plugins:[{name:'barra-test',enforce:'pre',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/__frutas-test'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(frutasHarnessHtml);}else next();});},transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js'))return code+expose;}}]});
let browser;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await server.listen();browser=await Browser.launch({extraArgs:['--disable-gpu']});
 mkdirSync('artifacts/frutas-barra',{recursive:true});
 for(const width of (process.argv.includes('--solo-movimiento')?[]:[1440,768,390])){
  const page=await browser.newPage({width,height:1000,reducedMotion:true});
  await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port+(aislado?'/__frutas-test':''),{settleMs:120});await page.eval(()=>window.__barra.abrir());
  await page.eval(()=>{window.__pointerTrace=[];for(const t of ['pointerdown','pointerup','pointercancel','lostpointercapture','dragstart'])document.addEventListener(t,e=>window.__pointerTrace.push({type:t,x:e.clientX,y:e.clientY,target:e.target.closest('button')?.className,phase:document.querySelector('.fruit-bar')?.dataset.phase}),true);});
  const click=async s=>page.eval(async q=>{document.querySelector(q).click();await new Promise(r=>setTimeout(r,30));},s);
  const phase=()=>page.eval(()=>document.querySelector('.fruit-bar')?.dataset.phase);
  const rect=async s=>page.eval(q=>{const r=document.querySelector(q).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};},s);
  const center=r=>({x:r.x+r.width/2,y:r.y+r.height/2});
  const move=async p=>page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y,button:'left',buttons:1});
  const down=async p=>{await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y,button:'none',buttons:0});await pause(20);await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',buttons:1,clickCount:1});await pause(20);};
  const up=async p=>{await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',buttons:0,clickCount:1});await pause(40);};
  const drag=async(from,to)=>{await down(from);for(let i=1;i<=8;i++){await move({x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8});await pause(18);}await up(to);};
  const approach=async(from,to)=>{await down(from);for(let i=1;i<=8;i++){await move({x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8});await pause(18);}};
  assert.equal(await phase(),'entrada');
  await page.screenshot({path:`artifacts/frutas-barra/entrada-${width}.png`,format:'png',fullPage:true});
  for(let i=0;i<200&&await phase()!=='elegir';i++)await pause(200);
  assert.equal(await phase(),'elegir');
  assert.ok(await page.eval(()=>document.querySelector('.fruit-bar-pick .fruit-icon').getBoundingClientRect().width)>=56,'Frutas grandes');
  assert.equal(await page.eval(()=>document.querySelector('.fruit-shaker').dataset.lid),'open');
  const conversationClear=await page.eval(()=>{
    const bubble=document.querySelector('.fruit-speech-deck').getBoundingClientRect();
    const vessels=document.querySelector('.fruit-theatre').getBoundingClientRect();
    return bubble.bottom<=vessels.top+1;
  });
  assert.ok(conversationClear,'La conversación tiene un espacio fuera de los recipientes');
  assert.equal(await page.eval(()=>document.querySelector('.fruit-any')===null&&!document.querySelector('.shaker-face')),true,'Sin sorpresa ni cara');
  const f=center(await rect('[data-pick="Fresa"]'));await down(f);await up(f);
  assert.equal(await page.eval(()=>window.__barra.partida.sel.fruta.size),0,'Un clic normal no selecciona');
  const target=center(await rect('.fruit-bowl'));
  await drag(center(await rect('[data-pick="Fresa"]')),target);
  await drag(center(await rect('[data-pick="Piña"]')),{x:target.x+35,y:target.y-15});
  if(await page.eval(()=>window.__barra.partida.sel.fruta.size)!==2)console.log(width,await page.eval(()=>window.__pointerTrace),await rect('.fruit-bowl'));
  assert.deepEqual(await page.eval(()=>[...window.__barra.partida.sel.fruta]),['Fresa','Piña'],'Arrastre real selecciona');
  assert.equal(await page.eval(()=>document.querySelector('.fruit-primary').disabled),true,'No se puede saltar la preparación con fruta');
  await click('.fruit-primary');assert.equal(await page.eval(()=>window.__barra.partida.step),1);
  assert.equal(await page.eval(()=>document.querySelectorAll('.fruit-body').length),2);
  await page.screenshot({path:`artifacts/frutas-barra/seleccion-${width}.png`,format:'png',fullPage:true});
  const snapshot=await page.eval(()=>{
    const clone=document.documentElement.cloneNode(true);
    clone.querySelectorAll('script,link[rel="stylesheet"],style').forEach(n=>n.remove());
    const css=[...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('\n');}catch{return '';}}).join('\n');
    const style=document.createElement('style');style.textContent=css;clone.querySelector('head').append(style);
    return '<!doctype html>'+clone.outerHTML;
  });
  writeFileSync(`artifacts/frutas-barra/inspeccion-${width}.html`,snapshot);
  assert.equal(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Sin desbordamiento '+width);
  const m=center(await rect('.fruit-muddler')),br=await rect('.fruit-bowl');
  await down(m);const mx=br.x+br.width*.5;
  for(let i=0;i<3;i++){await move({x:mx,y:br.y-35});await pause(280);await move({x:mx,y:br.y+35});}
  await up({x:mx,y:br.y+35});assert.equal(await phase(),'jugo','Machacado físico');
  assert.equal(await page.eval(()=>document.querySelectorAll('.fruit-body').length),0,'La fruta desaparece al terminar');
  assert.equal(await page.eval(()=>document.querySelectorAll('.fruit-pulp i').length),0,'El jugo tiene un solo color');
  assert.equal(await page.eval(()=>!document.querySelector('.fruit-shelf').hidden&&!document.querySelector('.fruit-bowl').hidden),true);
  await page.screenshot({path:`artifacts/frutas-barra/jugo-${width}.png`,format:'png',fullPage:true});
  if(width===1440){
    const amount=await page.eval(()=>document.querySelector('.fruit-bowl').dataset.juiceAmount);
    await click('[data-pick="Mango"]');
    assert.equal(await page.eval(()=>document.querySelector('.fruit-bowl').dataset.juiceAmount),amount,'Añadir conserva el jugo anterior');
    for(let i=0;i<3;i++)await click('.fruit-muddler');
    assert.equal(await page.eval(()=>Number(document.querySelector('.fruit-bowl').dataset.juiceAmount)),3);
    await click('[data-pick="Mango"]');
  }
  const bowlRect=await rect('.fruit-bowl'),shakeRect=await rect('.fruit-shaker');
  const pourTarget={x:shakeRect.x+shakeRect.width/2,y:shakeRect.y+shakeRect.height*.25};
  await approach({x:bowlRect.x+15,y:bowlRect.y+bowlRect.height-20},pourTarget);
  assert.equal(await phase(),'agitar','Se vierte sin soltar el mouse');await up(pourTarget);
  await pause(50);assert.equal(await phase(),'agitar','Verter arrastrando el recipiente');
  assert.equal(await page.eval(()=>document.querySelector('.fruit-shaker').dataset.lid),'closed');
  if(width===1440){
    assert.equal(await page.eval(()=>document.querySelector('.fruit-bar').dataset.poured),'2');
    await click('[data-pick="Mango"]');
    assert.equal(await page.eval(()=>document.querySelector('.fruit-bar').dataset.poured),'2','Conserva la mezcla de la coctelera');
    for(let i=0;i<3;i++)await click('.fruit-muddler');
    const bowlAgain=await rect('.fruit-bowl'),shakerAgain=await rect('.fruit-shaker');
    await drag({x:bowlAgain.x+15,y:bowlAgain.y+bowlAgain.height-20},{x:shakerAgain.x+shakerAgain.width/2,y:shakerAgain.y+shakerAgain.height*.25});
    await pause(50);
    assert.equal(await page.eval(()=>document.querySelector('.fruit-bar').dataset.poured),'3');
    await click('[data-pick="Mango"]');
    assert.equal(await phase(),'agitar');
  }
  const s=center(await rect('.fruit-shaker'));await down(s);
  for(const dx of [35,-35,35,-35,35,-35,35]){await move({x:s.x+dx,y:s.y});await pause(35);}
  await up(s);assert.equal(await phase(),'mareo','Agitar con el mouse');
  await page.screenshot({path:`artifacts/frutas-barra/mareo-${width}.png`,format:'png',fullPage:true});
  const glassTarget=center(await rect('.fruit-glass'));
  await approach(center(await rect('.fruit-shaker')),glassTarget);
  assert.equal(await phase(),'servido','Se sirve al acercar, antes de soltar');await up(glassTarget);await pause(50);
  assert.equal(await phase(),'servido','Servir acercando la coctelera al vaso');
  assert.equal(await page.eval(()=>document.querySelector('.fruit-primary').disabled),false,'Preparación terminada permite avanzar');
  assert.equal(await page.eval(()=>document.querySelector('.fruit-shaker').dataset.cap),'closed');
  assert.deepEqual(await page.eval(()=>[...window.__barra.partida.sel.fruta]),['Fresa','Piña'],'Los gestos no cambian gustos');
  assert.deepEqual(await page.eval(()=>[...window.__barra.partida.sel.alcohol]),['Ron']);
  await click('.fruit-edit');
  await click('[data-pick="Piña"]');
  assert.deepEqual(await page.eval(()=>[...window.__barra.partida.sel.fruta]),['Fresa'],'Devolver a la mesa retira');
  for(const name of ['Piña','Mango','Coco','Naranja'])await click(`[data-pick="${name}"]`);
  await click('[data-pick="Sandía"]');assert.equal(await page.eval(()=>window.__barra.partida.sel.fruta.size),5);
  assert.match(await page.eval(()=>document.querySelector('.fruit-error').textContent),/Cinco/);
  for(const name of await page.eval(()=>[...window.__barra.partida.sel.fruta]))await click(`[data-pick="${name}"]`);
  await page.eval(()=>{window.__noFruit=[];const root=document.querySelector('.fruit-bar');new MutationObserver(()=>{const text=[...root.querySelectorAll('.fruit-character-bubble:not([hidden])')].map(n=>n.textContent).join('');if(text)window.__noFruit.push(text);}).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-speaker']});});
  await click('.fruit-primary');assert.equal(await phase(),'sin-fruta');
  assert.equal(await page.eval(()=>window.__barra.partida.step),1,'Espera a que termine el intercambio sin fruta');
  for(let i=0;i<180&&await page.eval(()=>window.__barra.partida.step)===1;i++)await pause(100);
  assert.equal(await page.eval(()=>window.__barra.partida.step),2);
  assert.ok(await page.eval(()=>window.__noFruit.some(t=>t.includes('¿Realmente sin fruta?'))&&window.__noFruit.some(t=>t.includes('Shh, déjalo. Él sabe lo que hace.'))));
  await page.eval(()=>{window.__barra.partida.step=1;window.__barra.render();});
  assert.equal(await page.eval(()=>window.__barra.partida.sel.fruta.size),0);
  assert.equal(await page.eval(()=>document.querySelectorAll('.fruit-drag-ghost').length),0);
  await page.close();console.log('PASS barra '+width+'px: arrastrar, caída, machacar, verter, agitar, servir, retirar y conservar elecciones.');
 }
 // Animación real: orden de turnos, chorro y vaciado gradual del vaso.
 const animated=await browser.newPage({width:1440,height:1000});
 await animated.send('Network.enable');await animated.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
 await animated.goto('http://127.0.0.1:'+server.httpServer.address().port+(aislado?'/__frutas-test':''),{settleMs:120});
 await animated.eval(()=>{window.__barra.abrir();window.__turns=[];const r=document.querySelector('.fruit-bar');new MutationObserver(()=>window.__turns.push([r.dataset.phase,r.dataset.speaker])).observe(r,{attributes:true,attributeFilter:['data-phase','data-speaker']});});
 await pause(380);
 assert.ok(await animated.eval(()=>document.querySelectorAll('.fruit-word').length>1),'El texto se revela palabra a palabra');
 const reveal=await animated.eval(()=>[...document.querySelectorAll('.fruit-word')].map(n=>getComputedStyle(n).opacity));
 assert.ok(reveal.some(o=>Number(o)<1),'La frase no aparece completa de golpe');
 let pouring=false;
 for(let i=0;i<200;i++){
  const state=await animated.eval(()=>({phase:document.querySelector('.fruit-bar').dataset.phase,stream:document.querySelector('.fruit-fluid-overlay')?.style.opacity}));
  if(state.phase==='traspaso'&&state.stream==='1'){pouring=true;break;}await pause(100);
 }
 assert.ok(pouring,'Existe un chorro visible durante el traspaso');
 const during=await animated.eval(()=>({y:Number(document.querySelector('.fruit-glass .liquid').getAttribute('y')),path:document.querySelector('.fluid-ribbon').getAttribute('d')}));
 assert.match(during.path,/^M[\d.-]+,[\d.-]+ Q/);
 await animated.screenshot({path:'artifacts/frutas-barra/vertido-1440.png',format:'png',fullPage:true});
 for(let i=0;i<200&&await animated.eval(()=>document.querySelector('.fruit-bar').dataset.phase)!=='elegir';i++)await pause(150);
 assert.equal(await animated.eval(()=>document.querySelector('.fruit-bar').dataset.phase),'elegir');
 assert.equal(await animated.eval(()=>Number(document.querySelector('.fruit-glass .liquid').getAttribute('y'))),168,'El vaso se vacía');
 const turns=await animated.eval(()=>window.__turns);
 assert.ok(turns.some(([p,s])=>p==='entrada'&&s==='vaso')&&turns.some(([p,s])=>p==='entrada'&&s==='coctelera')&&turns.some(([p,s])=>p==='recibido'&&s==='coctelera')&&turns.some(([p,s])=>p==='despedida'&&s==='vaso'));
 assert.equal(await animated.eval(()=>document.querySelector('.fruit-fluid-overlay')===null),true,'Sin chorro residual');
 // Lanzar fuera del recipiente produce caída y rebote, sin marcar una preferencia.
 const throwPoints=await animated.eval(()=>{
   const source=document.querySelector('[data-pick="Sandía"]').getBoundingClientRect(),bench=document.querySelector('.fruit-theatre').getBoundingClientRect();
   return {from:{x:source.x+source.width/2,y:source.y+source.height/2},to:{x:bench.x+bench.width*.45,y:bench.y+bench.height*.65},before:[...window.__barra.partida.sel.fruta]};
 });
 await animated.send('Input.dispatchMouseEvent',{type:'mouseMoved',...throwPoints.from,buttons:0});
 await animated.send('Input.dispatchMouseEvent',{type:'mousePressed',...throwPoints.from,button:'left',buttons:1,clickCount:1});
 for(let i=1;i<=6;i++){await animated.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:throwPoints.from.x+(throwPoints.to.x-throwPoints.from.x)*i/6,y:throwPoints.from.y+(throwPoints.to.y-throwPoints.from.y)*i/6,button:'left',buttons:1});await pause(20);}
 await animated.send('Input.dispatchMouseEvent',{type:'mouseReleased',...throwPoints.to,button:'left',buttons:0,clickCount:1});
 assert.ok(await animated.eval(()=>document.querySelector('.fruit-drag-ghost')),'El lanzamiento sigue después de soltar');
 await pause(120);
 assert.ok(await animated.eval(y=>parseFloat(document.querySelector('.fruit-drag-ghost').style.top)>y,throwPoints.to.y),'La fruta cae por gravedad');
 await pause(1100);
 assert.equal(await animated.eval(()=>document.querySelectorAll('.fruit-drag-ghost').length),0,'El lanzamiento se limpia al regresar');
 assert.deepEqual(await animated.eval(()=>[...window.__barra.partida.sel.fruta]),throwPoints.before,'Jugar fuera del recipiente no marca gustos');
 // El motor de tapa se verifica también con movimiento completo y una interrupción.
 const lidResult=await animated.eval(async()=>{
   const {cocteleraMarkup,createCocteleraMotion}=await import('/src/features/juego-trivia/etapas/frutas/coctelera.js');
   const button=document.createElement('button');button.innerHTML=cocteleraMarkup();button.style.cssText='position:fixed;left:0;top:0;width:180px;visibility:hidden';document.body.append(button);
   const motion=createCocteleraMotion(button),states=[];
   for(const method of ['open','close','openCap','closeCap']){
     const wait=new Promise(resolve=>motion[method](resolve));
     states.push([method,button.dataset.lid,button.dataset.cap]);await wait;
   }
   motion.open();await new Promise(r=>setTimeout(r,120));await new Promise(resolve=>motion.close(resolve));
   const lid=button.querySelector('.shaker-lid'),m=new DOMMatrix(getComputedStyle(lid).transform);
   const closed=button.dataset.lid==='closed'&&Math.abs(m.e)<.1&&Math.abs(m.f)<.1;
   motion.destroy();button.remove();return {states,closed};
 });
 assert.ok(lidResult.closed,'Una apertura interrumpida vuelve a cerrar completamente');
 assert.deepEqual(lidResult.states.map(s=>s[0]),['open','close','openCap','closeCap']);
 assert.equal(lidResult.states[0][1],'opening');assert.equal(lidResult.states[1][1],'closing');
 assert.equal(lidResult.states[2][2],'opening');assert.equal(lidResult.states[3][2],'closing');
 await animated.close();console.log('PASS movimiento: turnos, chorro conectado, vaciado gradual, tapa/tapón fluidos e interrupción segura.');
}finally{if(browser)await browser.close();await server.close();}


