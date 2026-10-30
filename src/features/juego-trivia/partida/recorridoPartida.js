// Los identificadores son claves del dominio, nunca posiciones de pantalla.
export const ORDEN_ETAPAS = Object.freeze(['alcohol','fuerza','fruta','sabor','alergia','plan']);

// Solo para leer sesiones anteriores y para el adaptador step de integraciones antiguas.
export const ETAPAS_LEGACY = Object.freeze(['alcohol','fruta','sabor','fuerza','alergia','plan']);

export function esEtapa(stage){ return ORDEN_ETAPAS.includes(stage); }
export function sinAlcohol(state){
  return state.sel.alcohol.size === 1 && state.sel.alcohol.has('Sin alcohol');
}
export function recorridoPartida(state){
  return ORDEN_ETAPAS.filter(stage => stage !== 'fuerza' || !sinAlcohol(state));
}
export function etapaVecina(state, direction){
  const route = recorridoPartida(state);
  const index = route.indexOf(state.stage);
  return index < 0 ? null : route[index + direction] || null;
}

// Una sesión vieja puede estar más adelante sin haber elegido intensidad todavía.
export function normalizarEtapa(state, {recuperada = false} = {}){
  if (!esEtapa(state.stage)) state.stage = ORDEN_ETAPAS[0];
  if (sinAlcohol(state)){
    state.sel.fuerza.clear();
    if (state.stage === 'fuerza') state.stage = 'fruta';
  } else if (recuperada && state.phase !== 'result' && state.sel.alcohol.size &&
    !state.sel.fuerza.size && ORDEN_ETAPAS.indexOf(state.stage) > ORDEN_ETAPAS.indexOf('fuerza')){
    state.stage = 'fuerza';
  }
}
