import { createLocalJWKSet, jwtVerify } from 'jose';
import { auth,pool } from '../../../authentication/betterauth/services/BetterAuthService.js';
import { isProfileType } from '../../../../domain/model/valueobjects/ProfileType.js';
import type { TokenVerifier, VerifiedIdentity } from '../../../../application/internal/outboundservices/tokens/TokenVerifier.js';
export class JwtTokenService implements TokenVerifier {
  async verify(token: string): Promise<VerifiedIdentity> {
    const response = await auth.handler(new Request(process.env.BETTER_AUTH_URL + '/api/auth/jwks'));
    if (!response.ok) throw new Error('identity_unavailable');
    const keys = createLocalJWKSet(await response.json());
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['ES256'], issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE ?? 'hydrosmart-api',
    });
    if (!payload.sub || !isProfileType(payload.profile_type)) throw new Error('unauthorized');
    if(!(await pool.query('SELECT 1 FROM "user" WHERE id=$1 AND deletion_requested_at IS NULL',[payload.sub])).rowCount)throw new Error('unauthorized');
    return { userId: payload.sub, profileType: payload.profile_type };
  }
}
