import '../../../configuration/RemoteConfiguration.js';
import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import { Pool } from 'pg';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
export const pool = new Pool({ connectionString: required('DATABASE_URL'), max: 5, connectionTimeoutMillis: 3000 });
// Idle connections can fail independently of a request when PostgreSQL restarts.
pool.on('error',()=>console.warn('Identity database connection lost; the pool will reconnect.'));
export const auth = betterAuth({
  database: pool,
  secret: required('BETTER_AUTH_SECRET'),
  baseURL: required('BETTER_AUTH_URL'),
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000,http://localhost:8080').split(','),
  emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength:128 },
  advanced: {ipAddress: {ipAddressHeaders:['x-forwarded-for']}},
  user: {
    additionalFields: {
      profileType: {
        type: ['propietario', 'inquilino'],
        required: false,
        defaultValue: 'propietario',
        input: true,
      },
    },
  },
  plugins: [jwt({
    jwks: { keyPairConfig: { alg: 'ES256' } },
    jwt: {
      issuer: required('JWT_ISSUER'),
      audience: process.env.JWT_AUDIENCE ?? 'hydrosmart-api',
      expirationTime: '5m',
      definePayload: ({ user }) => ({ sub: user.id, profile_type: user.profileType }),
    },
  })],
});
