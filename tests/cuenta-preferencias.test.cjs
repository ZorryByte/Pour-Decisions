const test=require('node:test');
const assert=require('node:assert/strict');
const clone=value=>JSON.parse(JSON.stringify(value));
const styles=['Dulce','Ácido','Cremoso','Refrescante','Suave','Espumoso','Granizado','Sedoso'];
const steps=[
  {k:'alcohol',groups:[{o:['Ron','Vodka','Sin alcohol']}]},
  {k:'fruta',groups:[{o:[{v:'cualquiera',t:'La que sea'},'Limón','Piña']}]},
  {k:'sabor',groups:[{o:styles}]},
  {k:'fuerza',groups:[{o:['Suave','Medio','Fuerte']}]},
  {k:'alergia',groups:[{o:[{v:'ninguna'},{v:'lacteos'},{v:'otra'}]}]},
  {k:'plan',groups:[{o:[{v:'fiesta'},{v:'playa'}]}]},
];
const recipes=['Mojito','Daiquirí','Cítrico','Ácido','Neutro','Zeta','Beta','Gamma','Delta','Bloqueado','Batido'].map(n=>({n,a:[n==='Batido'?'Sin alcohol':'Ron'],f:['Limón'],s:['Ácido']}));
async function setup({loggedIn=true,...overrides}={}){
  const {createCuentaViewModel}=await import('../src/features/auth-cuenta/viewmodels/cuentaViewModel.js');
  const {normalizarPreferencias}=await import('../src/features/auth-cuenta/domain/preferencias.js');
  const calls=[],events=[];
  const vm=createCuentaViewModel({
    loadAccount:async()=>[{preferencias:{alcohol:['Ron'],fruta:['Limón'],sabor:['Ácido']}},[{coctel:'Mojito'}],[{coctel:'Daiquirí',reaccion:'dislike'}],[{coctel:'Mojito',personalidad:'fresco'}]].map((value,i)=>({status:'fulfilled',value:i===0?[value]:value})),
    readSession:()=>loggedIn?{access_token:'a',refresh_token:'r',user:{id:'a'}}:null,writeSession:()=>{},
    normalizePreferences:raw=>normalizarPreferencias(raw,steps),hasDrink:name=>recipes.some(c=>c.n===name),findDrink:name=>recipes.find(c=>c.n===name),
    getCatalog:()=>recipes,allows:(c,p)=>!p.alergia.includes('otra')&&c.n!=='Bloqueado'&&(!p.alcohol.includes('Sin alcohol')||c.a.includes('Sin alcohol')),
    persistPreferences:async next=>{calls.push(clone(next));},...overrides,
  });
  vm.subscribe(event=>events.push(event));vm.restoreSession();if(loggedIn)await vm.load();events.length=0;
  return {vm,calls,events};
}

test('La normalización conserva las reglas del perfil, ocho estilos y valores válidos sin modificar el original',async()=>{
  const {normalizarPreferencias}=await import('../src/features/auth-cuenta/domain/preferencias.js');
  const raw={alcohol:['Ron','Ron','Sin alcohol','inventado'],fruta:['cualquiera','Limón','Limón'],sabor:styles.slice(),fuerza:['Fuerte','Suave'],alergia:['ninguna','lacteos','inventado'],plan:['playa','fiesta'],extra:true};
  const before=clone(raw),next=normalizarPreferencias(raw,steps);
  assert.deepEqual(raw,before);assert.deepEqual(next,{alcohol:['Ron','Sin alcohol'],fruta:['Limón'],sabor:styles,fuerza:['Fuerte'],alergia:['lacteos'],plan:['playa']});
  assert.deepEqual(normalizarPreferencias({fuerza:'Fuerte',sabor:42},steps),{alcohol:[],fruta:[],sabor:[],fuerza:[],alergia:[],plan:[]});
});

test('Leer los gustos para el formulario entrega listas independientes del estado guardado',async()=>{
  const {vm}=await setup();const draft=vm.getPreferences();draft.alcohol.push('Vodka');draft.fruta.length=0;
  assert.deepEqual(vm.state.data.preferences.alcohol,['Ron']);assert.deepEqual(vm.state.data.preferences.fruta,['Limón']);
});

test('Guardar valida los datos y actualiza gustos solo tras confirmar, sin alterar recetas ni avatar',async()=>{
  let finish;const promise=new Promise(resolve=>{finish=resolve;});let payload;
  const {vm,events}=await setup({persistPreferences:next=>{payload=clone(next);return promise;}});
  const before=clone(vm.state.data);const saving=vm.savePreferences({alcohol:['Sin alcohol','inventado'],alergia:['lacteos']});
  assert.equal(vm.state.busy,true);assert.deepEqual(vm.state.data.preferences,before.preferences);assert.deepEqual(payload.alcohol,['Sin alcohol']);
  finish();assert.equal(await saving,true);assert.deepEqual(vm.state.data.preferences,payload);assert.deepEqual(vm.state.data.favorites,before.favorites);assert.deepEqual(vm.state.data.reactions,before.reactions);assert.deepEqual(vm.state.data.avatar,before.avatar);
  assert.equal(vm.state.notice,'Tus gustos se actualizaron. Por descubrir ya usa estas preferencias.');assert.deepEqual(events,['action-start','action-end']);
});

test('Un fallo conserva gustos y sugerencias anteriores y permite reintentar',async()=>{
  let fail=true;const {vm}=await setup({persistPreferences:async()=>{if(fail)throw {status:503};}});
  const before=clone(vm.state.data.preferences),suggested=vm.suggestions();
  assert.equal(await vm.savePreferences({alcohol:['Sin alcohol']}),false);assert.deepEqual(vm.state.data.preferences,before);assert.deepEqual(vm.suggestions(),suggested);assert(vm.state.error);
  fail=false;assert.equal(await vm.savePreferences({alcohol:['Sin alcohol']}),true);assert.equal(vm.state.error,'');assert.deepEqual(vm.suggestions().map(r=>r.coctel),['Batido']);
});

test('Por descubrir conserva exclusiones, orden, límite y motivos; aplica los gustos actuales',async()=>{
  const {vm}=await setup();const catalogBefore=clone(recipes);const suggestions=vm.suggestions();
  assert.equal(suggestions.length,6);assert.equal(suggestions[0].coctel,'Ácido');assert(suggestions.every(r=>!['Mojito','Daiquirí','Bloqueado'].includes(r.coctel)));
  assert.equal(suggestions[0].reason,'Comparte tus gustos: Ron, Limón, Ácido.');assert.deepEqual(recipes,catalogBefore);
  await vm.savePreferences({alergia:['otra']});assert.deepEqual(vm.suggestions(),[]);
});

test('Sin sesión o con otra acción en curso no se envían nuevos cambios de gustos',async()=>{
  const guest=await setup({loggedIn:false});assert.equal(await guest.vm.savePreferences({alcohol:['Ron']}),false);assert.deepEqual(guest.calls,[]);
  let finish;const promise=new Promise(resolve=>{finish=resolve;});let requests=0;
  const {vm}=await setup({persistPreferences:()=>{requests++;return promise;}});const first=vm.savePreferences({alcohol:['Vodka']});
  assert.equal(await vm.savePreferences({alcohol:['Ron']}),false);assert.equal(requests,1);finish();await first;assert.deepEqual(vm.state.data.preferences.alcohol,['Vodka']);
});
