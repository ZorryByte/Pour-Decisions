exports.setup = async function(){
  const {createEstadoPartida} = await import('../../src/features/juego-trivia/partida/estadoPartida.js');
  const {createPartidaViewModel} = await import('../../src/features/juego-trivia/partida/partidaViewModel.js');
  const {etapasPartida:steps} = await import('../../src/features/juego-trivia/partida/etapasPartida.js');
  const {createRestriccionesViewModel} = await import('../../src/features/juego-trivia/etapas/restricciones/restriccionesViewModel.js');
  const state = createEstadoPartida();
  let results = [{n:'Mojito'}], previous = false;
  const restriccionesVM = createRestriccionesViewModel({state});
  const vm = createPartidaViewModel({state, steps, ranked:() => results, backQuestion:() => previous, restriccionesVM});
  return {state, vm, steps, restriccionesVM,
    results(value){ results = value; }, previous(value){ previous = value; },
    fill(){
      state.sel.sabor.add('Dulce'); state.sel.alcohol.add('Ron'); state.sel.fuerza.add('Medio'); state.sel.plan.add('playa');
      steps.find(stage => stage.k === 'sabor').groups[0].o.forEach(name => {state.styleDecisions[name] = false;});
      restriccionesVM.approveAll();
    },
  };
};
