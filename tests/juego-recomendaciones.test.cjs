const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {runInNewContext} = require('node:vm');
const keys = ['alcohol','fruta','sabor','fuerza','alergia','plan'];
const selections = (values = {}) => Object.fromEntries(keys.map(k => [k,new Set(values[k] || [])]));
const plain = value => JSON.parse(JSON.stringify(value));
const html = readFileSync(resolve(__dirname,'../artifacts/antes-mvvm/index.html'),'utf8');
const start = html.indexOf('function hitsOf(c){'), end = html.indexOf('function pctLabel(c){',start);
assert(start >= 0 && end > start);
// Oráculo independiente: ejecutar las reglas del respaldo, no reescribirlas en el test.
const original = runInNewContext(`(function(C, sel, fruitAny, boost){
  const window = {Perfil:!!boost}, Perfil = {boost};
  ${html.slice(start,end)}
  return {hitsOf,eligible,score,scoreLoose,fuerzaDe,fuerzaAjuste,planPunto,ranked,matchPercent};
})`);

async function setup(){
  const recommendation = await import('../src/features/juego-trivia/domain/recomendarCocteles.js');
  const {chocaConRestricciones} = await import('../src/features/juego-trivia/domain/restricciones.js');
  const rules = {...recommendation,chocaConRestricciones};
  const {cocteles} = await import('../src/features/juego-trivia/data/cocteles.js');
  return {rules,cocteles};
}

function compare(rules, catalog, sel, fruitAny, boost){
  const previous = JSON.stringify({catalog,sel:Object.fromEntries(keys.map(k => [k,[...sel[k]]]))});
  // La puntuación anterior se conserva sobre la carta permitida. Las correcciones
  // de exclusiones se verifican de forma independiente en juego-restricciones.
  const allowed = catalog.filter(c => !rules.chocaConRestricciones(c,sel.alergia));
  const before = original(allowed,sel,fruitAny,boost);
  assert.deepEqual(rules.ranked(catalog,sel,fruitAny,boost).map(c => c.n),plain(before.ranked().map(c => c.n)));
  for (const c of catalog){
    for (const name of ['hitsOf','eligible','score','scoreLoose','fuerzaDe','fuerzaAjuste','planPunto','matchPercent']){
      assert.deepEqual(rules[name](c,sel,fruitAny),plain(before[name](c)),name+' / '+c.n);
    }
  }
  assert.equal(JSON.stringify({catalog,sel:Object.fromEntries(keys.map(k => [k,[...sel[k]]]))}),previous,'No muta catálogo ni elecciones');
}

test('Conserva resultados, porcentajes y fuerza para todas las combinaciones de alcohol y fruta indiferente', async () => {
  const {rules,cocteles} = await setup();
  const alcohol = ['Ron','Vodka','Ginebra','Tequila','Whisky','Brandy','Sin alcohol'];
  for (let mask=0; mask<128; mask++){
    for (const fruitAny of [false,true]){
      compare(rules,cocteles,selections({alcohol:alcohol.filter((_,i) => mask & (1<<i)),fruta:['Limón','Piña'],sabor:['Dulce','Ácido']}),fruitAny);
    }
  }
});

test('Conserva cada receta, restricciones, fuerza, planes y afinidad de perfil frente al respaldo', async () => {
  const {rules,cocteles} = await setup();
  const boost = c => c.n.includes('Mojito') ? 0.35 : c.n.includes('colada') ? -2 : 0;
  for (const c of cocteles){
    for (const fuerza of ['Suave','Medio','Fuerte']){
      for (const plan of ['fiesta','playa','cena','aventura']){
        compare(rules,cocteles,selections({alcohol:c.a,fruta:c.f,sabor:c.s,fuerza:[fuerza],plan:[plan]}),false,boost);
      }
    }
  }
  const allergy = ['ninguna','lacteos','frutos secos','citricos','gluten','otra'];
  for (let mask=0; mask<64; mask++){
    compare(rules,cocteles,selections({alergia:allergy.filter((_,i) => mask & (1<<i)),fuerza:['Fuerte'],plan:['cena']}),false,boost);
  }
});

test('Mantiene coincidencias estrictas, alternativas parciales y resultados vacíos', async () => {
  const {rules,cocteles} = await setup();
  for (const values of [
    {}, {alcohol:['inexistente']}, {alcohol:['Ron'],fruta:['inexistente'],sabor:['inexistente']},
    {alcohol:['Sin alcohol'],fruta:['Limón'],sabor:['Refrescante']},
    {alcohol:['Ron','Vodka','Ginebra','Tequila','Whisky','Brandy'],fruta:['Limón','Naranja','Piña','Mango','Coco'],sabor:['Dulce']},
  ]) compare(rules,cocteles,selections(values),false);
  compare(rules,[],selections(),false);
  assert.deepEqual(rules.ranked(cocteles,selections({alcohol:['inexistente']}),false),[]);
  const c = {n:'Prueba',a:['Ron'],f:['Limón'],s:['Ácido']};
  const strict = selections({alcohol:['Ron'],fruta:['Limón'],sabor:['Ácido']});
  assert.equal(rules.matchPercent(c,strict,false),100);
  const partial = selections({alcohol:['Ron'],sabor:['Dulce']});
  assert.equal(rules.eligible(c,partial,false),false);
  assert.equal(rules.matchPercent(c,partial,false),46);
});

test('Mantiene prioridad de puntuación, coincidencias, plan, nombre y afinidad sin cambiar porcentajes', async () => {
  const {rules} = await setup();
  const recipe = (n,f=[]) => ({n,a:['Ron'],f,s:['Dulce']});
  const catalog = [recipe('Zeta'),recipe('Beta',['Piña']),recipe('Ámbar')];
  const sel = selections({alcohol:['Ron'],plan:['playa']});
  assert.deepEqual(rules.ranked(catalog,sel,false).map(c => c.n),['Beta','Ámbar','Zeta']);
  const boost = c => c.n==='Zeta' ? 0.5 : 0;
  assert.deepEqual(rules.ranked(catalog,sel,false,boost).map(c => c.n),['Zeta','Beta','Ámbar']);
  compare(rules,catalog,sel,false,boost);
  const epsilon = c => c.n==='Zeta' ? 1e-10 : 0;
  compare(rules,catalog,sel,false,epsilon);
  // Con fruta indiferente la puntuación no depende de las frutas elegidas,
  // pero el número de coincidencias sigue desempatando antes que el nombre.
  const hits = selections({alcohol:['Ron'],fruta:['Piña']});
  assert.deepEqual(rules.ranked(catalog,hits,true).map(c => c.n),['Beta','Ámbar','Zeta']);
});
