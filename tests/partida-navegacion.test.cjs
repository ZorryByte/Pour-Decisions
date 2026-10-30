const test = require('node:test');
const assert = require('node:assert/strict');
const {setup} = require('./helpers/partida.cjs');

test('Ambas vistas recorren alcohol, intensidad, frutas, estilos, restricciones y preguntas; Atrás invierte el mismo recorrido', async () => {
  for (const simple of [false,true]){
    const {state,vm,fill} = await setup(); fill();
    assert.strictEqual(vm.state,state);
    const visited = [state.stage];
    for (let i=0;i<5;i++){
      assert.equal(simple ? vm.nextSimple() : vm.next(),'advanced');
      visited.push(state.stage);
      assert.equal(vm.position(),i+1);
    }
    assert.deepEqual(visited,['alcohol','fuerza','fruta','sabor','alergia','plan']);
    assert.equal(vm.next(),'end');
    for(const expected of visited.slice(0,-1).reverse()){
      assert.equal(simple ? vm.backSimple() : vm.back(),simple ? true : 'step');
      assert.equal(state.stage,expected);
    }
    assert.equal(simple ? vm.backSimple() : vm.back(),simple ? false : 'ignored');
    assert.deepEqual([...state.sel.alcohol],['Ron']);
    assert.deepEqual([...state.sel.fuerza],['Medio']);
  }
});

test('Sin alcohol omite intensidad al avanzar y volver; cambiar a Ron vuelve a exigirla sin borrar frutas', async () => {
  for(const simple of [false,true]){
    const {state,vm,fill} = await setup(); fill();
    const {createAlcoholViewModel} = await import('../src/features/juego-trivia/etapas/alcohol/alcoholViewModel.js');
    const alcohol = createAlcoholViewModel({state,maxPick:5});
    state.sel.fruta.add('Piña'); alcohol.setSelection('Sin alcohol',true);
    assert.equal(simple ? vm.nextSimple() : vm.next(),'advanced');
    assert.equal(state.stage,'fruta'); assert.equal(state.sel.fuerza.size,0);
    assert.equal(vm.route().length,5); assert.equal(vm.position(),1);
    simple ? vm.backSimple() : vm.back(); assert.equal(state.stage,'alcohol');
    alcohol.setSelection('Ron',true);
    simple ? vm.nextSimple() : vm.next(); assert.equal(state.stage,'fuerza');
    assert.equal(simple ? vm.nextSimple() : vm.next(),'blocked');
    state.sel.fuerza.add('Fuerte'); simple ? vm.nextSimple() : vm.next();
    assert.equal(state.stage,'fruta'); assert.deepEqual([...state.sel.fruta],['Piña']);
  }
});

test('Cada requisito bloquea su etapa; frutas opcionales y Enter en cartas conservan su comportamiento', async () => {
  const {state,vm,steps,restriccionesVM} = await setup();
  for(const stage of ['alcohol','fuerza','sabor','alergia','plan']){
    state.stage=stage; assert(vm.blocked(),stage); assert.equal(vm.next(),'blocked'); assert.equal(state.stage,stage);
  }
  state.stage='fruta'; assert.equal(vm.blocked(),false);
  state.stage='sabor'; assert.equal(vm.next(true),'ignored');
  for(const name of steps.find(s => s.k==='sabor').groups[0].o) state.styleDecisions[name]=false;
  assert.equal(vm.next(true),'ignored'); assert.equal(vm.next(),'advanced');
  state.sel.alergia.add('ninguna'); assert.equal(vm.next(),'blocked','No se omite la inspección pendiente');
  restriccionesVM.approveAll(); assert.equal(vm.next(),'advanced');
});

test('Retroceder dentro de preguntas conserva la etapa; salir vuelve a restricciones; el resultado requiere recetas', async () => {
  const {state,vm,previous,results,fill} = await setup(); fill(); state.stage='plan';
  previous(true); assert.equal(vm.back(),'question'); assert.equal(state.stage,'plan');
  previous(false); assert.equal(vm.back(),'step'); assert.equal(state.stage,'alergia');
  state.stage='plan'; previous(true); vm.backConversation(); assert.equal(state.stage,'plan');
  previous(false); vm.backConversation(); assert.equal(state.stage,'alergia');
  state.stage='plan'; results([]); assert.equal(vm.next(),'blocked'); assert.equal(vm.nextSimple(),'empty');
  assert.equal(vm.finishConversation(),false); assert.equal(state.current,null);
  const drink={n:'Disponible'}; results([drink]); assert.equal(vm.finishConversation(),true);
  assert.strictEqual(state.current,drink); assert.equal(state.phase,'result');
});

test('Otra restricción no permite resultados ni elimina gustos en ninguna vista', async () => {
  const {state,vm,results,fill,restriccionesVM} = await setup(); fill(); state.stage='alergia'; state.sel.fruta.add('Piña');
  restriccionesVM.setOther('Fresa'); results([]);
  assert.equal(vm.next(),'blocked'); assert.equal(vm.nextSimple(),'blocked'); assert.equal(vm.finishConversation(),false);
  assert.equal(state.stage,'alergia'); assert.deepEqual([...state.sel.fruta],['Piña']);
});

test('La navegación busca metadatos por clave y funciona aunque el catálogo venga en otro orden', async () => {
  const {state,steps} = await setup();
  const {createPartidaViewModel} = await import('../src/features/juego-trivia/partida/partidaViewModel.js');
  const vm=createPartidaViewModel({state,steps:[...steps].reverse(),ranked:()=>[]});
  state.sel.alcohol.add('Vodka'); assert.equal(vm.next(),'advanced');
  assert.equal(vm.current().k,'fuerza'); assert.equal(vm.position(),1);
});
