// Cada resultado cuenta una vez; seleccionar varias frutas cuenta una vez por fruta.
export function resumirElecciones(entries, keys){
  return Object.fromEntries(keys.map(key => {
    const counts = new Map();
    entries.forEach(entry => {
      const values = Array.isArray(entry.elecciones?.[key]) ? entry.elecciones[key] : [];
      new Set(values.filter(value => typeof value === 'string')).forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
    });
    return [key, [...counts].map(([value, count]) => ({value, count, percentage:Math.round(count / entries.length * 100)}))
      .sort((a,b) => b.count - a.count || a.value.localeCompare(b.value, 'es'))];
  }));
}
