import {ETAPAS_LEGACY} from './recorridoPartida.js';
export const clavesPartida = ['alcohol','fruta','sabor','fuerza','alergia','plan'];

// Una instancia por partida. Los Sets son las mismas referencias que usa la Vista.
export function createEstadoPartida(){
  const state = {
    sel:Object.fromEntries(clavesPartida.map(key => [key,new Set()])),
    phase:'step',
    stage:'alcohol',
    fruitAny:false,
    current:null,
    humor:0,
    styleTaste:'',
    styleTexture:'',
    styleDecisions:{},
    inspeccion:{decisiones:{},otra:''},
  };
  // Compatibilidad con integraciones anteriores; no almacena otro estado ni indica orden.
  Object.defineProperty(state, 'step', {
    get(){ return ETAPAS_LEGACY.indexOf(state.stage); },
    set(value){ state.stage = ETAPAS_LEGACY[value] || 'alcohol'; },
  });
  return state;
}
