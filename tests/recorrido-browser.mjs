import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'vite';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Las medidas de estas pruebas son fixtures de navegación; fuerza-browser.mjs verifica el juego real.
// Estado expuesto solo en pruebas. No hay cuentas ni servicios remotos.
const expose = `window.__recorrido={partida,partidaVM,restriccionesVM,render,persist,loadWizard,resetWizard,
  medida(value){partida.sel.fuerza.clear();partida.sel.fuerza.add(value);moveFocus=true;render();},
  open(){welcomeOpen=false;welcomeScreen.hidden=true;app.hidden=false;document.body.classList.remove('at-welcome');moveFocus=true;render();}};`;
const server = await createServer({server:{hmr:false,watch:{ignored:['**/*']},host:'127.0.0.1',port:0},
  define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'},
  plugins:[{name:'recorrido-test',enforce:'pre',transform(code,id){
    if(id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js')) return code+expose;
  }}],
});
let browser;
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
async function until(page,fn,label){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){if(await page.eval(fn))return;await pause(50);}
  throw Error('No se llegó a '+label+'\n'+await page.eval(()=>document.body.innerText));
}
async function click(page,selector){
  assert(await page.eval(q=>{const button=document.querySelector(q);if(!button||button.disabled)return false;button.click();return true;},selector),'Existe control habilitado '+selector);
}
async function back(page){
  assert(await page.eval(()=>{const button=[...document.querySelectorAll('#app button')].find(b=>b.textContent.trim()==='Atrás');button?.click();return Boolean(button);}),'Atrás disponible');
}
const stage = page => page.eval(()=>window.__recorrido.partida.stage);
try{
  mkdirSync('artifacts/arquitectura',{recursive:true});
  await server.listen(); browser=await Browser.launch({extraArgs:['--disable-gpu']});
  const url='http://127.0.0.1:'+server.httpServer.address().port;
  for(const width of [1440,768,390]){
    const page=await browser.newPage({width,height:1000,reducedMotion:true});
    await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
    await page.goto(url,{settleMs:100});
    await page.eval(()=>window.__recorrido.open());
    await click(page,'.btn.next'); assert.equal(await stage(page),'alcohol','Base obligatoria');
    await click(page,'[data-pick="Ron"]'); await click(page,'.btn.next');
    assert.equal(await stage(page),'fuerza');
    assert.equal(await page.eval(()=>document.querySelector('.trail [aria-current="step"]')?.textContent),'Intensidad');
    assert.equal(await page.eval(()=>document.querySelectorAll('.trail .is-done').length),1);
    assert.equal(await page.eval(()=>window.__recorrido.partidaVM.blocked()),true,'Intensidad obligatoria');
    await page.eval(()=>window.__recorrido.medida('Medio'));
    assert.equal(await page.eval(()=>document.activeElement?.id),'stage-q','Foco en el resumen de la medida');
    await page.screenshot({path:`artifacts/arquitectura/intensidad-segunda-${width}.png`,format:'png',fullPage:true});
    assert(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await click(page,'.btn.next'); assert.equal(await stage(page),'fruta');
    await until(page,()=>!document.querySelector('.fruit-work')?.hidden,'frutas disponibles');
    await back(page);assert.equal(await stage(page),'fuerza');
    assert.deepEqual(await page.eval(()=>[...window.__recorrido.partida.sel.fuerza]),['Medio']);
    await back(page);assert.equal(await stage(page),'alcohol');
    await click(page,'[data-pick="Sin alcohol"]');await click(page,'.btn.next');
    assert.equal(await stage(page),'fruta');
    assert.equal(await page.eval(()=>document.querySelectorAll('.trail li').length),5);
    assert.deepEqual(await page.eval(()=>[...window.__recorrido.partida.sel.fuerza]),[]);
    await until(page,()=>!document.querySelector('.fruit-work')?.hidden,'frutas sin alcohol');
    await back(page);assert.equal(await stage(page),'alcohol','Salto simétrico');
    await click(page,'[data-pick="Ron"]');await click(page,'.btn.next');assert.equal(await stage(page),'fuerza');
    await page.eval(()=>window.__recorrido.medida('Suave'));await click(page,'.btn.next');
    await until(page,()=>!document.querySelector('.fruit-work')?.hidden,'entrada a frutas');
    await click(page,'.fruit-primary'); assert.equal(await stage(page),'sabor');
    // Enviar el formulario no se salta las decisiones de las cartas.
    await page.eval(()=>document.querySelector('#app form').requestSubmit());assert.equal(await stage(page),'sabor');
    for(let i=0;i<8;i++) await page.eval(()=>document.querySelector('.swipe-card').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})));
    await until(page,()=>window.__recorrido.partida.stage==='alergia','final de estilos');
    await click(page,'.vip-next');assert.equal(await stage(page),'alergia','Inspección obligatoria');
    await page.eval(()=>{while(document.querySelector('.vip-approve'))document.querySelector('.vip-approve').click();});
    await click(page,'.vip-next');assert.equal(await stage(page),'plan');
    await click(page,'[data-option="0"]');await click(page,'.question-next');
    await back(page);assert.equal(await stage(page),'plan','Retroceso interno de preguntas');
    await back(page);assert.equal(await stage(page),'alergia');
    await click(page,'.vip-next');
    for(let i=0;i<3;i++){
      await click(page,'[data-option="0"]');await click(page,'.question-next');
    }
    assert.equal(await page.eval(()=>window.__recorrido.partida.phase),'result');
    assert(await page.eval(()=>Boolean(window.__recorrido.partida.current)));
    assert(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const stored=await page.eval(()=>JSON.parse(sessionStorage.getItem('cocteles_wizard_v3')));
    assert.equal(stored.version,4);assert.equal(stored.stage,'plan');assert(!('step' in stored));
    assert.deepEqual(page.consoleErrors,[]);
    console.log(`PASS ${width}px: recorrido completo, bloqueos, foco, retrocesos, Sin alcohol, preguntas, resultado y persistencia.`);
    await page.close();
  }
  const page=await browser.newPage({width:1440,height:1000,reducedMotion:true});await page.goto(url,{settleMs:100});
  // Recuperación mediante el adaptador real, incluida la inspección y los extras.
  await page.eval(()=>{
    sessionStorage.setItem('cocteles_wizard_v3',JSON.stringify({step:2,phase:'step',sel:{alcohol:['Ron'],fruta:['Piña'],sabor:['Dulce']},draftName:'Prueba',styleDecisions:{Dulce:true}}));
    window.__recorrido.loadWizard();window.__recorrido.open();
  });
  assert.equal(await stage(page),'fuerza');assert.deepEqual(await page.eval(()=>[...window.__recorrido.partida.sel.fruta]),['Piña']);
  assert.equal(await page.eval(()=>window.__recorrido.partida.styleDecisions.Dulce),true);
  await page.eval(()=>window.__recorrido.medida('Medio'));
  await page.eval(()=>{window.__recorrido.loadWizard();window.__recorrido.render();});assert.equal(await stage(page),'fuerza');
  // La vista sencilla comparte las mismas transiciones aunque falte Juego.
  await page.eval(()=>{window.Juego=null;window.__recorrido.resetWizard();window.__recorrido.open();});
  await click(page,'input[name="alcohol"][value="Ron"]');
  await page.eval(()=>document.querySelector('#app form').requestSubmit());assert.equal(await stage(page),'fuerza');
  assert.equal(await page.eval(()=>document.querySelector('.progress-count').textContent),'2 de 6');
  await back(page);await click(page,'input[name="alcohol"][value="Sin alcohol"]');
  await page.eval(()=>document.querySelector('#app form').requestSubmit());assert.equal(await stage(page),'fruta');
  assert.equal(await page.eval(()=>document.querySelector('.progress-count').textContent),'2 de 5');
  await back(page);assert.equal(await stage(page),'alcohol');
  assert.deepEqual(page.consoleErrors,[]);
  writeFileSync('artifacts/arquitectura/verificacion.json',JSON.stringify({widths:[1440,768,390],migration:true,fallback:true,errors:page.consoleErrors},null,2));
  console.log('PASS migración antigua, guardado v4, ruta sencilla y progreso dinámico.');
}finally{if(browser)await browser.close();await server.close();}
