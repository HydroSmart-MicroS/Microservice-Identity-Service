import '../../../configuration/RemoteConfiguration.js';
import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import { Pool } from 'pg';
import {randomUUID} from 'node:crypto';

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
  emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength:128,
    resetPasswordTokenExpiresIn:1800,revokeSessionsOnPasswordReset:true,
    sendResetPassword:async({user,url})=>{
      // This private job is relayed by RPC; reset links must never reach audit.events.
      const id=randomUUID();
      await pool.query(`INSERT INTO outbox_events(event_id,event_type,aggregate_id,payload)
        SELECT $1,'identity.password.reset.private',$2,$3::jsonb
        WHERE EXISTS(SELECT 1 FROM "user" WHERE id=$2 AND deletion_requested_at IS NULL)`,
        [id,user.id,JSON.stringify({userId:user.id,source:id,actionUrl:url,expiresAt:new Date(Date.now()+1800000).toISOString()})]);
    },
  },
  rateLimit: {
    enabled: true,
    customRules: {
      '/sign-in/email': {window: 60, max: 5},
      '/request-password-reset': {window: 60, max: 5},
      '/reset-password': {window: 60, max: 5},
    },
  },
  advanced: {
    cookiePrefix: process.env.AUTH_COOKIE_PREFIX || 'better-auth',
    ipAddress: {ipAddressHeaders:['x-hydrosmart-client-ip']},
  },
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
