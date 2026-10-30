const test = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../src/features/juego-trivia/etapas/fuerza/medida.js');

test('Medir, verter y descartar conserva cantidades y no extrae alcohol selectivamente del vaso',async()=>{
  const {crearMedida}=await load();const m=crearMedida();
  m.llenar(1.5);m.verter(.5);assert.equal(m.jigger,1);assert.equal(m.vaso,.5);assert.equal(m.intensidad(),'Suave');
  m.descartar(.75);assert.equal(m.jigger,.25);assert.equal(m.vaso,.5);
  m.verter(1);assert.equal(m.jigger,0);assert.equal(m.vaso,.75);
  m.llenar(2);m.verter(2);assert.equal(m.vaso,2);assert.equal(m.jigger,.75);assert.equal(m.intensidad(),'Fuerte');
  m.vaciarVaso();assert.equal(m.vaso,0);assert.equal(m.jigger,.75);assert.equal(m.intensidad(),null);
  m.verter(.5);assert.equal(m.intensidad(),'Suave');
  m.descartarVaso(.2);assert.equal(m.vaso,.3);assert.equal(m.jigger,.25);
});
test('Los utensilios comparten un resorte estable y el movimiento reducido conserva el control directo',async()=>{
  const {crearCuerpo,avanzarCuerpo}=await import('../src/features/juego-trivia/etapas/fuerza/fisicaMedida.js');
  const body=crearCuerpo();body.targetX=200;body.targetAngle=65;
  for(let i=0;i<120;i++)avanzarCuerpo(body,1/60);
  assert.ok(Math.abs(body.x-200)<.01);assert.ok(Math.abs(body.angle-65)<.01);
  body.targetX=0;body.targetAngle=0;for(let i=0;i<120;i++)avanzarCuerpo(body,1/60);
  assert.ok(Math.abs(body.x)<.01);assert.ok(Math.abs(body.angle)<.01);
  body.targetX=90;body.targetAngle=-95;avanzarCuerpo(body,.016,true);
  assert.equal(body.x,90);assert.equal(body.angle,-95);assert.equal(body.wave,0);
});
test('No desborda, no admite cantidades negativas y las tres bandas toleran redondeo de fotogramas',async()=>{
  const {crearMedida,intensidadDe,onzasDe}=await load();const m=crearMedida();
  for(const bad of [-1,NaN,Infinity]){m.llenar(bad);m.verter(bad);m.descartar(bad);}
  assert.equal(m.jigger,0);m.llenar(50);assert.equal(m.jigger,2);m.descartar(99);assert.equal(m.jigger,0);
  assert.equal(intensidadDe(.75+1e-10),'Suave');assert.equal(intensidadDe(.76),'Medio');assert.equal(intensidadDe(1.5+1e-10),'Medio');assert.equal(intensidadDe(1.51),'Fuerte');
  for(const name of ['Suave','Medio','Fuerte'])assert.equal(crearMedida(onzasDe(name)).intensidad(),name);
});
test('Los eventos tienen variantes y la voz recuerda qué referencias ya utilizó en una ronda',async()=>{
  const {crearVozMedida,DIALOGOS_MEDIDA}=await import('../src/features/juego-trivia/etapas/fuerza/fuerzaDialogos.js');
  const voice=crearVozMedida(['Whisky']);assert.match(voice('base'),/Shelby/);assert.notEqual(voice('base'),voice('base'));
  assert.ok(Object.values(DIALOGOS_MEDIDA).flat().length>=80);
  for(const event of Object.keys(DIALOGOS_MEDIDA)){assert.notEqual(voice(event),voice(event));}
});
