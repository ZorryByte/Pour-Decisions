import {ETAPAS_LEGACY, esEtapa, normalizarEtapa} from './recorridoPartida.js';

export const VERSION_PARTIDA = 4;

// Sin DOM ni almacenamiento: los adaptadores deciden dónde leer/escribir.
export function serializarPartida(state){
  return {
    version:VERSION_PARTIDA, stage:state.stage, phase:state.phase,
    fruitAny:state.fruitAny, current:state.current?.n || null,
    sel:Object.fromEntries(Object.entries(state.sel).map(([key, values]) => [key, [...values]])),
    styleTaste:state.styleTaste, styleTexture:state.styleTexture,
    styleDecisions:{...state.styleDecisions}, humor:state.humor,
  };
}

export function recuperarPartida(state, data, {steps, catalog}){
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
    (data.version !== undefined && data.version !== VERSION_PARTIDA)) return false;
  const byKey = Object.fromEntries(steps.map(stage => [stage.k, stage]));
  for (const [key, set] of Object.entries(state.sel)){
    const allowed = new Set(byKey[key].groups.flatMap(group => group.o.map(item => typeof item === 'string' ? item : item.v)).filter(v => v !== 'cualquiera'));
    set.clear();
    for (const value of Array.isArray(data.sel?.[key]) ? data.sel[key] : []){
      if (allowed.has(value)) set.add(value);
    }
    if (!byKey[key].multi && set.size > 1){
      const first = [...set][0]; set.clear(); set.add(first);
    }
  }
  if (state.sel.alcohol.has('Sin alcohol')){
    state.sel.alcohol.clear(); state.sel.alcohol.add('Sin alcohol');
  }
  if (state.sel.alergia.size > 1) state.sel.alergia.delete('ninguna');
  state.phase = ['step','name','result'].includes(data.phase) ? data.phase : 'step';
  state.stage = data.version === VERSION_PARTIDA
    ? (esEtapa(data.stage) ? data.stage : 'alcohol')
    : (Number.isInteger(data.step) ? ETAPAS_LEGACY[data.step] || 'alcohol' : 'alcohol');
  state.fruitAny = data.fruitAny === true;
  if (state.fruitAny) state.sel.fruta.clear();
  state.current = catalog.find(drink => drink.n === data.current) || null;
  if (state.phase === 'result' && !state.current) state.phase = 'step';
  state.styleTaste = ['Dulce','Ácido'].includes(data.styleTaste) ? data.styleTaste : '';
  state.styleTexture = ['Cremoso','Refrescante'].includes(data.styleTexture) ? data.styleTexture : '';
  state.styleDecisions = {};
  for (const name of byKey.sabor.groups[0].o){
    if (typeof data.styleDecisions?.[name] === 'boolean') state.styleDecisions[name] = data.styleDecisions[name];
  }
  state.humor = [-1,1].includes(data.humor) ? data.humor : 0;
  normalizarEtapa(state, {recuperada:true});
  return true;
}
