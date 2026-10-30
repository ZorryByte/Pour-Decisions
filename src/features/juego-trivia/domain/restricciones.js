// Reglas existentes de la carta: sin estado de partida ni dependencias de la UI.
function drinkText(c){
  return [c.n, ...(c.f || []), ...(c.i || []), c.d || ''].join(' ').toLowerCase();
}

export function chocaConRestricciones(c, exclusions){
  if (!exclusions.size) return false;
  // Una restricción sin identificar no permite afirmar compatibilidad.
  if (exclusions.has('otra')) return true;
  const t = drinkText(c);
  if (exclusions.has('lacteos')){
    if (/leche|yogurt|yogur|nata/.test(t)) return true;
    if (/crema/.test(t.replace(/crema de coco/g, ''))) return true;
  }
  if (exclusions.has('frutos secos') && /amaretto|almendra|nuez|avellana|pistacho/.test(t)) return true;
  if (exclusions.has('citricos') && ((c.f || []).some(f => f === 'Limón' || f === 'Naranja') || /lim[oó]n|naranja|toronja|lima|curacao|curaçao|triple sec|cointreau/.test(t))) return true;
  if (exclusions.has('gluten') && /cerveza|trigo/.test(t)) return true;
  // Nuevos pases: se filtran ingredientes reales, no etiquetas de afinidad (c.f).
  const ingredientes = [c.n, ...(c.i || []), c.d || ''].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (exclusions.has('lactosa') && /leche|yogur|nata|crema(?! de coco)/.test(ingredientes)) return true;
  if (exclusions.has('mani') && /\bmani\b|cacahuate|cacahuete|peanut/.test(ingredientes)) return true;
  if (exclusions.has('huevo') && /huevo|\bclara\b|albumina|\begg\b/.test(ingredientes)) return true;
  if (exclusions.has('soja') && /soja|soya|\bsoy\b|tofu/.test(ingredientes)) return true;
  if (exclusions.has('sesamo') && /sesamo|ajonjoli|tahin/.test(ingredientes)) return true;
  if (exclusions.has('trigo') && /trigo|\bwheat\b|cerveza/.test(ingredientes)) return true;
  if (exclusions.has('gluten') && /cebada|centeno|malta|avena/.test(ingredientes)) return true;
  // Estas familias requieren revisar la marca; el MVP las excluye por precaución.
  if (exclusions.has('sulfitos') && /sulfito|dioxido de azufre|\bvino\b|vermut|vermouth|champan|champagne|prosecco|\bcava\b|\bsidra\b/.test(ingredientes)) return true;
  return false;
}
