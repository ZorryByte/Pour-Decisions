const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {runInNewContext}=require('node:vm');
const read=p=>readFileSync(resolve(__dirname,'..',p),'utf8');
const html=read('artifacts/antes-mvvm/index.html'),game=read('artifacts/antes-mvvm/juego.js');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);}
const oldSet=runInNewContext(`(function(state,value,checked){
  const sel=state.sel,MAX_PICK=5,STEPS=[{k:'fruta',multi:true}];let fruitAny=state.fruitAny;
  ${section(html,'function togglePick(','function option(')}
  const input={checked};togglePick('fruta',{v:value},input);state.fruitAny=fruitAny;return input.checked;
})`);
const oldAction=runInNewContext(`(function(state,value,setSelection,drag){
  let freshKey='';const why={hidden:true,textContent:''},document={getElementById:()=>why};
  const api={sel:state.sel,fruitAny:state.fruitAny,MAX_PICK:5,togglePick:(key,item,input)=>{input.checked=setSelection(state,item.v,input.checked);api.fruitAny=state.fruitAny;},persist(){}};
  function renderStage(){}function focusPick(){}
  ${section(game,'  function flip(','  function setSingle(')}
  ${section(game,'  function addFruit(','  function goBack(')}
  if(drag){addFruit(value);return freshKey!=='';}
  flip('fruta',value);return why.hidden?{status:'changed',added:freshKey==='f:'+value}:{status:'limit'};
})`);
const names=['Limón','Naranja','Piña','Mango','Maracuyá','Coco','Fresa','Sandía','Durazno','Menta'];
const stateFor=(initial,fruitAny)=>({sel:{fruta:new Set(initial),alcohol:new Set(['Ron'])},fruitAny});

test('Frutas conserva selección, retirada, límite y fruta indiferente para todas las combinaciones',async()=>{
  const {createFrutasViewModel}=await import('../src/features/juego-trivia/etapas/frutas/frutasViewModel.js');
  for(let mask=0;mask<1024;mask++)for(const any of [false,true]){
    const initial=names.filter((_,i)=>mask & (1<<i));
    for(const value of ['cualquiera',names[mask%names.length]])for(const checked of [false,true]){
      const before=stateFor(initial,any),state=stateFor(initial,any),vm=createFrutasViewModel({state,maxPick:5});
      assert.equal(vm.setSelection(value,checked),oldSet(before,value,checked));
      assert.deepEqual([...state.sel.fruta],[...before.sel.fruta]);assert.equal(state.fruitAny,before.fruitAny);
      assert.deepEqual([...state.sel.alcohol],['Ron']);
    }
  }
});

test('Los botones y el arrastre conservan sus diferencias, incluida fruta indiferente y el límite',async()=>{
  const {createFrutasViewModel}=await import('../src/features/juego-trivia/etapas/frutas/frutasViewModel.js');
  for(const initial of [[],['Piña'],names.slice(0,5),names])for(const any of [false,true]){
    for(const value of [...names,'cualquiera'])for(const drag of [false,true]){
      const before=stateFor(initial,any),state=stateFor(initial,any),vm=createFrutasViewModel({state,maxPick:5});
      assert.deepEqual(drag?vm.add(value):vm.toggle(value),JSON.parse(JSON.stringify(oldAction(before,value,oldSet,drag))));
      assert.deepEqual([...state.sel.fruta],[...before.sel.fruta]);assert.equal(state.fruitAny,before.fruitAny);
    }
  }
  const state=stateFor([],false),vm=createFrutasViewModel({state,maxPick:5});
  state.sel.fruta=new Set(['Mango']);assert.equal(vm.isSelected('Mango'),true);
  state.fruitAny=true;assert.equal(vm.isSelected('cualquiera'),true);assert.equal(vm.add('Piña'),false);
});

function gestureRun(source,modern,{moved=12,inside=true,selected=false,coarse=false,available=true}={}){
  const events=[],node={dataset:{},style:{},getAttribute:()=> 'Piña'};let listeners,dragLock=0;
  const root={querySelector:()=>({glass:true}),querySelectorAll:()=>[node]};
  const interact=()=>({draggable:options=>{listeners=options.listeners;}});
  const ctx={Date:{now:()=>1000},window:{interact,matchMedia:()=>({matches:coarse})},root,
    interactOn:()=>available,hit:()=>inside,resetFruitToken:()=>events.push('reset'),hasFruit:()=>selected,
    addFruit:value=>events.push(['add',value]),onToggle:value=>events.push(['toggle',value]),setDragLock:v=>{dragLock=v;}};
  if(modern){runInNewContext(source.replace('export function','function')+'\nbindFrutasGestures({root,interactOn,hit,resetFruitToken,hasFruit,addFruit,onToggle,setDragLock});',ctx);}
  else {
    runInNewContext(`const api={sel:{fruta:{has:hasFruit}}};let dragLock=0;
      function flip(key,value){onToggle(value);}
      ${source}
      bindFruit(root);globalThis.lock=()=>dragLock;`,ctx);
  }
  if(listeners){listeners.start({target:node});listeners.move({target:node,dx:moved,dy:0});listeners.end({target:node});}
  return {events,dataset:node.dataset,style:node.style,lock:modern?dragLock:ctx.lock(),bound:Boolean(listeners)};
}
test('Los gestos mantienen desplazamiento, umbral, detección, bloqueo de clic y dispositivos sin arrastre',()=>{
  const before=section(game,'  function bindFruit(','  function bindSwipe(');
  const after=read('src/features/juego-trivia/etapas/frutas/frutasGestos.js');
  for(const moved of [0,10,11,30])for(const inside of [false,true])for(const selected of [false,true]){
    const options={moved,inside,selected};assert.deepEqual(gestureRun(after,true,options),gestureRun(before,false,options));
  }
  for(const options of [{coarse:true},{available:false}])assert.deepEqual(gestureRun(after,true,options),gestureRun(before,false,options));
});
