// Integración en Chromium con API local simulada: nunca envía correos ni datos reales.
import {createServer} from 'node:http';
import {readFileSync, mkdirSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import assert from 'node:assert/strict';
import {createServer as createViteServer} from 'vite';
let dev;
import {Browser, Page} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

const root = resolve('.'), records = {perfiles_personales:[], cocteles_guardados:[], reacciones_cocteles:[], avatares_personales:[], elecciones_personales:[]};
const calls = []; let failFavorite = false, failAvatar = false, failPreferences = false, failRemoval = false, refreshes = 0;
const session = (id = 'person-a') => ({access_token:'access-' + id, refresh_token:'refresh-' + id, expires_in:3600, user:{id, email:id + '@example.test'}});
const server = createServer(async (req,res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  function json(data, status = 200){ res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(data)); }
  if (url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/rest/v1/')){
    let body = ''; for await (const part of req) body += part;
    const data = body ? JSON.parse(body) : null;
    calls.push({path:url.pathname, method:req.method, data});
    if (url.pathname === '/auth/v1/otp') return json({});
    if (url.pathname === '/auth/v1/verify') return data.token === '123456' ? json(session()) : json({error_code:'otp_expired'},403);
    if (url.pathname === '/auth/v1/token'){ refreshes++; return json(session()); }
    if (url.pathname === '/auth/v1/logout') return json({});
    const owner = req.headers.authorization?.replace('Bearer access-', '');
    if (!['person-a','person-b'].includes(owner)) return json({code:'no_auth'},401);
    const table = url.pathname.split('/').at(-1);
    if (!records[table]) return json({code:'PGRST205'},404);
    if (req.method === 'GET') return json(records[table].filter(r => r.usuario_id === owner));
    if (req.method === 'DELETE'){
      if (table === 'cocteles_guardados' && failRemoval){ failRemoval = false; return json({code:'connection'},503); }
      const name = url.searchParams.get('coctel')?.replace(/^eq\./, '');
      records[table] = records[table].filter(r => !(r.usuario_id === owner && r.coctel === name));
      if (table === 'cocteles_guardados') records.avatares_personales = records.avatares_personales.filter(r => !(r.usuario_id === owner && r.coctel === name));
      return json(null);
    }
    if (data.usuario_id !== owner) return json({code:'42501'},403);
    if (table === 'cocteles_guardados' && failFavorite){ failFavorite = false; return json({code:'connection'},503); }
    if (table === 'avatares_personales' && failAvatar){ failAvatar = false; return json({code:'connection'},503); }
    if (table === 'perfiles_personales' && failPreferences){ failPreferences = false; return json({code:'connection'},503); }
    if (table === 'avatares_personales' && !records.cocteles_guardados.some(r => r.usuario_id === owner && r.coctel === data.coctel)) return json({code:'23503'},409);
    const index = records[table].findIndex(r => r.usuario_id === owner && (table === 'elecciones_personales' ? r.id === data.id : ['perfiles_personales','avatares_personales'].includes(table) || r.coctel === data.coctel));
    if (index < 0) records[table].push({...data, creado_at:new Date().toISOString()}); else records[table][index] = {...records[table][index], ...data};
    return json(null);
  }
  dev.middlewares(req,res,()=>{res.writeHead(404);res.end();});
});
await new Promise(r => server.listen(0,'127.0.0.1',r));

