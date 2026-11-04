import { rpcJson } from '../../../shared/infrastructure/messaging/RabbitRpc.js';
// Loaded before Better Auth creates the database pool.
const base = process.env.CONFIG_SERVICE_URL;
if (base) {
  const values: unknown = await rpcJson('config-service','/v1/config/identity/local');
  const allowed = new Set(['BETTER_AUTH_URL', 'JWT_ISSUER', 'JWT_AUDIENCE', 'TRUSTED_ORIGINS']);
  if (!values || typeof values !== 'object' || Array.isArray(values) ||
      Object.keys(values).length !== allowed.size) throw new Error('Invalid remote configuration');
  for (const [key, value] of Object.entries(values)) {
    if (!allowed.has(key) || typeof value !== 'string' || !value || /[\r\n]/.test(value)) {
      throw new Error('Invalid remote configuration');
    }
    process.env[key] ??= value;
  }
  console.log('Loaded identity configuration from Config Service');
}
export {};
