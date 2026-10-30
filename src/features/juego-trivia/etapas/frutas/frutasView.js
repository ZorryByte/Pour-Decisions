export function createFrutasView({el, groups, asItem, viewModel, isFresh, fruitIconNode, dragLocked, onToggle}){
  function token(item, className){
    const b = el('button', {
      type:'button',
      class:[className, viewModel.isSelected(item.v) && 'is-on', isFresh(item.v) && 'is-fresh'].filter(Boolean).join(' '),
      'data-pick':item.v,
      'aria-pressed':viewModel.isSelected(item.v) ? 'true' : 'false'
    });
    if (className === 'fruit' && item.v !== 'cualquiera'){
      b.append(fruitIconNode(item.v), el('span', {class:'fruit-label'}, item.t));
    } else b.textContent = item.t;
    b.addEventListener('click', function(){
      if (className === 'fruit' && dragLocked()) return;
      onToggle(item.v);
    });
    return b;
  }
  const wrap = el('div',{class:'play fruit-tray'});
  const tray = el('div',{class:'fruits','role':'group','aria-label':'Frutas para tu mezcla'});
  groups.slice(1).forEach(function(group){
    group.o.forEach(function(raw){ tray.append(token(asItem(raw),'fruit')); });
  });
  wrap.append(tray,token({v:'cualquiera',t:'Sorpréndeme: la que sea'},'choice'));
  return wrap;
}
