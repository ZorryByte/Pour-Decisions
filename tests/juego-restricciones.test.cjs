const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const {resolve} = require('node:path');

async function rules(){
  return (await import('../src/features/juego-trivia/domain/restricciones.js')).chocaConRestricciones;
}

test('Toda la carta conserva los descartes conocidos; Otra bloquea y Ninguna no anula exclusiones reales', async () => {
  const choca = await rules();
  const {cocteles} = await import('../src/features/juego-trivia/data/cocteles.js');
  const html = readFileSync(resolve(__dirname,'../artifacts/antes-mvvm/index.html'),'utf8');
  const start = html.indexOf('function drinkText(c){'), end = html.indexOf('function fuerzaDe(c){',start);
  assert(start >= 0 && end > start);
  const original = runInNewContext(html.slice(start,end)+'\nchoca');
  const keys = ['ninguna','lacteos','frutos secos','citricos','gluten','otra','desconocida'];
  const before = JSON.stringify(cocteles);
  for (let mask = 0; mask < 2 ** keys.length; mask++){
    const exclusions = new Set(keys.filter((_,i) => mask & (1 << i)));
    const selection = [...exclusions];
    for (const drink of cocteles){
      const normalized = new Set(exclusions);
      normalized.delete('ninguna');
      const expected = exclusions.has('otra') || original(drink,normalized);
      assert.equal(choca(drink,exclusions),expected,drink.n+' / '+selection.join(', '));
    }
    assert.deepEqual([...exclusions],selection,'No modifica las selecciones');
  }
  assert.equal(JSON.stringify(cocteles),before,'No modifica el catálogo');
});

test('Conserva las coincidencias por nombre, fruta, ingredientes y descripción, sin distinguir mayúsculas', async () => {
  const choca = await rules();
  const cases = [
    ['lacteos','LECHE'],['lacteos','yogurt'],['lacteos','yogur'],['lacteos','nata'],['lacteos','crema'],
    ['frutos secos','amaretto'],['frutos secos','almendra'],['frutos secos','nuez'],['frutos secos','avellana'],['frutos secos','pistacho'],
    ['citricos','limon'],['citricos','limón'],['citricos','naranja'],['citricos','toronja'],['citricos','lima'],['citricos','curacao'],['citricos','curaçao'],['citricos','triple sec'],['citricos','cointreau'],
    ['gluten','cerveza'],['gluten','trigo'],
  ];
  for (const [key,word] of cases){
    for (const drink of [{n:word},{n:'Prueba',f:[word]},{n:'Prueba',i:[word]},{n:'Prueba',d:word}]){
      assert.equal(choca(drink,new Set([key])),true,JSON.stringify({key,drink}));
    }
  }
});

test('Las restricciones incompletas y contradictorias no permiten recetas; crema de coco no oculta crema láctea', async () => {
  const choca = await rules();
  const drink = {n:'Batido',i:['leche','crema de coco','almendra','cerveza','limón']};
  assert.equal(choca(drink,new Set()),false);
  assert.equal(choca(drink,new Set(['ninguna','lacteos','frutos secos','citricos','gluten'])),true);
  assert.equal(choca({n:'Piña colada',i:['crema de coco']},new Set(['lacteos'])),false);
  assert.equal(choca(drink,new Set(['lacteos'])),true,'Leche sigue descartando aunque haya crema de coco');
  assert.equal(choca(drink,new Set(['otra'])),true);
  assert.equal(choca({n:'Agua'},new Set(['ninguna','otra'])),true);
  assert.equal(choca({n:'Batido',i:['crema de coco','crema batida']},new Set(['lacteos'])),true);
  assert.equal(choca(drink,new Set(['desconocida'])),false);
  assert.equal(choca({n:'Agua'},new Set(['lacteos','frutos secos','citricos','gluten'])),false);
});
