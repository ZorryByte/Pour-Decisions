const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const storage = new Map();
function create(failStorage = false){
  const context = vm.createContext({window:{}, localStorage:{
    getItem(key){ if (failStorage) throw Error('unavailable'); return storage.get(key) || null; },
    setItem(key, value){ if (failStorage) throw Error('unavailable'); storage.set(key, value); }
  }});
  for (const file of ['src/features/juego-trivia/data/preguntas-datos.js','src/features/juego-trivia/views/preguntas.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  return context.window.Preguntas;
}
let game = create();
assert.equal(game.bank.length,48);
const source = JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/preguntas-aprobadas.json'),'utf8'));
assert.equal(JSON.stringify(game.bank),JSON.stringify(source),'Published bank matches approved copy');
assert.equal(new Set(game.bank.map(q=>q.id)).size,48);
let reactions = 0;
for (const q of game.bank){
  assert.equal(q.opciones.length,q.formato==='cuatro_opciones'?4:2);
  for (const pair of q.opciones){ assert(pair[0] && pair[1]); reactions++; }
}
assert.equal(reactions,128);
const seen = new Set();
for (let run=0;run<16;run++){
  game.reset();
  const state = game.ensure();
  assert.equal(state.ids.length,3);
  assert.equal(new Set(state.ids.map(id=>game.bank.find(q=>q.id===id).formato)).size,3);
  for (let i=0;i<3;i++){
    const q=game.current();
    assert(!seen.has(q.id),'Do not repeat before covering all 48'); seen.add(q.id);
    assert.equal(game.next(),false,'Unanswered question cannot advance');
    assert.equal(game.select(999),false);
    assert(game.select(0)); assert.equal(game.mood().text,q.opciones[0][1]);
    const stable=game.mood().text; assert.equal(game.mood().text,stable);
    assert(game.select(1)); assert.equal(game.mood().text,q.opciones[1][1]);
    assert.equal(game.answered(),i+1,'Changing answer does not double count');
    if(i<2) assert(game.next());
  }
  const snap=game.snapshot();
  game=create(); game.restore(snap);
  assert.equal(JSON.stringify(game.snapshot()),JSON.stringify(snap),'Reload preserves round and choices');
  assert(game.back()); assert.equal(game.current().id,snap.ids[1]);
  assert(game.next()); assert(game.closing().includes('elegiste'));
}
assert.equal(seen.size,48);
game.reset(); assert.equal(new Set(game.ensure().ids).size,3,'New cycle starts');
// Exhaust each bag by skipping; keep swapping to the remaining formats.
storage.clear(); game=create(); game.ensure();
const skipped=new Set(); let exhausted=false;
for(let i=0;i<60;i++){
  const id=game.current().id;
  assert(!skipped.has(id)); skipped.add(id);
  if(game.skip()) continue;
  if(game.otherFormat()) continue;
  exhausted=true; break;
}
assert(exhausted,'Exhaustion is bounded');
assert(game.snapshot().exhausted);
assert.equal(game.answered(),0,'Skips do not create answers');
assert.equal(game.closing(),'');
game.restore({version:1,ids:[999],answers:{},index:0});
assert.equal(game.snapshot(),null,'Reject invalid state');
const noStorage=create(true); noStorage.ensure(); noStorage.select(0); assert(noStorage.next());
console.log('OK: 48 questions, 128 reactions, full 16-round rotation, reload, back, answer changes, skips, exhaustion, invalid state and unavailable storage.');
