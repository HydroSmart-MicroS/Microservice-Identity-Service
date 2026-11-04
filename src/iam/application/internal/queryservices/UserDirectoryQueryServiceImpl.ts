import type {UserRepository} from '../../../domain/services/UserRepository.js';
import type {UserDirectoryQueryService} from '../../../domain/services/UserDirectoryQueryService.js';
import type {DirectoryUser} from '../../../domain/model/entities/DirectoryUser.js';
export class UserDirectoryQueryServiceImpl implements UserDirectoryQueryService {
 constructor(private readonly users:UserRepository){}
 findById(userId:string):Promise<DirectoryUser|null>{return userId.length>0&&userId.length<=255?this.users.findById(userId):Promise.resolve(null);}
 isTenant(userId:string):Promise<boolean>{return userId.length>0&&userId.length<=255?this.users.isTenant(userId):Promise.resolve(false);}
}
