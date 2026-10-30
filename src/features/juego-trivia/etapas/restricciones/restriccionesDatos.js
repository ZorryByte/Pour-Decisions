// Catálogo compartido por la etapa, las preferencias y el adaptador de envío.
export const PASES = [
  {id:'lacteos', nombre:'Leche y lácteos', detalle:'Leche, crema, yogurt y productos que los contengan.', frase:'Vengo con calma. Sin apuros.', sprite:0},
  {id:'mani', nombre:'Maní / cacahuate', detalle:'Maní, mantequilla de maní y productos que lo contengan.', frase:'Ah… sigo aquí. Casi no se me ve.', sprite:1},
  {id:'frutos secos', nombre:'Frutos secos', detalle:'Almendra, nuez, avellana, pistacho y otros frutos secos.', frase:'Mi foto del pase salió bastante bien, ¿no?', sprite:2},
  {id:'huevo', nombre:'Huevo', detalle:'Huevo y clara, también en espumas y mezclas preparadas.', frase:'Con cuidado, que me pongo nervioso.', sprite:3},
  {id:'gluten', nombre:'Gluten y trigo', detalle:'Puedes distinguir evitar gluten de una alergia al trigo.', frase:'El pase primero. Las reglas son reglas.', sprite:4},
  {id:'soja', nombre:'Soja / soya', detalle:'Soja y productos que la contengan, incluidas algunas bebidas vegetales.', frase:'Prefiero no llamar mucho la atención.', sprite:5},
  {id:'sesamo', nombre:'Sésamo / ajonjolí', detalle:'Semillas, tahini y productos que los contengan.', frase:'¿Desde ahí sí alcanzas a verme?', sprite:6},
  {id:'sulfitos', nombre:'Sulfitos', detalle:'Pueden aparecer en vinos y otros productos. Hay que revisar su etiqueta.', frase:'Mis detalles están en la letra pequeña.', sprite:7},
  {id:'citricos', nombre:'Cítricos', detalle:'Limón, lima, naranja, toronja y productos que los contengan.', frase:'Sí, esta es mi cara de buenos días.', sprite:8},
];

export const MOTIVOS = {
  alergia:'Tengo alergia', salud:'Intolerancia / debo evitarlo por salud', gusto:'No me gusta',
  lactosa:'Intolerancia a la lactosa', trigo:'Alergia al trigo', gluten:'Debo evitar el gluten',
};

export function motivosPara(id){
  if (id === 'lacteos') return ['alergia','lactosa','salud','gusto'];
  if (id === 'gluten') return ['gluten','trigo','gusto'];
  if (id === 'sulfitos') return ['salud','gusto'];
  return ['alergia','salud','gusto'];
}

export const OPCIONES_RESTRICCIONES = [
  {v:'ninguna',t:'Ninguna'}, ...PASES.map(p => ({v:p.id,t:p.nombre})), {v:'otra',t:'Otra'},
];

export function etiquetaRestriccion(id){
  return PASES.find(p => p.id === id)?.nombre || (id === 'otra' ? 'Otra restricción' : id === 'ninguna' ? 'Ninguna' : id);
}
