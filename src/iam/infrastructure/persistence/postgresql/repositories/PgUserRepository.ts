import type { Pool } from 'pg';
import type { UserRepository } from '../../../../domain/services/UserRepository.js';
import type {DirectoryUser} from '../../../../domain/model/entities/DirectoryUser.js';
export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}
  async findById(userId:string):Promise<DirectoryUser|null>{
    const result=await this.pool.query<DirectoryUser>('SELECT id,name,email,"profileType" FROM "user" WHERE deletion_requested_at IS NULL AND id=$1',[userId]);
    return result.rows[0]??null;
  }
  async isTenant(userId: string): Promise<boolean> {
    const result = await this.pool.query('SELECT id FROM "user" WHERE deletion_requested_at IS NULL AND id=$1 AND "profileType"=$2', [userId, 'inquilino']);
    return result.rowCount === 1;
  }
}
