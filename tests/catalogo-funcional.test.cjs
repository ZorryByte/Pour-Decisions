const test = require('node:test');
const assert = require('node:assert/strict');

test('Las 157 recetas siguen siendo recomendables con sus gustos, sin nombres duplicados', async () => {
  const {cocteles} = await import('../src/features/juego-trivia/data/cocteles.js');
  const {ranked,matchPercent} = await import('../src/features/juego-trivia/domain/recomendarCocteles.js');
  assert.equal(cocteles.length,157);
  assert.equal(new Set(cocteles.map(c => c.n)).size,cocteles.length);
  for(const c of cocteles){
    const sel={alcohol:new Set(c.a),fruta:new Set(c.f),sabor:new Set(c.s),fuerza:new Set(),alergia:new Set(),plan:new Set()};
    assert(ranked(cocteles,sel,false).includes(c),c.n);
    assert.equal(matchPercent(c,sel,false),100,c.n);
  }
});

test('Los espumosos de las recetas sin alcohol se indican explícitamente también en los pasos', async () => {
  const {cocteles} = await import('../src/features/juego-trivia/data/cocteles.js');
  for(const c of cocteles.filter(c => c.a.includes('Sin alcohol'))){
    for(const text of [...c.i,...c.p]){
      assert(!/espumoso(?! sin alcohol)/i.test(text),c.n+': '+text);
    }
    assert(!/con (?:vino )?espumoso(?! sin alcohol)/i.test(c.d),c.n+': '+c.d);
  }
});
