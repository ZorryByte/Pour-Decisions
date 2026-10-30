const test=require('node:test'),assert=require('node:assert/strict');
test('Machacar y añadir conserva el jugo y mezcla un solo color',async()=>{
 const {createMezclaFrutas}=await import('../src/features/juego-trivia/etapas/frutas/frutasMezcla.js');
 const m=createMezclaFrutas();m.agregar('Fresa');m.machacar('Fresa');const before=m.cantidad();
 m.agregar('Piña');assert.equal(m.cantidad(),before);assert.equal(m.progreso.get('Fresa'),1/3);
 for(let i=0;i<3;i++)m.machacar('Piña');
 assert.equal(m.progreso.get('Piña'),1);assert.equal(m.recipiente.size,2);assert.match(m.colorRecipiente(),/^rgb\(/);
 assert.notEqual(m.colorRecipiente(),'rgb(232,178,46)');
 m.verter();assert.equal(m.cantidad(),0);assert.equal(m.coctelera.size,2);
 const saved=m.colorCoctelera();m.agregar('Mango');assert.equal(m.colorCoctelera(),saved);
 for(let i=0;i<3;i++)m.machacar('Mango');m.verter();assert.equal(m.coctelera.size,3);
 assert.notEqual(m.colorCoctelera(),saved);
 m.machacar('Piña');assert.equal(m.cantidad(),0,'Una fruta terminada no se duplica al machacar');
 m.quitar('Piña');assert.equal(m.coctelera.has('Piña'),false);
});
