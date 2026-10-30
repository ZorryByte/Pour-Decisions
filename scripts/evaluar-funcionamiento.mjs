// Auditoría de reglas de producto, independiente de la paridad con el respaldo.
// Ejecutar: node scripts/evaluar-funcionamiento.mjs
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {cocteles as C} from '../src/features/juego-trivia/data/cocteles.js';
import {ranked, matchPercent, fuerzaDe} from '../src/features/juego-trivia/domain/recomendarCocteles.js';
import {chocaConRestricciones} from '../src/features/juego-trivia/domain/restricciones.js';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const styles = ['Dulce','Ácido','Cremoso','Refrescante','Suave','Espumoso','Granizado','Sedoso'];
const choices = (alcohol, fruta, sabor, fuerza = 'Medio', alergia = 'ninguna') => ({
  alcohol:new Set(alcohol), fruta:new Set(fruta), sabor:new Set(sabor),
  fuerza:new Set([fuerza]), alergia:new Set([alergia]), plan:new Set()
});
function subsets(values){
  return Array.from({length:2 ** values.length}, (_, mask) => values.filter((_, i) => mask & (1 << i)));
}
const coverage = [];
const restrictionSets = subsets(['lacteos','frutos secos','citricos','gluten','otra']).map(s => new Set(s));
let scenarios = 0;
for (const target of C){
  assert.equal(new Set(target.s).size, target.s.length, target.n + ': estilos duplicados');
  let best = Infinity, witness;
  // Búsqueda dirigida: subconjuntos de las etiquetas de cada receta, sin cuenta ni afinidad.
  for (const alcohol of subsets(target.a).filter(a => a.length)){
    for (const fruit of subsets(target.f)){
      for (const taste of subsets(styles.filter(s => target.s.includes(s)))){
        for (const strength of ['Suave','Medio','Fuerte']){
          const sel = choices(alcohol, fruit, taste, strength);
          const list = ranked(C, sel, fruit.length === 0);
          const index = list.indexOf(target);
          scenarios++;
          assert(index >= 0, target.n + ': excluida pese a elegir sus etiquetas');
          for (const c of list){
            const pct = matchPercent(c, sel, fruit.length === 0);
            assert(Number.isInteger(pct) && pct >= 0 && pct <= 100, c.n + ': porcentaje fuera de rango');
          }
          if (index + 1 < best){
            best = index + 1;
            witness = {alcohol, fruit, taste, strength, percent:matchPercent(target, sel, fruit.length === 0)};
          }
          if (best === 1) break;
        }
        if (best === 1) break;
      }
      if (best === 1) break;
    }
    if (best === 1) break;
  }
  const exact = choices(target.a, target.f, target.s);
  assert.equal(matchPercent(target, exact, false), 100, target.n + ': sus etiquetas no dan 100%');
  // Prueba de dominancia: estas recetas siempre puntúan al menos igual, tienen
  // tantos aciertos o más y ganan también el desempate por nombre. Se verifica
  // que ninguna restricción permita al objetivo mientras excluye al dominador.
  // Válido para el flujo actual sin plan, sin afinidad de una cuenta.
  const dominators = C.filter(c => c !== target
    && JSON.stringify([...c.a].sort()) === JSON.stringify([...target.a].sort())
    && fuerzaDe(c) === fuerzaDe(target)
    && target.f.every(f => c.f.includes(f)) && target.s.every(s => c.s.includes(s))
    && c.n.localeCompare(target.n,'es') < 0
    && restrictionSets.every(r => chocaConRestricciones(target,r) || !chocaConRestricciones(c,r))
  ).map(c => c.n);
  coverage.push({name:target.n, bestPosition:best, witness, dominators,
    provablyOutsideFirstNineWithoutProfile:dominators.length >= 9});
}

