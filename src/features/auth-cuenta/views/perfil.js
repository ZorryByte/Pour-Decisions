import {createCuentaModel} from '../models/cuentaModel.js';
import {createCuentaViewModel} from '../viewmodels/cuentaViewModel.js';
import {motivosReaccion as REASONS} from '../domain/reacciones.js';
import {normalizarPreferencias, clavesPreferencias as KEYS} from '../domain/preferencias.js';
import {resumirElecciones} from '../domain/estadisticas.js';
import {createEstadisticasViewModel} from '../viewmodels/estadisticasViewModel.js';

/* Perfil privado: Supabase Auth + RLS. El nombre de la fiesta nunca autentica una cuenta. */
window.Perfil = (function(){
  'use strict';
  const SESSION = 'cocteles_cuenta_v1', GUEST = 'cocteles_reacciones_visita_v1';
  const PENDING = 'cocteles_guardado_pendiente_v1';
  const ACCESS = 'cocteles_acceso_pendiente_v1';
  let api, model;
  let accessTimer;
  let active = false, wasWelcome = false, tab = 'guardados';
  const expandedDetails = new Set();
  function rememberDisclosure(node, key){
    node.open = expandedDetails.has(key);
    node.addEventListener('toggle', () => {
      if (!node.isConnected) return;
      if (node.open) expandedDetails.add(key); else expandedDetails.delete(key);
    });
    return node;
  }
  let latestResult = null, resultSignature = '', resultOwner;
  const statistics = createEstadisticasViewModel({
    accountId:() => cuenta.session?.user.id || null,
    load:() => model.loadStatistics(), save:entry => model.saveSelection(entry),
    readPending:user => { const rows = read('cocteles_estadisticas_pendientes_' + user, localStorage); return Array.isArray(rows) ? rows : []; },
    writePending:(user, rows) => write('cocteles_estadisticas_pendientes_' + user, rows, localStorage),
    notify:() => { if (active && tab === 'estadisticas') render(); }
  });
  const cuentaVM = createCuentaViewModel({
    loadAccount:() => model.loadAccount(),
    requestCode:email => model.requestCode(email),
    verifyCode:(email, code) => model.verifyCode(email, code),
    endSession:() => model.logout(),
    readGuest:() => read(GUEST, sessionStorage),
    writeGuest:next => write(GUEST, next, sessionStorage),
    persistReaction:reaction => model.saveReaction(reaction),
    removeReaction:coctel => model.removeReaction(coctel),
    findDrink:drink,
    getCatalog:() => api.catalog,
    allows:(coctel, choices) => api.allowed(coctel, choices),
    readPending:() => read(PENDING, sessionStorage),
    writePending:next => write(PENDING, next, sessionStorage),
    persistRecipe:(coctel, choices) => model.saveRecipe(coctel, choices),
    removeRecipe:coctel => model.removeRecipe(coctel),
    persistPreferences:choices => model.savePreferences(choices),
    currentChoices:snapshot,
    identify:(choices, id) => api.identity(choices, id),
    currentIdentity:() => api.currentIdentity(),
    persistAvatar:(coctel, identity) => model.saveAvatar(coctel, identity),
    removeAvatar:coctel => model.removeAvatar(coctel),
    readSession:() => read(SESSION, localStorage),
    writeSession:next => write(SESSION, next, localStorage),
    readAccess:() => read(ACCESS, sessionStorage),
    writeAccess:next => write(ACCESS, next, sessionStorage),
    normalizePreferences:preferences,
    hasDrink:name => Boolean(drink(name))
  });
  const cuenta = cuentaVM.state;
  cuentaVM.subscribe(event => {
    statistics.sync();
    if ((event === 'load-end' || event === 'action-end') && cuenta.session && latestResult && resultOwner === undefined){
      resultOwner = cuenta.session.user.id; void statistics.record(latestResult);
      write('cocteles_resultado_estadisticas_v1', null, sessionStorage);
    }
    if (event === 'load-end' && active && tab === 'estadisticas' && cuenta.session) void statistics.refresh();
    if (event === 'load-start' || event === 'action-start'){ if (active) render(); }
    else if (event === 'load-end' || event === 'action-end'){ updateEntry(); if (active) render(); }
    else if (event === 'access-reset' || event === 'logout-end' || event === 'pending-discarded') render();
    else if (event === 'access-required') open();
    else if (event === 'session-expired'){ updateEntry(); if (active) render(); }
    else if (event === 'session-changed'){
      updateEntry(); if (cuenta.session) void load(); else if (active) render();
    }
  });
  function read(key, storage){ try { return JSON.parse(storage.getItem(key) || 'null'); } catch (_) { return null; } }
  function write(key, value, storage){
    try { if (value === null) storage.removeItem(key); else storage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }
  function preferences(raw){ return normalizarPreferencias(raw, api.steps); }
  function snapshot(){ return preferences(api.snapshot()); }
  function drink(name){ return api.catalog.find(c => c.n === name); }
  function configured(){ return model.configured(); }
  function load(){ return cuentaVM.load(); }
  function reactionFor(name){ return cuentaVM.reactionFor(name); }
  function boost(c){ return cuentaVM.boost(c); }
  function avatarNode(c, identity, small = false){
    const node = api.el('span', {class:'profile-avatar' + (small ? ' is-small' : ''), 'data-element':identity.elemento});
    node.append(api.avatar(c,identity.id)); return node;
  }
  function savedIdentity(entry){
    return cuentaVM.savedIdentity(entry);
  }
  function avatarIdentity(){ return cuentaVM.avatarIdentity(); }
  function updateEntry(){
    const entry = document.getElementById('open-profile');
    const favorite = cuenta.session && drink(cuenta.data.avatar?.coctel);
    const identity = favorite && avatarIdentity();
    const portrait = favorite && identity
      ? avatarNode(favorite, identity, true)
      : api.el('span', {class:'profile-avatar is-small is-default'}, api.heroGlass());
    portrait.setAttribute('aria-hidden', 'true');
    entry.replaceChildren();
    entry.setAttribute('aria-label', 'Mi perfil');
    entry.title = favorite ? 'Mi perfil · ' + favorite.n : 'Mi perfil';
    entry.append(portrait, api.el('span', {class:'profile-entry-label'}, 'Mi perfil'));
  }
  function button(text, action, quiet = true){
    const b = api.el('button', {type:'button', class:'btn' + (quiet ? ' quiet' : ''), disabled:cuenta.busy}, text);
    b.addEventListener('click', action); return b;
  }
  function status(text, error = false){ return api.el('p', {class:'profile-status' + (error ? ' profile-error' : ''), role:error ? 'alert' : 'status'}, text); }
  function title(text, tag = 'h2'){ return api.el(tag, {tabindex:'-1'}, text); }
  function open(name = 'guardados'){
    if (!active) wasWelcome = api.isWelcome();
    if (name) tab = name;
    active = true; cuenta.error = ''; cuenta.notice = ''; api.enter();
    const hash = tab === 'estadisticas' ? '#perfil/estadisticas' : '#perfil';
    if (location.hash !== hash) location.hash = hash;
    render();
    api.app.querySelector('h1')?.focus({preventScroll:true}); window.scrollTo(0,0);
    if (cuenta.session && !cuenta.loaded && !cuenta.loading) void load();
    if (tab === 'estadisticas' && cuenta.session) void statistics.refresh();
  }
  function recordResult(coctel){
    const choices = snapshot();
    const signature = JSON.stringify([coctel, choices]);
    if (signature === resultSignature) return;
    resultSignature = signature;
    latestResult = {id:crypto.randomUUID(), coctel, elecciones:choices, creado_at:new Date().toISOString()};
    resultOwner = cuenta.session?.user.id;
    if (resultOwner) void statistics.record(latestResult);
    else write('cocteles_resultado_estadisticas_v1', latestResult, sessionStorage);
  }
  function close(){
    if (cuenta.busy) return;
    clearInterval(accessTimer);
    active = false;
    history.replaceState(null, '', location.pathname + location.search + '#elegir');
    api.resume(wasWelcome);
  }
  function save(c, favorite = false){
    return cuentaVM.saveRecipe(c.n, {favorite, fromProfile:active});
  }
  function toggleFavorite(entry){ return cuentaVM.toggleFavorite(entry.coctel); }
  function react(c, fields){ return cuentaVM.react(c.n, fields); }
  function reactionIcon(kind){
    const paths = {
      like:'M7 10v10H3V10h4Zm0 0 5-7c2 0 2 2 1 6h5a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 1H7',
      dislike:'M7 14V4H3v10h4Zm0 0 5 7c2 0 2-2 1-6h5a2 2 0 0 0 2-2l-2-8a2 2 0 0 0-2-1H7',
      tasted:'m5 12 4 4L19 6',
      favorite:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
      remove:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7'
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
    svg.setAttribute('class','profile-action-icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',paths[kind]); svg.append(path); return svg;
  }
  function feedback(c, allowSave = true){
    const wrap = api.el('section', {class:'profile-feedback', 'aria-label':'Tu opinión sobre ' + c.n});
    let waiting = false, message = '';
    function paint(focusLabel){
      wrap.replaceChildren();
      wrap.append(api.el('p', {class:'profile-feedback-question'}, allowSave ? '¿Te apetece este cóctel?' : 'Tu veredicto'));
      const r = reactionFor(c.n);
      const row = api.el('div', {class:'profile-reactions' + (allowSave ? '' : ' is-compact'), role:'group', 'aria-label':'Tu opinión sobre ' + c.n});
      const options = allowSave ? [['like','Me apetece'],['dislike','No me convence']] : [['like','Me apetece'],['dislike','Paso'],['tasted','Me gustó']];
      options.forEach(([value, label]) => {
        const b = button(label, async () => {
          if (waiting) return;
          waiting = true; paint(label);
          const ok = await react(c, value === 'tasted' ? {probado_gusto:!r?.probado_gusto} : {reaccion:r?.reaccion === value ? null : value});
          waiting = false;
          message = ok ? (cuenta.session ? 'Preferencia actualizada.' : 'Reacción anotada para esta visita. Al entrar podrás conservarla.') : cuenta.error;
          paint(label);
        });
        b.setAttribute('aria-pressed', String(value === 'tasted' ? !!r?.probado_gusto : r?.reaccion === value)); b.disabled = waiting || cuenta.busy;
        if (!allowSave){
          b.prepend(reactionIcon(value));
          b.setAttribute('aria-label',value === 'tasted' ? 'Lo probé y me gustó' : value === 'dislike' ? 'No me convence' : label);
          b.title = value === 'tasted' ? 'Lo probé y me gustó' : value === 'dislike' ? 'No me convence' : label;
        }
        row.append(b);
      });
      wrap.append(row);
      if (r?.reaccion === 'dislike'){
        const label = api.el('label', {class:'profile-reason'}, '¿Qué cambiarías? (opcional)');
        const select = api.el('select', {'aria-label':'Qué cambiarías de ' + c.n, disabled:waiting || cuenta.busy});
        select.append(api.el('option', {value:''}, 'Elige un motivo'));
        Object.entries(REASONS).forEach(([value, text]) => select.append(api.el('option', {value}, text)));
        select.value = r.motivo || '';
        select.addEventListener('change', async () => {
          const value = select.value; select.disabled = true;
          const ok = await react(c, {motivo:value || null});
          message = ok ? 'Anotado. Puedes explorar otra receta sin empezar de cero.' : cuenta.error; paint();
        });
        label.append(select); wrap.append(label);
        const next = api.ranked().find(other => other.n !== c.n && reactionFor(other.n)?.reaccion !== 'dislike');
        if (next) wrap.append(button('Descubrir otra opción', () => api.choose(next)));
      }
      if (allowSave){
        const saved = cuenta.session && cuenta.data.favorites.some(f => f.coctel === c.n);
        const saveButton = button(saved ? 'Ver en mi colección' : 'Guardar en mi perfil', async () => {
          if (saved){ open(); return; }
          if (waiting) return;
          waiting = true; paint(); await save(c); waiting = false;
          message = cuenta.error || (cuenta.session ? cuenta.notice : ''); paint();
        }, false);
        saveButton.disabled = waiting || cuenta.busy;
        wrap.append(api.el('div', {class:'profile-save-action'}, saveButton));
        const chosen = cuenta.session && cuenta.data.avatar?.coctel === c.n;
        const favorite = button(chosen ? 'Ver mi avatar' : 'Elegir como mi favorito', async () => {
          if (chosen){ open(); return; }
          if (waiting) return;
          waiting = true; paint(); await save(c,true); waiting = false;
          message = cuenta.error || (cuenta.session ? cuenta.notice : ''); paint();
        });
        favorite.disabled = waiting || cuenta.busy;
        wrap.append(favorite);
        wrap.append(api.el('p', {class:'profile-hint'}, 'Tu reacción afina las propuestas. Guardar añade la receta a tu colección personal.'));
      }
      if (message) wrap.append(status(message, !!cuenta.error));
      if (focusLabel) [...wrap.querySelectorAll('button')].find(b => b.textContent === focusLabel)?.focus({preventScroll:true});
    }
    paint(); return wrap;
  }
  function authView(root){
    const heading = title(cuenta.pending ? 'Esta receta puede ser tuya.' : 'Tus cócteles, a tu manera.', 'h1');
    root.append(heading, api.el('p', {class:'profile-lead'}, cuenta.pending
      ? 'Entra para guardar ' + cuenta.pending.coctel + (cuenta.pending.favorite ? ' y usar su personaje como tu avatar.' : ' y volver a prepararlo cuando quieras.')
      : 'Guarda lo que te apetece, afina tus gustos y encuentra tu próxima mezcla.'));
    const layout = api.el('div', {class:'profile-auth-layout'});
    const preview = api.el('div', {class:'profile-preview'});
    const c = cuenta.pending && drink(cuenta.pending.coctel);
    if (c){
      const identity = api.identity(preferences(cuenta.pending.elecciones),cuenta.pending.elecciones._personalidad);
      if (cuenta.pending.favorite) preview.append(avatarNode(c,identity), api.el('h2', {},identity.nombre), api.el('p', {},c.n + ' · ' + identity.elementoNombre));
      else preview.append(api.portrait(c), api.el('h2', {}, c.n), api.el('p', {}, c.d));
    }
    else { preview.append(api.heroGlass(), api.el('h2', {}, 'Una colección con tu gusto.'), api.el('p', {}, 'Cócteles guardados, recetas completas y nuevas ideas para explorar.')); }
    const benefits = api.el('ul', {class:'profile-auth-benefits'});
    ['Tus recetas para volver a prepararlas.', 'Tu favorito como avatar del perfil.', 'Recomendaciones según tus gustos.'].forEach(text => benefits.append(api.el('li', {}, text)));
    preview.append(benefits);
    layout.append(preview);
    const form = api.el('form', {class:'profile-auth-form', 'aria-busy':String(cuenta.busy)});
    const unavailable = !configured();
    form.append(title(cuenta.codeSent ? 'Revisa tu correo.' : 'Entrar o crear mi perfil'));
    form.append(api.el('p', {class:'profile-auth-intro'}, cuenta.codeSent ? 'Ya casi está. Confirma tu correo para abrir tu colección.' : 'Empieza con tu correo. Si ya tienes una cuenta, entrarás a tu colección de siempre.'));
    if (unavailable) form.append(status('El acceso al perfil aún no está disponible. Tu resultado sigue aquí y puedes continuar explorando.'));
    const emailInput = api.el('input', {id:'profile-email', type:'email', autocomplete:'email', inputmode:'email', autocapitalize:'none', spellcheck:'false', placeholder:'nombre@correo.com', required:true, maxlength:'254', disabled:cuenta.busy || unavailable || cuenta.codeSent, 'aria-describedby':'profile-email-hint'});
    emailInput.value = cuenta.email;
    emailInput.addEventListener('input', () => { cuenta.email = emailInput.value; });
    form.append(api.el('label', {for:'profile-email'}, 'Tu correo'), emailInput);
    let code;
    if (cuenta.codeSent){
      form.append(api.el('p', {class:'profile-hint'}, 'Escribe el código que enviamos a ' + cuenta.email + '. Si no llega, revisa el correo no deseado.'));
      code = api.el('input', {id:'profile-code', type:'text', inputmode:'numeric', autocomplete:'one-time-code', pattern:'[0-9]{6,10}', minlength:'6', maxlength:'10', required:true, disabled:cuenta.busy, 'aria-describedby':'profile-code-hint', 'aria-invalid':String(!!cuenta.error)});
      code.addEventListener('input', () => { code.value = code.value.replace(/\s/g, ''); code.removeAttribute('aria-invalid'); });
      form.append(api.el('label', {for:'profile-code'}, 'Código de acceso'), code);
      form.append(api.el('p', {id:'profile-code-hint', class:'profile-hint'}, 'Introduce el código completo. Puedes pegarlo directamente desde tu correo.'));
    }
    form.append(api.el('p', {id:'profile-email-hint', class:'profile-hint'}, 'Sin contraseña. Tu cuenta se crea al confirmar el código que te enviamos por correo.'));
    const submit = api.el('button', {type:'submit', class:'btn', disabled:cuenta.busy || unavailable}, cuenta.busy ? (cuenta.codeSent ? 'Confirmando tu código…' : 'Enviando tu código…') : cuenta.codeSent ? 'Entrar a mi perfil' : 'Enviarme un código');
    form.append(submit);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (cuenta.busy || !form.reportValidity()) return;
      const requestingCode = !cuenta.codeSent;
      const ok = await cuentaVM.submitAccess(emailInput.value, code?.value.trim());
      if (ok && requestingCode) document.getElementById('profile-code')?.focus();
      else if (!ok) document.getElementById(cuenta.codeSent ? 'profile-code' : 'profile-email')?.focus();
      else api.app.querySelector('h1')?.focus({preventScroll:true});
    });
    if (cuenta.codeSent){
      const actions = api.el('div', {class:'profile-auth-actions'});
      const resend = button('Reenviar código', async () => {
        await cuentaVM.resendCode(); document.getElementById('profile-code')?.focus();
      });
      function updateResend(){
        const wait = cuentaVM.resendWait(); resend.disabled = cuenta.busy || wait > 0;
        resend.textContent = wait ? 'Reenviar en ' + wait + ' s' : 'Reenviar código';
      }
      updateResend(); accessTimer = setInterval(updateResend, 1000);
      actions.append(resend, button('Cambiar correo', () => { cuentaVM.changeEmail(); document.getElementById('profile-email')?.focus(); }));
      form.append(actions);
    }
    form.append(api.el('p', {class:'profile-hint'}, 'Tu colección es privada. Al entrar conservaremos también las reacciones de esta visita. Guardar aquí no apunta un pedido para una fiesta.'));
    if (cuenta.error) form.append(status(cuenta.error, true));
    if (cuenta.notice) form.append(status(cuenta.notice));
    layout.append(form); root.append(layout);
  }
  function recipes(root, entries, discovery = false){
    const list = api.el('div', {class:'profile-recipes'});
    entries.forEach(entry => {
      const c = drink(entry.coctel); if (!c) return;
      const article = api.el('article', {class:'profile-recipe'});
      const identity = discovery ? api.identity(cuenta.data.preferences) : savedIdentity(entry);
      const chosen = cuenta.data.avatar?.coctel === c.n;
      const art = api.el('div', {class:'profile-recipe-art'}); art.append(api.glass(c,true,identity.id));
      if (chosen) article.classList.add('is-favorite');
      const heading = api.el('div', {class:'profile-recipe-heading'}, api.el('h3', {}, c.n));
      const content = api.el('div', {class:'profile-recipe-copy'}, heading, api.el('p', {}, c.d));
      if (!discovery) content.append(api.el('p', {class:'profile-recipe-personality'}, identity.nombre + ' · ' + identity.elementoNombre));
      if (discovery) content.append(api.el('p', {class:'profile-hint'}, entry.reason));
      const details = rememberDisclosure(api.el('details', {class:'profile-recipe-details'}), 'recipe:' + c.n);
      details.append(api.el('summary', {}, 'Ver ingredientes y preparación'));
      const ingredients = api.el('ul'); c.i.forEach(item => ingredients.append(api.el('li', {}, item)));
      const steps = api.el('ol'); c.p.forEach(item => steps.append(api.el('li', {}, item)));
      const recipeBody = api.el('div', {class:'profile-recipe-method'},
        api.el('section', {'aria-label':'Ingredientes'}, api.el('h4', {}, 'Ingredientes'), ingredients),
        api.el('section', {'aria-label':'Preparación'}, api.el('h4', {}, 'Preparación'), steps));
      details.append(recipeBody); content.append(details, feedback(c, discovery));
      if (!discovery){
        const favorite = button(chosen ? 'Favorito' : 'Elegir favorito', () => toggleFavorite(entry));
        favorite.prepend(reactionIcon('favorite'));
        favorite.setAttribute('aria-label',chosen ? 'Quitar como mi favorito' : 'Usar como mi favorito');
        favorite.title = chosen ? 'Quitar como mi favorito' : 'Usar como mi favorito';
        favorite.setAttribute('aria-pressed',String(chosen));
        heading.append(api.el('div',{class:'profile-favorite-action'},favorite));
        const remove = button('Quitar', () => cuentaVM.removeSavedRecipe(c.n));
        remove.prepend(reactionIcon('remove'));
        remove.setAttribute('aria-label','Quitar de mi colección'); remove.title = 'Quitar de mi colección';
        content.append(api.el('div', {class:'profile-recipe-actions'}, remove));
      }
      article.append(art, content); list.append(article);
    });
    root.append(list);
  }
  function suggestions(){ return cuentaVM.suggestions(); }
  function tastes(root){
    root.append(title('Tus gustos pueden cambiar.'), api.el('p', {class:'profile-lead'}, 'Estas preferencias orientan Por descubrir. Puedes corregirlas sin repetir el juego.'));
    const form = api.el('form', {class:'profile-tastes'});
    const draft = cuentaVM.getPreferences();
    api.steps.forEach(step => {
      const field = api.el('fieldset', {class:'profile-taste-field'});
      field.append(api.el('legend', {}, step.q));
      const options = api.el('div', {class:'profile-taste-options'});
      step.groups.flatMap(g => g.o).forEach(raw => {
        const value = typeof raw === 'string' ? raw : raw.v;
        if (value === 'cualquiera') return;
        const label = typeof raw === 'string' ? raw : raw.t;
        const input = api.el('input', {type:step.k === 'fuerza' || step.k === 'plan' ? 'radio' : 'checkbox', name:step.k, value, disabled:cuenta.busy});
        input.checked = draft[step.k].includes(value);
        input.addEventListener('change', () => {
          if (step.k === 'alergia'){
            const peers = [...options.querySelectorAll('input')];
            if (value === 'ninguna' && input.checked) peers.filter(p => p !== input).forEach(p => p.checked = false);
            if (value !== 'ninguna' && input.checked) peers.find(p => p.value === 'ninguna').checked = false;
          }
        });
        options.append(api.el('label', {}, input, label));
      });
      if (step.k === 'fuerza' || step.k === 'plan'){
        const input = api.el('input', {type:'radio', name:step.k, value:'', disabled:cuenta.busy}); input.checked = !draft[step.k].length;
        options.append(api.el('label', {}, input, 'Sin preferencia'));
      }
      field.append(options); form.append(field);
    });
    form.append(api.el('button', {type:'submit', class:'btn', disabled:cuenta.busy}, cuenta.busy ? 'Guardando…' : 'Guardar mis gustos'));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = {}; KEYS.forEach(key => values[key] = [...form.querySelectorAll('input[name="' + key + '"]:checked')].map(input => input.value).filter(Boolean));
      void cuentaVM.savePreferences(values);
    });
    root.append(form);
    const reactions = cuentaVM.reactionHistory();
    if (reactions.length){
      const section = rememberDisclosure(api.el('details', {class:'profile-reaction-history'},
        api.el('summary', {}, 'Lo que has ido descubriendo (' + reactions.length + ')')), 'reactions');
      reactions.forEach(r => {
        const labels = [r.reaccion === 'like' ? 'Te apetece' : r.reaccion === 'dislike' ? 'No te convence' : '', r.probado_gusto ? 'Lo probaste y te gustó' : ''].filter(Boolean);
        const row = api.el('div', {class:'profile-history-row'}, api.el('span', {}, r.coctel + ' · ' + labels.join(' · ')));
        if (r.reaccion === 'dislike'){
          const label = api.el('label', {class:'profile-reason'}, 'Qué cambiarías (opcional)');
          const select = api.el('select', {'aria-label':'Qué cambiarías de ' + r.coctel, disabled:cuenta.busy});
          select.append(api.el('option', {value:''}, 'Sin motivo indicado'));
          Object.entries(REASONS).forEach(([value,text]) => select.append(api.el('option', {value}, text)));
          select.value = r.motivo || '';
          select.addEventListener('change', () => react(drink(r.coctel), {motivo:select.value || null}));
          label.append(select); row.append(label);
        }
        row.append(button('Olvidar esta reacción', () => cuentaVM.forgetReaction(r.coctel)));
        section.append(row);
      });
      root.append(section);
    }
  }
  function profileHeader(root){
    const header = api.el('header', {class:'profile-identity'});
    const identity = avatarIdentity();
    if (identity){
      header.dataset.element = identity.elemento;
      const photo = avatarNode(drink(cuenta.data.avatar.coctel),identity);
      header.append(photo);
    } else {
      const photo = api.el('div', {class:'profile-avatar is-empty','aria-label':'Aún no elegiste un cóctel favorito'});
      photo.append(api.heroGlass()); header.append(photo);
    }
    const copy = api.el('div', {class:'profile-identity-copy'});
    if (identity) copy.append(api.el('h2', {},identity.nombre), api.el('p', {class:'profile-signature'}, 'Tu favorito: ' + cuenta.data.avatar.coctel), api.el('p', {class:'profile-hint'},identity.linea));
    else copy.append(api.el('p', {class:'profile-signature'}, 'Tu favorito le dará cara a tu perfil.'), api.el('p', {class:'profile-hint'}, 'Guarda tus recetas y elige una como favorita. Su personaje será tu avatar.'));
    copy.append(api.el('p', {class:'profile-email'},cuenta.session.user.email || 'Tu cuenta personal'));
    if (window.Insignias && api.badgeContext){
      const context = api.badgeContext();
      const owned = Insignias.collection(context);
      const selected = Insignias.featured(context);
      if (selected.length){
        const badges = api.el('ul', {class:'profile-featured-badges','aria-label':'Tus insignias destacadas'});
        selected.forEach(id => {
          const b = owned.find(b => b.id === id);
          const item = api.el('li', {class:'profile-featured-badge profile-metal-' + b.rank});
          item.append(badgeMedal(b.rank),api.el('span', {},b.name),api.el('span', {class:'clip'},Insignias.ranks[b.rank].name));
          badges.append(item);
        });
        copy.append(badges);
      }
    }
    const controls = api.el('div', {class:'profile-identity-actions'});
    if (cuenta.loaded && cuenta.data.favorites.length) controls.append(button(identity ? 'Cambiar mi favorito' : 'Elegir mi favorito', () => {
      tab = 'guardados'; render();
      const option = api.app.querySelector('.profile-favorite-action button');
      option?.focus({preventScroll:true}); option?.scrollIntoView({block:'center',behavior:'instant'});
    }));
    const logoutButton = button('Cerrar sesión',logout);
    logoutButton.classList.add('profile-session-exit');
    controls.append(logoutButton);
    controls.prepend(button('Ver mis estadísticas', () => open('estadisticas')));
    if (window.Insignias && api.badgeContext) controls.prepend(button('Elegir insignias',()=>{
      tab='insignias'; render(); api.app.querySelector('.profile-content')?.focus({preventScroll:true});
    }));
    header.append(copy,controls); root.append(header);
  }
  function badgeMedal(rank){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 40 48');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','profile-badge-medal');
    svg.innerHTML='<path d="m11 29-3 15 9-4 3 5 3-5 9 4-3-15"/><path d="M20 3 35 12v19L20 40 5 31V12z"/><path class="profile-medal-detail" d="m20 12 2.5 5 5.5.8-4 4 .9 5.5L20 25l-4.9 2.3.9-5.5-4-4 5.5-.8z"/>';
    return svg;
  }
  function badgeView(root){
    if (!window.Insignias || !api.badgeContext){root.append(status('Las insignias no están disponibles. Vuelve a intentarlo.'));return;}
    const context=api.badgeContext(), owned=Insignias.collection(context), selected=Insignias.featured(context);
    root.append(title('Tus insignias'),api.el('p', {class:'profile-hint'},'Elegí hasta tres para mostrarlas junto a tu avatar. La colección y tu selección se guardan en este navegador.'));
    const live=api.el('p', {class:'profile-status',role:'status','aria-live':'polite'},selected.length+' de 3 destacadas');
    root.append(live);
    const guest=Insignias.guestCollection(context);
    if (guest.length) root.append(api.el('div', {class:'profile-pending'},api.el('p', {},'Tenés '+guest.length+' insignias de esta visita sin asociar a tu cuenta.'),button('Conservar mis insignias',()=>{
      const result=Insignias.importGuest(context);
      if(result.ok){render();api.app.querySelector('.profile-content')?.focus({preventScroll:true});}
      else live.textContent='No pudimos conservarlas. Revisa si este navegador permite guardar datos e inténtalo de nuevo.';
    })));
    if (!owned.length){root.append(api.el('p', {class:'profile-badges-empty'},'Todavía no tenés insignias en esta cuenta. Descubrí tu cóctel para conseguir las primeras.'),button('Volver al juego',close));return;}
    const list=api.el('ul', {class:'profile-badge-options','aria-label':'Insignias obtenidas para destacar'});
    owned.forEach(b=>{
      const on=selected.includes(b.id), full=selected.length===3;
      const row=api.el('li', {class:'profile-badge-option profile-metal-'+b.rank+(on?' is-selected':'')});
      const label=api.el('span', {class:'profile-badge-copy'},api.el('strong', {},b.name),api.el('small', {},Insignias.ranks[b.rank].name+' · '+b.category));
      const pick=button(on?'Quitar':'Destacar',()=>{
        const next=on?selected.filter(id=>id!==b.id):[...selected,b.id];
        const result=Insignias.chooseFeatured(context,next);
        if(!result.ok){live.textContent=result.error==='limit'?'Podés destacar hasta tres. Quitá una para elegir otra.':'No se guardó la selección. Inténtalo de nuevo.';return;}
        render();
        const target=api.app.querySelector('[data-feature-badge="'+b.id+'"]');target?.focus({preventScroll:true});
      });
      pick.setAttribute('data-feature-badge',b.id);pick.setAttribute('aria-pressed',String(on));
      pick.setAttribute('aria-label',(on?'Quitar ':'Destacar ')+b.name);pick.disabled=cuenta.busy || (!on && full);
      row.append(badgeMedal(b.rank),label,pick);list.append(row);
    });
    root.append(list);
  }
  function render(){
    clearInterval(accessTimer);
    if (!active) return;
    document.title = (tab === 'estadisticas' ? 'Mis estadísticas' : 'Mi perfil') + ' · ¿Qué tomamos?';
    document.body.classList.remove('flow'); document.body.classList.add('at-profile');
    const root = api.el('div', {class:'profile-page'});
    const nav = api.el('div', {class:'profile-top'}, api.el('span', {class:'profile-product'}, '¿Qué tomamos?'), button(wasWelcome ? 'Volver al inicio' : 'Volver a mi cóctel', close));
    root.append(nav);
    if (!cuenta.session) authView(root);
    else if (tab === 'estadisticas') {
      statisticsView(root);
    } else {
      root.append(title('Mi perfil', 'h1'));
      profileHeader(root);
      const nav = api.el('nav', {class:'profile-tabs', 'aria-label':'Apartados del perfil'});
      [['guardados','Mis cócteles'],['gustos','Mis gustos'],['descubrir','Por descubrir'],['insignias','Insignias']].forEach(([value,label]) => {
        const b = button(label, () => { tab = value; cuenta.error = ''; cuenta.notice = ''; render(); api.app.querySelector('.profile-content')?.focus({preventScroll:true}); window.scrollTo(0,0); });
        if (tab === value) b.setAttribute('aria-current', 'page'); nav.append(b);
      }); root.append(nav);
      if (cuenta.notice) root.append(status(cuenta.notice));
      if (cuenta.error) root.append(status(cuenta.error, true));
      const content = api.el('section', {class:'profile-content', tabindex:'-1', 'aria-label':tab === 'guardados' ? 'Mis cócteles' : tab === 'gustos' ? 'Mis gustos' : tab === 'insignias' ? 'Insignias' : 'Por descubrir'});
      if (tab === 'insignias') badgeView(content);
      else if (cuenta.loading) content.append(status('Buscando tus cócteles y tus gustos…'));
      else if (!cuenta.loaded) content.append(api.el('p', {}, 'No pudimos cargar tu colección.'), button('Volver a intentar', () => { cuenta.error = ''; void load(); }));
      else {
        if (Object.keys(cuenta.guest).length) content.append(api.el('div', {class:'profile-pending'}, api.el('p', {}, 'Tus reacciones de esta visita todavía están pendientes.'), button('Conservar mis reacciones', () => cuentaVM.keepGuestReactions())));
        if (cuenta.pending) content.append(api.el('div', {class:'profile-pending'}, api.el('p', {}, 'Pendiente de guardar: ' + cuenta.pending.coctel + (cuenta.pending.favorite ? ' como tu favorito y avatar.' : '')), button('Guardar esta receta', () => cuentaVM.retryPending()),
          button('Descartar este guardado', () => cuentaVM.discardPending())));
        if (tab === 'guardados'){
          content.append(title('Mis cócteles'));
          content.append(api.el('p', {class:'profile-lead'}, cuenta.data.favorites.length ? cuenta.data.favorites.length + (cuenta.data.favorites.length === 1 ? ' receta para volver a preparar.' : ' recetas para volver a preparar.') : 'Tu próxima mezcla favorita empieza aquí.'));
          if (cuenta.data.favorites.length) recipes(content, cuenta.data.favorites);
          else content.append(api.el('div', {class:'profile-empty'}, api.heroGlass(), api.el('p', {}, 'Cuando una receta te llame la atención, elige Guardar en mi perfil. Darle Me apetece no la guarda automáticamente.'), button('Descubrir recetas', () => { tab = 'descubrir'; render(); }, false)));
        } else if (tab === 'gustos') tastes(content);
        else {
          content.append(title('Tu próxima mezcla.'), api.el('p', {class:'profile-lead'}, 'Ideas según tus gustos. Las recetas que no te convencen quedan fuera de esta selección.'));
          if (cuenta.data.preferences.alergia?.includes('otra')) content.append(status('Tienes una restricción por revisar. No podemos proponerte recetas compatibles hasta aclararla en Mis gustos.'));
          else {
            const entries = suggestions();
            if (entries.length) recipes(content, entries, true);
            else content.append(api.el('p', {}, 'No hay más recetas que encajen con tus preferencias actuales. Revisa Mis gustos o vuelve a una receta guardada.'));
          }
          content.append(api.el('p', {class:'profile-hint'}, 'Las exclusiones se contrastan con los ingredientes descritos en la carta. Antes de preparar, verifica las etiquetas y cualquier alérgeno con quien sirve.'));
        }
      }
      root.append(content);
    }
    api.app.replaceChildren(root);
    const tabs=root.querySelector('.profile-tabs'), currentTab=tabs?.querySelector('[aria-current]');
    if(tabs && currentTab){
      const bounds=tabs.getBoundingClientRect(), item=currentTab.getBoundingClientRect();
      if(item.right>bounds.right) tabs.scrollLeft+=item.right-bounds.right;
      else if(item.left<bounds.left) tabs.scrollLeft-=bounds.left-item.left;
    }
  }
  function statisticsView(root){
    root.append(button('Volver a mi perfil', () => open('guardados')), title('Mis estadísticas', 'h1'),
      api.el('p', {class:'profile-lead'}, 'Tus elecciones al descubrir cócteles, reunidas en un solo lugar. Solo tú puedes verlas.'));
    const state = statistics.state;
    if (state.loading){ root.append(status('Cargando tus elecciones…')); return; }
    if (state.error) root.append(status(state.error, true));
    const retry = button(state.saving ? 'Guardando elecciones…' : 'Actualizar estadísticas', () => void statistics.refresh());
    retry.disabled = state.saving; root.append(retry);
    if (!state.loaded) return;
    if (!state.entries.length){
      root.append(api.el('div', {class:'profile-empty'}, title('Tu historia empieza con una mezcla.'),
        api.el('p', {}, 'Todavía no hay elecciones registradas. Descubre un cóctel con tu sesión iniciada para empezar.'), button('Volver al juego', close)));
      return;
    }
    const summary = api.el('dl', {class:'profile-stats-summary'});
    [['Resultados registrados', state.entries.length], ['Cócteles diferentes', new Set(state.entries.map(row => row.coctel)).size]].forEach(([label, value]) => {
      summary.append(api.el('div', {}, api.el('dt', {}, label), api.el('dd', {}, String(value))));
    });
    root.append(summary, api.el('p', {class:'profile-hint'}, 'Cada resultado se registra una vez. Los porcentajes indican en cuántos resultados elegiste cada opción; si marcaste varias, pueden sumar más de 100 %.'));
    const groups = resumirElecciones(state.entries, KEYS);
    const grid = api.el('div', {class:'profile-stats-groups'});
    const names = {alcohol:'Alcohol', fruta:'Frutas', sabor:'Sabores', fuerza:'Intensidad', alergia:'Restricciones', plan:'Planes'};
    api.steps.forEach(step => {
      const section = api.el('section', {class:'profile-stats-group'}, title(names[step.k]));
      const labels = new Map(step.groups.flatMap(group => group.o).map(option => typeof option === 'string' ? [option, option] : [option.v, option.t]));
      const list = api.el('ul', {class:'profile-stats-list'});
      groups[step.k].forEach(({value, count, percentage}) => {
        const row = api.el('li', {}, api.el('span', {}, labels.get(value) || value), api.el('span', {class:'profile-stats-count'}, count + ' · ' + percentage + ' %'));
        const track = api.el('span', {class:'profile-stats-track', 'aria-hidden':'true'});
        const bar = api.el('span'); bar.style.width = percentage + '%'; track.append(bar); row.append(track); list.append(row);
      });
      section.append(groups[step.k].length ? list : api.el('p', {class:'profile-hint'}, 'Sin selecciones registradas.')); grid.append(section);
    });
    root.append(grid);
    const history = api.el('section', {class:'profile-stats-history'}, title('Últimos resultados'));
    const list = api.el('ol');
    state.entries.slice(0, 20).forEach(entry => {
      const date = new Date(entry.creado_at);
      const row = api.el('li', {}, api.el('strong', {}, entry.coctel));
      if (Number.isFinite(date.getTime())) row.append(api.el('time', {datetime:date.toISOString()}, date.toLocaleString('es-GT', {dateStyle:'medium', timeStyle:'short'})));
      row.append(api.el('p', {class:'profile-hint'}, KEYS.flatMap(key => entry.elecciones?.[key] || []).join(' · ') || 'Sin preferencias marcadas.')); list.append(row);
    });
    history.append(list); root.append(history);
  }
  function logout(){ return cuentaVM.logout(); }
  function init(context){
    api = context;
    model = createCuentaModel({
      url:api.url, key:api.key,
      getSession:cuentaVM.getSession,
      saveSession:cuentaVM.saveSession,
      onSessionExpired:cuentaVM.expireSession
    });
    cuentaVM.restoreSession();
    cuentaVM.restoreAccess();
    cuentaVM.restorePending();
    cuentaVM.restoreGuest();
    const draft = read('cocteles_resultado_estadisticas_v1', sessionStorage);
    if (draft && drink(draft.coctel) && /^[0-9a-f-]{36}$/i.test(draft.id) && Number.isFinite(Date.parse(draft.creado_at))){
      latestResult = {...draft, elecciones:preferences(draft.elecciones)};
      resultSignature = JSON.stringify([draft.coctel, latestResult.elecciones]);
    }
    document.getElementById('open-profile').addEventListener('click', () => open()); updateEntry();
    window.addEventListener('hashchange', () => {
      if (['#perfil', '#perfil/estadisticas'].includes(location.hash)){
        const next = location.hash === '#perfil/estadisticas' ? 'estadisticas' : 'guardados';
        if (!active || (next === 'estadisticas') !== (tab === 'estadisticas')) open(next);
      } else if (active){ active = false; api.resume(wasWelcome); }
    });
    window.addEventListener('storage', event => {
      if (event.key !== SESSION) return;
      cuentaVM.reloadSession();
    });
    if (cuenta.session) void load();
  }
  return {init, open, render, feedback, boost, recordResult,
    resetStatisticsRound:() => { resultSignature = ''; latestResult = null; resultOwner = undefined; write('cocteles_resultado_estadisticas_v1', null, sessionStorage); },
    isOpen:() => active, accountId:() => cuenta.session?.user.id || null};
})();
