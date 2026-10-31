// Una pieza de fruta cortada, encajada en el borde real de cada tipo de copa.
export function garnishMarkup(fruit, kind){
  if (!fruit) return '';
  const rim = {coupe:[128,74], highball:[110,18], rocks:[126,58], mug:[105,34], flute:[98,18], hurricane:[110,22], wine:[106,26]}[kind] || [110,22];
  let shape = '';
  if (fruit === 'Limón' || fruit === 'Naranja'){
    const rind = fruit === 'Limón' ? '#748842' : '#b77537';
    const pulp = fruit === 'Limón' ? '#e5ce72' : '#e6a254';
    shape = `<path d="M-14 1a14 14 0 0 1 28 0Z" fill="${rind}"/><path d="M-12 0a12 12 0 0 1 24 0Z" fill="#fff2ce"/><path d="M-10.5-1a10.5 10.5 0 0 1 21 0Z" fill="${pulp}"/><path d="M0-1v-10M-1-1l-7-7M1-1l7-7" fill="none" stroke="#fff2ce" stroke-width="1.1" stroke-linecap="round"/>`;
  } else if (fruit === 'Piña'){
    shape = '<path d="M-14-7Q0-18 14-7L3 10Q0 13-3 10Z" fill="#aa833e"/><path d="M-12-7Q0-15 12-7L2 8Q0 10-2 8Z" fill="#efd079"/><path d="M-9-6Q0-12 9-6L1 6Q0 8-1 6Z" fill="#f6de98"/><path d="m-7-6 5 7m9-7-5 7M0-10v9" fill="none" stroke="#d5ac55" stroke-width=".8" stroke-linecap="round"/><path d="M-10-7Q0-14 10-7" fill="none" stroke="#687244" stroke-width="1.2" stroke-linecap="round"/>';
  } else if (fruit === 'Mango'){
    shape = '<path d="M-12-11Q15-13 12 11Q-3 9-12-11Z" fill="#b8853b"/><path d="M-10-10Q12-11 10 9Q-2 7-10-10Z" fill="#efba65"/><path d="M-6-8Q7-6 8 5" fill="none" stroke="#f8d991" stroke-width="1.4" stroke-linecap="round"/>';
  } else if (fruit === 'Coco'){
    shape = '<path d="M-14-8Q1 17 14-8Q6 22-8 10Z" fill="#805a3c"/><path d="M-12-7Q1 13 12-7Q5 17-6 8Z" fill="#fff6df"/><path d="M-9-4Q1 10 9-4" fill="none" stroke="#ddcfab" stroke-width="1" stroke-linecap="round"/>';
  } else if (fruit === 'Fresa'){
    shape = '<path d="M0-10C-9-15-16-7-11 1L-2 12Q0 14 2 12L11 1C16-7 9-15 0-10Z" fill="#b94f4b"/><path d="M0-7C-7-11-12-6-8 0L0 10 8 0C12-6 7-11 0-7Z" fill="#edb09a"/><path d="M0-5Q-4-6-4-2L0 6 4-2Q4-6 0-5Z" fill="#fff0d7"/><path d="m-8-4 1 2m14-2-1 2m-10 5 1 2m6-2-1 2" stroke="#f7d080" stroke-width="1" stroke-linecap="round"/>';
  } else if (fruit === 'Sandía'){
    shape = '<path d="M0-14 15 8Q0 18-15 8Z" fill="#617b43"/><path d="M0-12 13 7Q0 15-13 7Z" fill="#d6dba0"/><path d="M0-10 11 6Q0 12-11 6Z" fill="#db7c70"/><path d="m-3 1 .5 1.5M3 1l-.5 1.5M0 6v1.5" stroke="#604432" stroke-width="1.2" stroke-linecap="round"/>';
  } else if (fruit === 'Durazno'){
    shape = '<path d="M-12-10Q14-13 13 9Q-2 14-12-10Z" fill="#cf8058"/><path d="M-10-8Q11-10 11 7Q-1 11-10-8Z" fill="#f1bd80"/><path d="M-4-5Q7-7 6 5Q0 5-4-5Z" fill="#ac7248"/><path d="M-3-6Q6-10 9-2" fill="none" stroke="#f8dba4" stroke-width="1.2" stroke-linecap="round"/>';
  } else if (fruit === 'Maracuyá'){
    shape = '<path d="M-13 0a13 13 0 0 1 26 0Z" fill="#865563"/><path d="M-11-1a11 11 0 0 1 22 0Z" fill="#fff0d1"/><path d="M-9-2a9 9 0 0 1 18 0Z" fill="#e8bb5e"/>' + [[-5,-4],[0,-4],[5,-4],[-3,-8],[3,-8]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx=".8" ry="1.1" fill="#675332"/>`).join('');
  } else if (fruit === 'Menta'){
    shape = '<path d="M-2 8Q-17-7-5-15 10-12-2 8Z" fill="#6c854b"/><path d="M-2 7-5-11m2 14-6-5m6 1 5-5" fill="none" stroke="#cbd5a0" stroke-width=".8" stroke-linecap="round"/>';
  } else return '';
  return `<g class="drink-garnish" data-fruit="${fruit}" transform="translate(${rim[0]} ${rim[1]}) rotate(-18)" aria-hidden="true">${shape}</g>`;
}
