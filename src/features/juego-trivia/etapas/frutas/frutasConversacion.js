export function ritmoPalabras(texto){
  let elapsed=180;
  const beats=texto.trim().split(/\s+/).filter(Boolean).map((word,i)=>{
    const length=Math.min(250,115+word.length*11);
    const beat={word,at:elapsed,length,angle:(i%2?1:-1)*(1.7+i%3*.4)};
    elapsed+=length+(/[.!?…]$/.test(word)?220:/[,;:]$/.test(word)?130:45);
    return beat;
  });
  return {beats,duration:elapsed+180};
}
export function tiempoLectura(texto){
  const palabras=texto.trim().split(/\s+/).filter(Boolean).length;
  const pausas=(texto.match(/[.!?…]/g)||[]).length*220+(texto.match(/[,;:]/g)||[]).length*110;
  return Math.max(2600,900+palabras*320+pausas,ritmoPalabras(texto).duration+800);
}

// Un solo reloj para los dos personajes. Una interrupción reemplaza los turnos
// pendientes, pero deja terminar el tiempo de lectura de la frase visible.
export function createConversacion({show,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}){
  let pending=[],timer=null,until=0,complete=null,disposed=false;
  function tick(){
    timer=null;if(disposed)return;
    if(pending.length){
      const [speaker,text]=pending.shift();show(speaker,text);until=now()+tiempoLectura(text);
      timer=schedule(tick,tiempoLectura(text));
    }else{const done=complete;complete=null;done?.();}
  }
  return {
    play(lines,onComplete){
      if(disposed)return;pending=lines.slice();complete=onComplete||null;
      if(timer!==null)cancel(timer);
      const remaining=Math.max(0,until-now());
      if(remaining)timer=schedule(tick,remaining);else tick();
    },
    cutAfterCurrent(){pending=[];complete=null;},
    dispose(){disposed=true;pending=[];complete=null;if(timer!==null)cancel(timer);}
  };
}
