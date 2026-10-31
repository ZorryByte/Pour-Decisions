import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {createServer} from 'vite';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

const mode=process.argv.includes('--before')?'before':'after';
const out=`artifacts/mobile/${mode}`;
mkdirSync(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:5197,hmr:false,watch:{ignored:['**/*']}},
  define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'},
  plugins:[{name:'mobile-test',enforce:'pre',transform(code,id){
    if(id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js'))return code+`
      window.__mobile={partida,render,open(){welcomeOpen=false;welcomeScreen.hidden=true;app.hidden=false;document.body.classList.remove('at-welcome');render();},
      show(stage){partida.phase='step';partida.stage=stage;partida.sel.alcohol.add('Ron');render();}};`;
  }}]});
let browser;
const report=[];
try{
  await server.listen();browser=await Browser.launch({extraArgs:['--disable-gpu']});
  for(const [width,height] of [[320,568],[390,844],[667,375],[768,1024],[1440,900]]){
    const page=await browser.newPage({width,height,reducedMotion:true});
    await page.setViewport({width,height,mobile:width<800});
    await page.send('Network.enable');
    await page.send('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{settleMs:100});
    for(const stage of ['welcome','alcohol','fuerza','fruta','sabor','alergia','plan','profile']){
      if(stage==='alcohol')await page.eval(()=>window.__mobile.open());
      else if(stage==='profile')await page.eval(()=>document.querySelector('#open-profile').click());
      else if(stage!=='welcome')await page.eval(s=>window.__mobile.show(s),stage);
      await new Promise(r=>setTimeout(r,180));
      const metrics=await page.eval(()=>({
        width:innerWidth,scroll:document.documentElement.scrollWidth,
        overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)&&getComputedStyle(e).position!=='fixed'&&e.namespaceURI!=='http://www.w3.org/2000/svg';}).slice(0,10).map(e=>e.className),
        small:[...document.querySelectorAll('button,input:not([type=hidden]),select')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.height<43||r.width<43)}).map(e=>({label:e.textContent.trim().slice(0,45),h:e.offsetHeight,w:e.offsetWidth})),
      }));
      report.push({width,height,stage,...metrics});
      await page.screenshot({path:`${out}/${stage}-${width}.png`,format:'png',fullPage:true});
      if(mode==='after')assert(metrics.scroll<=width+1,`Sin desborde ${stage} ${width}: ${JSON.stringify(metrics)}`);
      if(mode==='after'&&stage==='alcohol')assert(await page.eval(()=>[...document.querySelectorAll('.bubble')].every(e=>e.scrollWidth<=e.clientWidth+1)),'Las etiquetas de las bases caben');
      if(mode==='after'&&stage==='sabor'&&width===390){
        const before=await page.eval(()=>Object.keys(window.__mobile.partida.styleDecisions).length);
        const point=await page.eval(()=>{const card=document.querySelector('.swipe-card');card.scrollIntoView({block:'center'});const r=card.getBoundingClientRect();return{x:r.x+r.width*.5,y:r.y+r.height*.5};});
        const touch=async(type,x,y)=>page.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
        await touch('touchStart',point.x,point.y);
        for(let i=1;i<=6;i++)await touch('touchMove',point.x+i*22,point.y);
        await touch('touchEnd',0,0);
        await new Promise(r=>setTimeout(r,100));
        assert.equal(await page.eval(()=>Object.keys(window.__mobile.partida.styleDecisions).length),before+1,'Deslizamiento táctil horizontal elige una tarjeta');
        await page.eval(()=>document.querySelector('.undo-style').click());
        await page.eval(()=>document.querySelector('.swipe-action.reject').click());
        assert.equal(await page.eval(()=>Object.keys(window.__mobile.partida.styleDecisions).length),before+1,'El botón Pasar funciona sin gesto');
      }
    }
    assert.deepEqual(page.consoleErrors,[]);
    await page.close();
  }
  writeFileSync(`${out}/metrics.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report.filter(r=>r.scroll>r.width+1||r.small.length),null,2));
}finally{await browser?.close();await server.close();}
