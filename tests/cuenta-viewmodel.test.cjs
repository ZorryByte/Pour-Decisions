const test = require('node:test');
const assert = require('node:assert/strict');

const session = id => ({access_token:'access-'+id,refresh_token:'refresh-'+id,user:{id}});
const fulfilled = value => ({status:'fulfilled',value});
const result = (name='Mojito') => [
  fulfilled([{preferencias:{alcohol:['Ron']}}]),
  fulfilled([{coctel:name},{coctel:'Receta desconocida'}]),
  fulfilled([{coctel:name,reaccion:'like'},{coctel:'Receta desconocida'}]),
  fulfilled([{coctel:'Receta desconocida'},{coctel:name,personalidad:'fresco'}]),
];
async function setup({stored=session('a'),loadAccount=async()=>result(),...access}={}){
  const {createCuentaViewModel} = await import('../src/features/auth-cuenta/viewmodels/cuentaViewModel.js');
  let persisted=stored;const writes=[],events=[];
  const vm=createCuentaViewModel({loadAccount,
    readSession:()=>persisted,
    writeSession:value=>{persisted=value;writes.push(value);},
    normalizePreferences:raw=>({alcohol:Array.isArray(raw?.alcohol)?raw.alcohol:[]}),
    hasDrink:name=>['Mojito','Piña colada'].includes(name),
    ...access,
  });
  vm.subscribe(event=>events.push(event));
  vm.restoreGuest();
  return {vm,writes,events,store:value=>{persisted=value;},get persisted(){return persisted;}};
}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('El reenvío espera 60 segundos, conserva el correo verificado y restaura el paso al recargar',async()=>{
  let time=100000,stored=null;const emails=[];
  const options={stored:null,now:()=>time,readAccess:()=>stored,writeAccess:v=>{stored=v;},requestCode:async email=>{emails.push(email);}};
  const ctx=await setup(options);
  assert.equal(await ctx.vm.submitAccess('  A@Example.Test  '),true);
  assert.equal(ctx.vm.resendWait(),60);
  assert.equal(await ctx.vm.resendCode(),false);assert.equal(emails.length,1);
  const next=await setup(options);next.vm.restoreAccess();
  assert.equal(next.vm.state.email,'a@example.test');assert.equal(next.vm.state.codeSent,true);
  time+=60000;assert.equal(await next.vm.resendCode(),true);assert.equal(next.vm.resendWait(),60);
  assert.deepEqual(emails,['a@example.test','a@example.test']);
  next.vm.changeEmail();assert.equal(stored,null);assert.equal(next.vm.state.codeSent,false);
});

test('Rechaza desafíos caducados y entradas inválidas sin enviar peticiones',async()=>{
  let requests=0;
  const ctx=await setup({stored:null,readAccess:()=>({email:'a@example.test',sentAt:1}),now:()=>4000000,requestCode:async()=>{requests++;}});
  ctx.vm.restoreAccess();assert.equal(ctx.vm.state.codeSent,false);
  assert.equal(await ctx.vm.submitAccess('correo incompleto'),false);assert.equal(requests,0);
  await ctx.vm.submitAccess('a@example.test');
  assert.equal(await ctx.vm.submitAccess('otro@example.test','abc'),false);
  assert.equal(ctx.vm.state.email,'a@example.test');assert.equal(requests,1);
});

test('Entrar sin receta pendiente crea los gustos del perfil nuevo y conserva los de una cuenta existente',async()=>{
  for(const exists of [false,true]){
    let ctx;const writes=[];
    ctx=await setup({stored:null,requestCode:async()=>{},verifyCode:async()=>ctx.vm.saveSession(session('a')),
      loadAccount:async()=>[fulfilled(exists?[{preferencias:{alcohol:['Ron']}}]:[]),fulfilled([]),fulfilled([]),fulfilled([])],
      currentChoices:()=>({alcohol:['Gin']}),persistPreferences:async value=>writes.push(value),
    });
    await ctx.vm.submitAccess('a@example.test');assert.equal(await ctx.vm.submitAccess('a@example.test','123456'),true);
    assert.deepEqual(writes,exists?[]:[{alcohol:['Gin']}]);
    assert.deepEqual(ctx.vm.state.data.preferences,{alcohol:[exists?'Ron':'Gin']});
  }
});

