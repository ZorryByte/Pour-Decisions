import {chocaConRestricciones} from './restricciones.js';

// Reglas originales: entradas explícitas, sin estado global ni dependencias de la UI.
export function hitsOf(c, sel){
  return [
    ...c.a.filter(x => sel.alcohol.has(x)),
    ...c.f.filter(x => sel.fruta.has(x)),
    ...c.s.filter(x => sel.sabor.has(x))
  ];
}

function matchesAlcohol(c, sel){
  if (!sel.alcohol.size) return true;
  return c.a.some(a => sel.alcohol.has(a));
}

function matchesFruit(c, sel, fruitAny){
  if (fruitAny || !sel.fruta.size) return true;
  return c.f.some(f => sel.fruta.has(f));
}

function matchesSabor(c, sel){
  if (!sel.sabor.size) return true;
  return c.s.some(s => sel.sabor.has(s));
}

export function eligible(c, sel, fruitAny){
  return matchesAlcohol(c, sel) && matchesFruit(c, sel, fruitAny) && matchesSabor(c, sel);
}

export function score(c, sel, fruitAny){
  if (!eligible(c, sel, fruitAny)) return -1;
  let pts = 0;
  let max = 0;
  if (sel.alcohol.size){
    max += 45;
    const hit = c.a.filter(x => sel.alcohol.has(x)).length;
    pts += 45 * (hit / sel.alcohol.size);
    const miss = [...sel.alcohol].filter(x => !c.a.includes(x)).length;
    pts -= Math.min(20, miss * 6);
  }
  if (sel.fruta.size && !fruitAny){
    max += 35;
    const hit = c.f.filter(x => sel.fruta.has(x)).length;
    pts += 35 * (hit / sel.fruta.size);
  } else if (fruitAny){
    max += 12;
    pts += 12;
  }
  if (sel.sabor.size){
    max += 25;
    const hit = c.s.filter(x => sel.sabor.has(x)).length;
    pts += 25 * (hit / sel.sabor.size);
  }
  return max ? Math.max(0, pts / max) : 0;
}

export function scoreLoose(c, sel, fruitAny){
  let pts = 0;
  if (sel.alcohol.size && c.a.some(a => sel.alcohol.has(a))) pts += 4;
  else if (sel.alcohol.size) return 0;
  if (fruitAny || !sel.fruta.size || c.f.some(f => sel.fruta.has(f))) pts += 2;
  else return pts * 0.3;
  if (!sel.sabor.size || c.s.some(s => sel.sabor.has(s))) pts += 1;
  return pts;
}

export function fuerzaDe(c){
  if ((c.a || []).includes('Sin alcohol')) return 'suave';
  const n = c.n.toLowerCase();
  if (/negroni|old fashioned|martini|manhattan|carajillo|rusty|godfather|whisky sour|sidecar/.test(n)) return 'fuerte';
  if ((c.a || []).includes('Whisky') || (c.a || []).includes('Brandy')) return 'fuerte';
  if ((c.s || []).includes('Suave') && !(c.s || []).includes('Ácido')) return 'suave';
  return 'medio';
}

export function fuerzaAjuste(c, sel){
  const want = [...sel.fuerza][0];
  if (!want) return 0;
  const got = fuerzaDe(c);
  const w = want.toLowerCase();
  if (w === got) return 0.12;
  if ((w === 'suave' && got === 'fuerte') || (w === 'fuerte' && got === 'suave')) return -0.2;
  return 0;
}

export function planPunto(c, sel){
  const plan = [...sel.plan][0];
  if (!plan) return 0;
  const n = c.n.toLowerCase();
  if (plan === 'playa' && ((c.f || []).includes('Piña') || (c.f || []).includes('Coco') || (c.f || []).includes('Mango'))) return 1;
  if (plan === 'fiesta' && ((c.s || []).includes('Dulce') || (c.s || []).includes('Refrescante'))) return 1;
  if (plan === 'cena' && ((c.s || []).includes('Suave') || /negroni|old fashioned|martini/.test(n))) return 1;
  if (plan === 'aventura' && ((c.f || []).includes('Maracuyá') || (c.s || []).includes('Ácido'))) return 1;
  return 0;
}

export function ranked(C, sel, fruitAny, boost = () => 0){
  const base = C.filter(c => !chocaConRestricciones(c, sel.alergia));
  const order = (a, b) => {
    const ds = (b.s + fuerzaAjuste(b.c, sel) + boost(b.c)) - (a.s + fuerzaAjuste(a.c, sel) + boost(a.c));
    if (Math.abs(ds) > 1e-9) return ds;
    const dh = hitsOf(b.c, sel).length - hitsOf(a.c, sel).length;
    if (dh) return dh;
    const dp = planPunto(b.c, sel) - planPunto(a.c, sel);
    if (dp) return dp;
    return a.c.n.localeCompare(b.c.n, 'es');
  };
  const good = base.filter(c => eligible(c, sel, fruitAny)).map(c => ({c, s: score(c, sel, fruitAny)}));
  if (good.length){
    good.sort(order);
    return good.map(x => x.c);
  }
  const loose = base.map(c => ({c, s: scoreLoose(c, sel, fruitAny)})).filter(x => x.s > 0);
  loose.sort(order);
  return loose.map(x => x.c);
}

const LOOSE_MAX = 7;

export function matchPercent(c, sel, fruitAny){
  if (eligible(c, sel, fruitAny)) return Math.round(score(c, sel, fruitAny) * 100);
  const loose = scoreLoose(c, sel, fruitAny);
  if (!loose) return 0;
  return Math.min(54, Math.round((loose / LOOSE_MAX) * 54));
}

