const test=require('node:test');
const assert=require('node:assert/strict');
async function setup(){
  const {createEstadoPartida}=await import('../src/features/juego-trivia/partida/estadoPartida.js');
  const {createRestriccionesViewModel}=await import('../src/features/juego-trivia/etapas/restricciones/restriccionesViewModel.js');
  const state=createEstadoPartida(); return {state,vm:createRestriccionesViewModel({state})};
}
test('La inspección exige todos los pases y conserva el mismo Set de exclusiones sin límite de cinco',async()=>{
  const {state,vm}=await setup(); const set=state.sel.alergia;
  const {PASES}=await import('../src/features/juego-trivia/etapas/restricciones/restriccionesDatos.js');
  assert.equal(vm.complete(),false);
  for(const p of PASES) assert(vm.decide(p.id,'salud') || vm.decide(p.id,'gluten'));
  assert.equal(vm.complete(),true);assert.equal(state.sel.alergia.size,9);assert.strictEqual(state.sel.alergia,set);
  assert.equal(vm.decide('inventado','alergia'),false);assert.equal(vm.decide('huevo','inventado'),false);
  vm.approveAll();assert.deepEqual([...set],['ninguna']);
  vm.decide('huevo','alergia');assert.deepEqual([...set],['huevo']);
  vm.decide('huevo','aprobado');assert.deepEqual([...set],['ninguna']);
});
test('Lactosa y trigo tienen claves distintas, y los motivos se recuperan sin convertirlos en aprobación',async()=>{
  const {state,vm}=await setup();vm.approveAll();vm.decide('lacteos','lactosa');vm.decide('gluten','trigo');vm.decide('mani','gusto');
  assert.deepEqual([...state.sel.alergia],['lactosa','mani','trigo']);
  const other=await setup();other.vm.restore(vm.snapshot());
  assert.deepEqual(other.vm.snapshot(),vm.snapshot());assert(other.vm.complete());
  vm.setOther('  Fresa  ');assert(state.sel.alergia.has('otra'));assert.equal(vm.snapshot().otra,'Fresa');
  vm.setOther('');assert(!state.sel.alergia.has('otra'));
  const copy=vm.snapshot();copy.decisiones.mani='aprobado';assert.equal(vm.snapshot().decisiones.mani,'gusto');
  vm.reset();assert.equal(vm.complete(),false);
});
test('Las sesiones anteriores conservan sus exclusiones y una restricción Otra nunca desaparece',async()=>{
  for(const key of ['lacteos','lactosa','trigo','otra']){
    const {state,vm}=await setup();state.sel.alergia.add(key);vm.ensure();assert(state.sel.alergia.has(key));
    vm.decide('huevo','aprobado');assert(state.sel.alergia.has(key));
    assert(vm.complete());
  }
});
test('Los pases nuevos filtran recetas y productos declarados, incluidas claras opcionales',async()=>{
  const {chocaConRestricciones:choca}=await import('../src/features/juego-trivia/domain/restricciones.js');
  for(const [id,text] of [['huevo','Clara opcional'],['mani','Mantequilla de maní'],['soja','Leche de soya'],['sesamo','Tahini'],['sulfitos','Vermut'],['trigo','Trigo'],['gluten','Malta de cebada'],['lactosa','Crema batida']]){
    assert(choca({n:'Prueba',i:[text]},new Set([id])),id);
    assert(!choca({n:'Agua',i:['Agua','Hielo']},new Set([id])),id);
  }
  assert(!choca({n:'Piña colada',i:['Crema de coco']},new Set(['lactosa'])));
  const {cocteles}=await import('../src/features/juego-trivia/data/cocteles.js');
  assert(choca(cocteles.find(c=>c.n==='Clover club'),new Set(['huevo'])));
  assert(choca(cocteles.find(c=>c.n==='Negroni'),new Set(['sulfitos'])));
});
test('La navegación no admite una inspección parcial aunque ya haya una exclusión seleccionada',async()=>{
  const {state,vm}=await setup();const {createPartidaViewModel}=await import('../src/features/juego-trivia/partida/partidaViewModel.js');
  state.step=4;vm.decide('huevo','alergia');
  const nav=createPartidaViewModel({state,steps:Array(6).fill({}),ranked:()=>[],backQuestion:()=>false,restriccionesVM:vm});
  assert.equal(nav.next(),'blocked');vm.approveAll();assert.equal(nav.next(),'advanced');
  state.step=4;vm.setOther('Fresa');assert.equal(nav.next(),'blocked');
});
