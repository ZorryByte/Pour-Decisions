const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const context=vm.createContext({window:{},localStorage:store(),sessionStorage:store(),location:{search:''},URLSearchParams});
for(const file of ['src/features/juego-trivia/data/preguntas-datos.js','src/features/juego-trivia/views/preguntas.js'])vm.runInContext(read(file),context);
vm.runInContext('const Preguntas=window.Preguntas;',context);
vm.runInContext(read('src/features/juego-trivia/models/insignias.js').replace('return {collect, ranks,','return {catalog,questionCatalog,collect,ranks,'),context);
const app=read('src/app/iniciarSistema.js');
const start=app.indexOf('    get badgeAnswers(){');
const end=app.indexOf('    get reveal()',start);
assert(start>0&&end>start,'La API real del juego conecta el cuestionario');
const bound=vm.runInContext('({'+app.slice(start,end)+'})',context);
const game=context.window.Preguntas,engine=context.window.Insignias;
assert.equal(JSON.stringify(bound.badgeAnswers),'[]','No se inventan respuestas sin partida');
game.restore({version:1,ids:[1,2,3],answers:{1:0,2:0,3:1,48:1},index:0});
assert.equal(bound.badgeAnswers.length,3,'Ignora respuestas ajenas a las preguntas vigentes');
assert(game.skip(),'Hay preguntas inéditas para reemplazar la actual');
assert.equal(bound.badgeAnswers.length,2,'Saltar retira la respuesta de las insignias');
game.select(0);assert.equal(bound.badgeAnswers.length,3);
game.select(1);assert.equal(bound.badgeAnswers.length,3,'Cambiar respuesta no duplica');
let n=0;
for(const badge of engine.questionCatalog){
  const answers=Object.fromEntries(badge.questionRequirements);
  game.restore({version:1,ids:Array.from(badge.questionRequirements,a=>a[0]),answers,index:0});
  assert.equal(bound.badgeAnswers.length,badge.questionRequirements.length);
  const p={draftName:'Integración '+n++,current:{n:'Receta de prueba',i:[]},fruitAny:false,
    sel:{alcohol:new Set(['Ron']),fruta:new Set(['Piña','Coco']),sabor:new Set(['Dulce']),fuerza:new Set(['Suave']),plan:new Set(),alergia:new Set(['ninguna'])}};
  const rule=badge.beverageRequirements;
  if(rule) for(const [key,field]of Object.entries({alcohol:'alcohol',fruit:'fruta',styles:'sabor',strength:'fuerza'}))if(rule[key])p.sel[field]=new Set(rule.mode==='exact'?rule[key]:[rule[key][0]]);
  Object.defineProperty(p,'badgeAnswers',Object.getOwnPropertyDescriptor(bound,'badgeAnswers'));
  assert(engine.collect(p).some(b=>b.id===badge.id),'El cuestionario real desbloquea '+badge.name);
  if(p.sel.alcohol.size===1 && p.sel.alcohol.has('Sin alcohol') && p.sel.fuerza.has('Suave')){
    const automatic={...p,draftName:'Sin intensidad '+n++};
    automatic.sel={...p.sel,fuerza:new Set()};
    Object.defineProperty(automatic,'badgeAnswers',Object.getOwnPropertyDescriptor(bound,'badgeAnswers'));
    assert(engine.collect(automatic).some(b=>b.id===badge.id),'Omitir intensidad conserva '+badge.name);
    assert.equal(automatic.sel.fuerza.size,0,'La insignia no modifica las selecciones');
  }
  game.reset();assert.equal(p.badgeAnswers.length,0,'Otra partida limpia la conexión');
  const next={...p,draftName:'Nueva partida '+n++};
  assert(!engine.collect(next).some(b=>b.id===badge.id),'No hereda respuestas una nueva partida');
}
console.log('PASS: conexión real de las 35 insignias nuevas con Preguntas.snapshot; cambios, saltos y reinicio de partida.');
