export const clavesPreferencias = ['alcohol','fruta','sabor','fuerza','alergia','plan'];

// Normalización original del perfil. Conserva sus opciones y reglas, que no
// son las mismas que las restricciones de selección de cada etapa del juego.
export function normalizarPreferencias(raw, steps){
  const out = {};
  clavesPreferencias.forEach(key => {
    const step = steps.find(s => s.k === key);
    const allowed = step.groups.flatMap(g => g.o.map(o => typeof o === 'string' ? o : o.v)).filter(v => v !== 'cualquiera');
    out[key] = Array.isArray(raw?.[key]) ? [...new Set(raw[key].filter(v => allowed.includes(v)))] : [];
    if (key === 'fuerza' || key === 'plan') out[key] = out[key].slice(0, 1);
    if (key === 'alergia' && out[key].some(v => v !== 'ninguna')) out[key] = out[key].filter(v => v !== 'ninguna');
  });
  return out;
}
