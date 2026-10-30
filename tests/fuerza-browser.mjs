import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'vite';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

const expose=`window.__medida={partida,render,open(initial){welcomeOpen=false;welcomeScreen.hidden=true;app.hidden=false;document.body.classList.remove('at-welcome');partida.phase='step';partida.stage='fuerza';partida.sel.alcohol=new Set(['Whisky']);partida.sel.fuerza=new Set(initial?[initial]:[]);render();}};`;
const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false,watch:{ignored:['**/*']}},
  define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'},
  plugins:[{name:'medida-test',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js'))return code+expose;}}]});
let browser;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(page,fn,message,timeout=13000){const end=Date.now()+timeout;while(Date.now()<end){if(await page.eval(fn))return;await wait(40);}throw Error(message+'\n'+await page.eval(()=>document.body.innerText));}
const click=(page,s)=>page.eval(q=>{const n=document.querySelector(q);if(!n||n.disabled||n.hidden)throw Error('Control no disponible: '+q);n.click();},s);
const phase=page=>page.eval(()=>document.querySelector('.measure-game')?.dataset.phase);
const read=page=>page.eval(()=>({jigger:Number(document.querySelector('.measure-game')?.dataset.jigger),served:Number(document.querySelector('.measure-game')?.dataset.served)}));
async function center(page,s){return page.eval(q=>{const r=document.querySelector(q).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*.45};},s);}
const mouse=(page,type,p,buttons=1)=>page.viewport.mobile? page.send('Input.dispatchTouchEvent',{type:({mousePressed:'touchStart',mouseMoved:'touchMove',mouseReleased:'touchEnd'})[type],touchPoints:type==='mouseReleased'?[]:[{x:p.x,y:p.y,id:1}]}):page.send('Input.dispatchMouseEvent',{type,x:p.x,y:p.y,button:'left',buttons,clickCount:type==='mouseMoved'?0:1});
async function dragHold(page,from,to,ms){await mouse(page,'mousePressed',from);for(let i=1;i<=8;i++){await mouse(page,'mouseMoved',{x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8});await wait(20);}await wait(ms);if(page.viewport.width===1440){const action=await page.eval(()=>document.querySelector('.measure-game').dataset.action);await page.screenshot({path:`artifacts/fuerza/movimiento-${action}-1440.png`,format:'png',fullPage:true});}await mouse(page,'mouseReleased',to,0);}
try{
  mkdirSync('artifacts/fuerza',{recursive:true});await server.listen();browser=await Browser.launch({extraArgs:['--disable-gpu']});
  const url='http://127.0.0.1:'+server.httpServer.address().port;
  for(const width of [1440,768,390]){
    const page=await browser.newPage({width,height:1000,mobile:width===390,reducedMotion:width!==1440});
    await page.goto(url,{settleMs:150});await page.eval(()=>window.__medida.open());
    assert.equal(await phase(page),'entrada');
    await wait(850);await page.screenshot({path:`artifacts/fuerza/entrada-${width}.png`,format:'png',fullPage:true});
    assert.equal(await page.eval(()=>document.querySelector('.measure-start')===null),true,'Sin botón de inicio');
    await until(page,()=>document.querySelector('.measure-game')?.dataset.phase==='cuenta','Entrada automática');
    const countSamples=await page.eval(async()=>{const samples=[];while(document.querySelector('.measure-game').dataset.phase==='cuenta'){const n=document.querySelector('.measure-countdown');samples.push({text:n.textContent,opacity:Number(getComputedStyle(n).opacity),hidden:n.hidden});await new Promise(r=>setTimeout(r,40));}return samples;});
    assert.ok(countSamples.every(s=>s.opacity===1&&!s.hidden),'Cuenta regresiva sin parpadeos');
    assert.ok(new Set(countSamples.map(s=>s.text)).size>=3,'Números y salida visibles');await until(page,()=>document.querySelector('.measure-game')?.dataset.phase==='jugando','Arranca la ronda');
    assert.match(await page.eval(()=>document.querySelector('.measure-line').textContent),/Shelby/);
    assert.equal(await page.eval(()=>window.__medida.partida.sel.fuerza.size),0);
    const bottle=await center(page,'.measure-bottle');
    await mouse(page,'mousePressed',bottle);await wait(1500);if(width===1440)await page.screenshot({path:'artifacts/fuerza/botella-sirviendo-1440.png',format:'png',fullPage:true});await mouse(page,'mouseReleased',bottle,0);
    assert.ok((await read(page)).jigger>1,'Mantener llena el jigger');
    const startJ=await center(page,'.measure-jigger'),glass=await center(page,'.measure-glass');
    await dragHold(page,startJ,glass,650);
    await page.screenshot({path:`artifacts/fuerza/gesto-${width}.png`,format:'png',fullPage:true});
    assert.ok((await read(page)).served>.4,'Arrastrar vierte progresivamente: '+JSON.stringify(await read(page)));
    const stopped=await read(page);await wait(300);assert.deepEqual(await read(page),stopped,'Soltar detiene el chorro');
    await page.screenshot({path:`artifacts/fuerza/jugando-${width}.png`,format:'png',fullPage:true});
    await page.eval(()=>document.querySelector('.measure-game').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));const paused=await read(page);await wait(200);assert.deepEqual(await read(page),paused);
    await click(page,'.measure-pause');
    await dragHold(page,await center(page,'.measure-glass'),await center(page,'.measure-waste'),700);
    await page.screenshot({path:`artifacts/fuerza/descarte-${width}.png`,format:'png',fullPage:true});
    assert.equal((await read(page)).served,0,'El vaso se vacía en descarte');
    await click(page,'.measure-waste');
    for(let i=0;i<2;i++)await click(page,'.measure-bottle');
    await click(page,'.measure-jigger');await until(page,()=>Number(document.querySelector('.measure-game').dataset.jigger)<.001,'Vertido por teclado');
    assert.ok(Math.abs((await read(page)).served-.5)<.01);
    await until(page,()=>document.querySelector('.measure-game')?.dataset.phase==='resultado','Ronda de 15 segundos',18000);
    assert.equal(await page.eval(()=>window.__medida.partida.sel.fuerza.size),0,'No guarda hasta confirmar');
    assert.match(await page.eval(()=>document.querySelector('.measure-confirm').textContent),/Suave/);
    await page.screenshot({path:`artifacts/fuerza/resultado-${width}.png`,format:'png',fullPage:true});
    assert.ok(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth+1),'Sin desbordamiento '+width);
    await click(page,'.measure-confirm');assert.equal(await page.eval(()=>window.__medida.partida.stage),'fruta');
    assert.deepEqual(await page.eval(()=>[...window.__medida.partida.sel.fuerza]),['Suave']);
    await page.eval(()=>{window.__medida.partida.stage='fuerza';window.__medida.render();});
    assert.equal(await phase(page),'resultado');assert.match(await page.eval(()=>document.querySelector('.measure-confirm').textContent),/Suave/);
    await click(page,'.measure-retry');assert.equal(await phase(page),'entrada');
    assert.deepEqual(page.consoleErrors,[]);await page.close();console.log('PASS '+width+'px: mantener, arrastrar, detener, descartar, pausa, teclado, confirmar y volver.');
  }
  const page=await browser.newPage({width:390,height:844,reducedMotion:true});await page.goto(url,{settleMs:100});await page.eval(()=>window.__medida.open());
  await until(page,()=>document.querySelector('.measure-game')?.dataset.phase==='jugando','Ronda con reloj');
  await click(page,'.measure-bottle');await click(page,'.measure-bottle');await click(page,'.measure-jigger');
  await until(page,()=>Number(document.querySelector('.measure-game').dataset.served)>.49,'Servido');
  await until(page,()=>document.querySelector('.measure-game')?.dataset.phase==='resultado','El tiempo termina la ronda',18000);
  assert.equal(await page.eval(()=>window.__medida.partida.sel.fuerza.size),0,'El reloj no confirma');
  await page.screenshot({path:'artifacts/fuerza/tiempo-390.png',format:'png',fullPage:true});
  await page.eval(()=>window.__medida.open());
  await until(page,()=>document.querySelector('.measure-game')?.dataset.phase==='jugando','Segundo intento');
  await page.eval(()=>{window.__medida.partida.stage='alcohol';window.__medida.render();});assert.equal(await page.eval(()=>window.__medida.partida.stage),'alcohol');
  await wait(200);assert.equal(await phase(page),undefined,'Salir cancela la ronda');
  assert.deepEqual(page.consoleErrors,[]);
  writeFileSync('artifacts/fuerza/verificacion.json',JSON.stringify({widths:[1440,768,390],gestures:true,keyboard:true,timer:true,persistence:true,errors:page.consoleErrors},null,2));
  console.log('PASS reloj, confirmación explícita y limpieza al salir.');
}finally{if(browser)await browser.close();await server.close();}
