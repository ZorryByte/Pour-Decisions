const test = require('node:test');
const assert = require('node:assert/strict');
const clone = value => JSON.parse(JSON.stringify(value));

async function setup(overrides = {}){
  const {createCuentaViewModel} = await import('../src/features/auth-cuenta/viewmodels/cuentaViewModel.js');
  const calls = [], events = [];
  const vm = createCuentaViewModel({
    readSession:() => ({access_token:'a',refresh_token:'r',user:{id:'user'}}), writeSession:() => {},
    normalizePreferences:raw => raw, hasDrink:() => true,
    loadAccount:async () => [
      [{preferencias:{alcohol:['Ron']}}],
      [{coctel:'Mojito'},{coctel:'Piña colada'}],
      [{coctel:'Mojito',reaccion:'like',probado_gusto:true}],
      [{coctel:'Mojito',personalidad:'fresco'}],
    ].map(value => ({status:'fulfilled',value})),
    removeRecipe:async name => { calls.push(name); }, ...overrides,
  });
  vm.restoreSession(); await vm.load(); vm.subscribe(event => events.push(event));
  return {vm,calls,events};
}

test('Retirar la receta elegida espera al Modelo y limpia únicamente su colección y avatar', async () => {
  let finish;
  const request = new Promise(resolve => { finish = resolve; });
  const calls = [];
  const {vm,events} = await setup({removeRecipe:name => { calls.push(name); return request; }});
  const before = clone(vm.state.data);
  const removal = vm.removeSavedRecipe('Mojito');
  assert.equal(vm.state.busy,true); assert.deepEqual(vm.state.data,before);
  assert.deepEqual(calls,['Mojito']); assert.deepEqual(events,['action-start']);
  finish(); assert.equal(await removal,true);
  assert.deepEqual(vm.state.data.favorites,[{coctel:'Piña colada'}]);
  assert.equal(vm.state.data.avatar,null);
  assert.deepEqual(vm.state.data.preferences,before.preferences);
  assert.deepEqual(vm.state.data.reactions,before.reactions);
  assert.equal(vm.state.notice,'Receta retirada de tu colección.');
  assert.equal(vm.state.busy,false); assert.deepEqual(events,['action-start','action-end']);
});

test('Retirar otra receta conserva el favorito y todos los datos ajenos a esa receta', async () => {
  const {vm,calls} = await setup(); const before = clone(vm.state.data);
  assert.equal(await vm.removeSavedRecipe('Piña colada'),true);
  assert.deepEqual(calls,['Piña colada']);
  assert.deepEqual(vm.state.data,{...before,favorites:[{coctel:'Mojito'}]});
});

test('Una retirada fallida conserva colección y avatar y permite reintentar', async () => {
  let fail = true;
  const {vm,events} = await setup({removeRecipe:async () => { if (fail) throw {status:503}; }});
  const before = clone(vm.state.data);
  assert.equal(await vm.removeSavedRecipe('Mojito'),false);
  assert.deepEqual(vm.state.data,before); assert(vm.state.error);
  assert.equal(vm.state.notice,''); assert.equal(vm.state.busy,false);
  fail = false; assert.equal(await vm.removeSavedRecipe('Mojito'),true);
  assert.equal(vm.state.error,''); assert.equal(vm.state.data.avatar,null);
  assert.deepEqual(events,['action-start','action-end','action-start','action-end']);
});

test('El bloqueo compartido impide retiradas duplicadas, ajenas o sin sesión', async () => {
  let finish; const calls = [];
  const request = new Promise(resolve => { finish = resolve; });
  const {vm,events} = await setup({removeRecipe:name => { calls.push(name); return request; }});
  assert.equal(vm.removeSavedRecipe('No guardada'),false); assert.deepEqual(events,[]);
  const removal = vm.removeSavedRecipe('Mojito');
  assert.equal(vm.removeSavedRecipe('Mojito'),false);
  assert.equal(vm.removeSavedRecipe('Piña colada'),false);
  assert.deepEqual(calls,['Mojito']); finish(); await removal;
  vm.clearSession(); assert.equal(vm.removeSavedRecipe('Piña colada'),false);
  assert.deepEqual(calls,['Mojito']);
});
