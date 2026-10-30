/* Conversación local: las respuestas no cambian ingredientes ni se envían al servidor. */
window.Preguntas = (function(bank){
  'use strict';
  const FORMATS = ['si_no', 'cuatro_opciones', 'dilema'];
  const LABELS = {si_no:'Sí o no', cuatro_opciones:'Elige una', dilema:'¿Con cuál te quedas?'};
  const KEY = 'cocteles_preguntas_bolsas_v1';
  const byId = new Map(bank.map(q => [q.id, q]));
  let bags = null;
  let round = null;
  function shuffle(items){
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function freshBags(){
    return Object.fromEntries(FORMATS.map(format => [format, shuffle(bank.filter(q => q.formato === format).map(q => q.id))]));
  }
  function saveBags(){
    try { localStorage.setItem(KEY, JSON.stringify({version:1, bags})); } catch (e) { /* memoria local */ }
  }
  function loadBags(){
    if (bags) return;
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (data && data.version === 1 && FORMATS.every(f => Array.isArray(data.bags?.[f]) && data.bags[f].every(id => byId.get(id)?.formato === f) && new Set(data.bags[f]).size === data.bags[f].length)){
        bags = data.bags;
      }
    } catch (e) { /* un historial dañado no impide jugar */ }
    if (!bags) bags = freshBags();
  }
  function remaining(){ return FORMATS.reduce((sum, f) => sum + bags[f].length, 0); }
  function take(format, excluded, categories){
    const list = bags[format];
    const available = list.filter(id => !excluded.includes(id));
    const id = available.find(id => !categories.includes(byId.get(id).categoria)) ?? available[0];
    if (id == null) return null;
    list.splice(list.indexOf(id), 1);
    return id;
  }
  function ensure(){
    if (round) return round;
    loadBags();
    if (!remaining()) bags = freshBags();
    const ids = [], categories = [];
    for (const format of shuffle(FORMATS)){
      const id = take(format, ids, categories);
      if (id != null){ ids.push(id); categories.push(byId.get(id).categoria); }
    }
    // Tras saltos puede faltar un formato. Completar con preguntas inéditas.
    while (ids.length < 3 && remaining()){
      const format = shuffle(FORMATS).find(f => bags[f].length);
      const id = take(format, ids, categories);
      if (id == null) break;
      ids.push(id); categories.push(byId.get(id).categoria);
    }
    round = {version:1, ids, answers:{}, index:0, exhausted:false, notice:''};
    if (new Set(ids.map(id => byId.get(id).formato)).size < 3){
      round.notice = 'Ya viste todas las de algún tipo. Seguimos con las que quedan.';
    }
    saveBags();
    return round;
  }
  function current(){ return byId.get(ensure().ids[round.index]); }
  function answer(){ const q = current(); return q ? round.answers[q.id] : undefined; }
  function answered(){ return round ? round.ids.filter(id => Number.isInteger(round.answers[id])).length : 0; }
  function select(index){
    const q = current();
    if (!q || !Number.isInteger(index) || !q.opciones[index]) return false;
    round.answers[q.id] = index;
    return true;
  }
  function next(){
    ensure();
    if (!Number.isInteger(answer()) || round.index >= round.ids.length - 1) return false;
    round.index++;
    return true;
  }
  function back(){
    if (!round || round.index === 0) return false;
    round.index--;
    return true;
  }
  function skip(){
    const q = current();
    if (!q) return false;
    let id = take(q.formato, round.ids, round.ids.map(id => byId.get(id).categoria));
    if (id == null){
      round.notice = remaining()
        ? 'Ya viste todas las de este tipo. Puedes probar otro tipo o ver tu cóctel.'
        : 'Ya recorriste todas las preguntas. Puedes ver tu cóctel con los gustos que elegiste.';
      round.exhausted = true;
      return false;
    }
    delete round.answers[q.id];
    round.ids[round.index] = id;
    round.exhausted = false;
    round.notice = '';
    saveBags();
    return true;
  }
  function otherFormat(){
    const q = current();
    const format = shuffle(FORMATS).find(f => bags[f].length);
    if (!q || !format) return false;
    const id = take(format, round.ids, round.ids.map(id => byId.get(id).categoria));
    if (id == null) return false;
    delete round.answers[q.id];
    round.ids[round.index] = id;
    round.exhausted = false;
    round.notice = 'Seguimos con una pregunta de otro tipo.';
    saveBags();
    return true;
  }
  function mood(){
    const q = current(), index = answer();
    return {
      key:q ? 'pregunta-' + q.id + '-' + (index ?? 'idle') : 'preguntas-fin',
      face:index == null ? 'rest' : (['brow','wink','laugh','surprise'][((q?.id || 0) + index) % 4]),
      text:q?.opciones[index]?.[1] || 'Ya sé qué te gusta. Ahora cuéntame cómo va la noche.'
    };
  }
  function snapshot(){ return round ? JSON.parse(JSON.stringify(round)) : null; }
  function restore(data){
    round = null;
    if (!data || data.version !== 1 || !Array.isArray(data.ids) || data.ids.length < 1 || data.ids.length > 3 || new Set(data.ids).size !== data.ids.length || data.ids.some(id => !byId.has(id))) return;
    const answers = {};
    for (const id of data.ids){
      const value = data.answers?.[id];
      if (Number.isInteger(value) && value >= 0 && value < byId.get(id).opciones.length) answers[id] = value;
    }
    const index = Number.isInteger(data.index) ? Math.max(0, Math.min(data.ids.length - 1, data.index)) : 0;
    round = {version:1, ids:data.ids.slice(), answers, index, exhausted:data.exhausted === true, notice:typeof data.notice === 'string' ? data.notice : ''};
    loadBags();
    // Una sesión restaurada nunca devuelve sus preguntas a la bolsa pendiente.
    for (const f of FORMATS) bags[f] = bags[f].filter(id => !round.ids.includes(id));
    saveBags();
  }
  function reset(){ round = null; }
  function closing(){
    if (!round) return '';
    const id = round.ids.find(id => Number.isInteger(round.answers[id]));
    if (id == null) return '';
    const q = byId.get(id), text = q.opciones[round.answers[id]][0];
    return 'Y cuando te pregunté «' + q.pregunta + '», elegiste «' + text + '». Ya nos vamos conociendo.';
  }
  function view({el, onChange, onBack, onFinish, canFinish}){
    const q = current(), selected = answer(), state = ensure();
    const root = el('div', {class:'conversation', 'data-format':q?.formato || 'fin'});
    root.append(el('p', {class:'question-progress'}, 'Pregunta ' + (state.index + 1) + ' de ' + state.ids.length));
    root.append(el('progress', {class:'question-meter', max:String(state.ids.length), value:String(answered()), 'aria-label':'Preguntas respondidas'}, String(answered())));
    root.append(el('p', {class:'question-format', id:'question-format'}, LABELS[q?.formato] || 'Fin de las preguntas'));
    const options = el('div', {class:'question-options format-' + q?.formato, role:'group', 'aria-labelledby':'stage-q', 'aria-describedby':'question-format'});
    q?.opciones.forEach((option, i) => {
      const id = 'question-option-' + i;
      const button = el('button', {id, type:'button', class:'plan-pick question-option' + (i === selected ? ' is-on' : ''), 'aria-pressed':i === selected ? 'true' : 'false', 'data-option':String(i)}, option[0]);
      button.addEventListener('click', () => { select(i); onChange(id); });
      options.append(button);
    });
    root.append(options);
    if (state.notice) root.append(el('p', {class:'question-notice', role:'status'}, state.notice));
    const last = state.index === state.ids.length - 1;
    const canResult = state.exhausted || !q || (last && Number.isInteger(selected));
    const actions = el('div', {class:'actions question-actions'});
    const nextButton = el('button', {class:'btn question-next', type:'button'}, canResult ? 'Descubrir mi cóctel' : 'Siguiente pregunta');
    nextButton.disabled = canResult ? !canFinish : !Number.isInteger(selected);
    nextButton.addEventListener('click', () => { if (canResult) onFinish(); else if (next()) onChange(); });
    const backButton = el('button', {class:'text', type:'button'}, 'Atrás');
    backButton.addEventListener('click', onBack);
    actions.append(nextButton, backButton);
    root.append(actions);
    if (!canFinish){
      root.append(el('p', {class:'question-notice', role:'status'}, 'No encontramos un cóctel compatible. Vuelve para ajustar tus gustos; mantendremos tus restricciones.'));
    }
    const extras = el('div', {class:'question-extras'});
    if (q){
      const skipButton = el('button', {class:'text question-skip', type:'button'}, 'Otra pregunta');
      skipButton.addEventListener('click', () => { skip(); onChange(); });
      skipButton.disabled = state.exhausted;
      extras.append(skipButton);
    }
    if (state.exhausted && remaining()){
      const other = el('button', {class:'text', type:'button'}, 'Probar otro tipo');
      other.addEventListener('click', () => { if (otherFormat()) onChange(); });
      extras.append(other);
    }
    root.append(extras);
    return root;
  }
  return {bank, ensure, current, answer, answered, select, next, back, skip, otherFormat, mood, snapshot, restore, reset, closing, view};
})(window.PreguntasBanco || []);
