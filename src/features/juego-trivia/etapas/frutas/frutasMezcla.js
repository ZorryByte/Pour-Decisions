import {FR} from '../../vaso/calculosVaso.js';

// Preferencias y preparación son cosas distintas: estas cantidades son solo visuales.
export function createMezclaFrutas(){
  const progreso=new Map(),recipiente=new Map(),coctelera=new Map();
  const colorDe=map=>{
    const total=[...map.values()].reduce((a,b)=>a+b,0);
    if(!total)return 'rgb(221,161,94)';
    const rgb=[0,1,2].map(i=>Math.round([...map].reduce((s,[n,p])=>s+(FR[n]?.[i]??180)*p,0)/total));
    return 'rgb('+rgb.join(',')+')';
  };
  function agregar(name){if(!progreso.has(name))progreso.set(name,0);}
  function quitar(name){progreso.delete(name);recipiente.delete(name);coctelera.delete(name);}
  function machacar(name){
    agregar(name);const anterior=progreso.get(name),nuevo=Math.min(1,anterior+1/3);
    progreso.set(name,nuevo);recipiente.set(name,(recipiente.get(name)||0)+nuevo-anterior);
    return nuevo;
  }
  function verter(){for(const [n,p]of recipiente)coctelera.set(n,(coctelera.get(n)||0)+p);recipiente.clear();}
  return {agregar,quitar,machacar,verter,progreso,recipiente,coctelera,colorRecipiente:()=>colorDe(recipiente),colorCoctelera:()=>colorDe(coctelera),cantidad:()=>[...recipiente.values()].reduce((a,b)=>a+b,0)};
}
