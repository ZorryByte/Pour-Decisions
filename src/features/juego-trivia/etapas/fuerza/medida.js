// La ronda mide licor servido, no alcohol puro ni una receta definitiva.
export const CAPACIDAD_OZ = 2;
export const DURACION_RONDA = 15;
export function intensidadDe(oz){
  return oz < .125 ? null : oz <= .75 + 1e-6 ? 'Suave' : oz <= 1.5 + 1e-6 ? 'Medio' : 'Fuerte';
}
export function onzasDe(intensidad){ return ({Suave:.5, Medio:1, Fuerte:2})[intensidad] || 0; }
export function crearMedida(inicial = 0){
  let jigger = 0, vaso = Math.max(0, Math.min(CAPACIDAD_OZ, inicial));
  const cantidad = n => Number.isFinite(n) ? Math.max(0, n) : 0;
  return {
    get jigger(){ return jigger; }, get vaso(){ return vaso; },
    llenar(oz){ const n = Math.min(cantidad(oz), CAPACIDAD_OZ - jigger); jigger += n; return n; },
    verter(oz){ const n = Math.min(cantidad(oz), jigger, CAPACIDAD_OZ - vaso); jigger -= n; vaso += n; return n; },
    descartar(oz){ const n = Math.min(cantidad(oz), jigger); jigger -= n; return n; },
    descartarVaso(oz){ const n = Math.min(cantidad(oz), vaso); vaso -= n; return n; },
    vaciarVaso(){ const n = vaso; vaso = 0; return n; },
    reiniciar(){ jigger = 0; vaso = 0; },
    intensidad(){ return intensidadDe(vaso); },
  };
}
