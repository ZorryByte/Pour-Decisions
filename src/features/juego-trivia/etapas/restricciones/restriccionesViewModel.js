import {PASES, MOTIVOS, motivosPara} from './restriccionesDatos.js';

// Decisiones sobre la instancia compartida de partida; sin DOM, timers ni red.
export function createRestriccionesViewModel({state}){
  const ids = new Set(PASES.map(p => p.id));
  function datos(){
    if (!state.inspeccion) state.inspeccion = {decisiones:{}, otra:''};
    return state.inspeccion;
  }
  function restore(raw){
    const decisiones = {};
    for (const p of PASES){
      const value = raw?.decisiones?.[p.id];
      if (value === 'aprobado' || value === 'salud' || motivosPara(p.id).includes(value)) decisiones[p.id] = value;
    }
    state.inspeccion = {decisiones, otra:typeof raw?.otra === 'string' ? raw.otra.trim().slice(0,240) : ''};
  }
  function ensure(){
    const d = datos();
    // Las sesiones anteriores tienen exclusiones, pero no credenciales inspeccionadas.
    if (!Object.keys(d.decisiones).length && state.sel.alergia.size){
      for (const p of PASES) d.decisiones[p.id] = state.sel.alergia.has(p.id) ? 'salud' : 'aprobado';
      if (state.sel.alergia.has('lactosa')) d.decisiones.lacteos = 'lactosa';
      if (state.sel.alergia.has('trigo')) d.decisiones.gluten = 'trigo';
      if (state.sel.alergia.has('otra')) d.otra = 'Otra restricción pendiente de identificar';
    }
    return d;
  }
  function sync(){
    const d = datos(), set = state.sel.alergia;
    set.clear();
    for (const [id,value] of Object.entries(d.decisiones)){
      if (value !== 'aprobado') set.add(id === 'gluten' && value === 'trigo' ? 'trigo' : id === 'lacteos' && value === 'lactosa' ? 'lactosa' : id);
    }
    if (d.otra) set.add('otra');
    if (!set.size && complete()) set.add('ninguna');
  }
  function decide(id, value){
    if (!ids.has(id) || (value !== 'aprobado' && !motivosPara(id).includes(value))) return false;
    datos().decisiones[id] = value;
    sync();
    return true;
  }
  function complete(){ return PASES.every(p => Boolean(datos().decisiones[p.id])); }
  function approveAll(){
    for (const p of PASES) datos().decisiones[p.id] = 'aprobado';
    datos().otra = ''; sync();
  }
  function setOther(text){ datos().otra = String(text).trim().slice(0,240); sync(); }
  function snapshot(){ const d = datos(); return {decisiones:{...d.decisiones},otra:d.otra}; }
  function summary(){ return PASES.filter(p => datos().decisiones[p.id]).map(p => ({...p, decision:datos().decisiones[p.id], motivo:MOTIVOS[datos().decisiones[p.id]] || 'Sin exclusión indicada'})); }
  function reset(){ state.inspeccion = {decisiones:{},otra:''}; }
  return {ensure, restore, decide, complete, approveAll, setOther, snapshot, summary, reset};
}
