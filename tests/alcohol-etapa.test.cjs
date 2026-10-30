const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {runInNewContext}=require('node:vm');
const read=p=>readFileSync(resolve(__dirname,'..',p),'utf8');
const html=read('artifacts/antes-mvvm/index.html'),game=read('artifacts/antes-mvvm/juego.js');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);}
const oldSet=runInNewContext(`(function(sel,value,checked){
  const MAX_PICK=5,STEPS=[{k:'alcohol',multi:true}];
  ${section(html,'function togglePick(','function option(')}
  const input={checked};togglePick('alcohol',{v:value},input);return input.checked;
})`);
const oldToggle=runInNewContext(`(function(sel,value,setSelection){
  let freshKey='',fruitAny=false;
  const why={hidden:true,textContent:''};
  const document={getElementById:()=>why};
  const api={sel,MAX_PICK:5,togglePick:(key,item,input)=>{input.checked=setSelection(sel,item.v,input.checked);},persist(){}};
  function renderStage(){}function focusPick(){}
  ${section(game,'  function flip(','  function setSingle(')}
  flip('alcohol',value);
  return why.hidden?{status:'changed',added:freshKey==='a:'+value}:{status:'limit'};
})`);
const names=['Ron','Vodka','Ginebra','Tequila','Whisky','Brandy','Sin alcohol'];
const selections=initial=>({alcohol:new Set(initial),fruta:new Set(['Piña']),sabor:new Set(['Dulce']),fuerza:new Set(['Suave']),alergia:new Set(['ninguna']),plan:new Set()});

test('El recorrido sencillo conserva selección, retirada, exclusiones y límite para todas las combinaciones de bases',async()=>{
  const {createAlcoholViewModel}=await import('../src/features/juego-trivia/etapas/alcohol/alcoholViewModel.js');
  for(let mask=0;mask<128;mask++)for(const value of names)for(const checked of [true,false]){
    const initial=names.filter((_,i)=>mask & (1<<i)),before=selections(initial),state={sel:selections(initial)};
    const vm=createAlcoholViewModel({state,maxPick:5}),shared=state.sel.alcohol;
    assert.equal(vm.setSelection(value,checked),oldSet(before,value,checked));
    assert.deepEqual([...state.sel.alcohol],[...before.alcohol]);assert.strictEqual(state.sel.alcohol,shared);
    assert.deepEqual([...state.sel.fruta],['Piña']);assert.deepEqual([...state.sel.sabor],['Dulce']);
  }
});

test('Los botones conservan el orden anterior de límite y exclusión, incluido Sin alcohol con cinco bases',async()=>{
  const {createAlcoholViewModel}=await import('../src/features/juego-trivia/etapas/alcohol/alcoholViewModel.js');
  for(let mask=0;mask<128;mask++)for(const value of names){
    const initial=names.filter((_,i)=>mask & (1<<i)),before=selections(initial),state={sel:selections(initial)};
    const vm=createAlcoholViewModel({state,maxPick:5});
    const expected=oldToggle(before,value,oldSet);
    assert.deepEqual(vm.toggle(value),JSON.parse(JSON.stringify(expected)));
    assert.deepEqual([...state.sel.alcohol],[...before.alcohol]);
    assert.equal(vm.isSelected(value),before.alcohol.has(value));
  }
});

test('El ViewModel lee la partida compartida después de recuperar o limpiar las selecciones',async()=>{
  const {createAlcoholViewModel}=await import('../src/features/juego-trivia/etapas/alcohol/alcoholViewModel.js');
  const state={sel:selections(['Ron'])},vm=createAlcoholViewModel({state,maxPick:5});
  state.sel.alcohol=new Set(['Vodka']);assert.equal(vm.isSelected('Ron'),false);assert.equal(vm.isSelected('Vodka'),true);
  state.sel.alcohol.clear();assert.equal(vm.isSelected('Vodka'),false);
  vm.toggle('Sin alcohol');vm.toggle('Whisky');assert.deepEqual([...state.sel.alcohol],['Whisky']);
});
