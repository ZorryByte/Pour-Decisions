import {PASES, MOTIVOS, motivosPara} from './restriccionesDatos.js';
import './restricciones.css';

const atlas = new URL('../../../../assets/inspeccion-ingredientes-simple.png', import.meta.url).href;

// La Vista solo dibuja y delega acciones. El ViewModel conserva todas las decisiones.
export function createRestriccionesView({el, viewModel:vm, onChange, onNext, onBack, entrance = true}){
  const root = el('section', {class:'vip-inspection', 'aria-labelledby':'stage-q'});
  vm.ensure();
  let active = PASES.find(p => !vm.snapshot().decisiones[p.id])?.id || null;
  let choosingReason = false, last = null;
  let opening = entrance, presented = null;

  function portrait(p, className){
    const figure = el('span', {class:'vip-character ' + (className || ''), 'aria-hidden':'true'});
    figure.style.backgroundImage = `url("${atlas}")`;
    figure.style.backgroundPosition = `${p.sprite % 3 * 50}% ${Math.floor(p.sprite / 3) * 50}%`;
    return figure;
  }
  function button(text, className, action, attrs = {}){
    const b = el('button', {type:'button', class:className, ...attrs}, text);
    b.addEventListener('click', action); return b;
  }
  function changed(focus = '.vip-approve'){
    onChange(); draw();
    root.querySelector(focus)?.focus({preventScroll:true});
  }
  function decide(value){
    const previousIndex = PASES.findIndex(p => p.id === active);
    const reviewing = Boolean(vm.snapshot().decisiones[active]);
    if (!active || !vm.decide(active,value)) return;
    last = {p:PASES.find(p => p.id === active), approved:value === 'aprobado'};
    active = PASES.find(p => !vm.snapshot().decisiones[p.id])?.id || (reviewing ? PASES[previousIndex + 1]?.id : null) || null;
    choosingReason = false;
    changed(active ? '.vip-approve' : '.vip-next');
  }
  function draw(){
    const data = vm.snapshot(), reviewed = Object.keys(data.decisiones).length;
    const p = PASES.find(p => p.id === active);
    const pending = PASES.filter(item => !data.decisiones[item.id] && item.id !== active);
    const arriving = Boolean(p && presented !== p.id);
    presented = p?.id || null;
    const intro = el('header', {class:'vip-intro'},
      el('h1', {id:'stage-q'}, 'Ahora te toca la puerta.'),
      el('p', {}, 'Ya conociste tus gustos. Tu siguiente turno: cuidar quién entra a tu cóctel. Deja fuera lo que necesitas evitar.'),
    );
    const checkpoint = el('div', {class:'vip-checkpoint' + (arriving ? ' is-arriving' : '') + (opening ? ' is-opening' : '')});
    if (opening){
      checkpoint.append(el('div', {class:'vip-shift', 'aria-hidden':'true'},
        el('h2', {}, 'De las citas… a tu primer turno.'),
        el('p', {}, 'La puerta de tu cóctel queda en tus manos.'),
        el('span', {class:'vip-shift-seal'}, 'TURNO ABIERTO')));
      opening = false;
    }
    const window = el('div', {class:'vip-window'});
    window.append(el('div', {class:'vip-sign'}, 'Club de tu cóctel'),
      el('p', {class:'vip-counter'}, `${reviewed} de ${PASES.length} pases revisados`));
    const queue = el('div', {class:'vip-queue', 'aria-label':'Siguiente ingrediente'});
    if (pending[0]) queue.append(portrait(pending[0],'vip-waiting'), el('span', {}, 'Sigue: ' + pending[0].nombre));
    window.append(queue);
    if (p){
      window.append(el('p', {class:'vip-call','aria-hidden':'true'}, last ? '¡Siguiente!' : 'Primer pase, por favor.'));
      window.append(el('p', {class:'vip-dialogue'}, '«' + p.frase + '»'), portrait(p,'vip-visitor'));
    } else {
      window.append(el('div', {class:'vip-end'}, el('h2', {}, 'Lista revisada.'), el('p', {}, 'Tus decisiones acompañarán la búsqueda de tu cóctel.')));
    }
    if (last){
      window.append(portrait(last.p,'vip-departing ' + (last.approved ? 'is-approved' : 'is-denied')));
      const receipt = el('div', {class:'vip-last ' + (last.approved ? 'is-approved' : 'is-denied'), role:'status'},
        el('strong', {}, last.approved ? 'APROBADO' : 'NO ENTRA'), el('span', {}, last.p.nombre));
      window.append(receipt);
    }
    checkpoint.append(window);
    const desk = el('div', {class:'vip-desk'});
    if (p){
      const pass = el('article', {class:'vip-pass', 'aria-labelledby':'vip-name'});
      pass.append(el('div', {class:'vip-pass-top'}, el('span', {}, 'Pase de ingrediente'), el('span', {}, 'VIP')),
        el('div', {class:'vip-pass-body'}, portrait(p,'vip-photo'), el('div', {},
          el('h2', {id:'vip-name'}, p.nombre), el('p', {}, p.detalle))));
      if (choosingReason){
        pass.append(el('strong', {class:'vip-verdict'}, 'NO ENTRA'), el('p', {class:'vip-reason-label', id:'vip-reason-label'}, '¿Qué debemos anotar?'));
        const reasons = el('div', {class:'vip-reasons', role:'group','aria-labelledby':'vip-reason-label'});
        for (const reason of motivosPara(p.id)) reasons.append(button(MOTIVOS[reason], 'vip-reason', () => decide(reason), {'data-reason':reason}));
        pass.append(reasons, button('Volver a los sellos', 'vip-link', () => { choosingReason = false; changed(); }));
      } else {
        const stamps = el('div', {class:'vip-stamps'});
        stamps.append(button('NO ENTRA', 'vip-stamp vip-deny', () => {choosingReason = true; changed('.vip-reason');}, {'aria-label':'No entra: ' + p.nombre}),
          button('APROBADO', 'vip-stamp vip-approve', () => decide('aprobado'), {'aria-label':'Aprobar: ' + p.nombre}));
        pass.append(stamps, el('p', {class:'vip-pass-note'}, 'Aprobado = no necesito excluirlo. No lo añade a la receta.'));
      }
      desk.append(pass);
    } else desk.append(el('div', {class:'vip-complete-note'},
      el('p', {}, 'Tu turno está completo.'),
      button('Revisar mis pases', 'vip-link vip-review', () => {active = PASES[0].id; choosingReason = false; last = null; changed();})));
    checkpoint.append(desk);

    const tools = el('div', {class:'vip-tools'});
    const currentIndex = PASES.findIndex(item => item.id === active);
    if (currentIndex > 0) tools.append(button('Pase anterior', 'vip-link vip-previous', () => {
      active = PASES[currentIndex - 1].id; choosingReason = false; last = null; changed();
    }));
    // Solo se conserva el editor al recuperar una anotación anterior, para poder corregirla.
    const otherBox = el('div', {id:'vip-other-box',class:'vip-other-box'}); otherBox.hidden = !data.otra;
    const other = el('input', {id:'vip-other',type:'text',maxlength:'240',value:data.otra,placeholder:'Ej.: fresa, pescado, mariscos…'});
    otherBox.append(el('label', {for:'vip-other'}, '¿Qué más necesitas dejar fuera?'), other,
      el('p', {}, 'Esta anotación requiere revisión antes de recomendar una receta.'));
    other.addEventListener('input', () => {vm.setOther(other.value); onChange(); syncNext();});
    if (!Object.values(data.decisiones).some(d => d !== 'aprobado') && !data.otra){
      tools.append(button('No tengo restricciones: aprobar todos', 'vip-link vip-all', () => {
        vm.approveAll(); active = null; last = null; choosingReason = false; changed('.vip-next');
      }));
    }
    const footer = el('div', {class:'vip-footer'});
    const notice = el('p', {class:'vip-notice',id:'why',role:'status'});
    const next = button('Lista completa, seguir', 'btn next vip-next', () => {
      if (vm.complete() && !vm.snapshot().otra) onNext(); else {notice.hidden = false; notice.focus();}
    }, {'aria-describedby':'why'});
    function syncNext(){
      const unknown = vm.snapshot().otra;
      const off = !vm.complete() || Boolean(unknown);
      next.setAttribute('aria-disabled',String(off)); next.classList.toggle('is-off',off);
      notice.textContent = unknown ? 'Tu otra restricción necesita revisión con quien prepara las bebidas. Por ahora no podemos recomendarte una receta. Conservamos tus elecciones.' : !vm.complete() ? 'Revisa los pases pendientes o indica que no tienes restricciones.' : 'Las exclusiones se aplicarán a las recetas. Quien prepara debe revisar etiquetas y contacto entre ingredientes.';
      notice.hidden = false;
    }
    syncNext();
    footer.append(notice, el('div', {class:'actions'},next,button('Atrás','text',onBack)));
    root.replaceChildren(intro, checkpoint, tools, otherBox, footer);
  }
  draw(); return root;
}
