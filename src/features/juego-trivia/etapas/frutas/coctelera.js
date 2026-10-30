import {gsap} from 'gsap';

let sequence=0;
export function cocteleraMarkup(){
  const id='barra-metal-'+(++sequence);
  return `<svg viewBox="0 0 220 310" aria-hidden="true">
    <defs>
      <linearGradient id="${id}"><stop stop-color="#60705d"/><stop offset=".14" stop-color="#a5b09a"/><stop offset=".28" stop-color="#ecedda"/><stop offset=".39" stop-color="#c5ccb6"/><stop offset=".64" stop-color="#85957b"/><stop offset=".85" stop-color="#b8c3aa"/><stop offset="1" stop-color="#65745e"/></linearGradient>
      <linearGradient id="${id}-rim" x2="0" y2="1"><stop stop-color="#f4f2dc"/><stop offset=".45" stop-color="#b2bda4"/><stop offset="1" stop-color="#66785c"/></linearGradient>
      <linearGradient id="${id}-cap"><stop stop-color="#697960"/><stop offset=".32" stop-color="#e5e8d0"/><stop offset=".58" stop-color="#acb99e"/><stop offset="1" stop-color="#5e7055"/></linearGradient>
    </defs>
    <g class="shaker-whole">
      <path d="M56 84Q56 80 61 80H159Q164 80 164 84L148 266Q146 278 110 280Q74 278 72 266Z" fill="url(#${id})" stroke="#d3dbc0" stroke-width="1.1"/>
      <path d="M67 98L79 253" stroke="#f8f5df" stroke-opacity=".67" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M72 98L84 246M151 99L139 257" stroke="#f8f5df" stroke-opacity=".17" stroke-width="1" stroke-linecap="round"/>
      <path d="M73 260Q110 273 147 260L146 268Q110 281 74 268Z" fill="#425a3a" fill-opacity=".27"/>
      <path d="M75 267Q110 278 145 267" stroke="#e3e7cc" stroke-opacity=".67" fill="none" stroke-width="1.2"/>
      <ellipse cx="110" cy="84" rx="54" ry="6.5" fill="#34482c" stroke="url(#${id}-rim)" stroke-width="2.5"/>
      <ellipse cx="110" cy="84" rx="49" ry="3.8" fill="#1c2d17" fill-opacity=".75"/>
      <g class="shaker-lid">
        <path d="M56 82Q58 65 72 55Q88 44 110 44Q132 44 148 55Q162 65 164 82L162 87Q110 94 58 87Z" fill="url(#${id})" stroke="#d0d9bd" stroke-width="1.1"/>
        <path d="M69 69Q82 50 106 49" fill="none" stroke="#fefae0" stroke-opacity=".5" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M59 82Q110 89 161 82" fill="none" stroke="#eef0d9" stroke-width="1.3" stroke-opacity=".8"/>
        <path d="M60 86Q110 93 160 86" fill="none" stroke="#3c5334" stroke-width="2" stroke-opacity=".7"/>
        <ellipse cx="110" cy="45" rx="20" ry="3.2" fill="#34482c" stroke="#c3ceb0" stroke-width="1"/>
        <g class="shaker-cap">
          <path d="M91 25Q91 20 110 20Q129 20 129 25L131 44Q110 50 89 44Z" fill="url(#${id}-cap)" stroke="#d8dfc4" stroke-width="1"/>
          <ellipse cx="110" cy="25" rx="19" ry="4" fill="url(#${id}-rim)" stroke="#e7e9d2" stroke-width=".8"/>
          <path d="M96 30v10" stroke="#fefae0" stroke-width="1.6" stroke-opacity=".65" stroke-linecap="round"/>
        </g>
      </g>
    </g>
  </svg>`;
}

// GSAP secuencia la tapa: despegar, apartar y apoyar; al cerrar, alinear y encajar.
export function createCocteleraMotion(button,{reduced=false}={}){
  const lid=button.querySelector('.shaker-lid'),cap=button.querySelector('.shaker-cap');
  let timeline=null,open=false,capOpen=false,disposed=false;
  gsap.set(lid,{svgOrigin:'110 84'});gsap.set(cap,{svgOrigin:'110 44'});
  button.dataset.lid='closed';button.dataset.cap='closed';
  function move(kind,wanted,done=()=>{}){
    if(disposed)return;
    const whole=kind==='lid',node=whole?lid:cap,current=whole?open:capOpen;
    const interrupted=['opening','closing'].includes(button.dataset[kind]);
    timeline?.kill();
    const finish=()=>{if(disposed)return;if(whole)open=wanted;else capOpen=wanted;button.dataset[kind]=wanted?'open':'closed';done();};
    if(current===wanted&&!interrupted){finish();return;}
    button.dataset[kind]=wanted?'opening':'closing';
    if(reduced){gsap.set(node,wanted?(whole?{x:62,y:166,rotation:16}:{x:42,y:38,rotation:20}):{x:0,y:0,rotation:0});finish();return;}
    timeline=gsap.timeline({onComplete:finish});
    if(wanted){
      timeline.to(node,{y:whole?-24:-12,rotation:-2,duration:.2,ease:'power2.out'})
        .to(node,whole?{x:62,y:166,rotation:16,duration:.48,ease:'power3.inOut'}:{x:42,y:38,rotation:20,duration:.32,ease:'power2.inOut'});
    }else{
      timeline.to(node,{x:0,y:whole?-22:-10,rotation:0,duration:.4,ease:'power3.inOut'})
        .to(node,{y:0,duration:.2,ease:'power2.in'})
        .to(node,{y:.7,duration:.07,ease:'sine.out'})
        .to(node,{y:0,duration:.1,ease:'sine.out'});
    }
  }
  return {open:done=>move('lid',true,done),close:done=>move('lid',false,done),openCap:done=>move('cap',true,done),closeCap:done=>move('cap',false,done),destroy(){disposed=true;timeline?.kill();gsap.killTweensOf([lid,cap]);}};
}
