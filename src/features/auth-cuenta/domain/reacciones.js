export const motivosReaccion = {dulzor:'El dulzor', textura:'La textura', intensidad:'La intensidad', ingredientes:'Los ingredientes', otra:'Quiero otra propuesta'};

// Misma afinidad del perfil original; no consulta red ni modifica recetas.
export function afinidadReacciones(coctel, reactions, findDrink){
  const reaction = reactions.find(r => r.coctel === coctel.n);
  if (reaction?.reaccion === 'dislike') return -2;
  if (reaction?.probado_gusto) return .16;
  if (reaction?.reaccion === 'like') return .08;
  // Rechazar una receta nunca rechaza todos sus ingredientes.
  return reactions.reduce((best, r) => {
    const source = findDrink(r.coctel);
    if (!source || (r.reaccion !== 'like' && !r.probado_gusto)) return best;
    const overlap = coctel.f.filter(v => source.f.includes(v)).length + coctel.s.filter(v => source.s.includes(v)).length;
    const total = new Set([...coctel.f, ...source.f]).size + new Set([...coctel.s, ...source.s]).size;
    return Math.max(best, (r.probado_gusto ? .06 : .03) * overlap / Math.max(total, 1));
  }, 0);
}
