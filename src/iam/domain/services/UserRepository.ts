import type {DirectoryUser} from '../model/entities/DirectoryUser.js';
export interface UserRepository { isTenant(userId: string): Promise<boolean>;findById(userId:string):Promise<DirectoryUser|null>; }
