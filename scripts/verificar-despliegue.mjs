import {loadEnv} from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
const url = (env.VITE_SUPABASE_URL || '').trim();
const key = (env.VITE_SUPABASE_ANON_KEY || '').trim();
const errors = [];
try {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('url');
  }
} catch {
  errors.push('VITE_SUPABASE_URL debe ser la URL HTTPS del proyecto Supabase, sin rutas ni credenciales.');
}
if (!key) {
  errors.push('Falta VITE_SUPABASE_ANON_KEY: usa la clave pública publishable o anon.');
} else if (key.startsWith('sb_publishable_') && key.length > 'sb_publishable_'.length) {
  // La clave pública moderna no es un JWT y solo se envía en apikey.
} else {
  try {
    const parts = key.split('.');
    const claims = JSON.parse(Buffer.from(parts[1] || '', 'base64url').toString('utf8'));
    if (parts.length !== 3 || claims.role !== 'anon') throw new Error('key');
    if (claims.exp && claims.exp * 1000 <= Date.now()) throw new Error('expired');
  } catch {
    errors.push('VITE_SUPABASE_ANON_KEY debe ser publishable o un JWT anon vigente. No uses service_role ni claves secretas.');
  }
}
if (errors.length) {
  console.error('No se puede publicar con la configuración actual:\n' + errors.map(error => '- ' + error).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Variables públicas con formato válido. Esto no comprueba conexión, firma JWT, SQL ni configuración Auth.');
}