test('Restaura la sesión existente; rechaza sesiones inválidas sin solicitar datos',async()=>{
  let requests=0;const ctx=await setup({loadAccount:async()=>{requests++;return result();}});
  assert.equal(ctx.vm.state.session,null);ctx.vm.restoreSession();assert.equal(ctx.vm.getSession().user.id,'a');assert.equal(requests,0);assert.deepEqual(ctx.events,[]);
  for(const invalid of [null,{},'texto',{access_token:'incompleta',user:{id:'b'}}]){
    ctx.store(invalid);ctx.vm.restoreSession();await ctx.vm.load();assert.equal(ctx.vm.getSession(),null);
  }
  assert.equal(requests,0);
});

test('Carga conserva datos, filtros y avisos de inicio/fin sin un render por propiedad',async()=>{
  const request=deferred();const ctx=await setup({loadAccount:()=>request.promise});ctx.vm.restoreSession();
  const state=ctx.vm.state,pending=ctx.vm.load();
  assert.strictEqual(ctx.vm.state,state);assert.equal(state.loading,true);assert.equal(state.loaded,false);assert.deepEqual(ctx.events,['load-start']);
  request.resolve(result());await pending;
  assert.equal(state.loading,false);assert.equal(state.loaded,true);assert.deepEqual(state.data.preferences,{alcohol:['Ron']});
  assert.deepEqual(state.data.favorites,[{coctel:'Mojito'}]);assert.deepEqual(state.data.reactions,[{coctel:'Mojito',reaccion:'like'}]);assert.equal(state.data.avatar.coctel,'Mojito');
  assert.deepEqual(ctx.events,['load-start','load-end']);assert.equal(ctx.writes.length,0);
});

test('Un avatar sin receta guardada no se muestra y el fallo de carga permite reintentar',async()=>{
  let fail=true;const ctx=await setup({loadAccount:async()=>{
    if(fail)return [fulfilled([]),{status:'rejected',reason:{code:'PGRST205'}},fulfilled([]),fulfilled([])];
    return [fulfilled([]),fulfilled([]),fulfilled([]),fulfilled([{coctel:'Mojito',personalidad:'fresco'}])];
  }});ctx.vm.restoreSession();await ctx.vm.load();
  assert.equal(ctx.vm.state.loaded,false);assert.equal(ctx.vm.state.loading,false);assert.equal(ctx.vm.state.error,'El perfil todavía no está disponible. Puedes seguir descubriendo cócteles.');
  // La Vista conserva su acción de reintento y limpia el mensaje, como antes.
  ctx.vm.state.error='';fail=false;await ctx.vm.load();assert.equal(ctx.vm.state.loaded,true);assert.equal(ctx.vm.state.data.avatar,null);
});

test('Cerrar sesión vacía la colección y descarta una respuesta que seguía en vuelo',async()=>{
  const request=deferred();const ctx=await setup({loadAccount:()=>request.promise});ctx.vm.restoreSession();const pending=ctx.vm.load();
  ctx.vm.clearSession();assert.equal(ctx.persisted,null);assert.equal(ctx.vm.state.loading,false);assert.deepEqual(ctx.vm.state.data.favorites,[]);
  request.resolve(result());await pending;
  assert.equal(ctx.vm.getSession(),null);assert.equal(ctx.vm.state.loaded,false);assert.deepEqual(ctx.vm.state.data.favorites,[]);assert.deepEqual(ctx.events,['load-start']);
});

test('Cambiar de cuenta descarta tanto resultados como errores de la carga anterior',async()=>{
  for(const failOld of [false,true]){
    const old=deferred();let count=0;
    const ctx=await setup({loadAccount:()=>++count===1?old.promise:Promise.resolve(result('Piña colada'))});
    ctx.vm.restoreSession();const previous=ctx.vm.load();ctx.store(session('b'));ctx.vm.reloadSession();
    assert.equal(ctx.vm.getSession().user.id,'b');assert.equal(ctx.vm.state.loading,false);assert.equal(ctx.events.at(-1),'session-changed');
    await ctx.vm.load();
    if(failOld)old.reject({status:429});else old.resolve(result('Mojito'));
    await previous;assert.equal(ctx.vm.state.data.favorites[0].coctel,'Piña colada');assert.equal(ctx.vm.state.error,'');assert.equal(ctx.vm.state.loaded,true);
  }
});

