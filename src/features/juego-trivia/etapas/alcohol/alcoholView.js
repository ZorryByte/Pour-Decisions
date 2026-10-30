// Marcado y controles originales. La escena del vaso conserva su motor existente.
export function createAlcoholView({el, svgEl, groups, asItem, viewModel, isFresh, onToggle, question}){
  const wrap = el('div', {class:'play'});
  groups.forEach(function(g){
    const fs = el('fieldset');
    if (g.t) fs.append(el('legend', {}, g.t));
    else fs.setAttribute('aria-label', question());
    const box = el('div', {class:'bubbles'});
    g.o.forEach(function(raw){
      const item = asItem(raw);
      const b = el('button', {
        type:'button',
        class:['bubble', viewModel.isSelected(item.v) && 'is-on', isFresh(item.v) && 'is-fresh'].filter(Boolean).join(' '),
        'data-pick':item.v,
        'aria-pressed':viewModel.isSelected(item.v) ? 'true' : 'false'
      });
      b.append(svgEl('0 0 24 40','bottle-icon','<path d="M9 3h6v9l4 5v19H5V17l4-5z" fill="currentColor"/><path d="M8 2h8v4H8z" fill="currentColor"/><path d="M7 22h10v9H7z" fill="#fefae0"/>',''), el('span',{},item.t));
      b.addEventListener('click', function(){ onToggle(item.v); });
      box.append(b);
    });
    fs.append(box);
    wrap.append(fs);
  });
  return wrap;
}