const expose = `
Object.defineProperties(window, {
  sel:{configurable:true,get:()=>sel}, C:{configurable:true,get:()=>C},
  current:{configurable:true,get:()=>current,set:v=>{current=v}},
  step:{configurable:true,get:()=>step,set:v=>{step=v}},
  phase:{configurable:true,get:()=>phase,set:v=>{phase=v}},
  styleDecisions:{configurable:true,get:()=>styleDecisions,set:v=>{styleDecisions=v}},
  welcomeOpen:{configurable:true,get:()=>welcomeOpen,set:v=>{welcomeOpen=v}},
  moveFocus:{configurable:true,get:()=>moveFocus,set:v=>{moveFocus=v}},
  render:{configurable:true,get:()=>render}, ranked:{configurable:true,get:()=>ranked},
  choca:{configurable:true,get:()=>choca}, enterGame:{configurable:true,get:()=>enterGame},
  welcomeScreen:{configurable:true,get:()=>welcomeScreen}, app:{configurable:true,get:()=>app}
});`;
dev=await createViteServer({server:{hmr:false,ws:{server},watch:{ignored:['**/*']},middlewareMode:true},plugins:[{name:'cuenta-solo-pruebas',enforce:'pre',transform(code,id){
  if(!id.replaceAll('\\','/').endsWith('/src/app/iniciarSistema.js'))return;
  const apiUrl='http://127.0.0.1:'+server.address().port;
  return code.replace(/const SUPABASE_URL = [^;]*;/, 'const SUPABASE_URL = new URLSearchParams(location.search).get("qa")==="connected" ? '+JSON.stringify(apiUrl)+' : "";')
    .replace(/const SUPABASE_ANON_KEY = [^;]*;/, 'const SUPABASE_ANON_KEY = new URLSearchParams(location.search).get("qa")==="connected" ? "test-public-key" : "";')+expose
      .replace(/=>\s*(current|step|phase|styleDecisions)\b/g,'=>partida.$1')
      .replace(/\b(current|step|phase|styleDecisions)=v\b/g,'partida.$1=v');
}}]});

