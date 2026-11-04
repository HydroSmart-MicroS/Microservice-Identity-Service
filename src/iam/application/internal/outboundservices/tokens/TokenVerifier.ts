import type { ProfileType } from '../../../../domain/model/valueobjects/ProfileType.js';
export interface VerifiedIdentity { userId: string; profileType: ProfileType; }
export interface TokenVerifier { verify(token: string): Promise<VerifiedIdentity>; }
