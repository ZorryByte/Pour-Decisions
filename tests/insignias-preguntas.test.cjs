const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root,'src/features/juego-trivia/models/insignias.js'),'utf8');
const bank = JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/preguntas-aprobadas.json'),'utf8'));
const read = name => fs.readFileSync(path.join(root,name),'utf8').replace('export { C as cocteles };','');
const store = () => { const values=new Map(); return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values}; };
const storage=store();
const context=vm.createContext({window:{},localStorage:storage,sessionStorage:store(),location:{search:''},URLSearchParams});
vm.runInContext(read('src/features/juego-trivia/data/cocteles.js')+'\nwindow.recipes=C;',context);
// Inspección interna solo en pruebas. Las pendientes no se montan en la interfaz.
vm.runInContext(source.replace('return {collect, ranks,','return {_test:{catalog,questionCatalog,questionAlternatives,normalizeAnswers},collect,ranks,'),context);
const engine=context.window.Insignias;
const {catalog,questionCatalog,questionAlternatives,normalizeAnswers}=engine._test;
const questions=new Map(bank.map(q=>[q.id,q]));
const original=catalog.slice(0,46);
const identity=crypto.createHash('sha256').update(JSON.stringify(original.map(b=>[b.id,b.name,b.text,b.rank]))).digest('hex');
assert.equal(identity,'ff912a4dea172cc427b2dd03d203c95adc75b0485b38a71390e9ed8df1d9b0e9','Nombres, textos y rangos de las 46 existentes intactos');
assert.equal(catalog.length,81);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(catalog.map(b=>[b.id,b.name,b.text,b.rank]))).digest('hex'),'25ae98a1e7912908b9d8fb518bcde73c8091d3a3f3d7766f2b23dc110d8fdfaf','Los 81 nombres, textos y rangos se conservan al cambiar condiciones');
assert.equal(new Set(catalog.map(b=>b.id)).size,81);
assert.equal(questionCatalog.length,35);
for(const [rank,count] of [['cobre',10],['plata',14],['oro',11]]) assert.equal(questionCatalog.filter(b=>b.rank===rank).length,count);
assert.equal(new Set(questionCatalog.map(b=>JSON.stringify(Array.from(b.questionRequirements).sort((a,b)=>a[0]-b[0])))).size,35,'Cada insignia de preguntas tiene su propia combinación');
assert.equal(questionCatalog.find(b=>b.id==='sus-confianza').name,'Qué SUSpechoso');
for(const [id,category] of [['nbhd-daddy-issues','The Neighbourhood'],['nbhd-softcore','The Neighbourhood'],['kanye-runaway','Kanye West'],['kanye-heartless','Kanye West'],['eva-karaoke','Evangelion']]) assert.equal(questionCatalog.find(b=>b.id===id).category,category);
let next=0;
function api(answers,changes={}){
  return {draftName:'Prueba '+next++,current:context.window.recipes[0],fruitAny:false,badgeAnswers:answers,
    sel:{alcohol:new Set(['Ron']),fruta:new Set(['Piña','Coco']),sabor:new Set(['Dulce']),fuerza:new Set(['Suave']),plan:new Set(),alergia:new Set(['ninguna']),...changes}};
}
const answer=(questionId,optionIndex)=>({questionId,optionIndex});
const has=(awards,id)=>awards.some(b=>b.id===id);
const fieldNames={alcohol:'alcohol',fruit:'fruta',styles:'sabor',strength:'fuerza'};
function drinkChoices(badge){
  const rule=badge.beverageRequirements, choices={};
  if(!rule) return choices;
  for(const [key,field] of Object.entries(fieldNames)) if(rule[key]) choices[field]=new Set(rule.mode==='exact'?rule[key]:[rule[key][0]]);
  return choices;
}
const universe={alcohol:['Ron','Vodka','Ginebra','Tequila','Whisky','Brandy','Sin alcohol'],fruit:['Piña','Coco','Mango','Maracuyá','Limón','Naranja','Fresa','Sandía','Durazno','Menta'],styles:['Dulce','Ácido','Cremoso','Refrescante','Suave','Espumoso','Granizado','Sedoso'],strength:['Suave','Medio','Fuerte']};
const empty=engine.collect(api([]));
assert(!empty.some(b=>questionCatalog.some(q=>q.id===b.id)),'Ninguna nueva sin respuestas');
const covered=new Set();
for(const badge of questionCatalog){
  const required=badge.questionRequirements;
  const formats=new Set();
  required.forEach(([id,option])=>{
    const question=questions.get(id);
    assert(question && question.opciones[option],badge.id+' usa una opción vigente');
    assert(!formats.has(question.formato),badge.id+' se puede conseguir con una pregunta de cada formato');
    formats.add(question.formato);covered.add(id);
  });
  const selected=Array.from(required,([id,option])=>answer(id,option));
  const choices=drinkChoices(badge);
  const p=api(selected,choices),before=JSON.stringify([...p.sel.sabor,...p.sel.alcohol]);
  const earned=engine.collect(p);
  assert(has(earned,badge.id),'Se obtiene '+badge.id);
  assert(earned.find(b=>b.id===badge.id).isNew);
  assert.equal(JSON.stringify([...p.sel.sabor,...p.sel.alcohol]),before,'No cambia gustos');
  assert(!engine.collect(p).find(b=>b.id===badge.id).isNew,'No se repite el anuncio');
  assert(has(engine.collect(api(undefined,choices),selected),badge.id),'Acepta segundo argumento explícito');
  for(let i=0;i<selected.length;i++){
    const changed=selected.map((a,j)=>j===i?answer(a.questionId,(a.optionIndex+1)%questions.get(a.questionId).opciones.length):a);
    assert(!has(engine.collect(api(changed,choices)),badge.id),'Cambiar una respuesta invalida '+badge.id);
    assert(!has(engine.collect(api(selected.filter((_,j)=>i!==j),choices)),badge.id),'Saltar una pregunta invalida '+badge.id);
  }
  const stored=JSON.parse([...storage.values.values()].at(-1));
  assert.deepEqual(Object.keys(stored).sort(),['earned','records']);
  assert(stored.records.every(r=>Object.keys(r).sort().join(',')==='drink,plan,style'),'No se guardan confesiones');
  const other=api([]);assert(!has(engine.collect(other),badge.id),'No hereda el logro otra persona');
  const rule=badge.beverageRequirements;
  if(badge.rank==='cobre'){
    assert(!rule,'Cobre depende solo de la respuesta');
    assert(has(engine.collect(api(selected,{alcohol:new Set(['Sin alcohol']),fruta:new Set(),sabor:new Set(['Sedoso']),fuerza:new Set(['Fuerte'])})),badge.id),'La bebida no altera cobre');
  } else {
    assert(rule && rule.mode===(badge.rank==='plata'?'flexible':'exact'));
    for(const [key,field] of Object.entries(fieldNames)){
      if(!rule[key]) continue;
      const outside=universe[key].find(v=>!rule[key].includes(v));
      assert(!has(engine.collect(api(selected,{...choices,[field]:new Set([outside])})),badge.id),'Respuestas sin el grupo de bebida no bastan: '+badge.id+' '+key);
      if(rule.mode==='flexible'){
        for(const value of rule[key]) assert(has(engine.collect(api(selected,{...choices,[field]:new Set([value])})),badge.id),'Cada alternativa sirve: '+badge.id+' '+value);
        assert(has(engine.collect(api(selected,{...choices,[field]:new Set([...choices[field],outside])})),badge.id),'Plata admite opciones adicionales: '+badge.id+' '+key);
      } else {
        assert(has(engine.collect(api(selected,{...choices,[field]:new Set([...rule[key]].reverse())})),badge.id),'Oro no depende del orden');
        assert(!has(engine.collect(api(selected,{...choices,[field]:new Set([...rule[key],outside])})),badge.id),'Oro rechaza extras: '+badge.id+' '+key);
        const omitted = api(selected,{...choices,[field]:new Set(rule[key].slice(1))});
        const implicitSoft = key==='strength' && omitted.sel.fuerza.size===0 &&
          omitted.sel.alcohol.size===1 && omitted.sel.alcohol.has('Sin alcohol') && rule[key].includes('Suave');
        assert.equal(has(engine.collect(omitted),badge.id),implicitSoft,'Solo Sin alcohol admite fuerza suave implícita: '+badge.id+' '+key);
      }
    }
    if(rule.fruit){const any=api(selected,choices);any.fruitAny=true;assert(!has(engine.collect(any),badge.id),'Cualquier fruta no equivale a elegir una fruta concreta');}
    if(rule.mode==='exact') assert.deepEqual(Object.keys(rule).sort(),['alcohol','fruit','mode','strength','styles']);
  }
}
// Las respuestas vigentes de la partida mandan; no se suman entre renderizados.
const three=questionCatalog.find(b=>b.rank==='oro');
const split=api([answer(...three.questionRequirements[0])],drinkChoices(three));
engine.collect(split);
split.badgeAnswers=Array.from(three.questionRequirements.slice(1),a=>answer(...a));
assert(!has(engine.collect(split),three.id),'No fabrica una combinación con respuestas de otra partida');
assert(!has(engine.collect(api([answer(1,0),answer(1,1)])),'traicion-wifi'),'Conflicto de elección única no otorga');
assert(has(engine.collect(api([answer(1,0),answer(1,0)])),'traicion-wifi'),'Duplicado idéntico es idempotente');
for(const raw of [null,{},'Sí',[{questionId:'1',optionIndex:0}],[answer(0,0)],[answer(49,0)],[answer(1,2)],[answer(2,4)],[answer(1,-1)],[answer(1,.5)]]) assert.equal(normalizeAnswers(raw).size,0);
for(const q of bank) for(let i=0;i<q.opciones.length;i++) assert.equal(normalizeAnswers([answer(q.id,i)]).get(q.id),i);
// Ajustes de las existentes: rutas alternativas sin perder la vía original.
assert.equal(Object.keys(questionAlternatives).length,23);
for(const [id,alt] of Object.entries(questionAlternatives)){
  alt.answers.forEach(([q,o])=>{assert(questions.get(q)?.opciones[o]);covered.add(q);});
  const chosen=Array.from(alt.answers,a=>answer(...a));
  const p=api(chosen);
  if(id==='apego') p.sel.sabor=new Set(['Dulce']);
  if(id==='hielo') {p.sel.sabor=new Set(['Refrescante']);p.sel.fuerza=new Set(['Suave']);}
  if(id==='bluetooth') p.sel.sabor=new Set(['Refrescante']);
  if(id==='fuente') p.fruitAny=true;
  if(id==='cine') p.sel.fruta=new Set(['Naranja']);
  if(id==='sanando') p.sel.sabor=new Set(['Ácido']);
  if(id==='contacto') p.sel.alcohol=new Set(['Sin alcohol']);
  if(id==='supp') p.sel.alcohol=new Set(['Ron','Vodka']);
  if(id==='produccion'||id==='rapidos') p.fruitAny=true;
  if(id==='nook') p.sel.alcohol=new Set(['Sin alcohol']);
  if(id==='canela'){p.sel.fruta=new Set(['Piña','Mango','Coco','Fresa','Menta']);p.sel.sabor=new Set(['Refrescante']);}
  if(id==='moe') p.sel.alcohol=new Set(['Brandy']);
  const exact={
    'build-prohibida':['Ginebra',['Limón','Menta','Maracuyá'],'Ácido','Medio'],
    redstone:['Vodka',['Fresa','Sandía','Limón'],'Dulce','Medio'],
    'isla-sin-deudas':['Sin alcohol',['Mango','Maracuyá','Menta'],'Refrescante','Suave'],
    'ekko-salvador':['Sin alcohol',['Limón','Menta','Naranja'],'Refrescante','Suave'],
    'zaun-heroina':['Tequila',['Fresa','Maracuyá','Limón'],'Ácido','Fuerte'],
    'hula-girl':['Ron',['Piña','Coco','Durazno'],'Dulce','Medio']
  }[id];
  if(exact){p.sel.alcohol=new Set([exact[0]]);p.sel.fruta=new Set(exact[1]);p.sel.sabor=new Set([exact[2]]);p.sel.fuerza=new Set([exact[3]]);}
  assert(has(engine.collect(p),id),'Nueva vía obtiene '+id+' sin plan antiguo');
  const invalid=api([],{...p.sel});
  assert(!has(engine.collect(invalid),id),'Los gustos solos no activan la nueva vía: '+id);
}
assert.equal(covered.size,48,'Las 48 preguntas aportan a alguna insignia');
assert.equal(catalog.filter(b=>b.rank==='cobre').length,22);
assert.equal(catalog.filter(b=>b.rank==='plata').length,34);
assert.equal(catalog.filter(b=>b.rank==='oro').length,25);
console.log('PASS: 81 textos intactos; 10 cobres solo por respuesta; 14 platas con todas sus alternativas de base/fruta/estilo/fuerza; 11 oros con combinaciones exactas sin extras; 48 preguntas, cambios, saltos, aislamiento y privacidad.');
