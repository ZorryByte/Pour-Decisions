const test = require('node:test');
const assert = require('node:assert/strict');

const makeSession = (id='person-a', expires_at=Math.floor(Date.now()/1000)+3600) => ({access_token:'access-'+id,refresh_token:'refresh-'+id,user:{id,email:id+'@example.test'},expires_at});
const response = (data,status=200) => new Response(status===204 ? null : JSON.stringify(data),{status});
async function setup({session=makeSession(),handler=()=>response([]),url=' https://example.supabase.co/ ',key=' public-key '}={}){
  const {createCuentaModel} = await import('../src/features/auth-cuenta/models/cuentaModel.js');
  const calls=[],saved=[];let current=session,expired=0;
  const model=createCuentaModel({url,key,
    getSession:()=>current,
    saveSession:value=>{current=value;saved.push(value);},
    onSessionExpired:()=>{current=null;expired++;},
    fetcher:async(url,options)=>{const call={url,options,body:options.body ? JSON.parse(options.body) : null};calls.push(call);return handler(call);},
  });
  return {model,calls,saved,get session(){return current;},get expired(){return expired;},setSession:value=>{current=value;}};
}

test('Sin configurar no hace peticiones y conserva el código de error existente',async()=>{
  const {model,calls}=await setup({url:''});assert.equal(model.configured(),false);
  await assert.rejects(model.requestCode('a@example.test'),error=>error.code==='PGRST205');assert.equal(calls.length,0);
});

test('OTP conserva payloads, clave pública y validación/persistencia de sesión',async()=>{
  const data={access_token:'private-access',refresh_token:'private-refresh',expires_in:3600,user:{id:'a'}};
  const ctx=await setup({session:null,handler:call=>response(call.url.endsWith('/verify') ? data : {})});
  await ctx.model.requestCode('a@example.test');await ctx.model.verifyCode('a@example.test','123456');
  assert.deepEqual(ctx.calls.map(c=>c.body),[{email:'a@example.test',create_user:true},{email:'a@example.test',token:'123456',type:'email'}]);
  assert.equal(ctx.calls[0].url,'https://example.supabase.co/auth/v1/otp');
  assert.equal(ctx.calls[1].options.headers.Authorization,'Bearer public-key');assert.equal(ctx.calls[1].options.headers.apikey,'public-key');
  assert.equal(ctx.saved.length,1);assert.equal(ctx.session.access_token,'private-access');assert(ctx.session.expires_at*1000>Date.now());
  const invalid=await setup({session:null,handler:()=>response({access_token:'x'})});
  await assert.rejects(invalid.model.verifyCode('a@example.test','123456'),/invalid_session/);assert.equal(invalid.saved.length,0);
});

test('Carga las mismas cuatro tablas; conserva fallos parciales para su tratamiento actual',async()=>{
  const ctx=await setup({handler:call=>call.url.includes('avatares_personales') ? response({code:'42P01'},404) : response([{example:true}])});
  const rows=await ctx.model.loadAccount();
  assert.deepEqual(ctx.calls.map(c=>new URL(c.url).pathname.split('/').at(-1)),['perfiles_personales','cocteles_guardados','reacciones_cocteles','avatares_personales']);
  assert.equal(rows.length,4);assert.equal(rows[0].status,'fulfilled');assert.equal(rows[3].status,'rejected');assert.equal(rows[3].reason.code,'42P01');
  assert(ctx.calls.every(c=>c.options.headers.Authorization==='Bearer access-person-a'));
  assert.equal(new URL(ctx.calls[1].url).searchParams.get('order'),'creado_at.desc');
});

test('Guardados, preferencias, avatar y reacciones mantienen el contrato y el propietario de la sesión',async()=>{
  const {model,calls}=await setup({handler:()=>response(null,204)});
  const choices={alcohol:['Ron'],sabor:['Cremoso'],_personalidad:'fresco'};
  await model.saveRecipe('Piña colada',choices);await model.savePreferences(choices);await model.saveAvatar('Piña colada','fresco');
  await model.saveReaction({coctel:'Piña colada',reaccion:'like',motivo:null,probado_gusto:true,usuario_id:'otra-persona'});
  assert.deepEqual(calls[0].body,{coctel:'Piña colada',elecciones:choices,usuario_id:'person-a'});
  assert.deepEqual(calls[1].body.preferencias,choices);assert.equal(calls[2].body.personalidad,'fresco');assert.equal(calls[3].body.probado_gusto,true);
  assert(calls.every(c=>c.options.method==='POST'&&c.options.headers.Prefer==='resolution=merge-duplicates,return=minimal'&&c.body.usuario_id==='person-a'));
  assert(calls.slice(1).every(c=>Number.isFinite(Date.parse(c.body.actualizado_at))));
});

test('Las retiradas mantienen el filtro de receta y el logout usa la sesión autenticada',async()=>{
  const {model,calls}=await setup({handler:()=>response(null,204)});const name='Piña colada / coco & limón';
  await model.removeRecipe(name);await model.removeAvatar(name);await model.removeReaction(name);await model.logout();
  assert(calls.slice(0,3).every(c=>c.options.method==='DELETE'&&new URL(c.url).searchParams.get('coctel')==='eq.'+name));
  assert(calls[3].url.endsWith('/auth/v1/logout?scope=local'));assert.equal(calls[3].options.headers.Authorization,'Bearer access-person-a');
});

test('Las consultas simultáneas comparten una sola renovación de token',async()=>{
  let complete;
  const renewed=makeSession('person-a');renewed.access_token='renewed';renewed.expires_in=3600;
  const ctx=await setup({session:makeSession('person-a',1),handler:call=>call.url.includes('/token?') ? new Promise(resolve=>{complete=()=>resolve(response(renewed));}) : response([])});
  const pending=ctx.model.loadAccount();await Promise.resolve();
  assert.equal(ctx.calls.length,1);assert.deepEqual(ctx.calls[0].body,{refresh_token:'refresh-person-a'});
  complete();const results=await pending;assert(results.every(r=>r.status==='fulfilled'));
  assert.equal(ctx.saved.length,1);assert(ctx.calls.slice(1).every(c=>c.options.headers.Authorization==='Bearer renewed'));
});

test('Renovación rechazada invalida la sesión; un fallo temporal permite reintentar',async()=>{
  for(const status of [400,401,403]){
    const ctx=await setup({session:makeSession('person-a',1),handler:()=>response({code:'expired'},status)});
    await assert.rejects(ctx.model.logout(),error=>error.status===status);assert.equal(ctx.expired,1);assert.equal(ctx.session,null);
  }
  let attempt=0;
  const ctx=await setup({session:makeSession('person-a',1),handler:call=>{
    if(call.url.includes('/token?'))return ++attempt===1 ? response({code:'temporary'},503) : response({...makeSession(),expires_in:3600});
    return response(null,204);
  }});
  await assert.rejects(ctx.model.logout(),error=>error.status===503);assert.equal(ctx.expired,0);assert(ctx.session);
  await ctx.model.logout();assert.equal(attempt,2);
});

test('Una renovación en vuelo no sobrescribe la sesión que cambió en otra pestaña',async()=>{
  let complete;
  const ctx=await setup({session:makeSession('person-a',1),handler:call=>call.url.includes('/token?') ? new Promise(resolve=>{complete=()=>resolve(response({...makeSession('person-a'),expires_in:3600}));}) : response(null,204)});
  const pending=ctx.model.logout();await Promise.resolve();ctx.setSession(makeSession('person-b'));complete();await pending;
  assert.equal(ctx.session.user.id,'person-b');assert.equal(ctx.saved.length,0);
});
