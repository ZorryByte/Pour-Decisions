const {test} = require('node:test');
const assert = require('node:assert/strict');
test('Compartir exporta solo bebida e invitación, sin respuestas ni datos de cuenta', async () => {
  const {datosParaCompartir} = await import('../src/features/juego-trivia/views/compartirCoctel.js');
  const api = {current:{n:'Piña colada',d:'Tropical'},sel:{alcohol:new Set(['Ron']),fruta:new Set(['Piña','Coco']),sabor:new Set(['Dulce']),fuerza:new Set(['Medio']),alergia:new Set(['privado'])},badgeAnswers:[{questionId:9,optionIndex:0}],persona:{nombre:'privado',contacto:'privado'}};
  const data = datosParaCompartir(api,'https://ejemplo.com/jugar?evento=fiesta&token=privado#perfil');
  assert.equal(data.url,'https://pourdecisions-zorry.vercel.app/?evento=fiesta');
  assert.equal(datosParaCompartir(api,'http://localhost:5173/').url,'https://pourdecisions-zorry.vercel.app/');
  assert(!JSON.stringify(data).includes('privado'));
  assert.deepEqual(data.estadisticas,[['Base','Ron'],['Fruta','Piña · Coco'],['Estilo','Dulce'],['Intensidad','Medio']]);
  api.sel.alcohol = new Set(['Sin alcohol']);api.fruitAny=true;
  assert.deepEqual(datosParaCompartir(api,'https://ejemplo.com/').estadisticas.slice(1),[['Fruta','Cualquiera'],['Estilo','Dulce'],['Intensidad','Sin alcohol']]);
});
