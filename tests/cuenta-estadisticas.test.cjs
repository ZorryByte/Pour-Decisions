const test = require('node:test');
const assert = require('node:assert/strict');

test('Cuenta opciones por resultado, sin duplicados, y porcentajes sobre el historial completo', async () => {
  const {resumirElecciones} = await import('../src/features/auth-cuenta/domain/estadisticas.js');
  const rows = [{elecciones:{fruta:['Coco','Piña','Coco']}}, {elecciones:{fruta:['Coco']}}, {elecciones:{}}];
  const result = resumirElecciones(rows, ['fruta']);
  assert.deepEqual(result.fruta, [{value:'Coco',count:2,percentage:67}, {value:'Piña',count:1,percentage:33}]);
  assert.deepEqual(resumirElecciones([], ['fruta']), {fruta:[]});
});

test('Reintenta con el mismo id, conserva pendientes y aísla las cuentas', async () => {
  const {createEstadisticasViewModel} = await import('../src/features/auth-cuenta/viewmodels/estadisticasViewModel.js');
  let user = 'a', fail = true;
  const pending = {}, records = {};
  const vm = createEstadisticasViewModel({accountId:() => user,
    readPending:id => pending[id] || [], writePending:(id, rows) => { pending[id] = rows; },
    load:async () => records[user] || [], save:async entry => {
      if (fail) throw new Error('offline');
      records[user] = [...(records[user] || []).filter(row => row.id !== entry.id), entry];
    }});
  await vm.record({id:'one'});
  assert(vm.state.error); assert.equal(pending.a.length, 1);
  fail = false; await vm.refresh();
  assert.equal(pending.a.length, 0); assert.equal(vm.state.entries.length, 1);
  await vm.record({id:'one'}); assert.equal(records.a.length, 1);
  user = 'b'; vm.sync(); assert.deepEqual(vm.state.entries, []);
  await vm.refresh(); assert.deepEqual(vm.state.entries, []);
  user = null; vm.sync(); assert.equal(vm.state.loaded, false);
});

test('Una carga tardía no muestra estadísticas de otra sesión', async () => {
  const {createEstadisticasViewModel} = await import('../src/features/auth-cuenta/viewmodels/estadisticasViewModel.js');
  let user = 'a', resolve;
  const vm = createEstadisticasViewModel({accountId:() => user, readPending:() => [], writePending:() => {},
    save:async () => {}, load:() => new Promise(done => { resolve = done; })});
  const task = vm.refresh(); await new Promise(done => setImmediate(done));
  user = 'b'; vm.sync(); resolve([{id:'private-a'}]); await task;
  assert.deepEqual(vm.state.entries, []); assert.equal(vm.state.loaded, false);
});

test('Una cuenta sin historial puede guardar después de cargar la vista vacía', async () => {
  const {createEstadisticasViewModel} = await import('../src/features/auth-cuenta/viewmodels/estadisticasViewModel.js');
  let pending = []; const records = [];
  const vm = createEstadisticasViewModel({accountId:() => 'new-account',
    readPending:() => pending, writePending:(_, rows) => { pending = rows; },
    load:async () => [...records], save:async entry => { records.push(entry); }});
  await vm.refresh(); assert.equal(vm.state.entries.length,0);
  await vm.record({id:'first'});
  assert.equal(records.length,1); assert.equal(pending.length,0);
  assert.equal(vm.state.entries.length,1);
});
