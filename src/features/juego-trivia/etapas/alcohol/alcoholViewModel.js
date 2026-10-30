// Ambas rutas usan los mismos Sets de la partida; no hay selecciones locales.
export function createAlcoholViewModel({state, maxPick}){
  function isSelected(value){ return state.sel.alcohol.has(value); }
  function setSelection(value, checked){
    const set = state.sel.alcohol;
    if (value === 'Sin alcohol'){
      if (checked){ set.clear(); set.add(value); }
      else set.delete(value);
      return checked;
    }
    if (checked) set.delete('Sin alcohol');
    if (checked){
      if (set.size >= maxPick && !set.has(value)) return false;
      set.add(value);
    } else set.delete(value);
    return checked;
  }
  function toggle(value){
    const on = isSelected(value);
    // La ruta animada comprueba el límite antes de aplicar exclusiones, como antes.
    if (!on && state.sel.alcohol.size >= maxPick) return {status:'limit'};
    setSelection(value, !on);
    return {status:'changed', added:!on && isSelected(value)};
  }
  return {isSelected, setSelection, toggle};
}
