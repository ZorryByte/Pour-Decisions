const test=require('node:test'),assert=require('node:assert/strict');
test('Los turnos respetan la lectura y una interrupción descarta solo las respuestas pendientes',async()=>{
 const {tiempoLectura,createConversacion,ritmoPalabras}=await import('../src/features/juego-trivia/etapas/frutas/frutasConversacion.js');
 const rhythm=ritmoPalabras('Una frase, con su pausa.');
 assert.equal(rhythm.beats.length,5);assert.ok(tiempoLectura('Una frase, con su pausa.')>=rhythm.duration+800);
 assert.ok(rhythm.beats.every((b,i)=>!i||b.at>rhythm.beats[i-1].at));
 assert.ok(tiempoLectura('Sí.')>=2600);assert.ok(tiempoLectura('Esta frase tiene muchas más palabras para que una persona pueda leerla con tranquilidad.')>tiempoLectura('Sí.'));
 let time=0,id=0,finished=0;const jobs=new Map(),seen=[];
 const c=createConversacion({show:(s,t)=>seen.push([s,t,time]),now:()=>time,schedule:(fn,delay)=>{jobs.set(++id,{fn,at:time+delay});return id;},cancel:n=>jobs.delete(n)});
 function advance(ms){const target=time+ms;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>target)break;jobs.delete(next[0]);time=next[1].at;next[1].fn();}time=target;}
 c.play([['Vaso','Una frase para leer.'],['Coctelera','Una respuesta que quedó vieja.']]);
 advance(500);c.play([['Coctelera','Ahora sí.']],()=>finished++);
 assert.equal(seen.length,1);advance(2100);assert.equal(seen[1][1],'Ahora sí.');
 assert.equal(seen.some(x=>x[1].includes('vieja')),false);advance(2600);assert.equal(finished,1);
 c.play([['Vaso','Última.'],['Coctelera','No debe aparecer.']]);c.cutAfterCurrent();advance(10000);assert.equal(seen.at(-1)[1],'Última.');
 c.dispose();c.play([['Vaso','Tampoco.']]);assert.equal(seen.at(-1)[1],'Última.');
});
