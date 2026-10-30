const test=require('node:test');
const assert=require('node:assert/strict');
const recipes=[
  {n:'Mojito',f:['Limón','Menta'],s:['Refrescante']},
  {n:'Daiquirí',f:['Limón','Fresa'],s:['Dulce']},
];
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
async function setup({loggedIn=false,stored=null,reactions=[],...overrides}={}){
  const {createCuentaViewModel}=await import('../src/features/auth-cuenta/viewmodels/cuentaViewModel.js');
  const calls=[],writes=[],events=[];let persisted=clone(stored);
  const vm=createCuentaViewModel({
    loadAccount:async()=>[{preferencias:{alcohol:['Ron']}},[{coctel:'Mojito'}],clone(reactions),[{coctel:'Mojito',personalidad:'fresco'}]].map((v,i)=>({status:'fulfilled',value:i===0?[v]:v})),
    readSession:()=>loggedIn?{access_token:'a',refresh_token:'r',user:{id:'a'}}:null,writeSession:()=>{},
    normalizePreferences:raw=>raw||{},hasDrink:name=>recipes.some(c=>c.n===name),findDrink:name=>recipes.find(c=>c.n===name),
    readGuest:()=>clone(persisted),writeGuest:value=>{persisted=clone(value);writes.push(clone(value));},
    persistReaction:async value=>{calls.push(['save',clone(value)]);},removeReaction:async name=>{calls.push(['remove',name]);},
    ...overrides,
  });
  vm.subscribe(event=>events.push(event));vm.restoreSession();vm.restoreGuest();if(loggedIn)await vm.load();events.length=0;
  return {vm,calls,writes,events,get persisted(){return persisted;}};
}

test('Reacciones de invitado conservan motivo y probado por separado y no guardan recetas ni redibujan la pantalla',async()=>{
  const ctx=await setup();
  await ctx.vm.react('Mojito',{reaccion:'dislike'});await ctx.vm.react('Mojito',{motivo:'dulzor'});await ctx.vm.react('Mojito',{probado_gusto:true});
  assert.deepEqual(ctx.vm.reactionFor('Mojito'),{coctel:'Mojito',reaccion:'dislike',motivo:'dulzor',probado_gusto:true});
  assert.deepEqual(ctx.calls,[]);assert.deepEqual(ctx.events,[]);assert.deepEqual(ctx.vm.state.data.favorites,[]);
  await ctx.vm.react('Mojito',{reaccion:'like'});assert.equal(ctx.vm.reactionFor('Mojito').motivo,null);assert.equal(ctx.vm.reactionFor('Mojito').probado_gusto,true);
  const restored=await setup({stored:ctx.persisted});assert.deepEqual(restored.vm.reactionFor('Mojito'),ctx.vm.reactionFor('Mojito'));
});

test('La recuperación de invitado valida nombres, reacciones, motivos y booleanos',async()=>{
  const ctx=await setup({stored:{Mojito:{coctel:'Otro',reaccion:'dislike',motivo:'textura',probado_gusto:'true'},'Daiquirí':{reaccion:null,motivo:'inventado',probado_gusto:true},Desconocido:{reaccion:'like'}}});
  assert.deepEqual(ctx.vm.reactionFor('Mojito'),{coctel:'Mojito',reaccion:'dislike',motivo:'textura',probado_gusto:false});
  assert.equal(ctx.vm.reactionFor('Daiquirí').motivo,null);assert.equal(ctx.vm.reactionFor('Daiquirí').probado_gusto,true);assert.equal(Object.keys(ctx.vm.state.guest).length,2);
  const invalid=await setup({stored:{Mojito:{reaccion:'inventada'},'Daiquirí':null}});assert.deepEqual(invalid.vm.state.guest,{});
});

test('Una reacción autenticada fallida conserva los datos y permite reintentar sin duplicados',async()=>{
  let fail=true;const calls=[];const initial={coctel:'Mojito',reaccion:'like',motivo:null,probado_gusto:true};
  const ctx=await setup({loggedIn:true,reactions:[initial],persistReaction:async value=>{calls.push(clone(value));if(fail)throw {status:503};}});
  const before=clone(ctx.vm.state.data);assert.equal(await ctx.vm.react('Mojito',{reaccion:'dislike',motivo:'intensidad'}),false);assert.deepEqual(ctx.vm.state.data,before);assert(ctx.vm.state.error);
  fail=false;assert.equal(await ctx.vm.react('Mojito',{reaccion:'dislike',motivo:'intensidad'}),true);assert.equal(ctx.vm.state.data.reactions.length,1);assert.equal(ctx.vm.reactionFor('Mojito').probado_gusto,true);
  assert.deepEqual(ctx.vm.state.data.favorites,before.favorites);assert.deepEqual(ctx.vm.state.data.avatar,before.avatar);assert.equal(calls.length,2);assert.equal(ctx.vm.state.busy,false);
});

