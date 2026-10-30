const test = require('node:test');
const assert = require('node:assert/strict');
const {setup} = require('./helpers/partida.cjs');
const persistence = () => import('../src/features/juego-trivia/partida/persistenciaPartida.js');

test('Cada partida conserva Sets y decisiones independientes; step es solo un adaptador antiguo',async()=>{
  const a=await setup(),b=await setup(); a.fill(); a.state.step=3;
  assert.equal(a.state.stage,'fuerza'); a.state.stage='fruta'; assert.equal(a.state.step,1);
  assert.equal(b.state.sel.alcohol.size,0); assert.deepEqual(b.state.styleDecisions,{}); assert.equal(b.state.stage,'alcohol');
  assert(!Object.keys(a.state).includes('step'));
});

test('El formato actual guarda identificadores, recupera todas las selecciones y conserva referencias',async()=>{
  const {serializarPartida,recuperarPartida,VERSION_PARTIDA}=await persistence();
  const a=await setup(),b=await setup(); a.fill(); a.state.stage='sabor'; a.state.sel.fruta.add('Piña');
  a.state.styleTaste='Dulce';a.state.styleTexture='Cremoso';a.state.humor=1;
  const data=JSON.parse(JSON.stringify(serializarPartida(a.state)));
  assert.equal(data.version,VERSION_PARTIDA); assert.equal(data.stage,'sabor'); assert(!('step' in data));
  const sets={...b.state.sel};
  assert(recuperarPartida(b.state,data,{steps:b.steps,catalog:[]}));
  assert.deepEqual(serializarPartida(b.state),data);
  for(const key of Object.keys(sets)) assert.strictEqual(b.state.sel[key],sets[key]);
  data.sel.alcohol.push('Vodka'); assert.deepEqual([...b.state.sel.alcohol],['Ron']);
});

test('Las sesiones antiguas conservan el significado de cada número; las incompletas vuelven a intensidad',async()=>{
  const {recuperarPartida}=await persistence();
  const legacy=['alcohol','fruta','sabor','fuerza','alergia','plan'];
  for(let step=0;step<legacy.length;step++){
    const {state,steps}=await setup();
    assert(recuperarPartida(state,{step,sel:{alcohol:['Ron'],fuerza:['Medio'],fruta:['Mango']}},{steps,catalog:[]}));
    assert.equal(state.stage,legacy[step]); assert.deepEqual([...state.sel.fruta],['Mango']);
  }
  for(const step of [1,2,4,5]){
    const {state,steps}=await setup();
    recuperarPartida(state,{step,sel:{alcohol:['Ron'],fruta:['Piña'],sabor:['Dulce']}},{steps,catalog:[]});
    assert.equal(state.stage,'fuerza'); assert.deepEqual([...state.sel.fruta],['Piña']);assert(state.sel.sabor.has('Dulce'));
  }
});

test('Sin alcohol normaliza sesiones antiguas y actuales sin intensidad contradictoria ni perder el resultado',async()=>{
  const {recuperarPartida}=await persistence();
  for(const stage of [{step:3},{version:4,stage:'fuerza'}]){
    const {state,steps}=await setup();
    recuperarPartida(state,{...stage,sel:{alcohol:['Sin alcohol'],fuerza:['Fuerte'],fruta:['Mango']}},{steps,catalog:[]});
    assert.equal(state.stage,'fruta');assert.equal(state.sel.fuerza.size,0);assert(state.sel.fruta.has('Mango'));
  }
  const {state,steps}=await setup();const drink={n:'Guardado'};
  recuperarPartida(state,{phase:'result',step:5,current:'Guardado',sel:{alcohol:['Ron']}},{steps,catalog:[drink]});
  assert.equal(state.phase,'result');assert.strictEqual(state.current,drink);assert.equal(state.stage,'plan');
});

test('Datos inválidos se filtran por campo; versiones desconocidas se rechazan sin mutar la partida',async()=>{
  const {recuperarPartida,serializarPartida}=await persistence();
  const {state,steps,fill}=await setup();fill();const before=serializarPartida(state);
  for(const data of [undefined,null,[],42,{version:999}]){
    assert.equal(recuperarPartida(state,data,{steps,catalog:[]}),false);assert.deepEqual(serializarPartida(state),before);
  }
  recuperarPartida(state,{version:4,stage:'desconocida',phase:'result',current:'inventado',sel:{alcohol:['Ron','Sin alcohol'],fruta:['Ron','Piña','Piña'],fuerza:['Fuerte','Medio'],sabor:'Dulce',alergia:['ninguna','huevo']},styleDecisions:{Dulce:true,inventado:true},humor:99},{steps,catalog:[]});
  assert.equal(state.stage,'alcohol');assert.equal(state.phase,'step');assert.equal(state.current,null);
  assert.deepEqual([...state.sel.alcohol],['Sin alcohol']);assert.deepEqual([...state.sel.fruta],['Piña']);
  assert.equal(state.sel.fuerza.size,0);assert.equal(state.sel.sabor.size,0);assert.deepEqual([...state.sel.alergia],['huevo']);
  assert.deepEqual(state.styleDecisions,{Dulce:true});assert.equal(state.humor,0);
  for(const step of [1.5,-1,99,'3']){
    recuperarPartida(state,{step},{steps,catalog:[]});assert.equal(state.stage,'alcohol');
  }
});
