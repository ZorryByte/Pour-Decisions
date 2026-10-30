import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
  // Exponer exclusivamente el contrato público, también al ejecutar npm fuera de Docker.
  envDir: false,
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: { usePolling: env.VITE_USE_POLLING === 'true' },
    fs: {
      deny: ['.env', '.env.*', '**/.git/**', '**/.agents/**', '**/artifacts/**', '**/tests/**', '**/*.sql', '**/docs/**', '**/*.{crt,pem}', '**/*.md'],
    },
  },
  };
});
