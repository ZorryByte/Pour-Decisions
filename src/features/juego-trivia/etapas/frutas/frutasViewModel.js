export function createFrutasViewModel({state, maxPick}){
  function isSelected(value){ return value === 'cualquiera' ? state.fruitAny : state.sel.fruta.has(value); }
  function setSelection(value, checked){
    const set = state.sel.fruta;
    if (value === 'cualquiera'){
      if (checked){ state.fruitAny = true; set.clear(); }
      else state.fruitAny = false;
      return checked;
    }
    state.fruitAny = false;
    if (checked){
      if (set.size >= maxPick && !set.has(value)) return false;
      set.add(value);
    } else set.delete(value);
    return checked;
  }
  function toggle(value){
    const on = isSelected(value);
    if (!on && value !== 'cualquiera' && state.sel.fruta.size >= maxPick) return {status:'limit'};
    setSelection(value, !on);
    return {status:'changed', added:!on && isSelected(value)};
  }
  function add(value){
    if (state.sel.fruta.has(value) || state.fruitAny || state.sel.fruta.size >= maxPick) return false;
    setSelection(value, true);
    return true;
  }
  return {isSelected, setSelection, toggle, add};
}
