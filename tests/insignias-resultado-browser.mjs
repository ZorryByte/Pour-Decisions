import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {createServer} from 'vite';
import {Browser,Page} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const expose=`window.__badgesResult={partida,render,ranked,C,show(){welcomeOpen=false;welcomeScreen.hidden=true;app.hidden=false;document.body.classList.remove('at-welcome');reveal=false;render();}};`;
const server=await createServer({server:{hmr:false,watch:{ignored:['**/*']},host:'127.0.0.1',port:0},define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'},plugins:[{name:'badges-result-test',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js'))return code+expose;}}]});
let browser;
try{
  mkdirSync('artifacts/insignias-resultado',{recursive:true});await server.listen();
  browser=await Browser.launch({extraArgs:['--disable-gpu']});
  const {targetId}=await browser.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await browser.send('Target.attachToTarget',{targetId,flatten:true});
  const page=new Page(browser,targetId,sessionId);await page.send('Page.enable');await page.send('Runtime.enable');
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port,{settleMs:100});
  const result=await page.eval(()=>{
    const a=window.__badgesResult;localStorage.clear();sessionStorage.clear();
    Object.values(a.partida.sel).forEach(s=>s.clear());
    const s=a.partida.sel;s.alcohol.add('Ron');s.fruta.add('Piña');s.fruta.add('Coco');s.sabor.add('Dulce');s.fuerza.add('Medio');s.alergia.add('ninguna');
    Preguntas.restore({version:1,ids:[9,8,11],answers:{9:0,8:0,11:0},index:2});
    a.partida.current=a.ranked()[0];a.partida.phase='result';a.show();
    const block=document.querySelector('.badge-collection');
    return {count:document.querySelectorAll('.badge').length,names:[...document.querySelectorAll('.badge-name')].map(n=>n.textContent),top:block?.getBoundingClientRect().top,display:block&&getComputedStyle(block).display,visibility:block&&getComputedStyle(block).visibility};
  });
  assert(result.count>=4,JSON.stringify(result));
  assert(result.names.includes('Mi primera chamba')&&result.names.includes('Rápidos y mentirosos'));
  assert(result.display!=='none'&&result.visibility!=='hidden');
  console.log('RESULTADO',JSON.stringify(result));
  for(const width of [1440,768,390]){
    await page.setViewport({width,height:1000,mobile:width<500});
    await page.eval(()=>scrollTo(0,0));
    await page.screenshot({path:`artifacts/insignias-resultado/inicio-${width}.png`,format:'png'});
    if(await page.eval(()=>Boolean(document.querySelector('.result-badge-preview')))){
      assert(await page.eval(()=>getComputedStyle(document.querySelector('.result-badge-link')).color!==getComputedStyle(document.querySelector('.result-badge-preview')).backgroundColor),'El enlace contrasta con el fondo');
      assert(await page.eval(()=>document.querySelector('.result-badge-preview').getBoundingClientRect().top<innerHeight),'Aviso de insignias visible al inicio');
      await page.eval(()=>document.querySelector('.result-badge-link').click());
      assert(await page.eval(()=>document.querySelector('.badge-collection').getBoundingClientRect().top<innerHeight),'El botón lleva a la colección');
      assert(await page.eval(()=>document.activeElement.id==='badge-heading'),'Foco accesible en la colección');
    }else await page.eval(()=>document.querySelector('.badge-collection').scrollIntoView());
    await page.screenshot({path:`artifacts/insignias-resultado/coleccion-${width}.png`,format:'png'});
    assert(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.equal(page.consoleErrors.length,0,JSON.stringify(page.consoleErrors));
  console.log('PASS: insignias obtenidas en el resultado real, tres tamaños y sin errores JS.');
}finally{if(browser)await browser.close();await server.close();}
