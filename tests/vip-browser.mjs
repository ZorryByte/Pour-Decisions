import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'vite';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const server=await createServer({server:{host:'127.0.0.1',port:5196,strictPort:false},plugins:[{
  name:'vip-test-only',enforce:'pre',transform(code,id){
    if(id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js'))return code+`
      window.__vip={partida,restriccionesVM,ranked,persist,loadWizard,
        open(){welcomeOpen=false;welcomeScreen.hidden=true;app.hidden=false;document.body.classList.remove('at-welcome');partida.phase='step';partida.step=4;render();},
        fresh(){partida.sel.alergia.clear();restriccionesVM.reset();this.open();},render};`;
  }
}],define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'}});
let browser;
try{
  mkdirSync('artifacts/inspeccion-vip',{recursive:true});await server.listen();
  browser=await Browser.launch({extraArgs:['--disable-gpu']});
  const page=await browser.newPage({width:1440,height:1000,reducedMotion:false});
  await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port,{settleMs:100});
  await page.eval(()=>window.__vip.fresh());
  assert.equal(await page.eval(()=>getComputedStyle(document.querySelector('.vip-intro')).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await page.eval(()=>document.querySelector('.vip-ledger')),null,'La lista lateral se eliminó');
  assert(await page.eval(()=>Boolean(document.querySelector('.vip-shift'))),'La primera entrada presenta el turno');
  await page.screenshot({path:'artifacts/inspeccion-vip/turno-1440.png',format:'png',fullPage:true});
  const click=async selector=>{assert(await page.eval(s=>Boolean(document.querySelector(s)),selector),'Existe '+selector);await page.eval(s=>document.querySelector(s).click(),selector);};
  assert.equal(await page.eval(()=>document.querySelector('#vip-name').textContent),'Leche y lácteos');
  await click('.vip-next');assert.equal(await page.eval(()=>window.__vip.partida.step),4);
  await click('.vip-deny');await click('[data-reason="lactosa"]');
  assert.equal(await page.eval(()=>document.querySelector('.vip-call').textContent),'¡Siguiente!');
  assert.deepEqual(await page.eval(()=>[...window.__vip.partida.sel.alergia]),['lactosa']);
  assert.equal(await page.eval(()=>document.querySelector('#vip-name').textContent),'Maní / cacahuate');
  await click('.vip-approve');await click('.vip-deny');await click('[data-reason="alergia"]');
  assert.deepEqual(await page.eval(()=>[...window.__vip.partida.sel.alergia]),['lactosa','frutos secos']);
  assert(await page.eval(()=>document.activeElement.classList.contains('vip-approve')),'El foco sigue al siguiente sello');
  // El siguiente pase acepta acciones incluso durante la animación anterior.
  await page.eval(()=>{while(document.querySelector('.vip-approve'))document.querySelector('.vip-approve').click();});
  assert(await page.eval(()=>window.__vip.restriccionesVM.complete()));
  assert(await page.eval(()=>[...window.__vip.ranked()].every(c=>!c.i.some(i=>/leche|yogur|almendra|amaretto/i.test(i)))));
  await click('.vip-next');assert.equal(await page.eval(()=>window.__vip.partida.step),5);
  await page.eval(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Atrás').click());
  assert.equal(await page.eval(()=>window.__vip.partida.step),4);
  assert.equal(await page.eval(()=>window.__vip.restriccionesVM.snapshot().decisiones.lacteos),'lactosa');
  // Corregir una exclusión actualiza el Set usado por todas las recomendaciones.
  await click('.vip-review');await click('.vip-approve');
  assert.deepEqual(await page.eval(()=>[...window.__vip.partida.sel.alergia]),['frutos secos']);
  assert.equal(await page.eval(()=>document.querySelector('.vip-other-toggle')),null,'Se retiró Excluir otro ingrediente');
  // Las anotaciones de sesiones anteriores siguen siendo corregibles.
  await page.eval(()=>{window.__vip.restriccionesVM.setOther('Fresa');window.__vip.open();});
  assert.equal(await page.eval(()=>window.__vip.ranked().length),0);
  await click('.vip-next');assert.equal(await page.eval(()=>window.__vip.partida.step),4);
  assert(await page.eval(()=>document.querySelector('#why').textContent.includes('necesita revisión')));
  await page.eval(()=>{const a=window.__vip;a.persist();a.restriccionesVM.reset();a.loadWizard();a.open();});
  assert.equal(await page.eval(()=>window.__vip.restriccionesVM.snapshot().otra),'Fresa');
  await page.eval(()=>{const i=document.querySelector('#vip-other');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));});
  assert(!await page.eval(()=>window.__vip.partida.sel.alergia.has('otra')));
  for(const width of [1440,768,390]){
    await page.setViewport({width,height:900,mobile:width<800});
    await page.eval(()=>{window.__vip.fresh();window.scrollTo(0,0);});
    await new Promise(r=>setTimeout(r,350));
    assert(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth+1),'Sin desbordamiento '+width);
    assert(await page.eval(()=>{const b=document.querySelector('.vip-inspection').getBoundingClientRect();return Math.abs(b.left+b.width/2-innerWidth/2)<3;}),'Puesto centrado '+width);
    await page.screenshot({path:`artifacts/inspeccion-vip/entrada-${width}.png`,format:'png',fullPage:true});
    await click('.vip-deny');
    assert(await page.eval(()=>[...document.querySelectorAll('.vip-reason')].every(b=>b.getBoundingClientRect().height>=44)));
    await page.screenshot({path:`artifacts/inspeccion-vip/motivos-${width}.png`,format:'png',fullPage:true});
  }
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.eval(()=>window.__vip.fresh());
  assert.equal(await page.eval(()=>getComputedStyle(document.querySelector('.vip-visitor')).animationName),'none');
  await click('.vip-all');assert.deepEqual(await page.eval(()=>[...window.__vip.partida.sel.alergia]),['ninguna']);
  await click('.vip-next');assert.equal(await page.eval(()=>window.__vip.partida.step),5);
  assert.deepEqual(page.consoleErrors,[]);
  writeFileSync('artifacts/inspeccion-vip/verificacion.json',JSON.stringify({widths:[1440,768,390],flows:['rechazar con motivo','aprobar inmediato','corregir','volver','persistir','otra bloquea','aprobar todos','movimiento reducido'],errors:page.consoleErrors},null,2));
  console.log('PASS: inspección VIP, filtros, motivos, correcciones, navegación y persistencia; 6 capturas, 3 tamaños, movimiento reducido y sin errores de ejecución.');
}finally{if(browser)await browser.close();await server.close();}
