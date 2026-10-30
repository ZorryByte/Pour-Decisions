const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let reduced = false;
const animations = [];
const animate = (frames, timing) => {
  const animation = {frames, timing, cancelled:false, cancel(){ this.cancelled = true; }};
  animations.push(animation);
  return animation;
};
const context = vm.createContext({
  window:{matchMedia:() => ({matches:reduced})},
  document:{createTextNode:text => ({textContent:text})}
});
let source = fs.readFileSync(path.join(__dirname, '..', 'src/features/juego-trivia/views/juego.js'), 'utf8');
source = source.replace(/^import[^\n]*\n/gm,'');
source = source.replace('    init: init,',
  '    _test: {speakStage:speakStage, stop:stopStageSpeech, setApi:function(value){api=value;}},\n    init: init,');
vm.runInContext(source, context);
const speech = context.window.Juego._test;
speech.setApi({el(tag, attrs, text){ return {textContent:text, style:{setProperty(){}}}; }});
const glass = {animate, querySelector:() => ({animate})};
function line(text){
  return {
    textContent:text, children:[], attrs:{},
    setAttribute(key,value){this.attrs[key]=value;},
    removeAttribute(key){delete this.attrs[key];},
    replaceChildren(){this.children=[];},
    append(child){this.children.push(child);}
  };
}
const text = 'Ah, ron… Bueno, pensé que hoy tomarías tranquilo, pero bueno…';
const first = line(text);
speech.speakStage(first, glass, 'ron-1');
assert.equal(first.attrs['aria-label'], text, 'Full phrase remains accessible during reveal');
assert.equal(first.children.map(child => child.textContent).join(''), text);
assert.equal(animations.length, 2, 'Glass and liquid speak together');
assert.equal(animations[0].frames.at(-1).transform, 'none', 'Glass returns to rest');
assert.ok(animations.every(animation => Number.isFinite(animation.timing.duration)));
speech.stop();
assert.ok(animations.every(animation => animation.cancelled), 'A new selection cancels the old speech');
speech.speakStage(line(text), glass, 'ron-1');
assert.equal(animations.length, 2, 'An unchanged rerender does not restart speech');
reduced = true;
const quiet = line('¿Tequila? Bueno… ¿No que hoy te ibas temprano?');
speech.speakStage(quiet, glass, 'tequila-1');
assert.equal(animations.length, 2, 'Reduced motion keeps the glass still');
assert.equal(quiet.children.length, 0, 'Reduced motion displays complete text immediately');
reduced = false;
const fallback = line(text);
speech.speakStage(fallback, {querySelector:() => null}, 'fallback');
assert.equal(fallback.children.length, 0, 'No animation API still leaves full text visible');
console.log('OK: synchronized speech, full accessible text, cancellation, stable rerenders, reduced motion and no-animation fallback.');