test('La renovación guarda una sola sesión y una expiración conserva el manejo de error',async()=>{
  let vm;
  const ctx=await setup({loadAccount:async()=>{vm.expireSession();return [{status:'rejected',reason:{status:401}}];}});vm=ctx.vm;
  vm.restoreSession();const renewed={...session('a'),access_token:'renewed'};vm.saveSession(renewed);
  assert.strictEqual(vm.getSession(),renewed);assert.strictEqual(ctx.persisted,renewed);assert.deepEqual(ctx.events,[]);
  await vm.load();assert.equal(vm.getSession(),null);assert.equal(ctx.persisted,null);assert.equal(vm.state.loading,false);assert.equal(vm.state.error,'Tu acceso caducó. Vuelve a entrar; tu cóctel sigue aquí.');
  assert.deepEqual(ctx.events,['load-start','session-expired','load-end']);
});

test('Una sesión verificada invalida la carga previa y las suscripciones pueden retirarse',async()=>{
  const old=deferred();const ctx=await setup({loadAccount:()=>old.promise});ctx.vm.restoreSession();const pending=ctx.vm.load();
  ctx.vm.saveSession(session('b'));ctx.vm.sessionVerified();old.resolve(result());await pending;
  assert.equal(ctx.vm.state.loaded,false);assert.deepEqual(ctx.vm.state.data.favorites,[]);
  let calls=0;const off=ctx.vm.subscribe(()=>calls++);ctx.vm.expireSession();assert.equal(calls,1);off();ctx.vm.expireSession();assert.equal(calls,1);
});

test('Solicitar código normaliza el correo, bloquea duplicados y conserva los avisos de la Vista',async()=>{
  const sent=deferred(),emails=[];
  const ctx=await setup({stored:null,requestCode:email=>{emails.push(email);return sent.promise;}});
  const pending=ctx.vm.submitAccess('  A@Example.Test  ');
  assert.equal(ctx.vm.state.email,'a@example.test');assert.equal(ctx.vm.state.busy,true);assert.equal(ctx.vm.state.codeSent,false);
  assert.equal(await ctx.vm.submitAccess('otro@example.test'),false);assert.deepEqual(emails,['a@example.test']);
  sent.resolve();assert.equal(await pending,true);assert.equal(ctx.vm.state.codeSent,true);assert.equal(ctx.vm.state.busy,false);
  assert.deepEqual(ctx.events,['action-start','action-end']);
  ctx.vm.state.error='Anterior';ctx.vm.changeEmail();assert.equal(ctx.vm.state.codeSent,false);assert.equal(ctx.vm.state.error,'');assert.equal(ctx.vm.state.email,'a@example.test');assert.equal(ctx.events.at(-1),'access-reset');
});

test('Un fallo al enviar código conserva el formulario y permite reintentar',async()=>{
  let attempts=0;
  const ctx=await setup({stored:null,requestCode:async()=>{if(++attempts===1)throw {status:429};}});
  assert.equal(await ctx.vm.submitAccess('a@example.test'),false);assert.equal(ctx.vm.state.codeSent,false);assert.equal(ctx.vm.state.busy,false);assert.match(ctx.vm.state.error,/Demasiados intentos/);
  assert.equal(await ctx.vm.submitAccess('a@example.test'),true);assert.equal(ctx.vm.state.codeSent,true);assert.equal(ctx.vm.state.error,'');
});

