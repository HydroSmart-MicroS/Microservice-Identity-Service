import type {DirectoryUser} from '../model/entities/DirectoryUser.js';
export interface UserDirectoryQueryService {
 findById(userId:string):Promise<DirectoryUser|null>;
 isTenant(userId:string):Promise<boolean>;
}
