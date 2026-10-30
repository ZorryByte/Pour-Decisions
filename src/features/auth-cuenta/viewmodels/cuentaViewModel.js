import {motivosReaccion, afinidadReacciones} from '../domain/reacciones.js';

const empty = () => ({preferences:{}, favorites:[], reactions:[], avatar:null});

// Sesión, carga y acciones de cuenta. Los avisos permiten a la Vista usar
// sus mismos puntos de renderizado, sin redibujar por cada mutación de datos.
export function createCuentaViewModel({loadAccount, readSession, writeSession, normalizePreferences, hasDrink,
  requestCode, verifyCode, endSession,
  readPending = () => null, writePending = () => {}, persistRecipe, persistPreferences, currentChoices = () => ({}), identify, currentIdentity,
  persistAvatar, removeAvatar, readGuest = () => null, writeGuest = () => {}, persistReaction, removeReaction, findDrink,
  getCatalog, allows, removeRecipe, readAccess = () => null, writeAccess = () => {}, now = Date.now}) {
  const state = {session:null, data:empty(), loading:false, loaded:false, error:'', busy:false, notice:'', email:'', codeSent:false, codeSentAt:0, pending:null, guest:{}};
  const listeners = new Set();
  let generation = 0;
  let profileExists = false;
  function notify(event){ listeners.forEach(listener => listener(event)); }
  function restoreSession(){
    const stored = readSession();
    state.session = stored?.access_token && stored?.refresh_token && stored?.user?.id ? stored : null;
  }
  function restoreAccess(){
    if (state.session) return;
    const draft = readAccess();
    if (draft && validEmail(draft.email) && Number.isFinite(draft.sentAt) && now() >= draft.sentAt && now() - draft.sentAt < 3600000){
      state.email = draft.email; state.codeSentAt = draft.sentAt; state.codeSent = true;
    } else writeAccess(null);
  }
  function validEmail(email){ return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  function resendWait(){ return state.codeSent ? Math.max(0, Math.ceil((state.codeSentAt + 60000 - now()) / 1000)) : 0; }
  async function sendCode(){
    await requestCode(state.email);
    state.codeSent = true; state.codeSentAt = now();
    writeAccess({email:state.email, sentAt:state.codeSentAt});
  }
  function resetData(){ state.data = empty(); state.loaded = false; }
  function errorText(error){
    if (error.status === 429) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
    if (error.code === 'email_address_invalid') return 'Revisa tu correo e inténtalo de nuevo.';
    if (error.code === 'signup_disabled') return 'El registro de cuentas está deshabilitado. Inténtalo más tarde.';
    if (error.code === 'email_provider_disabled') return 'El acceso por correo no está disponible. Inténtalo más tarde.';
    if (error.code === 'otp_expired' || error.code === 'otp_disabled' || error.status === 422) return 'El código no es válido o ha caducado. Revísalo o solicita uno nuevo.';
    if (error.status === 401 || error.status === 403) return 'Tu acceso caducó. Vuelve a entrar; tu cóctel sigue aquí.';
    if (error.code === '42P01' || error.code === 'PGRST205') return 'El perfil todavía no está disponible. Puedes seguir descubriendo cócteles.';
    return 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.';
  }
  async function load(){
    if (!state.session) return;
    state.loading = true; state.loaded = false;
    const run = generation;
    notify('load-start');
    try {
      const results = await loadAccount();
      if (run !== generation) return;
      const failed = results.find(r => r.status === 'rejected');
      if (failed) throw failed.reason;
      profileExists = results[0].value.length > 0;
      state.data = {
        preferences:normalizePreferences(results[0].value[0]?.preferencias),
        favorites:results[1].value.filter(r => hasDrink(r.coctel)),
        reactions:results[2].value.filter(r => hasDrink(r.coctel)),
        avatar:results[3].value.find(r => hasDrink(r.coctel) && results[1].value.some(f => f.coctel === r.coctel)) || null
      };
      state.loaded = true;
    } catch (error) {
      // Una petición anterior no puede publicar errores en otra sesión.
      if (run === generation) state.error = errorText(error);
    } finally {
      if (run === generation){ state.loading = false; notify('load-end'); }
    }
  }
  function clearSession(){
    generation++; state.session = null; resetData(); state.loading = false; writeSession(null);
  }
  // Las acciones comparten bloqueo y avisos en los mismos puntos de renderizado.
  async function runAction(task, success){
    if (state.busy) return false;
    state.busy = true; state.error = ''; state.notice = '';
    notify('action-start');
    try { await task(); state.notice = success || ''; return true; }
    catch (error){ state.error = errorText(error); return false; }
    finally { state.busy = false; notify('action-end'); }
  }
  function reactionFor(coctel){ return state.session ? state.data.reactions.find(r => r.coctel === coctel) : state.guest[coctel]; }
  function restoreGuest(){
    state.guest = {};
    const stored = readGuest();
    if (!stored || typeof stored !== 'object') return;
    Object.entries(stored).forEach(([name,r]) => {
      if (hasDrink(name) && r && ['like','dislike',null].includes(r.reaccion)) state.guest[name] = {
        coctel:name, reaccion:r.reaccion, motivo:motivosReaccion[r.motivo] ? r.motivo : null, probado_gusto:r.probado_gusto === true
      };
    });
  }
  function clearGuestReactions(){ state.guest = {}; writeGuest(null); }
  async function react(coctel, fields){
    if (state.busy || !hasDrink(coctel)) return false;
    const previous = reactionFor(coctel) || {coctel, reaccion:null, motivo:null, probado_gusto:false};
    const next = {...previous, ...fields};
    if (next.reaccion !== 'dislike') next.motivo = null;
    if (!state.session){
      state.guest[coctel] = next; writeGuest(state.guest); return true;
    }
    return runAction(async () => {
      await persistReaction(next);
      state.data.reactions = [...state.data.reactions.filter(r => r.coctel !== coctel), next];
    });
  }
  async function importGuestReactions(){
    for (const r of Object.values(state.guest)){
      await persistReaction(r);
      state.data.reactions = [...state.data.reactions.filter(old => old.coctel !== r.coctel), r];
    }
    clearGuestReactions();
  }
  function keepGuestReactions(){
    if (!state.session) return false;
    return runAction(importGuestReactions, 'Reacciones guardadas.');
  }
  function forgetReaction(coctel){
    if (!state.session || !hasDrink(coctel)) return false;
    return runAction(async () => {
      await removeReaction(coctel);
      state.data.reactions = state.data.reactions.filter(r => r.coctel !== coctel);
    }, 'Reacción retirada.');
  }
  function boost(coctel){
    return afinidadReacciones(coctel, state.session ? state.data.reactions : Object.values(state.guest), findDrink);
  }
  function getPreferences(){ return normalizePreferences(state.data.preferences); }
  function suggestions(){
    const prefs = getPreferences();
    const saved = new Set(state.data.favorites.map(f => f.coctel));
    return getCatalog().filter(c => !saved.has(c.n) && reactionFor(c.n)?.reaccion !== 'dislike' && allows(c, prefs))
      .map(c => {
        const matches = [...c.a.filter(v => prefs.alcohol.includes(v)), ...c.f.filter(v => prefs.fruta.includes(v)), ...c.s.filter(v => prefs.sabor.includes(v))];
        return {coctel:c.n, score:matches.length + boost(c), reason:matches.length ? 'Comparte tus gustos: ' + matches.join(', ') + '.' : 'Una receta diferente para explorar; todavía estamos conociendo tus gustos.'};
      }).sort((a,b) => b.score - a.score || a.coctel.localeCompare(b.coctel, 'es')).slice(0, 6);
  }
  function savePreferences(values){
    if (state.busy || !state.session) return false;
    const next = normalizePreferences(values);
    return runAction(async () => {
      await persistPreferences(next); state.data.preferences = next;
    }, 'Tus gustos se actualizaron. Por descubrir ya usa estas preferencias.');
  }
  function restorePending(){
    state.pending = null;
    const draft = readPending();
    if (!draft || !hasDrink(draft.coctel)) return;
    const choices = normalizePreferences(draft.elecciones);
    const identity = identify(choices, draft.elecciones?._personalidad);
    state.pending = {coctel:draft.coctel, elecciones:{...choices, _personalidad:identity.id}, favorite:draft.favorite === true};
  }
  function savedIdentity(entry){
    return identify(normalizePreferences(entry.elecciones), entry.elecciones?._personalidad);
  }
  function avatarIdentity(){ return state.data.avatar ? identify({},state.data.avatar.personalidad) : null; }
  async function chooseFavorite(entry){
    const identity = savedIdentity(entry);
    await persistAvatar(entry.coctel, identity.id);
    state.data.avatar = {coctel:entry.coctel, personalidad:identity.id};
  }
  async function toggleFavorite(coctel){
    const entry = state.data.favorites.find(f => f.coctel === coctel);
    if (state.busy || !state.session || !entry) return false;
    const chosen = state.data.avatar?.coctel === coctel;
    return runAction(async () => {
      if (chosen){ await removeAvatar(coctel); state.data.avatar = null; }
      else await chooseFavorite(entry);
    }, chosen ? 'Puedes elegir otro favorito para tu avatar.' : 'Tu favorito ya le da cara a tu perfil.');
  }
  function removeSavedRecipe(coctel){
    if (state.busy || !state.session || !state.data.favorites.some(f => f.coctel === coctel)) return false;
    return runAction(async () => {
      await removeRecipe(coctel);
      state.data.favorites = state.data.favorites.filter(f => f.coctel !== coctel);
      if (state.data.avatar?.coctel === coctel) state.data.avatar = null;
    }, 'Receta retirada de tu colección.');
  }
  function setPending(coctel, favorite, fromProfile){
    const saved = state.session && state.data.favorites.find(f => f.coctel === coctel);
    const choices = fromProfile && state.session ? normalizePreferences(state.data.preferences) : currentChoices();
    const identity = saved ? savedIdentity(saved)
      : fromProfile ? identify(choices) : currentIdentity();
    state.pending = {coctel, elecciones:{...choices, _personalidad:identity.id}, favorite};
    writePending(state.pending);
  }
  async function savePending(){
    if (!state.pending || !hasDrink(state.pending.coctel)) return;
    const item = state.pending;
    if (!state.loaded){ await load(); if (!state.loaded) throw new Error('profile_load'); }
    if (!state.data.favorites.some(f => f.coctel === item.coctel)){
      await persistRecipe(item.coctel, item.elecciones);
      state.data.favorites.unshift({...item, creado_at:new Date().toISOString()});
    }
    if (!Object.values(state.data.preferences).some(v => v.length)){
      await persistPreferences(item.elecciones);
      state.data.preferences = normalizePreferences(item.elecciones);
    }
    if (item.favorite) await chooseFavorite(state.data.favorites.find(f => f.coctel === item.coctel));
    state.pending = null; writePending(null);
  }
  async function saveRecipe(coctel, {favorite = false, fromProfile = false} = {}){
    if (state.busy || !hasDrink(coctel)) return false;
    setPending(coctel, favorite, fromProfile);
    if (!state.session){ notify('access-required'); return false; }
    return runAction(savePending, favorite ? 'Tu favorito ya le da cara a tu perfil.' : 'Cóctel guardado en tu colección.');
  }
  async function submitAccess(email, code){
    if (state.busy) return false;
    if (!state.codeSent){
      state.email = String(email || '').trim().toLowerCase();
      if (!validEmail(state.email)){ state.error = 'Escribe un correo válido, por ejemplo nombre@correo.com.'; notify('access-reset'); return false; }
      return runAction(sendCode);
    }
    const token = String(code || '').replace(/\s/g, '');
    if (!/^[0-9]{6,10}$/.test(token)){ state.error = 'Escribe el código de 6 a 10 dígitos que recibiste por correo.'; notify('access-reset'); return false; }
    return runAction(async () => {
      await verifyCode(state.email, token);
      writeAccess(null);
      generation++; state.codeSent = false; await load();
      if (!state.loaded) throw new Error('profile_load');
      if (!state.pending && !profileExists){
        const initial = normalizePreferences(currentChoices());
        await persistPreferences(initial);
        state.data.preferences = initial; profileExists = true;
      }
      // Los guardados pendientes solo se procesan tras acceso explícito y carga.
      await importGuestReactions();
      await savePending();
    }, 'Tu colección está lista.');
  }
  function resendCode(){
    if (state.busy || !state.codeSent || resendWait()) return false;
    return runAction(sendCode, 'Te enviamos un nuevo código. Usa el más reciente.');
  }
  async function logout(){
    const ok = await runAction(async () => {
      await endSession(); clearSession(); clearGuestReactions();
      state.email = ''; state.codeSent = false;
    });
    if (ok){ state.notice = 'Sesión cerrada.'; notify('logout-end'); }
    return ok;
  }
  return {
    state, load, errorText, restoreSession, restoreAccess, resendCode, resendWait,
    runAction, submitAccess, logout, restorePending, saveRecipe, removeSavedRecipe, toggleFavorite, savedIdentity, avatarIdentity,
    reactionFor, react, restoreGuest, keepGuestReactions, forgetReaction,
    getPreferences, savePreferences, suggestions, boost,
    reactionHistory:() => state.data.reactions.filter(r => r.reaccion || r.probado_gusto),
    retryPending(){ return runAction(savePending, 'Cóctel guardado.'); },
    discardPending(){
      if (state.busy) return;
      state.pending = null; writePending(null); notify('pending-discarded');
    },
    changeEmail(){
      if (state.busy) return;
      state.codeSent = false; state.error = ''; state.notice = ''; state.codeSentAt = 0; writeAccess(null); notify('access-reset');
    },
    subscribe(listener){ listeners.add(listener); return () => listeners.delete(listener); },
    getSession:() => state.session,
    saveSession(next){ state.session = next; writeSession(next); },
    sessionVerified(){ generation++; },
    expireSession(){
      state.session = null; resetData(); writeSession(null); notify('session-expired');
    },
    clearSession,
    reloadSession(){
      generation++; state.session = null; resetData(); state.loading = false;
      restoreSession(); notify('session-changed');
    },
  };
}

