// Load environment variables from .dev.vars
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .dev.vars file
const devVarsPath = resolve(__dirname, '.dev.vars');
try {
  const devVars = readFileSync(devVarsPath, 'utf-8');
  devVars.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      const value = values.join('=').replace(/^"|"$/g, '');
      process.env[key.trim()] = value.trim();
    }
  });
  console.log('✓ Loaded environment variables from .dev.vars');
} catch (err) {
  console.warn('⚠️  Could not load .dev.vars file');
}

// Import app after env vars are loaded
const app = (await import('./src/index')).default;

// Create mock Cloudflare environment
const mockEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || '',
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH || '',
  DEV_MODE: process.env.DEV_MODE || '',
};

console.log('\n⛅️  Starting local Hono dev server...\n');

Bun.serve({
  port: 8787,
  idleTimeout: 30, // Increase timeout to 30 seconds for database queries
  fetch(req) {
    // Mock Cloudflare context
    return app.fetch(req, mockEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });
  },
  error(error) {
    console.error('Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  },
});

console.log('✓ Server running on http://localhost:8787');
console.log('✓ Using Supabase URL:', mockEnv.SUPABASE_URL ? 'configured' : 'missing');
console.log('✓ DEV_MODE:', mockEnv.DEV_MODE || 'not set');
console.log('✓ Service Role Key:', mockEnv.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'not set');
console.log('\nReady to handle requests!\n');
