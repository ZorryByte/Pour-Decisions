const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const storage = new Map();
const context = vm.createContext({
  window: {},
  sessionStorage: {setItem(key, value){ storage.set(key, value); }}
});
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/^import[^\n]*\n/gm,'');
vm.runInContext(read('src/features/juego-trivia/data/frases-vaso.js'), context);
// Expose the actual resolver only inside this test VM; production exports stay unchanged.
const game = read('src/features/juego-trivia/views/juego.js').replace('    init: init,',
  '    _test: {mood: mood, setApi: function(value){ api = value; }},\n    init: init,');
assert.ok(game.includes('_test: {mood: mood'), 'Resolver test hook must be installed');
vm.runInContext(game, context);
const bank = context.window.VasoAlcohol;
const resolver = context.window.Juego._test;
const alcohol = new Set();
resolver.setApi({stage:'alcohol', sel:{alcohol}});
function choose(names){
  alcohol.clear();
  names.forEach(name => alcohol.add(name));
  return resolver.mood();
}
const bases = ['Ron','Vodka','Ginebra','Tequila','Whisky','Brandy'];
const singles = [...bases, 'Sin alcohol'];
assert.equal(Object.keys(bank).length, 63);
assert.equal(Object.values(bank).flat().length, 105);
assert.equal(new Set(Object.values(bank).flat()).size, 105);
for (const name of singles){
  const key = name === 'Sin alcohol' ? 'sin' : name.toLowerCase();
  assert.equal(bank[key].length, 7);
  const seen = [];
  for (let i = 0; i < 7; i++){
    choose([]);
    const mood = choose([name]);
    seen.push(mood.text);
    assert.equal(mood.text, resolver.mood().text, 'Rerender must not advance rotation');
  }
  assert.equal(new Set(seen).size, 7, name + ' must exhaust its seven phrases before repeating');
  choose([]);
  assert.equal(choose([name]).text, seen[0], name + ' rotation must wrap');
}
let combinations = 0;
for (let mask = 1; mask < 64; mask++){
  const names = bases.filter((_, i) => mask & (1 << i));
  if (names.length < 2 || names.length > 5) continue;
  const key = names.map(name => name.toLowerCase()).sort().join('|');
  assert.equal(bank[key]?.length, 1, 'Missing combination: ' + names.join(', '));
  const forward = choose(names);
  const reversed = choose(names.slice().reverse());
  assert.equal(forward.key, key);
  assert.equal(forward.text, bank[key][0]);
  assert.equal(reversed.text, forward.text, 'Click order must not change the combination');
  assert.equal(forward.face, 'laugh', 'Combination must preserve existing reaction');
  combinations++;
}
assert.equal(combinations, 56);
assert.equal(choose(['Sin alcohol']).key, 'sin');
assert.equal(choose([]).key, 'idle');
assert.ok(bank.tequila.includes('¿Tequila? ¿Qué pasó, mi gallo? ¿Te crees Itadori o por qué quieres agarrarte a vergazos con la botella?'));
assert.ok(!Object.values(bank).flat().some(text => text.includes('GTA')));
// Existing other-step resolution must still work.
resolver.setApi({stage:'fruta', fruitAny:false, sel:{fruta:new Set(['Limón'])}});
assert.equal(resolver.mood().key, 'citrico');
resolver.setApi({stage:'fuerza', sel:{fuerza:new Set(['Suave'])}});
assert.equal(resolver.mood().key, 'suave');
const html = fs.readFileSync(path.join(root,'src/main.js'),'utf8');
assert.ok(html.indexOf('data/frases-vaso.js') < html.indexOf('views/juego.js'));
console.log('OK: 105 unique phrases; 7 variants per option; all 56 combinations; rotation, rerenders, click order, other steps and script load order.');
