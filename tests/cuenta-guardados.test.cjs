const test = require('node:test');
const assert = require('node:assert/strict');
const session={access_token:'access',refresh_token:'refresh',user:{id:'a'}};
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const preferences=raw=>({alcohol:(raw?.alcohol||[]).filter(a=>['Ron','Vodka','Brandy'].includes(a))});
const result=(prefs={},saved=[])=>[prefs,saved,[],[]].map((value,i)=>({status:'fulfilled',value:i===0?[{preferencias:value}]:value}));

async function setup({loggedIn=false,stored=null,...overrides}={}){
  const {createCuentaViewModel}=await import('../src/features/auth-cuenta/viewmodels/cuentaViewModel.js');
  const events=[],calls=[],writes=[];let persisted=clone(stored);
  const vm=createCuentaViewModel({
    loadAccount:async()=>result(),readSession:()=>loggedIn?session:null,writeSession:()=>{},
    normalizePreferences:preferences,hasDrink:name=>['Mojito','Piña colada'].includes(name),
    readPending:()=>clone(persisted),writePending:value=>{persisted=clone(value);writes.push(clone(value));},
    currentChoices:()=>({alcohol:['Ron']}),identify:(_,id)=>({id:['fresco','enamorado'].includes(id)?id:'fresco'}),currentIdentity:()=>({id:'enamorado'}),
    persistRecipe:async(name,choices)=>{calls.push(['recipe',name,clone(choices)]);},
    persistPreferences:async choices=>{calls.push(['preferences',clone(choices)]);},
    persistAvatar:async(name,identity)=>{calls.push(['favorite',name,identity]);},
    ...overrides,
  });
  vm.subscribe(event=>events.push(event));vm.restoreSession();vm.restorePending();
  return {vm,events,calls,writes,get persisted(){return persisted;}};
}

test('Guardar como invitado conserva receta, elecciones e identidad antes de abrir el acceso',async()=>{
  const ctx=await setup();assert.equal(await ctx.vm.saveRecipe('Mojito',{favorite:true}),false);
  assert.deepEqual(ctx.persisted,{coctel:'Mojito',elecciones:{alcohol:['Ron'],_personalidad:'enamorado'},favorite:true});
  assert.deepEqual(ctx.events,['access-required']);assert.deepEqual(ctx.calls,[]);
  const restored=await setup({stored:ctx.persisted});assert.deepEqual(restored.vm.state.pending,ctx.vm.state.pending);
});

test('Restaurar valida receta y preferencias; conserva el booleano y normaliza la identidad',async()=>{
  for(const stored of [null,{},'roto',{coctel:'Desconocido'}]){const ctx=await setup({stored});assert.equal(ctx.vm.state.pending,null);}
  const ctx=await setup({stored:{coctel:'Mojito',elecciones:{alcohol:['Ron','inventado'],_personalidad:'desconocida'},favorite:'true'}});
  assert.deepEqual(ctx.vm.state.pending,{coctel:'Mojito',elecciones:{alcohol:['Ron'],_personalidad:'fresco'},favorite:false});assert.equal(ctx.writes.length,0);
});

test('Guardar receta siembra preferencias vacías y limpia el pendiente solo al completar todo',async()=>{
  const ctx=await setup({loggedIn:true});assert.equal(await ctx.vm.saveRecipe('Mojito'),true);
  assert.deepEqual(ctx.calls.map(c=>c[0]),['recipe','preferences']);assert.equal(ctx.vm.state.data.favorites.length,1);
  assert.deepEqual(ctx.vm.state.data.preferences,{alcohol:['Ron']});assert.equal(ctx.vm.state.pending,null);assert.equal(ctx.persisted,null);
  assert.equal(ctx.vm.state.notice,'Cóctel guardado en tu colección.');assert.equal(ctx.vm.state.busy,false);
});

test('Una receta ya guardada conserva sus elecciones y su avatar; no duplica ni sobreescribe preferencias',async()=>{
  const entry={coctel:'Mojito',elecciones:{alcohol:['Ron'],_personalidad:'enamorado'}};
  const ctx=await setup({loggedIn:true,loadAccount:async()=>result({alcohol:['Vodka']},[entry]),currentChoices:()=>({alcohol:['Brandy']})});
  await ctx.vm.load();assert.equal(await ctx.vm.saveRecipe('Mojito',{favorite:true,fromProfile:true}),true);
  assert.deepEqual(ctx.calls,[['favorite','Mojito','enamorado']]);assert.deepEqual(ctx.vm.state.data.favorites[0],entry);assert.deepEqual(ctx.vm.state.data.preferences,{alcohol:['Vodka']});
  assert.deepEqual(ctx.writes[0].elecciones,{alcohol:['Vodka'],_personalidad:'enamorado'});assert.equal(ctx.vm.state.notice,'Tu favorito ya le da cara a tu perfil.');
});

test('Fallo de receta, preferencias o avatar conserva el pendiente y reintenta sin duplicar lo guardado',async()=>{
  for(const step of ['recipe','preferences','favorite']){
    let fail=true;const calls=[];
    const operation=name=>async()=>{calls.push(name);if(name===step&&fail)throw Error('temporary');};
    const ctx=await setup({loggedIn:true,persistRecipe:operation('recipe'),persistPreferences:operation('preferences'),persistAvatar:operation('favorite')});
    assert.equal(await ctx.vm.saveRecipe('Mojito',{favorite:true}),false,step);assert(ctx.vm.state.pending);assert(ctx.persisted);assert(ctx.vm.state.error);assert.equal(ctx.vm.state.notice,'');
    fail=false;assert.equal(await ctx.vm.retryPending(),true);assert.equal(ctx.vm.state.pending,null);assert.equal(ctx.persisted,null);assert.equal(ctx.vm.state.data.favorites.length,1);
    assert.equal(calls.filter(c=>c==='recipe').length,step==='recipe'?2:1);assert.equal(ctx.vm.state.notice,'Cóctel guardado.');
  }
});

test('No guarda tras fallar la carga y permite descartar el pendiente sin borrar recetas',async()=>{
  const ctx=await setup({loggedIn:true,loadAccount:async()=>[{status:'rejected',reason:{status:503}}]});
  assert.equal(await ctx.vm.saveRecipe('Mojito'),false);assert.equal(ctx.calls.length,0);assert(ctx.vm.state.pending);
  ctx.vm.discardPending();assert.equal(ctx.vm.state.pending,null);assert.equal(ctx.persisted,null);assert.deepEqual(ctx.vm.state.data.favorites,[]);assert.equal(ctx.events.at(-1),'pending-discarded');
});

test('El bloqueo compartido impide reemplazar o descartar un pendiente mientras se está guardando',async()=>{
  let finish;const request=new Promise(resolve=>{finish=resolve;});
  const ctx=await setup({loggedIn:true,persistRecipe:()=>request});const saving=ctx.vm.saveRecipe('Mojito');
  await Promise.resolve();await Promise.resolve();
  const original=ctx.vm.state.pending;
  assert.equal(await ctx.vm.saveRecipe('Piña colada'),false);ctx.vm.discardPending();assert.strictEqual(ctx.vm.state.pending,original);
  finish();assert.equal(await saving,true);assert.equal(ctx.vm.state.data.favorites.length,1);assert.equal(ctx.vm.state.data.favorites[0].coctel,'Mojito');
});