test('Código inválido no carga ni transfiere pendientes; el código válido respeta el orden anterior',async()=>{
  const calls=[];let valid=false,ctx;
  ctx=await setup({stored:null,
    requestCode:async()=>{},
    verifyCode:async(email,code)=>{calls.push(['verify',email,code]);if(!valid)throw {code:'otp_expired',status:403};ctx.vm.saveSession(session('a'));},
    loadAccount:async()=>{calls.push('load');return result();},
    readGuest:()=>({Mojito:{reaccion:'like'}}),persistReaction:async()=>{calls.push('guest');},persistRecipe:async()=>{calls.push('pending');},
    readPending:()=>({coctel:'Piña colada',elecciones:{alcohol:['Ron']},favorite:false}),identify:()=>({id:'fresco'}),
  });
  ctx.vm.restorePending();await ctx.vm.submitAccess('a@example.test');
  assert.equal(await ctx.vm.submitAccess('a@example.test','000000'),false);
  assert.equal(ctx.vm.state.codeSent,true);assert.match(ctx.vm.state.error,/código no es válido/);assert.deepEqual(calls,[['verify','a@example.test','000000']]);
  valid=true;calls.length=0;
  assert.equal(await ctx.vm.submitAccess('a@example.test','123456'),true);
  assert.deepEqual(calls,[['verify','a@example.test','123456'],'load','guest','pending']);
  assert.equal(ctx.vm.state.loaded,true);assert.equal(ctx.vm.state.codeSent,false);assert.equal(ctx.vm.state.notice,'Tu colección está lista.');
  assert.deepEqual(ctx.events.slice(-4),['action-start','load-start','load-end','action-end']);
});

test('Fallo de carga tras acceso no procesa pendientes; un guardado fallido permite recuperar la colección',async()=>{
  let ctx,loadFails=true,transferred=0,pending=0;
  ctx=await setup({stored:null,requestCode:async()=>{},verifyCode:async()=>ctx.vm.saveSession(session('a')),
    loadAccount:async()=>loadFails ? [{status:'rejected',reason:{status:503}}] : result(),
    readGuest:()=>({Mojito:{reaccion:'like'}}),persistReaction:async()=>{transferred++;},persistRecipe:async()=>{pending++;throw Error('temporary');},
    readPending:()=>({coctel:'Piña colada',elecciones:{alcohol:['Ron']},favorite:false}),identify:()=>({id:'fresco'}),
  });
  ctx.vm.restorePending();await ctx.vm.submitAccess('a@example.test');assert.equal(await ctx.vm.submitAccess('a@example.test','123456'),false);
  assert.equal(ctx.vm.state.loaded,false);assert.equal(transferred,0);assert.equal(pending,0);assert(ctx.vm.state.session);
  loadFails=false;await ctx.vm.load();assert.equal(ctx.vm.state.loaded,true);
  ctx.vm.state.codeSent=true;assert.equal(await ctx.vm.submitAccess('a@example.test','123456'),false);
  assert.equal(transferred,1);assert.equal(pending,1);assert.equal(ctx.vm.state.loaded,true);assert(ctx.vm.state.session);assert.equal(ctx.vm.state.notice,'');
});

test('Cerrar sesión limpia el acceso y las reacciones solo después de una respuesta satisfactoria',async()=>{
  let fail=true,clears=0;
  const ctx=await setup({endSession:async()=>{if(fail)throw {status:503};},readGuest:()=>({Mojito:{reaccion:'like'}}),writeGuest:value=>{if(value===null)clears++;}});
  ctx.vm.restoreSession();await ctx.vm.load();ctx.vm.state.email='a@example.test';ctx.vm.state.codeSent=true;
  assert.equal(await ctx.vm.logout(),false);assert(ctx.vm.state.session);assert.equal(ctx.vm.state.data.favorites.length,1);assert.equal(clears,0);assert.equal(ctx.vm.state.email,'a@example.test');
  fail=false;assert.equal(await ctx.vm.logout(),true);assert.equal(ctx.vm.state.session,null);assert.equal(ctx.persisted,null);assert.deepEqual(ctx.vm.state.data.favorites,[]);
  assert.equal(clears,1);assert.equal(ctx.vm.state.email,'');assert.equal(ctx.vm.state.codeSent,false);assert.equal(ctx.vm.state.notice,'Sesión cerrada.');assert.equal(ctx.vm.state.busy,false);
  assert.deepEqual(ctx.events.slice(-3),['action-start','action-end','logout-end']);
});

test('Acceso y otras acciones comparten el mismo bloqueo sin duplicar peticiones',async()=>{
  const task=deferred();let sent=0;
  const ctx=await setup({requestCode:async()=>{sent++;}});
  const running=ctx.vm.runAction(()=>task.promise,'Guardado');
  assert.equal(await ctx.vm.submitAccess('a@example.test'),false);assert.equal(sent,0);
  task.resolve();assert.equal(await running,true);assert.equal(ctx.vm.state.notice,'Guardado');
});
