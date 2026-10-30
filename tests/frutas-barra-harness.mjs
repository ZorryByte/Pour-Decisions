// Monta la misma vista y el mismo ViewModel sin depender del arranque que edita otro chat.
export const frutasHarnessHtml=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/shared/styles/base.css"><link rel="stylesheet" href="/src/features/juego-trivia/views/vaso-dialogo.css"><body class="flow"><main id="app"></main><script type="module">
import '/src/features/juego-trivia/views/juego.js';
import {createFrutasBarra} from '/src/features/juego-trivia/etapas/frutas/frutasBarra.js';
import {createFrutasViewModel} from '/src/features/juego-trivia/etapas/frutas/frutasViewModel.js';
import {createEstadoPartida} from '/src/features/juego-trivia/partida/estadoPartida.js';
import {fruitGlyphMarkup} from '/src/features/juego-trivia/views/arteFrutas.js';
import {liquidColor} from '/src/features/juego-trivia/vaso/calculosVaso.js';
const partida=createEstadoPartida(),app=document.querySelector('#app');let scene;
function el(tag,attrs={},...kids){const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(v===false||v==null)continue;if(k==='class')n.className=v;else n.setAttribute(k,v);}for(const k of kids.flat()){if(k!=null)n.append(k instanceof Node?k:String(k));}return n;}
function icon(name){const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 32 32');n.setAttribute('class','fruit-icon');n.innerHTML=fruitGlyphMarkup(name,16,17,.95,'',false);return n;}
const groups=[{o:[{v:'cualquiera',t:'La que sea'}]},{o:['Limón','Naranja']},{o:['Piña','Mango','Maracuyá','Coco']},{o:['Fresa','Sandía','Durazno','Menta']}];
const vm=createFrutasViewModel({state:partida,maxPick:5});
Juego.init({sel:partida.sel,styleDecisions:{},styleTaste:'',styleTexture:'',fruitAny:false});
function render(){scene?.destroy();if(partida.step!==1){app.replaceChildren(el('h1',{},'Siguiente etapa'));return;}scene=createFrutasBarra({el,groups,asItem:x=>typeof x==='string'?{v:x,t:x}:x,viewModel:vm,selected:()=>partida.sel.fruta,bases:[...partida.sel.alcohol],any:()=>partida.fruitAny,maxPick:5,fruitIconNode:icon,glassBuild:()=>Juego.heroGlass(),color:()=>liquidColor(partida.sel),onChange(){},onNext(){partida.step=2;render();},onBack(){partida.step=0;render();}});app.replaceChildren(el('div',{class:'quiz stage step-1'},scene.node));}
window.__barra={partida,render,abrir(){partida.step=1;partida.sel.alcohol=new Set(['Ron']);render();}};
</script></body></html>`;
