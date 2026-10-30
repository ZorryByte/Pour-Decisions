// Las claves publishable identifican la aplicación; solo una sesión es un JWT de usuario.
export function supabaseHeaders(key, accessToken) {
  const publicKey = key.trim();
  const headers = {apikey: publicKey};
  if (accessToken || !publicKey.startsWith('sb_publishable_')) {
    headers.Authorization = 'Bearer ' + (accessToken || publicKey);
  }
  return headers;
}
