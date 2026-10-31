import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {createServer} from 'vite';
import {Browser, Page} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const expose = `window.__shareTest={partida,ranked,show(){welcomeOpen=false;welcomeScreen.hidden=true;app.hidden=false;reveal=false;render();}};`;
const server = await createServer({server:{host:'127.0.0.1',port:0,hmr:false,watch:{ignored:['**/*']}},define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'},plugins:[{name:'share-test',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js')) return code+expose;}}]});
let browser;
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
async function ready(page){
  for(let i=0;i<100;i++){
    if(await page.eval(()=>!!document.querySelector('.share-preview img')))return;
    await pause(50);
  }
  throw Error('No se generó imagen: '+await page.eval(()=>document.querySelector('.result-share')?.outerHTML)+'\n'+JSON.stringify(page.consoleErrors));
}
try {
  mkdirSync('artifacts/compartir',{recursive:true});
  await server.listen();browser = await Browser.launch({extraArgs:['--disable-gpu']});
  const {targetId}=await browser.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await browser.send('Target.attachToTarget',{targetId,flatten:true});
  const page = new Page(browser,targetId,sessionId);
  await page.send('Page.enable');await page.send('Runtime.enable');
  await page.setViewport({width:1440,height:1000});
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/?evento=fiesta&token=secreto#prueba',{settleMs:100});
  await page.eval(()=>{
    window.__imageText=[];
    const fillText=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__imageText.push(text);return fillText.call(this,text,...args);};
    const a = window.__shareTest;
    Object.values(a.partida.sel).forEach(s=>s.clear());
    const s=a.partida.sel;s.alcohol.add('Ron');s.fruta.add('Piña');s.fruta.add('Coco');s.sabor.add('Dulce');s.fuerza.add('Medio');s.alergia.add('ninguna');
    a.partida.current=a.ranked().find(c=>c.n==='Piña colada');a.partida.phase='result';a.show();
  });
  await ready(page);
  assert(await page.eval(()=>!window.__imageText.some(text=>/https?:|vercel|Entra aquí|Quieres saber/.test(text))),'La imagen contiene solo el cóctel y sus elecciones');
  const png=await page.eval(()=>document.querySelector('.share-preview img').src);
  assert(png.startsWith('data:image/png;base64,'));
  writeFileSync('artifacts/compartir/mi-coctel.png',Buffer.from(png.split(',')[1],'base64'));
  assert((await page.eval(()=>document.querySelector('.share-preview img').alt)).includes('Piña colada'));
  await page.eval(()=>{
    Object.defineProperty(navigator,'canShare',{configurable:true,writable:true,value:()=>true});
    Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:async data=>{
      window.__sent={text:data.text,url:data.url,name:data.files[0].name,type:data.files[0].type,size:data.files[0].size};
    }});
    document.querySelector('.result-share > button').click();
  });
  const sent=await page.eval(()=>window.__sent);
  assert(sent.text.includes('soy un Piña colada'));assert.equal(sent.type,'image/png');assert(sent.size>10000);
  assert.equal(sent.url,undefined);
  assert(sent.text.includes('https://pourdecisions-zorry.vercel.app/?evento=fiesta'));
  assert(!sent.text.includes('token'));assert(!sent.text.includes('#'));
  await page.eval(()=>{navigator.share=async()=>{throw new DOMException('Cancelado','AbortError');};document.querySelector('.result-share > button').click();});
  assert((await page.eval(()=>document.querySelector('#share-status').textContent)).includes('No se compartió'));
  await page.eval(()=>{navigator.share=async()=>{throw new Error('No permitido');};document.querySelector('.result-share > button').click();});
  assert((await page.eval(()=>document.querySelector('#share-status').textContent)).includes('No se pudo abrir'));
  await page.eval(()=>{navigator.canShare=()=>false;document.querySelector('.result-share > button').click();});
  assert(await page.eval(()=>document.querySelector('.share-preview').open));
  await page.eval(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denegado');}}});
    [...document.querySelectorAll('.result-share button')].find(b=>b.textContent==='Copiar invitación').click();
  });
  assert.equal(await page.eval(()=>document.querySelector('#share-status textarea').value),sent.text);
  for(const width of [1440,768,390]){
    await page.setViewport({width,height:1000,mobile:width<500});
    await page.eval(()=>document.querySelector('.result-share').scrollIntoView());
    assert(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:`artifacts/compartir/vista-${width}.png`,format:'png',fullPage:true});
  }
  // Sin alcohol no debe exportar una intensidad antigua, incluso si el estado la conserva.
  await page.eval(()=>{
    const a=window.__shareTest,s=a.partida.sel;s.alcohol.clear();s.alcohol.add('Sin alcohol');
    a.partida.current=a.ranked()[0];a.show();
  });
  await ready(page);
  assert((await page.eval(()=>document.querySelector('.share-preview img').alt)).includes('Intensidad: Sin alcohol'));
  assert.equal(page.consoleErrors.length,0,JSON.stringify(page.consoleErrors));
  console.log('PASS: PNG real, invitación limpia, envío nativo simulado, cancelación, error, alternativa, portapapeles denegado, sin alcohol y tres anchos.');
} finally {if(browser)await browser.close();await server.close();}