let browser, page;
const url = 'http://127.0.0.1:' + server.address().port;
async function until(fn, description, argument){
  const start = Date.now();
  while (Date.now() - start < 8000){ if (await page.eval(fn, argument)) return; await new Promise(r => setTimeout(r,50)); }
  throw new Error('Timed out: ' + description + '\n' + await page.eval(() => document.body.innerText.slice(-1600)));
}
async function click(text){
  await page.eval(label => {
    const b = [...document.querySelectorAll('button')].find(b => (b.textContent.trim() === label || b.getAttribute('aria-label') === label) && !b.disabled);
    if (!b) throw new Error('Button missing: ' + label); b.click();
  }, text);
}
try {
  mkdirSync('artifacts/perfil', {recursive:true});
  browser = await Browser.launch({extraArgs:['--disable-gpu']});
  const {targetId} = await browser.send('Target.createTarget',{url:'about:blank'});
  const {sessionId} = await browser.send('Target.attachToTarget',{targetId, flatten:true});
  page = new Page(browser,targetId,sessionId);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  await page.send('Network.setBlockedURLs',{urls:['*cdn.jsdelivr.net*','*fonts.googleapis.com*','*fonts.gstatic.com*']});
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion', value:'reduce'}]});
  await page.setViewport({width:1440,height:1000});
  await page.goto(url,{settleMs:50});
  await click('Mi perfil');
  assert(await page.eval(() => document.body.innerText.includes('aún no está disponible')));
  assert(await page.eval(() => document.querySelector('.profile-auth-form button[type=submit]').disabled));
  await page.screenshot({path:'artifacts/perfil/acceso-sin-configuracion.png'});
  await click('Volver al inicio');
  assert(await page.eval(() => !document.querySelector('#welcome-screen').hidden));

  await page.goto(url + '/?qa=connected',{settleMs:50});
  await page.eval(() => {
    enterGame();
    sel.alcohol.add('Ron');sel.fruta.add('Piña');sel.fruta.add('Coco');sel.sabor.add('Cremoso');sel.fuerza.add('Suave');sel.alergia.add('ninguna');sel.plan.add('playa');
    Preguntas.restore({version:1,ids:[41,42,43],answers:{41:0,42:0,43:0},index:2});step=5; phase='step';render();
  });
  assert.equal(await page.eval(() => document.querySelectorAll('#f-name').length),0,'No name required before result');
  await click('Descubrir mi cóctel');
  await until(() => !!document.querySelector('.profile-feedback'), 'result');
  const selected = await page.eval(() => current.n);
  const originalFace = await page.eval(() => document.querySelector('.result-character .chibi-face').outerHTML);
  await click('Me apetece');
  await until(() => document.querySelector('.profile-reactions button').getAttribute('aria-pressed') === 'true','guest reaction');
  assert.equal(records.cocteles_guardados.length,0,'like must not save');
  await page.screenshot({path:'artifacts/perfil/resultado-desktop.png'});
  await click('Elegir como mi favorito');
  await until(() => !!document.querySelector('#profile-email'),'auth');
  assert(await page.eval(name => document.querySelector('.profile-lead').textContent.includes(name), selected));
  await page.goto('about:blank',{settleMs:0});
  await page.goto(url + '/?qa=connected#perfil',{settleMs:50});
  assert(await page.eval(name => document.querySelector('.profile-lead').textContent.includes(name), selected),'pending survives navigation before auth');
  await page.screenshot({path:'artifacts/perfil/acceso-desktop.png'});
  await page.eval(() => {document.querySelector('#profile-email').value='person-a@example.test';document.querySelector('.profile-auth-form').requestSubmit();});
  await until(() => !!document.querySelector('#profile-code') && !document.querySelector('#profile-code').disabled, 'code requested');
  assert.equal(await page.eval(() => document.activeElement.id),'profile-code','El código conserva su foco tras solicitar acceso');
  await page.goto(url + '/?qa=connected#perfil',{settleMs:50});
  assert.equal(await page.eval(() => document.querySelector('#profile-email').value),'person-a@example.test','El correo se conserva al recargar');
  assert(await page.eval(() => !!document.querySelector('#profile-code')),'El paso del código se conserva al recargar');
  assert(await page.eval(() => [...document.querySelectorAll('button')].some(b => b.textContent.startsWith('Reenviar en ') && b.disabled)),'El reenvío respeta la espera tras recargar');
  for (const width of [1440,768,390]){
    await page.setViewport({width,height:1000,mobile:width<500});
    assert(await page.eval(() => document.documentElement.scrollWidth <= innerWidth),'acceso sin desbordamiento ' + width);
    await page.screenshot({path:`artifacts/perfil/codigo-${width}.png`});
  }
  await page.setViewport({width:1440,height:1000});
  await page.eval(() => {document.querySelector('#profile-code').value='000000';document.querySelector('.profile-auth-form').requestSubmit();});
  await until(() => !!document.querySelector('[role=alert]'), 'wrong code');
  assert.equal(records.cocteles_guardados.length,0);
  failFavorite = true;
  await page.eval(() => {document.querySelector('#profile-code').value='123456';document.querySelector('.profile-auth-form').requestSubmit();});
  await until(() => !!document.querySelector('.profile-pending') && !document.querySelector('.profile-pending button').disabled, 'pending after failure');
  assert(await page.eval(() => !!sessionStorage.getItem('cocteles_guardado_pendiente_v1')),'pending survives failure');
  await click('Guardar esta receta');
  await until(() => !!document.querySelector('.profile-recipe') && !document.querySelector('.profile-pending'), 'saved after retry');
  assert.equal(records.cocteles_guardados.length,1);
  assert.equal(records.cocteles_guardados[0].coctel, selected);
  await click('Ver mis estadísticas');
  await until(() => !!document.querySelector('.profile-stats-summary'), 'personal statistics');
  assert.equal(records.elecciones_personales.length, 1, 'guest result follows explicit account login');
  assert.equal(await page.eval(() => location.hash), '#perfil/estadisticas');
  assert.equal(await page.eval(() => document.querySelectorAll('.profile-recipe').length), 0, 'exclusive statistics view');
  assert.equal(await page.eval(() => document.querySelector('.profile-stats-summary dd').textContent), '1');
  for (const width of [1440,768,390]){
    await page.setViewport({width,height:1000,mobile:width<500});
    assert(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), 'statistics no overflow ' + width);
    await page.screenshot({path:'artifacts/perfil/estadisticas-' + width + '.png',fullPage:true});
  }
  await click('Actualizar estadísticas');
  await until(() => !!document.querySelector('.profile-stats-summary'), 'refresh statistics');
  assert.equal(records.elecciones_personales.length, 1, 'refresh does not duplicate results');
  await click('Volver a mi perfil');
  assert.equal(await page.eval(() => document.querySelector('.profile-stats-summary')),null, 'statistics hidden after returning');
  await page.setViewport({width:1440,height:1000});
  assert.equal(records.avatares_personales[0].coctel,selected);
  assert.equal(await page.eval(() => document.querySelector('.profile-identity .chibi-face').outerHTML),originalFace,'avatar has the original result face');
  assert.equal(await page.eval(() => getComputedStyle(document.querySelector('.profile-identity .crystal')).fill),'rgb(255, 253, 240)','avatar keeps original crystal color');
  await page.eval(() => {sel.plan.clear();sel.plan.add('fiesta');sel.sabor.clear();sel.sabor.add('Ácido');});
  await click('Mis gustos');await click('Mis cócteles');
  assert.equal(await page.eval(() => document.querySelector('.profile-identity .chibi-face').outerHTML),originalFace,'new wizard choices cannot change saved avatar');
  assert.equal(records.reacciones_cocteles[0].reaccion,'like');
  assert.equal(records.reacciones_cocteles[0].probado_gusto,false);
  await click('Lo probé y me gustó');
  await until(() => document.querySelector('.profile-reactions [aria-label="Lo probé y me gustó"]')?.getAttribute('aria-pressed') === 'true','tasted independent');
  assert.equal(await page.eval(() => document.querySelectorAll('.profile-reactions.is-compact button').length),3,'Three compact reaction controls');
  assert.equal(records.reacciones_cocteles[0].reaccion,'like','Tasted does not overwrite interest');
  assert.equal(records.reacciones_cocteles[0].probado_gusto,true);
  await page.screenshot({path:'artifacts/perfil/coleccion-desktop.png'});
  for (const width of [768,390]){
    await page.setViewport({width,height:1000,mobile:width<500});
    assert(await page.eval(() => document.documentElement.scrollWidth <= innerWidth),'no horizontal overflow ' + width);
    await page.screenshot({path:`artifacts/perfil/coleccion-${width}.png`});
  }
  await click('Mis gustos');
  const previousPreferences=JSON.stringify(records.perfiles_personales);
  failPreferences=true;
  await page.eval(() => document.querySelector('.profile-tastes').requestSubmit());
  await until(() => !!document.querySelector('[role=alert]') && !document.querySelector('.profile-tastes button[type=submit]').disabled, 'preferences failure');
  assert.equal(JSON.stringify(records.perfiles_personales),previousPreferences,'Failed update preserves saved preferences');
  await page.eval(() => {
    const form=document.querySelector('.profile-tastes');
    form.querySelector('input[name=alcohol][value=Ron]').checked=false;
    form.querySelector('input[name=alcohol][value="Sin alcohol"]').checked=true;
    form.querySelector('input[name=alergia][value=lacteos]').click();
    form.requestSubmit();
  });
  await until(() => document.body.innerText.includes('Tus gustos se actualizaron'),'preferences saved');
  await click('Por descubrir');
  const names = await page.eval(() => [...document.querySelectorAll('.profile-recipe h3')].map(n=>n.textContent));
  assert(names.length > 0);
  assert(await page.eval(() => [...document.querySelectorAll('.profile-recipe h3')].every(n => {const c=C.find(c=>c.n===n.textContent);return c.a.includes('Sin alcohol') && !choca(c,new Set(['lacteos']));})), 'restrictions on suggestions');
  await page.screenshot({path:'artifacts/perfil/descubrir-mobile.png'});
  const rejected = names[0];
  await click('No me convence');
  await until(name => ![...document.querySelectorAll('.profile-recipe h3')].some(n => n.textContent === name), 'rejected recipe removed', rejected);
  // Comprobar en el estado persistido que el dislike no guardó la receta.
  await until(() => !document.querySelector('.profile-page .profile-content .btn:disabled'), 'reaction completed');
  assert(records.reacciones_cocteles.some(r => r.coctel === rejected && r.reaccion === 'dislike'));
  assert(!records.cocteles_guardados.some(r => r.coctel === rejected));
  const secondFavorite = await page.eval(() => document.querySelector('.profile-recipe h3').textContent);
  failAvatar = true;
  await click('Elegir como mi favorito');
  await until(() => !!document.querySelector('.profile-pending') && !document.querySelector('.profile-pending button').disabled,'avatar write failure');
  assert.equal(records.avatares_personales[0].coctel,selected,'failed change keeps original avatar');
  assert.equal(records.cocteles_guardados.length,2,'recipe saved even if choosing avatar needs retry');
  await click('Guardar esta receta');
  await until(name => document.querySelector('.profile-signature')?.textContent.includes(name),'avatar retry',secondFavorite);
  assert.equal(records.avatares_personales.length,1,'one favorite per account');
  assert.equal(records.avatares_personales[0].coctel,secondFavorite);
  await click('Mis cócteles');
  await click('Favorito');
  await until(() => !!document.querySelector('.profile-avatar.is-empty'),'remove favorite keeps collection');
  assert.equal(records.cocteles_guardados.length,2);
  await click('Quitar de mi colección');
  await until(() => document.querySelectorAll('.profile-recipe').length===1,'remove second recipe');
  await click('Usar como mi favorito');
  await until(() => !!document.querySelector('.profile-identity .chibi-face'),'favorite restored');
  assert.equal(await page.eval(() => document.querySelector('.profile-identity .chibi-face').outerHTML),originalFace);
  await page.screenshot({path:'artifacts/perfil/avatar-mobile.png'});
  await click('Mis gustos');
  await page.eval(name => {
    const select=[...document.querySelectorAll('.profile-history-row select')].find(s=>s.getAttribute('aria-label').endsWith(name));
    select.value='textura';select.dispatchEvent(new Event('change',{bubbles:true}));
  }, rejected);
  await until(() => !document.querySelector('.profile-page .profile-content .btn:disabled'), 'dislike reason saved');
  assert.equal(records.reacciones_cocteles.find(r=>r.coctel===rejected).motivo, 'textura');
  await page.eval(name => {
    const row=[...document.querySelectorAll('.profile-history-row')].find(r=>r.querySelector('span')?.textContent.startsWith(name+' · '));
    row.querySelector('button').click();
  }, rejected);
  await until(() => document.body.innerText.includes('Reacción retirada.'), 'reaction forgotten');
  assert(!records.reacciones_cocteles.some(r=>r.coctel===rejected));
  assert.equal(records.cocteles_guardados.length,1,'forgetting reaction preserves saved recipes');
  assert.equal(records.avatares_personales.length,1,'forgetting reaction preserves avatar');
  await page.eval(() => {document.querySelector('input[name=alergia][value=otra]').click();document.querySelector('.profile-tastes').requestSubmit();});
  await until(() => document.body.innerText.includes('Tus gustos se actualizaron'),'other restriction saved');
  await click('Por descubrir');
  assert.equal(await page.eval(() => document.querySelectorAll('.profile-recipe').length),0);
  assert(await page.eval(() => document.body.innerText.includes('restricción por revisar')));
  await click('Mis cócteles');
  const beforeRemoval = JSON.stringify(records);
  failRemoval = true;
  await click('Quitar de mi colección');
  await until(() => !!document.querySelector('[role=alert]') && !document.querySelector('.profile-recipe-actions button:disabled'),'failed removal');
  assert.equal(JSON.stringify(records),beforeRemoval,'failed removal preserves account records');
  assert.equal(await page.eval(() => document.querySelectorAll('.profile-recipe').length),1,'failed removal keeps recipe visible');
  assert(await page.eval(() => !!document.querySelector('.profile-identity .chibi-face')),'failed removal keeps avatar visible');
  await click('Quitar de mi colección');
  await until(() => !!document.querySelector('.profile-empty'),'favorite removed');
  assert.equal(records.cocteles_guardados.length,0);
  assert.equal(records.avatares_personales.length,0,'removing chosen recipe removes avatar');
  assert(records.reacciones_cocteles.some(r => r.coctel === selected && r.probado_gusto),'removing favorite preserves reaction');
  await page.screenshot({path:'artifacts/perfil/vacio-mobile.png'});

  // Refresh real del cliente con sesión caducada y API de tokens simulada.
  await page.eval(() => {const data=JSON.parse(localStorage.getItem('cocteles_cuenta_v1'));data.expires_at=1;localStorage.setItem('cocteles_cuenta_v1',JSON.stringify(data));});
  await page.goto('about:blank',{settleMs:0});
  await page.goto(url + '/?qa=connected#perfil',{settleMs:50});
  await until(() => !!document.querySelector('.profile-empty'), 'reload profile');
  assert(refreshes >= 1);
  await page.send('Page.reload');
  await new Promise(r => setTimeout(r,200));
  await until(() => performance.getEntriesByType('navigation')[0]?.type === 'reload' && document.body.classList.contains('at-welcome'), 'reload returns home');
  assert.equal(await page.eval(() => location.hash),'');
  await page.eval(() => document.getElementById('open-profile').click());
  await until(() => !!document.querySelector('.profile-empty'), 'account preserved after reload');
  // Tres insignias destacadas, elegidas únicamente entre las obtenidas.
  await click('Insignias');
  const canImport=await page.eval(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Conservar mis insignias'));
  if(canImport) await click('Conservar mis insignias');
  await page.eval(()=>{
    const context={badgeAccountId:Perfil.accountId(),current:C[0],fruitAny:false,sel:{alcohol:new Set(['Ron']),fruta:new Set(['Piña','Coco']),sabor:new Set(['Dulce']),fuerza:new Set(['Suave']),plan:new Set(),alergia:new Set(['ninguna'])}};
    Insignias.collect(context);context.sel.fuerza=new Set(['Fuerte']);Insignias.collect(context);context.sel.alcohol=new Set(['Whisky']);Insignias.collect(context);
    Perfil.render();
  });
  assert(await page.eval(()=>document.querySelectorAll('[data-feature-badge]').length>=4));
  await click('Destacar');await click('Destacar');await click('Destacar');
  assert.equal(await page.eval(()=>document.querySelectorAll('.profile-featured-badge').length),3);
  assert(await page.eval(()=>[...document.querySelectorAll('[data-feature-badge][aria-pressed=false]')].every(b=>b.disabled)),'Una cuarta no se puede seleccionar');
  await click('Quitar');
  assert.equal(await page.eval(()=>document.querySelectorAll('.profile-featured-badge').length),2);
  await click('Destacar');
  for(const width of [1440,768,390]){
    await page.setViewport({width,height:1000,mobile:width<500});
    await page.eval(()=>scrollTo(0,0));
    assert(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth),'Sin desbordamiento en insignias '+width);
    await page.screenshot({path:'artifacts/perfil/insignias-'+width+'.png',format:'png'});
  }
  await page.send('Page.reload');await new Promise(r=>setTimeout(r,200));
  await until(()=>document.body.classList.contains('at-welcome'),'reload insignias');
  await page.eval(()=>document.getElementById('open-profile').click());
  await click('Insignias');
  assert.equal(await page.eval(()=>document.querySelectorAll('.profile-featured-badge').length),3,'Destacadas conservadas tras recargar');
  await click('Cerrar sesión');
  await until(() => !!document.querySelector('#profile-email'),'logout');
  assert.equal(await page.eval(() => localStorage.getItem('cocteles_cuenta_v1')),null);
  assert.equal(await page.eval(() => document.querySelectorAll('.profile-history-row').length),0);
  // Una cuenta distinta entra por enlace directo y no ve las estadísticas anteriores.
  await page.eval(value => localStorage.setItem('cocteles_cuenta_v1', JSON.stringify(value)), {...session('person-b'),expires_at:Math.floor(Date.now()/1000)+3600});
  await page.goto('about:blank',{settleMs:0});
  await page.goto(url + '/?qa=connected#perfil/estadisticas',{settleMs:50});
  await until(() => !!document.querySelector('.profile-empty'), 'empty statistics of another account');
  assert.equal(await page.eval(() => document.querySelector('.profile-stats-summary')),null);
  assert(await page.eval(() => document.body.innerText.includes('Todavía no hay elecciones registradas')));
  await page.screenshot({path:'artifacts/perfil/estadisticas-vacias.png',fullPage:true});
  await page.eval(() => {
    Perfil.recordResult(C[0].n); Perfil.recordResult(C[0].n); Perfil.render();
  });
  await until(() => !document.querySelector('.profile-page .btn:disabled'), 'saved signed-in statistics');
  await click('Actualizar estadísticas');
  await until(() => !!document.querySelector('.profile-stats-summary'), 'signed-in statistics loaded');
  assert.equal(records.elecciones_personales.filter(row => row.usuario_id === 'person-b').length,1,'repeated render does not duplicate');
  assert.equal(await page.eval(() => document.querySelector('.profile-stats-summary dd').textContent),'1','statistics scoped to current account');
  await click('Volver al inicio'); await click('Mi perfil');
  await until(() => !!document.querySelector('.profile-identity'), 'general entry opens profile');
  assert.equal(await page.eval(() => document.querySelector('.profile-stats-summary')),null,'general profile entry never opens statistics');
  assert.equal(page.consoleErrors.length,0,JSON.stringify(page.consoleErrors));
  console.log('PASS: acceso, resultado sin registro, reacciones, OTP, avatar, favorito, preferencias, tres insignias destacadas, límite, cambio, persistencia, recarga y salida.');
  console.log('PASS: capturas 1440/768/390, sin desbordamiento ni errores de consola. API aislada: ' + calls.length + ' solicitudes.');
} finally {
  if (browser) await browser.close();
  await dev?.close();
  server.closeAllConnections();
  await new Promise(r => server.close(r));
}