test('Transferir invitado conserva todo ante un fallo parcial y reintenta sin duplicar historial',async()=>{
  let fail=true;const calls=[];
  const ctx=await setup({loggedIn:true,stored:{Mojito:{reaccion:'like'},'Daiquirí':{reaccion:'dislike',motivo:'textura'}},persistReaction:async value=>{
    calls.push(value.coctel);if(value.coctel==='Daiquirí'&&fail)throw {status:503};
  }});
  assert.equal(await ctx.vm.keepGuestReactions(),false);assert.equal(ctx.vm.state.data.reactions.length,1);assert.equal(Object.keys(ctx.vm.state.guest).length,2);assert.equal(ctx.writes.length,0);assert(ctx.persisted);
  fail=false;assert.equal(await ctx.vm.keepGuestReactions(),true);assert.equal(ctx.vm.state.data.reactions.length,2);assert.deepEqual(ctx.vm.state.guest,{});assert.equal(ctx.persisted,null);
  assert.deepEqual(calls,['Mojito','Daiquirí','Mojito','Daiquirí']);assert.equal(ctx.vm.state.notice,'Reacciones guardadas.');
});

test('Olvidar reacción modifica solo el historial tras confirmación; un fallo conserva la fila',async()=>{
  let fail=true;
  const ctx=await setup({loggedIn:true,reactions:[{coctel:'Mojito',reaccion:'dislike',motivo:'dulzor'},{coctel:'Daiquirí',reaccion:null,probado_gusto:false}],removeReaction:async()=>{if(fail)throw {status:503};}});
  assert.equal(ctx.vm.reactionHistory().length,1);const before=clone(ctx.vm.state.data);
  assert.equal(await ctx.vm.forgetReaction('Mojito'),false);assert.deepEqual(ctx.vm.state.data,before);
  fail=false;assert.equal(await ctx.vm.forgetReaction('Mojito'),true);assert.equal(ctx.vm.reactionHistory().length,0);assert.equal(ctx.vm.state.data.reactions.length,1);
  assert.deepEqual(ctx.vm.state.data.favorites,before.favorites);assert.deepEqual(ctx.vm.state.data.avatar,before.avatar);assert.equal(ctx.vm.state.notice,'Reacción retirada.');
});

test('La afinidad conserva prioridades y proporciones; rechazar una receta no rechaza ingredientes',async()=>{
  const ctx=await setup();await ctx.vm.react('Mojito',{reaccion:'like'});assert.equal(ctx.vm.boost(recipes[0]),.08);
  assert.equal(ctx.vm.boost(recipes[1]),.03/5);
  await ctx.vm.react('Mojito',{probado_gusto:true});assert.equal(ctx.vm.boost(recipes[0]),.16);assert.equal(ctx.vm.boost(recipes[1]),.06/5);
  await ctx.vm.react('Mojito',{reaccion:'dislike'});assert.equal(ctx.vm.boost(recipes[0]),-2);assert.equal(ctx.vm.boost(recipes[1]),.06/5);
  await ctx.vm.react('Mojito',{probado_gusto:false});assert.equal(ctx.vm.boost(recipes[1]),0);
  await ctx.vm.react('Mojito',{reaccion:null,probado_gusto:false});assert.equal(ctx.vm.boost(recipes[0]),0);
});

test('El bloqueo compartido evita reacciones simultáneas y las acciones de cuenta no se ejecutan como invitado',async()=>{
  const guest=await setup();assert.equal(await guest.vm.keepGuestReactions(),false);assert.equal(await guest.vm.forgetReaction('Mojito'),false);assert.deepEqual(guest.calls,[]);
  let finish;const request=new Promise(resolve=>{finish=resolve;});let requests=0;
  const ctx=await setup({loggedIn:true,persistReaction:()=>{requests++;return request;}});
  const first=ctx.vm.react('Mojito',{reaccion:'like'});assert.equal(await ctx.vm.react('Mojito',{reaccion:'dislike'}),false);assert.equal(requests,1);assert.equal(ctx.vm.reactionFor('Mojito'),undefined);
  finish();assert.equal(await first,true);assert.equal(ctx.vm.reactionFor('Mojito').reaccion,'like');assert.equal(await ctx.vm.react('Desconocido',{reaccion:'like'}),false);
});
