import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createServer} from 'vite';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// Exponer el estado solo en el servidor de pruebas, sin tocar el código publicado.
const expose = `\nwindow.__paridad={sel,C,render,ranked,matchPercent,hitsOf,get fruitAny(){return fruitAny},set fruitAny(v){fruitAny=v},get step(){return step},set step(v){step=v},get phase(){return phase},set phase(v){phase=v},get current(){return current},set current(v){current=v},get welcomeOpen(){return welcomeOpen},set welcomeOpen(v){welcomeOpen=v},get styleDecisions(){return styleDecisions},set styleDecisions(v){styleDecisions=v},app,welcomeScreen};`;
const baseline=resolve('artifacts/antes-mvvm');
const root=resolve('.');
const vendor={
  '/__vendor/gsap.js':'node_modules/gsap/dist/gsap.min.js',
  '/__vendor/interact.js':'node_modules/interactjs/dist/interact.min.js',
  '/__vendor/confetti.js':'node_modules/canvas-confetti/dist/confetti.browser.js',
};
const server=await createServer({
  server:{hmr:false,watch:{ignored:['**/*']},host:'127.0.0.1',port:5184,strictPort:true},
  plugins:[{name:'referencia-solo-pruebas',enforce:'pre',
    transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js'))return code+expose
      .replace(/return (fruitAny|step|phase|current|styleDecisions)\b/g,'return partida.$1')
      .replace(/\b(fruitAny|step|phase|current|styleDecisions)=v\b/g,'partida.$1=v');},
    configureServer(dev){dev.middlewares.use((req,res,next)=>{
      const path=new URL(req.url,'http://localhost').pathname;
      let content,file;
      if(vendor[path])file=resolve(root,vendor[path]);
      else if(path.startsWith('/__original/')){
        file=resolve(baseline,path.slice('/__original/'.length));
        if(!file.startsWith(baseline+'/')&&!file.startsWith(baseline+'\\')){res.writeHead(403).end();return;}
        if(path.endsWith('index.html')){
          content=readFileSync(file,'utf8').replaceAll('%VITE_SUPABASE_URL%','').replaceAll('%VITE_SUPABASE_ANON_KEY%','')
            .replace('https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js','/__vendor/gsap.js')
            .replace('https://cdn.jsdelivr.net/npm/interactjs@1.10.28/dist/interact.min.js','/__vendor/interact.js')
            .replace('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.js','/__vendor/confetti.js');
          const pos=content.lastIndexOf('</script>');content=content.slice(0,pos)+expose+content.slice(pos);
        }
      }else return next();
      try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(content||readFileSync(file));}
      catch{res.writeHead(404).end();}
    });},
  }],
  define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(''),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify('')},
});
await server.listen();
let browser;
async function until(page,fn,label){
  const end=Date.now()+6000;
  while(Date.now()<end){if(await page.eval(fn))return;await new Promise(r=>setTimeout(r,40));}
  throw Error('No se llegó a '+label+'\n'+await page.eval(()=>document.body.innerText));
}
try{
  browser=await Browser.launch({extraArgs:['--disable-gpu']});
  const pages=[];
  for(const version of ['original','restaurado']){
    const page=await browser.newPage({width:1440,height:1000,reducedMotion:true});
    await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
    await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`Math.random=()=>0.37;localStorage.clear();sessionStorage.clear();`});
    await page.goto(version==='original'?'http://localhost:5184/__original/index.html':'http://127.0.0.1:5184/',{settleMs:80});
    await until(page,()=>Boolean(window.__paridad),'inicio');
    assert.equal(await page.eval(()=>window.gsap?.version),'3.15.0');
    assert.equal(await page.eval(()=>typeof window.interact),'function');
    assert.equal(await page.eval(()=>typeof window.confetti),'function');
    pages.push(page);
  }
  // La presentación y el recorrido evolucionaron. Se prueban en recorrido-browser y frutas-barra-browser.
  const alcoholResults=[];
  for(const page of pages){
    alcoholResults.push(await page.eval(()=>{
      const a=window.__paridad;
      if(Perfil.isOpen())document.querySelector('.profile-top button')?.click();
      a.welcomeOpen=false;a.welcomeScreen.hidden=true;a.app.hidden=false;document.body.classList.remove('at-welcome');
      a.phase='step';a.step=0;a.sel.alcohol.clear();a.render();
      return ['Ron','Vodka','Ginebra','Tequila','Whisky','Brandy','Sin alcohol','Ron','Sin alcohol','Sin alcohol','Brandy','Vodka'].map(value=>{
        document.querySelector('[data-pick="'+value+'"]').click();
        return {selected:[...a.sel.alcohol],focus:document.activeElement?.getAttribute('data-pick'),buttons:[...document.querySelectorAll('.bubbles button')].map(b=>[b.className,b.getAttribute('data-pick'),b.getAttribute('aria-pressed'),b.textContent]),why:document.querySelector('#why').textContent,whyHidden:document.querySelector('#why').hidden,cap:document.querySelector('.cap').textContent,stored:JSON.parse(sessionStorage.getItem('cocteles_wizard_v3')).sel.alcohol};
      });
    }));
  }
  assert.deepEqual(alcoholResults[1],alcoholResults[0],'Selección de alcohol original: botones, foco, límite, exclusiones y guardado');
  const restrictionResults=[];
  for(const page of pages){
    restrictionResults.push(await page.eval(isOriginal=>{
      const a=window.__paridad, previous=[...a.sel.alergia];
      const keys=['ninguna','lacteos','frutos secos','citricos','gluten','otra'];
      try {
        return Array.from({length:2**keys.length},(_,mask)=>{
          a.sel.alergia.clear();keys.forEach((key,i)=>{if(mask & (1<<i))a.sel.alergia.add(key);});
          // El oráculo antiguo se ajusta solo en las dos reglas corregidas.
          if(isOriginal){
            if(a.sel.alergia.has('otra')) return [];
            a.sel.alergia.delete('ninguna');
          }
          return a.ranked().map(c=>c.n);
        });
      } finally {a.sel.alergia.clear();previous.forEach(key=>a.sel.alergia.add(key));}
    },page === pages[0]));
  }
  assert.deepEqual(restrictionResults[1],restrictionResults[0],'Mismas recomendaciones y orden para las 64 combinaciones de restricciones');
  const recommendationResults=[];
  for(const page of pages){
    recommendationResults.push(await page.eval(()=>{
      const a=window.__paridad, keys=Object.keys(a.sel), previous=Object.fromEntries(keys.map(k=>[k,[...a.sel[k]]])), any=a.fruitAny, questions=Preguntas.snapshot();
      const choices={
        alcohol:[[],['Ron'],['Sin alcohol'],['Vodka','Ginebra'],['Whisky','Brandy'],['Tequila']],
        fruta:[[],['Limón'],['Piña','Coco'],['Fresa','Mango']],
        sabor:[[],['Dulce'],['Ácido','Refrescante'],['Cremoso']],
        fuerza:[[],['Suave'],['Medio'],['Fuerte']],
        alergia:[[],['lacteos'],['citricos'],['gluten','frutos secos']],
        plan:[[],['playa'],['cena'],['fiesta'],['aventura']],
      };
      try {
        return Array.from({length:48},(_,i)=>{
          keys.forEach((key,k)=>{a.sel[key].clear();choices[key][Math.floor(i/(k+1))%choices[key].length].forEach(v=>a.sel[key].add(v));});
          a.fruitAny=i%2===0;
          const glasses=Array.from({length:4},(_,answered)=>{
            Preguntas.restore({version:1,ids:[41,42,43],answers:Object.fromEntries([41,42,43].slice(0,answered).map(id=>[id,0])),index:0});
            const glass=Juego.heroGlass(),liquid=glass.querySelector('.liquid');
            // El vaso actual incluye hielos y otra etiqueta accesible; comparar sus cálculos, no el dibujo histórico.
            if(!glass.getAttribute('aria-label'))throw Error('El vaso requiere etiqueta accesible');
            return {color:liquid.getAttribute('fill'),y:liquid.getAttribute('y'),surface:glass.querySelector('.surface').getAttribute('cy')};
          });
          return {names:a.ranked().map(c=>c.n),details:a.C.map(c=>[c.n,a.matchPercent(c),a.hitsOf(c)]),glasses};
        });
      } finally {keys.forEach(key=>{a.sel[key].clear();previous[key].forEach(v=>a.sel[key].add(v));});a.fruitAny=any;Preguntas.restore(questions);}
    }));
  }
  for(let i=0;i<48;i++)assert.deepEqual(recommendationResults[1][i],recommendationResults[0][i],'Recomendaciones y cálculos del vaso, escenario '+i);
  const page=pages[1];
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await page.eval(()=>{
    if(Perfil.isOpen())document.querySelector('.profile-top button')?.click();
    const a=window.__paridad;a.phase='step';a.step=0;a.render();
    const button=[...document.querySelectorAll('[data-pick]')].find(n=>n.dataset.pick==='Vodka');button.click();
  });
  assert(await page.eval(()=>document.querySelector('#app .glass-build').getAnimations().length>0),'Movimiento original del vaso al hablar');
  assert(await page.eval(()=>document.querySelectorAll('.glass-word').length>0),'Diálogo palabra por palabra');
  assert.deepEqual(pages.flatMap(p=>p.consoleErrors),[],'Sin errores de ejecución');
  console.log('PASS: recomendaciones originales en 64 combinaciones de restricciones y 48 cambios de preferencias.');
  console.log('PASS: color, altura y superficie equivalentes en 192 estados; selección de alcohol, foco, límites y persistencia conservados.');

}finally{if(browser)await browser.close();await server.close();}
