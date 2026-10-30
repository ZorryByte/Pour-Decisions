const test = require('node:test');
const assert = require('node:assert/strict');

const entries=[
  {coctel:'Mojito',elecciones:{alcohol:['Ron'],_personalidad:'fresco'}},
  {coctel:'Piña colada',elecciones:{alcohol:['Ron'],_personalidad:'enamorado'}},
];
const clone=value=>JSON.parse(JSON.stringify(value));
async function setup({loggedIn=true,avatar={coctel:'Mojito',personalidad:'fresco'},...overrides}={}){
  const {createCuentaViewModel}=await import('../src/features/auth-cuenta/viewmodels/cuentaViewModel.js');
  const calls=[],events=[];
  const vm=createCuentaViewModel({
    loadAccount:async()=>[{preferencias:{alcohol:['Vodka']}},clone(entries),[{coctel:'Mojito',reaccion:'like'}],avatar?[clone(avatar)]:[]].map((value,i)=>({status:'fulfilled',value:i===0?[value]:value})),
    readSession:()=>loggedIn?{access_token:'a',refresh_token:'r',user:{id:'user'}}:null,writeSession:()=>{},
    normalizePreferences:raw=>({alcohol:(raw?.alcohol||[]).filter(v=>['Ron','Vodka'].includes(v))}),hasDrink:name=>entries.some(e=>e.coctel===name),
    identify:(choices,id)=>({id:id||'fresco',choices}),currentChoices:()=>({alcohol:['Vodka']}),currentIdentity:()=>({id:'exigente'}),
    persistAvatar:async(name,id)=>{calls.push(['save',name,id]);},removeAvatar:async name=>{calls.push(['remove',name]);},
    ...overrides,
  });
  vm.subscribe(event=>events.push(event));vm.restoreSession();await vm.load();events.length=0;
  return {vm,calls,events};
}

test('Cambiar favorito usa la identidad guardada y actualiza el avatar solo tras confirmar la escritura',async()=>{
  let finish;const request=new Promise(resolve=>{finish=resolve;});const calls=[];
  const ctx=await setup({persistAvatar:(name,id)=>{calls.push([name,id]);return request;}});
  const before=clone(ctx.vm.state.data);
  const changing=ctx.vm.toggleFavorite('Piña colada');assert.equal(ctx.vm.state.busy,true);
  assert.deepEqual(calls,[['Piña colada','enamorado']]);assert.deepEqual(ctx.vm.state.data.avatar,before.avatar);
  finish();assert.equal(await changing,true);assert.deepEqual(ctx.vm.state.data.avatar,{coctel:'Piña colada',personalidad:'enamorado'});
  assert.deepEqual(ctx.vm.state.data.favorites,before.favorites);assert.deepEqual(ctx.vm.state.data.preferences,before.preferences);
  assert.equal(ctx.vm.state.notice,'Tu favorito ya le da cara a tu perfil.');assert.deepEqual(ctx.events,['action-start','action-end']);
});

test('Un cambio fallido conserva el avatar anterior y permite reintentar sin agregar otra receta',async()=>{
  let fail=true;const calls=[];
  const ctx=await setup({persistAvatar:async(name,id)=>{calls.push([name,id]);if(fail)throw {status:503};}});
  const original=clone(ctx.vm.state.data.avatar);
  assert.equal(await ctx.vm.toggleFavorite('Piña colada'),false);assert.deepEqual(ctx.vm.state.data.avatar,original);assert(ctx.vm.state.error);assert.equal(ctx.vm.state.notice,'');assert.equal(ctx.vm.state.busy,false);
  fail=false;assert.equal(await ctx.vm.toggleFavorite('Piña colada'),true);assert.equal(ctx.vm.state.data.avatar.coctel,'Piña colada');assert.equal(ctx.vm.state.data.favorites.length,2);assert.equal(calls.length,2);assert.equal(ctx.vm.state.error,'');
});

test('Quitar favorito conserva colección, preferencias y reacciones, incluso si la primera retirada falla',async()=>{
  let fail=true;const calls=[];
  const ctx=await setup({removeAvatar:async name=>{calls.push(name);if(fail)throw {status:503};}});
  const before=clone(ctx.vm.state.data);
  assert.equal(await ctx.vm.toggleFavorite('Mojito'),false);assert.deepEqual(ctx.vm.state.data,before);
  fail=false;assert.equal(await ctx.vm.toggleFavorite('Mojito'),true);assert.equal(ctx.vm.state.data.avatar,null);
  assert.deepEqual(ctx.vm.state.data.favorites,before.favorites);assert.deepEqual(ctx.vm.state.data.reactions,before.reactions);assert.deepEqual(ctx.vm.state.data.preferences,before.preferences);
  assert.deepEqual(calls,['Mojito','Mojito']);assert.equal(ctx.vm.state.notice,'Puedes elegir otro favorito para tu avatar.');
});

test('Solo una receta de la cuenta puede elegirse y el bloqueo evita cambios simultáneos',async()=>{
  const guest=await setup({loggedIn:false});assert.equal(await guest.vm.toggleFavorite('Mojito'),false);assert.deepEqual(guest.calls,[]);
  let finish;const request=new Promise(resolve=>{finish=resolve;});let writes=0;
  const ctx=await setup({persistAvatar:()=>{writes++;return request;}});
  assert.equal(await ctx.vm.toggleFavorite('No guardada'),false);assert.deepEqual(ctx.events,[]);
  const first=ctx.vm.toggleFavorite('Piña colada');assert.equal(await ctx.vm.toggleFavorite('Mojito'),false);assert.equal(writes,1);
  finish();await first;assert.equal(ctx.vm.state.data.avatar.coctel,'Piña colada');
});

test('Los datos para dibujar el avatar se derivan del favorito y conservan la normalización anterior',async()=>{
  const ctx=await setup({avatar:null});assert.equal(ctx.vm.avatarIdentity(),null);
  const identity=ctx.vm.savedIdentity({elecciones:{alcohol:['Ron','inventado'],_personalidad:'enamorado'}});
  assert.deepEqual(identity,{id:'enamorado',choices:{alcohol:['Ron']}});
  await ctx.vm.toggleFavorite('Piña colada');assert.deepEqual(ctx.vm.avatarIdentity(),{id:'enamorado',choices:{}});
  assert.deepEqual(ctx.calls,[['save','Piña colada','enamorado']]);
});
