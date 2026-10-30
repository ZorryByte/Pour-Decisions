// Cálculos visuales originales: sin DOM, animaciones ni estado de partida.
const PAL = {
  amber:[221,161,94],
  deep:[188,108,37],
  cream:[254,250,224],
  olive:[96,108,56],
  ground:[40,54,24],
  soft:[216,212,188]
};
function mix(a, b, t){
  return a.map(function(v, i){ return Math.round(v + (b[i] - v) * t); });
}
export function hex(rgb){
  return '#' + rgb.map(function(v){
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  }).join('');
}
function average(list){
  if (!list.length) return PAL.amber.slice();
  const s = [0, 0, 0];
  list.forEach(function(c){ s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; });
  return s.map(function(v){ return Math.round(v / list.length); });
}
export const ALC = {
  'Ron': PAL.amber,
  'Vodka': PAL.cream,
  'Ginebra': PAL.soft,
  'Tequila': mix(PAL.amber, PAL.deep, 0.45),
  'Whisky': PAL.deep,
  'Brandy': mix(PAL.deep, PAL.ground, 0.35),
  'Sin alcohol': mix(PAL.cream, PAL.olive, 0.35)
};
export const FR = {
  'Limón': [220, 194, 52],
  'Naranja': [218, 126, 38],
  'Piña': [232, 178, 46],
  'Mango': [228, 130, 36],
  'Maracuyá': [194, 102, 34],
  'Coco': [226, 218, 170],
  'Fresa': [182, 70, 66],
  'Sandía': [194, 77, 86],
  'Durazno': [226, 143, 90],
  'Menta': [88, 139, 79]
};
export function liquidColor(sel){
  const alcs = [...sel.alcohol].map(function(a){ return ALC[a]; }).filter(Boolean);
  let rgb = average(alcs.length ? alcs : [mix(PAL.cream, PAL.olive, 0.2)]);
  const frs = [...sel.fruta].map(function(f){ return FR[f]; }).filter(Boolean);
  // La fruta debe ser el cambio visual dominante en la etapa de ingredientes.
  if (frs.length) rgb = mix(rgb, average(frs), 0.78);
  const fuerza = [...sel.fuerza][0];
  if (fuerza === 'Suave') rgb = mix(rgb, PAL.cream, 0.35);
  if (fuerza === 'Medio') rgb = mix(rgb, PAL.deep, 0.15);
  if (fuerza === 'Fuerte') rgb = mix(rgb, PAL.deep, 0.12);
  return hex(rgb);
}
export function fillLevel(sel, fruitAny, answered){
  let n = 0.08;
  if (sel.alcohol.size) n += 0.34;
  if (fruitAny || sel.fruta.size) n += 0.22;
  if (sel.sabor.size) n += 0.12;
  if (sel.fuerza.size) n += 0.1;
  if (answered) n += 0.08 * answered / 3;
  return Math.min(0.86, n);
}
export function liquidY(sel, fruitAny, answered){
  return Math.round(168 - fillLevel(sel, fruitAny, answered) * 120);
}
export function glassBounds(y, pad){
  const t = Math.max(0, Math.min(1, (y - 28) / 140));
  return {left:50 - 8 * t + pad, right:110 + 8 * t - pad};
}
