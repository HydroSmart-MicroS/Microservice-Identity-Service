import type { UserDirectoryQueryService } from '../../domain/services/UserDirectoryQueryService.js';
export class IamContextFacade {
  constructor(private readonly users: UserDirectoryQueryService) {}
  findById(userId:string){return this.users.findById(userId);}
  isTenant(userId: string): Promise<boolean> { return this.users.isTenant(userId); }
}
