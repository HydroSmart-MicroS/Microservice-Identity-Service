import {verifyPassword} from 'better-auth/crypto';
import type {PasswordVerifier} from '../../../../application/internal/outboundservices/AccountDeletionPorts.js';
export class BetterAuthPasswordVerifier implements PasswordVerifier {
 verify(hash:string,password:string){return verifyPassword({hash,password});}
}
