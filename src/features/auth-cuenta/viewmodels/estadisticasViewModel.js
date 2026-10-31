// Carga independiente: un fallo de estadísticas no bloquea la colección.
export function createEstadisticasViewModel({accountId, load, save, readPending, writePending, notify = () => {}}){
  const state = {entries:[], loading:false, loaded:false, error:'', saving:false};
  let owner = null, generation = 0, task = null;
  function sync(){
    const next = accountId();
    if (next === owner) return;
    owner = next; generation++; task = null;
    Object.assign(state, {entries:[], loading:false, loaded:false, error:'', saving:false});
  }
  async function flush(){
    sync();
    if (!owner) return;
    if (task) return task;
    if (!readPending(owner).length) return;
    const user = owner, run = generation;
    state.saving = true;
    task = (async () => {
      try {
        while (readPending(user).length){
          const entry = readPending(user)[0];
          await save(entry);
          if (run !== generation) return;
          if (writePending(user, readPending(user).filter(row => row.id !== entry.id)) === false) throw new Error('storage');
          if (state.loaded && !state.entries.some(row => row.id === entry.id)) state.entries.unshift(entry);
        }
        if (run === generation) state.error = '';
      } catch (_) {
        if (run === generation) state.error = 'No pudimos guardar tus últimas elecciones. Revisa tu conexión y vuelve a intentar.';
      } finally {
        if (run === generation){ task = null; state.saving = false; notify(); }
      }
    })();
    return task;
  }
  function record(entry){
    sync();
    if (!owner) return;
    const rows = readPending(owner);
    if (!rows.some(row => row.id === entry.id) && writePending(owner, [...rows, entry]) === false){
      state.error = 'No pudimos conservar tus elecciones en este navegador. Revisa el almacenamiento e inténtalo de nuevo.';
      notify(); return;
    }
    return flush();
  }
  async function refresh(){
    sync();
    if (!owner || state.loading) return;
    const run = generation;
    state.loading = true; state.error = ''; notify();
    await flush();
    try {
      const rows = await load();
      if (run !== generation) return;
      state.entries = rows; state.loaded = true;
    } catch (_) {
      if (run === generation) state.error = 'No pudimos cargar tus estadísticas. Revisa tu conexión y vuelve a intentar.';
    } finally {
      if (run === generation){ state.loading = false; notify(); }
    }
  }
  return {state, sync, record, refresh};
}
