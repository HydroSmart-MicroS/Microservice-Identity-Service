export type DeletionJob={id:string;user_id:string;unit_ids:string[];phase:number};
export interface DeletionRepository {
 passwordHash(user:string):Promise<string|null>;
 create(user:string,units:string[]):Promise<string>;
 due():Promise<DeletionJob[]>;
 advance(id:string,phase:number):Promise<void>;
 complete(job:DeletionJob):Promise<void>;
 retry(id:string):Promise<void>;
 purge():Promise<void>;
}
export interface DeletionGateway {call(service:string,user:string,action?:string,body?:unknown):Promise<{unitIds:string[]}>;}
export interface PasswordVerifier {verify(hash:string,password:string):Promise<boolean>;}
