// Transporte de cuenta. No conoce pantallas, elementos DOM ni animaciones.
import {supabaseHeaders} from '../../../shared/infrastructure/supabaseHeaders.js';
// La sesión se recibe mediante adaptadores para mantener una sola fuente de estado
// hasta extraer el ViewModel en un cambio independiente.
export function createCuentaModel({url, key, getSession, saveSession, onSessionExpired, fetcher = (...args) => globalThis.fetch(...args)}) {
  let refreshTask = null;
  function configured(){ return !!url.trim() && !!key.trim(); }
  async function request(path, options = {}, token){
    if (!configured()) throw Object.assign(new Error('unconfigured'), {code:'PGRST205'});
    const response = await fetcher(url.trim().replace(/\/$/, '') + path, {
      ...options,
      headers:{...supabaseHeaders(key, token), 'Content-Type':'application/json', ...options.headers},
      signal:options.signal || AbortSignal.timeout(18000)
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error('request'), {status:response.status, code:data?.error_code || data?.code});
    return data;
  }
  function setSession(data){
    if (!data?.access_token || !data?.refresh_token || !data?.user?.id) throw new Error('invalid_session');
    saveSession({...data, expires_at:data.expires_at || Math.floor(Date.now()/1000) + data.expires_in});
  }
  async function token(){
    const account = getSession();
    if (!account) throw Object.assign(new Error('no_session'), {status:401});
    if (account.expires_at * 1000 > Date.now() + 60000) return account.access_token;
    if (!refreshTask){
      const previous = account;
      refreshTask = request('/auth/v1/token?grant_type=refresh_token', {method:'POST', body:JSON.stringify({refresh_token:previous.refresh_token})})
        .then(data => { if (getSession() === previous) setSession(data); return getSession()?.access_token; })
        .catch(error => {
          if ([400,401,403].includes(error.status) && getSession() === previous) onSessionExpired();
          throw error;
        }).finally(() => { refreshTask = null; });
    }
    return refreshTask;
  }
  async function db(table, options = {}, query = ''){
    const authToken = await token();
    return request('/rest/v1/' + table + query, options, authToken);
  }
  function upsert(table, value){
    return db(table, {method:'POST', headers:{Prefer:'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify({...value, usuario_id:getSession().user.id})});
  }
  function remove(table, coctel){
    return db(table, {method:'DELETE'}, '?coctel=eq.' + encodeURIComponent(coctel));
  }
  return {
    configured,
    requestCode(email){
      return request('/auth/v1/otp', {method:'POST', body:JSON.stringify({email, create_user:true})});
    },
    async verifyCode(email, code){
      const data = await request('/auth/v1/verify', {method:'POST', body:JSON.stringify({email, token:code, type:'email'})});
      setSession(data);
    },
    async logout(){
      return request('/auth/v1/logout?scope=local', {method:'POST'}, await token());
    },
    // Mantiene los cuatro resultados independientes y su orden: el consumidor
    // conserva la validación de catálogos y los mensajes que ya tenía.
    loadAccount(){
      return Promise.allSettled([
        db('perfiles_personales', {}, '?select=preferencias'),
        db('cocteles_guardados', {}, '?select=coctel,elecciones,creado_at&order=creado_at.desc'),
        db('reacciones_cocteles', {}, '?select=coctel,reaccion,motivo,probado_gusto'),
        db('avatares_personales', {}, '?select=coctel,personalidad')
      ]);
    },
    saveRecipe(coctel, elecciones){ return upsert('cocteles_guardados', {coctel, elecciones}); },
    async loadStatistics(){
      // PostgREST limita cada respuesta; recorrer todas las páginas evita totales truncados.
      const rows = [];
      for (let offset = 0; ; offset += 500){
        const page = await db('elecciones_personales', {}, '?select=id,coctel,elecciones,creado_at&order=creado_at.desc,id.desc&limit=500&offset=' + offset);
        rows.push(...page);
        if (page.length < 500) return rows;
      }
    },
    saveSelection(entry){ return upsert('elecciones_personales', entry); },
    savePreferences(preferencias){ return upsert('perfiles_personales', {preferencias, actualizado_at:new Date().toISOString()}); },
    saveAvatar(coctel, personalidad){ return upsert('avatares_personales', {coctel, personalidad, actualizado_at:new Date().toISOString()}); },
    saveReaction(reaction){ return upsert('reacciones_cocteles', {...reaction, actualizado_at:new Date().toISOString()}); },
    removeRecipe(coctel){ return remove('cocteles_guardados', coctel); },
    removeAvatar(coctel){ return remove('avatares_personales', coctel); },
    removeReaction(coctel){ return remove('reacciones_cocteles', coctel); },
  };
}
