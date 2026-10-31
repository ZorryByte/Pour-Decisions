// Se comparte una imagen local: nunca respuestas, restricciones ni datos de cuenta.
export function datosParaCompartir(api, href = location.href){
  const url = new URL('https://pourdecisions-zorry.vercel.app/');
  const evento = new URL(href).searchParams.get('evento');
  if (evento) url.searchParams.set('evento', evento);
  const sinAlcohol = api.sel.alcohol.has('Sin alcohol');
  return {
    nombre: api.current.n,
    descripcion: api.current.d,
    url: url.href,
    texto: 'Mira, soy un ' + api.current.n + '. ¿Quieres saber cuál es tu cóctel? Entra aquí:',
    estadisticas: [
      ['Base', [...api.sel.alcohol].join(' · ')],
      ['Fruta', api.fruitAny ? 'Cualquiera' : ([...api.sel.fruta].join(' · ') || 'Sin fruta')],
      ['Estilo', [...api.sel.sabor].join(' · ') || 'Sin preferencia'],
      ['Intensidad', sinAlcohol ? 'Sin alcohol' : ([...api.sel.fuerza].join(' · ') || 'Sin preferencia')]
    ]
  };
}

function escribir(ctx, text, x, y, width, size, family, color, lineHeight){
  ctx.font = size + 'px ' + family;
  ctx.fillStyle = color;
  let line = '';
  const words = [];
  for (const word of text.split(/\s+/)){
    let part = '';
    for (const char of word){
      if (part && ctx.measureText(part + char).width > width){words.push(part); part = '';}
      part += char;
    }
    words.push(part);
  }
  for (const word of words){
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > width){
      ctx.fillText(line, x, y); y += lineHeight; line = word;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

export async function crearImagenCoctel(datos, glass){
  // Materializa el estilo del personaje existente para que el PNG no dependa del CSS.
  const svg = glass.cloneNode(true);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', '480'); svg.setAttribute('height', '510');
  const color = glass.style.getPropertyValue('--drink-color') || '#dda15e';
  const paints = {cream:'#fffdf0', amber:color, olive:'#606c38', ink:'#283618', crystal:'#fffdf0'};
  for (const [name, fill] of Object.entries(paints)){
    svg.querySelectorAll('.' + name).forEach(node => {
      node.setAttribute('fill', fill);
      if (name === 'crystal' || name === 'cream'){
        node.setAttribute('stroke', '#606c38'); node.setAttribute('stroke-width', name === 'crystal' ? '1.2' : '.65');
      }
    });
  }
  svg.querySelectorAll('.glass-shine').forEach(node => {
    node.setAttribute('stroke', '#fffdf0'); node.setAttribute('stroke-width', '2'); node.setAttribute('fill', 'none');
  });
  const source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], {type:'image/svg+xml'}));
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {image.onload = resolve; image.onerror = reject; image.src = source;});
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 2200;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.fillStyle = '#283618'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    let y = escribir(ctx, 'Mira, soy un', 72, 104, 936, 36, '"DM Sans", sans-serif', '#fefae0', 48);
    y = escribir(ctx, datos.nombre, 72, y + 18, 936, 76, 'Fraunces, serif', '#dda15e', 84);
    ctx.drawImage(image, 300, y + 8, 480, 470);
    y += 510;
    escribir(ctx, 'Así lo elegí', 72, y, 936, 36, '"DM Sans", sans-serif', '#fefae0', 44);
    y += 56;
    for (const [label, value] of datos.estadisticas){
      escribir(ctx, label, 72, y, 200, 28, '"DM Sans", sans-serif', '#dda15e', 34);
      y = escribir(ctx, value, 288, y, 720, 30, '"DM Sans", sans-serif', '#fefae0', 38) + 18;
    }
    const output = document.createElement('canvas');
    output.width = 1080; output.height = Math.max(1080, y + 72);
    output.getContext('2d').drawImage(canvas, 0, 0);
    const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('No se pudo crear el PNG');
    return new File([blob], 'mi-coctel-' + datos.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png', {type:'image/png'});
  } finally { URL.revokeObjectURL(source); }
}

export function compartirCoctel(api){
  const datos = datosParaCompartir(api);
  const wrap = api.el('section', {class:'block result-share'});
  const btn = api.el('button', {class:'btn', type:'button', disabled:true}, 'Preparando imagen…');
  const download = api.el('button', {class:'text', type:'button', disabled:true}, 'Descargar imagen');
  const copy = api.el('button', {class:'text', type:'button'}, 'Copiar invitación');
  const status = api.el('p', {class:'share-note', id:'share-status', role:'status'});
  const preview = api.el('details', {class:'share-preview'});
  preview.append(api.el('summary', {}, 'Ver imagen para compartir'));
  let file = null, busy = false;
  const full = datos.texto + ' ' + datos.url;
  async function copiar(){
    try {
      await navigator.clipboard.writeText(full);
      status.textContent = 'Invitación copiada. Pégala junto con la imagen.';
    } catch {
      const box = api.el('textarea', {readonly:true, 'aria-label':'Invitación para copiar'});
      box.value = full; status.replaceChildren(box); box.focus(); box.select();
    }
  }
  function descargar(){
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = api.el('a', {href:url, download:file.name});
    wrap.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = 'Imagen descargada. Copia la invitación para enviarla con el enlace.';
  }
  copy.addEventListener('click', copiar);
  download.addEventListener('click', descargar);
  btn.addEventListener('click', async () => {
    if (busy || !file) return;
    busy = true; btn.disabled = true;
    try {
      // El archivo ya está listo: share conserva la activación del clic.
      if (navigator.share && navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file], title:'Soy un ' + datos.nombre, text:full});
        status.textContent = 'Tu cóctel se entregó a la aplicación que elegiste.';
      } else {
        preview.open = true;
        status.textContent = 'Descarga la imagen y copia la invitación para enviarlas por tu aplicación favorita.';
      }
    } catch (error){
      if (error?.name === 'AbortError') status.textContent = 'No se compartió. Puedes volver a intentarlo.';
      else { preview.open = true; status.textContent = 'No se pudo abrir el menú. Descarga la imagen y copia la invitación.'; }
    } finally {busy = false; btn.disabled = false;}
  });
  wrap.append(btn, api.el('div', {class:'actions share-actions'}, download, copy), preview, status);
  async function preparar(){
    btn.disabled = true; btn.textContent = 'Preparando imagen…';
    try {
      file = await crearImagenCoctel(datos, api.glass(api.current, true));
      const reader = new FileReader();
      const src = await new Promise((resolve, reject) => {reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);});
      preview.querySelector('img')?.remove();
      preview.append(api.el('img', {src, alt:'Mi cóctel: ' + datos.nombre + '. ' + datos.estadisticas.map(row => row.join(': ')).join('. ')}));
      btn.textContent = 'Compartir mi cóctel'; btn.disabled = false; download.disabled = false;
    } catch {
      btn.disabled = false; btn.textContent = 'Reintentar imagen';
      status.textContent = 'No pudimos crear la imagen. Vuelve a intentar o copia la invitación.';
      btn.onclick = () => {if (!file) void preparar();};
    }
  }
  void preparar();
  return wrap;
}
