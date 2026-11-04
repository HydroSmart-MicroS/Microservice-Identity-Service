import {createHash,randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {DeletionJob,DeletionRepository} from '../../../../application/internal/outboundservices/AccountDeletionPorts.js';
import {DeletionBlocked} from '../../../../domain/model/valueobjects/DeletionBlocked.js';
export class PgAccountDeletionRepository implements DeletionRepository {
 constructor(private readonly pool:Pool){}
 async passwordHash(user:string){const r=await this.pool.query('SELECT password FROM "account" WHERE "userId"=$1 AND "providerId"=$2',[user,'credential']);return r.rows[0]?.password??null;}
 async create(user:string,units:string[]){
  const db=await this.pool.connect(),id=randomUUID();
  try{
   await db.query('BEGIN');
   const row=await db.query('SELECT email FROM "user" WHERE id=$1 AND deletion_requested_at IS NULL FOR UPDATE',[user]);
   if(!row.rowCount)throw new DeletionBlocked(409,'La cuenta ya está en proceso de eliminación.');
   await db.query('INSERT INTO account_deletions(id,user_id,user_hash,unit_ids) VALUES($1,$2,$3,$4)',[id,user,createHash('sha256').update(user).digest('hex'),JSON.stringify(units)]);
   await db.query('DELETE FROM "session" WHERE "userId"=$1',[user]);
   await db.query('DELETE FROM "account" WHERE "userId"=$1',[user]);
   await db.query('DELETE FROM "verification" WHERE identifier=$1',[row.rows[0].email]);
   await db.query('UPDATE "user" SET deletion_requested_at=now(),name=$2,email=$3,image=NULL WHERE id=$1',[user,'Cuenta eliminada','deleted-'+id+'@invalid.local']);
   await db.query('DELETE FROM outbox_events WHERE aggregate_id=$1',[user]);
   await db.query('COMMIT');return id;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async due(){return(await this.pool.query<DeletionJob>('SELECT id,user_id,unit_ids,phase FROM account_deletions WHERE user_id IS NOT NULL AND next_attempt_at<=now() ORDER BY requested_at LIMIT 5')).rows;}
 async advance(id:string,phase:number){await this.pool.query('UPDATE account_deletions SET phase=$2 WHERE id=$1',[id,phase]);}
 async complete(job:DeletionJob){
  const db=await this.pool.connect();
  try{await db.query('BEGIN');await db.query('DELETE FROM outbox_events WHERE aggregate_id=$1',[job.user_id]);await db.query('DELETE FROM "user" WHERE id=$1',[job.user_id]);await db.query("UPDATE account_deletions SET user_id=NULL,unit_ids='[]',completed_at=now(),expires_at=now()+interval '365 days' WHERE id=$1",[job.id]);await db.query('COMMIT');}
  catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async retry(id:string){await this.pool.query("UPDATE account_deletions SET attempts=attempts+1,next_attempt_at=now()+interval '30 seconds' WHERE id=$1",[id]);}
 async purge(){await this.pool.query('DELETE FROM account_deletions WHERE expires_at<=now()');}
}
