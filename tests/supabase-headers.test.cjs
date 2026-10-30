const test = require('node:test');
const assert = require('node:assert/strict');

test('Publishable se envía en apikey y no como JWT anónimo', async () => {
  const {supabaseHeaders} = await import('../src/shared/infrastructure/supabaseHeaders.js');
  assert.deepEqual(supabaseHeaders(' sb_publishable_example '), {apikey:'sb_publishable_example'});
  assert.deepEqual(supabaseHeaders('legacy-anon'), {apikey:'legacy-anon', Authorization:'Bearer legacy-anon'});
});

test('Las sesiones conservan su JWT al usar una clave publishable', async () => {
  const {supabaseHeaders} = await import('../src/shared/infrastructure/supabaseHeaders.js');
  assert.deepEqual(supabaseHeaders('sb_publishable_example', 'user-jwt'), {
    apikey:'sb_publishable_example', Authorization:'Bearer user-jwt'
  });
});

test('El transporte de cuentas permite OTP con publishable y consultas con sesión', async () => {
  const {createCuentaModel} = await import('../src/features/auth-cuenta/models/cuentaModel.js');
  const calls = [];
  const model = createCuentaModel({
    url:'https://example.supabase.co', key:'sb_publishable_example',
    getSession:() => ({access_token:'user-jwt', user:{id:'person-a'}, expires_at:Math.floor(Date.now()/1000)+3600}),
    saveSession:() => {}, onSessionExpired:() => {},
    fetcher:async (url, options) => {calls.push({url, options}); return new Response(JSON.stringify([]));}
  });
  await model.requestCode('a@example.test');
  assert.equal(calls[0].options.headers.apikey, 'sb_publishable_example');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  await model.loadAccount();
  assert(calls.slice(1).every(call => call.options.headers.Authorization === 'Bearer user-jwt'));
});
