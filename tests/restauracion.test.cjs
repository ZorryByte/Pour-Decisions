const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync,readdirSync} = require('node:fs');
const {resolve,dirname} = require('node:path');
const root=resolve(__dirname,'../src/features/juego-trivia');

// Contratos de arquitectura: permiten cambiar una implementación sin congelar su texto.
test('Las reglas, estado y navegación no importan vistas, infraestructura ni servicios',()=>{
  for(const folder of ['domain','partida']){
    for(const entry of readdirSync(resolve(root,folder))){
      if(!entry.endsWith('.js'))continue;
      const file=resolve(root,folder,entry),source=readFileSync(file,'utf8');
      const imports=[...source.matchAll(/from ['"]([^'"]+)['"]/g)].map(match=>match[1]);
      for(const dependency of imports){
        assert(!/views|infrastructure|iniciarSistema/.test(dependency),entry+' no debe depender de '+dependency);
      }
      assert(!/\b(document|window|sessionStorage|localStorage|fetch)\s*[.(]/.test(source),entry+' debe poder ejecutarse sin navegador');
    }
  }
});

test('El grafo de módulos del juego no contiene dependencias circulares',()=>{
  const files=[];
  function collect(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){
    const path=resolve(folder,entry.name);if(entry.isDirectory())collect(path);else if(path.endsWith('.js'))files.push(path);
  }}collect(root);
  const graph=new Map(files.map(file=>[file,[...readFileSync(file,'utf8').matchAll(/from ['"]([^'"]+\.js)['"]/g)]
    .map(match=>resolve(dirname(file),match[1])).filter(path=>path.startsWith(root))]));
  const done=new Set(),active=new Set();
  function visit(file){
    assert(!active.has(file),'Dependencia circular: '+file);if(done.has(file))return;
    active.add(file);for(const next of graph.get(file)||[])visit(next);active.delete(file);done.add(file);
  }for(const file of files)visit(file);
});

test('El catálogo contiene todas las etapas y opciones del estado sin duplicados',async()=>{
  const {etapasPartida:steps}=await import('../src/features/juego-trivia/partida/etapasPartida.js');
  const {ORDEN_ETAPAS}=await import('../src/features/juego-trivia/partida/recorridoPartida.js');
  const {clavesPartida}=await import('../src/features/juego-trivia/partida/estadoPartida.js');
  assert.deepEqual(steps.map(stage=>stage.k),[...ORDEN_ETAPAS]);
  assert.deepEqual([...new Set(steps.map(stage=>stage.k))].sort(),[...clavesPartida].sort());
  for(const stage of steps){assert(stage.q);assert(stage.label);assert(stage.className);assert(stage.groups.length);}
});
