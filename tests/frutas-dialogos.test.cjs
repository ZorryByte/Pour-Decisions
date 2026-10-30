const test=require('node:test');
const assert=require('node:assert/strict');
test('Las conversaciones de la barra no repiten la última variante y funcionan sin almacenamiento',async()=>{
 const {conversacionesFrutas,elegirConversacion}=await import('../src/features/juego-trivia/etapas/frutas/frutasDialogos.js');
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 for(const tipo of Object.keys(conversacionesFrutas)){
  let anterior;
  for(let i=0;i<30;i++){
   const actual=elegirConversacion(tipo,storage);if(conversacionesFrutas[tipo].length>1)assert.notEqual(actual,anterior);anterior=actual;
   for(const [speaker,line] of actual){assert.ok(['Vaso','Coctelera'].includes(speaker));assert.ok(line.length>0);}
  }
  assert.ok(elegirConversacion(tipo,{getItem(){throw Error();},setItem(){throw Error();}}).length);
 }
});
