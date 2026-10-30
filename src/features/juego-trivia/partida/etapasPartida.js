import {OPCIONES_RESTRICCIONES} from '../etapas/restricciones/restriccionesDatos.js';
import {ORDEN_ETAPAS} from './recorridoPartida.js';

const definiciones = [
  {k:'alcohol', label:'Alcohol', className:'step-0', q:'¿Cuál es tu alcohol favorito?', h:'Puedes marcar varios.', multi:true, req:true, groups:[
    {t:'Claros', o:['Ron','Vodka','Ginebra']},
    {t:'Oscuros', o:['Tequila','Whisky','Brandy']},
    {t:'Sin alcohol', o:['Sin alcohol']}
  ]},
  {k:'fruta', label:'Fruta', className:'step-1', q:'¿Cuáles son tus frutas favoritas?', h:'Si te da igual, sigue.', multi:true, req:false, groups:[
    {t:'', o:[{v:'cualquiera', t:'La que sea'}]},
    {t:'Cítricos', o:['Limón','Naranja']},
    {t:'Tropicales', o:['Piña','Mango','Maracuyá','Coco']},
    {t:'Frescas', o:['Fresa','Sandía','Durazno','Menta']}
  ]},
  {k:'sabor', label:'Estilo', className:'step-2', q:'¿Cómo te gusta un trago?', h:'Elige uno.', multi:false, req:true, groups:[
    {t:'', o:['Dulce','Ácido','Cremoso','Refrescante','Suave','Espumoso','Granizado','Sedoso']}
  ]},
  {k:'fuerza', label:'Intensidad', className:'step-3', q:'¿Qué tan fuerte lo quieres?', h:'Elige uno.', multi:false, req:true, groups:[
    {t:'', o:['Suave','Medio','Fuerte']}
  ]},
  {k:'alergia', label:'Alergia', className:'step-4', q:'¿Hay algo que no puedas tomar?', h:'Deja fuera lo que necesitas evitar.', multi:true, req:true, groups:[
    {t:'', o:[...OPCIONES_RESTRICCIONES, {v:'lactosa',t:'Lactosa'}, {v:'trigo',t:'Trigo'}]}
  ]},
  {k:'plan', label:'Preguntas', className:'step-5', q:'¿Tu plan ideal de sábado?', h:'Esto desempatará tu trago.', multi:false, req:true, groups:[
    {t:'', o:[
      {v:'fiesta', t:'Fiesta hasta tarde'},
      {v:'playa', t:'Tarde de playa'},
      {v:'cena', t:'Cena tranquila'},
      {v:'aventura', t:'Aventura improvisada'}
    ]}
  ]}
];

const porClave = Object.fromEntries(definiciones.map(stage => [stage.k, stage]));
export const etapasPartida = ORDEN_ETAPAS.map(key => porClave[key]);
