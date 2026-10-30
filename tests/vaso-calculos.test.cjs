const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {runInNewContext} = require('node:vm');
const source=readFileSync(resolve(__dirname,'../artifacts/antes-mvvm/juego.js'),'utf8');
function between(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert(a>=0 && b>a); return source.slice(a,b);
}
const original=runInNewContext(`(function(api, answered, questionsAvailable=true){
  const window={Preguntas:questionsAvailable}, Preguntas={answered:()=>answered};
  ${between('  const PAL = {','  const ELEMENTOS')}
  ${between('  function mix(','  function hash(')}
  ${between('  function glassBounds(','  function bitsMarkup(')}
  return {liquidColor,fillLevel,liquidY,glassBounds,hex,ALC,FR};
})`);
const selections=(values={})=>Object.fromEntries(['alcohol','fruta','sabor','fuerza'].map(k=>[k,new Set(values[k]||[])]));
const load=()=>import('../src/features/juego-trivia/vaso/calculosVaso.js');
const plain=v=>JSON.parse(JSON.stringify(v));

test('El color conserva todas las combinaciones de bases, cada fruta y las fuerzas originales',async()=>{
  const rules=await load();
  const alcohol=Object.keys(rules.ALC),fruits=[[],...Object.keys(rules.FR).map(f=>[f]),Object.keys(rules.FR),['Limón','Piña','Coco'],['desconocida']];
  for(let mask=0;mask<128;mask++){
    for(const fruta of fruits){
      for(const fuerza of [[],['Suave'],['Medio'],['Fuerte'],['desconocida']]){
        const sel=selections({alcohol:alcohol.filter((_,i)=>mask & (1<<i)),fruta,fuerza});
        const before=JSON.stringify(Object.fromEntries(Object.entries(sel).map(([k,v])=>[k,[...v]])));
        assert.equal(rules.liquidColor(sel),original({sel},0).liquidColor());
        assert.equal(JSON.stringify(Object.fromEntries(Object.entries(sel).map(([k,v])=>[k,[...v]]))),before);
      }
    }
  }
  const baseline=original({sel:selections()},0);
  assert.deepEqual(rules.ALC,plain(baseline.ALC)); assert.deepEqual(rules.FR,plain(baseline.FR));
});

test('Cada combinación de progreso y respuestas conserva el nivel, límite y altura originales',async()=>{
  const rules=await load(); const keys=['alcohol','fruta','sabor','fuerza'];
  for(let mask=0;mask<16;mask++){
    const sel=selections(Object.fromEntries(keys.map((k,i)=>[k,mask & (1<<i)?['valor']:[]])));
    for(const fruitAny of [false,true]){
      for(const answered of [0,1,2,3]){
        const before=original({sel,fruitAny},answered);
        assert.equal(rules.fillLevel(sel,fruitAny,answered),before.fillLevel());
        assert.equal(rules.liquidY(sel,fruitAny,answered),before.liquidY());
      }
      assert.equal(rules.liquidY(sel,fruitAny,0),original({sel,fruitAny},0,false).liquidY(),'Funciona sin módulo de preguntas');
    }
  }
  assert.equal(rules.fillLevel(selections(),false,0),0.08);
  assert.equal(rules.liquidY(selections(),false,0),158);
  assert.equal(rules.fillLevel(selections(Object.fromEntries(keys.map(k=>[k,['valor']]))),false,3),0.86);
});

test('La geometría conserva los límites usados por los adornos y el arrastre de frutas',async()=>{
  const rules=await load(),before=original({sel:selections()},0);
  for(let y=-30;y<=240;y+=0.5){
    for(const pad of [0,4,7,9]) assert.deepEqual(rules.glassBounds(y,pad),plain(before.glassBounds(y,pad)));
  }
  for(const rgb of [[-20,0,300],[0,0,0],[255,255,255],[221,161,94]]) assert.equal(rules.hex(rgb),before.hex(rgb));
});
