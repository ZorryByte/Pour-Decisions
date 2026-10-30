import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'vite';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Estado expuesto solo en el servidor de pruebas. Sin cuentas ni servicios remotos.
const expose = `
window.__funcionamiento={C,partida,restriccionesVM,ranked,render,
  abrir(){welcomeOpen=false;welcomeScreen.hidden=true;app.hidden=false;document.body.classList.remove('at-welcome');},
  coincidencias(){saved=true;respuestaId='prueba';matches=[{nombre:'Ana',porcentaje:85}];matchesLoading=false;matchesError=false;}
};`;
const server = await createServer({
  server:{hmr:false,watch:{ignored:['**/*']},host:'127.0.0.1',port:0},
  define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'},
  plugins:[{name:'funcionamiento-solo-pruebas',enforce:'pre',transform(code,id){
    if(id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js')) return code+expose;
  }}]
});
let browser;
const evidence=[];
try{
  mkdirSync('artifacts/evaluacion/correcciones',{recursive:true});
  await server.listen();
  browser=await Browser.launch({extraArgs:['--disable-gpu']});
  const page=await browser.newPage({width:1440,height:1000,reducedMotion:true});
  await page.send('Network.enable');
  await page.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port,{settleMs:100});
  const count=await page.eval(()=>{window.__funcionamiento.abrir();return window.__funcionamiento.C.length;});
  for(let offset=0;offset<count;offset+=16){
    evidence.push(...await page.eval(start=>{
      const a=window.__funcionamiento,results=[];
      for(const target of a.C.slice(start,start+16)){
        Object.values(a.partida.sel).forEach(s=>s.clear());
        for(const [field,values] of Object.entries({alcohol:target.a,fruta:target.f,sabor:target.s,fuerza:['Suave'],alergia:['ninguna']})) values.forEach(v=>a.partida.sel[field].add(v));
        a.partida.fruitAny=false;
        const ranked=a.ranked();
        a.partida.current=ranked[0];a.partida.phase='result';a.render();
        const before=JSON.stringify(Object.fromEntries(Object.entries(a.partida.sel).map(([k,v])=>[k,[...v]])));
        const expected=ranked.filter(c=>c!==a.partida.current).map(c=>c.n);
        const initial=document.querySelectorAll('.other').length;
        if(initial!==Math.min(8,expected.length)) throw Error('Tamaño inicial: '+target.n);
        const more=document.querySelector('[aria-controls="other-results"]');
        let batches=0;
        while(more && !more.hidden){
          if(++batches>30) throw Error('Paginación sin fin');
          const previous=document.querySelectorAll('.other').length;
          more.click();
          const buttons=[...document.querySelectorAll('.other')];
          if(buttons.length<=previous || buttons[previous]!==document.activeElement) throw Error('Avance o foco: '+target.n);
        }
        const actual=[...document.querySelectorAll('.other')].map(b=>b.querySelector('span').firstChild.textContent);
        if(JSON.stringify(actual)!==JSON.stringify(expected)) throw Error('Recetas omitidas o desordenadas: '+target.n);
        if(a.partida.current.n!==target.n && !actual.includes(target.n)) throw Error('Receta inaccesible: '+target.n);
        if(before!==JSON.stringify(Object.fromEntries(Object.entries(a.partida.sel).map(([k,v])=>[k,[...v]])))) throw Error('Paginación altera gustos');
        if(document.documentElement.scrollWidth>innerWidth+1) throw Error('Desbordamiento: '+target.n);
        results.push({name:target.n,alternatives:actual.length,batches});
      }
      return results;
    },offset));
  }
  assert.equal(new Set(evidence.map(c=>c.name)).size,157,'Cobertura completa de la carta');

  // Una receta que antes quedaba oculta se puede abrir y elegir desde el control real.
  await page.eval(()=>{
    const a=window.__funcionamiento;
    Object.values(a.partida.sel).forEach(s=>s.clear());
    a.partida.sel.alcohol.add('Sin alcohol');a.partida.sel.fruta.add('Limón');a.partida.sel.sabor.add('Ácido');a.partida.sel.alergia.add('ninguna');
    a.partida.current=a.ranked()[0];a.partida.phase='result';a.render();
    const name='Vodka limón sin alcohol';
    let target;
    while(!(target=[...document.querySelectorAll('.other')].find(b=>b.querySelector('span').firstChild.textContent===name))){
      const more=document.querySelector('[aria-controls="other-results"]');
      if(!more || more.hidden) throw Error('Receta oculta inaccesible');more.click();
    }
    target.click();
  });
  assert(await page.eval(()=>document.querySelector('#app h1').textContent==='Vodka limón sin alcohol'));
  assert(await page.eval(()=>document.querySelector('.pct').textContent.includes('% por ingredientes')));
  await page.eval(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Me quedo con este').click());
  assert(await page.eval(()=>window.__funcionamiento.partida.current.n==='Vodka limón sin alcohol'));

  for(const width of [1440,768,390]){
    await page.setViewport({width,height:900,mobile:width<800});
    await page.eval(()=>{
      const a=window.__funcionamiento;a.coincidencias();a.render();
      document.querySelector('.result-more').scrollIntoView();
    });
    assert(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth+1),'Sin desbordamiento a '+width);
    assert(await page.eval(()=>document.querySelector('.result-more').textContent.includes('no forma parte del porcentaje')));
    assert(await page.eval(()=>document.querySelector('.result-matches').textContent.includes('tienen gustos en común')));
    await page.screenshot({path:'artifacts/evaluacion/correcciones/alternativas-'+width+'.png',format:'png'});
  }

  await page.eval(()=>{
    const a=window.__funcionamiento;a.restriccionesVM.reset();a.restriccionesVM.setOther('Fresa');
    a.partida.phase='step';a.partida.step=4;a.render();document.querySelector('.btn.next').click();
  });
  assert(await page.eval(()=>window.__funcionamiento.partida.step===4 && !document.querySelector('#why').hidden && document.querySelector('#why').textContent.includes('necesita revisión')));
  assert(await page.eval(()=>window.__funcionamiento.ranked().length===0 && window.__funcionamiento.partida.sel.alergia.has('otra')));
  await page.screenshot({path:'artifacts/evaluacion/correcciones/otra-restriccion-390.png',format:'png'});
  // F5 desde cada pantalla vuelve a la bienvenida y descarta la partida temporal.
  for(const stage of ['alcohol','preguntas','resultado','perfil']){
    await page.eval(stage=>{
      const a=window.__funcionamiento;
      a.abrir();
      Object.values(a.partida.sel).forEach(s=>s.clear());
      a.partida.sel.alcohol.add('Ron');
      a.partida.phase=stage==='resultado'?'result':'step';
      a.partida.step=stage==='preguntas'?5:0;
      a.partida.current=stage==='resultado'?a.C[0]:null;
      if(stage!=='alcohol') Preguntas.restore({version:1,ids:[41,42,43],answers:{41:0},index:1});
      a.render();
      if(stage==='perfil') document.getElementById('open-profile').click();
      history.replaceState(null,'',location.pathname+'?evento=prueba'+location.hash);
    },stage);
    await page.send('Page.reload');
    let ready=false;
    for(let attempt=0;attempt<100;attempt++){
      await new Promise(resolve=>setTimeout(resolve,50));
      try{ready=await page.eval(()=>performance.getEntriesByType('navigation')[0]?.type==='reload' && !!window.__funcionamiento && document.body.classList.contains('at-welcome'));}catch{}
      if(ready)break;
    }
    assert(ready,'Bienvenida tras F5 desde '+stage);
    assert(await page.eval(()=>{
      const a=window.__funcionamiento;
      return !document.getElementById('welcome-screen').hidden && document.getElementById('app').hidden &&
        location.hash==='' && location.search==='?evento=prueba' && scrollY===0 &&
        a.partida.step===0 && a.partida.phase==='step' && a.partida.current===null &&
        Object.values(a.partida.sel).every(s=>s.size===0) && !Preguntas.snapshot() &&
        sessionStorage.getItem('cocteles_wizard_v3')===null;
    }),'Partida y navegación reiniciadas desde '+stage);
    await page.eval(()=>document.getElementById('welcome-start').click());
    assert(await page.eval(()=>!document.getElementById('app').hidden && window.__funcionamiento.partida.step===0),'Empezar desde cero tras F5');
  }
  assert.deepEqual(page.consoleErrors,[],'Sin errores de ejecución');
  writeFileSync('artifacts/evaluacion/correcciones/cobertura-browser.json',JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS: 157 recetas accesibles, paginación sin pérdidas/duplicados, foco, selección de receta antes oculta, Otra bloqueada y compatibilidad explicada; 1440/768/390 sin desbordamientos ni errores.');
}finally{
  if(browser)await browser.close();
  await server.close();
}
