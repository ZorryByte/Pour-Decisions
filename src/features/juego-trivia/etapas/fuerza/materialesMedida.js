// Reflejos y cepillado discretos: el mismo material del vaso original.
export function refinarMateriales({id,bottle,jigger,glass}){
  const ns='http://www.w3.org/2000/svg';
  const svg=jigger.querySelector('svg');
  svg.querySelector('defs').insertAdjacentHTML('beforeend',
    '<linearGradient id="'+id+'-metal"><stop stop-color="#fefae0" stop-opacity=".24"/><stop offset=".16" stop-color="#fefae0" stop-opacity=".08"/><stop offset=".48" stop-color="#fefae0" stop-opacity=".035"/><stop offset=".76" stop-color="#fefae0" stop-opacity=".08"/><stop offset="1" stop-color="#fefae0" stop-opacity=".2"/></linearGradient><pattern id="'+id+'-brush" width="7" height="11" patternUnits="userSpaceOnUse"><path d="M1 0v11M4 3v6M6 0v4" stroke="#fefae0" stroke-width=".45" stroke-opacity=".075"/></pattern>');
  const body=svg.querySelector(':scope > path');
  body.setAttribute('fill','url(#'+id+'-metal)');body.setAttribute('stroke-opacity','.62');body.setAttribute('stroke-width','1');
  const brushed=body.cloneNode();brushed.setAttribute('fill','url(#'+id+'-brush)');brushed.removeAttribute('stroke');body.after(brushed);
  const foot=svg.querySelectorAll(':scope > path')[2];
  if(foot)foot.setAttribute('fill','url(#'+id+'-metal)');
  const bottleArt=bottle.querySelector('.measure-bottle-art');
  const reflection=document.createElementNS(ns,'path');
  reflection.setAttribute('d','M54 35v30M34 101l-2 75M37 114l-1 39M86 171l1 20M40 194q20 5 39 0');
  reflection.setAttribute('stroke','#fefae0');reflection.setAttribute('stroke-opacity','.14');reflection.setAttribute('stroke-width','.6');reflection.setAttribute('fill','none');
  bottleArt.append(reflection);
  const wear=document.createElementNS(ns,'path');
  wear.setAttribute('d','M49 72l-1 9M47 103l-1 14M112 116l1 12M51 153l-1 6');
  wear.setAttribute('fill','none');wear.setAttribute('stroke','#fefae0');wear.setAttribute('stroke-width','.6');wear.setAttribute('stroke-opacity','.12');
  glass.append(wear);
}