const store = () => { const values = new Map(); return {getItem:k => values.get(k) ?? null, setItem:(k,v) => values.set(k,v), removeItem:k => values.delete(k)}; };
const sandbox = vm.createContext({window:{},localStorage:store(),sessionStorage:store(),location:{search:''},URLSearchParams});
vm.runInContext(source('src/features/juego-trivia/models/insignias.js').replace('return {collect, ranks};', 'return {collect, ranks, catalog, questionAlternatives};'), sandbox);
const engine = sandbox.window.Insignias;
const app = source('src/app/iniciarSistema.js');
// Ejecutar el objeto de integración real, sin recrear manualmente sus getters.
const initCall = app.slice(app.indexOf('  Juego.init({'), app.indexOf('\n  });', app.indexOf('  Juego.init({')) + 6);
const partida = {sel:choices(['Ron'],['Piña'],['Dulce'],'Suave'),current:C[0]};
const integration = {partida,sel:partida.sel, Juego:{init:api => integration.api = api}};
for (const name of ['el','app','STEPS','MAX_PICK','partidaVM','alcoholVM','frutasVM','reveal','saved','persona','draftName','draftContact','respuestaId','matches','matchesError','matchesLoading','saveOpts','moveFocus','togglePick','asItem','ranked','persist','render','placeFocus','finishConversation','identityForm','deleteControl','refreshMatches','markVisit']) integration[name] = undefined;
vm.runInNewContext(initCall, integration);
const realApi = integration.api;
const badgeApi = {...realApi, draftName:'Auditoría', sel:partida.sel, current:C[0]};
const actual = engine.collect(badgeApi);
const explicit = engine.collect({...badgeApi,draftName:'Auditoría con respuestas'}, [{questionId:1,optionIndex:0}]);
assert(explicit.some(b => b.id === 'traicion-wifi'));
assert(!actual.some(b => b.id === 'traicion-wifi'));

const onlyPlan = engine.catalog.filter(b => /c\.(party|dinner|beach|adventure)|exactCombo\(/.test(b.test.toString()) && !engine.questionAlternatives[b.id]);
const looseSel = choices(['Ron'],['Coco'],['Ácido']);
const loose = ranked(C,looseSel,false);
const strictSel = choices(['Ron'],['Piña'],['Dulce'],'Fuerte');
const mocktailsWithAmbiguousAlcohol = C.filter(c => c.a.includes('Sin alcohol') && c.i.some(i => /espumoso/i.test(i) && !/sin alcohol/i.test(i)));
const result = {
  catalogSize:C.length, scenarios, uniqueNames:new Set(C.map(c => c.n)).size,
  visibleInDirectedSearch:coverage.filter(c => c.bestPosition <= 9).length,
  notVisibleInDirectedSearch:coverage.filter(c => c.bestPosition > 9),
  provablyOutsideFirstNineWithoutProfile:coverage.filter(c => c.provablyOutsideFirstNineWithoutProfile).map(c => ({name:c.name,dominators:c.dominators.length})),
  coverage,
  badges:{total:engine.catalog.length,ranks:Object.fromEntries(['cobre','plata','oro'].map(r => [r,engine.catalog.filter(b => b.rank === r).length])),
    answersConnected:Object.hasOwn(realApi,'badgeAnswers'),
    questionBadges:engine.catalog.filter(b => b.questionRequirements).length,
    alternatives: Object.keys(engine.questionAlternatives).length,
    requiresRemovedPlanWithoutAlternative:onlyPlan.map(b => ({id:b.id,name:b.name,reason:b.reason}))},
  examples:{
    unknownRestrictionReturns:ranked(C,choices(['Ron'],[],[],'Medio','otra'),true).length,
    loose:loose.slice(0,3).map(c => ({name:c.n,percent:matchPercent(c,looseSel,false)})),
    strength:ranked(C,strictSel,false).slice(0,3).map(c => ({name:c.n,strength:fuerzaDe(c),percent:matchPercent(c,strictSel,false)})),
    ambiguousMocktails:mocktailsWithAmbiguousAlcohol.map(c => ({name:c.n,ingredients:c.i,steps:c.p}))
  }
};
mkdirSync(new URL('../artifacts/evaluacion/',import.meta.url),{recursive:true});
writeFileSync(new URL('../artifacts/evaluacion/funcionamiento.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({catalogSize:result.catalogSize,scenarios,
  visibleInDirectedSearch:result.visibleInDirectedSearch,
  provablyOutsideFirstNineWithoutProfile:result.provablyOutsideFirstNineWithoutProfile,
  badges:result.badges,examples:result.examples,
  evidence:'artifacts/evaluacion/funcionamiento.json'},null,2));
