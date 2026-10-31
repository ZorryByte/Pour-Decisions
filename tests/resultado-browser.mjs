import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, mkdirSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

// La misma sesión recuperable que usa el producto, sobre los archivos de producción.
const fixture = {version:4, phase:'result', stage:'preguntas', current:'Blue Hawaiian',
  sel:{alcohol:['Ron'], fruta:['Piña','Coco'], sabor:['Dulce'], fuerza:['Medio'], alergia:['ninguna'], plan:[]},
  preguntas:{version:1, ids:[9,8,11], answers:{9:0,8:0,11:0}, index:2}};
const boot = `<script>sessionStorage.setItem('cocteles_wizard_v3',${JSON.stringify(JSON.stringify(fixture))});document.addEventListener('DOMContentLoaded',()=>document.getElementById('welcome-start').click());</script>`;
const root = resolve('dist');
const server = createServer((req,res) => {
  const path = resolve(root, '.' + new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if (!path.startsWith(root + '\\') && !path.startsWith(root + '/')) {res.writeHead(403);res.end();return;}
  try {
    const type = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'}[extname(path)] || 'application/octet-stream';
    const content = readFileSync(path);
    res.writeHead(200,{'Content-Type':type});
    res.end(extname(path) === '.html' ? content.toString().replace('<head>','<head>'+boot) : content);
  } catch {res.writeHead(404);res.end();}
});
let browser;
try {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url = 'http://127.0.0.1:'+server.address().port;
  if (process.argv.includes('--inspect')) {
    // spawnSync bloquearía el servidor HTTP del proceso padre.
    const {spawn} = await import('node:child_process');
    // El detector toma el primer h1, incluso el de bienvenida con hidden.
    // Verificamos el título visible real abajo; la bienvenida sigue intacta.
    const child = spawn(process.execPath,['.agents/skills/design-taste-frontend/scripts/inspect.mjs',url,'--app','--allow','no-title','--out','.taste-skill/resultado/after'],{stdio:'inherit'});
    const code = await new Promise(r=>child.on('exit',r));
    assert.equal(code,0,'La inspección visual debe terminar sin FAIL');
  }
  browser = await Browser.launch({extraArgs:['--disable-gpu']});
  const page = await browser.newPage({width:1440,height:900});
  await page.send('Page.bringToFront');
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.goto(url,{settleMs:1200});
  mkdirSync('artifacts/resultado',{recursive:true});
  for (const width of [1440,768,390,320]) {
    await page.setViewport({width,height:900,mobile:width<500});
    await page.eval(()=>scrollTo(0,0));
    assert.equal(await page.eval(()=>document.querySelector('#result-heading')?.textContent),'Blue Hawaiian');
    assert.equal(await page.eval(()=>[...document.querySelectorAll('h1')].filter(h=>h.getBoundingClientRect().width>0).length),1,'Un solo h1 visible');
    assert.equal(await page.eval(()=>document.querySelectorAll('.result-character .drink-garnish').length),1,'Una sola rodaja integrada al personaje');
    assert(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth),'Sin desbordamiento');
    assert(await page.eval(()=>document.querySelector('.result-character').getBoundingClientRect().top<innerHeight),'Personaje visible al inicio');
    assert(await page.eval(()=>document.querySelector('.follow').firstElementChild.matches('.result-recipe')),'Receta antes de extras');
    await page.eval(()=>document.querySelector('.result-recipe-link').click());
    assert.equal(await page.eval(()=>document.activeElement.id),'recipe-heading');
    await page.eval(()=>document.querySelector('.result-badge-link').click());
    assert.equal(await page.eval(()=>document.activeElement.id),'badge-heading');
    await page.eval(()=>{const summary=document.querySelector('.badge-toggle');summary.focus();});
    await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});
    await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await new Promise(r=>setTimeout(r,80));
    assert(await page.eval(()=>document.querySelector('.badge-details').open),'Historia accesible por teclado a '+width+'px; foco: '+await page.eval(()=>document.activeElement.outerHTML.slice(0,200)));
    await page.eval(()=>{document.querySelector('.badge-details').open=false;scrollTo(0,0);});
    await page.screenshot({path:`artifacts/resultado/${width}.png`,fullPage:true,format:'png'});
  }
  await page.eval(()=>document.querySelector('.result-humor').scrollIntoView());
  const before = await page.eval(()=>scrollY);
  await page.eval(()=>document.querySelector('.result-humor button').click());
  assert.equal(await page.eval(()=>scrollY),before,'Ajustar intensidad conserva posición');
  assert(await page.eval(()=>document.activeElement.closest('.result-humor')),'Ajustar conserva foco');
  assert(await page.eval(()=>document.querySelector('.result-restart').closest('.result-humor')),'Opciones de edición junto a Otra vuelta');
  await page.eval(()=>document.querySelector('.result-reset').click());
  assert(await page.eval(()=>!document.querySelector('.result-showcase')),'Reinicio directo sin confirmación');
  assert.equal(page.consoleErrors.length,0,JSON.stringify(page.consoleErrors));
  console.log('PASS: producción, 4 anchos, receta, insignias por teclado, foco y scroll.');
} finally {if(browser) await browser.close();await new Promise(r=>server.close(r));}
