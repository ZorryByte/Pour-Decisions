import {etapaVecina, recorridoPartida, normalizarEtapa} from './recorridoPartida.js';

// Decide transiciones y validaciones. La Vista conserva foco, mensajes y animaciones.
export function createPartidaViewModel({state, steps, ranked, backQuestion = () => false, restriccionesVM}){
  const byKey = Object.fromEntries(steps.map(stage => [stage.k, stage]));
  const validators = {
    alcohol:() => state.sel.alcohol.size === 0,
    fruta:() => false,
    sabor:() => byKey.sabor.groups[0].o.some(name => typeof state.styleDecisions[name] !== 'boolean'),
    fuerza:() => state.sel.fuerza.size === 0,
    alergia:() => state.sel.alergia.size === 0 || state.sel.alergia.has('otra') || Boolean(restriccionesVM && !restriccionesVM.complete()),
    plan:() => state.sel.plan.size === 0 || ranked().length === 0,
  };
  function normalize(options){ normalizarEtapa(state, options); }
  function route(){ return recorridoPartida(state).map(key => byKey[key]); }
  function current(){ return byKey[state.stage]; }
  function position(){ return route().findIndex(stage => stage.k === state.stage); }
  function previous(){ return etapaVecina(state, -1); }
  function blocked(){ return validators[state.stage]?.() ?? true; }
  function advance(){
    const target = etapaVecina(state, 1);
    if (!target) return 'end';
    state.phase = 'step'; state.stage = target;
    return 'advanced';
  }
  function next(fromSubmit = false){
    if (fromSubmit && state.stage === 'sabor') return 'ignored';
    if (blocked()) return 'blocked';
    normalize();
    return advance();
  }
  function back(){
    if (state.stage === 'plan' && backQuestion()) return 'question';
    const target = previous();
    if (!target) return 'ignored';
    state.phase = 'step'; state.stage = target;
    return 'step';
  }
  // El fallback usa opciones en lugar de cartas o inspección animada.
  function simpleBlocked(){
    const stage = current();
    if (!stage) return true;
    if (stage.k === 'alergia' && state.sel.alergia.has('otra')) return true;
    return stage.req && state.sel[stage.k].size === 0 && !(stage.k === 'fruta' && state.fruitAny);
  }
  function nextSimple(){
    if (simpleBlocked()) return 'blocked';
    normalize();
    const result = advance();
    if (result === 'advanced') return result;
    if (!finishConversation()) return 'empty';
    return 'result';
  }
  function backSimple(){
    const target = previous();
    if (!target) return false;
    state.stage = target; state.phase = 'step'; return true;
  }
  function backConversation(){ if (!backQuestion()) backSimple(); }
  function finishConversation(){
    const list = ranked();
    if (!list.length) return false;
    state.current = list[0]; state.phase = 'result';
    return true;
  }
  return {state, route, current, position, previous, normalize, blocked, next, back, simpleBlocked, nextSimple, backSimple, backConversation, finishConversation};
}
